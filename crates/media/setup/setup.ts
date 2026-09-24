// Puts the pinned FFmpeg build this crate decodes with into
// `.cache/media/`, where `build.rs` finds it. Safe to run again: a build
// already in place is left alone.
//
//   moon run media:setup                    # the pinned prebuilt for this machine
//   moon run media:setup -- --from-source   # build the pinned source here instead
//   bun run setup/setup.ts --target <platform>   # build for another platform
//
// The prebuilts are these same source builds, made for every platform by
// .github/workflows/media-deps.yml and pinned in ffmpeg.json. Cross builds
// need the target's toolchain on PATH: llvm-mingw for Windows (built from
// Linux), Xcode for the other Mac architecture.

import { createHash } from "node:crypto";
import { availableParallelism } from "node:os";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

import manifest from "./ffmpeg.json";

type Download = { url: string; sha256: string };
type Platform = { os: "windows" | "macos" | "linux"; arch: "x86_64" | "aarch64" };

const root = resolve(import.meta.dir, "../../..");
const cache = join(root, ".cache", "media");

function hostPlatform(): Platform {
  const os = ({ win32: "windows", darwin: "macos", linux: "linux" } as const)[process.platform as string];
  const arch = ({ x64: "x86_64", arm64: "aarch64" } as const)[process.arch as string];
  if (!os || !arch) throw new Error(`unsupported platform ${process.platform}-${process.arch}`);
  return { os, arch };
}

function parsePlatform(key: string): Platform {
  const [os, arch] = key.split("-");
  if (!["windows", "macos", "linux"].includes(os) || !["x86_64", "aarch64"].includes(arch)) {
    throw new Error(`unknown platform ${key}: expected e.g. linux-x86_64`);
  }
  return { os, arch } as Platform;
}

const keyOf = (platform: Platform) => `${platform.os}-${platform.arch}`;

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function download({ url, sha256 }: Download, to: string) {
  console.log(`downloading ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download failed: ${response.status} ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== sha256) {
    throw new Error(`checksum mismatch for ${url}\n  expected ${sha256}\n  got      ${actual}`);
  }
  await Bun.write(to, bytes);
}

function run(command: string[], cwd?: string) {
  const result = Bun.spawnSync(command, { cwd, stdio: ["ignore", "inherit", "inherit"] });
  if (result.exitCode !== 0) throw new Error(`failed: ${command.join(" ")}`);
}

function extract(archive: string, into: string) {
  mkdirSync(into, { recursive: true });
  // bsdtar (Windows 10+, macOS) and GNU tar (Linux) both detect the format.
  // On Windows, the system's own: a GNU tar from Git Bash may come first on
  // PATH, and it reads "C:" as a remote host.
  const tar =
    process.platform === "win32" ? join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe") : "tar";
  run([tar, "-xf", archive, "-C", into]);
}

/// Configure flags for building FFmpeg for `target` on `host`. The same
/// everywhere but for what a platform needs, so every platform decodes the
/// same formats: shared LGPL libraries only, nothing picked up from
/// whatever else the building machine has installed.
function configureFlags(target: Platform, host: Platform): string[] {
  const flags = [
    "--enable-shared",
    "--disable-static",
    "--disable-programs",
    "--disable-doc",
    "--disable-avdevice",
    "--disable-avfilter",
    "--disable-network",
    "--disable-autodetect",
  ];
  const cross = target.os !== host.os || target.arch !== host.arch;

  switch (target.os) {
    case "windows": {
      if (host.os !== "linux") throw new Error("Windows builds are cross-compiled from Linux with llvm-mingw");
      const prefix = `${target.arch}-w64-mingw32-`;
      if (!Bun.which(`${prefix}clang`)) throw new Error(`${prefix}clang not on PATH: add llvm-mingw's bin/`);
      flags.push(
        "--target-os=mingw32",
        `--arch=${target.arch}`,
        `--cross-prefix=${prefix}`,
        "--enable-cross-compile",
        // Windows' own threads, so the DLLs need nothing but the system.
        "--disable-pthreads",
        "--enable-w32threads",
      );
      break;
    }
    case "macos": {
      if (host.os !== "macos") throw new Error("macOS builds need a Mac");
      const arch = target.arch === "aarch64" ? "arm64" : "x86_64";
      const machine = `-arch ${arch} -mmacosx-version-min=11.0`;
      // Found through the app's rpath: beside it in development, in the
      // bundle's Frameworks when shipped.
      flags.push("--install-name-dir=@rpath", `--extra-cflags=${machine}`, `--extra-ldflags=${machine}`);
      if (cross) flags.push("--enable-cross-compile", "--target-os=darwin", `--arch=${target.arch}`);
      break;
    }
    case "linux":
      if (cross) throw new Error("Linux builds are made on a machine of the same architecture");
      break;
  }

  if (target.arch === "x86_64" && !Bun.which("nasm")) {
    console.warn("nasm not found: building without x86 assembly, so decoding is slower");
    flags.push("--disable-x86asm");
  }
  return flags;
}

/// Builds the pinned source for `target` into `prefix`, with the licence
/// and the exact recipe beside the libraries, as the LGPL asks of anyone
/// who ships them.
async function buildFromSource(staging: string, target: Platform, flags: string[]): Promise<string> {
  const archive = join(staging, "source.tar.xz");
  await download(manifest.source, archive);
  extract(archive, staging);
  const source = join(staging, readdirSync(staging).find((name) => name !== "source.tar.xz")!);
  const prefix = join(staging, `ffmpeg-${manifest.version}-${keyOf(target)}`);

  console.log(`building FFmpeg ${manifest.version} for ${keyOf(target)}; this takes a few minutes`);
  run(["./configure", `--prefix=${prefix}`, ...flags], source);
  run(["make", `-j${availableParallelism()}`], source);
  run(["make", "install"], source);
  // Example programs; nothing the libraries need.
  rmSync(join(prefix, "share"), { recursive: true, force: true });

  if (target.os === "windows") {
    // DLLs stay in bin/; the import libraries MSVC links against go in lib/.
    for (const name of readdirSync(join(prefix, "bin")).filter((name) => name.endsWith(".lib"))) {
      renameSync(join(prefix, "bin", name), join(prefix, "lib", name));
    }
  }

  copyFileSync(join(source, "COPYING.LGPLv2.1"), join(prefix, "COPYING.LGPLv2.1"));
  copyFileSync(join(source, "LICENSE.md"), join(prefix, "LICENSE.md"));
  writeFileSync(
    join(prefix, "BUILD.md"),
    [
      `# FFmpeg ${manifest.version} for ${keyOf(target)}`,
      "",
      `Built from ${manifest.source.url}`,
      `(SHA-256 ${manifest.source.sha256}), unmodified, configured with:`,
      "",
      "```",
      ...flags,
      "```",
      "",
      "Licensed under the LGPL 2.1 or later: see COPYING.LGPLv2.1 and LICENSE.md.",
      "",
    ].join("\n"),
  );
  return prefix;
}

/// Unpacks a prebuilt archive: one top-level folder with include/, lib/
/// and, on Windows, bin/.
async function installPrebuilt(prebuilt: Download, staging: string): Promise<string> {
  const archive = join(staging, "archive");
  await download(prebuilt, archive);
  extract(archive, staging);
  rmSync(archive);
  return join(staging, readdirSync(staging)[0]);
}

async function main() {
  const host = hostPlatform();
  const target = option("--target") ? parsePlatform(option("--target")!) : host;
  const key = keyOf(target);
  const prebuilt = (manifest.platforms as Record<string, Download | undefined>)[key];
  const fromSource = process.argv.includes("--from-source") || key !== keyOf(host) || !prebuilt;

  // What this build is made of: a different pin or recipe rebuilds it.
  const flags = fromSource ? configureFlags(target, host) : [];
  const stamp = fromSource
    ? `source ${manifest.source.sha256} ${createHash("sha256").update(flags.join(" ")).digest("hex")}`
    : `prebuilt ${prebuilt!.sha256}`;

  const destination = join(cache, `ffmpeg-${manifest.version}-${key}`);
  const marker = join(destination, ".complete");
  if (existsSync(marker) && (await Bun.file(marker).text()).trim() === stamp) {
    console.log(`FFmpeg ${manifest.version} for ${key} is ready in ${destination}`);
    return;
  }

  // Made beside the destination and moved in whole, so an interrupted run
  // never leaves a half-finished build that looks complete.
  const staging = `${destination}.partial`;
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  const built = fromSource
    ? await buildFromSource(staging, target, flags)
    : await installPrebuilt(prebuilt!, staging);

  rmSync(destination, { recursive: true, force: true });
  renameSync(built, destination);
  rmSync(staging, { recursive: true, force: true });
  writeFileSync(marker, `${stamp}\n`);
  console.log(`FFmpeg ${manifest.version} for ${key} is ready in ${destination}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

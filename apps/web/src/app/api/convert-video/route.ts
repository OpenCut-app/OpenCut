import { type NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, rm, mkdtemp } from "fs/promises";
import { spawn } from "child_process";
import path from "path";
import os from "os";

const GENERIC_CONVERSION_ERROR = "Video conversion failed.";

function sanitizeContentDispositionName({
	rawName,
}: {
	rawName: string;
}): string {
	// Strip characters that can break the Content-Disposition header (quotes,
	// backslashes, CR/LF, control bytes) and replace non-ASCII so the
	// "filename=" parameter stays unambiguous across clients.
	const stripped = rawName
		// eslint-disable-next-line no-control-regex
		.replace(/[\\"\r\n\x00-\x1f]/g, "_")
		.replace(/[^\x20-\x7e]/g, "_")
		.slice(0, 200);
	return stripped.length > 0 ? stripped : "video";
}

export async function POST(request: NextRequest) {
	let workDir: string | null = null;

	try {
		const formData = await request.formData();
		const file = formData.get("file") as File | null;

		if (!file || !(file instanceof File)) {
			return NextResponse.json(
				{ error: "No file provided" },
				{ status: 400 },
			);
		}

		workDir = await mkdtemp(path.join(os.tmpdir(), "opencut-convert-"));
		const ext = path.extname(file.name) || ".mp4";
		const inputPath = path.join(workDir, `input${ext}`);
		const outputPath = path.join(workDir, "output.mp4");

		const buffer = Buffer.from(await file.arrayBuffer());
		await writeFile(inputPath, buffer);

		await runFfmpeg({
			inputPath,
			outputPath,
		});

		const convertedBuffer = await readFile(outputPath);

		const safeName = sanitizeContentDispositionName({
			rawName: path.basename(file.name, ext),
		});

		return new Response(new Uint8Array(convertedBuffer), {
			status: 200,
			headers: {
				"Content-Type": "video/mp4",
				"Content-Disposition": `attachment; filename="${safeName}.mp4"`,
			},
		});
	} catch (error) {
		console.error("Video conversion error:", error);
		return NextResponse.json(
			{ error: GENERIC_CONVERSION_ERROR },
			{ status: 500 },
		);
	} finally {
		if (workDir) {
			await rm(workDir, { recursive: true, force: true }).catch(() => {});
		}
	}
}

function runFfmpeg({
	inputPath,
	outputPath,
}: {
	inputPath: string;
	outputPath: string;
}): Promise<void> {
	return new Promise((resolve, reject) => {
		const proc = spawn("ffmpeg", [
			"-i",
			inputPath,
			"-c:v",
			"libx264",
			"-profile:v",
			"baseline",
			"-level",
			"3.1",
			"-preset",
			"veryfast",
			"-crf",
			"23",
			"-pix_fmt",
			"yuv420p",
			"-g",
			"60",
			"-keyint_min",
			"60",
			"-sc_threshold",
			"0",
			"-movflags",
			"+faststart",
			"-tag:v",
			"avc1",
			"-c:a",
			"aac",
			"-ac",
			"2",
			"-ar",
			"48000",
			"-b:a",
			"128k",
			"-y",
			outputPath,
		]);

		let stderr = "";
		proc.stderr.on("data", (data) => {
			stderr += data.toString();
		});

		proc.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(
					new Error(
						`ffmpeg exited with code ${code}. stderr: ${stderr.slice(-500)}`,
					),
				);
			}
		});

		proc.on("error", (err) => {
			reject(err);
		});
	});
}

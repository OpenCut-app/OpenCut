import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BasePage } from "@/app/base-page";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { getReleaseByVersion, getSortedReleases } from "@/lib/changelog/utils";
import {
	ReleaseArticle,
	ReleaseMeta,
	ReleaseTitle,
	ReleaseDescription,
	ReleaseChanges,
} from "@/lib/changelog/components/release";
import { CopyMarkdownButton } from "@/lib/changelog/components/copy-markdown-button";

type Props = { params: Promise<{ version: string }> };

export async function generateStaticParams() {
	return getSortedReleases().map((release) => ({ version: release.version }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { version } = await params;
	const release = getReleaseByVersion({ version });
	if (!release) return {};
	return {
		title: `${release.title} (${release.version}) - NeuralCut Changelog`,
		description: release.description,
	};
}

export default async function ReleaseDetailPage({ params }: Props) {
	const { version } = await params;
	const releases = getSortedReleases();
	const index = releases.findIndex((entry) => entry.version === version);
	if (index === -1) notFound();
	const release = releases[index];
	const newer = index > 0 ? releases[index - 1] : null;
	const older = index < releases.length - 1 ? releases[index + 1] : null;

	return (
		<BasePage>
			<div className="mx-auto w-full max-w-3xl flex flex-col gap-12">
				<Link
					href="/changelog"
					className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit"
				>
					<ChevronLeftIcon className="size-4" />
					All releases
				</Link>

				<ReleaseArticle variant="detail">
					<div className="flex flex-col gap-4">
						<div className="flex items-center justify-between">
							<ReleaseMeta release={release} />
							<CopyMarkdownButton
								description={release.description}
								changes={release.changes}
							/>
						</div>
						<ReleaseTitle as="h1">{release.title}</ReleaseTitle>
						{release.description && (
							<ReleaseDescription>{release.description}</ReleaseDescription>
						)}
					</div>
					<ReleaseChanges release={release} />
				</ReleaseArticle>

				<nav className="flex items-center justify-between border-t pt-8">
					{older ? (
						<Link
							href={`/changelog/${older.version}`}
							className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground group"
						>
							<ChevronLeftIcon className="size-4" />
							<div className="flex flex-col">
								<span className="text-xs text-muted-foreground/60">Older</span>
								<span className="font-medium">{older.title}</span>
							</div>
						</Link>
					) : (
						<div />
					)}
					{newer ? (
						<Link
							href={`/changelog/${newer.version}`}
							className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground group text-right"
						>
							<div className="flex flex-col">
								<span className="text-xs text-muted-foreground/60">Newer</span>
								<span className="font-medium">{newer.title}</span>
							</div>
							<ChevronRightIcon className="size-4" />
						</Link>
					) : (
						<div />
					)}
				</nav>
			</div>
		</BasePage>
	);
}

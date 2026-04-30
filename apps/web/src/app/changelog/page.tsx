import type { Metadata } from "next";
import { BasePage } from "@/app/base-page";
import { Separator } from "@/components/ui/separator";
import {
	type Release as ReleaseType,
	getSortedReleases,
} from "@/lib/changelog/utils";
import {
	ReleaseArticle,
	ReleaseMeta,
	ReleaseTitle,
	ReleaseDescription,
	ReleaseChanges,
} from "@/lib/changelog/components/release";

export const metadata: Metadata = {
	title: "Changelog - NeuralCut",
	description: "What's new in NeuralCut",
	openGraph: {
		title: "Changelog - NeuralCut",
		description: "Every update, improvement, and fix to NeuralCut — documented.",
		type: "website",
		images: [
			{
				url: "/open-graph/changlog.jpg",
				width: 1200,
				height: 630,
				alt: "NeuralCut Changelog",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Changelog - NeuralCut",
		description: "What's new in NeuralCut",
		images: ["/open-graph/changlog.jpg"],
	},
};

export default function ChangelogPage() {
	const releases = getSortedReleases();

	return (
		<BasePage title="Changelog" description="See what's new in NeuralCut">
			<div className="mx-auto w-full max-w-3xl">
				<div className="relative">
					<div
						aria-hidden
						className="absolute top-2 bottom-0 left-[5px] w-px bg-border hidden sm:block"
					/>

					<div className="flex flex-col">
						{releases.map((release, releaseIndex) => (
							<div key={release.version} className="flex flex-col">
								<ReleaseEntry release={release} />
								{releaseIndex < releases.length - 1 && (
									<Separator className="my-10 sm:ml-1.5" />
								)}
							</div>
						))}
					</div>
				</div>
			</div>
		</BasePage>
	);
}

function ReleaseEntry({ release }: { release: ReleaseType }) {
	return (
		<ReleaseArticle variant="list" isLatest={release.isLatest}>
			<ReleaseMeta release={release} />
			<div className="flex flex-col gap-4">
				<ReleaseTitle as="h2" href={`/changelog/${release.version}`}>
					{release.title}
				</ReleaseTitle>
				{release.description && (
					<ReleaseDescription>{release.description}</ReleaseDescription>
				)}
			</div>
			<ReleaseChanges release={release} />
		</ReleaseArticle>
	);
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BasePage } from "@/app/base-page";
import { Card, CardContent } from "@/components/ui/card";
import { SPONSORS, type Sponsor } from "@/lib/site/sponsors";
import { HugeiconsIcon } from "@hugeicons/react";
import { LinkSquare02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/utils/ui";

export const metadata: Metadata = {
	title: "Sponsors - NeuralCut",
	description:
		"Support NeuralCut and help us build the future of free and open-source video editing.",
	openGraph: {
		title: "Sponsors - NeuralCut",
		description:
			"Support NeuralCut and help us build the future of free and open-source video editing.",
		type: "website",
	},
};

export default function SponsorsPage() {
	return (
		<BasePage>
			<div className="flex flex-col gap-8 text-center">
				<h1 className="text-5xl font-bold tracking-tight md:text-6xl">
					Sponsors
				</h1>
				<p className="text-muted-foreground mx-auto max-w-2xl text-xl leading-relaxed text-pretty">
					Support NeuralCut and help us build the future of privacy-first video
					editing.
				</p>
			</div>
			<SponsorsGrid />
		</BasePage>
	);
}

function SponsorsGrid() {
	return (
		<div className="grid gap-6 sm:grid-cols-2">
			{SPONSORS.map((sponsor) => (
				<SponsorCard key={sponsor.name} sponsor={sponsor} />
			))}
		</div>
	);
}

function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
	return (
		<Link
			href={sponsor.url}
			target="_blank"
			rel="noopener noreferrer"
			className="size-full"
		>
			<Card className="h-full">
				<CardContent className="flex h-full flex-col justify-center gap-8 p-8">
					<Image
						src={sponsor.logo}
						alt={`${sponsor.name} logo`}
						width={50}
						height={50}
						className={cn(
							"object-contain",
							sponsor.invertOnDark && "invert-0 dark:invert",
						)}
					/>
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<h3 className="text-xl font-semibold group-hover:underline">
								{sponsor.name}
							</h3>
							<HugeiconsIcon
								icon={LinkSquare02Icon}
								className="text-muted-foreground size-4"
							/>
						</div>
						<p className="text-muted-foreground">{sponsor.description}</p>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}

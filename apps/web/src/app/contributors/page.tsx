import type { Metadata } from "next";
import Link from "next/link";
import { GitHubContributeSection } from "@/components/gitHub-contribute-section";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { EXTERNAL_TOOLS } from "@/lib/site/external-tools";
import { BasePage } from "../base-page";

export const metadata: Metadata = {
	title: "Contributors - NeuralCut",
	description:
		"Meet the amazing people who contribute to NeuralCut, the free and open-source video editor.",
	openGraph: {
		title: "Contributors - NeuralCut",
		description:
			"Meet the amazing people who contribute to NeuralCut, the free and open-source video editor.",
		type: "website",
	},
};

interface Contributor {
	id: number;
	login: string;
	avatar_url: string;
	html_url: string;
	contributions: number;
	type: string;
}

async function getContributors(): Promise<Contributor[]> {
	try {
		const response = await fetch(
			"https://api.github.com/repos/OpenCut-app/OpenCut/contributors?per_page=100",
			{
				headers: {
					Accept: "application/vnd.github.v3+json",
					"User-Agent": "OpenCut-Web-App",
				},
				next: { revalidate: 600 }, // 10 minutes
			},
		);

		if (!response.ok) {
			console.error("Failed to fetch contributors");
			return [];
		}

		const contributors = (await response.json()) as Contributor[];

		const filteredContributors = contributors.filter(
			(contributor) => contributor.type === "User",
		);

		return filteredContributors;
	} catch (error) {
		console.error("Error fetching contributors:", error);
		return [];
	}
}

export default async function ContributorsPage() {
	const contributors = await getContributors();
	const topContributors = contributors.slice(0, 2);
	const otherContributors = contributors.slice(2);
	const totalContributions = contributors.reduce(
		(sum, c) => sum + c.contributions,
		0,
	);

	return (
		<BasePage
			title="Contributors"
			description="Meet the amazing people who contribute to NeuralCut, the free and open-source video editor."
		>
			<div className="-mt-4 flex items-center justify-center gap-8 text-sm">
				<StatItem value={contributors.length} label="contributors" />
				<StatItem value={totalContributions} label="contributions" />
			</div>

			<div className="mx-auto flex max-w-6xl flex-col gap-20">
				{topContributors.length > 0 && (
					<TopContributorsSection contributors={topContributors} />
				)}
				{otherContributors.length > 0 && (
					<AllContributorsSection contributors={otherContributors} />
				)}
				<ExternalToolsSection />
				<GitHubContributeSection
					title="Join the community"
					description="NeuralCut is built by developers like you. Every contribution, no matter how small, helps make video editing more accessible for everyone."
				/>
			</div>
		</BasePage>
	);
}

function StatItem({ value, label }: { value: number; label: string }) {
	return (
		<div className="flex items-center gap-2">
			<div className="bg-foreground size-2 rounded-full" />
			<span className="font-medium">{value}</span>
			<span className="text-muted-foreground">{label}</span>
		</div>
	);
}

function TopContributorsSection({
	contributors,
}: {
	contributors: Contributor[];
}) {
	return (
		<div className="flex flex-col gap-10">
			<div className="flex flex-col gap-2 text-center">
				<h2 className="text-2xl font-semibold">Top contributors</h2>
				<p className="text-muted-foreground">
					Leading the way in contributions
				</p>
			</div>

			<div className="mx-auto flex w-full max-w-xl flex-col justify-center gap-6 md:flex-row">
				{contributors.map((contributor) => (
					<TopContributorCard key={contributor.id} contributor={contributor} />
				))}
			</div>
		</div>
	);
}

function TopContributorCard({ contributor }: { contributor: Contributor }) {
	return (
		<Link
			href={contributor.html_url}
			target="_blank"
			rel="noopener noreferrer"
			className="w-full"
		>
			<Card>
				<CardContent className="flex flex-col gap-6 p-8 text-center">
					<Avatar className="mx-auto size-28">
						<AvatarImage
							src={contributor.avatar_url}
							alt={`${contributor.login}'s avatar`}
						/>
						<AvatarFallback className="text-lg font-semibold">
							{contributor.login.charAt(0).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div className="flex flex-col gap-2">
						<h3 className="text-xl font-semibold">{contributor.login}</h3>
						<div className="flex items-center justify-center gap-2">
							<span className="font-medium">{contributor.contributions}</span>
							<span className="text-muted-foreground">contributions</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}

function AllContributorsSection({
	contributors,
}: {
	contributors: Contributor[];
}) {
	return (
		<div className="flex flex-col gap-12">
			<div className="flex flex-col gap-2 text-center">
				<h2 className="text-2xl font-semibold">All contributors</h2>
				<p className="text-muted-foreground">
					Everyone who makes NeuralCut better
				</p>
			</div>

			<div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
				{contributors.map((contributor) => (
					<Link
						key={contributor.id}
						href={contributor.html_url}
						target="_blank"
						rel="noopener noreferrer"
						className="opacity-100 hover:opacity-70"
					>
						<div className="flex flex-col items-center gap-2 p-2">
							<Avatar className="size-16">
								<AvatarImage
									src={contributor.avatar_url}
									alt={`${contributor.login}'s avatar`}
								/>
								<AvatarFallback>
									{contributor.login.charAt(0).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<div className="text-center">
								<h3 className="text-sm font-medium">{contributor.login}</h3>
								<p className="text-muted-foreground text-xs">
									{contributor.contributions}
								</p>
							</div>
						</div>
					</Link>
				))}
			</div>
		</div>
	);
}

function ExternalToolsSection() {
	return (
		<div className="flex flex-col gap-10">
			<div className="flex flex-col gap-2 text-center">
				<h2 className="text-2xl font-semibold">External tools</h2>
				<p className="text-muted-foreground">Tools we use to build NeuralCut</p>
			</div>

			<div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
				{EXTERNAL_TOOLS.map((tool, index) => (
					<Link
						key={tool.url}
						href={tool.url}
						target="_blank"
						className="block"
						style={{ animationDelay: `${index * 100}ms` }}
					>
						<Card className="h-full">
							<CardContent className="flex items-center justify-center h-full flex-col gap-4 p-6 text-center">
								<tool.icon className="size-8" />
								<div className="flex flex-1 flex-col gap-2">
									<h3 className="text-lg font-semibold">{tool.name}</h3>
									<p className="text-muted-foreground text-sm">
										{tool.description}
									</p>
								</div>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>
		</div>
	);
}

import { Button } from "./ui/button";
import Link from "next/link";
import { SOCIAL_LINKS } from "@/constants/site-constants";
import { GithubIcon, Link04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function GitHubContributeSection({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-4 text-center">
				<h3 className="text-2xl font-semibold">{title}</h3>
				<p className="text-muted-foreground">{description}</p>
			</div>
			<div className="flex flex-col justify-center gap-4 sm:flex-row">
				<Link
					href={`${SOCIAL_LINKS.github}/blob/main/.github/CONTRIBUTING.md`}
					target="_blank"
					rel="noopener noreferrer"
				>
					<Button className="w-full" size="lg">
						<HugeiconsIcon icon={GithubIcon} />
						Start contributing
					</Button>
				</Link>
				<Link
					href={`${SOCIAL_LINKS.github}/issues`}
					target="_blank"
					rel="noopener noreferrer"
				>
					<Button variant="outline" className="w-full" size="lg">
						<HugeiconsIcon icon={Link04Icon} />
						Report issues
					</Button>
				</Link>
			</div>
		</div>
	);
}

import type { Metadata } from "next";
import Link from "next/link";
import { BasePage } from "@/app/base-page";
import { Button } from "@/components/ui/button";
import { SOCIAL_LINKS } from "@/constants/site-constants";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
	title: "About - OpenCut",
	description:
		"OpenCut is a free, open-source video editor built for privacy and simplicity. Edit videos directly in your browser without uploading to servers.",
	openGraph: {
		title: "About - OpenCut",
		description:
			"OpenCut is a free, open-source video editor built for privacy and simplicity. Edit videos directly in your browser without uploading to servers.",
		type: "website",
	},
};

export default function AboutPage() {
	return (
		<BasePage
			title="About OpenCut"
			description="A free, open-source video editor that respects your privacy and gets the job done."
		>
			<section className="flex flex-col gap-4">
				<h2 className="text-2xl font-semibold">Our Mission</h2>
				<p>
					OpenCut was created to provide a powerful video editing experience
					that doesn't compromise on privacy. We believe that editing your
					videos should be simple, fast, and free from data collection.
				</p>
				<p>
					Your videos stay on your device. No uploads to external servers for
					basic editing. No tracking of your content. Just a clean, efficient
					editor that works anywhere.
				</p>
			</section>

			<section className="flex flex-col gap-4">
				<h2 className="text-2xl font-semibold">Key Features</h2>
				<ul className="list-disc space-y-2 pl-6">
					<li>
						<strong>Privacy-first:</strong> Basic editing happens entirely in
						your browser - your files never leave your device
					</li>
					<li>
						<strong>Multi-track timeline:</strong> Arrange video, audio, and
						images across multiple tracks with precision
					</li>
					<li>
						<strong>Real-time preview:</strong> See your edits instantly without
						waiting for renders
					</li>
					<li>
						<strong>Cross-platform:</strong> Works on any device with a modern
						web browser
					</li>
					<li>
						<strong>Open source:</strong> Fully transparent code you can audit,
						modify, or self-host
					</li>
					<li>
						<strong>Free forever:</strong> No subscriptions, no paywalls, no
						hidden costs
					</li>
				</ul>
			</section>

			<section className="flex flex-col gap-4">
				<h2 className="text-2xl font-semibold">Open Source</h2>
				<p>
					OpenCut is completely open source under the MIT license. This means
					you can view, modify, and distribute the code freely. We believe in
					transparency and community-driven development.
				</p>
				<p>
					Our source code is available on GitHub, where you can report issues,
					suggest features, or contribute code. Every contribution helps make
					OpenCut better for everyone.
				</p>
				<div className="flex gap-4 pt-2">
					<Button variant="outline" asChild>
						<Link href={SOCIAL_LINKS.github} target="_blank" rel="noopener">
							View on GitHub
							<ArrowRight className="ml-1 size-4" />
						</Link>
					</Button>
				</div>
			</section>

			<section className="flex flex-col gap-4">
				<h2 className="text-2xl font-semibold">Community</h2>
				<p>
					Join our growing community of creators, developers, and video editing
					enthusiasts. Whether you need help, want to share your creations, or
					are interested in contributing, we'd love to have you.
				</p>
				<div className="flex flex-wrap gap-4 pt-2">
					<Button variant="outline" asChild>
						<Link href={SOCIAL_LINKS.discord} target="_blank" rel="noopener">
							Join Discord
						</Link>
					</Button>
					<Button variant="outline" asChild>
						<Link href={SOCIAL_LINKS.x} target="_blank" rel="noopener">
							Follow on X
						</Link>
					</Button>
					<Button variant="outline" asChild>
						<Link href="/contributors">View Contributors</Link>
					</Button>
				</div>
			</section>

			<section className="flex flex-col gap-4">
				<h2 className="text-2xl font-semibold">Get Started</h2>
				<p>
					Ready to start editing? OpenCut runs directly in your browser - no
					downloads or installations required.
				</p>
				<div className="pt-2">
					<Button variant="foreground" asChild>
						<Link href="/projects">
							Start Editing
							<ArrowRight className="ml-1 size-4" />
						</Link>
					</Button>
				</div>
			</section>
		</BasePage>
	);
}

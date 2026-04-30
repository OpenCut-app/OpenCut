import type { Metadata } from "next";
import { BasePage } from "@/app/base-page";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { SOCIAL_LINKS } from "@/lib/site/social";

export const metadata: Metadata = {
	title: "Terms of Service - NeuralCut",
	description:
		"NeuralCut's Terms of Service. Fair, transparent terms for our free and open-source video editor.",
	openGraph: {
		title: "Terms of Service - NeuralCut",
		description:
			"NeuralCut's Terms of Service. Fair, transparent terms for our free and open-source video editor.",
		type: "website",
	},
};

export default function TermsPage() {
	return (
		<BasePage
			title="Terms of service"
			description="Fair and transparent terms for our free, open-source video editor. Contact us if you have any questions."
		>
			<Accordion type="single" collapsible className="w-full">
				<AccordionItem
					value="quick-summary"
					className="rounded-2xl border px-5"
				>
					<AccordionTrigger className="no-underline!">
						Quick summary
					</AccordionTrigger>
					<AccordionContent>
						<h3 className="mb-3 text-lg font-medium">
							You own your content, we own nothing.
						</h3>
						<ol className="list-decimal space-y-2 pl-6">
							<li>
								Everything runs locally in your browser - nothing is ever
								uploaded to our servers
							</li>
							<li>
								We never claim ownership of your content
							</li>
							<li>
								Free for personal and commercial use with no watermarks or
								restrictions
							</li>
							<li>You're responsible for how you use it - don't break the law</li>
							<li>
								Service provided "as is" - we can't guarantee perfect uptime
							</li>
							<li>
								Open source means you can review our code and self-host if
								needed
							</li>
							<li>
								No account required - your exported videos are always yours
							</li>
						</ol>
						<p className="mt-4">
							Questions? Email us at{" "}
							<a
								href="mailto:oss@opencut.app"
								className="text-primary hover:underline"
							>
								oss@opencut.app
							</a>
						</p>
					</AccordionContent>
				</AccordionItem>
			</Accordion>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Your Content, Your Rights</h2>
				<p>
					<strong>You own everything you create.</strong> All editing and
					processing happens locally on your device. We never see, store, or
					have access to your files. We make no claims to ownership, licensing,
					or rights over your videos, projects, or any content you create using
					NeuralCut.
				</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>
						Your content never leaves your device
					</li>
					<li>You retain all intellectual property rights to your content</li>
					<li>You can export and use your content however you choose</li>
					<li>No watermarks, no licensing restrictions from NeuralCut</li>
				</ul>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">How You Can Use NeuralCut</h2>
				<p>NeuralCut is free for personal and commercial use. You can:</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>
						Create videos for personal, educational, or commercial purposes
					</li>
					<li>Use NeuralCut for client work and paid projects</li>
					<li>Share and distribute videos created with NeuralCut</li>
					<li>
						Modify and distribute the NeuralCut software (under MIT license)
					</li>
				</ul>
				<p>
					You're responsible for how you use NeuralCut and the content you create.
					Don't use it for anything illegal in your jurisdiction.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">AI Features</h2>
				<p>
					AI features like auto captions run entirely in your browser using
					on-device models. No content is uploaded to any server. These features
					are optional - you can use NeuralCut without them.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Service</h2>
				<p>
					NeuralCut does not currently require an account. The service is provided
					"as is" without warranties. While we strive for reliability, we can't
					guarantee uninterrupted service.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Open Source Benefits</h2>
				<p>Because NeuralCut is open source, you have additional rights:</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>Review our code to see exactly how we handle your data</li>
					<li>Self-host NeuralCut on your own servers</li>
					<li>Modify the software to suit your needs</li>
					<li>Contribute improvements back to the community</li>
				</ul>
				<p>
					View our source code and license on{" "}
					<a
						href={SOCIAL_LINKS.github}
						target="_blank"
						rel="noopener"
						className="text-primary hover:underline"
					>
						GitHub
					</a>
					.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Limitations and Liability</h2>
				<p>
					NeuralCut is provided free of charge. To the extent permitted by law:
				</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>We're not liable for any loss of data or content</li>
					<li>
						Projects are stored in your browser and may be lost if you clear
						browser data
					</li>
					<li>We're not responsible for how you use the service</li>
					<li>Our liability is limited to the maximum extent allowed by law</li>
				</ul>
				<p>
					Since your content stays on your device, we have no way to recover
					lost projects. Consider exporting important videos when finished
					editing.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Service Changes</h2>
				<p>We may update NeuralCut and these terms:</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>We'll notify you of significant changes to these terms</li>
					<li>Continued use means you accept any updates</li>
					<li>You can always self-host an older version if you prefer</li>
					<li>Major changes will be discussed with the community on GitHub</li>
				</ul>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Stopping Use</h2>
				<p>You can stop using NeuralCut at any time:</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>Clear your browser data to remove local projects</li>
				</ul>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Contact Us</h2>
				<p>Questions about these terms or need to report an issue?</p>
				<p>
					Contact us through our{" "}
					<a
						href={`${SOCIAL_LINKS.github}/issues`}
						target="_blank"
						rel="noopener"
						className="text-primary hover:underline"
					>
						GitHub repository
					</a>
					, email us at{" "}
					<a
						href="mailto:oss@opencut.app"
						className="text-primary hover:underline"
					>
						oss@opencut.app
					</a>
					, or reach out on{" "}
					<a
						href={SOCIAL_LINKS.x}
						target="_blank"
						rel="noopener"
						className="text-primary hover:underline"
					>
						X (Twitter)
					</a>
					.
				</p>
				<p>
					These terms are governed by applicable law in your jurisdiction. We
					prefer to resolve disputes through friendly discussion in our
					open-source community.
				</p>
			</section>
			<Separator />
			<p className="text-muted-foreground text-sm">
				Last updated: March 15, 2026
			</p>
		</BasePage>
	);
}

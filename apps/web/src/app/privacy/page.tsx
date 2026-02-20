import type { Metadata } from "next";
import { BasePage } from "@/app/base-page";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { SOCIAL_LINKS } from "@/constants/site-constants";

export const metadata: Metadata = {
	title: "Privacy Policy - VibeCut",
	description:
		"Learn how VibeCut handles your data and privacy. Our commitment to protecting your information while you edit videos.",
	openGraph: {
		title: "Privacy Policy - VibeCut",
		description:
			"Learn how VibeCut handles your data and privacy. Our commitment to protecting your information while you edit videos.",
		type: "website",
	},
};

export default function PrivacyPage() {
	return (
		<BasePage
			title="Privacy policy"
			description="Learn how we handle your data and privacy. Contact us if you have any questions."
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
							Your content stays private and encrypted.
						</h3>
						<ol className="list-decimal space-y-2 pl-6">
							<li>
								Basic editing happens locally in your browser - we never see
								your files
							</li>
							<li>
								AI features require encrypted uploads - your content is
								encrypted before leaving your device
							</li>
							<li>
								We only collect your email and basic profile info for your
								account
							</li>
							<li>Project data stays on your device, not our servers</li>
							<li>
								We use analytics to improve the app, but no personal video
								content is tracked
							</li>
							<li>
								You can delete your account anytime and all data gets removed
							</li>
							<li>We don't sell your data or share it with advertisers</li>
						</ol>
						<p className="mt-4">
							Questions? Email us at{" "}
							<a
								href="mailto:oss@vibecut.app"
								className="text-primary hover:underline"
							>
								oss@vibecut.app
							</a>
						</p>
					</AccordionContent>
				</AccordionItem>
			</Accordion>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">How We Handle Your Content</h2>
				<p>
					<strong>Basic video editing happens locally on your device.</strong>{" "}
					For standard editing features, we never upload, store, or have access
					to your video files. Your content remains completely private and under
					your control.
				</p>
				<p>
					<strong>AI features require secure processing:</strong> When you
					choose to use AI features like auto captions, your audio/video content
					is encrypted on your device before being uploaded to our servers for
					processing. We use zero-knowledge encryption, meaning we cannot
					decrypt or view your content.
				</p>
				<p>
					After AI processing is complete, the encrypted content is immediately
					deleted from our servers. Only the results (like generated captions)
					are returned to your device.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Account Information</h2>
				<p>When you create an account, we only collect:</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>Email address (for account access)</li>
					<li>
						Profile information from Google OAuth (if you choose to sign in with
						Google)
					</li>
				</ul>
				<p>
					<strong>We do NOT store your projects on our servers.</strong> All
					project data, including names, thumbnails, and creation dates, is
					stored locally in your browser using IndexedDB.
				</p>
				<p>
					We use secure authentication and follow industry-standard security
					practices.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">AI Features & Encryption</h2>
				<p>
					When you use AI-powered features (like auto captions, content
					analysis, or enhancement tools), your content needs to be processed on
					our servers. Here's how we protect your privacy:
				</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>
						<strong>Client-side encryption:</strong> Your content is encrypted
						on your device before upload
					</li>
					<li>
						<strong>Zero-knowledge processing:</strong> We cannot decrypt or
						view your original content
					</li>
					<li>
						<strong>Temporary processing:</strong> Encrypted content is deleted
						immediately after processing
					</li>
					<li>
						<strong>Opt-in only:</strong> AI features are optional - basic
						editing remains fully local
					</li>
				</ul>
				<p>
					Different AI features may process different types of content (audio
					for captions, video for analysis, etc.), but all follow the same
					zero-knowledge encryption approach.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Analytics</h2>
				<p>
					We use{" "}
					<a
						href="https://www.databuddy.cc"
						target="_blank"
						rel="noopener"
						className="text-primary hover:underline"
					>
						Databuddy
					</a>{" "}
					for completely anonymized and non-invasive analytics to understand how
					people use VibeCut.
				</p>
				<p>
					This helps us improve the editor, but we never collect personal
					information, track individual users, or store any data that could
					identify you.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Local Storage & Cookies</h2>
				<p>We use browser local storage and IndexedDB to:</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>Save your projects locally on your device</li>
					<li>Remember your editor preferences and settings</li>
					<li>Keep you logged in across browser sessions</li>
				</ul>
				<p>
					All data stays on your device and can be cleared at any time through
					your browser settings.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Third-Party Services</h2>
				<p>VibeCut integrates with these services:</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>
						<strong>Google OAuth:</strong> For optional Google sign-in (governed
						by Google's privacy policy)
					</li>
					<li>
						<strong>Vercel:</strong> For hosting and content delivery
					</li>
					<li>
						<strong>Databuddy:</strong> For anonymized analytics
					</li>
				</ul>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Your Rights</h2>
				<p>You have complete control over your data:</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>Delete your account and all associated data at any time</li>
					<li>Export your project data</li>
					<li>Clear local storage to remove all saved projects</li>
					<li>Contact us with any privacy concerns</li>
				</ul>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">Open Source Transparency</h2>
				<p>
					VibeCut is completely open source. You can review our code, see
					exactly how we handle data, and even self-host the application if you
					prefer.
				</p>
				<p>
					View our source code on{" "}
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
				<h2 className="text-2xl font-semibold">Contact Us</h2>
				<p>Questions about this privacy policy or how we handle your data?</p>
				<p>
					Open an issue on our{" "}
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
						href="mailto:oss@vibecut.app"
						className="text-primary hover:underline"
					>
						oss@vibecut.app
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
			</section>

			<Separator />

			<p className="text-muted-foreground text-sm">
				Last updated: July 14, 2025
			</p>
		</BasePage>
	);
}

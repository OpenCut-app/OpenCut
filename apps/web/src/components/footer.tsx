import Link from "next/link";
import { RiDiscordFill, RiTwitterXLine } from "react-icons/ri";
import { FaGithub } from "react-icons/fa6";
import Image from "next/image";
import { DEFAULT_LOGO_URL, SOCIAL_LINKS } from "@/constants/site-constants";
import { capitalizeFirstLetter } from "@/utils/string";

type Category = "resources" | "company";

interface FooterLink {
	label: string;
	href: string;
}

type CategoryLinks = Record<Category, FooterLink[]>;

const links: CategoryLinks = {
	resources: [
		{ label: "Roadmap", href: "/roadmap" },
		{ label: "Blog", href: "/blog" },
		{ label: "Privacy", href: "/privacy" },
		{ label: "Terms of use", href: "/terms" },
	],
	company: [
		{ label: "Contributors", href: "/contributors" },
		{ label: "Sponsors", href: "/sponsors" },
		{ label: "Branding", href: "/branding" },
		{ label: "About", href: "/about" },
	],
};

export function Footer() {
	return (
		<footer className="bg-background border-t">
			<div className="mx-auto max-w-5xl px-8 py-10">
				<div className="mb-8 grid grid-cols-1 gap-12 md:grid-cols-2">
					{/* Brand Section */}
					<div className="max-w-sm md:col-span-1">
						<div className="mb-4 flex items-center justify-start gap-2">
							<Image
								src={DEFAULT_LOGO_URL}
								alt="OpenCut"
								width={24}
								height={24}
								className="invert dark:invert-0"
							/>
							<span className="text-lg font-bold">OpenCut</span>
						</div>
						<p className="text-muted-foreground mb-5 text-sm md:text-left">
							The privacy-first video editor that feels simple to use.
						</p>
						<div className="flex justify-start gap-3">
							<Link
								href={SOCIAL_LINKS.github}
								className="text-muted-foreground hover:text-foreground transition-colors"
								target="_blank"
								rel="noopener noreferrer"
							>
								<FaGithub className="size-5" />
							</Link>
							<Link
								href={SOCIAL_LINKS.x}
								className="text-muted-foreground hover:text-foreground transition-colors"
								target="_blank"
								rel="noopener noreferrer"
							>
								<RiTwitterXLine className="size-5" />
							</Link>
							<Link
								href={SOCIAL_LINKS.discord}
								className="text-muted-foreground hover:text-foreground transition-colors"
								target="_blank"
								rel="noopener noreferrer"
							>
								<RiDiscordFill className="size-5" />
							</Link>
						</div>
					</div>

					<div className="flex items-start justify-start gap-12 py-2">
						{(Object.keys(links) as Category[]).map((category) => (
							<div key={category} className="flex flex-col gap-2">
								<h3 className="text-foreground font-semibold">
									{capitalizeFirstLetter({ string: category })}
								</h3>
								<ul className="space-y-2 text-sm">
									{links[category].map((link) => (
										<li key={link.href}>
											<Link
												href={link.href}
												className="text-muted-foreground hover:text-foreground transition-colors"
												target={
													link.href.startsWith("http") ? "_blank" : undefined
												}
												rel={
													link.href.startsWith("http")
														? "noopener noreferrer"
														: undefined
												}
											>
												{link.label}
											</Link>
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				</div>

				{/* Bottom Section */}
				<div className="flex flex-col items-start justify-between gap-4 pt-2 md:flex-row">
					<div className="text-muted-foreground flex items-center gap-4 text-sm">
						<span>
							© {new Date().getFullYear()} OpenCut, All Rights Reserved
						</span>
					</div>
				</div>
			</div>
		</footer>
	);
}

import { OcDataBuddyIcon, OcMarbleIcon } from "@/ui/icons";

export const SITE_URL = "https://vibecut.app";

export const SITE_INFO = {
	title: "VibeCut",
	description:
		"A simple but powerful video editor that gets the job done. In your browser.",
	url: SITE_URL,
	openGraphImage: "/open-graph/default.jpg",
	twitterImage: "/open-graph/default.jpg",
	favicon: "/favicon.ico",
};

export type ExternalTool = {
	name: string;
	description: string;
	url: string;
	icon: React.ElementType;
};

export const EXTERNAL_TOOLS: ExternalTool[] = [
	{
		name: "Marble",
		description:
			"Modern headless CMS for content management and the blog for VibeCut",
		url: "https://marblecms.com?utm_source=vibecut",
		icon: OcMarbleIcon,
	},
	{
		name: "Databuddy",
		description: "GDPR compliant analytics and user insights for VibeCut",
		url: "https://databuddy.cc?utm_source=vibecut",
		icon: OcDataBuddyIcon,
	},
];

export const DEFAULT_LOGO_URL = "/logos/vibecut/svg/logo.svg";

export const SOCIAL_LINKS = {
	x: "https://x.com/vibecutapp",
	github: "https://github.com/VibeCut-app/VibeCut",
	discord: "https://discord.com/invite/Mu3acKZvCp",
};

export type Sponsor = {
	name: string;
	url: string;
	logo: string;
	description: string;
};

export const SPONSORS: Sponsor[] = [
	{
		name: "Fal.ai",
		url: "https://fal.ai?utm_source=vibecut",
		logo: "/logos/others/fal.svg",
		description: "Generative image, video, and audio models all in one place.",
	},
	{
		name: "Vercel",
		url: "https://vercel.com?utm_source=vibecut",
		logo: "/logos/others/vercel.svg",
		description: "Platform where we deploy and host VibeCut.",
	},
];

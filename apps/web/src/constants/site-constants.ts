import { OcDataBuddyIcon, OcMarbleIcon } from "@opencut/ui/icons";

export const SITE_URL = "https://opencut.app";

export const SITE_INFO = {
	title: "OpenCut",
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
			"Modern headless CMS for content management and the blog for OpenCut",
		url: "https://marblecms.com?utm_source=opencut",
		icon: OcMarbleIcon,
	},
	{
		name: "Databuddy",
		description: "GDPR compliant analytics and user insights for OpenCut",
		url: "https://databuddy.cc?utm_source=opencut",
		icon: OcDataBuddyIcon,
	},
];

export const DEFAULT_LOGO_URL = "/logos/opencut/svg/logo.svg";

export const SOCIAL_LINKS = {
	x: "https://x.com/opencutapp",
	github: "https://github.com/OpenCut-app/OpenCut",
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
		url: "https://fal.ai?utm_source=opencut",
		logo: "/logos/others/fal.svg",
		description: "Generative image, video, and audio models all in one place.",
	},
	{
		name: "Vercel",
		url: "https://vercel.com?utm_source=opencut",
		logo: "/logos/others/vercel.svg",
		description: "Platform where we deploy and host OpenCut.",
	},
];

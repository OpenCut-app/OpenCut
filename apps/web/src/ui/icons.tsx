import type { SVGProps } from "react";
import { ChartArea, Gem, Video } from "lucide-react";

type IconProps = SVGProps<SVGSVGElement>;

export function OcVideoIcon(props: IconProps) {
	return <Video {...props} />;
}

export function OcMarbleIcon(props: IconProps) {
	return <Gem {...props} />;
}

export function OcDataBuddyIcon(props: IconProps) {
	return <ChartArea {...props} />;
}

// Compatibility exports for upstream UI components.
export function OcSocialIcon(props: IconProps) {
	return <Video {...props} />;
}

export function OcFontWeightIcon(props: IconProps) {
	return <ChartArea {...props} />;
}

export function OcSlidersVerticalIcon(props: IconProps) {
	return <ChartArea {...props} />;
}

export function OcCheckerboardIcon(props: IconProps) {
	return <Gem {...props} />;
}

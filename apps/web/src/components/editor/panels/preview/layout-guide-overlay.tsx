"use client";

import { usePreviewStore } from "@/stores/preview-store";
import Image from "next/image";

function TikTokGuide() {
	return (
		<div className="pointer-events-none absolute inset-0">
			<Image
				src="/platform-guides/tiktok-blueprint.png"
				alt="TikTok layout guide"
				className="absolute inset-0 size-full object-contain"
				draggable={false}
				fill
			/>
		</div>
	);
}

export function LayoutGuideOverlay() {
	const { layoutGuide } = usePreviewStore();

	if (layoutGuide.platform === null) return null;
	if (layoutGuide.platform === "tiktok") return <TikTokGuide />;

	return null;
}

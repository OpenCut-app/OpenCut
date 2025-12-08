"use client";

import { useEditorStore } from "@/stores/editor-store";
import Image from "next/image";

/**
 * Renders a non-interactive, full-size overlay showing the TikTok layout guide.
 *
 * @returns A JSX element containing an absolutely positioned, pointer-events-none container with the TikTok layout guide image filling its bounds.
 */
function TikTokGuide() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Image
        src="/platform-guides/tiktok-blueprint.png"
        alt="TikTok layout guide"
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
        fill
      />
    </div>
  );
}

/**
 * Displays a layout guide overlay based on the editor store's selected platform.
 *
 * Renders the TikTokGuide component when `layoutGuide.platform` is `"tiktok"`, otherwise renders `null`.
 *
 * @returns The overlay JSX element for the selected platform, or `null` when no guide applies.
 */
export function LayoutGuideOverlay() {
  const { layoutGuide } = useEditorStore();

  if (layoutGuide.platform === null) return null;
  if (layoutGuide.platform === "tiktok") return <TikTokGuide />;

  return null;
}
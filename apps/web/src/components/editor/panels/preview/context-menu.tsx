"use client";

import {
	ContextMenuCheckboxItem,
	ContextMenuContent,
	ContextMenuItem,
} from "@/components/ui/context-menu";
import { usePreviewStore } from "@/stores/preview-store";

export function PreviewContextMenu({
	onToggleFullscreen,
	containerRef,
}: {
	onToggleFullscreen: () => void;
	containerRef: React.RefObject<HTMLElement | null>;
}) {
	const { overlays, setOverlayVisibility } = usePreviewStore();

	return (
		<ContextMenuContent className="w-56" container={containerRef.current}>
			<ContextMenuItem onClick={onToggleFullscreen} inset>
				Full screen
			</ContextMenuItem>
			<ContextMenuCheckboxItem
				checked={overlays.bookmarks}
				onCheckedChange={(checked) =>
					setOverlayVisibility({ overlay: "bookmarks", isVisible: !!checked })
				}
			>
				Show bookmarks
			</ContextMenuCheckboxItem>
			<ContextMenuItem inset>Show grid</ContextMenuItem>
		</ContextMenuContent>
	);
}

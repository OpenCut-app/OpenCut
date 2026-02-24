"use client";

import { useEditor } from "@/hooks/use-editor";
import { findCurrentScene } from "@/lib/scenes";
import { getBookmarksActiveAtTime } from "@/lib/timeline/bookmarks";

export function BookmarkNoteOverlay() {
	const editor = useEditor();
	const currentTime = editor.playback.getCurrentTime();
	const activeProject = editor.project.getActive();

	if (!activeProject) {
		return null;
	}

	const activeScene = findCurrentScene({
		scenes: activeProject.scenes,
		currentSceneId: activeProject.currentSceneId,
	});

	if (!activeScene) {
		return null;
	}

	const bookmarks = activeScene.bookmarks;
	const activeBookmarks = getBookmarksActiveAtTime({
		bookmarks,
		time: currentTime,
	});
	const bookmarksWithNotes = activeBookmarks.filter(
		(bookmark) => bookmark.note != null && bookmark.note.trim() !== "",
	);

	if (bookmarksWithNotes.length === 0) {
		return null;
	}

	return (
		<div
			className="pointer-events-none absolute top-2 left-2 flex flex-col gap-1.5"
			aria-live="polite"
		>
			{bookmarksWithNotes.map((bookmark) => (
				<div
					key={bookmark.time}
					className="flex max-w-[min(200px,50vw)] px-2.5 py-1.5 text-left text-white text-xs shadow-md backdrop-blur-sm"
					style={{
						backgroundColor: "rgb(0 0 0 / 0.5)",
						borderLeft: bookmark.color
							? `3px solid ${bookmark.color}`
							: "3px solid var(--primary)",
					}}
				>
					{bookmark.note}
				</div>
			))}
		</div>
	);
}

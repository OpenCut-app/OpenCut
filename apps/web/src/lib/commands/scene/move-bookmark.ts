import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type { TScene } from "@/types/timeline";
import { updateSceneInArray } from "@/lib/scenes";
import { getFrameTime, moveBookmarkInArray } from "@/lib/timeline/bookmarks";

export class MoveBookmarkCommand extends Command {
	private savedScenes: TScene[] | null = null;

	constructor(
		private fromTime: number,
		private toTime: number,
	) {
		super();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		const activeScene = editor.scenes.getActiveScene();
		const activeProject = editor.project.getActive();

		if (!activeScene || !activeProject) {
			return;
		}

		const scenes = editor.scenes.getScenes();
		this.savedScenes = [...scenes];

		const fromFrameTime = getFrameTime({
			time: this.fromTime,
			fps: activeProject.settings.fps,
		});
		const toFrameTime = getFrameTime({
			time: this.toTime,
			fps: activeProject.settings.fps,
		});

		const updatedBookmarks = moveBookmarkInArray({
			bookmarks: activeScene.bookmarks,
			fromTime: fromFrameTime,
			toTime: toFrameTime,
		});

		const updatedScenes = updateSceneInArray({
			scenes,
			sceneId: activeScene.id,
			updates: { bookmarks: updatedBookmarks },
		});

		editor.scenes.setScenes({ scenes: updatedScenes });
	}

	undo(): void {
		if (this.savedScenes) {
			const editor = EditorCore.getInstance();
			editor.scenes.setScenes({ scenes: this.savedScenes });
		}
	}
}

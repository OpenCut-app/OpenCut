import { Command } from "@/lib/commands/base-command";
import type { TimelineTrack } from "@/types/timeline";
import { EditorCore } from "@/core";

export class TracksSnapshotCommand extends Command {
	constructor(
		private before: TimelineTrack[],
		private after: TimelineTrack[],
	) {
		super();
	}

	execute(): void {
		EditorCore.getInstance().timeline.updateTracks(this.after);
	}

	undo(): void {
		EditorCore.getInstance().timeline.updateTracks(this.before);
	}
}

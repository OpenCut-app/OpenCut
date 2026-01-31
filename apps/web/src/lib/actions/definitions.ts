import type { ShortcutKey } from "@/types/keybinding";

export type TActionCategory =
	| "playback"
	| "navigation"
	| "editing"
	| "selection"
	| "history"
	| "timeline"
	| "controls";

export interface TActionDefinition {
	description: string;
	category: TActionCategory;
	defaultShortcuts?: ShortcutKey[];
	args?: Record<string, unknown>;
}

export const ACTIONS = {
	"toggle-play": {
		description: "Play/Pause",
		category: "playback",
		defaultShortcuts: ["space", "k"],
	},
	"stop-playback": {
		description: "Stop playback",
		category: "playback",
	},
	"seek-forward": {
		description: "Seek forward 1 second",
		category: "playback",
		defaultShortcuts: ["l"],
		args: { seconds: "number" },
	},
	"seek-backward": {
		description: "Seek backward 1 second",
		category: "playback",
		defaultShortcuts: ["j"],
		args: { seconds: "number" },
	},
	"frame-step-forward": {
		description: "Frame step forward",
		category: "navigation",
		defaultShortcuts: ["right"],
	},
	"frame-step-backward": {
		description: "Frame step backward",
		category: "navigation",
		defaultShortcuts: ["left"],
	},
	"jump-forward": {
		description: "Jump forward 5 seconds",
		category: "navigation",
		defaultShortcuts: ["shift+right"],
		args: { seconds: "number" },
	},
	"jump-backward": {
		description: "Jump backward 5 seconds",
		category: "navigation",
		defaultShortcuts: ["shift+left"],
		args: { seconds: "number" },
	},
	"goto-start": {
		description: "Go to timeline start",
		category: "navigation",
		defaultShortcuts: ["home", "enter"],
	},
	"goto-end": {
		description: "Go to timeline end",
		category: "navigation",
		defaultShortcuts: ["end"],
	},
	split: {
		description: "Split elements at playhead",
		category: "editing",
		defaultShortcuts: ["s"],
	},
	"split-left": {
		description: "Split and remove left",
		category: "editing",
		defaultShortcuts: ["q"],
	},
	"split-right": {
		description: "Split and remove right",
		category: "editing",
		defaultShortcuts: ["w"],
	},
	"delete-selected": {
		description: "Delete selected elements",
		category: "editing",
		defaultShortcuts: ["backspace", "delete"],
	},
	"copy-selected": {
		description: "Copy selected elements",
		category: "editing",
		defaultShortcuts: ["ctrl+c"],
	},
	"cut-selected": {
		description: "Cut selected elements",
		category: "editing",
		defaultShortcuts: ["ctrl+x"],
	},
	"paste-copied": {
		description: "Paste elements at playhead",
		category: "editing",
		defaultShortcuts: ["ctrl+v"],
	},
	"toggle-snapping": {
		description: "Toggle snapping",
		category: "editing",
		defaultShortcuts: ["n"],
	},
	"select-all": {
		description: "Select all elements",
		category: "selection",
		defaultShortcuts: ["ctrl+a"],
	},
	"duplicate-selected": {
		description: "Duplicate selected element",
		category: "selection",
		defaultShortcuts: ["ctrl+d"],
	},
	"toggle-elements-muted-selected": {
		description: "Mute/unmute selected elements",
		category: "selection",
	},
	"toggle-elements-visibility-selected": {
		description: "Show/hide selected elements",
		category: "selection",
	},
	"toggle-bookmark": {
		description: "Toggle bookmark at playhead",
		category: "timeline",
	},
	undo: {
		description: "Undo",
		category: "history",
		defaultShortcuts: ["ctrl+z"],
	},
	redo: {
		description: "Redo",
		category: "history",
		defaultShortcuts: ["ctrl+shift+z", "ctrl+y"],
	},
} as const satisfies Record<string, TActionDefinition>;

export type TAction = keyof typeof ACTIONS;

export function getActionDefinition(action: TAction): TActionDefinition {
	return ACTIONS[action];
}

export function getDefaultShortcuts(): Record<ShortcutKey, TAction> {
	const shortcuts: Record<string, TAction> = {};

	for (const [action, def] of Object.entries(ACTIONS) as Array<
		[TAction, TActionDefinition]
	>) {
		if (def.defaultShortcuts) {
			for (const shortcut of def.defaultShortcuts) {
				shortcuts[shortcut] = action;
			}
		}
	}

	return shortcuts as Record<ShortcutKey, TAction>;
}

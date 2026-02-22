import type { TActionWithOptionalArgs } from "@/lib/actions";
import type { ShortcutKey } from "@/types/keybinding";
import type { KeybindingConfig } from "@/types/keybinding";

interface V3State {
	keybindings: KeybindingConfig;
	isCustomized: boolean;
}

export function v3ToV4({ state }: { state: unknown }): unknown {
	const v3 = state as V3State;

	const renames: Record<string, string> = {
		"paste-selected": "paste-copied",
	};

	const migrated = { ...v3.keybindings };
	for (const [key, action] of Object.entries(migrated)) {
		if (action && renames[action]) {
			migrated[key as ShortcutKey] = renames[action] as TActionWithOptionalArgs;
		}
	}

	return { ...v3, keybindings: migrated };
}

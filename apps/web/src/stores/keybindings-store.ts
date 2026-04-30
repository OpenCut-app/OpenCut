"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TActionWithOptionalArgs } from "@/lib/actions";
import { getDefaultShortcuts } from "@/lib/actions";
import { isTypableDOMElement } from "@/utils/browser";
import { isAppleDevice } from "@/utils/platform";
import type { KeybindingConfig, ShortcutKey } from "@/lib/actions/keybinding";
import { runMigrations, CURRENT_VERSION } from "./keybindings/migrations";

const defaultKeybindings: KeybindingConfig = getDefaultShortcuts();

export interface KeybindingConflict {
	key: ShortcutKey;
	existingAction: TActionWithOptionalArgs;
	newAction: TActionWithOptionalArgs;
}

interface KeybindingsState {
	keybindings: KeybindingConfig;
	isCustomized: boolean;
	overlayDepth: number;
	openOverlayIds: string[];
	isLoadingProject: boolean;
	isRecording: boolean;

	updateKeybinding: (key: ShortcutKey, action: TActionWithOptionalArgs) => void;
	removeKeybinding: (key: ShortcutKey) => void;
	resetToDefaults: () => void;
	importKeybindings: (config: KeybindingConfig) => void;
	exportKeybindings: () => KeybindingConfig;
	openOverlay: (overlayId: string) => void;
	closeOverlay: (overlayId: string) => void;
	setLoadingProject: (loading: boolean) => void;
	setIsRecording: (isRecording: boolean) => void;
	validateKeybinding: (
		key: ShortcutKey,
		action: TActionWithOptionalArgs,
	) => KeybindingConflict | null;
	getKeybindingsForAction: (action: TActionWithOptionalArgs) => ShortcutKey[];
	getKeybindingString: (ev: KeyboardEvent) => ShortcutKey | null;
}

function isDOMElement(element: EventTarget | null): element is HTMLElement {
	return element instanceof HTMLElement;
}

export const useKeybindingsStore = create<KeybindingsState>()(
	persist(
		(set, get) => ({
			keybindings: { ...defaultKeybindings },
			isCustomized: false,
			overlayDepth: 0,
			openOverlayIds: [],
			isLoadingProject: false,
			isRecording: false,

			openOverlay: (overlayId) =>
				set((s) => {
					const openOverlayIds = s.openOverlayIds.includes(overlayId)
						? s.openOverlayIds
						: [...s.openOverlayIds, overlayId];
					const nextOverlayDepth = openOverlayIds.length;
					return {
						openOverlayIds,
						overlayDepth: nextOverlayDepth,
					};
				}),
			closeOverlay: (overlayId) =>
				set((s) => {
					const openOverlayIds = s.openOverlayIds.filter(
						(id) => id !== overlayId,
					);
					const nextOverlayDepth = openOverlayIds.length;
					return {
						openOverlayIds,
						overlayDepth: nextOverlayDepth,
					};
				}),
			setLoadingProject: (loading) => {
				set({ isLoadingProject: loading });
			},

			updateKeybinding: (key: ShortcutKey, action: TActionWithOptionalArgs) => {
				set((state) => {
					const newKeybindings = { ...state.keybindings };
					newKeybindings[key] = action;

					return {
						keybindings: newKeybindings,
						isCustomized: true,
					};
				});
			},

			removeKeybinding: (key: ShortcutKey) => {
				set((state) => {
					const newKeybindings = { ...state.keybindings };
					delete newKeybindings[key];

					return {
						keybindings: newKeybindings,
						isCustomized: true,
					};
				});
			},

			resetToDefaults: () => {
				set({
					keybindings: { ...defaultKeybindings },
					isCustomized: false,
				});
			},

			importKeybindings: (config: KeybindingConfig) => {
				for (const [key] of Object.entries(config)) {
					if (typeof key !== "string" || key.length === 0) {
						throw new Error(`Invalid key format: ${key}`);
					}
				}
				set({
					keybindings: { ...config },
					isCustomized: true,
				});
			},

			exportKeybindings: () => {
				return get().keybindings;
			},

			validateKeybinding: (
				key: ShortcutKey,
				action: TActionWithOptionalArgs,
			) => {
				const { keybindings } = get();
				const existingAction = keybindings[key];

				if (existingAction && existingAction !== action) {
					return {
						key,
						existingAction,
						newAction: action,
					};
				}

				return null;
			},
			setIsRecording: (isRecording: boolean) => {
				set({ isRecording });
			},

			getKeybindingsForAction: (action: TActionWithOptionalArgs) => {
				const { keybindings } = get();
				return Object.keys(keybindings).filter(
					(key) => keybindings[key as ShortcutKey] === action,
				) as ShortcutKey[];
			},

			getKeybindingString: (ev: KeyboardEvent) => {
				return generateKeybindingString(ev) as ShortcutKey | null;
			},
		}),
		{
			name: "neuralcut-keybindings",
			version: CURRENT_VERSION,
			partialize: (state) => ({
				keybindings: state.keybindings,
				isCustomized: state.isCustomized,
			}),
			migrate: (persisted, version) =>
				runMigrations({ state: persisted, fromVersion: version }),
		},
	),
);

function generateKeybindingString(ev: KeyboardEvent): ShortcutKey | null {
	const target = ev.target;
	const modifierKey = getActiveModifier(ev);
	const key = getPressedKey(ev);
	if (!key) return null;

	if (modifierKey) {
		if (
			modifierKey === "shift" &&
			isDOMElement(target) &&
			isTypableDOMElement({ element: target as HTMLElement })
		) {
			return null;
		}

		return `${modifierKey}+${key}` as ShortcutKey;
	}

	if (
		isDOMElement(target) &&
		isTypableDOMElement({ element: target as HTMLElement })
	)
		return null;

	return `${key}` as ShortcutKey;
}

function getPressedKey(ev: KeyboardEvent): string | null {
	const key = (ev.key ?? "").toLowerCase();
	const code = ev.code ?? "";

	if (code === "Space" || key === " " || key === "spacebar" || key === "space")
		return "space";

	if (key.startsWith("arrow")) return key.slice(5);

	if (key === "escape") return "escape";
	if (key === "tab") return "tab";
	if (key === "home") return "home";
	if (key === "end") return "end";
	if (key === "delete") return "delete";
	if (key === "backspace") return "backspace";

	if (code.startsWith("Key")) {
		const letter = code.slice(3).toLowerCase();
		if (letter.length === 1 && letter >= "a" && letter <= "z") return letter;
	}

	// Use physical key position for AZERTY and other non-QWERTY layouts
	if (code.startsWith("Digit")) {
		const digit = code.slice(5);
		if (digit.length === 1 && digit >= "0" && digit <= "9") return digit;
	}

	const isDigit = key.length === 1 && key >= "0" && key <= "9";
	if (isDigit) return key;

	if (key === "/" || key === "." || key === "enter") return key;

	return null;
}

function getActiveModifier(ev: KeyboardEvent): string | null {
	const modifierKeys = {
		ctrl: isAppleDevice() ? ev.metaKey : ev.ctrlKey,
		alt: ev.altKey,
		shift: ev.shiftKey,
	};

	const activeModifier = Object.keys(modifierKeys)
		.filter((key) => modifierKeys[key as keyof typeof modifierKeys])
		.join("+");

	return activeModifier === "" ? null : activeModifier;
}

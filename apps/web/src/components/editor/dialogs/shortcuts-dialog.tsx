"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	type KeyboardShortcut,
	useKeyboardShortcutsHelp,
} from "@/hooks/use-keyboard-shortcuts-help";
import { useKeybindingsStore } from "@/stores/keybindings-store";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ShortcutKey } from "@/types/keybinding";

interface RecordingState {
	shortcut: KeyboardShortcut;
	mode: "add" | "replace";
	keyToReplace?: ShortcutKey;
}

export function ShortcutsDialog({
	isOpen,
	onOpenChange,
}: {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [recordingState, setRecordingState] = useState<RecordingState | null>(
		null,
	);

	const {
		updateKeybinding,
		removeKeybinding,
		getKeybindingString,
		validateKeybinding,
		setIsRecording,
		resetToDefaults,
		isRecording,
	} = useKeybindingsStore();

	const { shortcuts } = useKeyboardShortcutsHelp();

	const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

	useEffect(() => {
		if (!isRecording || !recordingState) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			e.preventDefault();
			e.stopPropagation();

			const keyString = getKeybindingString(e);
			if (keyString) {
				const conflict = validateKeybinding(
					keyString,
					recordingState.shortcut.action,
				);
				if (conflict) {
					toast.error(
						`Key "${keyString}" is already bound to "${conflict.existingAction}"`,
					);
					setRecordingState(null);
					setIsRecording(false);
					return;
				}

				// Only remove the specific key being replaced, not all keys
				if (recordingState.mode === "replace" && recordingState.keyToReplace) {
					removeKeybinding(recordingState.keyToReplace);
				}

				updateKeybinding(keyString, recordingState.shortcut.action);

				setIsRecording(false);
				setRecordingState(null);
			}
		};

		const handleClickOutside = () => {
			setRecordingState(null);
			setIsRecording(false);
		};

		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("click", handleClickOutside);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("click", handleClickOutside);
		};
	}, [
		recordingState,
		getKeybindingString,
		updateKeybinding,
		removeKeybinding,
		validateKeybinding,
		setIsRecording,
		isRecording,
	]);

	const handleStartReplacing = (shortcut: KeyboardShortcut, key: ShortcutKey) => {
		setRecordingState({ shortcut, mode: "replace", keyToReplace: key });
		setIsRecording(true);
	};

	const handleStartAdding = (shortcut: KeyboardShortcut) => {
		setRecordingState({ shortcut, mode: "add" });
		setIsRecording(true);
	};

	const handleRemoveKey = (key: ShortcutKey) => {
		removeKeybinding(key);
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[80vh] max-w-2xl flex-col p-0">
				<DialogHeader>
					<DialogTitle>Keyboard shortcuts</DialogTitle>
				</DialogHeader>

				<DialogBody className="scrollbar-thin flex-grow overflow-y-auto">
					<div className="flex flex-col gap-6">
						{categories.map((category) => (
							<div key={category} className="flex flex-col gap-1">
								<h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
									{category}
								</h3>
								<div className="flex flex-col gap-1">
									{shortcuts
										.filter((shortcut) => shortcut.category === category)
										.map((shortcut) => (
											<ShortcutItem
												key={shortcut.action}
												shortcut={shortcut}
												isRecording={
													shortcut.action === recordingState?.shortcut.action
												}
												recordingMode={recordingState?.mode}
												onStartReplacing={(key: ShortcutKey) =>
													handleStartReplacing(shortcut, key)
												}
												onStartAdding={() => handleStartAdding(shortcut)}
												onRemoveKey={handleRemoveKey}
											/>
										))}
								</div>
							</div>
						))}
					</div>
				</DialogBody>
				<DialogFooter>
					<Button variant="destructive" onClick={resetToDefaults}>
						Reset to default
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function ShortcutItem({
	shortcut,
	isRecording,
	recordingMode,
	onStartReplacing,
	onStartAdding,
	onRemoveKey,
}: {
	shortcut: KeyboardShortcut;
	isRecording: boolean;
	recordingMode?: "add" | "replace";
	onStartReplacing: (key: ShortcutKey) => void;
	onStartAdding: () => void;
	onRemoveKey: (key: ShortcutKey) => void;
}) {
	const displayKeys = shortcut.keys.filter((key: string) => {
		if (
			key.includes("Cmd") &&
			shortcut.keys.includes(key.replace("Cmd", "Ctrl"))
		)
			return false;

		return true;
	});

	// Get raw keys for remove functionality (before formatting)
	const { keybindings } = useKeybindingsStore();
	const rawKeys = Object.entries(keybindings)
		.filter(([, action]) => action === shortcut.action)
		.map(([key]) => key as ShortcutKey);

	return (
		<div className="flex items-center justify-between py-1">
			<div className="flex items-center gap-3">
				{shortcut.icon && (
					<div className="text-muted-foreground">{shortcut.icon}</div>
				)}
				<span className="text-sm">{shortcut.description}</span>
			</div>
			<div className="flex items-center gap-2">
				{displayKeys.map((key: string, index: number) => (
					<div key={key} className="flex items-center gap-2">
						<div className="flex items-center gap-1">
							{key.split("+").map((keyPart: string, partIndex: number) => {
								const keyId = `${shortcut.id}-${index}-${partIndex}`;
								const rawKey = rawKeys[index];
								return (
									<EditableShortcutKey
										key={keyId}
										isRecording={isRecording && recordingMode === "replace"}
										onStartRecording={() => rawKey && onStartReplacing(rawKey)}
										onRemove={
											displayKeys.length > 1 && rawKey
												? () => onRemoveKey(rawKey)
												: undefined
										}
									>
										{keyPart}
									</EditableShortcutKey>
								);
							})}
						</div>
						{index < displayKeys.length - 1 && (
							<span className="text-muted-foreground text-xs">or</span>
						)}
					</div>
				))}
				<Button
					variant="outline"
					size="sm"
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						onStartAdding();
					}}
					title="Add another shortcut"
					className={isRecording && recordingMode === "add" ? "ring-2 ring-primary" : ""}
				>
					<HugeiconsIcon icon={PlusSignIcon} className="size-3" />
				</Button>
			</div>
		</div>
	);
}

function EditableShortcutKey({
	children,
	isRecording,
	onStartRecording,
	onRemove,
}: {
	children: React.ReactNode;
	isRecording: boolean;
	onStartRecording: () => void;
	onRemove?: () => void;
}) {
	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		onStartRecording();
	};

	const handleRightClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (onRemove) {
			onRemove();
		}
	};

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={handleClick}
			onContextMenu={handleRightClick}
			className={isRecording ? "ring-2 ring-primary" : ""}
			title={
				isRecording
					? "Press any key combination..."
					: onRemove
						? "Click to edit, right-click to remove"
						: "Click to edit shortcut"
			}
		>
			{children}
		</Button>
	);
}

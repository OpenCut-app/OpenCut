import { useEffect } from "react";
import { invokeAction } from "../constants/actions";
import { useKeybindingsStore } from "@/stores/keybindings-store";

/**
 * A composable that hooks to the caller component's
 * lifecycle and hooks to the keyboard events to fire
 * the appropriate actions based on keybindings
 */
export function useKeybindingsListener() {
  const { keybindings, getKeybindingString, keybindingsEnabled, isRecording } =
    useKeybindingsStore();

  useEffect(() => {
    const handleKeyDown = (ev: KeyboardEvent) => {
      // Do not check keybinds if the mode is disabled
      if (!keybindingsEnabled) return;
      // ignore key events if user is changing keybindings
      if (isRecording) return;

      const binding = getKeybindingString(ev);
      if (!binding) return;

      const boundAction = keybindings[binding];
      if (!boundAction) return;

      const activeElement = document.activeElement;
      const isTextInput =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          (activeElement as HTMLElement).isContentEditable);

      if (isTextInput) return;

      ev.preventDefault();

      // Handle actions with default arguments
      let actionArgs: any;

      if (boundAction === "seek-forward") {
        actionArgs = { seconds: 1 };
      } else if (boundAction === "seek-backward") {
        actionArgs = { seconds: 1 };
      } else if (boundAction === "jump-forward") {
        actionArgs = { seconds: 5 };
      } else if (boundAction === "jump-backward") {
        actionArgs = { seconds: 5 };
      }

      invokeAction(boundAction, actionArgs, "keypress");
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [keybindings, getKeybindingString, keybindingsEnabled, isRecording]);
}

/**
 * This composable allows for the UI component to be disabled if the component in question is mounted
 */
export function useKeybindingDisabler() {
  const { disableKeybindings, enableKeybindings } = useKeybindingsStore();

  return {
    disableKeybindings,
    enableKeybindings,
  };
}

// Export the bindings for backward compatibility
export const bindings = {};

import { ActionWithOptionalArgs } from "@/constants/actions";

/**
 * Alt is also regarded as macOS OPTION (⌥) key
 * Ctrl is also regarded as macOS COMMAND (⌘) key (NOTE: this differs from HTML Keyboard spec where COMMAND is Meta key!)
 */
export type ModifierKeys =
  | "ctrl"
  | "alt"
  | "shift"
  | "ctrl+shift"
  | "alt+shift"
  | "ctrl+alt"
  | "ctrl+alt+shift";

/* eslint-disable prettier/prettier */
// prettier-ignore
export type Key =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z"
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "up"
  | "down"
  | "left"
  | "right"
  | "/"
  | "?"
  | "."
  | "enter"
  | "tab"
  | "space"
  | "escape"
  | "esc"
  | "backspace"
  | "delete"
  | "home"
  | "end";
/* eslint-enable */

export type ModifierBasedShortcutKey = `${ModifierKeys}+${Key}`;
// Singular keybindings (these will be disabled when an input-ish area has been focused)
export type SingleCharacterShortcutKey = `${Key}`;

export type ShortcutKey = ModifierBasedShortcutKey | SingleCharacterShortcutKey;

export type KeybindingConfig = {
  [key in ShortcutKey]?: ActionWithOptionalArgs;
};

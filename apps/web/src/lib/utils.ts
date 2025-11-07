// Generic utilities

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uppercase(str: string) {
  return str.toUpperCase();
}

/**
 * Generates a UUID v4 string
 * Uses crypto.randomUUID() if available, otherwise falls back to a custom implementation
 */
export function generateUUID(): string {
  // Use the native crypto.randomUUID if available
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  // Secure fallback using crypto.getRandomValues
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Set version 4 (UUIDv4)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // Set variant 10xxxxxx
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0"));

  return (
    hex.slice(0, 4).join("") +
    "-" +
    hex.slice(4, 6).join("") +
    "-" +
    hex.slice(6, 8).join("") +
    "-" +
    hex.slice(8, 10).join("") +
    "-" +
    hex.slice(10, 16).join("")
  );
}

export function isDOMElement(el: any): el is HTMLElement {
  return !!el && (el instanceof Element || el instanceof HTMLElement);
}

export function isTypableElement(el: HTMLElement): boolean {
  // If content editable, then it is editable
  if (el.isContentEditable) return true;

  // If element is an input and the input is enabled, then it is typable
  if (el.tagName === "INPUT") {
    return !(el as HTMLInputElement).disabled;
  }
  // If element is a textarea and the input is enabled, then it is typable
  if (el.tagName === "TEXTAREA") {
    return !(el as HTMLTextAreaElement).disabled;
  }

  return false;
}
export function isAppleDevice() {
  return /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
}

export function getPlatformSpecialKey() {
  return isAppleDevice() ? "⌘" : "Ctrl";
}

export function getPlatformAlternateKey() {
  return isAppleDevice() ? "⌥" : "Alt";
}

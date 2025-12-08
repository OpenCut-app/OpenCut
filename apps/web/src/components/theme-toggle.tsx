"use client";

import { Button } from "./ui/button";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

interface ThemeToggleProps {
  className?: string;
}

/**
 * Renders a button that toggles the application theme between light and dark.
 *
 * The button displays a Sun icon and an accessible label that indicates which theme will be activated when pressed.
 *
 * @returns The theme toggle button element
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      size="icon"
      variant="text"
      className="h-7"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="!size-[1.1rem]" />
      <span className="sr-only">{theme === "dark" ? "Light" : "Dark"}</span>
    </Button>
  );
}
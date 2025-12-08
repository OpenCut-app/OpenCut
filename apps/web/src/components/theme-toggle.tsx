"use client";

import { Button } from "./ui/button";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // ensure component only renders theme-dependent text on client
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Button
      size="icon"
      variant="text"
      className="h-7"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="!size-[1.1rem]" />
      {mounted && (
        <span className="sr-only">{theme === "dark" ? "Light" : "Dark"}</span>
      )}
    </Button>
  );
}

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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true)
  }, []) // this will see that the client side is rendered or not.
  
  // if the client side is rendered then only render the button
  return (
    <>
      {
        isClient && <Button
          size="icon"
          variant="text"
          className="h-7"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="!size-[1.1rem]" /> : <Moon className="!size-[1.1rem]" />}
          {/* <span className="sr-only">{theme === "dark" ? "Light" : "Dark"}</span> */}
        </Button>
      } 
    </>
  );
}

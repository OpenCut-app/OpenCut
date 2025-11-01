"use client"

import { ThemeProvider, ThemeProviderProps } from "next-themes";
import { useEffect, useState } from "react"

interface CustomThemeProviderProps extends ThemeProviderProps {
  children: React.ReactNode;
}

export default function CustomThemeProvider({ children, ...props }: CustomThemeProviderProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return <ThemeProvider {...props}>{children}</ThemeProvider >
}

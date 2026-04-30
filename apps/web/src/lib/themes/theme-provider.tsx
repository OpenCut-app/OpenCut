"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { useThemeStore } from "@/lib/themes";

const PALETTE_SCRIPT = `
(function(){
  try {
    var s = localStorage.getItem('neuralcut-theme');
    if (s) {
      var d = JSON.parse(s);
      if (d && d.state && d.state.paletteId) {
        document.documentElement.setAttribute('data-palette', d.state.paletteId);
      }
    } else {
      document.documentElement.setAttribute('data-palette', 'neuralcut');
    }
  } catch(e) {
    document.documentElement.setAttribute('data-palette', 'neuralcut');
  }
})();
`;

export function NeuralCutThemeProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const paletteId = useThemeStore((s) => s.paletteId);

	useEffect(() => {
		document.documentElement.setAttribute("data-palette", paletteId);
	}, [paletteId]);

	return (
		<>
			<script dangerouslySetInnerHTML={{ __html: PALETTE_SCRIPT }} />
			<ThemeProvider
				attribute="class"
				defaultTheme="system"
				disableTransitionOnChange
			>
				{children}
			</ThemeProvider>
		</>
	);
}

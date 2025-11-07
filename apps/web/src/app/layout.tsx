import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { StorageProvider } from "../components/storage-provider";
import { ScenesMigrator } from "../components/providers/migrators/scenes-migrator";
import { baseMetaData } from "./metadata";
import { defaultFont } from "../lib/font-config";
import { BotIdClient } from "botid/client";
import { env } from "@/env";

export const metadata = baseMetaData;

const protectedRoutes = [
  {
    path: "/none",
    method: "GET",
  },
  {
    path: "/api/waitlist/export",
    method: "POST",
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <BotIdClient protect={protectedRoutes} />
      </head>
      <body className={`${defaultFont.className} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <TooltipProvider>
            <StorageProvider>
              <ScenesMigrator>{children}</ScenesMigrator>
            </StorageProvider>
            <Analytics />
            <Toaster />
            <Script
              src="https://cdn.databuddy.cc/databuddy.js"
              strategy="afterInteractive"
              async
              data-client-id="UP-Wcoy5arxFeK7oyjMMZ"
              data-disabled={env.NODE_ENV === "development"}
              data-track-attributes={false}
              data-track-errors={true}
              data-track-outgoing-links={false}
              data-track-web-vitals={false}
              data-track-sessions={false}
            />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

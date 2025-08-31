"use client";

import { useGlobalPrefetcher } from "@/components/providers/global-prefetcher";

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useGlobalPrefetcher();

  return <div>{children}</div>;
}

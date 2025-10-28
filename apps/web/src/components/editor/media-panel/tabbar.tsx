"use client";

import { cn } from "@/lib/utils";
import { Tab, tabs, useMediaPanelStore } from "./store";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useRef, useState } from "react";

export function TabBar() {
  const { activeTab, setActiveTab } = useMediaPanelStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

  const checkScrollPosition = () => {
    const element = scrollRef.current;
    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;
    setShowTopFade(scrollTop > 0);
    setShowBottomFade(scrollTop < scrollHeight - clientHeight - 1);
  };

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    checkScrollPosition();
    element.addEventListener("scroll", checkScrollPosition);
    
    const resizeObserver = new ResizeObserver(checkScrollPosition);
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener("scroll", checkScrollPosition);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="flex relative">
      <div 
        ref={scrollRef}
        className="h-full px-4 flex flex-col justify-start items-center gap-5 overflow-y-auto scrollbar-hidden relative w-full py-4"
      >
        {(Object.keys(tabs) as Tab[]).map((tabKey) => {
          const tab = tabs[tabKey];
          return (
            <div
              className={cn(
                "flex z-[100] flex-col gap-0.5 items-center cursor-pointer",
                activeTab === tabKey
                  ? "text-primary !opacity-100"
                  : "text-muted-foreground"
              )}
              onClick={() => setActiveTab(tabKey)}
              key={tabKey}
            >
              <Tooltip delayDuration={10}>
                <TooltipTrigger asChild>
                  <tab.icon className="size-[1.1rem]! opacity-100 hover:opacity-75" />
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  align="center"
                  variant="sidebar"
                  sideOffset={8}
                >
                  <div className="dark:text-base-gray-950 text-black text-sm font-medium leading-none dark:text-white">
                    {tab.label}
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          );
        })}
      </div>
      
      <FadeOverlay direction="top" show={showTopFade} />
      <FadeOverlay direction="bottom" show={showBottomFade} />
    </div>
  );
}

function FadeOverlay({ direction, show }: { direction: "top" | "bottom", show: boolean }) {
  return (
    <div 
      className={cn(
        "absolute left-0 right-0 h-6 pointer-events-none z-[101] transition-opacity duration-200",
        direction === "top" && show
          ? "top-0 bg-gradient-to-b from-panel to-transparent" 
          : "bottom-0 bg-gradient-to-t from-panel to-transparent"
      )}
    />
  );
}
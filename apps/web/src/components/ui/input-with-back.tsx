"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search } from "lucide-react";
import { motion } from "motion/react";
import { useState, useEffect } from "react";

interface InputWithBackProps {
  isExpanded: boolean;
  setIsExpanded: (isExpanded: boolean) => void;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disableAnimation?: boolean;
}

export function InputWithBack({
  isExpanded,
  setIsExpanded,
  placeholder = "Search anything",
  value,
  onChange,
  disableAnimation = false,
}: InputWithBackProps) {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [buttonOffset, setButtonOffset] = useState(-60);

  const smoothTransition = {
    duration: disableAnimation ? 0 : 0.35,
    ease: [0.25, 0.1, 0.25, 1] as const,
  };

  useEffect(() => {
    if (containerRef) {
      const rect = containerRef.getBoundingClientRect();
      setButtonOffset(-rect.left - 48);
    }
  }, [containerRef]);

  return (
    <div ref={setContainerRef} className="relative w-full">
      <motion.div
        className="absolute left-0 top-1/2 -translate-y-1/2 cursor-pointer hover:opacity-75 transition-opacity z-10"
        initial={{
          x: isExpanded ? 0 : buttonOffset,
          opacity: isExpanded ? 1 : 0.5,
        }}
        animate={{
          x: isExpanded ? 0 : buttonOffset,
          opacity: isExpanded ? 1 : 0.5,
        }}
        transition={smoothTransition}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Button
          variant="outline"
          className="!size-9 rounded-full bg-panel-accent"
        >
          <ArrowLeft />
        </Button>
      </motion.div>
      <div
        className="relative flex-1"
        style={{ marginLeft: "0px", paddingLeft: "0px" }}
      >
        <motion.div
          className="relative"
          initial={{
            marginLeft: isExpanded ? 50 : 0,
          }}
          animate={{
            marginLeft: isExpanded ? 50 : 0,
          }}
          transition={smoothTransition}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            className="pl-9 bg-panel-accent w-full"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
          />
        </motion.div>
      </div>
    </div>
  );
}

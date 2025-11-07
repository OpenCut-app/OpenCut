"use client";

import { InputWithBack } from "@/components/ui/input-with-back";
import { useState } from "react";

export default function AnimationPage() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="h-dvh flex">
      <div className="bg-panel p-6 w-[20rem]">
        <InputWithBack isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
      </div>
      <div className="p-6 flex items-end justify-end">
        <p
          onClick={() => setIsExpanded(!isExpanded)}
          className="cursor-pointer hover:opacity-75 transition-opacity"
        >
          {isExpanded ? "Collapse" : "Expand"}
        </p>
      </div>
    </div>
  );
}

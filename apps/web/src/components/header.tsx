"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import { HeaderBase } from "./header-base";
import { useSession } from "@opencut/auth/client";
import { getStars } from "@/lib/fetchGhStars";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useProjectStore } from "@/stores/project-store";
import { useRouter } from "next/navigation";

export function Header() {
  const router = useRouter();
  const { data: session } = useSession();
  const [star, setStar] = useState<string>("");
  const { createNewProject } = useProjectStore();

  useEffect(() => {
    const fetchStars = async () => {
      try {
        const data = await getStars();
        setStar(data);
      } catch (err) {
        console.error("Failed to fetch GitHub stars", err);
      }
    };

    fetchStars();
  }, []);

  const gotToEditor = async () => {
    const newProjectId = await createNewProject();
    if (newProjectId) {
      router.push(`/editor/${newProjectId}`);
    }
  };

  const leftContent = (
    <Link href="/" className="flex items-center gap-3">
      <Image src="/logo.svg" alt="OpenCut Logo" width={32} height={32} />
      <span className="text-xl font-medium hidden md:block">OpenCut</span>
    </Link>
  );

  const rightContent = (
    <nav className="flex items-center gap-3">
      <Link href="/contributors">
        <Button variant="text" className="text-sm p-0">
          Contributors
        </Button>
      </Link>
      {process.env.NODE_ENV === "development" ? (
        <Button size="sm" onClick={gotToEditor} className="text-sm ml-4">
          Editor
          <ArrowRight className="h-4 w-4" />
        </Button>
      ) : (
        <Link href="https://github.com/OpenCut-app/OpenCut" target="_blank">
          <Button size="sm" className="text-sm ml-4">
            GitHub {star}+
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      )}
    </nav>
  );

  return (
    <div className="mx-4 md:mx-0">
      <HeaderBase
        className="bg-accent border rounded-2xl max-w-3xl mx-auto mt-4 pl-4 pr-[14px]"
        leftContent={leftContent}
        rightContent={rightContent}
      />
    </div>
  );
}

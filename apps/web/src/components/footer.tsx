"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { RiDiscordFill, RiTwitterXLine } from "react-icons/ri";
import { FaGithub } from "react-icons/fa6";
import Image from "next/image";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <motion.footer
      className="border-t bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8, duration: 0.8 }}
    >
      <div className="mx-auto max-w-5xl px-8 py-10">
        <div className="mb-8 grid grid-cols-1 gap-12 md:grid-cols-2">
          {/* Brand Section */}
          <div className="md:col-span-1 max-w-sm">
            <div className="mb-4 flex items-center justify-start gap-2">
              <Image 
                src="/logo.svg" 
                alt="OpenCut Logo" 
                width={24} 
                height={24}
                className="invert dark:invert-0"
              />
              <span className="text-lg font-bold">OpenCut</span>
            </div>
            <p className="mb-5 text-sm text-muted-foreground md:text-left">
              The open source video editor that gets the job done. Simple,
              powerful, and works on any platform.
            </p>
            <div className="flex justify-start gap-3">
              <Link
                href="https://github.com/OpenCut-app/OpenCut"
                className="text-muted-foreground hover:text-foreground transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaGithub className="h-5 w-5" />
              </Link>
              <Link
                href="https://x.com/OpenCutApp"
                className="text-muted-foreground hover:text-foreground transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <RiTwitterXLine className="h-5 w-5" />
              </Link>
              <Link
                href="https://discord.com/invite/Mu3acKZvCp"
                className="text-muted-foreground hover:text-foreground transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <RiDiscordFill className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <div className="flex items-start justify-start gap-12 py-2">
            <div>
              <h3 className="font-semibold text-foreground mb-4">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/roadmap"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Roadmap
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Privacy policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Terms of use
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/contributors"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Contributors
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://github.com/OpenCut-app/OpenCut/blob/main/README.md"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    About
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col items-start justify-between gap-4 pt-2 md:flex-row">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>© {currentYear} OpenCut, All Rights Reserved</span>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}

"use client";

import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { Handlebars } from "./handlebars";
import Link from "next/link";

export function Hero() {
	return (
		<div className="flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-between px-4 text-center">
			<Image
				className="absolute top-0 left-0 -z-50 size-full object-cover opacity-85 invert dark:invert-0"
				src="/landing-page-dark.png"
				height={1903.5}
				width={1269}
				alt="landing-page.bg"
			/>
			<div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center">
				<div className="inline-block text-4xl font-bold tracking-tighter md:text-[4rem]">
					<h1>The open source</h1>
					<Handlebars>Video editor</Handlebars>
				</div>

				<p className="text-muted-foreground mx-auto mt-10 max-w-xl text-base font-light tracking-wide sm:text-xl">
					A simple but powerful video editor that gets the job done. Works on
					any platform.
				</p>

				<div className="mt-8 flex justify-center gap-8">
					<Button
						variant="foreground"
						size="lg"
						className="h-11 text-base"
						asChild
					>
						<Link href="/projects">
							Try early beta
							<ArrowRight className="ml-0.5" />
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Undo2 } from "lucide-react";
import Image from "next/image";

export const metadata = {
    title: "404 | Page Not Found - OpenCut",
    description:
        "Oops! The page you’re looking for isn’t available. Head back to the homepage or continue exploring OpenCut.",
};

export default function NotFound() {
    return (
        <div className="min-h-screen flex bg-white items-center justify-center">
            <div className="text-center">
                <div className="mb-4">
                    <Image
                        src="/images/404-custom.png"
                        alt="404 - Page Not Found"
                        width={300}
                        height={200}
                        className="mx-auto"
                    />
                </div>
                <p className="text-gray-600  mb-8">
                    Sorry, the page you&apos;re looking for can&apos;t be found.
                </p>
                <Button asChild>
                    <Link href="/" className="flex items-center gap-2">
                        <Undo2 className="h-4 w-4" aria-hidden="true" focusable="false" />
                        <span>Go Back To Home</span>
                    </Link>
                </Button>

            </div>
        </div>
    );
}

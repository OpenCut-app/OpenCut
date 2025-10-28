import { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { GithubIcon } from "@/components/icons";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

const roadmapItems: {
  title: string;
  description: string;
  status: {
    text: string;
    type: "complete" | "pending" | "default" | "info";
  };
}[] = [
  {
    title: "Start",
    description:
      "This is where it all started. Repository created, initial project structure, and the vision for a free, open-source video editor. [Check out the first tweet](https://x.com/mazeincoding/status/1936706642512388188) to see where it started.",
    status: {
      text: "Completed",
      type: "complete",
    },
  },
  {
    title: "Core UI",
    description:
      "Built the foundation - main layout, header, sidebar, timeline container, and basic component structure. Not all functionality yet, but the UI framework that everything else builds on.",
    status: {
      text: "Completed",
      type: "complete",
    },
  },
  {
    title: "Basic Functionality",
    description:
      "The heart of any video editor. Timeline zoom in/out, making clips longer/shorter, dragging elements around, selection, playhead scrubbing. **This part has to be fucking perfect** because it's what users interact with 99% of the time.",
    status: {
      text: "In Progress",
      type: "pending",
    },
  },
  {
    title: "Export/Preview Logic",
    description:
      "The foundation that enables everything else. Real-time preview, video rendering, export functionality. Once this works, we can add effects, filters, transitions - basically everything that makes a video editor powerful.",
    status: {
      text: "Completed",
      type: "complete",
    },
  },
  {
    title: "Text",
    description:
      "After media, text is the next most important thing. Font selection with custom font imports, text stroke, colors. All the text essential text properties.",
    status: {
      text: "Not Started",
      type: "default",
    },
  },
  {
    title: "Effects",
    description:
      "Adding visual effects to both text and media. Blur, brightness, contrast, saturation, filters, and all the creative tools that make videos pop. This is where the magic happens.",
    status: {
      text: "Not Started",
      type: "default",
    },
  },
  {
    title: "Transitions",
    description:
      "Smooth transitions between clips. Fade in/out, slide, zoom, dissolve, and custom transition effects.",
    status: {
      text: "Not Started",
      type: "default",
    },
  },
  {
    title: "Refine from Here",
    description:
      "Once we nail the above, we have a **solid foundation** to build anything. Advanced features, performance optimizations, mobile support, desktop app.",
    status: {
      text: "Future",
      type: "info",
    },
  },
];

export const metadata: Metadata = {
  title: "Roadmap - OpenCut",
  description:
    "See what's coming next for OpenCut - the free, open-source video editor that respects your privacy.",
  openGraph: {
    title: "OpenCut Roadmap - What's Coming Next",
    description:
      "See what's coming next for OpenCut - the free, open-source video editor that respects your privacy.",
    type: "website",
    images: [
      {
        url: "/open-graph/roadmap.jpg",
        width: 1200,
        height: 630,
        alt: "OpenCut Roadmap",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenCut Roadmap - What's Coming Next",
    description:
      "See what's coming next for OpenCut - the free, open-source video editor that respects your privacy.",
    images: ["/open-graph/roadmap.jpg"],
  },
};

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-linear-to-br from-muted/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-linear-to-tr from-muted/10 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="relative container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <Link
                href="https://github.com/OpenCut-app/OpenCut"
                target="_blank"
              >
                <Badge variant="secondary" className="gap-2 mb-6">
                  <GithubIcon className="h-3 w-3" />
                  Open Source
                </Badge>
              </Link>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
                Roadmap
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                What's coming next for OpenCut (last updated: July 14, 2025)
              </p>
            </div>
            <div className="space-y-6">
              {roadmapItems.map((item, index) => (
                <div key={index} className="relative">
                  <div className="flex items-start gap-2">
                    <span className="text-lg font-medium text-muted-foreground select-none leading-normal">
                      {index + 1}.
                    </span>
                    <div className="flex-1 pt-[2px]">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-lg">{item.title}</h3>
                        <Badge
                          className={cn("shadow-none", {
                            "bg-green-500! text-white":
                              item.status.type === "complete",
                            "bg-yellow-500! text-white":
                              item.status.type === "pending",
                            "bg-blue-500! text-white":
                              item.status.type === "info",
                            "bg-foreground/10! text-accent-foreground":
                              item.status.type === "default",
                          })}
                        >
                          {item.status.text}
                        </Badge>
                      </div>
                      <div className="text-foreground/70 leading-relaxed">
                        <ReactMarkdown
                          components={{
                            a: ({ className, children, ...props }) => (
                              <a
                                className={cn(
                                  "text-primary hover:underline",
                                  className
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                {...props}
                              >
                                {children}
                              </a>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-foreground">
                                {children}
                              </strong>
                            ),
                          }}
                        >
                          {item.description}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 pt-8 border-t border-muted/20">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold">Want to Help?</h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  OpenCut is open source and built by the community. Every
                  contribution, no matter how small, helps us build the best
                  free video editor possible.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                  <Link
                    href="https://github.com/OpenCut-app/OpenCut/blob/main/.github/CONTRIBUTING.md"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Badge
                      variant="outline"
                      className="text-sm px-4 py-2 hover:bg-muted/50 transition-colors"
                    >
                      <GithubIcon className="h-4 w-4 mr-2" />
                      Start Contributing
                    </Badge>
                  </Link>
                  <Link
                    href="https://github.com/OpenCut-app/OpenCut/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Badge
                      variant="outline"
                      className="text-sm px-4 py-2 hover:bg-muted/50 transition-colors"
                    >
                      Report Issues
                    </Badge>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

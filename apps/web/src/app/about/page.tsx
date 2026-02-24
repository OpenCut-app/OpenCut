import { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { GithubIcon } from "@/components/icons";
import { RiDiscordFill } from "react-icons/ri";
import {
  Video,
  Shield,
  Zap,
  Users,
  Heart,
  ExternalLink,
  Layers,
  Music,
  Type,
  Scissors,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About - OpenCut",
  description:
    "Learn about OpenCut, the free and open-source video editor built for creators who value privacy and simplicity.",
  openGraph: {
    title: "About - OpenCut",
    description:
      "Learn about OpenCut, the free and open-source video editor built for creators who value privacy and simplicity.",
    type: "website",
  },
};

const features = [
  {
    icon: Layers,
    title: "Multi-Track Timeline",
    description: "Professional editing with multiple video, audio, and text tracks",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "All processing happens locally in your browser - your files never leave your device",
  },
  {
    icon: Zap,
    title: "Real-Time Preview",
    description: "See your edits instantly with live preview as you work",
  },
  {
    icon: Music,
    title: "Audio Support",
    description: "Import and edit audio tracks with volume controls and muting",
  },
  {
    icon: Type,
    title: "Text Overlays",
    description: "Add customizable text with fonts, colors, and positioning",
  },
  {
    icon: Scissors,
    title: "Precise Editing",
    description: "Split, trim, and arrange clips with frame-accurate precision",
  },
];

const values = [
  {
    icon: Heart,
    title: "Open Source",
    description: "Built in public, free forever. Anyone can contribute, audit, or fork the code.",
  },
  {
    icon: Shield,
    title: "Privacy Focused",
    description: "No server uploads, no tracking, no accounts required. Your content stays yours.",
  },
  {
    icon: Users,
    title: "Community Driven",
    description: "Shaped by real users and contributors from around the world.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="relative">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-linear-to-br from-muted/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-linear-to-tr from-muted/10 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-20">
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
                About OpenCut
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                A free, open-source video editor that respects your privacy.
                Edit videos directly in your browser without uploading to any server.
              </p>
            </div>

            {/* Mission Section */}
            <div className="mb-20">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Video editing software has become increasingly complex, expensive, and invasive.
                  Cloud-based editors upload your personal videos to remote servers.
                  Professional tools cost hundreds of dollars per year.
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  OpenCut exists to provide a <strong className="text-foreground">free, private, and simple</strong> alternative.
                  We believe everyone should have access to quality video editing tools
                  without sacrificing their privacy or their wallet.
                </p>
              </div>
            </div>

            {/* Features Section */}
            <div className="mb-20">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Features</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Everything you need for video editing, running entirely in your browser
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feature) => (
                  <Card key={feature.title} className="bg-background/80 backdrop-blur-xs border-2 hover:border-muted-foreground/20 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                        <feature.icon className="h-6 w-6 text-foreground" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm">{feature.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Values Section */}
            <div className="mb-20">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Our Values</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  The principles that guide how we build OpenCut
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                {values.map((value) => (
                  <div key={value.title} className="text-center">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <value.icon className="h-8 w-8 text-foreground" />
                    </div>
                    <h3 className="font-semibold text-xl mb-2">{value.title}</h3>
                    <p className="text-muted-foreground">{value.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center">
              <div className="max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold mb-4">Get Started</h2>
                <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
                  Ready to edit? Jump right in - no account required.
                  Want to help build the future of video editing? Join our community.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/projects">
                    <Button size="lg" className="gap-2 group">
                      <Video className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      Start Editing
                    </Button>
                  </Link>
                  <Link
                    href="https://github.com/OpenCut-app/OpenCut"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="lg" className="gap-2 group">
                      <GithubIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      View on GitHub
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link
                    href="https://discord.gg/zmR9N35cjK"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="lg" className="gap-2 group">
                      <RiDiscordFill className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      Join Discord
                      <ExternalLink className="h-4 w-4" />
                    </Button>
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

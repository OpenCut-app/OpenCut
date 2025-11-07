import { Metadata } from "next";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  GithubIcon,
  MarbleIcon,
  VercelIcon,
  DataBuddyIcon,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { EXTERNAL_TOOLS } from "@/constants/site";

export const metadata: Metadata = {
  title: "Contributors - OpenCut",
  description:
    "Meet the amazing people who contribute to OpenCut, the free and open-source video editor.",
  openGraph: {
    title: "Contributors - OpenCut",
    description:
      "Meet the amazing people who contribute to OpenCut, the free and open-source video editor.",
    type: "website",
  },
};

interface Contributor {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  type: string;
}

async function getContributors(): Promise<Contributor[]> {
  try {
    const response = await fetch(
      "https://api.github.com/repos/OpenCut-app/OpenCut/contributors?per_page=100",
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "OpenCut-Web-App",
        },
        next: { revalidate: 600 }, // 10 minutes
      } as RequestInit
    );

    if (!response.ok) {
      console.error("Failed to fetch contributors");
      return [];
    }

    const contributors = (await response.json()) as Contributor[];

    const filteredContributors = contributors.filter(
      (contributor: Contributor) => contributor.type === "User"
    );

    return filteredContributors;
  } catch (error) {
    console.error("Error fetching contributors:", error);
    return [];
  }
}

export default async function ContributorsPage() {
  const contributors = await getContributors();
  const topContributors = contributors.slice(0, 2);
  const otherContributors = contributors.slice(2);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-linear-to-br from-muted/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-linear-to-tr from-muted/10 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <Link
                href={"https://github.com/OpenCut-app/OpenCut"}
                target="_blank"
              >
                <Badge variant="secondary" className="gap-2 mb-6">
                  <GithubIcon className="h-3 w-3" />
                  Open Source
                </Badge>
              </Link>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
                Contributors
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                Meet the amazing developers who are building the future of video
                editing
              </p>

              <div className="flex items-center justify-center gap-8 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-foreground rounded-full" />
                  <span className="font-medium">{contributors.length}</span>
                  <span className="text-muted-foreground">contributors</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-foreground rounded-full" />
                  <span className="font-medium">
                    {contributors.reduce((sum, c) => sum + c.contributions, 0)}
                  </span>
                  <span className="text-muted-foreground">contributions</span>
                </div>
              </div>
            </div>

            {topContributors.length > 0 && (
              <div className="mb-20">
                <div className="text-center mb-12">
                  <h2 className="text-2xl font-semibold mb-2">
                    Top Contributors
                  </h2>
                  <p className="text-muted-foreground">
                    Leading the way in contributions
                  </p>
                </div>

                <div className="flex flex-col md:flex-row gap-6 justify-center max-w-4xl mx-auto">
                  {topContributors.map((contributor, index) => (
                    <Link
                      key={contributor.id}
                      href={contributor.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block flex-1"
                    >
                      <div className="relative mx-auto max-w-md">
                        <div className="absolute inset-0 bg-linear-to-r from-muted/50 to-muted/30 rounded-2xl blur-sm group-hover:blur-md transition-all duration-300" />
                        <Card className="relative bg-background/80 backdrop-blur-xs border-2 group-hover:border-muted-foreground/20 transition-all duration-300 group-hover:shadow-xl">
                          <CardContent className="p-8 text-center">
                            <div className="relative mb-6">
                              <Avatar className="h-24 w-24 mx-auto ring-4 ring-background shadow-2xl">
                                <AvatarImage
                                  src={contributor.avatar_url}
                                  alt={`${contributor.login}'s avatar`}
                                />
                                <AvatarFallback className="text-lg font-semibold">
                                  {contributor.login.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <h3 className="text-xl font-semibold mb-2 group-hover:text-foreground/80 transition-colors">
                              {contributor.login}
                            </h3>
                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {contributor.contributions}
                              </span>
                              <span>contributions</span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {otherContributors.length > 0 && (
              <div>
                <div className="text-center mb-12">
                  <h2 className="text-2xl font-semibold mb-2">
                    All Contributors
                  </h2>
                  <p className="text-muted-foreground">
                    Everyone who makes OpenCut better
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {otherContributors.map((contributor, index) => (
                    <Link
                      key={contributor.id}
                      href={contributor.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block"
                      style={{
                        animationDelay: `${index * 50}ms`,
                      }}
                    >
                      <div className="text-center p-2 rounded-xl transition-all duration-300 hover:opacity-50">
                        <Avatar className="h-16 w-16 mx-auto mb-3">
                          <AvatarImage
                            src={contributor.avatar_url}
                            alt={`${contributor.login}'s avatar`}
                          />
                          <AvatarFallback className="font-medium">
                            {contributor.login.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="font-medium text-sm truncate group-hover:text-foreground transition-colors mb-1">
                          {contributor.login}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {contributor.contributions}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {contributors.length === 0 && (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center">
                  <GithubIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-medium mb-3">
                  No contributors found
                </h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Unable to load contributors at the moment. Check back later or
                  view on GitHub.
                </p>
                <Link
                  href="https://github.com/OpenCut-app/OpenCut/graphs/contributors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" className="gap-2">
                    <GithubIcon className="h-4 w-4" />
                    View on GitHub
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}

            <div className="mt-6 mb-20">
              <div className="text-center mb-12">
                <h2 className="text-2xl font-semibold mb-2">External Tools</h2>
                <p className="text-muted-foreground">
                  Tools we use to build OpenCut
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {EXTERNAL_TOOLS.map((tool, index) => {
                  const IconComponent = {
                    MarbleIcon,
                    VercelIcon,
                    DataBuddyIcon,
                  }[tool.icon];

                  return (
                    <Link
                      key={tool.name}
                      href={tool.url}
                      target="_blank"
                      className="group block"
                      style={{
                        animationDelay: `${index * 100}ms`,
                      }}
                    >
                      <Card className="h-full bg-background/80 backdrop-blur-xs border-2 group-hover:border-muted-foreground/20 transition-all duration-300 group-hover:shadow-xl">
                        <CardContent className="p-6 text-center h-full flex flex-col">
                          <div className="mb-4">
                            <div className="w-12 h-12 mx-auto rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-muted/70 transition-colors">
                              <IconComponent className="h-6 w-6" size={24} />
                            </div>
                          </div>
                          <h3 className="font-semibold text-lg mb-2 group-hover:text-foreground/80 transition-colors">
                            {tool.name}
                          </h3>
                          <p className="text-sm text-muted-foreground flex-1">
                            {tool.description}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="mt-32 text-center">
              <div className="max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold mb-4">Join the community</h2>
                <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
                  OpenCut is built by developers like you. Every contribution,
                  no matter how small, helps make video editing more accessible
                  for everyone.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="https://github.com/OpenCut-app/OpenCut/blob/main/.github/CONTRIBUTING.md"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="lg" className="gap-2 group">
                      <GithubIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      Start Contributing
                    </Button>
                  </Link>
                  <Link
                    href="https://github.com/OpenCut-app/OpenCut/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="lg" className="gap-2 group">
                      Browse Issues
                      <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

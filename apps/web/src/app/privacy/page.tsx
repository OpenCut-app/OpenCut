import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GithubIcon } from "@/components/icons";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "Privacy Policy - OpenCut",
  description:
    "Learn how OpenCut handles your data and privacy. Our commitment to protecting your information while you edit videos.",
  openGraph: {
    title: "Privacy Policy - OpenCut",
    description:
      "Learn how OpenCut handles your data and privacy. Our commitment to protecting your information while you edit videos.",
    type: "website",
  },
};

export default function PrivacyPage() {
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
                Privacy Policy
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                Learn how we handle your data and privacy. Contact us if you
                have any questions.
              </p>
            </div>
            <Card className="bg-background/80 backdrop-blur-xs border-2 border-muted/30">
              <CardContent className="p-8 text-base leading-relaxed space-y-8">
                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    Your Videos Stay Private
                  </h2>
                  <p className="mb-4">
                    <strong>
                      OpenCut processes all videos locally on your device.
                    </strong>{" "}
                    We never upload, store, or have access to your video files.
                    Your content remains completely private and under your
                    control at all times.
                  </p>
                  <p>
                    All video editing, rendering, and processing happens in your
                    browser using WebAssembly and local storage. No video data
                    is transmitted to our servers.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    Account Information
                  </h2>
                  <p className="mb-4">
                    When you create an account, we only collect:
                  </p>
                  <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li>Email address (for account access)</li>
                    <li>
                      Profile information from Google OAuth (if you choose to
                      sign in with Google)
                    </li>
                  </ul>
                  <p className="mb-4">
                    <strong>
                      We do NOT store your projects on our servers.
                    </strong>{" "}
                    All project data, including names, thumbnails, and creation
                    dates, is stored locally in your browser using IndexedDB.
                  </p>
                  <p>
                    We use{" "}
                    <a
                      href="https://www.better-auth.com"
                      target="_blank"
                      rel="noopener"
                      className="text-primary hover:underline"
                    >
                      Better Auth
                    </a>{" "}
                    for secure authentication and follow industry-standard
                    security practices.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">Analytics</h2>
                  <p className="mb-4">
                    We use{" "}
                    <a
                      href="https://www.databuddy.cc"
                      target="_blank"
                      rel="noopener"
                      className="text-primary hover:underline"
                    >
                      Databuddy
                    </a>{" "}
                    for completely anonymized and non-invasive analytics to
                    understand how people use OpenCut.
                  </p>
                  <p>
                    This helps us improve the editor, but we never collect
                    personal information, track individual users, or store any
                    data that could identify you.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    Local Storage & Cookies
                  </h2>
                  <p className="mb-4">
                    We use browser local storage and IndexedDB to:
                  </p>
                  <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li>Save your projects locally on your device</li>
                    <li>Remember your editor preferences and settings</li>
                    <li>Keep you logged in across browser sessions</li>
                  </ul>
                  <p>
                    All data stays on your device and can be cleared at any time
                    through your browser settings.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    Third-Party Services
                  </h2>
                  <p className="mb-4">
                    OpenCut integrates with these services:
                  </p>
                  <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li>
                      <strong>Google OAuth:</strong> For optional Google sign-in
                      (governed by Google's privacy policy)
                    </li>
                    <li>
                      <strong>Vercel:</strong> For hosting and content delivery
                    </li>
                    <li>
                      <strong>Databuddy:</strong> For anonymized analytics
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
                  <p className="mb-4">
                    You have complete control over your data:
                  </p>
                  <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li>
                      Delete your account and all associated data at any time
                    </li>
                    <li>Export your project data</li>
                    <li>Clear local storage to remove all saved projects</li>
                    <li>Contact us with any privacy concerns</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    Open Source Transparency
                  </h2>
                  <p className="mb-4">
                    OpenCut is completely open source. You can review our code,
                    see exactly how we handle data, and even self-host the
                    application if you prefer.
                  </p>
                  <p>
                    View our source code on{" "}
                    <a
                      href="https://github.com/OpenCut-app/OpenCut"
                      target="_blank"
                      rel="noopener"
                      className="text-primary hover:underline"
                    >
                      GitHub
                    </a>
                    .
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
                  <p className="mb-4">
                    Questions about this privacy policy or how we handle your
                    data?
                  </p>
                  <p>
                    Open an issue on our{" "}
                    <a
                      href="https://github.com/OpenCut-app/OpenCut/issues"
                      target="_blank"
                      rel="noopener"
                      className="text-primary hover:underline"
                    >
                      GitHub repository
                    </a>
                    , email us at{" "}
                    <a
                      href="mailto:oss@opencut.app"
                      className="text-primary hover:underline"
                    >
                      oss@opencut.app
                    </a>
                    , or reach out on{" "}
                    <a
                      href="https://x.com/opencutapp"
                      target="_blank"
                      rel="noopener"
                      className="text-primary hover:underline"
                    >
                      X (Twitter)
                    </a>
                    .
                  </p>
                </section>

                <p className="text-sm text-muted-foreground mt-8 pt-8 border-t border-muted/20">
                  Last updated: July 14, 2025
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

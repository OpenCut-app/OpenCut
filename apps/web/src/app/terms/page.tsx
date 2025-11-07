import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GithubIcon } from "@/components/icons";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "Terms of Service - OpenCut",
  description:
    "OpenCut's Terms of Service. Fair, transparent terms for our free and open-source video editor.",
  openGraph: {
    title: "Terms of Service - OpenCut",
    description:
      "OpenCut's Terms of Service. Fair, transparent terms for our free and open-source video editor.",
    type: "website",
  },
};

export default function TermsPage() {
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
                Terms of Service
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                Fair and transparent terms for our free, open-source video
                editor.
              </p>
            </div>
            <Card className="bg-background/80 backdrop-blur-xs border-2 border-muted/30">
              <CardContent className="p-8 text-base leading-relaxed space-y-8">
                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    Welcome to OpenCut
                  </h2>
                  <p className="mb-4">
                    OpenCut is a free, open-source video editor that runs in
                    your browser. By using our service, you agree to these
                    terms. We've designed these terms to be fair and protect
                    both you and our project.
                  </p>
                  <p>
                    <strong>Key principle:</strong> Your content stays on your
                    device. We never claim ownership of your videos or projects.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    Your Content, Your Rights
                  </h2>
                  <p className="mb-4">
                    <strong>You own everything you create.</strong> OpenCut
                    processes your videos locally on your device, so we never
                    have access to your content. We make no claims to ownership,
                    licensing, or rights over your videos, projects, or any
                    content you create using OpenCut.
                  </p>
                  <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li>
                      Your videos remain completely private and under your
                      control
                    </li>
                    <li>
                      You retain all intellectual property rights to your
                      content
                    </li>
                    <li>
                      You can export and use your content however you choose
                    </li>
                    <li>
                      No watermarks, no licensing restrictions from OpenCut
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    How You Can Use OpenCut
                  </h2>
                  <p className="mb-4">
                    OpenCut is free for personal and commercial use. You can:
                  </p>
                  <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li>
                      Create videos for personal, educational, or commercial
                      purposes
                    </li>
                    <li>Use OpenCut for client work and paid projects</li>
                    <li>Share and distribute videos created with OpenCut</li>
                    <li>
                      Modify and distribute the OpenCut software (under MIT
                      license)
                    </li>
                  </ul>
                  <p>
                    <strong>What we ask:</strong> Don't use OpenCut for illegal
                    activities, harassment, or creating harmful content. Be
                    respectful of others and follow applicable laws.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    Account and Service
                  </h2>
                  <p className="mb-4">
                    To use certain features, you may create an account:
                  </p>
                  <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li>Provide accurate information when signing up</li>
                    <li>
                      Keep your account secure and don't share credentials
                    </li>
                    <li>You're responsible for activity under your account</li>
                    <li>You can delete your account at any time</li>
                  </ul>
                  <p>
                    OpenCut is provided "as is" without warranties. While we
                    strive for reliability, we can't guarantee uninterrupted
                    service.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    Open Source Benefits
                  </h2>
                  <p className="mb-4">
                    Because OpenCut is open source, you have additional rights:
                  </p>
                  <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li>
                      Review our code to see exactly how we handle your data
                    </li>
                    <li>Self-host OpenCut on your own servers</li>
                    <li>Modify the software to suit your needs</li>
                    <li>Contribute improvements back to the community</li>
                  </ul>
                  <p>
                    View our source code and license on{" "}
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
                  <h2 className="text-2xl font-semibold mb-4">
                    Third-Party Content
                  </h2>
                  <p className="mb-4">
                    When using OpenCut, make sure you have the right to use any
                    content you import:
                  </p>
                  <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li>
                      Only upload content you own or have permission to use
                    </li>
                    <li>
                      Respect copyright, trademarks, and other intellectual
                      property
                    </li>
                    <li>
                      Don't use copyrighted music, images, or videos without
                      permission
                    </li>
                    <li>
                      You're responsible for any claims related to your content
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    Limitations and Liability
                  </h2>
                  <p className="mb-4">
                    OpenCut is provided free of charge. To the extent permitted
                    by law:
                  </p>
                  <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li>We're not liable for any loss of data or content</li>
                    <li>
                      Projects are stored in your browser and may be lost if you
                      clear browser data
                    </li>
                    <li>We're not responsible for how you use the service</li>
                    <li>
                      Our liability is limited to the maximum extent allowed by
                      law
                    </li>
                  </ul>
                  <p>
                    Since your content stays on your device, we have no way to
                    recover lost projects. Consider exporting important videos
                    when finished editing.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    Service Changes
                  </h2>
                  <p className="mb-4">We may update OpenCut and these terms:</p>
                  <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li>
                      We'll notify you of significant changes to these terms
                    </li>
                    <li>Continued use means you accept any updates</li>
                    <li>
                      You can always self-host an older version if you prefer
                    </li>
                    <li>
                      Major changes will be discussed with the community on
                      GitHub
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">Termination</h2>
                  <p className="mb-4">
                    You can stop using OpenCut at any time:
                  </p>
                  <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li>Delete your account through your profile settings</li>
                    <li>Clear your browser data to remove local projects</li>
                    <li>
                      Your content remains yours even if you stop using OpenCut
                    </li>
                    <li>
                      We may suspend accounts for violations of these terms
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">
                    Contact and Disputes
                  </h2>
                  <p className="mb-4">
                    Questions about these terms or need to report an issue?
                  </p>
                  <p className="mb-4">
                    Contact us through our{" "}
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
                  <p>
                    These terms are governed by applicable law in your
                    jurisdiction. We prefer to resolve disputes through friendly
                    discussion in our open-source community.
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

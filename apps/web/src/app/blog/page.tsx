import { Metadata } from "next";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { getPosts } from "@/lib/blog-query";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Blog - OpenCut",
  description:
    "Read the latest news and updates about OpenCut, the free and open-source video editor.",
  openGraph: {
    title: "Blog - OpenCut",
    description:
      "Read the latest news and updates about OpenCut, the free and open-source video editor.",
    type: "website",
  },
};

export default async function BlogPage() {
  const data = await getPosts();
  if (!data || !data.posts) return <div>No posts yet</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-linear-to-br from-muted/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-linear-to-tr from-muted/10 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative container max-w-3xl mx-auto px-4 py-16">
          <div className="text-center mb-20">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Blog
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Read the latest news and updates about OpenCut, the free and
              open-source video editor.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <Card className="h-full hover:shadow-lg transition-shadow overflow-hidden">
                  {post.coverImage && (
                    <div className="relative aspect-video">
                      <Image
                        src={post.coverImage}
                        alt={post.title}
                        fill
                        className="object-cover rounded-xl"
                      />
                    </div>
                  )}

                  <CardContent className="p-6">
                    {post.authors && post.authors.length > 0 && (
                      <div className="flex items-center gap-2 mb-4">
                        {post.authors.map((author, index) => (
                          <div
                            key={author.id}
                            className="flex items-center gap-2"
                          >
                            <Avatar className="w-6 h-6">
                              <AvatarImage
                                src={author.image}
                                alt={author.name}
                              />
                              <AvatarFallback className="text-xs">
                                {author.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-muted-foreground">
                              {author.name}
                            </span>
                            {index < post.authors.length - 1 && (
                              <span className="text-muted-foreground">•</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
                    <p className="text-muted-foreground">{post.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

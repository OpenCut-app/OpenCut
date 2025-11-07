import { Feed } from "feed";
import { getPosts } from "@/lib/blog-query";
import { SITE_INFO, SITE_URL } from "@/constants/site";

export async function GET() {
  try {
    const { posts } = await getPosts();

    const feed = new Feed({
      title: `${SITE_INFO.title} Blog`,
      description: SITE_INFO.description,
      id: `${SITE_URL}`,
      link: `${SITE_URL}/blog/`,
      language: "en",
      image: `${SITE_INFO.openGraphImage}`,
      favicon: `${SITE_INFO.favicon}`,
      copyright: `All rights reserved ${new Date().getFullYear()}, ${
        SITE_INFO.title
      }`,
    });

    for (const post of posts) {
      feed.addItem({
        title: post.title,
        id: `${SITE_URL}/blog/${post.slug}`,
        link: `${SITE_URL}/blog/${post.slug}`,
        description: post.description,
        author: post.authors.map((author) => ({
          name: author.name,
        })),
        date: new Date(post.publishedAt),
        image: post.coverImage || SITE_INFO.openGraphImage,
      });
    }

    return new Response(feed.rss2(), {
      headers: {
        "Content-Type": "text/xml",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate",
      },
    });
  } catch (error) {
    console.error("Error generating RSS feed", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

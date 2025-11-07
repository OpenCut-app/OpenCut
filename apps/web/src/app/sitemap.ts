import { SITE_URL } from "@/constants/site";
import { getPosts } from "@/lib/blog-query";
import type { MetadataRoute } from "next";

type SitemapEntry = {
  url: string;
  lastModified: Date;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
};

const STATIC_PAGES: SitemapEntry[] = [
  {
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    url: `${SITE_URL}/contributors`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.5,
  },
  {
    url: `${SITE_URL}/roadmap`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    url: `${SITE_URL}/privacy`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.5,
  },
  {
    url: `${SITE_URL}/terms`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.5,
  },
  {
    url: `${SITE_URL}/why-not-capcut`,
    lastModified: new Date(),
    changeFrequency: "yearly", 
    priority: 1,
  },
  {
    url: `${SITE_URL}/blog`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1,
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getPosts();

  const postPages: MetadataRoute.Sitemap = data?.posts?.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: "weekly",
    priority: 0.8,
  })) ?? [];

  return [...STATIC_PAGES, ...postPages];
}

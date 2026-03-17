import { SITE_URL } from "@/constants/site-constants";
import { getPosts } from "@/lib/blog/query";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	let data: Awaited<ReturnType<typeof getPosts>> | null = null;
	try {
		data = await getPosts();
	} catch {
		// CMS unavailable (e.g. during build), skip blog posts in sitemap
	}

	const postPages: MetadataRoute.Sitemap =
		data?.posts?.map((post) => ({
			url: `${SITE_URL}/blog/${post.slug}`,
			lastModified: new Date(post.publishedAt),
			changeFrequency: "weekly",
			priority: 0.8,
		})) ?? [];

	return [
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
		...postPages,
	];
}

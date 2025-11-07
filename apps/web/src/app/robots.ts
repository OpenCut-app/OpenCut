import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/_next/", "/projects/", "/editor/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

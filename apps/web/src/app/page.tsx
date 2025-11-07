import { Hero } from "@/components/landing/hero";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import type { Metadata } from "next";
import { SITE_URL } from "@/constants/site";

export const metadata: Metadata = {
  alternates: {
    canonical: SITE_URL,
  },
};

export default async function Home() {
  return (
    <div>
      <Header />
      <Hero />
      <Footer />
    </div>
  );
}

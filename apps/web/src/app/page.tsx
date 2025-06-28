import { Hero } from "@/components/landing/hero";
import { Header } from "@/components/header";
import Footer from "@/components/footer";
import { getWaitlistCount } from "@/lib/waitlist";
import Image from "next/image";

// Force dynamic rendering so waitlist count updates in real-time
export const dynamic = "force-dynamic";

export default async function Home() {
  const signupCount = await getWaitlistCount();

  return (
    <div>
      <Image
        className="fixed top-0 left-0 -z-50 size-full object-cover"
        src="/landing-page-bg.png"
        height={1903.5}
        width={1269}
        alt="landing-page.bg"
      />
      <Header />
      <Hero signupCount={signupCount} />
      <Footer />
    </div>
  );
}

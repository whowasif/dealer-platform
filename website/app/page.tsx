import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/sections/hero";
import { About } from "@/components/sections/about";
import { Network } from "@/components/sections/network";
import { Capabilities } from "@/components/sections/capabilities";
import { Benefits } from "@/components/sections/benefits";
import { JoinNetwork } from "@/components/sections/join-network";
import { Testimonials } from "@/components/sections/testimonials";
import { Insights } from "@/components/sections/insights";
import { Faq } from "@/components/sections/faq";
import { Contact } from "@/components/sections/contact";
import { LocationMap3D } from "@/components/sections/location-map3d";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <About />
        <Network />
        <Capabilities />
        <Benefits />
        <JoinNetwork />
        <Testimonials />
        <Insights />
        <Faq />
        <Contact />
        <LocationMap3D />
      </main>
      <SiteFooter />
    </>
  );
}

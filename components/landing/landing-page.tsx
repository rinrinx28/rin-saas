"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { CtaFooter } from "@/components/landing/cta-footer";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { Hero } from "@/components/landing/hero";
import { LandingNav } from "@/components/landing/landing-nav";
import { PartnerMarquee } from "@/components/landing/partner-marquee";
import { Pricing } from "@/components/landing/pricing";
import { Showcase } from "@/components/landing/showcase";
import { StatsBand } from "@/components/landing/stats-band";
import { Testimonials } from "@/components/landing/testimonials";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function LandingPage({ isAuthed }: { isAuthed: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Mọi hoạt ảnh gate sau (prefers-reduced-motion: no-preference) — ADR 0006.
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Entrance hero — timeline fade-up có nhịp, rồi visual hiện vào sau.
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(".hero-fx", {
          y: 24,
          autoAlpha: 0,
          duration: 0.8,
          stagger: 0.09,
          delay: 0.05,
        }).from(
          ".hero-visual",
          { y: 28, autoAlpha: 0, scale: 0.97, duration: 0.9 },
          "-=0.45",
        );

        // Chip nổi bồng bềnh nhẹ (sau khi đã hiện).
        gsap.to(".hero-float", {
          y: "-=6",
          duration: 2.6,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          stagger: 0.4,
          delay: 1.2,
        });

        // Reveal khi cuộn — ẩn trước rồi hiện theo nhóm vào khung nhìn.
        gsap.set("[data-reveal]", { y: 28, autoAlpha: 0 });
        ScrollTrigger.batch("[data-reveal]", {
          start: "top 85%",
          once: true,
          onEnter: (els) =>
            gsap.to(els, {
              y: 0,
              autoAlpha: 1,
              duration: 0.7,
              ease: "power2.out",
              stagger: 0.1,
              overwrite: true,
            }),
        });
      });

      // Font display (Fraunces) tải xong làm dịch layout → tính lại trigger.
      void document.fonts?.ready.then(() => ScrollTrigger.refresh());
    },
    { scope: root },
  );

  return (
    <div ref={root} className="min-h-dvh bg-bg">
      <LandingNav isAuthed={isAuthed} />
      <main>
        <Hero isAuthed={isAuthed} />
        <PartnerMarquee />
        <FeatureGrid />
        <Showcase />
        <section className="py-14 lg:py-20">
          <StatsBand />
        </section>
        <Testimonials />
        <Pricing />
        <CtaFooter isAuthed={isAuthed} />
      </main>
    </div>
  );
}

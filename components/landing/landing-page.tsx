"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { CtaFooter } from "@/components/landing/cta-footer";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { Hero } from "@/components/landing/hero";
import { LandingNav } from "@/components/landing/landing-nav";
import { Pricing } from "@/components/landing/pricing";
import { Showcase } from "@/components/landing/showcase";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function LandingPage({ isAuthed }: { isAuthed: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Reduced motion: giữ trạng thái cuối, không animate (ADR 0006).
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      // Entrance hero — fade-up + stagger khi tải.
      gsap.from(".hero-fx", {
        y: 24,
        autoAlpha: 0,
        duration: 0.8,
        ease: "power2.out",
        stagger: 0.1,
        delay: 0.05,
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

      // Font display (Fraunces) tải xong làm dịch layout → tính lại vị trí trigger.
      void document.fonts?.ready.then(() => ScrollTrigger.refresh());
    },
    { scope: root },
  );

  return (
    <div ref={root} className="min-h-dvh bg-bg">
      <LandingNav isAuthed={isAuthed} />
      <main>
        <Hero isAuthed={isAuthed} />
        <FeatureGrid />
        <Showcase />
        <Pricing />
        <CtaFooter isAuthed={isAuthed} />
      </main>
    </div>
  );
}

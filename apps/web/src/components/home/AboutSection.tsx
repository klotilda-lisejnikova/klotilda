"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { getAboutTranslations } from "@/i18n/home";
import FadeIn from "@/components/ui/FadeIn";
import LichenMark from "@/components/ui/LichenMark";

export default function AboutSection() {
  const t = useTranslations("home");
  const about = getAboutTranslations(t);

  return (
    <section
      id="about"
      className="relative z-10 scroll-mt-16 bg-[#fafaf8] py-28 md:py-36"
      style={{
        marginTop: "calc(-50vh - 4rem)",
        boxShadow: "0 -26px 55px -18px rgba(38, 46, 32, 0.42)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-20">
          <FadeIn direction="left" className="flex flex-col justify-center">
            <h2 className="mb-8 font-serif text-4xl font-light tracking-[0.15em] text-stone-800 md:text-5xl">
              {about.title}
            </h2>

            <p className="mb-5 leading-relaxed text-stone-600">{about.bio1}</p>
            <p className="mb-10 leading-relaxed text-stone-600">{about.bio2}</p>

            <div className="flex flex-wrap gap-2">
              {(["ceramics", "embroidery", "linocut"] as const).map((craft) => (
                <span
                  key={craft}
                  className="border border-stone-300 px-4 py-1.5 text-[0.7rem] tracking-[0.25em] text-stone-500 uppercase"
                >
                  {about.crafts[craft]}
                </span>
              ))}
            </div>
          </FadeIn>

          <FadeIn direction="right" delay={0.15} className="relative">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-md">
              <Image
                src="/images/klotilda_about.webp"
                alt="Klotilda — ateliér"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div
              aria-hidden="true"
              className="absolute -right-5 -bottom-5 hidden h-24 w-24 items-center justify-center rounded-md md:flex"
              style={{ background: "#d4c4a8" }}
            >
              <LichenMark className="h-[62%] w-auto text-[#38322a]" />
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

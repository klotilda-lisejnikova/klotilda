"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { getContactTranslations } from "@/i18n/home";
import FadeIn from "@/components/ui/FadeIn";

export default function ContactSection() {
  const t = useTranslations("home");
  const contact = getContactTranslations(t);

  return (
    <section
      id="contact"
      className="relative z-40 scroll-mt-16 bg-[#fafaf8] py-28 md:py-36"
      style={{
        marginTop: "-3rem",
        boxShadow: "0 -20px 44px -22px rgba(55, 48, 38, 0.2)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <FadeIn className="mb-16 text-center">
          <h2 className="font-serif text-4xl font-light tracking-[0.15em] text-stone-800 md:text-5xl">
            {contact.title}
          </h2>
          <p className="mt-4 text-xs tracking-widest text-stone-500">
            {contact.subtitle}
          </p>
        </FadeIn>

        <FadeIn
          delay={0.2}
          className="flex flex-col items-center gap-8 sm:flex-row sm:justify-center sm:gap-0"
        >
          <a
            href={`mailto:${contact.email}`}
            className="group flex items-center gap-5 text-stone-600 transition-colors hover:text-moss"
          >
            <motion.div
              className="flex h-14 w-14 items-center justify-center rounded-full border border-stone-200"
              whileHover={{
                scale: 1.12,
                backgroundColor: "rgba(86,112,66,0.12)",
                borderColor: "#567042",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="4" width="20" height="16" rx="3" />
                <path d="M2 7.5 10.5 13a2.5 2.5 0 0 0 3 0L22 7.5" />
              </svg>
            </motion.div>
            <div>
              <p className="mb-0.5 text-[0.6rem] tracking-[0.3em] text-stone-400 uppercase">
                Email
              </p>
              <p className="font-serif tracking-wide">{contact.email}</p>
            </div>
          </a>

          <div
            className="hidden bg-stone-200 sm:mx-12 sm:block sm:h-10 sm:w-px"
            aria-hidden="true"
          />

          <a
            href="https://instagram.com/klotilda.lisejnikova"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-5 text-stone-600 transition-colors hover:text-moss"
          >
            <motion.div
              className="flex h-14 w-14 items-center justify-center rounded-full border border-stone-200"
              whileHover={{
                scale: 1.12,
                backgroundColor: "rgba(86,112,66,0.12)",
                borderColor: "#567042",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="20" height="20" rx="6" />
                <circle cx="12" cy="12" r="4" />
                <circle
                  cx="17.5"
                  cy="6.5"
                  r="0.8"
                  fill="currentColor"
                  stroke="none"
                />
              </svg>
            </motion.div>
            <div>
              <p className="mb-0.5 text-[0.6rem] tracking-[0.3em] text-stone-400 uppercase">
                Instagram
              </p>
              <p className="font-serif tracking-wide">{contact.instagram}</p>
            </div>
          </a>
        </FadeIn>
      </div>
    </section>
  );
}

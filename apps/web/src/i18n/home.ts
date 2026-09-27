import type { useTranslations } from "next-intl";

type T = ReturnType<typeof useTranslations>;

export const getHeroTranslations = (t: T) => ({
  title: t("hero.title"),
  subtitle: t("hero.subtitle"),
  scroll: t("hero.scroll"),
});

export const getAboutTranslations = (t: T) => ({
  title: t("about.title"),
  bio1: t("about.bio1"),
  bio2: t("about.bio2"),
  crafts: {
    ceramics: t("about.crafts.ceramics"),
    embroidery: t("about.crafts.embroidery"),
    linocut: t("about.crafts.linocut"),
  },
});

export const getGalleryTranslations = (t: T) => ({
  title: t("gallery.title"),
  subtitle: t("gallery.subtitle"),
});

export const getCtaTranslations = (t: T) => ({
  title: t("cta.title"),
  subtitle: t("cta.subtitle"),
  button: t("cta.button"),
  soon: t("cta.soon"),
  soonLink: t("cta.soonLink"),
});

export const getContactTranslations = (t: T) => ({
  title: t("contact.title"),
  subtitle: t("contact.subtitle"),
  email: t("contact.email"),
  instagram: t("contact.instagram"),
});

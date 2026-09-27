import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import CartDrawer from "@/components/shop/CartDrawer";
import Navigation from "./Navigation";
import { SHOP_ENABLED } from "@/lib/features";

export default function Header() {
  const t = useTranslations("nav");

  const links = [
    { href: "/#about", label: t("about") },
    { href: "/#gallery", label: t("gallery") },
    ...(SHOP_ENABLED ? [{ href: "/shop", label: t("shop") }] : []),
    { href: "/#contact", label: t("contact") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-[#FAFAF8]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
        <Link
          href="/"
          className="wordmark-moss font-serif text-xl tracking-[0.2em]"
        >
          KLOTILDA
        </Link>
        <div className="flex items-center gap-4">
          <Navigation links={links} />
          {SHOP_ENABLED && <CartDrawer />}
        </div>
      </div>
    </header>
  );
}

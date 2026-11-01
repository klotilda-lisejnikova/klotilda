import "./globals.css";
import SiteAnalytics from "@/components/ui/SiteAnalytics";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <SiteAnalytics />
    </>
  );
}

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import { CommandMenu } from "@/components/command-menu";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Sprite } from "@/components/site/icons";
import { SupportDialog } from "@/components/site/support-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OPEN_GRAPH, siteUrl } from "@/lib/site";
import { supabaseConfigured } from "@/lib/supabase/config";
import "./globals.css";

const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});
const newsreader = localFont({
  src: "./fonts/newsreader-display.woff2",
  weight: "300 600",
  variable: "--font-newsreader",
  display: "swap",
});

const TITLE = "Eclipse - A free wardrobe for World of Warcraft";
const DESCRIPTION =
  "Eclipse is a free overlay for the World of Warcraft 3.3.5a client. Every appearance, mount, spell and title in the game, on your own character.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: TITLE, template: "%s · Eclipse" },
  description: DESCRIPTION,
  icons: { icon: "/assets/img/icon-32.png", apple: "/assets/img/icon-180.png" },
  openGraph: OPEN_GRAPH,
  twitter: { card: "summary_large_image", images: ["/assets/img/og-image.jpg"] },
};

export const viewport: Viewport = {
  themeColor: "#141413",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // The font variables go on <html>, because that is where --sans reads them.
    <html lang="en" data-scroll-behavior="smooth" className={`dark ${inter.variable} ${newsreader.variable}`}>
      <body className="antialiased">
        <Sprite />
        <a className="skip" href="#main">Skip to content</a>
        <NuqsAdapter>
          <TooltipProvider>
            <SiteHeader signIn={supabaseConfigured()} />
            {children}
            <SiteFooter />
            <CommandMenu />
            <SupportDialog />
            <Toaster
              position="bottom-center"
              theme="dark"
              toastOptions={{
                classNames: { description: "!text-[#55524c]" },
                style: {
                  background: "var(--ink)",
                  border: "0",
                  color: "var(--void)",
                  borderRadius: 999,
                  fontFamily: "var(--sans)",
                },
              }}
            />
          </TooltipProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}

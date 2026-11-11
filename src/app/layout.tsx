import type { Metadata } from "next";
import { Fraunces, Nunito } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getLeagueData } from "@/lib/data";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["SOFT", "opsz"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Root League Orlando",
    template: "%s · Root League Orlando",
  },
  description:
    "Live Root board game league in Orlando — seasons, league points, leaderboards and faction stats.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { isSample } = await getLeagueData();

  return (
    <html lang="en" className={`${fraunces.variable} ${nunito.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-lg focus:bg-paper focus:px-4 focus:py-2 focus:font-bold">
          Skip to content
        </a>
        <SiteHeader />
        {isSample && (
          <p className="border-b-2 border-honey/60 bg-honey/30 px-4 py-2 text-center text-sm font-semibold">
            Showing sample data. The real league database isn&apos;t connected yet.
          </p>
        )}
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-8">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

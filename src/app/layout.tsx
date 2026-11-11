import type { Metadata } from "next";
import { Fraunces, Nunito } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getLeagueData } from "@/lib/data";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
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
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        {isSample && (
          <p className="bg-honey/30 border-b-2 border-honey/60 px-4 py-2 text-center text-sm font-semibold">
            🍂 Showing sample data — the real league database isn&apos;t connected yet.
          </p>
        )}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

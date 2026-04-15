import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AjoFi — Save Together. Win Together.",
  description:
    "AjoFi brings ajo, susu and tontine on-chain. Save with your community, earn yield, and get paid — all trustless, all on Stellar.",
  keywords: "savings, ajo, susu, tontine, Nigeria, Ghana, West Africa, Stellar, DeFi",
  openGraph: {
    title: "AjoFi — Save Together. Win Together.",
    description: "Trustless rotating savings for West Africa on Stellar.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="min-h-screen antialiased" style={{ fontFamily: "var(--font-outfit), -apple-system, BlinkMacSystemFont, sans-serif", background: "#F7F8FF", color: "#0F172A" }}>
        {children}
      </body>
    </html>
  );
}

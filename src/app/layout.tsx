import type { Metadata, Viewport } from "next";
import { DM_Mono, Libertinus_Serif, Libertinus_Serif_Display, Public_Sans } from "next/font/google";
import "./globals.css";

const publicSans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"] });
const dmMono = DM_Mono({ variable: "--font-dm-mono", subsets: ["latin"], weight: ["400", "500"] });
const libertinus = Libertinus_Serif({
  variable: "--font-libertinus",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
});
const libertinusDisplay = Libertinus_Serif_Display({ variable: "--font-libertinus-display", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: { default: "Opurnos — never miss the one that matters", template: "%s · Opurnos" },
  description:
    "Opurnos watches internships, hackathons, fellowships, scholarships and research roles for you, checks your eligibility with evidence, and helps you apply.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffbf2" },
    { media: "(prefers-color-scheme: dark)", color: "#14100e" },
  ],
};

// Applies the saved theme before first paint so there's no flash.
const themeScript = `try{if(localStorage.getItem("opurnos-theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${publicSans.variable} ${dmMono.variable} ${libertinus.variable} ${libertinusDisplay.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

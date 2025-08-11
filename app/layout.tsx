// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Centralize site name + origin so Metadata can build absolute URLs
const siteName = "Guitar Chord Transposer";

// Prefer NEXT_PUBLIC_SITE_URL, but fall back to Vercel’s runtime URL in prod,
// and localhost in dev so OG/Twitter metadata always has an absolute base.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  title: siteName,
  description: "Transpose chord sheets, print/share, optional capo helper & diagrams.",
  applicationName: siteName,

  // Ensures OG image + URLs become absolute for crawlers
  metadataBase: new URL(siteUrl),

  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",

  // Sensible defaults; route-specific pages (e.g. /print) can override via generateMetadata
  openGraph: {
    type: "website",
    siteName,
    url: "/", // resolves against metadataBase
    title: siteName,
    description:
      "Transpose chords instantly. Capo‑aware shapes, diagrams, and a clean print view.",
    images: ["/og-default.png"], // place a 1200×630 image in /public
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description:
      "Transpose chords instantly. Capo‑aware shapes, diagrams, and a clean print view.",
    images: ["/og-default.png"], // resolves via metadataBase too
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f17" },
  ],
};

const noFlashThemeScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme'); // 'light' | 'dark' | 'system' | null
    var root = document.documentElement;

    // If 'system' or null -> remove attribute and let CSS @media handle it
    if (!stored || stored === 'system') {
      root.removeAttribute('data-theme');
      return;
    }
    // Otherwise set explicit theme attribute
    root.setAttribute('data-theme', stored);
  } catch(_) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* keep your no‑flash theme script */}
        <script dangerouslySetInnerHTML={{ __html: noFlashThemeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

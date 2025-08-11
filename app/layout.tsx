// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Site identity
const siteName = "Guitar Chord Transposer";
// Prefer NEXT_PUBLIC_SITE_URL; fall back to Vercel preview URL or localhost
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  title: siteName,
  description: "Transpose chord sheets, print/share, optional capo helper & diagrams.",
  applicationName: siteName,

  // Ensure OG/Twitter absolute URLs
  metadataBase: new URL(siteUrl),

  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",

  // Defaults; route pages (e.g. /print) still override as needed
  openGraph: {
    type: "website",
    siteName,
    url: "/", // resolved against metadataBase
    title: siteName,
    description:
      "Transpose chords instantly. Capo‑aware shapes, diagrams, and a clean print view.",
    images: ["/og-default.png"], // place 1200×630 in /public
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description:
      "Transpose chords instantly. Capo‑aware shapes, diagrams, and a clean print view.",
    images: ["/og-default.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f17" },
  ],
};

// Keep your no-flash theme script
const noFlashThemeScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme'); // 'light' | 'dark' | 'system' | null
    var root = document.documentElement;
    if (!stored || stored === 'system') {
      root.removeAttribute('data-theme');
      return;
    }
    root.setAttribute('data-theme', stored);
  } catch(_) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // JSON-LD: connect this site to mattb.com.au and burgoblog.com via Person.sameAs
  const ldPerson = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": "#matt-burgess",
    name: "Matt Burgess",
    url: "https://mattb.com.au",
    sameAs: ["https://mattb.com.au", "https://burgoblog.com"],
  };

  const ldWebsite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    inLanguage: "en-AU",
    author: { "@id": "#matt-burgess" },
    creator: { "@id": "#matt-burgess" },
    publisher: { "@id": "#matt-burgess" },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashThemeScript }} />
        {/* Structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ldPerson) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ldWebsite) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}

        {/* Global footer – hidden when printing */}
        <footer className="print:hidden border-t border-border mt-8">
          <div className="mx-auto max-w-5xl p-6 text-center text-xs text-muted">
            Made by{" "}
            <a
              href="https://mattb.com.au"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted"
            >
              Matt Burgess
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}

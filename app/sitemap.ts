// app/sitemap.ts
export default function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/print`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/offline`, changeFrequency: "yearly", priority: 0.1 },
  ];
}

// app/offline/page.tsx
export default function OfflinePage() {
  return (
    <main className="mx-auto max-w-2xl p-6 space-y-4">
      <h1 className="text-xl font-bold">You’re offline</h1>
      <p className="text-sm text-muted">
        No internet connection detected. Pages you’ve opened before should still work.
      </p>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold mb-2">Tips</h2>
        <ul className="list-disc pl-5 text-sm space-y-1">
          <li>Try going back to the home page — it’s cached.</li>
          <li>If you created a printable chart recently, open it from your history.</li>
          <li>Reconnect to return here automatically.</li>
        </ul>
      </div>
    </main>
  );
}

// app/page.tsx
import Transposer from "@/components/Transposer";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Guitar Chord Transposer by Burgo</h1>
          <p className="text-sm text-muted">
            Paste chord lines, choose original and target keys, and get a clean transposed chart.
          </p>
        </div>
        <ThemeToggle />
      </header>

      {/* How it works – short, scannable on‑ramp */}
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">How it works</h2>
        <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
          <li><strong>Paste</strong> or type your chord chart on the left.</li>
          <li>Choose the original <strong>From</strong> key and your target <strong>To</strong> key.</li>
          <li>Click any chord to see <strong>voicings</strong>; use <strong>Stage Mode</strong> to rehearse or <strong>Print</strong> to save a PDF.</li>
          <li>Optional: turn on <strong>Capo</strong> to see the shapes to play.</li>
        </ul>
      </section>

      <Transposer />
    </main>
  );
}

// app/page.tsx
import Transposer from "@/components/Transposer";
import ThemeToggle from "@/components/ThemeToggle";
import InstallPWAButton from "@/components/InstallPWAButton";

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
        <div className="flex items-center gap-2">
          <InstallPWAButton compact />
          <ThemeToggle />
        </div>
      </header>

      <Transposer />
    </main>
  );
}

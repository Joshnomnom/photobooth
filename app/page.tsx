import { Booth } from "@/components/Booth";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <header className="room-chrome flex flex-wrap items-end justify-between gap-x-6 gap-y-2 py-6 sm:py-8">
        <div>
          <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
            The Snap Room<span className="text-accent">.</span>
          </h1>
          <p className="room-chrome-muted mt-1 text-sm">A photo booth on a rainy street. Open all night.</p>
        </div>
        <p className="room-chrome-muted text-xs font-medium uppercase tracking-[0.14em]">
          No uploads · No account · Stays on your device
        </p>
      </header>

      <main className="pb-12">
        <Booth />
      </main>

      <footer className="room-chrome-muted border-t border-current/15 py-6 text-xs">
        Press <kbd className="rounded border border-current/25 px-1.5 py-0.5 font-sans">Space</kbd> to take a photo,{" "}
        <kbd className="rounded border border-current/25 px-1.5 py-0.5 font-sans">Esc</kbd> to cancel the countdown. Everything
        happens on your device.
      </footer>
    </div>
  );
}

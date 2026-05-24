import { createSignal, onMount } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

type PrayerTimes = {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
};

function formatHours(hours: number): string {
  if (!Number.isFinite(hours)) return "--:--";
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function App() {
  const [times, setTimes] = createSignal<PrayerTimes | null>(null);
  const [err, setErr] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      const raw = await invoke<{
        fajr: number;
        sunrise: number;
        dhuhr: number;
        asr: number;
        maghrib: number;
        isha: number;
      }>("compute_prayer_times_demo");
      setTimes({
        fajr: formatHours(raw.fajr),
        sunrise: formatHours(raw.sunrise),
        dhuhr: formatHours(raw.dhuhr),
        asr: formatHours(raw.asr),
        maghrib: formatHours(raw.maghrib),
        isha: formatHours(raw.isha),
      });
    } catch (e) {
      setErr(String(e));
    }
  });

  return (
    <main class="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div class="mx-auto max-w-2xl space-y-8 p-8">
        <header class="space-y-1">
          <h1 class="text-3xl font-semibold tracking-tight">Shollu Modern</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">
            Prayer times reminder · v0.1.0 (early development)
          </p>
        </header>

        <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p class="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Demo · Jakarta · today · ISNA · Shafi'i
          </p>
          {err() && (
            <p class="mt-4 rounded bg-rose-100 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              Backend not yet wired: <code>{err()}</code>
            </p>
          )}
          {times() && (
            <dl class="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 tabular sm:grid-cols-3">
              {(
                [
                  ["Fajr", times()!.fajr],
                  ["Sunrise", times()!.sunrise],
                  ["Dhuhr", times()!.dhuhr],
                  ["Asr", times()!.asr],
                  ["Maghrib", times()!.maghrib],
                  ["Isha", times()!.isha],
                ] as const
              ).map(([name, value]) => (
                <div>
                  <dt class="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {name}
                  </dt>
                  <dd class="text-2xl font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <footer class="space-y-1 text-xs text-slate-500 dark:text-slate-500">
          <p>
            Based on{" "}
            <a
              href="https://ebsoft.web.id"
              target="_blank"
              rel="noreferrer"
              class="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Shollu
            </a>{" "}
            by Ebta Setiawan (2004-2012).
          </p>
          <p>Licensed under PolyForm Noncommercial 1.0.0.</p>
        </footer>
      </div>
    </main>
  );
}

export default App;

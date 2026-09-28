import { useEffect, useState } from "react";
import { CONTACT } from "../config/contact";

interface Timings {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

const PRAYER_LABELS: Array<{ key: keyof Timings; label: string }> = [
  { key: "Fajr", label: "Subuh" },
  { key: "Dhuhr", label: "Dzuhur" },
  { key: "Asr", label: "Ashar" },
  { key: "Maghrib", label: "Maghrib" },
  { key: "Isha", label: "Isya" },
];

const CACHE_KEY = "kmii-prayer-times";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h — timings don't change within a day

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readCache(): Timings | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { date: string; savedAt: number; timings: Timings };
    if (parsed.date !== todayKey()) return null;
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    return parsed.timings;
  } catch {
    return null;
  }
}

function writeCache(timings: Timings) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ date: todayKey(), savedAt: Date.now(), timings }),
    );
  } catch {
    // ignore — cache is a best-effort optimization
  }
}

export function PrayerTimes() {
  const [timings, setTimings] = useState<Timings | null>(() => readCache());
  const [error, setError] = useState(false);

  useEffect(() => {
    if (timings) return;
    const controller = new AbortController();
    // Method 2 = Islamic Society of North America (ISNA) — matches kanazawa-masjid's choice.
    const url = `https://api.aladhan.com/v1/timings?latitude=${CONTACT.lat}&longitude=${CONTACT.lon}&method=2`;
    fetch(url, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        const t = data?.data?.timings as Timings | undefined;
        if (!t) throw new Error("no timings in response");
        setTimings(t);
        writeCache(t);
      })
      .catch(() => setError(true));
    return () => controller.abort();
  }, [timings]);

  return (
    <div className="card">
      <h3 className="font-semibold text-(--text) mb-4">Jadwal Sholat Hari Ini</h3>
      {error && !timings && (
        <p className="text-sm text-muted">Jadwal sholat tidak dapat dimuat. Coba muat ulang halaman.</p>
      )}
      {!timings && !error && <p className="text-sm text-muted">Memuat jadwal sholat...</p>}
      {timings && (
        <ul className="grid grid-cols-5 gap-2 text-center">
          {PRAYER_LABELS.map(({ key, label }) => (
            <li key={key}>
              <p className="text-xs text-muted">{label}</p>
              <p className="font-semibold text-(--text)">{timings[key]}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

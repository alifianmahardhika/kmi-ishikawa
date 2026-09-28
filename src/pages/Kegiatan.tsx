import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Paginated } from "../types/api";
import type { EventItem } from "../types/event";
import { formatDateTimeId } from "../lib/format";
import { useSEO } from "../hooks/useSEO";

export default function Kegiatan() {
  useSEO("Kegiatan", "Jadwal kegiatan komunitas KMII Ishikawa.");
  const [events, setEvents] = useState<EventItem[] | null>(null);

  // No pagination UI here — this is the public page, and calling /api/kegiatan with no
  // query params (page 1) is the only shape that hits the in-memory cache
  // (netlify/functions/kegiatan.mts), so it stays cheap on Turso reads regardless of
  // visitor count. Older/paged kegiatan aren't something public visitors need to dig
  // through; that's what /admin/kegiatan's date filter + pagination is for.
  useEffect(() => {
    api
      .get<Paginated<EventItem>>("/api/kegiatan")
      .then((result) => setEvents(result.items))
      .catch(() => setEvents([]));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="section-title">Kegiatan</h1>
      {events && events.length === 0 && <p className="text-muted">Belum ada kegiatan mendatang.</p>}
      <div className="space-y-4">
        {events?.map((event) => (
          <Link key={event.slug} to={`/kegiatan/${event.slug}`} className="card block hover:no-underline">
            <p className="text-sm text-muted mb-1">{formatDateTimeId(event.startsAt)}</p>
            <h2 className="text-lg font-semibold text-(--text)">{event.title}</h2>
            {event.location && <p className="text-sm text-muted mt-1">📍 {event.location}</p>}
            {event.summary && <p className="text-muted mt-2">{event.summary}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}

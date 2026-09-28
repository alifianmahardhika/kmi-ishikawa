import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, buildQuery } from "../lib/api";
import type { Paginated } from "../types/api";
import type { EventItem } from "../types/event";
import { formatDateTimeId } from "../lib/format";
import { useSEO } from "../hooks/useSEO";
import { Pagination } from "../components/Pagination";

export default function Kegiatan() {
  useSEO("Kegiatan", "Jadwal kegiatan komunitas KMII Ishikawa.");
  const [result, setResult] = useState<Paginated<EventItem> | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api
      .get<Paginated<EventItem>>(`/api/kegiatan${buildQuery({ page })}`)
      .then(setResult)
      .catch(() => setResult({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 1 }));
  }, [page]);

  const events = result?.items ?? null;

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
      {result && <Pagination page={result.page} totalPages={result.totalPages} onPageChange={setPage} />}
    </div>
  );
}

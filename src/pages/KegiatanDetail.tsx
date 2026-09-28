import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { EventItem } from "../types/event";
import { MarkdownContent } from "../components/MarkdownContent";
import { formatDateTimeId } from "../lib/format";
import { useSEO } from "../hooks/useSEO";

export default function KegiatanDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api
      .get<EventItem>(`/api/kegiatan/${slug}`)
      .then(setEvent)
      .catch(() => setNotFound(true));
  }, [slug]);

  useSEO(event?.title ?? "Kegiatan", event?.summary);

  if (notFound) return <div className="max-w-2xl mx-auto px-4 py-12 text-muted">Kegiatan tidak ditemukan.</div>;
  if (!event) return <div className="max-w-2xl mx-auto px-4 py-12 text-muted">Memuat...</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <p className="text-sm text-muted mb-1">{formatDateTimeId(event.startsAt)}</p>
      <h1 className="section-title">{event.title}</h1>
      {event.location && <p className="text-muted mb-6">📍 {event.location}</p>}
      <MarkdownContent markdown={event.body} />
    </div>
  );
}

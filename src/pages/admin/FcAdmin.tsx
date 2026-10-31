import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AdminNav } from "../../components/admin/AdminNav";
import { Field } from "../../components/admin/Field";
import { Pagination } from "../../components/Pagination";
import { api, buildQuery } from "../../lib/api";
import { formatYen } from "../../lib/format";
import { useSEO } from "../../hooks/useSEO";
import type { Paginated } from "../../types/api";
import type { FcAdminBooking, FcContent, FcEvent, FcEventInput } from "../../types/fc";

type Tab = "jadwal" | "peserta" | "teks";

const inputClass = "w-full rounded-lg border px-3 py-2";
const inputStyle = { borderColor: "var(--surface-border)", background: "var(--bg)" };
const dangerStyle = { color: "var(--color-flag-red-id)" };

const EMPTY_EVENT: FcEventInput = {
  title: "",
  date: "",
  time: "17:00–22:00 JST",
  venue: "",
  mapUrl: "",
  gkQuota: 3,
  playerQuota: 24,
  fee: 2000,
  gkFee: 2000,
  notes: "",
  driveUrl: "",
  youtubeUrl: "",
};

const STATUS_LABEL = { pending: "Menunggu konfirmasi", confirmed: "Terdaftar", waiting: "Waiting list" } as const;

const ERRORS: Record<string, string> = {
  mapUrl_invalid: "Tautan Google Maps harus HTTPS (maps.app.goo.gl / google.com/maps).",
  driveUrl_invalid: "Tautan Google Drive harus HTTPS ke drive/docs.google.com.",
  youtubeUrl_invalid: "Tautan YouTube harus HTTPS ke youtube.com / youtu.be.",
  linkUrl_invalid: "Tautan dokumentasi harus HTTPS Google Drive atau YouTube.",
  linkUrl_required: "Setiap tautan dokumentasi harus punya URL.",
  linkTitle_required: "Setiap tautan dokumentasi harus punya judul.",
  date_invalid: "Tanggal tidak valid.",
};
const errorText = (err: unknown) => {
  const code = err instanceof Error && "code" in err ? String((err as { code: unknown }).code) : "";
  return ERRORS[code] ?? "Gagal menyimpan. Periksa kembali isian.";
};

export default function FcAdmin() {
  useSEO("Admin - Silaturahmi FC");
  const [tab, setTab] = useState<Tab>("jadwal");
  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-full border ${
      tab === t ? "bg-(--primary) text-(--on-primary) border-(--primary)" : "border-(--surface-border) text-(--text-muted) hover:text-(--text)"
    }`;

  return (
    <div>
      <AdminNav />
      <div className="max-w-5xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-(--text) mb-4">Silaturahmi FC</h1>
        <div className="flex gap-2 mb-6">
          <button type="button" className={tabClass("jadwal")} onClick={() => setTab("jadwal")}>Jadwal</button>
          <button type="button" className={tabClass("peserta")} onClick={() => setTab("peserta")}>Peserta & pembayaran</button>
          <button type="button" className={tabClass("teks")} onClick={() => setTab("teks")}>Teks halaman</button>
        </div>
        {tab === "jadwal" && <EventsPanel />}
        {tab === "peserta" && <BookingsPanel />}
        {tab === "teks" && <ContentPanel />}
      </div>
    </div>
  );
}

function EventsPanel() {
  const [result, setResult] = useState<Paginated<FcEvent> | null>(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<FcEventInput>(EMPTY_EVENT);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.get<Paginated<FcEvent>>(`/api/admin/fc/events${buildQuery({ page })}`).then(setResult).catch(() => {});
  }, [page]);
  useEffect(load, [load]);

  function edit(event: FcEvent) {
    const { id: _id, isClosed: _closed, createdAt: _created, ...input } = event;
    setEditingId(event.id);
    setForm(input);
    setError("");
  }
  function reset() {
    setEditingId(null);
    setForm(EMPTY_EVENT);
    setError("");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingId) await api.patch(`/api/admin/fc/events/${editingId}`, form);
      else await api.post("/api/admin/fc/events", form);
      reset();
      load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleClosed(event: FcEvent) {
    await api.patch(`/api/admin/fc/events/${event.id}/close`, { closed: !event.isClosed });
    load();
  }
  async function remove(event: FcEvent) {
    if (!confirm(`Hapus "${event.title}" (${event.date}) beserta semua pendaftarnya?`)) return;
    await api.del(`/api/admin/fc/events/${event.id}`);
    if (editingId === event.id) reset();
    load();
  }

  const text = (key: keyof FcEventInput, label: string, type = "text", required = false) => (
    <Field label={label} htmlFor={`fc-ev-${key}`}>
      <input
        id={`fc-ev-${key}`}
        type={type}
        required={required}
        min={type === "number" ? 0 : undefined}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: type === "number" ? Number(e.target.value) : e.target.value })}
        className={inputClass}
        style={inputStyle}
      />
    </Field>
  );

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <form onSubmit={submit} className="card space-y-3 self-start">
        <h2 className="font-semibold text-(--text)">{editingId ? "Edit jadwal" : "Jadwal baru"}</h2>
        {error && <p role="alert" className="text-sm" style={dangerStyle}>{error}</p>}
        {text("title", "Nama pertandingan", "text", true)}
        <div className="grid grid-cols-2 gap-3">
          {text("date", "Tanggal (JST)", "date", true)}
          {text("time", "Waktu")}
        </div>
        {text("venue", "Lokasi", "text", true)}
        {text("mapUrl", "Tautan Google Maps (opsional)", "url")}
        <div className="grid grid-cols-2 gap-3">
          {text("gkQuota", "Kuota kiper", "number", true)}
          {text("playerQuota", "Kuota pemain", "number", true)}
          {text("gkFee", "Biaya kiper (¥)", "number", true)}
          {text("fee", "Biaya pemain (¥)", "number", true)}
        </div>
        {text("driveUrl", "Tautan Google Drive (opsional)", "url")}
        {text("youtubeUrl", "Tautan YouTube (opsional)", "url")}
        <Field label="Catatan / instruksi pembayaran" htmlFor="fc-ev-notes">
          <textarea id="fc-ev-notes" rows={4} maxLength={2000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} style={inputStyle} />
        </Field>
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn-primary !py-1.5 text-sm">{editingId ? "Simpan" : "Tambah"}</button>
          {editingId && <button type="button" onClick={reset} className="btn-secondary !py-1.5 text-sm">Batal</button>}
        </div>
      </form>

      <div>
        {result && <p className="text-xs text-muted mb-2">{result.total} jadwal</p>}
        <div className="space-y-3">
          {result?.items.length === 0 && <p className="text-muted text-sm">Belum ada jadwal.</p>}
          {result?.items.map((event) => (
            <div key={event.id} className="card !py-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="text-xs text-muted">{event.date} · {event.isClosed ? "DITUTUP" : "DIBUKA"}</p>
                  <p className="font-semibold text-(--text)">{event.title}</p>
                  <p className="text-xs text-muted">{event.venue} · GK {event.gkQuota} · Pemain {event.playerQuota} · {formatYen(event.fee)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 text-sm">
                  <button type="button" onClick={() => edit(event)} className="text-(--primary)">Edit</button>
                  <button type="button" onClick={() => toggleClosed(event)} className="text-(--primary)">{event.isClosed ? "Buka daftar" : "Tutup daftar"}</button>
                  <button type="button" onClick={() => remove(event)} style={dangerStyle}>Hapus</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {result && <Pagination page={result.page} totalPages={result.totalPages} onPageChange={setPage} />}
      </div>
    </div>
  );
}

function BookingsPanel() {
  const [events, setEvents] = useState<FcEvent[]>([]);
  const [eventId, setEventId] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<FcAdminBooking> | null>(null);

  useEffect(() => {
    api.get<Paginated<FcEvent>>("/api/admin/fc/events?pageSize=100").then((r) => setEvents(r.items)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    const query = buildQuery({ event: eventId, pending: pendingOnly ? 1 : undefined, page });
    api.get<Paginated<FcAdminBooking>>(`/api/admin/fc/bookings${query}`).then(setResult).catch(() => {});
  }, [eventId, pendingOnly, page]);
  useEffect(load, [load]);

  async function patch(id: number, body: { approved?: boolean; paid?: boolean }) {
    await api.patch(`/api/admin/fc/bookings/${id}`, body);
    load();
  }
  async function remove(b: FcAdminBooking) {
    if (!confirm(`Batalkan pendaftaran ${b.name}?`)) return;
    await api.del(`/api/admin/fc/bookings/${b.id}`);
    load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          aria-label="Filter pertandingan"
          value={eventId}
          onChange={(e) => {
            setEventId(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        >
          <option value="">Semua pertandingan</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.date} · {e.title}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={(e) => {
              setPendingOnly(e.target.checked);
              setPage(1);
            }}
          />
          Hanya yang menunggu konfirmasi
        </label>
        {result && <span className="text-xs text-muted ml-auto">{result.total} pendaftaran</span>}
      </div>

      {result?.items.length === 0 ? (
        <p className="text-muted text-sm">Belum ada peserta terdaftar.</p>
      ) : (
        <div className="overflow-x-auto card !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b" style={{ borderColor: "var(--surface-border)" }}>
                <th className="p-3">Nama / pertandingan</th>
                <th className="p-3">Posisi</th>
                <th className="p-3">Status</th>
                <th className="p-3">Lunas</th>
                <th className="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {result?.items.map((b) => (
                <tr key={b.id} className="border-b last:border-0" style={{ borderColor: "var(--surface-border)" }}>
                  <td className="p-3">
                    <b className="text-(--text)">{b.name}</b>
                    <small className="block text-muted">{b.phone}</small>
                    <small className="block text-muted">{b.eventDate} · {b.eventTitle}</small>
                  </td>
                  <td className="p-3">{b.position === "GK" ? "GK" : "Pemain"}</td>
                  <td className="p-3">{STATUS_LABEL[b.status]}</td>
                  <td className="p-3">
                    <input type="checkbox" aria-label={`Tandai lunas ${b.name}`} checked={b.isPaid} onChange={(e) => patch(b.id, { paid: e.target.checked })} />
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {b.status === "pending" ? (
                      <button type="button" className="btn-primary !py-1 !px-3 text-xs mr-2" onClick={() => patch(b.id, { approved: true })}>Konfirmasi</button>
                    ) : (
                      <button type="button" className="text-xs text-(--primary) mr-3" onClick={() => patch(b.id, { approved: false })}>Batalkan konfirmasi</button>
                    )}
                    <button type="button" className="text-xs" style={dangerStyle} onClick={() => remove(b)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {result && <Pagination page={result.page} totalPages={result.totalPages} onPageChange={setPage} />}
    </div>
  );
}

const CONTENT_FIELDS: { key: Exclude<keyof FcContent, "links">; label: string; multiline?: boolean }[] = [
  { key: "brand", label: "Nama brand" },
  { key: "tagline", label: "Tagline" },
  { key: "eyebrow", label: "Teks kecil di atas judul" },
  { key: "title", label: "Judul halaman" },
  { key: "subtitle", label: "Subjudul" },
  { key: "season", label: "Season" },
  { key: "motto", label: "Motto (tampil di tiap kartu)" },
  { key: "aboutTitle", label: "Judul 'Tentang kami'" },
  { key: "aboutSubtitle", label: "Subjudul 'Tentang kami'" },
  { key: "about", label: "Isi 'Tentang kami'", multiline: true },
  { key: "joinSteps", label: "Langkah bergabung (satu langkah per baris)", multiline: true },
  { key: "joinClosing", label: "Kalimat penutup", multiline: true },
  { key: "historyTitle", label: "Judul riwayat" },
  { key: "historySubtitle", label: "Subjudul riwayat" },
  { key: "linksTitle", label: "Judul bagian tautan" },
  { key: "footer", label: "Teks footer" },
];

function ContentPanel() {
  const [form, setForm] = useState<FcContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get<FcContent>("/api/admin/fc/settings").then(setForm).catch(() => setMessage("Gagal memuat teks."));
  }, []);
  if (!form) return <p className="text-muted text-sm">{message || "Memuat…"}</p>;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await api.patch("/api/admin/fc/settings", form);
      setMessage("Tersimpan.");
    } catch (err) {
      setMessage(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  const setLink = (i: number, patch: Partial<FcContent["links"][number]>) =>
    setForm({ ...form, links: form.links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) });

  return (
    <form onSubmit={submit} className="card space-y-3 max-w-2xl">
      {CONTENT_FIELDS.map(({ key, label, multiline }) => (
        <Field key={key} label={label} htmlFor={`fc-c-${key}`}>
          {multiline ? (
            <textarea id={`fc-c-${key}`} rows={key === "about" ? 8 : 4} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={inputClass} style={inputStyle} />
          ) : (
            <input id={`fc-c-${key}`} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={inputClass} style={inputStyle} />
          )}
        </Field>
      ))}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-(--text) mb-1">Dokumentasi & tautan (Google Drive / YouTube)</legend>
        {form.links.map((link, i) => (
          <div key={i} className="flex gap-2">
            <input aria-label="Judul tautan" placeholder="Judul" value={link.title} onChange={(e) => setLink(i, { title: e.target.value })} className={inputClass} style={inputStyle} />
            <input aria-label="URL tautan" placeholder="https://…" value={link.url} onChange={(e) => setLink(i, { url: e.target.value })} className={inputClass} style={inputStyle} />
            <button type="button" className="text-sm shrink-0" style={dangerStyle} onClick={() => setForm({ ...form, links: form.links.filter((_, idx) => idx !== i) })}>Hapus</button>
          </div>
        ))}
        {form.links.length < 20 && (
          <button type="button" className="text-sm text-(--primary)" onClick={() => setForm({ ...form, links: [...form.links, { title: "", url: "" }] })}>
            + Tambah tautan
          </button>
        )}
      </fieldset>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary !py-1.5 text-sm">Simpan</button>
        {message && <span className="text-sm text-muted" role="status">{message}</span>}
      </div>
    </form>
  );
}

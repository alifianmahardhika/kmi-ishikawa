import { useEffect, useState, type FormEvent } from "react";
import { AdminNav } from "../../components/admin/AdminNav";
import { Field } from "../../components/admin/Field";
import { api } from "../../lib/api";
import type { EventCreateInput, EventItem } from "../../types/event";
import { formatDateTimeId } from "../../lib/format";
import { useSEO } from "../../hooks/useSEO";

const EMPTY: EventCreateInput = {
  slug: "",
  title: "",
  startsAt: "",
  location: "",
  summary: "",
  body: "",
  image: "",
  isPublished: false,
};

export default function KegiatanAdmin() {
  useSEO("Admin - Kegiatan");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [form, setForm] = useState<EventCreateInput>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    api.get<EventItem[]>("/api/admin/kegiatan").then(setEvents).catch(() => {});
  }
  useEffect(load, []);

  function edit(event: EventItem) {
    setEditingId(event.id);
    setForm({
      slug: event.slug,
      title: event.title,
      startsAt: event.startsAt.slice(0, 16),
      location: event.location,
      summary: event.summary,
      body: event.body,
      image: event.image,
      isPublished: event.isPublished,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, startsAt: new Date(form.startsAt).toISOString() };
      if (editingId) {
        await api.patch(`/api/admin/kegiatan/${editingId}`, payload);
      } else {
        await api.post("/api/admin/kegiatan", payload);
      }
      resetForm();
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Hapus kegiatan ini?")) return;
    await api.del(`/api/admin/kegiatan/${id}`);
    load();
  }

  const inputClass = "w-full rounded-lg border px-3 py-2";
  const inputStyle = { borderColor: "var(--surface-border)", background: "var(--bg)" };

  return (
    <div>
      <AdminNav />
      <div className="max-w-5xl mx-auto px-4 grid lg:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="card space-y-3">
          <h2 className="font-semibold text-(--text)">{editingId ? "Edit Kegiatan" : "Kegiatan Baru"}</h2>
          <Field label="Judul" htmlFor="ev-title">
            <input id="ev-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Slug (untuk URL, contoh: kajian-perdana)" htmlFor="ev-slug">
            <input id="ev-slug" required placeholder="kajian-perdana" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Waktu mulai" htmlFor="ev-startsAt">
            <input id="ev-startsAt" required type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Lokasi" htmlFor="ev-location">
            <input id="ev-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Ringkasan singkat" htmlFor="ev-summary">
            <input id="ev-summary" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Isi lengkap (markdown)" htmlFor="ev-body">
            <textarea id="ev-body" rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="URL gambar (opsional)" htmlFor="ev-image">
            <input id="ev-image" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className={inputClass} style={inputStyle} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
            Terbitkan (tampil di halaman publik)
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary !py-1.5 text-sm">
              {editingId ? "Simpan" : "Tambah"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="btn-secondary !py-1.5 text-sm">
                Batal
              </button>
            )}
          </div>
        </form>

        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="card !py-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-semibold text-(--text)">{event.title}</p>
                  <p className="text-xs text-muted">{formatDateTimeId(event.startsAt)}</p>
                  <p className="text-xs text-muted">{event.isPublished ? "Terbit" : "Draf"}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => edit(event)} className="text-sm text-(--primary)">
                    Edit
                  </button>
                  <button type="button" onClick={() => remove(event.id)} className="text-sm" style={{ color: "var(--color-flag-red-id)" }}>
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

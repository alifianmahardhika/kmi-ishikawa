import { useEffect, useState, type FormEvent } from "react";
import { AdminNav } from "../../components/admin/AdminNav";
import { api } from "../../lib/api";
import type { Expense, ExpenseCreateInput } from "../../types/expense";
import { formatYen, formatDateId } from "../../lib/format";
import { useSEO } from "../../hooks/useSEO";

import { DEFAULT_CAMPAIGN_ID as CAMPAIGN_ID } from "../../config/campaign";
const EMPTY: ExpenseCreateInput = {
  campaignId: CAMPAIGN_ID,
  title: "",
  category: "lainnya",
  amount: 0,
  spentOn: new Date().toISOString().slice(0, 10),
  note: "",
};

export default function LaporanAdmin() {
  useSEO("Admin — Laporan");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState<ExpenseCreateInput>(EMPTY);
  const [saving, setSaving] = useState(false);

  function load() {
    api.get<Expense[]>(`/api/admin/laporan?campaign=${CAMPAIGN_ID}`).then(setExpenses).catch(() => {});
  }
  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/admin/laporan", form);
      setForm(EMPTY);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Hapus pengeluaran ini?")) return;
    await api.del(`/api/admin/laporan/${id}`);
    load();
  }

  const inputClass = "w-full rounded-lg border px-3 py-2";
  const inputStyle = { borderColor: "var(--surface-border)", background: "var(--bg)" };

  return (
    <div>
      <AdminNav />
      <div className="max-w-5xl mx-auto px-4 grid lg:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="card space-y-3">
          <h2 className="font-semibold text-(--text)">Pengeluaran Baru</h2>
          <input required placeholder="Keterangan" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} style={inputStyle} />
          <input placeholder="Kategori" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass} style={inputStyle} />
          <input required type="number" min={0} placeholder="Jumlah (¥)" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className={inputClass} style={inputStyle} />
          <input required type="date" value={form.spentOn} onChange={(e) => setForm({ ...form, spentOn: e.target.value })} className={inputClass} style={inputStyle} />
          <textarea placeholder="Catatan (opsional)" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputClass} style={inputStyle} />
          <button type="submit" disabled={saving} className="btn-primary !py-1.5 text-sm">
            Tambah
          </button>
        </form>

        <div className="space-y-2">
          {expenses.map((exp) => (
            <div key={exp.id} className="card !py-3 flex justify-between items-center">
              <div>
                <p className="font-medium text-(--text)">{exp.title}</p>
                <p className="text-xs text-muted">{formatDateId(exp.spentOn)} · {exp.category}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-(--text)">{formatYen(exp.amount)}</p>
                <button type="button" onClick={() => remove(exp.id)} className="text-sm" style={{ color: "var(--color-flag-red-id)" }}>
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

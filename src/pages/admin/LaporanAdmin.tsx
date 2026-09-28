import { useEffect, useState, type FormEvent } from "react";
import { AdminNav } from "../../components/admin/AdminNav";
import { Field } from "../../components/admin/Field";
import { DateRangeFilter } from "../../components/DateRangeFilter";
import { Pagination } from "../../components/Pagination";
import { api, buildQuery } from "../../lib/api";
import type { Paginated } from "../../types/api";
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
  useSEO("Admin - Laporan");
  const [result, setResult] = useState<Paginated<Expense> | null>(null);
  const [form, setForm] = useState<ExpenseCreateInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  function load() {
    const query = buildQuery({ campaign: CAMPAIGN_ID, from, to, page });
    api.get<Paginated<Expense>>(`/api/admin/laporan${query}`).then(setResult).catch(() => {});
  }
  useEffect(load, [from, to, page]);

  function updateFrom(value: string) {
    setFrom(value);
    setPage(1);
  }
  function updateTo(value: string) {
    setTo(value);
    setPage(1);
  }

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
  const expenses = result?.items ?? [];

  return (
    <div>
      <AdminNav />
      <div className="max-w-5xl mx-auto px-4 grid lg:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="card space-y-3">
          <h2 className="font-semibold text-(--text)">Pengeluaran Baru</h2>
          <Field label="Keterangan" htmlFor="exp-title">
            <input id="exp-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Kategori" htmlFor="exp-category">
            <input id="exp-category" placeholder="mis. operasional, sewa" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Jumlah (¥)" htmlFor="exp-amount">
            <input id="exp-amount" required type="number" min={0} value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Tanggal" htmlFor="exp-spentOn">
            <input id="exp-spentOn" required type="date" value={form.spentOn} onChange={(e) => setForm({ ...form, spentOn: e.target.value })} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Catatan (opsional)" htmlFor="exp-note">
            <textarea id="exp-note" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputClass} style={inputStyle} />
          </Field>
          <button type="submit" disabled={saving} className="btn-primary !py-1.5 text-sm">
            Tambah
          </button>
        </form>

        <div>
          <div className="mb-3">
            <DateRangeFilter from={from} to={to} onFromChange={updateFrom} onToChange={updateTo} />
          </div>
          {result && <p className="text-xs text-muted mb-2">{result.total} pengeluaran ditemukan</p>}
          <div className="space-y-2">
            {expenses.length === 0 && <p className="text-muted text-sm">Tidak ada pengeluaran.</p>}
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
          {result && <Pagination page={result.page} totalPages={result.totalPages} onPageChange={setPage} />}
        </div>
      </div>
    </div>
  );
}

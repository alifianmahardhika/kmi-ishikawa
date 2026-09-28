import { useEffect, useState } from "react";
import { AdminNav } from "../../components/admin/AdminNav";
import { DateRangeFilter } from "../../components/admin/DateRangeFilter";
import { Pagination } from "../../components/Pagination";
import { api, buildQuery } from "../../lib/api";
import type { Paginated } from "../../types/api";
import type { Donation, DonationStatus } from "../../types/donation";
import { formatYen, formatDateTimeId } from "../../lib/format";
import { useSEO } from "../../hooks/useSEO";

const STATUS_LABEL: Record<DonationStatus, string> = {
  pending: "Menunggu",
  verified: "Terverifikasi",
  rejected: "Ditolak",
};

export default function DonasiAdmin() {
  useSEO("Admin - Donasi");
  const [result, setResult] = useState<Paginated<Donation> | null>(null);
  const [filter, setFilter] = useState<DonationStatus | "all">("pending");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);

  function load() {
    const query = buildQuery({ status: filter === "all" ? undefined : filter, from, to, page });
    api.get<Paginated<Donation>>(`/api/admin/donasi${query}`).then(setResult).catch(() => {});
  }

  useEffect(load, [filter, from, to, page]);

  // Any filter change resets back to page 1 in the same event-handler tick as the
  // filter state update (React batches these), so `load` above only ever fires once
  // per change — otherwise "page 3" of a new, shorter filtered result set could come
  // back empty, or fire an extra fetch for the stale page first.
  function updateFilter(next: DonationStatus | "all") {
    setFilter(next);
    setPage(1);
  }
  function updateFrom(value: string) {
    setFrom(value);
    setPage(1);
  }
  function updateTo(value: string) {
    setTo(value);
    setPage(1);
  }

  async function updateStatus(id: number, status: DonationStatus) {
    setBusyId(id);
    try {
      await api.patch(`/api/admin/donasi/${id}`, { status });
      load();
    } finally {
      setBusyId(null);
    }
  }

  const donations = result?.items ?? [];

  return (
    <div>
      <AdminNav />
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-4">
          <h1 className="section-title !mb-0">Donasi</h1>
          <div className="flex flex-wrap items-end gap-4">
            <DateRangeFilter from={from} to={to} onFromChange={updateFrom} onToChange={updateTo} />
            <div>
              <label htmlFor="statusFilter" className="block text-xs text-muted mb-1">
                Filter status
              </label>
              <select
                id="statusFilter"
                value={filter}
                onChange={(e) => updateFilter(e.target.value as DonationStatus | "all")}
                className="rounded-lg border px-3 py-1.5 text-sm"
                style={{ borderColor: "var(--surface-border)", background: "var(--bg)" }}
              >
                <option value="pending">Menunggu</option>
                <option value="verified">Terverifikasi</option>
                <option value="rejected">Ditolak</option>
                <option value="all">Semua</option>
              </select>
            </div>
          </div>
        </div>

        {result && (
          <p className="text-xs text-muted mb-3">{result.total} donasi ditemukan</p>
        )}

        <div className="space-y-3">
          {donations.length === 0 && <p className="text-muted text-sm">Tidak ada donasi.</p>}
          {donations.map((d) => (
            <div key={d.id} className="card !py-4">
              <div className="flex flex-wrap justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold text-(--text)">
                    {d.donorName} · {formatYen(d.amount)}
                  </p>
                  <p className="text-xs text-muted">
                    Kode <span className="font-mono">{d.code}</span> · {formatDateTimeId(d.createdAt)}
                  </p>
                  {d.contact && <p className="text-xs text-muted">Kontak: {d.contact}</p>}
                  {d.message && <p className="text-sm text-muted italic mt-1">"{d.message}"</p>}
                </div>
                <span className="text-xs font-medium self-start px-2 py-1 rounded-full" style={{ background: "var(--bg-elevated)" }}>
                  {STATUS_LABEL[d.status]}
                </span>
              </div>
              {d.status === "pending" && (
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() => updateStatus(d.id, "verified")}
                    className="btn-primary !py-1 !px-3 text-sm"
                  >
                    Verifikasi
                  </button>
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() => updateStatus(d.id, "rejected")}
                    className="btn-secondary !py-1 !px-3 text-sm"
                  >
                    Tolak
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {result && <Pagination page={result.page} totalPages={result.totalPages} onPageChange={setPage} />}
      </div>
    </div>
  );
}

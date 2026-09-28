import { useEffect, useState } from "react";
import { AdminNav } from "../../components/admin/AdminNav";
import { api } from "../../lib/api";
import type { Donation, DonationStatus } from "../../types/donation";
import { formatYen, formatDateTimeId } from "../../lib/format";
import { useSEO } from "../../hooks/useSEO";

const STATUS_LABEL: Record<DonationStatus, string> = {
  pending: "Menunggu",
  verified: "Terverifikasi",
  rejected: "Ditolak",
};

export default function DonasiAdmin() {
  useSEO("Admin — Donasi");
  const [donations, setDonations] = useState<Donation[]>([]);
  const [filter, setFilter] = useState<DonationStatus | "all">("pending");
  const [busyId, setBusyId] = useState<number | null>(null);

  function load() {
    api.get<Donation[]>("/api/admin/donasi").then(setDonations).catch(() => {});
  }

  useEffect(load, []);

  async function updateStatus(id: number, status: DonationStatus) {
    setBusyId(id);
    try {
      await api.patch(`/api/admin/donasi/${id}`, { status });
      load();
    } finally {
      setBusyId(null);
    }
  }

  const filtered = filter === "all" ? donations : donations.filter((d) => d.status === filter);

  return (
    <div>
      <AdminNav />
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="section-title !mb-0">Donasi</h1>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as DonationStatus | "all")}
            className="rounded-lg border px-3 py-1.5 text-sm"
            style={{ borderColor: "var(--surface-border)", background: "var(--bg)" }}
          >
            <option value="pending">Menunggu</option>
            <option value="verified">Terverifikasi</option>
            <option value="rejected">Ditolak</option>
            <option value="all">Semua</option>
          </select>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 && <p className="text-muted text-sm">Tidak ada donasi.</p>}
          {filtered.map((d) => (
            <div key={d.id} className="card !py-4">
              <div className="flex flex-wrap justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold text-(--text)">
                    {d.donorName} — {formatYen(d.amount)}
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
      </div>
    </div>
  );
}

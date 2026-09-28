import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { LaporanSummary } from "../types/expense";
import type { DonationStats } from "../types/donation";
import { formatYen, formatDateId, formatMonthId } from "../lib/format";
import { useSEO } from "../hooks/useSEO";
import { DEFAULT_CAMPAIGN_ID as CAMPAIGN_ID } from "../config/campaign";

export default function Laporan() {
  useSEO("Laporan Keuangan", "Transparansi donasi bulanan KMII Ishikawa.");
  const [summary, setSummary] = useState<LaporanSummary | null>(null);
  const [stats, setStats] = useState<DonationStats | null>(null);

  // Deliberately no date filter / pagination controls here — this is the public page,
  // and calling /api/laporan with no query params (page 1, no filter) is the only
  // shape that hits the in-memory cache (netlify/functions/laporan.mts), so it stays
  // cheap on Turso reads no matter how many visitors open this page. Filtering by date
  // is an admin tool (/admin/laporan), not something public visitors need.
  useEffect(() => {
    api.get<LaporanSummary>(`/api/laporan?campaign=${CAMPAIGN_ID}`).then(setSummary).catch(() => {});
    api.get<DonationStats>(`/api/stats?campaign=${CAMPAIGN_ID}`).then(setStats).catch(() => {});
  }, []);

  const expenses = summary?.expenses.items ?? [];
  const hasMore = summary ? summary.expenses.totalPages > 1 : false;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="section-title">Laporan Keuangan</h1>
      <p className="text-muted mb-8">
        Ringkasan donasi yang terverifikasi dan penyaluran dana untuk mendukung Imam.
        Total di bawah ini akumulasi sepanjang waktu; progress bulan berjalan ada di
        halaman <a href="/donasi" className="text-(--primary) underline">Donasi</a>.
      </p>

      {stats && (
        <p className="text-sm text-muted mb-4">
          Total donasi terverifikasi sepanjang waktu: <span className="font-semibold text-(--text)">{formatYen(stats.allTimeCollected)}</span>
        </p>
      )}

      {summary && (
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <div className="card text-center">
            <p className="text-xs text-muted mb-1">Total Masuk</p>
            <p className="text-xl font-bold text-(--text)">{formatYen(summary.totalIn)}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-muted mb-1">Total Keluar</p>
            <p className="text-xl font-bold text-(--text)">{formatYen(summary.totalOut)}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-muted mb-1">Saldo</p>
            <p className="text-xl font-bold text-(--primary)">{formatYen(summary.balance)}</p>
          </div>
        </div>
      )}

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-(--text) mb-3">Penyaluran / Pengeluaran Terbaru</h2>
        {summary && expenses.length === 0 && (
          <p className="text-muted text-sm">Belum ada pengeluaran tercatat.</p>
        )}
        {summary && expenses.length > 0 && (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="pb-2">Tanggal</th>
                  <th className="pb-2">Keterangan</th>
                  <th className="pb-2">Kategori</th>
                  <th className="pb-2 text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id} className="border-t" style={{ borderColor: "var(--surface-border)" }}>
                    <td className="py-2">{formatDateId(exp.spentOn)}</td>
                    <td className="py-2">{exp.title}</td>
                    <td className="py-2 text-muted">{exp.category}</td>
                    <td className="py-2 text-right">{formatYen(exp.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {hasMore && (
          <p className="text-xs text-muted mt-2">
            Menampilkan {expenses.length} dari {summary?.expenses.total} pengeluaran terbaru.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-(--text) mb-3">
          Donatur Bulan {stats ? formatMonthId(stats.month) : ""}
        </h2>
        {stats && stats.recentDonors.length === 0 && (
          <p className="text-muted text-sm">Belum ada donasi terverifikasi bulan ini.</p>
        )}
        <ul className="space-y-2">
          {stats?.recentDonors.map((donor, i) => (
            <li key={i} className="card flex justify-between items-center !py-3">
              <div>
                <p className="font-medium text-(--text)">{donor.name}</p>
                {donor.message && <p className="text-sm text-muted italic">"{donor.message}"</p>}
              </div>
              <p className="font-semibold text-(--primary)">{formatYen(donor.amount)}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

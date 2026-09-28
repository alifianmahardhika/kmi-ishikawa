import { useEffect, useState } from "react";
import { AdminNav } from "../../components/admin/AdminNav";
import { api } from "../../lib/api";
import type { DonationStats } from "../../types/donation";
import { formatYen } from "../../lib/format";
import { useSEO } from "../../hooks/useSEO";

const CAMPAIGN_ID = "masjid-2026";

export default function Dashboard() {
  useSEO("Admin Dashboard");
  const [stats, setStats] = useState<DonationStats | null>(null);

  useEffect(() => {
    api.get<DonationStats>(`/api/stats?campaign=${CAMPAIGN_ID}`).then(setStats).catch(() => {});
  }, []);

  return (
    <div>
      <AdminNav />
      <div className="max-w-5xl mx-auto px-4">
        <h1 className="section-title">Dashboard</h1>
        {stats && (
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="card text-center">
              <p className="text-xs text-muted mb-1">Terkumpul (terverifikasi)</p>
              <p className="text-xl font-bold text-(--text)">{formatYen(stats.collected)}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-muted mb-1">Target</p>
              <p className="text-xl font-bold text-(--text)">{formatYen(stats.target)}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-muted mb-1">Jumlah Donatur</p>
              <p className="text-xl font-bold text-(--text)">{stats.donorCount}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { AdminNav } from "../../components/admin/AdminNav";
import { api } from "../../lib/api";
import type { DonationStats } from "../../types/donation";
import { formatYen, formatMonthId } from "../../lib/format";
import { useSEO } from "../../hooks/useSEO";
import { DEFAULT_CAMPAIGN_ID as CAMPAIGN_ID } from "../../config/campaign";
import { CampaignTargetForm } from "../../components/admin/CampaignTargetForm";

export default function Dashboard() {
  useSEO("Admin Dashboard");
  const [stats, setStats] = useState<DonationStats | null>(null);

  function loadStats() {
    api.get<DonationStats>(`/api/stats?campaign=${CAMPAIGN_ID}`).then(setStats).catch(() => {});
  }
  useEffect(loadStats, []);

  return (
    <div>
      <AdminNav />
      <div className="max-w-5xl mx-auto px-4 space-y-8">
        <div>
          <h1 className="section-title !mb-1">Dashboard</h1>
          {stats && <p className="text-sm text-muted mb-4">Bulan {formatMonthId(stats.month)} (progress direset tiap bulan)</p>}
          {stats && (
            <div className="grid sm:grid-cols-4 gap-4">
              <div className="card text-center">
                <p className="text-xs text-muted mb-1">Terkumpul bulan ini</p>
                <p className="text-xl font-bold text-(--text)">{formatYen(stats.collected)}</p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-muted mb-1">Target bulanan</p>
                <p className="text-xl font-bold text-(--text)">{formatYen(stats.target)}</p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-muted mb-1">Donatur bulan ini</p>
                <p className="text-xl font-bold text-(--text)">{stats.donorCount}</p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-muted mb-1">Total sepanjang waktu</p>
                <p className="text-xl font-bold text-(--text)">{formatYen(stats.allTimeCollected)}</p>
              </div>
            </div>
          )}
        </div>

        <CampaignTargetForm campaignId={CAMPAIGN_ID} currentTarget={stats?.target} onSaved={loadStats} />
      </div>
    </div>
  );
}

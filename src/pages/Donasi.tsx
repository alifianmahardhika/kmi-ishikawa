import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DonationForm } from "../components/donasi/DonationForm";
import { ProgressBar } from "../components/donasi/ProgressBar";
import { api } from "../lib/api";
import type { DonationStats } from "../types/donation";
import { useSEO } from "../hooks/useSEO";
import { DEFAULT_CAMPAIGN_ID as CAMPAIGN_ID } from "../config/campaign";
import { formatMonthId } from "../lib/format";

export default function Donasi() {
  useSEO("Donasi", "Donasi nafkah bulanan Imam KMII Ishikawa.");
  const navigate = useNavigate();
  const [stats, setStats] = useState<DonationStats | null>(null);

  useEffect(() => {
    api
      .get<DonationStats>(`/api/stats?campaign=${CAMPAIGN_ID}`)
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="section-title">Nafkah Bulanan Imam</h1>
      <p className="text-muted mb-6">
        Donasi Anda membantu mendukung nafkah bulanan Imam KMII Ishikawa. Setiap transfer
        diverifikasi manual oleh bendahara — Anda akan mendapat kode konfirmasi untuk
        dilampirkan saat mengirim bukti transfer.
      </p>

      {stats && (
        <div className="card mb-6">
          <p className="text-xs text-muted mb-2">Progress bulan {formatMonthId(stats.month)} (direset setiap bulan)</p>
          <ProgressBar collected={stats.collected} target={stats.target} />
          <p className="text-sm text-muted mt-3">{stats.donorCount} donatur bulan ini</p>
        </div>
      )}

      <DonationForm
        campaignId={CAMPAIGN_ID}
        onSuccess={(code) => navigate(`/donasi/sukses?code=${encodeURIComponent(code)}`)}
      />
    </div>
  );
}

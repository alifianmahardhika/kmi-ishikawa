import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DonationForm } from "../components/donasi/DonationForm";
import { ProgressBar } from "../components/donasi/ProgressBar";
import { api } from "../lib/api";
import type { DonationStats } from "../types/donation";
import { useSEO } from "../hooks/useSEO";

const CAMPAIGN_ID = "masjid-2026";

export default function Donasi() {
  useSEO("Donasi", "Donasi untuk pembangunan musala KMII Ishikawa.");
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
      <h1 className="section-title">Donasi Pembangunan Musala</h1>
      <p className="text-muted mb-6">
        Donasi Anda membantu pembangunan dan operasional musala komunitas KMII Ishikawa.
        Setiap transfer diverifikasi manual oleh bendahara — Anda akan mendapat kode
        konfirmasi untuk dilampirkan saat mengirim bukti transfer.
      </p>

      {stats && (
        <div className="card mb-6">
          <ProgressBar collected={stats.collected} target={stats.target} />
          <p className="text-sm text-muted mt-3">{stats.donorCount} donatur telah berpartisipasi</p>
        </div>
      )}

      <DonationForm
        campaignId={CAMPAIGN_ID}
        onSuccess={(code) => navigate(`/donasi/sukses?code=${encodeURIComponent(code)}`)}
      />
    </div>
  );
}

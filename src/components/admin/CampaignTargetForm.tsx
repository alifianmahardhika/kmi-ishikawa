import { useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import type { CampaignUpdateInput } from "../../types/donation";

export function CampaignTargetForm({
  campaignId,
  currentTarget,
  onSaved,
}: {
  campaignId: string;
  currentTarget: number | undefined;
  onSaved: () => void;
}) {
  const [value, setValue] = useState<string>(currentTarget ? String(currentTarget) : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const targetAmount = Number(value);
    if (!Number.isFinite(targetAmount) || targetAmount < 1) {
      setError("Target harus angka lebih dari 0.");
      return;
    }
    setSaving(true);
    try {
      const payload: CampaignUpdateInput = { targetAmount };
      await api.patch(`/api/admin/campaign?campaign=${campaignId}`, payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } catch {
      setError("Gagal menyimpan target.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-sm space-y-3">
      <h2 className="font-semibold text-(--text)">Target Donasi Bulanan</h2>
      <div>
        <label htmlFor="targetAmount" className="block text-sm font-medium text-(--text) mb-1">
          Nominal target (¥ per bulan)
        </label>
        <input
          id="targetAmount"
          type="number"
          min={1}
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
          style={{ borderColor: "var(--surface-border)", background: "var(--bg)" }}
        />
      </div>
      {error && <p className="text-sm" style={{ color: "var(--color-flag-red-id)" }}>{error}</p>}
      <button type="submit" disabled={saving} className="btn-primary !py-1.5 text-sm disabled:opacity-60">
        {saving ? "Menyimpan..." : saved ? "Tersimpan!" : "Simpan Target"}
      </button>
    </form>
  );
}

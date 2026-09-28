import { useEffect, useState, type FormEvent } from "react";
import { AdminNav } from "../../components/admin/AdminNav";
import { Field } from "../../components/admin/Field";
import { api } from "../../lib/api";
import type { RekeningInfo, SiteSettings, WhatsappTreasurer } from "../../types/settings";
import { useSEO } from "../../hooks/useSEO";

const EMPTY_REKENING: RekeningInfo = {
  bankName: "",
  branchNumber: "",
  accountType: "",
  accountNumber: "",
  accountHolder: "",
};
const EMPTY_WA: WhatsappTreasurer = { name: "", phone: "" };

const inputClass = "w-full rounded-lg border px-3 py-2";
const inputStyle = { borderColor: "var(--surface-border)", background: "var(--bg)" };

export default function Pengaturan() {
  useSEO("Admin - Pengaturan");
  const [rekening, setRekening] = useState<RekeningInfo>(EMPTY_REKENING);
  const [whatsapp, setWhatsapp] = useState<WhatsappTreasurer>(EMPTY_WA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<SiteSettings>("/api/admin/settings")
      .then((data) => {
        setRekening(data.rekening);
        setWhatsapp(data.whatsappTreasurer);
      })
      .catch(() => setError("Gagal memuat pengaturan."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.patch("/api/admin/settings", { rekening, whatsappTreasurer: whatsapp });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Gagal menyimpan pengaturan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <AdminNav />
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="section-title">Pengaturan</h1>
        <p className="text-muted mb-6">
          Rekening dan nomor WhatsApp bendahara di sini langsung dipakai di halaman
          publik (konfirmasi donasi & kontak) — ubah kapan saja tanpa perlu deploy ulang.
        </p>

        {loading ? (
          <p className="text-muted text-sm">Memuat...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="card space-y-3">
              <h2 className="font-semibold text-(--text)">Rekening Transfer</h2>
              <Field label="Nama Bank" htmlFor="set-bankName">
                <input
                  id="set-bankName"
                  required
                  value={rekening.bankName}
                  onChange={(e) => setRekening({ ...rekening, bankName: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                />
              </Field>
              <Field label="Cabang (opsional)" htmlFor="set-branchNumber">
                <input
                  id="set-branchNumber"
                  placeholder="mis. 三一八 / 318"
                  value={rekening.branchNumber}
                  onChange={(e) => setRekening({ ...rekening, branchNumber: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                />
              </Field>
              <Field label="Jenis Rekening (opsional)" htmlFor="set-accountType">
                <input
                  id="set-accountType"
                  placeholder="mis. Tabungan (普通)"
                  value={rekening.accountType}
                  onChange={(e) => setRekening({ ...rekening, accountType: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                />
              </Field>
              <Field label="Nomor Rekening" htmlFor="set-accountNumber">
                <input
                  id="set-accountNumber"
                  required
                  value={rekening.accountNumber}
                  onChange={(e) => setRekening({ ...rekening, accountNumber: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                />
              </Field>
              <Field label="Atas Nama" htmlFor="set-accountHolder">
                <input
                  id="set-accountHolder"
                  required
                  value={rekening.accountHolder}
                  onChange={(e) => setRekening({ ...rekening, accountHolder: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                />
              </Field>
            </div>

            <div className="card space-y-3">
              <h2 className="font-semibold text-(--text)">WhatsApp Bendahara</h2>
              <Field label="Nama" htmlFor="set-waName">
                <input
                  id="set-waName"
                  required
                  value={whatsapp.name}
                  onChange={(e) => setWhatsapp({ ...whatsapp, name: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                />
              </Field>
              <Field label="Nomor WhatsApp (format internasional, tanpa +)" htmlFor="set-waPhone">
                <input
                  id="set-waPhone"
                  required
                  placeholder="mis. 818012345678"
                  value={whatsapp.phone}
                  onChange={(e) => setWhatsapp({ ...whatsapp, phone: e.target.value.replace(/[^0-9]/g, "") })}
                  className={inputClass}
                  style={inputStyle}
                />
              </Field>
            </div>

            {error && <p className="text-sm" style={{ color: "var(--color-flag-red-id)" }}>{error}</p>}

            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? "Menyimpan..." : saved ? "Tersimpan!" : "Simpan Pengaturan"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

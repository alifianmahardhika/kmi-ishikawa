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

const inputClass = "w-full rounded-lg border px-3 py-2 transition-colors disabled:cursor-not-allowed";

function inputStyle(editing: boolean) {
  return editing
    ? { borderColor: "var(--surface-border)", background: "var(--bg)" }
    : { borderColor: "var(--surface-border)", background: "var(--bg-elevated)", color: "var(--text-muted)" };
}

export default function Pengaturan() {
  useSEO("Admin - Pengaturan");
  const [saved, setSaved] = useState<SiteSettings>({ rekening: EMPTY_REKENING, whatsappTreasurer: EMPTY_WA });
  const [rekening, setRekening] = useState<RekeningInfo>(EMPTY_REKENING);
  const [whatsapp, setWhatsapp] = useState<WhatsappTreasurer>(EMPTY_WA);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [savingState, setSavingState] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<SiteSettings>("/api/admin/settings")
      .then((data) => {
        setSaved(data);
        setRekening(data.rekening);
        setWhatsapp(data.whatsappTreasurer);
      })
      .catch(() => setError("Gagal memuat pengaturan."))
      .finally(() => setLoading(false));
  }, []);

  function startEdit() {
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setRekening(saved.rekening);
    setWhatsapp(saved.whatsappTreasurer);
    setError(null);
    setEditing(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSavingState(true);
    try {
      await api.patch("/api/admin/settings", { rekening, whatsappTreasurer: whatsapp });
      setSaved({ rekening, whatsappTreasurer: whatsapp });
      setEditing(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } catch {
      setError("Gagal menyimpan pengaturan.");
    } finally {
      setSavingState(false);
    }
  }

  const locked = !editing;

  return (
    <div>
      <AdminNav />
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h1 className="section-title !mb-0">Pengaturan</h1>
          {!loading && locked && (
            <button type="button" onClick={startEdit} className="btn-secondary !py-1.5 text-sm shrink-0">
              Edit
            </button>
          )}
        </div>
        <p className="text-muted mb-6">
          Rekening dan nomor WhatsApp bendahara di sini langsung dipakai di halaman
          publik (konfirmasi donasi & kontak) — ubah kapan saja tanpa perlu deploy ulang.
          {locked && !loading && " Klik “Edit” untuk mengubah."}
        </p>

        {justSaved && (
          <p className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ background: "var(--bg-elevated)", color: "var(--primary)" }}>
            Pengaturan tersimpan.
          </p>
        )}

        {loading ? (
          <p className="text-muted text-sm">Memuat...</p>
        ) : (
          <fieldset disabled={locked} className="space-y-6 border-0 p-0 m-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="card space-y-3">
                <h2 className="font-semibold text-(--text)">Rekening Transfer</h2>
                <Field label="Nama Bank" htmlFor="set-bankName">
                  <input
                    id="set-bankName"
                    required
                    disabled={locked}
                    value={rekening.bankName}
                    onChange={(e) => setRekening({ ...rekening, bankName: e.target.value })}
                    className={inputClass}
                    style={inputStyle(editing)}
                  />
                </Field>
                <Field label="Cabang (opsional)" htmlFor="set-branchNumber">
                  <input
                    id="set-branchNumber"
                    placeholder="mis. 三一八 / 318"
                    disabled={locked}
                    value={rekening.branchNumber}
                    onChange={(e) => setRekening({ ...rekening, branchNumber: e.target.value })}
                    className={inputClass}
                    style={inputStyle(editing)}
                  />
                </Field>
                <Field label="Jenis Rekening (opsional)" htmlFor="set-accountType">
                  <input
                    id="set-accountType"
                    placeholder="mis. Tabungan (普通)"
                    disabled={locked}
                    value={rekening.accountType}
                    onChange={(e) => setRekening({ ...rekening, accountType: e.target.value })}
                    className={inputClass}
                    style={inputStyle(editing)}
                  />
                </Field>
                <Field label="Nomor Rekening" htmlFor="set-accountNumber">
                  <input
                    id="set-accountNumber"
                    required
                    disabled={locked}
                    value={rekening.accountNumber}
                    onChange={(e) => setRekening({ ...rekening, accountNumber: e.target.value })}
                    className={inputClass}
                    style={inputStyle(editing)}
                  />
                </Field>
                <Field label="Atas Nama" htmlFor="set-accountHolder">
                  <input
                    id="set-accountHolder"
                    required
                    disabled={locked}
                    value={rekening.accountHolder}
                    onChange={(e) => setRekening({ ...rekening, accountHolder: e.target.value })}
                    className={inputClass}
                    style={inputStyle(editing)}
                  />
                </Field>
              </div>

              <div className="card space-y-3">
                <h2 className="font-semibold text-(--text)">WhatsApp Bendahara</h2>
                <Field label="Nama" htmlFor="set-waName">
                  <input
                    id="set-waName"
                    required
                    disabled={locked}
                    value={whatsapp.name}
                    onChange={(e) => setWhatsapp({ ...whatsapp, name: e.target.value })}
                    className={inputClass}
                    style={inputStyle(editing)}
                  />
                </Field>
                <Field label="Nomor WhatsApp (format internasional, tanpa +)" htmlFor="set-waPhone">
                  <input
                    id="set-waPhone"
                    required
                    disabled={locked}
                    placeholder="mis. 818012345678"
                    value={whatsapp.phone}
                    onChange={(e) => setWhatsapp({ ...whatsapp, phone: e.target.value.replace(/[^0-9]/g, "") })}
                    className={inputClass}
                    style={inputStyle(editing)}
                  />
                </Field>
              </div>

              {error && <p className="text-sm" style={{ color: "var(--color-flag-red-id)" }}>{error}</p>}

              {editing && (
                <div className="flex gap-2">
                  <button type="submit" disabled={savingState} className="btn-primary disabled:opacity-60">
                    {savingState ? "Menyimpan..." : "Simpan Pengaturan"}
                  </button>
                  <button type="button" onClick={cancelEdit} disabled={savingState} className="btn-secondary disabled:opacity-60">
                    Batal
                  </button>
                </div>
              )}
            </form>
          </fieldset>
        )}
      </div>
    </div>
  );
}

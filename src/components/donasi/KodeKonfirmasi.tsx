import { useState } from "react";
import { CONTACT, whatsappLink } from "../../config/contact";
import { REKENING } from "../../config/rekening";

export function KodeKonfirmasi({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — user can still select the text manually
    }
  }

  const waMessage = `Assalamu'alaikum, saya sudah transfer donasi dengan kode ${code}. Berikut bukti transfernya.`;

  return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center">
      <h1 className="section-title">Terima kasih!</h1>
      <p className="text-muted mb-6">
        Simpan kode konfirmasi ini, lalu transfer sesuai rekening di bawah dan kirim bukti
        transfer ke bendahara lewat WhatsApp.
      </p>

      <div className="card mb-6">
        <p className="text-sm text-muted mb-2">Kode Konfirmasi</p>
        <p className="text-3xl font-bold tracking-wider text-(--primary) mb-3">{code}</p>
        <button type="button" onClick={copyCode} className="btn-secondary text-sm !py-1.5">
          {copied ? "Tersalin!" : "Salin kode"}
        </button>
      </div>

      <div className="card text-left mb-6 space-y-1">
        <p className="font-semibold text-(--text) mb-2">Detail Rekening</p>
        <p className="text-muted">Bank: {REKENING.bankName}</p>
        <p className="text-muted">Cabang: {REKENING.branchNumber}</p>
        <p className="text-muted">Jenis: {REKENING.accountType}</p>
        <p className="text-muted">No. Rekening: {REKENING.accountNumber}</p>
        <p className="text-muted">Atas nama: {REKENING.accountHolder}</p>
      </div>

      <a
        href={whatsappLink(CONTACT.whatsappTreasurer.phone, waMessage)}
        target="_blank"
        rel="noreferrer"
        className="btn-primary w-full inline-block"
      >
        Kirim Bukti Transfer via WhatsApp
      </a>
    </div>
  );
}

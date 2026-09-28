import { CONTACT } from "../config/contact";

export function Footer() {
  return (
    <footer
      className="border-t mt-16"
      style={{ background: "var(--bg-elevated)", borderColor: "var(--surface-border)" }}
    >
      <div className="max-w-6xl mx-auto px-4 py-10 grid gap-8 sm:grid-cols-3">
        <div>
          <p className="font-display font-bold text-(--text)">{CONTACT.orgName}</p>
          <p className="text-sm text-muted mt-1">{CONTACT.orgFullName}</p>
          <p className="text-sm text-muted mt-2 italic">"{CONTACT.tagline}"</p>
        </div>
        <div>
          <p className="font-semibold text-(--text) mb-2">Tautan</p>
          <ul className="space-y-1 text-sm text-muted">
            <li><a href="/donasi" className="hover:text-(--text)">Donasi</a></li>
            <li><a href="/kegiatan" className="hover:text-(--text)">Kegiatan</a></li>
            <li><a href="/laporan" className="hover:text-(--text)">Laporan Keuangan</a></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-(--text) mb-2">Kontak</p>
          <ul className="space-y-1 text-sm text-muted">
            <li>{CONTACT.address}</li>
            <li><a href={CONTACT.instagram} className="hover:text-(--text)" target="_blank" rel="noreferrer">Instagram</a></li>
            <li><a href={CONTACT.whatsappCommunity} className="hover:text-(--text)" target="_blank" rel="noreferrer">Grup WhatsApp</a></li>
          </ul>
        </div>
      </div>
      <div className="text-center text-xs text-muted pb-6">
        © {new Date().getFullYear()} {CONTACT.orgName} ·{" "}
        <a href="/admin/login" className="hover:text-(--text)">
          Admin
        </a>
      </div>
    </footer>
  );
}

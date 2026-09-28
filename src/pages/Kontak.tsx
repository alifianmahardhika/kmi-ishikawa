import { CONTACT, whatsappLink } from "../config/contact";
import { useSettings } from "../hooks/useSettings";
import { useSEO } from "../hooks/useSEO";

export default function Kontak() {
  useSEO("Kontak", "Hubungi KMII Ishikawa lewat WhatsApp atau Instagram.");
  const settings = useSettings();

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="section-title">Kontak</h1>
      <div className="card space-y-4">
        <div>
          <p className="font-semibold text-(--text)">Alamat</p>
          <p className="text-muted">{CONTACT.address}</p>
        </div>
        <div>
          <p className="font-semibold text-(--text)">Grup WhatsApp Komunitas</p>
          <a href={CONTACT.whatsappCommunity} target="_blank" rel="noreferrer" className="text-(--primary) underline">
            Gabung grup
          </a>
        </div>
        <div>
          <p className="font-semibold text-(--text)">Instagram</p>
          <a href={CONTACT.instagram} target="_blank" rel="noreferrer" className="text-(--primary) underline">
            {CONTACT.instagram}
          </a>
        </div>
        <div>
          <p className="font-semibold text-(--text)">Bendahara</p>
          {settings ? (
            <a
              href={whatsappLink(settings.whatsappTreasurer.phone, "Assalamu'alaikum, saya ingin bertanya tentang KMII Ishikawa.")}
              target="_blank"
              rel="noreferrer"
              className="text-(--primary) underline"
            >
              Chat via WhatsApp
            </a>
          ) : (
            <p className="text-muted text-sm">Memuat...</p>
          )}
        </div>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { PrayerTimes } from "../components/PrayerTimes";
import { CONTACT } from "../config/contact";
import { useSEO } from "../hooks/useSEO";

export default function Home() {
  useSEO(
    "Beranda",
    `Komunitas Muslim Indonesia di Ishikawa — kegiatan, jadwal sholat, dan program donasi.`,
  );

  return (
    <div>
      <section
        className="text-center px-4 py-20"
        style={{ background: "linear-gradient(to bottom right, var(--primary), var(--primary-hover))" }}
      >
        <h1 className="text-4xl sm:text-5xl font-display font-bold text-white mb-4">
          {CONTACT.orgFullName}
        </h1>
        <p className="text-white/90 text-lg max-w-xl mx-auto mb-8 italic">"{CONTACT.tagline}"</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/donasi" className="btn-primary !bg-white !text-(--primary)">
            Donasi Sekarang
          </Link>
          <Link to="/kegiatan" className="btn-secondary !border-white !text-white">
            Lihat Kegiatan
          </Link>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12">
        <PrayerTimes />
      </section>

      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="section-title">Sambutan</h2>
        <p className="text-muted leading-relaxed">
          {CONTACT.orgName} ({CONTACT.orgFullName}) adalah wadah silaturahmi dan kegiatan
          keagamaan bagi Muslim Indonesia yang tinggal di Ishikawa, Jepang. Kami mengadakan
          kajian rutin, sholat berjamaah, dan berbagai kegiatan komunitas — sekaligus
          menggalang donasi untuk pembangunan musala.
        </p>
      </section>
    </div>
  );
}

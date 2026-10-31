import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Modal } from "../components/Modal";
import { Field } from "../components/admin/Field";
import { api, ApiRequestError } from "../lib/api";
import { formatYen } from "../lib/format";
import { addFcToken, clearFcMember, readFcMember, readFcTokens, writeFcMember, writeFcTokens, type FcMember } from "../lib/fcTokens";
import { useSEO } from "../hooks/useSEO";
import type {
  FcBookingCreateResponse,
  FcBookingStatus,
  FcLookupResponse,
  FcMyBooking,
  FcPosition,
  FcPublicData,
  FcPublicEvent,
} from "../types/fc";

type Tab = "jadwal" | "riwayat" | "saya";
type Dialog =
  | { kind: "about" }
  | { kind: "detail"; event: FcPublicEvent }
  | { kind: "book"; event: FcPublicEvent }
  | { kind: "success"; code: string };

const ERROR_TEXT: Record<string, string> = {
  phone_invalid: "Gunakan nomor dengan kode negara, mis. +819012345678 atau +628123456789.",
  name_required: "Isi nama pemain (minimal 2 huruf).",
  code_invalid: "Kode member tidak valid. Contoh format: SFC-AB3K-9XQ7.",
  lookup_failed: "Kode member tidak dikenali, atau terlalu banyak percobaan. Coba lagi nanti.",
  already_registered: "Nomor HP ini sudah terdaftar di pertandingan tersebut.",
  event_closed: "Pendaftaran pertandingan ini sudah ditutup.",
  event_finished: "Pertandingan ini sudah selesai.",
  too_many_requests: "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.",
};
const errorText = (err: unknown) =>
  err instanceof ApiRequestError ? (ERROR_TEXT[err.code] ?? "Terjadi kesalahan. Coba lagi.") : "Terjadi kesalahan. Coba lagi.";

const STATUS_LABEL: Record<FcBookingStatus, string> = {
  pending: "Menunggu konfirmasi",
  confirmed: "Terdaftar",
  waiting: "Waiting list",
};

// Tanggal jadwal = tanggal kalender JST (YYYY-MM-DD); format di zona yang sama supaya
// hari/tanggalnya tidak bergeser untuk pengunjung di zona waktu lain (mis. Indonesia).
const jstDate = (date: string) => new Date(`${date}T12:00:00+09:00`);
const fmt = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Tokyo", ...opts }).format(jstDate(date));

function shiftMonth(month: string, delta: number): string {
  const [y = 0, m = 1] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function SilaturahmiFC() {
  const [data, setData] = useState<FcPublicData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState<Tab>("jadwal");
  const [month, setMonth] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [mine, setMine] = useState<FcMyBooking[]>([]);
  const [notice, setNotice] = useState("");
  const [member, setMember] = useState<FcMember | null>(() => readFcMember());

  useSEO(data?.content.brand ?? "Silaturahmi FC", "Jadwal dan pendaftaran main bola bareng Silaturahmi FC.");

  const loadData = useCallback(() => {
    api
      .get<FcPublicData>("/api/fc")
      .then((d) => {
        setData(d);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }, []);
  useEffect(loadData, [loadData]);

  // Satu fetch tanpa parameter (kena cache); pembagian jadwal/riwayat dan navigasi bulan
  // dikerjakan di klien dari daftar yang sama — tidak ada request tambahan per interaksi.
  const loadMine = useCallback(async () => {
    const tokens = readFcTokens();
    if (tokens.length === 0) {
      setMine([]);
      return;
    }
    try {
      const items = await api.post<FcMyBooking[]>("/api/fc/saya", { tokens });
      setMine(items);
      // Token yang sudah tidak ada di server (pendaftaran dihapus admin) dibuang.
      const alive = new Set(items.map((i) => i.token));
      if (alive.size !== tokens.length) writeFcTokens(tokens.filter((t) => alive.has(t)));
    } catch {
      // biarkan daftar lama; bukan error yang perlu diganggu ke pengunjung
    }
  }, []);
  useEffect(() => {
    void loadMine();
  }, [loadMine]);

  const today = data?.today ?? "";
  const upcoming = useMemo(
    () => (data?.events ?? []).filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)),
    [data, today],
  );
  const past = useMemo(() => (data?.events ?? []).filter((e) => e.date < today), [data, today]);

  const activeMonth = month ?? upcoming[0]?.date.slice(0, 7) ?? today.slice(0, 7);
  const shown = tab === "riwayat" ? past : upcoming.filter((e) => e.date.startsWith(activeMonth));
  const myByEvent = new Map(mine.map((m) => [m.eventId, m]));

  async function cancel(booking: FcMyBooking) {
    if (!confirm("Batalkan pendaftaran? Slot akan diberikan ke peserta waiting list berikutnya.")) return;
    try {
      await api.post("/api/fc/batal", { token: booking.token });
      setNotice("Pendaftaran dibatalkan.");
    } catch (err) {
      setNotice(errorText(err));
    }
    await loadMine();
    loadData();
  }

  if (loadError && !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-muted mb-4">Gagal memuat jadwal.</p>
        <button type="button" className="btn-secondary" onClick={loadData}>
          Coba lagi
        </button>
      </div>
    );
  }
  if (!data) return <div className="max-w-3xl mx-auto px-4 py-12 text-muted">Memuat jadwal pertandingan…</div>;

  const { content } = data;
  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-full border transition-colors ${
      tab === t ? "bg-(--primary) text-(--on-primary) border-(--primary)" : "border-(--surface-border) text-(--text-muted) hover:text-(--text)"
    }`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Foto tim di atas langit malam yang gelap; orangnya ada di bagian bawah foto, jadi teks
          diletakkan di atas (objectPosition 80% menjaga wajah tetap terlihat saat dipotong). */}
      <header className="relative overflow-hidden rounded-2xl mb-8 min-h-[420px] sm:min-h-[440px] text-white">
        <img
          src="/images/silaturahmi-fc-hero.webp"
          alt="Foto kebersamaan tim Silaturahmi FC"
          width={1536}
          height={1152}
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "center 80%" }}
        />
        <div aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(4,17,40,0.75), rgba(4,17,40,0.15) 65%)" }} />
        <div className="relative p-6 sm:p-10 flex items-start gap-4 sm:gap-6">
          <img
            src="/images/silaturahmi-fc-logo.webp"
            alt="Logo Silaturahmi FC"
            width={313}
            height={360}
            className="h-16 sm:h-28 w-auto shrink-0"
            style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.55))" }}
          />
          <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-widest text-white/80 mb-2">{content.eyebrow}</p>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-xl">
              <h1 className="text-2xl sm:text-4xl font-bold">
                {tab === "riwayat" ? content.historyTitle : tab === "saya" ? "Pendaftaran saya" : content.title}
              </h1>
              <p className="text-sm sm:text-base text-white/85 mt-2">
                {tab === "riwayat"
                  ? content.historySubtitle
                  : tab === "saya"
                    ? "Status tersimpan di browser ini. Pindah HP atau browser? Masuk dengan kode member di bawah."
                    : content.subtitle}
              </p>
            </div>
            {content.season && (
              <span className="text-xs font-semibold tracking-wider text-white/80">
                SEASON <b className="text-white">{content.season}</b>
              </span>
            )}
          </div>
          </div>
        </div>
      </header>

      {notice && (
        <div className="card !py-3 mb-4 flex justify-between items-center gap-3 text-sm" role="status">
          <span>{notice}</span>
          <button type="button" className="text-(--primary)" onClick={() => setNotice("")}>
            Tutup
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button type="button" className={tabClass("jadwal")} onClick={() => setTab("jadwal")}>
          Akan datang
        </button>
        <button type="button" className={tabClass("riwayat")} onClick={() => setTab("riwayat")}>
          Sudah berlangsung
        </button>
        <button type="button" className={tabClass("saya")} onClick={() => setTab("saya")}>
          Pendaftaran saya{mine.length > 0 && ` (${mine.length})`}
        </button>
        <button type="button" className="ml-auto text-sm text-(--primary)" onClick={() => setDialog({ kind: "about" })}>
          Tentang kami · Cara bergabung
        </button>
      </div>

      {tab === "jadwal" && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-(--text)">
            {fmt(`${activeMonth}-01`, { month: "long", year: "numeric" })}
          </h2>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-secondary !py-1 !px-3" aria-label="Bulan sebelumnya" onClick={() => setMonth(shiftMonth(activeMonth, -1))}>
              ‹
            </button>
            <button type="button" className="btn-secondary !py-1 !px-3" aria-label="Bulan berikutnya" onClick={() => setMonth(shiftMonth(activeMonth, 1))}>
              ›
            </button>
          </div>
        </div>
      )}

      {tab === "saya" ? (
        <>
        {member && (
          <p className="text-sm text-muted mb-4">
            Masuk sebagai <b className="text-(--text)">{member.name}</b> ·{" "}
            <button
              type="button"
              className="text-(--primary)"
              onClick={() => {
                if (!confirm("Keluar dari perangkat ini? Simpan kode member Anda dulu — dibutuhkan untuk masuk lagi.")) return;
                clearFcMember();
                setMember(null);
                writeFcTokens([]);
                setMine([]);
              }}
            >
              Keluar dari perangkat ini
            </button>
          </p>
        )}
        {mine.length === 0 ? (
          <div className="card text-center">
            <h2 className="font-semibold text-(--text) mb-1">Belum ada pertandingan dipilih</h2>
            <p className="text-muted mb-4">Temukan jadwal yang cocok dan daftarkan diri Anda.</p>
            <button type="button" className="btn-primary" onClick={() => setTab("jadwal")}>
              Lihat jadwal
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {mine.map((b) => (
              <div key={b.token} className="card flex flex-wrap justify-between items-center gap-3">
                <div>
                  <span className="text-xs font-semibold tracking-wider text-(--primary)">{STATUS_LABEL[b.status].toUpperCase()}</span>
                  <h3 className="font-semibold text-(--text)">{b.eventTitle}</h3>
                  <p className="text-sm text-muted">
                    {fmt(b.eventDate, { dateStyle: "full" })} · {b.position === "GK" ? "Kiper" : "Pemain"} ·{" "}
                    {b.isPaid ? "Lunas" : "Belum dikonfirmasi lunas"}
                  </p>
                </div>
                {b.canCancel && (
                  <button type="button" className="btn-secondary !py-1 text-sm" onClick={() => cancel(b)}>
                    Batalkan pendaftaran
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {!member && (
          <LookupForm
            onFound={async (res, code) => {
              res.tokens.forEach(addFcToken);
              writeFcMember({ code, name: res.name });
              setMember({ code, name: res.name });
              await loadMine();
              setNotice(`Halo, ${res.name}! Pendaftaran Anda ditemukan dan disimpan di browser ini.`);
            }}
          />
        )}
        </>
      ) : shown.length === 0 ? (
        <div className="card text-center text-muted">
          {tab === "riwayat"
            ? "Pertandingan yang sudah selesai akan muncul di sini."
            : "Belum ada pertandingan di bulan ini. Pilih bulan lain atau tunggu jadwal berikutnya."}
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map((event, i) => (
            <MatchCard
              key={event.id}
              event={event}
              motto={content.motto}
              featured={tab === "jadwal" && i === 0}
              finished={event.date < today}
              mine={myByEvent.get(event.id)}
              onDetail={() => setDialog({ kind: "detail", event })}
              onBook={() => setDialog({ kind: "book", event })}
            />
          ))}
        </div>
      )}

      {content.links.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-(--text) mb-3">{content.linksTitle || "Dokumentasi & tautan"}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {content.links.map((link) => (
              <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="card block hover:no-underline !py-4">
                <span className="text-xs font-semibold tracking-wider text-(--primary)">
                  {new URL(link.url).hostname.includes("youtu") ? "▶ YOUTUBE" : "GOOGLE DRIVE"}
                </span>
                <h3 className="font-semibold text-(--text)">{link.title}</h3>
                <small className="text-muted">Buka di tab baru</small>
              </a>
            ))}
          </div>
        </section>
      )}

      {content.footer && <p className="text-center text-xs text-muted mt-12">{content.footer}</p>}

      {dialog?.kind === "about" && (
        <Modal title={content.aboutTitle} subtitle={content.aboutSubtitle} onClose={() => setDialog(null)}>
          <div className="space-y-3 text-muted leading-relaxed">
            <p style={{ whiteSpace: "pre-wrap" }}>{content.about}</p>
            {content.joinSteps.trim() && (
              <ol className="list-decimal ml-6">
                {content.joinSteps
                  .split("\n")
                  .filter((s) => s.trim())
                  .map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
              </ol>
            )}
            {content.joinClosing && <p style={{ whiteSpace: "pre-wrap" }}>{content.joinClosing}</p>}
          </div>
        </Modal>
      )}

      {dialog?.kind === "detail" && (
        <DetailDialog
          event={dialog.event}
          finished={dialog.event.date < today}
          mine={myByEvent.get(dialog.event.id)}
          onClose={() => setDialog(null)}
          onBook={() => setDialog({ kind: "book", event: dialog.event })}
        />
      )}

      {dialog?.kind === "book" && (
        <BookDialog
          event={dialog.event}
          member={member}
          onForgetMember={() => {
            clearFcMember();
            setMember(null);
          }}
          onClose={() => setDialog(null)}
          onDone={async (res) => {
            addFcToken(res.token);
            setTab("saya");
            if (res.code) {
              // Pendaftar baru: simpan identitas di perangkat ini, tampilkan kode SEKALI.
              writeFcMember({ code: res.code, name: res.name });
              setMember({ code: res.code, name: res.name });
              setDialog({ kind: "success", code: res.code });
            } else {
              setDialog(null);
              setNotice("Pendaftaran terkirim. Tunggu konfirmasi dari pengurus.");
            }
            await loadMine();
          }}
        />
      )}

      {dialog?.kind === "success" && <CodeDialog code={dialog.code} onClose={() => setDialog(null)} />}
    </div>
  );
}

function MatchCard({
  event,
  motto,
  featured,
  finished,
  mine,
  onDetail,
  onBook,
}: {
  event: FcPublicEvent;
  motto: string;
  featured: boolean;
  finished: boolean;
  mine?: FcMyBooking;
  onDetail: () => void;
  onBook: () => void;
}) {
  const quota = event.gkQuota + event.playerQuota;
  const filled = event.confirmedGk + event.confirmedPlayers;
  const full = quota > 0 && filled >= quota;
  const pct = quota > 0 ? Math.min(100, (filled / quota) * 100) : 0;
  const status = finished ? "SELESAI" : event.isClosed ? "PENDAFTARAN DITUTUP" : full ? "WAITING LIST" : "PENDAFTARAN DIBUKA";
  const canBook = !finished && !event.isClosed && !mine;

  return (
    <article className="card !p-0 overflow-hidden grid sm:grid-cols-[88px_1fr_220px]" style={featured ? { borderColor: "var(--primary)" } : undefined}>
      <div className="flex sm:flex-col items-center justify-center gap-2 sm:gap-0 p-3 text-center" style={{ background: "var(--bg-elevated)" }}>
        <span className="text-xs uppercase text-muted">{fmt(event.date, { weekday: "short" })}</span>
        <strong className="text-3xl text-(--text)">{event.date.slice(8)}</strong>
        <span className="text-xs uppercase text-muted">{fmt(event.date, { month: "short" })}</span>
      </div>
      <div className="p-5">
        <div className="flex flex-wrap gap-x-3 text-xs font-semibold tracking-wider mb-1">
          <span className="text-(--primary)">{featured && !finished ? "NEXT MATCH DAY" : "SFC MATCH DAY"}</span>
          <span className="text-muted">{status}</span>
        </div>
        <h3 className="text-lg font-semibold text-(--text)">{event.title}</h3>
        {motto && <p className="text-xs text-muted mb-3">{motto}</p>}
        <dl className="text-sm space-y-1">
          <div><dt className="inline text-muted">🕒 Waktu: </dt><dd className="inline text-(--text)">{event.time || "-"}</dd></div>
          <div><dt className="inline text-muted">📍 Lokasi: </dt><dd className="inline text-(--text)">{event.venue}</dd></div>
          <div><dt className="inline text-muted">👥 Kuota: </dt><dd className="inline text-(--text)">{quota} pemain</dd></div>
        </dl>
      </div>
      <aside className="p-5 border-t sm:border-t-0 sm:border-l space-y-2" style={{ borderColor: "var(--surface-border)" }}>
        <div className="flex justify-between text-sm"><span className="text-muted">Pemain</span><b>{formatYen(event.fee)}</b></div>
        <div className="flex justify-between text-sm"><span className="text-muted">Goalkeeper</span><b>{formatYen(event.gkFee)}</b></div>
        <div>
          <div className="flex justify-between text-xs text-muted mb-1">
            <span>SLOT TERISI</span>
            <span><b className="text-(--text)">{filled}</b> / {quota}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--primary)" }} />
          </div>
          <div className="flex justify-between text-xs text-muted mt-1">
            <span>GK {event.confirmedGk}/{event.gkQuota}</span>
            <span>Pemain {event.confirmedPlayers}/{event.playerQuota}</span>
          </div>
          {event.waiting > 0 && <p className="text-xs text-muted mt-1">{event.waiting} orang dalam waiting list</p>}
        </div>
        <button type="button" className="btn-secondary !py-1.5 text-sm w-full" onClick={onDetail}>
          Lihat detail
        </button>
        <button type="button" className="btn-primary !py-1.5 text-sm w-full disabled:opacity-50" disabled={!canBook} onClick={onBook}>
          {mine ? "Sudah terdaftar" : finished ? "Pertandingan selesai" : event.isClosed ? "Pendaftaran ditutup" : full ? "Gabung waiting list" : "Daftar match day"}
        </button>
      </aside>
    </article>
  );
}

function DetailDialog({
  event,
  finished,
  mine,
  onClose,
  onBook,
}: {
  event: FcPublicEvent;
  finished: boolean;
  mine?: FcMyBooking;
  onClose: () => void;
  onBook: () => void;
}) {
  const linkClass = "btn-secondary !py-1.5 text-sm block text-center";
  return (
    <Modal title={event.title} subtitle="Informasi pertandingan" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <p><small className="block text-muted">TANGGAL</small>{fmt(event.date, { dateStyle: "full" })}</p>
          <p><small className="block text-muted">WAKTU</small>{event.time || "-"}</p>
          <p><small className="block text-muted">LOKASI</small>{event.venue}</p>
          <p><small className="block text-muted">BIAYA</small>Pemain {formatYen(event.fee)} · GK {formatYen(event.gkFee)}</p>
        </div>
        {event.mapUrl && <a className={linkClass} href={event.mapUrl} target="_blank" rel="noreferrer">📍 Lihat lokasi di Google Maps</a>}
        {event.driveUrl && <a className={linkClass} href={event.driveUrl} target="_blank" rel="noopener noreferrer">Buka Google Drive ↗</a>}
        {event.youtubeUrl && <a className={linkClass} href={event.youtubeUrl} target="_blank" rel="noopener noreferrer">▶ Tonton di YouTube ↗</a>}
        <p className="text-muted" style={{ whiteSpace: "pre-wrap" }}>{event.notes || "Belum ada catatan tambahan dari penyelenggara."}</p>
        <p className="text-xs text-muted">
          {event.confirmedGk + event.confirmedPlayers} peserta terdaftar · {event.waiting} waiting list
        </p>
        <button type="button" className="btn-primary w-full disabled:opacity-50" disabled={finished || event.isClosed || !!mine} onClick={onBook}>
          {mine ? "Anda sudah terdaftar" : "Daftar pertandingan"}
        </button>
      </div>
    </Modal>
  );
}

function BookDialog({
  event,
  member,
  onForgetMember,
  onClose,
  onDone,
}: {
  event: FcPublicEvent;
  member: FcMember | null;
  onForgetMember: () => void;
  onClose: () => void;
  onDone: (res: FcBookingCreateResponse) => void | Promise<void>;
}) {
  const [asMember, setAsMember] = useState(member !== null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState<FcPosition>("PLAYER");
  const [website, setWebsite] = useState(""); // honeypot — manusia tidak melihat/mengisinya
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await api.post<FcBookingCreateResponse>(
        "/api/fc/daftar",
        asMember && member
          ? { eventId: event.id, position, memberCode: member.code, website }
          : { eventId: event.id, position, name, phone, website },
      );
      await onDone(res);
    } catch (err) {
      if (asMember && err instanceof ApiRequestError && err.code === "lookup_failed") {
        // Kode tersimpan sudah tidak dikenal server (mis. dihapus admin) -> kembali ke isian biasa.
        onForgetMember();
        setAsMember(false);
        setError("Kode member tersimpan tidak dikenali. Silakan isi data Anda lagi.");
      } else {
        setError(errorText(err));
      }
      setSaving(false);
    }
  }

  const inputClass = "w-full rounded-lg border px-3 py-2";
  const inputStyle = { borderColor: "var(--surface-border)", background: "var(--bg)" };

  return (
    <Modal title="Amankan tempatmu" subtitle="Tanpa membuat akun. Admin akan mengonfirmasi pendaftaran Anda." onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="text-sm">
          <b className="text-(--text)">{event.title}</b>
          <span className="text-muted"> · {fmt(event.date, { dateStyle: "medium" })} · {event.time}</span>
        </div>
        {error && <p role="alert" className="text-sm" style={{ color: "var(--color-flag-red-id)" }}>{error}</p>}

        {asMember && member ? (
          <div className="card !shadow-none !p-3 text-sm flex items-center justify-between gap-3">
            <span>
              Daftar sebagai <b className="text-(--text)">{member.name}</b>
            </span>
            <button type="button" className="text-(--primary) shrink-0" onClick={() => setAsMember(false)}>
              Bukan Anda?
            </button>
          </div>
        ) : (
          <>
            <Field label="Nama pemain" htmlFor="fc-name">
              <input id="fc-name" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama yang dikenal di lapangan" className={inputClass} style={inputStyle} />
            </Field>
            <Field label="Nomor HP / WhatsApp" htmlFor="fc-phone">
              <input id="fc-phone" required type="tel" autoComplete="tel" maxLength={22} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+819012345678 atau +628123456789" className={inputClass} style={inputStyle} />
              <small className="text-muted">Gunakan kode negara, tanpa 0 pertama. Nomor hanya terlihat oleh admin.</small>
            </Field>
          </>
        )}

        <Field label="Posisi" htmlFor="fc-position">
          <select id="fc-position" value={position} onChange={(e) => setPosition(e.target.value as FcPosition)} className={inputClass} style={inputStyle}>
            <option value="PLAYER">Pemain — {formatYen(event.fee)}</option>
            <option value="GK">Goalkeeper — {formatYen(event.gkFee)}</option>
          </select>
        </Field>

        <div className="rounded-lg border p-3 text-xs text-muted space-y-1" style={{ borderColor: "var(--surface-border)" }}>
          <p className="font-semibold text-(--text)">🔒 Keamanan data Anda</p>
          <ul className="list-disc ml-4 space-y-0.5">
            <li>Yang kami simpan hanya nama, nomor HP, dan posisi bermain.</li>
            <li>Nomor HP hanya terlihat oleh pengurus (admin) dan dipakai untuk konfirmasi serta koordinasi pertandingan. Tidak pernah ditampilkan di halaman publik.</li>
            <li>Data dikirim lewat koneksi terenkripsi (HTTPS). Alamat IP tidak disimpan utuh — hanya sidik jari satu arah untuk mencegah spam.</li>
            <li>Pendaftar baru mendapat <b>kode member</b> yang berlaku untuk semua pertandingan berikutnya. Di server kode itu disimpan diacak satu arah dengan kunci rahasia, jadi tidak bisa dilihat siapa pun, termasuk admin.</li>
            <li>Di browser ini hanya tersimpan nama dan kode member Anda (bukan nomor HP), supaya pendaftaran berikutnya tidak perlu mengisi ulang. Hapus kapan saja lewat "Keluar dari perangkat ini" di tab Pendaftaran saya.</li>
            <li>Ingin data dihapus? Minta admin membatalkan pendaftaran Anda kapan saja.</li>
          </ul>
        </div>

        <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}>
          <label>
            Website
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
        </div>
        <p className="text-xs text-muted">Nomor HP belum diverifikasi otomatis; admin akan mencocokkan data Anda.</p>
        <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-50">
          {saving ? "Menyimpan…" : "Kirim pendaftaran"}
        </button>
      </form>
    </Modal>
  );
}

function LookupForm({ onFound }: { onFound: (res: FcLookupResponse, code: string) => void | Promise<void> }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api.post<FcLookupResponse>("/api/fc/cari", { code });
      await onFound(res, code.trim().toUpperCase());
      setCode("");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "w-full rounded-lg border px-3 py-2";
  const inputStyle = { borderColor: "var(--surface-border)", background: "var(--bg)" };

  return (
    <form onSubmit={submit} className="card mt-6 space-y-3">
      <div>
        <h2 className="font-semibold text-(--text)">Ganti HP atau browser?</h2>
        <p className="text-sm text-muted">Masuk dengan kode member yang Anda terima saat pertama kali mendaftar (format SFC-XXXX-XXXX).</p>
      </div>
      {error && <p role="alert" className="text-sm" style={{ color: "var(--color-flag-red-id)" }}>{error}</p>}
      <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
        <Field label="Kode member" htmlFor="fc-lookup-code">
          <input id="fc-lookup-code" required maxLength={16} autoComplete="off" autoCapitalize="characters" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SFC-ABCD-EFGH" className={inputClass} style={inputStyle} />
        </Field>
        <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">{busy ? "Mencari…" : "Masuk"}</button>
      </div>
      <p className="text-xs text-muted">Lupa kode? Hubungi admin untuk membatalkan atau mengubah pendaftaran.</p>
    </form>
  );
}

function CodeDialog({ code, onClose }: { code: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard tidak tersedia — kode tetap bisa disalin manual / di-screenshot
    }
  }

  // Kode hanya muncul sekali (di server hanya tersimpan HMAC-nya). Tutup tidak sengaja =
  // kode hilang, jadi ✕ / klik latar / Esc minta konfirmasi dulu; tombol utama langsung menutup.
  const confirmClose = () => {
    if (confirm("Kode ini tidak akan ditampilkan lagi. Yakin sudah menyimpannya?")) onClose();
  };

  return (
    <Modal title="Pendaftaran terkirim" subtitle="Simpan kode member Anda." onClose={confirmClose}>
      <div className="space-y-4 text-center">
        <div className="card !shadow-none">
          <p className="text-sm text-muted mb-2">Kode Member</p>
          <p className="text-3xl font-bold tracking-wider text-(--primary) mb-3 select-all">{code}</p>
          <button type="button" onClick={copy} className="btn-secondary text-sm !py-1.5">
            {copied ? "Tersalin!" : "Salin kode"}
          </button>
        </div>
        <ul className="text-sm text-muted text-left list-disc ml-5 space-y-1">
          <li><b className="text-(--text)">Screenshot atau salin sekarang</b> — kode tidak akan ditampilkan lagi.</li>
          <li>Kode ini berlaku untuk semua pertandingan berikutnya. Di perangkat ini Anda tidak perlu mengisi data lagi, cukup pilih posisi.</li>
          <li>Di HP / browser lain, masukkan kode di tab Pendaftaran saya untuk melihat atau membatalkan pendaftaran.</li>
          <li>Status pendaftaran Anda: menunggu konfirmasi dari pengurus.</li>
        </ul>
        <button type="button" className="btn-primary w-full" onClick={onClose}>
          Saya sudah menyimpan kode
        </button>
      </div>
    </Modal>
  );
}

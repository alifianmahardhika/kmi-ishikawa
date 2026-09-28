import { useEffect, useState, type FormEvent } from "react";
import { api, ApiRequestError } from "../../lib/api";
import type { DonationCreateInput, DonationCreateResponse } from "../../types/donation";
import { formatYen } from "../../lib/format";

const PRESET_AMOUNTS = [1000, 3000, 5000, 10000];

interface CaptchaChallenge {
  question: string;
  token: string;
}

export function DonationForm({
  campaignId,
  onSuccess,
}: {
  campaignId: string;
  onSuccess: (code: string) => void;
}) {
  const [donorName, setDonorName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [amount, setAmount] = useState<number>(3000);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — must stay empty
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captcha, setCaptcha] = useState<CaptchaChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<CaptchaChallenge>("/api/captcha").then(setCaptcha).catch(() => setCaptcha(null));
  }, []);

  const effectiveAmount = customAmount ? Number(customAmount) : amount;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!captcha) {
      setError("Captcha belum siap. Muat ulang halaman.");
      return;
    }
    if (!Number.isFinite(effectiveAmount) || effectiveAmount < 500) {
      setError("Nominal donasi minimal ¥500.");
      return;
    }

    const payload: DonationCreateInput = {
      campaignId,
      donorName: isAnonymous ? "Hamba Allah" : donorName,
      isAnonymous,
      amount: effectiveAmount,
      message,
      contact,
      website,
      captchaToken: captcha.token,
      captchaAnswer: Number(captchaAnswer),
    };

    setSubmitting(true);
    try {
      const res = await api.post<DonationCreateResponse>("/api/donasi", payload);
      onSuccess(res.code);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.code === "too_many_requests") {
          setError("Terlalu banyak percobaan. Coba lagi nanti.");
        } else if (err.code === "captcha_invalid") {
          setError("Jawaban captcha salah atau kedaluwarsa. Coba lagi.");
          api.get<CaptchaChallenge>("/api/captcha").then(setCaptcha).catch(() => {});
        } else {
          setError("Gagal mengirim donasi. Periksa kembali data Anda.");
        }
      } else {
        setError("Terjadi kesalahan jaringan. Coba lagi.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      <div>
        <label className="flex items-center gap-2 text-sm text-muted mb-3">
          <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
          Donasi sebagai "Hamba Allah" (anonim)
        </label>
        {!isAnonymous && (
          <div>
            <label htmlFor="donorName" className="block text-sm font-medium text-(--text) mb-1">
              Nama
            </label>
            <input
              id="donorName"
              required
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
              style={{ borderColor: "var(--surface-border)", background: "var(--bg)" }}
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-(--text) mb-2">Nominal</label>
        <div className="grid grid-cols-4 gap-2 mb-2">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              type="button"
              key={preset}
              onClick={() => {
                setAmount(preset);
                setCustomAmount("");
              }}
              className="btn-secondary !py-1.5 text-sm"
              style={
                amount === preset && !customAmount
                  ? { background: "var(--primary)", color: "var(--on-primary)" }
                  : undefined
              }
            >
              {formatYen(preset)}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={500}
          placeholder="Nominal lain (¥)"
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
          style={{ borderColor: "var(--surface-border)", background: "var(--bg)" }}
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-(--text) mb-1">
          Pesan / doa (opsional)
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          maxLength={500}
          className="w-full rounded-lg border px-3 py-2"
          style={{ borderColor: "var(--surface-border)", background: "var(--bg)" }}
        />
      </div>

      <div>
        <label htmlFor="contact" className="block text-sm font-medium text-(--text) mb-1">
          Kontak (opsional, tidak ditampilkan publik)
        </label>
        <input
          id="contact"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="No. WhatsApp / email"
          className="w-full rounded-lg border px-3 py-2"
          style={{ borderColor: "var(--surface-border)", background: "var(--bg)" }}
        />
      </div>

      {/* Honeypot — hidden from real users via CSS, bots that fill every field trip it. */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {captcha && (
        <div>
          <label htmlFor="captchaAnswer" className="block text-sm font-medium text-(--text) mb-1">
            Berapa {captcha.question}?
          </label>
          <input
            id="captchaAnswer"
            required
            inputMode="numeric"
            value={captchaAnswer}
            onChange={(e) => setCaptchaAnswer(e.target.value)}
            className="w-full rounded-lg border px-3 py-2"
            style={{ borderColor: "var(--surface-border)", background: "var(--bg)" }}
          />
        </div>
      )}

      {error && <p className="text-sm" style={{ color: "var(--color-flag-red-id)" }}>{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
        {submitting ? "Mengirim..." : "Lanjutkan Donasi"}
      </button>
    </form>
  );
}

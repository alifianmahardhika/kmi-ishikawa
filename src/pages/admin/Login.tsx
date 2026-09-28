import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiRequestError } from "../../lib/api";
import { useSEO } from "../../hooks/useSEO";

export default function Login() {
  useSEO("Admin Login");
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/api/admin/login", { password });
      navigate("/admin");
    } catch (err) {
      setError(err instanceof ApiRequestError && err.code === "unauthorized"
        ? "Password salah."
        : "Gagal masuk. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="section-title text-center">Admin Login</h1>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-(--text) mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border px-3 py-2"
            style={{ borderColor: "var(--surface-border)", background: "var(--bg)" }}
          />
        </div>
        {error && <p className="text-sm" style={{ color: "var(--color-flag-red-id)" }}>{error}</p>}
        <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
          {submitting ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}

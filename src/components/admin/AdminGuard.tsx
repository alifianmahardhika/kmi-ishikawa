import { useEffect, useState } from "react";
import { Link, Navigate, Outlet } from "react-router-dom";
import { api } from "../../lib/api";

/**
 * Client-side gate only for UX (skip flashing admin UI before redirecting to login).
 * The actual authorization boundary is server-side: every /api/admin/* function checks
 * isAuthenticated(req) itself and returns 401 regardless of what this component does.
 */
export function AdminGuard() {
  const [status, setStatus] = useState<"checking" | "ok" | "unauthenticated">("checking");

  useEffect(() => {
    api
      .get("/api/admin/me")
      .then(() => setStatus("ok"))
      .catch(() => setStatus("unauthenticated"));
  }, []);

  if (status === "checking") return <div className="max-w-3xl mx-auto px-4 py-12 text-muted">Memeriksa sesi...</div>;
  if (status === "unauthenticated") return <Navigate to="/admin/login" replace />;
  return (
    <>
      {/* Penanda "sedang di area admin": bar merah menempel di atas + bingkai merah di tepi
          layar (pointer-events-none supaya tidak menghalangi klik). Dipasang di sini karena
          guard ini membungkus SEMUA halaman admin yang terproteksi. */}
      <div
        role="status"
        className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-3 px-4 py-1.5 text-xs font-bold tracking-wider text-white"
        style={{ background: "var(--color-flag-red-id)" }}
      >
        <span>⚠ MODE ADMIN</span>
        <span className="font-normal normal-case tracking-normal">Perubahan di sini langsung memengaruhi data asli.</span>
        <Link to="/" className="font-normal underline text-white">
          Lihat situs publik
        </Link>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-40"
        style={{ boxShadow: "inset 0 0 0 4px var(--color-flag-red-id)" }}
      />
      <Outlet />
    </>
  );
}

import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
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
  return <Outlet />;
}

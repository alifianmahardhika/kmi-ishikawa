import { NavLink, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";

const LINKS = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/donasi", label: "Donasi" },
  { to: "/admin/kegiatan", label: "Kegiatan" },
  { to: "/admin/laporan", label: "Laporan" },
];

export function AdminNav() {
  const navigate = useNavigate();

  async function logout() {
    await api.post("/api/admin/logout", {}).catch(() => {});
    navigate("/admin/login");
  }

  return (
    <div className="border-b mb-8" style={{ borderColor: "var(--surface-border)" }}>
      <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
        <nav className="flex gap-4">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? "text-(--primary)" : "text-(--text-muted) hover:text-(--text)"}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button type="button" onClick={logout} className="text-sm text-muted hover:text-(--text)">
          Keluar
        </button>
      </div>
    </div>
  );
}

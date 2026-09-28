import { NavLink } from "react-router-dom";
import { CONTACT } from "../config/contact";
import { useTheme } from "../hooks/useTheme";

const LINKS = [
  { to: "/", label: "Beranda" },
  { to: "/donasi", label: "Donasi" },
  { to: "/kegiatan", label: "Kegiatan" },
  { to: "/laporan", label: "Laporan" },
  { to: "/kontak", label: "Kontak" },
];

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return `text-sm font-medium transition-colors ${
    isActive ? "text-(--primary)" : "text-(--text-muted) hover:text-(--text)"
  }`;
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label="Ganti tema terang/gelap"
      className="text-sm text-(--text-muted) hover:text-(--text) transition-colors"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

export function Navbar() {
  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{ background: "var(--surface)", borderColor: "var(--surface-border)" }}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-6">
        <NavLink to="/" className="flex items-center gap-2 shrink-0">
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "var(--primary)", color: "var(--on-primary)" }}
          >
            K
          </span>
          <span className="font-display font-bold text-(--text)">{CONTACT.orgName}</span>
        </NavLink>
        <nav className="hidden md:flex items-center gap-6">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClass} end={link.to === "/"}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <NavLink to="/donasi" className="btn-primary !py-1.5 !px-4 text-sm hidden sm:inline-block">
            Donasi Sekarang
          </NavLink>
        </div>
      </div>
      <nav className="md:hidden flex items-center gap-4 px-4 pb-3 overflow-x-auto">
        {LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} className={navLinkClass} end={link.to === "/"}>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

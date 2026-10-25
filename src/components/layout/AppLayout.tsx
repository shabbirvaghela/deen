import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/", label: "Home", icon: "⌂", end: true },
  { to: "/learn", label: "Learn", icon: "▤" },
  { to: "/duas", label: "Duas", icon: "♡" },
  { to: "/practice", label: "Practice", icon: "◷" },
  { to: "/history", label: "Saved", icon: "▣" },
];

export function AppLayout() {
  const today = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
    day: "numeric", month: "long", year: "numeric",
  }).format(new Date());

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="brand">Deen<span className="brand-dot">.</span></div>
          <div className="location">Kadi, Mehsana, Gujarat</div>
        </div>
        <div className="topbar-right">
          <span className="hijri-date">{today} AH</span>
          <NavLink className="settings-link" to="/settings" aria-label="Settings">⚙</NavLink>
        </div>
      </header>
      <main className="page-content"><Outlet /></main>
      <nav className="bottom-nav" aria-label="Main navigation">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-icon" aria-hidden="true">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

import { NavLink } from "react-router-dom";

// Fix #5: fixed navigation, always available, same place on every screen.
const items = [
  { to: "/capture", label: "✏️", name: "Capture" },
  { to: "/inbox", label: "📥", name: "Inbox" },
  { to: "/boards", label: "🗺", name: "Boards" },
];

export default function Nav() {
  return (
    <nav style={{
      position: "fixed", bottom: "max(16px, env(safe-area-inset-bottom))", left: "50%",
      transform: "translateX(-50%)", zIndex: 100,
      background: "var(--surface)", borderRadius: 999, boxShadow: "var(--shadow-float)",
      display: "flex", gap: 4, padding: 6,
    }}>
      {items.map(i => (
        <NavLink key={i.to} to={i.to} title={i.name}
          style={({ isActive }) => ({
            display: "flex", alignItems: "center", gap: 6, textDecoration: "none",
            padding: "10px 18px", borderRadius: 999,
            fontSize: "clamp(14px, 2.2vw, 16px)", fontFamily: "var(--font-ui)",
            color: isActive ? "#fff" : "var(--ink-muted)",
            background: isActive ? "var(--accent)" : "transparent",
          })}>
          <span aria-hidden="true">{i.label}</span>
          <span>{i.name}</span>
        </NavLink>
      ))}
    </nav>
  );
}

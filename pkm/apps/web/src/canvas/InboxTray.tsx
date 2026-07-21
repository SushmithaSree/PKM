import { useEffect, useState } from "react";
import { repository, type Entry } from "@pkm/core-data";
import { NAV_CLEARANCE } from "../components/Nav";

// M3 bridge: collapsible tray of unprocessed captures docked on the canvas.
// Drag an entry onto the canvas → Transient node with a backlink (handled in Board).
const ICON: Record<Entry["type"], string> = { text: "✏️", voice: "🎙", image: "🖼", link: "🔗" };

// Fixed px widths (not vw) so the top toolbar in Board.tsx can reliably
// reserve exactly this much space and never collide with the tray.
export const TRAY_COLLAPSED_W = 44;
export const TRAY_OPEN_W_COMPACT = 180; // narrow screens
export const TRAY_OPEN_W = 240; // normal screens

export default function InboxTray({ refreshKey, open, onToggle, compact }: {
  refreshKey: number; open: boolean; onToggle: () => void; compact: boolean;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => { repository.listInbox().then(setEntries); }, [refreshKey]);

  // Collapsed: just the icon, sized to itself — not a full-height column
  // stretched down to the nav clearance (that painted as a tall empty
  // white bar). Open: sized to its own content (header + however many
  // entries there are), capped so it can't run past the nav/canvas edge,
  // with the list scrolling internally once it hits that cap.
  if (!open) {
    return (
      <button onClick={onToggle} title="Open inbox" style={{
        position: "absolute", right: 16, top: 16, zIndex: 10,
        width: TRAY_COLLAPSED_W, height: TRAY_COLLAPSED_W,
        display: "grid", placeItems: "center",
        border: "none", cursor: "pointer", padding: 0,
        background: "var(--surface)", borderRadius: 999, boxShadow: "var(--shadow-float)",
        fontSize: 18,
      }}>📥</button>
    );
  }

  const openWidth = compact ? TRAY_OPEN_W_COMPACT : TRAY_OPEN_W;

  return (
    <div style={{
      position: "absolute", right: 16, top: 16, zIndex: 10,
      width: openWidth, maxHeight: `calc(100dvh - 32px - ${NAV_CLEARANCE})`,
      background: "var(--surface)", borderRadius: 16, boxShadow: "var(--shadow-float)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <button onClick={onToggle} style={{
        border: "none", background: "transparent", cursor: "pointer", padding: 12,
        display: "flex", alignItems: "center", gap: 8, color: "var(--ink)",
        fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, flexShrink: 0,
      }}>
        <span>📥</span>
        <span style={{ flex: 1, textAlign: "left" }}>Inbox ({entries.length})</span>
        <span style={{ color: "var(--ink-muted)" }}>›</span>
      </button>
      <div style={{ overflowY: "auto", minHeight: 0, padding: "0 8px 8px" }}>
        {entries.length === 0 && (
          <p style={{ color: "var(--ink-muted)", fontSize: 12, padding: 8 }}>
            Nothing to place. Captures appear here.
          </p>
        )}
        {entries.map(e => (
          <div key={e.id} draggable
            onDragStart={ev => ev.dataTransfer.setData("application/x-pkm-entry", e.id)}
            style={{
              display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", marginBottom: 6,
              background: "var(--bg-paper)", borderRadius: 8, cursor: "grab", fontSize: 13,
            }}>
            <span aria-hidden="true">{ICON[e.type]}</span>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {e.text || (e.type === "voice" ? "voice note" : e.type === "image" ? "image" : "(untitled)")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

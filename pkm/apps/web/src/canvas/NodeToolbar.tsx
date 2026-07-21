import { type NodeType } from "@pkm/core-data";
import { SHAPE_GLYPH as GLYPH } from "./shapeGeometry";

// Uses the live taxonomy passed from Board so remapped shapes/colors show here too.
export default function NodeToolbar({ current, types, x, y, onReclassify, onDelete, onFocus }: {
  current: NodeType;
  types: Record<NodeType, { shape: keyof typeof GLYPH; color: string; label: string }>;
  x: number; y: number;
  onReclassify: (t: NodeType) => void; onDelete: () => void; onFocus: () => void;
}) {
  const list = Object.keys(types) as NodeType[];
  return (
    <div style={{
      position: "absolute", left: x, top: y, transform: "translate(-50%, -100%)", marginTop: -12, zIndex: 20,
      background: "var(--surface)", borderRadius: 999, boxShadow: "var(--shadow-float)",
      display: "flex", alignItems: "center", gap: 2, padding: 4,
    }} className="nodrag nopan">
      {list.map(t => {
        const s = types[t]; if (!s) return null; const active = t === current;
        return (
          <button key={t} onClick={() => onReclassify(t)} title={s.label} style={{
            width: 30, height: 30, borderRadius: 999, border: "none", cursor: "pointer",
            background: active ? "var(--bg-paper)" : "transparent", color: s.color, fontSize: 17,
            display: "grid", placeItems: "center", outline: active ? `2px solid ${s.color}` : "none",
          }}>{GLYPH[s.shape]}</button>
        );
      })}
      <div style={{ width: 1, height: 20, background: "var(--canvas-dot)", margin: "0 2px" }} />
      <button onClick={onFocus} title="Focus mode" style={{
        width: 30, height: 30, borderRadius: 999, border: "none", cursor: "pointer",
        background: "transparent", color: "var(--ink-muted)", fontSize: 15, display: "grid", placeItems: "center",
      }}>◎</button>
      <button onClick={onDelete} title="Delete" style={{
        width: 30, height: 30, borderRadius: 999, border: "none", cursor: "pointer",
        background: "transparent", color: "var(--ink-muted)", fontSize: 15, display: "grid", placeItems: "center",
      }}>🗑</button>
    </div>
  );
}

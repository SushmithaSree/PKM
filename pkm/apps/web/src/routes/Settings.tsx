import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { repository, DEFAULT_TAXONOMY, type TaxonomyConfig, type NodeType, type ShapeId, type TypeStyle } from "@pkm/core-data";
import { SHAPES, SHAPE_GLYPH as GLYPH } from "../canvas/shapeGeometry";

// Taxonomy settings: remap each type's shape/color and rename it.

const PALETTE = ["#5B7DB1", "#D9A441", "#6E6A63", "#8B6BAE", "#A39D92", "#0F6E56", "#C4553B", "#7F77DD"];

function TypeRow({ type, t, isDefault, onUpdate, onRemove }: {
  type: NodeType; t: TypeStyle; isDefault: boolean;
  onUpdate: (patch: Partial<TypeStyle>) => void; onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const filled = t.filled ?? false;

  return (
    <div style={{
      background: "var(--surface)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-float)",
      padding: 14, marginBottom: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 24, color: t.color, width: 28, textAlign: "center" }}>{GLYPH[t.shape]}</span>
        <input value={t.label} onChange={e => onUpdate({ label: e.target.value })}
          style={{ flex: 1, minWidth: 100, border: "1px solid var(--canvas-dot)", borderRadius: 8,
            padding: "6px 10px", fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink)", outline: "none" }} />
        <select value={t.shape} onChange={e => onUpdate({ shape: e.target.value as ShapeId })}
          style={{ border: "1px solid var(--canvas-dot)", borderRadius: 8, padding: "6px 8px", fontSize: 14 }}>
          {SHAPES.map(s => <option key={s} value={s}>{GLYPH[s]} {s}</option>)}
        </select>
        <input type="color" value={t.color} onChange={e => onUpdate({ color: e.target.value })}
          title="Quick color (used as the palette/picker swatch)"
          style={{ width: 36, height: 32, border: "none", background: "none", cursor: "pointer" }} />
        <button onClick={() => setExpanded(x => !x)} title="More style options" style={{
          border: "1px solid var(--canvas-dot)", background: expanded ? "var(--bg-paper)" : "none", borderRadius: 8,
          padding: "6px 10px", cursor: "pointer", color: "var(--ink-muted)", fontSize: 13, fontFamily: "var(--font-ui)",
        }}>Style {expanded ? "▴" : "▾"}</button>
        {!isDefault && (
          <button onClick={onRemove} title="Remove type" style={{
            border: "none", background: "none", cursor: "pointer", color: "var(--ink-muted)", fontSize: 15,
          }}>🗑</button>
        )}
      </div>

      {expanded && (
        <div style={{
          marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--bg-paper)",
          display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center",
        }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "var(--font-ui)", color: "var(--ink)" }}>
            <input type="checkbox" checked={filled} onChange={e => onUpdate({ filled: e.target.checked })} />
            Filled
          </label>

          {filled && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "var(--font-ui)", color: "var(--ink)" }}>
              Fill
              <input type="color" value={t.fillColor ?? t.color} onChange={e => onUpdate({ fillColor: e.target.value })}
                style={{ width: 32, height: 28, border: "none", background: "none", cursor: "pointer" }} />
            </label>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "var(--font-ui)", color: "var(--ink)" }}>
            Outline
            <input type="color" value={t.strokeColor ?? t.color} onChange={e => onUpdate({ strokeColor: e.target.value })}
              style={{ width: 32, height: 28, border: "none", background: "none", cursor: "pointer" }} />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "var(--font-ui)", color: "var(--ink)" }}>
            Style
            <select value={t.dashed ? "dashed" : "solid"} onChange={e => onUpdate({ dashed: e.target.value === "dashed" })}
              style={{ border: "1px solid var(--canvas-dot)", borderRadius: 8, padding: "4px 8px", fontSize: 13 }}>
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
            </select>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontFamily: "var(--font-ui)", color: "var(--ink)" }}>
            Thickness
            <input type="range" min={0} max={6} step={0.5} value={t.strokeWidth ?? 2.5}
              onChange={e => onUpdate({ strokeWidth: Number(e.target.value) })}
              style={{ width: 100 }} />
            <span style={{ color: "var(--ink-muted)", minWidth: 24 }}>{(t.strokeWidth ?? 2.5)}px</span>
          </label>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const [params] = useSearchParams();
  const boardId = params.get("board");
  const [tax, setTax] = useState<TaxonomyConfig>(DEFAULT_TAXONOMY);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newShape, setNewShape] = useState<ShapeId>("rectangle");
  const [newColor, setNewColor] = useState(PALETTE[0]!);

  useEffect(() => { repository.getTaxonomy().then(setTax); }, []);

  function update(type: NodeType, patch: Partial<TaxonomyConfig["types"][string]>) {
    const current = tax.types[type];
    if (!current) return;
    const next: TaxonomyConfig = { ...tax, types: { ...tax.types, [type]: { ...current, ...patch } } };
    setTax(next);
    repository.saveTaxonomy(next);
  }
  function reset() { setTax(DEFAULT_TAXONOMY); repository.saveTaxonomy(DEFAULT_TAXONOMY); }

  // New node type (task 2.6, general case): user-defined types beyond the
  // 5 defaults, choosing from the existing shape registry.
  function addType() {
    const label = newLabel.trim();
    if (!label) return;
    let id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (!id) id = `type-${Date.now()}`;
    while (tax.types[id]) id = `${id}-2`;
    const next: TaxonomyConfig = { ...tax, types: { ...tax.types, [id]: { shape: newShape, color: newColor, label } } };
    setTax(next);
    repository.saveTaxonomy(next);
    setNewLabel(""); setNewShape("rectangle"); setNewColor(PALETTE[0]!); setAdding(false);
  }

  function removeType(id: string) {
    if (Object.keys(tax.types).length <= 1) return; // always keep at least one
    if (!confirm(`Remove "${tax.types[id]!.label}"? Existing nodes of this type will keep showing until reassigned.`)) return;
    const { [id]: _drop, ...rest } = tax.types;
    const next: TaxonomyConfig = { ...tax, types: rest };
    setTax(next);
    repository.saveTaxonomy(next);
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 120px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 16, gap: 12 }}>
        {boardId && (
          <Link to={`/board/${boardId}`} style={{ color: "var(--ink-muted)", fontSize: 13, textDecoration: "none" }}>
            ← Back to board
          </Link>
        )}
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Node types</h1>
        <button onClick={reset} style={{ marginLeft: "auto", border: "none", background: "none",
          color: "var(--ink-muted)", cursor: "pointer", fontSize: 13 }}>Reset to defaults</button>
      </div>
      <p style={{ color: "var(--ink-muted)", fontSize: 13, marginBottom: 16 }}>
        Your taxonomy is the default vocabulary, not a cage — rename types or reassign shapes.
        Existing nodes update instantly (shape is resolved at render, never rewritten).
      </p>
      {Object.keys(tax.types).map(type => (
        <TypeRow key={type} type={type} t={tax.types[type]!} isDefault={type in DEFAULT_TAXONOMY.types}
          onUpdate={patch => update(type, patch)} onRemove={() => removeType(type)} />
      ))}

      {adding ? (
        <div style={{
          background: "var(--surface)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-float)",
          padding: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 24, color: newColor, width: 28, textAlign: "center" }}>{GLYPH[newShape]}</span>
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="New type name (e.g. Question)"
            autoFocus onKeyDown={e => { if (e.key === "Enter") addType(); }}
            style={{ flex: 1, minWidth: 140, border: "1px solid var(--canvas-dot)", borderRadius: 8,
              padding: "6px 10px", fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink)", outline: "none" }} />
          <select value={newShape} onChange={e => setNewShape(e.target.value as ShapeId)}
            style={{ border: "1px solid var(--canvas-dot)", borderRadius: 8, padding: "6px 8px", fontSize: 14 }}>
            {SHAPES.map(s => <option key={s} value={s}>{GLYPH[s]} {s}</option>)}
          </select>
          <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
            style={{ width: 36, height: 32, border: "none", background: "none", cursor: "pointer" }} />
          <button onClick={addType} style={{
            border: "none", borderRadius: 999, padding: "8px 16px", cursor: "pointer",
            background: "var(--accent)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: 13,
          }}>Add</button>
          <button onClick={() => setAdding(false)} style={{
            border: "none", background: "none", cursor: "pointer", color: "var(--ink-muted)", fontSize: 13,
          }}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{
          width: "100%", padding: "12px", borderRadius: "var(--radius)", border: "2px dashed var(--canvas-dot)",
          background: "none", cursor: "pointer", color: "var(--ink-muted)", fontSize: 14, fontFamily: "var(--font-ui)",
        }}>+ Add node type</button>
      )}
    </div>
  );
}

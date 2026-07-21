import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { repository, DEFAULT_TAXONOMY, type TaxonomyConfig, type NodeType, type ShapeId } from "@pkm/core-data";
import { SHAPES, SHAPE_GLYPH as GLYPH } from "../canvas/shapeGeometry";

// Taxonomy settings: remap each type's shape/color and rename it.

const PALETTE = ["#5B7DB1", "#D9A441", "#6E6A63", "#8B6BAE", "#A39D92", "#0F6E56", "#C4553B", "#7F77DD"];

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
      {Object.keys(tax.types).map(type => {
        const t = tax.types[type]!;
        const isDefault = type in DEFAULT_TAXONOMY.types;
        return (
          <div key={type} style={{
            background: "var(--surface)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-float)",
            padding: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          }}>
            <span style={{ fontSize: 24, color: t.color, width: 28, textAlign: "center" }}>{GLYPH[t.shape]}</span>
            <input value={t.label} onChange={e => update(type, { label: e.target.value })}
              style={{ flex: 1, minWidth: 100, border: "1px solid var(--canvas-dot)", borderRadius: 8,
                padding: "6px 10px", fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink)", outline: "none" }} />
            <select value={t.shape} onChange={e => update(type, { shape: e.target.value as ShapeId })}
              style={{ border: "1px solid var(--canvas-dot)", borderRadius: 8, padding: "6px 8px", fontSize: 14 }}>
              {SHAPES.map(s => <option key={s} value={s}>{GLYPH[s]} {s}</option>)}
            </select>
            <input type="color" value={t.color} onChange={e => update(type, { color: e.target.value })}
              style={{ width: 36, height: 32, border: "none", background: "none", cursor: "pointer" }} />
            {!isDefault && (
              <button onClick={() => removeType(type)} title="Remove type" style={{
                border: "none", background: "none", cursor: "pointer", color: "var(--ink-muted)", fontSize: 15,
              }}>🗑</button>
            )}
          </div>
        );
      })}

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

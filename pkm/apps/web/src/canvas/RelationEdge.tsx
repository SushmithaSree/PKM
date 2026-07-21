import { useState } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps, MarkerType } from "@xyflow/react";
import { STARTER_RELATIONS, edgeVisual } from "./relations";

// Custom edge: shows a relation label; click to open a small relation picker.
// A freshly-created edge (data.fresh) shows a 3s ghost chip prompting a label.
export type RelationEdgeData = {
  relation?: string;
  onSetRelation: (edgeId: string, relation?: string) => void;
  onDelete: (edgeId: string) => void;
  customRelations: string[];
};

export default function RelationEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected } = props;
  const data = props.data as RelationEdgeData;
  const [picking, setPicking] = useState(false);
  const [custom, setCustom] = useState("");

  const [path, labelX, labelY] = getBezierPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  });
  const vis = edgeVisual(data?.relation);

  const options = [...STARTER_RELATIONS, ...(data?.customRelations ?? [])];

  function choose(r?: string) {
    data.onSetRelation(id, r);
    setPicking(false);
    setCustom("");
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={vis.arrow ? `url(#arrow-${id})` : undefined}
        style={{ stroke: vis.stroke, strokeWidth: selected ? 2.5 : 1.8,
          strokeDasharray: vis.dashed ? "6 4" : undefined }}
      />
      {vis.arrow && (
        <defs>
          <marker id={`arrow-${id}`} markerWidth="12" markerHeight="12" refX="9" refY="5"
            orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L10,5 L0,10 z" fill={vis.stroke} />
          </marker>
        </defs>
      )}
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan"
          style={{
            position: "absolute", transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all", zIndex: 5, display: "flex", alignItems: "center", gap: 4,
          }}
        >
          {selected && !picking && (
            <button onClick={() => data.onDelete(id)} title="Delete connection" style={{
              width: 18, height: 18, borderRadius: 999, border: "none", cursor: "pointer",
              background: "var(--accent)", color: "#fff", fontSize: 11, lineHeight: 1, padding: 0,
              display: "grid", placeItems: "center",
            }}>✕</button>
          )}
          {picking ? (
            <div style={{
              background: "var(--surface)", borderRadius: 10, boxShadow: "var(--shadow-float)",
              padding: 8, display: "flex", flexWrap: "wrap", gap: 4, width: 220, position: "relative",
            }}>
              <button onClick={() => setPicking(false)} title="Close without labeling" style={{
                position: "absolute", top: 4, right: 4, width: 16, height: 16, borderRadius: 999,
                border: "none", background: "none", cursor: "pointer", color: "var(--ink-muted)",
                fontSize: 11, lineHeight: 1, padding: 0, display: "grid", placeItems: "center",
              }}>✕</button>
              {options.map(r => (
                <button key={r} onClick={() => choose(r)} style={chip(r === data?.relation)}>{r}</button>
              ))}
              <div style={{ display: "flex", gap: 4, width: "100%", marginTop: 4 }}>
                <input value={custom} onChange={e => setCustom(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && custom.trim()) choose(custom.trim()); if (e.key === "Escape") setPicking(false); }}
                  placeholder="custom…" style={{
                    flex: 1, border: "1px solid var(--canvas-dot)", borderRadius: 6, padding: "4px 8px",
                    fontSize: 12, fontFamily: "var(--font-ui)", outline: "none" }} />
                {data?.relation && <button onClick={() => choose(undefined)} title="Remove label"
                  style={{ ...chip(false), color: "var(--ink-muted)" }}>clear</button>}
              </div>
            </div>
          ) : data?.relation ? (
            <button onClick={() => setPicking(true)} style={{
              background: "var(--surface)", border: `1px solid ${vis.stroke}`, borderRadius: 999,
              padding: "2px 10px", fontSize: 11, fontFamily: "var(--font-ui)",
              color: data.relation === "contradicts" ? "var(--edge-contradicts)" : "var(--ink)",
              cursor: "pointer", whiteSpace: "nowrap",
            }}>{data.relation}</button>
          ) : (
            <button onClick={() => setPicking(true)} title="Label this connection" style={{
              width: 18, height: 18, borderRadius: 999, border: "1px dashed var(--ink-muted)",
              background: "var(--surface)", color: "var(--ink-muted)", cursor: "pointer",
              fontSize: 12, lineHeight: 1, opacity: selected ? 1 : 0.55, padding: 0,
            }}>+</button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

function chip(active: boolean): React.CSSProperties {
  return {
    border: "1px solid var(--canvas-dot)", borderRadius: 999, padding: "3px 9px",
    fontSize: 12, fontFamily: "var(--font-ui)", cursor: "pointer",
    background: active ? "var(--accent)" : "var(--bg-paper)",
    color: active ? "#fff" : "var(--ink)",
  };
}

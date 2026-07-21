import { memo, useEffect, useRef, useState } from "react";
import { Handle, Position, NodeResizer, type NodeProps, type Node } from "@xyflow/react";
import { type NodeType, type TypeStyle } from "@pkm/core-data";
import { clipPolygon, svgPoints, handleAnchors, fitFont, TEXT_BOX, MIN_NODE, useFontsReady } from "./shapeGeometry";

// Base custom node (Miro/Freeform model):
//   * fixed size (default per shape; user resizes via drag handles)
//   * text sits in a box CENTERED on the shape's usable middle
//   * font auto-shrinks (15→9px) to fit that box; shape never moves while typing

export type ShapeNodeData = {
  nodeType: NodeType; text: string; w: number; h: number;
  style: TypeStyle; // resolved from taxonomy config
  sourceEntryId?: string;
  createdAt?: number;
  stale?: boolean; // transient older than decay window → review nudge
  onTextChange: (id: string, text: string) => void;
  onResize: (id: string, w: number, h: number, final: boolean) => void;
  onBacklink?: (id: string) => void;
};
export type ShapeNodeType = Node<ShapeNodeData, "shape">;

function ShapeNodeImpl({ id, data, selected }: NodeProps<ShapeNodeType>) {
  const style = data.style;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.text);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (editing) { setDraft(data.text); taRef.current?.focus(); } }, [editing]); // eslint-disable-line

  const filled = style.filled ?? false;
  const fillColor = style.fillColor ?? style.color;
  const strokeColor = style.strokeColor ?? style.color;
  const strokeWidth = style.strokeWidth ?? 2.5;
  const shape = style.shape;
  const { w, h } = data;
  const anchors = handleAnchors(shape);
  const box = TEXT_BOX[shape];

  const rootRef = useRef<HTMLDivElement>(null);

  // Font tracks data.w/h directly. NodeResizer's onResize callback fires
  // synchronously on every drag step, so w/h are already current — no need
  // to round-trip through a ResizeObserver (which can only report a size
  // change one paint AFTER w/h already changed, i.e. strictly laggier).
  // useFontsReady() forces a re-measure once Inter finishes loading, so the
  // fit doesn't depend on whatever fallback font a given browser/OS picks
  // before then (that's what made the fit look browser-dependent).
  useFontsReady();
  const boxWpx = box.w * w;
  const boxHpx = box.h * h;
  const { font } = fitFont(editing ? draft : data.text, boxWpx, boxHpx);

  const textStyle: React.CSSProperties = {
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: font, lineHeight: 1.35,
    color: filled ? "#fff" : "var(--ink)",
    fontWeight: data.nodeType === "anchor" ? 600 : 400,
  };

  // Box positioned by its CENTER (box.cx, box.cy) — this is the fix.
  const boxStyle: React.CSSProperties = {
    position: "absolute",
    left: `${box.cx * 100}%`, top: `${box.cy * 100}%`,
    width: `${box.w * 100}%`, height: `${box.h * 100}%`,
    transform: "translate(-50%, -50%)",
    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
  };

  return (
    <div ref={rootRef} style={{ width: w, height: h, position: "relative" }}
         onDoubleClick={e => { e.stopPropagation(); setEditing(true); }}>

      <NodeResizer
        isVisible={selected}
        minWidth={MIN_NODE.w}
        minHeight={MIN_NODE.h}
        lineStyle={{ borderColor: "var(--accent)", opacity: 0.5 }}
        handleStyle={{ width: 9, height: 9, borderRadius: 3, background: "var(--accent)", border: "1px solid #fff" }}
        onResize={(_, p) => data.onResize(id, p.width, p.height, false)}
        onResizeEnd={(_, p) => data.onResize(id, p.width, p.height, true)}
      />

      <div style={{
        position: "absolute", inset: 0,
        clipPath: clipPolygon(shape),
        background: filled ? fillColor : "var(--surface)",
      }} />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"
           style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}>
        {shape === "circle"
          ? <ellipse cx="50" cy="50" rx="49" ry="49" fill="none" stroke={strokeColor}
              strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke"
              strokeDasharray={style.dashed ? "6 4" : undefined} />
          : <polygon points={svgPoints(shape)} fill="none" stroke={strokeColor}
              strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" strokeLinejoin="round"
              strokeDasharray={style.dashed ? "6 4" : undefined} />}
      </svg>

      {selected && <div style={{
        position: "absolute", inset: -6, border: "2px solid var(--accent)",
        borderRadius: 12, opacity: 0.35, pointerEvents: "none",
      }} />}

      <div style={boxStyle}>
        {editing ? (
          <textarea
            ref={taRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => { setEditing(false); data.onTextChange(id, draft.trim()); }}
            className="nodrag nowheel"
            style={{
              width: "100%", height: "100%", border: "none", outline: "none", resize: "none",
              background: "transparent", textAlign: "center", overflow: "hidden",
              padding: 0, margin: 0, ...textStyle,
            }}
          />
        ) : (
          <span style={{ textAlign: "center", overflowWrap: "anywhere", ...textStyle }}>
            {data.text || <em style={{ opacity: 0.5 }}>…</em>}
          </span>
        )}
      </div>

      {data.sourceEntryId && (
        <button
          className="nodrag nopan"
          onClick={e => { e.stopPropagation(); data.onBacklink?.(id); }}
          title="View source capture"
          style={{
            position: "absolute", top: -8, right: -8, zIndex: 4,
            width: 22, height: 22, borderRadius: 999, border: "1px solid var(--canvas-dot)",
            background: "var(--surface)", cursor: "pointer", fontSize: 11, lineHeight: 1,
            display: "grid", placeItems: "center", boxShadow: "var(--shadow-float)",
          }}>📎</button>
      )}
      {data.stale && (
        <span title="Transient — review me" style={{
          position: "absolute", top: -6, left: -6, zIndex: 4,
          width: 12, height: 12, borderRadius: 999, background: "#E0A11B",
          border: "2px solid var(--surface)",
        }} />
      )}

      {(["t", "r", "b", "l"] as const).map(k => {
        const [ax, ay] = anchors[k];
        const pos = { t: Position.Top, r: Position.Right, b: Position.Bottom, l: Position.Left }[k];
        return (
          <Handle key={k} type="source" position={pos} id={k} style={{
            left: `${ax * 100}%`, top: `${ay * 100}%`,
            right: "auto", bottom: "auto", transform: "translate(-50%, -50%)",
            width: 10, height: 10, background: "var(--ink-muted)", opacity: 0.7,
          }} />
        );
      })}
    </div>
  );
}

export const ShapeNode = memo(ShapeNodeImpl);

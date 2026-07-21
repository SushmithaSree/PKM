import { useSyncExternalStore } from "react";
import type { ShapeId } from "@pkm/core-data";

// Text-fit measurement below depends on the actual Inter font being loaded
// (not a per-browser system-font fallback, whose glyph widths differ across
// Chrome/Edge/etc. and made "bigger shape -> smaller font" look browser-
// dependent). This hook forces one re-render once the font finishes loading
// so any measurement taken before that point gets corrected.
let fontsReady = typeof document === "undefined" || !document.fonts ? true : false;
const fontsReadyListeners = new Set<() => void>();
if (typeof document !== "undefined" && document.fonts && !fontsReady) {
  document.fonts.ready.then(() => {
    fontsReady = true;
    fontsReadyListeners.forEach(l => l());
  });
}
export function useFontsReady(): boolean {
  return useSyncExternalStore(
    cb => { fontsReadyListeners.add(cb); return () => fontsReadyListeners.delete(cb); },
    () => fontsReady,
    () => true,
  );
}

// ============================================================================
// GLOBAL SHAPE GEOMETRY
// One normalized definition per shape (unit square, [0..1]) drives EVERYTHING:
//   - outline rendering + clip path
//   - handle positions (exact intersections of outline with center axes)
//   - text fitting (largest inscribed rectangle + real text measurement)
// Adding a shape = adding one entry here. No per-shape hacks anywhere else.
// ============================================================================

export type Pt = [number, number];
export interface TextRect { x: number; y: number; w: number; h: number }

function regularPolygon(n: number, cx = 0.5, cy = 0.5, r = 0.49): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as Pt;
  });
}

function starPolygon(points: number, cx = 0.5, cy = 0.5, rOuter = 0.49, rInner = 0.19): Pt[] {
  return Array.from({ length: points * 2 }, (_, i) => {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? rOuter : rInner;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as Pt;
  });
}

export const OUTLINE: Record<ShapeId, Pt[]> = {
  rectangle: [[0.005, 0.01], [0.995, 0.01], [0.995, 0.99], [0.005, 0.99]],
  circle: regularPolygon(48),
  diamond: [[0.5, 0.01], [0.99, 0.5], [0.5, 0.99], [0.01, 0.5]],
  triangle: [[0.5, 0.03], [0.98, 0.97], [0.02, 0.97]],
  hexagon: [[0.25, 0.01], [0.75, 0.01], [0.99, 0.5], [0.75, 0.99], [0.25, 0.99], [0.01, 0.5]],
  pentagon: regularPolygon(5),
  star: starPolygon(5),
  parallelogram: [[0.18, 0.01], [0.995, 0.01], [0.82, 0.99], [0.005, 0.99]],
};

// Shape id → icon glyph, single source of truth (palette, taxonomy editor,
// node toolbar all import this instead of keeping their own copies).
export const SHAPE_GLYPH: Record<ShapeId, string> = {
  circle: "○", diamond: "◇", rectangle: "▭", triangle: "△", hexagon: "⬡",
  pentagon: "⬠", star: "★", parallelogram: "▱",
};
export const SHAPES: ShapeId[] = Object.keys(SHAPE_GLYPH) as ShapeId[];

// Text box (normalized): a rectangle CENTERED on the shape's usable middle.
// cx/cy = box center; w/h = box size. Centering the box on the shape's visual
// center is what keeps text from floating to the top (the triangle bug).
export interface TextBox { cx: number; cy: number; w: number; h: number }
export const TEXT_BOX: Record<ShapeId, TextBox> = {
  rectangle: { cx: 0.5, cy: 0.5,  w: 0.90, h: 0.84 },
  circle:    { cx: 0.5, cy: 0.5,  w: 0.67, h: 0.67 },
  diamond:   { cx: 0.5, cy: 0.5,  w: 0.50, h: 0.50 },
  // Triangle: usable area is a rect sitting in the lower-middle. Its CENTER is
  // ~62% down (between centroid 0.66 and giving room for 1-2 lines upward).
  triangle:  { cx: 0.5, cy: 0.66, w: 0.50, h: 0.46 },
  hexagon:   { cx: 0.5, cy: 0.5,  w: 0.70, h: 0.74 },
  // Pentagon has a single point up like triangle — usable middle sits lower.
  pentagon:  { cx: 0.5, cy: 0.58, w: 0.58, h: 0.50 },
  // Star's inner notches leave a small safe inscribed box at the center.
  star:      { cx: 0.5, cy: 0.53, w: 0.32, h: 0.30 },
  parallelogram: { cx: 0.5, cy: 0.5, w: 0.68, h: 0.82 },
};

// Preferred height/width ratio per shape (rectangle is content-driven).
export const ASPECT: Record<ShapeId, number> = {
  rectangle: 0, circle: 1, diamond: 0.72, triangle: 0.72, hexagon: 0.62,
  pentagon: 0.86, star: 1, parallelogram: 0.45,
};

export function clipPolygon(shape: ShapeId): string {
  if (shape === "circle") return "ellipse(50% 50% at 50% 50%)";
  return `polygon(${OUTLINE[shape].map(([x, y]) => `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`).join(", ")})`;
}

export function svgPoints(shape: ShapeId): string {
  return OUTLINE[shape].map(([x, y]) => `${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`).join(" ");
}

// ---------------------------------------------------------------------------
// Handle anchors: exact intersection of the outline with the vertical and
// horizontal center axes. Works for ANY polygon — never hand-placed again.
// ---------------------------------------------------------------------------
function axisIntersections(points: Pt[], axis: "v" | "h"): number[] {
  const hits: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i]!;
    const [x2, y2] = points[(i + 1) % points.length]!;
    if (axis === "v") {
      if ((x1 - 0.5) * (x2 - 0.5) <= 0 && x1 !== x2) {
        hits.push(y1 + ((0.5 - x1) / (x2 - x1)) * (y2 - y1));
      }
    } else {
      if ((y1 - 0.5) * (y2 - 0.5) <= 0 && y1 !== y2) {
        hits.push(x1 + ((0.5 - y1) / (y2 - y1)) * (x2 - x1));
      }
    }
  }
  return hits;
}

export function handleAnchors(shape: ShapeId): { t: Pt; r: Pt; b: Pt; l: Pt } {
  const pts = OUTLINE[shape];
  const v = axisIntersections(pts, "v");
  const h = axisIntersections(pts, "h");
  return {
    t: [0.5, Math.min(...v)],
    b: [0.5, Math.max(...v)],
    l: [Math.min(...h), 0.5],
    r: [Math.max(...h), 0.5],
  };
}

// ---------------------------------------------------------------------------
// Text fitting — the Miro/Freeform model:
//   * Shapes have FIXED sizes (defaults below; user resizes via drag handles).
//   * Text wraps inside the inscribed rect and the FONT auto-shrinks to fit
//     (15px down to a 9px floor). The shape never moves while you type.
// ---------------------------------------------------------------------------
export const DEFAULT_SIZE: Record<ShapeId, { w: number; h: number }> = {
  rectangle: { w: 180, h: 80 },
  circle: { w: 150, h: 150 },
  diamond: { w: 190, h: 140 },
  triangle: { w: 200, h: 150 },
  hexagon: { w: 190, h: 118 },
  pentagon: { w: 180, h: 155 },
  star: { w: 170, h: 170 },
  parallelogram: { w: 190, h: 85 },
};
export const MIN_NODE = { w: 90, h: 64 };
export const MAX_FONT = 15;
export const MIN_FONT = 9;

let ctx: CanvasRenderingContext2D | null = null;
function measurer(fontPx: number): CanvasRenderingContext2D {
  if (!ctx) ctx = document.createElement("canvas").getContext("2d")!;
  ctx.font = `${fontPx}px Inter, system-ui, sans-serif`;
  return ctx;
}

function wrappedBlockHeight(text: string, maxW: number, fontPx: number): number {
  const m = measurer(fontPx);
  const lineH = fontPx * 1.4;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return lineH;
  let lines = 1, lineW = 0;
  const space = m.measureText(" ").width;
  for (const word of words) {
    const wW = m.measureText(word).width;
    if (wW > maxW) {
      const perChar = wW / word.length;
      const charsPerLine = Math.max(1, Math.floor(maxW / perChar));
      const extra = Math.ceil(word.length / charsPerLine);
      if (lineW > 0) lines++;
      lines += extra - 1;
      lineW = (word.length % charsPerLine || charsPerLine) * perChar;
      continue;
    }
    const needed = lineW === 0 ? wW : lineW + space + wW;
    if (needed <= maxW) lineW = needed;
    else { lines++; lineW = wW; }
  }
  return lines * lineH;
}

// Largest font (MAX_FONT..MIN_FONT) whose wrapped block fits the given
// pixel rect. Returns the floor font with fits=false when even 9px overflows.
export function fitFont(text: string, rectW: number, rectH: number): { font: number; fits: boolean } {
  const t = text.trim();
  if (!t) return { font: MAX_FONT, fits: true };
  for (let f = MAX_FONT; f >= MIN_FONT; f--) {
    if (wrappedBlockHeight(t, rectW, f) <= rectH) return { font: f, fits: true };
  }
  return { font: MIN_FONT, fits: false };
}

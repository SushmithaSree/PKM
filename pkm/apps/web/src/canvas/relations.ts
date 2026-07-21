// Relation vocabulary (spec §2.4a). Directional ones auto-apply an arrow;
// contradicts renders as a red dashed line (tension should be visible).
export const STARTER_RELATIONS = [
  "causes", "leads to", "example of", "supports", "contradicts", "part of",
] as const;

export const DIRECTIONAL = new Set(["causes", "leads to", "example of", "part of"]);

export function relationLabel(r?: string): string {
  return r ?? "";
}

export function edgeVisual(relation?: string): {
  stroke: string; dashed: boolean; arrow: boolean;
} {
  if (relation === "contradicts") return { stroke: "var(--edge-contradicts)", dashed: true, arrow: false };
  return { stroke: "var(--ink-muted)", dashed: false, arrow: !!relation && DIRECTIONAL.has(relation) };
}

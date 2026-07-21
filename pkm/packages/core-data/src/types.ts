export type EntryType = "text" | "voice" | "image" | "link";
export type EntryStatus = "unprocessed" | "placed" | "archived";
export type ModuleId = "pkm"; // future: "journal" | "mood" | ...

export interface Attachment {
  assetId: string;
  kind: "voice" | "image";
  durationSec?: number;
}

// A note is text + any number of attachments (voice, images) — one entry.
export interface Entry {
  id: string; // ULID
  module: ModuleId;
  type: EntryType; // primary flavor: "text" if text present, else first attachment kind
  createdAt: number;
  modifiedAt: number;
  status: EntryStatus;
  text?: string;
  attachments?: Attachment[];
  assetId?: string; // legacy single-asset ref (pre-attachments)
  tags: string[];
}

export interface Asset {
  id: string;
  mime: string;
  blob: Blob;
  createdAt: number;
}

export type BackgroundStyle = "blank" | "dotted" | "grid";

export interface Board {
  id: string;
  name: string;
  createdAt: number;
  modifiedAt: number;
  background: BackgroundStyle; // default "dotted"
  viewport: { x: number; y: number; zoom: number };
  thumbnail?: string; // dataURL snapshot
}

// Semantic node types. Shape/color resolved via TaxonomyConfig at render —
// remapping shapes never rewrites node data.
// Base vocabulary; users can define custom types in Settings.
export type NodeType = "anchor" | "insight" | "fact" | "inquiry" | "transient" | (string & {});
export type ShapeId = "circle" | "diamond" | "rectangle" | "triangle" | "hexagon" | "pentagon" | "star" | "parallelogram";

export interface BoardNode {
  id: string;
  boardId: string;
  nodeType: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  colorOverride?: string;
  sourceEntryId?: string; // backlink to capture (bridge)
  createdAt: number;
  modifiedAt: number;
}

export type RelationType =
  | "causes" | "leads_to" | "example_of"
  | "supports" | "contradicts" | "part_of"
  | (string & {}); // user-defined customs

export interface BoardEdge {
  id: string;
  boardId: string;
  from: string;
  to: string;
  sourceHandle?: string; // which of the node's handles this edge leaves from
  targetHandle?: string; // which handle it arrives at — required for React Flow to resolve the edge on reload, since node handles are not typed source/target
  relation?: RelationType; // undefined = plain edge
  styleOverride?: { dashed?: boolean; arrow?: boolean };
  createdAt: number;
}

export const DIRECTIONAL_RELATIONS: ReadonlySet<string> = new Set([
  "causes", "leads_to", "example_of", "part_of",
]);

export interface TypeStyle { shape: ShapeId; color: string; label: string; filled?: boolean; dashed?: boolean }

export interface TaxonomyConfig {
  id: "default";
  types: Record<string, TypeStyle>;
  customRelations: string[];
}

export const DEFAULT_TAXONOMY: TaxonomyConfig = {
  id: "default",
  types: {
    anchor:    { shape: "circle",    color: "#5B7DB1", label: "Anchor", filled: true },
    insight:   { shape: "diamond",   color: "#D9A441", label: "Insight" },
    fact:      { shape: "rectangle", color: "#6E6A63", label: "Fact" },
    inquiry:   { shape: "triangle",  color: "#8B6BAE", label: "Inquiry" },
    transient: { shape: "hexagon",   color: "#A39D92", label: "Transient", dashed: true },
  },
  customRelations: [],
};

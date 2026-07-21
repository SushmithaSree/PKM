import Dexie, { type Table } from "dexie";
import type { Entry, Asset, Board, BoardNode, BoardEdge, TaxonomyConfig } from "./types";

export class PkmDb extends Dexie {
  entries!: Table<Entry, string>;
  assets!: Table<Asset, string>;
  boards!: Table<Board, string>;
  nodes!: Table<BoardNode, string>;
  edges!: Table<BoardEdge, string>;
  taxonomy!: Table<TaxonomyConfig, string>;

  constructor() {
    super("pkm");
    this.version(1).stores({
      entries: "id, status, createdAt, *tags",
      assets: "id",
      boards: "id, modifiedAt",
      nodes: "id, boardId, sourceEntryId",
      edges: "id, boardId",
      taxonomy: "id",
    });
  }
}

export const db = new PkmDb();

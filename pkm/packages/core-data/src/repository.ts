import { ulid } from "ulid";
import { db } from "./db";
import {
  type Entry, type EntryType, type Attachment, type Board, type BoardNode, type BoardEdge,
  type TaxonomyConfig, DEFAULT_TAXONOMY,
} from "./types";

// Single access layer. UI never touches Dexie directly.
// This interface is the future sync seam: swap DexieRepository for a synced
// implementation without touching any module.
export interface Repository {
  createEntry(partial: { type: EntryType; text?: string; attachments?: Attachment[]; tags?: string[] }): Promise<Entry>;
  updateEntry(id: string, patch: Partial<Entry>): Promise<void>;
  listInbox(): Promise<Entry[]>;
  searchEntries(q: string): Promise<Entry[]>;
  getEntry(id: string): Promise<Entry | undefined>;
  saveAsset(mime: string, blob: Blob): Promise<string>;
  getAsset(id: string): Promise<Blob | undefined>;

  createBoard(name: string): Promise<Board>;
  listBoards(): Promise<Board[]>;
  getBoard(id: string): Promise<Board | undefined>;
  updateBoard(id: string, patch: Partial<Board>): Promise<void>;
  deleteBoard(id: string): Promise<void>;

  getBoardGraph(boardId: string): Promise<{ nodes: BoardNode[]; edges: BoardEdge[] }>;
  upsertNode(node: BoardNode): Promise<void>;
  deleteNode(id: string): Promise<void>;
  upsertEdge(edge: BoardEdge): Promise<void>;
  deleteEdge(id: string): Promise<void>;

  getTaxonomy(): Promise<TaxonomyConfig>;
  saveTaxonomy(t: TaxonomyConfig): Promise<void>;

  exportAll(): Promise<string>; // JSON dump (task 4.5)
}

export class DexieRepository implements Repository {
  async createEntry(p: { type: EntryType; text?: string; attachments?: Attachment[]; tags?: string[] }): Promise<Entry> {
    const now = Date.now();
    const entry: Entry = {
      id: ulid(), module: "pkm", type: p.type, createdAt: now, modifiedAt: now,
      status: "unprocessed", text: p.text, attachments: p.attachments, tags: p.tags ?? [],
    };
    await db.entries.add(entry);
    return entry;
  }
  async updateEntry(id: string, patch: Partial<Entry>) {
    await db.entries.update(id, { ...patch, modifiedAt: Date.now() });
  }
  listInbox() {
    return db.entries.where("status").equals("unprocessed").reverse().sortBy("createdAt");
  }
  async searchEntries(q: string) {
    const needle = q.toLowerCase();
    return db.entries
      .filter(e => (e.text ?? "").toLowerCase().includes(needle) || e.tags.some(t => t.includes(needle)))
      .toArray();
  }
  getEntry(id: string) { return db.entries.get(id); }
  async saveAsset(mime: string, blob: Blob) {
    const id = ulid();
    await db.assets.add({ id, mime, blob, createdAt: Date.now() });
    return id;
  }
  async getAsset(id: string) {
    return (await db.assets.get(id))?.blob;
  }

  async createBoard(name: string): Promise<Board> {
    const now = Date.now();
    const board: Board = {
      id: ulid(), name, createdAt: now, modifiedAt: now,
      background: "dotted", viewport: { x: 0, y: 0, zoom: 1 },
    };
    await db.boards.add(board);
    return board;
  }
  listBoards() { return db.boards.orderBy("modifiedAt").reverse().toArray(); }
  getBoard(id: string) { return db.boards.get(id); }
  async updateBoard(id: string, patch: Partial<Board>) {
    await db.boards.update(id, { ...patch, modifiedAt: Date.now() });
  }
  async deleteBoard(id: string) {
    await db.transaction("rw", db.boards, db.nodes, db.edges, async () => {
      await db.nodes.where("boardId").equals(id).delete();
      await db.edges.where("boardId").equals(id).delete();
      await db.boards.delete(id);
    });
  }

  async getBoardGraph(boardId: string) {
    const [nodes, edges] = await Promise.all([
      db.nodes.where("boardId").equals(boardId).toArray(),
      db.edges.where("boardId").equals(boardId).toArray(),
    ]);
    return { nodes, edges };
  }
  async upsertNode(node: BoardNode) { await db.nodes.put({ ...node, modifiedAt: Date.now() }); }
  async deleteNode(id: string) { await db.nodes.delete(id); }
  async upsertEdge(edge: BoardEdge) { await db.edges.put(edge); }
  async deleteEdge(id: string) { await db.edges.delete(id); }

  async getTaxonomy() {
    return (await db.taxonomy.get("default")) ?? DEFAULT_TAXONOMY;
  }
  async saveTaxonomy(t: TaxonomyConfig) { await db.taxonomy.put(t); }

  async exportAll() {
    const [entries, boards, nodes, edges, taxonomy] = await Promise.all([
      db.entries.toArray(), db.boards.toArray(), db.nodes.toArray(), db.edges.toArray(), db.taxonomy.toArray(),
    ]);
    return JSON.stringify({ version: 1, exportedAt: Date.now(), entries, boards, nodes, edges, taxonomy }, null, 2);
  }
}

export const repository: Repository = new DexieRepository();
export { ulid };

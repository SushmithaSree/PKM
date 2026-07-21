import { useEffect, useMemo, useState } from "react";
import { repository, type Entry } from "@pkm/core-data";

// Tasks 1.8–1.10: grouped inbox, entry detail, search across text/captions/tags.

function dayLabel(ts: number): string {
  const d = new Date(ts); const today = new Date();
  const yd = new Date(today); yd.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yd.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

const ICON: Record<Entry["type"], string> = { text: "✏️", voice: "🎙", image: "🖼", link: "🔗" };

function AttachmentView({ assetId, kind }: { assetId: string; kind: "voice" | "image" }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let obj = "";
    repository.getAsset(assetId).then(b => {
      if (b) { obj = URL.createObjectURL(b); setUrl(obj); }
    });
    return () => { if (obj) URL.revokeObjectURL(obj); };
  }, [assetId]);
  if (!url) return null;
  if (kind === "voice") return <audio controls src={url} style={{ width: "100%", marginTop: 8 }} />;
  return <img src={url} alt="" style={{ maxWidth: "100%", borderRadius: 8, marginTop: 8 }} />;
}

function EntryRow({ entry, onArchive, onEdit }: {
  entry: Entry; onArchive: (id: string) => void; onEdit: (id: string, text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editText, setEditText] = useState(entry.text ?? "");

  return (
    <div style={{
      background: "var(--surface)", borderRadius: "var(--radius)",
      padding: "12px 16px", marginBottom: 8, boxShadow: "var(--shadow-float)",
    }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}
           onClick={() => setOpen(o => !o)}>
        <span aria-hidden="true">{ICON[entry.type]}{entry.attachments && entry.attachments.length > 0 && entry.type === "text" ? " 📎" : ""}</span>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {entry.text || (entry.type === "voice" ? "voice note" : entry.type === "image" ? "image" : "(untitled)")}
        </span>
        {(entry.attachments?.length ?? 0) > 0 && entry.text && (
          <span style={{ fontSize: 11, color: "var(--ink-muted)" }} aria-hidden="true">
            {entry.attachments!.map(a => a.kind === "voice" ? "🎙" : "🖼").join(" ")}
          </span>
        )}
        {entry.tags.map(t => (
          <span key={t} style={{ fontSize: 11, color: "var(--accent)", background: "var(--bg-paper)",
            borderRadius: 999, padding: "2px 8px" }}>#{t}</span>
        ))}
        <span style={{ color: "var(--ink-muted)", fontSize: 12 }}>
          {new Date(entry.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      {open && (
        <div style={{ marginTop: 10, borderTop: "1px solid var(--bg-paper)", paddingTop: 10 }}>
          {entry.type === "link" && entry.text && (
            <a href={entry.text} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", wordBreak: "break-all" }}>
              {entry.text}
            </a>
          )}
          {(entry.type === "text" || entry.type === "voice" || entry.type === "image") && (
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onBlur={() => { if (editText !== entry.text) onEdit(entry.id, editText); }}
              placeholder={entry.type === "voice" ? "Add notes to this voice memo…" : entry.type === "image" ? "Add a caption to this photo…" : ""}
              style={{ width: "100%", minHeight: 60, border: "1px solid var(--canvas-dot)",
                borderRadius: 8, padding: 8, fontFamily: "var(--font-capture)", fontSize: 15,
                background: "var(--bg-paper)", color: "var(--ink)", boxSizing: "border-box" }}
            />
          )}
          {entry.attachments?.map(a => <AttachmentView key={a.assetId} assetId={a.assetId} kind={a.kind} />)}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={() => onArchive(entry.id)} style={{
              border: "none", background: "none", cursor: "pointer", color: "var(--ink-muted)", fontSize: 13,
            }}>Archive</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Inbox() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => { repository.listInbox().then(setEntries); }, []);

  const shown = useMemo(() => {
    if (!q.trim()) return entries;
    const needle = q.toLowerCase();
    return entries.filter(e =>
      (e.text ?? "").toLowerCase().includes(needle) || e.tags.some(t => t.includes(needle)));
  }, [entries, q]);

  const groups = useMemo(() => {
    const m = new Map<string, Entry[]>();
    for (const e of shown) {
      const k = dayLabel(e.createdAt);
      m.set(k, [...(m.get(k) ?? []), e]);
    }
    return [...m.entries()];
  }, [shown]);

  async function archive(id: string) {
    await repository.updateEntry(id, { status: "archived" });
    setEntries(es => es.filter(e => e.id !== id));
  }
  async function edit(id: string, text: string) {
    const tags = [...text.matchAll(/#([\p{L}\p{N}_-]+)/gu)].map(m => m[1]!.toLowerCase());
    await repository.updateEntry(id, { text: text.trim() || undefined, tags });
    setEntries(es => es.map(e => e.id === id ? { ...e, text: text.trim() || undefined, tags } : e));
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 120px" }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Inbox</h1>
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search notes, captions, #tags…"
        style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", marginBottom: 16,
          borderRadius: 999, border: "1px solid var(--canvas-dot)", background: "var(--surface)",
          fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink)", outline: "none" }}
      />
      {groups.length === 0 && (
        <p style={{ color: "var(--ink-muted)" }}>
          {q ? "No matches." : "Inbox zero — everything's placed or archived."}
        </p>
      )}
      {groups.map(([label, list]) => (
        <div key={label}>
          <div style={{ color: "var(--ink-muted)", fontSize: 12, margin: "16px 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>
            {label}
          </div>
          {list.map(e => <EntryRow key={e.id} entry={e} onArchive={archive} onEdit={edit} />)}
        </div>
      ))}
    </div>
  );
}

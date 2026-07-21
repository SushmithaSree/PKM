import { useEffect, useState } from "react";
import { repository, type Entry } from "@pkm/core-data";

// Tap a node's 📎 → see the original capture (text / audio / image / link).
function AttachmentView({ assetId, kind }: { assetId: string; kind: "voice" | "image" }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let obj = "";
    repository.getAsset(assetId).then(b => { if (b) { obj = URL.createObjectURL(b); setUrl(obj); } });
    return () => { if (obj) URL.revokeObjectURL(obj); };
  }, [assetId]);
  if (!url) return null;
  if (kind === "voice") return <audio controls src={url} style={{ width: "100%", marginTop: 6 }} />;
  return <img src={url} alt="" style={{ maxWidth: "100%", borderRadius: 6, marginTop: 6 }} />;
}

export default function BacklinkPopover({ entryId, x, y, onClose }: {
  entryId: string; x: number; y: number; onClose: () => void;
}) {
  const [entry, setEntry] = useState<Entry | null>(null);
  useEffect(() => { repository.getEntry(entryId).then(e => setEntry(e ?? null)); }, [entryId]);

  return (
    <div className="nodrag nopan" style={{
      position: "absolute", left: x, top: y, transform: "translate(-50%, 12px)", zIndex: 30,
      width: 260, maxHeight: 320, overflowY: "auto",
      background: "var(--surface)", borderRadius: 12, boxShadow: "var(--shadow-float)", padding: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Source capture</span>
        <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-muted)" }}>✕</button>
      </div>
      {!entry && <p style={{ fontSize: 12, color: "var(--ink-muted)" }}>Source not found.</p>}
      {entry && (
        <>
          {entry.type === "link" && entry.text
            ? <a href={entry.text} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontSize: 13, wordBreak: "break-all" }}>{entry.text}</a>
            : entry.text && <p style={{ fontSize: 13, margin: 0, whiteSpace: "pre-wrap" }}>{entry.text}</p>}
          {entry.attachments?.map(a => <AttachmentView key={a.assetId} assetId={a.assetId} kind={a.kind} />)}
          <p style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 8 }}>
            captured {new Date(entry.createdAt).toLocaleString()}
          </p>
        </>
      )}
    </div>
  );
}

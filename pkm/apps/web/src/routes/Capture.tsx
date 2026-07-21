import { useEffect, useRef, useState } from "react";
import { repository, type Attachment, type EntryType } from "@pkm/core-data";
import VoiceRecorder from "../components/VoiceRecorder";

const DRAFT_KEY = "pkm.capture.draft";
const URL_RE = /^https?:\/\/\S+$/i;

type Pending = Attachment & { previewUrl?: string };

function extractTags(s: string): string[] {
  return [...s.matchAll(/#([\p{L}\p{N}_-]+)/gu)].map(m => m[1]!.toLowerCase());
}

export default function Capture() {
  const [text, setText] = useState(() => localStorage.getItem(DRAFT_KEY) ?? "");
  const [pending, setPending] = useState<Pending[]>([]);
  const [flash, setFlash] = useState("");
  const saveTimer = useRef<number>();
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => localStorage.setItem(DRAFT_KEY, text), 2000);
    return () => window.clearTimeout(saveTimer.current);
  }, [text]);

  function flashMsg(m: string) { setFlash(m); window.setTimeout(() => setFlash(""), 1200); }

  async function addImage(file: File) {
    const assetId = await repository.saveAsset(file.type, file);
    setPending(p => [...p, { assetId, kind: "image", previewUrl: URL.createObjectURL(file) }]);
  }

  async function commit() {
    const trimmed = text.trim();
    if (!trimmed && pending.length === 0) return; // nothing → discard silently
    localStorage.removeItem(DRAFT_KEY);
    // Primary type: typed text wins; else first attachment's kind; lone URL → link
    const type: EntryType = trimmed
      ? (URL_RE.test(trimmed) && pending.length === 0 ? "link" : "text")
      : (pending[0]!.kind === "voice" ? "voice" : "image");
    await repository.createEntry({
      type,
      text: trimmed || undefined,
      attachments: pending.length ? pending.map(({ assetId, kind, durationSec }) => ({ assetId, kind, durationSec })) : undefined,
      tags: extractTags(trimmed),
    });
    pending.forEach(p => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
    setPending([]);
    setText("");
    flashMsg("Saved ✓");
  }

  async function onPaste(e: React.ClipboardEvent) {
    const item = [...e.clipboardData.items].find(i => i.type.startsWith("image/"));
    if (!item) return;
    e.preventDefault();
    const file = item.getAsFile();
    if (file) await addImage(file);
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await addImage(file);
  }

  function removePending(assetId: string) {
    setPending(p => {
      const item = p.find(x => x.assetId === assetId);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return p.filter(x => x.assetId !== assetId);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <textarea
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        onPaste={onPaste}
        placeholder=""
        style={{
          flex: 1, border: "none", outline: "none", resize: "none",
          background: "var(--bg-paper)", color: "var(--ink)",
          fontFamily: "var(--font-capture)", fontSize: "clamp(17px, 2.4vw, 19px)", lineHeight: 1.7,
          padding: "clamp(24px, 6vh, 48px) clamp(20px, 12vw, 96px)",
          paddingBottom: 140,
        }}
      />
      <input ref={photoInput} type="file" accept="image/*" capture="environment"
        onChange={onPhoto} style={{ display: "none" }} />

      {/* Attachments live with the note until you save */}
      {pending.length > 0 && (
        <div style={{
          position: "fixed", bottom: "calc(max(16px, env(safe-area-inset-bottom)) + 72px)",
          left: 16, display: "flex", gap: 8, zIndex: 100, flexWrap: "wrap", maxWidth: "70vw",
        }}>
          {pending.map(p => (
            <div key={p.assetId} style={{
              display: "flex", alignItems: "center", gap: 8, background: "var(--surface)",
              borderRadius: 12, boxShadow: "var(--shadow-float)", padding: 6,
            }}>
              {p.kind === "image" && p.previewUrl
                ? <img src={p.previewUrl} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8 }} />
                : <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, padding: "0 4px" }}>
                    🎙 {String(Math.floor((p.durationSec ?? 0) / 60)).padStart(2, "0")}:{String((p.durationSec ?? 0) % 60).padStart(2, "0")}
                  </span>}
              <button onClick={() => removePending(p.assetId)} aria-label="Remove attachment" style={{
                border: "none", background: "none", cursor: "pointer", color: "var(--ink-muted)", fontSize: 14,
              }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div style={{
        position: "fixed", bottom: "max(16px, env(safe-area-inset-bottom))", left: 16,
        display: "flex", gap: 8, zIndex: 100, alignItems: "center",
        background: "var(--surface)", borderRadius: 999, boxShadow: "var(--shadow-float)", padding: 6,
      }}>
        <VoiceRecorder onRecorded={(assetId, durationSec) => setPending(p => [...p, { assetId, kind: "voice", durationSec }])} />
        <button onClick={() => photoInput.current?.click()} title="Photo" style={iconBtn}>📷</button>
        <button onClick={commit} title="Save to inbox" style={{
          border: "none", borderRadius: 999, cursor: "pointer",
          background: "var(--accent)", color: "#fff",
          height: "clamp(48px, 8vw, 56px)", padding: "0 clamp(16px, 3vw, 24px)",
          fontSize: "clamp(14px, 2.2vw, 16px)", fontFamily: "var(--font-ui)",
        }}>
          {flash || "Save"}
        </button>
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  width: "clamp(48px, 8vw, 56px)", height: "clamp(48px, 8vw, 56px)",
  borderRadius: 999, border: "none", background: "transparent", cursor: "pointer",
  fontSize: "clamp(22px, 4vw, 28px)", display: "grid", placeItems: "center",
};

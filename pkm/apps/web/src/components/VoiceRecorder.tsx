import { useEffect, useRef, useState } from "react";
import { repository } from "@pkm/core-data";

// Task 1.5 (revised): record → attach to the current note (no instant save).
export default function VoiceRecorder({ onRecorded }: {
  onRecorded: (assetId: string, durationSec: number) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number>();
  const elapsedRef = useRef(0);

  useEffect(() => () => { window.clearInterval(timer.current); rec.current?.stream.getTracks().forEach(t => t.stop()); }, []);

  async function start() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const r = new MediaRecorder(stream);
      r.ondataavailable = e => chunks.current.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks.current, { type: r.mimeType || "audio/webm" });
        const assetId = await repository.saveAsset(blob.type, blob);
        onRecorded(assetId, elapsedRef.current);
      };
      rec.current = r;
      r.start();
      elapsedRef.current = 0;
      setElapsed(0);
      timer.current = window.setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }, 1000);
      setRecording(true);
    } catch {
      setError("Microphone access needed — check browser permissions.");
    }
  }

  function stop() {
    window.clearInterval(timer.current);
    rec.current?.stop();
    setRecording(false);
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  if (recording) return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 8px" }}>
      <span style={{ width: 12, height: 12, borderRadius: 999, background: "var(--accent)", animation: "pulse 1s infinite" }} />
      <style>{`@keyframes pulse { 50% { opacity: .3 } }`}</style>
      <span style={{ fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-ui)" }}>{mm}:{ss}</span>
      <button onClick={stop} style={{
        border: "none", borderRadius: 999, padding: "8px 16px", cursor: "pointer",
        background: "var(--ink)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: 14,
      }}>■ Stop</button>
    </div>
  );

  return (
    <>
      <button onClick={start} title="Voice note" style={iconBtn}>🎙</button>
      {error && <span style={{ color: "var(--accent)", fontSize: 13, alignSelf: "center", maxWidth: 200 }}>{error}</span>}
    </>
  );
}

const iconBtn: React.CSSProperties = {
  width: "clamp(48px, 8vw, 56px)", height: "clamp(48px, 8vw, 56px)",
  borderRadius: 999, border: "none", background: "transparent", cursor: "pointer",
  fontSize: "clamp(22px, 4vw, 28px)", display: "grid", placeItems: "center",
};

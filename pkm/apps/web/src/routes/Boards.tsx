import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { repository, type Board } from "@pkm/core-data";

export default function Boards() {
  const [boards, setBoards] = useState<Board[]>([]);
  const nav = useNavigate();
  useEffect(() => { repository.listBoards().then(setBoards); }, []);

  async function create() {
    const b = await repository.createBoard(`Board ${boards.length + 1}`);
    nav(`/board/${b.id}`);
  }
  async function remove(id: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (!confirm("Delete this board and all its nodes?")) return;
    await repository.deleteBoard(id);
    setBoards(bs => bs.filter(b => b.id !== id));
  }
  async function exportAll() {
    const json = await repository.exportAll();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `pkm-export-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 120px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Boards</h1>
        <Link to="/settings" style={{ marginLeft: "auto", color: "var(--ink-muted)", fontSize: 13 }}>Settings</Link>
        <button onClick={exportAll} style={{
          border: "1px solid var(--canvas-dot)", background: "var(--surface)", borderRadius: 999,
          padding: "6px 14px", cursor: "pointer", fontSize: 13, fontFamily: "var(--font-ui)", color: "var(--ink)",
        }}>Export data</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
        <button onClick={create} style={{
          height: 140, borderRadius: "var(--radius)", border: "2px dashed var(--canvas-dot)",
          background: "none", cursor: "pointer", color: "var(--ink-muted)", fontSize: 15,
        }}>+ New board</button>
        {boards.map(b => (
          <Link key={b.id} to={`/board/${b.id}`} style={{
            height: 140, borderRadius: "var(--radius)", background: "var(--surface)",
            boxShadow: "var(--shadow-float)", textDecoration: "none", color: "var(--ink)",
            display: "flex", flexDirection: "column", overflow: "hidden", position: "relative",
          }}>
            <div style={{ flex: 1, background: b.thumbnail ? `center/cover no-repeat url(${b.thumbnail})` : "var(--bg-paper)" }} />
            <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid var(--bg-paper)" }}>
              <strong style={{ flex: 1, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</strong>
              <button onClick={e => remove(b.id, e)} title="Delete" style={{
                border: "none", background: "none", cursor: "pointer", color: "var(--ink-muted)", fontSize: 13,
              }}>🗑</button>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

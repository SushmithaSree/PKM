import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant, MiniMap, Controls,
  useNodesState, useEdgesState, addEdge, type Connection, type Edge,
  useReactFlow, ConnectionMode, useStore, getNodesBounds, getViewportForBounds,
} from "@xyflow/react";
import { toPng } from "html-to-image";
import {
  repository, ulid, DEFAULT_TAXONOMY, type NodeType, type BoardNode,
  type TaxonomyConfig, type BackgroundStyle,
} from "@pkm/core-data";
import { ShapeNode, type ShapeNodeType } from "../canvas/ShapeNode";
import { DEFAULT_SIZE, SHAPE_GLYPH } from "../canvas/shapeGeometry";
import RelationEdge, { type RelationEdgeData } from "../canvas/RelationEdge";
import NodeToolbar from "../canvas/NodeToolbar";
import InboxTray from "../canvas/InboxTray";
import BacklinkPopover from "../canvas/BacklinkPopover";

const nodeTypes = { shape: ShapeNode };
const edgeTypes = { relation: RelationEdge };
const STARTERS = ["causes","leads to","example of","supports","contradicts","part of"];
const DECAY_MS = 14 * 24 * 60 * 60 * 1000;
const BG_VARIANT: Record<BackgroundStyle, BackgroundVariant | null> = {
  blank: null, dotted: BackgroundVariant.Dots, grid: BackgroundVariant.Lines,
};

function Canvas() {
  const { id: boardId = "" } = useParams();
  const [nodes, setNodes, onNodesChange] = useNodesState<ShapeNodeType>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { screenToFlowPosition, flowToScreenPosition, fitView, getNodes } = useReactFlow();
  const dragType = useRef<NodeType | null>(null);
  const [tax, setTax] = useState<TaxonomyConfig>(DEFAULT_TAXONOMY);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [trayKey, setTrayKey] = useState(0);
  const [backlink, setBacklink] = useState<{ entryId: string; x: number; y: number } | null>(null);
  const [bg, setBg] = useState<BackgroundStyle>("dotted");
  const [bgMenu, setBgMenu] = useState(false);
  const now = Date.now();

  useEffect(() => { repository.getTaxonomy().then(setTax); }, []);
  useEffect(() => { repository.getBoard(boardId).then(b => b && setBg(b.background)); }, [boardId]);

  const persist = useCallback((n: ShapeNodeType) => {
    repository.upsertNode({
      id: n.id, boardId, nodeType: n.data.nodeType, text: n.data.text,
      x: n.position.x, y: n.position.y, width: n.data.w, height: n.data.h,
      sourceEntryId: n.data.sourceEntryId,
      createdAt: n.data.createdAt ?? Date.now(), modifiedAt: Date.now(),
    });
  }, [boardId]);

  const onTextChange = useCallback((nodeId: string, text: string) => {
    setNodes(ns => ns.map(n => { if (n.id !== nodeId) return n; const next = { ...n, data: { ...n.data, text } }; persist(next); return next; }));
  }, [persist, setNodes]);
  const onResize = useCallback((nodeId: string, w: number, h: number, final: boolean) => {
    setNodes(ns => ns.map(n => { if (n.id !== nodeId) return n; const next = { ...n, data: { ...n.data, w, h } }; if (final) persist(next); return next; }));
  }, [persist, setNodes]);
  const onBacklink = useCallback((nodeId: string) => {
    const n = getNodes().find(x => x.id === nodeId) as ShapeNodeType | undefined;
    if (!n?.data.sourceEntryId) return;
    const s = flowToScreenPosition({ x: n.position.x + n.data.w / 2, y: n.position.y + n.data.h });
    setBacklink({ entryId: n.data.sourceEntryId, x: s.x, y: s.y });
  }, [getNodes, flowToScreenPosition]);

  // Resolve a node's style safely: falls back to Transient if the type was
  // since deleted from the taxonomy (keeps old boards from crashing).
  const styleFor = useCallback(
    (t: NodeType): import("@pkm/core-data").TypeStyle =>
      tax.types[t] ?? tax.types["transient"] ?? DEFAULT_TAXONOMY.types["transient"]!,
    [tax]
  );

  const toFlow = useCallback((n: BoardNode): ShapeNodeType => {
    const style = styleFor(n.nodeType);
    const def = DEFAULT_SIZE[style.shape];
    const stale = n.nodeType === "transient" && (now - n.createdAt) > DECAY_MS;
    return {
      id: n.id, type: "shape", position: { x: n.x, y: n.y },
      data: {
        nodeType: n.nodeType, text: n.text, w: n.width || def.w, h: n.height || def.h,
        style, sourceEntryId: n.sourceEntryId, stale,
        createdAt: n.createdAt, onTextChange, onResize, onBacklink,
      },
    };
  }, [styleFor, now, onTextChange, onResize, onBacklink]);

  const setEdgeRelation = useCallback((edgeId: string, relation?: string) => {
    setEdges(es => es.map(e => e.id === edgeId ? { ...e, data: { ...e.data, relation } } : e));
    repository.getBoardGraph(boardId).then(({ edges: stored }) => {
      const s = stored.find(x => x.id === edgeId); if (s) repository.upsertEdge({ ...s, relation });
    });
    if (relation && !STARTERS.includes(relation) && !tax.customRelations.includes(relation)) {
      const next = { ...tax, customRelations: [...tax.customRelations, relation] };
      setTax(next); repository.saveTaxonomy(next);
    }
  }, [boardId, tax, setEdges]);

  const deleteEdge = useCallback((edgeId: string) => {
    setEdges(es => es.filter(e => e.id !== edgeId));
    repository.deleteEdge(edgeId);
  }, [setEdges]);

  const edgeData = useCallback((relation?: string): RelationEdgeData => ({
    relation, onSetRelation: setEdgeRelation, onDelete: deleteEdge, customRelations: tax.customRelations,
  }), [setEdgeRelation, deleteEdge, tax.customRelations]);

  // reload graph when taxonomy changes (shapes/colors) or board changes
  useEffect(() => {
    repository.getBoardGraph(boardId).then(({ nodes: ns, edges: es }) => {
      setNodes(ns.map(toFlow));
      setEdges(es.map(e => ({
        id: e.id, source: e.from, target: e.to,
        sourceHandle: e.sourceHandle, targetHandle: e.targetHandle,
        type: "relation", data: edgeData(e.relation),
      })));
    });
  }, [boardId, tax]); // eslint-disable-line

  const handleEdgesChange = useCallback((changes: Parameters<typeof onEdgesChange>[0]) => {
    changes.forEach(c => { if (c.type === "remove") repository.deleteEdge(c.id); });
    onEdgesChange(changes);
  }, [onEdgesChange]);

  const handleNodesChange = useCallback((changes: Parameters<typeof onNodesChange>[0]) => {
    changes.forEach(c => { if (c.type === "remove") repository.deleteNode(c.id); });
    onNodesChange(changes);
  }, [onNodesChange]);

  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target || c.source === c.target) return;
    const edgeId = ulid();
    setEdges(es => addEdge({ ...c, id: edgeId, type: "relation", data: edgeData(undefined) }, es));
    repository.upsertEdge({
      id: edgeId, boardId, from: c.source, to: c.target,
      sourceHandle: c.sourceHandle ?? undefined, targetHandle: c.targetHandle ?? undefined,
      createdAt: Date.now(),
    });
  }, [boardId, edgeData, setEdges]);

  const addNodeAt = useCallback((nodeType: NodeType, clientX: number, clientY: number, extra?: Partial<BoardNode>) => {
    const pos = screenToFlowPosition({ x: clientX, y: clientY });
    const size = DEFAULT_SIZE[styleFor(nodeType).shape];
    const stored: BoardNode = {
      id: ulid(), boardId, nodeType, text: extra?.text ?? "",
      x: pos.x, y: pos.y, width: size.w, height: size.h,
      sourceEntryId: extra?.sourceEntryId, createdAt: Date.now(), modifiedAt: Date.now(),
    };
    setNodes(ns => [...ns, toFlow(stored)]);
    repository.upsertNode(stored);
    return stored;
  }, [styleFor, screenToFlowPosition, setNodes, toFlow, boardId]);

  // M3: drop a capture from the tray → Transient node w/ backlink; mark placed.
  const onDropEntry = useCallback(async (entryId: string, clientX: number, clientY: number) => {
    const entry = await repository.getEntry(entryId);
    if (!entry) return;
    const text = entry.text || (entry.type === "voice" ? "🎙 voice note" : entry.type === "image" ? "🖼 image" : "");
    addNodeAt("transient", clientX, clientY, { text, sourceEntryId: entryId });
    await repository.updateEntry(entryId, { status: "placed" });
    setTrayKey(k => k + 1);
  }, [addNodeAt]);

  const reclassify = useCallback((nodeId: string, t: NodeType) => {
    setNodes(ns => ns.map(n => { if (n.id !== nodeId) return n; const next = { ...n, data: { ...n.data, nodeType: t, style: styleFor(t) } }; persist(next); return next; }));
  }, [persist, setNodes, styleFor]);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes(ns => ns.filter(n => n.id !== nodeId));
    setEdges(es => es.filter(e => e.source !== nodeId && e.target !== nodeId));
    repository.deleteNode(nodeId); setSelectedNodeId(null);
  }, [setNodes, setEdges]);

  // Focus mode: highlight neighborhood + recenter on it.
  const neighbors = useMemo(() => {
    if (!focusId) return null;
    const set = new Set<string>([focusId]);
    edges.forEach(e => { if (e.source === focusId) set.add(e.target); if (e.target === focusId) set.add(e.source); });
    return set;
  }, [focusId, edges]);

  useEffect(() => {
    if (focusId && neighbors) {
      fitView({ nodes: [...neighbors].map(id => ({ id })), duration: 350, padding: 0.3 });
    }
  }, [focusId]); // eslint-disable-line

  const displayNodes = useMemo(() => nodes.map(n => ({
    ...n, style: neighbors && !neighbors.has(n.id) ? { opacity: 0.2 } : undefined,
  })), [nodes, neighbors]);
  const displayEdges = useMemo(() => edges.map(e => ({
    ...e, style: neighbors && !(neighbors.has(e.source) && neighbors.has(e.target)) ? { opacity: 0.12 } : undefined,
  })), [edges, neighbors]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null;
  const transform = useStore(s => s.transform);
  // Clamp to the viewport so the toolbar never lands under the zoom Controls /
  // MiniMap (reserved bottom band) or off the top/side edges, regardless of
  // how far zoomed/panned the selected node is.
  const toolbarPos = useMemo(() => {
    if (!selectedNode) return null;
    const raw = flowToScreenPosition({ x: selectedNode.position.x + selectedNode.data.w / 2, y: selectedNode.position.y });
    const sideMargin = 90;
    const topMargin = 60;
    const bottomMargin = 210; // clears Controls + MiniMap + bottom nav
    return {
      x: Math.min(Math.max(raw.x, sideMargin), window.innerWidth - sideMargin),
      y: Math.min(Math.max(raw.y, topMargin), window.innerHeight - bottomMargin),
    };
  }, [selectedNode, flowToScreenPosition, transform]);

  async function changeBg(next: BackgroundStyle) {
    setBg(next); setBgMenu(false);
    await repository.updateBoard(boardId, { background: next });
  }

  // Thumbnail snapshot on unmount / periodically after edits.
  const snap = useCallback(async () => {
    const ns = getNodes();
    if (ns.length === 0) return;
    const el = document.querySelector(".react-flow__viewport") as HTMLElement | null;
    if (!el) return;
    try {
      const bounds = getNodesBounds(ns);
      const vp = getViewportForBounds(bounds, 400, 260, 0.2, 2, 0.1);
      const dataUrl = await toPng(el, {
        backgroundColor: "#FAF7F2", width: 400, height: 260,
        style: { transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` },
      });
      await repository.updateBoard(boardId, { thumbnail: dataUrl });
    } catch { /* ignore snapshot failures */ }
  }, [getNodes, boardId]);
  useEffect(() => () => { snap(); }, []); // eslint-disable-line

  const palette = useMemo(() => (
    <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", zIndex: 10,
      background: "var(--surface)", borderRadius: 24, boxShadow: "var(--shadow-float)",
      display: "flex", flexDirection: "column", gap: 4, padding: 8, maxHeight: "70vh", overflowY: "auto" }}>
      {Object.keys(tax.types).map(t => {
        const s = styleFor(t);
        return (
          <div key={t} draggable title={s.label}
            onDragStart={() => { dragType.current = t; }}
            style={{ width: "clamp(36px,6vw,48px)", height: "clamp(36px,6vw,48px)", display: "grid",
              placeItems: "center", cursor: "grab", color: s.color, fontSize: "clamp(20px,3.5vw,26px)" }}>
            {SHAPE_GLYPH[s.shape]}
          </div>
        );
      })}
    </div>
  ), [tax]);

  const variant = BG_VARIANT[bg];

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        const entryId = e.dataTransfer.getData("application/x-pkm-entry");
        if (entryId) { onDropEntry(entryId, e.clientX, e.clientY); return; }
        if (dragType.current) { addNodeAt(dragType.current, e.clientX, e.clientY); dragType.current = null; }
      }}
    >
      {palette}
      <InboxTray refreshKey={trayKey} />

      {/* top toolbar: flex row so items never overlap regardless of label width.
          left+right together force this box to span the gap between them for
          layout purposes — pointer-events:none stops that invisible span from
          swallowing clicks meant for things behind it (e.g. the Inbox tray
          toggle), re-enabled per-child below. */}
      <div style={{ position: "absolute", top: 16, left: 80, right: 16, zIndex: 10, display: "flex", gap: 8, flexWrap: "wrap", pointerEvents: "none" }}>
        {/* background switcher */}
        <div style={{ position: "relative", pointerEvents: "auto" }}>
          <button onClick={() => setBgMenu(m => !m)} style={{
            background: "var(--surface)", border: "none", borderRadius: 999, padding: "8px 14px",
            cursor: "pointer", boxShadow: "var(--shadow-float)", fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink)",
            whiteSpace: "nowrap",
          }}>Background: {bg}</button>
          {bgMenu && (
            <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 6, zIndex: 10,
              background: "var(--surface)", borderRadius: 10, boxShadow: "var(--shadow-float)", overflow: "hidden" }}>
              {(["blank","dotted","grid"] as BackgroundStyle[]).map(o => (
                <button key={o} onClick={() => changeBg(o)} style={{
                  display: "block", width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                  padding: "8px 16px", background: o === bg ? "var(--bg-paper)" : "transparent",
                  fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap",
                }}>{o}</button>
              ))}
            </div>
          )}
        </div>

        <Link to={`/settings?board=${boardId}`} title="Node type settings" style={{
          background: "var(--surface)", borderRadius: 999, padding: "8px 14px", textDecoration: "none",
          boxShadow: "var(--shadow-float)", fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink)",
          whiteSpace: "nowrap", pointerEvents: "auto",
        }}>⚙ Node types</Link>
      </div>

      {focusId && (
        <button onClick={() => setFocusId(null)} style={{
          position: "absolute", top: 16, right: 272, zIndex: 20, background: "var(--accent)", color: "#fff",
          border: "none", borderRadius: 999, padding: "8px 16px", cursor: "pointer",
          fontFamily: "var(--font-ui)", fontSize: 13, boxShadow: "var(--shadow-float)",
        }}>Exit focus ✕</button>
      )}

      <ReactFlow
        nodes={displayNodes} edges={displayEdges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange} onEdgesChange={handleEdgesChange} onConnect={onConnect}
        connectionMode={ConnectionMode.Loose} zoomOnDoubleClick={false}
        onSelectionChange={({ nodes: sel }) => setSelectedNodeId(sel[0]?.id ?? null)}
        onNodeDragStop={(_, n) => setNodes(ns => ns.map(x => { if (x.id !== n.id) return x; const next = { ...x, position: n.position }; persist(next); return next; }))}
        onNodeDoubleClick={(_, n) => setFocusId(n.id)}
        onDoubleClick={e => { if ((e.target as HTMLElement).classList.contains("react-flow__pane")) addNodeAt("transient", e.clientX, e.clientY); }}
        onPaneClick={() => { setFocusId(null); setBacklink(null); setBgMenu(false); }}
        fitView style={{ background: "var(--bg-paper)" }}
      >
        {variant && <Background variant={variant} color="#C9C1B2" size={variant === BackgroundVariant.Dots ? 2.2 : 1} gap={26} />}
        <MiniMap pannable zoomable style={{ bottom: 76 }} />
        <Controls style={{ bottom: 76 }} />
      </ReactFlow>

      {selectedNode && toolbarPos && !focusId && (
        <NodeToolbar current={selectedNode.data.nodeType} types={tax.types} x={toolbarPos.x} y={toolbarPos.y}
          onReclassify={t => reclassify(selectedNode.id, t)} onDelete={() => deleteNode(selectedNode.id)}
          onFocus={() => setFocusId(selectedNode.id)} />
      )}
      {backlink && <BacklinkPopover entryId={backlink.entryId} x={backlink.x} y={backlink.y} onClose={() => setBacklink(null)} />}
    </div>
  );
}

export default function Board() {
  return <ReactFlowProvider><Canvas /></ReactFlowProvider>;
}

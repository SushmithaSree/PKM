# PKM Build — Feature Complete (v1)

Local-first PWA. React + Vite + TypeScript · React Flow · Dexie (IndexedDB) · Zustand.
Privacy: no data leaves the device. Zero servers.

## Run
```
npm install
npm run dev        # http://localhost:5173
```

## What's built

### Capture (M1)
- Opens into a blank notepad; autosave draft; save-on-close; empty discard
- Composite entries: type text AND attach voice memos + photos in one note
- Voice recording on-device (timer, stop), photos (camera on mobile), image paste, URL→link
- #tag parsing from note text
- Fixed bottom nav (Capture / Inbox / Boards) on every screen

### Inbox (M1)
- Search across text, captions, tags
- Day grouping (Today / Yesterday / dates)
- Tap row → detail: edit text, play audio, view images, open links, archive

### Canvas / Synthesize (M2)
- Infinite canvas, pan/zoom, minimap, controls
- 5 node shapes via one geometry system (outline, clip, handles, text-fit all derived)
- Fixed node sizes + drag-to-resize; font auto-shrinks to fit (Miro model)
- Shape palette (drag to create); double-click canvas → Transient node
- Edges: drag handle→node; relation labels (causes/leads to/example of/supports/contradicts/part of + custom); directional auto-arrow; contradicts = red dash
- Node floating toolbar: reclassify type (shape morphs, text kept) + delete
- Focus mode: double-click node → highlight neighborhood, dim rest, recenter
- Background switcher per board: blank / dotted / grid
- Board thumbnails (snapshot on leave), delete boards

### Bridge (M3) — the differentiator
- Inbox tray docked on canvas (collapsible)
- Drag a capture onto canvas → Transient node with 📎 backlink; entry marked "placed"
- Backlink popover: view original text / audio / image / link
- Transient decay: nodes older than 14 days show amber "review me" dot

### Settings & data
- Taxonomy editor: rename types, reassign shape + color per type (nodes update live)
- Custom relations persist to personal list
- Export all data as JSON (backup before sync exists)

## Known deferrals (post-v1)
- "Send to board…" from the Inbox screen (tray drag covers the canvas path)
- Markdown-lite rendering in capture
- Contour/curved text inside shapes (parked per your call — geometry supports adding it)
- Editing inside triangle/diamond uses a centered box; display is centered too
- Sync / multi-device (schema is sync-ready via the Repository seam)

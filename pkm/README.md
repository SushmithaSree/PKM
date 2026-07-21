# PKM — Personal Knowledge Management (Module 1 of the integrated journal platform)

Local-first PWA. Capture (notepad) + Synthesize (infinite canvas, React Flow).
Privacy principle: no user data leaves the device. Zero servers in v1.

## Structure
- `packages/core-data` — types, ULID, Dexie (IndexedDB) schema, Repository interface. All modules read/write through this.
- `packages/core-ui` — Paper & Ink design tokens (CSS variables).
- `apps/web` — PWA shell. Routes: /capture (default), /inbox, /boards, /board/:id.

## Run
npm install
npm run dev

## Spike status (task 2.4)
/board/:id renders React Flow with the base custom node: all 5 shapes,
inline editing (double-click), drag-from-handle to connect. Judge the feel here first.

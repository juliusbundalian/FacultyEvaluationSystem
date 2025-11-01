## Project summary

- This is a Vue 3 + Vite single-page application for a Faculty Evaluation System.
- Main frameworks/libraries: Vue 3 (composition API), Pinia for state, Firebase (Auth + Firestore), Vite, Bootstrap 5, DataTables (datatables.net-vue3), Chart.js.

## High-level architecture & data flow

- Frontend only app (SPA) built with Vite. Entry is `src/main.js` and root component is `src/App.vue`.
- Views are under `src/views/` and grouped by feature (Evaluation, EvaluationForm, Faculty, Student, User, Authentication). Each feature has its own view folder and a `components/` subfolder for local components and modals (e.g. `src/views/Student/components/StudentModal.vue`).
- State is managed with Pinia stores in `src/store/` (each file named `*Store.js`, e.g. `evaluationStore.js`, `facultyStore.js`). Stores use the composition-style `defineStore(name, () => { ... })` pattern and return state/getters/actions.
- Firebase integration: `src/firebase.js` exports `{ auth, db, app }`. Firestore collection names are centralized in `src/constants/dbCollections.js` as `COLLECTIONS` and used throughout stores.
  - Example pattern used in stores: `getDocs(collection(db, COLLECTIONS.EVALUATIONS))` (see `src/store/evaluationStore.js`).

## Key files & conventions (useful to reference)

- Firebase setup: `src/firebase.js` (do not accidentally replace project config unless rotating keys intentionally).
- Collections map: `src/constants/dbCollections.js` (use these constants rather than literal collection names).
- Pinia stores: `src/store/*.js` — return an object containing state, getters and actions. Actions perform Firestore reads/writes using `collection`, `getDocs`, `setDoc`, `updateDoc`, `deleteDoc`.
- Views & components: `src/views/**` — modals are located in `components/` folders and typically named `*Modal.vue`.
- Styles: `src/styles/` uses Less. Theme files are in `src/styles/themes/` and global variables in `src/styles/core/variables.less`.
- Utilities: `src/utils/` contains small helpers (e.g., `regex.js`, `swal.js`).

## Build, run, and deploy workflows

- Local dev (hot reload): `npm install` then `npm run dev` (Vite). Default dev server is Vite (likely port 5173).
- Production build: `npm run build` — outputs `dist/`.
- Preview a production build locally: `npm run preview`.
- Lint/format: `npm run lint` and `npm run format`.
- Hosting: the repo includes Firebase config (`firebase.json`) — common flow: `npm run build` then `firebase deploy --only hosting` (this project has used that previously).

## Project-specific patterns and gotchas for an AI assistant

- Prefer editing source under `src/` — do not modify files under `dist/` (build artifacts).
- Use the `COLLECTIONS` constants for Firestore collection names to avoid mismatches.
- Stores follow a consistent error/loading pattern: `loading` and `error` refs are set at action start/end. Keep that shape when adding new stores or actions so components can rely on them.
- UI uses Bootstrap 5 classes and some direct DOM/data-table integrations. Datatables are wired with `datatables.net-vue3` and occasionally require `jQuery` for initialization — search for `DataTable` or `datatables` when changing table code.
- Modals are often local single-file components and opened by parent views; follow existing patterns where parents pass callbacks/props to modal components (see `src/views/Evaluation/components/EvaluationModal.vue`).

## Examples (copyable patterns)

- Read evaluations in a store:

  getDocs(collection(db, COLLECTIONS.EVALUATIONS))

- Add or upsert with a custom ID pattern used in `evaluationStore`:

  const docRef = doc(db, COLLECTIONS.EVALUATIONS, newId)
  await setDoc(docRef, { ...data, id: newId })

## Files to avoid changing lightly

- `src/firebase.js` (contains active project config)
- Anything under `dist/` (build output)

## When in doubt

- Look at an existing store (e.g. `src/store/evaluationStore.js`) to match return shapes and error handling.
- For collection names, prefer `COLLECTIONS` constants.
- For UI behavior, inspect the relevant view in `src/views/...` and its `components/` subfolder for matching modal and component patterns.

---

Please review this guidance. Tell me if you want more detail in any area (examples for specific stores, explanation of routes in `src/router/index.js`, or a checklist for PR reviews).

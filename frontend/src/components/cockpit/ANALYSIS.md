# Cockpit Immersion Analysis

## Architecture

- `CockpitInterior` loads per-aircraft **GLB** via `GLTFLoader` (`useCockpitGltf`).
- Named nodes (`socket_pfd`, `sw_battery`, …) receive instruments and raycast controls.
- Missing assets use **empty Object3D** attachment sockets only — **no BoxGeometry cabin**.
- Exterior mesh still hides cabin shell when in cockpit cam (`hideCabin`).

## Authoring

See `public/models/cockpit/README.md` for node naming and file paths.

# Exterior aircraft models

Place GLB/GLTF files in this folder. The sim loads them for chase / exterior camera views.

## Currently shipped

| File | Used by | Source | License |
|------|---------|--------|---------|
| `citation_cj.glb` | Horizon CJ (business jet) | [Flightradar24 fr24-3d-models](https://github.com/Flightradar24/fr24-3d-models) (Cessna Citation II) | GPLv2 |
| `cirrus_sr22.glb` | SkyTrainer SR (stand-in) | FR24 Piper PA-28 | GPLv2 |

## Use a model from Sketchfab

Sketchfab requires a free account to download. Automated download needs an API token.

1. Browse [Sketchfab downloadable jets](https://sketchfab.com/search?q=jet+airplane&type=models&features=downloadable&sort_by=-likeCount) and pick a **CC BY / CC0** model (check license on the model page).
2. Download as **glTF** (preferred) or FBX → convert to GLB.
3. Save as e.g. `public/models/aircraft/citation_cj.glb` (overwrite) **or** a new name.
4. Point the fleet at it:

```ts
// fleet.ts or exteriorRegistry.ts
exteriorModelUrl: "/models/aircraft/your_jet.glb",
exteriorModelScale: 1, // tune if too big/small
```

5. Nose must face **−Z** (Y-up, meters). If the Sketchfab model noses **+X**, keep `rotation: [0, -Math.PI/2, 0]` in `exteriorRegistry.ts`.

### Optional: API download script

```bash
# https://sketchfab.com/settings/password  → API token
set SKETCHFAB_API_TOKEN=your_token_here
node scripts/download-sketchfab-model.mjs <model-uid> public/models/aircraft/my_jet.glb
```

Example UIDs (CC BY, downloadable):

- F-22 Raptor FREE — `2a64abf0866a405c865466c7642ca689`  
  https://sketchfab.com/3d-models/f22-raptor-free-2a64abf0866a405c865466c7642ca689
- Aircraft kit (CC0 tag, heavy) — `789f53a908204d3ba7d2b5fd21090f3a`

Credit the author in `ATTRIBUTION.md` when using CC BY assets.

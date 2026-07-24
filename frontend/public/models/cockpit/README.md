# Cockpit GLB authoring

Place models in `public/models/cockpit/`:

| File | Aircraft |
|------|----------|
| `cirrus_sr22_cockpit.glb` | SkyTrainer SR |
| `baron_b58_cockpit.glb` | TwinStar B |
| `citation_cj_cockpit.glb` | Horizon CJ |

## Coordinate system

- Meters
- Y-up
- Nose toward **−Z**
- Origin near cabin floor center / main spar

## Required empty / bone names

### Display sockets
- `socket_pfd` — Primary Flight Display
- `socket_nd` — Navigation Display
- `socket_eicas` — Engine / systems
- `socket_standby` — (reserved)
- `socket_fmc` — (reserved)

### Seats / cameras
- `seat_captain`, `seat_fo`, `seat_jump`
- `camera_captain`, `camera_fo`, `camera_pedestal`, `camera_overhead`, `camera_instrument`

### Controls (meshes preferred for raycast)
- `ctrl_throttle_l`, `ctrl_throttle_r`, `ctrl_flaps`, `ctrl_gear`, `ctrl_park_brake`, `ctrl_yoke_capt`
- `sw_battery`, `sw_avionics`, `sw_ap`, `sw_landing_light`
- `light_cabin` — empty for cabin point light

## Runtime behavior

- Framework uses **GLTFLoader** only — no procedural cabin boxes.
- Missing GLB → invisible `Object3D` sockets so instruments still attach.
- Named nodes in the GLB override placeholder transforms.

Register additional aircraft in `src/components/cockpit/models/registry.ts` or set `AircraftSpec.cockpitModelUrl`.

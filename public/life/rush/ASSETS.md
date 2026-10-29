# LIFE · RUSH — assets made in the repo (29.10.2026)

Nothing here was downloaded or licensed: every file is generated from a script in this repository.

| Folder | Made with | Source | Rebuild |
|---|---|---|---|
| `tex/` — asphalt, slabs, concrete (`-albedo`, `-height`, `-rough`) | loom | `scripts/life/rush/surfaces.tx.js` | loom build → `python3 scripts/life/rush/pack-surfaces.py <out>` |
| `models/rush-props.glb`, `models/bin.glb` | kiln | `scripts/life/rush/props.kx.js` | kiln build → copy the pack and `models/bin.glb` |

- The ground's normal map is rebuilt from the height in the browser (`lib/life/rush-render/surfaces.ts`); only grey tiles and one colour tile ship.
- The models carry two placeholder materials, `clubP` and `clubS`, repainted with the club's own two colours at run time (`lib/life/rush-render/props.ts`). No file holds a club's colour, so none can hold a rival's.
- Every colour in the ground tiles is a grey.

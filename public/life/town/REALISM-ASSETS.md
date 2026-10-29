# LIFE realism assets (29.10.2026)

Where they came from and what was done to them. The folders below sit outside `scripts/life/asset-provenance.mjs`'s scope (public/life/town), so the record lives here.

| Folder | From | Treatment |
|---|---|---|
| `people/iris/*.webp` | R3 of FANLIFE_LIFE_REALISM_ASSET_DRAFTS, uploaded by Maor (AI-generated drafts) | cropped to the circle, 256 px, WebP |
| `people/skin-pores-n.webp` | R2 `R2-skin-pores-height.png` of the same pack | tangent-space normal derived from the height (wrapped Sobel), 1024 px |
| `tex/fabric/*.webp` | R4 grey fabric swatches of the same pack | luminance only, contrast normalised round mid-grey, 512 px |
| `studio/*.webp` | R5 interview plates of the same pack | 1600×1000 WebP |
| `../season/box/*.webp` | R8 keepsakes of the same pack | cut to the object, 560 px, WebP with alpha |
| `env/day.png`, `env/room.png` | R7: Poly Haven `kloppenheim_06_puresky`, `small_empty_room_1` (CC0, https://polyhaven.com/license) | 512×256, RGBM PNG (sqrt, range 16) |
| `mocap.json` | CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu; funded by NSF EIA-0196217), BVH conversion by B. Hahne (cgspeed), read from github.com/una-dinosauria/cmu-mocap. Free to use, copy and redistribute; credit requested. Takes: walks 02_01, 08_01–02, 16_15–16, 16_21–22, 16_31–32, 35_01; runs 02_03, 09_01, 09_04, 16_35–36, 16_56 | `scripts/life/mocap-clips.py`: angles measured from joint positions in the body's own frame, every complete stride averaged into one loop of 48 samples, ends blended. Read by TOWN (`people.js` P.gait) and RUSH (`lib/life/motion/gait.ts`) |

Owner approval, 29.10.2026: the pack is approved as a whole, including the natural yellow in it. No real people, no logos.

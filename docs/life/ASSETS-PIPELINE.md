# LIFE character assets: the pipeline

Skinned human characters with facial morph targets for LIFE (three.js 0.169), built for free on the GitHub runner.
Nothing here is wired into the game yet: the output is a kit under `public/life/assets/` and a manifest.

## What runs

Workflow `.github/workflows/life-assets.yml` (one job). It runs on a push to `claude/life-assets` that touches
`scripts/life/assets/**` or the workflow, and on dispatch (`only` = character ids, comma-separated). It commits its
output back to the branch it ran on, never to main.

| Step | Script | Does |
|---|---|---|
| packs | `fetch_packs.sh`, `packs.txt` | downloads the MakeHuman asset packs once (cached by `actions/cache`) and unpacks them |
| catalogue | `catalogue.py` | `docs/life/assets-catalogue/`: every asset with its own licence line, and thumbnail sheets |
| clips | `build_clips.py`, `lifekit.py` | the animation clips on the shared skeleton, one GLB |
| cast | `build_cast.py`, `cast.json` | one GLB per character, and the Cycles previews |
| finish | `finish.py` | meshopt compression, `manifest.json`, the preview sheets |

Tools: Blender as the `bpy` wheel (5.3.0, GPL, a tool only), MPFB2 at a pinned commit (GPL code, CC0 data; its
licence states that output carries no claim), glTF-Transform through `npx` (MIT). No dependency is added to the app.

To re-run: push a change under `scripts/life/assets/`, or run the workflow by hand from the Actions tab on the
branch. To change a character, edit its recipe in `cast.json` (macro values, hair, clothes, default tint).
To add a pack, add a line to `packs.txt`.

## What comes out

- `public/life/assets/cast/<id>.glb`: boy, girl, teen, father, father_heavy, mother, mother_heavy, grandfather, grandmother.
- `public/life/assets/clips/clips.glb`: the skeleton and every clip, no mesh.
- `public/life/assets/manifest.json`: per asset: file, bytes, triangles, bones, morph target names, clips, tint, sources, licences.
- `docs/life/assets-preview/*.jpg`: per character front, back, talking, portrait with the smile applied, a sheet; the cast sheets; father and boy with the hand on the shoulder; one still per clip.

### Skeleton

MPFB2's `game_engine` rig (Unreal-mannequin names), the same 53 bones in every character, plus `eye_l` and `eye_r`
under `head`: `Root, pelvis, spine_01..03, neck_01, head, clavicle_l/r, upperarm_l/r, lowerarm_l/r, hand_l/r,
thumb|index|middle|ring|pinky_01..03_l/r, thigh_l/r, calf_l/r, foot_l/r, ball_l/r`. The list is in the manifest.
glTF axes: +Y up, the character faces +Z, metres. Up to four weights a vertex.

### Face

`Head` (cut from `Body` so only the face carries morph data), `Lashes`, `Brows`, `Teeth` and `Tongue` carry
the 52 ARKit face units (`mouthSmileLeft`, `eyeBlinkLeft`, `jawOpen`, `browInnerUp`, ...) and the Meta visemes
(`viseme_aa`, `viseme_E`, `viseme_O`, `viseme_PP`, ...). Set an influence by name on every mesh that has it.
Ready-made mixes (smile, laugh, brows_up, worried, brows_down, blink, viseme_A/E/O/M) are in `manifest.face.expressions`.
The eyeballs are their own mesh on the two eye bones: turn the bones to look, the `eyeLook*` morphs move the lids.

### Tint

The top garment is a separate primitive whose material is named `tint_top` (`extras.tint = "top"`). Its texture is
neutral light grey there, keeping only the cloth's shading, so no print or logo survives. `material.color.set(club)`
multiplies it. The colour in the file is only a default.

### Clips

`idle, walk, run, carry, turn, talk_1, talk_2, talk_3, wave, cheer, sit, crouch_to_child, hand_on_shoulder, hug`, 30 fps.
Tracks are bone rotations in parent space and the position of `pelvis` only, so a clip fits every body: the rotations
carry the pose, and the pelvis position is scaled by `character.hipHeight / clips.hipHeight` (both in the manifest).
Walk, run and carry are in place (the game moves the character); `turn` rotates `Root` by 90 degrees.
`hand_on_shoulder` is written for an adult beside a child of about 1.35 m at his right; for another height, aim the hand with IK.

## Loading in three.js

```js
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
const [cast, clips] = await Promise.all([loader.loadAsync('/life/assets/cast/father.glb'), loader.loadAsync('/life/assets/clips/clips.glb')])
const man = SkeletonUtils.clone(cast.scene)                 // one instance; never Object3D.clone() a skinned mesh
man.traverse(o => { if (o.isMesh && o.material.name === 'tint_top') { o.material = o.material.clone(); o.material.color.set(clubColour) } })
const face = (name, v) => man.traverse(o => { const i = o.morphTargetDictionary?.[name]; if (i !== undefined) o.morphTargetInfluences[i] = v })
const mixer = new THREE.AnimationMixer(man)
const k = asset.hipHeight / manifestClips.hipHeight         // from manifest.json
const clip = clips.animations.find(a => a.name === 'walk').clone()
clip.tracks.forEach(t => { if (t.name === 'pelvis.position') t.values = t.values.map(v => v * k) })
mixer.clipAction(clip).play()
```

Textures are WebP inside the GLB (1024 px at most), geometry is `EXT_meshopt_compression`. No Draco, no KTX2.

## Licences

| What | Source | Licence |
|---|---|---|
| Body mesh, macro and detail targets, rig, weights | MPFB2 `src/mpfb/data` (makehumancommunity/mpfb2) | CC0 1.0 (`LICENSE.ASSETS.md`); section D of `LICENSE.md`: no claim on output |
| Skins, eyes, teeth, tongue, brows, lashes, system hair, suits, shoes | pack `makehuman_system_assets` | CC0 |
| T-shirts, sweater, trousers, skirts | packs `shirts01`, `pants01`, `skirts01` (also fetched: `hair01`, `dress01`, `shoes01`) | CC0 per asset |
| ARKit face units, Meta visemes | packs `faceunits01`, `visemes02` (Mika Suominen), vendored in `scripts/life/assets/vendor/` | CC0 |
| Walk, run, carry | CMU Graphics Lab Motion Capture Database via `public/life/town/mocap.json` | free to use and redistribute, credit requested |
| Other clips | written in `lifekit.py` | this repository |

The pack pages say CC0, but some files inside the "CC0" community packs carry an AGPL or CC-BY line of their own
(for example the frankyaye skirts and several hair pieces). `build_cast.py` therefore reads each asset's own licence
line and its pack record and refuses anything that is not CC0; the manifest records both statements for every part used.
Pack index: https://static.makehumancommunity.org/assets/assetpacks.html

Skin that a garment covers is deleted from `Body` (one ring is kept under every opening), so cloth cannot show skin through it when it bends.

No real person's likeness: every face is MakeHuman macro values. No logo or text: tinted tops are flattened to grey.

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
| clips | `build_clips.py`, `motion.py`, `lifekit.py` | every scene in `motion.py` played on reference bodies (adult, second adult, 1.35 m child) and baked onto the shared skeleton, one GLB |
| cast | `build_cast.py`, `refine.py`, `cast.json` | one GLB and one LOD GLB per character, and the Cycles previews (`strips.py` renders the motion strips) |
| finish | `finish.py` | meshopt compression, `manifest.json`, the preview sheets |

Tools: Blender as the `bpy` wheel (5.3.0, GPL, a tool only), MPFB2 at a pinned commit (GPL code, CC0 data; its
licence states that output carries no claim), glTF-Transform through `npx` (MIT). No dependency is added to the app.

To re-run: push a change under `scripts/life/assets/`, or run the workflow by hand from the Actions tab on the
branch. To change a character, edit its recipe in `cast.json` (macro values, hair, clothes, default tint).
To add a pack, add a line to `packs.txt`.

## What comes out

- `public/life/assets/cast/<id>.glb`: boy, girl, teen, father, father_heavy, mother, mother_heavy, grandfather, grandmother.
- `public/life/assets/cast/<id>-lod1.glb`: the far-crowd copy of each (see LOD).
- `public/life/assets/clips/clips.glb`: the skeleton and every clip, no mesh.
- `public/life/assets/manifest.json`: per asset: file, bytes, triangles, bones, morph target names, clips, tint, sources, licences.
- `docs/life/assets-preview/*.jpg`: per character front, back, talking, resting portrait, smile; `cast-row.jpg` / `cast-row-faces.jpg` (everyone, resting faces);
  `father-before-after.jpg`; `hand-poses.jpg`; `strip-<scene>.jpg` (8 frames of each scene on the real father and boy); `lod-vs-full.jpg` (10 m and 3 m);
  `accessories-sheet.jpg` (plain / beanie + round glasses + beard / flat cap + square glasses + moustache / second hair); `clips-sheet.jpg` (one still per clip).

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

Resting faces are warm by construction: a small resting mix (a lifted mouth corner, a touch of cheek and inner brow) is
folded into the base shape of every face mesh (`cast.json` → `resting`, per character `restingFace.baked` in the
manifest), so with every morph at 0 the face already rests kindly, and every morph still moves it by its full amount.
The father also has a softer, set-back brow ridge, larger eyes and lifted mouth corners (MakeHuman targets in his recipe).
Brows are fuller: their texture's alpha is grown and feathered. Teeth are reduced to about 1k triangles; their morphs
and weights are carried from the full set vertex by vertex.

### Tint

The top garment is a separate primitive whose material is named `tint_top` (`extras.tint = "top"`). Its texture is
neutral light grey there, keeping only the cloth's shading, so no print or logo survives. `material.color.set(club)`
multiplies it. The colour in the file is only a default.

- Jackets: the shirt under a jacket is its own region, `tint_inner`; `tint_top` is then the jacket outside.
  (Found by casting a ray outward from each tinted island: an island that sits under another one is the inner one.)
- Tops without a jacket get `tint_trim`: a band about 2 cm wide round the collar and the cuffs (every opening but the hem).
- Stripes and hoops: every tinted primitive has a second UV set (`TEXCOORD_1`, three.js `uv1`): u runs round the body
  (0.5 = front centre, 0 and 1 = back centre), v = 0 at the hip joints and 1 at the shoulder joints. Put a band texture
  on `texture.channel = 1` with `RepeatWrapping`; hoops repeat along v, vertical stripes along u.

### Optional meshes (accessories, hair)

Inside each character GLB, skinned 100 % to `head` and fitted to that head, all to be hidden on load and shown per instance:
`Acc_cap_flat`, `Acc_beanie`, `Acc_glasses_round`, `Acc_glasses_square`, and for adults `Acc_moustache`, `Acc_beard`
(cut from the face skin and lifted a few millimetres, so they carry the mouth and jaw morphs: play the same influences on them).
`Hair2` is a second hairstyle for every adult (no visual twins); `Hair_hat` is the hair pressed under a hat: show it
instead of `Hair` when a cap or beanie is on. Node `extras.accessory` names each. The caps, beanie and glasses are modelled
by script (`refine.py`), because the CC0 packs hold no cap, beanie or glasses of acceptable quality; the facial hair uses
the character's own CC0 skin mesh and a generated strand texture.

### LOD

`cast/<id>-lod1.glb`: the same 55-bone skeleton (so the same clips play), one mesh, one material, about 4k triangles,
a 512 px atlas of every texture (alpha-tested for the hair). The tint regions are a vertex mask in `COLOR_0`
(R = tint_top, G = tint_inner, B = tint_trim). Keep `vertexColors` off and mix the club colours in a shader:
`diffuseColor.rgb *= mix(vec3(1.), uTop, vColor.r) * mix(vec3(1.), uInner, vColor.g) * mix(vec3(1.), uTrim, vColor.b);`

### Clips

30 fps; the list with lengths, loop flags and what each is lives in `manifest.json` (asset `clips`). Tracks are bone
rotations in parent space and the position of `pelvis` only, so a clip fits every body: scale the pelvis position by
`character.hipHeight / clips.hipHeight` (child clips are stored in the same adult units, so the same rule holds).

- Locomotion (`walk`, `run`, `carry`, `walk_child`, `hold_hand_walk_adult`, `hold_hand_walk_child`) is in place and starts
  on the LEFT heel at frame 0. Each records `contacts: {l: [...], r: [...]}` (heel-strike frames), `stance` ([strike, toe-off])
  and `speed` (m/s for the reference body) for blend sync and foot planting.
- Two-person clips record `pair`: the other body's clip and where its root stands (`[left m, forward m, yaw°]` in this body's
  frame) or an attach rule. `hold_hand_walk_*`: child 52 cm to the adult's right; two adult strides = three child strides in
  2.5 s, so the hands stay together. `child_on_shoulders_rider`: put the rider's pelvis on the carrier's `neck_01` (14 cm
  back, 5 cm up). `hug_partner`: both adults play it, facing, 42 cm apart. `hug_partner_adult` + `hug_partner_child`: 36 cm.
  `ruffle_hair` (child 35 cm right, 28 cm ahead), `put_scarf_on` (child 50 cm ahead, facing). For other heights aim the
  hands with IK from these.
- Contacts between bodies (hands on a head, a back, a shin, held hands) were placed with analytic two-bone IK on the
  reference bodies, so they are exact for the father's and boy's builds.
- Hands: every clip has a relaxed natural curl (more toward the little finger). `hand_relaxed`, `hand_fist`, `hand_point`,
  `hand_thumb_up`, `hand_palm_down_rest` carry finger tracks only (both hands): play them as an override layer, or make
  them additive against `hand_relaxed`.
- Timing is keyed with eased transitions; arms trail the trunk and the head leads, for overlap and follow-through.

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
| Other clips | keyframed in `motion.py` | this repository |
| Caps, beanie, glasses, facial-hair strands, LOD atlas | modelled / generated by `refine.py` | this repository |

The pack pages say CC0, but some files inside the "CC0" community packs carry an AGPL or CC-BY line of their own
(for example the frankyaye skirts and several hair pieces). `build_cast.py` therefore reads each asset's own licence
line and its pack record and refuses anything that is not CC0; the manifest records both statements for every part used.
Pack index: https://static.makehumancommunity.org/assets/assetpacks.html

Skin that a garment covers is deleted from `Body` (one ring is kept under every opening), so cloth cannot show skin through it when it bends.

No real person's likeness: every face is MakeHuman macro values. No logo or text: tinted tops are flattened to grey.

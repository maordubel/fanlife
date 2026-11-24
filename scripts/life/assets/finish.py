#!/usr/bin/env python3
"""
LIFE character assets: from raw GLBs to what the game loads.

  python3 finish.py <work dir> <repo root>

For every raw GLB: hair/brows/lashes become alpha-tested and double-sided, the clips lose every track but bone
rotations and the pelvis position (so one clip fits every body), then glTF-Transform (npx, MIT) prunes, dedups and
compresses with EXT_meshopt_compression. Writes public/life/assets/** and manifest.json, and the preview sheets.
"""
import json, os, shutil, struct, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw

WORK, ROOT = Path(sys.argv[1]), Path(sys.argv[2]); HERE = Path(__file__).resolve().parent
OUT = ROOT / 'public/life/assets'; PREV = ROOT / 'docs/life/assets-preview'
for d in (OUT / 'cast', OUT / 'clips', PREV): d.mkdir(parents=True, exist_ok=True)
SPEC = json.loads((HERE / 'cast.json').read_text())
GT = ['npx', '-y', '@gltf-transform/cli@4.1.1']


def read_glb(p):
    d = Path(p).read_bytes(); n = struct.unpack('<I', d[12:16])[0]
    return json.loads(d[20:20 + n]), d[20 + n:]

def write_glb(p, j, rest):
    b = json.dumps(j, separators=(',', ':')).encode(); b += b' ' * (-len(b) % 4)
    Path(p).write_bytes(b'glTF' + struct.pack('<II', 2, 12 + 8 + len(b) + len(rest)) + struct.pack('<I', len(b)) + b'JSON' + b + rest)

def squeeze(src, dst):
    tmp = WORK / 'tmp.glb'
    subprocess.run(GT + ['prune', str(src), str(tmp), '--keep-leaves', 'true', '--keep-solid-textures', 'true'], check=True, stdout=subprocess.DEVNULL)
    subprocess.run(GT + ['dedup', str(tmp), str(tmp)], check=True, stdout=subprocess.DEVNULL)
    subprocess.run(GT + ['meshopt', str(tmp), str(dst), '--level', 'medium'], check=True, stdout=subprocess.DEVNULL)


built = json.loads((WORK / 'cast-built.json').read_text()) if (WORK / 'cast-built.json').exists() else {}
old = json.loads((OUT / 'manifest.json').read_text()) if (OUT / 'manifest.json').exists() else {'assets': []}
assets = {a['id']: a for a in old.get('assets', [])}
def fix_materials(j):
    for m in j.get('materials', []):
        ex = m.get('extras') or {}
        if ex.get('alpha') == 'mask': m['alphaMode'] = 'MASK'; m['alphaCutoff'] = 0.35; m['doubleSided'] = True
        elif m.get('alphaMode') == 'BLEND' and not m['name'].endswith(('lashes', 'brows', 'hair')): m.pop('alphaMode')
        if m['name'] in ('lod',): m['alphaMode'] = 'MASK'; m['alphaCutoff'] = 0.4


LIMIT = 1.6 * 1024 * 1024
for cid, meta in built.items():
    j, rest = read_glb(WORK / 'raw' / f'{cid}.glb'); fix_materials(j)
    write_glb(WORK / 'fix.glb', j, rest); dst = OUT / 'cast' / f'{cid}.glb'; squeeze(WORK / 'fix.glb', dst)
    fj, _ = read_glb(dst)
    lod = None
    if (WORK / 'raw' / f'{cid}-lod1.glb').exists():
        lj, lr = read_glb(WORK / 'raw' / f'{cid}-lod1.glb'); fix_materials(lj); write_glb(WORK / 'fix.glb', lj, lr)
        ld = OUT / 'cast' / f'{cid}-lod1.glb'; squeeze(WORK / 'fix.glb', ld)
        lod = {'file': f'cast/{cid}-lod1.glb', 'bytes': ld.stat().st_size, 'triangles': meta.get('lod', {}).get('triangles'), 'materials': 1,
               'atlas': '512 px WebP, alpha-tested (hair)', 'tintMask': 'COLOR_0: R = tint_top, G = tint_inner, B = tint_trim (1 = club colour), A = 1'}
    if dst.stat().st_size > LIMIT: print(f'::warning::{cid}.glb is {dst.stat().st_size // 1024} KB, over the 1.6 MB budget')
    assets[cid] = {'id': cid, 'kind': 'character', 'label': meta['label'], 'file': f'cast/{cid}.glb', 'bytes': dst.stat().st_size, 'triangles': meta['triangles'],
                   'bones': len(meta['bones']), 'height': meta['height'], 'hipHeight': meta['hipHeight'], 'eyes': meta.get('eyes'), 'meshes': meta['meshes'],
                   'morphTargets': meta['morphs'], 'morphMeshes': [n for n, m in meta['meshes'].items() if m['morphs']], 'materials': [m['name'] for m in fj.get('materials', [])],
                   'textures': len(fj.get('images', [])), 'tint': dict(meta['tint'], material='tint_top', regions=meta.get('tintRegions', ['tint_top'])),
                   'lod1': lod, 'teethTriangles': meta.get('teethTriangles'),
                   'restingFace': {'baked': meta.get('restingBaked', {}), 'recommendedIdleMix': {}, 'note': 'already folded into the base shape; leave every morph at 0 for the resting face'},
                   'optionalMeshes': meta.get('optional', []), 'accessories': meta.get('accessories', {}),
                   'sources': meta['sources'] + [{'what': 'accessories (caps, glasses, facial hair), LOD, teeth reduction, brow thickening', 'licence': 'made by script in scripts/life/assets/refine.py (this repository), from the CC0 parts above'}],
                   'licence': 'CC0 1.0 (every part; see sources)',
                   'sourceUrl': 'https://static.makehumancommunity.org/assets/assetpacks.html', 'notes': meta['notes']}
    print(cid, dst.stat().st_size // 1024, 'KB', meta['triangles'], 'tris')

clips = None
if (WORK / 'raw/clips.glb').exists():
    cm = json.loads((WORK / 'clips.json').read_text()); j, rest = read_glb(WORK / 'raw/clips.glb')
    names = {i: n.get('name') for i, n in enumerate(j['nodes'])}
    fingers = set(cm.get('fingerBones', []))
    for a in j.get('animations', []):
        a['channels'] = [c for c in a['channels'] if c['target']['path'] == 'rotation' or (c['target']['path'] == 'translation' and names[c['target']['node']] == 'pelvis')]
        if cm['clips'].get(a['name'], {}).get('tracks') == 'fingers':
            a['channels'] = [c for c in a['channels'] if names[c['target']['node']] in fingers]
        used = sorted({c['sampler'] for c in a['channels']}); remap = {s: i for i, s in enumerate(used)}
        a['samplers'] = [a['samplers'][s] for s in used]
        for c in a['channels']: c['sampler'] = remap[c['sampler']]
    write_glb(WORK / 'fix.glb', j, rest); dst = OUT / 'clips' / 'clips.glb'; squeeze(WORK / 'fix.glb', dst)
    fj, _ = read_glb(dst)
    clips = {'id': 'clips', 'kind': 'animation', 'file': 'clips/clips.glb', 'bytes': dst.stat().st_size, 'fps': 30, 'bones': len(cm['bones']), 'hipHeight': cm['hipHeight'], 'childHipHeight': cm.get('childHipHeight'),
             'contacts': 'locomotion clips: contacts.l / contacts.r = heel-strike frames, stance = [strike, toe-off] frames, speed = ground speed in m/s for the reference body (scale by hipHeight); walk and run start on the left heel at frame 0',
             'pairs': 'two-person clips: pair.<other>.at = (x metres to the left, metres forward, yaw degrees) of the other body\'s root in this body\'s frame, or an attach rule (bone, offset)',
             'clips': [dict(name=a['name'], **cm['clips'].get(a['name'], {})) for a in fj.get('animations', [])],
             'tracks': 'bone rotations (parent space) for every bone, and the position of `pelvis` only; scale the pelvis position by character.hipHeight / clips.hipHeight',
             'sources': [{'what': 'walk, run, carry (legs and trunk)', 'source': 'CMU Graphics Lab Motion Capture Database, mocap.cs.cmu.edu, BVH conversion by B. Hahne (cgspeed); via public/life/town/mocap.json',
                          'licence': 'free to use, copy, modify and redistribute, including commercially; credit requested (NSF EIA-0196217)'},
                         {'what': 'every other clip', 'source': 'keyframed by script in scripts/life/assets/motion.py (poses, eased keys, IK contacts)', 'licence': 'made in this repository'}]}
    assets['clips'] = clips; print('clips', dst.stat().st_size // 1024, 'KB', len(clips['clips']))

manifest = {'version': 1, 'generator': 'scripts/life/assets (GitHub Actions: LIFE · character assets)',
            'skeleton': {'name': 'MPFB2 game_engine (Unreal-mannequin names) + eye_l, eye_r', 'bones': next((m['bones'] for m in built.values()), old.get('skeleton', {}).get('bones')),
                         'axes': 'glTF: +Y up, the character faces +Z, metres'},
            'tint': {'convention': 'the top garment is its own primitive with a material named `tint_top` (extras.tint = "top"). Its texture there is neutral light grey with the cloth shading only; multiply it by a club colour with material.color.set(colour). The exported colour is just a default.',
                     'regions': {'tint_top': 'the outer top (a jacket, where there is one)', 'tint_inner': 'the shirt under a jacket', 'tint_trim': 'collar and cuffs of a top without a jacket (a band about 2 cm wide)'},
                     'stripes': 'every tinted primitive carries a second UV set (TEXCOORD_1, Blender name tint_uv): u runs round the body (0.5 = front centre, 0/1 = back centre), v = 0 at the hip joints and 1 at the shoulder joints. For hoops, a texture with horizontal bands on texture.channel = 1 with RepeatWrapping (repeat.y = number of hoops); for vertical stripes, bands along u. Sleeves follow the body\'s height, so hoops run round them too.'},
            'accessories': {'convention': 'optional meshes inside each character GLB, skinned 100 % to the head bone (facial hair also carries the mouth and jaw morphs): Acc_cap_flat, Acc_beanie, Acc_glasses_round, Acc_glasses_square and, for adults, Acc_moustache and Acc_beard; Hair2 is a second hairstyle (adults), Hair_hat is the hair pressed under a hat. Node extras.accessory names them. Hide them all on load (mesh.visible = false) and show the ones an instance wears; with a hat show Hair_hat instead of Hair.',
                            'licence': 'modelled by script in scripts/life/assets/refine.py (no CC0 cap, beanie or glasses asset of acceptable quality was in the packs), fitted to each head'},
            'lod': {'convention': 'cast/<id>-lod1.glb: the same 55-bone skeleton (the same clips play), one mesh, one material, about 4k triangles, a 512 px atlas; the tint regions are in COLOR_0 (R top, G inner, B trim). Colour it with a shader that mixes the club colour in by that mask, e.g. onBeforeCompile: diffuseColor.rgb *= mix(vec3(1.), uTop, vColor.r) * mix(vec3(1.), uInner, vColor.g) * mix(vec3(1.), uTrim, vColor.b) (and keep vertexColors off so the mask itself does not tint).'},
            'face': {'morphTargets': 'ARKit face units (52 names, MPFB faceunits01, CC0) and Meta/Oculus visemes (viseme_*, MPFB visemes02, CC0), on Head, Lashes, Brows, Teeth, Tongue; set the same influence by name on every mesh that has it',
                     'eyes': 'bones eye_l and eye_r turn the eyeballs; the eyeLook* morphs move the lids with them', 'expressions': SPEC['expressions']},
            'assets': [assets[k] for k in sorted(assets)]}
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1) + '\n')

# ---- previews
src = WORK / 'preview'
if src.is_dir():
    if not (PREV / 'father-portrait-before.jpg').exists() and (PREV / 'father-portrait.jpg').exists(): shutil.copy(PREV / 'father-portrait.jpg', PREV / 'father-portrait-before.jpg')
    for f in src.glob('*.jpg'):
        if not f.name.startswith(('clip-', 'acc-', 'lod-')): shutil.copy(f, PREV / f.name)
    def sheet(files, out, cols, label=True, cell=None):
        ims = [(f, Image.open(f)) for f in files if Path(f).exists()]
        if not ims: return
        w, h = cell or ims[0][1].size; rows = (len(ims) + cols - 1) // cols
        S_ = Image.new('RGB', (cols * w, rows * h), (30, 30, 30)); d = ImageDraw.Draw(S_)
        for i, (f, im) in enumerate(ims):
            S_.paste(im.resize((w, h)), ((i % cols) * w, (i // cols) * h))
            if label: d.text(((i % cols) * w + 8, (i // cols) * h + 6), Path(f).stem.replace('clip-', ''), fill=(20, 20, 20))
        S_.save(out, quality=84)
    ids = [c['id'] for c in SPEC['cast']]
    for cid in ids:
        sheet([src / f'{cid}-front.jpg', src / f'{cid}-back.jpg', src / f'{cid}-talk.jpg', src / f'{cid}-portrait.jpg'], PREV / f'{cid}-sheet.jpg', 4, cell=(576, 768))
    sheet([src / f'{cid}-front.jpg' for cid in ids], PREV / 'cast-sheet.jpg', 5, cell=(432, 576))
    sheet([src / f'{cid}-portrait.jpg' for cid in ids], PREV / 'cast-faces.jpg', 5, cell=(384, 384))
    sheet(sorted(src.glob('clip-*.jpg')), PREV / 'clips-sheet.jpg', 8)
    sheet([src / f'{cid}-smile.jpg' for cid in ids], PREV / 'cast-smiles.jpg', 5, cell=(384, 384))
    accs = []
    for cid in ids: accs += [src / f'acc-{cid}-{t}.jpg' for t in ('plain', 'beanie', 'cap', 'hair2')]
    sheet([a for a in accs if a.exists()], PREV / 'accessories-sheet.jpg', 4, cell=(384, 384))
    lods = []
    for cid in ids: lods += [src / f'lod-{cid}-{t}.jpg' for t in ('full', 'lod1', 'full-near', 'lod1-near')]
    sheet([l for l in lods if l.exists()], PREV / 'lod-vs-full.jpg', 8, cell=(240, 360))
    if (PREV / 'father-portrait-before.jpg').exists() and (src / 'father-portrait.jpg').exists():
        a, b = Image.open(PREV / 'father-portrait-before.jpg').resize((640, 640)), Image.open(src / 'father-portrait.jpg').resize((640, 640))
        W = Image.new('RGB', (1280, 670), (24, 24, 24)); W.paste(a, (0, 30)); W.paste(b, (640, 30)); d = ImageDraw.Draw(W)
        d.text((10, 8), 'father, before (23.11): the old portrait, with the smile morph applied', fill=(230, 230, 230)); d.text((650, 8), 'father, after: resting face, no morph applied (softer brow, larger eyes, baked resting smile, fuller brows)', fill=(230, 230, 230))
        W.save(PREV / 'father-before-after.jpg', quality=88)

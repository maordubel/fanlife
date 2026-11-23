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
for cid, meta in built.items():
    j, rest = read_glb(WORK / 'raw' / f'{cid}.glb')
    for m in j.get('materials', []):
        ex = m.get('extras') or {}
        if ex.get('alpha') == 'mask': m['alphaMode'] = 'MASK'; m['alphaCutoff'] = 0.35; m['doubleSided'] = True
        elif m.get('alphaMode') == 'BLEND' and not m['name'].endswith(('lashes', 'brows', 'hair')): m.pop('alphaMode')
    write_glb(WORK / 'fix.glb', j, rest); dst = OUT / 'cast' / f'{cid}.glb'; squeeze(WORK / 'fix.glb', dst)
    fj, _ = read_glb(dst)
    assets[cid] = {'id': cid, 'kind': 'character', 'label': meta['label'], 'file': f'cast/{cid}.glb', 'bytes': dst.stat().st_size, 'triangles': meta['triangles'],
                   'bones': len(meta['bones']), 'height': meta['height'], 'hipHeight': meta['hipHeight'], 'eyes': meta.get('eyes'), 'meshes': meta['meshes'],
                   'morphTargets': meta['morphs'], 'morphMeshes': [n for n, m in meta['meshes'].items() if m['morphs']], 'materials': [m['name'] for m in fj.get('materials', [])],
                   'textures': len(fj.get('images', [])), 'tint': dict(meta['tint'], material='tint_top'), 'sources': meta['sources'], 'licence': 'CC0 1.0 (every part; see sources)',
                   'sourceUrl': 'https://static.makehumancommunity.org/assets/assetpacks.html', 'notes': meta['notes']}
    print(cid, dst.stat().st_size // 1024, 'KB', meta['triangles'], 'tris')

clips = None
if (WORK / 'raw/clips.glb').exists():
    cm = json.loads((WORK / 'clips.json').read_text()); j, rest = read_glb(WORK / 'raw/clips.glb')
    names = {i: n.get('name') for i, n in enumerate(j['nodes'])}
    for a in j.get('animations', []):
        a['channels'] = [c for c in a['channels'] if c['target']['path'] == 'rotation' or (c['target']['path'] == 'translation' and names[c['target']['node']] == 'pelvis')]
        used = sorted({c['sampler'] for c in a['channels']}); remap = {s: i for i, s in enumerate(used)}
        a['samplers'] = [a['samplers'][s] for s in used]
        for c in a['channels']: c['sampler'] = remap[c['sampler']]
    write_glb(WORK / 'fix.glb', j, rest); dst = OUT / 'clips' / 'clips.glb'; squeeze(WORK / 'fix.glb', dst)
    fj, _ = read_glb(dst)
    clips = {'id': 'clips', 'kind': 'animation', 'file': 'clips/clips.glb', 'bytes': dst.stat().st_size, 'fps': 30, 'bones': len(cm['bones']), 'hipHeight': cm['hipHeight'],
             'clips': [dict(name=a['name'], **cm['clips'].get(a['name'], {})) for a in fj.get('animations', [])],
             'tracks': 'bone rotations (parent space) for every bone, and the position of `pelvis` only; scale the pelvis position by character.hipHeight / clips.hipHeight',
             'sources': [{'what': 'walk, run, carry (legs and trunk)', 'source': 'CMU Graphics Lab Motion Capture Database, mocap.cs.cmu.edu, BVH conversion by B. Hahne (cgspeed); via public/life/town/mocap.json',
                          'licence': 'free to use, copy, modify and redistribute, including commercially; credit requested (NSF EIA-0196217)'},
                         {'what': 'every other clip', 'source': 'keyframed by formula in scripts/life/assets/lifekit.py', 'licence': 'made in this repository'}]}
    assets['clips'] = clips; print('clips', dst.stat().st_size // 1024, 'KB', len(clips['clips']))

manifest = {'version': 1, 'generator': 'scripts/life/assets (GitHub Actions: LIFE · character assets)',
            'skeleton': {'name': 'MPFB2 game_engine (Unreal-mannequin names) + eye_l, eye_r', 'bones': next((m['bones'] for m in built.values()), old.get('skeleton', {}).get('bones')),
                         'axes': 'glTF: +Y up, the character faces +Z, metres'},
            'tint': {'convention': 'the top garment is its own primitive with a material named `tint_top` (extras.tint = "top"). Its texture there is neutral light grey with the cloth shading only; multiply it by a club colour with material.color.set(colour). The exported colour is just a default.'},
            'face': {'morphTargets': 'ARKit face units (52 names, MPFB faceunits01, CC0) and Meta/Oculus visemes (viseme_*, MPFB visemes02, CC0), on Head, Lashes, Brows, Teeth, Tongue; set the same influence by name on every mesh that has it',
                     'eyes': 'bones eye_l and eye_r turn the eyeballs; the eyeLook* morphs move the lids with them', 'expressions': SPEC['expressions']},
            'assets': [assets[k] for k in sorted(assets)]}
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1) + '\n')

# ---- previews
src = WORK / 'preview'
if src.is_dir():
    for f in src.glob('*.jpg'):
        if not f.name.startswith('clip-'): shutil.copy(f, PREV / f.name)
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
    sheet(sorted(src.glob('clip-*.jpg')), PREV / 'clips-sheet.jpg', 7)

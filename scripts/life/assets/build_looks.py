#!/usr/bin/env python3
"""
LIFE character assets: the looks. Every entry of looks.json becomes cast/look-<id>.glb (+ -lod1.glb), on the cast's
55-bone skeleton (the same clips play), with the face, hair, clothes and colours that entry describes.

  python3 build_looks.py <work dir> <shard>/<shards> [id,id,...]

A look is a cast.json recipe plus what build_cast.build() calls back into: garment cuts before the covered skin is
removed (_pre), colours after the tint regions (_post), hair grown on the head (hairgen.py) and the pieces made by
script (_extras: scarf, apron, bangles, backpack). Previews at dusk light: a 3/4 portrait and a full body per look, and
for the universal looks the same body in every region. Writes looks-built-<shard>.json for finish.py.
"""
import json, math, os, sys, traceback
from pathlib import Path

WORK = Path(sys.argv[1]); SHARD = sys.argv[2] if len(sys.argv) > 2 else '0/1'
ONLY = [x for x in (sys.argv[3] if len(sys.argv) > 3 else '').split(',') if x]
sys.argv = [sys.argv[0], str(WORK), '']          # build_cast reads its own argv at import
sys.path.insert(0, str(Path(__file__).resolve().parent))
import bpy
from mathutils import Vector
import build_cast as BC
import lifekit as K
import refine as R
import outfit as O
import motion as M

LOOKS = json.loads((K.HERE / 'looks.json').read_text())
REG = LOOKS['regions']
OUT = WORK / 'preview' / 'looks'; OUT.mkdir(parents=True, exist_ok=True)
HAIR_TEX = 0.62      # the hair atlas's mean grey (sRGB): a factor of colour / this gives the hair that colour
BROW_TEX = 0.55
FACIAL_TEX = 0.55


def lin1(x): return ((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92
def srgb1(x): x = max(0.0, min(1.0, x)); return 1.055 * x ** (1 / 2.4) - 0.055 if x > 0.0031308 else 12.92 * x
def ratio(target, base):
    """the linear factor that turns a texture of mean `base` (sRGB) into `target` (sRGB); returned as an sRGB triple for outfit.factor"""
    t = O.col(target); b = (base, base, base) if isinstance(base, float) else base
    return tuple(srgb1(min(1.0, lin1(x) / max(lin1(y), 1e-4))) for x, y in zip(t, b))
def lin3(c): return tuple(lin1(x) for x in O.col(c))


def age_macro(y):
    pts = [(1, 0.0), (11, 0.1875), (25, 0.5), (90, 1.0)]
    for (a0, m0), (a1, m1) in zip(pts, pts[1:]):
        if y <= a1: return m0 + (m1 - m0) * (y - a0) / (a1 - a0)
    return 1.0


def tones(lk):
    """skin, hair, brows, facial-hair colours (sRGB) for this look in its own region (canon looks carry their own)"""
    reg = REG[lk.get('region', 'mediterranean')]; child = lk['age'] < 16
    skin = lk.get('skin') or reg['skin_child' if child else 'skin']
    hair = lk['hair'].get('colour') or reg['hair_child' if child else 'hair']
    brows = lk.get('brows_colour') or (hair if lk['age'] > 50 and lk['hair'].get('colour') else reg['brows'])
    if lk['age'] > 50: brows = '#5c5650'
    return {'skin': skin, 'hair': hair, 'brows': brows, 'facial': hair}


def region_tones(lk, region):
    reg = REG[region]; child = lk['age'] < 16; t = tones(lk)
    out = {'skin': reg['skin_child' if child else 'skin'], 'brows': reg['brows']}
    if lk['age'] > 50:   # grey hair stays grey everywhere
        out.update(hair=t['hair'], facial=t['facial'], brows='#5c5650')
    else:
        out.update(hair=reg['hair_child' if child else 'hair'], facial=reg['hair'])
    return out


def factors(t):
    return {'skin': ratio(t['skin'], O.SKIN_REF), 'hair': ratio(t['hair'], HAIR_TEX), 'brows': ratio(t['brows'], BROW_TEX), 'facial': ratio(t['facial'], FACIAL_TEX)}


def skin_asset(lk):
    g = 'male' if lk['body']['gender'] > 0.5 else 'female'
    if lk['age'] < 30: return f'young_caucasian_{g}'
    if lk['age'] < 52: return f'middleage_caucasian_{g}'
    return f'old_caucasian_{g}'


def recipe(lk):
    b = lk['body']; t = tones(lk); fac = factors(t); out = lk['outfit']
    targets = {}
    for k, v in lk.get('face', {}).items():
        if k.startswith('lr-'): targets['l-' + k[3:]] = v; targets['r-' + k[3:]] = v
        else: targets[k] = v
    ph = {'gender': b['gender'], 'age': round(age_macro(lk['age']), 4), 'muscle': b.get('muscle', 0.5), 'weight': b.get('weight', 0.5), 'height': b.get('height', 0.5),
          'race': [0.06, 0.84, 0.10]}
    if b['gender'] < 0.5: ph['cupsize'] = b.get('cupsize', 0.4 if lk['age'] > 14 else 0.0)
    wear = list(lk.get('wear', []))
    want = set()
    for w in wear + list(lk.get('optional', [])):
        if w.startswith('Acc_'): want.add(w[4:])
        if w == 'Hair_hat': want.add('hair_hat')
    garments = [g['asset'] for g in out['garments']]
    c = {'id': 'look-' + lk['id'], 'label': lk['label'], 'pheno': ph, 'targets': targets, 'skin': skin_asset(lk), 'eyes': lk.get('eyes', 'brown'),
         'brows': lk.get('brows', 'eyebrow002'), 'hair': None, 'clothes': garments, 'tint': list(lin3(out['top'])),
         'hairgen': lk['hair'], 'hair_colour_lin': lin3(fac['hair']), 'seed': lk.get('seed', 1), 'wear': wear, 'acc_want': tuple(want),
         'facial': {'moustache': lk.get('facial') or 'plain', 'factor': fac['facial']}}
    if lk.get('resting'): c['resting'] = lk['resting']

    def part_of(parts, asset):
        return next((o for n, o in parts.items() if o.get('life_asset') == asset), None)

    def pre(rig, parts, meta):
        H = O.heights(rig)
        for g in out['garments']:
            o = part_of(parts, g['asset'])
            if o is None: meta['notes'].append(f"garment {g['asset']} not found for cuts"); continue
            if g.get('keep'): O.keep(o, rig, g['keep'])
            if g.get('hem'):
                z = {'below_knee': H['knee'] - 0.075 * (H['neck'] - H['ankle']) / 1.45, 'shorts': H['knee'] + 0.09 * (H['neck'] - H['ankle']) / 1.45}[g['hem']]
                O.hem(o, z, rig=rig)

    def post(rig, parts, meta):
        for n, o in parts.items():
            if not n.startswith('Clothes'): continue
            for m in o.data.materials:
                if not m: continue
                if m.name == 'tint_top': O.factor(m, out['top'])
                if m.name == 'tint_inner': O.factor(m, out.get('inner', '#f2efe8'))
            if out.get('bands') and any(m and m.name == 'tint_top' for m in o.data.materials): meta['bands'] = O.bands(o, rig, out['bands'])
            for m in o.data.materials:
                if m and m.name == 'tint_trim': O.factor(m, out.get('trim', out['top']))
            asset = o.get('life_asset', '')
            if out.get('skirt') and 'skirt' in asset:
                O.recolour(o, 'all', out['skirt'], rig, flat=out.get('skirt_flat', False))
            elif out.get('bottom'):
                O.recolour(o, 'bottom', out['bottom'], rig, flat=out.get('bottom_flat', False))
        if out.get('shoes') and 'Shoes' in parts: O.recolour(parts['Shoes'], 'all', out['shoes'], rig, strength=0.85)
        sk = parts['Body'].material_slots[0].material if parts['Body'].material_slots else None
        if sk: O.normalise(sk); O.factor(sk, fac['skin'])
        if 'Brows' in parts and parts['Brows'].material_slots:
            bm_ = parts['Brows'].material_slots[0].material; O.normalise(bm_, grey=True); O.factor(bm_, fac['brows'])

    def extras(rig, parts, meta):
        made = {}
        for x in lk.get('extras', []):
            try:
                if x == 'scarf': made['scarf'] = O.scarf(rig, parts, child=lk['age'] < 16)
                elif x == 'apron': made['apron'] = O.apron(rig, parts)
                elif x == 'bangles': made['bangles'] = O.bangles(rig, parts)
                elif x == 'backpack': made['backpack'] = O.backpack(rig, parts)
            except Exception as e: traceback.print_exc(); meta['notes'].append(f'{x}: {e}')
        return made

    c['_pre'], c['_post'], c['_extras'] = pre, post, extras
    return c


# ------------------------------------------------------------------------------------------------ dusk light
def dusk(samples=None):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples or int(os.environ.get('LIFE_LOOK_SAMPLES', '48')); sc.cycles.use_denoising = True
    sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 90; sc.render.film_transparent = False
    for vt in ('AgX', 'Filmic'):
        try: sc.view_settings.view_transform = vt; break
        except Exception: pass
    try: sc.view_settings.look = 'AgX - Medium High Contrast'
    except Exception: pass
    w = bpy.data.worlds.new('dusk'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.26, 0.22, 0.34, 1); bg.inputs[1].default_value = 0.55
    def light(name, typ, loc, energy, size, colour, aim=(0, 0, 1.1)):
        d = bpy.data.lights.new(name, typ); d.energy = energy; d.color = colour
        if typ == 'AREA': d.size = size
        if typ == 'SUN': d.angle = math.radians(2.5)
        o = bpy.data.objects.new(name, d); sc.collection.objects.link(o); o.location = loc
        o.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); return o
    light('sun', 'SUN', (-3.2, -3.6, 1.55), 3.2, 0, (1.0, 0.56, 0.30))           # low evening sun from the front-right
    light('sky', 'AREA', (3.0, -2.4, 2.6), 140, 4.0, (0.58, 0.66, 1.0))          # the blue of the sky from the left
    light('rim', 'AREA', (1.2, 3.0, 2.4), 260, 2.0, (1.0, 0.72, 0.5))
    light('bounce', 'AREA', (0, -2.2, 0.2), 25, 3.0, (1.0, 0.75, 0.55))
    me = bpy.data.meshes.new('floor'); me.from_pydata([(-30, -30, 0), (30, -30, 0), (30, 30, 0), (-30, 30, 0)], [], [(0, 1, 2, 3)])
    fl = bpy.data.objects.new('floor', me); sc.collection.objects.link(fl)
    m = bpy.data.materials.new('floor'); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.34, 0.27, 0.23, 1); b.inputs['Roughness'].default_value = 0.85; me.materials.append(m)
    me2 = bpy.data.meshes.new('wall'); me2.from_pydata([(-30, 6, 0), (30, 6, 0), (30, 6, 30), (-30, 6, 30)], [], [(0, 1, 2, 3)])
    wl = bpy.data.objects.new('wall', me2); sc.collection.objects.link(wl)
    m2 = bpy.data.materials.new('wall'); m2.use_nodes = True; b2 = m2.node_tree.nodes['Principled BSDF']
    b2.inputs['Base Color'].default_value = (0.30, 0.24, 0.30, 1); b2.inputs['Roughness'].default_value = 1.0; me2.materials.append(m2)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    return cam


def look_materials(parts):
    """the materials a region recolours, by role"""
    mats = {}
    if 'Body' in parts and parts['Body'].material_slots: mats['skin'] = parts['Body'].material_slots[0].material
    if 'Hair' in parts and parts['Hair'].material_slots: mats['hair'] = parts['Hair'].material_slots[0].material
    if 'Brows' in parts and parts['Brows'].material_slots: mats['brows'] = parts['Brows'].material_slots[0].material
    for n in ('Acc_moustache', 'Acc_beard'):
        if n in parts and parts[n].material_slots: mats.setdefault('facial', parts[n].material_slots[0].material)
    return mats


def set_tones(mats, fac):
    for k, m in mats.items():
        if k in fac: O.factor(m, fac[k])


def previews(lk, rig, parts, P, cam, meta):
    shown = set(lk.get('wear', []))
    for n, o in parts.items():
        if n.startswith(('Acc_', 'Hair2', 'Hair_hat', 'Look_')): o.hide_render = n not in shown
    if 'Hair_hat' in shown and 'Hair' in parts: parts['Hair'].hide_render = True
    objs = [o for n, o in parts.items() if not o.hide_render]
    H = max((o.matrix_world @ Vector(co)).z for o in objs for co in o.bound_box)
    P.apply(M.stand(1.0)); BC.set_keys(list(parts.values()), {})
    hb = P.rig.pose.bones['head']; eye = hb.head.z + (H - hb.head.z) * 0.30
    lid = lk['id']
    BC.shoot(cam, (hb.head.x, hb.head.y - 0.03, eye), 0.95 + (H - hb.head.z) * 1.6, 28, 85, OUT / f'{lid}-portrait.jpg', (720, 720), rise=0.03)
    BC.shoot(cam, (0, 0, H * 0.52), H * 2.9 + 0.7, 22, 70, OUT / f'{lid}-full.jpg', (600, 800))
    if lk['family'] == 'universal':
        mats = look_materials(parts); base = factors(tones(lk))
        for region in REG:
            set_tones(mats, factors(region_tones(lk, region)))
            BC.shoot(cam, (0, 0, H * 0.55), H * 2.6 + 0.6, 22, 70, OUT / f'region-{region}-{lid}.jpg', (360, 480))
        set_tones(mats, base)


def main():
    i, n = (int(x) for x in SHARD.split('/'))
    todo = [lk for k, lk in enumerate(LOOKS['looks']) if (k % n == i) and (not ONLY or lk['id'] in ONLY)]
    done = {}
    for lk in todo:
        K.wipe(); print('==== look', lk['id'], flush=True)
        try:
            c = recipe(lk)
            rig, parts, P, meta = BC.build(c)
            mats = look_materials(parts)
            meta['look'] = {k: lk[k] for k in ('id', 'family', 'role', 'age', 'decade', 'region', 'label') if k in lk}
            if lk.get('club'): meta['look']['club'] = lk['club']
            if lk.get('name'): meta['look']['name'] = lk['name']
            meta['look']['materials'] = {k: m.name for k, m in mats.items()}
            meta['look']['tones'] = tones(lk)
            if lk['family'] == 'universal':
                meta['look']['regionVariants'] = {r: {'tones': region_tones(lk, r), 'baseColorFactor': {k: [round(x, 4) for x in lin3(v)] for k, v in factors(region_tones(lk, r)).items()}} for r in REG}
            if os.environ.get('LIFE_NO_RENDER') != '1':
                cam = dusk(); previews(lk, rig, parts, P, cam, meta)
            meta.pop('_lod', None); done[c['id']] = meta
            print('==== done', lk['id'], meta['triangles'], 'tris', meta.get('hairTriangles'), 'hair tris', meta['notes'], flush=True)
        except Exception:
            traceback.print_exc(); print('==== FAILED', lk['id'], flush=True)
    (WORK / f'looks-built-{i}.json').write_text(json.dumps(done, indent=1))
    if todo and not done: sys.exit(1)


if __name__ == '__main__':
    main()

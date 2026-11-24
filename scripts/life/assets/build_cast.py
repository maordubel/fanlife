#!/usr/bin/env python3
"""
LIFE character assets: the cast. One skinned, clothed human per recipe in cast.json, as a raw GLB plus previews.

  python3 build_cast.py <work dir> [id,id,...]

For each character: MPFB2 builds the body from MakeHuman's macro targets and fits the rig, skin, eyes, teeth, hair
and clothes (all CC0, checked here against each asset's own licence line); the face gets ARKit face units and
Meta visemes as shape keys, carried onto lashes, brows, teeth and tongue; the head is cut from the body so only
the head carries morph targets; two eye bones are added; the top garment becomes a neutral grey `tint_top`
material. Then the GLB is exported and Cycles renders the previews. docs/life/ASSETS-PIPELINE.md is the manual.
"""
import json, math, os, re, sys, traceback
from pathlib import Path
import bpy, bmesh
import numpy as np
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
import lifekit as K
import refine as R
import motion as M
import strips as ST

WORK = Path(sys.argv[1]); ONLY = [x for x in (sys.argv[2] if len(sys.argv) > 2 else '').split(',') if x]
RAW = WORK / 'raw'; PREV = WORK / 'preview'; RAW.mkdir(parents=True, exist_ok=True); PREV.mkdir(parents=True, exist_ok=True)
SPEC = json.loads((K.HERE / 'cast.json').read_text())
S = K.mpfb()
ARKIT = list(K._dyn('mpfb.services.faceservice', 'ARKIT_FACEUNITS'))
VISEMES = ['viseme_sil', 'viseme_PP', 'viseme_FF', 'viseme_TH', 'viseme_DD', 'viseme_kk', 'viseme_CH', 'viseme_SS', 'viseme_nn', 'viseme_RR', 'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U']
PACKS = {}
if S.data and (S.data / 'packs').is_dir():
    for f in (S.data / 'packs').glob('*.json'):
        try:
            for k, v in json.loads(f.read_text()).items():
                if isinstance(v, dict): PACKS.setdefault(k.lower(), dict(v, pack=f.stem))
        except Exception as e: print('pack json', f, e)


def licence_of(path):
    """(licence, author, pack) for an asset file: the pack's own record and the file's own header must both be CC0"""
    p = Path(path); head = p.read_text(errors='replace')[:8000]
    m = re.search(r'(?im)^\s*(?:#\s*)?licen[sc]e:?\s+(.+)$', head); a = re.search(r'(?im)^\s*(?:#\s*)?author:?\s+(.+)$', head)
    rec = PACKS.get(p.stem.lower()) or PACKS.get(p.parent.name.lower()) or {}
    own = (m.group(1).strip() if m else ''); pack = str(rec.get('license', '')).strip()
    ok = lambda x: bool(re.match(r'(?i)^cc[- ]?0', x))
    if (own and not ok(own)) or (pack and not ok(pack)) or not (own or pack):
        raise PermissionError(f'{p.name}: licence is not CC0 (file says {own!r}, pack says {pack!r})')
    return {'file': str(p.relative_to(S.data)) if S.data else p.name, 'licence': 'CC0 1.0', 'stated_in_file': own, 'stated_in_pack': pack,
            'author': (a.group(1).strip() if a else rec.get('author', '')), 'pack': rec.get('pack', '')}


def find(sub, name, ext='.mhclo'):
    if not S.data: return None
    hits = sorted((S.data / sub).rglob(name + ext)) if (S.data / sub).is_dir() else []
    return str(hits[0]) if hits else None


def meshes_of(rig): return [o for o in rig.children_recursive if o.type == 'MESH']
def kind(o):
    try: return S.ObjectService.get_object_type(o) or ''
    except Exception: return ''


def shrink_images(limit):
    for im in bpy.data.images:
        if im.size[0] == 0: continue
        lim = limit(im)
        if max(im.size) > lim:
            k = lim / max(im.size); im.scale(max(1, int(im.size[0] * k)), max(1, int(im.size[1] * k)))


def base_image(mat):
    if not mat or not mat.node_tree: return None
    bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not bsdf: return None
    def walk(sock, depth=0):
        for l in sock.links:
            n = l.from_node
            if n.type == 'TEX_IMAGE' and n.image: return n
            if depth < 4:
                for i in n.inputs:
                    r = walk(i, depth + 1)
                    if r: return r
        return None
    return walk(bsdf.inputs['Base Color'])


def tint_top(ob, rig, colour, sources):
    """the garment's upper islands become material `tint_top`: neutral light grey that the game multiplies by a club colour"""
    me = ob.data; hip = rig.data.bones['pelvis'].head_local.z
    bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
    seen = set(); islands = []
    for f in bm.faces:
        if f.index in seen: continue
        stack = [f]; seen.add(f.index); isl = []
        while stack:
            g = stack.pop(); isl.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen: seen.add(h.index); stack.append(h)
        islands.append(isl)
    def stats(isl):
        area = sum(f.calc_area() for f in isl); zs = [v.co.z for f in isl for v in f.verts]
        return area, sum(f.calc_center_median().z * f.calc_area() for f in isl) / max(area, 1e-9), min(zs), max(zs)
    info = [(isl, *stats(isl)) for isl in islands]
    tops = [i for i in info if i[2] > hip * 1.08 and i[4] > hip * 1.25]
    if not tops: bm.free(); return False
    src = ob.material_slots[0].material if ob.material_slots else None
    if not src: bm.free(); return False
    mat = src.copy(); mat.name = 'tint_top'; mat['tint'] = 'top'; me.materials.append(mat); slot = len(me.materials) - 1
    uv = bm.loops.layers.uv.active; polys = []
    for t in tops:
        for f in t[0]:
            f.material_index = slot
            if uv: polys.append([tuple(l[uv].uv) for l in f.loops])
    bm.to_mesh(me); bm.free()
    node = base_image(mat)
    if node and polys:
        from PIL import Image, ImageDraw, ImageFilter
        im = node.image; w, h = im.size
        px = np.empty(w * h * 4, dtype=np.float32); im.pixels.foreach_get(px); px = px.reshape(h, w, 4)
        mask = Image.new('L', (w, h), 0); d = ImageDraw.Draw(mask)
        for poly in polys: d.polygon([(u * w, v * h) for u, v in poly], fill=255, outline=255)
        mask = np.asarray(mask.filter(ImageFilter.MaxFilter(5)), dtype=np.float32)[..., None] / 255
        ao = None
        srcfile = Path(bpy.path.abspath(im.filepath)) if im.filepath else None
        if srcfile:
            cand = [p for p in srcfile.parent.glob('*_ao.png')]
            if cand:
                a = Image.open(cand[0]).convert('L').resize((w, h)).transpose(Image.FLIP_TOP_BOTTOM); ao = np.asarray(a, dtype=np.float32)[..., None] / 255
        if ao is None:   # no baked shading: keep only the cloth's broad light and shade, so no print or logo survives
            lum = (px[..., :3] @ np.array([.2126, .7152, .0722], dtype=np.float32))
            L = Image.fromarray(np.uint8(np.clip(lum, 0, 1) * 255)).filter(ImageFilter.GaussianBlur(max(2, w // 48)))
            lum = np.asarray(L, dtype=np.float32) / 255; m = float((lum * mask[..., 0]).sum() / max(mask.sum(), 1))
            ao = np.clip(lum / max(m, 1e-3), 0.72, 1.12)[..., None] / 1.12
        grey = np.clip(0.30 + 0.62 * ao, 0, 1) ** 2.2    # stored linear; reads as light grey
        px[..., :3] = px[..., :3] * (1 - mask) + grey * mask
        im.pixels.foreach_set(px.ravel()); im.update(); im.pack()
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    # default colour: multiply node between the texture and the shader (exports as baseColorFactor)
    link = bsdf.inputs['Base Color'].links[0] if bsdf.inputs['Base Color'].links else None
    if link:
        mx = mat.node_tree.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs[0].default_value = 1.0
        mat.node_tree.links.new(link.from_socket, mx.inputs[6]); mx.inputs[7].default_value = (*colour, 1)
        mat.node_tree.links.new(mx.outputs[2], bsdf.inputs['Base Color'])
    return True


def grey_hair(ob, amount):
    node = base_image(ob.material_slots[0].material) if ob.material_slots else None
    if not node: return
    im = node.image; w, h = im.size; px = np.empty(w * h * 4, dtype=np.float32); im.pixels.foreach_get(px); px = px.reshape(h, w, 4)
    lum = (px[..., :3] @ np.array([.2126, .7152, .0722], dtype=np.float32))[..., None]
    lum = lum / max(float(np.percentile(lum[px[..., 3:4] > .3] if (px[..., 3] > .3).any() else lum, 90)), 1e-3)
    silver = np.clip(0.18 + 0.62 * lum, 0, 1) * np.array([1.0, 1.0, 1.02], dtype=np.float32)
    px[..., :3] = px[..., :3] * (1 - amount) + silver * amount
    im.pixels.foreach_set(px.ravel()); im.update(); im.pack()


def add_eye_bones(rig, eyes):
    """eye_l / eye_r under `head`, each owning its eyeball, so the game can aim the eyes with a bone"""
    co = np.array([v.co[:] for v in eyes.data.vertices]); left = co[:, 0] > 0
    cen = {'l': co[left].mean(0), 'r': co[~left].mean(0)}
    bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
    for s, c in cen.items():
        eb = rig.data.edit_bones.new('eye_' + s); eb.head = Vector(c); eb.tail = Vector(c) + Vector((0, -0.03, 0)); eb.roll = 0
        eb.parent = rig.data.edit_bones['head']; eb.use_deform = True
    bpy.ops.object.mode_set(mode='OBJECT')
    eyes.vertex_groups.clear()
    gl = eyes.vertex_groups.new(name='eye_l'); gr = eyes.vertex_groups.new(name='eye_r')
    gl.add([int(i) for i in np.nonzero(left)[0]], 1.0, 'REPLACE'); gr.add([int(i) for i in np.nonzero(~left)[0]], 1.0, 'REPLACE')
    if eyes.data.shape_keys:
        for kb in list(eyes.data.shape_keys.key_blocks)[::-1]:
            eyes.shape_key_remove(kb)
    return {s: [round(float(x), 4) for x in c] for s, c in cen.items()}


def split_head(body):
    """cut the head (every vertex a face morph moves, and its neighbourhood) from the body: morph targets only where a face is"""
    me = body.data; kb = me.shape_keys.key_blocks if me.shape_keys else []
    n = len(me.vertices); basis = np.empty(n * 3, dtype=np.float32); me.vertices.foreach_get('co', basis); basis = basis.reshape(n, 3)
    moved = np.zeros(n, dtype=bool)
    for k in kb[1:]:
        c = np.empty(n * 3, dtype=np.float32); k.data.foreach_get('co', c); moved |= np.abs(c.reshape(n, 3) - basis).max(1) > 1e-5
    if not moved.any(): return None
    neck_z = basis[moved][:, 2].min()
    head = moved | (basis[:, 2] > neck_z + 0.01)
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    for _ in range(2):
        grow = [v.index for v in bm.verts if not head[v.index] and any(head[e.other_vert(v).index] for e in v.link_edges)]
        head[grow] = True
    bm.free()
    for p in me.polygons: p.select = all(head[v] for v in p.vertices)
    for v in me.vertices: v.select = False
    for e in me.edges: e.select = False
    bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); bpy.context.view_layer.objects.active = body
    before = set(bpy.data.objects)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_mode(type='FACE'); bpy.ops.mesh.separate(type='SELECTED'); bpy.ops.object.mode_set(mode='OBJECT')
    new = [o for o in bpy.data.objects if o not in before]
    if not new: return None
    head_ob = new[0]
    if body.data.shape_keys:
        for k in list(body.data.shape_keys.key_blocks)[::-1]: body.shape_key_remove(k)
    return head_ob


def drop_covered(body, garments):
    """delete the skin a garment hides (within 2 cm under its surface), so no skin pokes through cloth when it bends"""
    from mathutils.bvhtree import BVHTree
    trees = []
    for g in garments:
        b = bmesh.new(); b.from_mesh(g.data); b.transform(body.matrix_world.inverted() @ g.matrix_world); trees.append(BVHTree.FromBMesh(b)); b.free()
    bm = bmesh.new(); bm.from_mesh(body.data); covered = set()
    for v in bm.verts:
        for t in trees:
            hit, nrm, _, dist = t.find_nearest(v.co, 0.022)
            if hit is None: continue
            d = v.co - hit; depth = d.dot(nrm)
            if depth < 0.012 and abs(depth) > 0.85 * d.length: covered.add(v.index); break   # squarely under the cloth (or poking just through it), not beside its edge
    edge = {v.index for v in bm.verts if v.index in covered and any(e.other_vert(v).index not in covered for e in v.link_edges)}
    covered -= edge   # keep one ring of skin under every opening
    faces = [f for f in bm.faces if all(v.index in covered for v in f.verts)]
    n = len(faces); bmesh.ops.delete(bm, geom=faces, context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(body.data); bm.free(); return n


def set_keys(objs, weights):
    for o in objs:
        if o.type == 'MESH' and o.data.shape_keys:
            for kb in o.data.shape_keys.key_blocks[1:]: kb.value = weights.get(kb.name, 0.0)


studio, shoot = ST.studio, ST.shoot


# ------------------------------------------------------------------------------------------------ one character
def build(c, keep=False):
    meta = {'id': c['id'], 'label': c['label'], 'sources': [], 'notes': []}
    hi = S.HumanService._create_default_human_info_dict()
    ph = dict(c['pheno']); race = ph.pop('race', [0.33, 0.33, 0.33]); hi['phenotype'].update(ph)
    hi['phenotype']['race'] = {'african': race[0], 'caucasian': race[1], 'asian': race[2]}; hi['rig'] = 'game_engine'
    st = S.HumanService.get_default_deserialization_settings(); st['subdiv_levels'] = 0
    bm = S.HumanService.deserialize_from_dict(hi, st); rig = bm.parent
    for name, val in {**SPEC['style'], **c.get('targets', {})}.items():
        p = S.TargetService.target_full_path(name)
        if p: S.TargetService.load_target(bm, p, weight=val, name=name)
        else: meta['notes'].append(f'target {name} not found')
    try: S.HumanService.refit(bm)
    except Exception as e: print('refit', e)

    def wear(sub, name, typ):
        if not name: return None
        path = find(sub, name)
        if not path: meta['notes'].append(f'{sub}/{name} not installed'); return None
        try:
            lic = licence_of(path); ob = S.HumanService.add_mhclo_asset(path, bm, asset_type=typ, subdiv_levels=0, material_type='GAMEENGINE')
            meta['sources'].append(dict(lic, kind=typ)); return ob
        except Exception as e:
            traceback.print_exc(); meta['notes'].append(f'{sub}/{name}: {e}'); return None

    skin = find('skins', c.get('skin', ''), '.mhmat')
    if skin:
        try:
            lic = licence_of(skin); S.HumanService.set_character_skin(skin, bm, skin_type='GAMEENGINE', material_instances=False); meta['sources'].append(dict(lic, kind='Skin'))
        except Exception as e: traceback.print_exc(); meta['notes'].append(f'skin: {e}')
    elif c.get('skin'): meta['notes'].append('skin not installed')
    eyes = wear('eyes', 'low-poly', 'Eyes')
    eye_mat = find('eyes', c.get('eyes', 'brown'), '.mhmat')
    if eyes and eye_mat:
        try:
            MaterialService = K._dyn('mpfb.services.materialservice', 'MaterialService'); MhMaterial = K._dyn('mpfb.entities.material.mhmaterial', 'MhMaterial')
            GE = K._dyn('mpfb.entities.material.gameenginematerial', 'GameEngineMaterial') if False else None
            m = MhMaterial(); m.populate_from_mhmat(eye_mat)
            img = m.get_value('diffuseTexture')
            node = base_image(eyes.material_slots[0].material)
            if img and node: node.image = bpy.data.images.load(img, check_existing=True)
        except Exception as e: meta['notes'].append(f'eye colour: {e}')
    wear('eyebrows', c.get('brows'), 'Eyebrows'); wear('eyelashes', 'eyelashes01', 'Eyelashes'); wear('teeth', 'teeth_base', 'Teeth'); wear('tongue', 'tongue01', 'Tongue')
    hair = wear('hair', c.get('hair'), 'Hair')
    hair2 = wear('hair', c.get('hair2'), 'Hair') if c.get('hair2') else None
    if hair2: hair2['life_role'] = 'hair2'
    garments = [g for g in (wear('clothes', n, 'Clothes') for n in c.get('clothes', [])) if g]

    S.TargetService.bake_targets(bm)
    loaded = []
    if S.data:
        for name in ARKIT + VISEMES:
            hits = list((S.data / 'targets').rglob(name + '.target')) if (S.data / 'targets').is_dir() else []
            if hits and hits[0].stat().st_size > 0:
                try: S.TargetService.load_target(bm, str(hits[0]), weight=0.0, name=name); loaded.append(name)
                except Exception as e: meta['notes'].append(f'face {name}: {e}')
    if loaded:
        try: S.FaceService.interpolate_targets(bm)
        except Exception as e: traceback.print_exc(); meta['notes'].append(f'face carry: {e}')
    for o in [hair, hair2] + garments:
        if o and o.data.shape_keys:
            for kb in list(o.data.shape_keys.key_blocks)[::-1]: o.shape_key_remove(kb)

    root = S.ExportService.create_character_copy(bm, name_suffix='_x')
    xbm = S.ObjectService.find_object_of_type_amongst_nearest_relatives(root, 'Basemesh')
    S.ExportService.bake_modifiers_remove_helpers(xbm, bake_masks=True, bake_subdiv=False, remove_helpers=True, also_proxy=True)
    for o in [rig] + meshes_of(rig): bpy.data.objects.remove(o, do_unlink=True)
    rig = root if root.type == 'ARMATURE' else xbm.parent
    rig.name = c['id']; rig.data.name = c['id'] + '_rig'
    parts = {}
    for o in meshes_of(rig):
        t = kind(o)
        for m in list(o.modifiers):
            if m.type != 'ARMATURE': o.modifiers.remove(m)
        name = {'Basemesh': 'Body', 'Eyes': 'Eyes', 'Eyebrows': 'Brows', 'Eyelashes': 'Lashes', 'Teeth': 'Teeth', 'Tongue': 'Tongue', 'Hair': 'Hair'}.get(t)
        if o.get('life_role') == 'hair2': name = 'Hair2'
        if not name: name = 'Shoes' if 'shoe' in o.name.lower() else 'Clothes'
        while name in parts: name += '2'
        parts[name] = o; o.name = name; o.data.name = c['id'] + '_' + name
    body = parts['Body']
    if 'Eyes' in parts: meta['eyes'] = add_eye_bones(rig, parts['Eyes'])
    head = split_head(body)
    if head: head.name = 'Head'; head.data.name = c['id'] + '_Head'; parts['Head'] = head
    try:
        gs = [o for n, o in parts.items() if n.startswith('Clothes')]
        if gs: meta['skinFacesHidden'] = drop_covered(body, gs)
    except Exception as e: traceback.print_exc(); meta['notes'].append(f'covered skin: {e}')
    for o in parts.values():
        keep_groups = {b.name for b in rig.data.bones}
        for g in list(o.vertex_groups):
            if g.name not in keep_groups: o.vertex_groups.remove(g)
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        try: bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4); bpy.ops.object.vertex_group_normalize_all(lock_active=False)
        except Exception as e: print('weights', o.name, e)
        for p in o.data.polygons: p.use_smooth = True
    if 'Teeth' in parts: meta['teethTriangles'] = R.lighter_teeth(parts['Teeth'], 1000)
    shrink_images(lambda im: 256 if 'eye' in im.name.lower() and 'brow' not in im.name.lower() and 'lash' not in im.name.lower() else 512 if any(k in im.name.lower() for k in ('hair', 'afro', 'bob', 'short', 'long', 'pony', 'braid', 'brow', 'lash', 'teeth', 'tongue', 'shoe')) else 1024)
    tinted = False
    for name, o in parts.items():
        if name.startswith('Clothes') and not tinted:
            try: tinted = tint_top(o, rig, c.get('tint', [0.8, 0.8, 0.8]), meta)
            except Exception as e: traceback.print_exc(); meta['notes'].append(f'tint: {e}')
    if not tinted and garments: meta['notes'].append('no tintable top found')
    regions = ['tint_top'] if tinted else []
    for name, o in parts.items():
        if name.startswith('Clothes') and any(m and m.name == 'tint_top' for m in o.data.materials):
            try:
                r = R.tint_regions(o, rig) or {}
                if r.get('inner'): regions.append('tint_inner')
                if r.get('trim'): regions.append('tint_trim')
            except Exception as e: traceback.print_exc(); meta['notes'].append(f'tint regions: {e}')
    meta['tintRegions'] = regions
    for hn in ('Hair', 'Hair2'):
        if hn not in parts: continue
        if c.get('hair_grey'): grey_hair(parts[hn], c['hair_grey'])
        if c.get('hair_tint'):
            node = base_image(parts[hn].material_slots[0].material)
            if node and not node.image.get('life_tinted'):
                im = node.image; px = np.empty(im.size[0] * im.size[1] * 4, dtype=np.float32); im.pixels.foreach_get(px); px = px.reshape(-1, 4); px[:, :3] *= np.array(c['hair_tint'], dtype=np.float32); im.pixels.foreach_set(px.ravel()); im.update(); im.pack(); im['life_tinted'] = 1
    if 'Brows' in parts:
        try: R.thicker_brows(parts['Brows'])
        except Exception as e: traceback.print_exc(); meta['notes'].append(f'brows: {e}')
    for o in parts.values():
        for sl in o.material_slots:
            m = sl.material
            if not m: continue
            if o.name in ('Hair', 'Brows', 'Lashes'): m['alpha'] = 'mask'
            if not m.name.startswith('tint_'): m.name = c['id'] + '_' + o.name.lower() + ('' if len(o.material_slots) == 1 else '_' + str(list(o.material_slots).index(sl)))
            b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None) if m.node_tree else None
            if b and o.name in ('Body', 'Head'):
                b.inputs['Roughness'].default_value = 0.55
                for nm in ('Subsurface Weight',):
                    if nm in b.inputs: b.inputs[nm].default_value = 0.0
        if o.name in ('Body', 'Head') and o.material_slots: o.material_slots[0].material.name = 'skin'
    if head and body.material_slots: head.material_slots[0].material = body.material_slots[0].material

    rest = dict(SPEC.get('resting', {}).get('adult' if c['pheno']['age'] > 0.5 else 'young', {})); rest.update(c.get('resting', {}))
    if rest:
        R.bake_resting([o for o in parts.values()], rest); meta['restingBaked'] = rest
    hc = (0.1, 0.08, 0.06)
    node = base_image(parts['Hair'].material_slots[0].material) if 'Hair' in parts and parts['Hair'].material_slots else None
    if node:
        hp = np.empty(node.image.size[0] * node.image.size[1] * 4, np.float32); node.image.pixels.foreach_get(hp); hp = hp.reshape(-1, 4)
        sel = hp[:, 3] > 0.5; hc = tuple(float(x) for x in (hp[sel, :3].mean(0) if sel.any() else hp[:, :3].mean(0)) * 0.85)
    try:
        acc, _ = R.accessories(rig, parts, hc, adult=c['pheno']['age'] > 0.5 and c['pheno']['gender'] > 0.5)
        for k, o in acc.items():
            nm = o.name; parts[nm] = o
        meta['accessories'] = {k: o.name for k, o in acc.items()}
    except Exception as e: traceback.print_exc(); meta['notes'].append(f'accessories: {e}'); meta['accessories'] = {}
    try:
        lod, ntri = R.build_lod(rig, {n: o for n, o in parts.items() if n in R.LOD_TARGET})
        bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True); lod.select_set(True); bpy.context.view_layer.objects.active = rig
        bpy.ops.export_scene.gltf(filepath=str(RAW / (c['id'] + '-lod1.glb')), export_format='GLB', use_selection=True, export_apply=False, export_skins=True, export_morph=False,
                                  export_animations=False, export_image_format='WEBP', export_image_quality=80, export_yup=True, export_extras=True, export_tangents=False,
                                  export_vertex_color='ACTIVE', export_active_vertex_color_when_no_material=True)
        meta['lod'] = {'triangles': ntri}; lod.hide_render = True; lod.hide_set(True)
    except Exception as e: traceback.print_exc(); meta['notes'].append(f'lod: {e}'); lod = None

    P = K.Poser(rig)
    morphs = [k.name for k in parts['Head'].data.shape_keys.key_blocks[1:]] if 'Head' in parts and parts['Head'].data.shape_keys else []
    meta.update(bones=[b.name for b in rig.data.bones], morphs=morphs, hipHeight=round(P.hip, 4), height=round(max((o.matrix_world @ Vector(co)).z for o in parts.values() for co in o.bound_box), 4),
                meshes={n: {'triangles': sum(len(p.vertices) - 2 for p in o.data.polygons), 'vertices': len(o.data.vertices), 'morphs': len(o.data.shape_keys.key_blocks) - 1 if o.data.shape_keys else 0} for n, o in parts.items()},
                tint={'top': bool(tinted), 'default': c.get('tint')})
    meta['triangles'] = sum(m['triangles'] for n, m in meta['meshes'].items() if not n.startswith(('Acc_', 'Hair2', 'Hair_hat')))
    meta['optional'] = [n for n in parts if n.startswith(('Acc_', 'Hair2', 'Hair_hat'))]
    bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True)
    for o in parts.values(): o.hide_set(False); o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=str(RAW / (c['id'] + '.glb')), export_format='GLB', use_selection=True, export_apply=False, export_skins=True, export_morph=True,
                              export_morph_normal=False, export_animations=False, export_image_format='WEBP', export_image_quality=82, export_yup=True, export_extras=True, export_tangents=False)
    (RAW / (c['id'] + '.json')).write_text(json.dumps(meta, indent=1))
    for n, o in parts.items():
        if n.startswith(('Acc_', 'Hair2', 'Hair_hat')): o.hide_render = True
    bpy.data.libraries.write(str(WORK / (c['id'] + '.blend')), {rig, *parts.values(), *([lod] if lod else [])}, fake_user=True)
    meta['_lod'] = lod.name if lod else None
    return rig, parts, P, meta


def previews(c, rig, parts, P, cam, meta):
    objs = [o for n, o in parts.items() if not n.startswith(('Acc_', 'Hair2', 'Hair_hat'))]
    H = max((o.matrix_world @ Vector(co)).z for o in objs for co in o.bound_box)
    P.apply(M.stand(1.0)); set_keys(list(parts.values()), {})
    shoot(cam, (0, 0, H * 0.52), H * 3.4 + 0.6, 0, 85, PREV / f"{c['id']}-front.jpg", (576, 768))
    hb = P.rig.pose.bones['head']; eye = hb.head.z + (H - hb.head.z) * 0.30
    port = lambda path, az=28: shoot(cam, (hb.head.x, hb.head.y - 0.03, eye), 0.9 + (H - hb.head.z) * 1.6, az, 85, path, (768, 768), rise=0.03)
    port(PREV / f"{c['id']}-portrait.jpg")                      # the resting face, nothing applied
    set_keys(list(parts.values()), SPEC['expressions']['smile']); port(PREV / f"{c['id']}-smile.jpg"); set_keys(list(parts.values()), {})
    shoot(cam, (0, 0, H * 0.52), H * 3.4 + 0.6, 215, 85, PREV / f"{c['id']}-back.jpg", (576, 768))
    P.apply(M.talk(0.5, 2)); set_keys(list(parts.values()), SPEC['expressions']['laugh'])
    shoot(cam, (0, 0, H * 0.52), H * 3.4 + 0.6, 40, 85, PREV / f"{c['id']}-talk.jpg", (576, 768))
    set_keys(list(parts.values()), {}); P.apply(M.stand(1.0))
    # accessories: none / beanie + round glasses (+ beard) / flat cap + square glasses (+ moustache) / the second hair
    acc = meta.get('accessories', {})
    looks = [('plain', []), ('beanie', ['beanie', 'glasses_round', 'beard', 'hair_hat']), ('cap', ['cap_flat', 'glasses_square', 'moustache', 'hair_hat'])]
    if 'Hair2' in parts: looks.append(('hair2', ['__hair2']))
    for tag, show in looks:
        for k, nm in acc.items(): parts[nm].hide_render = k not in show
        if 'Hair2' in parts: parts['Hair2'].hide_render = '__hair2' not in show
        if 'Hair' in parts: parts['Hair'].hide_render = ('__hair2' in show) or ('hair_hat' in show and 'hair_hat' in acc)
        shoot(cam, (hb.head.x, hb.head.y - 0.03, eye + 0.02), 0.8 + (H - hb.head.z) * 1.6, 30, 85, PREV / f"acc-{c['id']}-{tag}.jpg", (384, 384), rise=0.03)
    for k, nm in acc.items(): parts[nm].hide_render = True
    if 'Hair2' in parts: parts['Hair2'].hide_render = True
    if 'Hair' in parts: parts['Hair'].hide_render = False
    # far crowd: the full character and the LOD at 10 m
    lod = bpy.data.objects.get(meta.get('_lod') or '')
    if lod:
        lod.hide_set(False)
        for tag, full in (('full', True), ('lod1', False)):
            for o in objs: o.hide_render = not full
            lod.hide_render = full
            shoot(cam, (0, 0, H * 0.5), 10.0, 15, 85, PREV / f"lod-{c['id']}-{tag}.jpg", (240, 360))
            shoot(cam, (0, 0, H * 0.5), 3.2, 15, 85, PREV / f"lod-{c['id']}-{tag}-near.jpg", (240, 360))
        for o in objs: o.hide_render = False
        lod.hide_render = True


def load_blend(who, tag=None):
    with bpy.data.libraries.load(str(WORK / (who + '.blend'))) as (src, dst): dst.objects = list(src.objects)
    for o in dst.objects: bpy.context.scene.collection.objects.link(o)
    rig = next(o for o in dst.objects if o.type == 'ARMATURE')
    for o in dst.objects:
        if o.get('accessory') or o.name.startswith(('Hair2', 'LOD1')): o.hide_render = True
    return rig


def main():
    cast = [c for c in SPEC['cast'] if not ONLY or c['id'] in ONLY]
    done = {}
    for c in cast:
        K.wipe(); print('==== build', c['id'], flush=True)
        try:
            rig, parts, P, meta = build(c)
            if os.environ.get('LIFE_NO_RENDER') != '1':
                cam = studio(); previews(c, rig, parts, P, cam, meta)
            meta.pop('_lod', None)
            done[c['id']] = meta; print('==== done', c['id'], meta['triangles'], 'tris', len(meta['morphs']), 'morphs', meta['notes'], flush=True)
        except Exception:
            traceback.print_exc(); print('==== FAILED', c['id'], flush=True)
    clips = json.loads((WORK / 'clips.json').read_text()) if (WORK / 'clips.json').exists() else {}
    if os.environ.get('LIFE_NO_RENDER') == '1' or not clips: (WORK / 'cast-built.json').write_text(json.dumps(done, indent=1)); return
    # the whole cast in a row, resting faces
    try:
        K.wipe(); x = 0.0; ids = [c['id'] for c in SPEC['cast'] if (WORK / (c['id'] + '.blend')).exists()]
        order = sorted(ids, key=lambda i: -next(c for c in SPEC['cast'] if c['id'] == i)['pheno']['age'])
        for i, cid in enumerate(order):
            r = load_blend(cid); r.location = ((i - (len(order) - 1) / 2) * 0.62, 0, 0); P_ = K.Poser(r); P_.wear(clips['stills']['idle']['q'])
        cam = studio(); shoot(cam, (0, 0, 1.0), 9.0, 0, 50, PREV / 'cast-row.jpg', (2400, 900))
        shoot(cam, (0, 0, 1.3), 8.6, 0, 50, PREV / 'cast-row-faces.jpg', (2400, 700))
    except Exception: traceback.print_exc()
    # motion: the shared clips worn by the real father and boy (a second father for two-adult scenes)
    if (WORK / 'father.blend').exists() and (WORK / 'boy.blend').exists():
        try:
            K.wipe(); rigs = {'A': load_blend('father'), 'A2': load_blend('father'), 'C': load_blend('boy')}
            posers = {w: K.Poser(r) for w, r in rigs.items()}
            for r in rigs.values(): set_keys(list(r.children_recursive), SPEC['expressions']['smile'])
            cam = studio(int(os.environ.get('LIFE_STRIP_SAMPLES', '14')))
            for name, st in clips.get('strips', {}).items():
                ST.render_strip(name, st, rigs, posers, cam, PREV / f'strip-{name}.jpg'); print('strip', name, flush=True)
            for w in ('A2', 'C'):
                for o in [rigs[w]] + list(rigs[w].children_recursive): o.hide_render = True
            for o in rigs['A'].children_recursive: o.hide_render = bool(o.get('accessory')) or o.name.startswith(('Hair2', 'LOD1'))
            rigs['A'].location = (0, 0, 0); rigs['A'].rotation_euler = (0, 0, 0)
            set_keys(list(rigs['A'].children_recursive), {})
            ST.hands_closeup(rigs['A'], posers['A'], clips['stills'], clips['fingerBones'], cam, PREV / 'hand-poses.jpg')
            for name, st in clips['stills'].items():
                if name.startswith('hand_'): continue
                r, Pw = (rigs['C'], posers['C']) if st.get('child') else (rigs['A'], posers['A'])
                for w, rr in rigs.items():
                    for o in [rr] + list(rr.children_recursive): o.hide_render = rr is not r or bool(o.get('accessory')) or o.name.startswith(('Hair2', 'LOD1'))
                r.location = (0, 0, 0); r.rotation_euler = (0, 0, 0)
                Pw.wear(st['q'], pelvis_hips=st['pelvis']); shoot(cam, (0, 0, 0.95), 6.4, 28, 85, PREV / f'clip-{name}.jpg', (384, 512))
        except Exception: traceback.print_exc()
    (WORK / 'cast-built.json').write_text(json.dumps(done, indent=1))
    if not done: sys.exit(1)


main()

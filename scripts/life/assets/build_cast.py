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


# ------------------------------------------------------------------------------------------------ studio
def studio():
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = int(os.environ.get('LIFE_SAMPLES', '40')); sc.cycles.use_denoising = True
    sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 88; sc.render.film_transparent = False
    try: sc.view_settings.view_transform = 'Filmic'
    except Exception:
        try: sc.view_settings.view_transform = 'AgX'
        except Exception: pass
    w = bpy.data.worlds.new('studio'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.86, 0.80, 0.74, 1); bg.inputs[1].default_value = 0.34
    def light(name, typ, loc, energy, size, col=(1, 1, 1)):
        d = bpy.data.lights.new(name, typ); d.energy = energy; d.color = col
        if typ == 'AREA': d.size = size
        o = bpy.data.objects.new(name, d); sc.collection.objects.link(o); o.location = loc
        o.rotation_euler = (Vector((0, 0, 1.2)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); return o
    light('key', 'AREA', (2.6, -2.8, 2.9), 260, 2.2, (1.0, 0.93, 0.84)); light('fill', 'AREA', (-3.0, -2.2, 1.6), 60, 3.5, (0.86, 0.92, 1.0)); light('rim', 'AREA', (-1.5, 3.2, 2.6), 300, 2.0, (1.0, 0.9, 0.8))
    me = bpy.data.meshes.new('floor'); me.from_pydata([(-30, -30, 0), (30, -30, 0), (30, 30, 0), (-30, 30, 0)], [], [(0, 1, 2, 3)])
    fl = bpy.data.objects.new('floor', me); sc.collection.objects.link(fl)
    m = bpy.data.materials.new('floor'); m.use_nodes = True; m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.78, 0.72, 0.66, 1); m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.9; me.materials.append(m)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    return cam


def shoot(cam, target, dist, az, lens, path, size=(768, 768), rise=0.0):
    sc = bpy.context.scene; a = math.radians(az)
    cam.data.lens = lens; cam.location = (target[0] + dist * math.sin(a), target[1] - dist * math.cos(a), target[2] + rise)
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.resolution_x, sc.render.resolution_y = size; sc.render.filepath = str(path); bpy.ops.render.render(write_still=True)


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
    for o in [hair] + garments:
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
    shrink_images(lambda im: 256 if 'eye' in im.name.lower() and 'brow' not in im.name.lower() and 'lash' not in im.name.lower() else 512 if any(k in im.name.lower() for k in ('hair', 'afro', 'bob', 'short', 'long', 'pony', 'braid', 'brow', 'lash', 'teeth', 'tongue', 'shoe')) else 1024)
    tinted = False
    for name, o in parts.items():
        if name.startswith('Clothes') and not tinted:
            try: tinted = tint_top(o, rig, c.get('tint', [0.8, 0.8, 0.8]), meta)
            except Exception as e: traceback.print_exc(); meta['notes'].append(f'tint: {e}')
    if not tinted and garments: meta['notes'].append('no tintable top found')
    if c.get('hair_grey') and 'Hair' in parts: grey_hair(parts['Hair'], c['hair_grey'])
    if c.get('hair_tint') and 'Hair' in parts:
        node = base_image(parts['Hair'].material_slots[0].material)
        if node:
            im = node.image; px = np.empty(im.size[0] * im.size[1] * 4, dtype=np.float32); im.pixels.foreach_get(px); px = px.reshape(-1, 4); px[:, :3] *= np.array(c['hair_tint'], dtype=np.float32); im.pixels.foreach_set(px.ravel()); im.update(); im.pack()
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

    P = K.Poser(rig)
    morphs = [k.name for k in parts['Head'].data.shape_keys.key_blocks[1:]] if 'Head' in parts and parts['Head'].data.shape_keys else []
    meta.update(bones=[b.name for b in rig.data.bones], morphs=morphs, hipHeight=round(P.hip, 4), height=round(max((o.matrix_world @ Vector(co)).z for o in parts.values() for co in o.bound_box), 4),
                meshes={n: {'triangles': sum(len(p.vertices) - 2 for p in o.data.polygons), 'vertices': len(o.data.vertices), 'morphs': len(o.data.shape_keys.key_blocks) - 1 if o.data.shape_keys else 0} for n, o in parts.items()},
                tint={'top': bool(tinted), 'default': c.get('tint')})
    meta['triangles'] = sum(m['triangles'] for m in meta['meshes'].values())
    bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True)
    for o in parts.values(): o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=str(RAW / (c['id'] + '.glb')), export_format='GLB', use_selection=True, export_apply=False, export_skins=True, export_morph=True,
                              export_morph_normal=False, export_animations=False, export_image_format='WEBP', export_image_quality=82, export_yup=True, export_extras=True, export_tangents=False)
    (RAW / (c['id'] + '.json')).write_text(json.dumps(meta, indent=1))
    if c['id'] in ('father', 'boy'): bpy.data.libraries.write(str(WORK / (c['id'] + '.blend')), {rig, *parts.values()}, fake_user=True)
    return rig, parts, P, meta


def previews(c, rig, parts, P, cam):
    objs = list(parts.values()); H = max((o.matrix_world @ Vector(co)).z for o in objs for co in o.bound_box)
    P.apply(K.stand(1.0)); set_keys(objs, {})
    shoot(cam, (0, 0, H * 0.52), H * 3.4 + 0.6, 0, 85, PREV / f"{c['id']}-front.jpg", (576, 768))
    set_keys(objs, SPEC['expressions']['smile'])
    hb = P.rig.pose.bones['head']; eye = hb.head.z + (H - hb.head.z) * 0.30
    shoot(cam, (hb.head.x, hb.head.y - 0.03, eye), 0.9 + (H - hb.head.z) * 1.6, 28, 85, PREV / f"{c['id']}-portrait.jpg", (768, 768), rise=0.03)
    shoot(cam, (0, 0, H * 0.52), H * 3.4 + 0.6, 215, 85, PREV / f"{c['id']}-back.jpg", (576, 768))
    P.apply(K.CLIPS['talk_2'][2](0.5)); set_keys(objs, SPEC['expressions']['laugh'])
    shoot(cam, (0, 0, H * 0.52), H * 3.4 + 0.6, 40, 85, PREV / f"{c['id']}-talk.jpg", (576, 768))
    set_keys(objs, {})


def main():
    cast = [c for c in SPEC['cast'] if not ONLY or c['id'] in ONLY]
    done = {}
    for c in cast:
        K.wipe(); print('==== build', c['id'], flush=True)
        try:
            rig, parts, P, meta = build(c)
            if os.environ.get('LIFE_NO_RENDER') != '1':
                cam = studio(); previews(c, rig, parts, P, cam)
            done[c['id']] = meta; print('==== done', c['id'], meta['triangles'], 'tris', len(meta['morphs']), 'morphs', meta['notes'], flush=True)
        except Exception:
            traceback.print_exc(); print('==== FAILED', c['id'], flush=True)
    # father and boy together: the father wears the shared clip exactly as the game would; the boy stands under his hand
    stills = json.loads((WORK / 'clips.json').read_text())['stills'] if (WORK / 'clips.json').exists() else {}
    if (WORK / 'father.blend').exists() and (WORK / 'boy.blend').exists() and stills and os.environ.get('LIFE_NO_RENDER') != '1':
        try:
            K.wipe(); rigs = {}
            for who in ('father', 'boy'):
                with bpy.data.libraries.load(str(WORK / (who + '.blend'))) as (src, dst): dst.objects = list(src.objects)
                for o in dst.objects: bpy.context.scene.collection.objects.link(o)
                rigs[who] = next(o for o in dst.objects if o.type == 'ARMATURE')
            f, b = rigs['father'], rigs['boy']; Pf, Pb = K.Poser(f), K.Poser(b)
            Pf.wear(stills['hand_on_shoulder']); Pb.wear(stills['idle'])
            hand = f.pose.bones['middle_01_r'].head.copy(); sh = b.pose.bones['upperarm_l'].head.copy()
            b.location = (hand.x - sh.x + 0.05, hand.y - sh.y + 0.02, 0); gap = hand.z - sh.z
            print(f'==== pair: father hand {hand.z:.3f} m, boy shoulder {sh.z:.3f} m, gap {gap:+.3f} m', flush=True)
            set_keys(list(f.children_recursive), SPEC['expressions']['smile']); set_keys(list(b.children_recursive), SPEC['expressions']['smile'])
            cam = studio(); shoot(cam, (b.location.x * 0.5, 0, 0.95), 6.2, 12, 85, PREV / 'father-boy-hand-on-shoulder.jpg', (768, 768))
            shoot(cam, (b.location.x * 0.6, 0, 1.28), 2.6, -20, 85, PREV / 'father-boy-hand-on-shoulder-close.jpg', (768, 768))
            b.hide_render = True
            for o in b.children_recursive: o.hide_render = True
            set_keys(list(f.children_recursive), {})
            for name, q in stills.items():
                Pf.wear(q, pelvis_up=None); shoot(cam, (0, 0, 0.95), 6.4, 28, 85, PREV / f'clip-{name}.jpg', (384, 512))
        except Exception: traceback.print_exc()
    (WORK / 'cast-built.json').write_text(json.dumps(done, indent=1))
    if not done: sys.exit(1)


main()

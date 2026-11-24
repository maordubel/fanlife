"""
LIFE character assets: what a look does to the clothes, and the small things a look wears (runs inside build_cast.py).

  · keep / hem        keep only a garment's top or its bottoms; cut a hem (a skirt below the knee, jeans to shorts)
                      with a straight bisect, before the covered skin is removed
  · bands             chest bands and hoops on the tinted top: the top is bisected on horizontal planes and the band
                      faces become `tint_trim` (the club's second colour; a fixed colour in a canon look)
  · recolour          bottoms and shoes take the look's colour, keeping the cloth's own shading (texture rescaled)
  · factor            a material colour multiplied over the texture (exports as baseColorFactor): skin, hair, brows,
                      so a region's skin and hair are one material.color away
  · normalise_skin    every look's skin texture is first brought to one light reference, so a factor sets the tone
  · scarf, apron, bangles, backpack
                      made by script, skinned to the body, named Look_*; a backpack is optional (Acc_backpack)
"""
import math
import bpy, bmesh
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

SKIN_REF = (0.93, 0.80, 0.71)   # sRGB mean every skin texture is brought to; the factor then sets the tone


def lin(c): return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)
def hexrgb(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
def col(c): return hexrgb(c) if isinstance(c, str) else tuple(c)


def _base_image(mat):
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


def _px(im):
    w, h = im.size; p = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(p); return p.reshape(h, w, 4)


def _put(im, px): im.pixels.foreach_set(px.ravel()); im.update(); im.pack()


def factor(mat, colour_srgb):
    """multiply the material's base colour by a constant (linear) colour; reuses a multiply node if there is one"""
    nt = mat.node_tree; b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'); c = (*lin(col(colour_srgb)), 1)
    for n in nt.nodes:
        if n.type == 'MIX' and getattr(n, 'blend_type', '') == 'MULTIPLY' and n.outputs[2].links and n.outputs[2].links[0].to_socket == b.inputs['Base Color']:
            n.inputs[7].default_value = c; return
    link = b.inputs['Base Color'].links[0] if b.inputs['Base Color'].links else None
    if not link: b.inputs['Base Color'].default_value = c; return
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs[0].default_value = 1.0
    nt.links.new(link.from_socket, mx.inputs[6]); mx.inputs[7].default_value = c; nt.links.new(mx.outputs[2], b.inputs['Base Color'])


def normalise(mat, ref=SKIN_REF, grey=False):
    """rescale the texture so its mean (where it is not background) is `ref`; grey=True: luminance only (hair, brows)"""
    node = _base_image(mat)
    if not node or node.image.get('life_norm'): return False
    im = node.image; px = _px(im); rgb = px[..., :3]
    lum = rgb @ np.array([.2126, .7152, .0722], np.float32)
    m = (px[..., 3] > 0.5) & (lum > 0.08)
    if not m.any(): return False
    if grey:
        g = lum / max(float(np.percentile(lum[m], 75)), 1e-3) * 0.82
        px[..., :3] = np.clip(g, 0, 1)[..., None]
    else:
        mean = rgb[m].mean(0); px[..., :3] = np.clip(rgb * (np.array(ref, np.float32) / np.maximum(mean, 1e-3)), 0, 1)
    _put(im, px); im['life_norm'] = 1; return True


# ------------------------------------------------------------------------------------------------ garments
def _islands(bm):
    seen = set(); out = []
    for f in bm.faces:
        if f.index in seen: continue
        st = [f]; seen.add(f.index); isl = []
        while st:
            g = st.pop(); isl.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen: seen.add(h.index); st.append(h)
        out.append(isl)
    return out


def _is_top(isl, hip):
    area = sum(f.calc_area() for f in isl) or 1e-9
    cz = sum(f.calc_center_median().z * f.calc_area() for f in isl) / area; mz = max(v.co.z for f in isl for v in f.verts)
    return cz > hip * 1.08 and mz > hip * 1.25


def keep(o, rig, which):
    """which = 'top' | 'bottom': delete the other islands of this garment"""
    hip = rig.data.bones['pelvis'].head_local.z
    bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
    drop = [f for isl in _islands(bm) if _is_top(isl, hip) != (which == 'top') for f in isl]
    bmesh.ops.delete(bm, geom=drop, context='FACES'); bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(o.data); bm.free(); o.data.update(); return len(drop)


def hem(o, z, only_bottom=True, rig=None):
    """cut the garment straight at height z (metres) and drop everything below"""
    hip = rig.data.bones['pelvis'].head_local.z if rig else 0
    bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
    faces = [f for isl in _islands(bm) if not (only_bottom and rig and _is_top(isl, hip)) for f in isl]
    geom = list({e for f in faces for e in f.edges}) + faces + list({v for f in faces for v in f.verts})
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, z), plane_no=(0, 0, 1), clear_inner=True)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(o.data); bm.free(); o.data.update()


def heights(rig):
    B = rig.data.bones
    return {'hip': B['thigh_l'].head_local.z, 'shoulder': B['upperarm_l'].head_local.z, 'knee': B['calf_l'].head_local.z,
            'ankle': B['foot_l'].head_local.z, 'neck': B['neck_01'].head_local.z, 'waist': B['spine_01'].head_local.z,
            'chest': B['spine_03'].head_local.z}


def _mat_slot(me, name):
    for i, m in enumerate(me.materials):
        if m and m.name == name: return i
    return None


def bands(o, rig, spec):
    """spec: [[v0, v1], ...] in the top's body height (v = 0 at the hips, 1 at the shoulders) or {'hoops': n, 'from': v0, 'to': v1}.
    The tint_top faces inside a band become tint_trim (created from tint_top if the top has no trim yet)."""
    me = o.data; top = _mat_slot(me, 'tint_top')
    if top is None: return 0
    H = heights(rig); hip, sh = H['hip'], H['shoulder']
    if isinstance(spec, dict):
        n = int(spec.get('hoops', 6)); a, b = spec.get('from', -0.1), spec.get('to', 1.15); step = (b - a) / (2 * n)
        rng = [[a + 2 * i * step, a + (2 * i + 1) * step] for i in range(n)]
    else: rng = [list(r) for r in spec]
    trim = _mat_slot(me, 'tint_trim')
    if trim is None:
        src = me.materials[top]; m = src.copy(); m.name = 'tint_trim'; m['tint'] = 'trim'; me.materials.append(m); trim = len(me.materials) - 1
    bm = bmesh.new(); bm.from_mesh(me)
    for v0, v1 in rng:
        for v in (v0, v1):
            faces = [f for f in bm.faces if f.material_index in (top, trim)]
            geom = list({e for f in faces for e in f.edges}) + faces + list({x for f in faces for x in f.verts})
            bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, hip + v * (sh - hip)), plane_no=(0, 0, 1))
    n = 0
    for f in bm.faces:
        if f.material_index != top: continue
        v = (f.calc_center_median().z - hip) / (sh - hip)
        if any(a <= v <= b for a, b in rng): f.material_index = trim; n += 1
    bm.to_mesh(me); bm.free(); me.update(); return n


def recolour(o, which, target, rig=None, strength=1.0, flat=False):
    """bring the mean colour of the chosen faces' texture area to `target` (sRGB), keeping the cloth's shading.
    which = 'bottom' (non-top islands), 'all', or a material name"""
    from PIL import Image, ImageDraw, ImageFilter
    me = o.data; hip = rig.data.bones['pelvis'].head_local.z if rig else 0
    bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table(); uv = bm.loops.layers.uv.active
    if which == 'bottom': faces = [f for isl in _islands(bm) if not _is_top(isl, hip) for f in isl]
    elif which == 'all': faces = list(bm.faces)
    else:
        idx = _mat_slot(me, which); faces = [f for f in bm.faces if f.material_index == idx]
    by_mat = {}
    for f in faces: by_mat.setdefault(f.material_index, []).append([tuple(l[uv].uv) for l in f.loops] if uv else None)
    bm.free(); done = 0
    for mi, polys in by_mat.items():
        mat = me.materials[mi] if mi < len(me.materials) else None
        if not mat or mat.name.startswith('tint_'): continue
        node = _base_image(mat)
        if not node: continue
        im = node.image; w, h = im.size; px = _px(im)
        mask = Image.new('L', (w, h), 0); d = ImageDraw.Draw(mask)
        for p in polys:
            if p: d.polygon([(u * w, v * h) for u, v in p], fill=255)
        mk = np.asarray(mask.filter(ImageFilter.MaxFilter(3)), np.float32)[..., None] / 255
        sel = mk[..., 0] > 0.5
        if not sel.any(): continue
        if flat:   # a plain cloth: only the broad light and shade of the original survive (no print, no pattern)
            lum = px[..., :3] @ np.array([.2126, .7152, .0722], np.float32)
            Lb = np.asarray(Image.fromarray(np.uint8(np.clip(lum, 0, 1) * 255)).filter(ImageFilter.GaussianBlur(max(2, w // 64))), np.float32) / 255
            mL = float(Lb[sel].mean()); sh = np.clip(Lb / max(mL, 1e-3), 0.75, 1.15)
            new = np.clip(np.array(col(target), np.float32)[None, None, :] * sh[..., None], 0, 1)
        else:
            mean = px[..., :3][sel].mean(0); k = np.array(col(target), np.float32) / np.maximum(mean, 1e-3)
            new = np.clip(px[..., :3] * (1 + (k - 1) * strength), 0, 1)
        px[..., :3] = px[..., :3] * (1 - mk) + new * mk; _put(im, px); done += 1
    return done


# ------------------------------------------------------------------------------------------------ made by script
def _bvh(objs):
    b = bmesh.new()
    for o in objs:
        t = bmesh.new(); t.from_mesh(o.data); t.transform(o.matrix_world); me = bpy.data.meshes.new('_t'); t.to_mesh(me); t.free(); b.from_mesh(me); bpy.data.meshes.remove(me)
    tr = BVHTree.FromBMesh(b); b.free(); return tr


def _flat_mat(name, colour, rough=0.85, metal=0.0, tint=None, noise=0.06, seed=3):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    S = 64; rng = np.random.default_rng(seed); im = bpy.data.images.new(name + '_tex', S, S, alpha=False)
    tone = 1 - noise + noise * rng.random((S, S)); px = np.ones((S, S, 4), np.float32); px[..., :3] = (0.92 * tone)[..., None]
    im.pixels.foreach_set(px.ravel()); im.pack()
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = im; nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    factor(m, colour)
    if tint: m['tint'] = tint
    return m


def _new_obj(name, bm, rig, mats):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    o.parent = rig; o.matrix_parent_inverse = rig.matrix_world.inverted()
    for m in mats: me.materials.append(m)
    md = o.modifiers.new('Armature', 'ARMATURE'); md.object = rig; return o


def _weights_nearest(o, src, blend=None):
    """skin weights from the nearest vertex of `src`; blend(z) → {bone: w} mixes in fixed weights by height"""
    kd = KDTree(len(src.data.vertices)); M = src.matrix_world
    for i, v in enumerate(src.data.vertices): kd.insert(M @ v.co, i)
    kd.balance(); names = {g.index: g.name for g in src.vertex_groups}; made = {}
    def grp(n):
        if n not in made: made[n] = o.vertex_groups.get(n) or o.vertex_groups.new(name=n)
        return made[n]
    for v in o.data.vertices:
        p = o.matrix_world @ v.co; _, i, _ = kd.find(p); fixed = blend(p) if blend else None
        k = fixed.pop('_k', 1.0) if fixed else 0.0
        for g in src.data.vertices[i].groups: grp(names[g.group]).add([v.index], g.weight * (1 - k), 'ADD')
        if fixed:
            for n, w in fixed.items(): grp(n).add([v.index], w * k, 'ADD')
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    try: bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4); bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    except Exception as e: print('weights', o.name, e)


def _solidify(o, t):
    m = o.modifiers.new('sol', 'SOLIDIFY'); m.thickness = t; m.offset = 1.0; m.use_even_offset = True
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_move_to_index(modifier='sol', index=0); bpy.ops.object.modifier_apply(modifier='sol')


def _surface_front(tree, x, z, y_from=-1.0):
    hit = tree.ray_cast(Vector((x, y_from, z)), Vector((0, 1, 0)), 3.0)
    return hit[0]


def scarf(rig, parts, colours=('#c8102e', '#f4f1ea'), child=False, name='Look_scarf'):
    """a knitted supporter's scarf: once round the neck, both ends hanging down the chest; blocks of two colours
    (tint_scarf_a / tint_scarf_b, so a club can recolour it), skinned to the neck and the upper back"""
    H = heights(rig); body = [parts[n] for n in parts if n == 'Body' or n.startswith('Clothes') or n == 'Head']
    tree = _bvh(body); sc = (H['neck'] - H['ankle']) / 1.45
    nz = H['neck'] + 0.012 * sc
    # the neck's outline at that height
    B = parts['Body']; co = np.array([(B.matrix_world @ v.co)[:] for v in B.data.vertices]); ring = co[np.abs(co[:, 2] - nz) < 0.02]
    cy = float(np.median(ring[:, 1])) if len(ring) else 0.0
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap'); W = 0.06 * sc; N = 28; rows = []
    for i in range(N):
        a = i / N * math.tau; d = Vector((math.sin(a), -math.cos(a), 0))
        row = []
        for dz in (-W / 2, W / 2):
            o = Vector((0, cy, nz + dz)); r = 0.02
            hit = tree.ray_cast(o + d * 0.3, -d, 0.3)
            r = (0.3 - hit[3]) if hit[0] is not None else 0.065
            row.append(bm.verts.new(o + d * (r + 0.012 * sc + 0.004 * math.cos(a * 3))))
        rows.append(row)
    faces = []
    for i in range(N):
        a, b = rows[i], rows[(i + 1) % N]
        f = bm.faces.new((a[0], b[0], b[1], a[1])); faces.append((f, i // 3))
    # the two ends down the front, from just either side of the throat
    L = (0.42 if not child else 0.33) * sc; seg = 0.03 * sc; ends = []
    for sx in (1, -1):
        x = sx * 0.045 * sc; prev = None; z = nz - W * 0.2; k = 0
        while z > nz - L:
            y = _surface_front(tree, x, z)
            y = (y.y - 0.01 * sc) if y is not None else cy - 0.12
            v = (bm.verts.new((x - W * 0.45, y, z)), bm.verts.new((x + W * 0.45, y, z)))
            if prev: ends.append((bm.faces.new((prev[0], prev[1], v[1], v[0])), k // 2))
            prev = v; z -= seg; x += sx * 0.002; k += 1
    ma = _flat_mat('tint_scarf_a', colours[0], tint='scarf_a'); mb = _flat_mat('tint_scarf_b', colours[1], tint='scarf_b')
    for f, blk in faces + ends: f.material_index = blk % 2
    for f in bm.faces:
        for l in f.loops: l[uvl].uv = (0.5, 0.5)
    o = _new_obj(name, bm, rig, [ma, mb]); _solidify(o, 0.006 * sc)
    chest = H['chest']
    _weights_nearest(o, parts['Body'], lambda p: {'_k': 0.85, 'neck_01': 0.5, 'spine_03': 0.5} if p.z > chest + 0.06 else {'_k': 0.9, 'spine_03': 0.7, 'spine_02': 0.3})
    o['accessory'] = name; return o


def apron(rig, parts, colour='#e8dcc4', name='Look_apron'):
    """a shop apron: bib from mid-chest, skirt to just below the knee, a flat panel in front of the body"""
    H = heights(rig); tree = _bvh([parts[n] for n in parts if n == 'Body' or n.startswith('Clothes')])
    B = parts['Body']; co = np.array([(B.matrix_world @ v.co)[:] for v in B.data.vertices])
    band = co[np.abs(co[:, 2] - H['hip']) < 0.03]; half = float(np.abs(band[:, 0]).max()) if len(band) else 0.17
    top = H['chest'] + 0.04; bot = H['knee'] - 0.06; nz = 16; nx = 9
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap'); grid = []
    for j in range(nz + 1):
        z = top + (bot - top) * j / nz
        w = (0.11 if z > H['waist'] + 0.03 else half * 0.92)
        xs = [-w + 2 * w * i / nx for i in range(nx + 1)]; ys = []
        for x in xs:
            h = _surface_front(tree, x, z); ys.append(h.y if h is not None else None)
        valid = [y for y in ys if y is not None] or [-0.15]
        front = min(valid)
        row = []
        for x, y in zip(xs, ys):
            yy = front if (z < H['hip'] - 0.05 or y is None) else min(y, front + 0.02)
            row.append(bm.verts.new((x, yy - 0.014, z)))
        grid.append(row)
    for j in range(nz):
        for i in range(nx):
            f = bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
            for l, (a, b) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))): l[uvl].uv = (a / nx, 1 - b / nz)
    m = _flat_mat('look_apron', colour, rough=0.92, noise=0.08)
    o = _new_obj(name, bm, rig, [m]); _solidify(o, 0.003)
    hip = H['hip']
    _weights_nearest(o, parts['Body'], lambda p: None if p.z > hip else {'_k': 1.0, 'pelvis': 0.6, 'thigh_l': 0.2, 'thigh_r': 0.2})
    o['accessory'] = name; return o


def bangles(rig, parts, name='Look_bangles'):
    """thin silver bangles: two on the left wrist, one on the right"""
    from refine import _tube
    B = parts['Body']; co = np.array([(B.matrix_world @ v.co)[:] for v in B.data.vertices]); bm = bmesh.new()
    for side, n in (('l', 2), ('r', 1)):
        wrist = rig.data.bones['hand_' + side].head_local; elbow = rig.data.bones['lowerarm_' + side].head_local
        ax = (wrist - elbow).normalized()
        for k in range(n):
            c = wrist - ax * (0.012 + 0.011 * k)
            d = co - np.array(c[:]); along = d @ np.array(ax[:]); perp = np.linalg.norm(d - along[:, None] * np.array(ax[:]), axis=1)
            near = perp[(np.abs(along) < 0.008) & (perp < 0.06)]
            r = (float(near.max()) if len(near) else 0.03) + 0.005 + 0.002 * k
            u = ax.orthogonal().normalized(); w = ax.cross(u)
            _tube(bm, [c + (u * math.cos(t / 24 * math.tau) + w * math.sin(t / 24 * math.tau)) * r for t in range(24)], 0.0011, closed=True)
    m = bpy.data.materials.new('look_bangles'); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.72, 0.72, 0.74, 1); b.inputs['Metallic'].default_value = 1.0; b.inputs['Roughness'].default_value = 0.3
    o = _new_obj(name, bm, rig, [m])
    gl = o.vertex_groups.new(name='lowerarm_l'); gr = o.vertex_groups.new(name='lowerarm_r')
    for v in o.data.vertices: (gl if v.co.x > 0 else gr).add([v.index], 1.0, 'REPLACE')
    o['accessory'] = name; return o


def backpack(rig, parts, colour='#2b3a55', name='Acc_backpack'):
    """a school backpack: a rounded pack on the upper back and two straps over the shoulders"""
    from refine import _tube
    H = heights(rig); tree = _bvh([parts[n] for n in parts if n == 'Body' or n.startswith('Clothes')]); sc = (H['neck'] - H['ankle']) / 1.45
    zc = (H['waist'] + H['chest']) / 2 + 0.03 * sc
    hit = tree.ray_cast(Vector((0, 1.0, zc)), Vector((0, -1, 0)), 3.0)
    by = hit[0].y if hit[0] is not None else 0.12
    w, h, d = 0.15 * sc, 0.19 * sc, 0.065 * sc
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=12, radius=1.0)
    for v in bm.verts:   # a superellipsoid: a soft box
        x, y, z = v.co; f = lambda a: math.copysign(abs(a) ** 0.45, a)
        v.co = Vector((f(x) * w, by + d + f(y) * d, zc + f(z) * h))
    # straps: from the pack's top over each shoulder and down the front, back under the arm to the pack's bottom
    for sx in (1, -1):
        x0 = sx * 0.07 * sc; top = Vector((x0, by + 0.01, zc + h * 0.8)); pts = [top]
        sh = tree.ray_cast(Vector((x0 * 1.2, 0.0, H['neck'] + 0.3)), Vector((0, 0, -1)), 1.0)[0]
        over = (sh + Vector((0, 0, 0.012))) if sh is not None else Vector((x0, 0, H['shoulder'] + 0.05))
        pts.append(over)
        for z in (H['shoulder'] - 0.04 * sc, H['chest'], H['waist'] + 0.05 * sc):
            fr = _surface_front(tree, sx * 0.1 * sc, z); pts.append(Vector((sx * 0.1 * sc, (fr.y if fr is not None else -0.1) - 0.01, z)))
        side = tree.ray_cast(Vector((sx * 0.5, 0.0, H['waist'] + 0.03)), Vector((-sx, 0, 0)), 1.0)[0]
        pts.append((side + Vector((sx * 0.012, 0, 0))) if side is not None else Vector((sx * 0.16 * sc, 0.03, H['waist'])))
        pts.append(Vector((sx * w * 0.8, by + 0.02, zc - h * 0.85)))
        _tube(bm, pts, 0.007 * sc, seg=5)
    m = _flat_mat('acc_backpack', colour, rough=0.75, noise=0.1)
    o = _new_obj(name, bm, rig, [m])
    pack_z = zc - h * 1.1
    _weights_nearest(o, parts['Body'], lambda p: {'_k': 1.0, 'spine_03': 0.6, 'spine_02': 0.4} if p.y > by - 0.005 and p.z > pack_z else None)
    o['accessory'] = name; return o

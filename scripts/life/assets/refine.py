"""
LIFE character assets: what is done to a built character after MPFB has made it (runs inside build_cast.py, and on an
imported GLB for a local check). Every function takes the rig and the parts {name: object}.

  · lighter_teeth     ~1k-triangle teeth, morphs and weights carried over from the full set
  · thicker_brows     fuller, softer eyebrows (the brow texture's alpha grown and feathered)
  · bake_resting      a resting expression folded into the base shape of every face mesh
  · tint_regions      tint_top / tint_inner (shirt under a jacket) / tint_trim (collar, cuffs) and the `tint_uv` set
  · accessories       flat cap, beanie, two glasses, moustache, short beard: small meshes on the head bone, fitted to this head
  · build_lod         one-material ~4k-triangle copy for the far crowd, same skeleton, tint regions as a vertex mask
"""
import math, random
import bpy, bmesh
import numpy as np
from mathutils import Vector, Matrix
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree


def _select_only(o):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o


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


def _pixels(im):
    w, h = im.size; px = np.empty(w * h * 4, dtype=np.float32); im.pixels.foreach_get(px); return px.reshape(h, w, 4)


def _weights_from(dst, src, kd_src, src_groups):
    """copy skin weights vertex by vertex from the nearest vertex of src (same rig)"""
    dst.vertex_groups.clear()
    groups = {g.index: g.name for g in src.vertex_groups}; made = {}
    for v in dst.data.vertices:
        _, i, _ = kd_src.find(v.co)
        for g in src.data.vertices[i].groups:
            nm = groups[g.group]
            if nm not in made: made[nm] = dst.vertex_groups.new(name=nm)
            made[nm].add([v.index], g.weight, 'REPLACE')


# ------------------------------------------------------------------------------------------------ teeth
def lighter_teeth(teeth, target=1000):
    """decimate the teeth, then give every new vertex the morph offsets and weights of its nearest original vertex"""
    me0 = teeth.data; n0 = len(me0.vertices)
    keys = [(kb.name, np.array([kb.data[i].co[:] for i in range(n0)])) for kb in me0.shape_keys.key_blocks] if me0.shape_keys else []
    basis = np.array([v.co[:] for v in me0.vertices])
    kd = KDTree(n0)
    for i, v in enumerate(me0.vertices): kd.insert(v.co, i)
    kd.balance()
    src = teeth.copy(); src.data = me0.copy(); bpy.context.scene.collection.objects.link(src)
    me = me0.copy(); teeth.data = me
    if me.shape_keys:
        _select_only(teeth); teeth.shape_key_clear()
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    mod = teeth.modifiers.new('dec', 'DECIMATE'); mod.ratio = min(1.0, target / max(tris, 1)); mod.use_collapse_triangulate = True
    _select_only(teeth)
    bpy.ops.object.modifier_move_to_index(modifier='dec', index=0); bpy.ops.object.modifier_apply(modifier='dec')
    _weights_from(teeth, src, kd, None)
    if keys:
        near = [kd.find(v.co)[1] for v in teeth.data.vertices]
        teeth.shape_key_add(name=keys[0][0], from_mix=False)
        for name, co in keys[1:]:
            kb = teeth.shape_key_add(name=name, from_mix=False); kb.value = 0.0
            d = co[near] - basis[near]
            for j, v in enumerate(teeth.data.vertices): kb.data[j].co = v.co + Vector(d[j])
    bpy.data.objects.remove(src, do_unlink=True)
    return sum(len(p.vertices) - 2 for p in teeth.data.polygons)


# ------------------------------------------------------------------------------------------------ brows
def thicker_brows(brows, grow=5, darken=0.82):
    from PIL import Image, ImageFilter
    node = _base_image(brows.material_slots[0].material) if brows.material_slots else None
    if not node: return False
    im = node.image; px = _pixels(im); h, w = px.shape[:2]
    a = Image.fromarray(np.uint8(np.clip(px[..., 3], 0, 1) * 255))
    big = a.filter(ImageFilter.MaxFilter(grow if grow % 2 else grow + 1)).filter(ImageFilter.GaussianBlur(max(1, w // 256)))
    a2 = np.maximum(np.asarray(a, dtype=np.float32), np.asarray(big, dtype=np.float32) * 0.88) / 255
    # hair-like streaks so the grown edge is not a flat blob
    rng = np.random.default_rng(7); streak = rng.random((h, 1)) * 0.25 + 0.8
    px[..., 3] = np.clip(a2 * np.repeat(streak, w, 1), 0, 1)
    rgb = px[..., :3]; m = px[..., 3:] > 0.2
    mean = (rgb * m).sum((0, 1)) / max(m.sum(), 1)
    px[..., :3] = np.where(m, rgb * darken, mean * darken)    # colour bleeds into the grown area
    im.pixels.foreach_set(px.ravel()); im.update(); im.pack(); return True


# ------------------------------------------------------------------------------------------------ resting face
def bake_resting(objs, mix):
    """add `mix` (morph name → weight) into the basis of every mesh that has those morphs, and into every other key,
    so each morph still moves the face by the same amount from the new rest"""
    done = 0
    for o in objs:
        sk = o.data.shape_keys if o.type == 'MESH' else None
        if not sk: continue
        kb = sk.key_blocks; base = kb[0]; n = len(o.data.vertices)
        B = np.empty(n * 3, dtype=np.float32); base.data.foreach_get('co', B)
        delta = np.zeros(n * 3, dtype=np.float32)
        for name, wgt in mix.items():
            if name in kb:
                K = np.empty(n * 3, dtype=np.float32); kb[name].data.foreach_get('co', K); delta += (K - B) * wgt
        if not delta.any(): continue
        for k in kb:
            K = np.empty(n * 3, dtype=np.float32); k.data.foreach_get('co', K); k.data.foreach_set('co', K + delta)
        o.data.vertices.foreach_set('co', B + delta); o.data.update(); done += 1
    return done


# ------------------------------------------------------------------------------------------------ tint regions
def _islands(bm, faces):
    fs = set(f.index for f in faces); seen = set(); out = []
    for f in faces:
        if f.index in seen: continue
        stack = [f]; seen.add(f.index); isl = []
        while stack:
            g = stack.pop(); isl.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index in fs and h.index not in seen: seen.add(h.index); stack.append(h)
        out.append(isl)
    return out


def tint_regions(cloth, rig):
    """split the `tint_top` faces: islands that sit under another tinted island (a shirt under a jacket) become
    `tint_inner`; otherwise a band round the collar and cuffs becomes `tint_trim`. Adds UV set `tint_uv` (u round the
    body, 0.5 at the front centre; v = 0 at the hip joints, 1 at the shoulder joints) for stripes and hoops."""
    me = cloth.data
    names = [m.name if m else '' for m in me.materials]
    if 'tint_top' not in names: return None
    top = names.index('tint_top'); src = me.materials[top]
    bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table(); bm.normal_update()
    faces = [f for f in bm.faces if f.material_index == top]
    isl = _islands(bm, faces); fid = {}
    for i, I in enumerate(isl):
        for f in I: fid[f.index] = i
    tree = BVHTree.FromBMesh(bm)
    inner = set()
    if len(isl) > 1:
        for i, I in enumerate(isl):
            vs = list({v for f in I for v in f.verts}); random.Random(i).shuffle(vs); vs = vs[:300]; hit = 0
            for v in vs:
                loc, nrm, idx, d = tree.ray_cast(v.co + v.normal * 0.002, v.normal, 0.05)
                if idx is not None and fid.get(idx, i) != i: hit += 1
            if vs and hit / len(vs) > 0.45: inner.add(i)
    area = lambda I: sum(f.calc_area() for f in I)
    result = {'top': True}
    if inner and sum(area(isl[i]) for i in inner) > 0.04 * sum(area(I) for I in isl):
        mat = src.copy(); mat.name = 'tint_inner'; mat['tint'] = 'inner'; me.materials.append(mat); slot = len(me.materials) - 1
        for nd in mat.node_tree.nodes:   # default: a light shirt under the club-coloured jacket
            if nd.type == 'MIX' and getattr(nd, 'blend_type', '') == 'MULTIPLY': nd.inputs[7].default_value = (0.86, 0.86, 0.84, 1)
        for i in inner:
            for f in isl[i]: f.material_index = slot
        result['inner'] = True
    else:
        # collar and cuffs: faces within 2.2 cm of an opening of the top, except the hem (the lowest opening)
        tf = set(f.index for f in faces)
        bedges = [e for e in bm.edges if sum(1 for f in e.link_faces if f.index in tf) == 1]
        loops = []; seen = set()
        for e in bedges:
            if e in seen: continue
            comp = []; stack = [e]; seen.add(e)
            while stack:
                x = stack.pop(); comp.append(x)
                for v in x.verts:
                    for y in v.link_edges:
                        if y in bedges and y not in seen: seen.add(y); stack.append(y)
            loops.append(comp)
        bset = set(bedges); loops = [l for l in loops if len(l) >= 6]
        # a seam between two pieces of the same top is not an opening: drop loops whose vertices sit on another loop's
        allv = [(k, v.co.copy()) for k, l in enumerate(loops) for e in l for v in e.verts]
        kd_all = KDTree(len(allv))
        for i, (k, co) in enumerate(allv): kd_all.insert(co, i)
        kd_all.balance()
        def is_seam(k):
            vs = [v.co for e in loops[k] for v in e.verts]
            near = sum(1 for co in vs if any(allv[i][0] != k for _, i, _ in kd_all.find_range(co, 0.003)))
            return near > 0.5 * len(vs)
        loops = [l for k, l in enumerate(loops) if not is_seam(k)]
        if len(loops) >= 2:
            cz = [sum(v.co.z for e in l for v in e.verts) / (2 * len(l)) for l in loops]
            hem = cz.index(min(cz))
            pts = [v.co.copy() for k, l in enumerate(loops) if k != hem for e in l for v in e.verts]
            kd = KDTree(len(pts))
            for i, p in enumerate(pts): kd.insert(p, i)
            kd.balance()
            mat = src.copy(); mat.name = 'tint_trim'; mat['tint'] = 'trim'; me.materials.append(mat); slot = len(me.materials) - 1
            n = 0
            for f in faces:
                if kd.find(f.calc_center_median())[2] < 0.022: f.material_index = slot; n += 1
            result['trim'] = n
    # the stripe UV set, on every face (only the tinted ones use it)
    hip = rig.data.bones['thigh_l'].head_local.z; sh = rig.data.bones['upperarm_l'].head_local.z
    uvl = bm.loops.layers.uv.get('tint_uv') or bm.loops.layers.uv.new('tint_uv')
    for f in bm.faces:
        us = []
        for l in f.loops:
            co = l.vert.co; us.append(0.5 + math.atan2(co.x, -co.y) / math.tau)
        if max(us) - min(us) > 0.5: us = [u + 1 if u < 0.5 else u for u in us]
        for l, u in zip(f.loops, us): l[uvl].uv = (u, (l.vert.co.z - hip) / max(sh - hip, 1e-3))
    bm.to_mesh(me); bm.free()
    if me.uv_layers.get('tint_uv'):
        first = me.uv_layers[0]; me.uv_layers.active = first; first.active_render = True
    return result


# ------------------------------------------------------------------------------------------------ the head, measured
def head_frame(parts):
    head = parts['Head']; M = head.matrix_world
    co = np.array([(M @ v.co)[:] for v in head.data.vertices])
    eyes = parts.get('Eyes')
    if eyes:
        ec = np.array([(eyes.matrix_world @ v.co)[:] for v in eyes.data.vertices]); L = ec[:, 0] > 0
        el, er = ec[L].mean(0), ec[~L].mean(0); er_rad = (ec[L][:, 0].max() - ec[L][:, 0].min()) / 2
    else:
        el = er = None; er_rad = 0.012
    crown = co[:, 2].max()
    eye_z = (el[2] + er[2]) / 2 if el is not None else crown - 0.12; eye_y = (el[1] + er[1]) / 2 if el is not None else co[:, 1].min() + 0.03
    band = lambda z, dz=0.008: co[np.abs(co[:, 2] - z) < dz]
    b = band(eye_z + 0.03); front = b[np.abs(b[:, 0]) < 0.02][:, 1].min(); back = b[:, 1].max()
    t = band(eye_z + 0.02); temple = np.abs(t[t[:, 1] > eye_y + 0.015][:, 0]).max() if len(t) else 0.075
    nb = co[(np.abs(co[:, 0]) < 0.006) & (np.abs(co[:, 2] - eye_z) < 0.008)]; bridge_y = nb[:, 1].min() if len(nb) else eye_y - 0.02
    sk = head.data.shape_keys.key_blocks if head.data.shape_keys else None
    def moved(name):
        if not sk or name not in sk: return None
        n = len(head.data.vertices); B = np.empty(n * 3, np.float32); K = np.empty(n * 3, np.float32)
        sk[0].data.foreach_get('co', B); sk[name].data.foreach_get('co', K); return np.linalg.norm((K - B).reshape(n, 3), axis=1)
    sm = moved('mouthSmileLeft'); smr = moved('mouthSmileRight'); jaw = moved('jawOpen'); pk = moved('mouthPucker')
    if sm is not None:
        cl = co[int(sm.argmax())]; cr = co[int(smr.argmax())] if smr is not None else cl * np.array([-1, 1, 1])
    else:
        cl = np.array([0.025, eye_y - 0.01, eye_z - 0.075]); cr = cl * np.array([-1, 1, 1])
    mouth = (cl + cr) / 2; mw = abs(cl[0] - cr[0])
    chin = co[(np.abs(co[:, 0]) < 0.012) & (co[:, 1] < mouth[1] + 0.02) & (co[:, 2] < mouth[2])]
    chin_z = chin[:, 2].min() if len(chin) else mouth[2] - 0.06
    ns = co[(np.abs(co[:, 0]) < 0.006) & (co[:, 2] < eye_z - 0.02) & (co[:, 2] > mouth[2] + 0.01)]
    nose_tip = ns[ns[:, 1].argmin()] if len(ns) else np.array([0, eye_y - 0.04, eye_z - 0.04])
    ctr = Vector((0.0, (front + back) / 2, eye_z + 0.035))
    def plane(cf, cb):
        zf = eye_z + cf; zb = eye_z + cb
        return lambda p: zf + (zb - zf) * (p.y - front) / max(back - front, 1e-3)
    return dict(ctr=ctr, plane=plane, co=co, crown=crown, eye_z=eye_z, eye_y=eye_y, el=el, er=er, er_rad=er_rad, front=front, back=back, temple=temple,
                bridge_y=bridge_y, mouth=mouth, mouth_w=mw, chin_z=chin_z, nose=nose_tip, jaw=jaw, pucker=pk)


def _mat(name, col, rough=0.8, metal=0.0, img=None, alpha=False):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if img is not None:
        t = m.node_tree.nodes.new('ShaderNodeTexImage'); t.image = img
        m.node_tree.links.new(t.outputs['Color'], b.inputs['Base Color'])
        if alpha: m.node_tree.links.new(t.outputs['Alpha'], b.inputs['Alpha']); m['alpha'] = 'mask'
    return m


def _obj(name, bm, rig, mat):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    o.parent = rig; o.matrix_parent_inverse = rig.matrix_world.inverted()
    me.materials.append(mat)
    g = o.vertex_groups.new(name='head'); g.add(list(range(len(me.vertices))), 1.0, 'REPLACE')
    md = o.modifiers.new('Armature', 'ARMATURE'); md.object = rig
    o['accessory'] = name; return o


def _shell_bins(points, center, NB=(36, 18), smooth=False):
    d = points - np.array(center); r = np.linalg.norm(d, axis=1); u = d / np.maximum(r[:, None], 1e-9)
    th = np.arctan2(u[:, 0], -u[:, 1]); ph = np.arcsin(np.clip(u[:, 2], -1, 1))
    ti = ((th + math.pi) / math.tau * NB[0]).astype(int) % NB[0]; pi = np.clip(((ph + math.pi / 2) / math.pi * NB[1]).astype(int), 0, NB[1] - 1)
    grid = np.zeros(NB); np.maximum.at(grid, (ti, pi), r)
    g2 = grid.copy()   # spread each bin to its neighbours so no gap slips between them
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1): g2 = np.maximum(g2, np.roll(np.roll(grid, dx, 0), dy, 1))
    if smooth:   # then even out lone tufts (they make spikes in a hat)
        acc = np.zeros_like(g2); n = 0
        for dx in (-2, -1, 0, 1, 2):
            for dy in (-2, -1, 0, 1, 2): acc += np.roll(np.roll(g2, dx, 0), dy, 1); n += 1
        g2 = np.minimum(g2, acc / n + 0.006)
    def lookup(v):
        dv = np.array(v) - np.array(center); rr = np.linalg.norm(dv); uu = dv / max(rr, 1e-9)
        t = math.atan2(uu[0], -uu[1]); p = math.asin(max(-1, min(1, uu[2])))
        return g2[int((t + math.pi) / math.tau * NB[0]) % NB[0], min(NB[1] - 1, max(0, int((p + math.pi / 2) / math.pi * NB[1])))], rr
    return lookup


def envelope(F, hair_pts, ctr, squash=0.22):
    """radius, in every direction from ctr, that a hat must clear: the scalp, plus the hair pressed down to `squash` of its height"""
    scalp = _shell_bins(F['co'][F['co'][:, 2] > F['eye_z'] - 0.06], ctr)
    hair = _shell_bins(hair_pts, ctr, smooth=True) if hair_pts is not None and len(hair_pts) else None
    def need(co):
        s_, rr = scalp(co)
        up = (Vector(co) - ctr).normalized().z
        if hair and up < 0.8:   # over the crown the hat simply sits on the scalp: no tufts pushing it into a point
            h, _ = hair(co); s_ = max(s_, s_ + squash * max(0.0, h - s_))
        return s_, rr
    return need


def _dome(F, need, gap, flat=0.0, cut_front=0.016, cut_back=-0.03, spread=10):
    """a cap shell over the skull: an ellipsoid fitted to the head, then grown where the (pressed) hair needs room.
    The growth is a smooth field (each vertex's shortfall spread to its neighbours with a cos^spread falloff and the
    largest taken), so a lone tuft makes a gentle swell, never a point. Cut on a plane through the brow and above the ears."""
    ctr = F['ctr']
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=40, v_segments=20, radius=1.0)
    rx = F['temple'] + 0.004; ry = (F['back'] - F['front']) / 2 + 0.004; rz = (F['crown'] - ctr.z + 0.004) * (1 - flat)
    for v in bm.verts: v.co = Vector((v.co.x * rx, v.co.y * ry, v.co.z * rz)) + ctr
    plane = F['plane'](cut_front, cut_back)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if all(v.co.z < plane(v.co) for v in f.verts)], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    vs = list(bm.verts)
    D = np.array([(v.co - ctr).normalized()[:] for v in vs]); R = np.array([(v.co - ctr).length for v in vs])
    E = np.array([max(0.0, need(v.co)[0] + gap - r) for v, r in zip(vs, R)])
    W = np.clip(D @ D.T, 0, 1) ** spread
    add = (W * E[None, :]).max(1)
    for v, d, r, a in zip(vs, D, R, add): v.co = ctr + Vector(d) * (r + a)
    for _ in range(4):
        bmesh.ops.smooth_vert(bm, verts=vs, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
        for v in vs:
            nd, rr = need(v.co)
            if rr < nd + gap * 0.6: v.co = ctr + (v.co - ctr).normalized() * (nd + gap * 0.6)
            if v.co.z < plane(v.co) or v.is_boundary: v.co.z = plane(v.co)
    rim = [v for v in bm.verts if v.is_boundary]
    return bm, plane, rim


def hair_under_hat(rig, hair, F, need, gap=0.002):
    """a copy of the hair pressed inside the hats' envelope above their rim (shown instead of Hair when a hat is on)"""
    o = hair.copy(); o.data = hair.data.copy(); bpy.context.scene.collection.objects.link(o); o.name = 'Hair_hat'
    plane = F['plane'](0.03, -0.035); ctr = F['ctr']; M = o.matrix_world; Mi = M.inverted(); moved = 0
    for v in o.data.vertices:
        w = M @ v.co
        if w.z < plane(w) - 0.004: continue
        nd, rr = need(w)
        if rr > nd - gap: v.co = Mi @ (ctr + (w - ctr).normalized() * (nd - gap)); moved += 1
    o['accessory'] = 'Hair_hat'; return o, moved


def _solidify(o, t):
    m = o.modifiers.new('sol', 'SOLIDIFY'); m.thickness = t; m.offset = 1.0; m.use_even_offset = True
    _select_only(o); bpy.ops.object.modifier_move_to_index(modifier='sol', index=0); bpy.ops.object.modifier_apply(modifier='sol')


def _knit_image(name, col, rib=True, size=128):
    rng = np.random.default_rng(3); im = bpy.data.images.new(name, size, size, alpha=False)
    x = np.arange(size)[None, :]; y = np.arange(size)[:, None]
    tone = (0.88 + 0.12 * np.cos(x / size * math.tau * 24)) if rib else (0.9 + 0.1 * ((x // 4 + y // 4) % 2))
    tone = tone * (0.95 + 0.05 * rng.random((size, size)))
    px = np.ones((size, size, 4), np.float32); px[..., :3] = np.array(col)[None, None, :] * tone[..., None]
    im.pixels.foreach_set(px.ravel()); im.pack(); return im


def _planar_uv(bm, axis_u=0, axis_v=2, scale=8.0):
    uvl = bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        for l in f.loops: l[uvl].uv = (l.vert.co[axis_u] * scale, l.vert.co[axis_v] * scale)
    return uvl


ALL_ACC = ('hair_hat', 'beanie', 'cap_flat', 'glasses_round', 'glasses_square', 'moustache', 'beard')


def accessories(rig, parts, hair_col=(0.08, 0.06, 0.05), adult=True, seed=0, want=ALL_ACC, facial=None):
    """flat cap, beanie, round and square glasses; moustache and short beard for adults. Each is a separate small mesh on the
    head bone, fitted to this head and hair, exported with the character and hidden by default (manifest: accessories).
    want: which to make (a look makes only what it wears); facial: {'moustache': 'full' | 'grey', 'factor': True}"""
    F = head_frame(parts); out = {}
    hair = parts.get('Hair')
    hair_pts = np.array([(hair.matrix_world @ v.co)[:] for v in hair.data.vertices]) if hair else None
    need = envelope(F, hair_pts, F['ctr'])
    hats = {'beanie', 'cap_flat'} & set(want)
    if hair and hats and 'hair_hat' in want: out['hair_hat'], _ = hair_under_hat(rig, hair, F, need)
    ctr = F['ctr']
    if 'beanie' in want:   # ribbed knit, folded cuff
        bm, plane, rim = _dome(F, need, 0.004, cut_front=0.024, cut_back=-0.03)
        for v in bm.verts:
            h = v.co.z - plane(v.co)
            if h < 0.032: v.co = ctr + (v.co - ctr) * (1 + 0.045 * (1 - h / 0.032) ** 0.5)   # the turned-up cuff stands proud
        _planar_uv(bm, 0, 2, 6)
        o = _obj('Acc_beanie', bm, rig, _mat('acc_beanie', (0.12, 0.14, 0.22), 0.95, img=_knit_image('acc_beanie_knit', (0.2, 0.22, 0.32)))); _solidify(o, 0.004); out['beanie'] = o
    if 'cap_flat' in want: out['cap_flat'] = flat_cap(rig, F, need)
    # glasses
    if F['el'] is not None:
        y_lens = min(F['el'][1] - F['er_rad'] - 0.011, F['bridge_y'] - 0.004)
        temple_x = F['temple'] + 0.004; ear_y = (F['front'] + F['back']) / 2 + 0.005
        for style, col, metal, rough, shape, thick in (('round', (0.42, 0.42, 0.44), 1.0, 0.3, 'round', 0.0016), ('square', (0.04, 0.035, 0.035), 0.0, 0.35, 'square', 0.0028)):
            if 'glasses_' + style not in want: continue
            bm = bmesh.new()
            for e in (F['el'], F['er']):
                c = Vector((e[0] * 1.03, y_lens, e[2] - 0.002)); pts = []
                for i in range(28):
                    a = i / 28 * math.tau
                    if shape == 'round': x, z = 0.021 * math.cos(a), 0.019 * math.sin(a)
                    else:
                        cx, cz = math.cos(a), math.sin(a); k = 1 / max(abs(cx) ** 4 + abs(cz) ** 4, 1e-6) ** 0.25
                        x, z = 0.0225 * cx * k, 0.0165 * cz * k
                    pts.append(c + Vector((x, 0, z)))
                _tube(bm, pts, thick, closed=True)
                outer = max(pts, key=lambda p: abs(p.x)); top = max(pts, key=lambda p: p.z)
                sx = 1 if e[0] > 0 else -1
                hinge = Vector((sx * temple_x, y_lens + 0.008, outer.z + 0.004))
                # the arm runs straight back to the top of the ear and stops there (no hook showing beside the ear)
                _tube(bm, [outer, hinge, Vector((sx * temple_x, ear_y - 0.004, hinge.z - 0.006))], thick * 0.8)
            il = Vector((F['el'][0] * 1.03 - (0.021 if shape == 'round' else 0.026), y_lens, F['el'][2] + 0.004))
            _tube(bm, [il, Vector((0, min(y_lens, F['bridge_y'] - 0.006) - 0.002, il.z + 0.003)), Vector((-il.x, y_lens, il.z))], thick * 0.9)
            out['glasses_' + style] = _obj('Acc_glasses_' + style, bm, rig, _mat('acc_glasses_' + style, col, rough, metal))
    if adult and ({'moustache', 'beard'} & set(want)):
        out.update(facial_hair(rig, parts, F, hair_col, want=want, style=facial or {}))
    for o in out.values(): o.hide_render = True
    return out, F


def flat_cap(rig, F, need):
    """a flat cap: a low crown, flat on top and sloping down to the front, its front pulled forward over a short stiff
    brim that is snapped to it; the back sits low on the head. Tweed."""
    ctr = F['ctr']
    bm, plane, rim = _dome(F, need, 0.005, flat=0.5, cut_front=0.026, cut_back=-0.01)
    front, back = F['front'], F['back']; crown = max(v.co.z for v in bm.verts)
    zlim = lambda y: crown - 0.006 - 0.042 * (back - y) / max(back - front, 1e-3)
    for v in bm.verts:
        h = v.co.z - plane(v.co)
        if h <= 0.002: continue
        if v.co.z > zlim(v.co.y): v.co.z = zlim(v.co.y) + (v.co.z - zlim(v.co.y)) * 0.12      # the flat top
        k = min(1.0, h / 0.05)
        v.co.x = ctr.x + (v.co.x - ctr.x) * (1 + 0.07 * k)                                    # a fuller crown at the sides
        if v.co.y < ctr.y: v.co.y -= 0.036 * k * min(1.0, (ctr.y - v.co.y) / 0.05)            # pulled forward over the brim
    for _ in range(2): bmesh.ops.smooth_vert(bm, verts=[v for v in bm.verts if not v.is_boundary], factor=0.4, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    ang = lambda v: math.degrees(math.atan2(v.co.x - ctr.x, -(v.co.y - ctr.y)))
    rim = [v for v in bm.verts if v.is_boundary]
    ring = sorted([v for v in rim if abs(ang(v)) < 70], key=ang)
    if len(ring) > 3:
        tips = []
        for v in ring:
            a = math.radians(ang(v)); k = max(0.0, math.cos(a * 90 / 70)) ** 0.5
            out_ = Vector((v.co.x - ctr.x, v.co.y - ctr.y, 0)).normalized()
            tips.append(bm.verts.new(v.co + out_ * (0.034 * k + 0.002) + Vector((0, 0, -0.02 * k))))
        for a_, b_, c_, d_ in zip(ring, ring[1:], tips[1:], tips):
            try: bm.faces.new((a_, b_, c_, d_))
            except ValueError: pass
    _planar_uv(bm, 0, 1, 10)
    o = _obj('Acc_cap_flat', bm, rig, _mat('acc_cap', (0.3, 0.28, 0.25), 0.92, img=_tweed_image('acc_cap_tweed', (0.36, 0.33, 0.29)))); _solidify(o, 0.0035)
    return o


def _tweed_image(name, col, size=128):
    """herringbone tweed: a fine zigzag twill with flecks"""
    rng = np.random.default_rng(9); im = bpy.data.images.new(name, size, size, alpha=False)
    x = np.arange(size)[None, :]; y = np.arange(size)[:, None]
    zig = ((x + np.where((y // 8) % 2 == 0, y, -y)) // 2) % 4 < 2
    tone = 0.86 + 0.12 * zig + 0.1 * (rng.random((size, size)) - 0.5)
    fleck = rng.random((size, size)) > 0.985
    px = np.ones((size, size, 4), np.float32); px[..., :3] = np.array(col)[None, None, :] * tone[..., None]
    px[fleck, :3] = np.array(col) * 1.5
    im.pixels.foreach_set(np.clip(px, 0, 1).ravel()); im.pack(); return im


def _tube(bm, pts, r, closed=False, seg=6):
    """a thin round tube along a polyline"""
    rings = []
    n = len(pts)
    for i, p in enumerate(pts):
        a = pts[(i - 1) % n] if (closed or i > 0) else p; b = pts[(i + 1) % n] if (closed or i < n - 1) else p
        t = (b - a).normalized() if (b - a).length > 1e-6 else Vector((1, 0, 0))
        u = t.cross(Vector((0, 0, 1))); u = u.normalized() if u.length > 1e-4 else t.cross(Vector((1, 0, 0))).normalized(); w = t.cross(u)
        rings.append([bm.verts.new(p + (u * math.cos(k / seg * math.tau) + w * math.sin(k / seg * math.tau)) * r) for k in range(seg)])
    for i in range(n if closed else n - 1):
        A, B = rings[i], rings[(i + 1) % n]
        for k in range(seg): bm.faces.new((A[k], A[(k + 1) % seg], B[(k + 1) % seg], B[k]))
    if not closed:
        for R in (rings[0], rings[-1]): bm.faces.new(R)


def facial_hair(rig, parts, F, col, want=('moustache', 'beard'), style=None):
    """moustache and short beard: the head's own skin in that region, lifted 2-4 mm, carrying the mouth and jaw morphs,
    with a strand texture whose edge thins out"""
    from PIL import Image, ImageDraw, ImageFilter
    head = parts['Head']; co = F['co']; m = F['mouth']; mw = F['mouth_w']; out = {}; style = style or {}
    full = style.get('moustache') in ('full', 'grey')
    tex_col = (0.6, 0.6, 0.6) if style.get('factor') else col
    pk = F['pucker'] if F['pucker'] is not None else np.zeros(len(co))
    lip = pk > 0.45 * pk.max() if pk.max() > 0 else np.zeros(len(co), bool)
    jaw = F['jaw'] if F['jaw'] is not None else np.zeros(len(co))
    front = co[:, 1] < F['eye_y'] + 0.045
    nose_base = F['nose'][2] - 0.012
    ax = np.abs(co[:, 0]); inner = mw * 0.55; T = F['temple']
    k = np.clip((ax - inner) / max(T - inner, 1e-3), 0, 1)
    top = np.where(ax <= inner, m[2] - 0.013, (m[2] - 0.006) + (F['eye_z'] - 0.045 - (m[2] - 0.006)) * k ** 1.5)   # the sideburn stops well below the ear's top
    face = co[:, 1] < (F['front'] + F['back']) / 2 - 0.01
    droop = np.clip((ax - mw * 0.3) / (mw * 0.3), 0, 1) * (0.012 if full else 0.009)
    wide = 0.64 if full else 0.6
    moustache = face & (ax < mw * wide) & (co[:, 2] > m[2] + (0.0015 if full else 0.0025) - droop) & (co[:, 2] < F['nose'][2] - (0.002 if full else 0.0035)) & (co[:, 1] < m[1] + 0.008)
    beard = face & (ax < T - 0.012) & (co[:, 2] <= top) & (co[:, 2] > F['chin_z'] - 0.028)
    regions = {k: v for k, v in {'moustache': moustache, 'beard': beard | moustache}.items() if k in want}
    for name, sel in regions.items():
        if sel.sum() < 12: continue
        o = head.copy(); o.data = head.data.copy(); bpy.context.scene.collection.objects.link(o); o.name = 'Acc_' + name
        me = o.data
        keep = set(int(i) for i in np.nonzero(sel)[0])
        for p in me.polygons: p.select = not all(v in keep for v in p.vertices)
        _select_only(o); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_mode(type='FACE'); bpy.ops.mesh.delete(type='FACE')
        bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.delete_loose(); bpy.ops.object.mode_set(mode='OBJECT')
        if not len(me.vertices): bpy.data.objects.remove(o, do_unlink=True); continue
        lift = 0.0035 if name == 'beard' else (0.0034 if full else 0.0028)
        n = len(me.vertices); nr = np.empty(n * 3, np.float32); me.vertices.foreach_get('normal', nr); nr = nr * lift
        if me.shape_keys:
            B = np.empty(n * 3, np.float32); me.shape_keys.key_blocks[0].data.foreach_get('co', B)
            for kb in list(me.shape_keys.key_blocks):
                K = np.empty(n * 3, np.float32); kb.data.foreach_get('co', K)
                if kb != me.shape_keys.key_blocks[0] and np.abs(K - B).max() < 0.0008: o.shape_key_remove(kb); continue
                kb.data.foreach_set('co', K + nr)
            me.vertices.foreach_set('co', B + nr)
        else:
            C = np.empty(n * 3, np.float32); me.vertices.foreach_get('co', C); me.vertices.foreach_set('co', C + nr)
        me.update()
        # strand texture: planar UV over the region, alpha thinning toward the edge
        bm = bmesh.new(); bm.from_mesh(me)
        xs = [v.co.x for v in bm.verts]; zs = [v.co.z for v in bm.verts]; x0, x1, z0, z1 = min(xs), max(xs), min(zs), max(zs)
        uvl = bm.loops.layers.uv.active or bm.loops.layers.uv.new('UVMap')
        S = 256; polys = []
        for f in bm.faces:
            q = []
            for l in f.loops:
                u = (l.vert.co.x - x0) / max(x1 - x0, 1e-4) * 0.94 + 0.03; v = (l.vert.co.z - z0) / max(z1 - z0, 1e-4) * 0.94 + 0.03
                l[uvl].uv = (u, v); q.append((u * S, (1 - v) * S))
            polys.append(q)
        bm.to_mesh(me); bm.free()
        mask = Image.new('L', (S, S), 0); d = ImageDraw.Draw(mask)
        for q in polys: d.polygon(q, fill=255)
        dist = np.zeros((S, S), np.float32); cur = mask
        for k in range(10): cur = cur.filter(ImageFilter.MinFilter(3)); dist += np.asarray(cur, np.float32) / 255
        rng = np.random.default_rng(11 + len(name))
        strands = np.asarray(Image.fromarray(np.uint8(rng.random((S, S)) * 255)).filter(ImageFilter.GaussianBlur(0.6)).resize((S, S)), np.float32) / 255
        streak = np.asarray(Image.fromarray(np.uint8(rng.random((S, S // 6)) * 255)).resize((S, S), Image.BILINEAR), np.float32) / 255
        dens = np.clip(dist / (6.0 if full and name == 'moustache' else 9.0), 0, 1) ** 0.8 * ((0.66 + 0.3 * streak) if full and name == 'moustache' else (0.42 + 0.33 * streak))
        alpha = (strands < dens + 0.03).astype(np.float32) * (np.asarray(mask, np.float32) / 255)
        im = bpy.data.images.new('acc_' + name + '_strands', S, S, alpha=True)
        px = np.ones((S, S, 4), np.float32); tone = 0.75 + 0.35 * strands
        px[..., :3] = np.array(tex_col)[None, None, :] * tone[..., None]; px[..., 3] = alpha
        im.pixels.foreach_set(px[::-1].ravel()); im.pack()
        me.materials.clear(); fm = _mat('acc_' + name, col, 0.85, img=im, alpha=True); me.materials.append(fm)
        if style.get('factor'):
            import outfit; outfit.factor(fm, style['factor'])
        for g in list(o.vertex_groups): o.vertex_groups.remove(g)
        g = o.vertex_groups.new(name='head'); g.add(list(range(len(me.vertices))), 1.0, 'REPLACE')
        o['accessory'] = 'Acc_' + name; out[name] = o
    return out


def limit_weights(o, limit=4):
    """keep each vertex's `limit` largest weights and normalise them (in Python: the operator crashed on joined meshes)"""
    groups = list(o.vertex_groups)
    for v in o.data.vertices:
        ws = sorted(((g.weight, g.group) for g in v.groups if g.weight > 1e-5), reverse=True)
        keep = ws[:limit]; tot = sum(w for w, _ in keep) or 1.0; kept = {gi for _, gi in keep}
        for g in list(v.groups):
            if g.group not in kept: groups[g.group].remove([v.index])
        for w, gi in keep: groups[gi].add([v.index], w / tot, 'REPLACE')


# ------------------------------------------------------------------------------------------------ the far-crowd copy
LOD_TARGET = {'Body': 1500, 'Head': 700, 'Clothes': 1000, 'Clothes2': 500, 'Clothes3': 400, 'Shoes': 240, 'Hair': 520, 'Eyes': 96,
              'Look_scarf': 160, 'Look_apron': 120, 'Look_bangles': 24, 'Acc_cap_flat': 200, 'Acc_beanie': 160, 'Acc_backpack': 200}
TINT_SLOT = {'tint_top': 0, 'tint_inner': 1, 'tint_trim': 2, 'tint_scarf_a': 0, 'tint_scarf_b': 2}


def build_lod(rig, parts, size=512, gutter=4):
    """one mesh, one material, ~4k triangles, every texture packed into one atlas; COLOR_0 carries the tint regions:
    R = tint_top, G = tint_inner, B = tint_trim (1 where the club colour goes), A = 1."""
    from PIL import Image
    if 'HairLOD' in parts: parts = {('Hair' if n == 'HairLOD' else n): o for n, o in parts.items() if n != 'Hair'}
    use = [n for n in ('Body', 'Head', 'Clothes', 'Clothes2', 'Clothes3', 'Shoes', 'Hair', 'Eyes') if n in parts] + [n for n in parts if n.startswith('Look_') or n in ('Acc_cap_flat', 'Acc_beanie', 'Acc_backpack')]
    copies = []; tiles = {}
    for n in use:
        o = parts[n]; c = o.copy(); c.data = o.data.copy(); bpy.context.scene.collection.objects.link(c); c.name = 'lod_' + n
        if c.data.shape_keys: _select_only(c); c.shape_key_clear()
        for m in list(c.modifiers):
            if m.type != 'ARMATURE': c.modifiers.remove(m)
        for i, sl in enumerate(c.material_slots):
            node = _base_image(sl.material); key = node.image.name if node else ('col:' + sl.material.name if sl.material else 'none')
            if key not in tiles:
                if node: im = node.image; px = _pixels(im); alpha = n == 'Hair'
                else:
                    col = sl.material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value[:] if sl.material and sl.material.node_tree else (0.5, 0.5, 0.5, 1)
                    px = np.ones((8, 8, 4), np.float32) * np.array(col, np.float32); alpha = False
                tiles[key] = {'px': px, 'part': n, 'alpha': alpha}
        copies.append(c)
    # shelf-pack the tiles into a square: skin and clothes big, hair and shoes smaller, eyes small
    want = {'Body': 0.5, 'Head': 0.5, 'Clothes': 0.5, 'Clothes2': 0.25, 'Clothes3': 0.25, 'Shoes': 0.25, 'Hair': 0.25, 'Eyes': 0.125}
    order = sorted(tiles, key=lambda k: -want.get(tiles[k]['part'], 0.125))
    A = 1024; x = y = 0; row = 0; atlas = np.zeros((A, A, 4), np.float32); atlas[..., 3] = 1
    for k in order:
        s_ = int(A * want.get(tiles[k]['part'], 0.125)) if not k.startswith('col:') else 32
        if x + s_ > A: x = 0; y += row; row = 0
        if y + s_ > A: s_ = 16; x, y = A - 16, A - 16
        im = Image.fromarray(np.uint8(np.clip(tiles[k]['px'], 0, 1) * 255)).resize((s_ - 2 * gutter, s_ - 2 * gutter), Image.LANCZOS)
        im = np.asarray(im, np.float32) / 255
        im = np.pad(im, ((gutter, gutter), (gutter, gutter), (0, 0)), mode='edge')
        atlas[y:y + s_, x:x + s_] = im
        if not tiles[k]['alpha']: atlas[y:y + s_, x:x + s_, 3] = 1
        tiles[k]['rect'] = ((x + gutter) / A, (y + gutter) / A, (s_ - 2 * gutter) / A, (s_ - 2 * gutter) / A)
        x += s_; row = max(row, s_)
    # remap UVs into the tiles; write the tint mask
    for c in copies:
        me = c.data; uv = me.uv_layers[0] if me.uv_layers else None
        while len(me.uv_layers) > 1: me.uv_layers.remove(me.uv_layers[-1])
        col = me.color_attributes.new('tint', 'BYTE_COLOR', 'CORNER')
        mats = [sl.material for sl in c.material_slots]
        for p in me.polygons:
            m = mats[p.material_index] if p.material_index < len(mats) else None
            node = _base_image(m); key = node.image.name if node else ('col:' + m.name if m else 'none')
            rx, ry, rw, rh = tiles[key]['rect'] if key in tiles else (0, 0, 0, 0)
            tint = [0, 0, 0]
            if m and m.name in TINT_SLOT: tint[TINT_SLOT[m.name]] = 1
            for li in p.loop_indices:
                if uv:
                    u, v = uv.data[li].uv; u = min(max(u, 0), 1); v = min(max(v, 0), 1)
                    uv.data[li].uv = (rx + u * rw, ry + v * rh)
                col.data[li].color = (*tint, 1)
        tris = sum(len(p.vertices) - 2 for p in me.polygons); tgt = LOD_TARGET.get(c.name[4:], 400)
        if tris > tgt:
            md = c.modifiers.new('dec', 'DECIMATE'); md.ratio = tgt / tris; md.use_collapse_triangulate = True
            _select_only(c); bpy.ops.object.modifier_move_to_index(modifier='dec', index=0); bpy.ops.object.modifier_apply(modifier='dec')
    img = bpy.data.images.new('lod_atlas', A, A, alpha=True); img.pixels.foreach_set(atlas.ravel()); img.scale(size, size); img.pack()
    mat = _mat('lod', (1, 1, 1), 0.7, img=img, alpha=True)
    bpy.ops.object.select_all(action='DESELECT')
    for c in copies:
        c.data.materials.clear(); c.data.materials.append(mat); c.select_set(True)
    bpy.context.view_layer.objects.active = copies[0]; bpy.ops.object.join()
    lod = bpy.context.active_object; lod.name = 'LOD1'; lod.data.name = 'LOD1'
    _select_only(lod); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=0.0004); bpy.ops.object.mode_set(mode='OBJECT')
    limit_weights(lod, 4)
    if lod.data.color_attributes.get('tint'): lod.data.color_attributes.active_color = lod.data.color_attributes['tint']
    return lod, sum(len(p.vertices) - 2 for p in lod.data.polygons)

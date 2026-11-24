"""
LIFE character assets: hair made by script, for the looks (scripts/life/assets/looks.json).

The CC0 packs hold no curly hair, no buzz cut, no bun and no tight curls, and THE WORKER's people are mostly curly
and dark. So the looks grow their own hair on the head they are built on:

  · an underlay: the scalp itself lifted 1.5 mm, opaque toward the crown and thinning to single hairs at the hairline,
    so no skin shows between the locks (for a buzz cut it is the whole haircut)
  · locks: alpha-tested ribbons ("hair cards") that start on the scalp, rise to the style's volume and then follow a
    comb field over the head (short hair) or fall under gravity round the neck and shoulders (long hair). Curly hair
    winds each ribbon round its own centre line, so a lock is a real 3D curl, not a painted one. A share of the locks
    get a second ribbon at right angles, so the silhouette stays full from the side.
  · a ponytail or a bun gathered at a point on the head, with a hair tie
  · `HairLOD`: the underlay pushed out to half the volume, for the far-crowd copy

Texture: one 512 px atlas, neutral grey (root darker than tip). The colour is the material's baseColorFactor, so one
file serves every hair colour and region (the game sets material.color). Weights: 100 % `head`, and for hair that falls
below the chin a blend down to `neck_01` and `spine_03`, so long hair stays on the shoulders when the head turns.
Everything is seeded: the same look always grows the same hair.
"""
import math, random
import bpy, bmesh
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ATLAS = 512
# atlas columns (u ranges): 0 straight, 1 wavy, 2 curly, 3 underlay / stubble
COLS = {'straight': (0.0, 0.25), 'wavy': (0.25, 0.5), 'curly': (0.5, 0.75), 'under': (0.75, 1.0)}


# ------------------------------------------------------------------------------------------------ texture
def atlas_image(name='hair_atlas', seed=5):
    """strands drawn per column; alpha 1 on a strand; grey value darker at the root (v = 0) than at the tip (v = 1)"""
    rng = np.random.default_rng(seed); S = ATLAS
    col = np.zeros((S, S), np.float32); alpha = np.zeros((S, S), np.float32)
    v = np.linspace(0, 1, S)[:, None]
    for ci, kind in enumerate(('straight', 'wavy', 'curly')):
        x0 = int(COLS[kind][0] * S); w = int(0.25 * S)
        n = 70 if kind != 'curly' else 85
        for k in range(n):
            cx = rng.uniform(0.08, 0.92) * w
            amp = {'straight': rng.uniform(0, 1.2), 'wavy': rng.uniform(3, 6), 'curly': rng.uniform(5, 11)}[kind]
            freq = {'straight': rng.uniform(0.5, 1.5), 'wavy': rng.uniform(2.0, 3.0), 'curly': rng.uniform(5, 8)}[kind]
            end = rng.uniform(0.62, 1.0); ph = rng.uniform(0, math.tau); tone = rng.uniform(0.55, 1.0)
            ys = np.arange(int(end * S))
            xs = cx + amp * np.sin(ys / S * freq * math.tau + ph) * (0.6 + 0.4 * ys / S)
            th = rng.uniform(0.7, 1.6) * (1 - 0.5 * ys / S)
            for dx in (-1, 0, 1):
                xi = np.clip((xs + dx).astype(int), 0, w - 1) + x0
                a = np.clip(th - abs(dx) * 0.8, 0, 1)
                alpha[ys, xi] = np.maximum(alpha[ys, xi], a)
                col[ys, xi] = np.maximum(col[ys, xi], tone * (0.62 + 0.38 * ys / S) * (a > 0))
        # the root of a lock is dense: fill between strands there, fading out by a third of the length
        fill = np.clip(1 - v / 0.38, 0, 1) * 0.75
        edge = np.minimum(np.arange(w) / (0.12 * w), (w - 1 - np.arange(w)) / (0.12 * w)).clip(0, 1)[None, :]
        alpha[:, x0:x0 + w] = np.maximum(alpha[:, x0:x0 + w], fill * edge * (0.55 + 0.45 * rng.random((S, w))))
        col[:, x0:x0 + w] = np.where(col[:, x0:x0 + w] > 0, col[:, x0:x0 + w], 0.5 + 0.1 * v)
    # underlay: u runs round the head, v from the hairline (0) to well inside it (1): stubble dots that thicken inward
    x0 = int(COLS['under'][0] * S); w = S - x0
    dots = rng.random((S, w)); dens = np.clip(0.15 + 0.95 * v, 0, 1)
    alpha[:, x0:] = (dots < dens).astype(np.float32)
    col[:, x0:] = 0.42 + 0.18 * rng.random((S, w))
    im = bpy.data.images.new(name, S, S, alpha=True)
    px = np.ones((S, S, 4), np.float32); px[..., 0] = px[..., 1] = px[..., 2] = np.clip(col, 0, 1); px[..., 3] = np.clip(alpha, 0, 1)
    im.pixels.foreach_set(px.ravel()); im.pack(); return im


def hair_material(name, colour, img):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs[0].default_value = 1.0
    nt.links.new(t.outputs['Color'], mx.inputs[6]); mx.inputs[7].default_value = (*colour, 1)
    nt.links.new(mx.outputs[2], b.inputs['Base Color']); nt.links.new(t.outputs['Alpha'], b.inputs['Alpha'])
    b.inputs['Roughness'].default_value = 0.5
    if 'Coat Weight' in b.inputs: pass
    m['alpha'] = 'mask'; return m


# ------------------------------------------------------------------------------------------------ geometry helpers
HAIRLINE = [(0, 0.062), (30, 0.058), (55, 0.045), (75, 0.030), (95, 0.026), (112, 0.008), (130, -0.03), (155, -0.062), (180, -0.075)]


def _hairline(theta, F, spec):
    """height of the hairline above the eyes at an angle round the head (0 = front, 180 = nape)"""
    a = abs(math.degrees(theta)); tab = HAIRLINE
    for (a0, h0), (a1, h1) in zip(tab, tab[1:]):
        if a <= a1:
            h = h0 + (h1 - h0) * (a - a0) / (a1 - a0); break
    else: h = tab[-1][1]
    h += spec.get('hairline', 0.0) * (1 - a / 180)              # a higher (receding) or lower forehead
    if a > 120: h += spec.get('nape', 0.0)
    return F['eye_z'] + h * F.get('scale', 1.0)


def _theta(p, ctr): return math.atan2(p.x - ctr.x, -(p.y - ctr.y))


def _frame(F):
    """head centre and a scale (1 = an adult head); children's heads are smaller"""
    ctr = F['ctr'].copy(); sc = (F['back'] - F['front']) / 0.195
    F['scale'] = max(0.75, min(1.15, sc)); return ctr


def scalp_faces(head, F, spec, margin=0.0):
    M = head.matrix_world; ctr = _frame(F); out = []
    for p in head.data.polygons:
        c = M @ p.center; n = (M.to_3x3() @ p.normal).normalized()
        if n.dot((c - ctr).normalized()) < 0.15: continue
        if c.z > _hairline(_theta(c, ctr), F, spec) - margin: out.append(p.index)
    return out


def underlay(head, F, spec, lift=0.0016, name='under'):
    """the scalp's own faces, lifted; UV in the underlay column: u round the head, v = distance in from the hairline"""
    ctr = _frame(F); sel = set(scalp_faces(head, F, spec, margin=0.004))
    bm = bmesh.new(); bm.from_mesh(head.data); bm.transform(head.matrix_world)
    for lay in list(bm.verts.layers.deform): bm.verts.layers.deform.remove(lay)   # the head's own weights and keys stay behind
    for lay in list(bm.verts.layers.shape): bm.verts.layers.shape.remove(lay)
    for lay in list(bm.loops.layers.uv): bm.loops.layers.uv.remove(lay)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in sel], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.normal_update()
    for v in bm.verts: v.co += v.normal * lift
    uvl = bm.loops.layers.uv.new('UVMap'); u0, u1 = COLS['under']
    for f in bm.faces:
        for l in f.loops:
            p = l.vert.co; th = _theta(p, ctr)
            d = (p.z - _hairline(th, F, spec)) / (0.03 * F['scale'])
            l[uvl].uv = (u0 + 0.02 + (u1 - u0 - 0.04) * (0.5 + th / math.tau), min(0.98, max(0.02, d)))
    return bm


class Shell:
    """the head's outer surface as a radius per direction from the head centre (scalp, ears and face included)"""
    def __init__(self, F, NB=(96, 48)):
        self.ctr = _frame(F); co = F['co']; d = co - np.array(self.ctr); r = np.linalg.norm(d, axis=1); u = d / r[:, None]
        th = np.arctan2(u[:, 0], -u[:, 1]); ph = np.arcsin(np.clip(u[:, 2], -1, 1)); self.NB = NB
        ti = ((th + math.pi) / math.tau * NB[0]).astype(int) % NB[0]; pi = np.clip(((ph + math.pi / 2) / math.pi * NB[1]).astype(int), 0, NB[1] - 1)
        g = np.zeros(NB); np.maximum.at(g, (ti, pi), r)
        def sh(x, a, b):   # round the head wraps (theta); over the poles it does not (phi is clamped)
            x = np.roll(x, a, 0)
            if b > 0: return np.concatenate([x[:, :1].repeat(b, 1), x[:, :-b]], 1)
            if b < 0: return np.concatenate([x[:, -b:], x[:, -1:].repeat(-b, 1)], 1)
            return x
        for _ in range(6):   # fill empty bins from their neighbours, then even out
            m = g == 0
            if not m.any(): break
            nb = np.maximum.reduce([sh(g, a, b) for a in (-1, 0, 1) for b in (-1, 0, 1)]); g[m] = nb[m]
        acc = sum(sh(g, a, b) for a in (-1, 0, 1) for b in (-1, 0, 1)) / 9
        self.g = np.maximum(g, acc)

    def r(self, u):
        t = math.atan2(u[0], -u[1]); p = math.asin(max(-1, min(1, u[2])))
        return float(self.g[int((t + math.pi) / math.tau * self.NB[0]) % self.NB[0], min(self.NB[1] - 1, max(0, int((p + math.pi / 2) / math.pi * self.NB[1])))])


# ------------------------------------------------------------------------------------------------ locks
def _ribbon(bm, uvl, pts, widths, sides, ucol, flip=False):
    """a strip of quads along pts, half-width w across `sides`; UV u across the column, v along the lock"""
    u0, u1 = ucol; n = len(pts); prev = None
    for i in range(n):
        a = bm.verts.new(pts[i] - sides[i] * widths[i]); b = bm.verts.new(pts[i] + sides[i] * widths[i])
        if prev:
            try:
                f = bm.faces.new((prev[0], prev[1], b, a))
                vv = [(i - 1) / (n - 1), (i - 1) / (n - 1), i / (n - 1), i / (n - 1)]
                for l, uu, vq in zip(f.loops, (u0, u1, u1, u0), vv): l[uvl].uv = (uu, 0.02 + 0.96 * vq)
            except ValueError: pass
        prev = (a, b)


def _tangent(v, n):
    t = v - n * v.dot(n)
    return t.normalized() if t.length > 1e-6 else n.orthogonal().normalized()


def grow(head, F, spec, body_objs=(), seed=1):
    """the locks and the underlay as one bmesh (world space) plus, per vertex, how far below the chin it hangs"""
    rnd = random.Random(seed); ctr = _frame(F); sc = F['scale']; sh = Shell(F)
    kind = spec.get('style', 'short')
    tex = spec.get('texture', 'curly' if kind in ('curly', 'afro') else 'wavy' if kind == 'wavy' else 'straight')
    bm = underlay(head, F, spec)
    uvl = bm.loops.layers.uv.active
    if kind == 'buzz': return bm
    vol = spec.get('volume', 0.03) * sc; L = spec.get('length', 0.08) * sc; curl = spec.get('curl', 0.0) * sc
    pitch = spec.get('pitch', 0.035) * sc; width = spec.get('width', 0.022) * sc; n_roots = int(spec.get('density', 520))
    long_ = L > 0.16 * sc
    tree = None
    if body_objs:
        b2 = bmesh.new()
        for o in body_objs:
            t = bmesh.new(); t.from_mesh(o.data); t.transform(o.matrix_world); me = bpy.data.meshes.new('_t'); t.to_mesh(me); t.free(); b2.from_mesh(me); bpy.data.meshes.remove(me)
        tree = BVHTree.FromBMesh(b2); b2.free()
    # roots: area-weighted over the scalp
    M = head.matrix_world; faces = scalp_faces(head, F, spec, margin=-0.004)
    tris = []
    for i in faces:
        p = head.data.polygons[i]; vs = [M @ head.data.vertices[j].co for j in p.vertices]
        for k in range(1, len(vs) - 1): tris.append((vs[0], vs[k], vs[k + 1]))
    areas = np.array([((b - a).cross(c - a)).length / 2 for a, b, c in tris]); cum = np.cumsum(areas) / areas.sum()
    whorl = ctr + Vector((0.012, (F['back'] - ctr.y) * 0.55, (F['crown'] - ctr.z) * 0.92))
    gather = None
    if kind in ('ponytail', 'bun'):
        g = spec.get('gather', 'high'); hb = F['back'] - ctr.y
        gather = ctr + Vector((0, hb * {'high': 0.62, 'mid': 0.92, 'low': 0.98}[g], (F['crown'] - ctr.z) * {'high': 0.82, 'mid': 0.35, 'low': -0.05}[g]))
        gather = ctr + (gather - ctr).normalized() * (sh.r((gather - ctr).normalized()) + 0.006)
    face_x = max(0.058 * sc, F['temple'] * 0.86); chin = F['chin_z']
    hang_of = {}
    for k in range(n_roots):
        a, b, c = tris[int(np.searchsorted(cum, rnd.random()))]
        r1, r2 = rnd.random(), rnd.random()
        if r1 + r2 > 1: r1, r2 = 1 - r1, 1 - r2
        root = a + (b - a) * r1 + (c - a) * r2
        u = (root - ctr).normalized(); th = _theta(root, ctr); front = abs(math.degrees(th)) < 45
        gathered = kind in ('ponytail', 'bun')
        fringe = bool(spec.get('fringe')) and abs(math.degrees(th)) < spec.get('fringe_deg', 42 if gathered else 50)
        if gathered and fringe: gathered = False
        # the comb field: away from the crown whorl and down; a fringe falls forward, swept styles go back
        comb = _tangent(root - whorl, u)
        if gathered: comb = _tangent(gather - root, u)
        elif (spec.get('swept') or long_) and front: comb = _tangent(Vector((math.copysign(1.0, root.x if abs(root.x) > 0.004 else rnd.random() - 0.5), 0.55, 0.25)), u)
        elif spec.get('part') == 'side' and front: comb = _tangent(Vector((math.copysign(1, root.x - 0.02), 0.3, -0.4)), u)
        if fringe: comb = _tangent(Vector((root.x * 3, -1, -0.9)), u)
        if kind == 'spiky': comb = (u * 1.4 + _tangent(Vector((0, 0.3, 1)), u) * 0.5).normalized()
        length = L * rnd.uniform(0.75, 1.15)
        if front and not long_ and not gathered: length *= spec.get('front_len', 1.0)
        if abs(math.degrees(th)) > 120 and not long_: length *= spec.get('back_len', 0.75)
        if gathered: length = (gather - root).length * 1.05
        elif fringe and spec.get('fringe_len'): length = spec['fringe_len'] * sc * rnd.uniform(0.85, 1.1)
        segs = max(5, min(9, int(length / (0.011 * sc)) + 2)) if curl > 0 else max(4, min(8, int(length / (0.02 * sc)) + 2))
        if long_ and not gathered: segs = 12
        h_top = vol * rnd.uniform(0.55, 1.0)
        side = abs(math.sin(th)) * max(0.0, 1 - max(0.0, u.z) * 1.6)        # the sides and the back of the head are cut closer
        h_top *= 1 - (1 - spec.get('side_vol', 0.6)) * side
        if gathered: h_top = 0.004 + 0.004 * rnd.random()
        elif kind in ('ponytail', 'bun'): h_top = 0.008
        if kind == 'spiky': h_top = length
        pts = []; p = root.copy(); dirn = comb; falling = False; phase = rnd.uniform(0, math.tau); hand = rnd.choice((-1, 1))
        step = length / segs
        for i in range(segs + 1):
            s_ = i / segs
            if i == 0: q = root + u * 0.001
            elif kind == 'spiky':
                q = root + dirn * (length * s_)
            elif not falling:
                # travel over the shell along the comb, at a height that rises to the volume
                p = p + dirn * step; uu = (p - ctr).normalized()
                h = 0.0015 + (h_top - 0.0015) * min(1, s_ / 0.35) ** 0.7
                p = ctr + uu * (sh.r(uu) + h)
                dirn = _tangent(dirn, uu)
                if not gathered:
                    dirn = (dirn + _tangent(Vector((0, 0.15, -1)), uu) * (0.35 if long_ else 0.08) * s_).normalized()
                    if long_ and not (fringe and kind in ('ponytail', 'bun')) and (p.z < F['eye_z'] - 0.02 * sc or uu.z < -0.1): falling = True
                    if fringe and p.z < F['eye_z'] + 0.014 * sc: p.z = F['eye_z'] + 0.014 * sc   # a fringe stops above the brows
                if not long_ and not gathered and i > 1 and p.z < _hairline(_theta(p, ctr), F, spec) - spec.get('below', 0.022) * sc:
                    break
                if long_ and p.y < ctr.y - 0.01 and abs(p.x) < face_x + width and p.z < _hairline(_theta(p, ctr), F, spec) + 0.01:
                    p.x = math.copysign(face_x + width, p.x if abs(p.x) > 1e-4 else root.x)
                q = p
            else:
                # free fall round the neck and the shoulders
                dirn = (dirn * 0.55 + Vector((0, 0.08, -1)) * 0.45).normalized(); p = p + dirn * step
                if tree:
                    loc, nrm, _, dist = tree.find_nearest(p)
                    if loc is not None and (dist < 0.012 or (p - loc).dot(nrm) < 0): p = loc + nrm * 0.012
                uu = (p - ctr).normalized(); rr = (p - ctr).length; rmin = sh.r(uu) + 0.004
                if rr < rmin: p = ctr + uu * rmin
                if p.y < ctr.y + 0.01 and abs(p.x) < face_x + width and p.z > chin - 0.03:
                    p.x = math.copysign(face_x + width, p.x if abs(p.x) > 1e-4 else root.x)
                q = p
            pts.append(q.copy())
        if len(pts) < 3: continue
        # curl: wind the ribbon round its centre line
        if curl > 0:
            cp = [pts[0]]
            for i in range(1, len(pts)):
                t = (pts[min(i + 1, len(pts) - 1)] - pts[i - 1]).normalized(); uu = (pts[i] - ctr).normalized()
                bvec = t.cross(uu).normalized(); nvec = bvec.cross(t).normalized()
                ang = phase + hand * math.tau * (i * step) / pitch; rr = curl * min(1, i / 2) * rnd.uniform(0.8, 1.2)
                q = pts[i] + (bvec * math.cos(ang) + nvec * math.sin(ang)) * rr
                uq = (q - ctr).normalized(); mn = sh.r(uq) + 0.002
                if (q - ctr).length < mn: q = ctr + uq * mn
                if long_ and q.y < ctr.y - 0.01 and abs(q.x) < face_x + width * 0.6 and chin - 0.03 < q.z < _hairline(_theta(q, ctr), F, spec) + 0.01:
                    q.x = math.copysign(face_x + width * 0.6, q.x if abs(q.x) > 1e-4 else 1)
                cp.append(q)
            pts = cp
        # ribbon frame: lying on the head (side vector tangent to the shell, across the lock)
        sides = []; widths = []
        for i, q in enumerate(pts):
            t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized(); uu = (q - ctr).normalized()
            sv = t.cross(uu); sv = sv.normalized() if sv.length > 1e-5 else t.orthogonal().normalized()
            sides.append(sv); s_ = i / (len(pts) - 1)
            widths.append(width * (0.55 + 0.45 * math.sin(math.pi * min(1, 0.25 + s_ * 0.9))) * (0.8 if kind == 'spiky' else 1.0) * (1 - 0.55 * s_ if kind == 'spiky' else 1))
        col = COLS[tex] if kind != 'spiky' else COLS['straight']
        _ribbon(bm, uvl, pts, widths, sides, col)
        if rnd.random() < spec.get('cross', 0.45):   # a second ribbon at right angles: full from the side
            ups = [(pts[i] - ctr).normalized() for i in range(len(pts))]
            _ribbon(bm, uvl, pts, [w * 0.7 for w in widths], ups, col)
    if kind == 'ponytail': _tail(bm, uvl, F, gather, spec, sc, tree, rnd, ctr)
    if kind == 'bun': _bun(bm, uvl, F, gather, spec, sc, rnd, ctr)
    return bm


def _tail(bm, uvl, F, g, spec, sc, tree, rnd, ctr):
    """a ponytail from the gather point: locks that leave backward and fall, spreading a little, with a tie"""
    L = spec.get('tail', 0.24) * sc; curl = spec.get('curl', 0.0) * sc; tex = 'curly' if curl > 0.004 else 'wavy'
    out = (g - ctr).normalized()
    for k in range(int(spec.get('tail_locks', 70))):
        off = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))) * 0.012 * sc
        p = g + off; d = (out * 0.8 + Vector((0, 0.3, 0.2))).normalized(); pts = [p.copy()]; segs = 10; step = L * rnd.uniform(0.75, 1.1) / segs
        ph = rnd.uniform(0, math.tau); spread = Vector((rnd.uniform(-1, 1), rnd.uniform(-0.3, 0.6), 0)) * 0.25
        for i in range(1, segs + 1):
            d = (d * 0.6 + (Vector((0, 0.12, -1)) + spread) * 0.4).normalized(); p = p + d * step
            if tree:
                loc, nrm, _, dist = tree.find_nearest(p)
                if loc is not None and (dist < 0.01 or (p - loc).dot(nrm) < 0): p = loc + nrm * 0.01
            q = p.copy()
            if curl > 0: q += Vector((math.cos(ph + i * 1.7), 0, math.sin(ph + i * 1.7))) * curl * 0.8
            pts.append(q)
        sides = [((pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized().cross(Vector((0, 1, 0)))).normalized() for i in range(len(pts))]
        widths = [0.016 * sc * (1 - 0.4 * i / segs) for i in range(len(pts))]
        _ribbon(bm, uvl, pts, widths, sides, COLS[tex])
        if k % 2: _ribbon(bm, uvl, pts, [w * 0.8 for w in widths], [Vector((0, 1, 0)).cross(sv).normalized() for sv in sides], COLS[tex])
    _tie(bm, uvl, g, out, 0.011 * sc)


def _bun(bm, uvl, F, g, spec, sc, rnd, ctr):
    """a bun: a ball of short locks wound round a sphere at the gather point, over an opaque core"""
    R = spec.get('bun', 0.032) * sc; out = (g - ctr).normalized(); c = g + out * R * 0.8
    core = bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=R * 0.82)
    for v in core['verts']: v.co += c
    u0, u1 = COLS['under']
    for f in {f for v in core['verts'] for f in v.link_faces}:
        for l in f.loops: l[uvl].uv = (u0 + 0.1 + 0.1 * rnd.random(), 0.95)
    for k in range(60):
        a = rnd.uniform(0, math.tau); el = rnd.uniform(-1.2, 1.2); axis = Vector((math.cos(a), math.sin(a) * 0.3, math.sin(el))).normalized()
        start = axis.orthogonal().normalized(); pts = []
        for i in range(9):
            ang = i / 8 * math.pi * 1.2
            q = (start * math.cos(ang) + axis.cross(start) * math.sin(ang)) * R * rnd.uniform(0.95, 1.1)
            pts.append(c + q)
        sides = [(p - c).normalized().cross((pts[min(i + 1, 8)] - pts[max(i - 1, 0)]).normalized()).normalized() for i, p in enumerate(pts)]
        _ribbon(bm, uvl, pts, [0.012 * sc] * 9, sides, COLS['wavy'])
    _tie(bm, uvl, g + out * 0.004, out, R * 0.7)


def _tie(bm, uvl, c, axis, r):
    """a hair tie: a short ring round the gather point (dark, from the underlay column)"""
    a = axis.orthogonal().normalized(); b = axis.cross(a).normalized(); ring = []
    for i in range(12):
        t = i / 12 * math.tau; d = a * math.cos(t) + b * math.sin(t)
        ring.append((bm.verts.new(c + d * r - axis * 0.004), bm.verts.new(c + d * r + axis * 0.004)))
    u0 = COLS['under'][0]
    for i in range(12):
        (a1, b1), (a2, b2) = ring[i], ring[(i + 1) % 12]
        try:
            f = bm.faces.new((a1, a2, b2, b1))
            for l in f.loops: l[uvl].uv = (u0 + 0.05, 0.97)
        except ValueError: pass


# ------------------------------------------------------------------------------------------------ the object
def _skin(o, rig, F):
    """head 100 %; below the chin a blend down to the neck and the upper back"""
    names = {b.name for b in rig.data.bones}
    gh = o.vertex_groups.new(name='head'); gn = o.vertex_groups.new(name='neck_01') if 'neck_01' in names else gh
    gs = o.vertex_groups.new(name='spine_03') if 'spine_03' in names else gn
    top = F['chin_z'] + 0.01; bot = F['chin_z'] - 0.16
    for v in o.data.vertices:
        z = (o.matrix_world @ v.co).z
        k = max(0.0, min(1.0, (top - z) / (top - bot)))
        if k <= 0: gh.add([v.index], 1.0, 'REPLACE'); continue
        gh.add([v.index], max(0.0, 1 - 1.6 * k), 'REPLACE')
        gn.add([v.index], max(0.0, 1 - abs(k - 0.5) * 2) * 0.6, 'ADD')
        gs.add([v.index], k, 'ADD')


def _obj(name, bm, rig, mat, F):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    o.parent = rig; o.matrix_parent_inverse = rig.matrix_world.inverted(); me.materials.append(mat)
    _skin(o, rig, F)
    md = o.modifiers.new('Armature', 'ARMATURE'); md.object = rig
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    try: bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    except Exception: pass
    return o


def make_hair(rig, parts, F, spec, colour, seed=1):
    """Hair (locks + underlay) and HairLOD (the underlay pushed out to half the volume) for a look"""
    head = parts['Head']; img = atlas_image('hair_atlas_' + rig.name)
    body = [parts[n] for n in parts if n == 'Body' or n.startswith('Clothes')]
    bm = grow(head, F, spec, body, seed)
    mat = hair_material('hair', colour, img)
    hair = _obj('Hair', bm, rig, mat, F)
    lb = underlay(head, F, spec, lift=0.0016 + 0.5 * spec.get('volume', 0.03) * F['scale'] if spec.get('style') != 'buzz' else 0.0016)
    lod = _obj('HairLOD', lb, rig, mat, F)
    lod.hide_render = True
    return hair, lod, sum(len(p.vertices) - 2 for p in hair.data.polygons)

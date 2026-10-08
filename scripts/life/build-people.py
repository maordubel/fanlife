#!/usr/bin/env python3
"""
Build the LIFE town people kit: one skinned human body that every character in the 3D town is made from.

Source (CC0 1.0, MakeHuman / MPFB asset licence — base mesh, macro targets, game-engine rig + weights,
UV masks): https://github.com/makehumancommunity/makehuman and https://github.com/makehumancommunity/mpfb2
Nothing of their program code is used; this script only reads their data files.

  python3 scripts/life/build-people.py <makehuman/data dir> <mpfb2 src/mpfb/data dir>

Writes public/life/town/people/body.bin + body.json (geometry, skin weights, morph basis, joints,
garment templates, hair field) and public/life/town/people/skin.png (tintable detail + masks).
Everything is deterministic; re-running it with the same inputs gives the same bytes.
"""
import sys, os, json, gzip, math
import numpy as np
from PIL import Image

MH = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/s/mh/repo/makehuman/data'
MP = sys.argv[2] if len(sys.argv) > 2 else '/tmp/claude-0/s/mh/mpfb/src/mpfb/data'
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'life', 'town', 'people')
os.makedirs(OUT, exist_ok=True)
S = 0.1  # MakeHuman decimetres -> metres

# ---------------------------------------------------------------- base mesh
V = []; VT = []; F = []; FT = []; G = []; grp = None
for ln in open(MH + '/3dobjs/base.obj'):
    if ln.startswith('v '): V.append([float(x) for x in ln.split()[1:4]])
    elif ln.startswith('vt '): VT.append([float(x) for x in ln.split()[1:3]])
    elif ln.startswith('g '): grp = ln.split()[1].strip()
    elif ln.startswith('f '):
        idx = [p.split('/') for p in ln.split()[1:]]
        F.append([int(a[0]) - 1 for a in idx]); FT.append([int(a[1]) - 1 for a in idx]); G.append(grp)
V = np.array(V); VT = np.array(VT); NV = len(V)
_gr = json.load(open(MP + '/mesh_metadata/basemesh_vertex_groups.json'))
groups = {k: [i for a, b in v for i in range(a, b + 1)] for k, v in _gr.items()}

# ---------------------------------------------------------------- macro model (MakeHuman's own weighting)
_tcache = {}
def target(rel):
    if rel in _tcache: return _tcache[rel]
    d = np.zeros((NV, 3)); p = MH + '/targets/' + rel
    if os.path.exists(p):
        for ln in open(p):
            if ln.startswith('#') or not ln.strip(): continue
            a = ln.split(); d[int(a[0])] = [float(a[1]), float(a[2]), float(a[3])]
    else:
        raise FileNotFoundError(rel)
    _tcache[rel] = d; return d

def three(v):  # min/average/max weights for a 0..1 slider
    return {'min': max(0., 1 - 2 * v), 'average': 1 - abs(2 * v - 1), 'max': max(0., 2 * v - 1)}

def model(g=.5, age='young', muscle=.5, weight=.5, race=(1/3, 1/3, 1/3), height=.5, cup=.5):
    gw = {'female': 1 - g, 'male': g}
    aw = {'baby': 0., 'child': 0., 'young': 0., 'old': 0.}; aw[age] = 1.
    mw = three(muscle); ww = three(weight); hw = three(height); cw = three(cup)
    out = V.copy()
    for gn, a in gw.items():
        if a == 0: continue
        for an, b in aw.items():
            if b == 0: continue
            for mn, c in mw.items():
                if c == 0: continue
                for wn, d in ww.items():
                    if d == 0: continue
                    k = a * b * c * d
                    out += k * target(f'macrodetails/universal-{gn}-{an}-{mn}muscle-{wn}weight.target')
                    for hn, e in hw.items():
                        if hn == 'average' or e == 0: continue
                        out += k * e * target(f'macrodetails/height/{gn}-{an}-{mn}muscle-{wn}weight-{hn}height.target')
                    if gn == 'female':
                        for cn, e in cw.items():
                            if cn == 'average' or e == 0: continue
                            out += k * e * target(f'breast/{gn}-{an}-{mn}muscle-{wn}weight-{cn}cup-averagefirmness.target')
            for rn, r in zip(('african', 'asian', 'caucasian'), race):
                if r: out += a * b * r * target(f'macrodetails/{rn}-{gn}-{an}.target')
    return out

print('macro model …')
B = model()
basis = {}
def add(name, arr): basis[name] = arr
Fy, My = model(g=0), model(g=1)
add('fem', Fy - B); add('mal', My - B)
add('oldF', model(g=0, age='old') - Fy); add('oldM', model(g=1, age='old') - My)
add('kidF', model(g=0, age='child') - Fy); add('kidM', model(g=1, age='child') - My)
add('heavyF', model(g=0, weight=1) - Fy); add('heavyM', model(g=1, weight=1) - My)
add('thinF', model(g=0, weight=0) - Fy); add('thinM', model(g=1, weight=0) - My)
add('musF', model(g=0, muscle=1) - Fy); add('musM', model(g=1, muscle=1) - My)
for i, rn in enumerate(('afr', 'asi', 'cau')):
    r = [0, 0, 0]; r[i] = 1
    add(rn + 'F', model(g=0, race=r) - Fy); add(rn + 'M', model(g=1, race=r) - My)
add('tall', .5 * (model(g=0, height=1) - Fy) + .5 * (model(g=1, height=1) - My))
add('short', .5 * (model(g=0, height=0) - Fy) + .5 * (model(g=1, height=0) - My))
add('cup', model(g=0, cup=1) - Fy)

# ---------------------------------------------------------------- body faces (no helpers)
body_f = [i for i, g in enumerate(G) if g == 'body']
quads = np.array([F[i] for i in body_f]); quadsT = np.array([FT[i] for i in body_f])
NB = int(quads.max()) + 1  # body verts are 0..NB-1
assert NB == 13380
tri = np.concatenate([quads[:, [0, 1, 2]], quads[:, [0, 2, 3]]])
triT = np.concatenate([quadsT[:, [0, 1, 2]], quadsT[:, [0, 2, 3]]])
# split vertices on UV seams
pairs = {}; split_v = []; split_t = []
stri = np.zeros_like(tri)
for k in range(len(tri)):
    for j in range(3):
        key = (int(tri[k, j]), int(triT[k, j]))
        if key not in pairs:
            pairs[key] = len(split_v); split_v.append(key[0]); split_t.append(key[1])
        stri[k, j] = pairs[key]
split_v = np.array(split_v); split_t = np.array(split_t)
print('body', NB, 'verts', len(split_v), 'split', len(tri), 'tris')

# ---------------------------------------------------------------- joints
def jpos(arr, name):
    return arr[groups[name]].mean(0)
rig = json.load(open(MP + '/rigs/standard/rig.game_engine.json'))
BONES = []
def order(n):
    if n in BONES: return
    p = rig[n]['parent']
    if p: order(p)
    BONES.append(n)
for n in rig: order(n)
def joints_of(arr):
    return np.array([jpos(arr, rig[n]['head']['cube_name']) for n in BONES])
EXTRA = ['joint-l-eye', 'joint-r-eye', 'joint-head-2', 'joint-mouth', 'joint-jaw', 'joint-l-upperlid', 'joint-r-upperlid']
def extra_of(arr): return np.array([jpos(arr, n) for n in EXTRA])
J0 = joints_of(B); X0 = extra_of(B)

# ---------------------------------------------------------------- skin weights (top 4)
W = json.load(open(MP + '/rigs/standard/weights.game_engine.json'))['weights']
wl = [[] for _ in range(NB)]
for bn, lst in W.items():
    bi = BONES.index(bn)
    for vi, w in lst:
        if vi < NB: wl[vi].append((w, bi))
SKI = np.zeros((NB, 4), np.uint8); SKW = np.zeros((NB, 4), np.uint8)
for i, l in enumerate(wl):
    l = sorted(l, reverse=True)[:4]
    s = sum(w for w, _ in l) or 1
    q = [int(round(255 * w / s)) for w, _ in l]
    if q: q[0] += 255 - sum(q)
    for j, (w, b) in enumerate(l): SKI[i, j] = b; SKW[i, j] = q[j]
dom = SKI[:, 0]

# ---------------------------------------------------------------- procedural morphs: jaw open, blink
def procedural_morphs(P):
    jaw = np.zeros((NV, 3)); blink = np.zeros((NV, 3))
    jj = jpos(P, 'joint-jaw'); mo = jpos(P, 'joint-mouth'); head = jpos(P, 'joint-head')
    for i in range(NB):
        p = P[i]
        if BONES[dom[i]] not in ('head', 'neck_01'): continue
        # below the mouth line, in front of the jaw hinge: rotates about the hinge (x axis)
        r = p - jj
        lowness = (mo[1] + .05 - p[1]) / .25  # >0 below the lip line
        front = (p[2] - (jj[2] - .3)) / .6
        k = np.clip(lowness, 0, 1) * np.clip(front, 0, 1)
        if p[1] < jj[1] - 1.6: k *= max(0., 1 - (jj[1] - 1.6 - p[1]) / .6)  # fade into the neck
        if k <= 0: continue
        a = .32 * k
        y = r[1] * math.cos(a) - r[2] * math.sin(a); z = r[1] * math.sin(a) + r[2] * math.cos(a)
        jaw[i] = [0, y - r[1], z - r[2]]
    eL = jpos(P, 'joint-l-eye'); eR = jpos(P, 'joint-r-eye')
    for side in ('l', 'r'):
        e = jpos(P, f'joint-{side}-eye'); other = eR if side == 'l' else eL
        for i in range(NB):
            p = P[i]; d = p - e
            if np.linalg.norm(p - other) < np.linalg.norm(d): continue
            if abs(d[0]) > .3 or d[2] < -.05: continue
            if d[1] < -.02 or d[1] > .42: continue
            if np.hypot(d[0], d[1]) > .6: continue
            # upper lid slides down over the eye, most in the middle of the opening
            lat = max(0., 1 - abs(d[0]) / .5) ** .7
            h = np.clip(1 - (d[1] - .15) / .3, 0, 1) if d[1] > .15 else np.clip(d[1] / .15 + .2, 0, 1)
            k = lat * h
            blink[i] = [0, -k * (max(d[1], 0) + .16) * .92, k * .02]
    return jaw, blink
jaw, blink = procedural_morphs(B)
add('jaw', jaw); add('blink', blink)

# ---------------------------------------------------------------- garments: templates over body triangles
J = {n: J0[i] for i, n in enumerate(BONES)}
P0 = B[:NB]
def along(p, a, b):
    ab = b - a; return np.clip(((p - a) @ ab) / (ab @ ab), -1, 2)
side_bones = lambda base: (base + '_l', base + '_r')
bone_of = np.array([BONES[d] for d in dom])
def in_set(names): return np.isin(bone_of, list(names))
fingers = [b for b in BONES if any(b.startswith(f) for f in ('index', 'middle', 'ring', 'pinky', 'thumb'))]
TORSO = ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'clavicle_l', 'clavicle_r']
vals = {}
# parameter along each arm: 0 shoulder, 1 elbow, 2 wrist
arm_t = np.full(NB, -9.); leg_t = np.full(NB, -9.)
for s in ('l', 'r'):
    m = np.isin(bone_of, [f'upperarm_{s}', f'lowerarm_{s}', f'hand_{s}', f'clavicle_{s}'] + [f for f in fingers if f.endswith('_' + s)])
    sh, el, wr = J[f'upperarm_{s}'], J[f'lowerarm_{s}'], J[f'hand_{s}']
    t1 = along(P0, sh, el); t2 = along(P0, el, wr)
    t = np.where(t1 < 1, t1, 1 + t2)
    arm_t = np.where(m, t, arm_t)
    m2 = np.isin(bone_of, [f'thigh_{s}', f'calf_{s}', f'foot_{s}', f'ball_{s}'])
    hp, kn, an = J[f'thigh_{s}'], J[f'calf_{s}'], J[f'foot_{s}']
    t1 = along(P0, hp, kn); t2 = along(P0, kn, an)
    leg_t = np.where(m2, np.where(t1 < 1, t1, 1 + t2), leg_t)
neckY = J['neck_01'][1]; headY = J['head'][1]; pelvY = J['pelvis'][1]; hipY = J['thigh_l'][1]
y = P0[:, 1]; z = P0[:, 2]; x = P0[:, 0]
is_head = in_set(['head']); is_neck = in_set(['neck_01'])
is_torso = in_set(TORSO)
is_arm = arm_t > -9; is_leg = leg_t > -9
shoulder_x = abs(J['upperarm_l'][0])
# landmarks in decimetres (the base mesh's own unit): the hip joint is the reference
HEM = hipY - 0.05          # a shirt ends just below the hip line
BELT = hipY + 1.25         # trousers come up to the waist
neck_base = neckY - 0.45
crew = neck_base - np.clip(z - J['neck_01'][2], 0, None) * 0.35
vneck = neck_base - np.clip(z - J['neck_01'][2], 0, None) * 1.1
upper = (is_torso | is_neck)
top_body = upper & (y < crew) & (y > HEM)
def arm_upto(t): return is_arm & (arm_t < t)
def leg_upto(t): return is_leg & (leg_t < t)
nofing = ~in_set(fingers)
lower = in_set(['pelvis', 'spine_01', 'thigh_l', 'thigh_r']) & (y < BELT)
TEMPL = {
    'tee': top_body | arm_upto(.5) & nofing,
    'long': top_body | arm_upto(1.86) & nofing,
    'jacket': upper & (y < vneck + .15) & (y > HEM - 1.1) | arm_upto(1.9) & nofing | is_leg & (y > HEM - 1.1) & (leg_t < .4),
    'tank': upper & (y < vneck) & (y > HEM) & ~((abs(x) > shoulder_x * .55) & (y > J['spine_03'][1] + .9)),
    'pants': lower | leg_upto(1.93),
    'shorts': lower | leg_upto(.5),
    'shoes': is_leg & (leg_t > 1.86) | in_set(['foot_l', 'foot_r', 'ball_l', 'ball_r']),
}
otri = tri  # body triangles over original vertex ids
tmpl_tris = {}
for k, m in TEMPL.items():
    sel = np.where(m[otri].all(1))[0]
    tmpl_tris[k] = sel.astype(np.uint16)
    print('template', k, len(sel))

# ---------------------------------------------------------------- hair field (0 = bald skin, 255 = deep in the hair)
eyeL = jpos(B, 'joint-l-eye'); eyeR = jpos(B, 'joint-r-eye'); eyeY = (eyeL[1] + eyeR[1]) / 2
top = P0[is_head, 1].max(); hc = J['head']
hf = np.zeros(NB)
for i in np.where(is_head | is_neck)[0]:
    p = P0[i] - np.array([0, 0, hc[2] - .1])
    ang = abs(math.degrees(math.atan2(p[0], p[2])))  # 0 = front, 180 = back
    R = top - eyeY; nape = (neckY + .2) - eyeY
    knots = [(0, .52 * R), (24, .5 * R), (44, .36 * R), (60, .22 * R), (72, -.04), (82, -.12), (88, .1), (96, .28), (116, .2), (148, nape), (180, nape)]
    for (a0, h0), (a1, h1) in zip(knots, knots[1:]):
        if a0 <= ang <= a1:
            t = (ang - a0) / (a1 - a0); t = t * t * (3 - 2 * t); hl = eyeY + h0 + (h1 - h0) * t; break
    hf[i] = np.clip((P0[i, 1] - hl) / .25 * 128 + 128, 0, 255)
earmask = np.zeros(NB, bool)
for e in (eyeL, eyeR):
    s = np.sign(e[0])
    ear = np.array([s * abs(P0[is_head, 0]).max() * .96, eyeY - .15, hc[2] - .05])
    earmask |= (np.linalg.norm(P0 - ear, axis=1) < .3) & (np.sign(P0[:, 0]) == s)
hf[earmask] = np.minimum(hf[earmask], 60)
hairfield = hf.astype(np.uint8)

# ---------------------------------------------------------------- limb angle: where on the sleeve / trouser leg a point sits
# 0 = not a limb; arms 1..127, legs 129..255, measured around the limb's own axis from its outer side (stripes run there)
limb = np.zeros(NB, np.uint8)
for s_ in ('l', 'r'):
    sg = 1 if s_ == 'l' else -1
    for kind, (a, b, c_), lo in (('arm', ('upperarm_', 'lowerarm_', 'hand_'), 1), ('leg', ('thigh_', 'calf_', 'foot_'), 129)):
        A, Bj, C = J[a + s_], J[b + s_], J[c_ + s_]
        mask = (arm_t > -9) if kind == 'arm' else (leg_t > -9)
        mask &= (np.sign(P0[:, 0]) == sg)
        for i in np.where(mask)[0]:
            p = P0[i]; t = arm_t[i] if kind == 'arm' else leg_t[i]
            q0, q1 = (A, Bj) if t < 1 else (Bj, C)
            ax = q1 - q0; ax = ax / np.linalg.norm(ax)
            r = p - q0; r = r - ax * (r @ ax)
            out = np.array([sg, 0, 0], float) if kind == 'leg' else np.array([0, 1, 0], float)
            out = out - ax * (out @ ax); out /= np.linalg.norm(out) + 1e-9
            fw = np.cross(ax, out)
            ang = math.atan2(r @ fw, r @ out)  # 0 = outer side
            limb[i] = lo + int(round((ang / math.pi * .5 + .5) * 126))
# moustache: above the upper lip, found from the lips mask itself
_lm = np.asarray(Image.open(MP + '/textures/mpfb_lips.jpg').convert('L'), np.float32) / 255.
_lw = _lm.shape[1]
vuv = np.zeros((NB, 2)); vcnt = np.zeros(NB)
for k in range(len(tri)):
    for j_ in range(3):
        vuv[tri[k, j_]] += VT[triT[k, j_]]; vcnt[tri[k, j_]] += 1
vuv /= np.maximum(vcnt, 1)[:, None]
lipv = np.array([_lm[int((1 - v) * (_lw - 1)), int(u * (_lw - 1))] for u, v in vuv]) > .5
lipv &= is_head
lipTop = P0[lipv, 1].max(); lipX = P0[lipv, 0]; lipHalf = (lipX.max() - lipX.min()) / 2; lipZ = P0[lipv, 2].max()
stache = np.zeros(NB, np.uint8)
for i in np.where(is_head & ~lipv)[0]:
    p = P0[i]
    if p[2] < lipZ - .3: continue
    dy = p[1] - lipTop; dx = abs(p[0])
    # a full 80s moustache: wider than the mouth, thick in the middle, the ends turning down past the corners
    wid = max(lipHalf * 1.55, .3); arch = .09 - .05 * (dx / wid) ** 2
    band = np.clip(1 - abs(dy - arch) / .13, 0, 1) * np.clip(1 - (dx - wid) / .08, 0, 1)
    if dy < .02 and dx > wid * .7:  # the corners droop a little past the mouth
        band = max(band, np.clip(1 - abs(dy + .06) / .1, 0, 1) * np.clip(1 - abs(dx - wid * .92) / .08, 0, 1) * .9)
    stache[i] = int(np.clip(band * 255, 0, 255))

# ---------------------------------------------------------------- skin texture bake (UV space)
TS = 1024
print('baking skin …')
# per-vertex data used by the painter: position, normal, cavity
def vnormals(P, tris):
    n = np.zeros_like(P)
    a, b, c = P[tris[:, 0]], P[tris[:, 1]], P[tris[:, 2]]
    fn = np.cross(b - a, c - a)
    for j in range(3): np.add.at(n, tris[:, j], fn)
    return n / (np.linalg.norm(n, axis=1, keepdims=True) + 1e-9)
N0 = vnormals(P0, otri)
# cavity: how far a vertex sits below the mean of its neighbours (along its normal)
nb_sum = np.zeros_like(P0); nb_cnt = np.zeros(NB)
for a, b in ((0, 1), (1, 2), (2, 0)):
    np.add.at(nb_sum, otri[:, a], P0[otri[:, b]]); np.add.at(nb_cnt, otri[:, a], 1)
    np.add.at(nb_sum, otri[:, b], P0[otri[:, a]]); np.add.at(nb_cnt, otri[:, b], 1)
lap = nb_sum / nb_cnt[:, None] - P0
cav = (lap * N0).sum(1)  # >0 concave
cav = np.clip(cav / (np.percentile(np.abs(cav), 95) + 1e-9), -1, 1)

uv = VT[split_t]
img = np.zeros((TS, TS, 4), np.float32)
cov = np.zeros((TS, TS), np.float32)
attr = np.concatenate([P0, N0, cav[:, None]], 1)  # 7 floats per orig vertex
A = np.zeros((TS, TS, 7), np.float32)
for k in range(len(stri)):
    ids = stri[k]; t = uv[ids] * (TS - 1); t[:, 1] = (TS - 1) - t[:, 1]
    x0, y0 = np.floor(t.min(0)).astype(int); x1, y1 = np.ceil(t.max(0)).astype(int)
    x0 = max(x0 - 1, 0); y0 = max(y0 - 1, 0); x1 = min(x1 + 1, TS - 1); y1 = min(y1 + 1, TS - 1)
    gx, gy = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
    (ax, ay), (bx, by), (cx, cy) = t
    d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    if abs(d) < 1e-9: continue
    l1 = ((by - cy) * (gx - cx) + (cx - bx) * (gy - cy)) / d
    l2 = ((cy - ay) * (gx - cx) + (ax - cx) * (gy - cy)) / d
    l3 = 1 - l1 - l2
    m = (l1 >= -.02) & (l2 >= -.02) & (l3 >= -.02)
    if not m.any(): continue
    o = split_v[ids]
    val = l1[m, None] * attr[o[0]] + l2[m, None] * attr[o[1]] + l3[m, None] * attr[o[2]]
    A[gy[m], gx[m]] = val; cov[gy[m], gx[m]] = 1
Pp = A[..., :3]; Np = A[..., 3:6]; Cv = A[..., 6]
def mask(name):
    im = Image.open(MP + f'/textures/mpfb_{name}.jpg').convert('L').resize((TS, TS), Image.BILINEAR)
    return np.asarray(im, np.float32) / 255.
lips = mask('lips'); lids = mask('eyelids'); nails = mask('fingernails'); ears = mask('ears')
rng = np.random.default_rng(7)
def noise(scale, octaves=4):
    out = np.zeros((TS, TS), np.float32); amp = 1; tot = 0
    for o in range(octaves):
        n = max(2, int(TS / scale * 2 ** o))
        r = rng.random((n, n)).astype(np.float32)
        out += amp * np.asarray(Image.fromarray((r * 255).astype(np.uint8)).resize((TS, TS), Image.BICUBIC), np.float32) / 255.
        tot += amp; amp *= .5
    return out / tot
n1 = noise(64); n2 = noise(8, 2)
inhead = cov > 0
lx = Pp[..., 0]; ly = Pp[..., 1]; lz = Pp[..., 2]
# --- R: luminance detail: cavity darkening, mottling, pores
R = 1 - np.clip(Cv, 0, 1) * .22 + np.clip(-Cv, 0, 1) * .05 + (n1 - .5) * .10 + (n2 - .5) * .05
# eye socket shadow
for e in (eyeL, eyeR):
    d = np.sqrt(((lx - e[0]) / .55) ** 2 + ((ly - e[1] + .02) / .42) ** 2)
    front = np.clip((lz - (e[2] - .6)) / .4, 0, 1)
    R -= np.clip(1 - d, 0, 1) ** 1.5 * .16 * front
R -= lids * .05
R += nails * .12
# --- G: warmth/redness (lips strong, cheeks, nose, ears, knuckles soft)
Gm = lips * 1.0
cheekL = np.array([eyeL[0] * 1.1, eyeY - .32, eyeL[2] - .08])
for s in (1, -1):
    c = cheekL * np.array([s, 1, 1])
    d = np.sqrt(((lx - c[0]) / .3) ** 2 + ((ly - c[1]) / .25) ** 2 + ((lz - c[2]) / .35) ** 2)
    Gm += np.clip(1 - d, 0, 1) ** 2 * .35
nose = jpos(B, 'joint-head-2')
nt = np.array([0, eyeY - .35, P0[is_head, 2].max()])
d = np.linalg.norm(Pp - nt, axis=-1) / .18; Gm += np.clip(1 - d, 0, 1) ** 2 * .3
Gm += ears * .25
Gm = np.clip(Gm, 0, 1)
# --- B: brows + lash line (hair-coloured)
Bm = np.zeros((TS, TS), np.float32)
for e in (eyeL, eyeR):
    s = np.sign(e[0])
    u = (lx - e[0]) * s  # outward
    t = np.clip((u + .13) / .36, 0, 1)  # 0 inner end, 1 outer end
    arch = e[1] + .2 + .035 * np.sin(np.clip(t, 0, 1) * math.pi * .9) - .025 * t
    thick = .042 * (1 - .5 * t) + .012
    db = np.abs(ly - arch) / thick
    inside = (u > -.14) & (u < .25) & (lz > e[2] - .25)
    hairs = .75 + .5 * (noise(4, 1) - .5)
    Bm = np.maximum(Bm, np.where(inside, np.clip(1 - db, 0, 1) ** .7 * np.clip((u + .14) / .04, 0, 1) * np.clip((.25 - u) / .05, 0, 1) * hairs, 0))
    # upper lash line
    de = np.sqrt(((lx - e[0]) / .15) ** 2 + ((ly - e[1] - .005) / .062) ** 2)
    ring = np.clip(1 - np.abs(de - 1) / .16, 0, 1) * (ly > e[1] - .005) * (lz > e[2] - .05) * (.6 + .4 * np.clip(((lx - e[0]) * np.sign(e[0])) / .15, 0, 1))
    Bm = np.maximum(Bm, ring * .7)
# --- A: beard / stubble region
mo = jpos(B, 'joint-mouth'); jw = jpos(B, 'joint-jaw')
Am = np.zeros((TS, TS), np.float32)
frontish = lz > (jw[2] - .55)
below = np.clip((eyeY - .3 - ly) / .12, 0, 1)
abv_neck = np.clip((ly - (neckY + .05)) / .25, 0, 1)
side_lim = np.clip(1 - (np.abs(lx) - .58) / .1, 0, 1)
lipsfree = 1 - np.clip(lips * 2.5, 0, 1)
Am = below * abv_neck * side_lim * lipsfree * frontish * (.75 + .5 * (noise(3, 1) - .5))
Am = np.where(inhead, Am, 0)
img = np.stack([np.clip(R, 0, 1), Gm, np.clip(Bm, 0, 1), np.clip(Am, 0, 1)], -1)
img[~inhead] = [1, 0, 0, 0]
# dilate into the gutters so mip-maps don't bleed black
from PIL import ImageFilter
pil = Image.fromarray((img * 255).astype(np.uint8), 'RGBA')
m = Image.fromarray((inhead * 255).astype(np.uint8))
for _ in range(6):
    grown = pil.filter(ImageFilter.MaxFilter(3))
    mm = np.asarray(m) > 0
    a = np.asarray(pil).copy(); g = np.asarray(grown)
    a[~mm] = g[~mm]; pil = Image.fromarray(a)
    m = m.filter(ImageFilter.MaxFilter(3))
pil.save(OUT + '/skin.png', optimize=True)

# ---------------------------------------------------------------- pack
blobs = []; sections = {}
def put(name, arr, extra=None):
    arr = np.ascontiguousarray(arr)
    off = sum(len(b) for b in blobs)
    raw = arr.tobytes(); pad = (-len(raw)) % 4
    blobs.append(raw + b'\0' * pad)
    sections[name] = {'o': off, 'n': int(arr.size), 't': arr.dtype.str.lstrip('<|')}
    if extra: sections[name].update(extra)
pos = (P0 * S).astype(np.float32)
put('pos', pos)
put('uv', (VT[split_t] * 65535).round().astype(np.uint16))
put('split', split_v.astype(np.uint16))
put('tri', stri.astype(np.uint16))
put('otri', otri.astype(np.uint16))
put('ski', SKI); put('skw', SKW)
put('hair', hairfield)
put('cav', np.clip(cav * 127 + 128, 0, 255).astype(np.uint8))
put('limb', limb)
put('stache', stache)
put('joints', (J0 * S).astype(np.float32))
put('extra', (X0 * S).astype(np.float32))
morphs = []
for name, d in basis.items():
    d = d * S
    db = d[:NB]
    nz = np.where(np.abs(db).max(1) > 2e-5)[0]
    mx = float(np.abs(db[nz]).max()) if len(nz) else 1e-6
    q = np.round(db / mx * 32767).astype(np.int16)
    jd = np.array([jpos(d, rig[n]['head']['cube_name']) for n in BONES], np.float32)
    xd = np.array([jpos(d, n) for n in EXTRA], np.float32)
    if len(nz) < NB * .45:
        put('m_' + name + '_i', nz.astype(np.uint16)); put('m_' + name, q[nz])
        morphs.append({'name': name, 'scale': mx / 32767, 'sparse': True})
    else:
        put('m_' + name, q); morphs.append({'name': name, 'scale': mx / 32767, 'sparse': False})
    put('j_' + name, jd); put('x_' + name, xd)
for k, v in tmpl_tris.items(): put('t_' + k, v)
eyeV = np.array(groups['helper-l-eye'])
eyeRad = float(np.linalg.norm(B[eyeV] - B[eyeV].mean(0), axis=1).mean() * S)
parents = [BONES.index(rig[n]['parent']) if rig[n]['parent'] else -1 for n in BONES]
head = {
    'version': 1, 'source': 'MakeHuman 1.x base mesh, macro targets; MPFB2 game_engine rig, weights and UV masks (CC0 1.0)',
    'units': 'metres, +y up, facing +z', 'nb': NB, 'ns': int(len(split_v)), 'nt': int(len(stri)),
    'eyeRadius': eyeRad, 'bones': BONES, 'parents': parents, 'extra': EXTRA, 'morphs': morphs, 'templates': list(tmpl_tris), 'sections': sections,
}
with open(OUT + '/body.bin', 'wb') as f:
    for b in blobs: f.write(b)
json.dump(head, open(OUT + '/body.json', 'w'), separators=(',', ':'))
print('wrote', sum(len(b) for b in blobs) // 1024, 'KiB')

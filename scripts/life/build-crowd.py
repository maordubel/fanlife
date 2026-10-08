"""Crowd figures for the terraces, from the same CC0 MakeHuman body the cast is built on.

Reads public/life/town/people/body.{bin,json} and writes public/life/town/people/crowd.{bin,json}:
three static poses (arms down, one arm up, both arms up), decimated to ~1,100 triangles each, with a
per-vertex region byte (0 skin, 1 shirt, 2 trousers, 3 shoes, 4 hair). The terrace draws them as
instanced meshes and colours each region per instance, so a stand is people, not capsules.

Run: python3 scripts/life/build-crowd.py   (needs numpy + fast-simplification)
"""
import json, os
import numpy as np
import fast_simplification as fs

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'life', 'town', 'people')
H = json.load(open(os.path.join(ROOT, 'body.json')))
D = open(os.path.join(ROOT, 'body.bin'), 'rb').read()
TY = {'f4': np.float32, 'u2': np.uint16, 'u1': np.uint8, 'i2': np.int16}
def sec(n):
    s = H['sections'][n]; return np.frombuffer(D, TY[s['t']], s['n'], s['o'])

NB = H['nb']; BONES = H['bones']
pos = sec('pos').reshape(-1, 3).astype(np.float64)
mal = next(m for m in H['morphs'] if m['name'] == 'mal')
pos = pos + sec('m_mal').reshape(-1, 3) * mal['scale']
J = sec('joints').reshape(-1, 3) + sec('j_mal').reshape(-1, 3)
J = {n: J[i] for i, n in enumerate(BONES)}
tri = sec('otri').reshape(-1, 3).astype(np.int64)
ski = sec('ski').reshape(-1, 4); skw = sec('skw').reshape(-1, 4) / 255.0
hair = sec('hair')

# ---- regions
reg = np.zeros(NB, np.uint8)
def mark(tname, v):
    t = tri[sec('t_' + tname).astype(np.int64)]; reg[np.unique(t)] = v
mark('tee', 1); mark('pants', 2); mark('shoes', 3)
head_i = BONES.index('head')
on_head = (ski == head_i) & (skw > .5)
reg[(hair > 140) & on_head.any(1)] = 4

# ---- poses: rotate each arm chain about its shoulder (linear blend by the chain's skin weight)
def chain(s):
    names = [f'upperarm_{s}', f'lowerarm_{s}', f'hand_{s}'] + [b for b in BONES if b.endswith('_' + s) and b.split('_')[0] in ('index', 'middle', 'ring', 'pinky', 'thumb')]
    ids = [BONES.index(n) for n in names]
    return (np.isin(ski, ids) * skw).sum(1)
def rot(a, b):
    a = a / np.linalg.norm(a); b = b / np.linalg.norm(b); v = np.cross(a, b); c = a @ b
    K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + K + K @ K / (1 + c)
def pose(P, s, target):
    sh, hd = J[f'upperarm_{s}'], J[f'hand_{s}']
    R = rot(hd - sh, np.array(target, float)); w = chain(s)[:, None]
    return P * (1 - w) + ((P - sh) @ R.T + sh) * w
sx = lambda s: 1 if J[f'upperarm_{s}'][0] > 0 else -1
def down(P, s): return pose(P, s, [.13 * sx(s), -1, .06])
def up(P, s): return pose(P, s, [.22 * sx(s), 1, .18])

V = {
    'down': down(down(pos, 'l'), 'r'),
    'one': up(down(pos, 'l'), 'r'),
    'both': up(up(pos, 'l'), 'r'),
}

# ---- inflate clothes and hair a touch so the silhouette reads as dressed
def normals(P, T):
    n = np.zeros_like(P); f = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]])
    for k in range(3): np.add.at(n, T[:, k], f)
    return n / (np.linalg.norm(n, axis=1, keepdims=True) + 1e-12)
PAD = np.array([0, .008, .007, .004, .012])

blobs = []; sections = {}; out = {'units': 'metres, +y up, facing +z', 'regions': ['skin', 'shirt', 'trousers', 'shoes', 'hair'], 'poses': []}
def put(name, arr):
    arr = np.ascontiguousarray(arr); raw = arr.tobytes(); raw += b'\0' * ((-len(raw)) % 4)
    sections[name] = {'o': sum(len(b) for b in blobs), 'n': int(arr.size), 't': arr.dtype.str.lstrip('<|')}; blobs.append(raw)

for name, P in V.items():
    P = P + normals(P, tri) * PAD[reg][:, None]
    nv, nt = fs.simplify(P.astype(np.float32), tri.astype(np.int32), target_reduction=1 - 1100 / len(tri))
    # each new vertex takes the region of the nearest original vertex
    r = np.empty(len(nv), np.uint8)
    for i0 in range(0, len(nv), 512):
        d = ((nv[i0:i0 + 512, None, :] - P[None, :, :]) ** 2).sum(2); r[i0:i0 + 512] = reg[d.argmin(1)]
    nv = nv - np.array([0, nv[:, 1].min(), 0])  # feet on y=0
    n = normals(nv.astype(np.float64), nt)
    put(f'{name}_pos', nv.astype(np.float32)); put(f'{name}_nrm', np.round(n * 127).astype(np.int8).view(np.uint8))
    put(f'{name}_reg', r); put(f'{name}_idx', nt.astype(np.uint16))
    out['poses'].append(name); print(name, len(nv), 'verts', len(nt), 'tris', 'height', round(float(nv[:, 1].max()), 3))

out['sections'] = sections
with open(os.path.join(ROOT, 'crowd.bin'), 'wb') as f:
    for b in blobs: f.write(b)
json.dump(out, open(os.path.join(ROOT, 'crowd.json'), 'w'), separators=(',', ':'))

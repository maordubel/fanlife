#!/usr/bin/env python3
"""
LIFE · TOWN — real motion for the people: CMU motion capture, read once, kept as gait curves.

The town's people are moved through a small facade (hip, knee, shoulder, elbow, pelvis, torso, head —
`public/life/town/kit.js`), and until now every walk was a sine wave. This reads real captured walks and runs
(Carnegie Mellon University Graphics Lab Motion Capture Database, BVH conversion by B. Hahne / cgspeed),
measures the angles the facade understands from the captured skeleton's own joint positions, folds every
complete stride of the take into ONE averaged loop, and writes the loops to `public/life/town/mocap.json`.

What is measured (all in the body's own frame, so the direction the actor walked does not matter):
  · thigh  — how far each thigh swings forward of straight down (sagittal plane), and out to the side;
  · knee   — the bend between thigh and shin;
  · arm    — how far each upper arm swings forward of straight down; elbow — the bend of the forearm;
  · pelvis — its twist and its roll; torso — its twist against the pelvis, its lean and its roll;
  · bob    — the pelvis height over the stride, as a fraction of leg length (so a child and a man both bob right).

Measured on positions, never on the BVH's Euler channels: the conversion's T-pose and its joint axes differ
from our facade, and an angle read off a channel would be an angle about the wrong axis.

Usage: python3 scripts/life/mocap-clips.py <dir-with-bvh> → public/life/town/mocap.json
The source takes are named in CLIPS below; `content/manual/asset-provenance.json` carries the credit.
"""
import json
import math
import sys
from pathlib import Path

import numpy as np

# take → which clip it feeds. Several takes of one gait are averaged (more strides, less of one actor's quirks).
CLIPS = {
    'walk': ['16_15.bvh', '16_16.bvh', '16_21.bvh', '16_22.bvh', '16_31.bvh', '16_32.bvh', '35_01.bvh', '02_01.bvh', '08_01.bvh', '08_02.bvh'],
    'run': ['16_35.bvh', '16_36.bvh', '16_45.bvh', '16_46.bvh', '16_56.bvh', '09_01.bvh', '09_02.bvh', '09_03.bvh', '09_04.bvh', '09_05.bvh', '09_06.bvh', '02_03.bvh'],
}
N = 48  # samples per stride


def parse(path: Path):
    lines = path.read_text().split('\n')
    joints, stack, order = [], [], []
    i = 0
    while i < len(lines):
        t = lines[i].strip().split()
        if not t:
            i += 1
            continue
        if t[0] in ('ROOT', 'JOINT'):
            joints.append({'name': t[1], 'parent': stack[-1] if stack else -1, 'offset': None, 'channels': []})
            order.append(len(joints) - 1)
        elif t[0] == 'End':
            joints.append({'name': '_end', 'parent': stack[-1], 'offset': None, 'channels': []})
        elif t[0] == '{':
            stack.append(len(joints) - 1)
        elif t[0] == '}':
            stack.pop()
        elif t[0] == 'OFFSET':
            joints[stack[-1]]['offset'] = np.array([float(x) for x in t[1:4]])
        elif t[0] == 'CHANNELS':
            joints[stack[-1]]['channels'] = t[2:]
        elif t[0] == 'MOTION':
            break
        i += 1
    frames = int(lines[i + 1].split()[1])
    ft = float(lines[i + 2].split()[2])
    data = np.array([[float(x) for x in l.split()] for l in lines[i + 3:i + 3 + frames] if l.strip()])
    return joints, data, ft


def rot(axis: str, deg: np.ndarray) -> np.ndarray:
    a = np.radians(deg)
    c, s = np.cos(a), np.sin(a)
    o, z = np.ones_like(a), np.zeros_like(a)
    if axis == 'X':
        m = [[o, z, z], [z, c, -s], [z, s, c]]
    elif axis == 'Y':
        m = [[c, z, s], [z, o, z], [-s, z, c]]
    else:
        m = [[c, -s, z], [s, c, z], [z, z, o]]
    return np.moveaxis(np.array(m), [0, 1], [-2, -1])


def fk(joints, data):
    """world positions of every joint, every frame (F × J × 3)"""
    F = len(data)
    pos = np.zeros((F, len(joints), 3))
    R = np.zeros((F, len(joints), 3, 3))
    col = 0
    for j, jt in enumerate(joints):
        local = np.tile(np.eye(3), (F, 1, 1))
        trans = np.tile(jt['offset'], (F, 1))
        for ch in jt['channels']:
            v = data[:, col]
            col += 1
            if ch.endswith('position'):  # the root's position channels are absolute
                trans = trans.copy()
                trans[:, 'XYZ'.index(ch[0])] = v
            else:
                local = local @ rot(ch[0], v)
        p = jt['parent']
        if p < 0:
            R[:, j] = local
            pos[:, j] = trans
        else:
            R[:, j] = R[:, p] @ local
            pos[:, j] = pos[:, p] + np.einsum('fij,fj->fi', R[:, p], trans)
    return pos


def angles(joints, pos):
    ix = {j['name']: k for k, j in enumerate(joints)}
    P = lambda n: pos[:, ix[n]]
    up = np.array([0.0, 1.0, 0.0])
    hipL, hipR = P('LeftUpLeg'), P('RightUpLeg')
    lat = hipL - hipR
    lat[:, 1] = 0
    lat /= np.linalg.norm(lat, axis=1, keepdims=True)
    # the body's forward: the way the pelvis faces (left × up points backward for a Y-up, right-handed body)
    fwd = np.cross(up, lat)
    # make sure forward is the way he is actually going
    vel = P('Hips')[-1] - P('Hips')[0]
    if np.dot(fwd.mean(0), vel) < 0:
        fwd = -fwd
        lat = -lat
    side = np.cross(fwd, up)  # his right

    def sag(v):  # how far forward of straight down, radians (positive = forward)
        return np.arctan2((v * fwd).sum(1), -(v * up).sum(1))

    def out(v):  # how far out to his side of straight down
        return np.arctan2((v * side).sum(1), -(v * up).sum(1))

    o = {}
    for s, S in (('l', 'Left'), ('r', 'Right')):
        th = P(f'{S}Leg') - P(f'{S}UpLeg')
        sh = P(f'{S}Foot') - P(f'{S}Leg')
        ua = P(f'{S}ForeArm') - P(f'{S}Arm')
        fa = P(f'{S}Hand') - P(f'{S}ForeArm')
        o[f'thigh_{s}'] = sag(th)
        o[f'thighOut_{s}'] = out(th) * (1 if s == 'r' else -1)
        o[f'knee_{s}'] = sag(th) - sag(sh)
        o[f'arm_{s}'] = sag(ua)
        o[f'elbow_{s}'] = sag(fa) - sag(ua)
    # pelvis twist: the hip line against the mean heading of the take; torso twist: the shoulder line against the hips
    def yaw(v):
        v = v.copy()
        v[:, 1] = 0
        return np.arctan2(v[:, 2], v[:, 0])
    pel = yaw(hipL - hipR)
    sho = yaw(P('LeftArm') - P('RightArm'))
    head = np.unwrap(pel)
    o['pelvisYaw'] = head - np.convolve(head, np.ones(120) / 120, mode='same')  # remove the slow turn of the walk
    tw = np.unwrap(sho) - np.unwrap(pel)
    o['torsoYaw'] = tw - tw.mean()
    hl = hipL - hipR
    o['pelvisRoll'] = np.arctan2(hl[:, 1], np.linalg.norm(hl[:, [0, 2]], axis=1))
    sp = P('Neck') - P('Hips')
    o['torsoLean'] = np.arctan2((sp * fwd).sum(1), (sp * up).sum(1))
    o['torsoRoll'] = np.arctan2((sp * side).sum(1), (sp * up).sum(1))
    leg = np.linalg.norm(P('LeftLeg') - P('LeftUpLeg'), axis=1).mean() + np.linalg.norm(P('LeftFoot') - P('LeftLeg'), axis=1).mean()
    y = P('Hips')[:, 1]
    o['bob'] = (y - y.mean()) / leg
    # how far one stride carries him, in leg lengths (for matching the feet to the ground)
    o['_leg'] = leg
    return o


def strides(o, s='l'):
    """the frames where one thigh is furthest forward: one stride from one to the next"""
    th = o[f'thigh_{s}']
    k = np.convolve(th, np.ones(15) / 15, mode='same')
    w = 22
    peaks = [i for i in range(w, len(k) - w) if k[i] == k[i - w:i + w + 1].max() and k[i] > k.mean()]
    return [(a, b) for a, b in zip(peaks, peaks[1:]) if 50 < b - a < 260]


KEYS = ['thigh_l', 'thigh_r', 'thighOut_l', 'thighOut_r', 'knee_l', 'knee_r', 'arm_l', 'arm_r', 'elbow_l', 'elbow_r',
        'pelvisYaw', 'pelvisRoll', 'torsoYaw', 'torsoLean', 'torsoRoll', 'bob']


def clip(files, root: Path):
    loops = []
    used = []
    for f in files:
        joints, data, ft = parse(root / f)
        data = data[1:]  # frame one is the added T-pose
        pos = fk(joints, data)
        o = angles(joints, pos)
        # a stride from the right foot's peak is the same stride mirrored: swap the sides, turn the twists and rolls over
        mir = {k: (o[k.replace('_l', '_X').replace('_r', '_l').replace('_X', '_r')] * (-1 if k in ('pelvisYaw', 'pelvisRoll', 'torsoYaw', 'torsoRoll') else 1)) for k in KEYS}
        for src, side in ((o, 'l'), (mir, 'r')):
            for a, b in strides(o, side):
                xs = np.linspace(a, b, N, endpoint=False)
                loops.append({k: np.interp(xs, np.arange(len(src[k])), src[k]) for k in KEYS})
                used.append((f, (b - a) * ft))
    if not loops:
        raise SystemExit(f'no strides found in {files}')
    out = {k: np.mean([l[k] for l in loops], axis=0) for k in KEYS}
    # a loop that does not close is a hitch every stride: blend the last eighth into the first sample
    for k in KEYS:
        v = out[k]
        gap = v[0] - v[-1] - (v[1] - v[0])
        ramp = np.clip((np.arange(N) - N * 7 / 8) / (N / 8), 0, 1)
        out[k] = v + gap * ramp * 0.5
    secs = float(np.median([d for _, d in used]))
    return {k: [round(float(x), 4) for x in out[k]] for k in KEYS}, len(loops), secs, sorted({f for f, _ in used})


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
    dest = Path(__file__).resolve().parents[2] / 'public/life/town/mocap.json'
    res = {'source': 'CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu), BVH conversion by B. Hahne (cgspeed). Funded by NSF EIA-0196217.',
           'samples': N, 'phase': 'sample 0 = the left thigh furthest forward; one loop = one full stride (two steps)', 'clips': {}}
    for name, files in CLIPS.items():
        c, n, secs, takes = clip(files, root)
        res['clips'][name] = {'takes': takes, 'strides': n, 'seconds': round(secs, 3), **c}
        print(f'{name}: {n} strides from {takes}, {secs:.2f}s a stride · thigh {min(c["thigh_l"]):.2f}..{max(c["thigh_l"]):.2f} · knee max {max(c["knee_l"]):.2f} · arm {min(c["arm_l"]):.2f}..{max(c["arm_l"]):.2f}')
    dest.write_text(json.dumps(res, separators=(',', ':')))
    print('wrote', dest, dest.stat().st_size, 'bytes')


if __name__ == '__main__':
    main()

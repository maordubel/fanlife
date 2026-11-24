"""
LIFE character assets: every animation clip, as scenes of one or two people.

A scene has a length, whether it loops, and a pose function per person in it: 'A' (an adult, the father's build),
'A2' (a second adult) and 'C' (a child of about 1.35 m, the boy's build). `export` says which people's motion
becomes a clip, and under which name. Poses are lifekit.Poser dictionaries; `ik` entries put a wrist on a point
of the same or the other body ('self' | 'A' | 'A2' | 'C', bone[@where], offset in that body's frame: left, forward, up).

Timing is written as keyed poses with eased transitions (smootherstep), and parts of the body that follow others
(arms after the trunk, the head first) are evaluated slightly late or early, which gives overlap and follow-through.
"""
import json, math
from pathlib import Path
from lifekit import ROOT, mirror, HANDS

MOCAP = json.loads((ROOT / 'public/life/town/mocap.json').read_text())['clips']
TAU = math.tau
FPS = 30


def s(t, period=1.0, phase=0.0): return math.sin(TAU * (t / period + phase))
def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def ease(x): x = clamp(x); return x * x * (3 - 2 * x)
def ease5(x): x = clamp(x); return x * x * x * (x * (6 * x - 15) + 10)
def back(x, k=1.25):   # ease-out with a small overshoot, then settle
    x = clamp(x); c = k; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2


def mix(a, b, k):
    if isinstance(a, dict) or isinstance(b, dict):
        a = a or {}; b = b or {}
        out = {}
        for key in set(a) | set(b):
            if key == 'ik':
                out[key] = _mix_ik(a.get(key), b.get(key), k); continue
            if key == 'hand':
                x, y = a.get(key, 'relaxed'), b.get(key, 'relaxed')
                out[key] = x if x == y or k <= 0 else y if k >= 1 else ('mix', x, y, k); continue
            if key in ('kneel', 'ground'):
                out[key] = (a if k < .5 else b).get(key, (b if k < .5 else a).get(key)); continue
            if key not in a:
                v = b[key]; out[key] = mix({}, v, k) if isinstance(v, dict) else v * k if key in ZERO_OK and isinstance(v, (int, float)) else v; continue
            if key not in b:
                v = a[key]; out[key] = mix(v, {}, k) if isinstance(v, dict) else v * (1 - k) if key in ZERO_OK and isinstance(v, (int, float)) else v; continue
            out[key] = mix(a[key], b[key], k)
        return out
    if isinstance(a, (tuple, list)): return tuple(x + (y - x) * k for x, y in zip(a, b))
    if isinstance(a, bool) or isinstance(a, str) or a is None: return a if k < .5 else b
    return a + (b - a) * k

ZERO_OK = {'yaw', 'roll', 'lean', 'pitch', 'dx', 'dy', 'dz', 'turn', 'twist', 'shrug', 'reach', 'fore', 'wrist', 'wrist_side', 'out', 'fwd', 'knee', 'foot', 'toe', 'foot_out'}

def _mix_ik(a, b, k):
    out = {}
    for sd in set(a or {}) | set(b or {}):
        x = (a or {}).get(sd); y = (b or {}).get(sd)
        if x and y:
            if x['to'] == y['to']: out[sd] = dict(y, w=x.get('w', 1) + (y.get('w', 1) - x.get('w', 1)) * k, pole=tuple(mix(x.get('pole', (0.5, -0.4, -0.6)), y.get('pole', (0.5, -0.4, -0.6)), k)))
            else: out[sd] = dict(y, to=('blend', x['to'], y['to'], k), w=x.get('w', 1) + (y.get('w', 1) - x.get('w', 1)) * k, pole=tuple(mix(x.get('pole', (0.5, -0.4, -0.6)), y.get('pole', (0.5, -0.4, -0.6)), k)))
        elif x: out[sd] = dict(x, w=x.get('w', 1) * (1 - k))
        else: out[sd] = dict(y, w=y.get('w', 1) * k)
    return out


def keyed(t, keys, lag=None, curve=ease5):
    """keys = [(time, pose), ...] sorted; eased from one to the next. lag = {part: seconds}, + = later (follows)."""
    lag = lag or {}
    def at(tt):
        if tt <= keys[0][0]: return keys[0][1]
        for (t0, p0), (t1, p1) in zip(keys, keys[1:]):
            if tt <= t1: return mix(p0, p1, curve((tt - t0) / max(t1 - t0, 1e-6)))
        return keys[-1][1]
    if not lag: return at(t)
    base = at(t); out = dict(base)
    for part, dt in lag.items():
        v = at(t - dt)
        if part in v: out[part] = v[part]
    return out


def add(p, q):
    """layer q on top of p: numbers add, tuples add, the rest is taken from q"""
    out = dict(p)
    for k, v in q.items():
        if k not in out: out[k] = v
        elif isinstance(v, dict) and isinstance(out[k], dict) and k != 'ik': out[k] = add(out[k], v)
        elif isinstance(v, (int, float)) and not isinstance(v, bool) and isinstance(out[k], (int, float)): out[k] = out[k] + v
        elif isinstance(v, tuple) and isinstance(out[k], tuple): out[k] = tuple(a + b for a, b in zip(out[k], v))
        else: out[k] = v
    return out


# ------------------------------------------------------------------------------------------------ standing
HANG = {'dir': (0.17, 0.03, -1), 'elbow': 14, 'fore': 20}

def stand(t=0.0, breath=1.0, per=8.0):
    b = s(t, per / max(1, round(per / 4))) * breath; w = s(t, per) * breath
    return {'pelvis': {'roll': 2.2 * w, 'dx': 0.012 * w, 'yaw': 1.0 * w}, 'spine': {'lean': 1.5 + 0.9 * b, 'roll': -2.0 * w, 'yaw': -1.0 * w},
            'neck': {'pitch': 2 - 0.5 * b}, 'head': {'pitch': -1, 'yaw': 1.5 * s(t, per, .2) * breath, 'roll': 0.8 * w},
            'arm_l': {'dir': (0.17 + .008 * b, 0.03, -1), 'elbow': 14 + 2 * b, 'shrug': 1.2 * b, 'fore': 20}, 'arm_r': {'dir': (0.17 + .008 * b, 0.03, -1), 'elbow': 14 + 2 * b, 'shrug': 1.2 * b, 'fore': 20},
            'leg_l': {'fwd': 1.5 + 1.2 * w, 'out': 3.5 + 2.2 * w, 'knee': 4 + 3 * max(0, w), 'foot': 0}, 'leg_r': {'fwd': 1.5 - 1.2 * w, 'out': 3.5 - 2.2 * w, 'knee': 4 + 3 * max(0, -w), 'foot': 0}}

def breathe(t, amt=1.0, per=4.0):
    b = s(t, per) * amt
    return {'spine': {'lean': 0.8 * b}, 'neck': {'pitch': -0.4 * b}, 'arm_l': {'shrug': 1.0 * b}, 'arm_r': {'shrug': 1.0 * b}}

def idle_2(t, T=9.0):
    """weight on the left leg, right hand on the hip, a look round now and then"""
    w = s(t, T); b = s(t, 4.5)
    look = ease5(clamp((t - 2.5) / 0.9)) - ease5(clamp((t - 5.2) / 1.1))
    p = {'pelvis': {'dx': 0.045 + 0.006 * w, 'roll': -5.5 - 0.8 * w, 'yaw': -3},
         'spine': {'lean': 2 + 0.8 * b, 'roll': 6.5 + 0.8 * w, 'yaw': 3},
         'neck': {'pitch': 2, 'roll': -1}, 'head': {'pitch': -1 + 3 * look, 'yaw': -2 + 24 * look + 1.2 * s(t, T, .3), 'roll': -3 + 2 * look},
         'leg_l': {'fwd': 0, 'out': 1.5, 'knee': 2, 'foot': 0},
         'leg_r': {'fwd': 9 + 1.5 * w, 'out': 8, 'knee': 16 + 2 * w, 'foot': -4, 'foot_out': 12},
         'arm_l': {'dir': (0.14, 0.05, -1), 'elbow': 16 + 2 * b, 'fore': 25, 'shrug': 1.0 * b},
         'arm_r': {'dir': (0.75, -0.25, -0.6), 'elbow': 95, 'fore': 30, 'wrist': -25, 'hand': 'relaxed', 'shrug': 2}}
    p['ik'] = {'r': {'to': ('self', 'pelvis', (-0.16, -0.01, 0.10)), 'pole': (1.0, -0.6, -0.1)}}
    return p

def idle_3(t, T=10.0):
    """feet apart, hands loosely held in front, scanning the crowd left and right"""
    b = s(t, 5.0); w = s(t, T)
    scan = 22 * s(t, T, .05) + 6 * s(t, T / 3, .3)
    p = {'pelvis': {'dx': 0.01 * w, 'roll': 1.5 * w, 'yaw': 2 * w},
         'spine': {'lean': 1.0 + 0.9 * b, 'roll': -1.2 * w, 'yaw': 0.25 * scan},
         'neck': {'pitch': 1.5, 'yaw': 0.3 * scan}, 'head': {'pitch': -3 + 2 * s(t, T / 2, .4), 'yaw': 0.45 * scan, 'roll': -1.5 * w},
         'leg_l': {'fwd': 1, 'out': 7 + 1.5 * w, 'knee': 4, 'foot_out': 8}, 'leg_r': {'fwd': 1, 'out': 7 - 1.5 * w, 'knee': 4, 'foot_out': 8},
         'arm_l': {'dir': (0.1, 0.35, -1), 'elbow': 70, 'fore': 60, 'wrist': 5, 'shrug': 1.5 * b, 'hand': 'cup'},
         'arm_r': {'dir': (0.1, 0.35, -1), 'elbow': 70, 'fore': 60, 'wrist': 5, 'shrug': 1.5 * b, 'hand': 'relaxed'},
         'ik': {'l': {'to': ('self', 'pelvis', (0.03, 0.16, -0.03)), 'pole': (0.9, -0.3, -0.5), 'palm': (-0.6, 0.2, 0.5)},
                'r': {'to': ('self', 'pelvis', (-0.02, 0.18, -0.0)), 'pole': (0.9, -0.3, -0.5), 'palm': (-0.6, 0.2, -0.6)}}}
    return p


# ------------------------------------------------------------------------------------------------ locomotion
PHASE = {}   # clip → phase offset so the LEFT heel strikes at frame 0 (measured on the rig by build_clips)

def gait(clip, key, phase):
    v = MOCAP[clip][key]; n = len(v); x = (phase % 1) * n; i = int(x); f = x - i
    # Catmull-Rom between samples: no corners in the curves
    p0, p1, p2, p3 = v[(i - 1) % n], v[i % n], v[(i + 1) % n], v[(i + 2) % n]
    y = 0.5 * ((2 * p1) + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f)
    return math.degrees(y)

def walk_pose(clip, ph, run=False, arms=1.0, bounce=0.0, lean=0.0, lift=1.0, key=None):
    ph = ph + PHASE.get(key or clip, 0.0)
    sign = -1 if MOCAP[clip]['pelvisYaw'][0] > 0 else 1
    p = {'pelvis': {'yaw': sign * gait(clip, 'pelvisYaw', ph), 'roll': gait(clip, 'pelvisRoll', ph)},
         'spine': {'yaw': sign * gait(clip, 'torsoYaw', ph) * arms, 'lean': gait(clip, 'torsoLean', ph) + (2 if not run else 0) + lean, 'roll': gait(clip, 'torsoRoll', ph)},
         'neck': {'pitch': -gait(clip, 'torsoLean', ph) * .5 - lean * .4}, 'head': {'yaw': -sign * (gait(clip, 'pelvisYaw', ph) + gait(clip, 'torsoYaw', ph)) * .8, 'pitch': -lean * .4}}
    for sd in 'lr':
        th, kn = gait(clip, 'thigh_' + sd, ph), max(0, gait(clip, 'knee_' + sd, ph) - (0 if run else 9))
        kn *= lift; th = th * (1 + (lift - 1) * .5)
        p['leg_' + sd] = {'fwd': th, 'out': 2 + gait(clip, 'thighOut_' + sd, ph), 'knee': kn, 'foot': (th - kn) * .8 + (kn * .35 if th < 0 else 0)}
        a = math.radians(gait(clip, 'arm_' + sd, ph) * arms)
        p['arm_' + sd] = {'dir': (0.17, math.sin(a), -math.cos(a)), 'elbow': max(8, gait(clip, 'elbow_' + sd, ph)) * (1.25 if run else 1), 'fore': 25,
                          'hand': 'relaxed' if not run else None, 'curl': .7 if run else RELAXED_WALK}
        if not run: p['arm_' + sd].pop('curl')
        else: p['arm_' + sd].pop('hand')
    if run: p['pelvis']['dz'] = 0.035 * abs(math.sin(math.pi * 2 * ph))
    if bounce: p['pelvis']['dz'] = p['pelvis'].get('dz', 0) + bounce * (0.5 - 0.5 * math.cos(2 * TAU * ph))
    return p

RELAXED_WALK = 0.45

def walk(t): T = MOCAP['walk']['seconds']; return walk_pose('walk', t / T)
def run(t): T = MOCAP['run']['seconds']; return walk_pose('run', t / T, run=True)

def carry(t):
    T = MOCAP['walk']['seconds']; p = walk_pose('walk', t / T)
    for sd in 'lr': p['arm_' + sd] = {'dir': (0.22, 0.28, -1), 'elbow': 88 + 2 * s(t, T / 2), 'fore': 80, 'hand': 'cup', 'twist': 0}
    p['spine']['lean'] = -3; p['spine']['yaw'] *= .4
    return p

WALK_CHILD_T = MOCAP['walk']['seconds'] * 0.76
def walk_child(t):
    return walk_pose('walk', t / WALK_CHILD_T, arms=1.35, bounce=0.022, lean=2.5, lift=1.12, key='walk_child')

STROLL = 2.5   # two adult strides = three child strides, so the held hands stay in step
def hold_hand_walk_adult(t):
    p = walk_pose('walk', 2 * t / STROLL, arms=0.8, key='hold_hand_walk_adult')
    p['head']['yaw'] = p['head'].get('yaw', 0) * .5 - 12 + 4 * s(t, STROLL, .1); p['head']['pitch'] = 9; p['neck']['pitch'] = 4
    p['spine']['yaw'] = p['spine'].get('yaw', 0) - 4; p['spine']['roll'] = p['spine'].get('roll', 0) + 2
    p['arm_r'] = {'dir': (0.2, 0.05, -1), 'elbow': 18, 'fore': -10, 'hand': 'cup', 'wrist': 6}
    m = grip(t)
    p['ik'] = {'r': {'to': ('self', 'Root', (m[0], m[1], m[2] + 0.055)), 'pole': (0.5, -0.6, -0.3), 'palm': (0.45, -1, 0)}}
    return p

def grip(t):
    """where the held hands meet, in the adult's frame: between the two, a little ahead, swinging gently with the stride"""
    return (-0.27, 0.05 + 0.035 * s(t, STROLL / 2, .15), 0.86 + 0.008 * s(t, STROLL / 2, .4))

def hold_hand_walk_child(t):
    p = walk_pose('walk', 3 * t / STROLL, arms=1.1, bounce=0.02, lean=2, lift=0.9, key='hold_hand_walk_child')
    p['arm_l'] = {'dir': (0.5, 0.2, -0.6), 'elbow': 25, 'fore': -20, 'hand': 'cup', 'wrist': 8}
    m = grip(t)
    p['ik'] = {'l': {'to': ('A', 'Root', (m[0] - 0.05, m[1] + 0.005, m[2] + 0.0)), 'pole': (0.6, -0.5, -0.6), 'palm': (0.45, 1, 0)}}
    p['head']['yaw'] = p['head'].get('yaw', 0) * .5 + 10 + 8 * ease5(clamp((t % STROLL) / STROLL * 3 - 1)) * (1 - ease5(clamp((t % STROLL) / STROLL * 3 - 1.8)))
    p['head']['pitch'] = -6
    return p


# ------------------------------------------------------------------------------------------------ turns
def step_turn(t, T=1.15):
    """a quarter turn to the left in two steps: the eyes and head lead, the trunk follows, the feet catch up"""
    k = ease5((t - 0.12) / 0.8)
    head = ease5(t / 0.42); sp = ease5((t - 0.06) / 0.6)
    p = stand(t, .3)
    p['turn'] = 90 * k
    p['head'] = {'yaw': 40 * head - 40 * k, 'pitch': -1}
    p['spine'] = {'yaw': 22 * sp - 22 * k, 'lean': 2, 'roll': 2 * math.sin(math.pi * clamp(t / 0.9))}
    p['pelvis'] = {'yaw': 0, 'roll': 2.5 * math.sin(math.pi * clamp(t / 0.6)) - 2 * math.sin(math.pi * clamp((t - 0.45) / 0.55)), 'dx': 0.02 * math.sin(math.pi * clamp(t / 0.6))}
    s1 = math.sin(math.pi * clamp((t - 0.1) / 0.42)); s2 = math.sin(math.pi * clamp((t - 0.46) / 0.42))
    p['leg_l'] = {'fwd': 14 * s1, 'out': 4 + 14 * s1, 'knee': 30 * s1, 'foot': -8 * s1, 'twist': 30 * s1 - 30 * (1 - k) * 0, 'foot_out': 20 * s1}
    p['leg_r'] = {'fwd': 12 * s2, 'out': 4 - 4 * s2, 'knee': 28 * s2, 'foot': -6 * s2, 'twist': -15 * s2}
    for sd, ph in (('l', 0.0), ('r', 0.05)):
        sw = math.sin(math.pi * clamp((t - 0.15 - ph) / 0.8))
        p['arm_' + sd] = {'dir': (0.2 + 0.08 * sw, 0.03 + (0.12 if sd == 'r' else -0.08) * sw, -1), 'elbow': 16 + 12 * sw, 'fore': 20}
    return p


# ------------------------------------------------------------------------------------------------ talking and gestures
def talk(t, k):
    base = stand(t, .6, {1: 2.4, 2: 4.0, 3: 3.0}[k])
    if k == 1:   # open hands, palms up, a small beat
        for sd, ph in (('l', 0), ('r', .08)):
            b = 0.5 + 0.5 * s(t, 1.2, ph)
            base['arm_' + sd] = {'dir': (0.2, 0.22 + .05 * b, -1), 'elbow': 70 + 18 * b, 'fore': -60, 'twist': -8, 'hand': 'cup', 'wrist': -8 * b}
        base['head']['pitch'] = -2 + 3 * s(t, 1.2)
    elif k == 2:  # one hand explains, the other rests
        b = 0.5 + 0.5 * s(t, 1.0)
        base['arm_r'] = {'dir': (0.25, 0.35 + .08 * b, -0.9), 'elbow': 95 + 14 * b, 'fore': 10 + 30 * s(t, 2.0), 'hand': 'cup', 'wrist': 10 * s(t, 1.0, .2)}
        base['head']['yaw'] = 5 * s(t, 4.0); base['head']['roll'] = 3 * s(t, 2.0)
    else:         # a shrug, then a point forward
        u = ease(max(0, s(t, 3.0))); v = ease(max(0, -s(t, 3.0)))
        for sd in 'lr': base['arm_' + sd] = {'dir': (0.2 + .1 * u, 0.1 + .1 * u, -1), 'elbow': 20 + 75 * u, 'fore': -70 * u + 20, 'shrug': 7 * u, 'hand': 'cup'}
        base['arm_r'] = mix(base['arm_r'], {'dir': (0.1, 0.9, -0.25), 'elbow': 18, 'fore': 30, 'hand': 'point', 'shrug': 0}, v)
        base['head']['roll'] = 5 * u
    return base

def wave(t):
    p = stand(t, .5, 2.2); w = s(t, 0.55)
    p['arm_r'] = {'dir': (0.75, 0.12, 0.55), 'twist': -80, 'elbow': 68 + 22 * w, 'fore': 0, 'hand': 'cup', 'curl': .2, 'thumb': .1, 'wrist_side': 10 * w, 'shrug': 6}
    p['arm_r'].pop('hand')
    p['spine']['roll'] = 3; p['head']['roll'] = -3; p['head']['pitch'] = -4
    return p

def cheer(t):
    p = stand(t, .3, 1.2); u = 0.5 + 0.5 * s(t, 0.6)
    for sd, ph in (('l', 0), ('r', .5)):
        p['arm_' + sd] = {'dir': (0.42, 0.15, 1.0), 'twist': -70, 'elbow': 35 + 45 * (1 - u), 'hand': 'fist', 'shrug': 10}
        p['leg_' + sd] = {'fwd': 6 * (1 - u), 'out': 5, 'knee': 14 * (1 - u), 'foot': -18 * u}
    p['pelvis'] = {'dz': 0.0}; p['spine'] = {'lean': -6 * u}; p['head'] = {'pitch': -12 * u}
    return p

def laugh_body(t, T=3.2):
    """a laugh that takes the whole body: back, then folding forward in bursts that die away, a hand to the belly"""
    up = ease5(t / 0.35) * (1 - ease5((t - 0.55) / 0.5))
    fold = ease5((t - 0.45) / 0.5) * (1 - ease5((t - 2.3) / 0.9))
    shake = math.exp(-max(0, t - 0.4) * 0.9) * clamp(t / 0.4) * s(t, 0.21)
    hand = ease5((t - 0.5) / 0.45) * (1 - ease5((t - 2.2) / 0.8))
    p = stand(t, .4)
    p['spine'] = {'lean': -7 * up + 14 * fold + 2.5 * shake, 'roll': 3 * fold, 'yaw': 4 * fold}
    p['neck'] = {'pitch': -6 * up + 4 * fold}
    p['head'] = {'pitch': -16 * up + 6 * fold + 3 * shake, 'roll': 4 * fold, 'yaw': -5 * fold}
    p['pelvis'] = {'dz': -0.008 * fold, 'lean': -3 * fold}
    for sd in 'lr':
        p['leg_' + sd] = {'fwd': 3 * fold, 'out': 4, 'knee': 6 * fold + 2, 'foot': 0}
        p['arm_' + sd] = dict(HANG, shrug=5 * up + 3 * abs(shake), elbow=16 + 20 * fold)
    p['arm_r'] = mix(p['arm_r'], {'dir': (0.3, 0.45, -0.8), 'elbow': 95, 'fore': 70, 'hand': 'cup', 'shrug': 3 * abs(shake)}, hand)
    p['ik'] = {'r': {'to': ('self', 'spine_01', (-0.03, 0.14, -0.04)), 'pole': (0.9, -0.2, -0.4), 'w': hand}}
    p['arm_l'] = mix(p['arm_l'], {'dir': (0.32, 0.2, -1), 'elbow': 30, 'fore': 20, 'hand': 'relaxed'}, fold)
    return p


# ------------------------------------------------------------------------------------------------ held poses
SIT = {'pelvis': {'lean': -6, 'dy': -0.02}, 'spine': {'lean': 10}, 'neck': {'pitch': -2}, 'head': {'pitch': -2},
       'leg_l': {'fwd': 86, 'out': 7, 'knee': 88, 'foot': 0}, 'leg_r': {'fwd': 86, 'out': 7, 'knee': 88, 'foot': 0},
       'arm_l': {'dir': (0.2, 0.2, -1), 'elbow': 66, 'fore': 75, 'hand': 'palm_down_rest'}, 'arm_r': {'dir': (0.2, 0.2, -1), 'elbow': 66, 'fore': 75, 'hand': 'palm_down_rest'}}
CROUCH = {'pelvis': {'lean': 4}, 'spine': {'lean': 16}, 'neck': {'pitch': -8}, 'head': {'pitch': -6}, 'kneel': True,
          'leg_l': {'fwd': 100, 'out': 12, 'knee': 138, 'foot': 12}, 'leg_r': {'fwd': 38, 'out': 8, 'knee': 128, 'foot': 62, 'toe': -55},
          'arm_l': {'dir': (0.25, 0.75, -0.55), 'elbow': 72, 'fore': 60, 'hand': 'palm_down_rest'}, 'arm_r': {'dir': (0.3, 0.8, -0.35), 'elbow': 40, 'fore': 30, 'hand': 'relaxed'}}
SHOULDER = {'spine': {'lean': 3, 'roll': -3, 'yaw': -6}, 'head': {'yaw': -22, 'pitch': 12, 'roll': -3}, 'neck': {'pitch': 4},
            'arm_r': {'dir': (0.62, 0.42, -0.16), 'twist': 60, 'elbow': 52, 'fore': -20, 'wrist': -22, 'hand': 'palm_down_rest', 'shrug': 3}}
HUG = {'spine': {'lean': 12}, 'neck': {'pitch': 6}, 'head': {'pitch': 8, 'roll': 10, 'yaw': 12},
       'arm_l': {'dir': (0.45, 0.85, -0.12), 'twist': 40, 'elbow': 96, 'fore': 0, 'hand': 'cup', 'shrug': 6, 'reach': 10},
       'arm_r': {'dir': (0.45, 0.8, -0.38), 'twist': 40, 'elbow': 104, 'fore': 0, 'hand': 'cup', 'shrug': 4, 'reach': 10},
       'leg_l': {'fwd': 6, 'out': 4, 'knee': 6}, 'leg_r': {'fwd': -4, 'out': 4, 'knee': 4}}

def to(target, t, rise=0.9, breath=.5):
    """stand → target over `rise` seconds (the arms a beat after the trunk), then held, breathing"""
    k = ease5(t / rise); ka = ease5((t - 0.08) / rise); b = s(t, 4.0) * breath
    p = mix(stand(t, 1 - .5 * k), target, k)
    for sd in 'lr':
        if 'arm_' + sd in target: p['arm_' + sd] = mix(stand(t, 1 - .5 * ka)['arm_' + sd], target['arm_' + sd], ka)
    p.setdefault('spine', {}); p['spine']['lean'] = p['spine'].get('lean', 0) + 0.8 * b * k
    return p

def lean_on_rail(t, T=8.0):
    """forearms on a rail (top at 1.05 m, 40 cm ahead), weight on the left leg, the right foot crossed and resting on its toes"""
    b = s(t, 4.0); w = s(t, T)
    look = 14 * s(t, T, .15)
    return {'pelvis': {'dx': 0.03, 'roll': -3 - 0.6 * w, 'lean': 8, 'dy': 0.04, 'yaw': 2 * w},
            'spine': {'lean': 26 + 1.2 * b, 'roll': 3, 'yaw': 0.2 * look},
            'neck': {'pitch': -14}, 'head': {'pitch': -12 + 3 * s(t, T / 2, .3), 'yaw': 0.6 * look, 'roll': 2 * w},
            'leg_l': {'fwd': 6, 'out': 3, 'knee': 4, 'foot': 4}, 'leg_r': {'fwd': 10, 'out': -6, 'knee': 22 + 2 * w, 'foot': 30, 'toe': -35, 'twist': 6},
            'arm_l': {'dir': (0.35, 0.8, -0.2), 'elbow': 95, 'fore': 70, 'hand': 'relaxed', 'shrug': 4 + 1 * b},
            'arm_r': {'dir': (0.35, 0.8, -0.2), 'elbow': 95, 'fore': 70, 'hand': 'relaxed', 'shrug': 4 + 1 * b},
            'ik': {'l': {'to': ('world', None, (0.06, 0.42, 1.08)), 'pole': (0.7, 0.0, -0.8)},
                   'r': {'to': ('world', None, (-0.09, 0.44, 1.08)), 'pole': (0.7, 0.0, -0.8)}}}

def sit_play_board(t, T=7.0):
    """seated at a table (top 0.72 m): thinks, takes a piece, moves it, sets it down, looks up at the other player"""
    board = lambda x, y: ('world', None, (x, 0.40 + y, 0.76))
    rest = {'spine': {'lean': 20}, 'neck': {'pitch': 4}, 'head': {'pitch': 18},
            'arm_r': {'dir': (0.25, 0.55, -0.6), 'elbow': 85, 'fore': 70, 'hand': 'relaxed'},
            'arm_l': {'dir': (0.25, 0.55, -0.6), 'elbow': 85, 'fore': 70, 'hand': 'relaxed'},
            'ik': {'r': {'to': board(-0.17, -0.12), 'pole': (0.9, -0.2, -0.6)}, 'l': {'to': board(0.19, -0.12), 'pole': (0.9, -0.2, -0.6)}}}
    reach = add(rest, {'spine': {'lean': 6, 'yaw': 4}, 'head': {'pitch': 6}})
    reach = dict(reach, arm_r=dict(rest['arm_r'], hand='pinch'), ik={'r': {'to': board(-0.06, 0.08), 'pole': (0.9, -0.1, -0.5)}, 'l': rest['ik']['l']})
    lift = dict(reach, ik={'r': {'to': ('world', None, (-0.02, 0.50, 0.85)), 'pole': (0.9, -0.1, -0.5)}, 'l': rest['ik']['l']})
    place = dict(reach, ik={'r': {'to': board(0.04, 0.14), 'pole': (0.9, -0.1, -0.5)}, 'l': rest['ik']['l']})
    up = add(rest, {'spine': {'lean': -6}, 'head': {'pitch': -24, 'yaw': 4}, 'neck': {'pitch': -4}})
    p = keyed(t, [(0, rest), (1.1, rest), (1.75, reach), (1.95, reach), (2.35, lift), (2.75, place), (2.95, place), (3.5, rest), (3.9, up), (5.6, up), (6.4, rest), (T, rest)],
              lag={'head': -0.12, 'arm_r': 0.04})
    base = dict(SIT); base.update({k: v for k, v in p.items()})
    base['leg_l'] = SIT['leg_l']; base['leg_r'] = dict(SIT['leg_r'], fwd=84, knee=96)
    base['pelvis'] = dict(SIT['pelvis']); base['spine'] = add(p['spine'], breathe(t, .6)['spine'])
    return base


# ------------------------------------------------------------------------------------------------ with a child
def ruffle_hair(t, T=3.6):
    """standing beside a child at his right, a hand onto the child's head, a few rubs, back down"""
    a = stand(t, .5)
    look = {'spine': {'yaw': -10, 'roll': -5, 'lean': 6}, 'neck': {'pitch': 8, 'yaw': -8}, 'head': {'pitch': 22, 'yaw': -24, 'roll': -6}, 'pelvis': {'dx': -0.02, 'roll': 2}}
    out = dict(a); reach = ease5((t - 0.15) / 0.75) * (1 - ease5((t - 2.45) / 0.85))
    lk = ease5(t / 0.6) * (1 - ease5((t - 2.8) / 0.8))
    for part, v in look.items(): out[part] = mix(a.get(part, {}), add(a.get(part, {}), v), lk)
    rub = clamp((t - 0.95) / 1.5); amp = math.sin(math.pi * rub) * (1 - rub * .3)
    ox = 0.035 * amp * s(t - 0.95, 0.42); oy = 0.02 * amp * s(t - 0.95, 0.42, .25)
    out['arm_r'] = mix(a['arm_r'], {'dir': (0.55, 0.35, -0.4), 'elbow': 55, 'fore': -40, 'wrist': -20 - 8 * amp * s(t, 0.42, .1), 'hand': 'cup', 'shrug': 4}, reach)
    out['ik'] = {'r': {'to': ('C', 'head@0.95', (0.02 + ox, 0.03 + oy, 0.075)), 'pole': (1.0, -0.3, 0.1), 'w': back(reach, 0.6) if reach < 1 else 1, 'palm': (0.1, 0, -1)}}
    return out

def put_scarf_on(t, T=4.4):
    """kneeling in front of the child: the scarf held in both hands, round behind the neck, crossed in front, a pat, hands to the shoulders"""
    kneel = {'pelvis': {'lean': 0, 'dy': 0.03}, 'spine': {'lean': 2}, 'neck': {'pitch': 8}, 'head': {'pitch': 16}, 'kneel': True,
             'leg_l': {'fwd': 8, 'out': 6, 'knee': 98, 'foot': 52, 'toe': -50}, 'leg_r': {'fwd': 80, 'out': 28, 'knee': 95, 'foot': 4, 'foot_out': -10}}
    arm = {'dir': (0.3, 0.6, -0.5), 'elbow': 80, 'fore': 20, 'hand': 'pinch'}
    C = lambda bone, x, y, z: ('C', bone, (x, y, z))
    hold = dict(kneel, arm_l=arm, arm_r=arm, ik={'l': {'to': C('spine_03', 0.17, 0.30, -0.06), 'pole': (0.8, -0.3, -0.6)}, 'r': {'to': C('spine_03', -0.17, 0.30, -0.06), 'pole': (0.8, -0.3, -0.6)}})
    wide = add(dict(hold), {'spine': {'lean': 6}, 'head': {'pitch': 4}})
    wide['ik'] = {'l': {'to': C('neck_01', 0.22, 0.08, 0.0), 'pole': (1.0, -0.2, -0.3), 'palm': (-0.5, -0.5, 0)}, 'r': {'to': C('neck_01', -0.22, 0.08, 0.0), 'pole': (1.0, -0.2, -0.3), 'palm': (-0.5, -0.5, 0)}}
    behind = add(dict(hold), {'spine': {'lean': 9}, 'head': {'pitch': 6, 'roll': 8, 'yaw': 10}})
    behind['ik'] = {'l': {'to': C('neck_01', 0.07, -0.08, -0.02), 'pole': (1.0, 0.0, -0.3), 'palm': (0, -1, 0)}, 'r': {'to': C('neck_01', -0.07, -0.08, -0.02), 'pole': (1.0, 0.0, -0.3), 'palm': (0, -1, 0)}}
    front = add(dict(hold), {'spine': {'lean': 4}, 'head': {'pitch': 4}})
    front['ik'] = {'l': {'to': C('neck_01', -0.03, 0.12, -0.06), 'pole': (0.9, -0.3, -0.5), 'palm': (0, 1, 0)}, 'r': {'to': C('neck_01', 0.03, 0.12, -0.08), 'pole': (0.9, -0.3, -0.5), 'palm': (0, 1, 0)}}
    pat = dict(front); pat['ik'] = {'l': {'to': C('spine_03', 0.03, 0.15, 0.0), 'pole': (0.9, -0.3, -0.6), 'palm': (0, 1, 0)}, 'r': {'to': C('spine_03', -0.03, 0.15, -0.02), 'pole': (0.9, -0.3, -0.6), 'palm': (0, 1, 0)}}
    pat = dict(pat, arm_l=dict(arm, hand='palm_down_rest'), arm_r=dict(arm, hand='palm_down_rest'))
    shoulders = add(dict(hold), {'head': {'roll': 8, 'pitch': -4}, 'spine': {'lean': -2}})
    shoulders.update(arm_l=dict(arm, hand='palm_down_rest'), arm_r=dict(arm, hand='palm_down_rest'))
    shoulders['ik'] = {'l': {'to': C('clavicle_r@0.85', 0.02, 0.05, 0.075), 'pole': (1.0, -0.4, -0.6), 'palm': (0, 0, -1)}, 'r': {'to': C('clavicle_l@0.85', -0.02, 0.05, 0.075), 'pole': (1.0, -0.4, -0.6), 'palm': (0, 0, -1)}}
    keys = [(0, hold), (0.45, hold), (1.05, wide), (1.55, behind), (1.85, behind), (2.35, front), (2.6, front), (2.8, pat), (2.95, front), (3.1, pat), (3.6, shoulders), (T, shoulders)]
    p = keyed(t, keys, lag={'head': -0.1})
    p['ik'] = {sd: dict(v, w=1) for sd, v in keyed(t, keys, lag={'arm_r': 0.05})['ik'].items()} if 'ik' in p else None
    p.update({k: kneel[k] for k in ('leg_l', 'leg_r', 'kneel')})
    p['spine'] = add(p['spine'], breathe(t, .5)['spine'])
    return p

def child_attend(t, T=4.4, look_up=True):
    """the child standing still, chin up toward the grown-up"""
    p = stand(t, .6, 4.4)
    p['head'] = {'pitch': -5 if look_up else 4, 'yaw': 6 + 2 * s(t, T), 'roll': 3}
    p['neck'] = {'pitch': -4}
    for sd in 'lr': p['arm_' + sd] = dict(HANG, elbow=18, fore=30)
    return p

def kick_ball(t, T=1.9):
    """a child's kick with the right foot: plant left, wind up, strike at 0.70 s, follow through, settle"""
    st = stand(0, 0)
    plant = {'pelvis': {'yaw': 10, 'roll': -4, 'lean': -4, 'dx': 0.03}, 'spine': {'lean': -2, 'yaw': -6, 'roll': 4}, 'head': {'pitch': 18, 'yaw': -6}, 'neck': {'pitch': 6},
             'leg_l': {'fwd': 18, 'out': 4, 'knee': 22, 'foot': -2}, 'leg_r': {'fwd': -8, 'out': 2, 'knee': 25, 'foot': 10},
             'arm_l': {'dir': (0.6, 0.35, -0.6), 'elbow': 30, 'fore': 10, 'hand': 'relaxed'}, 'arm_r': {'dir': (0.35, -0.3, -0.85), 'elbow': 25, 'fore': 20, 'hand': 'relaxed'}}
    wind = add(plant, {'pelvis': {'yaw': 8, 'lean': -4}, 'spine': {'yaw': -10, 'lean': -4}})
    wind.update(leg_r={'fwd': -38, 'out': 2, 'knee': 95, 'foot': 30}, leg_l={'fwd': 14, 'out': 4, 'knee': 26, 'foot': 2},
                arm_l={'dir': (0.85, 0.35, -0.2), 'elbow': 25, 'fore': 10, 'hand': 'relaxed'}, arm_r={'dir': (0.3, -0.45, -0.75), 'elbow': 30, 'fore': 20, 'hand': 'relaxed'})
    strike = add(plant, {'pelvis': {'yaw': -16, 'lean': -8}, 'spine': {'yaw': 12, 'lean': 4}, 'head': {'pitch': 6}})
    strike.update(leg_r={'fwd': 26, 'out': 0, 'knee': 16, 'foot': 30}, leg_l={'fwd': 10, 'out': 4, 'knee': 22, 'foot': 4},
                  arm_l={'dir': (0.7, -0.1, -0.5), 'elbow': 35, 'fore': 10, 'hand': 'relaxed'}, arm_r={'dir': (0.45, 0.45, -0.55), 'elbow': 40, 'fore': 20, 'hand': 'relaxed'})
    follow = add(strike, {'pelvis': {'yaw': -6, 'lean': -6}, 'spine': {'yaw': 6, 'lean': -2}, 'head': {'pitch': -6}})
    follow.update(leg_r={'fwd': 58, 'out': -4, 'knee': 26, 'foot': 22}, leg_l={'fwd': 4, 'out': 4, 'knee': 12, 'foot': -16, 'toe': -20})
    land = add(plant, {'pelvis': {'yaw': -4, 'dy': -0.05}, 'spine': {'lean': 6}, 'head': {'pitch': 2}})
    land.update(leg_r={'fwd': 12, 'out': 3, 'knee': 18, 'foot': 0}, leg_l={'fwd': -4, 'out': 4, 'knee': 16, 'foot': 4})
    keys = [(0, st), (0.3, plant), (0.52, wind), (0.70, strike), (0.86, follow), (1.2, land), (T, st)]
    p = keyed(t, keys, lag={'arm_l': 0.05, 'arm_r': 0.06, 'head': 0.04}, curve=ease)
    return p

def carrier(t, T=6.0):
    """a child sitting on the shoulders: the adult holds the shins, sways under the weight, looks up now and then"""
    w = s(t, T); b = s(t, 3.0)
    p = {'pelvis': {'roll': 1.8 * w, 'dx': 0.01 * w, 'lean': -3}, 'spine': {'lean': -2 + 0.8 * b, 'roll': -1.5 * w}, 'neck': {'pitch': 10}, 'head': {'pitch': 4 - 8 * max(0, s(t, T, .6)), 'yaw': 6 * s(t, T, .1)},
         'leg_l': {'fwd': 2 + w, 'out': 6, 'knee': 6, 'foot': 0}, 'leg_r': {'fwd': 2 - w, 'out': 6, 'knee': 6, 'foot': 0},
         'arm_l': {'dir': (0.45, 0.45, 0.6), 'elbow': 90, 'fore': 0, 'hand': 'fist', 'shrug': 8}, 'arm_r': {'dir': (0.45, 0.45, 0.6), 'elbow': 90, 'fore': 0, 'hand': 'fist', 'shrug': 8},
         'ik': {'l': {'to': ('C', 'calf_l@0.5', (0.0, 0.075, -0.02)), 'pole': (1.0, -0.3, -1.0), 'palm': (-0.3, -1, 0)}, 'r': {'to': ('C', 'calf_r@0.5', (0.0, 0.075, -0.02)), 'pole': (1.0, -0.3, -1.0), 'palm': (-0.3, -1, 0)}}}
    return p

def rider(t, T=6.0):
    """the child on the shoulders: legs either side of the neck, hands on the grown-up's head, looking about, one wave"""
    w = s(t, T); b = s(t, 3.0)
    wv = ease5((t - 2.4) / 0.5) * (1 - ease5((t - 4.3) / 0.6))
    p = {'ground': False, 'pelvis': {'lean': -4, 'roll': -1.5 * w}, 'spine': {'lean': 12 + 1 * b, 'roll': 2 * w - 3 * wv}, 'neck': {'pitch': 2}, 'head': {'pitch': -2, 'yaw': 16 * s(t, T, .3), 'roll': -2 * w},
         'leg_l': {'fwd': 82, 'out': 38, 'knee': 95, 'foot': 15}, 'leg_r': {'fwd': 82, 'out': 38, 'knee': 95, 'foot': 15},
         'arm_l': {'dir': (0.3, 0.6, -0.5), 'elbow': 70, 'fore': 30, 'hand': 'palm_down_rest'}, 'arm_r': {'dir': (0.3, 0.6, -0.5), 'elbow': 70, 'fore': 30, 'hand': 'palm_down_rest'},
         'ik': {'l': {'to': ('A', 'head@0.95', (0.06, -0.01, 0.03)), 'pole': (1.0, -0.3, -0.4), 'palm': (0, 0, -1)},
                'r': {'to': ('A', 'head@0.95', (-0.06, -0.01, 0.03)), 'pole': (1.0, -0.3, -0.4), 'w': 1 - wv, 'palm': (0, 0, -1)}}}
    if wv > 0:
        ww = s(t, 0.5)
        p['arm_r'] = mix(p['arm_r'], {'dir': (0.7, 0.2, 0.75), 'twist': -80, 'elbow': 60 + 20 * ww, 'fore': 0, 'hand': 'cup', 'curl': .2, 'shrug': 8, 'wrist_side': 10 * ww}, wv)
    return p

def hug_partner(t, T=4.2, low=False):
    """two adults: arms open, the embrace (right arm over the shoulder, left round the waist), a sway, two pats, held"""
    P = 'A2'
    st = stand(t, .4)
    open_ = add(st, {'spine': {'lean': 4}, 'head': {'pitch': -3}})
    open_.update(arm_l={'dir': (0.75, 0.6, -0.15), 'elbow': 35, 'fore': 0, 'hand': 'cup', 'shrug': 4}, arm_r={'dir': (0.75, 0.6, 0.05), 'elbow': 30, 'fore': 0, 'hand': 'cup', 'shrug': 6})
    hold = {'spine': {'lean': 7, 'yaw': -4}, 'neck': {'pitch': 4}, 'head': {'yaw': 28, 'pitch': 6, 'roll': 10},
            'pelvis': {'dy': 0.0}, 'leg_l': {'fwd': 4, 'out': 5, 'knee': 6}, 'leg_r': {'fwd': -2, 'out': 5, 'knee': 4},
            'arm_r': {'dir': (0.5, 0.8, 0.0), 'elbow': 100, 'fore': 0, 'hand': 'palm_down_rest', 'shrug': 8, 'reach': 12},
            'arm_l': {'dir': (0.5, 0.8, -0.4), 'elbow': 100, 'fore': 0, 'hand': 'palm_down_rest', 'shrug': 2, 'reach': 10},
            'ik': {'r': {'to': (P, 'spine_03@0.6', (0.09, -0.12, 0.02)), 'pole': (1.0, -0.2, 0.0), 'palm': (0, -1, 0)},
                   'l': {'to': (P, 'spine_01@0.5', (-0.11, -0.07, 0.0)), 'pole': (1.0, -0.1, -0.5), 'palm': (0, -1, 0)}}}
    p = keyed(t, [(0, st), (0.45, open_), (1.05, hold), (T, hold)], lag={'arm_r': 0.06, 'arm_l': 0.1, 'head': 0.08})
    k = ease5((t - 0.45) / 0.6)
    p['ik'] = {sd: dict(v, w=back(k, 0.3)) for sd, v in hold['ik'].items()}
    sway = ease5((t - 1.0) / 0.4) * s(t - 1.0, 2.6)
    p['spine'] = add(p.get('spine', {}), {'roll': 2.5 * sway, 'lean': 0.6 * s(t, 3.2)}); p['pelvis'] = add(p.get('pelvis', {}), {'roll': -1.5 * sway})
    pat = sum(math.exp(-((t - c) / 0.07) ** 2) for c in (2.2, 2.55))
    p['ik']['r'] = dict(p['ik']['r'], to=(P, 'spine_03@0.6', (0.09, -0.12 - 0.03 * pat, 0.02 + 0.015 * pat)))
    return p

def hug_child_adult(t, T=4.4):
    """an adult hugging a child of about 1.35 m: knees soften, trunk bows, arms round the shoulders, cheek to the top of the head"""
    st = stand(t, .4)
    open_ = add(st, {'spine': {'lean': 10}, 'head': {'pitch': 8}})
    for sd in 'lr': open_['arm_' + sd] = {'dir': (0.7, 0.55, -0.35), 'elbow': 40, 'fore': 0, 'hand': 'cup', 'shrug': 3}
    hold = {'pelvis': {'lean': 4, 'dy': 0.05}, 'spine': {'lean': 13}, 'neck': {'pitch': 14}, 'head': {'pitch': 18, 'yaw': 18, 'roll': 10},
            'leg_l': {'fwd': 30, 'out': 9, 'knee': 48, 'foot': -12}, 'leg_r': {'fwd': 22, 'out': 9, 'knee': 40, 'foot': -12},
            'arm_l': {'dir': (0.5, 0.75, -0.4), 'elbow': 100, 'fore': 0, 'hand': 'palm_down_rest', 'shrug': 3, 'reach': 8},
            'arm_r': {'dir': (0.5, 0.75, -0.3), 'elbow': 105, 'fore': 0, 'hand': 'palm_down_rest', 'shrug': 5, 'reach': 8},
            'ik': {'l': {'to': ('C', 'spine_03@0.4', (-0.08, -0.10, 0.0)), 'pole': (1.0, 0.0, -0.4), 'palm': (0, -1, 0)},
                   'r': {'to': ('C', 'spine_03@0.9', (0.09, -0.09, 0.03)), 'pole': (1.0, 0.0, -0.2), 'palm': (0, -1, 0)}}}
    p = keyed(t, [(0, st), (0.5, open_), (1.2, hold), (T, hold)], lag={'arm_l': 0.07, 'arm_r': 0.04, 'head': 0.1})
    k = ease5((t - 0.5) / 0.7)
    p['ik'] = {sd: dict(v, w=back(k, 0.3)) for sd, v in hold['ik'].items()}
    sway = ease5((t - 1.2) / 0.4) * s(t - 1.2, 2.8)
    p['spine'] = add(p['spine'], {'roll': 2.5 * sway}); p['head'] = add(p['head'], {'roll': 2 * sway})
    return p

def hug_child_child(t, T=4.4):
    """the child's side: arms round the grown-up's middle, the cheek turned against the chest"""
    st = stand(t, .4)
    hold = {'spine': {'lean': 8}, 'neck': {'pitch': 0}, 'head': {'yaw': -55, 'pitch': -4, 'roll': -6},
            'pelvis': {'dy': 0.0}, 'leg_l': {'fwd': 6, 'out': 4, 'knee': 6, 'foot': 0}, 'leg_r': {'fwd': -2, 'out': 4, 'knee': 4, 'foot': 0},
            'arm_l': {'dir': (0.5, 0.75, -0.4), 'elbow': 95, 'fore': 0, 'hand': 'palm_down_rest', 'reach': 8},
            'arm_r': {'dir': (0.5, 0.75, -0.4), 'elbow': 95, 'fore': 0, 'hand': 'palm_down_rest', 'reach': 8},
            'ik': {'l': {'to': ('A', 'spine_01@0.6', (0.11, -0.06, 0.0)), 'pole': (1.0, -0.1, -0.5), 'palm': (0, -1, 0)},
                   'r': {'to': ('A', 'spine_01@0.6', (-0.11, -0.06, -0.02)), 'pole': (1.0, -0.1, -0.5), 'palm': (0, -1, 0)}}}
    p = keyed(t, [(0, st), (0.6, st), (1.15, hold), (T, hold)], lag={'arm_l': 0.05, 'arm_r': 0.08, 'head': -0.05})
    k = ease5((t - 0.6) / 0.55)
    p['ik'] = {sd: dict(v, w=back(k, 0.3)) for sd, v in hold['ik'].items()}
    return p


# ------------------------------------------------------------------------------------------------ hand shapes (finger tracks only)
def hand_clip(shape):
    def f(t):
        p = stand(0, 0)
        for sd in 'lr': p['arm_' + sd] = dict(p['arm_' + sd], hand=shape)
        return p
    return f
HAND_CLIPS = {'hand_relaxed': 'relaxed', 'hand_fist': 'fist', 'hand_point': 'point', 'hand_thumb_up': 'thumb_up', 'hand_palm_down_rest': 'palm_down_rest'}


# ------------------------------------------------------------------------------------------------ the scene list
# people: {'A' | 'A2' | 'C': (pose function, where: (x, forward, yaw°) of that body's root, or an attach rule)}
# export: {person: clip name}; 'loop'; 'what'
def _scene(secs, loop, what, people, export, **kw): return dict(secs=secs, loop=loop, what=what, people=people, export=export, **kw)

WALK_T, RUN_T = MOCAP['walk']['seconds'], MOCAP['run']['seconds']
SCENES = {
    'idle': _scene(8.0, True, 'standing: breathing and a slow shift of weight', {'A': (lambda t: stand(t), None)}, {'A': 'idle'}),
    'idle_2': _scene(9.0, True, 'standing on the left leg, right hand on the hip, a look to the side', {'A': (idle_2, None)}, {'A': 'idle_2'}),
    'idle_3': _scene(10.0, True, 'feet apart, hands held loosely in front, scanning the crowd', {'A': (idle_3, None)}, {'A': 'idle_3'}),
    'walk': _scene(WALK_T, True, 'one captured stride, in place (CMU mocap, averaged); left heel strikes at frame 0', {'A': (walk, None)}, {'A': 'walk'}, gait=True),
    'run': _scene(RUN_T, True, 'one captured running stride, in place (CMU mocap, averaged); left foot lands at frame 0', {'A': (run, None)}, {'A': 'run'}, gait=True),
    'carry': _scene(WALK_T, True, 'the captured walk with both arms holding a box', {'A': (carry, None)}, {'A': 'carry'}, gait=True),
    'walk_child': _scene(WALK_CHILD_T, True, "a child's walk: quicker, bouncier, bigger arm swing; left heel at frame 0", {'C': (walk_child, None)}, {'C': 'walk_child'}, gait=True),
    'hold_hand_walk': _scene(STROLL, True, 'adult and child walking hand in hand (child at the adult\'s right, 52 cm across): two adult strides = three child strides',
                             {'C': (hold_hand_walk_child, (-0.52, 0.04, 0)), 'A': (hold_hand_walk_adult, (0, 0, 0))}, {'A': 'hold_hand_walk_adult', 'C': 'hold_hand_walk_child'}, gait=True, order=['A', 'C', 'ikA', 'ikC']),
    'turn': _scene(1.15, False, 'a quarter turn to the left in two steps (Root turns 90 degrees)', {'A': (step_turn, None)}, {'A': 'turn'}),
    'step_turn': _scene(1.15, False, 'a quarter turn in two steps, head first, trunk then feet (Root turns 90 degrees)', {'A': (step_turn, None)}, {'A': 'step_turn_l'}, mirror_as='step_turn_r'),
    'talk_1': _scene(2.4, True, 'talking: open hands', {'A': (lambda t: talk(t, 1), None)}, {'A': 'talk_1'}),
    'talk_2': _scene(4.0, True, 'talking: one hand explains', {'A': (lambda t: talk(t, 2), None)}, {'A': 'talk_2'}),
    'talk_3': _scene(3.0, True, 'talking: a shrug, then pointing ahead', {'A': (lambda t: talk(t, 3), None)}, {'A': 'talk_3'}),
    'wave': _scene(2.2, True, 'right arm up, waving', {'A': (wave, None)}, {'A': 'wave'}),
    'cheer': _scene(1.2, True, 'both fists up, bouncing: a goal', {'A': (cheer, None)}, {'A': 'cheer'}),
    'laugh_body': _scene(3.2, False, 'a laugh through the whole body: back, folding forward in bursts, a hand to the belly', {'A': (laugh_body, None)}, {'A': 'laugh_body'}),
    'sit': _scene(6.0, False, 'stand to seated (seat at knee height), then held', {'A': (lambda t: to(SIT, t, 1.1), None)}, {'A': 'sit'}),
    'sit_play_board': _scene(7.0, True, 'seated at a table (top 0.72 m, board 40 cm ahead): takes a piece, moves it, looks up', {'A': (sit_play_board, None)}, {'A': 'sit_play_board'}),
    'lean_on_rail': _scene(8.0, True, 'forearms on a rail (top 1.05 m, 40 cm ahead), one foot crossed', {'A': (lean_on_rail, None)}, {'A': 'lean_on_rail'}),
    'crouch_to_child': _scene(6.0, False, 'down on one knee to a child\'s eye level, then held', {'A': (lambda t: to(CROUCH, t, 1.2), None)}, {'A': 'crouch_to_child'}),
    'hand_on_shoulder': _scene(6.0, False, 'right hand out and down onto the shoulder of a child standing at the right side, then held', {'A': (lambda t: to(SHOULDER, t, 0.9), None)}, {'A': 'hand_on_shoulder'}),
    'hug': _scene(6.0, False, 'both arms round someone in front, then held', {'A': (lambda t: to(HUG, t, 1.0), None)}, {'A': 'hug'}),
    'ruffle_hair': _scene(3.6, False, "standing at a child's left (child 1.35 m, 35 cm to the right, 30 cm ahead): the right hand ruffles the child's hair",
                          {'C': (lambda t: child_attend(t), (-0.33, 0.28, 0)), 'A': (ruffle_hair, (0, 0, 0))}, {'A': 'ruffle_hair'}),
    'put_scarf_on': _scene(4.4, False, 'kneeling in front of a child (50 cm ahead, facing): a scarf round the neck with both hands, a pat, hands to the shoulders',
                           {'C': (lambda t: child_attend(t), (0.0, 0.50, 180)), 'A': (put_scarf_on, (0, 0, 0))}, {'A': 'put_scarf_on'}),
    'child_on_shoulders': _scene(6.0, True, 'a child on the shoulders: the carrier holds the shins; the rider holds the head and waves once',
                                 {'A': (carrier, (0, 0, 0)), 'C': (rider, ('attach', 'A', 'neck_01', (0.0, -0.14, 0.05)))},
                                 {'A': 'child_on_shoulders_carrier', 'C': 'child_on_shoulders_rider'}, order=['A', 'C', 'ikA', 'ikC']),
    'kick_ball': _scene(1.9, False, "a child's kick with the right foot; the foot meets the ball at 0.70 s", {'C': (kick_ball, None)}, {'C': 'kick_ball'}, events={'strike': 0.70}),
    'hug_partner': _scene(4.2, False, 'two adults embracing (both play this clip, facing, roots 42 cm apart): right arm over the shoulder, left round the waist, a sway, two pats',
                          {'A2': (hug_partner, (0, 0.42, 180)), 'A': (hug_partner, (0, 0, 0))}, {'A': 'hug_partner'}),
    'hug_child': _scene(4.4, False, 'an adult and a child of about 1.35 m embracing (facing, roots 36 cm apart)',
                        {'A': (hug_child_adult, (0, 0, 0)), 'C': (hug_child_child, (0, 0.36, 180))}, {'A': 'hug_partner_adult', 'C': 'hug_partner_child'}, order=['A', 'C', 'ikA', 'ikC']),
}
for name, shape in HAND_CLIPS.items():
    SCENES[name] = _scene(1.0, True, f'hand shape "{shape}" on both hands: finger bones only, for an override or additive layer', {'A': (hand_clip(shape), None)}, {'A': name}, hands_only=True)

STRIPS = ['put_scarf_on', 'ruffle_hair', 'hold_hand_walk', 'child_on_shoulders', 'kick_ball', 'hug_child', 'hug_partner',
          'walk_child', 'idle_2', 'idle_3', 'laugh_body', 'lean_on_rail', 'sit_play_board', 'step_turn']
STILL_AT = {'idle': 1.0, 'idle_2': 3.5, 'idle_3': 2.0, 'walk': 0.28, 'run': 0.2, 'carry': 0.3, 'walk_child': 0.2, 'turn': 0.5, 'step_turn_l': 0.5, 'step_turn_r': 0.5,
            'talk_1': 0.3, 'talk_2': 0.5, 'talk_3': 2.2, 'wave': 0.2, 'cheer': 0.15, 'laugh_body': 1.0, 'sit': 3.0, 'sit_play_board': 2.4, 'lean_on_rail': 2.0,
            'crouch_to_child': 3.0, 'hand_on_shoulder': 3.0, 'hug': 3.0, 'ruffle_hair': 1.5, 'put_scarf_on': 1.6, 'child_on_shoulders_carrier': 1.0,
            'child_on_shoulders_rider': 3.0, 'kick_ball': 0.7, 'hug_partner': 3.0, 'hug_partner_adult': 3.0, 'hug_partner_child': 3.0,
            'hold_hand_walk_adult': 0.3, 'hold_hand_walk_child': 0.3}

for _n, _sc in list(SCENES.items()):
    if _sc.get('mirror_as'):
        SCENES[_n + '_mirror'] = dict(_sc, people={w: ((lambda f: (lambda t: mirror(f(t))))(fn), at) for w, (fn, at) in _sc['people'].items()},
                                      export={w: _sc['mirror_as'] for w in _sc['export']}, mirror_as=None)

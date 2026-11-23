"""
LIFE character assets: what the build scripts share. Runs inside Blender's Python (the `bpy` wheel).

  · mpfb()           installs/enables MPFB2 and returns its services
  · Poser            turns a readable pose (directions and angles in the body's own frame) into bone rotations
  · CLIPS            every animation clip, as a function of time that returns such a pose

The body's frame is Blender's for an MPFB human: +X is the character's LEFT, -Y is FORWARD, +Z is up.
Angles are degrees. A limb swinging forward is a positive `fwd`; a knee or elbow bending is a positive number.
"""
import importlib, json, math, os, sys
from pathlib import Path
import bpy
from mathutils import Matrix, Quaternion, Vector

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
FWD, UP, LEFT = Vector((0, -1, 0)), Vector((0, 0, 1)), Vector((1, 0, 0))


def _dyn(pkg, key):
    for name in list(sys.modules):
        if name.endswith(pkg): return getattr(importlib.import_module(name), key)
    raise ValueError(pkg)


def mpfb():
    """MPFB2 enabled in this Blender, with the asset packs linked into its user data. Returns a namespace of services."""
    if not any(m.endswith('.mpfb') or m == 'mpfb' for m in sys.modules):
        try: bpy.ops.preferences.addon_enable(module='bl_ext.user_default.mpfb')
        except Exception: pass
    if not any(m.endswith('.mpfb') for m in sys.modules):
        bpy.ops.extensions.package_install_files(filepath=os.environ['LIFE_MPFB_ZIP'], repo='user_default', enable_on_install=True)
    class S: pass
    for mod, key in [('humanservice', 'HumanService'), ('targetservice', 'TargetService'), ('exportservice', 'ExportService'), ('objectservice', 'ObjectService'),
                     ('assetservice', 'AssetService'), ('faceservice', 'FaceService'), ('locationservice', 'LocationService')]:
        setattr(S, key, _dyn('mpfb.services.' + mod, key))
    data = os.environ.get('LIFE_DATA')
    if data and Path(data).is_dir():
        user = Path(S.LocationService.get_user_data())
        for sub in Path(data).iterdir():
            dst = user / sub.name
            if not dst.exists(): os.symlink(sub, dst, target_is_directory=sub.is_dir())
        try: S.AssetService.update_all_asset_lists(); S.AssetService.rescan_pack_metadata()
        except Exception as e: print('asset rescan:', e)
    S.data = Path(data) if data else None
    return S


def wipe():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.images, bpy.data.actions, bpy.data.cameras, bpy.data.lights):
        for d in list(coll):
            if d.users == 0: coll.remove(d)


# ------------------------------------------------------------------------------------------------ poses
def rot(axis, deg): return Quaternion(Vector(axis).normalized(), math.radians(deg))
def arc(a, b): return Vector(a).normalized().rotation_difference(Vector(b).normalized())

FINGERS = ['index', 'middle', 'ring', 'pinky']


class Poser:
    """Applies readable poses to one MPFB game_engine rig. Every rotation is measured from that rig's own rest pose."""

    def __init__(self, rig):
        self.rig = rig; self.b = rig.data.bones
        self.rest = {b.name: b.matrix_local.to_3x3() for b in self.b}
        self.dir = {b.name: (b.tail_local - b.head_local).normalized() for b in self.b}
        self.hip = self.b['thigh_l'].head_local.z
        self.leg = (self.b['thigh_l'].head_local - self.b['foot_l'].head_local).length
        self.ground = {n: (self.b[n].head_local.z, self.b[n].tail_local.z) for n in ('foot_l', 'foot_r', 'ball_l', 'ball_r')}
        for pb in rig.pose.bones: pb.rotation_mode = 'QUATERNION'

    def deltas(self, p):
        """bone -> rotation (armature axes, parent taken at rest) and the pelvis offset in metres"""
        D = {}
        pel = p.get('pelvis', {})
        D['Root'] = rot(UP, p.get('turn', 0))
        D['pelvis'] = rot(UP, pel.get('yaw', 0)) @ rot(LEFT, pel.get('lean', 0)) @ rot(FWD, -pel.get('roll', 0))
        sp = p.get('spine', {})
        for n in ('spine_01', 'spine_02', 'spine_03'):
            D[n] = rot(UP, sp.get('yaw', 0) / 3) @ rot(LEFT, sp.get('lean', 0) / 3) @ rot(FWD, -sp.get('roll', 0) / 3)
        for n, k in (('neck_01', 'neck'), ('head', 'head')):
            h = p.get(k, {}); D[n] = rot(UP, h.get('yaw', 0)) @ rot(LEFT, h.get('pitch', 0)) @ rot(FWD, -h.get('roll', 0))
        for s, sx in (('l', 1), ('r', -1)):
            a = p.get('arm_' + s, {})
            ua, fa, ha = 'upperarm_' + s, 'lowerarm_' + s, 'hand_' + s
            out, fwd, up = a.get('dir', (0.16, 0.02, -1))
            target = Vector((sx * out, -fwd, up)).normalized()
            sw = arc(self.dir[ua], target)
            D[ua] = rot(target, sx * a.get('twist', 0)) @ sw
            D['clavicle_' + s] = rot(FWD, -sx * a.get('shrug', 0)) @ rot(UP, -sx * a.get('reach', 0))
            n = self.dir[ua].cross(FWD).normalized()                      # the elbow's hinge, in the rest pose
            want = rot(n, a.get('elbow', 12)) @ self.dir[ua]              # 0 = a straight arm
            D[fa] = rot(want, sx * a.get('fore', 0)) @ arc(self.dir[fa], want)
            straight = arc(self.dir[ha], self.dir[fa]).slerp(Quaternion(), 0.35)
            D[ha] = rot(n, a.get('wrist', 0)) @ rot(self.dir[fa].cross(n), a.get('wrist_side', 0)) @ straight
            palm = (self.b['pinky_01_' + s].head_local - self.b['index_01_' + s].head_local).cross(self.dir['middle_01_' + s]).normalized() * sx
            curl = a.get('curl', 0.22)
            for f in FINGERS:
                ax = self.dir[f + '_01_' + s].cross(palm).normalized()
                for i, w in ((1, 55), (2, 70), (3, 45)): D[f'{f}_0{i}_{s}'] = rot(ax, -w * curl * (1.15 if f in ('ring', 'pinky') else 1))
            tax = self.dir['thumb_02_' + s].cross(palm).normalized()
            for i, w in ((1, 8), (2, 25), (3, 30)): D[f'thumb_0{i}_{s}'] = rot(tax, -w * a.get('thumb', curl))
            lg = p.get('leg_' + s, {})
            th, ca, fo = 'thigh_' + s, 'calf_' + s, 'foot_' + s
            tdir = rot(LEFT, -lg.get('fwd', 0)) @ (rot(FWD, -sx * lg.get('out', 0)) @ Vector((sx * 0.035, 0, -1)))
            D[th] = rot(tdir, sx * lg.get('twist', 0)) @ arc(self.dir[th], tdir)
            cw = rot(LEFT, lg.get('knee', 0)) @ self.dir[th]
            D[ca] = arc(self.dir[ca], cw)
            D[fo] = rot(LEFT, lg.get('foot', 0)); D['ball_' + s] = rot(LEFT, lg.get('toe', 0))
        off = Vector((pel.get('dx', 0), -pel.get('dy', 0), pel.get('dz', 0))) * self.hip
        return D, off

    def apply(self, p, ground=True):
        D, off = self.deltas(p)
        pb = self.rig.pose.bones
        for n, q in D.items():
            if n not in pb: continue
            R = self.rest[n]
            pb[n].rotation_quaternion = (R.inverted() @ q.to_matrix() @ R).to_quaternion()
        pb['pelvis'].location = self.rest['pelvis'].inverted() @ off
        if ground and p.get('ground', True):
            bpy.context.view_layer.update()
            low = min(min(pb[n].head.z - self.ground[n][0], pb[n].tail.z - self.ground[n][1]) for n in self.ground)
            pb['pelvis'].location = self.rest['pelvis'].inverted() @ (off - Vector((0, 0, low)))
        bpy.context.view_layer.update()

    def local_quats(self):
        """what a glTF animation stores: each bone's rotation in its parent's space (rest and pose together)"""
        out = {}
        for pbone in self.rig.pose.bones:
            b = pbone.bone
            rest_local = (b.parent.matrix_local.inverted() @ b.matrix_local) if b.parent else b.matrix_local
            q = (rest_local.to_3x3() @ pbone.rotation_quaternion.to_matrix()).to_quaternion()
            out[b.name] = [round(x, 5) for x in (q.w, q.x, q.y, q.z)]
        return out

    def wear(self, quats, pelvis_up=None):
        """dress this rig in rotations recorded on ANOTHER rig (what three.js does when a shared clip plays)"""
        for pbone in self.rig.pose.bones:
            if pbone.name not in quats: continue
            b = pbone.bone
            rest_local = ((b.parent.matrix_local.inverted() @ b.matrix_local) if b.parent else b.matrix_local).to_3x3()
            pbone.rotation_quaternion = (rest_local.inverted() @ Quaternion(quats[pbone.name]).to_matrix()).to_quaternion()
        pb = self.rig.pose.bones; pb['pelvis'].location = (0, 0, 0)
        bpy.context.view_layer.update()
        low = min(min(pb[n].head.z - self.ground[n][0], pb[n].tail.z - self.ground[n][1]) for n in self.ground)
        pb['pelvis'].location = self.rest['pelvis'].inverted() @ Vector((0, 0, -low if pelvis_up is None else pelvis_up))
        bpy.context.view_layer.update()


# ------------------------------------------------------------------------------------------------ clips
MOCAP = json.loads((ROOT / 'public/life/town/mocap.json').read_text())['clips']
TAU = math.tau
def s(t, period=1.0, phase=0.0): return math.sin(TAU * (t / period + phase))
def ease(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
def mix(a, b, k):
    if isinstance(a, dict): return {key: mix(a.get(key, _zero(b[key]) if key in b else 0), b.get(key, _zero(a[key]) if key in a else 0), k) for key in set(a) | set(b)}
    if isinstance(a, (tuple, list)): return tuple(x + (y - x) * k for x, y in zip(a, b))
    if isinstance(a, bool): return a if k < .5 else b
    return a + (b - a) * k
def _zero(v):
    if isinstance(v, dict): return {}
    if isinstance(v, (tuple, list)): return v
    return 0

def gait(clip, key, phase):
    v = MOCAP[clip][key]; n = len(v); x = (phase % 1) * n; i = int(x); f = x - i
    return math.degrees(v[i % n] + (v[(i + 1) % n] - v[i % n]) * f)

HANG = (0.17, 0.03, -1)

def stand(t=0.0, breath=1.0, per=8.0):
    b = s(t, per / max(1, round(per / 4))) * breath; w = s(t, per) * breath
    return {'pelvis': {'roll': 2.2 * w, 'dx': 0.012 * w, 'yaw': 1.0 * w}, 'spine': {'lean': 1.5 + 0.9 * b, 'roll': -2.0 * w, 'yaw': -1.0 * w},
            'neck': {'pitch': 2 - 0.5 * b}, 'head': {'pitch': -1, 'yaw': 1.5 * s(t, per, .2) * breath, 'roll': 0.8 * w},
            'arm_l': {'dir': (0.17 + .008 * b, 0.03, -1), 'elbow': 14 + 2 * b, 'shrug': 1.2 * b, 'fore': 20}, 'arm_r': {'dir': (0.17 + .008 * b, 0.03, -1), 'elbow': 14 + 2 * b, 'shrug': 1.2 * b, 'fore': 20},
            'leg_l': {'fwd': 1.5 + 1.2 * w, 'out': 3.5 + 2.2 * w, 'knee': 4 + 3 * max(0, w), 'foot': 0}, 'leg_r': {'fwd': 1.5 - 1.2 * w, 'out': 3.5 - 2.2 * w, 'knee': 4 + 3 * max(0, -w), 'foot': 0}}

def _walk(clip, t, carry=False):
    T = MOCAP[clip]['seconds']; ph = t / T; run = clip == 'run'
    sign = -1 if MOCAP[clip]['pelvisYaw'][0] > 0 else 1
    p = {'pelvis': {'yaw': sign * gait(clip, 'pelvisYaw', ph), 'roll': gait(clip, 'pelvisRoll', ph)},
         'spine': {'yaw': sign * gait(clip, 'torsoYaw', ph), 'lean': gait(clip, 'torsoLean', ph) + (2 if not run else 0), 'roll': gait(clip, 'torsoRoll', ph)},
         'neck': {'pitch': -gait(clip, 'torsoLean', ph) * .5}, 'head': {'yaw': -sign * (gait(clip, 'pelvisYaw', ph) + gait(clip, 'torsoYaw', ph)) * .8}}
    for sd in 'lr':
        th, kn = gait(clip, 'thigh_' + sd, ph), max(0, gait(clip, 'knee_' + sd, ph) - (0 if run else 9))
        p['leg_' + sd] = {'fwd': th, 'out': 2 + gait(clip, 'thighOut_' + sd, ph), 'knee': kn, 'foot': (th - kn) * .8 + (kn * .35 if th < 0 else 0)}
        a = math.radians(gait(clip, 'arm_' + sd, ph))
        p['arm_' + sd] = {'dir': (0.17, math.sin(a), -math.cos(a)), 'elbow': max(6, gait(clip, 'elbow_' + sd, ph)), 'fore': 25, 'curl': .45 if run else .25}
    if run: p['pelvis']['dz'] = 0.035 * abs(s(t, T))
    if carry:
        for sd in 'lr': p['arm_' + sd] = {'dir': (0.22, 0.28, -1), 'elbow': 88 + 2 * s(t, T / 2), 'fore': 80, 'curl': .5, 'twist': 0}
        p['spine']['lean'] = -3; p['spine']['yaw'] *= .4
    return p

def _talk(t, k):
    base = stand(t, .6, {1: 2.4, 2: 4.0, 3: 3.0}[k])
    if k == 1:   # open hands, palms up, a small beat
        for sd, ph in (('l', 0), ('r', .08)):
            b = 0.5 + 0.5 * s(t, 1.2, ph)
            base['arm_' + sd] = {'dir': (0.2, 0.22 + .05 * b, -1), 'elbow': 70 + 18 * b, 'fore': -60, 'twist': -8, 'curl': .12, 'wrist': -8 * b}
        base['head']['pitch'] = -2 + 3 * s(t, 1.2)
    elif k == 2:  # one hand explains, the other rests
        b = 0.5 + 0.5 * s(t, 1.0)
        base['arm_r'] = {'dir': (0.25, 0.35 + .08 * b, -0.9), 'elbow': 95 + 14 * b, 'fore': 10 + 30 * s(t, 2.0), 'curl': .18, 'wrist': 10 * s(t, 1.0, .2)}
        base['head']['yaw'] = 5 * s(t, 4.0); base['head']['roll'] = 3 * s(t, 2.0)
    else:         # a shrug, then a point forward
        u = ease(max(0, s(t, 3.0))); v = ease(max(0, -s(t, 3.0)))
        for sd in 'lr': base['arm_' + sd] = {'dir': (0.2 + .1 * u, 0.1 + .1 * u, -1), 'elbow': 20 + 75 * u, 'fore': -70 * u + 20, 'shrug': 7 * u, 'curl': .15}
        base['arm_r'] = mix(base['arm_r'], {'dir': (0.1, 0.9, -0.25), 'elbow': 18, 'fore': 30, 'curl': .1, 'shrug': 0}, v)
        base['head']['roll'] = 5 * u
    return base

def _wave(t):
    p = stand(t, .5, 2.2); w = s(t, 0.55)
    p['arm_r'] = {'dir': (0.75, 0.12, 0.55), 'twist': -80, 'elbow': 68 + 22 * w, 'fore': 0, 'curl': .02, 'thumb': 0, 'wrist_side': 10 * w, 'shrug': 6}
    p['spine']['roll'] = 3; p['head']['roll'] = -3; p['head']['pitch'] = -4
    return p

def _cheer(t):
    p = stand(t, .3, 1.2); u = 0.5 + 0.5 * s(t, 0.6)
    for sd, ph in (('l', 0), ('r', .5)):
        p['arm_' + sd] = {'dir': (0.42, 0.15, 1.0), 'twist': -70, 'elbow': 35 + 45 * (1 - u), 'curl': .95, 'thumb': .9, 'shrug': 10}
        p['leg_' + sd] = {'fwd': 6 * (1 - u), 'out': 5, 'knee': 14 * (1 - u), 'foot': -18 * u}
    p['pelvis'] = {'dz': 0.0}; p['spine'] = {'lean': -6 * u}; p['head'] = {'pitch': -12 * u}
    return p

SIT = {'pelvis': {'lean': -6, 'dy': -0.02}, 'spine': {'lean': 10}, 'neck': {'pitch': -2}, 'head': {'pitch': -2},
       'leg_l': {'fwd': 86, 'out': 7, 'knee': 88, 'foot': 0}, 'leg_r': {'fwd': 86, 'out': 7, 'knee': 88, 'foot': 0},
       'arm_l': {'dir': (0.2, 0.42, -1), 'elbow': 62, 'fore': 70, 'curl': .3}, 'arm_r': {'dir': (0.2, 0.42, -1), 'elbow': 62, 'fore': 70, 'curl': .3}}
CROUCH = {'pelvis': {'lean': 4}, 'spine': {'lean': 16}, 'neck': {'pitch': -8}, 'head': {'pitch': -6},
          'leg_l': {'fwd': 100, 'out': 12, 'knee': 138, 'foot': 12}, 'leg_r': {'fwd': 38, 'out': 8, 'knee': 128, 'foot': 62, 'toe': -55},
          'arm_l': {'dir': (0.25, 0.75, -0.55), 'elbow': 72, 'fore': 60, 'curl': .25}, 'arm_r': {'dir': (0.3, 0.8, -0.35), 'elbow': 40, 'fore': 30, 'curl': .1}}
SHOULDER = {'spine': {'lean': 3, 'roll': -3, 'yaw': -6}, 'head': {'yaw': -22, 'pitch': 12, 'roll': -3}, 'neck': {'pitch': 4},
            'arm_r': {'dir': (0.62, 0.42, -0.16), 'twist': 60, 'elbow': 52, 'fore': -20, 'wrist': -22, 'curl': .28, 'thumb': .1, 'shrug': 3}}
HUG = {'spine': {'lean': 12}, 'neck': {'pitch': 6}, 'head': {'pitch': 8, 'roll': 10, 'yaw': 12},
       'arm_l': {'dir': (0.45, 0.85, -0.12), 'twist': 40, 'elbow': 96, 'fore': 0, 'curl': .2, 'shrug': 6, 'reach': 10},
       'arm_r': {'dir': (0.45, 0.8, -0.38), 'twist': 40, 'elbow': 104, 'fore': 0, 'curl': .2, 'shrug': 4, 'reach': 10},
       'leg_l': {'fwd': 6, 'out': 4, 'knee': 6}, 'leg_r': {'fwd': -4, 'out': 4, 'knee': 4}}

def _to(target, t, rise=0.9, breath=.5):
    """stand → target over `rise` seconds, then the target held, breathing"""
    k = ease(t / rise); b = s(t, 4.0) * breath
    p = mix(stand(t, 1 - .5 * k), target, k)
    p.setdefault('spine', {}); p['spine']['lean'] = p['spine'].get('lean', 0) + 0.8 * b * k
    return p

def _turn(t, T=1.0):
    k = ease(t / T); step = math.sin(math.pi * min(1, t / T))
    p = stand(t, .3); p['turn'] = 90 * k
    p['leg_l'] = {'fwd': 10 * step * (1 if t < T / 2 else .3), 'out': 4 + 10 * step * (1 if t < T / 2 else 0), 'knee': 22 * step * (1 if t < T / 2 else .2)}
    p['leg_r'] = {'fwd': 8 * step * (0 if t < T / 2 else 1), 'out': 4, 'knee': 20 * step * (0 if t < T / 2 else 1)}
    p['spine']['yaw'] = 14 * step; p['head']['yaw'] = 18 * step
    return p

# id -> (seconds, loops, pose at time t, what it is)
CLIPS = {
    'idle': (8.0, True, lambda t: stand(t), 'standing: breathing and a slow shift of weight'),
    'walk': (MOCAP['walk']['seconds'], True, lambda t: _walk('walk', t), 'one captured stride, in place (CMU mocap, averaged)'),
    'run': (MOCAP['run']['seconds'], True, lambda t: _walk('run', t), 'one captured running stride, in place (CMU mocap, averaged)'),
    'carry': (MOCAP['walk']['seconds'], True, lambda t: _walk('walk', t, True), 'the captured walk with both arms holding a box'),
    'turn': (1.0, False, _turn, 'a quarter turn to the left on the spot (Root bone turns 90 degrees)'),
    'talk_1': (2.4, True, lambda t: _talk(t, 1), 'talking: open hands'),
    'talk_2': (4.0, True, lambda t: _talk(t, 2), 'talking: one hand explains'),
    'talk_3': (3.0, True, lambda t: _talk(t, 3), 'talking: a shrug, then pointing ahead'),
    'wave': (2.2, True, _wave, 'right arm up, waving'),
    'cheer': (1.2, True, _cheer, 'both fists up, bouncing: a goal'),
    'sit': (6.0, False, lambda t: _to(SIT, t, 1.1), 'stand to seated (seat at knee height), then held'),
    'crouch_to_child': (6.0, False, lambda t: _to(CROUCH, t, 1.2), 'down on one knee to a child\'s eye level, then held'),
    'hand_on_shoulder': (6.0, False, lambda t: _to(SHOULDER, t, 0.9), 'right hand out and down onto the shoulder of a child standing at the right side, then held'),
    'hug': (6.0, False, lambda t: _to(HUG, t, 1.0), 'both arms round someone in front, then held'),
}
FPS = 30

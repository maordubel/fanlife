"""
LIFE character assets: what the build scripts share. Runs inside Blender's Python (the `bpy` wheel).

  · mpfb()           installs/enables MPFB2 and returns its services
  · Poser            turns a readable pose (directions and angles in the body's own frame) into bone rotations,
                     with relaxed hands by default and an analytic two-bone arm IK for contacts
  · motion.py        every animation clip (scenes of one or two people), as functions of time that return poses

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
CASCADE = {'index': 0.82, 'middle': 1.0, 'ring': 1.1, 'pinky': 1.22}       # a resting hand curls more toward the little finger
SPLAY = {'index': 2.0, 'middle': 0.3, 'ring': -1.5, 'pinky': -3.5}         # and fans a little
RELAXED = 0.34
HANDS = {   # hand shapes: per-finger curl (1 = a fist), thumb curl, thumb across the palm, fan
    'relaxed': {'curl': RELAXED, 'thumb': 0.3, 'across': 0.35, 'fan': 0.8, 'mcp': 0.8},
    'fist': {'fingers': {'index': 1.3, 'middle': 1.35, 'ring': 1.35, 'pinky': 1.3}, 'thumb': 0.75, 'across': 1.0, 'fan': 0.0},
    'point': {'fingers': {'index': 0.02, 'middle': 1.3, 'ring': 1.35, 'pinky': 1.3}, 'thumb': 0.7, 'across': 0.9, 'fan': 0.3},
    'thumb_up': {'fingers': {'index': 1.3, 'middle': 1.35, 'ring': 1.35, 'pinky': 1.3}, 'thumb': -0.15, 'across': -0.2, 'fan': 0.0},
    'palm_down_rest': {'fingers': {'index': 0.3, 'middle': 0.34, 'ring': 0.36, 'pinky': 0.4}, 'thumb': 0.15, 'across': 0.0, 'fan': 0.6, 'mcp': 1.25},
    'pinch': {'fingers': {'index': 0.62, 'middle': 0.75, 'ring': 0.95, 'pinky': 1.05}, 'thumb': 0.55, 'across': 0.7, 'fan': 0.2},
    'cup': {'fingers': {'index': 0.34, 'middle': 0.36, 'ring': 0.4, 'pinky': 0.45}, 'thumb': 0.2, 'across': 0.1, 'fan': 1.3, 'mcp': 1.15},
}


def hand_shape(h):
    """a full hand shape (per-finger curl, thumb, across, fan, mcp) from a name, a dict, or ('mix', a, b, k)"""
    if isinstance(h, tuple) and h and h[0] == 'mix':
        x, y, k = hand_shape(h[1]), hand_shape(h[2]), h[3]
        return {'fingers': {f: x['fingers'][f] + (y['fingers'][f] - x['fingers'][f]) * k for f in FINGERS},
                **{n: x[n] + (y[n] - x[n]) * k for n in ('thumb', 'across', 'fan', 'mcp')}}
    d = dict(HANDS['relaxed']); src = HANDS.get(h, {}) if isinstance(h, str) else h; d.update(src)
    if h != 'relaxed' and 'mcp' not in src: d['mcp'] = 1.0
    if not d.get('fingers'): d['fingers'] = {f: d.get('curl', RELAXED) * CASCADE[f] for f in FINGERS}
    d.setdefault('mcp', 1.0); d.setdefault('fan', 1.0); d.setdefault('across', 0.25); d.setdefault('thumb', 0.35)
    return d


class Poser:
    """Applies readable poses to one MPFB game_engine rig. Every rotation is measured from that rig's own rest pose."""

    def __init__(self, rig):
        self.rig = rig; self.b = rig.data.bones
        self.rest = {b.name: b.matrix_local.to_3x3() for b in self.b}
        self.dir = {b.name: (b.tail_local - b.head_local).normalized() for b in self.b}
        self.len = {b.name: (b.tail_local - b.head_local).length for b in self.b}
        self.hip = self.b['thigh_l'].head_local.z
        self.leg = (self.b['thigh_l'].head_local - self.b['foot_l'].head_local).length
        self.ground = {n: (self.b[n].head_local.z, self.b[n].tail_local.z) for n in ('foot_l', 'foot_r', 'ball_l', 'ball_r')}
        # arm lengths for IK: shoulder → elbow → wrist
        self.arm = {s: (self.len['upperarm_' + s], (self.b['hand_' + s].head_local - self.b['lowerarm_' + s].head_local).length) for s in 'lr'}
        for pb in rig.pose.bones: pb.rotation_mode = 'QUATERNION'

    def hand(self, D, s, sx, a):
        if 'curl' in a and 'hand' not in a: shape = hand_shape({'curl': a['curl'], 'thumb': a.get('thumb', 0.35), 'across': 0.25, 'fan': 1.0})
        else: shape = hand_shape(a.get('hand') or 'relaxed')
        if 'thumb' in a: shape['thumb'] = a['thumb']
        fingers = shape['fingers']
        palm = (self.b['pinky_01_' + s].head_local - self.b['index_01_' + s].head_local).cross(self.dir['middle_01_' + s]).normalized() * sx
        mcp = shape.get('mcp', 1.0)
        for f in FINGERS:
            c = fingers[f]
            ax = self.dir[f + '_01_' + s].cross(palm).normalized()
            for i, w in ((1, 55 * mcp), (2, 70), (3, 45 if c < 1 else 60)):
                q = rot(ax, w * c)
                if i == 1: q = rot(palm, sx * SPLAY[f] * shape.get('fan', 1.0)) @ q
                D[f'{f}_0{i}_{s}'] = q
        tc = shape.get('thumb', 0.35); across = shape.get('across', 0.25)
        tax = self.dir['thumb_02_' + s].cross(palm).normalized()
        D['thumb_01_' + s] = rot(palm, -sx * 12 * across) @ rot(tax, 10 * tc)
        D['thumb_02_' + s] = rot(tax, 28 * tc); D['thumb_03_' + s] = rot(tax, 32 * tc)

    def deltas(self, p):
        """bone -> rotation (armature axes, parent taken at rest) and the pelvis offset in metres"""
        D = {}
        pel = p.get('pelvis', {})
        D['Root'] = rot(UP, p.get('turn', 0))
        D['pelvis'] = rot(UP, pel.get('yaw', 0)) @ rot(LEFT, pel.get('lean', 0)) @ rot(FWD, -pel.get('roll', 0))
        sp = p.get('spine', {})
        for n, k in (('spine_01', .3), ('spine_02', .33), ('spine_03', .37)):
            D[n] = rot(UP, sp.get('yaw', 0) * k) @ rot(LEFT, sp.get('lean', 0) * k) @ rot(FWD, -sp.get('roll', 0) * k)
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
            straight = arc(self.dir[ha], self.dir[fa]).slerp(Quaternion(), 0.12)
            D[ha] = rot(n, a.get('wrist', 0)) @ rot(self.dir[fa].cross(n), a.get('wrist_side', 0)) @ straight
            self.hand(D, s, sx, a)
            lg = p.get('leg_' + s, {})
            th, ca, fo = 'thigh_' + s, 'calf_' + s, 'foot_' + s
            tdir = rot(LEFT, -lg.get('fwd', 0)) @ (rot(FWD, -sx * lg.get('out', 0)) @ Vector((sx * 0.035, 0, -1)))
            D[th] = rot(tdir, sx * lg.get('twist', 0)) @ arc(self.dir[th], tdir)
            cw = rot(LEFT, lg.get('knee', 0)) @ self.dir[th]
            D[ca] = arc(self.dir[ca], cw)
            D[fo] = rot(LEFT, lg.get('foot', 0)) @ rot(UP, sx * lg.get('foot_out', 0)); D['ball_' + s] = rot(LEFT, lg.get('toe', 0))
        off = Vector((pel.get('dx', 0), -pel.get('dy', 0), pel.get('dz', 0))) * self.hip
        return D, off

    def lowest(self, knees=False):
        pb = self.rig.pose.bones
        low = min(min(pb[n].head.z - self.ground[n][0], pb[n].tail.z - self.ground[n][1]) for n in self.ground)
        if knees:   # a knee on the floor: the kneecap is about 5 cm in front of/below the joint
            kr = 0.055 * self.hip / 0.95
            low = min(low, min(pb['calf_' + s].head.z - kr for s in 'lr'))
        return low

    def apply(self, p, ground=True, resolve=None):
        """pose the rig. `resolve(spec)` turns an IK target spec into a point in this rig's armature space."""
        D, off = self.deltas(p)
        pb = self.rig.pose.bones
        for n, q in D.items():
            if n not in pb: continue
            R = self.rest[n]
            pb[n].rotation_quaternion = (R.inverted() @ q.to_matrix() @ R).to_quaternion()
        pb['pelvis'].location = self.rest['pelvis'].inverted() @ off
        bpy.context.view_layer.update()
        if ground and p.get('ground', True):
            low = self.lowest(p.get('kneel', False))
            pb['pelvis'].location = self.rest['pelvis'].inverted() @ (off - Vector((0, 0, low)))
            bpy.context.view_layer.update()
        if resolve is not False: self.apply_ik(p, resolve)

    def apply_ik(self, p, resolve=None):
        for s in 'lr':
            ik = (p.get('ik') or {}).get(s)
            if ik and ik.get('w', 1) > 1e-3:
                to = resolve(ik['to']) if resolve else Vector(ik['to'])
                self.reach(s, to, ik.get('pole', (0.5, -0.4, -0.6)), ik.get('w', 1.0), ik.get('palm'))

    def _turn_bone(self, name, q):
        pb = self.rig.pose.bones[name]; M = pb.matrix.copy()
        loc, r, sc = M.decompose()
        pb.matrix = Matrix.LocRotScale(loc, q @ r, sc); bpy.context.view_layer.update()

    def palm_normal(self, s):
        pb = self.rig.pose.bones; sx = 1 if s == 'l' else -1
        return ((pb['pinky_01_' + s].head - pb['index_01_' + s].head).cross(pb['middle_01_' + s].head - pb['hand_' + s].head) * sx).normalized()

    def reach(self, s, W, pole, w=1.0, palm=None):
        """two-bone arm IK: put the wrist (hand bone head) at W (armature space), elbow toward `pole` (out, fwd, up)."""
        pb = self.rig.pose.bones; sx = 1 if s == 'l' else -1
        ua, fa, ha = pb['upperarm_' + s], pb['lowerarm_' + s], pb['hand_' + s]
        S = ua.head.copy(); W = Vector(W)
        if w < 1: W = ha.head.lerp(W, max(0.0, w))
        L1, L2 = self.arm[s]
        d = max(abs(L1 - L2) + 1e-3, min((W - S).length, (L1 + L2) * 0.999))
        u = (W - S).normalized()
        P = Vector((sx * pole[0], -pole[1], pole[2]))
        v = (P - u * P.dot(u))
        if v.length < 1e-4: v = Vector((0, 0, -1)) - u * (-u.z)
        v.normalize()
        ca = max(-1, min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))); sa = math.sqrt(1 - ca * ca)
        E = S + L1 * (ca * u + sa * v); Wd = S + u * d
        self._turn_bone(ua.name, arc(ua.tail - ua.head, E - S))
        # twist the upper arm about itself so the forearm's hinge plane holds the wrist
        a = (E - S).normalized(); f = (fa.tail - fa.head).normalized(); g = (Wd - E).normalized()
        pf = (f - a * f.dot(a)); pg = (g - a * g.dot(a))
        if pf.length > 1e-4 and pg.length > 1e-4:
            ang = pf.normalized().angle(pg.normalized()); sgn = 1 if pf.cross(pg).dot(a) > 0 else -1
            self._turn_bone(ua.name, Quaternion(a, sgn * ang))
        self._turn_bone(fa.name, arc(fa.tail - fa.head, Wd - fa.head))
        if palm:   # roll the forearm about itself so the palm faces `palm` (out, fwd, up): pronation and supination
            want = Vector((sx * palm[0], -palm[1], palm[2])).normalized(); ax = (fa.tail - fa.head).normalized(); cur = self.palm_normal(s)
            a1 = cur - ax * cur.dot(ax); a2 = want - ax * want.dot(ax)
            if a1.length > 1e-3 and a2.length > 1e-3:
                ang = a1.normalized().angle(a2.normalized()); sgn = 1 if a1.cross(a2).dot(ax) > 0 else -1
                ang = min(ang, math.radians(120)) * (min(1.0, w) if w > 0 else 0)
                self._turn_bone(fa.name, Quaternion(ax, sgn * ang))

    def local_quats(self):
        """what a glTF animation stores: each bone's rotation in its parent's space (rest and pose together)"""
        out = {}
        for pbone in self.rig.pose.bones:
            b = pbone.bone
            rest_local = (b.parent.matrix_local.inverted() @ b.matrix_local) if b.parent else b.matrix_local
            q = (rest_local.to_3x3() @ pbone.rotation_quaternion.to_matrix()).to_quaternion()
            out[b.name] = [round(x, 5) for x in (q.w, q.x, q.y, q.z)]
        return out

    def pelvis_hips(self):
        """the pelvis bone's location (bone space) in units of this rig's hip height: what a clip stores, body-independent"""
        return [round(x / self.hip, 5) for x in self.rig.pose.bones['pelvis'].location]

    def wear(self, quats, pelvis_up=None, pelvis_hips=None, only=None):
        """dress this rig in rotations recorded on ANOTHER rig (what three.js does when a shared clip plays)"""
        for pbone in self.rig.pose.bones:
            if pbone.name not in quats or (only and pbone.name not in only): continue
            b = pbone.bone
            rest_local = ((b.parent.matrix_local.inverted() @ b.matrix_local) if b.parent else b.matrix_local).to_3x3()
            pbone.rotation_quaternion = (rest_local.inverted() @ Quaternion(quats[pbone.name]).to_matrix()).to_quaternion()
        if only: bpy.context.view_layer.update(); return
        pb = self.rig.pose.bones
        if pelvis_hips is not None:
            pb['pelvis'].location = Vector(pelvis_hips) * self.hip; bpy.context.view_layer.update(); return
        pb['pelvis'].location = (0, 0, 0)
        bpy.context.view_layer.update()
        low = self.lowest()
        pb['pelvis'].location = self.rest['pelvis'].inverted() @ Vector((0, 0, -low if pelvis_up is None else pelvis_up))
        bpy.context.view_layer.update()


def mirror(p):
    """the same pose, left for right"""
    if isinstance(p, list): return [mirror(x) for x in p]
    out = {}
    for k, v in p.items():
        k2 = k[:-1] + {'l': 'r', 'r': 'l'}[k[-1]] if k.endswith(('_l', '_r')) else k
        if k == 'turn': out[k] = -v
        elif k == 'ik': out[k] = {{'l': 'r', 'r': 'l'}[s]: dict(spec, to=_mirror_to(spec['to'])) for s, spec in v.items()}
        elif isinstance(v, dict) and k in ('pelvis', 'spine', 'neck', 'head'):
            out[k2] = {kk: (-vv if kk in ('yaw', 'roll', 'dx') else vv) for kk, vv in v.items()}
        else: out[k2] = v
    return out

def _mirror_to(to):
    if isinstance(to, tuple) and len(to) == 3 and isinstance(to[0], str):
        who, bone, off = to; b2 = bone[:-1] + {'l': 'r', 'r': 'l'}[bone[-1]] if bone.endswith(('_l', '_r')) else bone
        return (who, b2, (-off[0], off[1], off[2]))
    return to

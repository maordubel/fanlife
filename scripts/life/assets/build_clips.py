#!/usr/bin/env python3
"""
LIFE character assets: the animation clips, on the cast's shared skeleton.

  python3 build_clips.py <work dir>

Builds reference bodies (an adult with the father's proportions, a second adult, a child with the boy's), plays every
scene in motion.SCENES on their MPFB game_engine rigs at 30 fps (people in a scene see each other: a hand is put on
the other body by IK), and exports one GLB that holds the skeleton and all the clips (no mesh). Walk, run and carry
are the repository's own captured strides (public/life/town/mocap.json: CMU Graphics Lab Motion Capture Database,
free to use and redistribute, credit requested); every other clip is keyframed here.
Also writes clips.json: per clip its timing, foot contacts and pair placement, stills, and 8-frame strips for the previews.
"""
import json, math, sys
from pathlib import Path
import bpy
from mathutils import Vector, Quaternion
sys.path.insert(0, str(Path(__file__).resolve().parent))
import lifekit as K
import motion as M

WORK = Path(sys.argv[1]); (WORK / 'raw').mkdir(parents=True, exist_ok=True)
S = K.mpfb(); K.wipe()
spec = json.loads((K.HERE / 'cast.json').read_text()); cast = {c['id']: c for c in spec['cast']}


def body(cid, name):
    hi = S.HumanService._create_default_human_info_dict(); ph = dict(cast[cid]['pheno']); race = ph.pop('race'); hi['phenotype'].update(ph)
    hi['phenotype']['race'] = {'african': race[0], 'caucasian': race[1], 'asian': race[2]}; hi['rig'] = 'game_engine'
    st = S.HumanService.get_default_deserialization_settings(); st['subdiv_levels'] = 0
    bm = S.HumanService.deserialize_from_dict(hi, st); rig = bm.parent
    rig.name = name; bm.name = name + '_body'
    bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
    for s_ in 'lr':   # the same two eye bones the cast carries (placed roughly; clips never move them)
        eb = rig.data.edit_bones.new('eye_' + s_); h = rig.data.edit_bones['head']; eb.head = h.head + (h.tail - h.head) * 0.4; eb.tail = eb.head + (h.tail - h.head).length * 0.2 * K.FWD; eb.parent = h
    bpy.ops.object.mode_set(mode='OBJECT')
    return rig, bm


RIGS = {}; BODIES = {}
for who, cid in (('E', 'father'), ('A', 'father'), ('A2', 'father'), ('C', 'boy')):
    r, bm = body(cid, {'E': 'life_skeleton', 'A': 'ref_adult', 'A2': 'ref_adult_2', 'C': 'ref_child'}[who]); RIGS[who] = r; BODIES[who] = bm
P = {w: K.Poser(r) for w, r in RIGS.items()}
E = RIGS['E']; BODIES['E'].hide_render = True
bpy.data.objects.remove(BODIES.pop('E'), do_unlink=True)


def bone_point(rig, spec):
    name, _, frac = spec.partition('@'); pb = rig.pose.bones[name]
    return pb.head.lerp(pb.tail, float(frac)) if frac else pb.head.copy()


def resolver(subject):
    def res(to):
        if to[0] == 'blend': return res(to[1]).lerp(res(to[2]), to[3])
        who, bone, off = to
        if who == 'world':
            return Vector((off[0], -off[1], off[2]))
        rig = RIGS[subject] if who == 'self' else RIGS[who]
        pt = rig.matrix_world @ bone_point(rig, bone) + rig.matrix_world.to_3x3() @ Vector((off[0], -off[1], off[2]))
        return RIGS[subject].matrix_world.inverted() @ pt
    return res


def place(who, at):
    rig = RIGS[who]
    if at is None or at[0] != 'attach':
        x, f, yaw = at or (0, 0, 0)
        rig.location = (x, -f, 0); rig.rotation_euler = (0, 0, math.radians(yaw))
    else:
        _, host, bone, off = at; h = RIGS[host]
        target = h.matrix_world @ h.pose.bones[bone].head + h.matrix_world.to_3x3() @ Vector((off[0], -off[1], off[2]))
        bpy.context.view_layer.update()
        cur = rig.matrix_world @ rig.pose.bones['pelvis'].head
        rig.location = rig.location + (target - cur)
    bpy.context.view_layer.update()


def pose_scene(sc, t):
    """pose every person in the scene at time t; returns the poses"""
    people = sc['people']; order = sc.get('order') or [w for w in people]
    poses = {w: fn(t) for w, (fn, at) in people.items()}
    for w in people: RIGS[w].hide_render = False
    for tok in order:
        if tok.startswith('ik'):
            w = tok[2:]; P[w].apply_ik(poses[w], resolver(w)); continue
        w = tok; fn, at = people[w]
        if at is not None and at[0] == 'attach':
            RIGS[w].location = (0, 0, 0); bpy.context.view_layer.update()
        else: place(w, at)
        P[w].apply(poses[w], resolve=False if sc.get('order') else resolver(w))
        if at is not None and at[0] == 'attach': place(w, at)
    for w, p in poses.items():   # how far each IK wrist ended from its target
        for sd, ik in (p.get('ik') or {}).items():
            if ik and ik.get('w', 1) >= 0.99:
                miss = (RIGS[w].pose.bones['hand_' + sd].head - resolver(w)(ik['to'])).length
                MISS[(sc['export'].get(w, w), sd)] = max(MISS.get((sc['export'].get(w, w), sd), 0), miss)
    return poses
MISS = {}


def heel(w):
    rig = RIGS[w]; pb = rig.pose.bones
    return {s: rig.matrix_world.inverted() @ (rig.matrix_world @ pb['foot_' + s].head) for s in 'lr'}


# ---- 1. the walk and the run start on a left heel strike: find the phase where the left foot is furthest forward
for clip, run in (('walk', False), ('run', True)):
    M.PHASE.clear() if False else None
    best = None
    for i in range(96):
        ph = i / 96; P['A'].apply(M.walk_pose(clip, ph, run=run, key='__probe'))
        fwd = -RIGS['A'].pose.bones['foot_l'].head.y
        if best is None or fwd > best[0]: best = (fwd, ph)
    M.PHASE[clip] = best[1]
    print(f'{clip}: left heel strike at mocap phase {best[1]:.3f}', flush=True)
for key in ('walk_child', 'hold_hand_walk_adult', 'hold_hand_walk_child'): M.PHASE[key] = M.PHASE['walk']


# ---- 2. every scene
sc_ = bpy.context.scene; sc_.render.fps = M.FPS
E.animation_data_create(); meta = {}; stills = {}; strips = {}
FINGER = [b.name for b in E.data.bones if b.name.split('_')[0] in ('thumb', 'index', 'middle', 'ring', 'pinky')]

for sname, sc in M.SCENES.items():
    secs, loops = sc['secs'], sc['loop']; n = max(2, round(secs * M.FPS))
    rec = {w: [] for w in sc['export']}; feet = {w: [] for w in sc['export']}
    strip_at = set(round(i * n / (8 if loops else 7)) for i in range(8)) if sname in M.STRIPS else set()
    strip = []
    for w in RIGS: RIGS[w].location = (0, 0, 0); RIGS[w].rotation_euler = (0, 0, 0)
    for f in range(n + 1):
        t = secs * f / n if not (loops and f == n) else 0.0
        pose_scene(sc, t)
        for w in sc['export']:
            rec[w].append((P[w].local_quats(), P[w].pelvis_hips())); feet[w].append(heel(w))
        if f in strip_at:
            strip.append({w: {'q': P[w].local_quats(), 'pelvis': P[w].pelvis_hips(), 'loc': list(RIGS[w].location), 'yaw': RIGS[w].rotation_euler.z} for w in sc['people']})
    if strip: strips[sname] = {'people': {w: ('child' if w == 'C' else 'adult') for w in sc['people']}, 'frames': strip, 'export': sc['export']}
    # stills
    for w, name in sc['export'].items():
        k = round(M.STILL_AT.get(name, 0.0) / secs * n) if secs else 0
        stills[name] = {'q': rec[w][min(k, n)][0], 'pelvis': rec[w][min(k, n)][1], 'child': w == 'C'}
    # write each exported person's motion onto the export skeleton
    for w, name in sc['export'].items():
        act = bpy.data.actions.new(name); E.animation_data.action = act; last = {}
        for f, (q, ph) in enumerate(rec[w]):
            P['E'].wear(q, pelvis_hips=ph)
            for pb in E.pose.bones:
                if pb.name.startswith('eye_'): continue
                qq = pb.rotation_quaternion.copy()
                if pb.name in last and last[pb.name].dot(qq) < 0: qq.negate(); pb.rotation_quaternion = qq
                last[pb.name] = qq; pb.keyframe_insert('rotation_quaternion', frame=f)
            E.pose.bones['pelvis'].keyframe_insert('location', frame=f)
        tr = E.animation_data.nla_tracks.new(); tr.name = name; tr.strips.new(name, 0, act); E.animation_data.action = None
        m = {'seconds': round(secs, 3), 'frames': n + 1, 'loop': loops, 'what': sc['what'], 'body': 'child' if w == 'C' else 'adult'}
        if sc.get('hands_only'): m['tracks'] = 'fingers'
        if sc.get('events'): m['events'] = {k: round(v * M.FPS) for k, v in sc['events'].items()}
        if sc.get('gait'):
            fw = {s: [-ft[s].y for ft in feet[w]] for s in 'lr'}; up = {s: [ft[s].z for ft in feet[w]] for s in 'lr'}
            N = n if loops else n + 1
            contacts, stance = {}, {}
            for s in 'lr':
                v = fw[s][:N]
                strikes = [i for i in range(N) if v[i] >= v[(i - 1) % N] and v[i] > v[(i + 1) % N]]
                offs = [i for i in range(N) if v[i] <= v[(i - 1) % N] and v[i] < v[(i + 1) % N]]
                contacts[s] = strikes; stance[s] = [[a, min((o for o in offs if o > a), default=(min(offs) + N if offs else a))] for a in strikes]
            st = stance['l'][0] if stance['l'] else None
            speed = (max(fw['l'][:N]) - min(fw['l'][:N])) / ((st[1] - st[0]) / M.FPS) if st and st[1] > st[0] else None
            m.update(contacts=contacts, stance=stance, speed=round(speed, 3) if speed else None)
        if len(sc['people']) > 1:
            m['pair'] = {ww: {'clip': sc['export'].get(ww), 'at': sc['people'][ww][1]} for ww in sc['people'] if ww != w}
        meta[name] = m
        print(f'clip {name}: {secs:.2f}s {"loop" if loops else "once"}' + (f' contacts {m["contacts"]} speed {m.get("speed")}' if 'contacts' in m else ''), flush=True)

for pb in E.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
bpy.ops.object.select_all(action='DESELECT'); E.select_set(True); bpy.context.view_layer.objects.active = E
bpy.ops.export_scene.gltf(filepath=str(WORK / 'raw' / 'clips.glb'), export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='NLA_TRACKS',
                          export_force_sampling=True, export_frame_range=False, export_yup=True, export_skins=True, export_def_bones=False, export_optimize_animation_size=True)
(WORK / 'clips.json').write_text(json.dumps({'clips': meta, 'stills': stills, 'strips': strips, 'hipHeight': round(P['E'].hip, 4), 'childHipHeight': round(P['C'].hip, 4),
                                             'bones': [b.name for b in E.data.bones], 'fingerBones': FINGER}))
if '--blend' in sys.argv: bpy.ops.wm.save_as_mainfile(filepath=str(WORK / 'clips-scene.blend'))
print('clips', list(meta))
for k, v in sorted(MISS.items()):
    if v > 0.01: print(f'IK miss {k}: {v * 100:.1f} cm')

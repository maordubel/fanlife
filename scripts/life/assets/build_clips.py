#!/usr/bin/env python3
"""
LIFE character assets: the animation clips, on the cast's shared skeleton.

  python3 build_clips.py <work dir>

Builds a reference adult (the father's proportions, no clothes), plays every clip in lifekit.CLIPS on its MPFB
game_engine rig at 30 fps and exports one GLB that holds the skeleton and all the clips (no mesh). Walk, run and
carry are the repository's own captured strides (public/life/town/mocap.json: CMU Graphics Lab Motion Capture
Database, free to use and redistribute, credit requested); every other clip is keyframed here by formula.
Also writes clips.json: stills of each clip as parent-space rotations, for the previews.
"""
import json, sys
from pathlib import Path
import bpy
sys.path.insert(0, str(Path(__file__).resolve().parent))
import lifekit as K

WORK = Path(sys.argv[1]); (WORK / 'raw').mkdir(parents=True, exist_ok=True)
S = K.mpfb(); K.wipe()
spec = json.loads((K.HERE / 'cast.json').read_text()); father = next(c for c in spec['cast'] if c['id'] == 'father')
hi = S.HumanService._create_default_human_info_dict(); ph = dict(father['pheno']); race = ph.pop('race'); hi['phenotype'].update(ph)
hi['phenotype']['race'] = {'african': race[0], 'caucasian': race[1], 'asian': race[2]}; hi['rig'] = 'game_engine'
st = S.HumanService.get_default_deserialization_settings(); st['subdiv_levels'] = 0
bm = S.HumanService.deserialize_from_dict(hi, st); rig = bm.parent
bpy.data.objects.remove(bm, do_unlink=True)
rig.name = 'life_skeleton'; P = K.Poser(rig)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
for s_ in 'lr':   # the same two eye bones the cast carries (placed roughly; clips never move them)
    eb = rig.data.edit_bones.new('eye_' + s_); h = rig.data.edit_bones['head']; eb.head = h.head + (h.tail - h.head) * 0.4; eb.tail = eb.head + (h.tail - h.head).length * 0.2 * K.FWD; eb.parent = h
bpy.ops.object.mode_set(mode='OBJECT')
sc = bpy.context.scene; sc.render.fps = K.FPS
rig.animation_data_create(); meta = {}; stills = {}
STILL_AT = {'idle': 1.0, 'walk': 0.28, 'run': 0.2, 'carry': 0.3, 'turn': 0.5, 'talk_1': 0.3, 'talk_2': 0.5, 'talk_3': 2.2, 'wave': 0.2, 'cheer': 0.15, 'sit': 3.0, 'crouch_to_child': 3.0, 'hand_on_shoulder': 3.0, 'hug': 3.0}
for name, (secs, loops, fn, what) in K.CLIPS.items():
    n = max(2, round(secs * K.FPS)); act = bpy.data.actions.new(name); rig.animation_data.action = act; last = {}
    for f in range(n + 1):
        t = secs * f / n; P.apply(fn(t if not (loops and f == n) else 0.0))
        for pb in rig.pose.bones:
            if pb.name.startswith('eye_'): continue
            q = pb.rotation_quaternion.copy()
            if pb.name in last and last[pb.name].dot(q) < 0: q.negate(); pb.rotation_quaternion = q
            last[pb.name] = q; pb.keyframe_insert('rotation_quaternion', frame=f)
        rig.pose.bones['pelvis'].keyframe_insert('location', frame=f)
    P.apply(fn(STILL_AT.get(name, 0.0))); stills[name] = P.local_quats()
    tr = rig.animation_data.nla_tracks.new(); tr.name = name; tr.strips.new(name, 0, act); rig.animation_data.action = None
    meta[name] = {'seconds': round(secs, 3), 'frames': n + 1, 'loop': loops, 'what': what}
for pb in rig.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True); bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(filepath=str(WORK / 'raw' / 'clips.glb'), export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='NLA_TRACKS',
                          export_force_sampling=True, export_frame_range=False, export_yup=True, export_skins=True, export_def_bones=False, export_optimize_animation_size=True)
(WORK / 'clips.json').write_text(json.dumps({'clips': meta, 'stills': stills, 'hipHeight': round(P.hip, 4), 'bones': [b.name for b in rig.data.bones]}))
print('clips', list(meta))

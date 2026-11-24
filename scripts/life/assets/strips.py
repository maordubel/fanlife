"""
LIFE character assets: the studio and the motion previews (contact strips, hand close-ups), shared by build_cast.py
(on the real cast, on the runner) and a local check on the bare reference bodies:

  python3 strips.py <work dir> [scene,scene]     # renders <work>/preview/strip-*.jpg on clips-scene.blend
"""
import json, math, os, sys
from pathlib import Path
import bpy
from mathutils import Vector

STRIP_VIEW = {   # scene → camera azimuth (0 = in front of the first adult, 90 = from his left), height of aim
    'hand_on_shoulder': (-25, 1.0), 'put_scarf_on': (70, 0.75), 'ruffle_hair': (25, 0.95), 'hold_hand_walk': (20, 0.85), 'child_on_shoulders': (30, 1.25),
    'kick_ball': (60, 0.6), 'hug_child': (75, 0.95), 'hug_partner': (80, 1.0), 'lean_on_rail': (130, 1.0), 'sit_play_board': (120, 0.8),
    'walk_child': (80, 0.7), 'idle_2': (20, 0.9), 'idle_3': (20, 0.9), 'laugh_body': (60, 0.9), 'step_turn': (30, 0.9)}


def studio(samples=None):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples or int(os.environ.get('LIFE_SAMPLES', '40')); sc.cycles.use_denoising = True
    sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 88; sc.render.film_transparent = False
    for vt in ('AgX', 'Filmic'):
        try: sc.view_settings.view_transform = vt; break
        except Exception: pass
    w = bpy.data.worlds.new('studio'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.86, 0.80, 0.74, 1); bg.inputs[1].default_value = 0.34
    def light(name, typ, loc, energy, size, col=(1, 1, 1)):
        d = bpy.data.lights.new(name, typ); d.energy = energy; d.color = col
        if typ == 'AREA': d.size = size
        o = bpy.data.objects.new(name, d); sc.collection.objects.link(o); o.location = loc
        o.rotation_euler = (Vector((0, 0, 1.2)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); return o
    light('key', 'AREA', (2.6, -2.8, 2.9), 260, 2.2, (1.0, 0.93, 0.84)); light('fill', 'AREA', (-3.0, -2.2, 1.6), 60, 3.5, (0.86, 0.92, 1.0)); light('rim', 'AREA', (-1.5, 3.2, 2.6), 300, 2.0, (1.0, 0.9, 0.8))
    me = bpy.data.meshes.new('floor'); me.from_pydata([(-30, -30, 0), (30, -30, 0), (30, 30, 0), (-30, 30, 0)], [], [(0, 1, 2, 3)])
    fl = bpy.data.objects.new('floor', me); sc.collection.objects.link(fl)
    m = bpy.data.materials.new('floor'); m.use_nodes = True; m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.78, 0.72, 0.66, 1); m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.9; me.materials.append(m)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    return cam


def shoot(cam, target, dist, az, lens, path, size=(768, 768), rise=0.0):
    sc = bpy.context.scene; a = math.radians(az)
    cam.data.lens = lens; cam.location = (target[0] + dist * math.sin(a), target[1] - dist * math.cos(a), target[2] + rise)
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.resolution_x, sc.render.resolution_y = size; sc.render.filepath = str(path); bpy.ops.render.render(write_still=True)


def props(name):
    """simple stand-ins so a strip reads: a rail, a table and board, a ball, a scarf"""
    made = []
    def box(nm, loc, dims, col):
        me = bpy.data.meshes.new(nm); x, y, z = (d / 2 for d in dims)
        v = [(-x, -y, -z), (x, -y, -z), (x, y, -z), (-x, y, -z), (-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z)]
        me.from_pydata(v, [], [(0, 1, 2, 3), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])
        o = bpy.data.objects.new(nm, me); bpy.context.scene.collection.objects.link(o); o.location = loc
        m = bpy.data.materials.new(nm); m.use_nodes = True; m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*col, 1); me.materials.append(m)
        made.append(o); return o
    if name == 'lean_on_rail': box('rail', (0, -0.44, 1.03), (1.6, 0.06, 0.05), (0.3, 0.3, 0.32))
    if name == 'sit_play_board':
        box('table', (0, -0.55, 0.71), (0.9, 0.5, 0.03), (0.45, 0.33, 0.22)); box('board', (0, -0.48, 0.735), (0.32, 0.32, 0.02), (0.85, 0.82, 0.75))
        box('seat', (0, 0.12, 0.23), (0.45, 0.45, 0.46), (0.3, 0.25, 0.2))
    if name == 'kick_ball':
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.105, location=(-0.09, -0.30, 0.105)); o = bpy.context.active_object; made.append(o)
    return made


def wear_frame(rigs, posers, fr):
    for who, d in fr.items():
        if who not in rigs: continue
        r = rigs[who]; r.location = d['loc']; r.rotation_euler = (0, 0, d['yaw'])
        posers[who].wear(d['q'], pelvis_hips=d['pelvis'])
    bpy.context.view_layer.update()


def render_strip(name, data, rigs, posers, cam, out, cell=(360, 480)):
    from PIL import Image, ImageDraw
    saved = {o: o.hide_render for r in rigs.values() for o in [r] + list(r.children_recursive)}
    for w, r in rigs.items():
        if w not in data['people']:
            for o in [r] + list(r.children_recursive): o.hide_render = True
    made = props(name)
    pts = []
    for fr in data['frames']:
        wear_frame(rigs, posers, fr)
        for w in data['people']:
            r = rigs[w]; pts += [r.matrix_world @ pb.head for pb in r.pose.bones] + [r.matrix_world @ pb.tail for pb in r.pose.bones if pb.name == 'head']
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), 0)); hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts) + 0.12))
    az, _ = STRIP_VIEW.get(name, (30, 0.9)); ctr = (lo + hi) / 2; ctr.z = hi.z * 0.5
    size = max(hi.z, 0.9 * max(hi.x - lo.x, hi.y - lo.y)) * 1.15
    dist = size / (2 * math.tan(math.radians(13.5))) * 1.05 + 0.2
    tiles = []
    for i, fr in enumerate(data['frames']):
        wear_frame(rigs, posers, fr)
        p = out.parent / f'_strip_{name}_{i}.jpg'; shoot(cam, tuple(ctr), dist, az, 70, p, cell, rise=0.25); tiles.append(p)
    cols = 4; rows = (len(tiles) + cols - 1) // cols
    W = Image.new('RGB', (cell[0] * cols, (cell[1] + 22) * rows), (24, 24, 24)); d = ImageDraw.Draw(W)
    for i, p in enumerate(tiles):
        x, y = (i % cols) * cell[0], (i // cols) * (cell[1] + 22)
        W.paste(Image.open(p), (x, y + 22)); d.text((x + 8, y + 5), f'{name}  {i + 1}/{len(tiles)}', fill=(230, 230, 230)); os.remove(p)
    W.save(out, quality=86)
    for o in made: bpy.data.objects.remove(o, do_unlink=True)
    for o, h in saved.items(): o.hide_render = h


def hands_closeup(rig, poser, stills, fingers, cam, out, cell=(400, 400)):
    """the five hand shapes on the right hand (worn over idle, finger bones only), front and side"""
    from PIL import Image, ImageDraw
    names = ['hand_relaxed', 'hand_fist', 'hand_point', 'hand_thumb_up', 'hand_palm_down_rest']
    poser.wear(stills['idle']['q'], pelvis_hips=stills['idle']['pelvis'])
    W = Image.new('RGB', (cell[0] * len(names), cell[1] * 2 + 22), (24, 24, 24)); d = ImageDraw.Draw(W)
    for i, n in enumerate(names):
        poser.wear(stills[n]['q'], only=set(fingers))
        h = rig.matrix_world @ rig.pose.bones['middle_01_r'].head
        for j, az in enumerate((-60, -140)):
            p = out.parent / f'_hand_{i}_{j}.jpg'; shoot(cam, tuple(h), 0.42, az, 85, p, cell); W.paste(Image.open(p), (i * cell[0], 22 + j * cell[1])); os.remove(p)
        d.text((i * cell[0] + 8, 5), n, fill=(230, 230, 230))
    W.save(out, quality=88)


if __name__ == '__main__':
    work = Path(sys.argv[1]); only = [x for x in (sys.argv[2] if len(sys.argv) > 2 else '').split(',') if x]
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    bpy.ops.wm.open_mainfile(filepath=str(work / 'clips-scene.blend'))
    import lifekit as K
    data = json.loads((work / 'clips.json').read_text())
    rigs = {'A': bpy.data.objects['ref_adult'], 'A2': bpy.data.objects['ref_adult_2'], 'C': bpy.data.objects['ref_child']}
    for o in list(bpy.data.objects):
        if o.name == 'life_skeleton': bpy.data.objects.remove(o, do_unlink=True)
    posers = {w: K.Poser(r) for w, r in rigs.items()}
    for r in rigs.values():
        if r.animation_data: r.animation_data.action = None
    cam = studio(int(os.environ.get('LIFE_SAMPLES', '10')))
    (work / 'preview').mkdir(exist_ok=True)
    dbg = os.environ.get('LIFE_DEBUG')
    if dbg:   # scene:frame:az,az,az[:aimz:dist] → close views of one frame
        from PIL import Image
        parts = dbg.split(':'); name, fi = parts[0], int(parts[1]); azs = [float(a) for a in parts[2].split(',')]
        aimz = float(parts[3]) if len(parts) > 3 else 1.1; dist = float(parts[4]) if len(parts) > 4 else 2.6
        st = data['strips'][name]; props(name)
        for w, r in rigs.items():
            for o in [r] + list(r.children_recursive): o.hide_render = w not in st['people']
        wear_frame(rigs, posers, st['frames'][fi]); ims = []
        for a in azs:
            p = work / 'preview' / f'_d{a}.jpg'; shoot(cam, (0, -0.25, aimz), dist, a, 50, p, (520, 620)); ims.append(Image.open(p))
        W = Image.new('RGB', (520 * len(ims), 620))
        for i, im in enumerate(ims): W.paste(im, (520 * i, 0))
        W.save(work / 'preview' / f'debug-{name}-{fi}.jpg'); sys.exit(0)
    if 'hands' in only:
        hands_closeup(rigs['A'], posers['A'], data['stills'], data['fingerBones'], cam, work / 'preview' / 'hand-poses.jpg'); sys.exit(0)
    for name, st in data['strips'].items():
        if only and name not in only: continue
        render_strip(name, st, rigs, posers, cam, work / 'preview' / f'strip-{name}.jpg', cell=(420, 560))
        print('strip', name, flush=True)

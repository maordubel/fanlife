"""
Cut the owner's celebration film (12.10.2026, gemini_generated_video_4cdbcc24.mp4) into seven transparent animated WebPs
for the match highlights: goal · hat-trick · fire goal · win · champion · loss · game over.

Each segment of the film sits on ONE flat background (green screen, cyan, blue, black, yellow, charcoal). The key is the
distance from that background, soft between t0 and t1, then a despill toward the neighbouring colours; frames are cropped to
the union box of what is left, cut to 8 fps and capped at 560 px wide. Usage: python3 scripts/legends/cut-celebrations.py <video> <out-dir>
"""
import subprocess, sys, os, tempfile, glob
import numpy as np
from PIL import Image

SEGMENTS = [  # name, first frame, last frame (24 fps, 1-based), soft key band
    ('goal', 1, 34, 70, 150), ('hattrick', 36, 71, 70, 150), ('fire-goal', 73, 108, 60, 140),
    ('win', 110, 142, 22, 90), ('champion', 144, 170, 70, 150), ('loss', 172, 203, 22, 70), ('game-over', 206, 240, 22, 90, 0.80),  # the arcade score strip under it is left out
]

def keyed(im, bg, t0, t1):
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    d = np.sqrt(((a - np.array(bg, np.float32)) ** 2).sum(-1))
    alpha = np.clip((d - t0) / (t1 - t0), 0, 1)
    if bg[1] > bg[0] and bg[1] > bg[2]:  # green-screen despill on the soft edge
        edge = alpha < 1
        a[..., 1] = np.where(edge, np.minimum(a[..., 1], np.maximum(a[..., 0], a[..., 2])), a[..., 1])
    return Image.fromarray(np.dstack([a, alpha * 255]).astype(np.uint8), 'RGBA')

def main(video, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    tmp = tempfile.mkdtemp()
    subprocess.run(['ffmpeg', '-v', 'error', '-i', video, '-vf', 'scale=960:540', f'{tmp}/%03d.png'], check=True)
    frames = sorted(glob.glob(f'{tmp}/*.png'))
    for seg in SEGMENTS:
        name, a, b, t0, t1 = seg[:5]; keep = seg[5] if len(seg) > 5 else 1.0
        pick = frames[a - 1:b:3]
        bg = Image.open(pick[len(pick) // 2]).convert('RGB').getpixel((6, 6))
        cut = [keyed(Image.open(p), bg, t0, t1) for p in pick]
        if keep < 1: cut = [c.crop((0, 0, c.width, int(c.height * keep))) for c in cut]
        box = None
        for c in cut:
            bb = c.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
            if bb: box = bb if not box else (min(box[0], bb[0]), min(box[1], bb[1]), max(box[2], bb[2]), max(box[3], bb[3]))
        box = (max(0, box[0] - 8), max(0, box[1] - 8), min(960, box[2] + 8), min(cut[0].height, box[3] + 8))
        cut = [c.crop(box) for c in cut]
        if cut[0].width > 560:
            s = 560 / cut[0].width; cut = [c.resize((560, round(c.height * s)), Image.LANCZOS) for c in cut]
        cut[0].save(f'{out_dir}/{name}.webp', save_all=True, append_images=cut[1:], duration=125, loop=0, quality=60, method=4, lossless=False)
        cut[len(cut) * 2 // 3].save(f'{out_dir}/{name}-still.webp', quality=78, method=4)
        print(name, len(cut), 'frames', cut[0].size, os.path.getsize(f'{out_dir}/{name}.webp') // 1024, 'KB')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])

"""Football Fairy Tales — 10-second demo: the Hapoel Tel Aviv cold open (phase 0, 11.11.2026).

  python3 -m studio.fairytales.demo_hta <work_dir> <out.mp4>

work_dir holds the Flow plates (town.jpg, medallion.jpg), the narration take (voice.wav) and the fonts.
The crests are the club's own files (public/brand/crests). Shot list:
  0.0–5.0  the 1920s town rises from the book — slow push, the flag flutters, a paper gull on a wire (on twos)
  4.8–5.3  page turn
  5.0–10   the medallion: the 1927 crest printed on the card; on "was wrong" it flips like a coin to 1923, confetti
  8.55–10  FOOTBALL Fairy Tales, cut from card, letter by letter
"""
from __future__ import annotations

import math
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from studio.fairytales import papertheatre as pt

REPO = Path(__file__).resolve().parents[4]
CRESTS = REPO / 'public/brand/crests'
SFX = REPO / 'public/life/sfx'
MUSIC = REPO / 'scripts/football-stories/studio/kit/music/sports-atlasaudio-625740.mp3'
RED, WHITE = (176, 45, 16), (246, 240, 228)
DUR = 10.0


def fitted(path: Path) -> Image.Image:
    return pt.fit(Image.open(path).convert('RGB'))


def flag_rig(town: Image.Image, box_src=(955, 44, 1052, 112), pole_x_src=965):
    """Cut the paper flag out of the plate (and fill the hole) so it can flutter on its pole."""
    s = 1080 / 768
    ox = (round(1376 * s) - 1920) // 2
    x0, y0, x1, y1 = [round(v * s) - (ox if i % 2 == 0 else 0) for i, v in enumerate(box_src)]
    pole = round(pole_x_src * s) - ox
    a = np.asarray(town)
    hsv = cv2.cvtColor(a, cv2.COLOR_RGB2HSV)
    red = (((hsv[..., 0] < 12) | (hsv[..., 0] > 170)) & (hsv[..., 1] > 110) & (hsv[..., 2] > 90)).astype(np.uint8)
    m = np.zeros_like(red)
    m[y0:y1, x0:x1] = red[y0:y1, x0:x1]
    m = cv2.dilate(m, np.ones((5, 5), np.uint8))
    hole = cv2.inpaint(a, m * 255, 9, cv2.INPAINT_TELEA)
    rgba = np.dstack([a, cv2.GaussianBlur(m * 255, (3, 3), 0)])
    flag = rgba[y0 - 20:y1 + 20, pole:x1 + 20]
    return Image.fromarray(hole), Image.fromarray(flag, 'RGBA'), (pole, y0 - 20)


def flutter(flag: Image.Image, t: float) -> Image.Image:
    a = np.asarray(flag)
    h, w = a.shape[:2]
    out = np.zeros_like(a)
    for x in range(w):
        k = x / max(w - 1, 1)
        dy = int(round(5.5 * k * math.sin(7.5 * t - 6.0 * k)))
        col = np.roll(a[:, x], dy, axis=0)
        out[:, x] = col
    sx = 1 - 0.06 * (0.5 + 0.5 * math.sin(7.5 * t))      # the free edge pulls in as it waves
    img = Image.fromarray(out, 'RGBA')
    return img.resize((max(4, int(w * sx)), h), Image.LANCZOS)


def gull(t: float) -> tuple[Image.Image, tuple[int, int]]:
    """A cut-paper gull on a thin wire, drawn here (the series' own prop), crossing the dark top of the room."""
    t = pt.stepped(t)
    g = Image.new('RGBA', (130, 70), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    flap = math.sin(t * 9) * 14
    d.polygon([(10, 30 - flap), (60, 38), (65, 46), (55, 46)], fill=(236, 226, 205, 255))
    d.polygon([(120, 30 - flap), (70, 38), (65, 46), (75, 46)], fill=(226, 214, 190, 255))
    d.ellipse((52, 36, 78, 52), fill=(242, 234, 216, 255))
    d.polygon([(78, 42), (88, 44), (78, 47)], fill=(214, 120, 40, 255))
    x = int(180 + 210 * t)
    y = int(150 + 14 * math.sin(t * 2.6))
    return g, (x, y)


def town_frame(base: Image.Image, flag: Image.Image, at, i: int, n: int) -> Image.Image:
    t = i / pt.FPS
    ts = pt.stepped(t)
    img = base.copy()
    f = flutter(flag, ts)
    img.paste(f, at, f)
    g, (gx, gy) = gull(t)
    d = ImageDraw.Draw(img)
    d.line((gx + 65, 0, gx + 65, gy + 40), fill=(150, 140, 120), width=1)
    sh = g.split()[3].filter(ImageFilter.GaussianBlur(4)).point(lambda v: v * 0.4)
    img.paste((10, 6, 2), (gx + 10, gy + 16), sh)
    img.paste(g, (gx, gy), g)
    p = i / max(n - 1, 1)
    z = 1.0 + 0.085 * pt.ease(p)
    rng = __import__('random').Random(int(ts * 12))
    out = pt.camera(img, z, .6, .44, dx=rng.uniform(-1, 1), dy=rng.uniform(-1, 1))
    warm = 1.0 + 0.012 * math.sin(t * 1.7)                  # the window light breathes a little
    return Image.fromarray(np.clip(np.asarray(out, dtype=np.float32) * warm, 0, 255).astype(np.uint8))


def main() -> None:
    work, out = Path(sys.argv[1]), Path(sys.argv[2])
    town = fitted(work / 'town.jpg')
    med = fitted(work / 'medallion.jpg')
    base, flag, at = flag_rig(town)
    c27 = Image.open(CRESTS / 'circle-1927.png').convert('RGBA')
    c23 = Image.open(CRESTS / 'circle-1923.png').convert('RGBA')
    box = (742, 300, 1138, 742)
    brass = pt.brass_mask(med, (1030, 520, 1545, 975))
    confetti = pt.Confetti((948, 520), [RED, WHITE, pt.KRAFT, RED], n=110)
    fb, fs = work / 'Fraunces-Black-Soft.ttf', work / 'Fraunces-Bold.ttf'
    n_total = int(DUR * pt.FPS)
    n_town = int(5.3 * pt.FPS)

    def plate(t: float) -> Image.Image:
        # the coin flip: 7.95 → 8.35, the face changes at the edge-on moment
        f0, f1 = 7.95, 8.35
        if t < f0:
            art, sx, hop = c27, 1.0, 0
        elif t > f1:
            art, sx, hop = c23, 1.0, 0
        else:
            p = (t - f0) / (f1 - f0)
            art = c27 if p < .5 else c23
            sx, hop = abs(math.cos(math.pi * p)), int(-26 * math.sin(math.pi * p))
        b = (box[0], box[1] + hop, box[2], box[3] + hop)
        img = pt.printed(med, art, b, sx)
        img.paste(med, (0, 0), brass)                            # the magnifying glass stays on top of the print
        return img

    def frames():
        for i in range(n_total):
            t = i / pt.FPS
            if t < 4.8:
                fr = town_frame(base, flag, at, i, n_town)
            else:
                p = 1.0 + 0.07 * pt.ease((t - 4.8) / 5.2)
                cam_b = pt.camera(plate(t), p, .495, .49)
                if t < 5.3:
                    fr = pt.page_turn(town_frame(base, flag, at, i, n_town), cam_b, (t - 4.8) / 0.5)
                else:
                    fr = cam_b
                fr = confetti.draw(fr, t - 8.15)
                fr = pt.wordmark(fr, t - 8.55, fb, fs, accent=RED)
            yield pt.grain(fr, i, 3.0)

    silent = out.with_suffix('.video.mp4')
    pt.encode(frames(), silent)
    mix = out.with_suffix('.mix.wav')
    voice = work / 'voice.wav'
    # narration cut into its three phrases and re-timed to the picture
    fc = (
        f"[0:a]atrim=0.40:6.85,asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st=6.38:d=0.07,adelay=300|300[v1];"
        f"[0:a]atrim=7.66:8.34,asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st=0.6:d=0.08,adelay=7000|7000[v2];"
        f"[0:a]atrim=9.10:9.76,asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st=0.58:d=0.08,adelay=7900|7900[v3];"
        f"[v1][v2][v3]amix=inputs=3:normalize=0,volume=1.6[vo];"
        f"[1:a]atrim=0:{DUR},asetpts=PTS-STARTPTS,volume='if(lt(t,8.45),0.07,0.20)':eval=frame,afade=t=out:st=9.5:d=0.5[mu];"
        f"[2:a]adelay=4800|4800,volume=0.9[s1];"
        f"[3:a]adelay=8050|8050,volume=0.45[s2];"
        f"[4:a]adelay=8600|8600,volume=0.5[s3];"
        f"[vo][mu][s1][s2][s3]amix=inputs=5:normalize=0,alimiter=limit=0.95,atrim=0:{DUR}[a]"
    )
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(voice), '-i', str(MUSIC), '-i', str(SFX / 'page.m4a'),
                    '-i', str(SFX / 'reveal.m4a'), '-i', str(SFX / 'pickup.m4a'), '-filter_complex', fc, '-map', '[a]',
                    '-ar', '48000', '-ac', '2', str(mix)], check=True)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(silent), '-i', str(mix), '-c:v', 'copy',
                    '-af', 'loudnorm=I=-15:TP=-1.5:LRA=9', '-ar', '48000', '-c:a', 'aac',
                    '-b:a', '192k', '-shortest', '-movflags', '+faststart', str(out)], check=True)
    silent.unlink(missing_ok=True)
    mix.unlink(missing_ok=True)


if __name__ == '__main__':
    main()

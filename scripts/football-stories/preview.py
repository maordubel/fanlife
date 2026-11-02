#!/usr/bin/env python3
"""Create a silent, visibly labelled editorial preview; no network/API needed.

Requires Pillow, ffmpeg, ffprobe and DejaVu fonts. This is an animatic for
review, not an automated historical documentary or publication pipeline.
"""
import argparse
import json
import math
import subprocess
import tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[2]
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
W, H, FPS = 1280, 720, 24


def wrap(draw, text, font, limit):
    words = text.split()
    lines, line = [], ''
    for word in words:
        candidate = (line + ' ' + word).strip()
        if draw.textlength(candidate, font=font) > limit and line:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    return lines


def image_for(scene, color, index, count, target):
    img = Image.new('RGB', (W, H), '#eee8dc')
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 30, H), fill=color)
    d.rectangle((30, 0, W, 80), fill='#171917')
    small = ImageFont.truetype(FONT, 24)
    header = ImageFont.truetype(FONT, 72)
    detail_font = ImageFont.truetype(FONT, 32)
    d.text((65, 25), 'FANLIFE: FOOTBALL STORIES', font=small, fill='#f5f1e8')
    d.text((65, 125), scene['label'].upper(), font=small, fill=color)
    y = 200
    for line in wrap(d, scene['headline'].upper(), header, 1085):
        d.text((65, y), line, font=header, fill='#171917', stroke_width=0)
        y += 95
    y += 20
    for line in wrap(d, scene['detail'], detail_font, 1070):
        d.text((68, y), line, font=detail_font, fill='#292b29')
        y += 48
    d.rectangle((65, 570, W-65, 573), fill=color)
    d.text((65, 600), 'SILENT EDITORIAL PREVIEW', font=small, fill='#5a5a57')
    d.text((W-155, 600), f'{index:02} / {count:02}', font=small, fill=color)
    logo_path = ROOT / 'scripts/marketing/kit/assets/brand/fanlife-logo.png'
    if logo_path.is_file():
        logo = Image.open(logo_path).convert('RGBA')
        logo.thumbnail((200, 75))
        img.paste(logo, (W-70-logo.width, 95), logo)
    img.save(target)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('episode', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    episode = json.loads(args.episode.read_text(encoding='utf-8'))
    scenes = episode.get('scenes', [])
    if episode.get('version') != 1 or not isinstance(scenes, list) or not scenes:
        raise ValueError('Expected a version 1 episode with at least one scene')
    if len(scenes) > 30:
        raise ValueError('Maximum 30 scenes per preview')
    color = episode.get('clubColor', '#c51e30')
    if not isinstance(color, str) or len(color) != 7 or color[0] != '#' or any(c not in '0123456789abcdefABCDEF' for c in color[1:]):
        raise ValueError('clubColor must be #RRGGBB')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='fanlife-stories-') as work:
        work = Path(work)
        segments = []
        for i, scene in enumerate(scenes, 1):
            for field in ('label', 'headline', 'detail', 'source'):
                if not isinstance(scene.get(field), str) or not scene[field].strip():
                    raise ValueError(f'Scene {i}: missing {field}')
            duration = scene.get('duration')
            if isinstance(duration, bool) or not isinstance(duration, (int, float)) or not math.isfinite(duration) or not 1 <= duration <= 30:
                raise ValueError(f'Scene {i}: duration must be between 1 and 30 seconds')
            frame = work / f'{i:03}.png'
            segment = work / f'{i:03}.mp4'
            image_for(scene, color, i, len(scenes), frame)
            frames = round(duration * FPS)
            # A slight, deterministic push-in gives the static artwork movement.
            zoom = f"zoompan=z='min(zoom+0.00022,1.09)':d={frames}:s={W}x{H}:fps={FPS},format=yuv420p"
            subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-loop','1','-i',str(frame),'-vf',zoom,'-frames:v',str(frames),'-c:v','libx264','-preset','veryfast','-crf','23','-an',str(segment)], check=True)
            segments.append(segment)
        listing = work / 'segments.txt'
        listing.write_text(''.join(f"file '{p.name}'\n" for p in segments), encoding='utf-8')
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','1','-i',str(listing),'-c','copy','-movflags','+faststart',str(args.output.resolve())], check=True)
    print(f'Created silent editorial preview: {args.output}')


if __name__ == '__main__':
    main()

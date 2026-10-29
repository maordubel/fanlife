"""LIFE cues: chirp's WAVs -> public/life/sfx as the folder already ships them (mono 22.05 kHz, .ogg + .m4a).
Peak-normalised to -3 dBFS like the recorded set; loudness per cue is set where it is played (sound.ts gains).
    python3 scripts/life/audio/encode-cues.py <chirp out dir>
"""
import json, subprocess, sys, wave, contextlib
from pathlib import Path

src = Path(sys.argv[1]) / 'sfx'
dst = Path('public/life/sfx')
LOOP: set = set()
man_path = dst / 'manifest.json'
man = json.loads(man_path.read_text())
for w in sorted(src.glob('*.wav')):
    name = w.stem
    peak = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(w), '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True).stderr
    mx = float([l for l in peak.splitlines() if 'max_volume' in l][0].split(':')[1].split()[0])
    gain = -3.0 - mx
    af = f'volume={gain:.2f}dB,aresample=22050'
    for ext, codec in (('ogg', ['-c:a', 'libvorbis', '-q:a', '3']), ('m4a', ['-c:a', 'aac', '-b:a', '64k'])):
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(w), '-af', af, '-ac', '1', *codec, str(dst / f'{name}.{ext}')], check=True)
    with contextlib.closing(wave.open(str(w))) as wf:
        secs = round(wf.getnframes() / wf.getframerate(), 2)
    man[name] = {'seconds': secs, 'loop': name in LOOP, 'tags': ['synth', 'chirp'], 'source': 'chirp-2026-10-29', 'note': 'synthesised from scripts/life/audio/life-cues.cx.js'}
    print(f'{name}: {secs}s, +{gain:.1f} dB')
man_path.write_text(json.dumps(man, ensure_ascii=False, indent=1) + '\n')

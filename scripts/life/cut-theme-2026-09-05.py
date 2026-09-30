#!/usr/bin/env python3
"""
המנגינה מתחת לכל השאר — eighteen seconds of a song, made into a loop you stop hearing.

    python3 scripts/life/cut-theme-2026-09-05.py

Maor sent "ימים טובים" (Leah Katamin, with the מקהלת טוב שוער choir) and named the bar
himself: 1:30 to 1:48, quiet, under everything, "במקום רעש הצעדים הלא נעים שיש עכשיו".

Three things have to be true of a bed that plays for an hour:
  · **it has to join itself.** The last second is crossfaded over the first, so the seam
    is inside a held note rather than at a bar line — a loop you can hear looping is worse
    than no loop.
  · **it has to sit underneath.** Peaks are pulled to −26 dBFS and the top is rolled off
    above 6 kHz, so it never competes with a line of dialogue or a crowd.
  · **it has to be two formats.** Safari wants m4a, everything else takes ogg — the same
    pair every other file in `public/life/sfx` ships as.
"""
import os
import subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
OUT = os.path.join(ROOT, 'public/life/sfx')
SRC = os.environ.get(
    'WORKER_THEME',
    '/root/.claude/uploads/1031bb6e-b609-5caf-8b3a-4b2f7101c0c4/'
    '6972072b-___________________________________Leah_Katamin.mp3',
)

START = 90.0        # 1:30, his mark
LENGTH = 18.0       # to 1:48
FADE = 2.2          # how much of the tail is folded back over the head


def main():
    if not os.path.exists(SRC):
        raise SystemExit(f'no song at {SRC}')
    os.makedirs(OUT, exist_ok=True)
    raw = '/tmp/theme-raw.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(START), '-t', str(LENGTH), '-i', SRC,
                    '-ac', '2', '-ar', '44100', raw, '-y'], check=True)

    # The join, in three passes rather than one filter graph.
    #
    # Doing it as a single `asplit … amix` looks tidier and silently produces a 23-
    # millisecond file: `amix` reaches EOF on the branch that has not started yet, and
    # ffmpeg reports success. Two temporary files and one mix cannot do that.
    body = LENGTH - FADE
    head, tail = '/tmp/theme-head.wav', '/tmp/theme-tail.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-i', raw, '-af',
                    f'atrim=0:{body},asetpts=N/SR/TB,afade=t=in:st=0:d={FADE}', head, '-y'], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-i', raw, '-af',
                    f'atrim={body}:{LENGTH},asetpts=N/SR/TB,afade=t=out:st=0:d={FADE}', tail, '-y'], check=True)

    looped = '/tmp/theme-loop.wav'
    subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', head, '-i', tail, '-filter_complex',
         # the tail is folded back over the head, so the seam sits inside a held note
         '[0:a][1:a]amix=inputs=2:duration=longest:normalize=0,'
         # under everything: quiet, and no top end to fight a voice. loudnorm's true-peak
         # floor is −9 dBFS, nowhere near quiet enough for a bed, so the level is by hand:
         # the source peaks at 0 dBFS and averages −11, and −14 dB lands the average near
         # −25 before the runtime plays it at a third of that again.
         'lowpass=f=6000,highpass=f=90,volume=-14dB,'
         'aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=stereo',
         looped, '-y'],
        check=True,
    )

    for ext, args in (
        ('ogg', ['-c:a', 'libvorbis', '-q:a', '3']),
        ('m4a', ['-c:a', 'aac', '-b:a', '96k']),
    ):
        path = os.path.join(OUT, f'amb-theme.{ext}')
        subprocess.run(['ffmpeg', '-v', 'error', '-i', looped, *args, path, '-y'], check=True)
        print(f'  amb-theme.{ext:4s} {os.path.getsize(path) / 1024:5.0f}KB  {body:.1f}s')
    print('לופ של', f'{body:.1f}', 'שניות, מ־1:30, בקושי נשמע — וזה הרעיון')


if __name__ == '__main__':
    main()

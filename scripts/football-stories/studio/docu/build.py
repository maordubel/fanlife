"""DOCU — the studio's documentary look (owner, 9.11.2026: "this is the direction, and from now on it is the graphic minimum").

VOX + HyperFrames + animation + storyline + documentary. A film is a STORYBOARD: an ordered list of beats, each one narrated
line and the shot under it. This module turns a storyboard into one HyperFrames project (index.html + assets/) that
`hyperframes render` draws frame by frame. Nothing here writes a fact: every word on screen is the storyboard's, and the
storyboard is written from the job's ledger (scores, dates, scorers only where the brief or archive names them).

The vocabulary (each shot kind is a device of the approved sample, PT v Feyenoord 1992):
  score     the big scoreboard: home/away names, crests, the score, a caption line  (cold open, full time)
  stamp     WON / OUT style stamps over the current picture
  question  one big line, words in the club colours
  ticket    a chapter card on paper: PART ONE · ROTTERDAM
  video     an owner clip full frame, paper border, lower third
  image     an owner illustration, push / pull / pan, optional name tag (goal, scorer, timing word)
  lead      a full-width banner in the club colour (HAPOEL LEAD THE TIE)
  ledger    the two-column table (goals over two legs, away goals), a red circle drawn on one cell
  rule      a rule card typed on paper
  verdict   the split screen: WON THE NIGHT | WENT THROUGH
  end       the channel card
A beat may also move the AGGREGATE tracker (`agg: [us, them]`), dip to the ground colour (`flash` — never white), or cue a sound.

Every picture the owner made is labelled "Illustration · graphic reconstruction" (brief rule: never pass a drawing off as
archive). Colours are the storyboard palette's; the opponent keeps its own (brief rule).
"""
from __future__ import annotations

import html
import re
import json
import shutil
from pathlib import Path

from .. import camera as C

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
FONTS = REPO / 'public' / 'fonts'
SFX = REPO / 'public' / 'life' / 'sfx'
GSAP = HERE.parent / 'hyperframes' / 'node_modules' / 'gsap' / 'dist' / 'gsap.min.js'
W, H = 1920, 1080
FACES = [('Head', 'weekly-head-latin'), ('Head', 'weekly-head-latin-ext'), ('Caps', 'weekly-caps-latin'),
         ('Caps', 'weekly-caps-latin-ext'), ('Ultra', 'ultra-latin-400-normal'), ('Cond', 'oswald-latin-700-normal'),
         ('Cond', 'oswald-latin-ext-700-normal'), ('Mono', 'courier-prime-latin-700-normal'),
         ('Mono', 'courier-prime-latin-ext-700-normal'),
         # the club's own language under the English (docs/rules/studio-club-language.md): Greek, Hebrew, Arabic
         ('Local', 'fira-sans-extra-condensed-greek-900-normal'), ('Local', 'heebo-hebrew-800-normal'), ('Local', 'cairo-arabic-800-normal')]
SOUNDS = {'whistle': 'whistle-1', 'goal': 'crowd-real-goal', 'groan': 'crowd-groan', 'hush': 'crowd-hush',
          'claps': 'crowd-claps', 'murmur': 'crowd-real-murmur', 'swell': 'crowd-swell', 'bed': 'crowd-bed'}
SOUNDS.update({'impact': 'impact-bass-1', 'impact2': 'impact-bass-2', 'whoosh': 'whoosh-cinematic', 'swish': 'whoosh-short',
               'riser': 'riser', 'glitch': 'glitch-2', 'kick': 'ball-kick', 'tick': 'clock-tick', 'stamp': 'stamp',
               'buzzer': 'buzzer', 'page': 'page', 'clang': 'clang', 'final': 'crowd-real-final', 'build': 'crowd-real-build',
               'chant': 'chant-derby', 'flash': 'flash', 'reveal': 'reveal', 'sting': 'stage-sting'})
SFX2 = REPO / '.claude' / 'skills' / 'media-use' / 'audio' / 'assets' / 'sfx'
MUSIC = HERE.parent / 'kit' / 'music'
RECON = 'Illustration · graphic reconstruction'
# ── the editor's vocabulary (docu/editor.py decides; this draws) ─────────────────────────────────────────────────────
# A sub-shot's framing of the same picture: wide → detail → reverse, so a long line is three looks at one scene and
# never one still (owner, 12.11.2026: no slideshow). (from, to, default origin); all linear — a framing glides, it never lands.
FRAMINGS = {'wide': ('{scale:1.02}', '{scale:1.1}', '50% 50%'),
            'detail': ('{scale:1.5}', '{scale:1.62}', '34% 40%'),
            'reverse': ('{scale:1.24,x:70}', '{scale:1.24,x:-70}', '50% 58%'),
            'turn': ('{scale:1.08}', '{scale:1.42}', '50% 46%')}   # the last look of a chapter: the push that leaves a question
# Transitions into a beat (`in`). None goes to white and none shakes (rule 142): each is ONE move in ONE direction.
# The seconds are how long the outgoing beat stays on screen under the incoming one (0 = the cut needs no overlap).
# The colour treatment of a picture, from the score sheet (docu/editor.GRADE): a CSS filter on the picture's planes and,
# for joy, the club's colour blooming up from the foot of the frame. All inside the brand; the bloom RISES over
# BLOOM_S (the gate calls a flash a 28-level jump inside two frames — this is under one level a frame). No flashing.
GRADES = {'cold': 'filter:saturate(.62) brightness(.9) contrast(1.06) hue-rotate(-8deg);', 'grey': 'filter:saturate(.38) brightness(.92);',
          'cool': 'filter:saturate(.82) contrast(1.05);', 'warm': 'filter:saturate(1.12) contrast(1.03);', 'bloom': 'filter:saturate(1.18) contrast(1.04);'}
BLOOM_S, BLOOM_TO = 1.4, 0.3
# The framing a camera move starts from (studio/camera.py): (the framing's own scale, its default origin). The move adds
# its travel to this — a detail look is a dolly or a rack AT 1.42, never the old constant glide.
FRAME_BASE = {'wide': (1.0, '50% 50%'), 'detail': (1.42, '34% 40%'), 'reverse': (1.16, '50% 58%'), 'turn': (1.04, '50% 46%')}
TAILS = {'cut': 0.0, 'fade': 0.0, 'match': 0.0, 'whip': 0.3, 'tear': 0.45, 'dive': 0.4, 'slide': 0.35, 'zoom': 0.3}
TAILS['shape'] = 0.55
# ONE SHAPE PER FILM (docs/rules/editing-language.md rule 4): the film's own shape, taken from its story, opens every
# chapter as a window that grows over the frame. Drawn on a 100×100 box, black = the window.
SHAPES = {
    'shamrock': '<circle cx="50" cy="27" r="19"/><circle cx="29" cy="52" r="19"/><circle cx="71" cy="52" r="19"/>'
                '<circle cx="50" cy="46" r="14"/><path d="M46 58 Q48 80 40 96 L48 96 Q56 80 54 58 Z"/>',
    'ticket': '<path d="M8 22 H92 V40 A10 10 0 0 0 92 60 V78 H8 V60 A10 10 0 0 0 8 40 Z"/>',
    'tab': '<path d="M6 30 H40 L48 20 H94 V86 H6 Z"/>',
    'stripe': '<path d="M0 34 H100 V66 H0 Z"/>',
    'star': '<path d="M50 6 L61 38 H95 L67 58 L78 92 L50 71 L22 92 L33 58 L5 38 H39 Z"/>',
    'ball': '<circle cx="50" cy="50" r="44"/>',
    # AEK's double-headed eagle, traced from the club's crest (public/crests/aek-athens.png) with potrace
    'eagle': '<path fill-rule="evenodd" d="M52.3 90.5 C51.1 89.5 50.8 89.4 50.0 90.0 C49.2 90.6 48.5 90.4 48.3 89.6 C48.1 88.9 47.8 88.8 47.2 89.2 C46.5 89.7 45.6 89.4 45.6 88.7 C45.6 87.9 44.6 87.6 43.8 88.2 C42.8 89.0 42.0 88.6 42.0 87.3 C42.0 86.3 41.7 86.0 41.1 86.5 C40.9 86.6 40.5 86.8 40.3 86.9 C40.0 87.0 39.5 87.2 39.3 87.4 C38.7 87.8 38.1 87.8 37.7 87.3 C37.4 86.9 37.6 86.5 38.3 85.7 C39.4 84.5 39.5 84.3 39.1 83.7 C38.7 83.2 38.2 83.3 37.2 84.2 C36.2 85.0 36.0 85.1 35.3 85.1 C34.0 85.1 34.0 84.6 35.4 83.2 C36.4 82.3 36.5 82.1 36.7 81.6 C36.8 81.2 36.9 80.9 37.5 80.3 C38.1 79.7 38.3 79.4 38.4 78.9 C38.5 78.5 38.7 78.2 39.3 77.6 C39.9 77.0 40.1 76.7 40.2 76.3 C40.3 76.0 40.5 75.6 40.7 75.3 C40.8 75.1 41.0 74.7 41.1 74.5 C41.2 74.2 41.4 73.8 41.6 73.5 C41.9 73.1 42.0 73.0 42.0 72.2 C42.1 71.5 42.1 71.3 42.5 70.9 C42.8 70.4 42.9 70.2 42.9 69.7 C42.9 68.4 42.6 68.2 40.9 68.2 C39.9 68.3 39.8 68.3 39.3 68.7 L38.8 69.1 L36.7 69.1 C35.5 69.1 34.5 69.2 34.4 69.3 C34.1 69.4 34.0 69.9 34.0 71.4 C34.0 73.3 33.9 73.5 32.6 73.5 C31.1 73.6 31.0 73.6 29.6 72.3 C28.3 71.0 28.1 70.9 27.3 70.9 C26.4 70.9 25.4 70.1 25.1 69.1 C25.0 68.8 24.8 68.4 24.6 68.2 C24.3 67.7 24.3 67.7 24.3 66.4 L24.3 65.2 L24.7 64.6 C25.6 63.4 25.0 61.7 23.9 62.2 C23.2 62.4 22.6 63.1 22.5 63.7 C22.4 64.1 22.1 64.5 21.6 65.1 C20.6 66.2 20.4 66.3 19.8 66.0 C19.2 65.7 19.2 65.7 18.7 66.1 C18.3 66.5 18.1 66.9 18.0 67.4 C17.8 68.3 16.9 69.0 16.5 68.7 C16.2 68.5 16.2 68.4 16.2 66.4 C16.2 64.5 16.1 64.3 16.0 64.2 C15.7 64.0 15.4 64.2 15.3 64.8 C15.2 65.0 15.0 65.4 14.9 65.6 C14.7 65.8 14.5 66.2 14.4 66.4 C14.3 66.8 14.1 67.2 13.1 68.2 C11.7 69.7 11.5 69.8 11.1 69.6 C10.9 69.4 10.9 69.4 10.9 68.2 C10.9 67.0 10.9 66.9 11.3 66.5 C11.7 66.0 11.7 66.0 11.8 64.7 C11.8 63.4 11.8 63.4 12.2 62.9 C12.6 62.4 12.6 62.4 12.7 61.1 C12.7 59.8 12.7 59.8 13.1 59.4 C13.5 58.9 13.5 58.8 13.6 58.0 C13.6 57.2 13.7 57.1 14.0 56.7 C14.3 56.3 14.4 56.1 14.4 55.4 C14.5 54.6 14.6 54.4 14.9 54.0 C15.5 53.2 15.5 52.2 14.9 51.4 C14.7 51.1 14.5 50.7 14.4 50.4 C14.3 50.0 14.1 49.7 13.5 49.1 C13.0 48.4 12.8 48.2 12.7 47.7 C12.5 47.3 12.4 47.0 11.8 46.4 C11.2 45.8 11.0 45.5 10.9 45.1 C10.8 44.8 10.6 44.4 10.4 44.2 C10.3 44.0 10.1 43.6 10.0 43.3 C9.9 42.9 9.7 42.6 9.1 41.9 C8.5 41.3 8.3 41.0 8.2 40.6 C8.1 40.2 7.9 39.9 7.3 39.3 C6.8 38.7 6.5 38.4 6.4 38.0 C6.4 37.7 6.2 37.3 6.0 37.1 C5.8 36.9 5.6 36.5 5.6 36.2 C5.5 35.9 5.3 35.5 5.1 35.3 C4.9 35.1 4.7 34.7 4.7 34.5 C4.6 34.1 4.5 33.8 4.1 33.4 C3.7 32.9 3.7 32.4 4.0 32.2 C4.4 31.9 4.5 32.0 6.9 34.4 C8.8 36.4 9.0 36.7 9.1 37.2 C9.2 37.6 9.4 37.9 10.5 38.9 C11.5 40.0 11.7 40.2 11.8 40.7 C11.9 41.2 12.1 41.4 13.1 42.5 C14.2 43.6 14.3 43.8 14.5 44.3 C14.6 44.8 14.7 45.0 15.5 45.7 C17.1 47.3 17.9 47.2 18.0 45.4 C18.1 44.8 18.1 44.6 18.4 44.2 C18.8 43.8 18.8 43.7 18.9 42.9 C19.0 42.1 19.0 42.0 19.3 41.6 C19.7 41.1 19.7 41.0 19.8 40.2 C19.8 39.5 19.9 39.3 20.2 38.9 C20.4 38.7 20.6 38.3 20.7 38.0 C20.7 37.7 21.0 37.3 21.1 37.1 C21.5 36.7 21.5 36.5 21.6 35.8 C21.6 35.0 21.7 34.9 22.0 34.5 C22.2 34.3 22.4 33.8 22.4 33.6 C22.5 33.3 22.7 32.9 22.9 32.7 C23.1 32.5 23.3 32.1 23.3 31.8 C23.4 31.5 23.6 31.1 23.8 30.9 C24.0 30.7 24.2 30.3 24.2 30.0 C24.3 29.7 24.5 29.3 24.7 29.1 C24.8 28.9 25.0 28.5 25.1 28.2 C25.3 27.5 27.0 25.8 27.8 25.6 C28.0 25.5 28.5 25.3 28.8 25.0 C29.6 24.5 30.6 24.5 31.3 25.1 C31.5 25.3 31.9 25.5 32.2 25.6 C33.0 25.8 35.6 28.4 35.8 29.2 C36.0 29.9 37.6 31.6 38.4 31.8 C38.7 31.9 39.0 32.0 39.2 32.2 C39.7 32.5 39.8 32.5 40.4 32.2 C40.6 32.0 41.0 31.8 41.4 31.8 C42.5 31.7 42.7 31.6 42.9 30.9 C43.0 30.6 43.2 30.2 43.4 29.9 C43.9 29.3 43.9 28.9 43.4 28.3 C43.2 28.0 43.0 27.6 42.9 27.3 C42.6 26.1 41.9 25.6 40.3 25.6 C39.1 25.5 39.0 25.5 38.5 25.1 C38.1 24.8 37.8 24.7 37.3 24.7 C36.3 24.6 36.3 24.6 34.9 23.3 C33.5 22.0 33.3 21.9 32.3 22.0 C32.0 22.1 31.7 22.2 31.3 22.4 C30.0 23.3 29.0 22.3 30.0 21.2 C30.2 20.9 30.4 20.6 30.4 20.5 C30.6 19.6 30.7 19.5 31.6 19.3 C32.0 19.2 32.9 18.3 32.9 18.0 C32.9 17.9 32.7 17.6 32.5 17.3 C32.0 16.6 32.1 15.7 32.7 14.8 C33.1 14.3 33.1 14.1 33.1 13.6 C33.1 12.7 33.3 12.4 34.0 12.2 C34.3 12.1 34.7 11.9 34.9 11.8 C35.2 11.6 35.6 11.4 35.9 11.3 C36.5 11.2 36.7 10.9 36.7 10.0 C36.7 9.2 37.0 8.7 37.6 8.7 C38.1 8.7 38.4 9.2 38.4 10.0 C38.4 11.1 38.6 11.2 39.7 11.3 C40.7 11.4 40.7 11.4 41.9 12.6 L42.8 13.5 L42.9 14.4 C42.9 15.2 43.0 15.4 43.3 15.7 C43.5 16.0 43.7 16.4 43.8 16.6 C43.9 17.2 44.1 17.4 44.7 17.6 C45.0 17.6 45.4 18.0 46.3 18.8 C47.6 20.0 48.0 20.3 48.5 20.1 C49.2 19.8 49.4 18.5 48.7 17.6 C48.5 17.3 48.3 16.9 48.2 16.6 C48.1 16.2 47.9 15.9 47.3 15.2 L46.5 14.4 L46.5 12.3 C46.4 10.2 46.4 10.2 46.7 10.0 C47.0 9.7 47.2 9.8 49.1 11.8 L50.8 13.6 L50.9 15.8 L50.9 18.0 L51.3 18.4 C51.5 18.7 51.7 19.1 51.8 19.3 C51.9 19.6 52.1 20.0 52.2 20.2 C52.4 20.5 52.6 20.8 52.6 21.0 C52.7 21.6 53.0 21.8 53.4 21.7 C53.8 21.5 54.3 20.8 54.4 20.3 C54.5 20.0 54.7 19.6 54.9 19.3 C55.1 19.1 55.3 18.7 55.3 18.5 C55.4 18.2 55.6 17.8 55.8 17.5 L56.2 17.1 L56.2 14.9 L56.3 12.7 L57.3 11.6 C58.3 10.6 58.4 10.6 58.9 10.6 C59.7 10.6 59.8 10.8 59.8 13.2 L59.7 15.3 L59.0 16.1 C58.0 17.1 58.0 17.1 58.0 18.4 C58.0 19.6 58.1 19.9 58.6 20.1 C59.1 20.3 59.5 20.0 61.2 18.4 C63.2 16.5 63.3 16.3 63.3 15.4 C63.3 14.7 63.4 14.6 63.9 13.8 C64.0 13.7 64.2 13.3 64.2 13.1 C64.3 12.8 64.5 12.5 64.8 12.1 C65.4 11.5 65.6 11.4 66.5 11.3 C67.5 11.2 68.3 10.6 68.6 9.7 C68.9 8.8 69.4 8.8 69.6 9.7 C69.8 10.3 70.7 11.2 71.3 11.3 C71.7 11.4 72.0 11.6 72.9 12.5 L73.9 13.5 L74.0 15.7 C74.1 18.3 74.0 18.0 75.5 19.6 C76.2 20.3 76.6 20.7 76.6 20.9 C76.7 21.1 76.8 21.5 77.0 21.7 C77.3 22.3 77.3 22.6 77.0 22.8 C76.7 23.0 76.5 22.9 75.9 22.5 C75.5 22.2 75.1 22.1 74.8 22.0 C73.8 21.9 73.6 22.0 72.2 23.3 C70.9 24.6 70.8 24.6 69.8 24.7 C69.3 24.7 69.0 24.8 68.6 25.1 C68.1 25.5 68.1 25.5 66.8 25.6 L65.6 25.6 L64.8 26.3 C63.4 27.5 63.3 27.7 63.3 29.1 C63.3 30.7 63.8 31.4 65.1 31.8 C65.4 31.9 65.8 32.1 66.0 32.2 C66.3 32.5 66.5 32.5 67.0 32.2 C67.2 32.0 67.6 31.9 67.9 31.8 C68.3 31.6 68.7 31.3 71.4 28.7 C74.0 26.1 74.5 25.7 74.9 25.6 C75.2 25.5 75.6 25.3 75.9 25.1 C76.5 24.6 76.9 24.6 77.5 25.1 C77.7 25.3 78.2 25.5 78.4 25.6 C79.2 25.8 81.8 28.4 82.0 29.1 C82.1 29.4 82.3 29.8 82.4 30.0 C82.6 30.2 82.8 30.6 82.9 30.9 C83.0 31.2 83.2 31.6 83.3 31.8 C83.5 32.0 83.7 32.4 83.8 32.7 C83.8 32.9 84.0 33.3 84.2 33.6 C84.4 33.8 84.6 34.2 84.7 34.5 C84.7 34.7 85.0 35.1 85.1 35.4 C85.4 35.8 85.5 35.9 85.5 36.7 C85.6 37.4 85.7 37.6 86.0 38.0 C86.3 38.4 86.4 38.6 86.4 39.3 C86.5 40.1 86.5 40.3 86.9 40.6 C87.0 40.9 87.3 41.3 87.3 41.6 C87.4 41.8 87.6 42.3 87.8 42.5 C88.1 42.9 88.2 43.0 88.2 43.8 C88.3 44.6 88.3 44.7 88.7 45.1 C89.0 45.5 89.0 45.7 89.1 46.5 C89.2 47.2 89.2 47.4 89.5 47.8 C89.9 48.2 89.9 48.4 90.0 49.1 C90.1 49.9 90.1 50.0 90.4 50.5 C90.8 50.9 90.8 51.0 90.9 51.8 C90.9 52.6 91.0 52.7 91.3 53.1 C91.7 53.5 91.7 53.7 91.8 54.5 C91.8 55.2 91.9 55.4 92.2 55.8 C92.6 56.2 92.6 56.4 92.7 57.1 C92.7 57.9 92.8 58.0 93.1 58.5 C93.4 58.9 93.5 59.0 93.5 59.8 C93.6 60.6 93.7 60.7 94.0 61.1 C94.3 61.5 94.4 61.7 94.4 62.5 C94.5 63.2 94.5 63.4 94.9 63.8 C95.3 64.3 95.3 64.3 95.3 65.6 C95.4 66.9 95.4 66.9 95.8 67.4 C96.2 67.8 96.2 67.8 96.2 69.1 C96.2 70.2 96.2 70.3 96.0 70.5 C95.6 70.7 95.3 70.5 94.4 69.5 C93.9 68.9 93.6 68.6 93.5 68.2 C93.5 67.8 93.2 67.5 92.7 66.9 C92.2 66.4 92.0 66.0 91.9 65.7 C91.7 65.1 91.4 64.9 91.1 65.1 C91.0 65.2 90.9 65.4 90.9 66.8 C90.9 69.3 90.6 69.4 89.1 67.8 C88.6 67.2 88.3 66.8 88.3 66.6 C88.1 65.8 87.8 65.6 87.2 66.1 C86.4 66.6 85.8 66.4 85.6 65.5 C85.5 65.1 85.2 64.7 84.1 63.6 C82.2 61.8 82.0 61.8 82.0 63.8 C81.9 65.0 81.9 65.1 81.6 65.5 C81.2 66.0 81.2 66.1 81.1 66.9 L81.0 67.8 L79.7 69.2 C77.9 71.0 78.1 70.9 75.3 70.9 C72.7 70.9 72.8 70.9 71.6 69.8 L70.9 69.2 L69.2 69.1 L67.5 69.1 L66.9 68.7 C66.0 68.0 64.7 68.1 64.3 68.7 C64.3 68.9 64.2 69.5 64.2 70.1 C64.2 71.2 64.2 71.2 64.6 71.7 C65.0 72.2 65.0 72.4 65.1 73.1 C65.2 73.9 65.2 74.0 65.5 74.4 C65.7 74.7 65.9 75.1 66.0 75.3 C66.1 75.6 66.3 76.0 66.4 76.2 C66.6 76.5 66.8 76.9 66.9 77.2 C67.0 77.6 67.2 77.9 67.8 78.5 C68.4 79.1 68.6 79.4 68.7 79.8 C68.8 80.3 69.0 80.6 70.5 82.1 C72.3 83.9 72.4 84.2 72.0 84.7 C71.7 85.1 71.1 85.1 70.5 84.7 C70.3 84.5 69.9 84.3 69.6 84.2 C69.4 84.2 68.9 83.9 68.6 83.7 C67.9 83.3 67.8 83.3 67.4 83.4 C67.2 83.6 67.2 83.9 67.5 84.5 C67.6 84.7 67.8 85.1 67.8 85.3 C67.9 85.6 68.1 85.9 68.6 86.3 C69.5 87.3 69.4 87.8 68.3 87.8 C67.6 87.8 67.3 87.6 66.4 86.8 C65.7 86.2 65.5 86.1 65.1 86.1 C64.3 86.1 64.0 86.7 64.5 87.5 C64.9 88.0 64.9 88.2 64.7 88.4 C64.4 88.7 63.4 88.7 62.9 88.5 C61.9 87.9 62.0 88.0 61.8 88.2 C61.7 88.3 61.5 88.5 61.5 88.7 C61.3 89.5 60.6 89.7 59.8 89.1 C59.0 88.5 58.2 88.7 58.0 89.5 C57.9 90.2 57.6 90.3 56.9 89.9 C55.8 89.2 54.4 89.6 54.4 90.5 C54.4 90.8 54.0 91.2 53.6 91.2 C53.2 91.2 53.0 91.1 52.3 90.5 Z M35.2 62.8 C35.3 62.8 35.7 62.4 36.2 62.0 C36.8 61.5 37.3 61.2 37.6 61.1 C37.9 61.0 38.3 60.7 38.9 60.2 C39.5 59.7 39.9 59.4 40.2 59.3 C40.8 59.2 41.0 59.0 41.1 58.4 C41.2 58.1 41.5 57.7 42.0 57.2 C42.5 56.6 42.8 56.2 42.9 55.9 C42.9 55.6 43.1 55.2 43.3 55.0 C43.6 54.5 43.6 54.4 43.2 53.8 C42.9 53.3 42.9 53.2 42.9 52.2 C42.9 50.8 42.8 50.7 41.6 49.6 C41.0 49.0 40.6 48.8 40.2 48.7 C40.0 48.6 39.6 48.4 39.4 48.3 C38.4 47.5 38.2 47.6 36.2 49.6 C34.4 51.3 34.3 51.3 33.1 51.3 C31.9 51.3 31.7 51.4 31.1 52.0 C30.7 52.4 30.6 52.7 30.5 53.0 C30.3 53.9 30.1 53.9 28.2 54.0 C26.1 54.1 26.0 54.1 26.0 55.4 C26.0 56.2 26.2 56.5 26.9 57.1 L27.4 57.5 L29.0 57.6 C31.0 57.6 30.9 57.6 32.1 58.8 C32.8 59.5 33.0 59.8 33.1 60.2 C33.2 60.5 33.4 60.9 33.6 61.1 C33.7 61.3 33.9 61.7 34.0 62.0 C34.1 62.6 34.6 62.9 35.0 62.8 C35.1 62.8 35.2 62.8 35.2 62.8 Z M70.0 60.2 C71.2 59.1 72.2 57.9 72.2 57.6 C72.2 57.5 72.0 57.1 71.8 56.8 C71.4 56.2 71.4 56.1 71.4 55.3 C71.4 54.1 72.0 53.9 72.3 55.0 C72.4 55.2 72.5 55.6 72.7 55.8 C72.9 56.0 73.0 56.4 73.1 56.6 C73.4 57.4 73.5 57.5 75.3 57.6 L77.0 57.6 L77.5 58.0 C78.3 58.6 79.5 58.6 80.2 58.0 C81.0 57.3 81.1 57.1 81.1 56.2 C81.1 55.4 81.0 55.1 80.2 54.5 C79.7 54.1 79.7 54.1 78.5 54.0 C77.7 53.9 77.2 53.9 77.1 53.9 C77.1 53.9 76.5 53.4 75.9 52.7 C74.4 51.3 74.4 51.3 73.2 51.3 C72.6 51.3 72.1 51.3 71.9 51.2 C71.4 51.0 70.6 50.2 70.5 49.8 C70.3 49.0 70.2 48.9 69.6 48.7 C69.2 48.5 68.8 48.3 68.7 48.2 C68.3 47.9 68.1 47.9 67.7 48.2 C67.6 48.4 67.2 48.5 66.9 48.6 C66.6 48.7 66.2 48.9 66.0 49.1 C65.8 49.2 65.4 49.5 65.1 49.6 C64.5 49.8 64.4 49.9 64.2 50.5 C64.2 50.7 63.9 51.1 63.7 51.4 L63.3 51.9 L63.3 54.0 L63.3 56.1 L63.6 56.5 C64.4 57.5 67.2 60.1 67.7 60.2 C68.0 60.3 68.4 60.5 68.6 60.6 C69.1 61.0 69.3 61.0 70.0 60.2 Z M35.5 15.4 C36.0 14.8 35.8 13.3 35.3 13.3 C35.0 13.3 34.2 14.2 34.1 14.6 C33.8 15.5 34.9 16.1 35.5 15.4 Z M66.7 15.4 C67.1 14.8 66.9 13.3 66.4 13.3 C66.1 13.3 65.3 14.2 65.2 14.6 C64.9 15.6 66.1 16.1 66.7 15.4 Z M72.8 15.5 C73.3 15.0 72.6 13.3 71.8 13.3 C71.3 13.3 71.1 14.8 71.6 15.4 C71.8 15.7 72.5 15.8 72.8 15.5 Z M40.9 15.4 C41.1 15.2 41.2 14.0 41.0 13.6 C40.7 13.0 39.7 13.0 39.4 13.7 C39.3 14.1 39.4 14.5 40.0 15.1 C40.5 15.6 40.7 15.7 40.9 15.4 Z"/>',
}
CLUB_SHAPES = {'panathinaikos': 'shamrock', 'celtic': 'shamrock', 'hapoel-tel-aviv': 'star', 'olympiacos': 'ball', 'aek-athens': 'eagle'}


def shape_mask(name: str) -> str:
    import urllib.parse
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{SHAPES.get(name, SHAPES["ticket"])}</svg>'
    return "url(\"data:image/svg+xml;utf8," + urllib.parse.quote(svg) + "\")"


TEAR = (4, -3, 5, -4, 3, -5, 4, -2, 3)   # the torn edge: how far each of nine points sits off the tear line, in % of the width
# A card that holds still is a dead frame (docs/fanlife/71: "the camera never stops dead"): it creeps in by this much a
# second — 0.13 px a frame at the edge of the screen, far under rule 142's 0.6 px.
CREEP = 0.004
CREEPS = {'question', 'ticket', 'lead', 'ledger', 'rule', 'stat', 'tally', 'card', 'quote', 'form', 'verdict', 'cities', 'chalk', 'end', 'table', 'press', 'word'}

# The explainer board and the kinetic line (Film.explain, Film.kinetic). INK and PAPER are the film's own.
XP_CSS = ('.bloom{position:absolute;left:0;top:0;width:1920px;height:1080px;mix-blend-mode:screen;pointer-events:none}'
          '.ckb{position:absolute;left:140px;top:104px;width:1640px;height:60px} .ckt{position:absolute;left:0;top:18px;width:100%;height:24px;background:rgba(20,17,13,.55);border:3px solid PAPER}'
          '.ckt i{display:block;height:100%;transform-origin:left center}'
          ".ckb b{position:absolute;top:52px;margin-left:-60px;width:120px;text-align:center;font:400 54px/1 'Ultra';color:#fff;text-shadow:4px 4px 0 INK}"
          ".ckb span{position:absolute;right:0;top:-26px;font:700 28px 'Cond';letter-spacing:3px;color:PAPER}"
          '.xpb{position:absolute;left:0;top:0;width:1920px;height:1080px;color:INK}'
          ".xpt{position:absolute;left:250px;top:150px;font:700 40px 'Cond';letter-spacing:10px}"
          '.pen{position:absolute;left:0;top:0;overflow:visible}'
          ".xpe{position:absolute;width:120px;text-align:center;font:400 64px/1 'Ultra'}"
          ".xpm{position:absolute;width:6px;height:52px;background:INK;opacity:.45} .xpml{position:absolute;width:120px;text-align:center;font:700 34px 'Cond';letter-spacing:3px;opacity:.7}"
          ".xpk{position:absolute;width:600px;text-align:center} .xpk b{position:relative;display:inline-block;font:400 76px/1.1 'Head';padding:0 16px} .xpk b.hot{color:#fff}"
          '.hl{position:absolute;left:0;top:8%;width:100%;height:86%;transform-origin:left center;z-index:0} .xpk em,.kw em{position:relative;font-style:normal;z-index:1}'
          ".odo{display:block;white-space:nowrap} .od{display:inline-block;height:1em;line-height:1;overflow:hidden;vertical-align:top} .ods{display:block;line-height:1}"
          ".xpn{font:400 120px/1 'Ultra'} .xpbig{position:absolute;left:0;top:250px;width:1920px;text-align:center} .xpv{font:400 430px/1 'Ultra'}"
          ".xpbig b{display:block;margin-top:26px;font:700 76px 'Cond';letter-spacing:12px}"
          ".xpr{position:absolute;left:250px;width:1420px;height:130px;display:flex;align-items:center;gap:30px} .xpr>span{width:260px;font:700 52px 'Cond';letter-spacing:6px}"
          ".xpbar{flex:1;height:84px} .xpbar i{display:block;height:100%} .xprn{font:400 110px/1 'Ultra';width:220px;text-align:right}"
          '.kv{position:absolute;left:0;top:0;width:1920px;height:1080px;background:INK}'
          ".kn{position:absolute;left:160px;top:250px;width:1600px;text-align:center;font-family:'Head';line-height:1.18;color:#fff}"
          ".kw{position:relative;display:inline-block;padding:0 14px;margin:0 2px} .kn small{display:block;margin-top:34px;font:700 40px 'Cond';letter-spacing:8px;color:PAPER}"
          '.kq{font-style:normal}'
          # the VOX pass (docu/vox.py): a sentence's type as paper strips over the picture, the object library's prints
          '.kvx{position:absolute;left:0;top:0;width:1920px;height:1080px;background:linear-gradient(to top,rgba(20,17,13,.78) 0%,rgba(20,17,13,.35) 34%,rgba(20,17,13,0) 58%)}'
          ".kn.vx{left:120px;top:auto;bottom:150px;width:1240px;text-align:left;line-height:1.02}"
          ".kn.vx .kw{background:PAPER;color:INK;padding:6px 18px 2px;margin:0 10px 12px 0;box-shadow:8px 8px 0 INK;border:4px solid INK}"
          ".kn.vx .kw.hot{color:#fff} .kn.vx .kw .hl{top:0;height:100%}"
          '.obx{position:absolute;left:0;top:0;width:1920px;height:1080px}'
          '.obj{position:absolute;filter:drop-shadow(14px 18px 0 rgba(20,17,13,.38));will-change:transform}'
          ".obl{position:absolute;padding:8px 22px 4px;background:PAPER;color:INK;border:5px solid INK;box-shadow:10px 10px 0 INK;font:400 64px/1 'Head';letter-spacing:2px;white-space:nowrap}"
          '.obl .hl{top:0;height:100%} .obl em{position:relative;font-style:normal;z-index:1}')


def rgba(col: str, a: float) -> str:
    """'#F1E8D3', 0.9 → 'rgba(241,232,211,0.9)' (a colour that is not a 6-digit hex is returned as it is)."""
    c = str(col or '').lstrip('#')
    if not re.fullmatch(r'[0-9a-fA-F]{6}', c):
        return col
    return f'rgba({int(c[0:2], 16)},{int(c[2:4], 16)},{int(c[4:6], 16)},{a})'


def glass(col: str, solid: float, edge: float) -> str:
    """The ground of a card read over a moving picture (editor.ground): solid where the type is, thinning to the edges."""
    return f'radial-gradient(ellipse 68% 72% at 50% 50%,{rgba(col, solid)} 0%,{rgba(col, solid)} 52%,{rgba(col, edge)} 100%)'


# The words of a subtitle already on screen as type (a slammed word, a question card, kinetic type) are not shown twice.
SAID_KINDS = {'word': 'text', 'question': 'text', 'lead': 'text', 'card': 'text', 'stat': 'label'}
DUP_SHARE = 0.6


def tokens(text: str) -> list[str]:
    return [w for w in re.findall(r"[a-z0-9']+", str(text or '').lower()) if len(w) > 2]


def on_screen(beat: dict) -> list[tuple[float, float, set]]:
    """(start, end, words) of every piece of type in a beat, on the film's clock."""
    out = []
    for x in beat['shots']:
        k = x['kind']
        if k == 'kinetic':
            ws = {w for item in x.get('words') or [] for w in tokens(item.get('w'))}
        elif k in SAID_KINDS:
            ws = set(tokens(x.get(SAID_KINDS[k])))
        else:
            continue
        a = beat['t'] + x.get('dt', 0.0) + (x.get('at', 0.0) if k == 'word' else 0.0)
        z = beat['t'] + x.get('dt', 0.0) + x.get('d', beat['d'] - x.get('dt', 0.0))
        if ws:
            out.append((a, z, ws))
    return out


def doubled(part: str, at: float, dd: float, shown: list[tuple[float, float, set]]) -> bool:
    """Is this subtitle mostly words that are on screen as type while it runs?"""
    ws = tokens(part)
    if not ws:
        return False
    here = set().union(*[w for a, z, w in shown if a < at + dd and at < z]) if shown else set()
    return sum(1 for w in ws if w in here) >= DUP_SHARE * len(ws)


def l2(text, col: str | None = None) -> str:
    """The club's own language, one smaller line under the English (docs/rules/studio-club-language.md)."""
    if not text:
        return ''
    return f'<em class="l2" dir="auto"{f" style=\"color:{col}\"" if col else ""}>{e(text)}</em>'


def e(s) -> str:
    return html.escape(str(s), quote=True)


def r2(x: float) -> float:
    return round(float(x), 2)


def chunks(text: str, limit: int = 64) -> list[str]:
    """A narrated line cut for subtitles: at sentence ends first, then at commas, never more than `limit` characters."""
    import re
    out = []
    for sent in re.split(r'(?<=[.?!])\s+', text.strip()):
        cur = ''
        for piece in re.split(r'(?<=,)\s+', sent):
            if cur and len(cur) + 1 + len(piece) > limit:
                out.append(cur)
                cur = piece
            else:
                cur = f'{cur} {piece}'.strip()
        while len(cur) > limit:
            cut = cur.rfind(' ', 0, limit)
            out.append(cur[:cut])
            cur = cur[cut + 1:]
        if cur:
            out.append(cur)
    merged = []
    for x in out:  # a fragment shorter than a few words joins its neighbour
        if merged and (len(x) < 14 or len(merged[-1]) < 14) and len(merged[-1]) + 1 + len(x) <= limit:
            merged[-1] = f'{merged[-1]} {x}'
        else:
            merged.append(x)
    return merged


class Film:
    def __init__(self, sb: dict, root: Path):
        self.sb, self.root = sb, root
        p = sb['palette']
        self.US, self.THEM, self.PAPER, self.INK = p['us'], p['them'], p.get('paper', '#F1E8D3'), p.get('ink', '#14110D')
        self.clips: list[str] = []
        self.tw: list[str] = []
        self.audio: list[str] = []
        self.made: list[dict] = []   # every clip as it is laid: {id, t, z (its end)} — what a transition moves
        self.cams: list[dict] = []   # every camera move as it is laid (studio/camera.py) — what the unit check measures
        self.n = 0

    def id(self, k: str) -> str:
        self.n += 1
        return f'{k}{self.n}'

    # ── primitives ──────────────────────────────────────────────────────────────────────────────────────────────────
    def clip(self, cid, t, d, inner, z, cls='', style=''):
        if getattr(self, '_glass', False) and cls in ('paper', 'ink'):
            cls += ' glass'   # a card over the beat's moving picture (editor.ground): its ground thins to the edges
        self.made.append({'id': cid, 't': t, 'z': t + d, 'layer': z})
        self.clips.append(f'<div id="{cid}" class="clip {cls}" data-start="{r2(t)}" data-duration="{r2(d)}" style="z-index:{z};{style}">{inner}</div>')

    def tween(self, js: str):
        self.tw.append(js)

    def sound(self, name, t, d=None, vol=0.6):
        if self.sb.get('silent'):
            return   # the pipeline's film is a silent picture: the mix (audio.build_mix) owns every sound, from the cue files
        f = SOUNDS.get(name, name)
        sid = self.id('snd')
        dur = f' data-duration="{r2(d)}"' if d else ''
        self.audio.append(f'<audio id="{sid}" class="clip" src="assets/sfx/{f}.wav" data-start="{r2(t)}"{dur} data-volume="{vol}"></audio>')

    # ── shots ───────────────────────────────────────────────────────────────────────────────────────────────────────
    def image(self, s, t, d, z=3):
        cid = self.id('img')
        veil = s.get('veil', 0.3)
        pos = s.get('pos', 'center')
        z = s.get('z', z)
        hold = s.get('hold', d)   # how long its tag and mini score stay: the whole beat, when the picture under them is cut into sub-shots
        fit = 'background-size:contain;background-repeat:no-repeat;background-color:' + self.INK if s.get('fit') == 'contain' else ''
        src_css = f'background-image:url(assets/img/{e(s["src"])});background-position:{pos};{fit}{GRADES.get(s.get("grade"), "")}'
        cam = s.get('cam') if s.get('fit') != 'contain' else None
        flat = s.get('as') == 'print' or not cam
        # with a camera move the picture is two depth planes and a vignette (studio/camera.planes); a print is one sheet
        phi = f'<div class="phi" id="{cid}i" style="{src_css}"></div>' if flat else C.planes(src_css, cid, s.get('horizon'))
        recon = f'<div class="recon">{RECON}</div>' if s.get('recon', True) else ''
        if s.get('as') == 'print':
            # the picture as a print dropped on the desk (docs/fanlife/71: photos land on the world as prints) — the
            # editor's third look when two full-frame stills have just run (docu/editor.py)
            self.clip(cid, t, d, f'<div class="prn" id="{cid}p">{phi}</div>{recon}', z, 'paper')
            self.tween(f'tl.fromTo("#{cid}p",{{y:120,rotation:-5,opacity:0}},{{y:0,rotation:-1.5,opacity:1,duration:0.5,ease:"power3.out"}},{r2(t)});')
        else:
            bloom = f'<div class="bloom" id="{cid}b" style="background:linear-gradient(to top,{self.US} 0%,rgba(0,0,0,0) 62%)"></div>' if s.get('grade') == 'bloom' else ''
            self.clip(cid, t, d, phi + bloom + (f'<div class="veil" style="opacity:{veil}"></div>' if veil else '') + recon, z, 'ph')
            if bloom:
                self.tween(f'tl.fromTo("#{cid}b",{{opacity:0}},{{opacity:{BLOOM_TO},duration:{r2(min(BLOOM_S, d))},ease:"power1.inOut"}},{r2(t)});')
        move = s.get('move', 'push')
        if cam:
            # THE CAMERA (studio/camera.py): a named move on the planes, from the framing's own scale and origin. The
            # editor chose it by the beat's emotion; `ci` is how far it travels, `way` which side a lateral move starts.
            base, origin = FRAME_BASE[s.get('frame') or 'wide']
            sel = {'back': f'#{cid}i'} if flat else {'back': f'#{cid}i', 'fore': f'#{cid}f', 'vig': f'#{cid}v'}
            self.tween(f'tl.set("{",".join(v for k, v in sel.items() if k != "vig")}",{{transformOrigin:"{s.get("focus", origin)}"}},{r2(t)});')
            for js in C.gsap(C.spec(cam, d, s.get('ci', 0.5), base, s.get('way', 1), s.get('rack')), sel, t):
                self.tween(js)
            self.cams.append({'t': r2(t), 'd': r2(d), 'move': cam, 'ci': s.get('ci', 0.5)})
        elif s.get('frame'):
            a, b, origin = FRAMINGS[s['frame']]
            ease, dur = ('power2.in', d) if s['frame'] == 'turn' else ('none', d)
            self.tween(f'tl.set("#{cid}i",{{transformOrigin:"{s.get("focus", origin)}"}},{r2(t)});')
        else:
            a, b = {'push': ('{scale:1.02}', '{scale:1.16}'), 'pull': ('{scale:1.3,y:50}', '{scale:1.06,y:0}'),
                    'panl': ('{scale:1.14,x:60}', '{scale:1.14,x:-60}'), 'panr': ('{scale:1.14,x:-60}', '{scale:1.14,x:60}'),
                    'slam': ('{scale:1.35}', '{scale:1.08}')}[move]
            ease, dur = ('power3.out', min(1.1, d)) if move in ('pull', 'slam') else ('none', d)
        if not cam:
            self.tween(f'tl.fromTo("#{cid}i",{a},{{...{b},duration:{r2(dur)},ease:"{ease}"}},{r2(t)});')
        if not cam and not s.get('frame') and move in ('pull', 'slam') and d > dur + 0.5:
            # after it lands it keeps creeping (docs/fanlife/71: never a dead stop) — the landing used to be the last motion of the shot
            rest = 1.06 if move == 'pull' else 1.08
            self.tween(f'tl.fromTo("#{cid}i",{{scale:{rest}}},{{scale:{rest + CREEP * 3 * (d - dur):.4f},duration:{r2(d - dur)},ease:"none",immediateRender:false}},{r2(t + dur)});')
        if s.get('fade', True):
            self.tween(f'tl.fromTo("#{cid}",{{opacity:0}},{{opacity:1,duration:0.35}},{r2(t)});')
        if s.get('tag'):
            tg = s['tag']
            tid = self.id('tag')
            col = self.US if tg.get('side', 'us') == 'us' else self.THEM
            self.clip(tid, t + 0.5, hold - 0.5, f'<div class="tag" style="background:{col}"><small>{e(tg.get("small", ""))}</small><b>{e(tg["big"])}</b></div>', 8)
            self.tween(f'tl.fromTo("#{tid} .tag",{{scaleX:0}},{{scaleX:1,duration:0.35,ease:"power3.out",transformOrigin:"left center"}},{r2(t + 0.5)});')
        if s.get('lt'):   # the lower third a clip has always carried, for a still too (a map beat with no route to draw)
            lid = self.id('lt')
            self.clip(lid, t + 0.4, hold - 0.4, f'<div class="lt"><b>{e(s["lt"][0])}</b><span>{e(s["lt"][1])}</span></div>', 6)
            self.tween(f'tl.fromTo("#{lid} .lt",{{x:-900}},{{x:0,duration:0.5,ease:"power3.out"}},{r2(t + 0.4)});')
        if s.get('mini'):
            m = s['mini']
            mid = self.id('mini')
            self.clip(mid, t + m.get('at', 1.5), hold - m.get('at', 1.5), f'<div class="mini"><span>{e(m["home"])}</span><b>{e(m["score"])}</b><span>{e(m["away"])}</span></div>', 9)
            self.tween(f'tl.fromTo("#{mid} .mini",{{scale:1.8,opacity:0}},{{scale:1,opacity:1,duration:0.22,ease:"power4.in"}},{r2(t + m.get("at", 1.5))});')
            if m.get('flip'):   # the score before the goal, then the score after it — changed on the cut, settled once (no bounce)
                at = t + m['flip']['at']
                self.tween(f'tl.set("#{mid} .mini b",{{textContent:"{e(m["score"])}"}},{r2(t)});tl.set("#{mid} .mini b",{{textContent:"{e(m["flip"]["score"])}"}},{r2(at)});'
                           f'tl.fromTo("#{mid} .mini b",{{scale:1.5,color:"{self.US}"}},{{scale:1,color:"{self.INK}",duration:0.4,ease:"power2.out",immediateRender:false}},{r2(at)});')

    def video(self, s, t, d):
        cid = self.id('vid')
        self.made.append({'id': cid, 't': t, 'z': t + d})
        self.clips.append(f'<video id="{cid}" class="clip" src="assets/img/{e(s["src"])}" muted playsinline data-start="{r2(t)}" data-duration="{r2(d)}" '
                          f'data-media-start="{s.get("from", 0)}" style="object-fit:cover;z-index:3"></video>')
        self.clip(self.id('frm'), t, d, f'<div class="recon r2">{RECON}</div>', 4, 'frame')
        if s.get('lt'):
            lid = self.id('lt')
            self.clip(lid, t + 0.4, d - 0.4, f'<div class="lt"><b>{e(s["lt"][0])}</b><span>{e(s["lt"][1])}</span></div>', 6)
            self.tween(f'tl.fromTo("#{lid} .lt",{{x:-900}},{{x:0,duration:0.5,ease:"power3.out"}},{r2(t + 0.4)});')
        if s.get('clock'):
            cb = self.id('clk')
            c0 = t + s['clock'].get('at', 2)
            self.clip(cb, c0, t + d - c0, f'<div class="clockbar"><div class="cbl">0\'</div><div class="cbt"><div class="cbf" id="{cb}f" style="background:{self.US}"></div></div><div class="cbl">90\'</div><div class="cbcap">{e(s["clock"]["cap"])}</div></div>', 7)
            self.tween(f'tl.fromTo("#{cb}f",{{scaleX:0}},{{scaleX:{s["clock"].get("to", 0.94)},duration:{r2(t + d - c0 - 0.2)},ease:"power1.inOut"}},{r2(c0)});')

    def score(self, s, t, d):
        cid = self.id('sb')
        ush = f'background:{self.US}'
        them = f'background:linear-gradient(90deg,{self.THEM} 0 50%,#fff 50% 100%)' if s.get('them_halves') else f'background:{self.THEM}'
        inner = (f'<div class="sb"><div class="sbl" style="{ush}">{self.badge(s.get("us_crest"), s["us"])}<span>{s["us"]}</span></div>'
                 f'<div class="sbc"><b>{e(s["us_goals"])}</b><i>–</i><b>{e(s["them_goals"])}</b></div>'
                 f'<div class="sbr" style="{them}"><span class="nm">{e(s["them"])}</span>{self.badge(s.get("them_crest"), s["them"])}</div></div>'
                 f'<div class="sbcap">{e(s.get("cap", ""))}</div>')
        if s.get('bg'):
            self.image({'src': s['bg'], 'veil': 0.55, 'move': 'push'}, t, d, 1)
        self.clip(cid, t, d, inner, 5)
        self.tween(f'tl.fromTo("#{cid} .sb",{{y:-260,opacity:0}},{{y:0,opacity:1,duration:0.55,ease:"back.out(1.6)"}},{r2(t)});')
        if s.get('shrink_at') is not None:
            self.tween(f'tl.fromTo("#{cid}",{{y:0,scale:1}},{{y:-300,scale:0.62,duration:0.7,ease:"power3.inOut",immediateRender:false}},{r2(t + s["shrink_at"])});')

    def flap(self, s, t, d):
        """NUMBERS ARE OBJECTS (editing rule 3): a split-flap board — each character a tile that turns over from the
        number before to the next (a year: the film travels back; a score: it changes on the goal). One turn per tile per
        change, eased, staggered left to right; nothing flickers (rule 142). `frm` and `to` are strings of the same
        length. `turns` [[at, text], ...] keeps turning the same board later (the held scoreboard: one board a match
        chapter, a turn on every goal); `corner` sets it small in the top corner instead of centred."""
        cid = self.id('flap')
        b = str(s['to'])
        a = str(s.get('frm', ''))
        a = a.rjust(len(b))[-len(b):] if a else ' ' * len(b)
        at = s.get('at', 0.0)
        if d <= at:   # a board whose `d` does not reach past its `at` would never leave the frame (16.11.2026): `d` is then its own hold
            d = at + d
        seq = [(t + max(at + 0.35, s.get('turn_at') or 0), a, b)]   # the first turn: on the goal word, or as it lands
        cur = b
        for k, nxt in s.get('turns') or []:
            nxt = str(nxt).rjust(len(b))[-len(b):]
            seq.append((t + k, cur, nxt))
            cur = nxt
        tiles = ''.join(f'<div class="fp"><b class="fa">{e(x)}</b><b class="fb">{e(y)}</b></div>' for x, y in zip(a, b))
        small = f'<small>{e(s["small"])}</small>' if s.get('small') else ''
        cls = 'flapw corner' if s.get('corner') else 'flapw'
        self.clip(cid, t + at, d - at, f'<div class="{cls}"><div class="flaps">{tiles}</div>{small}</div>', s.get('z', 14), 'paper' if s.get('full') else '')
        for n, (T, x, y) in enumerate(seq):
            for i in range(len(y)):
                fa, fb = f'#{cid} .fp:nth-child({i + 1}) .fa', f'#{cid} .fp:nth-child({i + 1}) .fb'
                if n:   # the board as it stands is the front face again, the next number waits on the back
                    self.tween(f'tl.set("{fa}",{{textContent:"{e(x[i])}",rotationX:0,opacity:1}},{r2(T - 0.01)});'
                               f'tl.set("{fb}",{{textContent:"{e(y[i])}",rotationX:90}},{r2(T - 0.01)});')
                if x[i] == y[i]:
                    self.tween(f'tl.set("{fa}",{{opacity:0}},{r2(T)});tl.set("{fb}",{{rotationX:0}},{r2(T)});')
                    continue
                self.tween(f'tl.fromTo("{fa}",{{rotationX:0}},{{rotationX:-90,duration:0.22,ease:"power2.in",immediateRender:false}},{r2(T + 0.12 * i)});'
                           f'tl.fromTo("{fb}",{{rotationX:90}},{{rotationX:0,duration:0.26,ease:"power2.out",immediateRender:false}},{r2(T + 0.12 * i + 0.22)});')
            if n:
                self.sound('stamp', T, None, 0.35)

    def badge(self, src, name) -> str:
        """A crest when one is on file; otherwise the club's initials on a plain roundel — never a borrowed badge."""
        if src:
            return f'<img src="assets/img/{e(src)}">'
        import re as _re
        ini = ''.join(w[0] for w in _re.findall(r"[A-Za-zÀ-ž]+", html.unescape(str(name)))[:3]).upper()
        return f'<i class="ini">{e(ini)}</i>'

    def stamp(self, s, t, d):
        cid = self.id('st')
        col = self.US if s.get('side', 'us') == 'us' else self.THEM
        plate = f';background:{self.PAPER};box-shadow:8px 8px 0 {self.INK};padding:6px 18px' if s.get('plate') else ''   # a stamp over a crowd sits on paper, or it does not read
        self.clip(cid, t, d, f'<span>{e(s["text"])}</span>', s.get('z', 7), 'stamp', f'left:{s.get("x", 200)}px;top:{s.get("y", 560)}px;color:{col};border-color:{col};font-size:{s.get("size", 230)}px;white-space:nowrap{plate}')
        rot = s.get('rot', -8)
        self.tween(f'tl.fromTo("#{cid}",{{scale:2.4,opacity:0,rotation:{rot * 1.7}}},{{scale:1,opacity:1,rotation:{rot},duration:0.25,ease:"power4.in"}},{r2(t)});')

    def question(self, s, t, d):
        cid = self.id('q')
        txt = e(s['text']).replace('[', f'<em style="background:{self.US}">').replace(']', '</em>').replace('{', f'<em style="background:{self.THEM}">').replace('}', '</em>').replace('|', '<br>')
        small = f'<small>{e(s["small"])}</small>' if s.get('small') else ''
        self.clip(cid, t, d, f'<div class="q">{small}{txt}{l2(s.get("small2"))}</div>', 14)
        self.tween(f'tl.fromTo("#{cid} .q",{{opacity:0,y:40}},{{opacity:1,y:0,duration:0.5,ease:"power3.out"}},{r2(t)});')

    def ticket(self, s, t, d):
        cid = self.id('tk')
        win = ''
        if s.get('window') and self.sb.get('shape') and not s.get('compact'):
            # editing rule 4, the shape as a window: the chapter's first picture seen through the film's shape, behind the card
            mk = shape_mask(self.sb['shape']).replace('"', "'")   # inside a style attribute
            win = (f'<div class="win" style="background-image:url(assets/img/{e(s["window"])});-webkit-mask-image:{mk};mask-image:{mk}"></div>')
        self.clip(cid, t, d, win + f'<div class="ticket{" tc" if s.get("compact") else ""}{" tw" if win else ""}"><small style="color:{self.US}">{e(s["small"])}</small><b>{e(s["big"])}</b><span>{e(s.get("line", ""))}</span>{l2(s.get("line2"))}</div>', 9, '' if s.get('compact') else 'paper')
        self.tween(f'tl.fromTo("#{cid} .ticket",{{rotation:-6,scale:0.6,opacity:0}},{{rotation:-2,scale:1,opacity:1,duration:0.35,ease:"back.out(2)"}},{r2(t)});')
        if win:
            self.tween(f'tl.fromTo("#{cid} .win",{{scale:0.7,opacity:0}},{{scale:1,opacity:1,duration:0.45,ease:"power3.out"}},{r2(t)});'
                       f'tl.fromTo("#{cid} .win",{{scale:1}},{{scale:1.06,duration:{r2(max(0.5, d - 0.45))},ease:"none",immediateRender:false}},{r2(t + 0.45)});')
        if d > 1.0:   # the card keeps turning very slowly and its lines open: a chapter card measured under the motion floor (qa.MOTION_FLOOR) when it only crept
            self.tween(f'tl.fromTo("#{cid} .ticket",{{rotation:-2}},{{rotation:{-2 + 0.9 * min(d, 4):.2f},duration:{r2(d - 0.4)},ease:"none",immediateRender:false}},{r2(t + 0.4)});'
                       f'tl.fromTo("#{cid} .ticket small",{{letterSpacing:"10px"}},{{letterSpacing:"{10 + 3 * min(d, 4):.0f}px",duration:{r2(d)},ease:"none"}},{r2(t)});')

    def lead(self, s, t, d):
        cid = self.id('ld')
        col = self.US if s.get('side', 'us') == 'us' else self.THEM
        sub = f'<small>{e(s["sub"])}</small>' if s.get('sub') else ''
        self.clip(cid, t, d, f'<div class="lead" style="background:{col}">{e(s["text"])}{sub}</div>', 9)
        self.tween(f'tl.fromTo("#{cid} .lead",{{clipPath:"inset(0 100% 0 0)"}},{{clipPath:"inset(0 0% 0 0)",duration:0.5,ease:"power3.out"}},{r2(t)});')

    def ledger(self, s, t, d):
        cid = self.id('lg')
        rows = ''.join(f'<div class="lrow" id="{cid}r{i}"><span>{e(r[0])}</span><b>{e(r[1])}</b><b>{e(r[2])}</b></div>' for i, r in enumerate(s['rows']))
        circ = ''
        if s.get('circle'):
            r, c = s['circle']
            mark = (f'<svg class="circ" style="left:{1160 if c == 2 else 820}px" viewBox="0 0 200 140">'
                    f'<path id="{cid}c" d="M100 10 C170 10 190 50 188 72 C185 115 140 132 98 130 C45 128 12 105 14 68 C16 32 55 12 112 14" fill="none" stroke="{self.THEM}" stroke-width="7" stroke-linecap="round"/></svg>'
                    f'<div class="note" style="left:{1160 if c == 2 else 820}px;color:{self.THEM}">{e(s.get("note", ""))}</div>')
            rows = rows.replace(f'<div class="lrow" id="{cid}r{r}">', f'<div class="lrow" id="{cid}r{r}" style="position:relative">{mark}', 1)
        ttl = f'<span>{e(s["title"])}</span>' if s.get('title') else '<span></span>'
        inner = (f'<div class="ledger{" lc" if s.get("compact") else ""}"><div class="lh">{ttl}<b style="color:{self.US}">{e(s["us"])}</b><b style="color:{self.THEM}">{e(s["them"])}</b></div>{rows}</div>')
        self.clip(cid, t, d, inner, 14, 'paper')
        self.tween(f'tl.fromTo("#{cid} .ledger",{{y:80,opacity:0}},{{y:0,opacity:1,duration:0.45,ease:"power3.out"}},{r2(t)});')
        for i, at in enumerate(s.get('row_at', [0.4 + 1.2 * k for k in range(len(s['rows']))])):
            self.tween(f'tl.fromTo("#{cid}r{i}",{{opacity:0}},{{opacity:1,duration:0.3}},{r2(t + at)});')
        if s.get('circle'):
            ca = s.get('circle_at', d - 1.5)
            self.tween(f'tl.fromTo("#{cid}c",{{strokeDasharray:620,strokeDashoffset:620}},{{strokeDashoffset:0,duration:0.7,ease:"power2.inOut"}},{r2(t + ca)});'
                       f'tl.fromTo("#{cid} .note",{{opacity:0}},{{opacity:1,duration:0.3}},{r2(t + ca + 0.6)});')

    def rule(self, s, t, d):
        cid = self.id('ru')
        self.clip(cid, t, d, f'<div class="rule"><small style="color:{self.THEM}">{e(s["small"])}</small><b>{e(s["title"])}</b><p>{e(s["text"])}</p></div>', 14, 'paper')
        self.tween(f'tl.fromTo("#{cid} .rule",{{scale:0.9,opacity:0}},{{scale:1,opacity:1,duration:0.45,ease:"power3.out"}},{r2(t)});'
                   f'tl.fromTo("#{cid} p",{{clipPath:"inset(0 100% 0 0)"}},{{clipPath:"inset(0 0% 0 0)",duration:{r2(min(2.4, d - 1))},ease:"none"}},{r2(t + 0.6)});')

    def stat(self, s, t, d):
        cid = self.id('stt')
        self.clip(cid, t, d, f'<div class="stat"><b>{e(s["value"])}</b><small style="background:{self.US}">{e(s["label"])}</small></div>', 9)
        self.tween(f'tl.fromTo("#{cid} .stat b",{{scale:2.2,opacity:0}},{{scale:1,opacity:1,duration:0.28,ease:"power4.in"}},{r2(t)});'
                   f'tl.fromTo("#{cid} .stat small",{{clipPath:"inset(0 100% 0 0)"}},{{clipPath:"inset(0 0% 0 0)",duration:0.45,ease:"power3.out"}},{r2(t + 0.35)});')

    def tally(self, s, t, d):
        cid = self.id('tly')
        cells = ''.join(f'<div class="tc{i}"><b>{e(v)}</b><span>{e(k)}</span></div>' for i, (k, v) in enumerate(s['cells']))
        self.clip(cid, t, d, f'<div class="tally"><small style="color:{self.US}">{e(s.get("title", ""))}</small><div class="tcs">{cells}</div></div>', 14, 'paper')
        for i in range(len(s['cells'])):
            self.tween(f'tl.fromTo("#{cid} .tc{i}",{{y:60,opacity:0}},{{y:0,opacity:1,duration:0.35,ease:"back.out(2)"}},{r2(t + 0.3 + 0.35 * i)});')

    def card(self, s, t, d):
        cid = self.id('crd')
        sub = f'<p>{e(s["sub"])}</p>' if s.get('sub') else ''
        self.clip(cid, t, d, f'<div class="card"><small style="color:{self.US}">{e(s.get("small", ""))}</small><b>{e(s["text"])}</b>{sub}</div>',
                  14 if s.get('paper') else 9, 'paper' if s.get('paper') else '')
        self.tween(f'tl.fromTo("#{cid} .card",{{rotation:-3,y:90,opacity:0}},{{rotation:-1,y:0,opacity:1,duration:0.45,ease:"back.out(1.6)"}},{r2(t)});')

    def quote(self, s, t, d):
        cid = self.id('qt')
        who = ' · '.join(x for x in (s.get('who'), s.get('role')) if x)
        self.clip(cid, t, d, f'<div class="quote"><i style="color:{self.US}">“</i><b>{e(s["text"])}</b><small>{e(who)}</small></div>', 14, 'paper')
        self.tween(f'tl.fromTo("#{cid} .quote b",{{clipPath:"inset(0 0 100% 0)"}},{{clipPath:"inset(0 0 0% 0)",duration:{r2(min(2.0, d * 0.5))},ease:"none"}},{r2(t + 0.3)});'
                   f'tl.fromTo("#{cid} .quote i",{{scale:2,opacity:0}},{{scale:1,opacity:1,duration:0.3}},{r2(t)});')

    def follow(self, s, t, d):
        cid = self.id('fol')
        inner = (f'<div class="follow"><b>JOIN US!</b><div class="fl"><span>NAME</span><i></i></div><div class="fl"><span>CLUB</span><i>{e(s["club"])}</i></div>'
                 f'<div class="fl"><span>SINCE</span><i></i></div><div class="btn" style="background:{self.US}"><span class="b1">SUBSCRIBE</span><span class="b2">SUBSCRIBED ✓</span></div></div>')
        self.clip(cid, t, d, inner, 10)
        p = t + s.get('press_at', 1.6)
        self.tween(f'tl.fromTo("#{cid} .follow",{{rotation:-8,scale:0.7,opacity:0}},{{rotation:-2,scale:1,opacity:1,duration:0.45,ease:"back.out(1.8)"}},{r2(t)});'
                   f'tl.fromTo("#{cid} .btn",{{scale:1}},{{scale:0.9,duration:0.08,yoyo:true,repeat:1,immediateRender:false}},{r2(p)});'
                   f'tl.fromTo("#{cid} .b1",{{opacity:1}},{{opacity:0,duration:0.05,immediateRender:false}},{r2(p + 0.1)});'
                   f'tl.fromTo("#{cid} .b2",{{opacity:0}},{{opacity:1,duration:0.05}},{r2(p + 0.1)});')

    # ── motion graphics (11.2026: the HTA v Be'er Sheva film) ───────────────────────────────────────────────────────
    def table(self, s, t, d):
        """A league table drawn row by row; the drop line is red; the camera pushes in on it. Rows may be unnamed — a
        shape of a table, not a claim about who stood where."""
        cid = self.id('tb')
        rows = s.get('rows') or [''] * s.get('n', 16)
        cut = s.get('cut', len(rows) - 2)
        line = cut is not False   # `cut: False` draws no line: where the drop sat is a claim the adapter's rows do not make
        cut = cut if line else -1
        hl = s.get('highlight')
        mark = s.get('mark')   # a second row told apart in ink (the other side of the story), never in a colour the palette does not hold
        # a row may carry its points: ['PANATHINAIKOS', 83] — printed as the record gives them, in place of the grey bar
        cell = lambda r: (e(r[0]), f'<b class="pt">{e(r[1])}</b>') if isinstance(r, (list, tuple)) else (e(r), '<b></b>')  # noqa: E731
        html_rows = ''.join(
            f'<div class="tr{" lit" if i == hl else " mk" if i == mark else ""}" id="{cid}r{i}"><i>{i + 1}</i><span>{cell(r)[0]}</span>{cell(r)[1]}</div>'
            + (f'<div class="drop" id="{cid}line"><em>{e(s.get("line_label", "RELEGATION"))}</em></div>' if i == cut - 1 else '')
            for i, r in enumerate(rows))
        zoom = f' style="transform:scale({float(s["zoom"])});transform-origin:50% 0"' if s.get('zoom') else ''   # a short table (the top of one) is drawn larger
        self.clip(cid, t, d, f'<div class="tbw" id="{cid}w"><div class="tbl"{zoom}>{html_rows}</div></div>', 9, 'paper')
        for i in range(len(rows)):
            self.tween(f'tl.fromTo("#{cid}r{i}",{{x:-60,opacity:0}},{{x:0,opacity:1,duration:0.25,ease:"power2.out"}},{r2(t + 0.15 + 0.06 * i)});')
        if line:
            self.tween(f'tl.fromTo("#{cid}line",{{scaleX:0}},{{scaleX:1,duration:0.5,ease:"power3.out",transformOrigin:"left center"}},{r2(t + 0.3 + 0.06 * len(rows))});')
        pa = s.get('push_at') if line else None
        if pa is not None:
            ly = 60 + 6 + 46 * cut   # the drop line, in the frame's pixels
            self.tween(f'tl.set("#{cid}w",{{transformOrigin:"50% {ly - 60}px"}},{r2(t)});'
                       f'tl.fromTo("#{cid}w",{{scale:1,y:0}},{{scale:{s.get("push_scale", 2.2)},y:{540 - ly},duration:0.9,ease:"power3.inOut",immediateRender:false}},{r2(t + pa)});')

    def word(self, s, t, d):
        """Kinetic type: one or two words slammed onto the glass; the plate settles once, it never shakes (rule 142)."""
        cid = self.id('wd')
        col = {'us': self.US, 'them': self.THEM, 'ink': self.INK, 'paper': self.PAPER}.get(s.get('bg', 'ink'), s.get('bg'))
        fg = s.get('fg', self.INK if s.get('bg') == 'paper' else '#fff')   # white type on a paper card is unreadable (14.11.2026)
        lines = '<br>'.join(e(x) for x in s['text'].split('|'))
        at0 = s.get('at', 0)
        t, d, s = t + at0, d - at0, {**s, 'at': 0}
        bg = glass(col, 0.9, 0.42) if s.get('glass') else col
        self.clip(cid, t, d, f'<div class="word" style="background:{bg}"><b style="color:{fg};font-size:{s.get("size", 220)}px">{lines}</b>'
                  + (f'<small style="color:{fg}">{e(s["small"])}</small>' if s.get('small') else '') + l2(s.get('small2'), fg) + '</div>', s.get('z', 15))
        self.tween(f'tl.fromTo("#{cid} .word b",{{scale:3,opacity:0}},{{scale:1,opacity:1,duration:0.18,ease:"power4.in"}},{r2(t + s.get("at", 0))});'
                   f'tl.fromTo("#{cid} .word",{{scale:1.04}},{{scale:1,duration:0.5,ease:"power2.out",immediateRender:false}},{r2(t + s.get("at", 0) + 0.18)});')
        if d > 0.9:   # the type keeps pushing in for as long as it holds: a flat card with still letters measured as a dead shot (qa.MOTION_FLOOR)
            self.tween(f'tl.fromTo("#{cid} .word b",{{scale:1}},{{scale:{1 + 0.022 * min(d, 6):.4f},duration:{r2(d - 0.2)},ease:"none",immediateRender:false}},{r2(t + 0.2)});'
                       f'tl.fromTo("#{cid} .word small",{{letterSpacing:"10px"}},{{letterSpacing:"{10 + 3 * min(d, 6):.0f}px",duration:{r2(d)},ease:"none"}},{r2(t)});')
        if s.get('glitch'):
            self.tween(f'tl.fromTo("#{cid} .word b",{{textShadow:"-14px 0 {self.US}, 14px 0 #3ad"}},{{textShadow:"0 0 transparent, 0 0 transparent",duration:0.35,ease:"power2.out"}},{r2(t + s.get("at", 0) + 0.18)});')

    def cities(self, s, t, d):
        """Two places, two halves, a jagged line between them."""
        cid = self.id('ct')
        a, b = s['a'], s['b']
        size = lambda x: f' style="font-size:{int(x["size"])}px"' if x.get('size') else ''   # noqa: E731 — a long name is set smaller, never cut by the half's edge
        inner = (f'<div class="cty"><div class="cl" style="background:{a.get("bg", self.US)}"><small>{e(a.get("small", ""))}</small><b{size(a)}>{e(a["name"])}</b>'
                 + (f'<img src="assets/img/{e(a["crest"])}">' if a.get('crest') else '') + '</div>'
                 f'<div class="cr" style="background:{b.get("bg", self.US)}"><small>{e(b.get("small", ""))}</small><b{size(b)}>{e(b["name"])}</b>'
                 + (f'<img src="assets/img/{e(b["crest"])}">' if b.get('crest') else '') + '</div>'
                 f'<svg class="bolt" viewBox="0 0 1920 1080"><path id="{cid}z" d="M960 40 L1010 260 L900 420 L1030 600 L910 780 L980 1040" fill="none" stroke="{self.PAPER}" stroke-width="18" stroke-linejoin="bevel"/></svg>'
                 + (f'<div class="ctmid">{e(s["mid"])}</div>' if s.get('mid') else '') + '</div>')
        self.clip(cid, t, d, inner, 9)
        self.tween(f'tl.fromTo("#{cid} .cl",{{xPercent:-100}},{{xPercent:0,duration:0.45,ease:"power3.out"}},{r2(t)});'
                   f'tl.fromTo("#{cid} .cr",{{xPercent:100}},{{xPercent:0,duration:0.45,ease:"power3.out"}},{r2(t + 0.25)});'
                   f'tl.fromTo("#{cid}z",{{strokeDasharray:1400,strokeDashoffset:1400}},{{strokeDashoffset:0,duration:0.5,ease:"power2.in"}},{r2(t + 0.8)});'
                   f'tl.fromTo("#{cid} .ctmid",{{scale:2.5,opacity:0}},{{scale:1,opacity:1,duration:0.2,ease:"power4.in"}},{r2(t + s.get("mid_at", 1.4))});')

    def chalk(self, s, t, d):
        """The tactics board: a chalk pitch, the clock running to the minute, then the move — a free kick or a corner —
        drawn as the ball's path into the net."""
        cid = self.id('ch')
        mn = s.get('minute')
        play = s.get('play', 'freekick')
        P = self.PAPER
        # attacking the goal on the right; coordinates in a 1920x1080 board
        pitch = (f'<rect x="120" y="120" width="1680" height="840" fill="none" stroke="{P}" stroke-width="5"/>'
                 f'<line x1="960" y1="120" x2="960" y2="960" stroke="{P}" stroke-width="5"/><circle cx="960" cy="540" r="120" fill="none" stroke="{P}" stroke-width="5"/>'
                 f'<rect x="1500" y="300" width="300" height="480" fill="none" stroke="{P}" stroke-width="5"/><rect x="1700" y="420" width="100" height="240" fill="none" stroke="{P}" stroke-width="5"/>'
                 f'<rect x="1800" y="480" width="34" height="120" fill="none" stroke="{P}" stroke-width="6"/>'
                 f'<rect x="120" y="300" width="300" height="480" fill="none" stroke="{P}" stroke-width="5"/>')
        if play == 'freekick':
            ball, path = (1390, 610), 'M1390 610 C1560 380 1700 430 1812 505'
            wall = ''.join(f'<rect x="1468" y="{y}" width="26" height="26" fill="{self.THEM if s.get("attack") == "us" else self.US}" transform="rotate(45 1481 {y + 13})"/>' for y in (520, 556, 592))
            marks = f'<text x="1330" y="690" class="chx" fill="{P}">X</text>{wall}'
        elif play == 'cross':   # a free kick from the right flank, crossed to a head in the six-yard area, headed in (two legs)
            ball, path = (1420, 860), 'M1420 860 C1540 700 1640 610 1690 560'
            marks = (f'<text x="1362" y="940" class="chx" fill="{P}">X</text>'
                     + ''.join(f'<circle cx="{x}" cy="{y}" r="16" fill="none" stroke="{P}" stroke-width="5"/>' for x, y in ((1640, 470), (1600, 600), (1730, 610))))
        else:   # corner from the top right
            ball, path = (1795, 128), 'M1795 128 C1640 220 1620 420 1660 520 L1812 540'
            marks = ''.join(f'<circle cx="{x}" cy="{y}" r="16" fill="none" stroke="{P}" stroke-width="5"/>' for x, y in ((1600, 470), (1640, 600), (1560, 560)))
        col = self.US if s.get('attack', 'them') == 'us' else self.THEM
        pitch = pitch.replace('/>', ' pathLength="1"/>')
        if play == 'cross':   # the header's own line and the ring where the ball is met (drawn after the cross lands)
            marks += (f'<path id="{cid}h" d="M1690 560 L1812 540" fill="none" stroke="{col}" stroke-width="11" stroke-linecap="round" stroke-dasharray="130" stroke-dashoffset="130"/>'
                      f'<g id="{cid}k" opacity="0"><circle cx="1690" cy="560" r="30" fill="none" stroke="#fff" stroke-width="7"/></g>')
        inner = (f'<div class="chk"><svg viewBox="0 0 1920 1080" class="chs">{pitch}{marks}'
                 f'<path id="{cid}p" d="{path}" fill="none" stroke="{col}" stroke-width="9" stroke-dasharray="22 14" stroke-linecap="round"/>'
                 f'<circle id="{cid}b" cx="{ball[0]}" cy="{ball[1]}" r="17" fill="#fff"/></svg>'
                 + (f'<div class="chc"><small>MIN</small><b id="{cid}m">00:00</b></div>' if mn else '')
                 + (f'<div class="chl" style="background:{col}">{e(s["label"])}</div>' if s.get('label') else '') + '</div>')
        self.clip(cid, t, d, inner, 9)
        self.tween(f'tl.fromTo("#{cid} .chs rect, #{cid} .chs line, #{cid} .chs circle:not(#{cid}b)",{{strokeDasharray:1,strokeDashoffset:1}},{{strokeDashoffset:0,duration:1.0,ease:"power1.inOut",stagger:0.05}},{r2(t)});')
        if mn:
            k = self.id('m')
            self.tween(f'const {k}={{v:0}};tl.to({k},{{v:{mn},duration:1.4,ease:"power2.out",onUpdate:()=>{{const el=document.getElementById("{cid}m");if(el)el.textContent=String(Math.round({k}.v)).padStart(2,"0")+":00";}}}},{r2(t + 0.3)});')
        g = s.get('go', 2.0)
        go = t + (d + g if g < 0 else g)
        self.sound('kick', go, 0.6, 0.9)
        if play == 'cross':
            # the cross first, then — after a held half-second at the head — the header: a second pen line into the net
            hd = go + 0.9 + s.get('hang', 0.5)
            self.tween(f'tl.fromTo("#{cid}p",{{clipPath:"inset(0 100% 0 0)"}},{{clipPath:"inset(0 0% 0 0)",duration:0.9,ease:"power1.inOut"}},{r2(go)});'
                       f'tl.fromTo("#{cid}b",{{attr:{{cx:{ball[0]},cy:{ball[1]}}}}},{{attr:{{cx:1690,cy:560}},duration:0.9,ease:"power1.inOut",immediateRender:false}},{r2(go)});'
                       f'tl.fromTo("#{cid}k",{{attr:{{opacity:0}}}},{{attr:{{opacity:1}},duration:0.3,ease:"power2.out"}},{r2(go + 0.8)});'
                       f'tl.fromTo("#{cid}h",{{strokeDashoffset:130}},{{strokeDashoffset:0,duration:0.22,ease:"power2.in"}},{r2(hd)});'
                       f'tl.fromTo("#{cid}b",{{attr:{{cx:1690,cy:560}}}},{{attr:{{cx:1812,cy:540}},duration:0.22,ease:"power2.in",immediateRender:false}},{r2(hd)});'
                       f'tl.fromTo("#{cid} .chl",{{scale:2.2,opacity:0}},{{scale:1,opacity:1,duration:0.2,ease:"power4.in"}},{r2(hd + 0.3)});')
            self.sound('kick', hd, 0.6, 0.9)
            self.tween(f'tl.fromTo("#{cid} .chs",{{scale:1,transformOrigin:"1690px 560px"}},{{scale:{1 + 0.02 * min(d, 8):.3f},duration:{r2(d)},ease:"none"}},{r2(t)});')   # the board pushes toward the goal the whole time
            return
        self.tween(f'tl.fromTo("#{cid}p",{{clipPath:"inset(0 100% 0 0)"}},{{clipPath:"inset(0 0% 0 0)",duration:0.7,ease:"power2.in"}},{r2(go)});'
                   f'tl.fromTo("#{cid}b",{{attr:{{cx:{ball[0]},cy:{ball[1]}}}}},{{attr:{{cx:1812,cy:{540 if play != "freekick" else 505}}},duration:0.7,ease:"power2.in",immediateRender:false}},{r2(go)});'
                   f'tl.fromTo("#{cid} .chl",{{scale:2.2,opacity:0}},{{scale:1,opacity:1,duration:0.2,ease:"power4.in"}},{r2(go + 0.75)});')

    def form(self, s, t, d):
        """A season as a strip of results — W / D / L tiles dealt one by one; a run can be bracketed and named."""
        cid = self.id('fm')
        cols = {'W': '#1F8A4C', 'D': '#8A8478', 'L': self.US if s.get('loss') == 'us' else '#D7192A'}
        n = s.get('per_row', 15)
        tw = min(210, (1620 - 12 * (n - 1)) // n) if s.get('big') else 96    # `big`: the strip IS the frame (a headline run), tiles sized to the full width
        size = f'height:{tw}px;font-size:{round(tw * 0.55)}px;' if s.get('big') else ''
        tiles = ''.join(f'<div class="ft" id="{cid}t{i}" style="{size}background:{cols[r]}">{r}</div>' for i, r in enumerate(s['results']))
        br = f'<div class="fbr" id="{cid}b"><span>{e(s["bracket"][2])}</span></div>' if s.get('bracket') else ''
        head = f'<div class="fh"><b>{e(s.get("title", ""))}</b><span>{e(s.get("sub", ""))}</span></div>'
        self.clip(cid, t, d, f'<div class="{"fw fwb" if s.get("big") else "fw"}">{head}<div class="fg" style="grid-template-columns:repeat({n},{tw}px)">{tiles}</div>{br}</div>', 9, 'paper')
        step = s.get('step', 0.07)
        for i in range(len(s['results'])):
            self.tween(f'tl.fromTo("#{cid}t{i}",{{scale:0,rotation:-20}},{{scale:1,rotation:0,duration:0.18,ease:"back.out(3)"}},{r2(t + 0.4 + step * i)});')
        if br:
            a, z, _ = s['bracket']
            at = t + s.get('bracket_at', 0.6 + step * len(s['results']))
            sel = ','.join(f'#{cid}t{i}' for i in range(a, z + 1))
            others = ','.join(f'#{cid}t{i}' for i in range(len(s['results'])) if not a <= i <= z)
            # a bracket over the whole strip leaves no tile outside it: GSAP throws on an empty selector and the page loses every tween after it
            self.tween((f'tl.to("{others}",{{opacity:0.25,duration:0.4}},{r2(at)});' if others else '') +
                       f'tl.to("{sel}",{{y:-14,duration:0.3,ease:"back.out(3)",stagger:0.05}},{r2(at)});'
                       f'tl.fromTo("#{cid}b",{{opacity:0,y:20}},{{opacity:1,y:0,duration:0.4}},{r2(at + 0.4)});')

    def board(self, s, t, d):
        """The fourth official's board: the minute, the number lit, the name coming on."""
        cid = self.id('bd')
        inner = (f'<div class="sbd"><div class="sbt">{e(s.get("minute", ""))}</div><div class="sbin"><small>IN</small><b>{e(s["in"])}</b></div>'
                 + (f'<div class="sbout"><small>OUT</small><b>{e(s["out"])}</b></div>' if s.get('out') else '') + '</div>')
        if s.get('bg'):
            self.image({'src': s['bg'], 'veil': 0.6, 'move': 'push'}, t, d, 1)
        self.clip(cid, t, d, inner, 9)
        self.tween(f'tl.fromTo("#{cid} .sbd",{{y:700}},{{y:0,duration:0.6,ease:"back.out(1.3)"}},{r2(t)});'
                   # the name lights up once (it blinked six times in half a second: rule 142)
                   f'tl.fromTo("#{cid} .sbin b",{{opacity:0.15}},{{opacity:1,duration:0.45,ease:"power2.out"}},{r2(t + 0.7)});')

    def press(self, s, t, d):
        """A newspaper page as a print on the desk; the camera finds the headline; a highlighter crosses it; the
        translation sits under it."""
        cid = self.id('pr')
        x, y, w, h = s.get('mark', (0.02, 0.02, 0.96, 0.12))
        inner = (f'<div class="prs" id="{cid}s"><img src="assets/img/{e(s["src"])}"><i class="hlm" id="{cid}h" style="left:{x * 100}%;top:{y * 100}%;width:{w * 100}%;height:{h * 100}%;background:{self.US}"></i></div>'
                 + (f'<div class="prt"><small>{e(s.get("small", ""))}</small><b>{e(s["translation"])}</b></div>' if s.get('translation') else ''))
        self.clip(cid, t, d, inner, 9, 'paper')
        self.tween(f'tl.fromTo("#{cid}s",{{rotation:-9,scale:0.6,y:200,opacity:0}},{{rotation:-3,scale:1,y:0,opacity:1,duration:0.6,ease:"power3.out"}},{r2(t)});'
                   f'tl.fromTo("#{cid}s",{{scale:1}},{{scale:{s.get("zoom", 1.5)},transformOrigin:"{x * 100 + w * 50}% {y * 100 + h * 50}%",duration:1.2,ease:"power2.inOut",immediateRender:false}},{r2(t + 1.0)});'
                   f'tl.fromTo("#{cid}h",{{scaleX:0}},{{scaleX:1,duration:0.6,ease:"power1.inOut",transformOrigin:"left center"}},{r2(t + 2.3)});'
                   f'tl.fromTo("#{cid} .prt",{{y:200,opacity:0}},{{y:0,opacity:1,duration:0.45,ease:"power3.out"}},{r2(t + 2.9)});')

    ENTRANCES = ('rise', 'slide', 'walk', 'toss', 'drop')

    ENTRANCES = ('walk', 'rise', 'toss', 'drop', 'slide')
    CUT_MAX_H, CUT_MARGIN = 700, 36   # a figure is part of the scene, never a second picture over it

    def cutout(self, s, t, d):
        """A cut-out (transparent PNG) entering the picture as the thing it is (owner, 14.11.2026: "elements and figures
        that enter the edit nicely into a situation in motion"): a person walks in from his side of the frame, a ball or
        a scarf is tossed in on an arc, a ticket or a newspaper drops onto the scene, a celebrating figure rises. It is
        cut from paper like the scene under it — a cream paper edge and a hard cast shadow — and always stands whole
        inside the frame (owner, 16.11.2026: "the PNG does not appear right"). Once in, it is the nearest depth plane:
        it drifts against the picture's own move, a little faster, so the scene has depth. Every entrance eases out and
        stops; nothing overshoots or comes back (rule 142). `way` 1 = it comes from the right; by default the side it stands on."""
        cid = self.id('cu')
        h = min(s.get('h', 1000), self.CUT_MAX_H)
        w = h
        try:
            from PIL import Image
            with Image.open(Path(getattr(self, 'root', '.')) / 'assets' / 'img' / s['src']) as im:
                w = round(h * im.width / im.height)
        except (OSError, ValueError):
            pass
        x = max(self.CUT_MARGIN, min(s.get('x', 1180), W - w - self.CUT_MARGIN))
        y = s.get('y', H - h)
        if s.get('ground', True):   # a figure stands on the frame's foot (or just below it), never floats with its feet cut mid-frame
            y = max(H - h - self.CUT_MARGIN, min(y, H - h + 40))
        way = s.get('way', 1 if x + w / 2 > W / 2 else -1)
        enter = s.get('enter', 'rise')
        self.clip(cid, t, d, f'<img class="cut" id="{cid}i" src="assets/img/{e(s["src"])}" style="left:{x}px;height:{h}px">', s.get('z', 6))
        I = f'#{cid}i'
        if enter == 'slide':
            dur, frm, to, ease = 0.9, f'x:{(w + 200) * way},y:{y},rotation:{2 * way}', f'x:0,y:{y},rotation:0', 'expo.out'
        elif enter == 'walk':
            dur, frm, to, ease = 1.5, f'x:{(w + 260) * way},y:{y + 12},rotation:{2 * way}', f'x:0,y:{y},rotation:0', 'power2.out'
        elif enter == 'toss':
            dur, frm, to, ease = 0.95, f'x:{600 * way},y:{y - 420},rotation:{-22 * way}', f'x:0,y:{y},rotation:{-3 * way}', 'power3.out'
        elif enter == 'drop':
            dur, frm, to, ease = 0.7, f'x:{-30 * way},y:{y - 680},rotation:{8 * way}', f'x:0,y:{y},rotation:{2 * way}', 'power3.in'
        else:
            dur, frm, to, ease = 0.85, f'x:0,y:{y + 420}', f'x:0,y:{y}', 'expo.out'
        self.tween(f'tl.fromTo("{I}",{{{frm},scale:1,opacity:1}},{{{to},duration:{dur},ease:"{ease}"}},{r2(t)});')
        if enter == 'drop':   # it lands with the sound of paper and settles flat, no bounce
            self.sound('page', t + dur - 0.05, None, 0.4)
            self.tween(f'tl.to("{I}",{{rotation:{1 * way},duration:0.35,ease:"power2.out"}},{r2(t + dur)});')
        elif enter == 'toss':
            self.sound('swish', t, None, 0.3)
        elif enter in ('walk', 'slide'):
            self.sound('whoosh', t, None, 0.22)
        rest = max(0.5, d - dur)
        # the nearest plane: it drifts against the camera, and breathes a little closer
        self.tween(f'tl.to("{I}",{{x:{-90 * way},scale:1.035,duration:{r2(rest)},ease:"sine.inOut"}},{r2(t + dur)});')

    def clockdev(self, s, t, d):
        """Time pressure, drawn: the match clock as a bar across the top that fills to the minute the line is at — a minute
        a claim records or the line itself says (the adapter checks it) — with that minute at its head. It fills once,
        eased, and stays; over the picture, never a card."""
        cid = self.id('ck')
        to = max(0.02, min(1.0, s['minute'] / s.get('span', 90)))
        self.clip(cid, t, d, f'<div class="ckb"><div class="ckt"><i id="{cid}f" style="background:{self.US}"></i></div>'
                             f'<b id="{cid}m" style="left:{to * 100:.1f}%">{e(s["minute"])}\'</b><span>{e(s.get("span", 90))}\'</span></div>', s.get('z', 8))
        fill = min(2.6, max(0.8, d - 0.6))
        self.tween(f'tl.fromTo("#{cid} .ckb",{{y:-90,opacity:0}},{{y:0,opacity:1,duration:0.3,ease:"power2.out"}},{r2(t)});'
                   f'tl.fromTo("#{cid}f",{{scaleX:0}},{{scaleX:{to:.4f},duration:{r2(fill)},ease:"power1.inOut"}},{r2(t + 0.2)});'
                   f'tl.fromTo("#{cid}m",{{opacity:0,y:-14}},{{opacity:1,y:0,duration:0.25,ease:"power2.out"}},{r2(t + 0.2 + fill)});')

    # ── the explainer and the kinetic line (docu/explainer.py: the VOX board's devices on this page) ─────────────────
    def odo(self, val: int, t: float, cls: str = '', suffix: str = '', dur: float = 0.9) -> str:
        """An odometer: one drum of digits per place, each rolling up from 0 to its digit and stopping (ease-out — it
        does not roll past and back: rule 142). Returns its HTML; the tweens are queued."""
        oid = self.id('od')
        digits = str(abs(int(val)))
        strip = '<br>'.join(str(k) for k in range(10))
        cols = ''.join(f'<span class="od"><span class="ods" id="{oid}c{j}">{strip}</span></span>' for j in range(len(digits)))
        for j, ch in enumerate(digits):
            self.tween(f'tl.fromTo("#{oid}c{j}",{{yPercent:0}},{{yPercent:{-10 * int(ch)},duration:{r2(dur + 0.12 * j)},ease:"power2.out",immediateRender:false}},{r2(t)});')
        return f'<span class="odo {cls}">{cols}{e(suffix)}</span>'

    def pen(self, pts: list[tuple[float, float]], t: float, dur: float, width: float = 9, colour: str | None = None) -> str:
        """A pen line drawn along `pts` (frame pixels): the stroke's dash runs out from its start — VOX's marker."""
        pid = self.id('pen')
        L = sum(((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2) ** 0.5 for a, b in zip(pts, pts[1:])) + 2
        path = 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts)
        self.tween(f'tl.fromTo("#{pid}",{{strokeDashoffset:{L:.1f}}},{{strokeDashoffset:0,duration:{r2(dur)},ease:"power1.inOut"}},{r2(t)});')
        return (f'<svg class="pen" width="1920" height="1080" viewBox="0 0 1920 1080"><path id="{pid}" d="{path}" stroke="{colour or self.INK}" stroke-width="{width}" '
                f'fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="{L:.1f}" stroke-dashoffset="{L:.1f}"/></svg>')

    def explain(self, s, t, d):
        """An explainer passage on the paper board: `timeline` (a pen-drawn clock, a labelled tick and an odometer minute
        for every recorded goal, the highlighter on the one that decided it), `number` (one counted number rolling up,
        its label underlined by the pen), `bars` (a record's cells growing to their own values). The board itself
        drifts the whole time — VOX's camera never stops (docs/fanlife/71)."""
        cid = self.id('xp')
        head = f'<small class="xpt">{e(s["title"])}</small>' if s.get('title') else ''
        inner, step = '', 0.0
        if s['form'] == 'timeline':
            x0, x1, y = 250.0, 1670.0, 640.0
            wob = [(x0 + (x1 - x0) * k / 24, y + (3.0 if k % 2 else -3.0) * (1 if k % 3 else -1)) for k in range(25)]   # a hand's line, not a ruler's
            inner += self.pen(wob, t + 0.25, 0.9)
            inner += f'<span class="xpe" style="left:{x0 - 150}px;top:{y - 44}px">{e(s["left"])}</span><span class="xpe" style="left:{x1 + 30}px;top:{y - 44}px">{e(s["right"])}</span>'
            for mk in s.get('marks') or []:
                mx = x0 + (x1 - x0) * mk['at']
                inner += f'<span class="xpm" style="left:{mx - 3:.0f}px;top:{y - 26}px"></span><span class="xpml" style="left:{mx - 60:.0f}px;top:{y + 40}px">{e(mk["label"])}</span>'
            ticks = s['ticks']
            step = min(1.1, max(0.4, (d - 2.6) / max(1, len(ticks))))
            for i, tk in enumerate(ticks):
                tx, at = x0 + (x1 - x0) * tk['at'], t + 1.1 + i * step
                up = i % 2 == 0   # neighbours sit above and below the line, so two late goals never print over each other
                tid = self.id('tk')
                hl = f'<i class="hl" id="{tid}h" style="background:{self.US}"></i>' if tk.get('hot') else ''
                lab = (f'<div class="xpk" id="{tid}" style="left:{tx - 300:.0f}px;top:{(y - 330) if up else (y + 60):.0f}px">'
                       f'<b class="{"hot" if tk.get("hot") else ""}">{hl}<em>{e(tk["label"])}</em></b>{self.odo(tk["value"], at + 0.1, "xpn", tk.get("suffix", ""))}</div>')
                inner += lab + self.pen([(tx, y - 70), (tx, y + 4)] if up else [(tx, y + 70), (tx, y - 4)], at, 0.25, 12, self.US if tk.get('hot') else None)
                self.tween(f'tl.fromTo("#{tid}",{{y:{30 if up else -30},opacity:0}},{{y:0,opacity:1,duration:0.3,ease:"power2.out"}},{r2(at)});')
                if tk.get('hot'):
                    self.tween(f'tl.fromTo("#{tid}h",{{scaleX:0}},{{scaleX:1,duration:0.4,ease:"power2.inOut"}},{r2(at + 0.35)});')
        elif s['form'] == 'number':
            inner += f'<div class="xpbig">{self.odo(s["value"], t + 0.35, "xpv", s.get("suffix", ""), 1.1)}<b id="{cid}l">{e(s["label"])}</b></div>'
            w = 60 * len(s['label']) * 0.62 + 80
            inner += self.pen([(960 - w / 2, 838), (960 - w / 6, 846), (960 + w / 6, 836), (960 + w / 2, 844)], t + 1.5, 0.45, 12, self.US)
            self.tween(f'tl.fromTo("#{cid}l",{{y:30,opacity:0}},{{y:0,opacity:1,duration:0.3,ease:"power2.out"}},{r2(t + 1.2)});')
        elif s['form'] == 'bars':
            for i, br in enumerate(s['bars']):
                bid, at = self.id('br'), t + 0.4 + 0.45 * i
                inner += (f'<div class="xpr" style="top:{330 + 170 * i}px"><span>{e(br["label"])}</span><div class="xpbar"><i id="{bid}" style="width:{max(2.0, 100 * br["share"]):.1f}%;'
                          f'background:{self.US if br.get("hot") else self.INK}"></i></div>{self.odo(br["value"], at, "xprn")}</div>')
                self.tween(f'tl.fromTo("#{bid}",{{scaleX:0}},{{scaleX:1,duration:0.7,ease:"power2.out",transformOrigin:"left center"}},{r2(at)});')
        self.clip(cid, t, d, f'<div class="xpb" id="{cid}b">{head}{inner}</div>', s.get('z', 9), 'paper')
        # the board's own camera: a slow push with a drift, one way, for as long as the passage runs
        self.tween(f'tl.fromTo("#{cid}b",{{scale:1,x:16}},{{scale:{1 + 0.012 * min(d, 8):.4f},x:-16,duration:{r2(d)},ease:"none"}},{r2(t)});')
        self.cams.append({'t': r2(t), 'd': r2(d), 'move': 'breath', 'ci': 0.5})

    def kinetic(self, s, t, d):
        """Kinetic type: the line's words arrive one by one — on the narrator's own word times for his line, evenly for
        a quote — each rising into place once; the highlighter runs under the word it turns on; the block drifts up
        the whole time. Over the picture, on a veil that fades in (never a flash: rule 142)."""
        cid = self.id('kn')
        hot = set(s.get('hot') or [])
        spans = ''
        for j, w in enumerate(s['words']):
            hl = f'<i class="hl" id="{cid}h{j}" style="background:{self.US}"></i>' if j in hot else ''
            spans += f'<span class="kw" id="{cid}w{j}">{hl}<em>{e(w["w"])}</em></span> '
            self.tween(f'tl.fromTo("#{cid}w{j}",{{y:46,opacity:0}},{{y:0,opacity:1,duration:0.2,ease:"power2.out"}},{r2(t + w["at"])});')
            if j in hot:
                self.tween(f'tl.fromTo("#{cid}h{j}",{{scaleX:0}},{{scaleX:1,duration:0.35,ease:"power2.inOut"}},{r2(t + w["at"] + 0.15)});')
        size = 132 if len(s['words']) <= 5 else 104 if len(s['words']) <= 9 else 78
        who = f'<small>{e(s["who"])}</small>' if s.get('who') else ''
        if s.get('vox'):   # the VOX pass: the sentence's core as paper strips low over the picture — the picture stays the shot
            for j in hot:
                spans = spans.replace(f'<span class="kw" id="{cid}w{j}">', f'<span class="kw hot" id="{cid}w{j}">')
            self.clip(cid, t, d, f'<div class="kvx" id="{cid}v"></div><div class="kn vx" id="{cid}b" style="font-size:{min(size, 96)}px">{spans}</div>', s.get('z', 14))
            self.tween(f'tl.fromTo("#{cid}v",{{opacity:0}},{{opacity:1,duration:0.35,ease:"power1.out"}},{r2(t)});'
                       f'tl.fromTo("#{cid}b",{{x:-10}},{{x:14,duration:{r2(d)},ease:"none"}},{r2(t)});')
            return
        self.clip(cid, t, d, f'<div class="kv" id="{cid}v"></div><div class="kn{" kq" if s.get("quote") else ""}" id="{cid}b" style="font-size:{size}px">{spans}{who}</div>', s.get('z', 14))
        # a line that starts WITH its beat brings its veil in on the cut: a veil fading over a picture that has just cut in bright read as a flash (qa.FLASH_RISE)
        self.tween(f'tl.fromTo("#{cid}v",{{opacity:{s.get("veil", 0.58) if s.get("on_cut") else 0}}},{{opacity:{s.get("veil", 0.58)},duration:0.35,ease:"power1.out"}},{r2(t)});'
                   f'tl.fromTo("#{cid}b",{{y:18}},{{y:-18,duration:{r2(d)},ease:"none"}},{r2(t)});')

    OBJ_SPOTS = ((1250, 300, 470), (1540, 520, 340), (170, 330, 440), (560, 560, 300))   # (left, top, size): right third first, then left

    def objects(self, s, t, d):
        """The object library on the picture (docu/vox.py, studio/objects.py): each object the sentence names enters as
        its word is said — dropped onto the scene, tossed in on an arc, or stamped down — in the club's inks with the hard
        paper shadow of a cut-out, its word on a paper strip beside it with the highlighter under it. Once in, objects
        float a little against the picture's move (the nearest plane). Every entrance eases out and stops (rule 142)."""
        cid = self.id('ob')
        side = s.get('side', 0)
        spots = self.OBJ_SPOTS[2:] + self.OBJ_SPOTS[:2] if side else self.OBJ_SPOTS
        inner, tw = '', []
        for j, it in enumerate(s['items'][:2]):
            x, y, size = spots[j]
            oid = f'{cid}o{j}'
            inner += f'<img class="obj" id="{oid}" src="assets/img/{e(it["src"])}" style="left:{x}px;top:{y}px;width:{size}px;height:{size}px">'
            at = t + it.get('at', 0.0)
            way = -1 if x > 960 else 1
            enter = ('drop', 'toss', 'stamp')[(j + len(it['id'])) % 3]
            if enter == 'drop':
                tw.append(f'tl.fromTo("#{oid}",{{y:-760,rotation:{10 * way},opacity:1}},{{y:0,rotation:{-3 * way},duration:0.6,ease:"power3.out"}},{r2(at)});')
                self.sound('page', at + 0.45, None, 0.35)
            elif enter == 'toss':
                tw.append(f'tl.fromTo("#{oid}",{{x:{-620 * way},y:-360,rotation:{-40 * way},opacity:1}},{{x:0,y:0,rotation:{4 * way},duration:0.75,ease:"power3.out"}},{r2(at)});')
                self.sound('swish', at, None, 0.3)
            else:
                tw.append(f'tl.fromTo("#{oid}",{{scale:1.9,rotation:{-8 * way},opacity:0}},{{scale:1,rotation:{-2 * way},opacity:1,duration:0.32,ease:"power4.in"}},{r2(at)});')
                self.sound('stamp', at + 0.3, None, 0.4)
            rest = max(0.4, d - it.get('at', 0.0) - 0.7)
            tw.append(f'tl.to("#{oid}",{{y:-22,x:{18 * way},rotation:{1.5 * way},duration:{r2(rest)},ease:"sine.inOut"}},{r2(at + 0.7)});')
            if j == 0 and it.get('word'):
                lid = f'{cid}l'
                lx = x - 40 if x > 960 else x + size - 120
                inner += (f'<div class="obl" id="{lid}" style="left:{min(1500, max(80, lx))}px;top:{y + size - 40}px">'
                          f'<i class="hl" id="{lid}h" style="background:{self.US}"></i><em>{e(it["word"])}</em></div>')
                tw.append(f'tl.fromTo("#{lid}",{{scaleX:0,opacity:1}},{{scaleX:1,duration:0.3,ease:"power3.out",transformOrigin:"left center"}},{r2(at + 0.35)});'
                          f'tl.fromTo("#{lid}h",{{scaleX:0}},{{scaleX:1,duration:0.35,ease:"power2.inOut"}},{r2(at + 0.6)});')
        self.clip(cid, t, d, f'<div class="obx">{inner}</div>', s.get('z', 11))
        for js in tw:
            self.tween(js)

    def locator(self, s, t, d):
        """A SCHEMATIC of where a ground sits in its city — drawn in code, labelled as not to scale, and never passed off
        as a map: a ring for the centre, a pin at a compass bearing from it, the pen joining them. `bearing` in degrees
        clockwise from north; the storyboard gives only what its sources say (a suburb north-west of the centre)."""
        import math
        cid = self.id('lc')
        cx, cy, r = 1060.0, 640.0, 150.0
        a = math.radians(s.get('bearing', 315))
        px, py = cx + 430 * math.sin(a), cy - 430 * math.cos(a)
        ring = [(cx + r * math.cos(k * math.pi / 12), cy + r * math.sin(k * math.pi / 12)) for k in range(25)]
        streets = ''.join(self.pen([(cx + (r + 40) * math.cos(b), cy + (r + 40) * math.sin(b)), (cx + 760 * math.cos(b), cy + 560 * math.sin(b))], t + 0.5 + 0.08 * k, 0.5, 4)
                          for k, b in enumerate(math.radians(x) for x in (20, 75, 140, 180, 290, 330)))
        inner = (streets + self.pen(ring, t + 0.2, 0.7, 8)
                 + self.pen([(cx + r * math.sin(a), cy - r * math.cos(a)), (px, py)], t + 1.3, 0.7, 10, self.US)
                 + f'<small class="xpt">{e(s.get("title", ""))}</small>'
                 f'<span class="lcc" style="left:{cx - 130:.0f}px;top:{cy - 36:.0f}px">{e(s["centre"]).replace(" ", "<br>")}</span>'
                 f'<div class="lcp" id="{cid}p" style="left:{px:.0f}px;top:{py:.0f}px"><i style="background:{self.US}"></i><b>{e(s["place"])}</b><span>{e(s.get("small", ""))}</span></div>'
                 f'<span class="lcn">N ↑</span><span class="lcs">SCHEMATIC · NOT TO SCALE</span>')
        self.clip(cid, t, d, f'<div class="xpb" id="{cid}b">{inner}</div>', s.get('z', 9), 'paper')
        self.tween(f'tl.fromTo("#{cid}p",{{scale:0,opacity:0}},{{scale:1,opacity:1,duration:0.35,ease:"power3.out"}},{r2(t + 1.9)});'
                   # the board's camera travels from the centre toward the pin the whole time (never a dead frame)
                   f'tl.fromTo("#{cid}b",{{scale:1,x:0,y:0}},{{scale:{1 + 0.03 * min(d, 8):.3f},x:{(cx - px) * 0.08:.0f},y:{(cy - py) * 0.08:.0f},duration:{r2(d)},ease:"none"}},{r2(t)});')
        self.cams.append({'t': r2(t), 'd': r2(d), 'move': 'rack', 'ci': 0.5})

    def ident(self, s, t, d):
        """The channel's ident, drawn — for a film rendered where the owner's opening video (studio/intros.py) cannot be
        fetched: the mark, the channel's name, one line travelling under it. It never stands still and never flashes."""
        cid = self.id('idn')
        self.clip(cid, t, d, f'<div class="idn" id="{cid}b"><img src="assets/img/fanlife.png"><b>FOOTBALL STORIES</b><small>{e(s.get("line", "A FAN LIFE FILM"))}</small>'
                             f'<i id="{cid}l" style="background:{self.US}"></i></div>', 13, 'ink')
        self.tween(f'tl.fromTo("#{cid}b img",{{scale:0.6,opacity:0}},{{scale:1,opacity:1,duration:0.5,ease:"power3.out"}},{r2(t)});'
                   f'tl.fromTo("#{cid}b b",{{y:40,opacity:0}},{{y:0,opacity:1,duration:0.4,ease:"power2.out"}},{r2(t + 0.35)});'
                   f'tl.fromTo("#{cid}b small",{{opacity:0}},{{opacity:1,duration:0.4}},{r2(t + 0.7)});'
                   f'tl.fromTo("#{cid}l",{{scaleX:0}},{{scaleX:1,duration:{r2(max(0.6, d - 0.5))},ease:"power1.inOut",transformOrigin:"left center"}},{r2(t + 0.3)});'
                   f'tl.fromTo("#{cid}b",{{scale:1}},{{scale:{1 + 0.03 * d:.3f},duration:{r2(d)},ease:"none"}},{r2(t)});')

    def lights(self, s, t, d):
        """The ground after the night: the picture darkens and the floodlights go out, one tower at a time."""
        cid = self.id('lt')
        glows = ''.join(f'<i class="glow" id="{cid}g{i}" style="left:{x}px;top:{y}px"></i>' for i, (x, y) in enumerate(s['towers']))
        self.image({'src': s['src'], 'veil': 0.0, 'move': 'push'}, t, d, 3)
        self.clip(cid, t, d, f'<div class="dark" id="{cid}d"></div>{glows}', 5)
        for i, at in enumerate(s.get('off_at', [1.5 + 1.1 * k for k in range(len(s['towers']))])):
            self.tween(f'tl.fromTo("#{cid}g{i}",{{opacity:1}},{{opacity:0,duration:0.12,immediateRender:false}},{r2(t + at)});')
            self.sound('clang', t + at, 1.2, 0.35)
        last = t + s.get('off_at', [1.5 + 1.1 * k for k in range(len(s['towers']))])[-1]
        self.tween(f'tl.fromTo("#{cid}d",{{opacity:0}},{{opacity:0.82,duration:{r2(max(0.4, last - t))},ease:"power1.in"}},{r2(t)});')

    def tint(self, s, t, d):
        """The picture in the club's colour — duotone, pushed in hard and then held on a slow push (a hero's entrance; no shake, rule 142)."""
        cid = self.id('tn')
        self.clip(cid, t, d, f'<div class="phi" id="{cid}i" style="background-image:url(assets/img/{e(s["src"])});background-position:{s.get("pos", "center")};filter:grayscale(1) contrast(1.4)"></div>'
                  f'<div class="duo" style="background:{self.US}"></div><div class="recon">{RECON if s.get("recon", True) else ""}</div>', 3, 'ph')
        self.tween(f'tl.fromTo("#{cid}i",{{scale:1.5}},{{scale:1.08,duration:0.35,ease:"power4.in"}},{r2(t)});'
                   f'tl.to("#{cid}i",{{scale:1.2,duration:{r2(max(0.5, d - 0.4))},ease:"none"}},{r2(t + 0.4)});')
        if s.get('tag'):
            tg = s['tag']
            tid = self.id('tag')
            self.clip(tid, t + 0.6, d - 0.6, f'<div class="tag" style="background:{self.INK}"><small>{e(tg.get("small", ""))}</small><b>{e(tg["big"])}</b></div>', 8)
            self.tween(f'tl.fromTo("#{tid} .tag",{{scaleX:0}},{{scaleX:1,duration:0.35,ease:"power3.out",transformOrigin:"left center"}},{r2(t + 0.6)});')

    def music(self, sb_music):
        for m in sb_music:
            f = Path(m['file']).name
            self.audio.append(f'<audio id="{self.id("mus")}" class="clip" src="assets/music/{e(f)}" data-start="{r2(m["at"])}" data-duration="{r2(m["d"])}" '
                              f'data-media-start="{m.get("from", 0)}" data-volume="{m.get("vol", 0.16)}"></audio>')

    def verdict(self, s, t, d):
        cid = self.id('vd')
        # a crest when one is on file, else the initials roundel the scoreboard uses — never a broken or borrowed badge
        inner = (f'<div class="vd"><div class="vl" style="background:{self.US}">{self.badge(s.get("us_crest"), s["us"])}<small>{e(s["us_line"])}</small><b>{s["us"]}</b></div>'
                 f'<div class="vr" style="background:{self.THEM}">{self.badge(s.get("them_crest"), s["them"])}<small>{e(s["them_line"])}</small><b>{s["them"]}</b></div></div>')
        self.clip(cid, t, d, inner, 11)
        self.tween(f'tl.fromTo("#{cid} .vl",{{xPercent:-100}},{{xPercent:0,duration:0.5,ease:"power3.out"}},{r2(t)});'
                   f'tl.fromTo("#{cid} .vr",{{xPercent:100}},{{xPercent:0,duration:0.5,ease:"power3.out"}},{r2(t + s.get("them_at", 1.6))});')

    def end(self, s, t, d):
        cid = self.id('end')
        frame = ''
        if self.sb.get('shape'):
            # editing rule 4, the shape as a frame: the film's last card sits inside its outline
            frame = (f'<svg class="endf" viewBox="0 0 100 100" fill="none" stroke="{self.US}" stroke-width="0.6" opacity="0.5">'
                     f'{SHAPES.get(self.sb["shape"], SHAPES["ticket"])}</svg>')
        self.clip(cid, t, d, f'<div class="end"><img src="assets/img/fanlife.png"><small>FAN LIFE · FOOTBALL STORIES</small><b>{e(s["title"])}</b><span>{e(s.get("line", ""))}</span>'
                             f'<i class="endl" id="{cid}l" style="background:{self.US}"></i></div>' + frame, 13, 'ink')
        self.tween(f'tl.fromTo("#{cid} .end",{{opacity:0,y:30}},{{opacity:1,y:0,duration:0.6,ease:"power2.out"}},{r2(t)});'
                   # the last card is on screen for YouTube's end screen: a line travels under it and the mark grows, so it is never a dead frame
                   f'tl.fromTo("#{cid}l",{{scaleX:0}},{{scaleX:1,duration:{r2(max(0.5, d - 0.3))},ease:"none",transformOrigin:"left center"}},{r2(t + 0.3)});'
                   f'tl.fromTo("#{cid} .end img",{{scale:1}},{{scale:{1 + 0.03 * min(d, 8):.3f},duration:{r2(d)},ease:"none"}},{r2(t)});')

    # ── assembly ────────────────────────────────────────────────────────────────────────────────────────────────────
    def transition(self, name: str, T: float, into: list[dict], out: list[dict]):
        """How an edited beat arrives (chosen by context in docu/editor.py). Each moves the incoming beat's clips and, where
        it overlaps, the outgoing beat's — whole clips, so cards, pictures and tags travel together.
          cut    a hard cut on the beat — nothing moves
          fade   the old 0.35 s fade, kept for grief, awe and the last cards
          whip   the old beat is pushed out to the left as the new one arrives from the right — one move, no blur
          tear   the paper tears across: a jagged line travels left to right, the new beat behind it
          dive   into and out of a chapter card: the old beat grows and thins, the new one settles from small
          match  a cut on the scale: the old beat pushes in over its last frames, the new one settles from the same size —
                 two centred heroes (a scoreboard, a number) read as one shape
        None dips to white, none repeats or reverses its own move (rule 142)."""
        if not into or name in (None, 'cut'):
            return
        IN, OUT = ','.join(f'#{m["id"]}' for m in into), ','.join(f'#{m["id"]}' for m in out)
        if name == 'fade':
            self.tween(f'tl.fromTo("{IN}",{{opacity:0}},{{opacity:1,duration:0.35}},{r2(T)});')
        elif name == 'whip':
            self.tween(f'tl.fromTo("{IN}",{{xPercent:100}},{{xPercent:0,duration:{TAILS["whip"]},ease:"power3.out"}},{r2(T)});')
            if out:
                self.tween(f'tl.fromTo("{OUT}",{{xPercent:0}},{{xPercent:-100,duration:{TAILS["whip"]},ease:"power3.out",immediateRender:false}},{r2(T)});')
        elif name == 'tear':
            edge = lambda p: ','.join(f'{p + j}% {12.5 * k}%' for k, j in enumerate(TEAR))  # noqa: E731
            poly = lambda side, p: f'polygon({side}% 0%,{edge(p)},{side}% 100%)'  # noqa: E731
            self.tween(f'tl.fromTo("{IN}",{{clipPath:"{poly(0, -8)}"}},{{clipPath:"{poly(0, 108)}",duration:{TAILS["tear"]},ease:"power2.inOut"}},{r2(T)});'
                       f'tl.set("{IN}",{{clipPath:"none"}},{r2(T + TAILS["tear"])});')
            if out:
                self.tween(f'tl.fromTo("{OUT}",{{clipPath:"{poly(100, -8)}"}},{{clipPath:"{poly(100, 108)}",duration:{TAILS["tear"]},ease:"power2.inOut",immediateRender:false}},{r2(T)});')
        elif name == 'dive' and self.sb.get('shape'):
            # the film's shape opens over the frame and the chapter appears inside it (one move, eased, no bounce)
            mk = shape_mask(self.sb['shape'])
            self.tween(f'tl.set("{IN}",{{webkitMaskImage:\'{mk}\',maskImage:\'{mk}\',webkitMaskRepeat:"no-repeat",maskRepeat:"no-repeat",'
                       f'webkitMaskPosition:"50% 50%",maskPosition:"50% 50%"}},{r2(T)});'
                       f'tl.fromTo("{IN}",{{webkitMaskSize:"6% 6%",maskSize:"6% 6%"}},{{webkitMaskSize:"900% 900%",maskSize:"900% 900%",duration:{TAILS["shape"]},ease:"power2.in"}},{r2(T)});'
                       f'tl.set("{IN}",{{webkitMaskImage:"none",maskImage:"none"}},{r2(T + TAILS["shape"])});')
            for m in out:   # anything the old beat laid on top (a board, a stamp) must not sit over the new chapter
                if m.get('layer', 0) > 9:
                    self.tween(f'tl.to("#{m["id"]}",{{opacity:0,duration:{TAILS["shape"] * 0.6:.2f},ease:"power1.in"}},{r2(T)});')
        elif name == 'dive':
            self.tween(f'tl.fromTo("{IN}",{{scale:0.82,opacity:0}},{{scale:1,opacity:1,duration:{TAILS["dive"]},ease:"power3.out"}},{r2(T)});')
            for m in out:
                self.tween(f'tl.fromTo("#{m["id"]}",{{scale:{m.get("sc", 1):.4f},opacity:1}},{{scale:1.5,opacity:0,duration:{TAILS["dive"]},ease:"power2.in",immediateRender:false}},{r2(T)});')
        elif name == 'slide':   # the VOX page turn upward: the new sentence pushes the old one off the top, one move
            self.tween(f'tl.fromTo("{IN}",{{yPercent:100}},{{yPercent:0,duration:{TAILS["slide"]},ease:"power3.out"}},{r2(T)});')
            if out:
                self.tween(f'tl.fromTo("{OUT}",{{yPercent:0}},{{yPercent:-100,duration:{TAILS["slide"]},ease:"power3.out",immediateRender:false}},{r2(T)});')
        elif name == 'zoom':    # through the frame: the old picture grows past the lens, the new one settles from a step back
            self.tween(f'tl.fromTo("{IN}",{{scale:0.86,opacity:0}},{{scale:1,opacity:1,duration:{TAILS["zoom"]},ease:"power3.out"}},{r2(T)});')
            for m in out:
                self.tween(f'tl.fromTo("#{m["id"]}",{{scale:{m.get("sc", 1):.4f}}},{{scale:1.35,duration:{TAILS["zoom"]},ease:"power2.in",immediateRender:false}},{r2(T)});')
        elif name == 'match':
            self.tween(f'tl.fromTo("{IN}",{{scale:1.1}},{{scale:1,duration:0.3,ease:"power2.out"}},{r2(T)});')
            for m in out:
                self.tween(f'tl.fromTo("#{m["id"]}",{{scale:{m.get("sc", 1):.4f}}},{{scale:{m.get("sc", 1) + 0.06:.4f},duration:0.2,ease:"power2.in",immediateRender:false}},{r2(T - 0.2)});')

    def subline(self, part: str, at: float, dd: float):
        """One subtitle: in the brand's face; with `karaoke`, each word lights in the club's colour as it is said."""
        sid = self.id('sub')
        if not self.sb.get('karaoke'):
            self.clip(sid, at, dd, f'<div class="sub">{e(part)}</div>', 20, 'subw')
            return
        words = part.split()
        wl = sum(len(w) + 1 for w in words)
        spans = ''.join(f'<span id="{sid}w{j}">{e(w)}</span> ' for j, w in enumerate(words))
        self.clip(sid, at, dd, f'<div class="sub kar">{spans}</div>', 20, 'subw')
        wt, span = at, max(0.3, dd - 0.15)
        for j, w in enumerate(words):
            step = span * (len(w) + 1) / wl
            self.tween(f'tl.fromTo("#{sid}w{j}",{{color:"{self.PAPER}",backgroundColor:"rgba(0,0,0,0)"}},{{color:"#ffffff",backgroundColor:"{self.US}",duration:0.06,immediateRender:false}},{r2(wt)});'
                       f'tl.to("#{sid}w{j}",{{backgroundColor:"rgba(0,0,0,0)",duration:0.06}},{r2(wt + step)});')
            wt += step

    def build(self, beats: list[dict]) -> float:
        """beats carry their absolute times (t, d) — see timeline(). Returns the film's duration."""
        agg_on = None
        out_ids: list[dict] = []   # the clips of the beat before that are still on screen at the cut
        for i, b in enumerate(beats):
            # A beat with `in` is an edited beat (docu/editor.py): it enters by a transition, and stays under the next
            # beat for as long as that beat's transition needs. A storyboard written by hand has no `in` and is drawn as before.
            edited = 'in' in b
            nxt = (beats[i + 1].get('in') or 'cut') if edited and i + 1 < len(beats) else None
            tail = 0.0 if nxt is None else TAILS['shape'] if nxt == 'dive' and self.sb.get('shape') else TAILS[nxt]
            k0, end = len(self.made), b['t'] + b['d']
            for s in b['shots']:
                dt = s.get('dt', 0)
                t, d = b['t'] + dt, s.get('d', b['d'] - dt)
                last = abs(t + d - end) < 0.02
                k = len(self.made)
                self._glass = bool(s.get('glass'))
                getattr(self, s['kind'])(s, t, d + (tail if last else 0))
                self._glass = False
                mine = self.made[k:]
                if edited and s['kind'] in CREEPS and len(mine) == 1 and d > 1.5 and s.get('shrink_at') is None:
                    span = d - 0.6
                    mine[0]['sc'] = 1 + CREEP * span
                    self.tween(f'tl.fromTo("#{mine[0]["id"]}",{{scale:1}},{{scale:{mine[0]["sc"]:.4f},duration:{r2(span)},ease:"none",immediateRender:false}},{r2(t + 0.6)});')
            if edited:
                mine = self.made[k0:]
                self.transition(b['in'], b['t'], [m for m in mine if abs(m['t'] - b['t']) < 0.02], out_ids)
                out_ids = [m for m in mine if end - 0.02 <= m['z'] <= end + 1.0]   # a held board runs on: no transition moves it
            for snd in b.get('sound', []):
                self.sound(snd[0], b['t'] + snd[1], snd[2] if len(snd) > 2 else None, snd[3] if len(snd) > 3 else 0.6)
            if b.get('flash') is not None:
                # a beat's `flash` is a quick dip to the ground colour and back — never a white frame (rule 142)
                self.tween(f'tl.fromTo("#flash",{{opacity:0}},{{opacity:0.5,duration:0.1,ease:"power1.in",immediateRender:false}},{r2(b["t"] + b["flash"])});'
                           f'tl.to("#flash",{{opacity:0,duration:0.3,ease:"power2.out"}},{r2(b["t"] + b["flash"] + 0.1)});')
            if b.get('agg') is not None:
                if agg_on is None:
                    agg_on = b['t']
                    self.agg0 = b['agg']
                else:
                    self.agg_moves.append((b['t'] + b.get('agg_dt', 0.6), b['agg']))
            if b.get('agg_off'):
                self.agg_window = (agg_on, b['t'])
            typed = on_screen(b)
            for (part, at, dd) in b.get('subs', []):
                if not doubled(part, at, dd, typed):
                    self.subline(part, at, dd)
            if b.get('vo'):
                self.audio.append(f'<audio id="{self.id("vo")}" class="clip" src="assets/vo/{b["vo_file"]}" data-start="{r2(b["vo_t"])}" data-duration="{r2(b["vo_d"])}" data-volume="1.15"></audio>')
                # subtitles in short pieces (two lines at most), each on screen for its share of the line
                parts = chunks(b['vo'], self.sb.get('sub_limit', 64))
                total = sum(len(x) for x in parts)
                at = b['vo_t']
                for k, part in enumerate(parts):
                    dd = b['vo_d'] * len(part) / total
                    if not doubled(part, at, dd, typed):
                        self.subline(part, at, dd + (0.15 if k == len(parts) - 1 else 0))
                    at += dd
        if agg_on is not None:
            a0, a1 = getattr(self, 'agg_window', (agg_on, beats[-1]['t']))
            sb = self.sb
            self.clip('agg', a0, a1 - a0, f'<div class="agg"><div class="ah">{e(sb.get("agg_label", "AGGREGATE"))}</div><div class="ar"><img src="assets/img/{e(sb["us"]["crest"])}"><b id="aggu">{self.agg0[0]}</b><i>–</i><b id="aggt">{self.agg0[1]}</b><img src="assets/img/{e(sb["them"]["crest"])}"></div></div>', 12)
            self.tween(f'tl.fromTo("#agg .agg",{{x:500}},{{x:0,duration:0.5,ease:"power3.out"}},{r2(a0)});')
            last = list(self.agg0)
            for at, (u, th) in self.agg_moves:
                for sel, old, new in (('#aggu', last[0], u), ('#aggt', last[1], th)):
                    if old != new:
                        self.tween(f'tl.set("{sel}",{{textContent:"{new}"}},{r2(at)});tl.fromTo("{sel}",{{scale:1.9,color:"#ffffff"}},{{scale:1,color:"{self.PAPER}",duration:0.4,ease:"back.out(3)",immediateRender:false}},{r2(at)});')
                last = [u, th]
        return beats[-1]['t'] + beats[-1]['d']

    def page(self, D: float) -> str:
        fonts = ''.join(f"@font-face{{font-family:'{n}';src:url(assets/fonts/{f}.woff2)}}" for n, f in FACES)
        P, INK, US = self.PAPER, self.INK, self.US
        css = fonts + f'''
#root{{background:{INK};overflow:hidden;font-family:'Caps'}}
.clip{{position:absolute;left:0;top:0;width:1920px;height:1080px}}
video.clip{{width:1920px;height:1080px}}
.ph{{overflow:hidden}} .phi{{position:absolute;left:0;top:0;width:1920px;height:1080px;background-size:cover}}
''' + C.CSS + XP_CSS.replace('INK', INK).replace('PAPER', P) + f'''
.veil{{position:absolute;left:0;top:0;width:1920px;height:1080px;background:{INK}}}
.recon{{position:absolute;right:40px;top:34px;font:700 18px 'Mono';color:{P};opacity:.75;letter-spacing:1px}} .r2{{right:120px;top:90px}}
.frame{{border:58px solid {P};box-sizing:border-box}} .paper{{background:{P}}} .ink{{background:{INK}}}
.paper.glass{{background:{glass(P, 0.93, 0.5)}}} .ink.glass{{background:{glass(INK, 0.88, 0.35)}}}
.sb{{position:absolute;left:260px;top:360px;width:1400px;height:230px;display:flex;background:{P};box-shadow:14px 14px 0 {INK};border:5px solid {INK}}}
.sbl,.sbr{{flex:1;display:flex;align-items:center;gap:26px;padding:0 34px;font:400 46px/1 'Head';color:#fff}}
.sbr{{justify-content:flex-end;color:{INK};border-left:5px solid {INK}}} .sbr .nm{{background:#fff;padding:6px 12px;border:4px solid {INK}}}
.sbl img,.sbr img{{width:150px;height:150px;object-fit:contain;background:#fff;border-radius:50%;padding:8px;border:4px solid {INK}}}
.sbc{{width:360px;display:flex;align-items:center;justify-content:center;gap:16px;background:{INK};color:{P};font:400 150px/1 'Ultra'}} .sbc i{{font-style:normal;font-size:90px}}
.sbcap{{position:absolute;left:260px;top:612px;width:1400px;text-align:center;font:700 34px 'Cond';color:{P};letter-spacing:6px}}
.stamp{{width:auto;height:auto;padding:4px 40px;border:14px solid;font:400 230px/1 'Ultra';background:rgba(241,232,211,.08)}}
.q{{position:absolute;left:0;width:1920px;top:250px;text-align:center;font:400 104px/1.12 'Head';color:{P};text-shadow:6px 6px 0 {INK}}} .q em{{font-style:normal;color:#fff;padding:0 14px}}
.ticket.tw{{left:850px;width:860px}} .ticket{{position:absolute;left:460px;top:330px;width:1000px;padding:40px 60px;background:#fff;border:6px dashed {INK};text-align:center;color:{INK}}}
.ticket small{{display:block;font:700 40px 'Cond';letter-spacing:10px}} .ticket b{{display:block;font:400 132px/1 'Ultra'}} .ticket span{{display:block;font:700 30px 'Cond';letter-spacing:3px;margin-top:14px}}
.lt{{position:absolute;left:58px;top:820px;background:{INK};color:{P};padding:18px 34px;display:flex;gap:26px;align-items:baseline}} .lt b{{font:400 58px 'Ultra';color:#fff}} .lt span{{font:700 32px 'Cond';letter-spacing:2px}}
.clockbar{{position:absolute;left:140px;top:120px;width:1640px;display:flex;align-items:center;gap:20px;font:700 40px 'Cond';color:{INK}}}
.cbt{{flex:1;height:36px;background:rgba(20,17,13,.25);border:4px solid {INK}}} .cbf{{height:100%;transform-origin:left center}}
.cbcap{{position:absolute;left:0;top:64px;background:{INK};color:{P};padding:6px 18px;letter-spacing:4px}}
.tag{{position:absolute;left:120px;top:690px;padding:18px 40px 22px;color:#fff;box-shadow:12px 12px 0 {INK}}} .tag small{{display:block;font:700 34px 'Cond';letter-spacing:6px;opacity:.9}} .tag b{{display:block;font:400 112px/1 'Head'}}
.mini{{position:absolute;right:120px;top:190px;background:{P};border:6px solid {INK};padding:16px 30px;display:flex;gap:24px;align-items:center;font:700 36px 'Cond';color:{INK};box-shadow:10px 10px 0 {INK}}} .mini b{{font:400 80px 'Ultra'}}
.lead{{position:absolute;left:0;top:430px;width:1920px;text-align:center;color:#fff;font:400 120px/1.3 'Ultra';letter-spacing:4px;white-space:nowrap}}
.agg{{position:absolute;right:60px;top:80px;background:{INK};border:5px solid {P};padding:14px 26px;color:{P}}} .ah{{font:700 26px 'Cond';letter-spacing:8px;text-align:center}}
.ar{{display:flex;align-items:center;gap:22px;font:400 76px/1 'Ultra'}} .ar img{{width:78px;height:78px;object-fit:contain;background:#fff;border-radius:50%;padding:4px}} .ar img:last-child{{margin-left:10px}} .ar i{{font-style:normal}} .ar b{{display:inline-block;width:92px;text-align:center}}
.ledger{{position:absolute;left:220px;top:170px;width:1480px;color:{INK}}}
.lh,.lrow{{display:grid;grid-template-columns:1fr 340px 340px;align-items:center;text-align:center}} .lh b{{font:400 54px 'Head'}}
.lrow{{border-top:5px solid {INK};padding:28px 0}} .lrow span{{text-align:left;font:700 48px 'Cond';letter-spacing:3px}} .lrow b{{font:400 160px/1 'Ultra'}}
.circ{{position:absolute;width:300px;height:210px;top:50%;margin-top:-105px}} .lc .circ{{width:240px;height:150px;margin-top:-75px;margin-left:30px}} .note{{position:absolute;width:300px;text-align:center;font:700 34px 'Mono';top:100%;margin-top:6px}}
.rule{{position:absolute;left:260px;top:220px;width:1400px;color:{INK}}} .rule small{{font:700 40px 'Cond';letter-spacing:10px}} .rule b{{display:block;font:400 132px/1.05 'Ultra';margin:12px 0 30px}} .rule p{{font:700 52px/1.3 'Mono';margin:0}}
.vd{{position:absolute;left:0;top:0;width:1920px;height:1080px;display:flex}} .vl,.vr{{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;color:#fff;text-align:center}}
.vl img,.vr img{{width:230px;height:230px;object-fit:contain;background:#fff;border-radius:50%;padding:10px}} .vl small,.vr small{{font:700 46px 'Cond';letter-spacing:10px}} .vl b,.vr b{{font:400 92px/1.05 'Head'}}
.end{{position:absolute;left:0;top:190px;width:1920px;text-align:center;color:{P}}} .end img{{width:260px;height:260px}} .end small{{display:block;font:700 36px 'Cond';letter-spacing:10px;margin-top:20px}} .end b{{display:block;font:400 96px/1.1 'Head';margin:16px 0}} .end span{{font:700 32px 'Mono';opacity:.85}}
.subw .sub{{position:absolute;left:50%;transform:translateX(-50%);max-width:1400px;top:948px;text-align:center;font:700 38px/1.25 'Cond';color:#fff;background:rgba(20,17,13,.82);padding:8px 22px}}
.ini{{width:150px;height:150px;border-radius:50%;background:#fff;border:4px solid {INK};display:flex;align-items:center;justify-content:center;font:400 54px 'Ultra';color:{INK};font-style:normal}}
.q small{{display:block;font:700 40px 'Cond';letter-spacing:10px;color:{P};margin-bottom:26px}}
.lead small{{display:block;font:700 40px 'Cond';letter-spacing:6px;line-height:1.2;margin-top:-6px}}
.tc{{top:300px;box-shadow:16px 16px 0 {INK}}} .tc b{{font-size:96px}}
.lc .lrow{{padding:10px 0}} .lc .lrow b{{font-size:92px}} .lc .lrow span{{font-size:40px}} .lc .lh span{{text-align:left;font:700 40px 'Cond';letter-spacing:6px}}
.stat{{position:absolute;left:0;top:250px;width:1920px;text-align:center}} .stat b{{display:block;font:400 330px/1 'Ultra';color:#fff;text-shadow:12px 12px 0 {INK}}}
.stat small{{display:inline-block;margin-top:24px;padding:10px 34px;font:700 52px 'Cond';letter-spacing:6px;color:#fff;box-shadow:10px 10px 0 {INK}}}
.tally{{position:absolute;left:160px;top:250px;width:1600px;color:{INK}}} .tally>small{{display:block;font:700 46px 'Cond';letter-spacing:10px;margin-bottom:40px}}
.tcs{{display:flex;gap:24px}} .tcs div{{flex:1;border:6px solid {INK};background:#fff;padding:24px 0;text-align:center;box-shadow:10px 10px 0 {INK}}} .tcs b{{display:block;font:400 150px/1 'Ultra'}} .tcs span{{font:700 36px 'Cond';letter-spacing:5px}}
.card{{position:absolute;left:300px;top:240px;width:1320px;background:{P};border:6px solid {INK};padding:46px 60px;color:{INK};box-shadow:18px 18px 0 {INK}}}
.card small{{display:block;font:700 40px 'Cond';letter-spacing:8px}} .card b{{display:block;font:400 72px/1.12 'Head';margin-top:14px}} .card p{{font:700 38px/1.3 'Mono';margin:22px 0 0}}
.paper .card{{box-shadow:none;border:none;background:transparent;left:220px;width:1480px}}
.quote{{position:absolute;left:240px;top:170px;width:1440px;color:{INK}}} .quote i{{display:block;font:400 260px/0.7 'Ultra';font-style:normal}} .quote b{{display:block;font:400 74px/1.18 'Head'}} .quote small{{display:block;margin-top:34px;font:700 40px 'Cond';letter-spacing:6px}}
.follow{{position:absolute;left:560px;top:150px;width:800px;background:#fff;border:6px solid {INK};padding:40px 50px;box-shadow:18px 18px 0 {INK};color:{INK}}}
.follow b{{display:block;font:400 110px/1 'Ultra';margin-bottom:24px}} .fl{{display:flex;gap:20px;align-items:baseline;border-bottom:4px dashed {INK};padding:14px 0;font:700 40px 'Cond';letter-spacing:4px}} .fl i{{font:400 50px 'Head';font-style:normal}}
.btn{{position:relative;margin-top:34px;height:96px;color:#fff;font:700 52px/96px 'Cond';letter-spacing:6px;text-align:center;box-shadow:8px 8px 0 {INK}}} .btn span{{position:absolute;left:0;right:0}} .b2{{opacity:0}}
.tbw{{position:absolute;left:460px;top:60px;width:1000px;transform-origin:50% 0}} .tbl{{background:#fff;border:6px solid {INK};box-shadow:16px 16px 0 {INK}}}
.tr{{display:flex;align-items:center;height:46px;border-bottom:2px solid rgba(20,17,13,.25);font:700 30px 'Caps';color:{INK}}} .tr i{{width:80px;text-align:center;font:400 34px 'Ultra';font-style:normal}} .tr span{{flex:1}} .tr b{{width:240px;height:18px;margin-right:30px;background:rgba(20,17,13,.18)}}
.tr.lit{{background:{US};color:#fff}} .drop{{position:relative;height:10px;background:#D7192A}} .drop em{{position:absolute;right:20px;top:-42px;font:700 30px 'Cond';letter-spacing:6px;color:#D7192A;font-style:normal}}
.word{{position:absolute;left:0;top:0;width:1920px;height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}}
.word b{{font-family:'Ultra';font-weight:400;line-height:0.95;letter-spacing:2px}} .word small{{font:700 46px 'Caps';letter-spacing:10px;margin-top:34px}}
.cty{{position:absolute;left:0;top:0;width:1920px;height:1080px;display:flex;overflow:hidden}} .cl,.cr{{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;gap:14px}}
.cl b,.cr b{{font:400 92px/1 'Ultra';max-width:820px;text-align:center}} .cl small,.cr small{{font:700 40px 'Caps';letter-spacing:10px}} .cl img,.cr img{{width:200px;height:200px;object-fit:contain;background:#fff;border-radius:50%;padding:10px;border:6px solid {INK}}}
.cr{{filter:brightness(.82)}} .bolt{{position:absolute;left:0;top:0;width:1920px;height:1080px}}
.ctmid{{position:absolute;left:660px;top:110px;width:600px;text-align:center;background:{INK};color:{P};font:400 56px/1.3 'Ultra';padding:10px 0;box-shadow:12px 12px 0 rgba(0,0,0,.4)}}
.chk{{position:absolute;left:0;top:0;width:1920px;height:1080px;background:#1E3A2B}} .chs{{position:absolute;left:0;top:0;width:1920px;height:1080px}} .chx{{font:400 70px 'Ultra'}}
.chc{{position:absolute;left:70px;top:30px;background:{INK};color:{P};padding:12px 30px;text-align:center;border:5px solid {P}}} .chc small{{display:block;font:700 28px 'Cond';letter-spacing:8px}} .chc b{{font:400 84px/1 'Ultra'}}
.chl{{position:absolute;left:330px;top:46px;color:#fff;padding:14px 34px;font:400 76px/1 'Ultra';box-shadow:10px 10px 0 {INK}}}
.sbd{{position:absolute;left:560px;top:250px;width:800px;background:#0B0B0B;border:12px solid #2a2a2a;border-radius:18px;padding:30px 40px;box-shadow:0 30px 60px rgba(0,0,0,.6)}}
.sbt{{font:400 120px/1 'Ultra';color:#ff3b30;text-align:center;letter-spacing:8px;text-shadow:0 0 22px #ff3b30}} .sbin,.sbout{{display:flex;gap:30px;align-items:baseline;margin-top:20px}}
.sbin small,.sbout small{{font:700 40px 'Cond';letter-spacing:6px;color:#9be37b}} .sbout small{{color:#ff6b5b}} .sbin b,.sbout b{{font:400 84px/1 'Head';color:#fff;text-shadow:0 0 14px rgba(255,255,255,.6)}}
.prs{{position:absolute;left:510px;top:70px;width:900px;background:#fff;padding:18px;box-shadow:24px 24px 0 rgba(20,17,13,.45);transform-origin:50% 20%}} .prs img{{display:block;width:100%}}
.hlm{{position:absolute;mix-blend-mode:multiply;opacity:.55}} .prt{{position:absolute;left:180px;top:720px;width:1560px;background:{INK};color:{P};text-align:center;padding:20px 30px}}
.prt small{{display:block;font:700 30px 'Cond';letter-spacing:8px;opacity:.85}} .prt b{{display:block;font:400 56px/1.15 'Ultra';color:#fff}}
.cut{{position:absolute;top:0;filter:drop-shadow(4px 0 0 #F4ECD8) drop-shadow(-4px 0 0 #F4ECD8) drop-shadow(0 4px 0 #F4ECD8) drop-shadow(0 -4px 0 #F4ECD8) drop-shadow(18px 22px 0 rgba(20,17,13,.42));will-change:transform}}
.l2{{display:block;margin-top:14px;font:900 46px/1.1 'Local','Cond';letter-spacing:2px;font-style:normal;text-transform:none;opacity:.92}}
.ticket .l2{{font-size:40px;color:{INK}}} .q .l2{{font-size:52px;color:{P}}}
.grain{{position:absolute;inset:-50%;width:200%;height:200%;pointer-events:none;opacity:.06;mix-blend-mode:multiply;background:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}}
.vgn{{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 55%,rgba(10,8,6,.38) 100%)}}
.glow{{position:absolute;width:260px;height:260px;margin:-130px 0 0 -130px;border-radius:50%;background:radial-gradient(circle,rgba(255,250,225,.95) 0,rgba(255,240,200,.45) 30%,rgba(255,240,200,0) 70%);mix-blend-mode:screen}}
.dark{{position:absolute;left:0;top:0;width:1920px;height:1080px;background:#05060a;opacity:0}}
.prn{{position:absolute;left:210px;top:92px;width:1500px;height:844px;overflow:hidden;border:18px solid #fff;box-shadow:22px 22px 0 rgba(20,17,13,.5)}} .prn .phi{{width:100%;height:100%}}
.duo{{position:absolute;left:0;top:0;width:1920px;height:1080px;mix-blend-mode:multiply;opacity:.85}}
.subw .sub.kar{{top:auto;bottom:54px;font:400 46px/1.25 'Head';text-transform:uppercase;letter-spacing:1px;color:{P};background:rgba(20,17,13,.88);padding:10px 26px;max-width:1500px}} .sub.kar span{{padding:0 4px}}
.flapw{{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px}} .flaps{{display:flex;gap:14px;perspective:1400px}} .fp{{position:relative;width:170px;height:240px}} .fp b{{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:{INK};color:{P};font:400 190px/1 'Ultra';border-radius:10px;box-shadow:0 10px 0 rgba(0,0,0,.35);backface-visibility:hidden;transform-origin:50% 50%}} .fp b::after{{content:'';position:absolute;left:0;right:0;top:50%;height:3px;background:rgba(255,255,255,.18)}} .fp .fb{{transform:rotateX(90deg)}} .win{{position:absolute;left:130px;top:170px;width:740px;height:740px;background-size:cover;background-position:center;-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}} .endf{{position:absolute;left:50%;top:50%;width:980px;height:980px;margin:-490px 0 0 -490px;pointer-events:none}} .flapw.corner{{inset:auto;right:90px;top:120px;gap:12px;align-items:flex-end}} .flapw.corner .fp{{width:74px;height:104px}} .flapw.corner .fp b{{font-size:80px;border-radius:6px;box-shadow:0 6px 0 rgba(0,0,0,.35)}} .flapw.corner small{{font-size:24px;letter-spacing:5px;padding:5px 12px}} .flapw small{{font:700 40px 'Caps';letter-spacing:10px;color:{INK};background:{P};padding:8px 22px}} .fw{{position:absolute;left:150px;top:150px;width:1620px;color:{INK}}} .fh b{{display:block;font:400 92px/1 'Ultra'}} .fh span{{font:700 40px 'Caps';letter-spacing:8px}}
.fg{{display:grid;gap:12px;margin-top:40px}} .ft{{height:96px;display:flex;align-items:center;justify-content:center;color:#fff;font:400 52px 'Ultra';border:4px solid {INK};box-shadow:6px 6px 0 {INK}}}
.fbr{{margin-top:44px;text-align:left}} .fwb{{top:120px}} .fwb .fh b{{font-size:170px}} .fwb .fh span{{font-size:46px}} .fwb .fbr span{{font-size:60px;padding:12px 30px}}
.fbr span{{display:inline-block;margin-top:14px;background:{INK};color:#fff;font:700 40px 'Caps';letter-spacing:4px;padding:8px 22px}}
.tr b.pt{{background:none;height:auto;width:120px;text-align:right;font:400 34px 'Ultra'}} .tr.mk{{background:{INK};color:{P}}}
.lcc{{position:absolute;width:260px;text-align:center;font:400 34px/1.0 'Ultra'}} .lcn{{position:absolute;left:1640px;top:150px;font:700 44px 'Cond';letter-spacing:4px}}
.lcs{{position:absolute;left:250px;top:880px;font:700 26px 'Mono';opacity:.7;letter-spacing:2px}}
.lcp{{position:absolute;width:0;height:0}} .lcp i{{position:absolute;left:-22px;top:-22px;width:44px;height:44px;border-radius:50%;border:6px solid {INK}}}
.lcp b{{position:absolute;left:-640px;top:-120px;width:620px;text-align:right;font:400 60px/1 'Ultra';white-space:nowrap}} .lcp span{{position:absolute;left:-640px;top:-52px;width:620px;text-align:right;font:700 30px 'Cond';letter-spacing:4px;white-space:nowrap}}
.idn{{position:absolute;left:0;top:210px;width:1920px;text-align:center;color:{P}}} .idn img{{width:300px;height:300px}} .idn b{{display:block;font:400 110px/1.1 'Ultra';letter-spacing:6px;color:#fff;margin-top:18px}}
.idn small{{display:block;font:700 38px 'Cond';letter-spacing:12px;margin-top:14px}} .idn i{{display:block;width:640px;height:10px;margin:28px auto 0}}
.endl{{display:block;width:900px;height:10px;margin:30px auto 0}}
.chm{{position:absolute;left:44px;top:30px;width:84px;height:84px;opacity:.9}}
#flash{{position:absolute;left:0;top:0;width:1920px;height:1080px;background:{INK};opacity:0;z-index:30}}
'''
        if not self.sb.get('silent'):
            bed = self.sb.get('bed', 0.28)
            self.sound('bed', 0.2, max(1, D - 5), bed)
        return (f'<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=1920, height=1080">'
                f'<script src="assets/gsap.min.js"></script><style>{css}</style></head><body>\n'
                f'<div id="root" data-composition-id="main" data-start="0" data-duration="{r2(D)}" data-width="1920" data-height="1080" data-fps="30" data-motion-blur="on" data-motion-blur-shutter="90" data-layout-allow-overlap data-layout-allow-overflow>\n'
                + '\n'.join(self.clips) + '\n<div id="flash" data-layout-ignore></div>\n' + '\n'.join(self.audio)
                + '\n</div>\n<script>\n' + C.EASES_JS + '\nconst tl=gsap.timeline({paused:true});\n' + '\n'.join(self.tw)
                + '\nwindow.__timelines=window.__timelines||{};window.__timelines["main"]=tl;tl.seek(0);\n</script></body></html>\n')


def timeline(beats: list[dict], vo: dict[str, float], lead_in: float = 1.5) -> list[dict]:
    """Lay the beats end to end on their narration: a beat lasts its line plus its own pause (`pad`, default 0.5 s);
    a beat with no line lasts `hold` seconds. `pre` holds pictures before the line starts."""
    t = 0.0
    out = []
    for i, b in enumerate(beats):
        b = dict(b)
        pre = b.get('pre', lead_in if i == 0 else 0.0)
        if b.get('vo'):
            b['vo_file'] = f'l{i:03d}.wav'
            b['vo_d'] = vo[b['vo_file']]
            b['vo_t'] = t + pre
            b['d'] = pre + b['vo_d'] + b.get('pad', 1.0)
        else:
            b['d'] = b.get('hold', 2.0)
        b['t'] = t
        t += b['d']
        out.append(b)
    return out


def resolve_music(music: list[dict], beats: list[dict], D: float) -> list[dict]:
    """Music cues name a beat (`from_beat`, `to_beat`, indices) rather than a second, so a re-recorded line never
    leaves a track starting in the wrong place."""
    out = []
    for m in music:
        a = beats[m['from_beat']]['t'] + m.get('offset', 0)
        z = beats[m['to_beat']]['t'] + beats[m['to_beat']]['d'] if m.get('to_beat') is not None else D
        out.append({**m, 'at': a, 'd': max(0.5, z - a)})
    return out


def speak(beats: list[dict], out: Path, voice: str = 'bm_george', speed: float = 0.92, names: dict | None = None) -> dict[str, float]:
    """The narrator: Kokoro (free, Apache-2.0), the same voice the studio's PIL engine uses by default. With `names`
    (the storyboard's `pronounce`: {} or the film's own overrides) every name goes through the studio's lexicon
    (studio/pronounce.py) — AEK as the owner decided, the Greek names as a prepared commentator says them; a beat's
    own `say` still wins."""
    import soundfile as sf
    from kokoro_onnx import Kokoro
    import os
    d = Path(os.environ.get('KOKORO_DIR', str(Path.home() / 'models')))
    k = Kokoro(str(d / 'kokoro-v1.0.onnx'), str(d / 'voices-v1.0.bin'))
    out.mkdir(parents=True, exist_ok=True)
    durs = {}
    for i, b in enumerate(beats):
        if not b.get('vo'):
            continue
        f = f'l{i:03d}.wav'
        if names is not None and not b.get('say'):
            from .. import pronounce as P
            ph, _ = P.phonemes(b['vo'], P.Pronouncer(names), k)
            a, sr = k.create(ph, voice=voice, speed=speed, lang='en-gb', is_phonemes=True)
        else:
            a, sr = k.create(b.get('say', b['vo']), voice=voice, speed=speed, lang='en-gb')
        sf.write(out / f, a, sr)
        durs[f] = round(len(a) / sr, 3)
    return durs


def check(sb: dict, beats: list[dict], D: float) -> list[str]:
    """The gate before the owner sees anything: length against the plan, the aggregate only ever moving by one goal,
    every picture labelled, no line on screen without its narration."""
    errs = []
    want = sb.get('minutes')
    if want and not (want[0] * 60 <= D <= want[1] * 60):
        errs.append(f'length {D / 60:.1f} min is outside the plan {want[0]}–{want[1]} min')
    last = None
    for b in beats:
        if b.get('agg') is not None:
            if last is not None and sum(b['agg']) - sum(last) not in (0, 1):
                errs.append(f'aggregate jumps from {last} to {b["agg"]}')
            last = b['agg']
    for b in beats:
        if not b.get('shots') and b.get('vo'):
            errs.append(f'a narrated beat with nothing on screen: {b["vo"][:40]}')
    return errs



PUNCH_SNAP = 0.6   # a punch this close to a picture cut is moved onto it (see edited)

def edited(sb: dict, beats: list[dict], root: Path) -> list[dict]:
    """A HAND-WRITTEN storyboard cut by the studio's own editor (`"edit": true` — the model film, docs/fanlife/74): the
    writer gives each beat its `meta` (type, chapter, emotion, intensity) and the editor does what it does for the
    pipeline's films — no still past MAX_STILL, a transition into every beat, a named camera move by the emotion, a
    chapter that ends on its turn. The cut, its errors and the language mix are written beside the page
    (`docu-shots.json`), where the producer's gate (studio/qa.experience) reads them. Word starts are the line's words
    spread over its voice by their length — Kokoro gives no timings — so a cut still lands near a word."""
    from . import editor as E
    from . import explainer as X
    for i, b in enumerate(beats):
        m = b.setdefault('meta', {})
        m.setdefault('n', i)
        m.setdefault('type', 'chapter' if any(x['kind'] == 'ticket' for x in b['shots']) else 'illustration')
        m.setdefault('chapter', 0)
        if b.get('vo') and not m.get('words'):
            ws = b['vo'].split()
            total, at, out = sum(len(w) + 1 for w in ws) or 1, b['vo_t'], []
            for w in ws:
                out.append(round(at, 3))
                at += b['vo_d'] * (len(w) + 1) / total
            m['words'] = out
    pics: dict = {}
    for b in beats:   # a long hold's fourth look is another picture of the same chapter, as the adapter's `related` gives one
        for x in b['shots']:
            if x['kind'] == 'image' and x.get('as') != 'print':
                pics.setdefault(b['meta']['chapter'], []).append(x['src'])
    by_n = {b['meta']['n']: b for b in beats}

    on: dict = {}   # picture → the beats it is on (the gate lets a picture stand on two: qa.MAX_ASSET_SHOTS)
    for b in beats:
        for x in b['shots']:
            if x.get('src'):
                on.setdefault(x['src'], set()).add(b['meta']['n'])

    def related(n, i):
        own = {x.get('src') for x in by_n[n]['shots']}
        pool = [p for p in dict.fromkeys(pics.get(by_n[n]['meta']['chapter'], [])) if p not in own and len(on.get(p, ())) < 2]
        if not pool:
            return None
        pick = pool[(n + i) % len(pool)]
        on.setdefault(pick, set()).add(n)
        return pick

    # the language mix, as the adapter keeps it (plan.Adapter.punch_up): while more of the film than PLAIN_MAX is plain
    # art, the art-only beats — the most intense first — say their one short sentence as kinetic type, on the voice
    for b in beats:
        b['lang'] = X.languages(b['shots'], b['d'])
    todo = sorted((b for b in beats if b['meta']['type'] not in ('end', 'follow', 'chapter') and b.get('vo') and b['lang']['documentary'] >= 0.6 * b['d'] and not b['meta'].get('plain')
                   and not any(x['kind'] == 'kinetic' for x in b['shots'])),
                  key=lambda b: (-(b['meta'].get('intensity') or 0.5), -b['lang']['documentary'], b['meta']['n']))
    for b in todo:
        if X.mix(beats)['documentary'] <= X.PLAIN_MAX:
            break
        k = X.punch(b['vo'], b['meta']['words'], b['t'], b['d'])
        busy = X.spans(b['shots'], b['d'], X.EXPLAIN_KINDS | X.KINETIC_KINDS)
        if k and not any(a < k['dt'] + k['d'] and k['dt'] < z for a, z in busy):
            if b['d'] - (k['dt'] + k['d']) < 1.0:   # a line that would leave just before the cut stays to it: its veil lifting and the cut landing read as a flash (rule 142; qa.FLASH_RISE)
                k['d'] = round(b['d'] - k['dt'], 3)
            if k['dt'] < 0.5:
                lead = k['dt']
                k['d'], k['dt'], k['on_cut'] = round(k['d'] + lead, 3), 0.0, True
                for w in k['words']:
                    w['at'] = round(w['at'] + lead, 3)
            b['shots'].append(k)
            b['lang'] = X.languages(b['shots'], b['d'])
    held_boards(beats)
    turn_cards(beats)

    def backdrop(n):   # editing rule "not a slide": a card stands on a picture of its own chapter, never on a plain ground
        p = related(n, 7)
        return {'kind': 'image', 'src': p, 'move': 'push', 'veil': 0.45} if p else None
    E.ground(beats, backdrop)
    out = E.cut(beats, None, related, None, None, None)
    for b in out:
        # A punch's veil landing a few frames after a picture cut reads as a flash (rule 142, qa.FLASH_RISE): the cut shows
        # the bright picture, then the veil darkens it. The punch moves onto the cut, so the veil and the new picture arrive together.
        cuts = [x['dt'] for x in b['shots'] if x['kind'] == 'image' and x.get('dt', 0) > 0]
        for k in b['shots']:
            if k['kind'] != 'kinetic' or not cuts:
                continue
            c = min(cuts, key=lambda c: abs(c - k['dt']))
            delta = round(c - k['dt'], 3)
            if abs(delta) < PUNCH_SNAP and k['d'] - delta > 0.6:
                k['dt'], k['d'], k['on_cut'] = c, round(k['d'] - delta, 3), True   # on the cut: the veil is there in the first frame, it does not fade in over a bright one
                for w in k['words']:
                    w['at'] = round(max(0.0, w['at'] - delta), 3)
    for b in out:
        lg = b['lang'] = X.languages(b['shots'], b['d'])
        b['language'] = max(lg, key=lambda k: (lg[k], k == 'documentary'))
    (root / 'docu-shots.json').write_text(json.dumps({'shots': E.shot_list(out), 'errors': E.errors(out), 'mix': X.mix(out)}, indent=1, ensure_ascii=False))
    return out


TURN_MAX, TURN_GAP_S, TURN_WORDS = 2, 45.0, (3, 8)   # as docu/plan.Adapter.turn_cards


def held_boards(beats: list[dict]) -> None:
    """Editing rule 3 for a hand-written storyboard, the held scoreboard (as docu/plan.score_board does for the
    pipeline): every beat of a match carries `meta.board` {id, score, small, flip_at}; one split-flap board stands in the
    corner from the first of them to the last and turns on the beat whose score changes, `flip_at` seconds into it. The
    writer gives only scores the record orders."""
    runs: dict = {}
    for b in beats:
        bd = (b.get('meta') or {}).get('board')
        if bd:
            runs.setdefault(bd['id'], []).append((b, bd))
    for rid, run in runs.items():
        first, bd0 = run[0]
        last = run[-1][0]
        board = {'kind': 'flap', 'corner': True, 'frm': bd0['score'], 'to': bd0['score'], 'at': bd0.get('at', 0.4), 'turns': [],
                 'd': round(last['t'] + last['d'] - first['t'] - 0.1, 3), 'z': 13, 'small': bd0.get('small', '')}
        cur = bd0['score']
        for b, bd in run[1:]:
            if bd['score'] != cur:
                board['turns'].append([round(b['t'] - first['t'] + bd.get('flip_at', 0.3), 3), bd['score']])
                cur = bd['score']
        first['shots'].append(board)


def turn_cards(beats: list[dict]) -> None:
    """The story's turns in type, for a hand-written storyboard (as docu/plan.turn_cards): a beat marked `meta.turn`
    sets its narration's first sentence — a reversal of 3–8 words, "But…" / "Until…" — on the words, in the film's ink.
    Two a film at most, 45 s apart; a third, or one too close, is dropped rather than crowding the cut."""
    shown, last = 0, -1e9
    for b in beats:
        m = b.get('meta') or {}
        if not m.get('turn') or not b.get('vo'):
            continue
        ws, at = b['vo'].split(), m.get('words') or []
        j = next((i for i, w in enumerate(ws) if re.search(r'[.!?]["\'’”)]*$', w)), len(ws) - 1)
        lo, hi = TURN_WORDS
        if shown >= TURN_MAX or b['t'] - last < TURN_GAP_S or not lo <= j + 1 <= hi or len(at) <= j:
            continue
        a = at[0] - b['t']
        z = (at[j + 1] if j + 1 < len(at) else b['vo_t'] + b['vo_d']) - b['t']
        words = ' '.join(ws[:j + 1]).upper().split()
        h = (len(words) + 1) // 2
        b['shots'].append({'kind': 'word', 'text': ' '.join(words[:h]) + '|' + ' '.join(words[h:]), 'bg': 'ink', 'size': 120,
                           'at': round(a, 3), 'd': round(min(b['d'], z + 0.9), 3), 'z': 16})
        shown, last = shown + 1, b['t']


def build(storyboard: Path, assets: Path, root: Path, voice: bool = True) -> tuple[Path, float]:
    sb = json.loads(storyboard.read_text())
    root.mkdir(parents=True, exist_ok=True)
    (root / 'assets' / 'fonts').mkdir(parents=True, exist_ok=True)
    (root / 'assets' / 'sfx').mkdir(parents=True, exist_ok=True)
    if (root / 'assets' / 'img').exists():
        shutil.rmtree(root / 'assets' / 'img')
    shutil.copytree(assets, root / 'assets' / 'img')
    for _, f in FACES:
        shutil.copyfile(FONTS / f'{f}.woff2', root / 'assets' / 'fonts' / f'{f}.woff2')
    shutil.copyfile(GSAP, root / 'assets' / 'gsap.min.js')
    import subprocess
    for name in set(SOUNDS.values()):
        src = next(iter([*SFX.glob(name + '.*'), *SFX2.glob(name + '.*')]))
        dst = root / 'assets' / 'sfx' / f'{name}.wav'
        if not dst.exists():
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-ac', '2', '-ar', '48000', str(dst)], check=True)
    vo_dir = root / 'assets' / 'vo'
    cache = vo_dir / 'durations.json'
    durs = speak(sb['beats'], vo_dir, sb.get('voice', 'bm_george'), names=sb.get('pronounce')) if voice or not cache.exists() else json.loads(cache.read_text())
    cache.write_text(json.dumps(durs))
    beats = timeline(sb['beats'], durs)
    if sb.get('edit'):
        beats = edited(sb, beats, root)
    f = Film(sb, root)
    f.agg_moves = []
    D = f.build(beats)
    if sb.get('music'):
        (root / 'assets' / 'music').mkdir(parents=True, exist_ok=True)
        for m in sb['music']:
            src = MUSIC / m['file']
            shutil.copyfile(src, root / 'assets' / 'music' / src.name)
        f.music(resolve_music(sb['music'], beats, D))
    if sb.get('mark'):   # the channel's mark in a corner for the whole film (docs/fanlife/74): small, still, under the type
        t0 = beats[1]['t'] if len(beats) > 1 else 0.0
        f.clip('chmark', t0, max(0.5, beats[-1]['t'] - t0), '<img class="chm" src="assets/img/fanlife.png">', 18)
    # the film's texture (HyperFrames registry: grain-overlay + vignette, made seekable): paper grain and a soft vignette over every frame
    f.clip('tex', 0, D, '<div class="vgn"></div><div class="grain" id="grn"></div>', 17)
    f.tween(f'tl.fromTo("#grn",{{x:0,y:0}},{{x:-480,y:-300,duration:{r2(D)},ease:"steps({max(1, int(D * 12))})"}},0);')
    errs = check(sb, beats, D)
    (root / 'index.html').write_text(f.page(D), encoding='utf-8')
    (root / 'hyperframes.json').write_text(json.dumps({'name': sb.get('slug', 'docu'), 'width': W, 'height': H, 'fps': 30}) + '\n')
    (root / 'CHECK.json').write_text(json.dumps({'duration': round(D, 2), 'errors': errs}, indent=1))
    return root / 'index.html', D


if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('storyboard')
    ap.add_argument('--assets', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--no-voice', action='store_true', help='reuse the narration already in the project')
    a = ap.parse_args()
    p, D = build(Path(a.storyboard), Path(a.assets), Path(a.out), voice=not a.no_voice)
    print(p, f'{D:.1f}s', (Path(a.out) / 'CHECK.json').read_text())

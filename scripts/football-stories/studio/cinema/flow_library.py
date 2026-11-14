"""The Flow-made art library (owner, 9.11.2026: "enrich the VOX graphics — a smart, beautiful, unique library in our
language through Flow, for every club; more characters, more football, more history").

The cinema already picks moving-art pieces by MEANING (cinema/animate.wants: a derby gets the capo and the drum, a
shoot-out the keeper, a final won the trophy…). This file writes the pieces it asks for — new variants of every person,
object and scene it can pick, the grounds of every decade, and every club's own city — as Flow prompts in the house
language, named in the library's own convention (cinema/library.classify), so a piece the Flow operator makes is picked
exactly like one of the owner's drawings:

  * `<pattern>-fl<N>-kr` — ink, cream and ONE signal red; the red is repainted in each club's own colour at render time
    (library.paint), so one drawing serves every club and never wears a rival's colour;
  * people and objects on a flat cream paper the library keys to alpha (cut_out); scenes full-bleed 16:9.

No crest, no logo, no lettering, no real person's likeness: the people are drawn types, the history is the record's.

    python -m studio.cinema.flow_library        # writes cinema/flow_library.json (the spec the operator reads)
"""
from __future__ import annotations

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / 'flow_library.json'
VARIANTS = 2   # new drawings per pattern: variety without repeating the owner's own pieces

STYLE = ('Screen-printed football illustration in the language of a 1970s–80s comic football weekly: bold black ink line, '
         'halftone shading, warm cream paper tones and ONE signal red (#D0021B) as the only colour — no blue, green, '
         'yellow or any other hue. Expressive, characterful, full of movement and period detail. No text, no letters, '
         'no numbers, no logos, no club crests, no sponsor marks, no real person\'s likeness.')
CUT = ('Single subject, whole and uncropped, centred with a generous margin, isolated on a perfectly flat, plain cream '
       'background (#F2E8D5) with no shadow, no floor, no frame and no texture behind it.')
SCENE = 'Full-bleed scene, wide 16:9 composition, depth and atmosphere, nothing cut out, no people in the foreground.'

# what each picker pattern is (cinema/animate.wants), as a drawing
PEOPLE = {
    'ppl-ultras-capo': 'a terrace capo standing on the fence with his back half-turned, megaphone raised, conducting the stand',
    'ppl-drummer': 'a supporter beating a big bass drum on the terrace, sticks in the air, mid-chant',
    'ppl-family-four': 'a family of four supporters walking to the ground, the child on the father\'s shoulders, scarves on',
    'ppl-girl-flag': 'a teenage girl supporter waving a big flag on a pole, hair flying',
    'ppl-kid-ball': 'a boy in a football shirt juggling a leather ball in the street',
    'ppl-old-woman-scarf': 'an old woman supporter in a long coat holding her scarf up with both hands',
    'ppl-manager-dugout': 'a manager in a long coat standing at the touchline, arms folded, staring at the pitch',
    'ppl-player-tunnel': 'a footballer in a plain kit walking out of the tunnel, boots in hand, studs clicking',
    'ppl-referee': 'a referee in black blowing his whistle, arm pointing, mid-stride',
    'ppl-commentator': 'a radio commentator at a wooden press desk with a big ribbon microphone, shouting a goal',
    'ppl-journalist': 'a newspaper reporter with a notebook and pencil in the press box, hat pushed back',
    'ppl-photographer': 'a pitch-side press photographer kneeling with an old film camera and a long lens',
    'ppl-tv-presenter': 'a television presenter in a suit holding a microphone in front of a studio camera',
    'ppl-steward': 'a ground steward in a long coat with an armband, standing by a gate',
    'ppl-vendor': 'a programme seller outside the ground with a satchel and a stack of programmes',
    'ppl-chairman': 'a club chairman in a heavy coat and hat in the directors\' box, cigar, unsmiling',
    'ppl-bus-driver': 'a coach driver leaning on the door of an old supporters\' coach',
    'ppl-player-celebrate': 'a footballer in a plain kit running away in celebration, both arms out, mouth open in a roar',
    'ppl-player-shot': 'a footballer in a plain kit striking the ball with full power, body leaning back, ball leaving the boot',
    'ppl-player-header': 'a footballer in a plain kit rising above a defender to head the ball, neck muscles tense',
    'ppl-keeper-dive': 'a goalkeeper in a plain jersey and gloves at full stretch diving to his right, fingertips to the ball',
    'ppl-player-despair': 'a footballer in a plain kit on his knees on the grass, hands on his head, after the final whistle',
    'sup-scarf-up': 'a supporter on the terrace holding his scarf above his head with both arms, singing',
    'sup-hug': 'two supporters hugging and shouting on the terrace after a goal',
    'sup-old': 'an old supporter with a flat cap and a worn scarf leaning on a crush barrier',
    'sup-young': 'a young supporter with a painted face and a scarf around his wrist, jumping',
    'sup-radio': 'a supporter holding a small transistor radio to his ear, eyes closed, listening to a match',
    'sup-rain': 'a supporter in a soaked anorak on an open terrace in the rain, still singing',
    'sup-sit-step': 'a supporter sitting alone on a concrete terrace step, scarf in his hands',
    'sup-stand-terrace': 'a supporter standing on a crowded terrace, hands on the barrier, leaning forward',
    'sup-turnstile': 'a supporter pushing through an old iron turnstile, ticket in his teeth',
    'sup-walk': 'a group of three supporters walking to the ground, scarves on, mid-conversation',
    'sup-bus-window': 'a supporter leaning out of a coach window waving a scarf',
    'sup-child-hand': 'a child holding his father\'s hand on the way to his first match, looking up at the floodlights',
}
OBJECTS = {
    'obj-ball': 'an old laced leather football, scuffed panels',
    'obj-drum': 'a big supporters\' bass drum with two sticks',
    'obj-flag-stick': 'a supporters\' flag on a short stick, rippling',
    'obj-megaphone': 'a battered tin megaphone',
    'obj-tifo-panel': 'a folded tifo card panel',
    'obj-banner-rolled': 'a long rolled-up supporters\' banner tied with string',
    'obj-scarf': 'a knitted football scarf laid in a loose curve, fringed ends',
    'obj-pennant': 'a triangular club pennant with a fringe and a tassel, plain (no emblem)',
    'obj-rosette': 'a big ribbon rosette worn on cup final day',
    'obj-programme-closed': 'a match programme lying closed, plain cover with a drawn stadium',
    'obj-season-ticket-book': 'a small season-ticket booklet with perforated stubs',
    'obj-thermos': 'a dented thermos flask and its cup',
    'obj-pie': 'a pie in a paper wrapper, steaming',
    'obj-beer-cup': 'a plastic beer cup, half full, foam on top',
    'obj-bag-of-sweets': 'a paper bag of sweets, half open',
    'obj-turnstile': 'an old iron turnstile',
    'obj-trophy-plain': 'a big two-handled silver cup trophy, plain, no engraving',
    'obj-medal': 'a winner\'s medal on a ribbon',
    'era-radio': 'a 1960s valve radio set',
    'era-scoreboard': 'an old manual stadium scoreboard with blank number plates',
    'era-ticket-stub': 'a torn match ticket stub, blank print area',
    'era-newspaper-front': 'a folded broadsheet newspaper, headlines drawn as thick blank bars',
    'doc-press-clipping': 'a torn newspaper cutting, the column drawn as grey lines',
    'doc-team-sheet': 'a handwritten team sheet on a clipboard, the names drawn as ink scribbles',
    'doc-telegram': 'an old telegram form, the message drawn as typed grey lines',
    'doc-photo-old': 'an old photograph print with a white border, curling at the corner, showing a team line-up drawn small',
    'ins-ball-spin': 'a close-up of a football spinning through the air, motion lines',
    'ins-boot-strike': 'a close-up of a football boot striking a ball, the moment of contact',
    'ins-net-bulge': 'a close-up of a goal net bulging with the ball in it',
    'ins-penalty-spot': 'a close-up of a ball placed on a chalky penalty spot, a boot\'s shadow',
    'ins-stopwatch': 'a referee\'s stopwatch in a hand, the needle near the end',
}
SCENES = {
    'sky-fog': 'a football ground swallowed by thick fog, floodlights glowing as halos',
    'sky-snow': 'snow falling over an open terrace and a white pitch, floodlights on',
    'sky-storm': 'a storm sky over a stadium roof, lightning far away',
    'sky-heat-haze': 'a summer afternoon heat haze over a stadium, sun high',
    'layer-terrace-night': 'a packed standing terrace at night under floodlights, smoke drifting, scarves up',
    'layer-street-march': 'a street full of supporters marching to the ground, flags and smoke',
    'layer-europe-night': 'a European night: a foreign stadium under floodlights, the away end high in the corner',
    'layer-old-ground': 'an old football ground with wooden stands, a cinder track and crush barriers',
    'layer-tunnel': 'the players\' tunnel seen from inside, the bright pitch at the end',
    'layer-away-end': 'a caged away end high in the corner of a big stadium, the travelling support packed in',
    'layer-rain-stand': 'an open stand in pouring rain, umbrellas and hoods',
    'layer-kitchen-radio': 'a small kitchen at night, a radio on the table, a scarf on the chair',
}
DECADES = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020]
GROUND = {1950: 'wooden stands, a cinder track, men in hats and coats', 1960: 'steel floodlight pylons, open terraces',
          1970: 'concrete terraces, crush barriers, floodlight towers', 1980: 'fenced terraces, packed standing ends',
          1990: 'new all-seater stands going up, roofs on all sides', 2000: 'a modern bowl stadium with cantilever roofs',
          2010: 'a modern stadium with LED boards and a safe-standing section', 2020: 'a modern stadium with tifo over a standing end'}
CITIES = {'tel-aviv': 'Tel Aviv: Bauhaus white blocks, the sea and the Jaffa clock tower in the distance',
          'petah-tikva': 'Petah Tikva: a quiet Israeli city street with low apartment blocks and palm trees',
          'mostar': 'Mostar: the Old Bridge over the Neretva, stone houses and minarets',
          'piraeus': 'Piraeus: the port with ferries, cranes and the hills of the city behind',
          'athens': 'Athens: the city of white buildings below the Acropolis hill',
          'hamburg': 'Hamburg: the harbour cranes, red-brick warehouses and the river Elbe',
          'glasgow': 'Glasgow: red-sandstone tenements, a rainy street and the river Clyde',
          'casablanca': 'Casablanca: white art-deco buildings, palm trees and the great mosque by the ocean',
          'cairo': 'Cairo: the Nile, minarets and the city haze'}


def pieces() -> list[dict]:
    out = []
    for pat, what in {**PEOPLE, **OBJECTS}.items():
        for n in range(1, VARIANTS + 1):
            out.append({'stem': f'{pat}-fl{n}-kr', 'aspect': '1:1', 'prompt': f'{STYLE} {what.capitalize()}. {CUT}'})
    for pat, what in SCENES.items():
        out.append({'stem': f'{pat}-fl1-kr', 'aspect': '16:9', 'prompt': f'{STYLE} {what.capitalize()}. {SCENE}'})
    for d in DECADES:
        out.append({'stem': f'ground-{d}s-ext-fl1-kr', 'aspect': '16:9',
                    'prompt': f'{STYLE} A football ground of the {d}s seen from outside on match day: {GROUND[d]}, supporters arriving. {SCENE}'})
        out.append({'stem': f'ground-{d}s-int-fl1-kr', 'aspect': '16:9',
                    'prompt': f'{STYLE} Inside a football ground of the {d}s during a match: {GROUND[d]}. {SCENE}'})
    for slug, what in CITIES.items():
        out.append({'stem': f'city-{slug}-fl1-kr', 'aspect': '16:9', 'prompt': f'{STYLE} {what}, on a match day. {SCENE}'})
    from .. import looks   # the real people the films name, drawn from their grounded look (studio/looks.py)
    out += looks.pieces()
    return out


def main() -> int:
    ps = pieces()
    OUT.write_text(json.dumps({'version': 1, 'style': STYLE, 'pieces': ps}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{len(ps)} pieces → {OUT.name}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

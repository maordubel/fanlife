"""THE RACONTEUR — the house's fourth screenwriter, and its lead (owner, 23.11.2026: "the editing, the directing, the
script do not reach the level … I want a film! I want a story! … information that knows how to talk in a film in a way
that is fun, hypnotic, humorous"; his reference: Kan 11's "The Unimportant").

What that series does, and what this writer does with a club's archive instead of a broadcaster's vault:

  the small door   a film opens on the SMALLEST true thing the record holds about its biggest night — a crowd you could
                   count, a note beside a striker's name, a final in somebody else's stadium — and walks through it into
                   the big story. Never a table, never a tally read aloud.
  people           the man the film is about is introduced as a person (what the archive knows of him before football,
                   his games and goals at the club), then followed. The season's shirt is said, so it can be shown.
  scenes           a match is told as a scene: what it meant before kick-off, what happened, the one detail worth
                   keeping. A two-legged tie is ONE scene with a first act and a second.
  dry wit          one raised eyebrow a scene, never a joke during the goal. An aside is a remark about a fact the line
                   just said and holds no fact of its own (director rule 6: humour from the record only).
  the set piece    the biggest night is five or six short beats that build to one peak — the wait, the clock, the ball,
                   the release — the way that series builds its animated sequences (two or three beats carry it, the
                   others prepare them).

Everything said is a claim's: every number, name, minute and place comes from the claims the beat cites, and the script
passes the same checks as any other (script.validate_script with the director rules, writer.hook_option_errors). What
the record does not hold is not said — a club whose archive is thin gets a shorter, plainer film, never an invented one.

Runs in code: no model, no key, no network. `STORIES_HOUSE_LEAD=unit` gives every director his own unit's writer back.
"""
from __future__ import annotations

from datetime import date as Date

from . import house_writer as hw
from .house_writer import Book, Pen, beat, day, month, spoken

ID = 'raconteur'

# The voice. Craft lines only — a want, an obstacle, a clock, a turn — and none of them holds a fact.
VOICE = {
    'who': '{club}', 'they': 'they',
    'want': ['{club} wanted one thing from these weeks: to still be standing at the end of them.',
             'All {club} needed was to get through. It sounds simple when you say it quickly.',
             '{club} had to win, and everybody they met had the same plan.',
             'What {club} wanted was simple. Getting it was the hard part.'],
    'obstacle': ['But football is not built for simple.', 'But the other side had turned up as well.',
                 'Yet nothing in this stretch came without a bill.', 'But nobody had told the opposition.'],
    'clock': ['And the calendar was not on their side.', 'There was less time left than anyone liked to say out loud.',
              'The weeks were running out, quietly, the way they do.'],
    'turn': ['Then it changed.', 'Then came the part nobody would have written.', 'Until one night rearranged everything.',
             'And then, of all things, this.'],
    'cliff': [''],   # 28.11.2026: a filler question at a scene's end is a tic (studio/story_judge.py); the next scene pulls on its own
    'end': ['That was the season.', 'And that was the season.'],
    'win': ['{who} beat {opp} {score}.', '{who} won {score} against {opp}.', '{who} won it, {score} against {opp}.'],
    'draw': ['{who} drew {score} with {opp}.', '{who} and {opp} drew {score}.'],
    'loss': ['{who} lost {score} to {opp}.', '{opp} beat {who} {score}.', '{who} were beaten {score} by {opp}.'],
    'joy': ['That was the night.', 'It was done.', 'And that was that.'],
    'grief': ['It was not a night for the scrapbook.', 'The journey home was a quiet one.', 'Some results need no adjectives.'],
    'level': ['Nobody got what they came for.', 'A result that settled nothing and annoyed everyone.'],
    'streak': ['Week after week, the same answer.', 'A habit, by then.'],
    'slump': ['Nobody could find the door.', 'It was becoming a habit, and not a good one.'],
    'chapters': {'Act I': 'Where It Started', 'Act II': 'The Road', 'Act III': 'The Night', 'Epilogue': 'What Was Left'},
    'cams': ('push', 'drift', 'pull', 'slow'),
    'visuals': ('score', 'matchday', 'versus', 'ticket'),
    'art': ('terrace-crowd', 'tunnel', 'supporter', 'terrace-empty'),
}

# Dry asides: one remark on a fact the line has just said. No names, no numbers, no events of their own.
ASIDE = {
    'heavy_loss': ['At that point the sensible advice was to stop watching.', 'On paper, that was that.'],
    'small_crowd': ['That is not a crowd. That is a guest list.', 'You could have counted them by hand.'],
    'extra_time': ['Naturally, ninety minutes was not enough.', 'Ninety minutes, it turned out, was only the introduction.'],
    'penalties': ['Penalties: the part of football designed by someone who dislikes supporters.'],
    'late': ['Football keeps its best timing for the end.', 'Late enough to ruin a journey home, or make one.'],
    'big_win': ['Some nights the scoreboard earns its money.', 'Nobody asked for the last few. They came anyway.'],
    'other_ground': ['Football rarely misses a joke like that.', 'Somebody, somewhere, enjoyed arranging that.'],
    'managers': ['That is usually how a club describes a bad year.', 'Normally that is the first line of a different kind of story.'],
    'trip': ['A long way to go for ninety minutes.', 'Supporters have travelled further for less.'],
    'lost_but_through': ['A defeat on the night, and still the better side over the two legs.'],
    'first': ['Strangers, in other words.', 'Neither side had any old scores to settle. Yet.'],
    'comeback': ['Nobody writes it like that. It would be sent back as unrealistic.'],
    'neutral': ['Home, in this case, was a loose description.'],
    'nil_nil': ['A match that asked nothing of the scoreboard.'],
    'clue': ['Football found him anyway.', 'The archive keeps that line right next to his goals.', 'It is the sort of detail a scoreline never tells you.'],
    'kit': ['It is the shirt in every picture of that year.', 'People kept that shirt. Now you know why.'],
}
ORDINAL = {1: 'first', 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth'}
COUNT = {2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six'}
SMALL_CROWD = 5000
LATE = 85


class Teller(Pen):
    """The raconteur's pen: his own word banks; the titles and thumbnails of the Terrace Poet's shelf (studio/house_writer
    keys those by writer), which he then leads with his own."""

    def __init__(self, book: Book, seed: str):
        super().__init__('poet', book, seed)
        self.w = 'chronicler'   # third person ("they"), the house's plain register, for the helpers that ask
        self.v = dict(VOICE)
        self.asides: set[str] = set()

    def aside(self, key: str) -> str:
        """One aside of a kind per film, at most; '' when it has been said, or when every line of its kind is stock."""
        from .story_judge import STOCK_RE
        if key in self.asides:
            return ''
        self.asides.add(key)
        opts = [o for o in ASIDE[key] if not STOCK_RE.search(o)]
        if not opts:
            return ''
        return opts[self.rng.randrange(len(opts))]


# ── what the record holds about a match, beyond its score ────────────────────────────────────────────────────────────
def detail_of(b: Book, mid: str) -> tuple[dict, str | None]:
    c = b.detail.get(b.f(mid).get('date'))
    return ((c['fact'], c['id']) if c else ({}, None))


def final_of(b: Book, mid: str) -> tuple[dict, str | None]:
    c = b.dossier.get('final')
    return ((c['fact'], c['id']) if c and c['fact'].get('date') == b.f(mid).get('date') else ({}, None))


def shootout_of(b: Book, mid: str) -> tuple[dict, str | None]:
    """A shoot-out the dossier records for this match's date: ({'shootout', 'winner', 'attendance'?}, claim id)."""
    d = b.f(mid).get('date')
    c = next((c for c in b.by.values() if (c.get('fact') or {}).get('kind') == 'penalties' and c['fact'].get('date') == d and c['fact'].get('shootout')), None)
    return ((c['fact'], c['id']) if c else ({}, None))


def won_it(b: Book, mid: str) -> bool | None:
    """True when the night ended the club's way: a win, a tie won, or a shoot-out won. None when the record cannot say."""
    f = b.f(mid)
    so, _ = shootout_of(b, mid)
    if so.get('winner'):
        return spoken(so['winner']) == b.club
    if b.through(mid) is not None:
        return b.through(mid)
    return True if f['outcome'] == 'win' else False if f['outcome'] == 'loss' else None


def goal_stories(b: Book, mid: str) -> list[tuple[str, str]]:
    return [(c['fact']['description'].strip(), c['id']) for c in b.by.values()
            if (c.get('fact') or {}).get('kind') == 'goal-detail' and c['fact'].get('match_id') == mid and str(c['fact'].get('description') or '').strip()]


def player_of(b: Book, name: str | None) -> dict | None:
    from .archive_props import cards
    if not name:
        return None
    return cards(b.ledger).get(__import__('studio.archive_props', fromlist=['fold']).fold(name))


def kit_of(b: Book) -> dict | None:
    return next((c for c in b.by.values() if (c.get('fact') or {}).get('kind') == 'kit' and c['fact'].get('type') == 'home'), None)


def scorer_line(b: Book, mid: str) -> str:
    """Who scored, as a person tells it: a hat-trick is said as one; a single goal carries its minute."""
    sc = b.scorers(mid)
    if not sc:
        return ''
    names: dict[str, list[int]] = {}
    for s in sc:
        names.setdefault(spoken(s['name']), []).append(s['minute'])
    if len(sc) == 1:
        n, (m,) = next(iter(names.items()))
        k = getattr(b, '_single', 0)
        b._single = k + 1
        return (f'{n} scored it, on {m} minutes.', f'The goal was {n}, on {m} minutes.', f'{n}, on {m} minutes. One was enough.')[k % 3]
    word = {3: 'three', 4: 'four', 5: 'five'}
    big = next(((n, ms) for n, ms in names.items() if len(ms) >= 3), None)
    if big:
        rest = [f'{n}, on {ms[0]} minutes' if len(ms) == 1 else f'{n} twice' for n, ms in names.items() if n != big[0]][:2]
        return f'{big[0]} scored {word.get(len(big[1]), len(big[1]))} of them.' + (f' {" and ".join(rest)}, added the rest.' if rest else '')
    parts = [f'{n} twice' if len(ms) == 2 else f'{n} on {ms[0]} minutes' for n, ms in list(names.items())[:3]]
    return ('The goals: ' + ', '.join(parts[:-1]) + ' and ' + parts[-1] + '.') if len(parts) > 1 else parts[0][:1].upper() + parts[0][1:] + '.'


def where_when(b: Book, mid: str) -> str:
    f = b.f(mid)
    v = b.venue(mid)
    place = (f'at {v}' if ' ' in v else f'in {v}') if v else ('at home' if f.get('side') == 'home' else 'away from home' if f.get('side') == 'away' else '')
    return f'{day(f["date"])}{", " + place if place else ""}'


def mood(b: Book, mid: str) -> str:
    w = won_it(b, mid)
    return 'joy' if w is True else 'grief' if w is False else 'level'


def match_aside(pen: Teller, mid: str) -> str:
    """The one eyebrow a scene may raise, by what its record shows. The strongest oddity wins; each kind once a film."""
    b = pen.b
    f, tags = b.f(mid), b.tags(mid)
    d, _ = detail_of(b, mid)
    thr = b.through(mid)
    late = any(s['minute'] >= LATE for s in b.scorers(mid))
    diff = f['club_goals'] - f['opponent_goals']
    order = []
    if thr is True and f['outcome'] == 'loss':
        order.append('lost_but_through')
    if 'comeback' in tags:
        order.append('comeback')
    if f.get('penalties'):
        order.append('penalties')
    if f.get('after_extra_time'):
        order.append('extra_time')
    if isinstance(d.get('attendance'), int) and d['attendance'] < SMALL_CROWD:
        order.append('small_crowd')
    if diff <= -3:
        order.append('heavy_loss')
    if diff >= 4:
        order.append('big_win')
    if late and f['outcome'] != 'loss':
        order.append('late')
    if f['club_goals'] == 0 and f['opponent_goals'] == 0:
        order.append('nil_nil')
    for k in order:
        a = pen.aside(k)
        if a:
            return a
    return ''


# ── scenes ───────────────────────────────────────────────────────────────────────────────────────────────────────────
def scene(pen: Teller, mid: str, lead: str = '', weight: float | None = None, req: bool = False, visual: str | None = None) -> dict:
    """One match as a scene, in one beat: what it meant, where and when, what happened, who, and the eyebrow."""
    b = pen.b
    f = b.f(mid)
    bits = [lead] if lead else []
    ctx, ctx_id = hw.context_line(pen, mid)
    if ctx:
        bits.append(ctx)
    bits.append(f'{where_when(b, mid)[:1].upper() + where_when(b, mid)[1:]}, {b.comp(mid)}.')
    bits.append(pen.result(mid))
    sl = scorer_line(b, mid)
    if sl:
        bits.append(sl)
    ids = [mid] + ([ctx_id] if ctx_id else []) + list(getattr(pen, 'ctx_also', []) if ctx_id else [])
    pen.ctx_also = []
    gs = goal_stories(b, mid)
    if gs and len(' '.join(bits).split()) < 55:
        bits.append(gs[0][0].rstrip('.') + '.')
        ids.append(gs[0][1])
    thr = b.through(mid)
    if thr is True:
        bits.append(f'And {b.club} were through.')
    elif thr is False:
        bits.append(f'And {b.club} were out.')
    a = match_aside(pen, mid)
    bits.append(a or (pen.pick(mood(b, mid)) if (weight or b.weight.get(mid, 0.3)) >= 0.5 else ''))
    vis = hw.match_visual(pen, mid, visual)
    extra = {'camera': pen.cam()}
    if f['outcome'] == 'loss':
        extra.update({'sfx': 'groan', 'pace': 'slow'})
    elif vis['type'] == 'goal':
        extra.update({'sfx': 'roar'})
    if 'europe' in b.tags(mid) and f.get('side') == 'away':
        vis['prop'] = 'passenger_plane'
    w = max(weight if weight is not None else b.weight.get(mid, 0.3), 0.9 if ctx_id else 0)
    return beat(' '.join(x for x in bits if x), ids, vis, w, req, **extra)


def tie_scene(pen: Teller, leg1: str, leg2: str, req: bool = False) -> list[dict]:
    """A two-legged tie as one scene in two or three beats: the first act, what stood between the legs, the second act."""
    b = pen.b
    f1, f2 = b.f(leg1), b.f(leg2)
    opp = b.opp(leg2)
    stage = str(f2.get('stage') or f1.get('stage') or '').split(',')[0].strip()
    head = f'The {stage[:1].lower() + stage[1:]}: {opp}.' if stage and not stage.lower().startswith('final') else f'{opp}, home and away.'
    ctx, ctx_id = hw.context_line(pen, leg1)
    also = list(getattr(pen, 'ctx_also', []) if ctx_id else [])
    pen.ctx_also = []
    if ctx.startswith(f'{opp}:'):   # "Maccabi Tel Aviv: the first meeting…" already names them
        head = f'The {stage[:1].lower() + stage[1:]}.' if stage and not stage.lower().startswith('final') else ''
    g1 = goal_stories(b, leg1) if f1['outcome'] == 'win' else []
    one = [head, ctx, f'The first leg, {where_when(b, leg1)}.', pen.result(leg1), scorer_line(b, leg1) if f1['outcome'] == 'win' else '',
           (g1[0][0].rstrip('.') + '.') if g1 else '', match_aside(pen, leg1)]
    w = 0.82 + 0.1 * max(b.weight.get(leg2, 0.4), b.weight.get(leg1, 0.3))   # the road IS the film: a tie outlasts every craft line in the cut
    out = [beat(' '.join(x for x in one if x), [leg1] + ([ctx_id] if ctx_id else []) + also + [g[1] for g in g1[:1]], hw.match_visual(pen, leg1, 'matchday'), w, req,
                camera=pen.cam(), **({'sfx': 'groan', 'pace': 'slow'} if f1['outcome'] == 'loss' else {}))]
    d, did = detail_of(b, leg2)
    mid_bits, mid_ids = [], []
    if d:
        where = ', '.join(spoken(x) for x in (d.get('city'), d.get('country')) if x)
        if where:
            mid_bits.append(f'The second leg was played in {where}.')
            if d.get('note') and 'neutral' in str(d['note']).lower():
                mid_bits.append(pen.aside('neutral'))
        if isinstance(d.get('attendance'), int):
            mid_bits.append(f'{d["attendance"]:,} people were in the ground.')
            if d['attendance'] < SMALL_CROWD:
                mid_bits.append(pen.aside('small_crowd'))
        if isinstance(d.get('first_leg_deficit'), int) and d['first_leg_deficit'] >= 2:
            mid_bits.append(f'And {b.club} needed {d["first_leg_deficit"]} goals just to be level.')
        mid_ids = [did]
    if len([x for x in mid_bits if x]) >= 2:
        out.append(beat(' '.join(x for x in mid_bits if x) + ' ' + pen.pick('cliff'), mid_ids, {'type': 'illustration', 'art': 'tunnel', 'caption': ''}, w, req,
                        camera=pen.cam(), pace='slow'))
        mid_bits = []
    two = [x for x in mid_bits if x] + [f'The second leg, {where_when(b, leg2)}.' if not out[1:] else pen.pick('turn')]
    ids2 = [leg2] + mid_ids
    if d.get('score_after_90') and isinstance(d.get('after_90'), list) and f2.get('after_extra_time'):
        a90 = d['score_after_90']
        two.append(f'After ninety minutes it was {a90}' + (f', and {d["aggregate_after_90"]} over the two legs.' if d.get('aggregate_after_90') else '.'))
        two.append(pen.aside('extra_time'))
        ets = [spoken(x) for x in d.get('extra_time_scorers') or [] if x]
        if ets:
            two.append(f'In extra time, {" and ".join(ets)} scored.')
    two.append(pen.result(leg2))
    if not (d.get('score_after_90') and f2.get('after_extra_time')):
        two.append(scorer_line(b, leg2))
    ro = b.dossier.get('route')
    from .director import same_club
    rnd = next((r for r in ((ro or {}).get('fact') or {}).get('rounds') or [] if r.get('decided') and same_club(f2.get('opponent'), [r.get('opponent') or ''])), None)
    if rnd and 'penalt' in str(rnd['decided']).lower():
        two.append(f'Level over the two legs, so: penalties. {spoken(rnd["decided"]).rstrip(".")}.')
        two.append(pen.aside('penalties'))
        ids2.append(ro['id'])
    thr = b.through(leg2)
    two.append(f'{b.club} were through.' if thr is True else f'{b.club} were out.' if thr is False else '')
    if not (rnd and 'penalt' in str(rnd['decided']).lower()):
        two.append(match_aside(pen, leg2) or pen.pick(mood(b, leg2)))
    out.append(beat(' '.join(x for x in two if x), ids2, hw.match_visual(pen, leg2, 'score'), w + 0.05, req, camera=pen.cam(),
                    **({'sfx': 'roar', 'pace': 'fast'} if thr is True else {'sfx': 'groan', 'pace': 'slow'} if thr is False else {})))
    return out


def the_night(pen: Teller, top: str) -> list[dict]:
    """The set piece: the film's biggest night in short beats that build to one peak and let it go."""
    b = pen.b
    f = b.f(top)
    fi, fid = final_of(b, top)
    d, did = detail_of(b, top)
    opp = b.opp(top)
    beats = []
    # 1 · the room: where, whose ground, how many
    room, ids = [], [top]
    venue = spoken(fi.get('venue')) or b.venue(top)
    city = spoken(fi.get('city') or d.get('city'))
    room.append(f'{day(f["date"])}. {b.comp(top)}. {b.club} against {opp}' + (f', at {venue}' if venue else '') + (f' in {city}.' if city else '.'))
    if fi.get('venue_owner') and spoken(fi['venue_owner']) != b.club:
        room.append(f'The ground belongs to {spoken(fi["venue_owner"])}.')
        room.append(pen.aside('other_ground'))
    so, soid = shootout_of(b, top)
    att = next((x.get('attendance') for x in (fi, d, so) if isinstance(x.get('attendance'), int)), None)
    if att:
        room.append(f'{att:,} inside.')
    ids += [x for x in (fid, did, soid) if x]
    ctx, ctx_id = hw.context_line(pen, top)
    if ctx:
        room.append(ctx)
        ids += [ctx_id] + list(getattr(pen, 'ctx_also', []))
        pen.ctx_also = []
    # a matchday card, not a face-off board: the board prints the result, and the result is the night's to give (measured
    # 23.11.2026: "1–0" stood on screen from the first second of the final)
    beats.append(beat(' '.join(x for x in room if x), ids, {'type': 'matchday', 'claim': top, 'backdrop': 'terrace-crowd'}, 1.0, True, camera='slow', pace='slow'))
    # 2 · the wait: the clock, withheld
    sc = b.scorers(top)
    last = max((s['minute'] for s in sc), default=None)
    first = min((s['minute'] for s in sc), default=None)
    if last and last > 90:
        wait = 'Ninety minutes went by without anyone finding a way through. So did most of extra time.' if first == last else \
            'Ninety minutes could not separate them. Extra time, then.'
        beats.append(beat(f'{wait} {pen.pick("clock")}', [top], {'type': 'illustration', 'art': 'terrace-crowd', 'caption': ''}, 1.0, True, camera='push', pace='slow'))
    elif last and last >= LATE and f['outcome'] != 'loss':
        beats.append(beat(f'For most of the night, nothing would give. {pen.pick("clock")}', [top], {'type': 'illustration', 'art': 'terrace-crowd', 'caption': ''},
                          0.9, True, camera='push', pace='slow'))
    # 3 · the ball: the goal as the record describes it
    gs = goal_stories(b, top)
    hero = b.cast.get('hero')
    win = f['outcome'] == 'win'
    ended = won_it(b, top)
    peak, pids = [], [top]
    decisive = max(sc, key=lambda s: s['minute']) if sc and win else None
    if decisive:
        peak.append(f'{decisive["minute"]} minutes.')
    if gs and win:
        peak.append(gs[-1][0].rstrip('.') + '.')
        pids.append(gs[-1][1])
    elif decisive:
        peak.append(f'{spoken(decisive["name"])}.')
    peak.append(pen.result(top))
    if decisive and decisive['minute'] >= LATE:
        peak.append(pen.aside('late'))
    if so:
        peak.append(pen.aside('penalties') or 'So: penalties.')
        peak.append(f'{spoken(so["winner"])} won the shoot-out {so["shootout"]}.' if so.get('winner') else f'The shoot-out finished {so["shootout"]}.')
        pids.append(soid)
    if fi.get('var_check') and win:
        peak.append('Then the wait for the video check, which felt longer than the match.')
        pids.append(fid)
    if hero and decisive and spoken(hero['fact']['name']) == spoken(decisive['name']):
        peak.append(pen.pick_hero(spoken(hero['fact']['name'])))
        pids.append(hero['id'])
    i = b.goal_index(top)
    vis = {'type': 'goal', 'claim': top, 'scorer': i} if (i is not None and win) else {'type': 'score', 'claim': top}
    beats.append(beat(' '.join(x for x in peak if x), pids, vis, 1.0, True, camera='push', sfx='roar' if ended else 'groan' if ended is False else 'gasp',
                      pace='fast' if ended else 'slow'))
    # 4 · what it was: the meaning, from the dossier
    lines = hw.dossier_lines(pen)
    mean, mids = [], []
    for k in ('payoff', 'payoff_club'):
        if k in lines and fid:
            said = lines[k][0]
            if att:   # the crowd was counted on the way in
                said = said.replace(f' {att:,} in the ground.', '')
            mean.append(said)
            mids.append(lines[k][1])
    if mean:
        beats.append(beat(' '.join(mean), mids, {'type': 'turning', 'title': 'What it was', 'subtitle': '', 'backdrop': 'terrace-crowd'}, 1.0, True, camera='pull', pace='slow'))
    # 5 · the release
    if ended:
        j = [pen.pick('joy')]
        jids = [top]
        if 'joy' in lines:
            j.append(lines['joy'][0])
            jids.append(lines['joy'][1])
        j.append(bridge(b))   # a fact that leads on, never a filler question (28.11.2026)
        beats.append(beat(' '.join(j), jids, {'type': 'illustration', 'art': 'supporter', 'caption': ''}, 1.0, True, camera='orbit', sfx='roar', pace='fast'))
    else:
        beats.append(beat(f'{pen.pick("grief" if ended is False else "level")} {bridge(b)}', [top], {'type': 'illustration', 'art': 'terrace-empty', 'caption': ''}, 1.0, True, camera='slow', pace='slow'))
    return beats


# ── the people and the shirt ─────────────────────────────────────────────────────────────────────────────────────────
def bridge(b: Book) -> str:
    """The line after the big night that leads into what the season added up to (director rule 5 wants a turn word)."""
    if b.kind == 'season' and b.main and b.main != b.f(b.top).get('competition'):
        return f'What was left was the {spoken(b.main)}.'
    return 'What it added up to came next.'


def cast_beats(pen: Teller) -> list[dict]:
    b = pen.b
    out = []
    h = b.cast.get('hero')
    if h:
        name = spoken(h['fact']['name'])
        p = player_of(b, h['fact']['name'])
        bits, ids = [f'Remember the name: {name}.'], [h['id']]
        if p:
            x = p['fact']
            ids.append(p['id'])
            if x.get('clue'):
                bits.append(x['clue'])
                bits.append(pen.aside('clue'))
            if x.get('apps') and x.get('goals') is not None and x['goals'] > 0:
                bits.append(f'By the archive\'s count, {x["apps"]} games and {x["goals"]} goals for the club.')
        else:
            bits.append('His goals run all through this.')
        out.append(beat(' '.join(x for x in bits if x), ids, {'type': 'illustration', 'art': 'tunnel', 'caption': ''}, 0.97, True, camera=pen.cam()))
    k = kit_of(b)
    if k:
        x = k['fact']
        maker, sponsor = spoken(x.get('maker')), spoken(x.get('sponsor'))
        latin = lambda s: bool(s) and all(ord(ch) < 0x250 for ch in s)   # noqa: E731
        line = 'The shirt that year'
        line += f' was made by {maker}' if latin(maker) else ' is in the archive'
        line += f', with {sponsor} across the chest.' if latin(sponsor) else '.'
        out.append(beat(f'{line} {pen.aside("kit")}', [k['id']], {'type': 'illustration', 'art': 'terrace-crowd', 'caption': ''}, 0.96, True, camera=pen.cam()))
    c = b.dossier.get('managers')
    ms = [m for m in ((c or {}).get('fact') or {}).get('managers') or [] if m.get('name')]
    if len(ms) >= 2 and len(ms) in COUNT:
        names = [spoken(m['name']) for m in ms]
        out.append(beat(f'{COUNT[len(ms)]} managers in one season: {", ".join(names[:-1])} and then {names[-1]}. {pen.aside("managers")}', [c['id']],
                        {'type': 'turning', 'title': 'The bench', 'subtitle': '', 'backdrop': 'tunnel'}, 0.9, False, camera=pen.cam()))
    return out


# ── the door: the smallest true thing about the biggest night ────────────────────────────────────────────────────────
def doors(pen: Teller) -> list[dict]:
    """Openings, best first: {'text' (sentence one: a person, a place or a ground with a number, never the score),
    'ids'}. Each is a detail the record holds; a film whose record holds none opens on the night itself."""
    b = pen.b
    top = b.top
    f = b.f(top)
    opp, when = b.opp(top), day(f['date'])
    out = []
    # a crowd you could count, on the road to the night
    small = [(c['fact'], c['id']) for c in b.by.values() if (c.get('fact') or {}).get('kind') == 'match-detail'
             and isinstance(c['fact'].get('attendance'), int) and c['fact']['attendance'] < SMALL_CROWD and c['fact'].get('city')]
    for d, did in small[:1]:
        mid = next((m['id'] for m in b.matches if m['date'] == d.get('date')), None)
        if mid and mid != top:
            out.append({'text': f'{d["attendance"]:,} people were in the ground in {spoken(d["city"])} on {day(d["date"])}.',
                        'more': 'That is not a crowd; that is a guest list.', 'ids': [top, did, mid]})
    # the man, before he was the man
    h = b.cast.get('hero')
    p = player_of(b, h['fact']['name']) if h else None
    if p and p['fact'].get('clue') and p['fact'].get('apps'):
        out.append({'text': f'{spoken(h["fact"]["name"])} played {p["fact"]["apps"]} games for {b.club}, by the archive\'s count.',
                    'more': p['fact']['clue'], 'ids': [top, h['id'], p['id']]})
    # somebody else's stadium
    fi, fid = final_of(b, top)
    if fi.get('venue_owner') and fi.get('attendance') and spoken(fi['venue_owner']) != b.club:
        out.append({'text': f'{fi["attendance"]:,} people filled {spoken(fi.get("venue") or "the ground")} on {when}.',
                    'more': f'The ground belongs to {spoken(fi["venue_owner"])}.', 'ids': [top, fid]})
    # the clock
    sc = b.scorers(top)
    if sc and max(s['minute'] for s in sc) >= LATE and f['outcome'] != 'loss' and f['club_goals'] - f['opponent_goals'] <= 1:
        out.append({'text': f'{opp}, {when}, and a clock that had almost run out on {b.club}.', 'more': 'Almost.', 'ids': [top]})
    # the plain door: the night, the stage and what stood on it — a fact, never a stock line (28.11.2026)
    stage = b.comp(top, stage=True)
    out.append({'text': f'{when}, {stage}: {b.club} against {opp}.', 'more': '', 'ids': [top]})
    return out


def hooks(pen: Teller) -> list[dict]:
    b = pen.b
    top = b.top
    why = b.why.get(top, 'decider')
    stake = {'final': 'By the end of that road there was a final, and only one side leaves a final with anything.',
             'decider': 'By the end of that road there was a decider, with no second chance.',
             'derby': 'By the end of that road there was a derby, the match nobody in the city forgets.',
             'comeback': 'By the end of that road, it looked lost. It was not.',
             'late-winner': 'By the end of that road, it came down to the last minutes.'}.get(why, 'By the end of that road there was one night with everything on it.')
    q = f'So how did {b.club} get to {b.opp(top)}?' if b.kind == 'season' else 'So how did one night decide it?'
    opts = []
    for d in doors(pen)[:3]:
        text = ' '.join(x for x in (d['text'], d['more'], stake, q) if x)
        opts.append({'text': hw.fit_hook(text, q, 'But it starts somewhere much smaller.'), 'claim_ids': d['ids']})
    seen, out = set(), []
    for o in opts:
        key = ' '.join(o['text'].lower().split())
        if key in seen:
            continue
        seen.add(key)
        out.append(o)
    alt = hw.hook_options(pen)
    for o in alt:
        if len(out) >= 3:
            break
        if ' '.join(o['text'].lower().split()) not in seen:
            out.append(o)
    return out[:3]


def cold_open(pen: Teller, hook: dict) -> dict:
    b = pen.b
    top = b.top
    s = hw._sentences(hook['text'])
    first, rest = ' '.join(s[:2]), ' '.join(s[2:])
    ids = list(dict.fromkeys([top, *hook['claim_ids']]))
    small = 'people were in the ground' in first   # a guest list is not shown as a full terrace
    beats = [beat(first, ids, {'type': 'open', 'backdrop': 'terrace-empty' if small else 'tunnel', 'headline': b.opp(top)[:60], 'kicker': b.comp(top, stage=False)[:60]}, 1.0, True, camera='slow'),
             beat(rest, ids, {'type': 'matchday', 'claim': top, 'backdrop': 'terrace-crowd'}, 1.0, True, camera='push')]
    back = 'To understand that night, go back to the start of the season.'
    if b.kind in ('match', 'tie'):
        back = 'But a night like that is built long before kick-off. So what was on the line?'
    beats.append(beat(back, [], {'type': 'turning', 'title': 'Before', 'subtitle': 'Where it began', 'backdrop': 'terrace-empty'}, 1.0, True, camera='pull', pace='slow'))
    return {'title': 'The Small Print', 'beats': beats}


# ── the films ────────────────────────────────────────────────────────────────────────────────────────────────────────
def thread(b: Book) -> list[str]:
    """The road to the biggest night: the matches of its own competition when that is a cup or a European run, else the
    film's strongest moments. In date order, the night itself last."""
    top = b.top
    f = b.f(top)
    comp = f.get('competition')
    same = [m['id'] for m in b.matches if b.f(m['id']).get('competition') == comp and b.order[m['id']] <= b.order[top]]
    knock = any(t in b.tags(top) for t in ('final', 'decider')) or b.through(top) is not None
    if knock and 3 <= len(same) <= 22:
        return same
    best = sorted((m['id'] for m in b.moments[:9]), key=lambda i: b.order[i])
    return [i for i in best if b.order[i] <= b.order[top]] or [top]


def scenes_of(pen: Teller, ids: list[str], budget: int) -> list[list[dict]]:
    """The thread as scenes (a tie is one scene), the strongest kept until the word budget is spent, in date order."""
    b = pen.b
    top = b.top
    units: list[tuple[float, list[str]]] = []
    used = set()
    for mid in ids:
        if mid in used or mid == top:
            continue
        leg1 = b.mstory.get(mid, {}).get('first_leg')
        if leg1 and leg1 in b.by and leg1 not in used:
            used.update({mid, leg1})
            units.append((max(b.weight.get(mid, 0.3), b.weight.get(leg1, 0.3)) + 0.25, [leg1, mid]))
        elif not any(b.mstory.get(o, {}).get('first_leg') == mid for o in ids):
            used.add(mid)
            units.append((b.weight.get(mid, 0.25), [mid]))
    keep, spent = [], 0
    for w, u in sorted(units, key=lambda x: -x[0]):
        cost = 115 if len(u) == 2 else 50
        if spent + cost > budget and keep:
            continue
        keep.append(u)
        spent += cost
    keep.sort(key=lambda u: b.order[u[0]])
    out = []
    for u in keep:
        out.append(tie_scene(pen, u[0], u[1], req=True) if len(u) == 2 else [scene(pen, u[0], req=True)])   # a scene chosen is told whole
    return out


def season_film(pen: Teller, words_lo: int, hi: int) -> list[dict]:
    b = pen.b
    top = b.top
    road = thread(b)
    early = [m['id'] for m in b.matches if m['id'] not in road and m['id'] != top]
    # chapter 2: where it started — the people, the shirt, the first weeks
    ch2 = [beat(f'It began in {month(b.f(b.matches[0]["id"])["date"])}, against {b.opp(b.matches[0]["id"])}.',
                [b.matches[0]['id']], {'type': 'chapter', 'number': 2, 'title': 'Where It Started', 'backdrop': 'paper'}, 1.0, True, camera=pen.cam())]
    ch2 += cast_beats(pen)
    fb = hw.form_beat(pen, hw.pick_matches(b, [m['id'] for m in b.matches[:14]], {top}, 8), 'The first weeks')
    if fb:
        t = b.tally(fb['visual']['claims'])
        # one number that means something, never the tally (28.11.2026, studio/story_judge.py)
        n_ = t['w'] + t['d'] + t['l']
        fb['narration'] = (f'{b.club} lost {COUNT.get(t["l"], str(t["l"])).lower() if t["l"] > 1 else "one"} of their first {n_} matches.' if t['l']
                           else f'{b.club} did not lose any of their first {n_} matches.')
        fb['_req'] = True
        ch2.append(fb)
    for mid in hw.pick_matches(b, early, {top}, 1 if words_lo < 600 else 2):
        ch2.append(scene(pen, mid, weight=0.35))
    # chapter 3: the road
    sc = scenes_of(pen, road, max(120, hi - 45 - 330))
    first_road = next((i for s in sc for x in s for i in x['claim_ids'] if i in b.mstory), None)
    ch3 = [beat((f'The road to {b.opp(top)} began on {day(b.f(first_road)["date"])}, in the {b.comp(first_road, stage=True)}.' if first_road
                 else f'The road to {b.opp(top)} was a long one.'), [first_road] if first_road else [],
                {'type': 'chapter', 'number': 3, 'title': 'The Road', 'backdrop': 'paper'}, 1.0, True, camera=pen.cam())]
    rb = hw.road_beat(pen, road)
    if rb:
        rb['_w'], rb['_req'] = 0.5, False
        ch3.append(rb)
    for s in sc:
        ch3 += s
    # chapter 4: the night
    ch4 = [beat(f'One match was left: {b.comp(top, stage=True)}, {b.club} against {b.opp(top)}.', [top], {'type': 'chapter', 'number': 4, 'title': 'The Night', 'backdrop': 'paper'}, 1.0, True, camera=pen.cam())]
    ch4 += the_night(pen, top)
    # chapter 5: what was left
    record = f'summary:{b.main}' if b.main else None
    top_comp = b.f(top).get('competition')
    others = [h for h in b.honours if h.get('result') == 'won' and h.get('competition') and h['competition'] != top_comp and h['competition'] != (record or '')[8:]]
    ep = hw.epilogue(pen, 5, record, others)
    if record and ep['beats'] and ep['beats'][0]['visual'].get('type') == 'record':
        r = b.comps[record[8:]]
        champions = next((h for h in b.honours if h.get('result') == 'won' and h.get('competition') == record[8:]), None)
        complete = bool((b.summary or {}).get('complete')) if hasattr(b, 'summary') else False
        if r['lost'] == 0 and r['played'] >= 10:
            line = f'And in the {spoken(record[8:])}, {b.club} did not lose a match: {r["played"]} played, {r["won"]} won.'
        else:
            line = f'In the {spoken(record[8:])}: {r["won"]} wins in {r["played"]} matches.'
        ep['beats'][0]['narration'] = line + (' They were champions as well.' if champions else '')
        if champions:
            ep['beats'][0]['claim_ids'] = list(dict.fromkeys(ep['beats'][0]['claim_ids'] + [champions['id']]))
    lines = hw.dossier_lines(pen)
    add = [beat(lines[k][0], [lines[k][1]], {'type': 'illustration', 'art': pen.art(), 'caption': ''}, 0.8, False, camera=pen.cam())
           for k in ('verdict', 'verdict_club') if k in lines]
    ep['beats'][1:1] = add
    ep['title'] = 'What Was Left'
    return [{'title': 'Where It Started', 'beats': ch2}, {'title': 'The Road', 'beats': ch3}, {'title': 'The Night', 'beats': ch4}, ep]


def titles(pen: Teller) -> list[dict]:
    """The house's ten titles, the door's own two leading the discovery half."""
    b = pen.b
    out = hw.titles(pen)
    top = b.top
    h = b.cast.get('hero')
    mine = [f'The Small Print Of {b.club} {b.season}' if b.kind == 'season' else f'The Small Print Of {b.club} v {b.opp(top)}',
            f'How {spoken(h["fact"]["name"])} Got To {b.opp(top)}' if h else f'How {b.club} Got To {b.opp(top)}']
    disc = [t for t in out if t['angle'] == 'discovery']
    search = [t for t in out if t['angle'] == 'search']
    disc = [{'title': m[:100], 'angle': 'discovery'} for m in mine] + [t for t in disc if t['title'] not in mine][:3]
    return search[:5] + disc[:5]


def write_script(brief: dict, ledger: dict, log=print, avoid: list[dict] | None = None, check_at=None) -> dict:
    """A whole script by the raconteur, held to the checks of every house script (house_writer.write_script's own loop:
    a refused beat is cut, a film the record cannot carry is not written)."""
    from .common import StageError
    from .script import film_kind, target_words, validate_script
    from .writer import sized_minutes
    asked = float(brief.get('duration') or 5)
    minutes = sized_minutes(asked, ledger)
    kind = brief.get('kind') if brief.get('kind') in ('season', 'match', 'tie', 'rivalry') else film_kind(ledger)
    book = Book(ledger, kind)
    if not book.matches or not book.top:
        raise StageError('SCRIPT_INVALID', 'The house writers found no readable match in the record — there is no film to write.')
    check = check_at or (lambda s, m: validate_script(s, ledger, m, kind))
    seed = f'{ledger.get("club_id")}|{book.season}|{kind}|raconteur'
    lo, hi = target_words(minutes)
    pen = Teller(book, seed)
    pen.short = minutes < 5
    if kind != 'season' or len(book.matches) < 6:
        raise StageError('NOT_MINE', 'the raconteur tells seasons; another house writer takes this film')
    hk = hooks(pen)
    chs = [cold_open(pen, hk[0]), *season_film(pen, lo, hi)]
    hw.trim(chs, hi - 45 if minutes > 4 else hi)
    for ch in chs[:-1]:   # after the cut: a chapter still ends on its question (director rule 5)
        last = ch['beats'][-1]
        if not last['narration'].rstrip().endswith('?'):
            last['narration'] = f"{last['narration'].rstrip()} {pen.pick('cliff')}"
    hw.house_rules(chs, pen.v['cams'])
    took = hw.minutes_for(hw._count(chs), minutes)
    if took < hw.FLOOR_MINUTES:
        raise StageError('SCRIPT_INVALID', f'The record carries {hw._count(chs)} words of proven narration — too little for a film.')
    tc = titles(pen)
    s = {'director': 2, 'drama': 1, 'motif': 'a ticket stub kept for years', 'title_candidates': tc, 'selected': 5,
         'hook': hw._sentences(hk[0]['text'])[0], 'hook_options': hk, 'chapters': hw.clean(chs),
         'description': hw.description(pen, chs), 'tags': hw.tags(pen), 'shorts': hw.shorts(pen), 'thumbnails': hw.thumbnails(pen)}
    if avoid:
        taken = {o.get('title') for o in avoid}
        if s['title_candidates'][s['selected']]['title'] in taken:
            s['selected'] = next((i for i, t in enumerate(tc) if t['title'] not in taken), s['selected'])
    errs = check(s, took)
    for _ in range(12):
        if not errs:
            break
        s, took = hw._mend(s, errs, minutes, took)
        errs = check(s, took)
    if errs:
        from . import salvage as salvaging
        saved, report = salvaging.salvage(s, ledger, check, took)
        if saved is None:
            log('Raconteur: could not pass — ' + '; '.join(errs[:6]))
            raise StageError('SCRIPT_INVALID', f'The raconteur could not write a film that passes every check ({errs[0][:120]})')
        s, took = saved, report['minutes']
        s['_salvage'] = report
    s['_minutes'] = took
    s['_writer'] = [{'source': 'house', 'writer': ID, 'minutes': took}]
    return s


_ = Date

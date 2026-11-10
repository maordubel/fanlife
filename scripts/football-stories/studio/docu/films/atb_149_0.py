"""Storyboard: AROUND THE BALL · 02 · 149–0 — AS Adema v SO l'Emyrne, Toamasina, 31 October 2002.

Facts: docs/fanlife/around-the-ball/atb02-149-0.script.md (fact-checked 10.11.2026). Source 1 is the Wikipedia article
on the match; the bans are said only as "suspended" (no length), the coach is named as the article names him.
Pictures are library illustrations (studio/kit/beats/common), never a photograph of the match."""
import json, sys

def img(src, move='push', **k): return dict(kind='image', src=src, move=move, **k)
def word(text, **k): return dict(kind='word', text=text, **k)
B = []
def beat(vo=None, *shots, **k):
    B.append(dict(vo=vo, shots=list(shots), **k))

# ── COLD OPEN ──
beat("Madagascar. The thirty-first of October, two thousand and two. A league match in the port city of Toamasina.",
     img('stadium-green-pitch-kr.webp', 'push', veil=0.35), pre=1.0, sound=[('whoosh', 0.0, 1.2, 0.4)])
beat("The final score is one hundred and forty-nine to nil.",
     word('149 – 0', bg='ink', size=330), sound=[('impact', 0.0, 2.0, 0.9)], pad=0.6)
beat("And every single goal was scored by the team that lost. Into its own net.",
     img('ball-in-net-kr.webp', 'slam', veil=0.2), dict(kind='stamp', text='OWN GOAL ×149', side='them', x=260, y=600, dt=1.8, size=150),
     sound=[('stamp', 1.8, 1.0, 0.7)])
beat(None, word('AROUND THE BALL|149 – 0', bg='us', size=170), hold=2.4, sound=[('impact2', 0.0, 2.2, 0.9), ('riser', -1.4, 1.4, 0.5)])

# ── THE TITLE ──
beat(None, dict(kind='ticket', small='CHAPTER ONE', big='THE TITLE', line='MADAGASCAR · 2002'), hold=2.0)
beat("That season, Madagascar's champions were decided in a four-team play-off. SO l'Emyrne were the defending champions.",
     dict(kind='cities', a=dict(name='SO L’EMYRNE', small='THE CHAMPIONS'), b=dict(name='AS ADEMA', small='THE CHALLENGERS', bg='#1B9AD6'),
          mid='TOAMASINA', mid_at=1.6), sound=[('swish', 0.0, 1.0, 0.6)])
beat("In their previous game, against DSA Antananarivo, they were held to a two-all draw.",
     dict(kind='ledger', title='THE GAME BEFORE', us='SOE', them='DSA', compact=True, rows=[['PLAY-OFF', 2, 2]], row_at=[1.4]))
beat("A penalty, late in the game, went against them. They believed the referee had taken the title away.",
     img('referee-red-card-n.webp', 'push', veil=0.3), dict(kind='stamp', text='PENALTY', side='them', x=760, y=620, rot=6, dt=1.2, size=170),
     sound=[('whistle', 0.4, 1.2, 0.6), ('stamp', 1.2, 1.0, 0.7)])
beat("With that draw, AS Adema were champions. Before the last match had even been played.",
     img('trophy-lift-crowd-kr.webp', 'pull', veil=0.35), dict(kind='stamp', text='CHAMPIONS', side='us', x=420, y=560, dt=1.6, size=190),
     sound=[('stamp', 1.6, 1.0, 0.7)])

# ── THE PROTEST ──
beat(None, dict(kind='ticket', small='CHAPTER TWO', big='THE PROTEST', line='SO L’EMYRNE v AS ADEMA'), hold=2.0)
beat("The last match was SO l'Emyrne against the new champions. Kick-off.",
     img('stadium-green-pitch-kr.webp', 'panr', veil=0.4), sound=[('whistle', 0.6, 1.2, 0.6)])
beat("SO l'Emyrne pass the ball back. And shoot. Into their own goal.",
     img('ball-in-net-kr.webp', 'push', veil=0.2), word('1 – 0', bg='them', size=300, at=2.4), sound=[('impact', 2.4, 1.6, 0.8)])
beat("Again.", word('2 – 0', bg='them', size=300), sound=[('impact', 0.0, 1.2, 0.7)], pad=0.3)
beat("And again.", word('3 – 0', bg='them', size=300), sound=[('impact', 0.0, 1.2, 0.7)], pad=0.3)
beat("Adema's players stood and watched. The crowd did not believe what it was seeing.",
     dict(kind='tally', title='TOAMASINA · 31 OCTOBER 2002', cells=[('MINUTES', 90), ('OWN GOALS', 149)]),
     sound=[('tick', 0.2, 3.0, 0.4)])
beat("Ninety minutes. One hundred and forty-nine goals. About one every thirty-six seconds.",
     word('ONE GOAL|EVERY 36 SECONDS', bg='ink', size=170), sound=[('glitch', 0.0, 1.0, 0.6)], pad=0.6)
beat("Supporters went to the ticket office and asked for their money back.",
     img('ticket-office-window-kr.webp', 'push', veil=0.3), dict(kind='stamp', text='REFUND?', side='them', x=880, y=560, rot=7, dt=1.8, size=180),
     sound=[('stamp', 1.8, 1.0, 0.7)])

# ── THE FALLOUT ──
beat(None, dict(kind='ticket', small='CHAPTER THREE', big='THE FALLOUT', line='THE FEDERATION'), hold=2.0)
beat("Madagascar's federation suspended SO l'Emyrne's coach, Ratsimandresy Ratsarazaka, and several of his players.",
     img('newspaper-stand-n.webp', 'push', veil=0.35), dict(kind='stamp', text='SUSPENDED', side='them', x=360, y=560, dt=2.2, size=180),
     sound=[('page', 0.0, 1.0, 0.5), ('stamp', 2.2, 1.0, 0.7)])
beat("And the match went into the record books. It is still the highest score in the history of football.",
     dict(kind='tally', title='THE HIGHEST SCORE IN FOOTBALL', cells=[('AS ADEMA', 149), ('SO L’EMYRNE', 0), ('OWN GOALS', 149)]),
     dict(kind='stamp', text='WORLD RECORD', side='us', x=520, y=780, dt=3.2, z=16, size=140), sound=[('stamp', 3.2, 1.0, 0.8)])

# ── CLOSE ──
beat("One hundred and forty-nine goals. And not one of them was meant to win.",
     img('terrace-empty-dusk-n.webp', 'pull', veil=0.45), pad=1.4)
beat("If you love the strange side of this game as much as we do, this channel is for you. Subscribe, and the next one will find you.",
     img('stadium-green-pitch-kr.webp', 'push', veil=0.55), dict(kind='follow', club='Around the Ball', press_at=5.0),
     sound=[('claps', 5.0, 2.0, 0.6)])
beat(None, dict(kind='end', title='149 – 0', line='Around the Ball · @FanLifeFootballStories'), hold=4.0)

SB = dict(slug='atb-149-0', minutes=[1.8, 4], palette=dict(us='#1B9AD6', them='#D71920'),
          us=dict(), them=dict(), agg_label='', karaoke=True, sub_limit=44, bed=0.2,
          music=[dict(file='sports-atlasaudio-625740.mp3', from_beat=0, to_beat=9, vol=0.13),
                 dict(file='energy-gr0za-627556.mp3', from_beat=10, to_beat=17, vol=0.14),
                 dict(file='lofi-sub-clair-628178.mp3', from_beat=18, vol=0.12)],
          beats=B)

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'storyboard.json'
    open(out, 'w').write(json.dumps(SB, indent=1, ensure_ascii=False))
    print(out, len(B), 'beats', sum(len((b['vo'] or '').split()) for b in B), 'words')

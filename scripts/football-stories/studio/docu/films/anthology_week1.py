"""Storyboard: THE ANTHOLOGY · WEEK 1 — the connective narration between the channel's five DOCU films of 10–14.11.2026.

The anthology (youtube sprint plan, 10.11.2026: one a week, 45–60 min target) is cut from the five published masters:
149–0 (atb_149_0), Maksimir 1990 (classified_maksimir_1990), AEK 0–1 Panathinaikos 1994 (pao_aek_1994), Hapoel Tel Aviv
v Hapoel Be'er Sheva 2005 (hta_beersheva_2005) and Hapoel Petah Tikva v Feyenoord 1992 (hpt_feyenoord_1992). Each film
runs up to its own subscribe beat; the links below are drawn once and cut into the six joins (`JOINS` names the first beat
of each). No new fact: every line here restates a fact from one of the five storyboards, which carry the sources.
Pictures are the common library (studio/kit/beats/common), never a photograph of any of the matches.

The music under the films is the films' own, except `sub-clair-lofi-study` (Content ID claim, 13.11.2026): its spans are
re-mixed with another owner track (see docs/fanlife/anthology/week1.md).

    python3 studio/docu/films/anthology_week1.py links.json
"""
import json
import sys


def img(src, move='push', **k): return dict(kind='image', src=src, move=move, **k)
def word(text, **k): return dict(kind='word', text=text, **k)
def ticket(n, big, line): return dict(kind='ticket', small=f'FILE {n} OF 5', big=big, line=line)


B = []
JOINS = {}


def join(name):
    JOINS[name] = len(B)


def beat(vo=None, *shots, **k):
    B.append(dict(vo=vo, shots=list(shots), **k))


# ── COLD OPEN: the five shocks, the open question (paid off by the last file) ──
join('open')
beat("One hundred and forty-nine goals. And the team that lost scored every single one of them.",
     img('ball-in-net-kr.webp', 'slam', veil=0.25), word('149 – 0', bg='ink', size=300, at=2.6), pre=0.6,
     sound=[('impact', 2.6, 1.6, 0.8)])
beat("The most famous kick in the history of Yugoslav football. It never touched a ball.",
     img('terrace-fence-scarves-kr.webp', 'push', veil=0.35), sound=[('whoosh', 0.0, 1.2, 0.4)])
beat("A defender with more than seventy caps for Greece, and not one goal. Until one header.",
     img('header-goalmouth-kr.webp', 'pull', veil=0.3), sound=[('swish', 0.0, 1.0, 0.5)])
beat("Twelve-time champions of Israel, one bad night away from going down.",
     img('relegation-rain-kr.webp', 'push', veil=0.35))
beat("And a team that beat one of the great clubs of Europe, two, one, and went home that same night.",
     img('europe-stadium-night-n.webp', 'panr', veil=0.35), dict(kind='stamp', text='WON 2–1 · OUT', side='them', x=420, y=600, dt=3.2, size=150),
     sound=[('stamp', 3.2, 1.0, 0.7)])
beat("Five true stories. And one question to keep until the end. How do you win the match, and lose the tie?",
     word('HOW DO YOU WIN|AND LOSE?', bg='us', size=120), sound=[('riser', 0.0, 1.4, 0.5)], pad=0.8)
beat(None, word('FIVE NIGHTS|FOOTBALL NEVER FORGOT', bg='ink', size=150), hold=2.6, sound=[('impact2', 0.0, 2.2, 0.9)])

# ── FILE 1 · 149–0 ──
join('file1')
beat(None, ticket(1, '149 – 0', 'TOAMASINA · 2002'), hold=2.2)
beat("We start with the highest score in the history of football. And not one goal in it was meant to win.",
     img('stadium-green-pitch-kr.webp', 'push', veil=0.4), pad=0.6)

# ── FILE 2 · MAKSIMIR ──
join('file2')
beat("From a score that should never have happened, to a match that never happened at all.",
     img('street-dusk-kr.webp', 'pull', veil=0.4), pre=0.6)
beat(None, ticket(2, 'MAKSIMIR', 'ZAGREB · 1990'), hold=2.2)

# ── FILE 3 · NEA FILADELFEIA ──
join('file3')
beat("Four years later, in Athens. AEK had won three titles in a row. Panathinaikos had won seven games from seven.",
     img('stadium-night-bowl-n.webp', 'push', veil=0.4), pre=0.6)
beat("And the man who decided the night had never scored for his country.",
     img('free-kick-wall-kr.webp', 'pull', veil=0.35))
beat(None, ticket(3, 'NEA FILADELFEIA', 'ATHENS · 1994'), hold=2.2)

# ── FILE 4 · BLOOMFIELD ──
join('file4')
beat("Now a club at the other end of the table. Twelve league titles, and a season that could have sent them down.",
     img('relegation-rain-b-kr.webp', 'push', veil=0.4), pre=0.6)
beat(None, ticket(4, 'BLOOMFIELD', 'TEL AVIV · 2005'), hold=2.2)

# ── FILE 5 · RAMAT GAN ──
join('file5')
beat("And the question from the start. A club from Petah Tikva, a Cup Winners' Cup tie, and a win that sent them home.",
     img('europe-stadium-night-n.webp', 'pull', veil=0.4), pre=0.6)
beat(None, ticket(5, 'RAMAT GAN', 'PETAH TIKVA · 1992'), hold=2.2)

# ── CLOSE ──
join('close')
beat("Five nights. A score nobody meant. A kick at no ball. A header from a defender who never scored for Greece. A survival. And a win that sent a team home.",
     img('terrace-empty-dusk-n.webp', 'pull', veil=0.45), pre=0.8, pad=1.2)
beat("If you love the stories behind the scoreline as much as we do, this channel is for you. Subscribe, and the next one will find you.",
     img('stadium-green-pitch-kr.webp', 'push', veil=0.55), dict(kind='follow', club='Football Stories', press_at=5.0),
     sound=[('claps', 5.0, 2.0, 0.6)])
beat(None, dict(kind='end', title='FIVE NIGHTS', line='FanLife: Football Stories · @FanLifeFootballStories'), hold=4.0)

SB = dict(slug='anthology-week1-links', minutes=[1.5, 5], palette=dict(us='#1B9AD6', them='#D71920'),
          us=dict(), them=dict(), agg_label='', karaoke=True, sub_limit=44, bed=0.2, pronounce={},
          music=[dict(file='dark-leberch-625667.mp3', from_beat=0, vol=0.12)],
          joins=JOINS, beats=B)

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'storyboard.json'
    open(out, 'w').write(json.dumps(SB, indent=1, ensure_ascii=False))
    print(out, len(B), 'beats', sum(len((b['vo'] or '').split()) for b in B), 'words', JOINS)

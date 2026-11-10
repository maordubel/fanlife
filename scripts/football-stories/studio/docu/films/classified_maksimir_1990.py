"""Storyboard: CLASSIFIED · FILE 02 · MAKSIMIR — Dinamo Zagreb v Red Star Belgrade, 13 May 1990 (never played).

Facts: docs/fanlife/classified/file02-maksimir.script.md (claim ledger) and the checked additions of 10.11.2026:
Wikipedia "Dinamo–Red Star riot" (Boban kicked officer Refik Ahmetović, who was allegedly mistreating a supporter; the
officer, a Bosniak, publicly forgave Boban years later); Euronews 13.5.2020 (the plaque's words; Dario Brentin: the war
did not start at Maksimir); Dinamo's own account (awarded 0–3; Boban banned nine months, cut to four) against the FSJ
six-month ban reported by Wikipedia and These Football Times — told as two versions, never one.
Pictures: the owner's Drive pack (approved). Photographs carry ARCHIVE · CONTEXT (date and source not verified);
illustrations carry the reconstruction label. No crowd number, no minute, no dialogue is invented. CLASSIFIED rule 142:
nothing flickers — no glitch, no tint shake."""
import json, sys

def img(src, move='push', **k): return dict(kind='image', src=src, move=move, **k)
def photo(src, move='push', small='ARCHIVE · CONTEXT', big='', **k):
    return dict(kind='image', src=src, move=move, recon=False, tag=dict(big=big or 'MAKSIMIR', small=small, side='them'), **k)
def word(text, **k): return dict(kind='word', text=text, **k)
def stamp(text, side='them', x=300, y=560, dt=1.0, size=170, **k): return dict(kind='stamp', text=text, side=side, x=x, y=y, dt=dt, size=size, **k)
B = []
def beat(vo=None, *shots, **k):
    B.append(dict(vo=vo, shots=list(shots), **k))

# ── COLD OPEN ── (hook law 2: the impossible, said straight)
beat("Zagreb. The thirteenth of May, nineteen ninety. The most famous kick in the history of Yugoslav football.",
     photo('o01_kick.jpg', 'pull', big='13 MAY 1990', veil=0.15), pre=1.0, sound=[('whoosh', 0.0, 1.2, 0.4)])
beat("It never touched a ball.", word('IT NEVER|TOUCHED A BALL', bg='ink', size=190), sound=[('impact', 0.0, 2.0, 0.9)], pad=0.5)
beat("Because the match it belongs to never kicked off.",
     img('k_kick.png', 'push', veil=0.25), stamp('NEVER PLAYED', x=420, y=600, dt=1.4, size=180), sound=[('stamp', 1.4, 1.0, 0.8)])
beat("One photograph turned a footballer into a symbol, and an afternoon into a myth. This is what the picture shows. And what it leaves out.",
     img('k_broadcast.png', 'push', veil=0.35), dict(kind='cutout', src='cut_tv.png', x=1060, h=760, y=200), pad=0.6)
beat(None, word('CLASSIFIED|FILE 02 · MAKSIMIR', bg='them', size=170), hold=2.6, sound=[('impact2', 0.0, 2.2, 0.9), ('riser', -1.6, 1.6, 0.5)])

# ── CHAPTER ONE · THE FIXTURE ──
beat(None, dict(kind='ticket', small='CHAPTER ONE', big='THE FIXTURE', line='YUGOSLAV FIRST LEAGUE · 1989/90'), hold=2.0)
beat("Dinamo Zagreb against Red Star Belgrade. Two of the biggest clubs in Yugoslavia, from the two biggest cities of the federation.",
     dict(kind='cities', a=dict(name='DINAMO', small='ZAGREB'), b=dict(name='RED STAR', small='BELGRADE', bg='#C8102E'),
          mid='MAKSIMIR · 13 MAY 1990', mid_at=1.8), sound=[('swish', 0.0, 1.0, 0.6), ('clang', 0.9, 1.0, 0.4)])
beat("Each had its own terrace army. Dinamo had the Bad Blue Boys. Red Star had the Delije.",
     img('k_banner.png', 'panr', veil=0.3), dict(kind='stamp', text='BAD BLUE BOYS', side='us', x=140, y=180, dt=1.4, size=110),
     dict(kind='stamp', text='DELIJE', side='them', x=1180, y=760, rot=6, dt=3.0, size=130), sound=[('stamp', 1.4, 1.0, 0.6), ('stamp', 3.0, 1.0, 0.6)])
beat("That Sunday they were due to meet at Maksimir, Dinamo's home in Zagreb. A league match. Ninety minutes. That was the plan.",
     img('k_pitch.png', 'push', veil=0.4), stamp('SUNDAY · 13 MAY', side='us', x=200, y=200, dt=2.4, size=120), sound=[('stamp', 2.4, 1.0, 0.6)])

# ── CHAPTER TWO · THE COUNTRY ──
beat(None, dict(kind='ticket', small='CHAPTER TWO', big='THE COUNTRY', line='SPRING 1990'), hold=2.0)
beat("To understand that afternoon, look at the calendar. That spring, Croatia held its first multiparty elections.",
     img('k_broadcast.png', 'push', veil=0.6), dict(kind='cutout', src='cut_tv.png', x=200, h=700, y=260), sound=[('page', 0.0, 1.0, 0.5)])
beat("Franjo Tuđman's Croatian Democratic Union won a majority. In Belgrade, Slobodan Milošević led Serbia.",
     dict(kind='cutout', src='cut_tudjman.png', x=120, h=760, y=220), dict(kind='cutout', src='cut_milosevic.png', x=1180, h=900, y=140, z=7),
     dict(kind='stamp', text='ZAGREB', side='us', x=180, y=900, dt=1.2, size=110), dict(kind='stamp', text='BELGRADE', side='them', x=1160, y=900, rot=6, dt=4.0, size=110),
     sound=[('stamp', 1.2, 1.0, 0.6), ('stamp', 4.0, 1.0, 0.6)])
beat("Neither of them is in this story. But their country is. A federation pulling apart, and a football fixture in the middle of it.",
     img('k_fence.png', 'panl', veil=0.45), pad=0.6)
beat("The ballot explains the pressure around the stadium. The fixture tells you what everyone was supposed to be there for.",
     dict(kind='question', small='TWO THINGS, ONE SPRING', text='[THE BALLOT]|{THE FIXTURE}'), sound=[('tick', 0.2, 2.0, 0.4)])

# ── CHAPTER THREE · THE AFTERNOON ──
beat(None, dict(kind='ticket', small='CHAPTER THREE', big='THE AFTERNOON', line='ZAGREB · 13 MAY 1990'), hold=2.0)
beat("Red Star's supporters came to Zagreb. Through the day, there were clashes in the city. Then the trouble moved into the ground.",
     photo('o02_track.jpg', 'push', big='THE TRACK'), sound=[('whoosh', 0.0, 1.2, 0.4)])
beat("Inside Maksimir, advertising boards were torn down. Seats were ripped out and thrown. A fence went down.",
     img('k_fence.png', 'push', veil=0.3), stamp('FENCE DOWN', x=1000, y=700, rot=6, dt=2.6, size=150), sound=[('impact', 2.6, 1.4, 0.7)])
beat("Supporters and police met on the running track, and then on the pitch. Batons. Tear gas. A water cannon.",
     photo('o03_pitch.jpg', 'pull', big='THE PITCH'), sound=[('claps', 0.0, 4.0, 0.25)])
beat("Who started it, and in what order, is still argued over. Accounts in Zagreb and accounts in Belgrade do not agree.",
     img('k_pitch.png', 'panr', veil=0.4), dict(kind='stamp', text='VERSION A', side='us', x=140, y=240, dt=1.2, size=130),
     dict(kind='stamp', text='VERSION B', side='them', x=1160, y=760, rot=6, dt=3.4, size=130), sound=[('stamp', 1.2, 1.0, 0.6), ('stamp', 3.4, 1.0, 0.6)])
beat("What every account agrees on is this: the referee never blew for kick-off.",
     word('NO KICK-OFF', bg='ink', size=230), pad=0.6)

# ── CHAPTER FOUR · THE KICK ──
beat(None, dict(kind='ticket', small='CHAPTER FOUR', big='THE KICK', line='ZVONIMIR BOBAN · DINAMO'), hold=2.0)
beat("Some Dinamo players were still on the grass. Among them, their captain. Zvonimir Boban. Twenty-one years old.",
     img('k_pitch.png', 'push', veil=0.55), dict(kind='cutout', src='cut_boban.png', x=640, h=880, y=200),
     dict(kind='stamp', text='CAPTAIN · 21', side='us', x=150, y=200, dt=4.0, size=120), sound=[('stamp', 4.0, 1.0, 0.6)])
beat("Boban saw a police officer hitting a Dinamo supporter. That is what he says, and what most accounts say.",
     dict(kind='cutout', src='cut_officer.png', x=560, h=900, y=170), sound=[('page', 0.0, 1.0, 0.4)])
beat("He ran at the officer, and kicked him.",
     photo('o01_kick.jpg', 'slam', big='THE KICK', veil=0.05), sound=[('impact2', 0.4, 2.0, 0.9)], pad=0.4)
beat("The Bad Blue Boys closed around their captain, and walked him away from the police.",
     photo('o04_escorted.jpg', 'pull', big='ESCORTED'), sound=[('claps', 0.0, 4.0, 0.3)])
beat("Cameras caught it. Photographers caught it. That one frame was printed and shown, again and again, until it stood for the whole afternoon.",
     img('k_kick.png', 'push', veil=0.2), dict(kind='cutout', src='cut_tv.png', x=1180, h=520, y=420), pad=0.6)
beat("The officer has a name too. Refik Ahmetović.",
     dict(kind='cutout', src='cut_helmet.png', x=560, h=520, y=300), stamp('REFIK AHMETOVIĆ', side='them', x=380, y=820, dt=1.2, size=130),
     sound=[('stamp', 1.2, 1.0, 0.7)])
beat("Years later, he publicly forgave Boban.", word('HE FORGAVE HIM', bg='us', size=210), sound=[('impact', 0.0, 1.6, 0.6)], pad=0.6)

# ── CHAPTER FIVE · THE SCORE NOBODY SCORED ──
beat(None, dict(kind='ticket', small='CHAPTER FIVE', big='THE VERDICT', line='THE FOOTBALL ASSOCIATION OF YUGOSLAVIA'), hold=2.0)
beat("There was no kick-off, no goal, no ninety minutes. Dinamo's own history records the match awarded to Red Star. Three, nil.",
     dict(kind='ledger', title='13 MAY 1990 · MAKSIMIR', us='DINAMO', them='RED STAR', compact=True,
          rows=[['ON THE PITCH', '—', '—'], ['AWARDED', 0, 3]], row_at=[1.4, 4.6]),
     stamp('NOT PLAYED', x=520, y=820, dt=2.4, size=130), sound=[('stamp', 2.4, 1.0, 0.7)])
beat("A score that nobody scored.", word('0 – 3', bg='them', size=330, small='AWARDED · NOT PLAYED'), sound=[('impact', 0.0, 2.0, 0.8)], pad=0.5)
beat("And Boban was banned. How long depends on who you ask.",
     photo('o05_after.jpg', 'push', big='AFTER'), pad=0.3)
beat("Dinamo's account says nine months, cut to four. Other accounts say six. Either way, it cost him the World Cup in Italy that summer.",
     dict(kind='tally', title='THE BAN · TWO VERSIONS', cells=[('DINAMO: MONTHS', '9 → 4'), ('OTHER ACCOUNTS', 6), ('ITALIA 90', 'MISSED')]),
     sound=[('tick', 0.2, 2.6, 0.4)])

# ── CHAPTER SIX · THE MYTH ──
beat(None, dict(kind='ticket', small='CHAPTER SIX', big='THE MYTH', line='1990 · 1991 · 1994'), hold=2.0)
beat("Football carried on. The league finished. A year later, in May nineteen ninety-one, Dinamo and Red Star met again, in Zagreb.",
     dict(kind='tally', title='WHAT CAME NEXT', cells=[('MAY 1990', 'MAKSIMIR'), ('MAY 1991', 'THEY MET AGAIN')]))
beat("In June nineteen ninety-one, Croatia declared independence. War followed. Some of the men from those terraces went to fight in it.",
     img('k_after.png', 'push', veil=0.45), pad=0.6)
beat("In nineteen ninety-four, a monument went up outside Maksimir. Its plaque is for Dinamo fans for whom, in its words, the war started on the thirteenth of May, nineteen ninety.",
     img('k_escort.png', 'pull', veil=0.55), dict(kind='stamp', text='MONUMENT · 1994', side='us', x=200, y=200, dt=1.8, size=120),
     sound=[('stamp', 1.8, 1.0, 0.6)])
beat("Historians push back. The war, they say, did not start at a football ground. The afternoon was a symptom of a country already breaking.",
     dict(kind='question', small='DID THE WAR START HERE?', text='[A SYMBOL]|{NOT A CAUSE}'), sound=[('tick', 0.2, 2.0, 0.4)])
beat("Both of those things are part of the history. The myth, and the warning against it.",
     img('k_kick.png', 'pull', veil=0.4), pad=1.0)

# ── CLOSE ──
beat("Go back to the fixture card. Dinamo Zagreb. Red Star Belgrade. Maksimir. The thirteenth of May, nineteen ninety.",
     dict(kind='ledger', title='13 MAY 1990 · MAKSIMIR', us='DINAMO', them='RED STAR', compact=True, rows=[['FULL TIME', '', '']], row_at=[0.8]))
beat("The space for the score is still empty. What survived was a photograph. And the argument over what it meant.",
     photo('o01_kick.jpg', 'pull', big='FILE STAYS OPEN', veil=0.3), stamp('FILE OPEN', x=1120, y=700, rot=7, dt=4.4, size=150),
     sound=[('stamp', 4.4, 1.0, 0.8)], pad=1.2)
beat("If you love the stories football tried to forget, this channel is for you. Subscribe, and the next one will find you.",
     img('k_broadcast.png', 'push', veil=0.55), dict(kind='follow', club='Dinamo · Red Star', press_at=5.0), sound=[('claps', 5.0, 2.0, 0.5)])
beat(None, dict(kind='end', title='Maksimir · The Match That Was Never Played', line='CLASSIFIED · @FanLifeFootballStories'), hold=4.5)

SB = dict(slug='classified-maksimir-1990', minutes=[4.5, 9], palette=dict(us='#1F4FA3', them='#C8102E'),
          us=dict(), them=dict(), agg_label='', karaoke=True, sub_limit=44, bed=0.2,
          music=[dict(file='dark-leberch-625667.mp3', from_beat=0, to_beat=24, vol=0.13),
                 dict(file='sports-atlasaudio-625740.mp3', from_beat=25, to_beat=33, vol=0.12),
                 dict(file='lofi-sub-clair-628178.mp3', from_beat=34, vol=0.12)],
          beats=B)

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'storyboard.json'
    open(out, 'w').write(json.dumps(SB, indent=1, ensure_ascii=False))
    print(out, len(B), 'beats', sum(len((b['vo'] or '').split()) for b in B), 'words')

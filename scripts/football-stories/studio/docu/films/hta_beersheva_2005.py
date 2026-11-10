"""Storyboard: The Night an Empire Refused to Die — Hapoel Tel Aviv v Hapoel Be'er Sheva, 16 May 2005 (matchday 31).

Facts: the owner's brief (Drive pack "Hapoel BS", the_night_an_empire_refused_to_die.md — rule 18: the owner is a
source) and the archive (content/manual/matches.json: 2004/05, ליגת העל, מחזור 31, 16.5.2005, 3–1). Scorers: Tal Chen
once, Ibezito Ogbonna twice (archive and brief agree). The archive's goal minutes (Ogbonna 45, Chen 49, Ogbonna 59)
disagree with the brief's (Chen 29), so no goal minute is said or shown; the brief's order stands for the running score.
Minutes 7 (Haliva's free kick), 15 (Ben Dayan taken off by ambulance) and 86 (Abukasis on) are the brief's.
The headline is the page the owner supplied (images (8).jpg)."""
import json, sys

C = dict(us_crest='crest-hta.png', them_crest='crest-hbs.png')
def img(src, move='push', **k): return dict(kind='image', src=src, move=move, **k)
def tag(big, small='', side='us'): return dict(big=big, small=small, side=side)
def word(text, **k): return dict(kind='word', text=text, **k)
B = []
def beat(vo=None, *shots, **k):
    B.append(dict(vo=vo, shots=list(shots), **k))

# ── COLD OPEN ── what relegation is
beat("In American sports, a terrible season gets you a reward. A top draft pick.",
     dict(kind='table', n=16, cut=14, line_label='', push_at=99), pre=1.2, sound=[('page', 0.2, 1.0, 0.5)])
beat("In football, there is no safety net. Finish at the bottom, and you drop. It is called relegation.",
     dict(kind='table', n=16, cut=14, line_label='RELEGATION', push_at=3.2, push_scale=1.7), sound=[('whoosh', 3.2, 1.2, 0.5)])
beat("It means losing money. Losing your best players. Losing your name.",
     word('SPORTING|DEATH', bg='them', size=230, glitch=True), sound=[('impact', 0.0, 2.0, 0.9)], pad=0.6)
beat("For a small club, it is a tragedy.", img('badge27.png', 'pull', veil=0, pos='center', fade=True, recon=False, fit='contain'), pad=0.4)
beat("For a historic empire, it is the end of the world.",
     img('bloomfield.jpg', 'slam', veil=0.35), dict(kind='stamp', text='EMPIRE', side='us', x=520, y=380, dt=0.9, size=200),
     sound=[('stamp', 0.9, 1.0, 0.7)])
beat(None, word('16 MAY 2005|BLOOMFIELD STADIUM', bg='ink', size=120, glitch=True), hold=2.0, sound=[('glitch', 0.0, 1.0, 0.6)])
beat("This is the story of matchday thirty-one, the two thousand and four, two thousand and five season.",
     img('bloomfield.jpg', 'pull', veil=0.45), dict(kind='stamp', text='MATCHDAY 31', side='us', x=380, y=400, dt=1.0, size=150))
beat("The night one of Israel's biggest clubs stood on the edge of the abyss, and the ninety minutes it took to pull it back.",
     img('tunnel.jpg', 'push', veil=0.2))
beat(None, word('THE SURVIVAL|GAME', bg='us', size=200), hold=2.6, sound=[('impact2', 0.0, 2.2, 0.9), ('riser', -1.6, 1.6, 0.5)])

# ── THE EMPIRE ── (archive: trophies.json, matches.json 2001/02 UEFA Cup)
beat(None, dict(kind='ticket', small='CHAPTER ONE', big='THE EMPIRE', line='HAPOEL TEL AVIV'), hold=2.2)
beat("To understand the fear, you have to understand the club. By two thousand and five, Hapoel Tel Aviv had won the league twelve times.",
     img('badge80.png', 'pull', veil=0, recon=False, fit='contain'),
     dict(kind='tally', title='HAPOEL TEL AVIV · HONOURS BEFORE 2005', cells=[('LEAGUE TITLES', 12), ('STATE CUPS', 11), ('ASIAN CUP', 1)], dt=3.0))
beat("Eleven State Cups. And in nineteen sixty-seven, the Asian Champion Club Tournament.",
     dict(kind='tally', title='HAPOEL TEL AVIV · HONOURS BEFORE 2005', cells=[('LEAGUE TITLES', 12), ('STATE CUPS', 11), ('ASIAN CUP', 1)]))
beat("In two thousand, they won the double.", img('bloomfield.jpg', 'pull', veil=0.4),
     dict(kind='stamp', text='DOUBLE', side='us', x=560, y=400, dt=0.8, size=200), sound=[('stamp', 0.8, 1.0, 0.7)])
beat("And just three years before this night, they went on a run through Europe that nobody in Israel has forgotten.",
     dict(kind='ledger', title='UEFA CUP 2001/02', us='HAPOEL', them='OPPONENT', compact=True,
          rows=[['CHELSEA', 3, 1], ['LOKOMOTIV MOSCOW', 3, 1], ['PARMA', 2, 1], ['AC MILAN · QUARTER-FINAL', 1, 2]],
          row_at=[1.4, 2.4, 3.4, 4.4]), pad=1.6)
beat("Chelsea. Lokomotiv Moscow. Parma. All the way to a quarter-final against Milan.",
     dict(kind='ledger', title='UEFA CUP 2001/02 · AGGREGATE', us='HAPOEL', them='OPPONENT', compact=True,
          rows=[['CHELSEA', 3, 1], ['LOKOMOTIV MOSCOW', 3, 1], ['PARMA', 2, 1], ['AC MILAN · QUARTER-FINAL', 1, 2]],
          row_at=[0, 0, 0, 0], circle=[3, 2], note='out', circle_at=3.4), pad=1.0)

# ── THE FALL ── (archive: the 2004/05 league, matchdays 1–30)
beat(None, dict(kind='ticket', small='CHAPTER TWO', big='THE FALL', line='LIGAT HA’AL · 2004/05'), hold=2.2)
beat("Three years later, this is what their season looked like.",
     dict(kind='form', results=list('LWLLWDDWLLLLDLLLLDWWDWDDDWLDWL'), per_row=15, title='2004/05 · MATCHDAYS 1–30', sub='HAPOEL TEL AVIV · LEAGUE RESULTS', step=0.09), pad=2.6)
beat("Between November and January, ten league games without a single win.",
     dict(kind='form', results=list('LWLLWDDWLLLLDLLLLDWWDWDDDWLDWL'), per_row=15, title='2004/05 · MATCHDAYS 1–30', sub='HAPOEL TEL AVIV · LEAGUE RESULTS', step=0.0,
          bracket=(8, 17, 'MATCHDAYS 9–18 · TEN GAMES · NO WIN'), bracket_at=1.0), pad=1.2)
beat("Thirteen defeats in thirty matches. Thirty goals conceded, twenty-four scored.",
     dict(kind='tally', title='AFTER 30 MATCHDAYS', cells=[('WON', 8), ('DRAWN', 9), ('LOST', 13), ('SCORED', 24), ('CONCEDED', 30)]),
     sound=[('tick', 0.3, 2.0, 0.4)])
beat("The strangest part? That season they beat Maccabi Tel Aviv twice. Three, nil. And one, nil.",
     dict(kind='ledger', title='THE DERBIES · 2004/05', us='HAPOEL', them='MACCABI', compact=True,
          rows=[['19 FEBRUARY 2005', 3, 0], ['19 MARCH 2005', 1, 0]], row_at=[2.6, 3.8]))
beat("They could beat their biggest rival. They could not stop falling.",
     img('bloomfield.jpg', 'panr', veil=0.6), dict(kind='stamp', text='DANGER', side='them', x=1020, y=600, rot=6, dt=1.6, size=180),
     sound=[('stamp', 1.6, 1.0, 0.7)])

# ── THE STAKES ──
beat(None, dict(kind='ticket', small='CHAPTER THREE', big='THE STAKES', line="HAPOEL TEL AVIV · HAPOEL BE'ER SHEVA"), hold=2.2)
beat("By May two thousand and five, Hapoel Tel Aviv were suffocating. A nightmare season had dragged the red giant into a relegation fight.",
     img('tunnel.jpg', 'panr', veil=0.55))
beat("Their opponents were Hapoel Be'er Sheva, chaired by Eli Zino. Fighting for their lives as well. In November, Be'er Sheva had won their meeting one, nil. In February, Tel Aviv won the return, one, nil.",
     dict(kind='cities', a=dict(name='TEL AVIV', small='HAPOEL', crest='crest-hta.png'),
          b=dict(name="BE'ER SHEVA", small='HAPOEL', crest='crest-hbs.png', bg='#2B2A33'), mid='MATCHDAY 31', mid_at=1.4),
     sound=[('swish', 0.0, 1.0, 0.6), ('clang', 0.8, 1.0, 0.4)])
beat("This was not a match. It was a zero-sum game. Win, and you survive. Lose, and you die.",
     word('WIN = LIVE|LOSE = DIE', bg='ink', size=170), sound=[('impact', 0.3, 1.5, 0.7)])
beat("To stop the bleeding, Hapoel brought in this man.",
     img('shiye.jpg', 'pull', veil=0.1, pos='center 30%', tag=tag('SHIYE FEIGENBAUM', 'THE COACH')))
beat("Yehoshua Feigenbaum. Shiye. The club's all-time record goalscorer, called back to save it.",
     img('shiye.jpg', 'push', veil=0.55, pos='center 30%'),
     dict(kind='lead', text='RECORD GOALSCORER', sub='HAPOEL TEL AVIV · NOW IN THE DUGOUT', dt=0.8))
beat("If the empire fell on his watch, that would stay with his name for ever.",
     img('shiye.jpg', 'panl', veil=0.35, pos='center 25%'))

# ── THE SUCKER PUNCH ──
beat(None, dict(kind='ticket', small='CHAPTER FOUR', big='THE SUCKER PUNCH', line='BLOOMFIELD · 16 MAY 2005'), hold=2.2)
beat("Bloomfield is packed. And before Hapoel can settle their nerves, it happens.",
     img('tunnel.jpg', 'push', veil=0.15), dict(kind='cutout', src='scarf.png', x=1260, h=980, dt=0.6),
     agg=[0, 0], sound=[('build', 0.0, 4.0, 0.5)])
beat("Minute seven. A foul, eighteen metres from the Tel Aviv goal. Tomer Haliva stands over the ball. He strikes it.",
     dict(kind='chalk', minute=7, play='freekick', attack='them', label="HALIVA · FREE KICK", go=-1.4),
     sound=[('whistle', 0.4, 1.0, 0.6), ('tick', 0.3, 1.4, 0.4)], pad=0.8)
beat("One, nil. Be'er Sheva.", word('0–1', bg='them', size=420), agg=[0, 1], agg_dt=0.1,
     sound=[('impact', 0.0, 1.5, 0.9), ('hush', 0.2, 3.0, 0.8)], pad=1.6)
beat("The silence at Bloomfield is deafening. The phantom of the second division has taken a seat in the stand.",
     img('bloomfield.jpg', 'push', veil=0.7), dict(kind='question', text='[SECOND DIVISION?]', dt=2.4))

# ── TRENCH WARFARE ──
beat(None, dict(kind='ticket', small='CHAPTER FIVE', big='TRENCH WARFARE', line='FIRST HALF'), hold=2.0)
beat("What follows is not beautiful football. It is trench warfare.",
     img('tackle.jpg', 'slam', veil=0.15), sound=[('impact2', 0.1, 1.4, 0.7)])
beat("Every tackle is a fight for survival. Nobody gives an inch.",
     img('tackle.jpg', 'panr', veil=0.25))
beat("By the fifteenth minute, Be'er Sheva's defender Dedi Ben Dayan is hurt so badly that he leaves in an ambulance.",
     img('bloomfield.jpg', 'push', veil=0.65), dict(kind='lead', text="15' · AMBULANCE", sub='DEDI BEN DAYAN · BE’ER SHEVA', side='them', dt=1.2))
beat("Slowly, Tel Aviv claw their way back. A corner.",
     dict(kind='chalk', play='corner', attack='us', label='TAL CHEN', go=-0.9), pad=0.8)
beat("The ball finds Tal Chen, a defender with nerves of steel. One, one.",
     img('bloomfield.jpg', 'slam', veil=0.35), word('1–1', bg='us', size=420, at=2.6), agg=[1, 1], agg_dt=2.6, sound=[('goal', 2.6, 4.0, 0.9)])
beat("Bloomfield's heart starts beating again.", img('bloomfield.jpg', 'pull', veil=0.2), sound=[('chant', 0.0, 4.0, 0.35)])

# ── THE ERUPTION ──
beat(None, dict(kind='ticket', small='CHAPTER SIX', big='THE ERUPTION', line='SECOND HALF'), hold=2.0)
beat("But surviving is not enough. They need a hero.", word('THEY NEED|A HERO', bg='ink', size=190), sound=[('riser', 0.0, 2.4, 0.6)])
beat("Enter Ibezito Ogbonna. Zito. The Nigerian striker who decided this club was not going down.",
     dict(kind='tint', src='zito.jpg', pos='center 20%', recon=False, tag=tag('IBEZITO "ZITO" OGBONNA', 'STRIKER · NIGERIA'))
     , sound=[('impact', 0.0, 1.5, 1.0)])
beat("He takes the Be'er Sheva defence apart. Two, one.",
     img('zito.jpg', 'slam', veil=0.4, pos='center 20%', recon=False), word('2–1', bg='us', size=420, at=1.8, d=2.2),
     agg=[2, 1], agg_dt=1.8, sound=[('goal', 1.8, 4.0, 0.9)])
beat("And then Zito again. Three, one.",
     dict(kind='tint', src='zito.jpg', pos='center 25%', recon=False), word('3–1', bg='us', size=420, at=1.2, d=2.4),
     agg=[3, 1], agg_dt=1.2, sound=[('goal', 1.2, 5.0, 1.0)], flash=1.2)
beat("Look at him. That is not a goal celebration.", img('zito.jpg', 'push', veil=0.25, pos='center 15%', recon=False), pad=0.4)
beat("That is an exorcism.", word('EXORCISM', bg='us', size=260), sound=[('impact2', 0.0, 1.6, 0.9)], pad=0.6)
beat("The scream of thousands of supporters, letting go of months of fear.",
     img('bloomfield.jpg', 'pull', veil=0.25), dict(kind='cutout', src='scarf.png', x=1240, h=1000, dt=0.3),
     sound=[('swell', 0.0, 5.0, 0.6)])

# ── THE CAPTAIN AND THE HEADLINE ──
beat(None, dict(kind='ticket', small='CHAPTER SEVEN', big='THE CAPTAIN', line="86'"), hold=2.0)
beat("The win is safe. But football is theatre, and this night still needed its ending.",
     img('tunnel.jpg', 'push', veil=0.5))
beat("Minute eighty-six. The board goes up. Yossi Abukasis, the injured captain, the heart of the team, comes on.",
     dict(kind='board', minute="86'", **{'in': 'YOSSI ABUKASIS'}, bg='bloomfield.jpg'), sound=[('buzzer', 1.0, 1.0, 0.5)])
beat("He can barely run. He does not need to. He is there to be on the grass when they cheat death. Bloomfield stands for him.",
     img('bloomfield.jpg', 'panl', veil=0.3), sound=[('claps', 0.0, 6.0, 0.7)])
beat(None, word('FULL TIME', bg='ink', size=200, small='HAPOEL TEL AVIV 3 – 1 HAPOEL BE’ER SHEVA'), hold=2.6,
     agg_off=True, sound=[('whistle', 0.0, 1.5, 0.8), ('final', 0.3, 4.0, 0.8)])
beat("The next morning, the sports pages put the whole paradox of relegation football into one line.",
     dict(kind='press', src='paper.jpg', mark=(0.0, 0.0, 1.0, 0.12), zoom=1.8, small='THE NEXT MORNING',
          translation='“ZITO SURVIVED, ZINO NEARLY WENT DOWN”'), sound=[('page', 0.0, 1.0, 0.6)], pad=2.0)
beat("On one side, the relief of Zito Ogbonna and Hapoel Tel Aviv. On the other, Eli Zino's Be'er Sheva, left staring at the drop.",
     dict(kind='verdict', us='HAPOEL<br>TEL AVIV', them="HAPOEL<br>BE'ER SHEVA", us_line='SURVIVED', them_line='NEARLY WENT DOWN', them_at=3.4, **C))

# ── EPILOGUE ──
beat("Five days later they lost three, two at Maccabi Haifa. On the last day of the season they beat Maccabi Petah Tikva, one, nil. Hapoel Tel Aviv stayed up.",
     dict(kind='ledger', title='THE LAST TWO MATCHDAYS', us='HAPOEL', them='OPP.', compact=True,
          rows=[['21 MAY · AT MACCABI HAIFA', 2, 3], ['27 MAY · MACCABI PETAH TIKVA', 1, 0]], row_at=[1.0, 4.4]),
     dict(kind='stamp', text='STAYED UP', side='us', x=480, y=560, dt=7.4, z=16, size=160), sound=[('stamp', 7.4, 1.0, 0.8)], pad=1.6)
beat("Clubs celebrate titles with open-top buses and parades.",
     dict(kind='lights', src='bloomfield.jpg', towers=[(161, 88), (1350, 86)], off_at=[3.6, 4.4]))
beat("But sometimes, clawing your way out of the mud just to survive means a whole lot more.",
     img('badge80.png', 'pull', veil=0, recon=False, fit='contain'), pad=2.0)
beat("If your club ever made you feel like that, this channel is for you. Subscribe, and the next one will find you.",
     img('bloomfield.jpg', 'push', veil=0.5), dict(kind='follow', club='Hapoel Tel Aviv', press_at=5.2), sound=[('claps', 5.2, 2.0, 0.6)])
beat(None, dict(kind='end', title='The Night an Empire Refused to Die', line='YouTube · @FanLifeFootballStories'), hold=5.0)

SB = dict(slug='hta-beersheva-2005', minutes=[5.5, 10], palette=dict(us='#D7192A', them='#2B2A33'),
          us=dict(crest='crest-hta.png'), them=dict(crest='crest-hbs.png'), agg_label='BLOOMFIELD · LIVE',
          karaoke=True, sub_limit=44, bed=0.2,
          music=[dict(file='sports-atlasaudio-625740.mp3', from_beat=0, to_beat=14, vol=0.13),
                 dict(file='dark-leberch-625667.mp3', from_beat=15, to_beat=39, vol=0.13),
                 dict(file='energy-gr0za-627556.mp3', from_beat=40, to_beat=47, vol=0.15),
                 dict(file='lofi-sub-clair-628178.mp3', from_beat=48, vol=0.12)],
          beats=B)

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'storyboard.json'
    open(out, 'w').write(json.dumps(SB, indent=1, ensure_ascii=False))
    print(out, len(B), 'beats', sum(len((b['vo'] or '').split()) for b in B), 'words')

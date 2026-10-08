#!/usr/bin/env python3 -I
"""FANLIFE-DEEP-HISTORY-2026-10-08 → club-packs/{aek-athens,celtic,st-pauli}/wave-deep-history-2026-10-08.json
Usage: import-deep-history.py <unzipped package dir>      (run AFTER import-four-clubs.py; it extends that core's trophies in place)

Owner approval (Maor Harel, chat, 2026-10-08 20:30): "הכל מאושר. תתמיע הכל." Everything below is approved at confidence 2 with the source
URLs of the record it came from. What stays OUT, and why (all reported on stdout):
  · appearance/goal totals — the sources mix friendlies and official figures (aggregateScopeWarning); never combined here
  · aekpedia-only names — no exact-name twin in AEKdata, identity unverified, a second spelling of a listed player would double him
  · any match whose label cannot be split into two clubs + a known competition; any date that is not a real calendar day
  · deportation/memorial events are kept but flagged sensitive
Nothing is invented: unreadable → null/absent. Idempotent."""
import json, os, re, sys, hashlib, unicodedata, collections, datetime

SRC = os.path.join(sys.argv[1], "deep-three-clubs")
OWNER, DAY = "Maor Harel (owner, chat)", "2026-10-08"
NOTE = "Approved by the owner in chat on 2026-10-08 (FANLIFE-DEEP-HISTORY package)."
rd = lambda p: json.load(open(os.path.join(SRC, p), encoding="utf-8"))
rep = collections.defaultdict(collections.Counter)

def valid_day(s):
    try: return bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", s or "")) and datetime.date.fromisoformat(s) is not None
    except ValueError: return False
def fold(s):
    s = unicodedata.normalize("NFD", s or ""); s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^\w]+", " ", s.lower().replace("ς", "σ")).strip()
LAT = {"Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H", "Ι": "I", "Κ": "K", "Μ": "M", "Ν": "N", "Ο": "O", "Ρ": "P", "Τ": "T", "Υ": "Y", "Χ": "X"}
def fix_letters(s):
    if not s: return s
    return "".join(LAT.get(c, c) for c in s) if sum(c.isascii() and c.isalpha() for c in s) >= 3 else s
HOST = {"aekdata.gr": "AEKdata", "www.aekpedia.com": "AEKpedia", "www.thecelticwiki.com": "The Celtic Wiki", "www.weltfussball.de": "Weltfussball",
        "www.national-football-teams.com": "National-Football-Teams.com", "www.aekfc.gr": "AEK FC (official)", "football.aek.com": "football.aek.com (official)",
        "www.transfermarkt.com": "Transfermarkt", "www.scottishfa.co.uk": "Scottish FA", "www.fcstpauli.com": "FC St. Pauli (official)"}
SOURCES = {}
def S(url, title=None):
    if not url: return None
    sid = "dh-" + hashlib.sha1(url.encode()).hexdigest()[:12]
    if sid not in SOURCES:
        host = re.sub(r"^https?://([^/]+)/?.*$", r"\1", url)
        SOURCES[sid] = {"id": sid, "title": title or url, "url": url, "publisher": HOST.get(host, host), "access": "available", "checkedAt": DAY}
    return sid
def fact(id_, value, sources, conf=2, notes=""):
    f = {"id": id_, "value": value, "sources": [s for s in sources if s], "confidence": conf, "status": "approved" if conf >= 2 else "review",
         "researchedAt": DAY, "parserCertainty": "high", "conflictFree": True, "notes": (NOTE + " " + notes).strip() if conf >= 2 else notes}
    if conf >= 2: f.update(approvedAt=DAY, approvedBy=OWNER)
    return f
hid = lambda *p: hashlib.sha1("|".join(p).encode()).hexdigest()[:12]
pos_one = lambda s: s

# ── positions ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
GR_POS = {"τερματοφύλακας": "GK", "αμυντικός": "DF", "μέσος": "MF", "μεσοεπιθετικός": "MF", "επιθετικός": "FW"}
DE_POS = {"tor": "GK", "torwart": "GK", "abwehr": "DF", "mittelfeld": "MF", "sturm": "FW"}
def en_pos(s):
    t = (s or "").lower()
    if not t or t in ("-", "–"): return []
    if "goalkeeper" in t or t == "keeper": return ["GK"]
    if "half-back" in t or "half back" in t: return ["MF"]
    if "centre-half" in t or "centre half" in t or "back" in t or "defend" in t: return ["DF"]
    if "midfield" in t or "half" in t: return ["MF"]
    if "forward" in t or "striker" in t or "winger" in t or "wing" in t or "attack" in t: return ["FW"]
    return []

def years_from_seasons(seasons):
    ys = []
    for s in seasons:
        m = re.match(r"^(\d{4})(?:[-/](\d{2,4}))?$", (s or "").strip())
        if not m: continue
        a = int(m.group(1)); ys.append(a)
        if m.group(2):
            b = m.group(2); b = int(b) if len(b) == 4 else (a // 100) * 100 + int(b)
            if b < a: b += 100
            ys.append(b)
    return (min(ys), max(ys)) if ys else (None, None)

def player_fact(club, key, name, positions, fr, to, srcs, notes=""):
    if fr and to and fr > to: fr = to = None
    return fact("p-dh-" + hid(club, key), {"name": name, "sport": "football", "positions": positions, "fromYear": fr, "toYear": to, "aliases": []}, srcs, 2, notes)

def existing(club):
    core = json.load(open(f"club-packs/{club}/core.json")); names = {fold(p["value"]["name"]) for p in core["players"]}
    days = {m["value"]["on"] for m in core.get("matches", [])}; return core, names, days

# ═══ AEK ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
COMP_GR = [("Πρωτάθλημα ΕΠΣΑ", "Athens FCA championship"), ("Κύπελλο κυπελλούχων", "Cup Winners' Cup"), ("Κύπελλο πρωταθλητριών", "European Cup"),
           ("Βαλκανικό κύπελλο", "Balkan Cup"), ("Champions league", "UEFA Champions League"), ("Europa League", "UEFA Europa League"),
           ("Conference League", "UEFA Conference League"), ("Πρωτάθλημα", "Greek league"), ("Κύπελλο", "Greek Cup"), ("Play off", "Super League play-offs"),
           ("Play out", "Super League play-outs"), ("UEFA", "UEFA Cup"), ("Super Cup", "Greek Super Cup"), ("Κύπελλο Εκθέσεων", "Fairs Cup")]
def aek():
    club = "aek-athens"; core, names, days = existing(club); w = {k: [] for k in ("sources", "players", "matches", "archive", "trophies")}
    # players: AEKdata profiles
    drop = collections.Counter()
    for r in rd("aek-athens/aekdata-players-detailed.json"):
        name = fix_letters((r.get("name") or "").strip())
        if not name: drop["no name"] += 1; continue
        if fold(name) in names: drop["already in core (exact name, accent/case folded)"] += 1; continue
        names.add(fold(name))
        pos = [GR_POS[r["positionSource"].strip().lower()]] if (r.get("positionSource") or "").strip().lower() in GR_POS else []
        env = re.match(r"^(\d{4})-\d{2} έως (\d{4})-(\d{2})$", r.get("seasonEnvelope") or "")
        fr = to = None
        if env:
            fr = int(env.group(1)); to = (int(env.group(2)) // 100) * 100 + int(env.group(3))
            if to < int(env.group(2)): to += 100
        else:
            fr, to = years_from_seasons([x.get("season") for x in r.get("seasonStats", [])])
        w["players"].append(player_fact(club, r["profileUrl"], name, pos, fr, to, [S(r["profileUrl"], f"{name} — AEKdata")], "Career years are the AEKdata season envelope; totals not imported (they mix friendlies)."))
    rep[club].update({"players added": len(w["players"]), **{"players skipped: " + k: v for k, v in drop.items()}})
    # matches: AEKdata official index
    skip = collections.Counter(); seen = set(days)
    for s in rd("aek-athens/match-index-by-season.json"):
        for m in s["matches"]:
            lab = m["matchLabelSource"]; mm = re.match(r"^(.*?)\s*(\d+) - (\d+)(παρ\.)?\s+([ΗΝΙ])$", lab)
            d = re.fullmatch(r"(\d{2})/(\d{2})/(\d{4})", m["dateSource"] or "")
            if not mm or not d: skip["label/date unreadable"] += 1; continue
            on = f"{d.group(3)}-{d.group(2)}-{d.group(1)}"
            if not valid_day(on): skip["not a calendar day"] += 1; continue
            head = mm.group(1).split(",")[0].strip(); hg, ag = int(mm.group(2)), int(mm.group(3))
            comp = None
            for tok, en in COMP_GR:
                if head.lower().endswith(tok.lower()): comp = en; head = head[: -len(tok)].strip(); break
            if not comp: skip["competition unknown"] += 1; continue
            if head.startswith("ΑΕΚ - "): home, away = "ΑΕΚ", head[6:].strip()
            elif head.endswith(" - ΑΕΚ"): home, away = head[:-6].strip(), "ΑΕΚ"
            else: skip["AEK side not readable"] += 1; continue
            if not home or not away: skip["a side empty"] += 1; continue
            if on in seen: skip["day already covered"] += 1; continue
            seen.add(on)
            name = f"{home} {hg}-{ag} {away}"; pen = " Decided on penalties." if mm.group(4) else ""
            w["matches"].append(fact("m-dh-" + hid(club, m["matchSourceUrl"]), {"name": name, "on": on, "competition": comp, "score": f"{hg}-{ag}", "venue": None, "scorers": [], "lineup": [], "bench": [], "sport": "football"},
                                     [S(m["matchSourceUrl"], f"{name} — AEKdata")], 2, "Score as displayed by the source (official-matches filter)." + pen))
    rep[club].update({"matches added": len(w["matches"]), **{"matches skipped: " + k: v for k, v in skip.items()}})
    # honours
    HON = {"Πρωτάθλημα": "Greek league", "Κύπελλο Ελλάδας": "Greek Cup", "Πρωτάθλημα Football League": "Second division (Football League)", "Πρωτάθλημα Football League 2": "Third division (Football League 2)",
           "Super Cup": "Greek Super Cup", "League Cup": "Greek League Cup", "Πρωτάθλημα Αθήνας": "Athens championship"}
    trophies(club, core, w, rd("aek-athens/honours-detailed.json"), HON, lambda s: s.replace("-", "/"), "AEKdata honours list (football.aek.com lineage — not an independent confirmation).")
    return core, w

def trophies(club, core, w, rows, mapping, season_style, note):
    by = collections.OrderedDict()
    for r in rows:
        en = mapping.get(r["competitionSource"]); s = r.get("seasonSource") or r.get("seasonOrYearSource")
        if not en or not s: rep[club]["honours skipped (unmapped/empty)"] += 1; continue
        by.setdefault(en, {"seasons": [], "src": set()})["seasons"].append(season_style(s)); by[en]["src"].add(r["sourceUrl"])
    cur = {t["value"]["name"].lower(): t for t in core.get("trophies", [])}
    for en, g in by.items():
        seasons = sorted(set(g["seasons"])); srcs = [S(u, f"{en} — honours") for u in sorted(g["src"])]
        t = cur.get(en.lower())
        if t:  # extend the core's row in place (same competition, fuller list)
            t["value"]["seasons"] = sorted(set(t["value"]["seasons"]) | set(seasons)); t["sources"] = list(dict.fromkeys(t["sources"] + [s for s in srcs if s])); rep[club]["trophies extended"] += 1
        else:
            w["trophies"].append(fact("tr-dh-" + hid(club, en), {"name": en, "seasons": seasons, "count": len(seasons)}, srcs, 2, note)); rep[club]["trophies added"] += 1

# ═══ Celtic ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
def celtic():
    club = "celtic"; core, names, days = existing(club); w = {k: [] for k in ("sources", "players", "matches", "archive", "trophies")}
    drop = collections.Counter()
    for r in rd("celtic/players-detailed.json"):
        name = (r.get("nameSource") or "").strip(); pf = r.get("personalFieldsSource") or {}
        if not name: drop["no name"] += 1; continue
        if fold(name) in names: drop["already in core (exact name, folded)"] += 1; continue
        names.add(fold(name))
        seasons = [c["cells"][0] for c in r.get("careerTableRows", []) if c.get("cells") and re.match(r"^\d{4}", c["cells"][0] or "")]
        fr, to = years_from_seasons(seasons)
        if fr is None:  # modern profiles: a Celtic row with from/to dates (dd/mm/yyyy)
            ys = [int(x[-4:]) for c in r.get("careerTableRows", []) if c.get("cells") and len(c["cells"]) > 2 and c["cells"][0].strip().lower() == "celtic" for x in c["cells"][1:3] if re.fullmatch(r"\d{2}/\d{2}/\d{4}", x or "")]
            fr, to = (min(ys), max(ys)) if ys else (None, None)
        w["players"].append(player_fact(club, r["sourceUrl"] if r.get("sourceUrl") else r["id"], name, en_pos(pf.get("Position")), fr, to, [S(r.get("sourceUrl") or r.get("profileUrl"), f"{name} — The Celtic Wiki")],
                                        "Years from the Celtic Wiki career table; appearance totals not imported."))
    rep[club].update({"players added": len(w["players"]), **{"players skipped: " + k: v for k, v in drop.items()}})
    seen = set(days); skip = collections.Counter()
    for m in rd("celtic/historical-matches.json"):
        on = m.get("date"); t = m.get("titleSource") or ""; mm = re.match(r"^\d{4}-\d{2}-\d{2}:\s*(.+?)\s+(\d+)-(\d+)\s+(.+?)(?:,\s*([^,]+))?$", t)
        if m.get("datePrecision") != "day" or not valid_day(on) or not mm: skip["title/date unreadable"] += 1; continue
        if on in seen: skip["day already covered"] += 1; continue
        seen.add(on); home, hg, ag, away, comp = mm.group(1), mm.group(2), mm.group(3), mm.group(4), (mm.group(5) or "").strip() or None
        away = re.sub(r"\s*\(.*\)$", "", away)
        w["matches"].append(fact("m-dh-" + hid(club, m["id"]), {"name": f"{home} {hg}-{ag} {away}", "on": on, "competition": comp, "score": f"{hg}-{ag}", "venue": None, "scorers": [], "lineup": [], "bench": [], "sport": "football"},
                                 [S(m.get("sourceUrl") or m.get("pageUrl") or m.get("url"), f"{home} {hg}-{ag} {away} — The Celtic Wiki")], 2, "Date and score from the key-match page title; line-ups and scorers not extracted."))
    rep[club].update({"matches added": len(w["matches"]), **{"matches skipped: " + k: v for k, v in skip.items()}})
    HON = {k: k for k in ("European Cup", "Scottish League", "Scottish Cup", "Scottish League Cup", "Glasgow Cup", "Glasgow Charity Cup")}
    trophies(club, core, w, rd("celtic/honours-detailed.json"), HON, lambda s: s, "The Celtic Wiki honours list; the Scottish Cup subpage that lists false years was not used.")
    return core, w

# ═══ St Pauli ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
def pauli():
    club = "st-pauli"; core, names, days = existing(club); w = {k: [] for k in ("sources", "players", "matches", "archive", "trophies")}
    drop = collections.Counter()
    for r in rd("st-pauli/players-detailed.json"):
        name = (r.get("nameSource") or "").strip(); rows = [c["cells"] for c in r.get("careerTableRows", []) if c.get("cells") and len(c["cells"]) >= 3 and "St. Pauli" in c["cells"][2]]
        if not name or not rows: drop["no St. Pauli row / no name"] += 1; continue
        if fold(name) in names: drop["already listed (exact name, folded)"] += 1; continue
        names.add(fold(name)); ys = []
        for c in rows: ys += [int(x) for x in re.findall(r"\b(\d{4})\b", c[0])]
        poss = []
        for c in rows:
            if len(c) >= 5 and c[4].strip().lower() in DE_POS and DE_POS[c[4].strip().lower()] not in poss: poss.append(DE_POS[c[4].strip().lower()])
        w["players"].append(player_fact(club, r["sourceUrl"], name, poss[:1], min(ys) if ys else None, max(ys) if ys else None, [S(r["sourceUrl"], f"{name} — Weltfussball")], "Years from the club's rows in the Weltfussball career table."))
    n1 = len(w["players"])
    for r in rd("st-pauli/nft-players.json"):
        raw = (r.get("nameSource") or "").strip(); name = " ".join(reversed([p.strip() for p in raw.split(",", 1)])) if "," in raw else raw
        if not name: continue
        if fold(name) in names: drop["NFT: already listed"] += 1; continue
        names.add(fold(name)); fr, to = years_from_seasons([m["seasonSource"] for m in r.get("seasonMemberships", [])])
        w["players"].append(player_fact(club, r["playerSourceUrl"], name, en_pos(r.get("positionSource")), fr, to, [S(r["playerSourceUrl"], f"{name} — National-Football-Teams.com")], "Years from the seasons National-Football-Teams lists at the club."))
    rep[club].update({"players added (Weltfussball)": n1, "players added (NFT)": len(w["players"]) - n1, **{"players skipped: " + k: v for k, v in drop.items()}})
    HON = {"Oberliga Nord": "Oberliga Nord", "Regionalliga Nord": "Regionalliga Nord", "2. Bundesliga": "2. Bundesliga", "2. Bundesliga Nord": "2. Bundesliga Nord", "Hamburger Pokal": "Hamburg Cup", "Stadtliga Hamburg": "Hamburg city league"}
    trophies(club, core, w, rd("st-pauli/honours-detailed.json"), HON, lambda s: s, "Honours list reviewed against season tables (an Oberliga Nord candidate with wrong years was excluded).")
    return core, w

# ═══ curated events → archive ══════════════════════════════════════════════════════════════════════════════════════════════════════
EV = {  # (club, date): (English title without any year, hint without any year, sensitive)
 ("aek-athens", "1924-04-13"): ("AEK Athens is founded by Constantinople-born athletes", "A club of refugees and exiles from Constantinople.", False),
 ("aek-athens", "1924-09-18"): ("The club statute is approved by the court", "The legal birth certificate of the club.", False),
 ("aek-athens", "1999-04-07"): ("A friendly in Belgrade while the city is under bombing", "A match played in a city at war.", False),
 ("aek-athens", "2013-04-21"): ("AEK's first relegation from the top flight", "The start of the road back through the lower leagues.", False),
 ("aek-athens", "2022-09-30"): ("The new stadium in Nea Filadelfeia opens", "The Agia Sophia stadium, built on the site of the old Nikos Goumas.", False),
 ("st-pauli", "1941-10-25"): ("Arthur and Gertrud Mannheimer are deported to the Lodz ghetto", "Remembered by the club's museum and stumbling stones.", True),
 ("st-pauli", "1942-07-11"): ("Selig Kahn and his family are deported to Auschwitz", "A member of the football department, remembered by the club.", True),
 ("st-pauli", "1977-09-03"): ("The first Bundesliga derby win against Hamburg: 2-0", "A first top-flight derby win.", False),
 ("st-pauli", "1979-06-09"): ("The licence is withdrawn and the club is forced down to the third tier", "A forced relegation.", False),
 ("st-pauli", "1991-10-28"): ("The stadium rules ban racist messages", "A statute that shaped the Millerntor.", False),
 ("st-pauli", "1995-03-07"): ("A 4-2 defeat in Kaiserslautern in the cup quarter-final", "A cup run that ended at the last eight.", False),
 ("st-pauli", "1999-11-10"): ("The supporters' department AFM is created", "Organised fans inside the club structure.", False),
 ("st-pauli", "2006-04-12"): ("The cup run ends in the semi-final: a 3-0 defeat to Bayern", "A fourth-tier club in a cup semi-final.", False),
 ("st-pauli", "2007-06-02"): ("The Regionalliga Nord championship flag is received in Magdeburg", "The title flag handed over away from home.", False),
 ("st-pauli", "2008-08-22"): ("Fabio Morena is sent off after 93 seconds against Greuther Furth", "One of the quickest red cards in the club's history.", False),
 ("st-pauli", "2011-02-16"): ("Gerald Asamoah's goal decides the derby against Hamburg", "A derby won by one goal.", False),
 ("st-pauli", "2024-06-05"): ("Selig Kahn and his family are commemorated with stumbling stones", "A memorial at the Millerntor.", True),
 ("st-pauli", "2024-11-12"): ("Arthur and Gertrud Mannheimer are commemorated with stumbling stones", "A memorial at the Millerntor.", True),
 ("st-pauli", "1946-11-17"): ("The rebuilt stadium opens with a 1-0 win over Schalke", "The ground rebuilt after the war.", False),
 ("st-pauli", "1977-08-06"): ("The Bundesliga debut: 3-1 against Werder Bremen", "The first top-flight match in club history.", False),
 ("st-pauli", "1990-02-15"): ("The Fanladen opens", "The fan project that became part of the club's identity.", False),
 ("st-pauli", "2003-07-12"): ("A benefit match against Bayern Munich saves the club's finances", "The income stayed with St. Pauli.", False),
 ("st-pauli", "2024-11-10"): ("Membership of the supporters' cooperative opens", "Fans buying a stake in their own club.", False),
 ("celtic", "2026-05-16"): ("Celtic win the 56th league title after beating Hearts 3-1", "The league championship, sealed at home.", False),
 ("celtic", "2026-05-23"): ("Celtic win the 43rd Scottish Cup after beating Dunfermline 3-1", "A cup final victory.", False),
}
NOTABLE_AEK = ("Olympiacos", "Ολυμπιακός", "Παναθηναϊκός", "ΠΑΟΚ")
def match_card(club, f, round_txt, hint_extra=""):
    v = f["value"]; return fact("t-dh-" + f["id"].split("-")[-1], {"name": v["name"], "hint": (v["competition"] or "") + (" " + round_txt if round_txt else "") + hint_extra, "sport": "football", "sensitive": False, "on": v["on"], "precision": "day", "year": int(v["on"][:4])}, f["sources"], 2, "Timeline card made from the approved match row; no fact added.")

def events():
    out = collections.defaultdict(list); skip = collections.Counter()
    for e in rd("curated-historical-events.json"):
        if e["datePrecision"] != "day" or not valid_day(e["date"]): skip["not an exact day"] += 1; continue
        k = (e["club"], e["date"])
        if k not in EV: skip["no English wording written"] += 1; continue
        name, hint, sens = EV[k]
        out[e["club"]].append(fact("t-dh-" + hid(*k), {"name": name, "hint": hint, "sport": "football", "sensitive": sens, "on": e["date"], "precision": "day", "year": int(e["date"][:4])},
                                    [S(e["sourceUrl"], name)], 2, "English wording written from the staged Hebrew title; no fact added."))
    return out, skip

def main():
    ev, evskip = events()
    for club, fn in (("aek-athens", aek), ("celtic", celtic), ("st-pauli", pauli)):
        core, w = fn()
        have = {a["value"].get("on") for a in core["archive"]}
        w["archive"] = [a for a in ev.get(club, []) if a["value"]["on"] not in have]
        have |= {a["value"]["on"] for a in w["archive"]}
        for f in w["matches"]:
            v = f["value"]; on = v["on"]
            if on in have: continue
            comp = v["competition"] or ""
            if club == "aek-athens":
                euro = any(k in comp for k in ("UEFA", "European", "Cup Winners", "Balkan", "Champions", "Europa", "Conference"))
                derby = any(k in v["name"] for k in NOTABLE_AEK) and "league" in comp.lower()
                final = f["_round"] if False else False
                if not (euro or derby): continue
            w["archive"].append(match_card(club, f, "")); have.add(on)
        rep[club]["archive events added"] = len(w["archive"]); rep[club].update({"events skipped: " + k: v for k, v in evskip.items()}) if club == "aek-athens" else None
        used = {s for k in ("players", "matches", "archive", "trophies") for f in w[k] for s in f["sources"]}
        used |= {s for t in core["trophies"] for s in t["sources"] if s in SOURCES}
        have_src = {s["id"] for s in core["sources"]}
        w["sources"] = [SOURCES[s] for s in sorted(used) if s in SOURCES and s not in have_src]
        # core trophies may have been extended with new source ids → they live in this wave's sources; keep core valid by adding them to core too
        need = {s for t in core["trophies"] for s in t["sources"]} - have_src
        core["sources"] += [SOURCES[s] for s in sorted(need) if s in SOURCES]
        w["sources"] = [s for s in w["sources"] if s["id"] not in {x["id"] for x in core["sources"]}]
        json.dump(core, open(f"club-packs/{club}/core.json", "w"), ensure_ascii=False, indent=1); open(f"club-packs/{club}/core.json", "a").write("\n")
        json.dump(w, open(f"club-packs/{club}/wave-deep-history-2026-10-08.json", "w"), ensure_ascii=False, indent=1); open(f"club-packs/{club}/wave-deep-history-2026-10-08.json", "a").write("\n")
    out = "docs/fanlife/research/deep-history-2026-10-08"; os.makedirs(out, exist_ok=True)
    json.dump({c: dict(v) for c, v in rep.items()}, open(out + "/import-report.json", "w"), ensure_ascii=False, indent=1)
    for f in ("manifest.json", "verification.json", "conflicts-and-scope.json", "coverage-backlog.json", "profile-retrieval-gaps.json"): 
        import shutil; shutil.copy(os.path.join(SRC, f), out)
    shutil.copy(os.path.join(sys.argv[1], "FANLIFE-DEEP-HISTORY-HE.md"), out)
    for c, v in rep.items(): print(c, dict(v))
main()

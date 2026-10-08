#!/usr/bin/env python3
"""FANLIFE-FOUR-CLUBS-2026-10-08 → club packs. Usage: import-four-clubs.py <unzipped package dir>

Owner approval (Maor Harel, chat, 2026-10-08): the package's information is approved for the archive. Everything it marks as a
conflict, everything below confidence 2 and everything with no exact calendar day for a dated claim stays OUT of the approved set
(confidence-1 rows are written as `review`). Nothing is invented: a null stays null, "-" is not a value, a name is written as the
source wrote it (case and Greek/Latin look-alike letters normalised, nothing else).

Writes
  club-packs/{aek-athens,celtic,st-pauli}/core.json        (new review-loadable clubs)
  club-packs/panathinaikos/wave-four-clubs-2026-10-08.json  (honours, culture, kits, notable matches)
  docs/fanlife/research/four-clubs-2026-10-08/             (dossiers, coverage, schema policy, README)
Idempotent. Pure function of the package.
"""
import json, os, re, shutil, sys, collections

SRC = sys.argv[1]
OWNER, DAY = "Maor Harel (owner, chat)", "2026-10-08"
NOTE = "Approved by the owner in chat on 2026-10-08 (FANLIFE-FOUR-CLUBS package)."
rd = lambda p: json.load(open(os.path.join(SRC, p)))
ok_date = lambda s: bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", s or "")) and __import__("datetime").date.fromisoformat(s) is not None

def valid_day(s):
    try:
        return bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", s or "")) and __import__("datetime").date.fromisoformat(s) is not None
    except ValueError:
        return False

LAT = {"Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H", "Ι": "I", "Κ": "K", "Μ": "M", "Ν": "N", "Ο": "O", "Ρ": "P", "Τ": "T", "Υ": "Y", "Χ": "X"}
def fix_letters(s):  # Greek capital look-alikes inside a Latin word (e.g. "GIANNΙNA")
    if not s: return s
    latin = sum(c.isascii() and c.isalpha() for c in s)
    return "".join(LAT.get(c, c) for c in s) if latin >= 3 else s
ACR = {"AEK", "AEL", "OFI", "PAOK", "PAS", "FC", "AC", "SC", "SK", "NK", "FK", "IF", "KV", "CF", "AZ", "AS", "RC", "TC", "BSC", "CSKA", "HJK", "GAS", "APOEL"}
def nice(name):
    n = fix_letters(name).strip()
    if n.upper() != n: return n
    return " ".join(w if w in ACR or re.search(r"\d", w) else w.capitalize() for w in n.split(" "))
# club-name spellings that denote one club; applied only to the PAO notable subset, never as a fuzzy match
ALIAS = {"olympiakos": "Olympiacos", "olympiacos": "Olympiacos", "aek": "AEK Athens", "aek athens": "AEK Athens", "paok": "PAOK",
         "panathinaikos": "Panathinaikos", "ajax": "Ajax", "juventus": "Juventus", "barcelona": "Barcelona", "feyenoord": "Feyenoord",
         "a.c. milan": "AC Milan", "slavia prague": "Slavia Prague", "slavia praha": "Slavia Prague", "f.k. bruge": "Club Brugge", "f.κ. bruge": "Club Brugge",
         "club brugge kv": "Club Brugge", "aris": "Aris", "schalke": "Schalke 04", "fc schalke 04": "Schalke 04", "marseille": "Marseille", "tottenham": "Tottenham Hotspur"}
def club_name(n):
    n = fix_letters(n or "")
    return ALIAS.get(n.lower(), nice(n))
COMP = {"super league": "Super League", "super league play offs": "Super League play-offs", "greek cup": "Greek Cup", "friendly matches": "Friendly",
        "europa league": "UEFA Europa League", "uefa champions league": "UEFA Champions League", "champions league": "UEFA Champions League",
        "european cup": "European Cup", "uefa cup": "UEFA Cup", "intercontinental cup": "Intercontinental Cup", "balkan cup": "Balkan Cup",
        "greek super cup (club classification)": "Greek Super Cup"}
EURO = {"UEFA Europa League", "UEFA Champions League", "European Cup", "UEFA Cup", "Intercontinental Cup", "Balkan Cup"}

def src_index():
    return {s["id"]: s for s in rd("sources.json")}
SRC_BY = src_index()
def sources_for(ids):
    out, seen = [], set()
    for i in ids:
        s = SRC_BY.get(i)
        if s and i not in seen:
            seen.add(i); out.append({"id": i, "title": s["title"], "url": s["url"], "publisher": s["publisher"], "access": s["access"], "checkedAt": s["checkedAt"]})
    return out
def fact(id_, value, sources, conf, status=None, notes="", researched=DAY):
    approved = conf >= 2 and (status in (None, "approved"))
    f = {"id": id_, "value": value, "sources": list(sources), "confidence": conf, "status": "approved" if approved else "review", "researchedAt": researched,
         "parserCertainty": "high", "conflictFree": True, "notes": (NOTE + " " + notes).strip() if approved else notes}
    if approved: f.update(approvedAt=DAY, approvedBy=OWNER)
    return f
slug = lambda s: re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:60]

# ── English wording for the few Hebrew-titled events; no fact is added, hints carry no year ──────────────────────────────────────
TL = {
    "1924-04-13": ("AEK Athens founded in Athens", "A club formed in Athens by athletes with Constantinople roots."),
    "1989-05-07": ("Olympiacos 0-1 AEK Athens", "A Greek league win over Olympiacos on the way to the title."),
    "1887-11-06": ("Celtic founded in Glasgow", "Brother Walfrid and a community effort to feed poor children."),
    "1888-05-28": ("Celtic's first match: Celtic 5-2 Rangers", "A friendly against Rangers."),
    "1967-05-25": ("Celtic win the European Cup", "A neutral final in Lisbon."),
    "2003-05-21": ("UEFA Cup final in Seville", "A neutral final at the Estadio Olimpico."),
    "1910-05-15": ("FC St. Pauli founded", "Hamburg's club of the Millerntor."),
}
TL_YEAR = {"2012": ("The museum association 1910 e.V. is founded", "The supporters' association behind the FC St. Pauli Museum.")}

CONFLICT_PLAYERS = {"celtic": {"Ronnie Simpson"}, "aek-athens": {"Δούσαν Μπάγεβιτς", "Ντούσαν Μπάγιεβιτς", "Dusan Bajevic", "Dušan Bajević"}}
# players whose end year is itself a recorded conflict keep their start year but lose the end year
END_YEAR_UNSURE = {"celtic": {"Ronnie Simpson"}}

def convert_new_club(club, locale):
    base = f"clubs/{club}"
    rows = lambda f: rd(f"{base}/{f}.json")
    conflict_text = json.dumps(rows("conflicts"), ensure_ascii=False)
    used = set(); pack = {"schemaVersion": 1, "clubId": club, "contentLocale": locale, "sources": [], "archive": [], "players": [], "rivals": [], "matches": [], "trophies": [], "stadiums": [], "culture": [], "kits": [], "seasons": []}
    def cite(r): used.update(r["sources"]); return r["sources"]
    # archive (timeline)
    for r in rows("timeline"):
        v = r["value"]; on, prec = v["on"], v["precision"]
        title, hint = (TL.get(on) or TL_YEAR.get(on) or (None, None))
        if not title: continue
        val = {"name": title, "hint": hint, "sport": "football", "sensitive": False}
        if prec == "day" and valid_day(on): val.update(on=on, precision="day", year=int(on[:4]))
        elif prec == "year": val.update(precision="year", year=int(on))
        else: continue
        pack["archive"].append(fact("t-" + r["id"][-8:], val, cite(r), r["confidence"], notes="English wording written from the staged Hebrew title; no fact added."))
    # players
    for r in rows("players"):
        v = r["value"]; name = v["nameEn"] or v["nameOriginal"]
        if not name or name in CONFLICT_PLAYERS.get(club, ()) or v["nameOriginal"] in CONFLICT_PLAYERS.get(club, ()): continue
        spells = [s for s in v["careerSpells"] if s.get("fromYear") or s.get("toYear")]
        fr = min((s["fromYear"] for s in spells if s.get("fromYear")), default=None); to = max((s["toYear"] for s in spells if s.get("toYear")), default=None)
        if name in END_YEAR_UNSURE.get(club, ()): to = None
        if fr and to and fr > to: fr = to = None
        al = [a for a in {v["nameOriginal"]} - {name} if a]
        pack["players"].append(fact("p-" + v["id"].split("_")[-1], {"name": name, "sport": "football", "positions": [p for p in v["positions"] if p in ("GK", "DF", "MF", "FW")], "fromYear": fr, "toYear": to, "aliases": al}, cite(r), r["confidence"],
                                    notes="Years are club registration as reported by the source, not an appearance span." if spells else "No career years in the source."))
    # matches + lineup
    lineups = {l["value"]["matchId"]: l for l in rows("lineups")}
    pid = {p["value"]["id"].split("_")[-1]: p for p in rows("players")}
    for r in rows("matches"):
        v = r["value"]
        if not valid_day(v["playedOn"]) or v.get("datePrecision", "day") != "day": continue
        if club == "st-pauli" and v["playedOn"] == "2023-01-20": continue  # recorded date conflict (2023/24 round 18)
        sc = v.get("score") or {}
        if sc.get("home") is None or sc.get("away") is None: continue
        home, away = v["homeName"], v["awayName"]
        val = {"name": f"{home} {sc['home']}-{sc['away']} {away}", "on": v["playedOn"], "competition": v.get("competition"), "score": f"{sc['home']}-{sc['away']}", "venue": None, "scorers": [], "lineup": [], "bench": [], "sport": "football"}
        lu = lineups.get(r["id"])
        if lu and lu["value"].get("starters") and len(lu["value"]["starters"]) == 11 and all(s.get("personId") for s in lu["value"]["starters"]):
            val["lineup"] = [s["name"] for s in lu["value"]["starters"]]; cite(lu)
        pack["matches"].append(fact("m-" + r["id"][-10:], val, cite(r), r["confidence"], notes="Score as displayed by the source; scorers not extracted."))
    # honours → trophies
    groups = collections.defaultdict(list)
    for r in rows("honours"):
        v = r["value"]
        if "titleSeasonsOrYearsAsReported" in v:
            pack["trophies"].append(fact("tr-" + slug(v["competition"]), {"name": v["competition"], "seasons": v["titleSeasonsOrYearsAsReported"], "count": v.get("totalAsReported") if v.get("totalAsReported") == v.get("listedCount") else None}, cite(r), r["confidence"], notes=v.get("scope", "")))
        else: groups[v["competition"] + "|" + v.get("outcome", "")].append(r)
    for k, rs in groups.items():
        comp = k.split("|")[0]
        pack["trophies"].append(fact("tr-" + slug(comp), {"name": comp, "seasons": sorted({r["value"]["season"] for r in rs}), "count": None}, [s for r in rs for s in cite(r)], min(r["confidence"] for r in rs), notes="Seasons documented so far; not a complete honours list."))
    # stadiums, culture, kits, seasons
    for r in rows("stadiums"):
        v = r["value"]; pack["stadiums"].append(fact("st-" + slug(v["name"]), {"name": v["name"], "city": v["city"], "note": v["relation"], "sport": "football"}, cite(r), r["confidence"]))
    for r in rows("culture"):
        v = r["value"]; name = v.get("name") or (v.get("topic") or "").capitalize()
        if not name: continue
        detail = {k: x for k, x in v.items() if k not in ("name",) and x is not None and not isinstance(x, (list, dict))}
        pack["culture"].append(fact("cu-" + r["id"][-8:], {"name": name, **detail}, cite(r), r["confidence"], notes=""))
    for r in rows("kits"):
        v = r["value"]
        if not v.get("season"): continue
        pack["kits"].append(fact("k-" + r["id"][-8:], {"name": f"{club} {v['season']} {v.get('variant') or 'kit'}", "season": v["season"], "type": v.get("variant") or "home", "manufacturer": v.get("maker"), "construction": {"design": v.get("design")}, "sponsor": v.get("mainSponsor")}, cite(r), r["confidence"], notes="Description only; no licensed image."))
    for r in rows("seasons"):
        v = r["value"]
        if "rank" in v: pack["seasons"].append(fact("s-" + slug(v["season"]), {"season": v["season"], "name": v["season"], "finish": f"{v['rank']}th, {v.get('competition')}", "points": v.get("points")}, cite(r), r["confidence"], notes="Selected season row; not a full season export."))
    pack["sources"] = sources_for(sorted(used))
    for k in list(pack):
        if isinstance(pack[k], list) and not pack[k] and k not in ("sources", "archive", "players", "rivals"): del pack[k]
    return pack

def convert_pao():
    base = "clubs/panathinaikos"; used = set()
    wave = {"sources": [], "matches": [], "archive": [], "trophies": [], "culture": [], "kits": []}
    def cite(r): used.update(r["sources"]); return r["sources"]
    # honours: grouped per competition, years as the source reports them
    byc = collections.defaultdict(list)
    for r in rd(f"{base}/honours.json"): byc[r["value"]["competition"]].append(r)
    for comp, rs in byc.items():
        name = comp.replace(" — club recognition", " (club recognition)")
        yrs = sorted({r["value"]["titleYear"] for r in rs})
        ids = [s for r in rs for s in r["value"]["sourceIds"]]; used.update(ids)
        wave["trophies"].append(fact("tr-" + slug(comp), {"name": name, "years": yrs, "count": None}, sorted(set(ids)), 2, notes="Years as the source reports them (football only); two publishers agree on the list."))
    for r in rd(f"{base}/culture.json"):
        v = r["value"]; topic = v.get("topic"); name = v.get("name") or {"rivalry": "Eternal derby", "anthem": "Club anthem", "kit": "Club kit tradition"}.get(topic)
        if not name: continue
        detail = {k: x for k, x in v.items() if k in ("topic", "foundedYear", "scope") and x}
        wave["culture"].append(fact("cu-" + r["id"][-8:], {"name": name, **detail}, [s for s in v["sourceIds"]], 2, notes=""))
        used.update(v["sourceIds"])
    for r in rd(f"{base}/kits.json"):
        v = r["value"]
        if v.get("season"): wave["kits"].append(fact("k4-" + r["id"][-8:], {"name": f"Panathinaikos {v['season']} {v.get('variant') or 'kit'}", "season": v["season"], "type": v.get("variant") or "home", "manufacturer": v.get("maker"), "construction": {"design": v.get("design")}}, cite(r), r["confidence"], notes="Description only; no licensed image."))
    # notable dated matches from pao.gr (club's own record): European, intercontinental/balkan, and fixtures against Olympiacos / AEK
    staged = json.load(open("research-staging/panathinaikos/matches.json"))
    skipped = collections.Counter(); core = json.load(open("club-packs/panathinaikos/core.json")); have = set()
    for f in ("club-packs/panathinaikos/" + x for x in os.listdir("club-packs/panathinaikos") if x.endswith(".json")):
        d = json.load(open(f))
        if isinstance(d, dict):
            for sec in ("matches", "archive"):
                for it in d.get(sec) or []:
                    if isinstance(it, dict) and it.get("value", {}).get("on"): have.add(it["value"]["on"])
    seen_days = set()
    for m in staged:
        on, sc = m["playedOn"], m["scoreAsReported"] or {}
        h, a = m["homeName"], m["awayName"]
        if not valid_day(on) or m["datePrecision"] != "day": skipped["no exact day"] += 1; continue
        if not h or not a: skipped["a side unreadable"] += 1; continue
        if sc.get("home") is None or sc.get("away") is None: skipped["no score"] += 1; continue
        hh, aa = club_name(h), club_name(a)
        if "Panathinaikos" not in (hh, aa): skipped["club not readable"] += 1; continue
        comp = COMP.get((m["competitionAsReported"] or "").strip().lower(), m["competitionAsReported"])
        opp = aa if hh == "Panathinaikos" else hh
        if not (comp in EURO or opp in ("Olympiacos", "AEK Athens")): continue
        if on in have or on in seen_days: skipped["day already covered"] += 1; continue
        seen_days.add(on)
        name = f"{hh} {sc['home']}-{sc['away']} {aa}"
        used.update(m["sourceIds"])
        wave["matches"].append(fact("pm-" + m["id"][-10:], {"name": name, "on": on, "competition": comp, "score": f"{sc['home']}-{sc['away']}", "venue": None, "scorers": [], "lineup": [], "bench": [], "sport": "football"}, m["sourceIds"], 2, notes="Club's own match record; score as displayed (shootouts and extra time are not separated in the source)."))
        wave["archive"].append(fact("pa-" + m["id"][-10:], {"name": name, "on": on, "precision": "day", "year": int(on[:4]), "hint": (comp or "") + (" derby" if opp in ("Olympiacos", "AEK Athens") else ""), "sport": "football", "sensitive": False}, m["sourceIds"], 2, notes="Club's own match record."))
    wave["sources"] = sources_for(sorted(used))
    print("PAO notable matches:", len(wave["matches"]), "skipped:", dict(skipped))
    return wave

def main():
    for club, locale in (("aek-athens", "el"), ("celtic", "en"), ("st-pauli", "en")):
        pack = convert_new_club(club, locale)
        os.makedirs(f"club-packs/{club}", exist_ok=True)
        json.dump(pack, open(f"club-packs/{club}/core.json", "w"), ensure_ascii=False, indent=1); open(f"club-packs/{club}/core.json", "a").write("\n")
        print(club, {k: len(v) for k, v in pack.items() if isinstance(v, list)})
    wave = convert_pao()
    json.dump(wave, open("club-packs/panathinaikos/wave-four-clubs-2026-10-08.json", "w"), ensure_ascii=False, indent=1); open("club-packs/panathinaikos/wave-four-clubs-2026-10-08.json", "a").write("\n")
    out = "docs/fanlife/research/four-clubs-2026-10-08"; os.makedirs(out, exist_ok=True)
    for f in ("README-HE.md", "FANLIFE-RESEARCH-HE.md", "coverage.json", "schema-and-import-policy.json", "validation-report.json"): shutil.copy(os.path.join(SRC, f), out)
    shutil.copytree(os.path.join(SRC, "dossiers"), os.path.join(out, "dossiers"), dirs_exist_ok=True)
    shutil.copytree(os.path.join(SRC, "discovery"), os.path.join(out, "discovery"), dirs_exist_ok=True)
main()

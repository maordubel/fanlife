# Verified research — pass 1

Date: 31 August 2026. Three parallel research passes against public sources, checking
the claims in `THE_WORKER_MASTER_RESEARCH.md`. Everything below was read; nothing was
assumed. `wiki.red-fans.com` is still 403 to automated access and was not used.

The verdicts are already encoded in `content/manual/` — this document is why the data
looks the way it does.

---

## What the research corrected

These are the changes that matter, because each one would have shipped as a wrong fact.

| # | The claim | What is actually true | Source |
|---|---|---|---|
| 1 | Toto Cup won in **2002 and 2025** | 2002 yes. **2025 was a defeat** — Beitar Jerusalem beat Hapoel 2–1 in the final on 28 Oct 2025. Seeded as `runner_up`. | [Kan](https://www.kan.org.il/content/kan-news/sport/965001/) |
| 2 | Coach of the first Ussishkin season was **Uri Shalev (אורי שלו)** | **Uri Shalef (אורי שלף)** — and he was a co-founder and the association's lawyer, not only the coach. He went 44–0 across the first two seasons and died in 2015. | [Walla, 2.4.2015](https://sports.walla.co.il/item/2843036) |
| 3 | Name change on **24 July 2010** | **23 July 2010** — Walla reported the vote and the change from that Friday evening. | [Walla, 23.7.2010](https://sports.walla.co.il/item/1713821) |
| 4 | Name vote **315 / 124 / 2 abstentions** | 315 / 124 out of **439 voting** — which leaves no room for the two abstentions. The abstentions are dropped. | same |
| 5 | **Avi Katz** on the first board | **Gabi Katz**. | [Ynet, 14.10.2012](https://www.ynet.co.il/articles/0,7340,L-4291776,00.html) |
| 6 | **Erez Zeitshik** replaced Maor Harel | **Erez Zeitchik (ארז זייצ'יק)**, elected February 2013 with over 80% of the vote. | [Ynet, 2.2.2013](https://www.ynet.co.il/article/4340044) |
| 7 | "13 championships" | 13 is the **IFA and club** count. **FIFA and UEFA recognise 12**, because the abandoned 1934/35 and 1937/38 seasons are not universally counted. worldfootball.net says 14. Recorded as an open conflict. | [Wikipedia — champions list](https://en.wikipedia.org/wiki/List_of_Israeli_football_champions) |
| 8 | Crest changed around **1967** | No crest change in 1967 — both the club's own history and the kit archive treat 1923–1991 as one unbroken emblem. 1967 is the **Asian Cup** year, which is probably where the number came from. | [Club history](https://www.htafc.co.il/היסטוריה-והישגים/) |
| 9 | 2015 crest adjustment "concerning the founding year" | Confirmed and worth knowing precisely: research by Dr. Eyal Gertman and Kfir Frankel established the club was founded in **1923, not 1927** — Avraham Eshni's membership card no. 2, issued October 1923. The crest was corrected to match. | [Sport1/Maariv, 12.6.2015](https://sport1.maariv.co.il/israeli-soccer/ligat-haal/Article-728080/) |
| 10 | Sponsor after Fujitsu was Arkia from 2017 | The sponsor immediately before Arkia was **New Drive**. Arkia signed for 2017/18 and **ended early** — it moved to cancel after the December 2019 derby violence. Hachshara took over **within 2019/20**, before the June 2020 announcement. | [ONE](https://www.one.co.il/Article/297584.html), [ONE](https://www.one.co.il/Article/377561.html) |
| 11 | Current sponsor "requires verification" | **IBI בית השקעות**, from September 2024, extended in March 2026 for three more seasons from 2026/27. Careful: many "IBI + Hapoel" items are about the **basketball** club. | [Club official](https://www.htafc.co.il/) |

## What could not be sourced — and is therefore absent

Not "probably true". Absent. Each of these is in the research document and is **not** in
the database:

- **Basa Stadium's last match on 28 January 1961, a derby.** No accessible source.
- **The Arsenal cannon on a Hapoel shirt, c. 1980.** Six targeted searches in Hebrew and
  English, nothing. (Arsenal wore Umbro 1978–86 and Hapoel wore Umbro in 1980/81 — a
  shared supplier is a plausible origin for the story, and is not evidence for it.)
- **Every shirt sponsor before 2009** — Ata, Visa, Club Hotel Tiberias, Suzuki, Shikun
  Ovdim, the earlier Subaru spell, and Fujitsu's dates. (The 2009/10 Subaru season is now
  confirmed by Maor and is in the archive; the earlier spell is not.)
- **Hapoel Ussishkin's registration on 25 June 2007.** The founding and Maor Harel's role
  in it are documented; the day is not.
- **"The fifth game", 14 November 2007, 68–51, ~500 spectators, the framed jersey.**
  Nothing found. This is exactly the granular detail the Red Fans wiki would carry.
- **The 2008 election vote counts, candidate numbers and audit-committee names**, and the
  reported voter-count discrepancy — which could not even be located, let alone resolved.
- **The separate association vote of 413 / 10 / 18.**
- **Maor Harel's ~400 votes in a 2010 board election.**
- **The 2015 founders' ceremony.** Two nearby 2015 events exist — the new arena opening in
  January and Uri Shalef's death in April — and neither matches.
- **Every fan-song melody attribution** (Suavemente, Enola Gay, Fito Páez, Aviv Geffen,
  Attaque 77). `songs.json` ships empty. An unverified melody credit is precisely the
  kind of fact that would embarrass the game in front of the people who sing them.

## Conflicts settled by the owner of the project

Five kit conflicts were closed by Maor Harel directly, on 31 August 2026. Each carries a
`resolution` **and** a `resolvedBy` — an anonymous verdict is indistinguishable from the
pipeline quietly picking a winner, so the schema refuses one (`tests/seed.test.ts`).

| Season | Settled | Stored as |
| --- | --- | --- |
| 2010/11 | Keter appeared **in the Champions League only**; the league shirt carried **בוני התיכון** | two `sponsor_deal` rows, each scoped by `competition_id` |
| 2009/10 | The double season: **Umbro** kit, **Subaru** sponsor | one row at confidence 3 |
| — | Nike is the current supplier; four suppliers appear across the modern range | resolved to the kit archive |

The competition scope is a **schema** change, not a note: `sponsor_deal.competition_id`
(null = every competition that season). The kit game asks `(season, competition)` pairs,
which is why 2010/11 yields two questions with two different right answers.

## Open conflicts, recorded rather than resolved

Six rows in `content/manual/fact-conflicts.json` still carry `resolution: null`:

1. Championship count — 13 (IFA/club) vs 12 (FIFA/UEFA) vs 14 (worldfootball).
2. Bloomfield's first match score — 1–1 (Wikipedia, StadiumDB) vs 0–0 (golden-lotus).
3. Bloomfield's official opening match date — 13 vs 12 December 1962.
4. Crest stages — the club's own nine stages vs the kit archive's six.
5. Arik Einstein's 1,000th-member date — the research document's January 2010 (unsourced)
   vs Walla reporting him joining in August 2007.
6. The name-change date — 24 July (research document) vs 23 July (contemporary report).

## Two rules this pass turned into schema

**Derby means Maccabi Tel Aviv.** Confirmed as the recognised Tel Aviv derby, both clubs
resident at Bloomfield. It is now a `club.is_derby_rival` flag and a database trigger
that *derives* `match.is_derby` — so no mode can ever disagree with another about what
counts, and Bnei Yehuda and Hapoel Petah Tikva are ordinary fixtures.

**Football and basketball never mix.** Every sport-bearing table carries `sport`; a
trigger rejects a match whose competition and clubs disagree; aliases are scoped by sport
so "הפועל תל אביב (כדורסל)" and "הפועל תל אביב" can coexist without colliding. The
Ussishkin chapter is basketball and is stored as basketball throughout.

## On the Ussishkin chapter

Maor Harel's role is documented and is stored the way any documented fact is: a `person`
row, two `association_role` rows (founder; board member 2007 → 17 October 2012, replaced
by Erez Zeitchik), and one dated quote from the resignation report. No prose, no
elevation, no appearance in football records.

The house rule for question generation, now in `CLAUDE.md`: he may be an answer only
where a source names him, at most once per session, and never as a distractor. The
Ussishkin story is strong enough on its own — three promotions, 44–0, a supporter
association that bought its own name back — that leaning on it would weaken it.

## Next research targets

1. The Red Fans dump — it is the only plausible source for the missing granular Ussishkin
   detail, the pre-2010 sponsors, the song archive and the shirt-number pages.
2. Pre-state season labelling (1933/34 through 1943/44), where three sources disagree.
3. The 2001/02 UEFA Cup first-round opponent, still unresolved.
4. Ussishkin Hall's years as Hapoel's home — 1980–2005 or 1980–2007.

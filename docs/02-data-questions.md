# Open data questions for Maor

The wiki is behind Cloudflare and refused every automated read this session, so the
first seed of real data comes from you. Answer by number — short answers are fine,
and "לא בטוח" is a valid answer that I will record as `confidence 1`.

Anything you answer here is stored with `source.kind = 'manual'` and your name on it,
so it is traceable later and can be upgraded once the wiki opens.

---

## 1. Eras (drives progression and unlockable eras)

The `era` table needs 5–7 named periods. My proposal — correct the names and the years:

| # | Proposed name | Years | Ask |
|---|---|---|---|
| 1.1 | ראשית הדרך | 1923–1955 | right start year for the football club? |
| 1.2 | תור הזהב הראשון | 1956–1969 | do fans call it that? |
| 1.3 | שנות היובש | 1970–1998 | is there a better name? |
| 1.4 | דור אירופה | 1999–2003 | the UEFA years — what do fans call this era? |
| 1.5 | האליפות והאירופה השנייה | 2004–2012 | |
| 1.6 | העשור האחרון | 2013–היום | |

1.7 — Which era do fans feel most strongly about? That one gets the deepest content in the MVP.

## 2. Honours (the `trophy` table)

2.1 — League titles: how many, and in which seasons?
2.2 — State Cup (גביע המדינה): how many, and which seasons?
2.3 — Toto Cup / League Cup: which seasons?
2.4 — Any other trophy the fans count as real (Cup of Cups, Lilian Cup, doubles)?
2.5 — Seasons of relegation or promotion, if any. These matter emotionally and make hard trivia.

## 3. The 20 seed matches (the lineup game's whole content)

I need 20 matches every Hapoel fan knows. For each: season, competition, opponent, score, and roughly the XI.

3.1 — Name the 20. Start with the ones you would name in a bar; that list is more accurate than any archive.
3.2 — For the top 5 of them, the starting XI as best you remember (I will mark it `confidence 1` until verified).
3.3 — Which single match is *the* match for Hapoel fans?

## 4. Derby

4.1 — ~~Which fixtures count as a derby?~~ **ANSWERED: Maccabi Tel Aviv only.** Encoded as `club.is_derby_rival` + a DB trigger; Bnei Yehuda and Hapoel Petah Tikva are ordinary fixtures.
4.2 — The 5 derby results a fan would want to relive.
4.3 — Is there a derby result fans do *not* want to see in a game? Good to know before it appears in a quiz.

## 5. Players

5.1 — The 20 club legends, in your order.
5.2 — Retired or "sacred" shirt numbers, if any.
5.3 — Iconic shirt-number pairings (who *is* number 10, number 9, number 1).
5.4 — Notable foreign players, and notable academy graduates (שחקני בית).
5.5 — Captains you remember, and roughly when.

## 6. Coaches

6.1 — The coaches that matter, with rough years.
6.2 — Anyone who was both a player and a coach at the club — these break naive data models and I want them in the seed as a test case.

## 7. Kits (v2, but the data is cheap to capture now)

7.1 — Red-and-white: has the club always worn it, and what is the actual arrangement (solid red? red with white trim? stripes at any point)?
7.2 — Kits fans remember by name — a specific sponsor, a specific season, a shirt that is still worn to games.
7.3 — Away kits worth reconstructing.
7.4 — Manufacturers and sponsors over the years, as far as you remember.

## 8. Moments

8.1 — 10 iconic moments, in one line each (goal, save, celebration, protest, farewell).
8.2 — Any moment that is painful rather than glorious but still belongs — the archive is more honest with them, and fans respect that.

## 9. Product calls

9.1 — Trivia difficulty: is the target the fan who knows everything, or the fan who wants to learn? This decides the difficulty curve.
9.2 — Should the game show the source of every fact publicly? (My recommendation: yes — it is the differentiator.)
9.3 — Accounts from day one, or play anonymously and sign in only to save a score?
9.4 — Do you have a contact at Red Fans / the wiki I can be pointed at, for the dump and permission?

I've read all the files. Here is the exhaustive inventory.

---

# THE WORKER — LIFE GAME: IMPLEMENTED CONTENT INVENTORY

Source of truth: `/root/worker/lib/life/content/chapters.ts`, `/root/worker/lib/life/content/era.ts`, the 13 chapter files, `/root/worker/lib/life/types.ts`.

## 0. Global facts you need for the diff

| Fact | Value |
|---|---|
| Chapters registered | 19, **all `playable: true`** |
| Chain | `a2-alley → a3-hall → a4-shirt → a5-first → a6-radio → a7-week → 1986 → 1990 → 1991 → 1993-cup → 1993-galil → 1995-sinai → 1996-army → 1997-basket → 1998-laces → 1999-basket → 1999-cup → 2000-title → 2000-double → null` |
| Chapters with data BEATS | A2–A7 + every chapter from `1993-cup` on. **1986, 1990, 1991 have NO beats** — their beat logic is hardcoded in `lib/life/runtime/scenes/WorldScene.ts` (`timeTriggers()`, `openChapterBeat()`, `openBeat1991()`, `wallBeat()`) |
| Chapters with `goal` | **Only A2–A7** (`goalA2`…`goalA7`). Every other chapter has `goal: undefined` |
| Chapters with `cutscene` | **Only `1986`** (`'1986-championship'`). All others `null` |
| Chapters with `eventMinute` set non-null | **Only `1993-cup`** (`TIP_OFF_93` = 20:00). `1993-galil`, `1995-sinai`, `1996-army` and all `stageB()`/`stageA()` chapters set `eventMinute: null`. `1986`/`1990`/`1991` omit the field (undefined) |
| Chapters with schedule/opportunities/encounters | Only `1986`, `1990`, `1991` (plus 2 encounters in `1993-cup`). Every Stage-A and every B4+ era is `schedule: []`, `opportunities: []`, `encounters: []` |
| Ambient | `AMBIENT_1986` for `1986`; `AMBIENT_1990` for **every other chapter including all of Stage A** |
| Player figure | 1986 = `pogi`+`KID_WALK`; Stage A = same as 1986; 1990/1991 = `hero80`+`HERO80_WALK` (scale 1.12 / 1.14); 1993-cup, 1993-galil, 1995-sinai = `TEEN` (1.22); 1996-army = `SOLDIER` (1.26); 1997→2000 = `YOUNG_MAN` (1.26) |
| Directed match scripts wired | `final-86`(1986), `galil-93-g1`,`galil-93-g3`(1993-galil), `hall-97`(1997-basket), `hall-99`(1999-basket), `laces-98`(1998-laces), `cup-99`(1999-cup), `title-00`(2000-title), `double-00`(2000-double). **`1993-cup`, `1995-sinai`, `1996-army`, `1999-cup`(late route), `1990`, `1991` have no `match` action** (1990/1991 use bespoke `match1990.ts` / `derby1991.ts`) |

### 0.1 Registry table (date / start / minute / next)

| id | unit | titleHe | dateHe | year | wd | minute | start (loc/spawn) | next | anchorKey | entry events |
|---|---|---|---|---|---|---|---|---|---|---|
| a2-alley | A2 | הסמטה | אביב 1984 | 1984 | 2 | 940 (15:40) | home/start | a3-hall | 1986 | — |
| a3-hall | A3 | הבית האדום השני | סתיו 1984 | 1984 | 4 | 1020 (17:00) | street/fromHome | a4-shirt | 1986 | — |
| a4-shirt | A4 | החולצה | קיץ 1985 | 1985 | 0 | 570 (9:30) | bedroom/start | a5-first | 1986 | — |
| a5-first | A5 | בחולצה שלך | 28 בספטמבר 1985 | 1985 | 6 | 780 (13:00) | bedroom/start | a6-radio | 1986 | — |
| a6-radio | A6 | אכזבה רגילה | חורף 1985/86 | 1986 | 6 | 840 (14:00) | home/start | a7-week | 1986 | — |
| a7-week | A7 | השבוע שלפני | 17 במאי 1986 | 1986 | 6 | 960 (16:00) | street/fromHome | 1986 | 1986 | — |
| 1986 | A8 | להגיע לבלומפילד | 24 במאי 1986 | 1986 | 6 | 755 (12:35) | bedroom/start | 1990 | 1986 | — |
| 1990 | B1 | כמה צריך? | 12 במאי 1990 | 1990 | 6 | 790 (13:10) | kitchen/start | 1991 | 1990 | — |
| 1991 | B2 | יש עוד בית | 11 במרץ 1991 | 1991 | 1 | 490 (8:10) | classroom/start | 1993-cup | 1991 | — |
| 1993-cup | B3 | הגביע אדום | 19 באפריל 1993 | 1993 | 1 | 930 (15:30) | home/start | 1993-galil | 1993-cup | `money.changed +2200` |
| 1993-galil | B4 | הבית נשבר | 9–19 במאי 1993 | 1993 | 0 | 1080 (18:00) | ussishkin-outside/start | 1995-sinai | 1993-galil | — |
| 1995-sinai | B5 | המספר שבע על הקיר | 1994–1995 | 1994 | 2 | 1120 (18:40) | kiosk/start | 1996-army | 1994-cup | — |
| 1996-army | B6 | אין מקום אחד לעמוד בו | 1996 – אביב 1997 | 1996 | 4 | 960 (16:00) | street/fromHome | 1997-basket | 1997-sale | `money.changed +2500` |
| 1997-basket | B7 | גם האולם יכול לרדת | 1996/97 – 1997/98 | 1997 | 2 | 1140 (19:00) | ussishkin-outside/start | 1998-laces | 1997-relegation | — |
| 1998-laces | B8 | השרוכים | 2 במאי 1998 | 1998 | 6 | 780 (13:00) | home/start | 1999-basket | 1998 | — |
| 1999-basket | B9 | זה לא נגמר כשעולים | 1998/99 | 1999 | 3 | 1110 (18:30) | ussishkin-outside/start | 1999-cup | 1999-relegation | — |
| 1999-cup | B10 | שש־עשרה שנה | 26 במאי 1999 | 1999 | 3 | 840 (14:00) | home/start | 2000-title | 1999-cup | — |
| 2000-title | B11a | ארבעה ימים | 13 במאי 2000 | 2000 | 6 | 870 (14:30) | home/start | 2000-double | 2000-title | — |
| 2000-double | B11b | הדאבל | 17 במאי 2000 | 2000 | 3 | 900 (15:00) | home/start | **null** | 2000-cup | — |

Day-marker constants (all `life:`-prefixed, survive the day reset): `A2..A7 = life:a:d2..life:a:d7`; galil `D1..D5 = life:galil:d1..d4, life:galil:after`; sinai `S1,S2 = life:sinai:d1/d2`; army `A1..A4 = life:army:d1..d4`; hall `H1,H2 = life:hall:d1/d2`; laces `L1,L2 = life:laces:d1/d2`.

---

# 1. `a2-alley` (A2 · הסמטה)

**Date/start:** אביב 1984, `home`/`start`, minute 940, next `a3-hall`.

### Beats (4)
| id | at | trigger | `when` (verbatim) | do |
|---|---|---|---|---|
| `a2-open` | home | enter (delay 700) | `{ none: [{ flag: A2 }] }` | flag `life:a:d2`; events `[money.changed +300 'לחם']`; lines ×2 (Rachel: bread errand) |
| `a2-teams-full` | any | clock, `waitingHe:'ממתין: הילדים מתחלקים לקבוצות'` | `{ flag: A2, afterMinute: at(16, 25), none: [{ flag: 'a2:played' }, { flag: 'a2:late' }, { flag: 'a2:full' }] }` | flag `a2:full`; toast (red) |
| `a2-after` | any | clock (delay 900) | `{ flag: 'a2:played', afterMinute: at(17, 30), none: [{ flag: 'a2:done' }] }` | flag `a2:done`; talk `a2-after-game` |
| `a2-night` | any | clock, `waitingHe:'ממתין: הסמטה מתרוקנת'` | `{ flag: A2, afterMinute: at(19, 30), none: [{ flag: 'a2:played' }, { flag: 'a2:late' }] }` | lines; **ending `home`** |

### Conversations (5 in `CONVERSATIONS_A2`)
| id | name | branches | choices & effects |
|---|---|---|---|
| `a2-scrap` | — | 2 | b0 `when {flag:'life:a1:red'}` no choices → `redheart historyMemory+2`; b1 fallback, no choices |
| `rachel-a2` | רחל | 2 | b0 `when a2:bread`, none. b1 choices: `ok`→flag `a2:errand`, rel rachel bond+2, personality reliability+2 · `after`→flag `a2:errand`, flag `a2:after`, rel rachel tension+2, toast |
| `rafi-a2` | רפי מהקיוסק | 3 | b0 `when a2:bread` none; b1 `when a2:errand` then: flag `a2:bread`, time+6, sfx bell-shop, toast; b2 fallback none |
| `alley-a2` | — | 3 | b0 `when a2:played` none; b1 `when a2:full` then: flag `a2:late`, rel ofir familiarity+1, rel amit bond+2, time+40, **ending `late`**; b2 choices: `play`→flag `a2:played`, rel ofir bond+4, rel efi familiarity+2, remember ofir `first-team-1984` major, wellbeing happiness+6, sfx ball-kick, **minigame `football`** · `watch`→personality curiosity+1, toast |
| `a2-after-game` | — | 2 | b0 `when a2:after` → time+30, **ending `played`**; b1 → time+30, **ending `played`** |

*(The A1 prologue set `CONVERSATIONS_A1` — `a1-1983`, `a1-red`, `a1-crowd`, `a1-goal`, `a1-home` — lives in the same file but has **no chapter registry entry**; it belongs to `prologue`.)*

### Endings (3)
| id | titleHe |
|---|---|
| `played` | שיחקת |
| `late` | הקבוצות היו מלאות |
| `home` | נשארת בבית |

### Flags
- **Reads:** `a2:played`, `a2:late`, `a2:full`, `a2:errand`, `a2:bread`, `a2:after`, `a2:done`, `life:a:d2`, `life:a1:red`, `chapterDone`
- **Writes:** `life:a:d2`, `a2:full`, `a2:done`, `a2:errand`, `a2:after`, `a2:bread`, `a2:played`, `a2:late`

### Era features
schedule ✗ (`[]`) · opportunities ✗ · encounters ✗ · cutscene ✗ (null) · eventMinute ✗ (null) · **goal ✓** (`goalA2`: `a2:played||a2:late → null`; `a2:errand && !a2:bread → 'kiosk'`; else `'pitch'`) · beats ✓

---

# 2. `a3-hall` (A3 · הבית האדום השני)

**Date/start:** סתיו 1984, `street`/`fromHome`, minute 1020, next `a4-shirt`.

### Beats (3)
| id | at | trigger | `when` | do |
|---|---|---|---|---|
| `a3-open` | street | enter (700) | `{ none: [{ flag: A3 }] }` | flag `life:a:d3`; lines ×2 (Efi: "אחרי הקיר, ימינה") |
| `a3-hall` | ussishkin-hall | enter (900) | `{ flag: A3, none: [{ flag: 'a3:inside' }] }` | flag `a3:inside`; sfx `ball-bounce`; lines ×2; **ending `hall`** |
| `a3-night` | any | clock, `waitingHe:'ממתין: אפי יוצא מהדלת'` | `{ flag: A3, afterMinute: at(20, 0), none: [{ flag: 'a3:inside' }] }` | lines; **ending `door`** |

### Conversations (2)
| id | name | branches | choices & effects |
|---|---|---|---|
| `efi-a3` | אפי | 2 | b0 `when {at:'ussishkin-outside'}` none; b1 then: flag `knows:hall`, flag `life:knows:hall`, toast |
| `usher-a3` | סדרן | 2 | b0 `when a3:named` none; b1 choices: `name`→flag `a3:named`, flag `entry:granted`, redheart basketballLove+4, redheart community+3, remember usher `said-my-name-1984` major, toast · `quiet`→personality courage−1, toast, flag `entry:granted` |

### Endings (2)
| id | titleHe |
|---|---|
| `hall` | הבית האדום השני |
| `door` | עד הדלת |

### Flags
- **Reads:** `a3:inside`, `a3:named`, `knows:hall`, `life:knows:hall`, `entry:granted`, `life:a:d3`, `chapterDone`
- **Writes:** `life:a:d3`, `a3:inside`, `knows:hall`, `life:knows:hall`, `a3:named`, `entry:granted`

### Era features
schedule ✗ · opportunities ✗ · encounters ✗ · cutscene ✗ · eventMinute ✗ · **goal ✓** (`goalA3`: `a3:inside → null`; if neither `knows:hall` nor `life:knows:hall` → `null`; else `entry:granted ? 'ussishkin-hall' : 'ussishkin-outside'`) · beats ✓

---

# 3. `a4-shirt` (A4 · החולצה)

**Date/start:** קיץ 1985, `bedroom`/`start`, minute 570, next `a5-first`. `SHIRT_PRICE = shirtAgorot('a4-shirt')` (30 ₪).

### Beats (2)
| id | at | trigger | `when` | do |
|---|---|---|---|---|
| `a4-open` | bedroom | enter (700) | `{ none: [{ flag: A4 }] }` | flag `life:a:d4`; events `[savings.changed +1200 'הפחית', money.changed +200 'מהכיס']`; lines ×2 |
| `a4-close` | any | clock, `waitingHe:'ממתין: רפי סוגר את הקיוסק'` | `{ flag: A4, afterMinute: at(19, 0), none: [{ flag: 'own:shirt85' }, { flag: 'a4:gave' }, { flag: 'a4:done' }] }` | flag `a4:done`; lines; **ending `notYet`** |

### Conversations (7)
| id | name | br | choices & effects |
|---|---|---|---|
| `tin-a4` | — | 3 | b0 `when own:shirt85`; b1 `when a4:tin`; b2 choices: `take`→flag `a4:tin`, goto `tin-a4-out` · `leave`→(no effects) |
| `tin-a4-out` | — | 1 | then: `withdraw 1200`, sfx coins, flagValue `a4:tin=true` |
| `bottles-a4` | — | 2 | b0 `when a4:bottles`; b1 choice `collect`→flag `a4:bottles`, give bottle×3, time+8, toast |
| `rafi-a4` | רפי מהקיוסק | 4 | b0 `when own:shirt85`; b1 `when {hasItem:'bottle'}` then take bottle×3, money+300, sfx, toast; b2 `when {minAgorot:SHIRT_PRICE}` choices `buy`→money −3000, **own `shirt85`**, **shirt `visa86`**, redheart footballLove+5, personality reliability+3, remember shopkeeper `bought-shirt-1985` major, sfx, toast, goto `rafi-a4-bought` / `wait`→toast; b3 fallback choices `work` (`when none a4:worked`, noteHe)→flag `a4:worked`, time+50, energy−15, money+500, personality reliability+2, toast / `no`→— |
| `rafi-a4-bought` | — | 1 | then **ending `shirt`** |
| `kobi-a4` | קובי | 2 | b0 `when a4:kobi`; b1 choices `ask`→flag `a4:kobi`, money+500, rel kobi bond+3, toast · `alone`→flag `a4:kobi`, personality stubbornness+2, rel kobi bond+2, toast |
| `rachel-a4` | רחל | 3 | b0 `when a4:gave`; b1 `when a4:tin` choices `give`→flag `a4:gave`, money −1200, rel rachel bond+8, remember rachel `gave-the-tin-1985` major, personality empathy+4, **ending `gave`** · `keep`→wellbeing regret+3, personality stubbornness+1; b2 fallback |

### Endings (3)
| id | titleHe |
|---|---|
| `shirt` | החולצה |
| `notYet` | עוד לא |
| `gave` | ויתרת על משהו |

### Flags
- **Reads:** `own:shirt85`, `a4:gave`, `a4:done`, `a4:tin`, `a4:bottles`, `a4:worked`, `a4:kobi`, `life:a:d4`, `chapterDone` (+ `state.savings`, `state.agorot`)
- **Writes:** `life:a:d4`, `a4:done`, `a4:tin`, `a4:bottles`, `a4:worked`, `a4:kobi`, `a4:gave` (+ `own:shirt85` via `e:'own'`, `own:shirt:visa86` via `e:'shirt'`)

### Era features
schedule ✗ · opportunities ✗ · encounters ✗ · cutscene ✗ · eventMinute ✗ · **goal ✓** (`goalA4`: `own:shirt85 || a4:gave → null`; `savings+agorot >= SHIRT_PRICE ? 'kiosk' : null`) · beats ✓

---

# 4. `a5-first` (A5 · בחולצה שלך)

**Date/start:** 28.9.1985, `bedroom`/`start`, minute 780, next `a6-radio`.

### Beats (5)
| id | at | trigger | `when` | do |
|---|---|---|---|---|
| `a5-open` | bedroom | enter (700) | `{ none: [{ flag: A5 }] }` | flag `life:a:d5`; events `[money.changed +200 'לדרך']`; lines ×2 |
| `a5-ground` | bloomfield-outside | enter (900) | `{ flag: A5, flagIs: { flag: 'a5:dressed', value: true }, none: [{ flag: 'a5:there' }] }` | flag `a5:there`; sfx crowd-swell; lines ×2; **derive** → raises `a5:late` if `minute > at(15,40)` else `a5:ontime` |
| `a5-in` | bloomfield-tunnel | enter (400) | `{ flag: 'a5:there' }` | talk `a5-close` |
| `a5-outside` | any | clock, `waitingHe:'ממתין: השריקה הראשונה'` | `{ flag: 'a5:there', afterMinute: at(16, 5) }` | flag `a5:late`; talk `a5-close` |
| `a5-gone` | any | clock, `waitingHe:'ממתין: אבא מפסיק לחכות'` | `{ flag: A5, afterMinute: at(15, 0), none: [{ flag: 'a5:kobi-left' }, { flag: 'a5:there' }] }` | flag `a5:kobi-left`; flag `kobi:left`; sfx car-door; toast (red) |

### Conversations (5)
| id | name | br | choices & effects |
|---|---|---|---|
| `shirt-a5` | — | 2 | b0 `when a5:dressed`; b1 choices `wear`→flagValue `a5:dressed=true`, flag `knows:match`, time+4, toast · `inside-out`→flagValue `a5:dressed=true`, flag `a5:inside-out`, flag `knows:match`, time+2, toast |
| `kobi-a5` | קובי | 3 | b0 `when a5:kobi-left`; b1 `when a5:dressed` then rel kobi bond+3, remember kobi `saw-the-shirt-1985` major, time+25, travel `bloomfield-outside`/`fromRoute`; b2 fallback |
| `kobi-a5-gate` | קובי | 1 | then rel kobi familiarity+1 |
| `barry-a5` | אוהד ותיק | 1 | then redheart historyMemory+2 |
| `a5-close` | — | 3 | b0 `when a5:late` → presence `late`, **ending `late`**; b1 `when a5:kobi-left` → presence `inside`, redheart footballLove+4, personality independence+4, **ending `there`**; b2 → presence `inside`, redheart footballLove+4, redheart loyaltyReturn+3, **ending `there`** |

### Endings (2)
| id | titleHe | presence |
|---|---|---|
| `there` | בחולצה שלך | inside |
| `late` | אחרי שהתחיל | late |

### Flags
- **Reads:** `a5:dressed`, `a5:there`, `a5:late`, `a5:kobi-left`, `life:a:d5`, `chapterDone`
- **Writes:** `life:a:d5`, `a5:there`, `a5:late`, `a5:ontime`, `a5:kobi-left`, `kobi:left`, `a5:dressed`, `a5:inside-out`, `knows:match`

### Era features
schedule ✗ · opportunities ✗ · encounters ✗ · cutscene ✗ · eventMinute ✗ · **goal ✓** (`goalA5`: `a5:there → null`; `!a5:dressed → null`; else `'bloomfield-outside'`) · beats ✓

---

# 5. `a6-radio` (A6 · אכזבה רגילה)

**Date/start:** חורף 1985/86, `home`/`start`, minute 840, next `a7-week`.

### Beats (3)
| id | at | trigger | `when` | do |
|---|---|---|---|---|
| `a6-open` | home | enter (700) | `{ none: [{ flag: A6 }] }` | flag `life:a:d6`; flag `kobi:left`; flag `knows:match`; lines |
| `a6-dies` | any | clock, `waitingHe:'ממתין: הסוללות נגמרות'` | `{ flag: 'a6:on', afterMinute: at(15, 35), none: [{ flag: 'a6:radio-dead' }, { flag: 'a6:heard' }] }` | flag `a6:radio-dead`; sound radio off; toast (red) |
| `a6-end` | any | clock, `waitingHe:'ממתין: המשחק נגמר'` | `{ flag: A6, afterMinute: at(16, 50), none: [{ flag: 'a6:heard' }] }` | **derive** → `a6:end-liron` / `a6:end-heard` / `a6:end-quiet`; talk `a6-close` |

### Conversations (4)
| id | name | br | choices & effects |
|---|---|---|---|
| `radio-a6` | — | 3 | b0 `when a6:radio-dead`; b1 `when a6:on`; b2 choice `on`→flag `a6:on`, sfx radio-tune, toast |
| `rachel-a6` | רחל | 2 | b0 `when a6:radio-dead`; b1 fallback — no choices either branch |
| `liron-a6` | לירון | 3 | b0 `when a6:with-liron`; b1 `when a6:radio-dead` choices `hold`→flag `a6:with-liron`, rel liron bond+5, remember liron `held-the-wire-1986` major, sfx, redheart community+3, time+40, toast · `no`→wellbeing loneliness+2; b2 fallback |
| `a6-close` | — | 3 | b0 `when a6:end-liron` → flag `a6:heard`, redheart loyaltyReturn+2, **ending `liron`**; b1 `when a6:end-heard` → flag `a6:heard`, rel rachel bond+2, redheart loyaltyReturn+3, **ending `heard`**; b2 → flag `a6:heard`, wellbeing loneliness+2, **ending `quiet`** |

### Endings (3)
| id | titleHe | presence |
|---|---|---|
| `heard` | אכזבה רגילה | radio |
| `liron` | הרדיו של לירון | radio |
| `quiet` | לא שמעת | heard-from-friend |

### Flags
- **Reads:** `a6:on`, `a6:radio-dead`, `a6:heard`, `a6:with-liron`, `a6:end-liron`, `a6:end-heard`, `life:a:d6`, `chapterDone`
- **Writes:** `life:a:d6`, `kobi:left`, `knows:match`, `a6:radio-dead`, `a6:end-liron`/`a6:end-heard`/`a6:end-quiet` (derived), `a6:on`, `a6:with-liron`, `a6:heard`

### Era features
schedule ✗ · opportunities ✗ · encounters ✗ · cutscene ✗ · eventMinute ✗ · **goal ✓** (`goalA6`: `a6:heard → null`; `a6:radio-dead && !a6:with-liron → 'street'`; else `null`) · beats ✓

---

# 6. `a7-week` (A7 · השבוע שלפני)

**Date/start:** 17.5.1986, `street`/`fromHome`, minute 960, next `1986`.

### Beats (2)
| id | at | trigger | `when` | do |
|---|---|---|---|---|
| `a7-open` | street | enter (700) | `{ none: [{ flag: A7 }] }` | flag `life:a:d7`; lines |
| `a7-night` | any | clock, `waitingHe:'ממתין: אבא מכבה את האור'` | `{ flag: A7, afterMinute: at(20, 30), none: [{ flag: 'a7:refused' }] }` | lines; flag `a7:refused`; **ending `silent`** |

### Conversations (4)
| id | name | br | choices & effects |
|---|---|---|---|
| `amit-a7` | עמית | 2 | b0 `when a7:knows`; b1 then flag `a7:knows`, give `newspaper`, rel amit bond+3, redheart historyMemory+2, toast |
| `ofir-a7` | אופיר | 1 | choices `me-too`→flag `a7:said-yes`, rel ofir bond+3, personality courage+2, toast · `dad`→personality reliability+1, toast |
| `kobi-a7` | קובי | 3 | b0 `when a7:refused`; b1 `when a7:knows` choices `ask`→flag `a7:refused`, flag `life:a7:refused`, rel kobi tension+4, wellbeing stress+4, remember kobi `said-no-1986` major, toast(red), **ending `refused`** · `hint`→flag `a7:refused`, flag `life:a7:promised`, rel kobi familiarity+2, toast, **ending `promised`** · `quiet`→personality stubbornness+1, wellbeing loneliness+2; b2 fallback |
| `rachel-a7` | רחל | 2 | b0 `when a7:refused`; b1 — neither has choices |

### Endings (3)
| id | titleHe |
|---|---|
| `refused` | "לא השבוע" |
| `promised` | הבטחה |
| `silent` | לא שאלת |

### Flags
- **Reads:** `a7:knows`, `a7:refused`, `life:a:d7`, `chapterDone`
- **Writes:** `life:a:d7`, `a7:refused`, `a7:knows`, `a7:said-yes`, `life:a7:refused`, `life:a7:promised`

### Era features
schedule ✗ · opportunities ✗ · encounters ✗ · cutscene ✗ · eventMinute ✗ · **goal ✓** (`goalA7`: `a7:refused → null`; `a7:knows ? 'home' : 'street'`) · beats ✓

---

# 7. `1986` (A8 · להגיע לבלומפילד)

**Date/start:** 24.5.1986, `bedroom`/`start`, minute 755, next `1990`.

### Beats — **NONE as data.** `ERA_1986.beats` is undefined.
The equivalent is hardcoded in `WorldScene.timeTriggers()` and `openChapterBeat()`:

| hardcoded trigger | condition | effect |
|---|---|---|
| Kobi leaves | `minute >= KOBI_LEAVES (15:10) && !kobi:left` | raise `kobi:left`, toast (red) |
| Kick-off | `minute >= KICKOFF (16:00) && !match:started` | raise `match:started`, toast if not inside |
| Full time | `minute >= FULL_TIME (17:45) && !match:over && !net` | raise `match:over`, raise `arrived:late` if not inside, toast |
| Tunnel walk | `to==='bloomfield-tunnel' && chapter==='1986' && !saw:tunnelWalk` | scripted walk |
| Panorama reveal | `chapter==='1986' && look && !saw:panoReveal` | reveal |
| Directed match | `chapter==='1986' && matchScriptFor('final-86')` | run `final-86` |

### Conversations — **57**, in `lib/life/content/dialogue.ts` (module-private `CONVERSATIONS`, not one of the listed files)
`bed`(2br, ch sleep/wait) · `window`(2) · `poster`(1) · `desk`(2) · `redbox`(2, ch open/shut) · `kobi-morning`(4br, ch ask/leave + match/nothing) · `kobi-match`(1) · `kobi-refuse`(1, ch promise/silence) · `rachel-kitchen`(5br, ch truth/lie + help/no) · `rachel-chore`(1) · `bottles`(2) · `radio`(2) · `family-photo`(1) · `coffee-table`(1) · `sideboard-drawer`(2, ch read/shut + open/leave) · `kitchen-table`(2) · `ofir-wall`(2, ch pitch/match) · `ofir-pitch`(1) · `ofir-knows`(1) · `ofir-matchday`(1) · `neighbour`(2) · `wall-writing`(1) · `gutter-coin`(1) · `alley-look`(1) · `kiosk-look`(1) · `kiosk-man`(1, ch bottles/paper/card/nothing) · `kiosk-bottles`(1) · `kiosk-paper`(1) · `kiosk-card`(1) · `kiosk-counter`(1) · `pitch-kids`(2, ch play/sinai/later) · `pitch-ball`(2, ch play/no) · `route-fan`(1) · `route-veteran`(1) · `route-banner`(1) · `steward`(2) · `ticket-window`(3) · `ofir-ground`(2) · `gate-veteran`(3, ch father/nobody) · `gate-veteran-in`(2) · `street-pole`(2) · `route-shelter`(2) · `gate-seven`(1) · `fence-look`(1) · `terrace-fan`(2) · `terrace-rail`(1) · **`kobi-found`(5br — every branch ends the chapter: `keep`+`ending`)** · `rachel-doorway`(1) · `amit-kiosk`(3, ch pay/watch) · `amit-street`(4, ch buy/ask/go + read/go) · `keren-street`(2, ch ask/scarf/nothing) · `keren-terrace`(1) · `efi-hall`(3, ch go/no/later) · `efi-hall-after`(1) · `route-shortcut`(3) · `gate-turnstile`(1) · `gate-family`(4, ch truth/silent)
Shared sets also reachable here: `dialoguePanoramas` (22 `look-*`), `dialogueAllenby` (5), `dialogueUssishkin` (6), `dialogueMatch` (`m86-stand`, `m86-breath`).

### Endings (3)
| id | titleHe | has `after` epilogue |
|---|---|---|
| `home` | הביתה | ✓ kobi-chair → kobi90-paper |
| `late` | אחרי המשחק | ✓ kobi-cheer → kobi90-cheer |
| `missed` | שבת רגילה | ✓ ofir → ofir90-smoke |

### Flags (objective chain in `ERA_1986.objective`)
- **Reads:** `found:kobi`, `entry:granted`, `kobi:left`, `knows:match`, `inventory['house-key']`, plus in-scene: `saw:tunnelWalk`, `saw:panoReveal`, `match:started`, `match:over`, `arrived:late`
- **Writes (from WorldScene/dialogue):** `kobi:left`, `match:started`, `match:over`, `arrived:late`, `knows:match`, `entry:granted`, `found:kobi`, `saw:*`

### Era features
**schedule ✓** `SCHEDULE_1986` (11 entries) · **opportunities ✓** `OPPORTUNITIES_1986` (6: `kobi-morning`, `ofir-game`, `amit-paper`, `efi-hall`, `rachel-bottles`, `keren-scarf`) · **encounters ✓** `ENCOUNTERS_1986` (12: `street-coin`, `street-card`, `street-radio`, `street-dog`, `street-ask`, `street-lost`, `kiosk-queue`, `route-bus`, `route-help`, `route-paper`, `gate-scarf`, `gate-push`) · **cutscene ✓** `'1986-championship'` · eventMinute ✗ (undefined) · goal ✗ · beats ✗

---

# 8. `1990` (B1 · כמה צריך?)

**Date/start:** 12.5.1990, `kitchen`/`start`, minute 790, next `1991`.

### Beats — **NONE as data.** Hardcoded in `WorldScene.timeTriggers()`:
| trigger | condition | effect |
|---|---|---|
| Kobi says he's leaving | `minute >= KOBI_SAYS_LEAVING && !kobi:leaving && !kobi:left` | raise `kobi:leaving`, toast (red) |
| Kobi leaves | `minute >= (asked:five ? KOBI_LEAVES_LATE : KOBI_LEAVES) && !kobi:left` | raise `kobi:left`, toast (red, consequence kicker) |
| Kick-off / full-time | shared with 1986 (`KICKOFF`, `FULL_TIME`) | `match:started`, `match:over`, `arrived:late` |
| Goal cut | `chapter==='1990' && !saw:goal && !entry:late` | bespoke `match1990.ts` |

Also in-file (non-beat) authored blocks: `PASSAGE_1990` (4 look-objects: `clipping`, `notebook`, `scarf`, `photo`), `PASSAGE_CARD_HE = 'מאי 1990'`, `TABLE_1990` (8 lines), `SCHOOL_MORNING_1990` (6 lines).

### Conversations — **21** in `dialogue1990.ts`
| id | name | br | choices |
|---|---|---|---|
| `table-1990` | — | 2 | `careful/six/wrong/ask` |
| `kobi-table-1990` | קובי | 3 | `now/five/friends`; b2 then time,flag×3,rel,redheart |
| `radio-table-1990` | — | 2 | — |
| `rachel-1990` | רחל | 5 | b0/b1/b2 all `keep`+**ending**; b4 then flag,money,give,rel,toast |
| `phone-1990` | — | 3 | — |
| `photo-1990` | — | 1 | — |
| `bed-1990` | — | 1 | — |
| `drawer-1990` | — | 2 | `take/leave` |
| `ofir-1990` | אופיר | 4 | `friends/dad` |
| `amit-1990` | עמית | 1 | — |
| `kiosk-man-1990` | רפי | 3 | `buy/snack/no` |
| `veteran-1990` | בארי | 2 | — |
| `poster-1990` | — | 1 | — |
| `radio-walker-1990` | אוהד עם רדיו | 1 | — |
| `route-stream-1990` | — | 1 | — |
| `kobi-gate-1990` | קובי | 2 | — |
| `steward-1990` | סדרן | 4 | — |
| `ticket-window-1990` | הקופאי | 3 | — |
| `ofir-ground-1990` | אופיר | 3 | — |
| `vendor-1990` | מוכר | 2 | `seeds/no` |
| `kobi-found-1990` | קובי | 2 | — |

### Endings (3)
| id | titleHe |
|---|---|
| `home` | הביתה, זה לצד זה |
| `late` | אחרי השריקה |
| `missed` | שמעת מהרחוב |

### Flags (objective chain)
- **Reads:** `found:kobi`, `walked:home`, `entry:granted`, `kobi:left`, `knows:math`, `minute >= 16:48`, `matchOver`, plus `asked:five`, `kobi:leaving`, `saw:goal`, `entry:late`
- **Writes:** `kobi:leaving`, `kobi:left`, `match:started`, `match:over`, `arrived:late`, `knows:math`, `entry:granted`, `found:kobi`, `walked:home`

### Era features
**schedule ✓** `SCHEDULE_1990` (11) · **opportunities ✓** `OPPORTUNITIES_1990` (4: `table-math`, `friends-kiosk`, `walk-with-kobi`, `radio-net`) · **encounters ✓** `ENCOUNTERS_1990` (5: `street-radio-1990`, `street-rumor-1990`, `street-coin-1990`, `route-bus-1990`, `ground-old-1990`) · cutscene ✗ (null) · eventMinute ✗ · goal ✗ · beats ✗

---

# 9. `1991` (B2 · יש עוד בית)

**Date/start:** 11.3.1991, `classroom`/`start`, minute 490, next `1993-cup`.
Clock constants: `SCHOOL_STARTS 8:10`, `BELL 8:55`, `AFTERNOON 15:30`, `TIP_OFF 20:00`, `CURFEW 21:30`.

### Beats — **NONE as data.** Hardcoded in `WorldScene`:
| trigger | condition | effect |
|---|---|---|
| Tip-off | `minute >= TIP_OFF && !tipoff:1991` | raise `tipoff:1991`; in `ussishkin-hall` → `startDerby()`; else raise `missed:tipoff` (if `uss:arrived`), toast, `beginNight()` |
| Night must resolve | `tipoff:1991 && !derby:over && !chapterDone` | `beginNight()` every tick; and `minute >= CURFEW+30 && !afar` → `resolveNightFromWherever()` |

Authored non-beat blocks: `CLASSROOM_1991` (6 lines), `NOTE_LINES_HE`, `closing1991(marginHe)` (9 lines, anchor-built), `HOME_NIGHT_1991` (5 lines).

### Conversations — **28** in `dialogue1991.ts`
`note-1991`(4br, ch now/wait/keep) · `note-caught`(1) · `teacher-1991`(3) · `class-board`(1) · `class-window`(1) · `class-bag`(1) · `keren-class`(3) · `ofir-yard`(3) · `amit-yard`(1) · `keren-yard`(1) · `yard-ball`(2, ch play/watch) · `yard-fence`(1) · `ofir-afternoon-1991`(3) · `homework-1991`(3, ch all/half/fake) · **`rachel-1991`(8br — b0/b1/b2 all `keep`+ending; ch ask/wait, truth/push)** · `kobi-1991`(3) · `kitchen-note-1991`(3, ch note/stay) · `usher-night`(3) · `uss-queue`(1) · `amit-hall`(4) · `hall-spot`(3) · `hall-vendor`(3, ch buy/phone/no) · `hall-rail`(1) · `hall-clock`(2) · `derby:chant`(1, ch join/help/clap) · `derby:curfew`(2) · `derby:friend`(2) · `street-night-1991`(2)

### Endings (3)
| id | titleHe |
|---|---|
| `hall` | עד הסוף |
| `wall` | שמעתי דרך הקיר |
| `missed` | ערב רגיל לגמרי |

### Flags (objective chain, verbatim reads)
- **Reads:** `chapterDone`, `derby:over`, `walked:home`, `curfew:now`, `spot:asked`, `spot:held`, `spot:lost`, `school:done`, `permission:yes`, `sneak:ready`, `hw:done`, `hw:half`, `hw:faked`, `hw:given`, plus `tipoff:1991`, `uss:arrived`
- **Writes:** `tipoff:1991`, `missed:tipoff`, `derby:over`, and the school/permission/hall flags from `dialogue1991.ts`

### Era features
**schedule ✓** `SCHEDULE_1991` (12) · **opportunities ✓** `OPPORTUNITIES_1991` (5: `the-note`, `homework`, `permission`, `save-the-spot`, `the-curfew`) · **encounters ✓** `ENCOUNTERS_1991` (6: `street-scooter-1991`, `street-kids-1991`, `street-radio-1991`, `yard-teacher-1991`, `street-known-1991`, `coin-1991`) · cutscene ✗ (null, deliberate) · eventMinute ✗ · goal ✗ · beats ✗

---

# 10. `1993-cup` (B3 · הגביע אדום)

**Date/start:** 19.4.1993, `home`/`start`, minute 930, next `1993-galil`. Entry: `money.changed +2200`.
Constants: `BUS_LEAVES 18:30`, `SIDE_GATE_SHUTS 20:00`, `TIP_OFF_93 20:00`, `FINAL_HORN_93 21:40`.

### Beats (5)
| id | at | trigger | `when` (verbatim) | do |
|---|---|---|---|---|
| `93-open` | home | enter (600) | `{ notFlag: 'beat:93-open' }` | lines ×3 |
| `93-bus-gone` | any | clock, `waitingHe:'ממתין: האוטובוס יוצא'` | `{ afterMinute: BUS_LEAVES + 12, none: [{ flag: 'on:bus' }, { flag: 'route:tv' }] }` | toast (red); flag `bus:gone` |
| `93-tipoff` | any | clock, `waitingHe:'ממתין: הקפיצה הראשונה'` | `{ afterMinute: TIP_OFF_93, none: [{ flag: 'on:bus' }, { flag: 'route:tv' }] }` | toast; flag `tipoff:93` |
| `93-tv` | home | clock, `waitingHe:'ממתין: השידור מתחיל'` | `{ afterMinute: TIP_OFF_93, flag: 'route:tv' }` | sound radio on; card 'שמונה בערב'; talk `tv-final-1993`; flag `final:over`; **ending `television`** |
| `93-street-roar` | any | clock, `waitingHe:'ממתין: הרחוב שומע את התוצאה'` | `{ afterMinute: FINAL_HORN_93, none: [{ flag: 'on:bus' }, { flag: 'route:tv' }] }` | sound roar big:2; lines; flag `final:over`; **ending `missed`** |

### Conversations (15 in `CONVERSATIONS_1993`)
| id | name | br | choices & key effects |
|---|---|---|---|
| `rachel-1993` | רחל | 4 | b3 choices `ask`→flag `asked:money`, money+800, rel rachel trust−2, personality independence−1 · `own` (`minAgorot:1200`)→flag `money:enough`, rel rachel trust+4, independence+2 · `stay`→flag `route:tv`, rel kobi bond+3, belonging+2 |
| `kobi-1993` | קובי | 2 | b1 choices `same`→rel kobi tension+2, redheart basketballLove+2 · `different`→rel kobi bond+3, redheart familyTradition+1 · `dont-know`→curiosity+1 |
| `tv-1993` | — | 2 | none |
| `tv-final-1993` | — | 1 | choices `stand`→rel kobi bond+5, remember kobi `stood-by-tv-1993` notable, redheart familyTradition+3 · `sit`→stubbornness+2, basketballLove+2 |
| `efi-1993` | אפי | 4 | b3 choices `with-efi`→flag `route:efi`, rel efi bond+4, basketballLove+2 · `with-ofir`→flag `route:ofir`, rel efi tension+3 · `later`→toast |
| `ofir-1993` | אופיר | 2 | b1 choices `ok`→toast · `no`→rel ofir distance+2 |
| `amit-1993` | עמית | 1 | then curiosity+1 |
| `rafi-1993` | רפי | 2 | b1 choices `work`→flag `rafi:work`, time+25, money+600, responsibility+2 · `no`→toast |
| `limor-1993` | לימור | 3 | b1 (`afterMinute BUS_LEAVES+12`) then flag `late:route`; b2 choices `thanks`→rel crowd-limor bond+3, flag `knows:side` · `bluff` (`lacksItem:'hall-ticket'`)→flag `bluffed`, impulsiveness+2 |
| `shachor-1993` | שחור | 2 | b1 choices `help`→flag `helped:banner`, rel shachor bond+6, remember `carried-the-banner-1993` major, community+3, energy−10 · `no`→rel shachor tension+2, independence+1 |
| `bus-1993` | — | 6 | b1 (`route:ofir` + before 20:00 + ≥3000) choices `side`→money−3000, give `hall-ticket`, flag `in:sideGate`, rel ofir sharedHistory+4, courage+2, time+40, goto ride · `board-anyway`(≥3600)→money−3600, give ticket, flag `on:bus`, time+35; b2 (`route:ofir` + after 20:00, ≥3600) `board`/`wait`; b3 (`route:efi||route:ofir`, ≥3600) `board`/`wait`; b4 (route set, broke) `admit`→flag `admitted:broke`, rel efi trust+3, empathy+1, goto `chip-in-1993` · `walk`→flag `walking:far`, time+90, energy−30, goto `walked-1993`; b5 fallback |
| `chip-in-1993` | — | 1 | then give ticket, flag `on:bus`, flag `owe:group`, community+4, belonging+4, time+35 |
| `walked-1993` | — | 1 | then flag `arrived:late`, flag `on:bus`, travelDrive+4, stubbornness+2 |
| `ride-1993` | — | 1 | goto `hall-1993` |
| `hall-1993` | — | 2 | b0 `when arrived:late`→flag `inside:hall`; b1 choices `stand`→energy−20, terraceCulture+3, flag `inside:hall` · `spot` (`when helped:banner`)→rel shachor bond+3, community+2 · `sit` |
| `quarters-1993` | — | 1 | goto `horn-1993` |
| `horn-1993` | — | 1 | flag `final:over`, basketballLove+6, happiness+12, belonging+8 |
| `after-1993` | — | 1 | choices `home`→rel kobi bond+4, familyTradition+2, flag `after:home` · `stay`→rel efi sharedHistory+6, community+3, exhaustion+10, flag `after:group` · `ofir`→rel ofir bond+4, flag `after:ofir` |
| `close-1993` | — | 5 | `arrived:late`→flag `walked:home`, **ending `late`**; `after:home`→rel kobi bond+3, **ending `inside`**; `after:group`→exhaustion+6, **ending `inside`**; `after:ofir`→rel ofir sharedHistory+4, **ending `inside`**; fallback → **ending `inside`** |

### Endings (4)
| id | titleHe | presence |
|---|---|---|
| `inside` | הגביע אדום | inside |
| `late` | בחצי השני | late |
| `television` | מהסלון | television |
| `missed` | מהרחוב | heard-from-friend |

### Flags
- **Reads:** `beat:93-open`, `final:over`, `route:tv`, `route:efi`, `route:ofir`, `money:enough`, `walked:home`, `on:bus`, `asked:money`, `rafi:work`, `helped:banner`, `arrived:late`, `after:home`, `after:group`, `after:ofir`, `bluffed`, `inside:hall`, `state.agorot < 1200`
- **Writes:** `bus:gone`, `tipoff:93`, `final:over`, `asked:money`, `money:enough`, `route:tv`, `route:efi`, `route:ofir`, `rafi:work`, `late:route`, `knows:side`, `bluffed`, `helped:banner`, `in:sideGate`, `on:bus`, `admitted:broke`, `walking:far`, `owe:group`, `arrived:late`, `inside:hall`, `after:home`, `after:group`, `after:ofir`, `walked:home`, `heard:live` (encounter)

### Era features
schedule ✗ (`[]`) · opportunities ✗ (`[]`) · **encounters ✓** `ENCOUNTERS_1993` (2: `93-paper`, `93-radio-shop`) · cutscene ✗ · **eventMinute ✓ = `TIP_OFF_93` (20:00)** · goal ✗ · beats ✓

---

# 11. `1993-galil` (B4 · הבית נשבר)

**Date/start:** 9–19.5.1993 (hud `9 במאי 1993`), `ussishkin-outside`/`start`, minute 1080, next `1995-sinai`. Four in-chapter days via `day.entered`.

### Beats (9)
| id | at | trigger | `when` (verbatim) | do |
|---|---|---|---|---|
| `g1-open` | ussishkin-outside | enter (700) | `{ none: [{ flag: D2 }, { flag: D3 }, { flag: D4 }, { flag: D5 }] }` | flag `life:galil:d1`; lines ×3 |
| `g1-hall` | ussishkin-hall | enter (900) | `{ flag: D1, none: [{ flag: D2 }] }` | card 'משחק 1'; **match `galil-93-g1`**; lines ×3; `DAY(D2, 1993, 3, 19:30, '12 במאי 1993')`; card 'יום רביעי'; travel `kitchen`/start |
| `g2-kitchen` | kitchen | enter (700) | `{ flag: D2, none: [{ flag: D3 }] }` | sound radio on; talk `g2-radio`; radio off; `DAY(D3, 1993, 0, 18:00, '16 במאי 1993')`; card; travel `ussishkin-outside` |
| `g3-hall` | ussishkin-hall | enter (900) | `{ flag: D3, none: [{ flag: D4 }] }` | card 'משחק 3'; **match `galil-93-g3`**; `DAY(D4, 1993, 3, 14:00, '19 במאי 1993')`; card; travel `street` |
| `g4-open` | street | enter (700) | `{ flag: D4, none: [{ flag: D5 }, { flag: 'g4:decided' }] }` | events `[money.changed +4500]`; lines ×2 |
| `g4-bus-gone` | any | clock | `{ flag: D4, afterMinute: at(16, 10), none: [{ flag: 'g4:decided' }] }` | toast (red); flag `g4:bus-gone` |
| `g4-radio-time` | any | clock | `{ flag: D4, afterMinute: at(20, 0), none: [{ flag: 'g4:decided' }] }` | flag `g4:decided`; flag `g4:heard`; lines; `DAY(D5, 1993, 4, 18:30, '20 במאי 1993')`; card 'למחרת'; travel `ussishkin-outside` |
| `g4-to-after` | any | clock | `{ flag: 'g4:cut', none: [{ flag: D5 }] }` | `DAY(D5,…)`; card; travel `ussishkin-outside` |
| `after-open` | ussishkin-outside | enter (800) | `{ flag: D5, none: [{ flag: 'after:done' }] }` | talk `after-galil` |

**No `waitingHe` on any beat in this chapter.**

### Conversations (16)
| id | name | br | choices & key effects |
|---|---|---|---|
| `efi-galil` | אפי | 4 | none (D5 / D4 / D3 / fallback) |
| `shachor-galil` | שחור | 2 | none; b0 gated on `relationshipMemory {who:'shachor', eventId:'stacked-chairs-1993'}` |
| `g1-inside` | — | 1 | `high`→flag `g1:high`, curiosity+1 · `low`→flag `g1:low`, terraceCulture+2 · `efi`→rel efi bond+2 |
| `g1-turn` | — | 1 | then stress+6 |
| `g2-radio` | — | 1 | `stay`→flag `g2:radio`, rel kobi sharedHistory+3 · `call`→flag `g2:phone`, rel efi bond+3 · `off`→flag `g2:off`, impulsiveness+2, stress+4 |
| `g2-end` | — | 2 | b0 `when g2:off` then stress+4; b1 then stress+3 |
| `g3-inside` | — | 1 | `promise`→flag `life:promise:g4`, impulsiveness+3, rel efi bond+4 · `signup`→flag `life:signed:bus`, responsibility+2, rel crowd-limor trust+3 · `quiet`→reliability+1, happiness+6 |
| `g4-limor` | לימור | 3 | b0 `when g4:bus-gone`; b1 `when life:signed:bus` ch `pay`(≥9000)→money−9000, flag `g4:decided`, flag `g4:bus`, time+200 / `broke`→goto `g4-broke`; b2 fallback ch `wait`(≥9000)→money−9000, `g4:decided`, `g4:bus`, **`arrived:late`**, time+230 / `ask`→goto `g4-broke` / `no` |
| `g4-broke` | — | 2 | b0 `when {relationship:{who:'shachor',axis:'bond',min:5}}` → flag `g4:decided`, `g4:bus`, `owe:shachor`, community+4, time+200; b1 fallback (radio) |
| `g4-ofir` | אופיר | 2 | b1 ch `car`(≥3000)→money−3000, flag `g4:decided`, `g4:car`, rel ofir sharedHistory+4, time+240 · `no` |
| `g4-car` | — | 1 | then flag `arrived:late`, travelDrive+4 |
| `g4-radio` | — | 2 | b1 ch `radio`→flag `g4:decided`, `g4:radio`, time+60 · `not-yet` |
| `g4-radio-night` | — | 1 | then stress+6, regret+4 |
| `g4-north` | — | 2 | b0 `when arrived:late`→stress+5, flag `life:galil:there`; b1→stress+5, travelDrive+3, flag `life:galil:there` |
| `g4-done` / `g4-cut` | — | 1 / 1 | `g4-cut` then flag `g4:cut` |
| `after-galil` | — | 1 | `shachor`→rel shachor bond+5, remember `stacked-chairs-1993` notable, institution `ussishkinWound`+3 · `limor`→rel crowd-limor bond+4, curiosity+1 · `efi` |
| `after-efi` | — | 3 | b0 `when life:promise:g4 && none life:galil:there` ch `sorry`→rel efi trust−4/bond+1, remember `broke-promise-1993` major · `excuse`→trust−6, distance+5, same memory; b1 `when life:galil:there`→sharedHistory+6; b2 fallback→distance+2 |
| `after-soko` | סוקו | 1 | `ask`→rel soko familiarity+5, historyMemory+3 · `why`→rel soko bond+2, curiosity+2 |
| `after-close` | — | 4 | `g4:bus`&&!late→flag `after:done`, **ending `inside`**; `arrived:late`→**ending `late`**; `g4:radio`→**ending `radio`**; fallback→**ending `heard`** |

### Endings (4)
| id | titleHe | presence |
|---|---|---|
| `inside` | הגביע היה אמיתי | inside |
| `late` | הגעת. מאוחר. | late |
| `radio` | מהמטבח | radio |
| `heard` | מפי אפי | heard-from-friend |

### Flags
- **Reads:** `life:galil:d1..d4`, `life:galil:after`, `after:done`, `g4:decided`, `g4:bus-gone`, `g4:bus`, `g4:car`, `g4:radio`, `g4:cut`, `g2:off`, `arrived:late`, `life:promise:g4`, `life:signed:bus`, `life:galil:there`
- **Writes:** `life:galil:d1..d4`, `life:galil:after`, `g1:high`, `g1:low`, `g2:radio`, `g2:phone`, `g2:off`, `g4:bus-gone`, `g4:decided`, `g4:heard`, `g4:bus`, `g4:car`, `g4:radio`, `g4:cut`, `owe:shachor`, `arrived:late`, `life:promise:g4`, `life:signed:bus`, `life:galil:there`, `after:done`

### Era features
schedule ✗ · opportunities ✗ · encounters ✗ · cutscene ✗ · **eventMinute = null** · goal ✗ · beats ✓ · uses `match` action ✓ (2 scripts)

---

# 12. `1995-sinai` (B5 · המספר שבע על הקיר)

**Date/start:** 1994–1995 (hud `סתיו 1994`), `kiosk`/`start`, minute 1120, year 1994, anchorKey `1994-cup`, next `1996-army`. Two days.

### Beats (4)
| id | at | trigger | `when` | do |
|---|---|---|---|---|
| `s1-open` | kiosk | enter (700) | `{ none: [{ flag: S2 }, { flag: 's1:heard' }] }` | flag `life:sinai:d1`; lines ×2; sound radio on; talk `s1-radio`; radio off |
| `s1-to-home` | any | clock | `{ flag: 's1:argued', none: [{ flag: S2 }] }` | card 'בלילה'; travel `bedroom`/start |
| `s1-poster` | bedroom | enter (800) | `{ flag: 's1:argued', none: [{ flag: S2 }] }` | talk `poster-1994`; `DAY(S2, 1995, 2, 19:00, 'סתיו 1995')`; card '1995' (art `plate-1995-sinai`); travel `kiosk` |
| `s2-open` | kiosk | enter (700) | `{ flag: S2, none: [{ flag: 's2:done' }] }` | lines ×2; talk `s2-court` |

**No `waitingHe`.**

### Conversations (11)
| id | name | br | choices & key effects |
|---|---|---|---|
| `rafi-sinai` | רפי | 3 | none |
| `ofir-sinai` | אופיר | 3 | none; b0 gated `{ sinaiIs:'defending', flag:S2 }` |
| `amit-sinai` | עמית | 1 | none |
| `freddy-sinai` | פרדי | 1 | then institution `legalUnderstanding`+2 |
| `poster-look` | — | 3 | none (`life:poster:gone` / `life:poster:drawer` / fallback) |
| `s1-radio` | — | 1 | `defend`→flag `s1:argued`, `s1:heard`, **sinai `defending`**, rel ofir tension+4, loyaltyReturn+4, courage+2 · `quiet`→`s1:argued`,`s1:heard`, reliability+1, stress+3 · `agree`→`s1:argued`,`s1:heard`, **sinai `doubting`**, rel ofir bond+2, regret+3 |
| `s1-after` | — | 2 | b0 `when sinaiIs:'defending'`→rel kobi sharedHistory+3; b1 fallback |
| `poster-1994` | — | 1 | `look`→historyMemory+2, toast · `kobi`→goto `kobi-sinai-1994` |
| `kobi-sinai-1994` | קובי | 1 | then rel kobi bond+4, remember `two-things-one-head-1994` notable, familyTradition+2 |
| `s2-court` | — | 1 | `cut`→legalUnderstanding+3, rel freddy familiarity+4 · `listen`→legalUnderstanding+6, curiosity+2, time+20 · `defend`→**sinai `defending`**, rel ofir tension+5, rel amit tension+3, loneliness+6, loyaltyReturn+4 |
| `s2-verdict` | — | 2 | b0 `when sinaiIs:'defending'`→flag `s2:done`; b1→**sinai `doubting`**, flag `s2:done`, regret+4 |
| `s2-poster` | — | 1 | `keep`→flag `life:poster:wall`, loyaltyReturn+3, **ending `defending`** · `fold`→flag `life:poster:drawer`, historyMemory+3, **ending `doubting`** · `tear`→flag `life:poster:gone`, impulsiveness+3, regret+5, **ending `torn`** |

### Endings (3)
| id | titleHe | presence |
|---|---|---|
| `defending` | המספר שבע נשאר על הקיר | radio |
| `doubting` | הפוסטר מקופל | radio |
| `torn` | הקיר ריק | radio |

### Flags
- **Reads:** `life:sinai:d1`, `life:sinai:d2`, `s1:heard`, `s1:argued`, `s2:done`, `life:poster:gone`, `life:poster:drawer`, plus `institution.sinai` via `sinaiIs`
- **Writes:** `life:sinai:d1`, `life:sinai:d2`, `s1:argued`, `s1:heard`, `s2:done`, `life:poster:wall`, `life:poster:drawer`, `life:poster:gone` (+ `institution.sinai` stance, `institution.legalUnderstanding`)

### Era features
schedule ✗ · opportunities ✗ · encounters ✗ · cutscene ✗ · eventMinute = null · goal ✗ · beats ✓ · no match script

---

# 13. `1996-army` (B6 · אין מקום אחד לעמוד בו)

**Date/start:** 1996–אביב 1997 (hud `נובמבר 1996`), `street`/`fromHome`, minute 960, entry `money.changed +2500`, next `1997-basket`.
Constants: `BUS_DEADLINE 6:30`, `BUS_AT 5:55`. Four days.

### Beats (9)
| id | at | trigger | `when` | do |
|---|---|---|---|---|
| `a1-open` | street | enter (700) | `{ none: [{ flag: A2 }, { flag: A3 }, { flag: A4 }, { flag: A1 }] }` | flag `life:army:d1`; lines ×2 |
| `a1-night` | any | clock | `{ flag: A1, afterMinute: at(21, 0), none: [{ flag: A2 }] }` | card 'שבת'; `DAY(A2, 1996, 6, 14:30, '16 בנובמבר 1996')`; travel `bloomfield-outside` |
| `a2-open` | bloomfield-outside | enter (800) | `{ flag: A2, none: [{ flag: 'a2:seen' }] }` | flag `a2:seen`; talk `a2-arrive` |
| `a2-close` | any | clock | `{ all: [{ flag: A2 }, { flag: 'a2:chose' }], none: [{ flag: A3 }] }` | card 'דצמבר'; `DAY(A3, 1996, 0, 5:40, 'דצמבר 1996')`; travel `bus-station` |
| `a3-open` | bus-station | enter (700) | `{ flag: A3, none: [{ flag: 'a3:seen' }] }` | flag `a3:seen`; lines ×2 |
| `a3-bus-arrives` | any | clock | `{ flag: A3, afterMinute: BUS_AT, none: [{ flag: 'a3:decided' }, { flag: 'a3:bus-here' }] }` | flag `a3:bus-here`; sfx `bus-door`; toast (red) |
| `a3-bus-leaves` | any | clock | `{ flag: A3, afterMinute: BUS_AT + 8, none: [{ flag: 'a3:decided' }] }` | flag `a3:decided`; flag `a3:hesitated`; talk `a3-left-behind` |
| `a3-to-a4` | any | clock | `{ flag: 'a3:done', none: [{ flag: A4 }] }` | card 'פברואר' (art `plate-1996-army`); `DAY(A4, 1997, 6, 13:00, 'חורף 1997')`; travel `kiosk` |
| `a4-open` | kiosk | enter (700) | `{ flag: A4, none: [{ flag: 'a4:seen' }] }` | flag `a4:seen`; events `[money.changed +6000 'משכורת של חייל']`; talk `a4-winter` |

**No `waitingHe`.**

### Conversations (16)
| id | name | br | choices & key effects |
|---|---|---|---|
| `rachel-army` | רחל | 2 | `promise`→flag `a1:packed`, flag `promise:rachel-army`, rel rachel trust+3 · `honest`→flag `a1:packed`, rel rachel trust−1, independence+2 |
| `ofir-army` | אופיר | 1 | then flag `knows:gate5`, rel ofir familiarity+2 |
| `kobi-army` | קובי | 1 | then rel kobi sharedHistory+2 |
| `a2-arrive` | — | 1 | none |
| `kobi-gate7` | קובי | 4 | b0/b1/b2 gated on `a2:chose`+`gateIs`; b3 choices `stay`→flag `a2:chose`, **gate→gate7 (family)**, rel kobi bond+4, familyTradition+4, remember `stayed-gate7-1996` major · `look`→flag `a2:looked` |
| `barry-gate7` | בארי | 1 | then rel barry familiarity+4, independence+1 |
| `asaf-gate5` | אסף | 2 | b1 choices `join`→flag `a2:chose`, **gate→gate5 (friends)**, rel asaf trust+3, rel kobi tension+5, terraceCulture+5, remember `joined-gate5-1996` major · `rhythm`→sfx `darbuka-three-two`, flag `life:melamed:rhythm`, rel melamed bond+4, terraceCulture+2 · `back`→flag `a2:chose`, **gate→gate7 (family)**, rel asaf distance+3 · `neither`→flag `a2:chose`, **gate→outside (conflict)**, loneliness+6 |
| `a2-after` | — | 3 | gated on `gateIs` gate5 / outside / fallback |
| `a3-bus` | — | 3 | b1 `when a3:bus-here` choices `refuse`→sfx, **consequence `a3:refused`** (laterText, afterMinutes 30), plate `armyRoom`, flag `a3:decided`, flag `life:bus:refused`, loyaltyReturn+6, stubbornness+4 · `board`→flag `a3:decided`, flag `life:bus:boarded`, regret+8, loyaltyReturn−3, responsibility+2 · `other`→flag `a3:decided`, flag `life:bus:searched`, streetSmarts+2 · `wait`→impulsiveness−1 |
| `a3-refused` | — | 1 | `truth`→army `commanderTrust`−15, `leaveDebt`+1, **armyRoute `rebellious`**, flag `a3:done` · `lie`→commanderTrust−5, flag `life:lied:army`, streetSmarts+1, regret+3, flag `a3:done` · `silent`→commanderTrust−20, **armyRoute `punished`**, leaveDebt+2, flag `a3:done` |
| `a3-boarded` | — | 1 | army commanderTrust+3, **armyRoute `trusted`**, flag `a3:done` |
| `a3-searched` | — | 1 | commanderTrust−8, **armyRoute `negotiator`**, travelDrive+2, flag `a3:done` |
| `a3-left-behind` | — | 1 | commanderTrust−12, leaveDebt+1, impulsiveness−2, flag `a3:done` |
| `yaron-base` | ירון | 2 | b0 `when life:bus:refused`→rel yaron familiarity+5; b1→+4 |
| `a4-winter` | — | 1 | `sinai`→**sinai `broken`**, flag `life:sinai:broken`, regret+4, historyMemory+3 · `reconcile`→**sinai `reconciled-memory`**, flag `life:sinai:reconciled`, empathy+2, loyaltyReturn+3 · `protest`→institution `protestEscalation`+8, `footballOwnershipTrust`−5, rel freddy tension+3 · `legal`→`legalUnderstanding`+8, rel freddy trust+4 |
| `a4-freddy` | פרדי | 1 | institution `supporterOwnershipSeed`+6 |
| `a4-liron` | לירון | 1 | `go` (`armyAbove commanderTrust ≥25`)→flag `a4:road`, army leaveDebt+1, travelDrive+4, plate `lironCar` · `go-anyway` (`armyBelow commanderTrust ≤24`)→flag `a4:road`, flag `life:awol`, commanderTrust−20, **armyRoute `punished`**, riskTolerance+4, plate · `stay`→commanderTrust+6, reliability+3, regret+4, flag `a4:road`, presence `army`, **ending `home`** |
| `road-1` | — | 1 | `fuel`(≥3000)→money−3000, rel liron trust+4 · `food`(≥1500)→money−1500, rel liron bond+3 · `nothing`→rel liron trust−2 |
| `road-2` | — | 1 | `stay`→rel liron sharedHistory+6, empathy+2 · `bus`→rel liron distance+5, stubbornness+3, flag `road:bus` |
| `road-3` | — | 2 | b0 `when road:bus`→presence `late`; b1→presence `inside`, community+3 |
| `road-back` | — | 2 | b0 `when life:awol`→army leaveDebt+2, flag `a4:done`, **ending `road`**; b1→commanderTrust+2, flag `a4:done`, **ending `road`** |

### Endings (2)
| id | titleHe | presence |
|---|---|---|
| `home` | החורף נגמר | radio |
| `road` | הדרך חזרה | inside |

### Flags
- **Reads:** `life:army:d1..d4`, `a1:packed`, `a2:chose`, `a2:seen`, `a3:seen`, `a3:bus-here`, `a3:decided`, `a3:done`, `a4:seen`, `a4:road`, `life:awol`, `life:bus:refused`, `road:bus`; also `state.gate.identity`, `armyAbove/armyBelow commanderTrust`
- **Writes:** `life:army:d1..d4`, `a2:seen`, `a3:seen`, `a3:bus-here`, `a3:decided`, `a3:hesitated`, `a4:seen`, `a1:packed`, `promise:rachel-army`, `knows:gate5`, `a2:chose`, `a2:looked`, `life:melamed:rhythm`, `life:bus:refused`/`boarded`/`searched`, `life:lied:army`, `a3:done`, `life:sinai:broken`, `life:sinai:reconciled`, `a4:road`, `life:awol`, `road:bus`, `a4:done` (+ gate/army/institution/sinai state)

### Era features
schedule ✗ · opportunities ✗ · encounters ✗ · cutscene ✗ · eventMinute = null · goal ✗ · beats ✓ · no match script · **only chapter that uses `consequence` and `plate` effects**

---

# 14. `1997-basket` (B7 · גם האולם יכול לרדת)

**Date/start:** 1996/97–1997/98 (hud `אביב 1997`), `ussishkin-outside`/`start`, minute 1140, next `1998-laces`. Two days.

### Beats (4)
| id | at | trigger | `when` | do |
|---|---|---|---|---|
| `h1-open` | ussishkin-outside | enter (700) | `{ none: [{ flag: H2 }, { flag: H1 }] }` | flag `life:hall:d1`; events `[money.changed +3000 'חופשה']`; lines ×2; talk `h1-corner` |
| `h1-hall` | ussishkin-hall | enter (900) | `{ flag: H1, none: [{ flag: 'h1:decided' }] }` | flag `h1:decided`; flag `h1:hall`; card 'הערב האחרון'; **match `hall-97`**; `DAY(H2, 1998, 2, 19:30, 'אביב 1998')`; card 'שנה אחרי'; travel `ussishkin-outside` |
| `h1-football` | any | clock | `{ flag: 'h1:football', none: [{ flag: H2 }] }` | card 'בלומפילד'; talk `h1-bloomfield`; `DAY(H2, …)`; card; travel `ussishkin-outside` |
| `h2-open` | ussishkin-outside | enter (800) | `{ flag: H2, none: [{ flag: 'h2:done' }] }` | talk `h2-corner` |

**No `waitingHe`.**

### Conversations (8)
| id | name | br | choices & key effects |
|---|---|---|---|
| `h1-corner` | — | 1 | `crates`→rel shachor bond+6, remember `crates-relegation-1997` major, energy−12, rel kobi tension+4, basketballLove+4, flag `h1:crates` · `football`→flag `h1:decided`, flag `h1:football`, flag `life:hall:football-night`, rel shachor trust−5, remember `left-relegation-night-1997` major, rel kobi bond+4, institution `ussishkinWound`+4, time+40 · `freddy`→goto `h1-freddy` |
| `h1-freddy` | פרדי | 1 | institution `supporterOwnershipSeed`+8, `basketballOwnershipTrust`−8, goto `h1-corner` |
| `h1-inside` | — | 1 | `carry`→rel shachor sharedHistory+6, `ussishkinWound`+8, `supporterOwnershipSeed`+6, presence `inside` · `efi`→goto `h1-efi` |
| `h1-efi` | אפי | 2 | b0 `when {relationship:{who:'efi',axis:'trust',max:45}}`→loneliness+4, presence `inside`; b1→rel efi sharedHistory+4, `ussishkinWound`+6, presence `inside` |
| `h1-out` | — | 1 | none |
| `h1-bloomfield` | — | 1 | `yes`→rel kobi trust+3, `ussishkinWound`+8, regret+6, presence `heard-from-friend` · `here`→rel kobi bond+3, familyTradition+3, `ussishkinWound`+5, presence `heard-from-friend` |
| `h2-corner` | — | 1 | `hope`→happiness+4, `basketballOwnershipTrust`+4 · `doubt`→rel shachor trust+3, curiosity+1 · `tired`→exhaustion+5 |
| `h2-inside` | — | 2 | b0 `when life:hall:football-night`→flag `h2:done`, `supporterOwnershipSeed`+4, **ending `football`**; b1→flag `h2:done`, `supporterOwnershipSeed`+6, basketballLove+3, **ending `hall`** |

### Endings (2)
| id | titleHe | presence |
|---|---|---|
| `hall` | עלינו. לא הבראנו. | inside |
| `football` | בבלומפילד, כשהאולם ירד | heard-from-friend |

### Flags
- **Reads:** `life:hall:d1`, `life:hall:d2`, `h1:decided`, `h1:football`, `h2:done`, `life:hall:football-night`
- **Writes:** `life:hall:d1`, `life:hall:d2`, `h1:decided`, `h1:hall`, `h1:crates`, `h1:football`, `life:hall:football-night`, `h2:done`

### Era features
Built by `stageB()`: schedule ✗ · opportunities ✗ · encounters ✗ · cutscene ✗ · eventMinute = null · goal ✗ · beats ✓ · match script ✓ (`hall-97`)

---

# 15. `1998-laces` (B8 · השרוכים)

**Date/start:** 2.5.1998, `home`/`start`, minute 780, next `1999-basket`.
Constants: `KICKOFF_98 17:00`, `HALF_98 17:47`, `FULL_98 18:50`. Two days.

### Beats (5)
| id | at | trigger | `when` | do |
|---|---|---|---|---|
| `l1-open` | home | enter (700) | `{ none: [{ flag: L1 }, { flag: L2 }] }` | flag `life:laces:d1`; events `[money.changed +4000 'שבת']`; lines ×2 |
| `l1-match` | bloomfield-inside | enter (900) | `{ flag: L1, none: [{ flag: 'l1:match' }] }` | flag `l1:match`; card 'בלומפילד'; **match `laces-98`**; flag `l1:end` |
| `l1-radio` | any | clock | `{ flag: L1, afterMinute: FULL_98 + 4, none: [{ flag: 'l1:inside' }, { flag: 'l1:after' }] }` | flag `l1:after`; sound radio on; talk `l1-radio-end`; radio off |
| `l1-to-class` | any | clock | `{ flag: 'l1:cut', none: [{ flag: L2 }] }` | card 'יום ראשון'; `DAY(L2, 1998, 0, 9:00, '3 במאי 1998')`; travel `classroom` |
| `l2-class` | classroom | enter (900) | `{ flag: L2, none: [{ flag: 'l2:done' }] }` | talk `l2-tayeb` |

**No `waitingHe`.**

### Conversations (11)
| id | name | br | choices & key effects |
|---|---|---|---|
| `kobi-laces` | קובי | 2 | b0 `when l1:after`; b1 choices `calc`→rel kobi familiarity+2, curiosity+1 · `fear`→rel kobi bond+4, remember `said-afraid-1998` notable · `sure`→impulsiveness+2, rel kobi tension+2 |
| `ofir-laces` | אופיר | 2 | b0 `when l1:after`; b1 then rel ofir familiarity+1 |
| `asaf-laces` | אסף | 5 | b0 `when lacesIs:'avenger'` choices `yes`→rel asaf bond+4, `protestEscalation`+6, flag `l1:promised-asaf` / `no`→rel asaf tension+3, reliability+1; b1 `lacesIs:'protector'`→familiarity+2, `supporterOwnershipSeed`+2; b2 `'organizer'`→bond+3; b3 `'withdrawn'`→familiarity+1; b4 fallback→historyMemory+2 |
| `soko-laces` | סוקו | 2 | none |
| `l1-laces` | — | 1 | then flag `m98:laces`, historyMemory+3 |
| `l1-whistle` | — | 1 | then flag `l1:inside`, flag `l1:after`, stress+12, happiness−10, goto `l1-ten` |
| `l1-ten` | — | 1 | **5 choices:** `stay`→**laces `protector`**, rel ofir bond+6, remember `stayed-with-me-1998` major, empathy+3, flag `l1:cut` · `run`→**laces `avenger`**, `protestEscalation`+12, rel asaf familiarity+4, army commanderTrust−5, riskTolerance+4, goto `l1-pulled` · `soko`→**laces `organizer`**, rel soko bond+6, historyMemory+5, `supporterOwnershipSeed`+6, flag `l1:cut` · `home`→**laces `withdrawn`**, rel kobi bond+4, loneliness+4, flag `l1:cut` · `look`→**laces `witness`**, historyMemory+4, curiosity+2, flag `l1:cut` |
| `l1-pulled` | — | 1 | rel shachor bond+3, flag `l1:cut` |
| `l1-radio-end` | — | 1 | **laces `unresolved`**, regret+6, flag `l1:radio`, flag `l1:cut` |
| `l2-tayeb` | — | 1 | `snap` (`when lacesIs:'avenger'`, **hidden**)→rel teacher tension+8, impulsiveness+3 · `snap-any` (`when none lacesIs avenger`, **hidden**)→tension+8, impulsiveness+4, regret+4 · `ask`→rel teacher trust+4, curiosity+3, flag `l2:asked` · `leave`→independence+2, loneliness+4 · `silent`→stubbornness+2, stress+3, flag `l2:silent` |
| `l2-after` | — | 3 | `l2:asked` / `l2:silent` / fallback — all flag `l2:done`, goto `l2-close` |
| `l2-close` | — | 6 | `lacesIs protector`→**ending `protector`**; `organizer`→**`organizer`**; `avenger`→**`avenger`**; `withdrawn`→**`withdrawn`**; `flag l1:radio`→**`radio`**; fallback→**`witness`** |

### Endings (6)
| id | titleHe | presence |
|---|---|---|
| `witness` | ראית. זה מה שנשאר. | inside |
| `protector` | החזקת מישהו | inside |
| `organizer` | אז נכתוב את זה | inside |
| `avenger` | רצת | inside |
| `withdrawn` | הביתה | inside |
| `radio` | מרחוק | radio |

### Flags
- **Reads:** `life:laces:d1/d2`, `l1:after`, `l1:inside`, `l1:cut`, `l1:match`, `l1:radio`, `l2:asked`, `l2:silent`, `l2:done`, `l1:promised-asaf`, plus `state.laces` via `lacesIs`
- **Writes:** `life:laces:d1/d2`, `l1:match`, `l1:end`, `l1:after`, `m98:laces`, `l1:inside`, `l1:cut`, `l1:promised-asaf`, `l1:radio`, `l2:asked`, `l2:silent`, `l2:done` (+ `state.laces`)

### Era features
`stageB()`: schedule ✗ · opportunities ✗ · encounters ✗ · cutscene ✗ · eventMinute = null · goal ✗ · beats ✓ · match script ✓ (`laces-98`) · **only chapter that writes `state.laces`**

---

# 16. `1999-basket` (B9 · זה לא נגמר כשעולים)

**Date/start:** 1998/99 (hud `אביב 1999`), `ussishkin-outside`/`start`, minute 1110, next `1999-cup`. Single evening (no `day.entered`).

### Beats (3)
| id | at | trigger | `when` | do |
|---|---|---|---|---|
| `seed-open` | ussishkin-outside | enter (700) | `{ none: [{ flag: 'seed:opened' }] }` | flag `seed:opened`; events `[money.changed +5000 'משכורת ראשונה']`; lines ×2; talk `seed-corner` |
| `seed-hall` | ussishkin-hall | enter (900) | `{ flag: 'seed:opened', none: [{ flag: 'seed:hall' }] }` | card 'הערב האחרון'; **match `hall-99`**; flag `seed:hall`; toast |
| `seed-kiosk` | kiosk | enter (800) | `{ flag: 'seed:hall', none: [{ flag: 'seed:list' }] }` | talk `seed-gate5` |

**No `waitingHe`.**

### Conversations (4)
| id | name | br | choices & key effects |
|---|---|---|---|
| `seed-corner` | — | 1 | `work`→rel crowd-limor trust+5, rel shachor bond+3, responsibility+3, energy−8, flag `seed:worked` · `owner`→`basketballOwnershipTrust`−10, `protestEscalation`+4, rel shachor tension+3 |
| `seed-inside` | — | 1 | `why`→rel soko bond+3, historyMemory+3 · `help`→rel soko trust+5, remember `wrote-the-night-1999` notable, historyMemory+5, flag `seed:wrote` |
| `seed-gate5` | — | 1 | `list`→flag `seed:list`, flag `life:seed:list`, `supporterOwnershipSeed`+14, community+6, rel asaf trust+5, rel freddy trust+4, responsibility+3 · `anger`→flag `seed:list`, `protestEscalation`+6, `supporterOwnershipSeed`+2, rel freddy tension+4 · `rhythm` (`when flag:'life:melamed:rhythm'`, noteHe)→sfx darbuka + claps, rel melamed bond+6, remember `rhythm-returned-1999` major, terraceCulture+5 |
| `seed-close` | — | 2 | b0 `when life:seed:list`→presence `inside`, **ending `list`**; b1→presence `inside`, **ending `anger`** |

### Endings (2)
| id | titleHe | presence |
|---|---|---|
| `list` | הרשימה הראשונה | inside |
| `anger` | רק כעס | inside |

### Flags
- **Reads:** `seed:opened`, `seed:hall`, `seed:list`, `life:seed:list`, **`life:melamed:rhythm` (cross-chapter, from 1996-army)**
- **Writes:** `seed:opened`, `seed:hall`, `seed:list`, `life:seed:list`, `seed:worked`, `seed:wrote`

### Era features
`stageB()`: schedule ✗ · opportunities ✗ · encounters ✗ · cutscene ✗ · eventMinute = null · goal ✗ · beats ✓ · match script ✓ (`hall-99`)

---

# 17. `1999-cup` (B10 · שש־עשרה שנה)

**Date/start:** 19.5.1999, `home`/`start`, minute 840, next `2000-title`. `KICKOFF_99 = 20:00`.

### Beats (4)
| id | at | trigger | `when` | do |
|---|---|---|---|---|
| `c99-open` | home | enter (700) | `{ none: [{ flag: 'c99:opened' }] }` | flag `c99:opened`; events `[money.changed +7000 'משכורת']`; lines ×2 |
| `c99-late-route` | any | clock | `{ afterMinute: KICKOFF_99 - 20, none: [{ flag: 'c99:route' }, { flag: 'c99:over' }] }` | flag `c99:route`; flag `c99:away`; card 'שמונה'; talk `c99-away` |
| `c99-stadium` | ramat-gan | enter (1000) | `{ flag: 'c99:route', none: [{ flag: 'c99:over' }, { flag: 'arrived:late' }] }` | card (art `plate-1999-cup`); **match `cup-99`** |
| `c99-stadium-late` | ramat-gan | enter (1000) | `{ all: [{ flag: 'c99:route' }, { flag: 'arrived:late' }], none: [{ flag: 'c99:over' }] }` | card; talk `c99-match` |

**No `waitingHe`.**

### Conversations (11)
| id | name | br | choices & key effects |
|---|---|---|---|
| `kobi-cup99` | קובי | 2 | b1 `with-kobi`→flag `c99:route`, flag `c99:with-kobi`, rel kobi bond+5, familyTradition+4, time+90, travel `ramat-gan` · `other`→rel kobi distance+2, **consequence `c99:alone`** (afterMinutes 50) |
| `liron-cup99` | לירון | 3 | b1 `when {relationship:{who:'liron',axis:'sharedHistory',min:4}}` choices `go`→flag `c99:route`, `c99:with-liron`, rel liron bond+4, time+80, travel · `no` |
| `michel-cup99` | מישל | 3 | b1 `when {gateEver:'gate5'}` ch `go`(≥2000)→money−2000, flag `c99:route`, `c99:with-gate5`, rel michel bond+3, rel asaf bond+3, time+90, travel · `no` |
| `ofir-cup99` | אופיר | 2 | b1 ch `go`(≥1000)→money−1000, flag `c99:route`, `c99:with-ofir`, **flag `arrived:late`**, rel ofir sharedHistory+5, time+150, travel · `no` |
| `efi-cup99` | אפי | 2 | b0 `when {relationship efi trust max:44}`→regret+3; b1→regret+2 |
| `c99-away` | — | 2 | b0 `when {armyRoute:'punished'}`→flag `c99:over`, army fatigue+5, **ending `away`**; b1→flag `c99:over`, **ending `away`** |
| `c99-match` | — | 2 | b0 `when arrived:late`→goto pens; b1→goto pens |
| `c99-pens` | — | 1 | `breathe`→courage+2, flag `pens:looked` · `shoulder`→community+3, belonging+4, flag `pens:held` · `turn`→riskTolerance−1, flag `pens:turned` |
| `c99-pens-2` | — | 2 | `pens:turned` branch / fallback → goto `c99-won` |
| `c99-won` | — | 2 | b0 `when pens:held`; both → sfx `crowd-goal`, happiness+15, footballLove+6 |
| `c99-after` | — | 2 | b0 `when arrived:late`→flag `c99:over`, **ending `late`**; b1 choices `both` (`gateEver:'gate5'`, noteHe)→rel kobi bond+5, rel asaf bond+4, loyaltyReturn+5, flag `c99:over`, flag `life:cup99:together`, **ending `together`** · `kobi`→rel kobi bond+6, remember `cup-hug-1999` major, flags, **ending `together`** · `gate5` (`gateEver:'gate5'`, **hidden**)→rel asaf bond+5, rel kobi distance+4, **ending `divided`** · `alone`→loneliness+5, independence+2, **ending `divided`** |

### Endings (4)
| id | titleHe | presence |
|---|---|---|
| `together` | שש־עשרה שנה | inside |
| `divided` | גביע, בנפרד | inside |
| `late` | הגעת לפנדלים | late |
| `away` | גביע מרחוק | radio |

### Flags
- **Reads:** `c99:opened`, `c99:route`, `c99:over`, `arrived:late`, `pens:held`, `pens:turned`, `c99:with-gate5`, `c99:with-ofir`, `life:cup99:together`; also `gateEver:'gate5'`, `armyRoute:'punished'`, relationship gates on `liron`/`efi`
- **Writes:** `c99:opened`, `c99:route`, `c99:away`, `c99:over`, `c99:with-kobi`, `c99:with-liron`, `c99:with-gate5`, `c99:with-ofir`, `arrived:late`, `pens:looked`, `pens:held`, `pens:turned`, `life:cup99:together`

### Era features
`stageB()`: schedule ✗ · opportunities ✗ · encounters ✗ · cutscene ✗ · eventMinute = null · goal ✗ · beats ✓ · match script ✓ (`cup-99`, on-time route only)

---

# 18. `2000-title` (B11a · ארבעה ימים)

**Date/start:** 13.5.2000, `home`/`start`, minute 870, next `2000-double`. Defined in `chapter2000double.ts` (Part I).

### Beats (4 — `BEATS_TITLE`)
| id | at | trigger | `when` | do |
|---|---|---|---|---|
| `t-open` | home | enter (700) | `{ none: [{ flag: 't:opened' }] }` | flag `t:opened`; events `[money.changed +8000 'משכורת']`; lines ×2 |
| `t-work-debt` | home | enter (1500) | `{ flag: 't:opened', armyAbove: { key: 'leaveDebt', min: 3 }, none: [{ flag: 't:route' }, { flag: 't:debt' }] }` | flag `t:debt`; talk `t-boss` |
| `t-kickoff-away` | any | clock | `{ afterMinute: at(15, 0), none: [{ flag: 't:route' }, { flag: 't:over' }] }` | flag `t:route`; talk `t-radio` |
| `t-ground` | hatikva | enter (1000) | `{ flag: 't:route', none: [{ flag: 't:over' }] }` | card (art `plate-2000-title`); **match `title-00`** |

**No `waitingHe`.**

### Conversations (8 — `CONVERSATIONS_TITLE`)
| id | name | br | choices & key effects |
|---|---|---|---|
| `t-boss` | הבוס | 1 | `go`→flag `t:route`, flag `t:working`, reliability+4, regret+8, presence `working`, goto `t-shift` · `no`→flag `life:quit:2000`, riskTolerance+4, reliability−4, toast (red) |
| `t-shift` | — | 1 | flag `t:over`, **ending `working`** |
| `t-radio` | — | 1 | flag `t:over`, presence `radio`, **ending `working`** |
| `kobi-title` | קובי | 2 | b1 `yes`→flag `t:route`, flag `t:with-kobi`, rel kobi bond+4, time+60, travel `hatikva` · `later`→toast |
| `michel-title` | מישל | 3 | b1 `when gateEver:'gate5'` ch `go`→flag `t:route`, `t:with-gate5`, time+50, travel · `no` |
| `efi-title` | אפי | 2 | b0 `when {relationship efi trust min:45}` ch `go`→flag `t:route`, `t:with-efi`, rel efi bond+6, remember `came-to-football-2000` major, time+60, travel |
| `t-match` | — | 1 | `believe`→happiness+12 · `wait` (`lacesIs:'witness'`, hidden) · `wait2` (`none lacesIs witness`, hidden) — all goto `t-champions` |
| `t-champions` | — | 4 | `t:with-kobi`→sfx, rel kobi bond+8, remember `champions-hug-2000` major, flag `life:title:kobi`; `t:with-efi`→rel efi sharedHistory+8, flag `life:title:efi`; `t:with-gate5`→rel asaf bond+6, flag `life:title:gate5`; fallback→loneliness+3 |
| `t-close` | — | 1 | flag `t:over`, **ending `inside`** |

### Endings (2)
| id | titleHe | presence |
|---|---|---|
| `inside` | אלופים. אין קרדיטים. | inside |
| `working` | אלופים, ולא היית שם | working |

### Flags
- **Reads:** `t:opened`, `t:route`, `t:over`, `t:debt`, `t:with-kobi`, `t:with-efi`, `t:with-gate5`; also `army.leaveDebt ≥ 3`, `gateEver:'gate5'`, `lacesIs:'witness'`, `relationship efi trust ≥ 45`
- **Writes:** `t:opened`, `t:debt`, `t:route`, `t:working`, `t:over`, `t:with-kobi`, `t:with-gate5`, `t:with-efi`, `life:quit:2000`, `life:title:kobi`, `life:title:efi`, `life:title:gate5`

### Era features
`stageB()`: schedule ✗ · opportunities ✗ · encounters ✗ · cutscene ✗ · eventMinute = null · goal ✗ · beats ✓ · match script ✓ (`title-00`)

---

# 19. `2000-double` (B11b · הדאבל)

**Date/start:** 17.5.2000, `home`/`start`, minute 900, **next `null`** — last chapter.

### Beats (3 — `BEATS_DOUBLE`; note `d-after` is declared FIRST in the array)
| id | at | trigger | `when` | do |
|---|---|---|---|---|
| `d-after` | any | clock | `{ flag: 'd:over', none: [{ flag: 'd:walked' }] }` | flag `d:walked`; **derive** → raises `life:family:<outcomeFamily(state)>`; talk `d-walk` |
| `d-open` | home | enter (700) | `{ none: [{ flag: 'd:opened' }] }` | flag `d:opened`; events `[money.changed +6000, energy.changed −35]`; talk `d-days` |
| `d-stadium` | ramat-gan | enter (1000) | `{ flag: 'd:final', none: [{ flag: 'd:over' }] }` | card (art `plate-2000-double`); **match `double-00`** |

**No `waitingHe`.**

### `outcomeFamily(state)` — 7 families, computed from the whole decade
Reads `relationships.kobi.bond` (default 50), `relationships.asaf.bond`, `relationships.shachor.bond`, `missedAnchors.length`, `attendedAnchors.length`, `gate.identity`, `institution.supporterOwnershipSeed`, `redHeart.travelDrive`, `redHeart.basketballLove`, `wellbeing.loneliness`. Order:
1. `missed >= attended + 2` → `heard-elsewhere`
2. `lonely >= 45 && kobi < 45 && asaf < 20` → `alone-in-crowd`
3. `seed >= 25 && shachor >= 12 && basketballLove >= 25` → `two-halls`
4. `gate === 'gate5' && asaf >= 8` → `kobi >= 55 ? 'inherited-chosen' : 'gate5-builder'`
5. `travel >= 22` → `always-travelling`
6. `gate === 'gate7' || 'between'` → `kobi >= 55 && asaf >= 6 ? 'inherited-chosen' : 'gate7-keeper'`
7. else → `inherited-chosen`

### Conversations (7 — `CONVERSATIONS_DOUBLE`)
| id | name | br | choices & key effects |
|---|---|---|---|
| `d-days` | — | 1 | `sleep`→energy+40, flag `d:pick1` · `work`→money+9000, energy−15, flag `d:pick1` · `family`→rel kobi bond+6, rel rachel bond+6, energy+10, flag `d:pick1` · `gate5` (`gateEver:'gate5'`, noteHe)→rel asaf bond+6, terraceCulture+5, energy−20, flag `d:pick1` |
| `d-days-2` | — | 1 | `uss`→rel shachor bond+6, `supporterOwnershipSeed`+6, energy−10, flag `d:final` · `ticket`→give `ticket-stub`, flag `d:ticket`, flag `d:final` · `box`→historyMemory+6, happiness+4, flag `d:final` · `army` (`armyAbove coveredForOthers min:0`, noteHe)→army leaveDebt−2, reliability+3, flag `d:final` |
| `d-go` | — | 2 | b0 `when d:ticket`→time+120, travel `ramat-gan`; b1→flag `arrived:late`, time+150, travel |
| `d-match` | — | 1 | `breathe`→courage+3 · `hold`→community+3 · `trap` (`lacesIs:'witness'`, hidden)→stress+5 · `trap2` (`none lacesIs witness`, hidden)→stress+5 |
| `d-pens` | — | 1 | then sfx crowd-goal + claps, happiness+20, footballLove+8, loyaltyReturn+5, flag `d:over` |
| `d-walk` | — | 1 | presence `inside`, goto `d-family` |
| `d-family` | — | 7 | one branch per `life:family:*` flag → **endings** `inherited-chosen`, `gate5-builder`, `gate7-keeper`, `two-halls`, `always-travelling`, `heard-elsewhere`; fallback → `alone-in-crowd` |
| `kobi-double` | קובי | 4 | b0 `when d:over`; b1 `when d:final`→rel kobi familiarity+1; b2 `when {relationship kobi bond min:60}` ch `promise`→bond+6, remember `promised-together-2000` major, loyaltyReturn+3 / `gate5`→distance+2, rel asaf bond+2 / `joke`→familiarity+2, happiness+2; b3 fallback ch `come`→bond+5, distance−3, remember `asked-together-2000` major / `shrug`→distance+2, loneliness+2 |

### Endings (7)
| id | titleHe | presence |
|---|---|---|
| `inherited-chosen` | ירשת. ובחרת. | inside |
| `gate5-builder` | בנית משהו | inside |
| `gate7-keeper` | שומר השער | inside |
| `two-halls` | שני בתים, חיים אחד | inside |
| `always-travelling` | תמיד בדרך | inside |
| `heard-elsewhere` | שמעת ממקום אחר | radio |
| `alone-in-crowd` | לבד בתוך הקהל | inside |

### Flags
- **Reads:** `d:opened`, `d:final`, `d:over`, `d:walked`, `d:ticket`, `life:family:*` (all 6 named), plus `gateEver:'gate5'`, `armyAbove coveredForOthers`, `lacesIs:'witness'`, `relationship kobi bond ≥ 60`
- **Writes:** `d:walked`, `life:family:<family>` (derived), `d:opened`, `d:pick1`, `d:final`, `d:ticket`, `arrived:late`, `d:over`

### Era features
`stageB()`: schedule ✗ · opportunities ✗ · encounters ✗ · cutscene ✗ · eventMinute = null · goal ✗ · beats ✓ · match script ✓ (`double-00`)

---

# 20. `LifeState` — every field (`lib/life/types.ts`)

| field | type | holds |
|---|---|---|
| `schemaVersion` | `readonly 2` | shape version of the state object (not the save file) |
| `identity` | `readonly PlayerIdentity` | `{ name, sex: 'boy'\|'girl', birthYear }` — default `פוגי`, boy, 1978 |
| `year` | `number` | the calendar year currently being played |
| `age` | `number` | whole years old at `year` |
| `weekday` | `number` | 0=Sunday … 6=Saturday (Israeli week) |
| `minute` | `number` | minutes since midnight — the day clock |
| `agorot` | `number` | money in the pocket today (legacy mirror of `resources.money`) |
| `energy` | `number` | 0..100 stamina (legacy mirror of `resources.energy`) |
| `resources` | `ResourceState` | `{ money, energy, availableTime }` — the three spendables |
| `location` | `LocationId` | which room/place the player is in |
| `wellbeing` | `WellbeingState` | `happiness, stress, loneliness, belonging, exhaustion, regret` — never shown as a bar |
| `personality` | `PersonalityState` | 11 axes: independence, courage, responsibility, reliability, empathy, streetSmarts, curiosity, impulsiveness, stubbornness, sociability, riskTolerance |
| `redHeart` | `RedHeartState` | 10 identity dimensions: footballLove, basketballLove, troubleAffinity, professionalFootball, community, terraceCulture, travelDrive, historyMemory, familyTradition, loyaltyReturn |
| `bonds` | `Record<BondId, number>` | legacy single-number bond per character; mirrors `relationships[id].bond` |
| `relationships` | `Record<CharacterId, RelationshipState>` | six-axis relations: bond, trust, familiarity, sharedHistory, tension, distance (+ optional `lastMeaningfulContact` minute) |
| `relationshipMemory` | `RelationshipMemory[]` | what each person remembers you doing: `{ characterId, eventId, significance, year, atMinute }` |
| `traits` | `Record<TraitId, number>` | legacy 8 traits, each routed into personality or redHeart via `TRAIT_ROUTE` |
| `inventory` | `Partial<Record<ItemId, number>>` | small period objects currently carried, by count |
| `flags` | `Record<FlagId, boolean\|string\|number>` | everything that happened once; day-scoped unless `life:`/`own:` prefixed |
| `memories` | `Memory[]` | red-box memory rows: `{ id, item, atMinute, year, anchorId }` |
| `redBox` | `RedBoxItem[]` | the kept objects with title/note/rarity/source event |
| `opportunities` | `OpportunityRuntimeState[]` | live windows: `{ id, status: open\|taken\|missed, offeredAt, resolvedAt? }` |
| `encounters` | `Record<string, number>` | encounter id → minute it last fired (cooldown book-keeping) |
| `rng` | `SeededRandomState` | `{ seed, cursor }` — reproducible randomness, never applied to history |
| `attendedAnchors` | `string[]` | canonical anchor IDs he was present for |
| `missedAnchors` | `string[]` | canonical anchor IDs he missed |
| `savings` | `number` | the tin under the bed — agorot that survive a day/year transition; no chapter may reset it |
| `clothing` | `string[]` | things he owns for life (`shirt:1985`, …); survives every day |
| `stageADay` | `string \| undefined` | which of Stage A's eight days is currently being played |
| `chapter` | `string` | the chapter id the runtime should be showing |
| `chapterDone` | `boolean` | true once the chapter's closing beat has played |
| `dateHe` | `string \| null` | the day's date as the chapter names it; null = use the anchor's date |
| `gate` | `GateState` | `{ identity: gate7\|gate5\|between\|outside, history: GateHistoryEntry[] }` |
| `army` | `ArmyState` | `{ route, commanderTrust, leaveDebt, fatigue, missedAnchors[], coveredForOthers }` |
| `institution` | `InstitutionState` | `{ sinai stance, footballOwnershipTrust, basketballOwnershipTrust, protestEscalation, legalUnderstanding, ussishkinWound, supporterOwnershipSeed }` |
| `presence` | `Record<string, PresenceMode>` | anchor id → how he was present (inside/late/outside/radio/television/army/working/heard-from-friend/archive-later) |
| `laces` | `LacesResponse \| null` | permanent 2.5.1998 mark: witness/protector/organizer/avenger/withdrawn/unresolved |

---

## Notable gaps a design-brief diff should look at

1. **`1986`, `1990`, `1991` have zero data beats** — all their timed logic is hardcoded in `WorldScene.ts`. They are the only three chapters not yet migrated to the `Beat` row format the Stage-B brief §13 mandates.
2. **`goal` is Stage-A-only.** No Stage-B chapter points the router at a room; `world/route.ts` arrow/hint is dead for 1986 onward.
3. **`eventMinute` is set on exactly one chapter** (`1993-cup`). The HUD's second clock has nothing to show in every other chapter.
4. **Schedules/opportunities/encounters stop after 1991.** Every chapter from `1993-galil` on (and every Stage-A day) has an empty neighbourhood — no NPC timetable, no live windows, no random encounters. `1993-cup` has 2 encounters and nothing else.
5. **`cutscene` is set on exactly one chapter** (`1986`).
6. **`ambient: AMBIENT_1986` is used by one chapter only**; every Stage-A day and every Stage-B chapter reuses `AMBIENT_1990`.
7. **Only 1996-army uses `consequence`/`plate` effects**; only 1998-laces writes `state.laces`; only 1996-army writes `gate`/`armyRoute`.
8. **`1995-sinai` and `1996-army` have no directed match** despite both containing match evenings; `1993-cup`'s final is a conversation cut, not a `match` script.
9. **`1999-cup`'s on-time route** goes through `match: 'cup-99'`; the `c99-match` conversation's non-late branch is a single fallback line (the comment records that the fuller version was deleted as unreachable).
10. **A1 (`CONVERSATIONS_A1`, 5 conversations)** exists in `chapterStageA.ts` but has **no `ChapterDef`** — it is reachable only through the `prologue` chapter id, which `eraFor()` falls through to `ERA_1986`.agentId: aca41bab02b41ec42 (use SendMessage with to: 'aca41bab02b41ec42', summary: '<5-10 word recap>' to continue this agent)
<usage>subagent_tokens: 308055
tool_uses: 51
duration_ms: 732877</usage>
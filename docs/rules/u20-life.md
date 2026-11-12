## LIFE — במאי, טקס, מחזור חיים של מקום (דלתא 92, 27.9.2026)

מסמך הבעלים: THE-WORKER-LIFE-INTEGRATED-UPGRADE-PLAN-2026-09-27. ארבעה מנגנונים משותפים, לא תשעה תיקונים.

1. **`lib/life/storyDirector.ts` — `directiveFor`** מחזיר הוראה אחת: `PRE_MATCH` (הארון) › `DILEMMA`
   (שני יעדים באותו משקל — A2: הקיוסק והמגרש) › `MUST` (ה-objective וה-goal של הפרק). בדילמה
   אין חץ ואין "הדלת הבאה": `aim2goal`/`bestExit` מחזירים null, שתי הדלתות נדלקות (`dilemmaExits`),
   וכרטיס `DirectorCard` אומר את שתי הסיבות. הבמאי לא ממציא יעדים ולא מכוון למקום שנהרס.
2. **A2 בלי אפי.** הקיוסק של רפי בלבד; אופיר ועמית על המגרש (`pitch`, era `a2-alley`). אפי נפגש
   ב-A3 כאדם חדש (`efi-a3-meet`: לדבר / הכדור / ללכת אחריו / לא עכשיו / "לבנות"), ו-A3 פתוח לכל חיים.
   "לא עכשיו" = `life:efi:deferred` וסוף `street`; ב-A4 הוא ליד הקיוסק פעם אחת (`efi-a4`), ו"לא"
   שני = `life:efi:declined`. `life:a2:efi` ביומן ישן נקרא `life:efi:met` (`LEGACY_FLAG_ALIASES`).
3. **טקס לפני משחק = אותו ארון.** `lib/life/matchRitual.ts` (`MATCH_RITUALS`, `ritualOptions`,
   `wearEvents`) → `own:outfit:<chapter>`, ש-`wearingAt` מכבד. רק חולצות שלו ושכבר היו קיימות;
   אין באף; `a5-first` לא מקבל "בלי חולצה". `RitualSheet` = `WardrobeRail` עם `action`, בלי כפתור
   סגירה, ומחכה מאחורי כל כרטיס אחר. בלי חולצות — בלי טקס.
4. **`lib/life/world/placeLifecycle.ts`.** אחרי `2007-registered` הדלת לאוסישקין לא קיימת
   (`exitInEra`), ובתוך הפרק היא נסגרת כש-`life:place:ussishkin = 'demolished'` עולה בביט 7 (`whenFor`).
   דלתות בתוך המקום לא נסגרות לעולם. מטרה/פעולה/במאי לעולם לא מכוונים לשם (`sceneAlive`);
   המפה: «אוסישקין הי"ד» (`labels.ts`); שמירה שעומדת בפנים זזה פעם אחת לאלנבי (`BootScene`).
   ההריסה היא שבעה ביטים (ערב אחרון → טלפון בבוקר → הליכה → אנשים → אבק בלי HUD → בחירה אנושית
   → העולם משתנה), בלי פרס. `life:uss:there`/`life:uss:lossKind` נקראים ב-2009/2012/2015/2026.
5. **סרט = מדיניות אחת וכפתור אחד.** `lib/life/filmPlayback.ts` + `FilmSkipButton` בפתיח, בדוקומנטרי
   ובסרט ההיסטורי. ≥44px, ‏15px, ‏opacity 1, ‏Esc בדסקטופ, safe-area.
6. **סופרגול לפי עשור, בלי להמציא.** `era`/`acquisition` לכל סט; `STICKER_ERA_COVERAGE` — 00s/10s/20s
   הם `asset-gap` עד שיגיעו סריקות (`docs/life/supergoal-asset-gaps-2026-09-27.md`).
7. **חנות ≠ מקור.** `lib/merch.ts` הוא הרישום היחיד של קישורי רכישה (`MerchLinks`); משחק השבת
   תמיד "עצמאי · רפליקה" עם גילוי. `/credits` מוסיף מדף `community`, בלי לגעת ב-provenance.
8. בדיקות: `tests/life-upgrade-92.test.ts`, `life-film-playback`, `life-stickers-era`, `merch`.

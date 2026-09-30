# 17 · הארון, שוק האדומים והמכירה הפומבית

**תאריך:** 22.9.2026 · **מפרט:** `docs/specs/SHIRT-COLLECTOR-MARKET-AUCTION-SPEC-2026-09-22.md`
**מסד:** `supabase/migrations/20260922120000_worker_collector_market.sql` · **בדיקה:** `scripts/db/verify.sh`

> *"החולצות מספרות את ההיסטוריה. האנשים ממשיכים אותה."*

## 1 · ארבע שכבות, זהות אחת

```
ARCHIVE     lib/kit/archive.ts + Kit Master     מהי החולצה (168 תצלומים, 35 ערכות)
COLLECTION  worker_collector_item / _want       מה יש לי, מה אני מחפש
MARKET      connection · message · offer        מי מחפש, מי מחזיק, שיחה, הצעה, עסקה
AUCTION     auction_lot · auction_bid           אירוע: אישור, חלון זמן, Max Bid, מינימום נסתר
```

- **הזהות היא הארכיון.** פריט מצביע על `archive_slug` (שם קובץ התצלום, `vp-1985-away`) ועל
  `kit_id` רק כשה-Kit Master מחזיק את התצלום המדויק (`lib/collector/catalog.ts`). עונה, יצרן,
  ספונסר ותמונה לא מועתקים לשום שורה (מפרט §72). חולצה "זהה" = אותו תצלום, או אותו `kit_id`
  כששני הצדדים יודעים אותו (`worker_same_shirt`).
- **דגם מול עותק** (§6): הארכיון הוא דגם, `worker_collector_item` הוא עותק פיזי. אפשר שני עותקים.
- **אין `/marketplace` מנותק** (§71). הכול תחת `/kits`: הארכיון, `/kits/closet`, `/kits/market`,
  `/kits/auction`, `/kits/admin`.

## 2 · המסד — כללי ברזל

1. **אין grant לאף טבלה.** כל קריאה וכל כתיבה היא פונקציה `security definer` שמחזירה JSON:
   `{ ok: true, ... }` או `{ ok: false, error }` — ערך, לא שגיאה, כדי שמונה הניסיונות ישרוד.
2. **חשבון אמיתי בלבד לכל כתיבה.** בפרויקט המשותף עם DUBID התחברות אנונימית פעילה, ומשתמש
   אנונימי מקבל את התפקיד `authenticated`. `worker_market_uid()` מחזירה null לטוקן אנונימי.
3. **אין מזהה משתמש בשום תשובה.** אספן הוא `CollectorLabel`: `אספן #1842`, ואם בחר — הכינוי
   מהכרטיס. חסימה ודיווח הם לפי המספר. אין שדה טלפון, מייל או וואטסאפ בשום טבלה (§18).
4. **מכירה פומבית:** המוכר לא מציע (§38), המינימום נסתר (§37), Max Bid פרטי (§35), הצעה בחלון
   האחרון מאריכה את הסיום (§36), וסגירה עצלה כשמסתכלים — בלי משימה מתוזמנת.
   בסגירה עם זוכה נפתחת שיחה (`worker_collector_connection`, `agreed`) בין הזוכה למוכר —
   `lot.connection_id`. "הושלם" בשיחה עובר ל-`worker_auction_complete`; ביטול רק דרך מנהל.
7. **החלפה:** רק מי שביקש מציע חולצות שלו בתמורה (`worker_offer_make` מסרב למחזיק).
5. **אין תשלום ואין עמלה.** התרומה היא כרטיס אחרי השלמה, וכתובתה ב-`NEXT_PUBLIC_DONATE_URL`.
6. **ניהול** — `worker_admin` (שורה אחת מה-SQL Editor), כל `worker_admin_*` בודקת בשורה הראשונה,
   יומן ביקורת בטריגר על הטבלה.

## 3 · הצינור — `lib/collector/api.ts`

המודול היחיד שמדבר עם המסד. לעולם לא זורק; בלי מפתחות הכול `{ ok: false, error: 'off' }`.
הטיפוסים ב-`lib/collector/types.ts`, המילים ב-`lib/collector/labels.ts` ו-`messages/he.collector.json`.

| קבוצה | פונקציות |
|---|---|
| ארכיון | `shirtSignals(slugs)` — כמה יש, מחפשים, להחלפה, למכירה, במכירה פומבית; `youHave`/`youWant` |
| ארון | `closetMine` · `closetView(handle, token)` · `have(slug, kitId, newCopy)` · `unhave` · `wantSet` · `itemUpdate(id, patch)` · `photoUpload(userId, itemId, file)` · `photoRemove` · `photoOrder` · `settings` |
| שוק | `marketList({slug, kind})` · `marketItem(id)` · `matches()` |
| חיבור | `connect(itemId, 'buy'|'trade', body)` · `respond` · `sendMessage` · `offerMake` · `offerRespond(id, 'accept'|'decline'|'counter', amount)` · `step(id, 'agreed'|'done'|'cancel')` · `myConnections` · `thread(id)` · `block(handle)` · `report({...})` |
| מכירה פומבית | `auctionSubmit` · `auctionWithdraw` · `auctionList('open'|'recent'|'mine')` · `auctionState(id)` · `auctionBid(id, max)` · `auctionWatch` · `auctionComplete` |
| התראות | `notifications(limit)` · `notificationsRead(ids?)` |
| חנויות | `merchantOffers({slug, kitId, season})` |
| ניהול | `adminWhoami` · `adminOverview` · `adminLots` · `adminLotDecide` · `adminLotCancel` · `adminBidVoid` · `adminReports` · `adminReportResolve` · `adminConnectionView` · `adminItemSuspend` · `adminMerchantList` · `adminMerchantUpsert` · `adminAudit` |

רכיבים משותפים ב-`components/collector/`: `CollectorTag`, `SignInPrompt`, `DonationCard`,
`ItemFacts`, `UserPhoto`, `HaveWantBar`, `RealShirtAsk`, `NotificationList`, `MatchShare`,
`MerchantOffers`, `ShirtThumb`, `ClosetDoor`. השוק ב-`components/market/`, המכירה ב-`components/auction/`.

## 4 · המסכים

| מסלול | מה |
|---|---|
| `/kits/archive` (קיים) | על כל חולצה: `✓ יש לי` · `♡ מחפש` · אות ביקוש · קישור לשוק ולחנויות |
| `/kits/build` (שער 4, קיים) | אחרי זיהוי: *"זיהית אותה. עכשיו השאלה האמיתית: יש לך אותה בבית?"* — יש לי / הלוואי |
| `/kits/closet` | הארון שלי: מדדים, חורים, לשוניות יש לי / מחפש / זמין / חיבורים, עריכת עותק, פרטיות, שיתוף, התראות |
| `/kits/closet/[handle]` | ארון של אספן אחר — ציבורי, או בקישור (`?t=`) |
| `/kits/market` | שוק האדומים: מה זמין, סינון, ההתאמות שלי |
| `/kits/market/item/[id]` | עותק: תמונות, פרטים, ביקוש, חנויות, בקשת חיבור |
| `/kits/market/c/[id]` | השיחה: הודעות, הצעות, סיכום, השלמה, הצלחה, תרומה |
| `/kits/auction` · `/kits/auction/[id]` · `/kits/auction/submit/[itemId]` | המכירה הפומבית |
| `/kits/admin` | ניהול: לוטים, דיווחים, חנויות, יומן |

### מתקני בדיקה (בלי מסד)

`/qa/collector?view=closet|public|editor|want|open|connections|notices|empty|parts` ·
`/qa/market?show=board|listing|thread|thread-done|shops|…` ·
`/qa/auction?view=board|lot-live|lot-won|lot-completed|submit|admin|…` — כולם בסריקה (`npm run qa:sweep`).

## 5 · מה עוד לא כאן, ולמה

- **ספק תשלום לתרומה** — החלטה של מאור. עד אז הכרטיס מציג תודה בלי כפתורי כסף.
- **התראות מחוץ לאתר** (מייל/פוש) — אין. התראות נוצרות באירוע ונקראות בארון.
- **Realtime** — משיכה (polling). Realtime דורש שינוי בפרסום המשותף עם DUBID.
- **מנהל ראשון** — שורה אחת ב-SQL Editor (בהערה בסוף קובץ המסד), עם המייל של מאור.

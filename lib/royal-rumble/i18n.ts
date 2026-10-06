export type RoyalRumbleMessageKey = keyof typeof COPY

const COPY = {
  title: 'רויאל ראמבל',
  moneyLeft: 'נשאר בקופה',
  description: 'בנה חמישיית הפועל בתקציב מוגבל, חשוף את היריבה וצא לקרב 5 על 5.',
  sub: '5 נגד 5 · תקציב 15 מיליון · הציון האמיתי נשאר סודי',
  goalkeeper: 'שוער', defence: 'הגנה', midfield: 'קישור', attack: 'התקפה',
  activeYears: 'שנות הפעילות בארכיון', priceEntry: 'מחיר כניסה', hapoelYears: 'בהפועל',
  lineupWall: 'החמישייה על הקיר', lineupEdit: 'לחץ על מקום כדי לחזור ולשנות', vacant: 'פנוי',
  opponentBody: 'החמישייה שמולך כבר נקבעה לפני הבחירה הראשונה שלך. אין התאמות, אין רחמים.',
  resultSecret: 'המספרים האמיתיים נשארים בחדר הסגור. המחיר מספר רק באיזה אזור איכות השחקן נמצא — לא כמה הוא באמת חזק.',
  yourFive: 'החמישייה שלך', theirFive: 'החמישייה שנכנסה מולך', again: 'עוד קרב',
  heroBody: 'שלושה שמות נכנסים בכל סיבוב. אחד נשאר. בנה חמישייה ב־15 מיליון — בלי לראות לעולם את הציון האמיתי של אף שחקן.',
  budgetOf: 'מתוך {budget}', lockedCount: '{count}/5 נעולים', archiveCount: '{count} במאגר',
  draftQuestion: 'שלושה נכנסים. מי נשאר?', draftPosition: 'עמדה: {position} · המחיר גלוי, האיכות המדויקת לא.',
  ratingNever: 'לעולם לא נחשף', fadedNote: 'כרטיס דהוי = הבחירה הזאת לא משאירה מספיק כסף להשלים חמישייה חוקית.',
  invalidFive: 'החמישייה לא עברה אימות. בחר חמישה שחקנים מתוך ההגרלה ובתקציב.', locking: 'נועל את הזירה…',
  lockReady: 'נעל חמישייה · פתח את דלתות היריבה', missingPlayers: 'חסרים עוד {count} שחקנים',
  rulePrice: '€1M–€5M הוא מחיר, לא Rating.', ruleRange: 'שני שחקני €4M יכולים להיות רחוקים מאוד בכוח.',
  ruleOpponent: 'היריבה נקבעת מראש — אין התאמה לבחירות שלך.',
  challengeBody: 'אותם 15 מועמדים, אותה יריבה, אותו תקציב. רק ההחלטות משתנות. עכשיו אפשר להתווכח על החמישייה — לא על ההגרלה.',
  challengeCopied: 'הלינק הועתק', challengeShared: 'נשלח. עכשיו שיבנה.',
  matchWon: 'נגמר. החמישייה שלך לוקחת את הקרב.', matchLost: 'נגמר. הפעם היריבה נשארה עומדת.', matchDraw: 'נגמר. תיקו בזירה.',
  goalFlashOurs: 'גול!', goalFlashTheirs: 'ספגנו.', goalFlashOursBody: 'הכדור בפנים. היציע מתפוצץ.',
  goalFlashTheirsBody: 'זה בפנים בצד שלנו. חוזרים מיד למרכז.', shuffleTitle: 'שאפל אחד. לא יותר.',
  shuffleBody: 'לא אוהב את הלוח? פעם אחת בכל ראמבל אפשר לזרוק את כל 15 המועמדים ולקבל הגרלה חדשה. כל בחירה שכבר עשית מתאפסת.',
  shuffleAction: 'עשה שאפל לכל הקבוצה', shuffleUsed: 'השאפל נוצל', shuffleFresh: '15 שמות חדשים נכנסו לזירה.',
  kitSeason: 'חולצת {season}', kitApprox: 'חולצת {season} (בערך)', kitPlain: 'חולצת בית', kitArchive: 'חולצת משחק מהארכיון', kitNearest: 'כל שחקן בחולצה המקורית מתקופתו — תצלום מהארכיון, ובאין תצלום, השרטוט שלנו.',
  modeTitle: 'מצב משחק', soloMode: 'ראמבל רגיל', liveMode: 'ראש בראש בלייב',
  slotSpinning: 'השמות רצים. עוד רגע ננעלים.', slotLocked: 'השם נעצר. זה השחקן שנכנס להגרלה.',
  liveTitle: 'אותו רגע. שני אוהדים. ראש בראש.', liveSignInBody: 'מצב הלייב מסנכרן שני שחקנים בזמן אמת. הכניסה למשחק הרגיל נשארת חופשית; ללייב בלבד צריך חשבון.',
  liveSignIn: 'התחבר כדי לפתוח לייב', liveCreateTitle: 'פתח חדר חדש', liveCreateBody: 'נוצר קוד ולינק לחבר. שניכם בוחרים חמישייה במקביל, נועלים, ומתחילים באותה שנייה.',
  liveCreate: 'פתח חדר לייב', liveJoinTitle: 'היכנס לחדר', liveJoin: 'הצטרף לראמבל', liveCodePlaceholder: 'קוד חדר',
  liveDraftTitle: 'בנה את החמישייה שלך. היריב עושה אותו דבר.', liveCopy: 'העתק לינק לחדר', liveCopied: 'הלינק הועתק',
  liveYou: 'אתה בחדר', liveOpponentJoined: 'היריב מחובר', liveOpponentMissing: 'מחכה ליריב', liveMoneyLeft: 'נשאר בתקציב',
  liveLock: 'נעל חמישייה · אני מוכן', liveLocked: 'החמישייה שלך נעולה.', liveYouReady: 'אתה מוכן', liveOpponentReady: 'היריב מוכן',
  liveWaiting: 'הבחירות שלך מוסתרות. ברגע שהצד השני ינעל, יתחיל אצל שניכם אותו Countdown.',
  liveCountdown: 'שני הצדדים נעולים. המשחק מתחיל באותה שנייה.', liveResolving: 'מאמת את שתי החמישיות ומכין את הקרב…',
  liveWon: 'לקחת את הראש בראש.', liveDraw: 'תיקו. אף אחד לא יצא נקי.', liveLost: 'היריב לקח את הראמבל הזה.',
  liveError: 'החדר לא הסתנכרן. בדוק שהלינק והחיבור תקינים ונסה שוב.',
  // delta 87 — the phone stage: a sheet for what used to be desktop-only fine print,
  // so the rules are reachable on a phone too, not only hidden behind `sm:block`.
  stageRulesChip: 'חוקי המשחק', stageRulesTitle: 'איך רויאל ראמבל עובד',
  // delta 91 — Royal Rumble V2 (spec §41–§43, §50–§54, §72): the fixed order (V3),
  // result line, the shuffle that closes after the first pick, "עוד קרב" and the recent five.
  fixedOrderHint: 'הסדר קבוע: שוער, מגן, שני קשרים וחלוץ. הכסף הוא ההחלטה.',
  formationDefensive: 'חמישייה הגנתית · 1–2–1–1', formationCreative: 'חמישייה יוצרת · 1–1–2–1',
  formationDefensiveHeld: 'החמישייה ההגנתית החזיקה.', formationCreativeMade: 'שני הקשרים יצרו את ההבדל.',
  valuePick: 'המציאה שלך: {name}.', matchHero: 'גיבור הקרב: {name}.', starPick: 'ההשקעה הגדולה החזירה: {name}.',
  shuffleBeforePick: 'שאפל רק לפני הבחירה הראשונה',
  recentTitle: 'הקרבות האחרונים', recentEmpty: 'הקרב הראשון שלך. השאר יתווספו כאן.',
  recentWin: 'ניצחון', recentDraw: 'תיקו', recentLoss: 'הפסד',
  offeredAsLabel: 'מוצע כ{position}', cardAria: '{name} · {position} · {price}', cardBlocked: '{name} · {price} · לא משאיר כסף להשלים חמישייה',
  playBuildOurs: '{helper} מרוויח מטר, מרים את הראש ומוצא את {player}.',
  playBuildTheirs: '{helper} מושך את הלחץ ומשחרר את {player} קדימה.',
  playShotOurs: '{player} נכנס למצב. היציע כבר עומד.', playShotTheirs: '{player} מול השער. החמישייה שלך נסוגה עד הקו.',
  playGoalOurs: 'שער! {player} שם את זה בפנים.', playGoalTheirs: 'היריבה כובשת. {player}.',
  playReset: 'הקצב לא יורד. תיקול באמצע, הכדור שוב חופשי והזירה נפתחת.', playRegroup: 'החמישיות מסתדרות מחדש. אין זמן לנשום במשחק של דקה.',
  // delta 99 — the match as a show
  entranceKicker: 'הכניסה לזירה', entranceFive: 'החמישייה שלך', theirEntrance: 'היריבה נכנסת', headToHead: 'ראש בראש',
  kickoffWhistle: 'שריקה', skipMatch: 'דלג לסיום', fullTime: 'שריקה סופית', manOfMatch: 'איש המשחק',
  matchLive: 'בשידור', goalScorer: 'שער', goalAssist: 'בישל: {name}', goalThemLabel: 'ספגנו', goalUsLabel: 'שער!',
  savedLabel: 'הצלה', chanceLabel: 'הזדמנות', missLabel: 'החמיץ', blockLabel: 'חסימה',
} as const

export function t(key: RoyalRumbleMessageKey, vars?: Record<string, string>): string {
  let out: string = COPY[key]
  if (!vars) return out
  for (const [name, value] of Object.entries(vars)) out = out.replaceAll(`{${name}}`, value)
  return out
}

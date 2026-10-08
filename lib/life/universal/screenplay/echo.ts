/**
 * What a night at the ground leaves in the next ordinary day.
 *
 * A historical night (content/night.ts) raises one of three flags when it ends. The first scene
 * of the next ordinary chapter lets whoever it is with say something about it. The lines name no
 * score, no minute, no scorer and no opponent: the archive's night is its own card, and the
 * ordinary day only feels what it left behind.
 */
import type {Callback, Speech} from './types'

export const NIGHT_RESULTS = ['win', 'loss', 'draw'] as const
type R = typeof NIGHT_RESULTS[number]
const L = (who: string, win: [string, string], loss: [string, string], draw: [string, string]): Record<R, Speech> =>
  ({win: [who, ...win], loss: [who, ...loss], draw: [who, ...draw]})

const LINES: Record<string, Record<R, Speech>> = {
  dad: L('dad', ['You are still walking like that night is following you. Good. Let it.', 'אתה עדיין הולך כאילו הלילה ההוא הולך אחריך. טוב. תן לו.'],
    ['You do not have to say anything about the other night. I was there too.', 'אתה לא חייב להגיד כלום על הלילה ההוא. גם אני הייתי שם.'],
    ['Neither one thing nor the other, that night. We know that kind. Sit down.', 'לא זה ולא זה, הלילה ההוא. אנחנו מכירים את הסוג הזה. שב.']),
  mum: L('mum', ['Your father is still telling the neighbours about that night. I stopped pretending to listen.', 'אבא עדיין מספר לשכנים על הלילה ההוא. הפסקתי להעמיד פנים שאני מקשיבה.'],
    ['You came home from that night quiet. I put the soup on and said nothing. Was that right?', 'חזרת מהלילה ההוא שקט. שמתי מרק ולא אמרתי כלום. זה היה נכון?'],
    ['You came home from that night with a face I could not read. Better than a bad one.', 'חזרת מהלילה ההוא עם פנים שלא הצלחתי לקרוא. עדיף על רעות.']),
  friend: L('friend', ['I am still hoarse from that night. Do not make me talk about it. Talk about it.', 'אני עדיין צרוד מהלילה ההוא. אל תגרום לי לדבר עליו. תדבר עליו.'],
    ['I will not mention that night if you do not. Deal?', 'אני לא אזכיר את הלילה ההוא אם אתה לא. סגור?'],
    ['That night, I still cannot decide how I felt. You?', 'הלילה ההוא, אני עדיין לא מצליח להחליט איך הרגשתי. ואתה?']),
  rival: L('rival', ['I heard how that night went for you. I am not going to enjoy it. Much.', 'שמעתי איך הלילה ההוא עבר עליך. אני לא אהנה מזה. הרבה.'],
    ['I heard about your night. Not a word from me. A small one, maybe.', 'שמעתי על הלילה שלך. לא מילה ממני. אולי קטנה.'],
    ['Your night, I heard. I would call that a fair fight.', 'הלילה שלך, שמעתי. הייתי קוראת לזה קרב הוגן.']),
  kiosk: L('kiosk', ['Everyone who came in was talking about that night. Business was good.', 'כל מי שנכנס דיבר על הלילה ההוא. העסק הלך טוב.'],
    ['It has been a quiet spell. Nobody wants to talk about that night. I sold only gum.', 'היה זמן שקט. אף אחד לא רוצה לדבר על הלילה ההוא. מכרתי רק מסטיק.'],
    ['People went back and forth on that night for days. I stopped counting sides.', 'אנשים התווכחו ימים על הלילה ההוא. הפסקתי לספור צדדים.']),
  elder: L('elder', ['I was there too, that night. At my age you take the good ones and put them on a shelf.', 'גם אני הייתי שם, באותו לילה. בגילי לוקחים את הטובים ומניחים על מדף.'],
    ['I have seen a hundred nights like that one. You will see why you came.', 'ראיתי מאה לילות כמו הלילה ההוא. אתה עוד תבין למה באת.'],
    ['A night like that is not for the books. It is for the stairs afterwards.', 'לילה כזה לא נועד לספרים. הוא נועד למדרגות אחר כך.']),
  teacher: L('teacher', ['You seem lighter than you did. I will not ask. I can guess.', 'אתה נראה קל יותר מקודם. אני לא אשאל. אני יכול לנחש.'],
    ['You look as if you still have not slept. Late night, or a late result?', 'אתה נראה כאילו עדיין לא ישנת. לילה מאוחר או תוצאה מאוחרת?'],
    ['Whatever happened that night, you are on time. That is a result of a kind.', 'מה שקרה באותו לילה, הגעת בזמן. זו תוצאה מסוג מסוים.']),
  steward: L('steward', ['I saw you leave that night. Nobody walks like that after a bad one.', 'ראיתי אותך יוצא באותו לילה. אף אחד לא הולך ככה אחרי לילה רע.'],
    ['I saw you leave that night. Slowly. It happens.', 'ראיתי אותך יוצא באותו לילה. לאט. זה קורה.'],
    ['I saw you leave that night. Half smile. I know that one.', 'ראיתי אותך יוצא באותו לילה. חצי חיוך. אני מכיר את זה.']),
  seller: L('seller', ['I sold out of scarves after that night. You started something.', 'אזלו לי הצעיפים אחרי הלילה ההוא. אתה התחלת משהו.'],
    ['After a night like that I sell more scarves, strangely. People need something to hold.', 'אחרי לילה כזה אני מוכר יותר צעיפים, מוזר. אנשים צריכים משהו להחזיק.'],
    ['Nobody wanted a scarf after that night and nobody wanted to say why.', 'אף אחד לא רצה צעיף אחרי הלילה ההוא ואף אחד לא רצה להגיד למה.']),
  boss: L('boss', ['You smiled at the saw after that night. Whatever it was, keep the fingers.', 'חייכת אל המסור אחרי הלילה ההוא. מה שזה לא היה, תשמור על האצבעות.'],
    ['Head down, I see, since that night. Do the work. It helps.', 'ראש למטה, אני רואה, מאז הלילה ההוא. תעשה את העבודה. זה עוזר.'],
    ['Whatever happened that night, work does not care. It is a comfort.', 'מה שקרה באותו לילה, לעבודה לא אכפת. זו נחמה.']),
  mate: L('mate', ['You are humming. Was it that night? Say it was that night.', 'אתה מזמזם. זה מהלילה ההוא? תגיד שזה מהלילה ההוא.'],
    ['Nobody is going to ask about that night. We all know.', 'אף אחד לא ישאל על הלילה ההוא. כולנו יודעים.'],
    ['Nobody quite knows what to say about that night. Tea?', 'אף אחד לא ממש יודע מה להגיד על הלילה ההוא. תה?']),
  driver: L('driver', ['Half of my coach sang all the way back from that night. I kept the radio off.', 'חצי מהאוטובוס שלי שר כל הדרך חזרה מהלילה ההוא. השארתי את הרדיו כבוי.'],
    ['Quiet coach, after that night. I have driven quieter. Not many.', 'אוטובוס שקט אחרי הלילה ההוא. נהגתי בשקטים יותר. לא הרבה.'],
    ['Mixed coach, after that night. Half singing, half sleeping. I envy the second half.', 'אוטובוס מעורב אחרי הלילה ההוא. חצי שרים, חצי ישנים. אני מקנא בחצי השני.']),
  stranger: L('stranger', ['I recognise that walk. You were there, that night.', 'אני מכיר את ההליכה הזאת. היית שם, באותו לילה.'],
    ['You have the look of someone who was there, that night.', 'יש לך מבט של מי שהיה שם באותו לילה.'],
    ['You were there, that night. I can tell. Nobody knows what to call it.', 'היית שם באותו לילה. אני רואה. אף אחד לא יודע איך לקרוא לזה.']),
  child: L('child', ['You went to the ground that night? Were you loud? Tell me you were loud.', 'היית באותו לילה במגרש? צעקת? תגיד שצעקת.'],
    ['You went to the ground that night. Why are you quiet now?', 'היית באותו לילה במגרש. למה אתה שקט עכשיו?'],
    ['You went to the ground that night. Who won? Nobody can say, you told me. Why not?', 'היית באותו לילה במגרש. מי ניצח? אף אחד לא יכול להגיד, אמרת. למה לא?']),
}

/** The echo of a night, in the mouth of whoever the scene is with. Mutually exclusive; empty for a person who has no line. */
export function echoCallbacks(who: string, _he: boolean): Callback[] {
  const set = LINES[who]
  if (!set) return []
  return NIGHT_RESULTS.map(r => ({group: 'echo', when: {is: [`life:night:${r}`, true]}, lines: [set[r]]}))
}

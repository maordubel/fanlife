import type {ChapterScript} from '../types'
import {chapter, o, s, sc, t} from '../write'
import {bond, coins, energy, envelope, flag, heart, is, spend} from '../types'
import type {Effect} from '../../types'

/** F10: the fare he puts aside when he says he is going; the cost on the road is paid out of that envelope, or not at all */
const TRIP_FARE = 4

/**
 * Master screenplay F09–F13 (bible §16, 15.10.2026): the years of choosing your own place, your first journey,
 * the missed ride home, the poster on the wall and the first money that is yours.
 *
 * Authored fiction only. Money is invented coins (coins()), never a real currency or wage.
 * Route contract: these chapters carry the leanings (`life:inclin`) — F11-S3 sets one in EVERY option so it is
 * always set before F15 — and F13-S1 holds the one explicit "what if" small business (`life:route:owner`).
 * An earlier version of the same life may have gone another way; the business option says so in the text.
 */
/**
 * F13's shift is choice → work → pay: the choice is the agreement, the work is a small game played on the bench
 * (sort, fit, carry), and the agreed pay is counted in only after it, once. Nothing is paid for saying yes.
 */
const shift = (id: string, pay: number, tired: number): Effect => ({e: 'play', game: 'count', id: `F13-shift-${id}`, then: [flag('life:master:F13:paid', id), coins(pay), energy(-tired)]})

export const MASTER_YOUTH: ChapterScript[] = [
  // ───────────────────────────────────────────────────────────────────────── F09 · my place
  chapter({
    id: 'F09', age: 16, act: 2, title: t('My Place', 'המקום שלי'),
    intro: t('There is a place where you stand. You are about to find out whose idea it was.', 'יש מקום שבו אתה עומד. עוד רגע תגלה של מי הרעיון.'),
    keep: {id: 'my-place', name: t('Where you stood', 'איפה שעמדת'), note: t('What you wore, and the place it tied you to. An item only if you were given one.', 'מה שלבשת והמקום שקשור אליו. פריט רק אם קיבלת.')},
    scenes: [
      sc({
        id: 'F09-S1', room: 'street', who: 'friend', after: [], spot: 'crates', slot: 'corner', verb: 'talk', cut: true,
        title: t('We saved you a spot', 'שמרנו לך'),
        lines: [
          s(null, '{dadName} has already started walking, the way he has walked this road for years.', '{dadName} כבר התחיל ללכת, כמו שהלך בדרך הזאת שנים.'),
          s('friend', 'We saved you a spot. Over there. Are you coming?', 'שמרנו לך מקום. שם, בצד השני. אתה בא?'),
          s(null, 'One arm points one way. The other arm, further off, points the other.', 'יד אחת מצביעה לכיוון אחד. היד השנייה, רחוקה יותר, מצביעה לכיוון ההפוך.'),
        ],
        callbacks: [
          {group: 'old', when: is('life:master:F01:place', 'kept'), lines: [s(null, 'You still put things back where they lived. Somewhere inside you, that is also a way of standing.', 'אתה עדיין מחזיר דברים למקום שלהם. אי שם בפנים, גם זו דרך לעמוד.')]},
          {group: 'old', when: is('life:master:F02:told', 'feeling'), lines: [s(null, 'You once told {dadName} how it felt to wear the colours. He never forgot that you could say it.', 'פעם סיפרת ל{dadName} איך זה להרגיש לבוש בצבעים. הוא אף פעם לא שכח שאתה יכול להגיד את זה.')]},
        ],
        task: t('Choose which way to go', 'לבחור לאיזה כיוון ללכת'),
        action: [s(null, 'Both of them are waiting for you without saying so. That is how you know it is a real choice.', 'שניהם מחכים לך בלי להגיד. ככה אתה יודע שזו בחירה אמיתית.')],
        options: [
          o('leader', t('Stay with {dadName}', 'להישאר עם {dadName}'), s('dad', 'Same road. Same corner. Do not tell anyone I walk slower than I used to.', 'אותה דרך. אותה פינה. אל תספר לאף אחד שאני הולך לאט יותר מפעם.'),
            [flag('life:master:F09:place', 'leader'), bond('dad', 3), heart(1)]),
          o('friend', t('Go with {friend}', 'ללכת עם {friend}'), s('friend', 'There is a thing we do before we go in. You do not have to do it. Watch first.', 'יש משהו שאנחנו עושים לפני שנכנסים. לא חייבים. תסתכל קודם.'),
            [flag('life:master:F09:place', 'crew'), flag('life:inclin', 'ter'), bond('friend', 3), heart(1)]),
          o('later', t('Offer to meet up later', 'להציע להיפגש אחר כך'), s('friend', 'Later. Fine. Later is a real time, so show up in it.', 'אחר כך. בסדר. אחר כך זה זמן אמיתי, אז תגיע בו.'),
            [flag('life:master:F09:place', 'split'), bond('friend', 1), bond('dad', 1)]),
        ],
      }),
      sc({
        id: 'F09-S2', room: 'terrace', who: 'friend', spot: 'banner', slot: 'left', verb: 'listen', cut: true,
        title: t('It sounds different from here', 'מכאן שומעים אחרת'),
        lines: [
          s(null, 'From where you stand the noise arrives from a different direction, and it is not the one you grew up with.', 'מהמקום שבו אתה עומד הרעש מגיע מכיוון אחר, וזה לא הכיוון שגדלת עליו.'),
          s('friend', 'Someone starts it every time. Nobody knows who. It is just whoever is brave first.', 'מישהו מתחיל את זה בכל פעם. אף אחד לא יודע מי. פשוט מי שאמיץ ראשון.'),
          s(null, 'A short chant begins, a few words, made up by nobody you can name.', 'מתחיל שיר קצר, כמה מילים, שהמציא מישהו שאי אפשר לקרוא לו בשם.'),
        ],
        task: t('Decide what to do with the sound', 'להחליט מה לעשות עם הקול'),
        action: [s(null, 'There is a gap between the first voice and the second. You are standing in it.', 'יש רווח בין הקול הראשון לשני. אתה עומד בתוכו.')],
        game: 'chant',
        options: [
          o('join', t('Join in', 'להצטרף'), s('friend', 'You are a half-beat behind. Everyone is. That is how you know it is working.', 'אתה חצי פעימה מאחור. כולם. ככה מבינים שזה עובד.'),
            [flag('life:master:F09:sound', 'joined'), flag('life:inclin', 'ter'), bond('friend', 2), heart(2)]),
          o('own', t('Start something of your own', 'להתחיל משהו משלך'), s('friend', 'Four words. Short. Some people just looked at you. One person smiled. That is already a lot.', 'ארבע מילים. קצר. כמה אנשים סתם הסתכלו. מישהו אחד חייך. וזה כבר הרבה.'),
            [flag('life:master:F09:sound', 'own'), flag('life:inclin', 'create'), heart(2), energy(-5)]),
          o('listen', t('Just listen', 'רק להקשיב'), s('friend', 'You are the only one who heard the quiet part. Keep that.', 'אתה היחיד ששמע את החלק השקט. תשמור את זה.'),
            [flag('life:master:F09:sound', 'listened'), flag('life:inclin', 'story'), heart(1)]),
        ],
      }),
      sc({
        id: 'F09-S3', room: 'schoolyard', who: 'dad', spot: 'bench', slot: 'bench', verb: 'talk', cut: true,
        title: t('I did not see you', 'לא ראיתי אותך'),
        lines: [
          s(null, 'Afterwards, on the bench, the person you were not standing next to finds you.', 'אחר כך, על הספסל, האדם שלא עמדת לידו מוצא אותך.'),
          s('dad', 'I looked for you. I said to myself: he is somewhere else, that is allowed.', 'חיפשתי אותך. אמרתי לעצמי: הוא במקום אחר, זה מותר.'),
          s(null, 'It is allowed. It still sits between you like a third person.', 'זה מותר. זה עדיין יושב ביניכם כמו אדם שלישי.'),
        ],
        callbacks: [
          {group: 'where', when: is('life:master:F09:place', 'leader'), lines: [s('dad', 'You stayed with me, and I know that was not the easy choice at your age.', 'נשארת איתי, ואני יודע שזו לא הייתה הבחירה הקלה בגילך.')]},
          {group: 'where', when: is('life:master:F09:place', 'crew'), lines: [s(null, 'You smell of other people, of a crowd that was not him. He notices and pretends not to.', 'יש עליך ריח של אחרים, של קהל שהוא לא היה בו. הוא שם לב ומעמיד פנים שלא.')]},
          {group: 'where', when: is('life:master:F09:place', 'split'), lines: [s(null, 'You split the day in two. He got the half that was left.', 'חילקת את היום לשניים. הוא קיבל את החצי שנשאר.')]},
        ],
        task: t('Say something about where you were', 'להגיד משהו על איפה שהיית'),
        action: [s(null, 'The bench is cold. Neither of you suggests standing up.', 'הספסל קר. אף אחד מכם לא מציע לקום.')],
        options: [
          o('why', t('Tell him why you chose', 'לספר למה בחרת'), s('dad', 'That hurt a little. It was also the first time you explained yourself to me like an adult. Both are true.', 'זה כאב קצת. וזו גם הייתה הפעם הראשונה שהסברת לי את עצמך כמו מבוגר. שני הדברים נכונים.'),
            [flag('life:master:F09:after', 'told'), bond('dad', 2), heart(1)]),
          o('another', t('Suggest another evening together', 'להציע ערב אחר ביחד'), s('dad', 'A promise. I will hold you to it. Not out of anger, out of wanting it.', 'הבטחה. אחזיק אותך בה. לא מכעס, מרצון.'),
            [flag('life:master:F09:after', 'promised'), flag('life:master:F09:owed', 'evening'), bond('dad', 3)]),
          o('not-today', t('Not solve everything today', 'לא לסדר הכול היום'), s('dad', 'All right. The tension stays. It can wait for us, it has done that before.', 'בסדר. המתח נשאר. הוא יכול לחכות לנו, הוא כבר עשה את זה.'),
            [flag('life:master:F09:after', 'open')]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F10 · nobody who knows the way
  chapter({
    id: 'F10', age: 18, act: 2, title: t('Nobody Who Knows the Way', 'בלי מי שיודע את הדרך'),
    intro: t('The first journey is always smaller than the one you imagined, and louder.', 'הנסיעה הראשונה תמיד קטנה יותר ממה שדמיינת, וקולנית יותר.'),
    keep: {id: 'first-journey', name: t('What you brought back', 'מה שהבאת חזרה'), note: t('A ticket, a receipt, something small from the road. Nothing from a town you never reached.', 'כרטיס, קבלה, משהו קטן מהדרך. שום דבר מעיר שלא הגעת אליה.')},
    scenes: [
      sc({
        id: 'F10-S1', room: 'bus-station', who: 'friend', after: [], spot: 'board', slot: 'friend', verb: 'talk',
        title: t('There is one seat', 'יש מקום אחד'),
        lines: [
          s('friend', 'I found a way to get there. There is one seat left, and I told you first.', 'מצאתי דרך להגיע. נשאר מקום אחד, ואמרתי לך ראשון.'),
          s(null, 'Someone else has been standing near the board for a while, pretending to read it. They want to come too.', 'מישהו אחר עומד ליד הלוח כבר זמן, ומעמיד פנים שהוא קורא. גם הוא רוצה לבוא.'),
        ],
        callbacks: [
          {group: 'prom', when: is('life:master:F09:after', 'promised'), lines: [s(null, 'You promised someone an evening not long ago. This one is a different promise, and now you have two.', 'הבטחת למישהו ערב לא מזמן. זו הבטחה אחרת, ועכשיו יש לך שתיים.')]},
          {group: 'prom', when: is('life:master:F09:place', 'crew'), lines: [s(null, 'The people you stood with are not the people in this queue. The queue is its own thing.', 'האנשים שעמדת איתם הם לא האנשים בתור הזה. התור הוא דבר בפני עצמו.')]},
        ],
        task: t('Decide who gets the seat', 'להחליט מי מקבל את המקום'),
        action: [s(null, 'A bus pulls out behind you. It is not yours, and still you feel it leave.', 'אוטובוס יוצא מאחוריך. הוא לא שלך, ובכל זאת אתה מרגיש אותו עוזב.')],
        options: [
          o('keep', t('Keep the seat for the friend you promised', 'לשמור את המקום לחבר שהבטחת לו'), s('friend', 'You told me first and you kept it for me. Someone else is still standing there. I know.', 'אמרת לי ראשון ושמרת לי. מישהו אחר עדיין עומד שם. אני יודע.'),
            [flag('life:master:F10:seat', 'kept'), flag('life:inclin', 'comm'), bond('friend', 3), envelope('trip', TRIP_FARE)]),
          o('add', t('Ask to bring the new person too', 'לבקש לצרף גם את האדם החדש'), s('friend', 'We can try. It depends on who agrees, and it is not magic. Go ask the driver.', 'אפשר לנסות. זה תלוי במי שמסכים, וזה לא קסם. לך תשאל את הנהג.'),
            [flag('life:master:F10:seat', 'added'), flag('life:inclin', 'way'), bond('friend', 1), bond('driver', 2), envelope('trip', TRIP_FARE)]),
          o('stay', t('Stay and build an evening at home', 'להישאר ולבנות ערב במקום'), s('friend', 'You really want to do the local thing. Good. Someone has to tell me how it went.', 'אתה באמת רוצה לעשות את הדבר המקומי. טוב. מישהו צריך לספר לי איך היה.'),
            [flag('life:master:F10:seat', 'stayed'), flag('life:inclin', 'comm'), heart(1)]),
        ],
      }),
      sc({
        id: 'F10-S2', room: 'bus-stop', who: 'friend', spot: 'sign', slot: 'wait', verb: 'talk',
        title: t('The stop', 'העצירה'),
        lines: [
          s(null, 'Something small and expensive appears on the road: a delay, a fee, a change of plan you saw coming only as a rumour.', 'משהו קטן ויקר צץ בדרך: עיכוב, תשלום, שינוי תוכנית שראית רק כשמועה.'),
          s('friend', 'You said you brought it.', 'אמרת שהבאת.'),
          s(null, 'He is not angry. That is somehow worse.', 'הוא לא כועס. וזה איכשהו גרוע יותר.'),
        ],
        callbacks: [
          {group: 'src', when: is('life:master:F03:source', 'work'), lines: [s(null, 'You know how coins arrive. You know how they leave. It does not help as much as it should.', 'אתה יודע איך מטבעות מגיעים. אתה יודע איך הם עוזבים. זה לא עוזר כמו שהיה אמור.')]},
          {group: 'src', when: is('life:master:F03:source', 'kept'), lines: [s(null, 'You are someone who sets money aside. For once, it was set aside for the right thing.', 'אתה מי ששומר כסף בצד. הפעם הוא נשמר לדבר הנכון.')]},
        ],
        task: t('Deal with the cost', 'להתמודד עם העלות'),
        action: [s(null, 'The sign says nothing useful. Signs usually do not, at moments like this.', 'השלט לא אומר שום דבר שימושי. שלטים בדרך כלל לא, ברגעים כאלה.')],
        options: [
          o('pay', t('Pay from what is free', 'לשלם ממה שפנוי'), s('friend', 'Out of the envelope you put aside for this. Then it will not be in your hand later. I know. I did not say it was free.', 'מהמעטפה ששמת בצד בשביל זה. אז זה לא יהיה לך ביד אחר כך. אני יודע. לא אמרתי שזה בחינם.'),
            [flag('life:master:F10:cost', 'paid'), spend('trip', TRIP_FARE), bond('friend', 2)], {when: {saved: ['trip', TRIP_FARE]}}),
          o('loan', t('Ask for a clear loan', 'לבקש הלוואה ברורה'), s('friend', 'Three coins, from me, back before the next time. Say it out loud so we both remember.', 'שלושה מטבעות, ממני, בחזרה לפני הפעם הבאה. תגיד בקול כדי שנזכור שנינו.'),
            [flag('life:master:F10:cost', 'loan'), flag('life:master:F10:lender', 'friend'), flag('life:master:F10:owed', 3), coins(3), envelope('trip', -TRIP_FARE), bond('friend', 1)]),
          o('change', t('Change the way before you promise more', 'לשנות את הדרך לפני שמבטיחים עוד'), s('friend', 'You will be late. Or you will come later and from further away. It still counts. Mostly.', 'תאחר. או שתגיע מאוחר יותר ומרחוק יותר. זה עדיין נחשב. בעיקר.'),
            [flag('life:master:F10:cost', 'changed'), envelope('trip', -TRIP_FARE), energy(5)]),
        ],
      }),
      sc({
        id: 'F10-S3', room: 'street', who: 'seller', spot: 'window', slot: 'customer', verb: 'buy', cut: true,
        title: t('What you bring back', 'מה מביאים חזרה'),
        lines: [
          s(null, 'You are back, and either a little money is left or a little is owed. This is not the shopping scene of the old days.', 'אתה חוזר, ונשאר קצת כסף או נשאר קצת חוב. זו לא סצנת הקניות של פעם.'),
          s('seller', 'Look around. Something from this trip, or something from just before it. Or nothing.', 'תסתכל. משהו מהנסיעה הזאת, או משהו מקצת לפניה. או כלום.'),
        ],
        callbacks: [
          {group: 'debt', when: is('life:master:F10:cost', 'loan'), lines: [s(null, 'A small sum is on your mind, and it is not yours.', 'סכום קטן בראש שלך, והוא לא שלך.')]},
          {group: 'debt', when: is('life:master:F10:cost', 'paid'), lines: [s(null, 'Your hands are lighter than when you left, and that is a plain fact.', 'הידיים שלך קלות יותר מכשיצאת, וזו עובדה פשוטה.')]},
        ],
        task: t('Decide what comes back with you', 'להחליט מה חוזר איתך'),
        action: [s(null, 'It is not a big thing to carry. The not-big things are the ones that stay.', 'זה לא דבר גדול לשאת. הדברים שאינם גדולים הם אלה שנשארים.')],
        options: [
          o('buy', t('Buy something from the road, if there is one', 'לקנות משהו מהדרך אם יש'), s('seller', 'Programme, scarf, a pin. Its story starts with this trip. Nothing older, nothing borrowed.', 'תוכנייה, צעיף, סיכה. הסיפור שלו מתחיל בנסיעה הזאת. שום דבר ישן, שום דבר מושאל.'),
            [flag('life:master:F10:back', 'item'), flag('life:master:F10:item', 'road'), coins(-2), heart(1)], {when: {min: ['coins', 2]}}),
          o('return', t('Give back part of the favour', 'להחזיר חלק מהטובה'), s('seller', 'Only if there is something to give, and only if they take it. Some people will not.', 'רק אם יש מה לתת, ורק אם הם לוקחים. יש אנשים שלא.'),
            [flag('life:master:F10:back', 'returned'), coins(-2), bond('friend', 3)], {when: {min: ['coins', 2]}}),
          o('story', t('Bring a story instead of an object', 'להביא סיפור במקום חפץ'), s('seller', 'It does not need buying and it does not get lost on the way home. It gets better, usually.', 'לא צריך לקנות אותו והוא לא הולך לאיבוד בדרך הביתה. הוא משתפר, בדרך כלל.'),
            [flag('life:master:F10:back', 'story'), flag('life:inclin', 'story'), heart(2)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F11 · the last one has already left
  chapter({
    id: 'F11', age: 19, act: 2, title: t('The Last One Has Already Gone', 'האחרון כבר יצא'),
    intro: t('Nothing terrible happens. That is the part you will tell for years.', 'שום דבר נורא לא קורה. זה החלק שתספר במשך שנים.'),
    keep: {id: 'late-ride', name: t('The night you were late', 'הלילה שאיחרת'), note: t('A note or a receipt, only if that road made one. The favour itself can be the memory.', 'פתק או קבלה, רק אם הדרך הזאת יצרה. הטובה עצמה יכולה להיות הזיכרון.')},
    scenes: [
      sc({
        id: 'F11-S1', room: 'bus-stop', who: 'friend', after: [], spot: 'sign', slot: 'bench', verb: 'sit', cut: true,
        title: t('The bench', 'הספסל'),
        lines: [
          s(null, 'The stop is empty in the way only places that were busy a minute ago can be.', 'התחנה ריקה כמו שרק מקומות שהיו עמוסים לפני דקה יכולים להיות.'),
          s('friend', 'We should have left earlier. I said so. Out loud. Somewhere.', 'היינו צריכים ללכת קודם. אמרתי. בקול. איפשהו.'),
        ],
        callbacks: [
          {group: 'who', when: is('life:master:F10:seat', 'added'), lines: [s(null, 'The person you brought is still with you, which makes it less of a lonely bench and more of a crowded one.', 'האדם שהבאת עדיין איתך, וזה הופך את הספסל לפחות בודד ולקצת יותר צפוף.')]},
          {group: 'who', when: is('life:master:F10:cost', 'loan'), lines: [s(null, 'You already owe him something. A late ride will not be his to carry too.', 'אתה כבר חייב לו משהו. נסיעה מאוחרת לא תהיה גם על הכתפיים שלו.')]},
        ],
        task: t('Decide how to get home', 'להחליט איך חוזרים הביתה'),
        action: [s(null, 'You run a finger down the timetable twice, counting what still leaves tonight. A light turns on somewhere above you, and goes off again. It is not about you.', 'אתה מעביר אצבע על לוח הזמנים פעמיים, סופר מה עוד יוצא הלילה. אור נדלק איפשהו מעליך, ונכבה שוב. זה לא עליך.')],
        game: 'count',
        options: [
          o('call', t('Call someone you know who is awake', 'להתקשר למישהו מוכר שער'), s('friend', 'Who? Think about whose number you actually know by heart. That is the answer, usually.', 'מי? תחשוב על מי את המספר שלו אתה באמת יודע בעל פה. זו בדרך כלל התשובה.'),
            [flag('life:master:F11:way', 'call'), bond('dad', 2)]),
          o('pay', t('Look for another way, with what is free', 'לחפש דרך אחרת בכסף פנוי'), s('friend', 'It will cost. And it will not arrive on time. Both, probably.', 'זה יעלה. וזה לא יגיע בזמן. כנראה שניהם.'),
            [flag('life:master:F11:way', 'paid'), flag('life:inclin', 'way'), coins(-3)], {when: {min: ['coins', 3]}}),
          o('wait', t('Stay together until it is safe', 'להישאר ביחד עד שיהיה בטוח'), s('friend', 'Then we wait. It is not a failure. It is a long evening with a friend. Do not say it like that.', 'אז מחכים. זו לא כישלון. זה ערב ארוך עם חבר. אל תגיד את זה ככה.'),
            [flag('life:master:F11:way', 'waited'), bond('friend', 3), energy(-8)]),
        ],
      }),
      sc({
        id: 'F11-S2', room: 'bus-stop', who: 'dad', spot: 'sign', slot: 'stranger', verb: 'talk',
        title: t('Who picks up', 'מי עונה'),
        lines: [
          s(null, 'It rings. And rings. Then, someone is there.', 'זה מצלצל. ושוב. ואז, מישהו שם.'),
          s('dad', 'It is late. Tell me where you are, and I will see what I can do. I am not promising.', 'מאוחר. תגיד לי איפה אתה, ואראה מה אפשר לעשות. אני לא מבטיח.'),
        ],
        presence: {any: [is('life:master:F11:way', 'call'), is('life:master:F11:way', 'paid')]},
        solo: [s(null, 'Nobody picks up, and there is nobody to ask. The night does what it does with an empty stop and a bench.', 'אף אחד לא עונה ואין את מי לשאול. הלילה עושה את מה שהוא עושה עם תחנה ריקה וספסל.')],
        callbacks: [{when: is('life:master:F09:after', 'promised'), lines: [s('dad', 'You owe me an evening. I am not collecting. I am only saying that I know.', 'אתה חייב לי ערב. אני לא גובה. רק אומר שאני יודע.')]}],
        task: t('Accept, ask, or refuse', 'לקבל, לבקש או לסרב'),
        action: [s(null, 'The voice at the other end has the particular patience of someone who was asleep.', 'לקול בצד השני יש הסבלנות המיוחדת של מי שישן.')],
        options: [
          o('take', t('Accept the help', 'לקבל את העזרה'), s('dad', 'Good. Ten minutes. You owe me a conversation, not a debt. I am not that kind of man.', 'טוב. עשר דקות. אתה חייב לי שיחה, לא חוב. אני לא איש כזה.'),
            [flag('life:master:F11:help', 'taken'), flag('life:master:F11:owed', 'talk'), bond('dad', 3)]),
          o('both', t('Ask them to take your friend too', 'לבקש לקחת גם את החבר'), s('dad', 'Two of you. In the back. And you tell the friend I drive like a normal person.', 'שניכם. מאחור. ותגיד לחבר שאני נוהג כמו בן אדם.'),
            [flag('life:master:F11:help', 'both'), bond('dad', 2), bond('friend', 3)]),
          o('refuse', t('Refuse and stay', 'לסרב ולהישאר'), s('dad', 'You are sure. Then I am sure too. Text me when it is done, even if it is dull.', 'אתה בטוח. אז גם אני בטוח. תשלח לי כשזה נגמר, גם אם זה משעמם.'),
            [flag('life:master:F11:help', 'refused'), heart(2), energy(-5)]),
        ],
      }),
      sc({
        id: 'F11-S3', room: 'kitchen', who: 'mum', spot: 'table', slot: 'table', verb: 'talk', cut: true,
        title: t('The door in the morning', 'הדלת בבוקר'),
        lines: [
          s(null, 'The kitchen smells of coffee and not asking.', 'במטבח ריח של קפה ושל לא לשאול.'),
          s('mum', 'There was a light on late. I did not look. I just know when a house is one person short.', 'היה אור דלוק מאוחר. לא הסתכלתי. פשוט אני יודעת מתי בבית חסר אחד.'),
        ],
        callbacks: [
          {group: 'night', when: is('life:master:F11:way', 'waited'), lines: [s(null, 'You come in grey from the night, with a story that is mostly about sitting.', 'אתה נכנס אפור מהלילה, עם סיפור שרובו ישיבה.')]},
          {group: 'night', when: is('life:master:F11:help', 'taken'), lines: [s(null, 'Someone drove you home. Someone else heard about it already.', 'מישהו הסיע אותך הביתה. מישהו אחר כבר שמע על זה.')]},
        ],
        task: t('Say what happened, in your way', 'לספר מה קרה, בדרך שלך'),
        action: [s(null, 'The cup is warm. You are mostly telling it to the cup.', 'הכוס חמה. את רוב הסיפור אתה מספר לכוס.')],
        options: [
          o('full', t('Tell the whole version', 'לספר את הגרסה המלאה'), s('mum', 'All of it. Good. Next time, I want the part where you were frightened, too.', 'הכול. טוב. בפעם הבאה אני רוצה גם את החלק שבו פחדת.'),
            [flag('life:master:F11:morning', 'full'), flag('life:inclin', 'story'), bond('mum', 3)]),
          o('funny', t('Turn it into a funny story', 'להפוך את זה לסיפור מצחיק'), s('mum', 'The bus left with your dignity on it. I like it. The debt does not go away because it is funny.', 'האוטובוס יצא עם הכבוד שלך עליו. אני אוהבת. החוב לא נעלם בגלל שזה מצחיק.'),
            [flag('life:master:F11:morning', 'funny'), flag('life:inclin', 'create'), bond('mum', 2), heart(1)]),
          o('sleep', t('Go to sleep and talk later', 'ללכת לישון ולדבר אחר כך'), s('mum', 'Later. I will keep the coffee warm. No, I will not. But I will think about it.', 'אחר כך. אשמור את הקפה חם. לא, לא אשמור. אבל אחשוב על זה.'),
            [flag('life:master:F11:morning', 'later'), flag('life:inclin', 'comm'), energy(8)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F12 · the face on the wall
  chapter({
    id: 'F12', age: 20, act: 2, title: t('The Face on the Wall', 'הפרצוף על הקיר'),
    intro: t('You grew up with him on the wall. Then one day it was just a picture.', 'גדלת איתו על הקיר. ואז יום אחד זו הייתה סתם תמונה.'),
    keep: {id: 'wall-face', name: t('What was on the wall', 'מה שהיה על הקיר'), note: t('A poster, a sticker or a photo that exists, or a thing you love. The place may stay empty.', 'פוסטר, מדבקה או צילום שקיימים, או משהו שאתה אוהב. המקום יכול להישאר ריק.')},
    scenes: [
      sc({
        id: 'F12-S1', room: 'bedroom', who: 'friend', after: [], spot: 'flag', slot: 'byDoor', verb: 'look',
        title: t('Everyone knows more than you', 'כולם יודעים יותר ממך'),
        lines: [
          s(null, 'The poster has been on the wall since before you chose the wall.', 'הפוסטר היה על הקיר עוד לפני שבחרת את הקיר.'),
          s('friend', 'Come on. It is time. Take it down. You know it is time.', 'נו. הגיע הזמן. תוריד. אתה יודע שהגיע הזמן.'),
          s(null, 'It is not clear whether the argument is about the poster or about getting older.', 'לא ברור אם הוויכוח הוא על הפוסטר או על להתבגר.'),
        ],
        callbacks: [
          {group: 'drawn', when: is('life:master:F01:place', 'drawn'), lines: [s(null, 'On the desk lies the drawing you made as a child, of a thing you can no longer name.', 'על השולחן מונח הציור שציירת כילד, של דבר שאתה כבר לא יכול לקרוא לו בשם.')]},
          {group: 'drawn', when: is('life:master:F03:route', 'heirloom'), lines: [s(null, 'Half the things you own came from someone else. The poster is one of them, and you know it.', 'חצי מהדברים שלך הגיעו ממישהו אחר. הפוסטר הוא אחד מהם, ואתה יודע.')]},
        ],
        task: t('Decide what to say about the poster', 'להחליט מה להגיד על הפוסטר'),
        action: [s(null, 'Four pins. One of them is loose, which is the kind of detail that decides things.', 'ארבע נעצים. אחד מהם רופף, ופרט כזה הוא מה שמכריע.')],
        options: [
          o('defend', t('Defend it', 'להגן עליו'), s('friend', 'You are arguing like you have never argued with anyone but me. Fine. I can take it.', 'אתה מתווכח כאילו אף פעם לא התווכחת עם אף אחד חוץ ממני. בסדר. אני יכול לסבול.'),
            [flag('life:master:F12:stand', 'defended'), flag('life:inclin', 'ter'), bond('friend', 1), heart(2)]),
          o('understand', t('Ask what actually changed', 'לשאול מה באמת השתנה'), s('friend', 'Fine. I will tell you what I know, and what I only think. They are different lists.', 'בסדר. אספר מה אני יודע, ומה אני רק חושב. אלה שתי רשימות שונות.'),
            [flag('life:master:F12:stand', 'asked'), flag('life:inclin', 'story'), bond('friend', 2)]),
          o('quiet', t('Stay out of the argument', 'לא להשתתף בוויכוח'), s('friend', 'You are not saying anything. I cannot tell if that is peace or a very polite no.', 'אתה לא אומר כלום. אני לא יכול לדעת אם זה שלום או לא מנומס מאוד.'),
            [flag('life:master:F12:stand', 'silent'), heart(1)]),
        ],
      }),
      sc({
        id: 'F12-S2', room: 'bedroom', who: 'dad', spot: 'wardrobe', slot: 'rug', verb: 'look',
        title: t('At home', 'בבית'),
        lines: [
          s(null, 'When nobody is looking the poster does what posters do: watches.', 'כשאף אחד לא מסתכל הפוסטר עושה מה שפוסטרים עושים: מסתכל.'),
          s('dad', 'Can you give me a hand with something? Just ordinary. The shelf in the hall.', 'תוכל לעזור לי במשהו? סתם. המדף במסדרון.'),
          s(null, 'He does not know what has been going on. He only knows you are carrying something.', 'הוא לא יודע מה עבר עליך. הוא רק יודע שאתה סוחב משהו.'),
        ],
        callbacks: [{when: is('life:master:F12:stand', 'defended'), lines: [s('dad', 'You are standing in front of that poster like a person guarding a door.', 'אתה עומד מול הפוסטר הזה כמו מי ששומר על דלת.')]}],
        task: t('Decide what happens to it', 'להחליט מה יהיה איתו'),
        action: [s(null, 'The wall has a pale rectangle where it has hung. You work the pins out one at a time, the loose one last, and hold the corners so the paper does not tear.', 'על הקיר יש מלבן חיוור איפה שהוא תלוי. אתה מוציא את הנעצים אחד אחד, את הרופף אחרון, ומחזיק את הפינות כדי שהנייר לא ייקרע.')],
        game: 'carry',
        options: [
          o('leave', t('Leave it where it is', 'להשאיר במקום'), s('dad', 'Leave it. It is not done being yours.', 'תשאיר. זה עוד לא גמר להיות שלך.'),
            [flag('life:master:F12:item', 'wall'), bond('dad', 2)]),
          o('fold', t('Fold it and put it in the box', 'לקפל ולשמור בקופסה'), s('dad', 'The box, not the bin. Good. Things last longer in a box than in a mood.', 'הקופסה, לא הפח. טוב. דברים מחזיקים יותר בקופסה מאשר במצב רוח.'),
            [flag('life:master:F12:item', 'box'), heart(1)]),
          o('give', t('Take it down and give it away, openly', 'להוריד ולמסור, בגלוי'), s('dad', 'You said it out loud. That is rarer than the poster.', 'אמרת את זה בקול. זה נדיר יותר מהפוסטר.'),
            [flag('life:master:F12:item', 'given'), flag('life:inclin', 'comm'), bond('dad', 1), heart(-1)]),
        ],
      }),
      sc({
        id: 'F12-S3', room: 'schoolyard', who: 'friend', spot: 'wall', slot: 'friend', verb: 'talk', cut: true,
        title: t('What you tell your friend', 'מה אומרים לחבר'),
        lines: [
          s('friend', 'So? Did you take it down?', 'נו? הורדת?'),
          s(null, 'The question is more careful than it sounds.', 'השאלה זהירה יותר ממה שהיא נשמעת.'),
        ],
        callbacks: [
          {group: 'item', when: is('life:master:F12:item', 'wall'), lines: [s(null, 'The poster is still on the wall at home. The question is about that.', 'הפוסטר עדיין על הקיר בבית. השאלה היא על זה.')]},
          {group: 'item', when: is('life:master:F12:item', 'box'), lines: [s(null, 'In a box, folded, in a room that looks the same as before. That is the whole answer.', 'בקופסה, מקופל, בחדר שנראה בדיוק כמו קודם. זו התשובה כולה.')]},
          {group: 'item', when: is('life:master:F12:item', 'given'), lines: [s(null, 'It is no longer in your hands. You can say that, and it is entirely true.', 'זה כבר לא בידיים שלך. אפשר להגיד את זה, וזה נכון לחלוטין.')]},
        ],
        task: t('Answer the question', 'לענות על השאלה'),
        action: [s(null, 'A ball rolls by. Neither of you goes after it.', 'כדור מתגלגל לידכם. אף אחד מכם לא רודף אחריו.')],
        options: [
          o('tell', t('Tell him what you did', 'לספר לו מה עשית'), s('friend', 'Okay. I will not say I told you so. I will think it very loudly.', 'בסדר. לא אגיד שאמרתי. אחשוב את זה חזק מאוד.'),
            [flag('life:master:F12:said', 'told'), bond('friend', 2)]),
          o('show', t('Show him the thing, if you still have it', 'להראות לו את הפריט אם עוד יש לך'), s('friend', 'You brought it. You really brought it. I do not know what to do with my hands.', 'הבאת אותו. באמת הבאת. אני לא יודע מה לעשות עם הידיים.'),
            [flag('life:master:F12:said', 'shown'), bond('friend', 3)]),
          o('mine', t('Say it stays yours', 'להגיד שזה נשאר שלך'), s('friend', 'All right. That is a boundary and I will treat it like one. I do not measure loyalty by that.', 'בסדר. זה גבול ואתייחס אליו ככה. אני לא מודד נאמנות לפי זה.'),
            [flag('life:master:F12:said', 'kept'), heart(2)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F13 · the first money that is yours
  chapter({
    id: 'F13', age: 21, act: 2, title: t('The First Money That Is Yours', 'הכסף הראשון שהוא שלך'),
    intro: t('Coins, here, are an invented thing. What they buy is not.', 'מטבעות, כאן, הם דבר מומצא. מה שהם קונים לא.'),
    keep: {id: 'first-earnings', name: t('What the coins turned into', 'במה המטבעות הפכו'), note: t('The thing you bought, a receipt, or what is left saved. Never the same coin twice.', 'מה שקנית, קבלה, או מה שנשאר בחיסכון. אף פעם לא אותו מטבע פעמיים.')},
    scenes: [
      sc({
        id: 'F13-S1', room: 'workshop', who: 'boss', after: [], spot: 'tools', slot: 'boss', verb: 'talk', cut: true,
        title: t('The hour that was left', 'השעה שנשארה'),
        lines: [
          s('boss', 'I have a shift. Four hours, start to finish. It is not a mystery, it is a broom and a ladder.', 'יש לי משמרת. ארבע שעות, מההתחלה עד הסוף. זה לא תעלומה, זה מטאטא וסולם.'),
          s(null, 'Your friend already asked if you are coming out tonight. And a shirt in a window, not far away, has been looking at you.', 'החבר שלך כבר שאל אם אתה בא הערב. וחולצה בחלון, לא רחוק, מסתכלת עליך.'),
          s(null, 'The shift ends at nine. The evening starts at eight. On the calendar by the door the two overlap by one hour, in two different handwritings.', 'המשמרת נגמרת בתשע. הערב מתחיל בשמונה. בלוח שליד הדלת שניהם חופפים בשעה אחת, בשני כתבי יד שונים.'),
        ],
        callbacks: [
          {group: 'before', when: is('life:master:F03:source', 'work'), lines: [s(null, 'You have done this before, a small job with a clear start. It is the same muscle.', 'עשית את זה כבר, עבודה קטנה עם התחלה ברורה. זו אותה שריר.')]},
          {group: 'before', when: is('life:master:F10:cost', 'loan'), lines: [s(null, 'There is a small sum you promised back. A shift is the plain way to do that.', 'יש סכום קטן שהבטחת להחזיר. משמרת היא הדרך הפשוטה לעשות את זה.')]},
        ],
        task: t('Answer the boss', 'לענות לבוס'),
        action: [s(null, 'The workshop smells of dust and paint. The radio is on, low, and nobody turns it off.', 'בסדנה ריח של אבק וצבע. הרדיו דלוק, חלש, ואף אחד לא מכבה.')],
        options: [
          o('full', t('Take the whole shift, and be late tonight', 'לקחת את המשמרת המלאה, ולאחר הערב'), [s('boss', 'Four hours. Do not be late. I mean it kindly. Someone will be here, you will meet them.', 'ארבע שעות. אל תאחר. אני אומר את זה בטוב. יהיה כאן מישהו, תכיר אותו.'), s('boss', 'Screws into the tins by size, the frame fitted, the frame at the door. I look at the frame, not the clock. Then five.', 'ברגים לפחיות לפי גודל, המסגרת מורכבת, המסגרת ליד הדלת. אני מסתכל על המסגרת, לא על השעון. ואז חמש.')],
            [flag('life:master:F13:shift', 'full'), bond('mate', 2), shift('full', 5, 10)]),
          o('swap', t('Ask {mate} to take your last hour, and leave at eight', 'לבקש מ{mate} לקחת את השעה האחרונה שלך, ולצאת בשמונה'), [s('mate', 'Your last hour for my Saturday morning. Deal. Write it on the calendar so neither of us gets clever later.', 'השעה האחרונה שלך תמורת שבת בבוקר שלי. סגור. תכתוב בלוח כדי שאף אחד מאיתנו לא יתחכם אחר כך.'), s('boss', 'Three hours of work, three coins, after the bench is clear. Not a coin for the hour you traded.', 'שלוש שעות עבודה, שלושה מטבעות, אחרי שהספסל נקי. לא מטבע על השעה שהחלפת.')],
            [flag('life:master:F13:shift', 'short'), bond('mate', 1), shift('short', 3, 7)]),
          o('refuse', t('Refuse this time, and think about a small thing of your own (what if)', 'לסרב הפעם, ולחשוב על משהו קטן משלך (מה אם)'), s('boss', 'Fine, no hard feelings. A small thing of your own would be yours alone. If it had been different, who knows. Today it is a daydream, and I will not call it history.', 'בסדר, בלי טינה. משהו קטן משלך היה רק שלך. אם הדברים היו אחרת, מי יודע. היום זו חלימה, ואני לא אקרא לזה היסטוריה.'),
            [flag('life:master:F13:shift', 'no'), flag('life:route:owner', true), flag('life:master:F13:business', 'whatif'), heart(2)]),
        ],
      }),
      sc({
        id: 'F13-S2', room: 'workshop', who: 'mate', spot: 'ladder', slot: 'mate', verb: 'talk',
        title: t('Somebody has to leave', 'מישהו צריך לצאת'),
        lines: [
          s(null, 'It is late in the shift. {mate} wipes their hands and looks at the clock, then at you.', 'סוף המשמרת. {mate} מנגב ידיים ומסתכל בשעון, ואז עליך.'),
          s('mate', 'Could you cover me for a bit? I need to go. I will make it up. I always do.', 'תוכל לכסות אותי קצת? אני חייב ללכת. אפצה. תמיד מפצה.'),
        ],
        presence: {any: [is('life:master:F13:shift', 'full'), is('life:master:F13:shift', 'short')]},
        callbacks: [
          {group: 'deal', when: is('life:master:F13:paid', 'full'), lines: [s(null, 'Five coins in your pocket and four hours in your arms. The light outside has changed twice.', 'חמישה מטבעות בכיס וארבע שעות בידיים. האור בחוץ התחלף פעמיים.'), s('friend', 'A message: You missed the start. You said you would, and you did, so I am not even angry. Mostly.', 'הודעה: פספסת את ההתחלה. אמרת שתפספס, ופספסת, אז אני אפילו לא כועס. בעיקר.'), s(null, 'At home a plate will be left covered on the counter, because you had said nine.', 'בבית תחכה צלחת מכוסה על השיש, כי אמרת תשע.')]},
          {group: 'deal', when: is('life:master:F13:paid', 'short'), lines: [s('mate', 'Seven fifty. On the calendar it says Saturday is mine. I checked twice, I trust nobody.', 'שבע וחמישים. בלוח כתוב ששבת שלי. בדקתי פעמיים, אני לא סומך על אף אחד.'), s('friend', 'A message: Eight, you said. {mate} took your hour? Then you owe a Saturday, and I am coming to watch you pay it.', 'הודעה: שמונה, אמרת. {mate} לקח לך את השעה? אז אתה חייב שבת, ואני בא לראות אותך משלם.'), s(null, 'At home you eat first, on time. On the calendar by the door: one hour crossed out, one Saturday written in.', 'בבית אתה אוכל קודם, בזמן. בלוח שליד הדלת: שעה אחת מחוקה, שבת אחת כתובה.')]},
        ],
        solo: [
          s('friend', 'You did not work. I need to ask for something else: can the evening change? A bit. Not a lot.', 'לא עבדת. אני צריך לבקש משהו אחר: אפשר לשנות קצת את הערב? לא הרבה.'),
        ],
        task: t('Answer the request', 'לענות לבקשה'),
        action: [s(null, 'The ladder leans on the wall like it is also thinking about it.', 'הסולם נשען על הקיר כאילו גם הוא שוקל.')],
        options: [
          o('help', t('Help, within the time you agreed', 'לעזור, בתוך הזמן שסיכמת'), s('mate', 'You are a good one. I will remember this. Not in a threatening way.', 'אתה אחד טוב. אזכור את זה. לא בצורה מאיימת.'),
            [flag('life:master:F13:favour', 'helped'), bond('mate', 3), bond('friend', 1)],
            {soloReply: [s('friend', 'Thanks. We will make a plan that works. I am not going to remember this in a threatening way either.', 'תודה. נעשה תוכנית שעובדת. גם אני לא אזכור את זה בצורה מאיימת.')]}),
          o('limit', t('Stay only until the limit you set', 'להישאר רק עד הגבול שקבעת'), s('mate', 'Okay. There is someone after you who has to carry on. I will tell them.', 'בסדר. יש מישהו אחריך שצריך להמשיך. אספר לו.'),
            [flag('life:master:F13:favour', 'limit'), flag('life:inclin', 'comm'), bond('mate', 1)],
            {soloReply: [s('friend', 'All right. Not the whole evening, then. Someone has to cover the rest, and I will.', 'בסדר. לא כל הערב, אז. מישהו צריך לכסות את השאר, ואני אעשה את זה.')]}),
          o('no', t('Say no and go on', 'להגיד לא ולהמשיך'), s('mate', 'Fair. I will find someone. There is no bonus for being nice, and no penalty for being busy.', 'הוגן. אמצא מישהו. אין בונוס על להיות נחמד, ואין עונש על להיות עסוק.'),
            [flag('life:master:F13:favour', 'no'), heart(1)],
            {soloReply: [s('friend', 'No is a whole answer. Let us keep the plan as it was and not make it a thing.', 'לא זו תשובה שלמה. בוא נשאיר את התוכנית כמו שהייתה ולא נעשה מזה עניין.')]}),
        ],
      }),
      sc({
        id: 'F13-S3', room: 'kitchen', who: 'friend', spot: 'drawer', slot: 'counter', verb: 'use',
        title: t('What it gets spent on', 'על מה מוציאים'),
        lines: [
          s(null, 'You lay out the coins on the table, or you do not have any to lay out. Either way, you count what there is.', 'אתה פורס את המטבעות על השולחן, או שאין לך מה לפרוש. בכל מקרה, אתה סופר מה שיש.'),
          s('friend', 'Whatever you do with it, do it once. You cannot spend a coin in two places.', 'מה שלא תעשה איתם, תעשה פעם אחת. אי אפשר להוציא מטבע בשני מקומות.'),
        ],
        callbacks: [
          {group: 'debt', when: is('life:master:F10:cost', 'loan'), lines: [s(null, 'There is a small sum from the road that someone still holds against your name.', 'יש סכום קטן מהדרך שמישהו עדיין מחזיק על שמך.')]},
          {group: 'debt', when: is('life:master:F13:shift', 'no'), lines: [s(null, 'There is nothing earned today. That is also a way to count.', 'אין היום שום דבר שהרווחת. גם זו דרך לספור.')]},
          {group: 'debt', when: is('life:master:F13:business', 'whatif'), lines: [s(null, 'A small business of your own is only a thought for now, and you do not pay rent on thoughts.', 'עסק קטן משלך הוא בינתיים רק מחשבה, ועל מחשבות לא משלמים שכירות.')]},
        ],
        task: t('Decide where the coins go', 'להחליט לאן המטבעות הולכים'),
        action: [s(null, 'The drawer is the one thing in the kitchen that can keep a secret.', 'המגירה היא הדבר היחיד במטבח שיכול לשמור סוד.')],
        options: [
          o('buy', t('Buy something for the collection', 'לקנות משהו לאוסף'), s('friend', 'It will have a source: this shift, these hours, those coins. Remember that when you tell the story.', 'יהיה לו מקור: המשמרת הזאת, השעות האלה, המטבעות האלה. תזכור את זה כשתספר את הסיפור.'),
            [flag('life:master:F13:spend', 'collection'), coins(-3), heart(2)], {when: {min: ['coins', 3]}}),
          o('save', t('Save for a trip or a home', 'לשמור לנסיעה או לבית'), s('friend', 'A goal, not a purchase. Put a name on it so it does not turn into groceries.', 'יעד, לא קנייה. תן לו שם כדי שלא יהפוך לקניות.'),
            [flag('life:master:F13:spend', 'saved'), flag('life:master:F13:goal', 'trip'), flag('life:inclin', 'way'), heart(1)]),
          o('debt', t('Close an old debt', 'לסגור חוב קיים'), s('friend', 'The creditor and the terms were agreed when the debt was made. Pay what was agreed, not more, not less.', 'הנושה והתנאים סוכמו כשנוצר החוב. שלם מה שסוכם, לא יותר ולא פחות.'),
            [flag('life:master:F13:spend', 'debt'), coins(-3), bond('friend', 3)], {when: {min: ['coins', 3]}}),
        ],
      }),
    ],
  }),
]

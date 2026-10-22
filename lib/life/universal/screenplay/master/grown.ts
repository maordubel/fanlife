import {chapter, o, s, sc, t} from '../write'
import {bond, coins, energy, flag, heart, is} from '../types'
import type {ChapterScript} from '../types'

/**
 * Master screenplay F14–F19 (bible §16, 15.10.2026): the grown-up years.
 *
 * Authored fiction only — no year, no opponent, no score, no real person or place.
 * Where the bible asks for a historical anchor (F16 an international game, F17 "almost") the personal
 * alternative it allows is written instead: a meeting in someone's home, an evening that nearly was.
 *
 * Contract: F15-S3 option 1 (alone) raises `life:route:go`; F16-S3 option 3 is the explicit decision to move
 * abroad with a plan and raises `life:route:abroad`. F19 reads F13's money source (`life:master:F13:spend`);
 * if F13 raises nothing, F19 simply opens as if the shelf began today.
 */
export const MASTER_GROWN: ChapterScript[] = [
  // ───────────────────────────────────────────────────────────────────────── F14 · a home that is not the terrace
  chapter({
    id: 'F14', age: 24, act: 2, title: t('A Home That Is Not the Terrace', 'בית שאינו היציע'),
    intro: t('There is a life that does not stop when the whistle does.', 'יש חיים שלא נעצרים כשהמשרוקית נשמעת.'),
    keep: {id: 'shared-note', name: t('A note from that evening', 'פתק מהערב ההוא'), note: t('Only if it was written. Nothing here is owed.', 'רק אם נכתב. שום דבר כאן לא חובה.')},
    scenes: [
      sc({
        id: 'F14-S1', room: 'bus-stop', who: 'stranger', after: [], spot: 'sign', slot: 'stranger', verb: 'talk',
        title: t('What you do when there is no match', 'מה עושים כשאין משחק'),
        lines: [
          s(null, 'It is a free evening. They do not come often enough to be trusted.', 'ערב פנוי. הם לא מגיעים מספיק לעתים קרובות כדי לסמוך עליהם.'),
          s('stranger', 'I picked a place. Could you come without planning what comes after?', 'בחרתי מקום. אתה יכול לבוא בלי לתכנן מה יהיה אחר כך?'),
          s(null, 'The next bus is four minutes away. So is your answer.', 'האוטובוס הבא בעוד ארבע דקות. וגם התשובה שלך.'),
        ],
        task: t('Answer the invitation', 'לענות להזמנה'),
        action: [s(null, 'The sign hums above you. Somewhere a group chat is waiting for you to say where you are.', 'השלט מזמזם מעליך. איפשהו קבוצת הודעות מחכה שתגיד איפה אתה.')],
        options: [
          o('go', t('Go with them', 'ללכת איתם'), s('stranger', 'Good. It is small. You will not need to be anyone.', 'יופי. זה קטן. לא תצטרך להיות אף אחד.'),
            [flag('life:master:F14:evening', 'went'), bond('stranger', 3), heart(1)]),
          o('swap', t('Suggest something else to do together', 'להציע פעילות אחרת ביחד'), s('stranger', 'Walking? I can walk. Tell me where and I will tell you if my feet agree.', 'ללכת ברגל? אני יכול. תגיד לאן ואגיד לך אם הרגליים שלי מסכימות.'),
            [flag('life:master:F14:evening', 'offered'), bond('stranger', 2)]),
          o('stay', t('Stay with the usual crowd', 'להישאר עם החבורה'), s('stranger', 'No harm done. It was an evening, not a vote.', 'אין בעיה. זה היה ערב, לא הצבעה.'),
            [flag('life:master:F14:evening', 'stayed'), bond('friend', 2)]),
        ],
      }),
      sc({
        id: 'F14-S2', room: 'kitchen', who: 'stranger', spot: 'table', slot: 'tableEnd', verb: 'sit',
        title: t('Their plan', 'התוכנית שלו'),
        lines: [
          s(null, 'Whatever you chose, there is a table, and someone is leaning on it waiting to be asked something.', 'מה שלא בחרת, יש שולחן, ומישהו נשען עליו וממתין שישאלו אותו משהו.'),
          s('stranger', 'This is what I do on evenings like these. It is not much. It is mine.', 'זה מה שאני עושה בערבים כאלה. זה לא הרבה. זה שלי.'),
        ],
        callbacks: [
          {group: 'ev', when: is('life:master:F14:evening', 'stayed'), lines: [s('stranger', 'You stayed with your people. So I am telling you about it the next day, over a cup. Same plan, slower.', 'נשארת עם האנשים שלך. אז אני מספר לך על זה למחרת, על כוס. אותה תוכנית, יותר לאט.')]},
          {group: 'ev', when: is('life:master:F14:evening', 'offered'), lines: [s('stranger', 'You made the evening your way. I can live with that.', 'עשית את הערב בדרך שלך. אני יכול לחיות עם זה.')]},
        ],
        task: t('Take part, or say how you feel', 'להשתתף, או לומר איך אתה מרגיש'),
        action: [s(null, 'The kettle clicks off. Nobody mentions the club, and the room does not fall over.', 'הקומקום נכבה. אף אחד לא מזכיר את הקבוצה, והחדר לא קורס.')],
        options: [
          o('try', t('Be interested and try it', 'להתעניין ולנסות'), s('stranger', 'You are bad at it. It is wonderful. Do it again.', 'אתה גרוע בזה. זה נפלא. תעשה שוב.'),
            [flag('life:master:F14:plan', 'tried'), bond('stranger', 3), energy(-5)]),
          o('honest', t('Admit it is less yours', 'להודות שזה פחות שלך'), s('stranger', 'Thank you for not pretending. Pretending is exhausting for both of us.', 'תודה שלא העמדת פנים. להעמיד פנים מתיש את שנינו.'),
            [flag('life:master:F14:plan', 'honest'), bond('stranger', 2)]),
          o('share', t('Tell them something of your own', 'לספר על משהו אישי משלך'), s('stranger', 'You did not mention the club once. And I know you better now than before.', 'לא הזכרת את הקבוצה אפילו פעם. ואני מכיר אותך עכשיו יותר טוב.'),
            [flag('life:master:F14:plan', 'shared'), bond('stranger', 3), heart(1)]),
        ],
      }),
      sc({
        id: 'F14-S3', room: 'street', who: 'stranger', spot: 'window', slot: 'doorstep', verb: 'talk',
        title: t('What place to give this', 'איזה מקום נותנים לזה'),
        lines: [
          s(null, 'The evening ends on a doorstep, where evenings usually end when they went well.', 'הערב נגמר על מדרגה, שם שבו ערבים נגמרים כשהם עברו טוב.'),
          s('stranger', 'Would you want to meet again? You can say no, and I will still have had tonight.', 'היית רוצה להיפגש שוב? אפשר לומר לא, ועדיין היה לי הערב הזה.'),
        ],
        task: t('Say what this is', 'לומר מה זה'),
        action: [s(null, 'A light goes on in a window above. Not for you. It makes the street feel inhabited anyway.', 'אור נדלק בחלון מעל. לא בשבילך. אבל הרחוב מרגיש מיושב.')],
        options: [
          o('deeper', t('Go deeper, if you both want to', 'להעמיק, אם שניכם רוצים'), s('stranger', 'Slowly. I do not know how to do it any other way.', 'לאט. אני לא יודע איך עושים את זה אחרת.'),
            [flag('life:master:F14:tie', 'deeper'), flag('life:master:F14:note', 'written'), bond('stranger', 4), heart(1)]),
          o('friend', t('Choose friendship', 'לבחור בחברות'), s('stranger', 'A good one is worth a lot more than a bad something else.', 'חבר טוב שווה הרבה יותר ממשהו אחר שהולך רע.'),
            [flag('life:master:F14:tie', 'friend'), bond('stranger', 3)]),
          o('open', t('Promise nothing', 'לא להתחייב'), s('stranger', 'Then it was one evening, and it happened. That is not a failure.', 'אז זה היה ערב אחד, והוא קרה. זה לא כישלון.'),
            [flag('life:master:F14:tie', 'open'), heart(1)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F15 · someone is counting on you
  chapter({
    id: 'F15', age: 25, act: 2, title: t('Someone Is Counting on You', 'מישהו סומך עליך'),
    intro: t('You did one small thing, and someone noticed.', 'עשית דבר קטן אחד, ומישהו שם לב.'),
    keep: {id: 'made-thing', name: t('What you made', 'מה שיצרת'), note: t('Only if it was truly made. No role comes with it for free.', 'רק אם באמת נעשה. שום תפקיד לא בא איתו בחינם.')},
    scenes: [
      sc({
        id: 'F15-S1', room: 'workshop', who: 'elder', after: [], spot: 'tools', slot: 'boss', verb: 'talk',
        title: t('Can we talk for a minute', 'אפשר לדבר רגע'),
        lines: [
          s(null, 'The one who was there when you did it has been waiting by the bench all morning.', 'זה שהיה שם כשעשית את זה מחכה ליד הספסל כל הבוקר.'),
          s('elder', 'Can we talk for a minute? There is something specific I could use a hand with.', 'אפשר לדבר רגע? יש משהו מסוים שהייתי שמח לעזרה בו.'),
          s('friend', 'Or we could just show up again together. No pressure. That is also a plan.', 'או שנבוא שוב ביחד, סתם. בלי לחץ. גם זו תוכנית.'),
        ],
        task: t('Hear them out', 'להקשיב להם'),
        action: [s(null, 'A radio plays low on the shelf. Nobody turns it up. Nobody turns it off.', 'רדיו מנגן חרישית על המדף. אף אחד לא מגביר. אף אחד לא מכבה.')],
        options: [
          o('small', t('Try a small responsibility', 'לנסות אחריות קטנה'), s('elder', 'Small. Good. We will start where the floor is solid.', 'קטן. טוב. נתחיל איפה שהרצפה יציבה.'),
            [flag('life:master:F15:ask', 'small'), bond('elder', 3), energy(-5)]),
          o('narrow', t('Ask for a narrower task', 'לבקש משימה מצומצמת'), s('elder', 'A narrower one. Sure. Then the hours and the price are on the table too.', 'צרה יותר. בסדר. אז גם השעות והמחיר על השולחן.'),
            [flag('life:master:F15:ask', 'narrow'), bond('elder', 2)]),
          o('later', t('Say not now', 'לומר לא עכשיו'), s('elder', 'Not now is an answer. I will remember you said it kindly.', 'לא עכשיו זו תשובה. אזכור שאמרת אותה בעדינות.'),
            [flag('life:master:F15:ask', 'later'), bond('friend', 2)]),
        ],
      }),
      sc({
        id: 'F15-S2', room: 'workshop', who: 'mate', spot: 'ladder', slot: 'mate', verb: 'use',
        title: t('Not what you thought', 'לא מה שחשבת'),
        lines: [
          s(null, 'The task opens something you had not seen: a person, or a craft, that was there the whole time.', 'המשימה פותחת משהו שלא ראית: אדם, או מלאכה, שהיו שם כל הזמן.'),
          s('mate', 'You do it like this. No, not like that. Like this. Better.', 'עושים את זה ככה. לא, לא ככה. ככה. יותר טוב.'),
        ],
        callbacks: [
          {group: 'ask', when: is('life:master:F15:ask', 'narrow'), lines: [s('elder', 'You wanted it narrow, so here it is, narrow. Do not make it wider by accident.', 'רצית צר, אז הנה, צר. אל תרחיב אותו בטעות.')]},
          {group: 'ask', when: is('life:master:F15:ask', 'small'), lines: [s('elder', 'A small thing, as promised. Small things get bigger when you are not watching.', 'דבר קטן, כמו שהבטחתי. דברים קטנים גדלים כשלא מסתכלים עליהם.')]},
        ],
        task: t('Do the task', 'לבצע את המשימה'),
        action: [s(null, 'Your hands learn it before your head agrees. That is how most real things start.', 'הידיים שלך לומדות את זה לפני שהראש מסכים. ככה מתחילים רוב הדברים האמיתיים.')],
        options: [
          o('own', t('Finish it your own way', 'להשלים בדרך שלך'), s('mate', 'That is not how I would have done it. Leave it. Everyone will see it tomorrow.', 'ככה אני לא הייתי עושה. תשאיר את זה. כולם יראו את זה מחר.'),
            [flag('life:master:F15:way', 'own'), flag('life:master:F15:made', 'yes'), heart(2), energy(-8)]),
          o('partner', t('Ask someone to work with you', 'לבקש שותף'), s('mate', 'Together, then. I will hold this end. You hold the part that frightens you.', 'ביחד, אז. אני אחזיק את הקצה הזה. אתה תחזיק את החלק שמפחיד אותך.'),
            [flag('life:master:F15:way', 'partner'), flag('life:master:F15:made', 'yes'), bond('mate', 4), energy(-5)]),
          o('hand-back', t('Hand it back before anyone is waiting on it', 'להחזיר את זה לפני שמישהו מחכה לזה'), s('mate', 'Better now than half done on a Friday. I would have said the same to myself.', 'עדיף עכשיו מאשר חצי עשוי ביום שישי. הייתי אומר לעצמי אותו דבר.'),
            [flag('life:master:F15:way', 'handed'), heart(1)]),
        ],
      }),
      sc({
        id: 'F15-S3', room: 'street', who: 'elder', spot: 'crates', slot: 'wall', verb: 'talk',
        title: t('Next time', 'פעם הבאה'),
        lines: [
          s('elder', 'I will tell you what I saw. I will not tell you what it counted for.', 'אגיד לך מה ראיתי. לא אגיד לך מה זה שווה.'),
          s(null, 'It is said plainly, standing up, with a bag over the shoulder. A good way to be told anything.', 'זה נאמר בפשטות, בעמידה, עם תיק על הכתף. דרך טובה לשמוע כל דבר.'),
        ],
        callbacks: [
          {group: 'way', when: is('life:master:F15:way', 'partner'), lines: [s('elder', 'I saw you ask for a second pair of hands. It is rarer than you think.', 'ראיתי אותך מבקש זוג ידיים נוסף. זה נדיר יותר ממה שאתה חושב.')]},
          {group: 'way', when: is('life:master:F15:way', 'own'), lines: [s('elder', 'I saw you do it your way and not apologise. I noticed.', 'ראיתי אותך עושה את זה בדרך שלך ולא מתנצל. שמתי לב.')]},
          {group: 'way', when: is('life:master:F15:way', 'handed'), lines: [s('elder', 'I saw you give it back early. It cost you something. That counts too.', 'ראיתי אותך מחזיר את זה מוקדם. זה עלה לך. גם זה נחשב.')]},
        ],
        task: t('Decide what happens next', 'להחליט מה קורה אחר כך'),
        action: [s(null, 'A shutter rattles down the road. The conversation has the whole afternoon, and uses none of it.', 'תריס מקרקש במורד הרחוב. לשיחה יש את כל אחר הצהריים, והיא לא משתמשת בכלום.')],
        options: [
          o('commit', t('Agree to a defined next step', 'להסכים להמשך מוגדר'), s('elder', 'Defined. A time, a place, a name. Then you are in it and so am I.', 'מוגדר. שעה, מקום, שם. אז אתה בפנים ואני גם.'),
            [flag('life:master:F15:next', 'defined'), flag('life:route:go'), bond('elder', 3), heart(1)]),
          o('now-then', t('Stay available now and then', 'להישאר זמין מדי פעם'), s('elder', 'Now and then. I can build around now and then. Come when you can.', 'מדי פעם. אפשר לבנות סביב מדי פעם. בוא כשאתה יכול.'),
            [flag('life:master:F15:next', 'sometimes'), bond('elder', 2)]),
          o('fan', t('Stay a supporter with no role', 'להישאר אוהד בלי תפקיד'), s('elder', 'Then I will see you in the usual place, and the usual place will be glad.', 'אז אפגוש אותך במקום הרגיל, והמקום הרגיל ישמח.'),
            [flag('life:master:F15:next', 'fan'), heart(2)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F16 · the world is bigger
  chapter({
    id: 'F16', age: 27, act: 2, title: t('The World Is Bigger', 'העולם גדול יותר'),
    intro: t('Other people are loved by other things, and that is a gift.', 'אנשים אחרים אהובים על ידי דברים אחרים, וזו מתנה.'),
    keep: {id: 'local-thing', name: t('A thing from there', 'משהו משם'), note: t('Only from a road you actually took.', 'רק מדרך שבאמת הלכת בה.')},
    scenes: [
      sc({
        id: 'F16-S1', room: 'bus-station', who: 'friend', after: [], spot: 'board', slot: 'friend', verb: 'talk',
        title: t('Three plans and money for one', 'שלוש תוכניות וכסף לאחת'),
        lines: [
          s('friend', 'I found a new way to go. Cheap-ish. Long. You would love it.', 'מצאתי דרך חדשה לנסוע. זולה-ביחס. ארוכה. תאהב אותה.'),
          s(null, 'Someone else has asked you to a gathering at their house on the same weekend. You can please both of them. Not at the same time.', 'מישהו אחר הזמין אותך למפגש אצלו בבית באותו סוף שבוע. אפשר לרצות את שניהם. לא באותו זמן.'),
        ],
        task: t('Choose how to spend a weekend', 'לבחור איך לבלות סוף שבוע'),
        action: [s(null, 'The board flicks over. Nothing on it concerns you. It looks like it does.', 'הלוח מתחלף. שום דבר בו לא נוגע אליך. זה נראה שכן.')],
        options: [
          o('trip', t('Take a trip you can pay for', 'לצאת למסע שאפשר לממן'), s('friend', 'We check the money first. I mean it. Before we pay, not after.', 'קודם בודקים את הכסף. ברצינות. לפני שמשלמים, לא אחרי.'),
            [flag('life:master:F16:plan', 'trip'), bond('friend', 3), coins(-3)], {when: {min: ['coins', 3]}}),
          o('home', t('Host, or join, a local gathering', 'לארח או להצטרף למפגש מקומי'), s('stranger', 'Come in, mind the dog. Everyone here is early because I lied about the time.', 'תיכנס, תיזהר מהכלב. כולם כאן מוקדם כי שיקרתי לגבי השעה.'),
            [flag('life:master:F16:plan', 'home'), bond('stranger', 3), energy(-5)]),
          o('mine', t('Stay with your own goal', 'להמשיך ביעד האישי'), s('friend', 'Your thing, then. I will tell you how mine went and you will pretend it was better than yours.', 'הדבר שלך, אז. אספר לך איך שלי עבר ואתה תעמיד פנים שהוא היה יותר טוב משלך.'),
            [flag('life:master:F16:plan', 'mine'), heart(1)]),
        ],
      }),
      sc({
        id: 'F16-S2', room: 'flat-abroad', who: 'stranger', spot: 'window', slot: 'visitor', verb: 'talk', cut: true,
        title: t('Someone who does not know you', 'מישהו שלא מכיר אותך'),
        lines: [
          s(null, 'You are somewhere that is not your usual somewhere. The light comes in at a different angle.', 'אתה במקום שהוא לא המקום הרגיל שלך. האור נכנס בזווית אחרת.'),
          s('stranger', 'Can I ask a simple thing? Why this? Your friends no longer ask, I think.', 'אפשר לשאול דבר פשוט? למה זה? החברים שלך כבר לא שואלים, נראה לי.'),
        ],
        callbacks: [
          {group: 'plan', when: is('life:master:F16:plan', 'trip'), lines: [s(null, 'You paid for the trip before you left, as agreed. It makes the whole afternoon lighter.', 'שילמת על המסע לפני שיצאת, כמו שסוכם. זה מקל על כל אחר הצהריים.')]},
          {group: 'plan', when: is('life:master:F16:plan', 'home'), lines: [s(null, 'It is a living room, six strangers and a plate of something. That is what a world usually is.', 'זה סלון, שישה זרים וצלחת של משהו. ככה נראה בדרך כלל עולם.')]},
        ],
        task: t('Answer the simple question', 'לענות על השאלה הפשוטה'),
        action: [s(null, 'Someone cooks in the next room. The language of the smell does not need translating.', 'מישהו מבשל בחדר ליד. אין צורך לתרגם את השפה של הריח.')],
        options: [
          o('show', t('Show something personal', 'להראות משהו אישי'), s('stranger', 'It is yours. I will not touch. Tell me where it came from.', 'זה שלך. לא אגע. ספר לי מאיפה זה הגיע.'),
            [flag('life:master:F16:meet', 'showed'), bond('stranger', 3), heart(1)]),
          o('ask', t('Ask about their life', 'לשאול על החיים שלו'), s('stranger', 'Mine is a long story and a short bus ride. Sit.', 'שלי סיפור ארוך ונסיעה קצרה באוטובוס. שב.'),
            [flag('life:master:F16:meet', 'asked'), bond('stranger', 4)]),
          o('group', t('Stay with the familiar group', 'להישאר עם החבורה המוכרת'), s('friend', 'You and me and the corner of the room. It is allowed. Not every trip makes a friend.', 'אתה ואני והפינה של החדר. מותר. לא כל נסיעה יוצרת חבר.'),
            [flag('life:master:F16:meet', 'group'), bond('friend', 2)]),
        ],
      }),
      sc({
        id: 'F16-S3', room: 'bus-station', who: 'friend', spot: 'bench', slot: 'pillar', verb: 'sit',
        title: t('In the end you have to go back', 'בסוף צריך לחזור'),
        lines: [
          s(null, 'It ends the way these things end: by its own hour. Some people want to keep sitting. Some have a bus.', 'זה נגמר כמו שדברים כאלה נגמרים: לפי השעה שלו. יש מי שרוצה להמשיך לשבת ויש מי שיש לו אוטובוס.'),
          s('friend', 'So. Are we going back like we said?', 'אז. חוזרים כמו שאמרנו?'),
        ],
        callbacks: [
          {group: 'meet', when: is('life:master:F16:meet', 'asked'), lines: [s(null, 'You exchange an address on the back of a ticket. It is a start, nothing more.', 'אתם מחליפים כתובת על גב של כרטיס. זו התחלה, לא יותר.')]},
          {group: 'meet', when: is('life:master:F16:meet', 'group'), lines: [s('friend', 'You stuck by me all day. Thanks. It is not nothing.', 'נשארת איתי כל היום. תודה. זה לא כלום.')]},
        ],
        task: t('Decide how this ends', 'להחליט איך זה נגמר'),
        action: [s(null, 'An announcement in a language you half understand. The half you do understand is enough.', 'הודעה בשפה שאתה מבין בחצי. החצי שאתה מבין מספיק.')],
        options: [
          o('back', t('Go back with the people you agreed with', 'לחזור עם מי שסיכמת'), s('friend', 'Together, then. I will carry the bag. You carry the story.', 'ביחד, אז. אני אסחב את התיק. אתה תסחב את הסיפור.'),
            [flag('life:master:F16:end', 'returned'), flag('life:master:F16:thing', 'carried'), bond('friend', 3)]),
          o('change', t('Ask to change the plan', 'לבקש לשנות תוכנית'), s('friend', 'I need a real answer, not a shrug. If it is no, it is no, and there is a price.', 'אני צריך תשובה אמיתית, לא כתיפיים. אם זה לא, זה לא, ויש מחיר.'),
            [flag('life:master:F16:end', 'changed'), coins(-2), bond('friend', 1)], {when: {min: ['coins', 2]}}),
          o('stay', t('Stay on for good, with a plan', 'להישאר שם, עם תוכנית'), s('friend', 'You have a room, a thing to do, and a date to tell home. Then I will not argue. I will help carry.', 'יש לך חדר, משהו לעשות, ותאריך שבו תגיד בבית. אז לא אתווכח. אעזור לסחוב.'),
            [flag('life:master:F16:end', 'abroad'), flag('life:route:abroad'), heart(2), energy(-10)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F17 · almost
  chapter({
    id: 'F17', age: 28, act: 2, title: t('Almost', 'כמעט'),
    intro: t('An evening that could have been everything, and decided to be an evening.', 'ערב שיכול היה להיות הכול, והחליט להיות ערב.'),
    keep: {id: 'night-note', name: t('What you wrote that night', 'מה שכתבת באותו ערב'), note: t('No prize, no stub. Only what you made of it.', 'בלי פרס, בלי גלוסקמה. רק מה שעשית ממנו.')},
    scenes: [
      sc({
        id: 'F17-S1', room: 'room', who: 'friend', after: [], spot: 'tv', slot: 'sofa', verb: 'sit',
        title: t('Everyone is already counting', 'כולם כבר מחשבים'),
        lines: [
          s('friend', 'If one thing happens, just one, then everything is ours. All of it.', 'אם דבר אחד קורה, רק אחד, הכול שלנו. הכול.'),
          s('elder', 'Do not go ahead of it. It has made fools of better men than you.', 'אל תרוץ לפניו. הוא עשה צחוק מאנשים טובים ממך.'),
          s(null, 'The evening has not happened yet, and already people are standing in it.', 'הערב עוד לא קרה, וכבר אנשים עומדים בתוכו.'),
        ],
        task: t('Choose how to wait', 'לבחור איך מחכים'),
        action: [s(null, 'A bag of something crunchy is passed round. Nobody tastes it.', 'שקית של משהו פריך עוברת מיד ליד. אף אחד לא טועם.')],
        options: [
          o('swept', t('Get swept up with the friend', 'להיסחף עם החבר'), s('friend', 'Then promise. A real one. What do we do if it happens?', 'אז תבטיח. הבטחה אמיתית. מה עושים אם זה קורה?'),
            [flag('life:master:F17:wait', 'swept'), flag('life:master:F17:promise', 'party'), bond('friend', 3), heart(1)]),
          o('small', t('Keep the evening small', 'לשמור את הערב קטן'), s('elder', 'Small. Good. Small is how you keep it from shattering.', 'קטן. טוב. ככה שומרים שלא ישבר.'),
            [flag('life:master:F17:wait', 'small'), bond('elder', 3)]),
          o('life', t('Prepare the next thing in your life', 'להכין את הדבר הבא בחיים'), s('friend', 'You are going to do your errands tonight? Fine. I will tell you everything when it is over.', 'אתה תעשה סידורים הערב? בסדר. אספר לך הכול כשזה ייגמר.'),
            [flag('life:master:F17:wait', 'life'), heart(1)], {skip: ['F17-S4', 'F17-S2']}),
        ],
      }),
      sc({
        id: 'F17-S4', room: 'route', who: 'friend', slot: 'lamp', spot: 'sign', verb: 'look', sound: 'murmur',
        title: t('The lay-by', 'חניון הדרך'),
        lines: [
          s(null, 'Four of you in a car built for three. The flag is out of one window and the rest of the city is out of the others.', 'ארבעה במכונית לשלושה. הדגל יוצא מחלון אחד, ושאר העיר יוצאת מהאחרים.'),
          s('friend', 'Lay-by in two hundred metres. Someone needs the toilet, and someone else needs a sandwich. I will not say who.', 'חניון בעוד מאתיים מטר. מישהו צריך שירותים ומישהו אחר צריך כריך. לא אגיד מי.'),
          s(null, 'The queue ahead is not moving. The clock on the dashboard says you have time, but not much of it.', 'התור מלפנים לא זז. השעון על הלוח אומר שיש זמן, אבל לא הרבה.'),
          s('friend', 'Five minutes. Honestly. Five.', 'חמש דקות. באמת. חמש.'),
          s(null, 'The engine is still warm. The road, for the first time all morning, is clear.', 'המנוע עוד חם. הכביש, בפעם הראשונה כל הבוקר, פנוי.'),
        ],
        callbacks: [
          {group: 'wait', when: is('life:master:F17:wait', 'swept'), lines: [s('friend', 'I have the whole night planned and none of it includes this queue.', 'תכננתי את כל הלילה, ושום דבר מזה לא כולל את התור הזה.')]},
        ],
        task: t('Decide what to do with the stop', 'להחליט מה עושים עם העצירה'),
        action: [s(null, 'Your hands are on the wheel. Three faces wait for you to say it.', 'הידיים שלך על ההגה. שלושה פרצופים מחכים שתגיד.')],
        options: [
          o('drive', t('Skip the stop and drive', 'לוותר על העצירה ולנסוע'), s('friend', 'Fine. But if I explode, I explode in the stadium.', 'בסדר. אבל אם אני מתפוצץ, אני מתפוצץ באצטדיון.'),
            [flag('life:final:trip', 'drive'), energy(-15), heart(2)], {mission: {template: 'cup-final-trip'}}),
          o('stop', t('Take the lay-by, five minutes', 'לעצור בחניון, חמש דקות'), s('friend', 'Five. I am timing you. I am timing myself.', 'חמש. אני מודד לך. אני מודד לעצמי.'),
            [flag('life:final:trip', 'stop'), bond('friend', 3)]),
          o('passenger', t('Let someone else drive and rest', 'לתת למישהו אחר לנהוג ולנוח'), s(null, 'You hand over the keys and watch the road go past from the passenger side for once.', 'אתה מוסר את המפתחות ורואה את הכביש עובר מהמושב שליד, לשם שינוי.'),
            [flag('life:final:trip', 'passenger'), energy(10)]),
        ],
      }),
      sc({
        id: 'F17-S2', room: 'terrace', who: 'elder', spot: 'banner', slot: 'left', verb: 'look',
        title: t('What is known now', 'מה ידוע עכשיו'),
        lines: [
          s(null, 'News comes in as it does: in pieces, late, in the wrong order. You only know what has reached you.', 'חדשות מגיעות כמו שהן מגיעות: בחתיכות, באיחור, בסדר הלא נכון. אתה יודע רק מה שהגיע אליך.'),
          s('elder', 'There is another thing going on elsewhere. We do not know it. We do not get to know it faster.', 'יש דבר נוסף שקורה במקום אחר. אנחנו לא יודעים אותו. לא נדע אותו מהר יותר.'),
        ],
        callbacks: [
          {group: 'wait', when: is('life:master:F17:wait', 'swept'), lines: [s('friend', 'I have already planned the whole night. Ask me something about it. Please.', 'כבר תכננתי את כל הערב. תשאל אותי משהו עליו. בבקשה.')]},
          {group: 'wait', when: is('life:master:F17:wait', 'small'), lines: [s('elder', 'You kept it small, and the stand is full of people who did not.', 'שמרת על זה קטן, והיציע מלא באנשים שלא.')]},
        ],
        task: t('Choose where to put your attention', 'לבחור לאן לשים את תשומת הלב'),
        action: [s(null, 'The noise rises and falls on its own time. It does not care who you are.', 'הרעש עולה ויורד לפי הזמן שלו. לא אכפת לו מי אתה.')],
        options: [
          o('see', t('Stay with what you can see', 'להישאר עם מה שאתה רואה'), s('elder', 'I am looking elsewhere too. If I learn anything, you will know before the rest.', 'גם אני מסתכל במקום אחר. אם אלמד משהו, תדע לפני האחרים.'),
            [flag('life:master:F17:know', 'seen'), bond('elder', 3)]),
          o('check', t('Look for a verified update', 'לחפש עדכון מאומת'), s('stranger', 'The update will say what it says, and you will be reading it a minute behind. Is that a good deal?', 'העדכון יגיד מה שהוא יגיד, ואתה תקרא אותו דקה באיחור. זו עסקה טובה?'),
            [flag('life:master:F17:know', 'checked'), energy(-5)]),
          o('beside', t('Look at the person beside you', 'להסתכל על האדם שלידך'), s(null, 'A face you know very well, doing something it does not know it is doing. You keep it.', 'פנים שאתה מכיר היטב, עושות משהו שהן לא יודעות שהן עושות. אתה שומר את זה.'),
            [flag('life:master:F17:know', 'beside'), bond('friend', 3), heart(2)]),
        ],
      }),
      sc({
        id: 'F17-S3', room: 'bus-stop', who: 'friend', spot: 'sign', slot: 'bench', verb: 'sit', night: true,
        title: t('After it went not as you wanted', 'אחרי שלא הלך כמו שרצית'),
        lines: [
          s(null, 'It nearly was. The word does the same work in every language: it cuts exactly where it hurts.', 'זה כמעט היה. המילה עושה את אותה עבודה בכל שפה: חותכת בדיוק איפה שכואב.'),
          s('friend', 'I do not know what to say. It is OK that I do not.', 'אני לא יודע מה להגיד. זה בסדר שאני לא יודע.'),
        ],
        callbacks: [
          {group: 'prom', when: is('life:master:F17:promise', 'party'), lines: [s('friend', 'We do not have to do the thing we promised. We could do it anyway, or not. Either is fine.', 'אנחנו לא חייבים לעשות מה שהבטחנו. אפשר לעשות בכל זאת, או לא. כל אחד מהם בסדר.')]},
          {group: 'prom', when: is('life:master:F17:wait', 'life'), lines: [s('friend', 'You did your errands. I stood in the cold. We are about even.', 'עשית את הסידורים שלך. אני עמדתי בקור. אנחנו בערך שווים.')]},
        ],
        task: t('Decide what to do with the night', 'להחליט מה עושים עם הלילה'),
        action: [s(null, 'The last bus comes and goes without either of you moving. Neither of you mentions it.', 'האוטובוס האחרון מגיע והולך בלי שמישהו מכם זז. אף אחד לא מזכיר את זה.')],
        options: [
          o('stay', t('Stay with someone', 'להישאר עם מישהו'), s('friend', 'Then it is both of us and no speeches. I will sit here until the cold wins.', 'אז שנינו וללא נאומים. אשב כאן עד שהקור ינצח.'),
            [flag('life:master:F17:after', 'stayed'), bond('friend', 4), heart(1)]),
          o('alone', t('Walk alone and talk later', 'ללכת לבד ולדבר אחר כך'), s('friend', 'Go. Call when you want to. I will not take it as leaving.', 'לך. תתקשר כשתרצה. לא אקח את זה כעזיבה.'),
            [flag('life:master:F17:after', 'alone'), heart(1)]),
          o('write', t('Make something, or write down how it was', 'ליצור משהו או לרשום איך היה'), s(null, 'You write it on whatever is in your pocket. It is a personal record; it is not the record of what happened.', 'אתה כותב את זה על מה שיש בכיס. זה תיעוד אישי; זה לא התיעוד של מה שקרה.'),
            [flag('life:master:F17:after', 'wrote'), flag('life:master:F17:note', 'written'), heart(2)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F18 · the diary on the table
  chapter({
    id: 'F18', age: 30, act: 2, title: t('The Diary on the Table', 'היומן שעל השולחן'),
    intro: t('Two dates on one square of paper, and both of them matter.', 'שני תאריכים על ריבוע נייר אחד, ושניהם חשובים.'),
    keep: {id: 'desk-diary', name: t('The diary and its margin note', 'היומן והפתק בשוליים'), note: t('A family thing only if one was made in here.', 'פריט משפחתי רק אם נוצר כאן.')},
    scenes: [
      sc({
        id: 'F18-S1', room: 'kitchen', who: 'stranger', after: [], spot: 'table', slot: 'table', verb: 'look',
        title: t('I already wrote it down', 'כבר כתבתי'),
        lines: [
          s(null, 'A diary lies open on the table. A finger rests on one square, as if holding it down.', 'יומן פתוח על השולחן. אצבע מונחת על ריבוע אחד, כאילו מחזיקה אותו למטה.'),
          s('stranger', 'I did not know it was on the same day. I wrote it a month ago.', 'לא ידעתי שזה באותו יום. כתבתי את זה לפני חודש.'),
        ],
        callbacks: [
          {group: 'tie', when: is('life:master:F14:tie', 'deeper'), lines: [s('stranger', 'It is something that matters to us, so I thought I should say it straight.', 'זה משהו שחשוב לנו, אז חשבתי שאני צריך להגיד את זה ישר.')]},
          {group: 'tie', when: is('life:master:F14:tie', 'friend'), lines: [s('stranger', 'We have each other as friends, so I am telling you as one. Not as a negotiation.', 'יש לנו אחד את השני כחברים, אז אני מספר לך כחבר. לא כמשא ומתן.')]},
        ],
        task: t('Answer the diary', 'לענות ליומן'),
        action: [s(null, 'You count the squares of the week with a finger: two things written into the same evening. The date does not move because it would be convenient. Dates are stubborn that way.', 'אתה סופר באצבע את משבצות השבוע: שני דברים כתובים באותו ערב. התאריך לא זז כי זה היה נוח. תאריכים עקשנים ככה.')],
        game: 'count',
        options: [
          o('keep', t('Keep the personal commitment', 'לשמור על ההתחייבות האישית'), s('stranger', 'Thank you. I know what that costs you. I will remember it.', 'תודה. אני יודע מה זה עולה לך. אזכור.'),
            [flag('life:master:F18:dates', 'personal'), bond('stranger', 3), heart(1)]),
          o('move', t('Ask to move or split the time', 'לבקש להזיז או לחלק את הזמן'), s('stranger', 'I can move half of it. I cannot move the rest. Can you live with half?', 'אני יכול להזיז חצי. את השאר אני לא יכול. אתה יכול לחיות עם חצי?'),
            [flag('life:master:F18:dates', 'split'), bond('stranger', 2)]),
          o('game', t('Choose the match', 'לבחור במשחק'), s('stranger', 'Then you chose. And I will know that you did. That is the most I can ask.', 'אז בחרת. ואני אדע שבחרת. זה המקסימום שאני יכול לבקש.'),
            [flag('life:master:F18:dates', 'game'), flag('life:master:F18:told', 'yes'), heart(1)]),
        ],
      }),
      sc({
        id: 'F18-S2', room: 'room', who: 'stranger', spot: 'photos', slot: 'sofaEnd', verb: 'talk',
        title: t('What kind of home do you want', 'איזה בית רוצים'),
        lines: [
          s(null, 'Evening. Someone is asking you something that has no right answer, only an honest one.', 'ערב. מישהו שואל אותך משהו שאין לו תשובה נכונה, רק כנה.'),
          s('stranger', 'Where do we want to live? Do we want it to be more than the two of us? I do not need it answered today.', 'איפה אנחנו רוצים לגור? האם אנחנו רוצים שזה יהיה יותר משנינו? אני לא צריך תשובה היום.'),
        ],
        callbacks: [
          {group: 'tie', when: {none: [is('life:master:F14:tie', 'deeper')]}, lines: [s(null, 'It is a friend asking, not a partner: the shape of your life, out loud, over a cup.', 'זה חבר ששואל, לא בן זוג: את הצורה של החיים שלך, בקול, מעל כוס.')]},
        ],
        task: t('Say what you want', 'לומר מה אתה רוצה'),
        action: [s(null, 'The photographs on the wall have no opinion. It is a relief.', 'לתמונות על הקיר אין דעה. זו הקלה.')],
        options: [
          o('build', t('Build a shared plan', 'לבנות תוכנית משותפת'), s('stranger', 'One step. Then another. A house is a lot of steps.', 'צעד אחד. אחר כך עוד אחד. בית זה הרבה צעדים.'),
            [flag('life:master:F18:home', 'planned'), bond('stranger', 3), heart(1)]),
          o('other', t('Choose a life without kids or a shared home', 'לבחור חיים בלי הורות או מגורים משותפים'), s('stranger', 'A whole life, then, and a different one from the one I imagined. I will think about it honestly.', 'חיים שלמים, אם כך, ושונים ממה שדמיינתי. אחשוב על זה בכנות.'),
            [flag('life:master:F18:home', 'other'), heart(2)]),
          o('open', t('Leave the question open', 'להשאיר את השאלה פתוחה'), s('stranger', 'Open is fine. Open does not close by itself, though. We will have to come back.', 'פתוח זה בסדר. אבל פתוח לא נסגר מעצמו. נצטרך לחזור לזה.'),
            [flag('life:master:F18:home', 'open')]),
        ],
      }),
      sc({
        id: 'F18-S3', room: 'street', who: 'stranger', spot: 'car', slot: 'customer', verb: 'talk', night: true,
        title: t('On the evening itself', 'בערב עצמו'),
        lines: [
          s(null, 'The day has arrived. Whatever you chose, you are now standing inside it.', 'היום הגיע. מה שלא בחרת, אתה עומד עכשיו בתוכו.'),
        ],
        callbacks: [
          {group: 'dates', when: is('life:master:F18:dates', 'personal'), lines: [s('stranger', 'You came. I was almost sure you would not. I am happy to have been wrong.', 'באת. הייתי כמעט בטוח שלא. אני שמח שטעיתי.')]},
          {group: 'dates', when: is('life:master:F18:dates', 'split'), lines: [s('stranger', 'Half of the evening and half of the other. Let us see how much of it holds.', 'חצי מהערב וחצי מהאחר. בוא נראה כמה מזה מחזיק.')]},
          {group: 'dates', when: is('life:master:F18:dates', 'game'), lines: [s('stranger', 'You are late. I am here anyway, because I said I would be.', 'אתה מאחר. אני כאן בכל זאת, כי אמרתי שאהיה.')]},
        ],
        task: t('Be where you said', 'להיות איפה שאמרת'),
        action: [s(null, 'There is no way to be in two places. The evening has noticed, politely, and says nothing.', 'אי אפשר להיות בשני מקומות. הערב שם לב, בנימוס, ולא אומר כלום.')],
        options: [
          o('there', t('Be with the one you chose', 'להיות עם מי שבחרת'), s('stranger', 'Here. Just here. That is everything I asked for.', 'כאן. רק כאן. זה כל מה שביקשתי.'),
            [flag('life:master:F18:night', 'there'), bond('stranger', 3), heart(1)]),
          o('ask-again', t('Ask for one more change, and face the answer', 'לבקש שינוי נוסף ולהתמודד עם התשובה'), s('stranger', 'Another one? Fine. But I will tell you how it sounded.', 'עוד אחד? בסדר. אבל אגיד לך איך זה נשמע.'),
            [flag('life:master:F18:night', 'asked'), bond('stranger', 1), energy(-8)]),
          o('missed', t('Admit you did not keep it', 'להודות שלא עמדת בזה'), s('stranger', 'Thank you for saying it. Now we have something to talk about, and it is not the end of the day.', 'תודה שאמרת. עכשיו יש לנו על מה לדבר, וזה לא סוף היום.'),
            [flag('life:master:F18:night', 'missed'), flag('life:master:F18:open', 'yes'), heart(1)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F19 · another season on the shelf
  chapter({
    id: 'F19', age: 32, act: 2, title: t('Another Season on the Shelf', 'עוד עונה על המדף'),
    intro: t('A shelf is a diary that cannot lie about what you chose to keep.', 'מדף הוא יומן שלא יכול לשקר לגבי מה בחרת לשמור.'),
    keep: {id: 'shelf-piece', name: t('What you added to the shelf', 'מה שהוספת למדף'), note: t('Only if it was bought or handed to you. A new album does not open by age.', 'רק אם נקנה או נמסר לך. אלבום חדש לא נפתח לפי גיל.'),
      when: {any: [is('life:master:F19:piece', 'bought'), is('life:master:F19:copy', 'swap'), is('life:master:F19:carry', 'chosen')]}},
    scenes: [
      sc({
        id: 'F19-S1', room: 'street', who: 'seller', after: [], spot: 'crates', slot: 'kiosk', verb: 'look',
        title: t('The one that was missing', 'זה שהיה חסר'),
        lines: [
          s(null, 'There is a table of things that come with a history, and one piece you noticed a long time ago.', 'יש שולחן של דברים שבאים עם היסטוריה, ואחד מהם שהבחנת בו מזמן.'),
          s('seller', 'You have been looking at that one since before you came over. You do not have to say.', 'אתה מסתכל על זה מאז שלא באת עוד. אתה לא חייב להגיד.'),
        ],
        callbacks: [
          {group: 'money', when: is('life:master:F13:spend', 'collection'), lines: [s(null, 'You bought something with that first pay once. The habit of looking at tables came from there.', 'פעם קנית משהו מהמשכורת הראשונה. ההרגל להסתכל על שולחנות התחיל משם.')]},
          {group: 'money', when: is('life:master:F13:spend', 'saved'), lines: [s(null, 'You saved that first money for a trip or a home. It makes you read a price tag slowly.', 'שמרת את הכסף הראשון ההוא לנסיעה או לבית. זה גורם לך לקרוא תווית מחיר לאט.')]},
          {group: 'money', when: is('life:master:F13:spend', 'debt'), lines: [s(null, 'You closed a debt with that first pay, so you no longer buy on impulse. Not even here.', 'סגרת חוב מהמשכורת הראשונה ההיא, אז אתה כבר לא קונה בהתלהבות. גם לא כאן.')]},
        ],
        task: t('Decide what to do about the piece', 'להחליט מה לעשות עם הפריט'),
        action: [s(null, 'It looks smaller in the hand than it did across the table. They usually do.', 'הוא נראה קטן יותר ביד מאשר מעבר לשולחן. בדרך כלל כך.')],
        options: [
          o('ask', t('Ask to see it and where it came from', 'לבקש לראות ולברר מאיפה זה'), s('seller', 'Gladly. The story is half the price. You may ask without buying.', 'בשמחה. הסיפור הוא חצי מהמחיר. אפשר לשאול בלי לקנות.'),
            [flag('life:master:F19:piece', 'asked'), bond('seller', 3)]),
          o('buy', t('Buy it, if you really have the money', 'לקנות, אם באמת יש כסף פנוי'), s('seller', 'Fair price, and you know it. It is yours. Mind the corner.', 'מחיר הוגן, ואתה יודע את זה. זה שלך. תיזהר מהפינה.'),
            [flag('life:master:F19:piece', 'bought'), coins(-4), heart(2)], {when: {min: ['coins', 4]}}),
          o('enough', t('Say you have enough already', 'לומר שיש לך כבר מספיק'), s('seller', 'Enough is a rare word at this table. Come, there is someone you should meet.', 'מספיק היא מילה נדירה בשולחן הזה. בוא, יש מישהו שכדאי שתפגוש.'),
            [flag('life:master:F19:piece', 'enough'), bond('seller', 2), bond('friend', 1)]),
        ],
      }),
      sc({
        id: 'F19-S2', room: 'street', who: 'kiosk', spot: 'window', slot: 'corner', verb: 'talk',
        title: t('Two of the same', 'שניים מאותו דבר'),
        lines: [
          s('kiosk', 'Is that yours? Oh, that one. Mine was the first I ever had. What about yours?', 'זה שלך? אה, זה. אצלי הוא היה הראשון שהיה לי אי פעם. ואצלך?'),
        ],
        callbacks: [
          {group: 'piece', when: is('life:master:F19:piece', 'asked'), lines: [s('kiosk', 'I heard what the seller told you. The truth is almost as good as the real thing.', 'שמעתי מה שהמוכר סיפר לך. האמת כמעט טובה כמו המקור.')]},
          {group: 'piece', when: is('life:master:F19:piece', 'bought'), lines: [s('kiosk', 'You paid money for it. I can tell from how you hold it. No, I will not guess how much.', 'שילמת על זה כסף. אפשר לראות מהאחיזה שלך. לא, לא אנחש כמה.')]},
        ],
        task: t('Answer about your copy', 'לענות על העותק שלך'),
        action: [s(null, 'Two people looking at the same small thing; each seeing a different afternoon.', 'שני אנשים מסתכלים על אותו דבר קטן; כל אחד רואה אחר צהריים אחר.')],
        options: [
          o('tell', t('Tell how you came by it', 'לספר איך הגעת אליו'), s('kiosk', 'A gift? A job? A swap? Whichever it was, I can tell it mattered.', 'מתנה? עבודה? החלפה? מה שזה לא היה, אפשר לראות שזה היה חשוב.'),
            [flag('life:master:F19:copy', 'told'), bond('kiosk', 3), heart(1)]),
          o('swap', t('Offer a specific swap', 'להציע החלפה מסוימת'), s('kiosk', 'Let me see both. Terms on the table first. Then yes or no.', 'תן לי לראות את שניהם. קודם התנאים על השולחן. אחר כך כן או לא.'),
            [flag('life:master:F19:copy', 'swap'), bond('kiosk', 2)]),
          o('keep', t('Keep it with you', 'להשאיר אצלך'), s('kiosk', 'Two of the same is not a mistake. It is a sign you love it twice.', 'שניים מאותו דבר זה לא טעות. זה סימן שאתה אוהב אותו פעמיים.'),
            [flag('life:master:F19:copy', 'kept'), heart(2)]),
        ],
      }),
      sc({
        id: 'F19-S3', room: 'room', who: 'child', spot: 'photos', slot: 'rug', verb: 'sit',
        title: t('What collection are you building', 'איזה אוסף אתה בונה'),
        lines: [
          s(null, 'You come back to the shelf. It is fuller than before, or it is exactly the same. Either way, it is yours.', 'אתה חוזר למדף. הוא מלא יותר מקודם, או בדיוק כמו שהיה. כך או כך, הוא שלך.'),
        ],
        callbacks: [
          {group: 'copy', when: is('life:master:F19:copy', 'swap'), lines: [s(null, 'The swap left one gap and one new thing, and you notice the gap first.', 'ההחלפה השאירה חור אחד ודבר חדש אחד, ואת החור אתה מבחין בו קודם.')]},
          {group: 'copy', when: is('life:master:F19:copy', 'kept'), lines: [s(null, 'Two of the same, side by side. It looks deliberate, like a rhyme.', 'שניים מאותו דבר, זה ליד זה. זה נראה מכוון, כמו חרוז.')]},
        ],
        task: t('Arrange the shelf', 'לסדר את המדף'),
        action: [s(null, 'Dust, a click, the weight of a thing going back where it belongs.', 'אבק, נקישה, המשקל של דבר שחוזר למקומו.')],
        options: [
          o('seasons', t('Arrange by season', 'לסדר לפי עונות'), s(null, 'The catalogue is orderly and honest about where it has gaps. Gaps are part of any catalogue.', 'הקטלוג מסודר וכנה לגבי החורים בו. חורים הם חלק מכל קטלוג.'),
            [flag('life:master:F19:shelf', 'seasons'), heart(1)]),
          o('people', t('Arrange by people', 'לסדר לפי אנשים'), s(null, 'A shelf of who was there when. It stops being a collection and turns into a map of company.', 'מדף של מי היה שם מתי. הוא מפסיק להיות אוסף והופך למפה של חברה.'),
            [flag('life:master:F19:shelf', 'people'), bond('friend', 2), heart(2)]),
          o('one-out', t('Leave one thing out in the open', 'להשאיר דבר אחד בחוץ'), s(null, 'One piece stands apart on the table. You will take it with you. The rest stays safe.', 'פריט אחד עומד לבד על השולחן. אותו תיקח איתך. השאר נשאר בטוח.'),
            [flag('life:master:F19:shelf', 'one'), flag('life:master:F19:carry', 'chosen'), heart(1)]),
        ],
      }),
    ],
  }),
]

import type {ChapterScript} from '../types'
import {chapter, o, s, sc, t} from '../write'
import {bond, coins, energy, flag, heart, is} from '../types'

/**
 * Master screenplay F26–F32 (bible §16, 15.10.2026): the last stretch of the shared life, ending in the private coda.
 *
 * Authored fiction only — no year, no opponent, no score, no match. F31's evening is "the evening we chose": a
 * meeting point, a companion, a night; F32 closes the master line gently and never corrects or completes anything.
 * F26 reads the distance and abroad routes, F27 and F30 read the route and the earlier favours, F29 reads the
 * first envelope and the first missing page (F06/F07), F30–F32 read what F26–F29 raised.
 */
export const MASTER_LATE: ChapterScript[] = [
  // ───────────────────────────────────────────────────────────────────────── F26 · one evening, if you want
  chapter({
    id: 'F26', age: 46, act: 3, title: t('You Can Come for One Evening', 'אפשר לבוא לערב אחד'),
    intro: t('An invitation is not a debt. It is a door left open on purpose.', 'הזמנה היא לא חוב. היא דלת שהושארה פתוחה בכוונה.'),
    keep: {id: 'one-evening-card', name: t('The card for one evening', 'הכרטיס לערב אחד'), note: t('You were asked, not claimed. It counts either way.', 'הזמינו אותך, לא תבעו אותך. זה נחשב בכל מקרה.')},
    scenes: [
      sc({
        id: 'F26-S1', room: 'kitchen', who: 'friend', after: [], spot: 'table', slot: 'table', verb: 'listen',
        title: t('The message', 'ההודעה'),
        lines: [
          s(null, 'The message is short. {friend} never wrote long ones.', 'ההודעה קצרה. {friend} אף פעם לא כתב ארוכות.'),
          s('friend', 'There is a gathering. Evening only. Come if you want.', 'יש מפגש. ערב אחד בלבד. תבוא אם בא לך.'),
        ],
        callbacks: [
          {group: 'away', when: {flag: 'life:route:dist'}, lines: [s('friend', 'I did not say come back. I said come.', 'לא אמרתי תחזור. אמרתי תבוא.')]},
          {group: 'away', when: {all: [{flag: 'life:route:abroad'}, {not: 'life:route:dist'}]}, lines: [s('friend', 'I know it is far. I checked the flights, then I felt stupid. Then I wrote anyway.', 'אני יודע שזה רחוק. בדקתי טיסות, ואז הרגשתי טיפש. ואז כתבתי בכל זאת.')]},
          {group: 'away', when: {none: [{flag: 'life:route:dist'}, {flag: 'life:route:abroad'}]}, lines: [s('friend', 'You have been steady all these years. I thought I would ask if you would bring someone new along.', 'היית יציב כל השנים. חשבתי לשאול אם תרצה להביא מישהו חדש.')]},
        ],
        task: t('Answer the message', 'לענות להודעה'),
        action: [s(null, 'You hold the phone a while. The kettle finishes boiling without you.', 'אתה מחזיק את הטלפון קצת. הקומקום מסיים לרתוח בלעדיך.')],
        options: [
          o('come', t('Say yes to the one evening', 'להגיד כן לערב אחד'), s('friend', 'Just the evening. Nobody is handing you anything back.', 'רק הערב. אף אחד לא מחזיר לך כלום.'),
            [flag('life:master:F26:answer', 'come'), bond('friend', 3), heart(1)]),
          o('after', t('Come only to the part afterwards', 'להגיע רק לחלק שאחרי'), s('friend', 'After is good. After is when we talk anyway.', 'אחרי זה טוב. אחרי זה כשמדברים בכל מקרה.'),
            [flag('life:master:F26:answer', 'after'), bond('friend', 2)]),
          o('not', t('Say not this time', 'להגיד לא הפעם'), s('friend', 'Not this time is not never. I will not ask twice in one breath.', 'לא הפעם זה לא אף פעם. אני לא אשאל פעמיים באותה נשימה.'),
            [flag('life:master:F26:answer', 'declined'), bond('friend', 1)]),
        ],
      }),
      sc({
        id: 'F26-S2', room: 'gate', who: 'friend', spot: 'board', slot: 'wait', verb: 'look', cut: true,
        title: t('Someone Is Already Doing It', 'מישהו כבר עושה את זה'),
        lines: [
          s(null, 'The place is the same. The people standing in it are slightly rearranged.', 'המקום אותו מקום. האנשים שעומדים בו קצת מסודרים אחרת.'),
          s('friend', 'You will see. It carries on without anyone asking.', 'תראה. זה ממשיך גם בלי שמישהו מבקש.'),
        ],
        callbacks: [
          {group: 'held', when: {flag: 'life:route:go'}, lines: [s('friend', 'The thing you used to carry — {child} has it now. {child} is good. Different, but good.', 'מה שנהגת לשאת — עכשיו אצל {child}. {child} טוב בזה. אחרת, אבל טוב.')]},
          {group: 'held', when: {not: 'life:route:go'}, lines: [s(null, 'Nobody has your old place, because you never had one. The group just looks different from how you remember it.', 'אף אחד לא תפס את המקום הישן שלך, כי לא היה לך כזה. החבורה פשוט נראית אחרת ממה שאתה זוכר.')]},
          {group: 'rec', when: is('life:master:F26:answer', 'after'), lines: [s(null, 'You came late, as you said you would. The best part is already folded away.', 'הגעת מאוחר, כמו שאמרת. החלק הכי טוב כבר נארז.')]},
        ],
        task: t('Find where you stand', 'למצוא איפה אתה עומד'),
        action: [s(null, 'The fence is warm from other people leaning on it.', 'הגדר חמה מאנשים אחרים שנשענו עליה.')],
        options: [
          o('crowd', t('Be in the crowd', 'להיות בקהל'), s('friend', 'Good. Nobody needs you to prove who you were.', 'טוב. אף אחד לא צריך שתוכיח מי היית.'),
            [flag('life:master:F26:place', 'crowd'), heart(1)]),
          o('help', t('Offer a small hand', 'להציע יד קטנה'), s('child', 'You can hold the other end of this. I was going to ask the wall.', 'אתה יכול להחזיק את הקצה השני. התכוונתי לבקש מהקיר.'),
            [flag('life:master:F26:place', 'helped'), bond('friend', 2), energy(-5)]),
          o('back', t('Say you would like to take it up again', 'להגיד שאתה רוצה לחזור לאחריות'), s('friend', 'Then we start it properly, with everyone. It does not just get handed back.', 'אז מתחילים את זה כמו שצריך, עם כולם. זה לא פשוט חוזר אליך.'),
            [flag('life:master:F26:place', 'reclaim'), flag('life:master:F26:process', 'new'), heart(1), energy(-5)]),
        ],
      }),
      sc({
        id: 'F26-S3', room: 'bus-stop', who: 'friend', spot: 'sign', slot: 'bench', verb: 'sit',
        title: t('How Was It', 'איך היה לך'),
        lines: [
          s(null, 'The last bus is not for a while. You both sit as if that were a plan.', 'האוטובוס האחרון רחוק. שניכם יושבים כאילו זו תוכנית.'),
          s('friend', 'How was it for you? Not for the rest of your life. Just tonight.', 'איך היה לך? לא לכל החיים. רק הערב.'),
        ],
        callbacks: [
          {when: is('life:master:F26:answer', 'declined'), lines: [s(null, 'You said not this time, and you are here anyway, by the road. That also counts as something.', 'אמרת לא הפעם, ואתה כאן בכל זאת, ליד הדרך. גם זה נחשב למשהו.')]},
        ],
        task: t('Answer him honestly', 'לענות לו בכנות'),
        action: [s(null, 'A bus goes by that is not yours. Neither of you stands up.', 'אוטובוס עובר שהוא לא שלך. אף אחד מכם לא קם.')],
        options: [
          o('again', t('Set another time', 'לקבוע עוד פעם'), s('friend', 'Next month. Small. Just us and a table.', 'בחודש הבא. קטן. רק אנחנו ושולחן.'),
            [flag('life:master:F26:after', 'again'), bond('friend', 3)]),
          o('once', t('Keep it as the one evening it was', 'לשמור את זה כערב אחד'), s('friend', 'Then that is a complete thing. It does not need a sequel.', 'אז זה דבר שלם. הוא לא צריך המשך.'),
            [flag('life:master:F26:after', 'once'), heart(2)]),
          o('hard', t('Say it is still hard', 'להגיד שעדיין קשה'), s('friend', 'Hard I can sit with. I will not turn the clock back for you. I will wait with you.', 'קשה אני יכול לשבת איתו. אני לא אחזיר את השעון אחורה בשבילך. אני אחכה איתך.'),
            [flag('life:master:F26:after', 'hard'), bond('friend', 2), heart(1)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F27 · who is waiting for whom
  chapter({
    id: 'F27', age: 48, act: 3, title: t('Who Is Waiting for Whom', 'מי מחכה למי'),
    intro: t('Once somebody took you. The question was never how to even it out.', 'פעם מישהו לקח אותך. השאלה מעולם לא הייתה איך לשלם בחזרה.'),
    keep: {id: 'favour-note', name: t('The note on a favour', 'הפתק על טובה'), note: t('Not a receipt. A reminder that it went somewhere.', 'לא קבלה. תזכורת שזה הגיע לאנשהו.')},
    scenes: [
      sc({
        id: 'F27-S1', room: 'street', who: 'elder', after: [], spot: 'crates', slot: 'doorstep', verb: 'talk',
        title: t('You Once Took Me', 'פעם לקחת אותי'),
        lines: [
          s('elder', 'You will not remember. A long time ago you waited for me when I was slow.', 'אתה לא תזכור. מזמן חיכית לי כשהייתי איטי.'),
          s('elder', 'I have a small thing to ask. It can be no.', 'יש לי בקשה קטנה. אפשר להגיד לא.'),
        ],
        callbacks: [
          {group: 'ret', when: is('life:master:F26:answer', 'come'), lines: [s('elder', '{friend} says you came to the evening. I was glad. Gladder than I will say.', '{friend} אומר שבאת לערב. שמחתי. יותר ממה שאגיד.')]},
          {group: 'ret', when: {any: [is('life:master:F26:answer', 'after'), is('life:master:F26:answer', 'declined')]}, lines: [s('elder', 'You did not come in the end. I am not counting. I am asking.', 'לא הגעת בסוף. אני לא סופר. אני שואל.')]},
          {group: 'far', when: {flag: 'life:route:abroad'}, lines: [s(null, 'You are not near. The ask arrives anyway, folded small.', 'אתה לא קרוב. הבקשה מגיעה בכל זאת, מקופלת קטן.')]},
        ],
        task: t('Decide what to do with the ask', 'להחליט מה עושים עם הבקשה'),
        action: [s(null, 'The crates by the door have been moved so many times they have a memory of their own.', 'הארגזים ליד הדלת הוזזו כל כך הרבה פעמים שיש להם זיכרון משלהם.')],
        options: [
          o('him', t('Give it back to him, as he wants', 'להחזיר לו, כפי שהוא רוצה'), s('elder', 'You do not owe me. But thank you. I will take it as a gift, not a payment.', 'אתה לא חייב לי. אבל תודה. אקבל את זה כמתנה, לא כתשלום.'),
            [flag('life:master:F27:favour', 'returned'), bond('elder', 3), energy(-5)]),
          o('pass', t('Help someone else and say where it started', 'לעזור למישהו אחר ולהגיד מאיפה זה התחיל'), s('elder', 'Pass it on, then. And tell them whose it was. That is the only interest I charge.', 'תעביר הלאה, אז. ותגיד להם של מי זה היה. זו הריבית היחידה שאני גובה.'),
            [flag('life:master:F27:favour', 'passed'), bond('elder', 2), heart(2)]),
          o('later', t('Say you cannot right now', 'להגיד שאתה לא יכול עכשיו'), s('elder', 'Then it stays where it is. It does not rot. Not this one.', 'אז זה נשאר איפה שהוא. זה לא מתקלקל. לא הדבר הזה.'),
            [flag('life:master:F27:favour', 'later'), bond('elder', 1)]),
        ],
      }),
      sc({
        id: 'F27-S2', room: 'bus-station', who: 'friend', spot: 'board', slot: 'friend', verb: 'look', cut: true,
        title: t('They Are Already On the Way', 'הם כבר בדרך'),
        lines: [
          s(null, 'Something is moving, and it is not waiting for you to be ready.', 'משהו בתנועה, והוא לא מחכה שתהיה מוכן.'),
          s('friend', 'I made a rough plan. It is only rough.', 'עשיתי תוכנית גסה. היא רק גסה.'),
        ],
        callbacks: [
          {group: 'role', when: {flag: 'life:route:go'}, lines: [s('friend', 'You always had a hand in this. I would not change it without you knowing.', 'תמיד היה לך חלק בזה. לא הייתי משנה בלי שתדע.')]},
          {group: 'role', when: {not: 'life:route:go'}, lines: [s(null, 'You are standing on the outside of the plan, watching others arrange it. It looks like a dance you never learned.', 'אתה עומד מחוץ לתוכנית ורואה אחרים מארגנים. זה נראה כמו ריקוד שלא למדת.')]},
          {group: 'fv', when: is('life:master:F27:favour', 'passed'), lines: [s('friend', 'I heard what you did for the one you helped. It travelled.', 'שמעתי מה שעשית למי שעזרת לו. זה עבר מפה לאוזן.')]},
        ],
        task: t('Take your place in the plan', 'לתפוס את המקום שלך בתוכנית'),
        action: [s(null, 'The board changes a letter at a time, the way a patient person counts.', 'הלוח משתנה אות אחרי אות, כמו אדם סבלני שסופר.')],
        options: [
          o('fit', t('Adjust the plan and pay what it costs', 'להתאים את התוכנית ולשלם את המחיר'), s('friend', 'It will cost you an afternoon, or a little money. I will not hide that.', 'זה יעלה לך אחר צהריים, או קצת כסף. לא אסתיר.'),
            [flag('life:master:F27:plan', 'adjusted'), coins(-3), energy(-8), bond('friend', 2)]),
          o('share', t('Ask for a partner, or hand a part over', 'לבקש שותף או למסור חלק'), s('child', 'I can take that part. If you tell me what it is for.', 'אני יכול לקחת את החלק הזה. אם תגיד לי בשביל מה זה.'),
            [flag('life:master:F27:plan', 'shared'), bond('friend', 3), heart(1)]),
          o('small', t('Promise less, so you can keep it', 'להבטיח פחות, כדי שתוכל לעמוד בזה'), s('friend', 'A smaller promise, kept. Better than a big one that vanishes at the door.', 'הבטחה קטנה שמתקיימת. עדיפה על גדולה שנעלמת בכניסה.'),
            [flag('life:master:F27:plan', 'smaller'), heart(2)]),
        ],
      }),
      sc({
        id: 'F27-S3', room: 'kitchen', who: 'elder', spot: 'table', slot: 'tableEnd', verb: 'talk',
        title: t('You Do Not Have to Pay Me Back', 'לא צריך להחזיר לי'),
        lines: [
          s('elder', 'You helped. Good. Now let me say what actually mattered to me.', 'עזרת. טוב. עכשיו תן לי להגיד מה באמת היה חשוב לי.'),
          s(null, 'He turns his cup a quarter turn, which is how he starts every serious sentence.', 'הוא מסובב את הכוס רבע סיבוב, כך הוא מתחיל כל משפט רציני.'),
        ],
        callbacks: [
          {group: 'k', when: is('life:master:F27:favour', 'later'), lines: [s('elder', 'You said not right now. Well, now is a good now.', 'אמרת לא עכשיו. ובכן, עכשיו זה עכשיו טוב.')]},
          {group: 'k', when: is('life:master:F27:favour', 'returned'), lines: [s('elder', 'You gave it back. I would have taken less. That is what I mean.', 'החזרת. הייתי לוקח פחות. על זה אני מדבר.')]},
        ],
        task: t('Honour the terms, whatever they are', 'לכבד את התנאים, מה שיהיו'),
        action: [s(null, 'The tea has gone cold, which neither of you will mention.', 'התה התקרר, ושניכם לא תגידו על זה כלום.')],
        options: [
          o('terms', t('Keep the original terms', 'לשמור על התנאי המקורי'), s('elder', 'Even a gift has its terms. I respect that you read them.', 'גם למתנה יש תנאים. אני מכבד שקראת אותם.'),
            [flag('life:master:F27:close', 'terms'), bond('elder', 2)]),
          o('give', t('Give him an object, if he wants one', 'לתת לו חפץ, אם הוא רוצה'), s('elder', 'This I will keep. It will sit on my shelf and look important.', 'את זה אשמור. זה ישב על המדף שלי ויראה חשוב.'),
            [flag('life:master:F27:close', 'object'), bond('elder', 3), heart(1)]),
          o('story', t('Keep the story, without an object', 'לשמור את הסיפור, בלי חפץ'), s('elder', 'A story is lighter to carry. And nobody can lose it in a move.', 'סיפור קל יותר לשאת. ואף אחד לא מאבד אותו במעבר דירה.'),
            [flag('life:master:F27:close', 'story'), heart(2)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F28 · someone else's first time
  chapter({
    id: 'F28', age: 50, act: 3, title: t("Someone Else's First Time", 'הפעם הראשונה של מישהו אחר'),
    intro: t('You remember who answered you once. Now you are the one being asked.', 'אתה זוכר מי ענה לך פעם. עכשיו אתה זה ששואלים.'),
    keep: {id: 'borrowed-thing', name: t('The thing lent or given', 'מה שהושאל או ניתן'), note: t('Written down exactly: whose it is now.', 'כתוב במדויק: של מי זה עכשיו.')},
    scenes: [
      sc({
        id: 'F28-S1', room: 'bedroom', who: 'child', after: [], spot: 'wardrobe', slot: 'byDesk', verb: 'open',
        title: t('He Asks What to Bring', 'הוא שואל מה להביא'),
        lines: [
          s('child', 'What do I need to bring? Is there a rule? I do not want to get it wrong.', 'מה צריך להביא? יש כלל? אני לא רוצה לטעות.'),
          s(null, 'You remember being asked that. You remember who answered, and how.', 'אתה זוכר שגם אותך שאלו את זה. אתה זוכר מי ענה, ואיך.'),
        ],
        callbacks: [
          {group: 'g', when: {any: [is('life:master:F27:close', 'object'), is('life:master:F27:favour', 'passed')]}, lines: [s(null, 'You have given things away before. It gets easier, and then it matters more.', 'כבר נתת דברים בעבר. זה נעשה קל יותר, ואז זה חשוב יותר.')]},
        ],
        task: t('Open the wardrobe and decide', 'לפתוח את הארון ולהחליט'),
        action: [s(null, 'Hangers sway, then settle, one after the other.', 'קולבים מתנדנדים, ואז נרגעים, אחד אחרי השני.')],
        options: [
          o('lend', t('Offer something to borrow', 'להציע משהו להשאלה'), s('child', 'Borrow? I will bring it back. Exactly as it is. I promise.', 'להשאיל? אחזיר. בדיוק כמו שהוא. אני מבטיח.'),
            [flag('life:master:F28:bring', 'lent'), bond('child', 2), heart(1)]),
          o('give', t('Give something as a gift', 'לתת משהו במתנה'), s('child', 'For me? To keep? But what will you wear?', 'בשבילי? לשמור? אבל מה אתה תלבש?'),
            [flag('life:master:F28:bring', 'gave'), bond('child', 3), heart(1), coins(-1)]),
          o('nothing', t('Say he need not bring anything', 'להגיד שלא חייבים להביא כלום'), s('child', 'Nothing? Just me? That is easier. That is a bit scary, but easier.', 'כלום? רק אני? זה קל יותר. זה קצת מפחיד, אבל קל יותר.'),
            [flag('life:master:F28:bring', 'nothing'), bond('child', 2)]),
        ],
      }),
      sc({
        id: 'F28-S2', room: 'terrace', who: 'child', spot: 'pitch', slot: 'left', verb: 'look', cut: true,
        title: t('Not What You Thought', 'לא כמו שחשבת'),
        lines: [
          s('child', 'Can we go over there instead? I want to see how it looks from the other side.', 'אפשר ללכת לשם במקום? אני רוצה לראות איך זה נראה מהצד השני.'),
          s(null, 'It is not the way you did it. It never has to be the way you did it.', 'זה לא כמו שאתה עשית. זה לא חייב להיות כמו שאתה עשית.'),
        ],
        callbacks: [
          {group: 'b', when: is('life:master:F28:bring', 'gave'), lines: [s(null, 'He wears the thing you gave him, a size too big, and stands a little taller in it.', 'הוא לובש את מה שנתת לו, מידה אחת גדול מדי, ועומד בו קצת יותר גבוה.')]},
          {group: 'b', when: is('life:master:F28:bring', 'lent'), lines: [s(null, 'He keeps checking his pocket for what you lent. It is the most careful anyone has ever been.', 'הוא בודק כל הזמן את הכיס, שם מה שהשאלת. אף אחד לא היה אף פעם זהיר כל כך.')]},
        ],
        task: t('Choose where to stand with him', 'לבחור איפה לעמוד איתו'),
        action: [s(null, 'The air is the same. The two of you are not looking at the same thing.', 'האוויר אותו אוויר. שניכם לא מסתכלים על אותו דבר.')],
        options: [
          o('go', t('Go where he wants to go', 'ללכת איתו לאן שהוא רוצה'), s('child', 'This is good. You can see the whole thing from here. You missed nothing.', 'זה טוב. רואים את הכול מכאן. לא פספסת כלום.'),
            [flag('life:master:F28:moment', 'went'), bond('child', 3), heart(1)]),
          o('time', t('Ask for a little more time, and hear his answer', 'לבקש עוד קצת זמן ולשמוע מה הוא עונה'), s('child', 'Yes. But only a little. I will wait, I promise. A little.', 'כן. אבל רק קצת. אחכה, אני מבטיח. קצת.'),
            [flag('life:master:F28:moment', 'asked'), bond('child', 2)]),
          o('safe', t('Part for a while, only with a plan he can use', 'להיפרד לזמן מה, רק עם תוכנית שמתאימה לו'), s('child', 'We meet at the same spot. If I am not there, I wait. If you are not there, you wait.', 'נפגשים באותו מקום. אם אני לא שם, אני מחכה. אם אתה לא שם, אתה מחכה.'),
            [flag('life:master:F28:moment', 'planned'), bond('child', 1), energy(-5)]),
        ],
      }),
      sc({
        id: 'F28-S3', room: 'bus-stop', who: 'child', spot: 'sign', slot: 'bench', verb: 'sit',
        title: t('What He Remembers', 'מה הוא זוכר'),
        lines: [
          s('child', 'Do you know what I noticed? The man by the gate was humming. Just under his breath.', 'אתה יודע מה שמתי לב? האיש ליד השער זימזם. בקושי, מתחת לנשימה.'),
          s(null, 'You were looking elsewhere. He saw something that was not yours to see.', 'אתה הסתכלת במקום אחר. הוא ראה משהו שלא היה שלך לראות.'),
        ],
        task: t('Answer what he tells you', 'להגיב למה שהוא מספר'),
        action: [s(null, 'The bus is late, which gives the evening a little more room.', 'האוטובוס מאחר, מה שנותן לערב עוד קצת מקום.')],
        options: [
          o('hear', t('Listen, and let it be his', 'להקשיב ולתת לזה להישאר שלו'), s('child', 'You are not going to correct it? Oh. Good. I thought you would.', 'אתה לא הולך לתקן? אה. טוב. חשבתי שתתקן.'),
            [flag('life:master:F28:memory', 'heard'), bond('child', 3), heart(1)]),
          o('mine', t('Tell a short moment of your own', 'לספר רגע קצר משלך'), s('child', 'Really? That happened to you too? Not as a test? Okay. Tell me.', 'באמת? גם לך זה קרה? לא כמבחן? בסדר. ספר לי.'),
            [flag('life:master:F28:memory', 'shared'), bond('child', 2), heart(1)]),
          o('again', t('Ask if he would want to come again', 'לשאול אם הוא ירצה שוב'), s('child', 'Maybe. Not sure. Can I tell you next week? Is that allowed?', 'אולי. לא בטוח. אפשר להגיד לך בשבוע הבא? מותר?'),
            [flag('life:master:F28:memory', 'asked'), bond('child', 1)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F29 · the page left open
  chapter({
    id: 'F29', age: 54, act: 3, title: t('The Page Left Open', 'הדף שנשאר פתוח'),
    intro: t('A box is opened. Not everything in it is finished, and that is allowed.', 'קופסה נפתחת. לא כל מה שבתוכה גמור, וזה מותר.'),
    keep: {id: 'open-page', name: t('The page left open', 'הדף שנשאר פתוח'), note: t('What you still have, and what you decided to leave be.', 'מה שנשאר אצלך, ומה שהחלטת להשאיר.')},
    scenes: [
      sc({
        id: 'F29-S1', room: 'bedroom', who: 'friend', after: [], spot: 'box', slot: 'rug', verb: 'open',
        title: t('I Found This', 'מצאתי את זה'),
        lines: [
          s('friend', 'I was clearing a shelf and I found the old box. Look. Your handwriting.', 'פיניתי מדף ומצאתי את הקופסה הישנה. תראה. הכתב שלך.'),
          s(null, 'The lid comes off in two stages, like a decision that has been put off before.', 'המכסה יורד בשני שלבים, כמו החלטה שנדחתה כבר פעם.'),
        ],
        callbacks: [
          {group: 'fav', when: {any: [is('life:master:F06:fav', 'chosen'), is('life:master:F06:fav', 'trade')]}, lines: [s('friend', 'There is the one you picked that first day. The one you said was yours. I remember how you held it.', 'הנה זה שבחרת באותו יום ראשון. זה שאמרת שהוא שלך. אני זוכר איך החזקת אותו.')]},
          {group: 'fav', when: {none: [is('life:master:F06:fav', 'chosen'), is('life:master:F06:fav', 'trade')]}, lines: [s('friend', 'No big album, I know. Just a few things and a day we shared. That is also an open box.', 'אין אלבום גדול, אני יודע. רק כמה דברים ויום שחלקנו. גם זו קופסה פתוחה.')]},
          {group: 'gap', when: {any: [is('life:master:F07:gap', 'kept'), is('life:master:F07:gap', 'left')]}, lines: [s('friend', 'And there is the empty place. The one we went all the way for.', 'והנה המקום הריק. זה שהלכנו בשבילו עד הסוף.')]},
        ],
        task: t('Choose where to begin', 'לבחור מאיפה מתחילים'),
        action: [s(null, 'Paper that has been folded for years remembers its folds more than its words.', 'נייר שקופל שנים זוכר את הקפלים יותר מהמילים.')],
        options: [
          o('loved', t('Begin with the one you loved', 'להתחיל מהפריט האהוב'), s('friend', 'Then read what it really says. Not the story. The label, the corner, the stain.', 'אז תקרא מה כתוב עליו באמת. לא הסיפור. התווית, הפינה, הכתם.'),
            [flag('life:master:F29:start', 'loved'), heart(2), bond('friend', 2)]),
          o('gap', t('Begin with what is missing', 'להתחיל ממה שחסר'), s('friend', 'The gap has its own story. Maybe you chose not to fill it. Or someone you never asked.', 'לחוסר יש סיפור משלו. אולי בחרת לא למלא אותו. או מישהו שלא ביקשת ממנו.'),
            [flag('life:master:F29:start', 'gap'), heart(1), bond('friend', 1)]),
          o('close', t('Close it and talk about something else', 'לסגור ולדבר על משהו אחר'), s('friend', 'The box is not an assignment. It will be here when you want it, and when you do not.', 'הקופסה היא לא משימה. היא תהיה כאן כשתרצה, וכשלא.'),
            [flag('life:master:F29:start', 'closed'), energy(5)]),
        ],
      }),
      sc({
        id: 'F29-S2', room: 'kitchen', who: 'friend', spot: 'table', slot: 'table', verb: 'talk',
        title: t('Who Held It Before', 'מי החזיק קודם'),
        lines: [
          s('friend', 'This one. Somebody had it before you. I only half remember who.', 'זה. מישהו החזיק בו לפניך. אני זוכר רק חצי מי.'),
          s(null, 'He does not pretend to recall more than he does. He leaves a space where the rest should be.', 'הוא לא מעמיד פנים שהוא זוכר יותר ממה שהוא זוכר. הוא משאיר מקום ריק איפה שהשאר צריך להיות.'),
        ],
        callbacks: [
          {group: 'trade', when: is('life:master:F07:deal', 'filled'), lines: [s('friend', 'This is the one you traded for, remember? You sat on that stairwell for an hour.', 'זה זה שהחלפת עליו, זוכר? ישבת על חדר המדרגות ההוא שעה.')]},
          {group: 'trade', when: is('life:master:F07:offer', 'promise'), lines: [s('friend', 'This one came with a promise attached. Did you ever keep it?', 'את זה קיבלת עם הבטחה. קיימת אותה בסוף?')]},
          {group: 'st', when: is('life:master:F29:start', 'gap'), lines: [s(null, 'You came to the empty place first. It makes the full ones look like guests.', 'הגעת קודם למקום הריק. זה גורם לאלה המלאים להיראות כמו אורחים.')]},
        ],
        task: t('Tell the story as it was', 'לספר את הסיפור כמו שהיה'),
        action: [s(null, 'The kettle clicks off. Nobody gets up to make anything.', 'הקומקום נכבה. אף אחד לא קם להכין כלום.')],
        options: [
          o('who', t('Tell who gave it', 'לספר מי נתן'), s('friend', 'I had forgotten that name. I am glad you said it.', 'שכחתי את השם הזה. טוב ששמעתי אותו ממך.'),
            [flag('life:master:F29:told', 'giver'), bond('friend', 2), heart(1)]),
          o('paid', t('Tell what it cost you', 'לספר מה זה עלה לך'), s('friend', 'Time, then. A favour. Not money. It figures.', 'זמן, אז. טובה. לא כסף. הגיוני.'),
            [flag('life:master:F29:told', 'cost'), heart(1), bond('friend', 1)]),
          o('forget', t('Admit that you do not remember everything', 'להודות שאינך זוכר הכול'), s('friend', 'Then we leave the spaces. A page with honest spaces is better than one with tidy lies.', 'אז נשאיר את החללים. דף עם חללים כנים טוב יותר מדף עם שקרים מסודרים.'),
            [flag('life:master:F29:told', 'unsure'), heart(2)]),
        ],
      }),
      sc({
        id: 'F29-S3', room: 'room', who: 'friend', spot: 'photos', slot: 'sofa', verb: 'look',
        title: t('Where It Goes Now', 'לאן זה הולך עכשיו'),
        lines: [
          s('friend', 'Does it all stay with you? It does not have to go on. Some things are done being passed.', 'הכול נשאר אצלך? לא חייבים להמשיך הלאה. דברים מסוימים סיימו להיות מועברים.'),
          s(null, 'The photographs on the wall have stopped trying to be a complete set.', 'התמונות שעל הקיר הפסיקו לנסות להיות סט שלם.'),
        ],
        callbacks: [
          {when: is('life:master:F28:bring', 'gave'), lines: [s(null, 'You already gave one thing away this decade. You know what the empty hook feels like.', 'כבר נתת דבר אחד בעשור הזה. אתה יודע איך נראה הקרס הריק.')]},
        ],
        task: t('Decide where it lives now', 'להחליט איפה זה גר עכשיו'),
        action: [s(null, 'You hold the page up to the lamp. It is lighter than you expected.', 'אתה מרים את הדף אל המנורה. הוא קל ממה שציפית.')],
        options: [
          o('keep', t('Keep it with you, in a place of your own', 'להשאיר אצלך, במקום משלך'), s('friend', 'Where you can see it. Not locked away. Choose the wall.', 'איפה שרואים. לא נעול. תבחר קיר.'),
            [flag('life:master:F29:fate', 'kept'), heart(2)]),
          o('pass', t('Give one piece to someone who wants it', 'למסור פריט אחד למי שרוצה'), s('friend', 'The thing goes. The memory stays. That is how it works.', 'הדבר הולך. הזיכרון נשאר. ככה זה עובד.'),
            [flag('life:master:F29:fate', 'passed'), bond('friend', 2), heart(1)]),
          o('carry', t('Choose one thing to take to the next evening', 'לבחור דבר אחד לקחת לערב הבא'), s('friend', 'Only if it is truly yours. We will see what you pick.', 'רק אם הוא באמת שלך. נראה מה תבחר.'),
            [flag('life:master:F29:fate', 'carry'), bond('friend', 1), heart(1)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F30 · who holds the tickets
  chapter({
    id: 'F30', age: 58, act: 3, title: t('Who Holds the Tickets', 'מי מחזיק את הכרטיסים'),
    intro: t('The last big evening gets planned the way every good one did: by people.', 'הערב הגדול האחרון מתוכנן כמו כל ערב טוב: על ידי אנשים.'),
    keep: {id: 'plan-for-two', name: t('The plan', 'התוכנית'), note: t('No prize for preparing. Only the choosing.', 'אין פרס על ההכנה. רק הבחירה.')},
    scenes: [
      sc({
        id: 'F30-S1', room: 'kitchen', who: 'friend', after: [], spot: 'table', slot: 'tableEnd', verb: 'talk',
        title: t('The Offer', 'ההצעה'),
        lines: [
          s(null, 'You lay out the idea on the table, between two cups.', 'אתה פורס את הרעיון על השולחן, בין שתי כוסות.'),
          s('friend', 'What would you want your last big evening to look like?', 'איך היית רוצה שהערב הגדול האחרון שלך ייראה?'),
        ],
        callbacks: [
          {group: 'who', when: {any: [is('life:master:F26:after', 'again'), is('life:master:F27:favour', 'passed')]}, lines: [s('friend', 'I know who I would ask, after the last few years. The question is whether you would.', 'אני יודע את מי הייתי מבקש, אחרי השנים האחרונות. השאלה אם אתה היית.')]},
          {group: 'who', when: {all: [{flag: 'life:route:dist'}, {not: 'life:master:F26:after'}]}, lines: [s('friend', 'You can plan one that needs nobody to forgive anything. That is allowed too.', 'אפשר לתכנן אחד שלא צריך שאף אחד יסלח על כלום. גם זה מותר.')]},
          {group: 'ab', when: {flag: 'life:route:abroad'}, lines: [s(null, 'A plan that crosses a border is a plan with a longer shadow. You both know that.', 'תוכנית שחוצה גבול היא תוכנית עם צל ארוך יותר. שניכם יודעים.')]},
        ],
        task: t('Say what you would like', 'להגיד מה היית רוצה'),
        action: [s(null, 'The sugar bowl stays between you like a neutral country.', 'קערת הסוכר נשארת ביניכם כמו מדינה ניטרלית.')],
        options: [
          o('invite', t('Invite someone to a gathering that fits the plan', 'להזמין מישהו למפגש שמתאים לתוכנית'), s('friend', 'They can say yes, no, or "can it be a day later". All three are real answers.', 'הם יכולים להגיד כן, לא, או "אפשר יום אחרי". כל שלוש הן תשובות אמיתיות.'),
            [flag('life:master:F30:plan', 'invite'), bond('friend', 2), heart(1)]),
          o('home', t('Choose a full evening at home', 'לבחור ערב ביתי מלא'), s('friend', 'Nobody has to fly anywhere to earn an ending. A kitchen is enough.', 'אף אחד לא צריך לטוס לשום מקום כדי להרוויח סוף. מטבח מספיק.'),
            [flag('life:master:F30:plan', 'home'), heart(2), coins(2)]),
          o('self', t('Plan an evening for yourself', 'לתכנן ערב לעצמך'), s('friend', 'That is not a consolation prize. That is a plan. Go on, tell me the first stop.', 'זה לא פרס ניחומים. זו תוכנית. נו, תגיד לי מה התחנה הראשונה.'),
            [flag('life:master:F30:plan', 'self'), heart(2)]),
        ],
      }),
      sc({
        id: 'F30-S2', room: 'route', who: 'friend', spot: 'sign', slot: 'corner', verb: 'go', cut: true,
        title: t('The Way, at Our Pace', 'הדרך בקצב שלנו'),
        lines: [
          s(null, 'The road to the meeting place is not long, but it is not as short as it used to be.', 'הדרך למקום המפגש לא ארוכה, אבל היא לא קצרה כמו פעם.'),
          s('friend', 'Straight line, or the one with a place to sit halfway?', 'קו ישר, או זו עם מקום לשבת באמצע?'),
        ],
        callbacks: [
          {group: 'p', when: is('life:master:F30:plan', 'invite'), lines: [s(null, 'The other person has their own pace. The route has to work for two.', 'לאדם השני יש קצב משלו. המסלול צריך להתאים לשניים.')]},
          {group: 'p', when: is('life:master:F30:plan', 'self'), lines: [s(null, 'It is only your pace to think about. That is its own luxury.', 'זה רק הקצב שלך לחשוב עליו. זו מותרות משלה.')]},
          {group: 'f', when: is('life:master:F27:plan', 'shared'), lines: [s('friend', 'You know how to hand a part over now. Use that.', 'אתה כבר יודע למסור חלק. תשתמש בזה.')]},
        ],
        task: t('Choose the way', 'לבחור את הדרך'),
        action: [s(null, 'A signpost points three ways and agrees with none of them.', 'שלט מצביע לשלושה כיוונים ולא מסכים עם אף אחד.')],
        options: [
          o('direct', t('Take the direct way, if it suits everyone', 'לקחת את הדרך הישירה, אם היא מתאימה לכולם'), s('friend', 'Direct is good when everyone can do it. Ask first.', 'ישיר זה טוב כשכולם יכולים. תשאל קודם.'),
            [flag('life:master:F30:way', 'direct'), energy(-8)]),
          o('easy', t('Pay or give time for the easier way', 'לשלם או להקדיש זמן לדרך הנוחה'), s('friend', 'Easier costs more. It is not better, only gentler. I will say the price out loud.', 'נוח עולה יותר. זה לא יותר טוב, רק עדין יותר. אגיד את המחיר בקול.'),
            [flag('life:master:F30:way', 'easy'), coins(-4), energy(3)]),
          o('lead', t('Ask someone else to lead a part', 'לבקש ממישהו אחר להוביל חלק'), s('child', 'Me? Can I? I know a quicker turn, but it is not very pretty.', 'אני? אפשר? אני מכיר פנייה קצרה יותר, אבל היא לא ממש יפה.'),
            [flag('life:master:F30:way', 'shared'), bond('child', 2), heart(1)]),
        ],
      }),
      sc({
        id: 'F30-S3', room: 'bedroom', who: 'friend', spot: 'wardrobe', slot: 'byDoor', verb: 'open',
        title: t('What You Take', 'מה לוקחים'),
        lines: [
          s(null, 'The wardrobe holds only what is truly there. Nothing is hung for show.', 'בארון רק מה שבאמת קיים. שום דבר לא תלוי לראווה.'),
          s('friend', 'Take what is yours. Nothing has to win.', 'קח מה שהוא שלך. שום דבר לא צריך לנצח.'),
        ],
        callbacks: [
          {group: 'a', when: is('life:master:F29:fate', 'carry'), lines: [s(null, 'You had already decided on one thing, back at the open page. It is right there on the shelf.', 'כבר החלטת על דבר אחד, שם, ליד הדף הפתוח. הוא ממש כאן על המדף.')]},
          {group: 'a', when: is('life:master:F29:fate', 'passed'), lines: [s(null, 'There is a space where a thing used to hang. You pass it without stopping.', 'יש רווח איפה שפעם תלוי היה דבר. אתה עובר לידו בלי לעצור.')]},
        ],
        task: t('Choose what goes with you', 'לבחור מה הולך איתך'),
        action: [s(null, 'The door of the wardrobe gives a small, familiar complaint.', 'דלת הארון משמיעה תלונה קטנה ומוכרת.')],
        options: [
          o('wear', t('Wear something with a history', 'ללבוש משהו עם היסטוריה'), s('friend', 'Good. I know where that came from. Do you?', 'טוב. אני יודע מאיפה זה. ואתה?'),
            [flag('life:master:F30:take', 'worn'), heart(2)], {wearAdd: 'scarf'}),
          o('show', t('Take a small thing to show someone', 'לקחת חפץ קטן להראות למישהו'), s('friend', 'Then put it in your pocket where your hand can find it.', 'אז שים אותו בכיס איפה שהיד תמצא אותו.'),
            [flag('life:master:F30:take', 'carried'), bond('friend', 1), heart(1)]),
          o('none', t('Go without a keepsake', 'לצאת בלי מזכרת'), s('friend', 'Then the evening is made of people and doing. That is enough.', 'אז הערב עשוי מאנשים ומעשים. זה מספיק.'),
            [flag('life:master:F30:take', 'none'), heart(1)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F31 · the evening we chose
  chapter({
    id: 'F31', age: 60, act: 3, title: t('The Evening We Chose', 'הערב שבחרנו'),
    intro: t('It is the evening that was planned. It does not need to be anything else.', 'זה הערב שתוכנן. הוא לא צריך להיות שום דבר אחר.'),
    keep: {id: 'evening-we-chose', name: t('The evening we chose', 'הערב שבחרנו'), note: t('A ticket or a photograph only if it was really there.', 'כרטיס או תמונה רק אם הם באמת היו שם.')},
    scenes: [
      sc({
        id: 'F31-S1', room: 'street', who: 'friend', after: [], spot: 'window', slot: 'corner', verb: 'talk',
        title: t('At the Point We Agreed', 'בנקודה שסיכמנו'),
        lines: [
          s(null, 'The meeting place is a corner, a doorstep, or your own front room. It depends on the plan.', 'מקום המפגש הוא פינה, מפתן, או הסלון שלך. תלוי בתוכנית.'),
          s('friend', 'Are the tickets with you? If we need tickets. If not, are the keys?', 'הכרטיסים אצלך? אם צריך כרטיסים. ואם לא, המפתחות?'),
        ],
        callbacks: [
          {group: 'pl', when: is('life:master:F30:plan', 'invite'), lines: [s(null, 'Someone you asked is here. They came by their own choice, which is the only kind that counts.', 'מישהו שהזמנת כאן. הוא בא מרצונו, וזה הסוג היחיד שנחשב.')]},
          {group: 'pl', when: is('life:master:F30:plan', 'home'), lines: [s(null, 'You begin at home, with the table already laid. Starting where you live is also starting.', 'אתה מתחיל בבית, עם שולחן ערוך. להתחיל איפה שאתה גר זה גם להתחיל.')]},
          {group: 'pl', when: is('life:master:F30:plan', 'self'), lines: [s(null, 'You set out alone, and it does not feel lonely. It feels like a decision you made on purpose.', 'אתה יוצא לבד, וזה לא מרגיש בדידות. זה מרגיש כמו החלטה שקיבלת בכוונה.')]},
        ],
        task: t('Start the evening', 'להתחיל את הערב'),
        action: [s(null, 'There is a small pause where each of you waits for the other to begin.', 'יש הפסקה קטנה שבה כל אחד מחכה שהשני יתחיל.')],
        options: [
          o('lead', t('Lead, along the way you prepared', 'להוביל, בדרך שהכנת'), s('friend', 'Lead on. I will stop where you stop. Every stop was your idea.', 'תוביל. אעצור איפה שתעצור. כל עצירה הייתה רעיון שלך.'),
            [flag('life:master:F31:start', 'led'), heart(2), energy(-5)]),
          o('beside', t('Walk beside, and let them pick a detail', 'ללכת לצד, ולתת להם לבחור פרט'), s('friend', 'One thing of mine in it, then. A small one. A side street.', 'אז דבר אחד משלי בזה. קטן. רחוב צדדי.'),
            [flag('life:master:F31:start', 'beside'), bond('friend', 3), heart(1)]),
          o('change', t('Change the plan, because of something real', 'לשנות תוכנית, בגלל משהו אמיתי'), s('friend', 'Late is fine. Home is fine. Real is better than perfect.', 'מאוחר זה בסדר. בבית זה בסדר. אמיתי עדיף על מושלם.'),
            [flag('life:master:F31:start', 'changed'), heart(1), energy(5)]),
        ],
      }),
      sc({
        id: 'F31-S2', room: 'terrace', who: 'friend', spot: 'banner', slot: 'right', verb: 'look', cut: true,
        title: t('While It Is Happening', 'בזמן שזה קורה'),
        lines: [
          s(null, 'It is happening, and you are in the room where it happens, whatever room that turns out to be.', 'זה קורה, ואתה בחדר שבו זה קורה, יהיה החדר אשר יהיה.'),
          s(null, 'You see faces. You see the light on them. The rest keeps its own count.', 'אתה רואה פרצופים. אתה רואה את האור עליהם. השאר סופר את עצמו.'),
        ],
        callbacks: [
          {group: 'o', when: is('life:master:F31:start', 'changed'), lines: [s(null, 'You came later than planned, and the room has a different glow for it.', 'הגעת מאוחר מהמתוכנן, ולחדר יש בגלל זה זוהר אחר.')]},
          {group: 'o', when: is('life:master:F30:take', 'worn'), lines: [s(null, 'What you are wearing gets noticed once, kindly, and not again.', 'מה שאתה לובש מוּבָחן פעם אחת, באדיבות, ולא שוב.')]},
        ],
        task: t('Be where you are', 'להיות איפה שאתה'),
        action: [s(null, 'Voices rise and fall, none of them aimed at you, all of them including you.', 'קולות עולים ויורדים, אף אחד לא מכוון אליך, כולם כוללים אותך.')],
        options: [
          o('stay', t('Stay inside the moment, with those who came', 'להישאר בתוך הרגע, עם מי שבא'), s('friend', 'Look. That is all there is. Us, and this.', 'תראה. זה כל מה שיש. אנחנו, והדבר הזה.'),
            [flag('life:master:F31:during', 'stayed'), bond('friend', 3), heart(2)]),
          o('record', t('Capture one specific thing', 'לתעד דבר מסוים'), s('friend', 'A picture that is only yours. No archive wants it. Good.', 'תמונה שהיא רק שלך. שום ארכיון לא רוצה אותה. טוב.'),
            [flag('life:master:F31:during', 'captured'), heart(1)]),
          o('step', t('Step away, if you need to', 'לצאת או להתרחק, אם צריך'), s('friend', 'Go. We will be where you left us. What you did not see, you will not pretend to remember.', 'לך. נהיה איפה שהשארת אותנו. מה שלא ראית, לא תעמיד פנים שאתה זוכר.'),
            [flag('life:master:F31:during', 'stepped'), energy(8)]),
        ],
      }),
      sc({
        id: 'F31-S3', room: 'kitchen', who: 'friend', spot: 'radio', slot: 'counter', verb: 'listen',
        title: t('Who Do You Tell', 'למי אומרים'),
        lines: [
          s(null, 'It is over, or it has become the thing after. The quiet that follows is not empty.', 'זה נגמר, או שזה הפך לדבר שאחרי. השקט שאחרי לא ריק.'),
          s(null, 'Someone who is not here crosses your mind. They do not appear. They are simply remembered.', 'מישהו שאינו כאן עולה בדעתך. הוא לא מופיע. הוא רק נזכר.'),
        ],
        callbacks: [
          {group: 'd', when: is('life:master:F31:during', 'captured'), lines: [s(null, 'You have one picture in your pocket. It is enough to start a sentence.', 'יש לך תמונה אחת בכיס. מספיק כדי להתחיל משפט.')]},
          {group: 'd', when: is('life:master:F31:during', 'stepped'), lines: [s(null, 'You were outside for some of it. That part you will not make up.', 'היית בחוץ בחלק מזה. את החלק הזה לא תמציא.')]},
        ],
        task: t('Decide who hears it first', 'להחליט מי שומע ראשון'),
        action: [s(null, 'The radio hums with nothing on it. It is a good sound to think under.', 'הרדיו מזמזם בלי כלום עליו. זה צליל טוב לחשוב תחתיו.')],
        options: [
          o('call', t('Reach out to someone close and available', 'לפנות למישהו קרוב וזמין'), s('friend', 'Call. They will hear what is in your voice before the words.', 'תתקשר. הם ישמעו מה שיש בקול לפני המילים.'),
            [flag('life:master:F31:told', 'called'), bond('friend', 2), heart(1)]),
          o('here', t('Stay with whoever is here', 'להישאר עם מי שכאן'), s('friend', 'Then say nothing. We have this table, and I am not going anywhere.', 'אז אל תגיד כלום. יש לנו את השולחן הזה, ואני לא הולך לשום מקום.'),
            [flag('life:master:F31:told', 'here'), bond('friend', 3)]),
          o('self', t('Keep it to yourself', 'לשמור לעצמך'), s(null, 'You do not tell anyone. The evening does not mind. It was never asking to be told.', 'אתה לא מספר לאף אחד. הערב לא מתנגד. הוא מעולם לא ביקש שיספרו עליו.'),
            [flag('life:master:F31:told', 'kept'), heart(2)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F32 · the road home
  chapter({
    id: 'F32', age: 62, act: 3, title: t('The Road Home', 'הדרך הביתה'),
    intro: t('Nothing here corrects anything. It only walks, the way people walk home.', 'שום דבר כאן לא מתקן כלום. זה רק הולך, כמו שאנשים הולכים הביתה.'),
    keep: {id: 'road-home', name: t('The road home', 'הדרך הביתה'), note: t('Who walked it with you, and what you carried.', 'מי הלך איתך, ומה נשאת.')},
    scenes: [
      sc({
        id: 'F32-S1', room: 'street', who: 'friend', after: [], spot: 'window', slot: 'kerb', verb: 'go',
        title: t('Who Goes First', 'מי הולך ראשון'),
        lines: [
          s('friend', 'Which way are we going? I would go either way.', 'לאן הולכים? אני הייתי הולך לכל כיוון.'),
          s(null, 'Alone, you would reach the turn you chose once, a long time ago, and recognise it.', 'לבד, היית מגיע לפנייה שבחרת פעם, מזמן, ומזהה אותה.'),
        ],
        callbacks: [
          {group: 'c', when: {any: [is('life:master:F31:told', 'called'), is('life:master:F31:told', 'here')]}, lines: [s(null, 'Someone walks next to you. The pavement is wide enough for two, as it always was.', 'מישהו הולך לידך. המדרכה רחבה מספיק לשניים, כמו תמיד.')]},
          {group: 'c', when: is('life:master:F31:told', 'kept'), lines: [s(null, 'You walk with your own company. It talks less, and listens better.', 'אתה הולך בחברת עצמך. היא מדברת פחות, ומקשיבה טוב יותר.')]},
        ],
        task: t('Choose the way home', 'לבחור את הדרך הביתה'),
        action: [s(null, 'The street lights come on one at a time, like a polite audience.', 'פנסי הרחוב נדלקים אחד אחד, כמו קהל מנומס.')],
        options: [
          o('lead', t('Lead by the way you know', 'להוביל בדרך שאתה מכיר'), s(null, 'You take the turn you know. It means something different tonight, and you let it.', 'אתה פונה בפנייה שאתה מכיר. הערב היא אומרת משהו אחר, ואתה נותן לה.'),
            [flag('life:master:F32:way', 'led'), heart(2)]),
          o('let', t('Let the other choose', 'לתת לאחר לבחור'), s('friend', 'The long way round, then. I like the long way round. It has better doors.', 'אז בדרך הארוכה. אני אוהב את הדרך הארוכה. יש לה דלתות יפות יותר.'),
            [flag('life:master:F32:way', 'let'), bond('friend', 3), heart(1)]),
          o('linger', t('Stay a moment longer', 'להישאר עוד רגע'), s(null, 'You stand where you are. Nothing asks you to arrive anywhere yet.', 'אתה עומד איפה שאתה. שום דבר לא מבקש ממך להגיע לאנשהו עדיין.'),
            [flag('life:master:F32:way', 'lingered'), energy(5), heart(1)]),
        ],
      }),
      sc({
        id: 'F32-S2', room: 'room', who: 'friend', spot: 'photos', slot: 'window', verb: 'look',
        title: t('What Stays With Whom', 'מה נשאר אצל מי'),
        lines: [
          s(null, 'The front room is as you left it, which is to say, slightly different, which is how rooms stay alive.', 'הסלון כמו שהשארת אותו, כלומר קצת אחר, כך חדרים נשארים חיים.'),
          s(null, 'Whatever you carried, whatever you gave, sits somewhere in it. Only what is real is named.', 'מה שנשאת, מה שנתת, יושב איפשהו בו. רק מה שאמיתי מוזכר.'),
        ],
        callbacks: [
          {group: 'o', when: is('life:master:F29:fate', 'kept'), lines: [s(null, 'The page you kept hangs where you decided. It looks a little more at home every year.', 'הדף ששמרת תלוי איפה שהחלטת. הוא נראה קצת יותר בבית עם כל שנה.')]},
          {group: 'o', when: is('life:master:F29:fate', 'passed'), lines: [s(null, 'What you gave away is on someone else\'s wall now. You can see the shape of it from here.', 'מה שנתת עכשיו על הקיר של מישהו אחר. אתה יכול לראות את הצורה שלו מכאן.')]},
          {group: 'o', when: {flag: 'life:master:F28:bring'}, lines: [s(null, 'A younger person is out there with something that was yours first. It is in good hands.', 'אדם צעיר ממך נמצא שם עם משהו שהיה שלך קודם. הוא ביד טובה.')]},
        ],
        task: t('Decide what stays where', 'להחליט מה נשאר איפה'),
        action: [s(null, 'The frames are all slightly crooked in the way that means they have been touched with love.', 'כל המסגרות עקומות קצת, כמו שקורה כשנוגעים בהן באהבה.')],
        options: [
          o('keep', t('Keep it, with no need to pass everything on', 'לשמור, בלי צורך להעביר הכול הלאה'), s(null, 'Some things are meant to stay in the house they were loved in. This is one.', 'יש דברים שנועדו להישאר בבית שאהבו אותם בו. זה אחד מהם.'),
            [flag('life:master:F32:stay', 'kept'), heart(2)]),
          o('offer', t('Offer a handover to someone who wants it', 'להציע למסור למי שרוצה'), s('friend', 'I will take it. Not to keep it better than you. To keep you in it.', 'אני אקח. לא כדי לשמור טוב ממך. כדי לשמור אותך בתוכו.'),
            [flag('life:master:F32:stay', 'handed'), bond('friend', 3), heart(1)]),
          o('tell', t('Tell it, or stay silent, without an object', 'לספר או לשתוק, בלי חפץ'), s(null, 'You tell a little, or you do not. The story does not need a shelf.', 'אתה מספר קצת, או לא. לסיפור לא צריך מדף.'),
            [flag('life:master:F32:stay', 'told'), heart(2)]),
        ],
      }),
      sc({
        id: 'F32-S3', room: 'kitchen', who: 'friend', spot: 'window', slot: 'table', verb: 'sit',
        title: t('One More Saturday', 'עוד שבת'),
        lines: [
          s(null, 'The window looks out onto an ordinary evening. Three, perhaps four, memories come to the table by themselves.', 'החלון נשקף על ערב רגיל. שלושה, אולי ארבעה, זיכרונות מגיעים לשולחן מעצמם.'),
          s(null, 'Someone who was there. A bond that held. A choice. A thing, or the space where a thing was.', 'מישהו שהיה שם. קשר שהחזיק. בחירה. חפץ, או המקום שבו היה חפץ.'),
        ],
        callbacks: [
          {group: 'e', when: is('life:master:F32:stay', 'handed'), lines: [s(null, 'What you handed over feels lighter than what you kept. Both are yours.', 'מה שמסרת מרגיש קל יותר ממה ששמרת. שניהם שלך.')]},
          {group: 'e', when: {any: [is('life:master:F32:stay', 'kept'), is('life:master:F32:stay', 'told')]}, lines: [s(null, 'You kept what you kept. It sits in the room like a held breath, not a loss.', 'שמרת מה ששמרת. זה יושב בחדר כמו נשימה שנעצרה, לא כמו אובדן.')]},
        ],
        task: t('Close the evening', 'לסגור את הערב'),
        action: [s(null, 'The tap drips once. The light holds. Nothing else in the room is in a hurry.', 'הברז מטפטף פעם אחת. האור מחזיק. שום דבר אחר בחדר לא ממהר.')],
        options: [
          o('tell', t('Choose something to tell someone', 'לבחור מה לספר למישהו'), [
              s('friend', 'Tell me that one again. I want to keep it.', 'ספר לי את זה שוב. אני רוצה לשמור אותו.'),
              s(null, 'You tell it. It is shorter than you feared and longer than you thought. Outside, the day lets go, and you are home.', 'אתה מספר. זה קצר ממה שפחדת וארוך ממה שחשבת. בחוץ היום משחרר, ואתה בבית.'),
            ],
            [flag('life:master:F32:end', 'told'), bond('friend', 3), heart(2)]),
          o('private', t('Keep the coda private', 'לשמור את הקודה פרטית'), [
              s(null, 'You say nothing out loud. It is the same life, and it does not owe anybody an audience.', 'אתה לא אומר כלום בקול. אלה אותם חיים, והם לא חייבים לאף אחד קהל.'),
              s(null, 'The window goes dark and the table stays warm. You are home, and it is enough.', 'החלון מחשיך והשולחן נשאר חם. אתה בבית, וזה מספיק.'),
            ],
            [flag('life:master:F32:end', 'private'), heart(2)]),
          o('look', t('Look once more at what you gathered', 'להסתכל עוד פעם על מה שאספת'), [
              s(null, 'You go through it slowly: the people, the things, the gaps you left alone. Nothing is added. Nothing is taken back.', 'אתה עובר על זה לאט: האנשים, הדברים, החללים שהשארת. שום דבר לא מתווסף. שום דבר לא נלקח.'),
              s(null, 'It is a whole life, as it was. You put out the light. It was a good one, and it is home.', 'אלו חיים שלמים, כמו שהיו. אתה מכבה את האור. הם היו טובים, וזה בית.'),
            ],
            [flag('life:master:F32:end', 'looked'), heart(2)]),
        ],
      }),
    ],
  }),
]

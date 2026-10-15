import {chapter, o, s, sc, t} from '../write'
import {bond, coins, energy, flag, heart, is} from '../types'
import type {ChapterScript} from '../types'

/**
 * Master screenplay, routes R-REG, R-TER, R-WAY, R-CREATE (bible §17, 15.10.2026).
 *
 * R-REG is always played. The other three are an invitation that came from what the supporter did:
 * they exist only for a life that agreed to a defined continuation AND leans that way. Declining inside a
 * route ends the chapter and play carries on. Authored fiction only: no year, no result, no real person.
 * Each route reads only its own earlier scenes (`life:master:<ID>:*`), so it needs nothing from the F-chapters.
 */
const GO = (inc: string) => ({all: [{flag: 'life:route:go'}, is('life:inclin', inc)]})

export const MASTER_ROUTES_A: ChapterScript[] = [
  // ───────────────────────────────────────────────────────────────────────── R-REG · a fan without a role
  chapter({
    id: 'R-REG', age: 22, act: 2, title: t('A Fan Without a Role', 'אוהד בלי תפקיד'),
    intro: t('Nobody gave you a job. They saved you a seat anyway.', 'אף אחד לא נתן לך תפקיד. שמרו לך מקום בכל זאת.'),
    keep: {id: 'regular-thing', name: t('The thing you do together', 'הדבר שאתם עושים ביחד'), note: t('A joke, a ritual, a habit. Not a rank.', 'בדיחה, טקס, הרגל. לא דרגה.')},
    scenes: [
      sc({
        id: 'R-REG-S1', room: 'terrace', who: 'friend', after: [], slot: 'left', spot: 'banner', verb: 'sit',
        title: t('The usual spot', 'אותו מקום כרגיל'),
        lines: [
          s('friend', 'I saved your place. I told them you are always late.', 'שמרתי לך. אמרתי להם שאתה תמיד מאחר.'),
          s(null, 'You are on time. {friend} looks at you as if you have broken something.', 'הגעת בזמן. {friend} מסתכל עליך כאילו שברת משהו.'),
        ],
        task: t('Take your place', 'לתפוס את המקום'),
        action: [s(null, 'The seat is warm from somebody else sitting on guard duty. It smells of cold coffee.', 'המושב חם מכך שמישהו ישב עליו לשמור. הוא מריח מקפה קר.')],
        options: [
          o('joke', t('Sit down and give the joke back', 'לשבת לידו ולהחזיר בדיחה'), s('friend', 'That is the one. That is the one I will use until we are old.', 'זאת הבדיחה. אני אשתמש בה עד שנזקן.'),
            [flag('life:master:R-REG:usual', 'joke'), bond('friend', 3), heart(1)]),
          o('move', t('Ask for a different spot this time', 'לבקש הפעם מקום אחר'), s('friend', 'Over there? Fine. I will walk over there with you. I will complain on the way.', 'שם? בסדר. אלך איתך לשם. אתלונן בדרך.'),
            [flag('life:master:R-REG:usual', 'moved'), bond('friend', 2)]),
          o('part', t('Come for only part of the evening', 'להגיע רק לחלק מהערב'), s('friend', 'Half is fine. Half of you is still more than most people bring.', 'חצי זה בסדר. חצי ממך זה עדיין יותר ממה שרוב האנשים מביאים.'),
            [flag('life:master:R-REG:usual', 'part'), energy(5)]),
        ],
      }),
      sc({
        id: 'R-REG-S2', room: 'street', who: 'friend', slot: 'doorstep', spot: 'bin', verb: 'talk', cut: true,
        title: t('The game nobody remembers', 'המשחק שלא זוכרים'),
        lines: [
          s('friend', 'You remember the time? The funniest thing that ever happened to us. Right here. By this bin.', 'אתה זוכר את הפעם? הדבר הכי מצחיק שקרה לנו. בדיוק פה. ליד הפח.'),
          s(null, 'No big night is being remembered today. It is just {friend}, sure of a story you are not sure of.', 'היום לא זוכרים שום ערב גדול. רק {friend}, בטוח בסיפור שאתה לא בטוח בו.'),
        ],
        callbacks: [
          {when: is('life:master:R-REG:usual', 'joke'), group: 'usual', lines: [s('friend', 'You and your joke from the other night. It is still going around me.', 'אתה והבדיחה שלך מהערב ההוא. היא עדיין מסתובבת אצלי בראש.')]},
          {when: is('life:master:R-REG:usual', 'part'), group: 'usual', lines: [s('friend', 'You left early last time, so you missed how this ends. I will tell you the end.', 'הלכת מוקדם בפעם הקודמת, אז פספסת איך זה נגמר. אספר לך את הסוף.')]},
        ],
        task: t('Settle the argument', 'להכריע במחלוקת'),
        action: [s(null, 'A bus goes by and neither of you notices which one.', 'אוטובוס עובר ואף אחד מכם לא שם לב איזה.')],
        options: [
          o('argue', t('Argue it out and play the memory', 'להתווכח איתו ולשחק את הזיכרון'), s('friend', 'No, I stood there. You were by the wall. Wall! Move!', 'לא, אני עמדתי שם. אתה היית ליד הקיר. קיר! זוז!'),
            [flag('life:master:R-REG:memory', 'played'), bond('friend', 3), energy(-5)]),
          o('thing', t('Take out something that goes with it, if you have it', 'להוציא פריט קשור אם יש'), s('friend', 'Where did you keep that? A thing that proves nothing but happens to be here.', 'איפה שמרת את זה? דבר שלא מוכיח כלום אבל מקרה שהוא כאן.'),
            [flag('life:master:R-REG:memory', 'thing'), bond('friend', 2)]),
          o('invent', t('Make up a new joke together', 'להמציא יחד בדיחה חדשה'), s('friend', 'So it never happened. Good. Now it is ours and nobody can check.', 'אז זה לא קרה מעולם. טוב. עכשיו זה שלנו ואף אחד לא יכול לבדוק.'),
            [flag('life:master:R-REG:memory', 'invented'), heart(1), bond('friend', 3)]),
        ],
      }),
      sc({
        id: 'R-REG-S3', room: 'bus-station', who: 'friend', slot: 'friend', spot: 'board', verb: 'talk', cut: true,
        title: t('Asked again', 'שוב מבקשים ממך'),
        lines: [
          s('friend', 'Somebody asked me to take charge of something. I said I would bring you. No lists. No folders. Just come.', 'מישהו ביקש ממני לקחת אחריות על משהו. אמרתי שאביא אותך. בלי רשימות. בלי תיקים. רק לבוא.'),
          s(null, 'It is a polite offer. It would be easy to turn it into a job.', 'זו הצעה מנומסת. קל יהיה להפוך אותה לעבודה.'),
        ],
        task: t('Answer him', 'לענות לו'),
        action: [s(null, 'The board changes a platform number twice while you think.', 'הלוח מחליף מספר רציף פעמיים בזמן שאתה חושב.')],
        options: [
          o('decline', t('Say no, and go with him anyway', 'לסרב וללכת איתו'), s('friend', 'You said no and came. That is the best kind of no.', 'סירבת ובאת. זה הסוג הכי טוב של לא.'),
            [flag('life:master:R-REG:ask', 'declined-came'), bond('friend', 3)]),
          o('today', t('Help for today only', 'לעזור רק היום'), s('friend', 'Today. I wrote it down: today. Tomorrow does not owe anybody anything.', 'היום. רשמתי: היום. מחר לא חייב לאף אחד כלום.'),
            [flag('life:master:R-REG:ask', 'today'), energy(-5), heart(1)]),
          o('other', t('Try a different way', 'לנסות מסלול אחר'), s('friend', 'Another route? You always do this. All right, show me. I will pretend I am surprised.', 'מסלול אחר? אתה תמיד עושה את זה. בסדר, תראה לי. אעשה כאילו אני מופתע.'),
            [flag('life:master:R-REG:ask', 'other'), bond('friend', 2)]),
        ],
      }),
      sc({
        id: 'R-REG-S4', room: 'gate', who: 'friend', slot: 'wait', spot: 'flag', verb: 'use',
        title: t('Somebody who knows you', 'מי שמכיר אותך'),
        lines: [
          s('friend', 'I brought the thing.', 'הבאתי את הדבר ההוא.'),
          s('me', 'Which thing?', 'איזה דבר?'),
          s('friend', 'You know which thing.', 'אתה יודע איזה דבר.'),
        ],
        callbacks: [
          {when: is('life:master:R-REG:memory', 'invented'), group: 'custom', lines: [s(null, 'It is the joke you invented, folded small, in a pocket. The habit has grown up.', 'זו הבדיחה שהמצאתם, מקופלת קטן, בכיס. ההרגל התבגר.')]},
          {when: is('life:master:R-REG:ask', 'declined-came'), group: 'custom', lines: [s(null, 'You said no and came. Now he brings the thing without asking, and that is a kind of yes.', 'אמרת לא ובאת. עכשיו הוא מביא את הדבר בלי לשאול, וזה סוג של כן.')]},
        ],
        task: t('Hold the thing you share', 'לאחוז בדבר שמשותף לכם'),
        action: [s(null, 'It is small. You both know it is not small.', 'הוא קטן. שניכם יודעים שהוא לא קטן.')],
        options: [
          o('keep', t('Keep the old custom', 'לשמור את המנהג הישן'), s('friend', 'Same as always, then. I was afraid you would say new.', 'כמו תמיד, אם כך. פחדתי שתגיד חדש.'),
            [flag('life:master:R-REG:end', 'kept'), bond('friend', 3), heart(2)]),
          o('new', t('Suggest starting something else', 'להציע להתחיל משהו אחר'), s('friend', 'Something else? Then we will not be able to do the old one badly any more.', 'משהו אחר? אז לא נוכל יותר לעשות את הישן רע.'),
            [flag('life:master:R-REG:end', 'new'), heart(1)]),
          o('add', t('Bring in somebody new, if they agree', 'לצרף אדם חדש בהסכמה'), s('child', 'Is it all right if I sit here? I will not touch anything.', 'אפשר לשבת כאן? אני לא אגע בכלום.'),
            [flag('life:master:R-REG:end', 'added'), bond('child', 2), heart(1)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── R-TER · the terrace
  chapter({
    id: 'R-TER', age: 26, act: 2, title: t('The Terrace', 'היציע'), when: GO('ter'),
    intro: t('Somebody noticed what your hands do. Now they have a corner for you.', 'מישהו שם לב למה שהידיים שלך עושות. עכשיו יש להם פינה בשבילך.'),
    keep: {id: 'terrace-cloth', name: t('The cloth or the prep note', 'הבד או פתק ההכנה'), note: t('Made here, agreed here, owned by whoever made it.', 'נעשה כאן, הוסכם כאן, שייך למי שעשה אותו.')},
    scenes: [
      sc({
        id: 'R-TER-S1', room: 'workshop', who: 'boss', after: [], slot: 'boss', spot: 'banner', verb: 'take',
        title: t('Who holds the edge', 'מי מחזיק את הקצה'),
        lines: [
          s('boss', 'You do not have to lead anything. Hold here.', 'אתה לא צריך להוביל כלום. תחזיק פה.'),
          s(null, 'A long cloth lies half-unrolled over the bench. One end already has someone at it.', 'בד ארוך מונח חצי פרוש על הספסל. בקצה אחד כבר מישהו עומד.'),
        ],
        task: t('Take your end', 'לקחת את הקצה שלך'),
        action: [s(null, 'The cloth is heavier than it looks, the way anything you will have to carry is.', 'הבד כבד ממה שנראה, כמו כל דבר שיהיה עליך לשאת.')],
        options: [
          o('hands', t('Work with your hands', 'לעבוד בידיים'), s('mate', 'Good. Pull it flat from your side. Slowly. It forgives nothing fast.', 'טוב. תמתח אותו ישר מהצד שלך. לאט. הוא לא סולח על מהירות.'),
            [flag('life:master:R-TER:role', 'hands'), bond('mate', 3), energy(-5)]),
          o('organise', t('Organise the meeting', 'לארגן את המפגש'), s('boss', 'A list of the people who said yes. Only those. No names from guessing.', 'רשימה של האנשים שאמרו כן. רק אותם. בלי שמות מניחוש.'),
            [flag('life:master:R-TER:role', 'organise'), bond('boss', 2), heart(1)]),
          o('crowd', t('Join the crowd', 'להצטרף לקהל'), s('boss', 'Stand with them, then. Somebody has to be what it is all for.', 'תעמוד איתם, אם כך. מישהו צריך להיות מה שכל זה בשבילו.'),
            [flag('life:master:R-TER:role', 'crowd'), heart(1)]),
        ],
      }),
      sc({
        id: 'R-TER-S2', room: 'workshop', who: 'boss', slot: 'bench', spot: 'cans', verb: 'look',
        title: t('The mistake that stayed', 'הטעות שנשארה'),
        lines: [
          s('boss', 'There is a mistake in the lettering. Third word, one stroke too many. I want to redo it.', 'יש טעות בכיתוב. המילה השלישית, קו אחד יותר מדי. אני רוצה לעשות מחדש.'),
          s('friend', 'It is the best thing about it. Do not touch it.', 'זה הדבר הכי טוב בו. אל תיגע.'),
        ],
        callbacks: [
          {when: is('life:master:R-TER:role', 'hands'), group: 'role', lines: [s('mate', 'You were at the cloth that night. You saw the stroke go on. Tell them how it happened.', 'היית ליד הבד באותו ערב. ראית את הקו נכנס. ספר להם איך זה קרה.')]},
          {when: is('life:master:R-TER:role', 'organise'), group: 'role', lines: [s('boss', 'You have the list of who is coming. Redoing it costs the start of another meeting. You decide how much.', 'יש לך את הרשימה של מי בא. לעשות מחדש עולה בתחילת מפגש אחר. אתה מחליט כמה.')]},
        ],
        task: t('Rule on the stroke', 'להכריע לגבי הקו'),
        action: [s(null, 'Two people are looking at one stroke. It is a small thing and it has become the whole room.', 'שני אנשים מסתכלים על קו אחד. זה דבר קטן ואיכשהו הוא נהיה כל החדר.')],
        options: [
          o('fix', t('Fix it, and pay with time', 'לתקן במחיר זמן'), s('boss', 'Thank you. It will be clean now. You will miss the first part of something else.', 'תודה. עכשיו זה יהיה נקי. תפספס את תחילתו של משהו אחר.'),
            [flag('life:master:R-TER:mistake', 'fixed'), energy(-10), bond('boss', 3)]),
          o('stay', t('Leave it, with the team agreeing', 'להשאיר בהסכמת הצוות'), s('friend', 'Now it is ours. Now there is a story. Every cloth needs one stupid story.', 'עכשיו זה שלנו. עכשיו יש סיפור. לכל בד צריך סיפור אחד טיפשי.'),
            [flag('life:master:R-TER:mistake', 'kept'), bond('friend', 3), heart(1)]),
          o('hand', t('Let somebody else decide', 'לתת למישהו אחר להחליט'), s('mate', 'Me? You are giving me the call? All right. Then it is not just my work, it is my word.', 'אני? אתה נותן לי את ההחלטה? בסדר. אז זה לא רק העבודה שלי, זו המילה שלי.'),
            [flag('life:master:R-TER:mistake', 'handed'), bond('mate', 3)]),
        ],
      }),
      sc({
        id: 'R-TER-S3', room: 'terrace', who: 'boss', slot: 'steward', spot: 'banner', verb: 'use', cut: true,
        title: t('Everyone is looking', 'כולם מסתכלים'),
        lines: [
          s('boss', 'The rope is tangled and one of ours has not come. They are not going to wait for us.', 'החבל מסתבך ואחד משלנו לא הגיע. הם לא הולכים לחכות לנו.'),
          s(null, 'The people around you have begun to look up. It is an approved night, and it is going wrong in a small way.', 'האנשים מסביבך התחילו להרים מבט. זה ערב מאושר, והוא הולך קצת לא נכון.'),
        ],
        callbacks: [
          {when: is('life:master:R-TER:mistake', 'kept'), lines: [s('friend', 'If it goes badly, at least the stroke is in the right place.', 'אם זה ילך רע, לפחות הקו במקום הנכון.')]},
        ],
        task: t('Sort out the tangle', 'לפתור את הסבך'),
        action: [s(null, 'The rope has more opinions than anyone. It wants to go three directions at once.', 'לחבל יש יותר דעות מלכל אחד. הוא רוצה ללכת לשלושה כיוונים בבת אחת.')],
        options: [
          o('handle', t('Deal with it and miss part of the evening', 'לטפל בזה ולהחמיץ חלק מהחוויה'), s('boss', 'It is sorted. You did not see the moment. I did. I will tell it badly.', 'זה מסודר. לא ראית את הרגע. אני ראיתי. אספר אותו רע.'),
            [flag('life:master:R-TER:night', 'handled'), energy(-10), bond('boss', 3)]),
          o('pass', t('Hand it to somebody who agrees', 'להעביר לאדם שמסכים'), s('mate', 'I have it. Go. I said I have it. Do not look back at it.', 'אני מחזיק. לך. אמרתי שאני מחזיק. אל תסתכל אחורה.'),
            [flag('life:master:R-TER:night', 'passed'), bond('mate', 2), heart(1)]),
          o('smaller', t('Make it smaller', 'להקטין את ההפקה'), s('friend', 'Less cloth, less rope, same people. Good. I like us at this size.', 'פחות בד, פחות חבל, אותם אנשים. טוב. אני אוהב אותנו בגודל הזה.'),
            [flag('life:master:R-TER:night', 'smaller'), heart(2), bond('friend', 2)]),
        ],
      }),
      sc({
        id: 'R-TER-S4', room: 'tunnel', who: 'child', slot: 'ahead', spot: 'sign', verb: 'talk', cut: true,
        title: t('He started without you', 'הוא התחיל בלעדיך'),
        lines: [
          s('child', 'I thought this is what you would have done. So I did it first.', 'חשבתי שזה מה שהיית עושה. אז עשיתי את זה קודם.'),
          s(null, 'A younger person has started a new piece, and he is not copying you. He is only standing where you used to stand.', 'אדם צעיר התחיל קטע חדש, והוא לא מעתיק אותך. הוא רק עומד איפה שאתה נהגת לעמוד.'),
        ],
        callbacks: [
          {when: is('life:master:R-TER:night', 'smaller'), lines: [s('child', 'I heard you made it smaller once. I am making it smaller too, if that is allowed.', 'שמעתי שפעם עשית את זה קטן יותר. גם אני עושה קטן יותר, אם מותר.')]},
        ],
        task: t('Answer him', 'לענות לו'),
        action: [s(null, 'The tunnel carries every word further than you meant it.', 'המנהרה מרחיקה כל מילה יותר ממה שהתכוונת.')],
        options: [
          o('join', t('Join him', 'להצטרף אליו'), s('child', 'You are standing next to me. I did not know you could do that and still be you.', 'אתה עומד לידי. לא ידעתי שאפשר לעשות את זה ועדיין להיות אתה.'),
            [flag('life:master:R-TER:next', 'joined'), bond('child', 3), heart(1)]),
          o('another', t('Offer another way and let him choose', 'להציע דרך אחרת ולתת לו לבחור'), s('child', 'That is not how I would do it. But I will think about it. Do not wait for me to agree.', 'ככה אני לא הייתי עושה. אבל אחשוב על זה. אל תחכה שאסכים.'),
            [flag('life:master:R-TER:next', 'another'), bond('child', 1), heart(1)]),
          o('leave', t('Let go of the responsibility', 'לעזוב את האחריות'), s('child', 'Then it is mine. All right. Come and see it, though, once.', 'אז זה שלי. בסדר. תבוא לראות, אבל, פעם אחת.'),
            [flag('life:master:R-TER:next', 'left'), energy(5), bond('child', 2)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── R-WAY · the road
  chapter({
    id: 'R-WAY', age: 26, act: 2, title: t('The Road', 'הדרך'), when: GO('way'),
    intro: t('You are the one who knows which bus. That is a kind of belonging.', 'אתה זה שיודע איזה אוטובוס. זה סוג של שייכות.'),
    keep: {id: 'road-map', name: t('The road map or the receipt', 'מפת הדרך או הקבלה'), note: t('Only from the road you actually took.', 'רק מהדרך שבאמת עשית.')},
    scenes: [
      sc({
        id: 'R-WAY-S1', room: 'bus-station', who: 'friend', after: [], slot: 'friend', spot: 'board', verb: 'talk',
        title: t('How many of you', 'כמה אתם'),
        lines: [
          s('friend', 'Can you sort out a trip? Not everyone is in. I am asking how many.', 'אתה יכול לסדר נסיעה? לא כולם בסדר. אני שואל כמה.'),
          s(null, 'He holds the timetable like a thing he does not trust.', 'הוא מחזיק את לוח הזמנים כמו דבר שהוא לא סומך עליו.'),
        ],
        task: t('Say how many seats', 'להגיד כמה מקומות'),
        action: [s(null, 'There is a pencil on a string beside the board. Everyone uses it. It is down to a stub.', 'יש עיפרון על חוט ליד הלוח. כולם משתמשים בו. הוא נשאר גדם.')],
        options: [
          o('group', t('Organise a small group', 'לארגן קבוצה קטנה'), s('friend', 'Five names and one spare seat. Real people. Okay. I trust a list that is short.', 'חמישה שמות ומקום אחד פנוי. אנשים אמיתיים. אוקיי. אני סומך על רשימה קצרה.'),
            [flag('life:master:R-WAY:role', 'organiser'), bond('friend', 2), coins(-3)]),
          o('rider', t('Be a rider and solve only part of it', 'להיות נוסע ולפתור רק חלק'), s('friend', 'You sort the sandwiches and the seat by the window. I will take everything else.', 'אתה מסדר את הסנדוויצ׳ים ואת המקום ליד החלון. את כל השאר אני לוקח.'),
            [flag('life:master:R-WAY:role', 'rider'), bond('friend', 3)]),
          o('stay', t('Stay behind and meet the ones who are not going', 'להישאר ולפגוש את מי שלא נוסע'), s('friend', 'Someone should. Go to the ones who cannot. It is not a failure to stay.', 'מישהו צריך. לך אל אלה שלא יכולים. זה לא כישלון להישאר.'),
            [flag('life:master:R-WAY:role', 'stayed'), heart(1), bond('friend', 1)]),
        ],
      }),
      sc({
        id: 'R-WAY-S2', room: 'bus-stop', who: 'stranger', slot: 'stranger', spot: 'sign', verb: 'talk', cut: true,
        title: t('The name not on the list', 'השם שלא ברשימה'),
        lines: [
          s('stranger', 'I heard you were going. I know it is decided. Is there a place?', 'שמעתי שאתם נוסעים. אני יודע שזה סגור. יש מקום?'),
          s(null, 'There is no automatic seat left. You can see he knows that, and has come anyway.', 'לא נשאר מקום אוטומטי. אתה רואה שהוא יודע את זה, ובא בכל זאת.'),
        ],
        callbacks: [
          {when: is('life:master:R-WAY:role', 'organiser'), group: 'role', lines: [s(null, 'It is your list. Five names in your own handwriting, and a sixth person standing at the sign.', 'זו הרשימה שלך. חמישה שמות בכתב ידך, ואדם שישי עומד ליד השלט.')]},
          {when: is('life:master:R-WAY:role', 'stayed'), group: 'role', lines: [s(null, 'You were meant to be staying. This is the last person the bus could take, and you are here, not on it.', 'אתה אמור להישאר. זה האדם האחרון שהאוטובוס יכול לקחת, ואתה כאן, לא עליו.')]},
        ],
        task: t('Give him an answer', 'לתת לו תשובה'),
        action: [s(null, 'The timetable behind him says nothing. Timetables rarely do.', 'לוח הזמנים שמאחוריו לא אומר דבר. לוחות זמנים כמעט אף פעם לא.')],
        options: [
          o('alt', t('Find a workable alternative and pay for it', 'למצוא חלופה אפשרית ולשלם מחירה'), s('stranger', 'A later bus and I pay the difference? You would do that? Okay. I will be there.', 'אוטובוס מאוחר יותר ואני משלם את ההפרש? היית עושה את זה? אוקיי. אהיה שם.'),
            [flag('life:master:R-WAY:late', 'alternative'), coins(-5), bond('stranger', 3)]),
          o('guard', t('Keep faith with those already invited', 'לשמור על מי שכבר הוזמן'), s('stranger', 'I understand. You gave me an answer, which is more than a lot of people do. I will not forget it.', 'אני מבין. נתת לי תשובה, וזה יותר ממה שהרבה אנשים עושים. לא אשכח.'),
            [flag('life:master:R-WAY:late', 'kept-list'), bond('stranger', 1), heart(1)]),
          o('yield', t('Give up your own place if there is a fair solution', 'לוותר על המקום שלך אם יש פתרון ראוי'), s('stranger', 'You are giving me your seat? Then what will you do?', 'אתה נותן לי את המקום שלך? אז מה תעשה אתה?'),
            [flag('life:master:R-WAY:late', 'yielded'), heart(2), bond('stranger', 3)]),
        ],
      }),
      sc({
        id: 'R-WAY-S3', room: 'route', who: 'friend', slot: 'lamp', spot: 'sign', verb: 'look', cut: true,
        title: t('The stop you did not plan', 'העצירה שלא תכננת'),
        lines: [
          s('friend', 'There is a delay. A plausible one, nothing dramatic. But somebody wants to keep going at any price.', 'יש עיכוב. סביר, שום דבר דרמטי. אבל מישהו רוצה להמשיך בכל מחיר.'),
          s(null, 'The road has gone quiet. A bus ticks as it cools beside the lamp.', 'הדרך נעשתה שקטה. אוטובוס מתקתק כשהוא מתקרר ליד העמוד.'),
        ],
        callbacks: [
          {when: is('life:master:R-WAY:late', 'alternative'), group: 'late', lines: [s('stranger', 'It was my bus I changed for. If we are stuck, it is stuck with me on it. I feel bad.', 'זה האוטובוס שלי שהחלפתי בשבילו. אם נתקענו, זה נתקע איתי עליו. אני מרגיש רע.')]},
          {when: is('life:master:R-WAY:late', 'yielded'), group: 'late', lines: [s(null, 'You are standing on the road by yourself while your seat travels on. It is not as hard as it sounds.', 'אתה עומד על הדרך לבד בזמן שהמושב שלך ממשיך. זה לא קשה כמו שזה נשמע.')]},
        ],
        task: t('Decide what the delay costs', 'להחליט מה העיכוב עולה'),
        action: [s(null, 'Someone has taken out a map. The route on it looks tidier than the road.', 'מישהו הוציא מפה. המסלול עליה נראה מסודר יותר מהדרך.')],
        options: [
          o('go', t('Carry on with a workable plan', 'להמשיך לפי תוכנית ישימה'), s('friend', 'The plan costs time and costs money, and we are saying so out loud. All right. That is honest.', 'התוכנית עולה זמן ועולה כסף, ואנחנו אומרים את זה בקול. בסדר. זה כנה.'),
            [flag('life:master:R-WAY:delay', 'continued'), coins(-3), energy(-10)]),
          o('watch', t('Change how you are there and watch from a valid alternative', 'לשנות נוכחות ולראות ממקום חלופי תקף'), s('friend', 'No magic arrival at the gate. We will see it from a window, with a bad view. That is allowed.', 'בלי הגעה קסומה לשער. נראה את זה מחלון, עם נוף גרוע. זה מותר.'),
            [flag('life:master:R-WAY:delay', 'watched'), heart(1), bond('friend', 2)]),
          o('cancel', t('Cancel your part and look after the one who counted on you', 'לבטל את חלקך ולדאוג למי שסמך עליך'), s('friend', 'You are sitting down in the cold with a person who needed you more than the evening did. I will remember that.', 'אתה מתיישב בקור עם אדם שהיה צריך אותך יותר ממה שהערב היה צריך. אזכור את זה.'),
            [flag('life:master:R-WAY:delay', 'cancelled'), heart(2), bond('friend', 3)]),
        ],
      }),
      sc({
        id: 'R-WAY-S4', room: 'bus-stop', who: 'friend', slot: 'bench', spot: 'sign', verb: 'sit',
        title: t('This time you can sit', 'הפעם אתה יכול לשבת'),
        lines: [
          s('friend', 'I can take it from here. You can watch from the window too, you know.', 'אני יכול לקחת את זה מכאן. אתה יכול גם להסתכל מהחלון, אתה יודע.'),
          s(null, 'He means it. That is what is difficult about it.', 'הוא מתכוון לזה. זה מה שקשה בזה.'),
        ],
        callbacks: [
          {when: is('life:master:R-WAY:delay', 'cancelled'), lines: [s('friend', 'You stayed once, in the cold, for somebody else. So you know it is allowed to put the whole thing down.', 'נשארת פעם, בקור, בשביל מישהו אחר. אז אתה יודע שמותר להניח את הכול.')]},
        ],
        task: t('Answer the offer', 'לענות להצעה'),
        action: [s(null, 'The bench has room for exactly two people and one folded timetable.', 'בספסל יש מקום בדיוק לשני אנשים ולוח זמנים מקופל אחד.')],
        options: [
          o('lead', t('Let him lead', 'לתת לו להוביל'), s('friend', 'Then I will get us there. Try not to correct my left turns.', 'אז אני אביא אותנו לשם. נסה לא לתקן לי את הפניות שמאלה.'),
            [flag('life:master:R-WAY:next', 'trusted'), bond('friend', 3), heart(1)]),
          o('share', t('Share the responsibility', 'לחלוק אחריות'), s('friend', 'You take the money and the names. I take the road. Write it on something so we do not argue later.', 'אתה לוקח את הכסף ואת השמות. אני לוקח את הדרך. תכתוב על משהו שלא נריב אחר כך.'),
            [flag('life:master:R-WAY:next', 'shared'), bond('friend', 2), heart(1)]),
          o('rider', t('Stop organising and stay a passenger', 'להפסיק לארגן ולהישאר נוסע'), s('friend', 'A passenger. With a window. And all the roads you made are still in you.', 'נוסע. עם חלון. וכל הדרכים שעשית עדיין בך.'),
            [flag('life:master:R-WAY:next', 'passenger'), energy(10), heart(1)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── R-CREATE · the maker
  chapter({
    id: 'R-CREATE', age: 26, act: 2, title: t('The Maker', 'היוצר'), when: GO('create'),
    intro: t('What you make in a drawer is yours. What you make in daylight is everyone\'s.', 'מה שאתה יוצר במגירה הוא שלך. מה שאתה יוצר באור יום הוא של כולם.'),
    keep: {id: 'maker-sketch', name: t('The sketch, the public version, the corrections', 'הסקיצה, הגרסה הציבורית, התיקונים'), note: t('Pieces of a game, written for this life. Not a claim about anything that really was.', 'חלקים של משחק, שנכתבו לחיים האלה. לא טענה על שום דבר שבאמת היה.')},
    scenes: [
      sc({
        id: 'R-CREATE-S1', room: 'bedroom', who: 'friend', after: [], slot: 'byDesk', spot: 'desk', verb: 'look',
        title: t('Only a sketch', 'רק סקיצה'),
        lines: [
          s('friend', 'Is this for us, or only for the drawer?', 'זה בשבילנו או רק בשביל המגירה?'),
          s(null, 'He has found it under the other papers. A song, or a sign, or a drawing; it is yours, and it is not finished.', 'הוא מצא את זה מתחת לניירות האחרים. שיר, או שלט, או ציור; זה שלך, וזה לא גמור.'),
        ],
        task: t('Say who it is for', 'להגיד בשביל מי זה'),
        action: [s(null, 'The desk lamp makes the paper look more finished than it is.', 'מנורת השולחן גורמת לנייר להיראות גמור יותר ממה שהוא.')],
        options: [
          o('crew', t('Show the group', 'להראות לחבורה'), s('friend', 'They will love one part and change another. That is not an attack, that is how it gets better.', 'הם יאהבו חלק וישנו חלק. זו לא התקפה, ככה זה משתפר.'),
            [flag('life:master:R-CREATE:shown', 'group'), bond('friend', 2), heart(1)]),
          o('one', t('Show one person', 'להראות לאדם אחד'), s('friend', 'Only me. Then I am the keeper of it. I do not take that lightly.', 'רק לי. אז אני השומר שלו. אני לא לוקח את זה בקלות.'),
            [flag('life:master:R-CREATE:shown', 'one'), bond('friend', 3)]),
          o('keep', t('Keep it to yourself', 'להשאיר לעצמך'), s('friend', 'Fine. But I saw it. I will not say a word. Your face just said everything.', 'בסדר. אבל ראיתי. לא אומר מילה. הפנים שלך כבר אמרו הכול.'),
            [flag('life:master:R-CREATE:shown', 'kept'), heart(1)]),
        ],
      }),
      sc({
        id: 'R-CREATE-S2', room: 'schoolyard', who: 'friend', slot: 'bench', spot: 'wall', verb: 'listen', cut: true,
        title: t('It is theirs now', 'זה כבר שלהם'),
        lines: [
          s(null, 'You hear it from the other side of the yard. They are using a different version, and some of the words are not yours.', 'אתה שומע את זה מהצד השני של החצר. הם משתמשים בגרסה שונה, וחלק מהמילים לא שלך.'),
          s('friend', 'Yours was too long. I am just saying. Theirs breathes.', 'שלך היה ארוך מדי. אני רק אומר. שלהם נושם.'),
        ],
        callbacks: [
          {when: is('life:master:R-CREATE:shown', 'group'), group: 'shown', lines: [s('friend', 'You showed them, and look what they did. They took it home with them.', 'הראית להם, ותראה מה הם עשו. הם לקחו את זה הביתה.')]},
          {when: is('life:master:R-CREATE:shown', 'kept'), group: 'shown', lines: [s('friend', 'I never said a word, you know. Somebody else found it in the end. These things walk.', 'אף פעם לא אמרתי מילה, אתה יודע. מישהו אחר מצא את זה בסוף. דברים כאלה הולכים.')]},
        ],
        task: t('Decide where you stand', 'להחליט איפה אתה עומד'),
        action: [s(null, 'A wall, a bench, a tune that is almost yours, being sung wrongly with great confidence.', 'קיר, ספסל, מנגינה שכמעט שלך, שרים אותה לא נכון בביטחון מלא.')],
        options: [
          o('theirs', t('Join their version', 'להצטרף לגרסה שלהם'), s('friend', 'You are singing the short one. It is not a defeat. It is the song leaving home.', 'אתה שר את הקצרה. זו לא תבוסה. זה השיר שיוצא מהבית.'),
            [flag('life:master:R-CREATE:version', 'theirs'), bond('friend', 3), heart(1)]),
          o('both', t('Keep a private version and agree to two', 'לשמור גרסה אישית ולהסכים לשתיים'), s('friend', 'Two. One for the yard and one for you. They do not even disagree with each other.', 'שתיים. אחת לחצר ואחת בשבילך. הן אפילו לא חולקות זו על זו.'),
            [flag('life:master:R-CREATE:version', 'both'), heart(2)]),
          o('stop', t('Ask them not to use it', 'לבקש שלא ישתמשו'), s('friend', 'Really? You want it back? Then I will tell them. They will not like it, and I will not like telling them.', 'באמת? אתה רוצה את זה בחזרה? אז אגיד להם. הם לא יאהבו, ואני לא אוהב להגיד.'),
            [flag('life:master:R-CREATE:version', 'withdrawn'), bond('friend', -2), heart(1)]),
        ],
      }),
      sc({
        id: 'R-CREATE-S3', room: 'classroom', who: 'teacher', slot: 'teacher', spot: 'board', verb: 'use', cut: true,
        title: t('Before it begins', 'לפני שמתחיל'),
        lines: [
          s('teacher', 'You have a person asking for you, and a last correction you swore you would do. Which one?', 'יש אדם שמבקש אותך, ותיקון אחרון שנשבעת שתעשה. איזה מהם?'),
          s(null, 'Nothing you do here will fix a game. It is only your evening, and it will not be anyone else\'s.', 'שום דבר שתעשה כאן לא יסדר משחק. זה רק הערב שלך, והוא לא יהיה של אף אחד אחר.'),
        ],
        callbacks: [
          {when: is('life:master:R-CREATE:version', 'withdrawn'), lines: [s('teacher', 'You took it back from them. People noticed. They will want something more careful this time.', 'לקחת את זה מהם בחזרה. אנשים שמו לב. הם ירצו משהו זהיר יותר הפעם.')]},
        ],
        task: t('Pick what the evening is for', 'לבחור למה הערב'),
        action: [s(null, 'The board is wiped clean except for one line nobody had the heart to erase.', 'הלוח נמחק לגמרי חוץ משורה אחת שלאף אחד לא היה לב למחוק.')],
        options: [
          o('finish', t('Finish the work', 'לסיים את העבודה'), s('teacher', 'It is done and it is good. The person who asked is waiting outside, and they are waiting a long time.', 'זה גמור וזה טוב. האדם שביקש מחכה בחוץ, ומחכה הרבה זמן.'),
            [flag('life:master:R-CREATE:eve', 'finished'), energy(-10), heart(1)]),
          o('raw', t('Show the raw version', 'להציג גרסה גולמית'), s('teacher', 'It is small. It is not perfect. It is allowed to be a small thing.', 'זה קטן. זה לא מושלם. מותר לזה להיות דבר קטן.'),
            [flag('life:master:R-CREATE:eve', 'raw'), heart(2)]),
          o('partner', t('Hand it to a partner', 'למסור לשותף'), s('teacher', 'You wrote his name on the back. In pen. That is a real credit, and he has not seen it yet.', 'כתבת את השם שלו מאחור. בעט. זה קרדיט אמיתי, והוא עוד לא ראה.'),
            [flag('life:master:R-CREATE:eve', 'partner'), bond('friend', 3)]),
        ],
      }),
      sc({
        id: 'R-CREATE-S4', room: 'terrace', who: 'child', slot: 'left', spot: 'pitch', verb: 'listen', cut: true,
        title: t('Somebody else is singing', 'מישהו אחר שר'),
        lines: [
          s(null, 'Near the end of the evening you hear it from a person you do not know. It has gone further than you did.', 'לקראת סוף הערב אתה שומע את זה מאדם שאתה לא מכיר. זה הגיע רחוק יותר ממך.'),
          s('child', 'I do not know who made this one. Somebody just made it, I suppose.', 'אני לא יודע מי עשה את זה. מישהו פשוט עשה את זה, אני מניח.'),
        ],
        callbacks: [
          {when: is('life:master:R-CREATE:version', 'both'), group: 'v', lines: [s(null, 'It is the short version. You still have the other one in a drawer. Both of them are true.', 'זו הגרסה הקצרה. את השנייה עוד יש לך במגירה. שתיהן נכונות.')]},
          {when: is('life:master:R-CREATE:eve', 'partner'), group: 'v', lines: [s(null, 'It carries his name on the back of a page you cannot see from here. It still counts.', 'השם שלו על גב דף שאתה לא רואה מכאן. זה עדיין נחשב.')]},
        ],
        task: t('Answer what you hear', 'להגיב למה ששומעים'),
        action: [s(null, 'A stranger, the same tune, slightly flat. It has never sounded so much like yours.', 'זר, אותה מנגינה, קצת נמוכה. היא אף פעם לא נשמעה כל כך כמו שלך.')],
        options: [
          o('listen', t('Listen without explaining', 'להקשיב בלי להסביר'), s('child', 'Do you know it? You look like you know it. You do not have to say.', 'אתה מכיר את זה? אתה נראה כאילו אתה מכיר. אתה לא חייב להגיד.'),
            [flag('life:master:R-CREATE:heard', 'quiet'), heart(2)]),
          o('tell', t('Say that you were part of it', 'לספר שאתה היית חלק'), s('child', 'Really? Huh. Then you were part of something. Tell me where the chorus comes from.', 'באמת? הא. אז היית חלק ממשהו. תגיד לי מאיפה מגיעה החזרה.'),
            [flag('life:master:R-CREATE:heard', 'told'), bond('child', 2), heart(1)]),
          o('give', t('Give the sketch to whoever wants it', 'לתת את הסקיצה למי שרוצה'), s('child', 'For me? A real one, from the first time? I will not lose it. I will not even fold it.', 'בשבילי? אחת אמיתית, מהפעם הראשונה? לא אאבד. אפילו לא אקפל.'),
            [flag('life:master:R-CREATE:heard', 'gave'), bond('child', 3), heart(1)]),
        ],
      }),
    ],
  }),
]

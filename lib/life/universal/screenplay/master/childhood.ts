import {chapter, o, s, sc, t} from '../write'
import {bond, coins, flag, heart, is} from '../types'

/**
 * Master screenplay F01–F03 (bible §16, 15.10.2026): the first three chapters of the shared life.
 *
 * Authored fiction only — no year, no opponent, no score. Each scene is the bible's setup, one real action
 * in a room, and three options that open different things (never different wording of one thing).
 * A choice records intent as a `life:master:*` flag; later chapters (F29, F19…) read it.
 *
 * What is NOT here yet, on purpose: the collection layer (an owned scarf, a worn shirt with a source) and the
 * closet check for "put it on". Those need the collection store; until then a flag records what happened and
 * nothing is shown on the player's body that the player does not own.
 */
export const MASTER_CHILDHOOD = [
  // ───────────────────────────────────────────────────────────────────────── F01 · the drawer that isn't yours
  chapter({
    id: 'F01', age: 7, act: 1, title: t('The Drawer That Is Not Yours', 'המגירה שלא שלך'),
    intro: t('Something in this house was put away before you were born.', 'משהו בבית הזה הונח במקום לפני שנולדת.'),
    keep: {id: 'drawer-thing', name: t('What was in the drawer', 'מה שהיה במגירה'), note: t('It is not yours. It is yours to remember.', 'זה לא שלך. זה שלך לזכור.')},
    scenes: [
      sc({
        id: 'F01-S1', room: 'kitchen', who: 'dad', after: [], spot: 'drawer', verb: 'use',
        title: t('It will not open', 'היא לא נפתחת'),
        lines: [
          s(null, '{dadName} is pulling at the drawer by the sink. It has decided today is not the day.', '{dadName} מושך במגירה ליד הכיור. היא החליטה שהיום זה לא היום.'),
          s('me', 'What is in there?', 'מה יש שם?'),
          s('dad', 'Things I did not throw away. That is not the same as things I kept.', 'דברים שלא זרקתי. זה לא אותו דבר כמו דברים ששמרתי.'),
        ],
        task: t('Get the drawer open', 'לפתוח את המגירה'),
        action: [s(null, 'It gives all at once, the way stuck things do, and something small slides to the front.', 'היא נפתחת בבת אחת, כמו כל מה שתקוע, ומשהו קטן גולש קדימה.')],
        options: [
          o('open', t('Help him pull', 'לעזור לו למשוך'), s('dad', 'On three. No, on two, I never get to three.', 'על שלוש. לא, על שתיים, אני אף פעם לא מגיע לשלוש.'),
            [flag('life:master:F01:drawer', 'together'), bond('dad', 3), heart(1)]),
          o('tool', t('Fetch a spoon from the table', 'להביא כף מהשולחן'), s('dad', 'A spoon. Of course. Why did nobody in this family think of a spoon?', 'כף. ברור. למה אף אחד במשפחה הזאת לא חשב על כף?'),
            [flag('life:master:F01:drawer', 'tool'), flag('life:master:F01:own', 'found'), bond('dad', 2)]),
          o('play', t('Go back to your game', 'לחזור למשחק'), s('dad', 'Go. I will tell you when it is open.', 'לך. אני אגיד לך כשזה ייפתח.'),
            [flag('life:master:F01:drawer', 'later')]),
        ],
      }),
      sc({
        id: 'F01-S2', room: 'kitchen', who: 'dad', spot: 'table',
        title: t('Before you were born', 'לפני שנולדת'),
        lines: [
          s('dad', 'You want to see? Come. But look with your hands behind you.', 'רוצה לראות? בוא. אבל תסתכל עם הידיים מאחורה.'),
          s(null, 'He sets it on the table between you, the way you set down something that has been somewhere longer than you have.', 'הוא מניח את זה על השולחן ביניכם, כמו שמניחים דבר שהיה איפשהו יותר זמן ממך.'),
          s('dad', 'You were not here yet.', 'אתה עוד לא היית כאן.'),
        ],
        callbacks: [{when: is('life:master:F01:drawer', 'later'), lines: [s('dad', 'You went to play and the drawer waited. Good. It is used to waiting.', 'הלכת לשחק והמגירה חיכתה. טוב. היא רגילה לחכות.')]}],
        task: t('Look at what is on the table', 'להסתכל על מה שעל השולחן'),
        action: [s(null, 'It is smaller than the story that goes with it. Those usually are.', 'זה קטן יותר מהסיפור שמגיע איתו. בדרך כלל זה כך.')],
        options: [
          o('who', t('Ask who was with him', 'לשאול מי היה איתו'), s('dad', 'People. Loud ones. Some of them you will meet, if I am lucky with the telling.', 'אנשים. רועשים. כמה מהם תפגוש, אם יהיה לי מזל עם הסיפור.'),
            [flag('life:master:F01:asked', 'who'), bond('dad', 2)]),
          o('won', t('Ask if they won', 'לשאול אם ניצחו'), s('dad', 'That is the short question. The answer is long, and it is not about the score.', 'זאת השאלה הקצרה. התשובה ארוכה, והיא לא על התוצאה.'),
            [flag('life:master:F01:asked', 'won'), heart(1)]),
          o('hold', t('Ask to hold it', 'לבקש להחזיק'), s('dad', 'Hold it? Hm. Over the table. Then you will understand why I say careful.', 'להחזיק? הממ. מעל השולחן. אז תבין למה אני אומר זהירות.'),
            [flag('life:master:F01:asked', 'hold'), flag('life:master:F01:held', 'shown'), bond('dad', 1)]),
        ],
      }),
      sc({
        id: 'F01-S3', room: 'kitchen', who: 'dad', spot: 'shelf',
        title: t('Where it goes back', 'איפה מחזירים'),
        lines: [
          s('dad', 'Here. On the shelf, where I can see it from the stove. It will not get lost here.', 'כאן. על המדף, איפה שאני רואה אותו מהכיריים. הוא לא יאבד כאן.'),
          s('me', 'How did it get lost the last time?', 'איך הוא הלך לאיבוד בפעם הקודמת?'),
          s('dad', 'It did not get lost. I did. Slightly. For a few years.', 'הוא לא הלך לאיבוד. אני כן. קצת. כמה שנים.'),
        ],
        task: t('Put it away', 'להחזיר למקום'),
        action: [s(null, 'The drawer closes without a fight, which feels like its own kind of agreement.', 'המגירה נסגרת בלי מאבק, וזה מרגיש כמו הסכמה מסוג משלו.')],
        options: [
          o('back', t('Put it back exactly where it was', 'להחזיר בדיוק לאותו מקום'), s('dad', 'Exactly. Look at that. You have the eye for it.', 'בדיוק. תראה אותך. יש לך עין לדבר הזה.'),
            [flag('life:master:F01:place', 'kept'), bond('dad', 3), heart(2)]),
          o('tomorrow', t('Ask him to show it again tomorrow', 'לבקש שיראה לך שוב מחר'), s('dad', 'Tomorrow. Write it down so I cannot say I forgot.', 'מחר. תכתוב את זה כדי שלא אוכל לומר ששכחתי.'),
            [flag('life:master:F01:place', 'invited'), bond('dad', 2)]),
          o('draw', t('Draw what you saw', 'לצייר מה שראית'), s('dad', 'That is not what it looks like. That is better. Keep it.', 'זה לא מה שזה נראה. זה יותר טוב. תשמור.'),
            [flag('life:master:F01:place', 'drawn'), heart(2)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F02 · the colour you chose to wear
  chapter({
    id: 'F02', age: 7, act: 1, title: t('The Colour You Chose to Wear', 'הצבע שבחרת ללבוש'),
    intro: t('Nobody asked you to. That is the whole point of choosing.', 'אף אחד לא ביקש ממך. זה כל העניין בלבחור.'),
    keep: {id: 'chosen-colour', name: t('The colour you chose', 'הצבע שבחרת'), note: t('Borrowed things stay borrowed. The choosing is yours.', 'מה שהושאל נשאר מושאל. הבחירה שלך.')},
    scenes: [
      sc({
        id: 'F02-S1', room: 'room', who: 'dad', after: [], spot: 'lamp', verb: 'look',
        title: t('The chair', 'הכיסא'),
        lines: [
          s(null, 'A scarf is hanging over the back of a chair, in the {club} colours.', 'צעיף תלוי על משענת כיסא, בצבעים של {club}.'),
          s('dad', 'It is cold outside.', 'קר בחוץ.'),
          s('me', 'Is that why it is this colour?', 'בגלל זה הצבע הזה?'),
          s(null, 'He stops for a moment before he answers.', 'הוא עוצר רגע לפני שהוא עונה.'),
        ],
        callbacks: [{when: is('life:master:F01:place', 'kept'), lines: [s('dad', 'You put the drawer thing back exactly where it lived. I noticed. So I thought of you for this.', 'החזרת את הדבר מהמגירה בדיוק למקום שלו. שמתי לב. אז חשבתי עליך בשביל זה.')]}],
        task: t('Decide what to do with the scarf', 'להחליט מה עושים עם הצעיף'),
        action: [s(null, 'The chair creaks, the way furniture does when it has seen this kind of decision before.', 'הכיסא חורק, כמו שרהיטים עושים כשהם כבר ראו החלטה כזאת.')],
        options: [
          o('wear', t('Put it on', 'ללבוש'), s('dad', 'Borrowed. Say it out loud so we both remember. Borrowed.', 'בהשאלה. תגיד את זה בקול שנזכור שניינו. בהשאלה.'),
            [flag('life:master:F02:scarf', 'worn'), heart(2)], {wearAdd: 'scarf'}),
          o('carry', t('Carry it in your hand', 'לשאת ביד'), s('dad', 'You want it, but not the looks yet. That is a sensible order.', 'אתה רוצה אותו, אבל עוד לא את המבטים. זה סדר הגיוני.'),
            [flag('life:master:F02:scarf', 'carried')]),
          o('leave', t('Leave it on the chair', 'להשאיר בכיסא'), s('dad', 'The chair will keep it. It is a very loyal chair.', 'הכיסא ישמור אותו. הוא כיסא נאמן מאוד.'),
            [flag('life:master:F02:scarf', 'left')]),
        ],
      }),
      sc({
        id: 'F02-S2', room: 'schoolyard', who: 'friend', spot: 'wall',
        title: t('Who sees first', 'מי רואה ראשון'),
        lines: [
          s('friend', 'Hey. That is a colour.', 'היי. זה צבע.'),
          s('friend', 'We have one like it. A different one.', 'גם אצלנו יש כזה. אחר.'),
          s(null, 'It is not a test. {friend} is just looking, the way you look at a new coat.', 'זה לא מבחן. {friend} פשוט מסתכל, כמו שמסתכלים על מעיל חדש.'),
        ],
        task: t('Say something to {friend}', 'להגיד משהו ל{friend}'),
        action: [s(null, 'A bell rings somewhere that is not your problem for another four minutes.', 'פעמון מצלצל איפשהו, וזו לא הבעיה שלך עוד ארבע דקות.')],
        options: [
          o('ask', t('Ask about theirs', 'לשאול על שלהם'), s('friend', 'Mine is older than me. It is always my uncle who explains it.', 'שלי ישן ממני. תמיד הדוד שלי מסביר אותו.'),
            [flag('life:master:F02:met', 'curious'), bond('friend', 3)]),
          o('game', t('Suggest a game', 'להציע משחק'), s('friend', 'Wall ball. You are the wall.', 'כדור קיר. אתה הקיר.'),
            [flag('life:master:F02:met', 'game'), bond('friend', 4)]),
          o('home', t('Say what they said at home', 'לספר מה אמרו בבית'), s('friend', '"It is cold outside." I am writing that down. I might use it.', '"קר בחוץ." אני רושם את זה. אולי אשתמש.'),
            [flag('life:master:F02:met', 'home'), flag('life:master:F02:sentence', 'cold'), bond('friend', 2)]),
        ],
      }),
      sc({
        id: 'F02-S3', room: 'room', who: 'dad', spot: 'tv',
        title: t('Your name on the street', 'השם שלך ברחוב'),
        lines: [
          s(null, 'You come back in with the cold still on your coat.', 'אתה חוזר פנימה והקור עוד על המעיל.'),
          s('dad', 'Well?', 'נו?'),
          s(null, 'It is not clear whether he means the street or the scarf.', 'לא ברור אם הוא מתכוון לרחוב או לצעיף.'),
        ],
        callbacks: [{when: is('life:master:F02:met', 'home'), lines: [s('dad', 'I hear "it is cold outside" is going around the yard.', 'שמעתי ש"קר בחוץ" מסתובב בחצר.')]}],
        task: t('Tell him, or do not', 'לספר לו, או לא'),
        action: [s(null, 'The room is warm. The scarf, wherever it ended up, is a little warmer.', 'החדר חם. הצעיף, איפה שלא יהיה, חם קצת יותר.')],
        options: [
          o('friend', t('Tell him about the friend', 'לספר על החבר'), s('dad', '{friend}. I know a {friend}. Is that the family with the loud uncle?', '{friend}. אני מכיר {friend}. זאת המשפחה עם הדוד הרועש?'),
            [flag('life:master:F02:told', 'friend'), bond('dad', 2)]),
          o('feeling', t('Tell him how it felt', 'לספר איך זה הרגיש'), s('dad', 'Yes. That. That is the whole thing. I could not have said it better. I never did.', 'כן. זה. זה כל העניין. לא הייתי אומר טוב יותר. אף פעם לא אמרתי.'),
            [flag('life:master:F02:told', 'feeling'), heart(3), bond('dad', 3)]),
          o('keep', t('Keep it to yourself', 'לשמור לעצמך'), s('dad', 'All right. It is yours. I will ask again in a year.', 'בסדר. זה שלך. אשאל שוב בעוד שנה.'),
            [flag('life:master:F02:told', 'kept')]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F03 · the shirt in the window
  chapter({
    id: 'F03', age: 10, act: 1, title: t('The Shirt in the Window', 'החולצה בחלון'),
    intro: t('It has been there all month. You have walked past it nineteen times, and you did not count.', 'היא שם כבר חודש. עברת לידה תשע־עשרה פעמים, ולא ספרת.'),
    keep: {id: 'window-shirt', name: t('What you did about the shirt', 'מה שעשית בקשר לחולצה'), note: t('A shirt, an old one, or something you made. Not a shirt you only wished for.', 'חולצה, חולצה ישנה, או משהו שעשית. לא חולצה שרק איחלת לעצמך.')},
    scenes: [
      sc({
        id: 'F03-S1', room: 'street', who: 'seller', after: [], spot: 'window', verb: 'look',
        title: t('How much is missing', 'כמה חסר'),
        lines: [
          s(null, 'You stop in front of the shirt. The price is on a card in the window. You read it twice.', 'אתה עוצר מול החולצה. המחיר על כרטיס בחלון. אתה קורא אותו פעמיים.'),
          s('seller', 'Trying it on is free. Stopping thinking about it costs extra.', 'למדוד לא עולה. להפסיק לחשוב עליה עולה.'),
        ],
        task: t('Decide what you do about it', 'להחליט מה עושים בקשר לזה'),
        action: [s(null, 'The glass shows you your own reflection, with the shirt on it. It is a good reflection.', 'הזכוכית מראה לך את ההשתקפות שלך, עם החולצה עליה. זו השתקפות טובה.')],
        options: [
          o('try', t('Try it on and ask the price', 'למדוד ולברר מחיר'), s('seller', 'It fits like a small flag. Come back when the number is shorter.', 'היא יושבת כמו דגל קטן. תחזור כשהמספר יהיה קצר יותר.'),
            [flag('life:master:F03:route', 'saving'), heart(1)]),
          o('home', t('Ask at home about an old one', 'לשאול בבית על חולצה ישנה'), s('seller', 'Old ones are the best ones. Go. If they ask, I never said that.', 'הישנות הן הכי טובות. לך. אם ישאלו, לא אמרתי.'),
            [flag('life:master:F03:route', 'heirloom')]),
          o('manage', t('Decide to manage without', 'להחליט להסתדר בלעדיה'), s('seller', 'Without is a style too. You will see.', 'בלי זה גם סגנון. תראה.'),
            [flag('life:master:F03:route', 'personal'), heart(1)]),
        ],
      }),
      sc({
        id: 'F03-S2', room: 'street', who: 'friend', spot: 'crates',
        title: t('Money that can do something', 'כסף שאפשר לעשות איתו משהו'),
        lines: [
          s('friend', 'I have an afternoon idea. A good one. A short one.', 'יש לי רעיון לאחר הצהריים. טוב. קצר.'),
          s(null, 'At home there is also a small job. The kind with a clear start and a clear end.', 'בבית יש גם עבודה קטנה. מהסוג עם התחלה ברורה וסוף ברור.'),
        ],
        task: t('Choose how to spend the afternoon', 'לבחור איך לבלות את אחר הצהריים'),
        action: [s(null, 'Afternoons only come in one size. You have to pick what goes into it.', 'אחר צהריים בא רק במידה אחת. צריך לבחור מה נכנס בו.')],
        options: [
          o('work', t('Work toward the shirt', 'לעבוד לקראת החולצה'), s('friend', 'You will be late for my idea. My idea can wait a week. I will complain.', 'תאחר לרעיון שלי. הרעיון שלי יכול לחכות שבוע. אתלונן.'),
            [flag('life:master:F03:source', 'work'), coins(3)]),
          o('gift', t('Accept a gift, if one is offered', 'לקבל מתנה אם הוצעה'), s('friend', 'A present is not a loan and not a prize. Say thank you and sit down.', 'מתנה היא לא הלוואה ולא פרס. תגיד תודה ותשב.'),
            [flag('life:master:F03:source', 'gift'), bond('friend', 1)]),
          o('keep', t('Keep the money for something else', 'לשמור את הכסף למשהו אחר'), s('friend', 'Fine. The shirt will be there. Windows are patient.', 'בסדר. החולצה תהיה שם. חלונות סבלניים.'),
            [flag('life:master:F03:source', 'kept'), bond('friend', 2)]),
        ],
      }),
      sc({
        id: 'F03-S3', room: 'street', who: 'friend', spot: 'graffiti',
        title: t('Show it, or do not', 'מראים או לא'),
        lines: [
          s(null, 'You get ready to go out. Whatever you have, it is on you, or in your bag, or in your head.', 'אתה מתכונן לצאת. מה שיש לך, הוא עליך, או בתיק, או בראש.'),
          s('friend', 'Well? Are you going to show me or do I have to guess?', 'נו? תראה לי או שאצטרך לנחש?'),
        ],
        callbacks: [{when: is('life:master:F02:told', 'kept'), lines: [s(null, 'At home nobody asked and you did not say. The details of this one are yours alone.', 'בבית אף אחד לא שאל ואתה לא סיפרת. הפרטים של זה שלך בלבד.')]}],
        task: t('Step out', 'לצאת החוצה'),
        action: [s(null, 'The street is exactly the same street. You are not, quite, exactly the same you.', 'הרחוב הוא בדיוק אותו רחוב. אתה לא בדיוק אותו אתה.')],
        options: [
          o('show', t('Go out and show {friend}', 'לצאת ולהראות ל{friend}'), s('friend', 'It looks like it was made for you. It was not, but it looks like it.', 'זה נראה כאילו נעשה בשבילך. לא, אבל זה נראה ככה.'),
            [flag('life:master:F03:shown', 'friend'), bond('friend', 3), heart(2)]),
          o('quiet', t('Wear it quietly, or pick other clothes', 'ללבוש בשקט או לבחור בגד אחר'), s('friend', 'Quietly is fine. I will notice anyway, I always do.', 'בשקט זה בסדר. אשים לב בכל זאת, תמיד שמים.'),
            [flag('life:master:F03:shown', 'quiet'), heart(1)]),
          o('home', t('Show them at home what you made', 'להראות בבית מה עשית'), s('friend', 'Come back and tell me what they said. Do not leave anything out.', 'תחזור ותספר מה אמרו. אל תשמיט כלום.'),
            [flag('life:master:F03:shown', 'home'), bond('dad', 2)]),
        ],
      }),
    ],
  }),
]

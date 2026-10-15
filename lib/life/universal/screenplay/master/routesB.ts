import {chapter, o, s, sc, t} from '../write'
import {bond, coins, energy, flag, heart, is} from '../types'
import type {ChapterScript} from '../types'

/**
 * Master screenplay route chapters R-STORY, R-COMM, R-ABROAD, R-DIST, R-OWNER (bible §17, 15.10.2026).
 *
 * A route is an invitation that grew out of what the life already did, never a menu. Declining inside a
 * route ends the chapter and play carries on. Fiction only: no year, no score, no real person, no real club
 * changing hands. R-OWNER says in its own first scene that it is an "if it had been different" branch.
 */
const inclin = (v: 'story' | 'comm') => ({all: [{flag: 'life:route:go'}, is('life:inclin', v)]})

export const MASTER_ROUTES_B: ChapterScript[] = [
  // ───────────────────────────────────────────────────────────────────────── R-STORY · the one who tells
  chapter({
    id: 'R-STORY', age: 26, act: 2, title: t('The Storyteller', 'מספר הסיפור'), when: inclin('story'),
    intro: t('You were always the one who asked. Now somebody asks you.', 'תמיד היית זה ששואל. עכשיו שואלים אותך.'),
    keep: {id: 'told-page', name: t('The page, the picture or the telling', 'העמוד, התמונה או הסיפור שסיפרת'), note: t('A list, a picture or a text, with its source and its standing written down. A correction is kept as part of the record, not as a rubbed-out choice.', 'רשימה, תמונה או טקסט, עם המקור והמעמד שלהם כתובים. תיקון נשמר כחלק מהתיעוד, לא כבחירה שנמחקה.')},
    scenes: [
      sc({
        id: 'R-STORY-S1', room: 'room', who: 'friend', after: [], spot: 'table', verb: 'use',
        title: t('Write it how it was', 'תכתוב איך היה'),
        lines: [
          s('friend', 'I need a summary of the night. Just do not write that we were in the front row. I still remember the page.', 'אני צריך סיכום של הערב ההוא. רק אל תכתוב שהיינו בשורה הראשונה. אני עוד זוכר את העמוד.'),
          s(null, 'A blank sheet lies between you, and a pen that has been waiting for somebody to be brave.', 'דף ריק מונח ביניכם, ועט שמחכה שמישהו יהיה אמיץ.'),
        ],
        task: t('Decide what kind of account to give', 'להחליט איזה סוג של סיפור למסור'),
        action: [s(null, 'The pen scratches once, tries a word, and waits for the next one.', 'העט שורט פעם אחת, מנסה מילה, וממתין לבאה.')],
        options: [
          o('memory', t('Write a personal memory', 'לכתוב זיכרון אישי'), s('friend', 'Only what you saw, then. Good. Nobody can argue with what you saw. They can only add their own.', 'רק מה שראית, אם כך. טוב. אי אפשר להתווכח עם מה שראית. אפשר רק להוסיף את שלהם.'),
            [flag('life:master:R-STORY:telling', 'memory'), heart(2)]),
          o('facts', t('Build a summary of facts from the sources', 'לבנות סיכום עובדות מן המקורות'), s('friend', 'Two columns: what you know and where you got it. It reads cold, but it holds up.', 'שני טורים: מה שאתה יודע ומאיפה. זה נקרא קר, אבל זה עומד.'),
            [flag('life:master:R-STORY:telling', 'facts'), bond('friend', 1)]),
          o('spoken', t('Tell it out loud and publish nothing', 'לספר בעל פה ולא לפרסם'), s('friend', 'Out loud, then. Sit. I will ask again at the part about the rain.', 'בעל פה, אם כך. שב. אשאל שוב בקטע על הגשם.'),
            [flag('life:master:R-STORY:telling', 'spoken'), bond('friend', 3)]),
        ],
      }),
      sc({
        id: 'R-STORY-S2', room: 'bus-stop', who: 'elder', spot: 'sign', verb: 'listen', cut: true,
        title: t('The detail he remembers', 'הפרט שהוא זוכר'),
        lines: [
          s('elder', 'No. That is not how it went. The lights went out first. I have the ticket, if you want to see.', 'לא. זה לא ככה היה. קודם כבו האורות. יש לי את הכרטיס, אם אתה רוצה לראות.'),
          s(null, 'He is not angry. He is sure, which is harder to argue with.', 'הוא לא כועס. הוא בטוח, וזה קשה יותר לוויכוח.'),
        ],
        callbacks: [
          {group: 'telling', when: is('life:master:R-STORY:telling', 'facts'), lines: [s('elder', 'Your friend showed me the two columns. Neat. Let us see which column I fit in.', 'החבר שלך הראה לי את שני הטורים. מסודר. נראה באיזה טור אני נכנס.')]},
          {group: 'telling', when: is('life:master:R-STORY:telling', 'spoken'), lines: [s('elder', 'I hear you only told it out loud. Then there is still room for mine.', 'שמעתי שרק סיפרת את זה בעל פה. אז יש עוד מקום לשלי.')]},
        ],
        task: t('Decide what to do with two versions', 'להחליט מה עושים עם שתי גרסאות'),
        action: [s(null, 'The bus is late. For once that is a gift.', 'האוטובוס מאחר. הפעם זו מתנה.')],
        options: [
          o('both', t('Set both personal versions side by side', 'להציג שתי זוויות אישיות'), s('elder', 'Mine and yours, one under the other. And nobody decides which one is the facts? I can live with that.', 'שלי ושלך, אחד מתחת לשני. ואף אחד לא מכריע מה העובדות? אפשר לחיות עם זה.'),
            [flag('life:master:R-STORY:detail', 'two-angles'), bond('elder', 2), heart(1)]),
          o('check', t('Check it against a verified anchor', 'לבדוק מול עוגן מאומת'), s('elder', 'You went and looked it up. And if I am wrong? Then write that I was wrong, with the page it came from.', 'הלכת לבדוק. ואם אני טועה? אז תכתוב שטעיתי, עם העמוד שממנו זה בא.'),
            [flag('life:master:R-STORY:detail', 'checked'), flag('life:master:R-STORY:source', 'marked'), energy(-5)]),
          o('leave', t('Leave the argument in the conversation', 'להשאיר את הוויכוח בשיחה'), s('elder', 'Good. Not every night needs to become an article. Some of them only need a bench.', 'טוב. לא כל ערב צריך להפוך לכתבה. לחלקם מספיק ספסל.'),
            [flag('life:master:R-STORY:detail', 'left-talking'), bond('elder', 3)]),
        ],
      }),
      sc({
        id: 'R-STORY-S3', room: 'terrace', who: 'friend', spot: 'pitch', verb: 'take', cut: true,
        title: t('Outside the picture', 'מחוץ לתמונה'),
        lines: [
          s(null, 'The light is exactly right. A crowd, a banner, the colours of {club}, and a gap by the fence that will not stay a gap.', 'האור בדיוק נכון. קהל, דגל, הצבעים של {club}, ופער ליד הגדר שלא יישאר פער.'),
          s('friend', 'Come, stand next to me. Just once. Please.', 'בוא, תעמוד לידי. רק פעם אחת. בבקשה.'),
        ],
        callbacks: [{when: is('life:master:R-STORY:telling', 'spoken'), lines: [s(null, 'You have only ever told this place. Nobody has ever seen it through you.', 'עד היום רק סיפרת על המקום הזה. אף אחד לא ראה אותו דרכך.')]}],
        task: t('Choose between the picture and the place', 'לבחור בין התמונה למקום'),
        action: [s(null, 'The shutter is under your finger, and the moment is already leaving.', 'הצמצם מתחת לאצבע, והרגע כבר יוצא.')],
        options: [
          o('shoot', t('Take the photograph', 'לצלם'), s('friend', 'It is a good one. I am in it. You are not, and that is a strange thing to see.', 'היא יפה. אני בה. אתה לא, וזה דבר מוזר לראות.'),
            [flag('life:master:R-STORY:frame', 'took'), flag('life:master:R-STORY:picture', 'kept'), heart(1)]),
          o('lower', t('Put the camera down', 'להניח את המצלמה'), s('friend', 'No picture, then. Fine. I will remember it with you, and that is not less.', 'אין תמונה, אם כך. בסדר. אזכור את זה איתך, וזה לא פחות.'),
            [flag('life:master:R-STORY:frame', 'put-down'), bond('friend', 3), heart(2)]),
          o('ask', t('Ask someone else to take it, with their consent', 'לבקש מאדם אחר לצלם בהסכמה'), s('stranger', 'Of course. Wait, wait. Now. No, one more, somebody blinked.', 'בטח. רגע, רגע. עכשיו. לא, עוד אחת, מישהו מצמץ.'),
            [flag('life:master:R-STORY:frame', 'asked'), flag('life:master:R-STORY:picture', 'shared'), bond('friend', 2), energy(-5)]),
        ],
      }),
      sc({
        id: 'R-STORY-S4', room: 'kitchen', who: 'stranger', spot: 'table', verb: 'talk', cut: true,
        title: t('He tells you', 'הוא מספר אותך'),
        lines: [
          s('stranger', 'I am writing about the people, not the results. I would like to tell your road. On which night do we begin?', 'אני כותב על האנשים, לא על התוצאות. הייתי רוצה לספר את הדרך שלך. באיזה ערב נתחיל?'),
          s(null, 'He puts a small recorder on the table and turns it so you can see that it is off.', 'הוא מניח על השולחן מקליט קטן ומסובב אותו כדי שתראה שהוא כבוי.'),
        ],
        callbacks: [
          {group: 'frame', when: is('life:master:R-STORY:frame', 'took'), lines: [s('stranger', 'I saw your photograph. The one you are not in. Start there?', 'ראיתי את התמונה שלך. זו שאתה לא בה. נתחיל משם?')]},
          {group: 'frame', when: is('life:master:R-STORY:frame', 'put-down'), lines: [s('stranger', 'They tell me you once put the camera down. I would like to hear why.', 'סיפרו לי שפעם הנחת את המצלמה. אשמח לשמוע למה.')]},
        ],
        task: t('Choose where the telling starts', 'לבחור מאיפה הסיפור מתחיל'),
        action: [s(null, 'Tea cools between you. Neither of you minds.', 'התה מתקרר ביניכם. אף אחד מכם לא מפריע לו.')],
        options: [
          o('famous', t('Pick the night everybody knows', 'לבחור את הרגע המוכר'), s('stranger', 'The night you were truly there. Only that one. I will not borrow other people\'s nights.', 'הערב שבאמת היית בו. רק הוא. לא אשאל ערבים של אחרים.'),
            [flag('life:master:R-STORY:told', 'known-night'), flag('life:master:R-STORY:public', 'yes'), heart(1)]),
          o('ordinary', t('Pick an ordinary day', 'לבחור דווקא יום רגיל'), s('stranger', 'An ordinary day. Good. A person, not a list. Tell me what the weather was.', 'יום רגיל. טוב. אדם, לא רשימה. ספר לי איך היה מזג האוויר.'),
            [flag('life:master:R-STORY:told', 'ordinary-day'), flag('life:master:R-STORY:public', 'yes'), heart(2), bond('stranger', 2)]),
          o('private', t('Decline to publish and keep a personal text', 'לוותר על פרסום ולשמור טקסט אישי'), s('stranger', 'Then it stays in a drawer, and it is still true. I will switch the recorder off. It was off already.', 'אז זה נשאר במגירה, ועדיין אמיתי. אכבה את המקליט. הוא היה כבוי.'),
            [flag('life:master:R-STORY:told', 'private'), flag('life:master:R-STORY:public', 'no'), heart(1), bond('stranger', 1)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── R-COMM · the community
  chapter({
    id: 'R-COMM', age: 26, act: 2, title: t('The Community', 'הקהילה'), when: inclin('comm'),
    intro: t('Somebody has to open the door. It is more often you than you expected.', 'מישהו צריך לפתוח את הדלת. יותר פעמים מכפי שציפית, זה אתה.'),
    keep: {id: 'borrowed-key', name: t('The borrowed key, the lists, what was made there', 'המפתח בהשאלה, הרשימות, מה שנוצר שם'), note: t('A key lent, not owned. Nothing here claims a real club was founded.', 'מפתח שהושאל, לא נקנה. שום דבר כאן לא טוען שמועדון אמיתי הוקם.')},
    scenes: [
      sc({
        id: 'R-COMM-S1', room: 'gate', who: 'elder', after: [], spot: 'board', verb: 'take',
        title: t('Somebody has to open', 'מישהו צריך לפתוח'),
        lines: [
          s('elder', 'I need someone to open the meeting. If you come five minutes before everyone, you will understand why.', 'אני צריך מישהו שיפתח את המפגש. אם תגיע חמש דקות לפני כולם, תבין למה.'),
          s(null, 'The hours here are only the game\'s own, and nobody outside it will ever check them.', 'השעות כאן הן של המשחק בלבד, ואף אחד מבחוץ לא יבדוק אותן.'),
        ],
        task: t('Say what part you take', 'לומר איזה חלק אתה לוקח'),
        action: [s(null, 'The board by the door has more names scratched off than written on.', 'על הלוח ליד הדלת יש יותר שמות שנמחקו מאשר כתובים.')],
        options: [
          o('key', t('Hold the key and the kit on loan', 'להחזיק מפתח וציוד בהשאלה'), s('elder', 'On loan. It goes back to me, or to whoever I say. Say it so we both remember.', 'בהשאלה. זה חוזר אליי, או למי שאגיד. תגיד את זה שנזכור שניינו.'),
            [flag('life:master:R-COMM:opening', 'key'), flag('life:master:R-COMM:key', 'borrowed'), bond('elder', 2), heart(1)]),
          o('help', t('Be there and help, without a key', 'להיות שם ולעזור בלי מפתח'), s('elder', 'Chairs, kettle, who comes in first. A smaller job, and every bit as real.', 'כיסאות, קומקום, מי נכנס ראשון. תפקיד קטן יותר, ואמיתי באותה מידה.'),
            [flag('life:master:R-COMM:opening', 'helper'), bond('elder', 1), energy(-5)]),
          o('friend', t('Come only as a friend', 'לבוא רק כחבר'), s('elder', 'Nobody asked you to have a title. The door is not closed to people without one.', 'אף אחד לא ביקש ממך תפקיד. הדלת לא סגורה בפני מי שאין לו.'),
            [flag('life:master:R-COMM:opening', 'friend'), bond('elder', 3)]),
        ],
      }),
      sc({
        id: 'R-COMM-S2', room: 'kitchen', who: 'child', spot: 'table', verb: 'use', cut: true,
        title: t('Suddenly there is no room', 'פתאום אין מקום'),
        lines: [
          s(null, 'More people came than there are chairs. An old regular guards his own table. A newcomer, who never heard there was such a rule, has already sat down at it.', 'הגיעו יותר אנשים מכסאות. ותיק שומר על השולחן שלו. חדש, שלא שמע שיש כלל כזה, כבר התיישב בו.'),
          s('child', 'Is this a bad place to sit? Nobody said.', 'זה מקום רע לשבת? אף אחד לא אמר.'),
        ],
        callbacks: [
          {group: 'open', when: is('life:master:R-COMM:opening', 'key'), lines: [s(null, 'You hold the key, so the question lands on you whether you want it or not.', 'המפתח אצלך, אז השאלה נוחתת עליך בין אם אתה רוצה ובין אם לא.')]},
          {group: 'open', when: is('life:master:R-COMM:opening', 'friend'), lines: [s(null, 'You came only as a friend, and a friend is the one both sides look at.', 'באת רק כחבר, וחבר הוא זה ששני הצדדים מסתכלים עליו.')]},
        ],
        task: t('Find room for everybody, or choose', 'למצוא מקום לכולם, או לבחור'),
        action: [s(null, 'A chair scrapes. Everybody pretends not to have heard.', 'כיסא חורק. כולם עושים כאילו לא שמעו.')],
        options: [
          o('grow', t('Grow, within what there is', 'להרחיב בתוך המשאבים האפשריים'), s('child', 'It got bigger. Louder too. Thank you for the second table.', 'זה נהיה גדול יותר. גם רועש יותר. תודה על השולחן השני.'),
            [flag('life:master:R-COMM:room', 'grew'), flag('life:master:R-COMM:intimacy', 'lost'), bond('child', 2)]),
          o('small', t('Keep the meeting small and find another time', 'לשמור מפגש קטן וליצור זמן נוסף'), s('child', 'So there is a second evening, just for us who did not fit? I will be on time.', 'אז יש ערב שני, רק לנו שלא נכנסנו? אגיע בזמן.'),
            [flag('life:master:R-COMM:room', 'two-evenings'), energy(-10), heart(1)]),
          o('proposal', t('Let somebody else suggest the fix', 'לתת למישהו אחר להציע פתרון'), s('child', 'Me? I only said a chair. But all right, what if the regular ones change tables?', 'אני? אמרתי רק כיסא. אבל טוב, ומה אם הוותיקים יחליפו שולחנות?'),
            [flag('life:master:R-COMM:room', 'proposed'), flag('life:master:R-COMM:voice', 'given'), bond('child', 3)]),
        ],
      }),
      sc({
        id: 'R-COMM-S3', room: 'room', who: 'friend', spot: 'table', verb: 'open', cut: true,
        title: t('What we collected for', 'בשביל מה אספנו'),
        lines: [
          s(null, 'There is a tin on the table. It exists only because somebody started it, and the rule written on its lid is in somebody\'s tiny handwriting.', 'על השולחן קופסת פח. היא קיימת רק כי מישהו התחיל אותה, והכלל שעל המכסה כתוב בכתב יד זעיר.'),
          s('friend', 'It is for the kettle and the new chairs. But the roof is leaking right now, and that is not what we said.', 'זה בשביל הקומקום והכיסאות החדשים. אבל הגג דולף עכשיו, וזה לא מה שאמרנו.'),
        ],
        callbacks: [{when: is('life:master:R-COMM:room', 'grew'), lines: [s('friend', 'It is a larger group now. Everybody has an opinion about the tin.', 'הקבוצה גדולה יותר עכשיו. לכולם יש דעה על הקופסה.')]}],
        task: t('Decide what the tin may be used for', 'להחליט למה מותר להשתמש בקופסה'),
        action: [s(null, 'The lid is stiff. It does not want to be opened by one person alone.', 'המכסה קשה. הוא לא רוצה להיפתח בידי אדם אחד לבד.')],
        options: [
          o('agreed', t('Spend it as agreed', 'להוציא לפי הייעוד שסוכם'), s('friend', 'Kettle and chairs. The roof gets a bucket for now. It is a bucket, not a solution, but it is honest.', 'קומקום וכיסאות. לגג יש דלי בינתיים. דלי, לא פתרון, אבל כן.'),
            [flag('life:master:R-COMM:tin', 'as-agreed'), bond('friend', 1), coins(-1)]),
          o('ask', t('Ask for a change and wait for the decision', 'לבקש שינוי ולהמתין להחלטה'), s('friend', 'Then we ask them all. It will take a week. Nobody gets to say yes afterwards if they did not say it now.', 'אז נשאל את כולם. זה ייקח שבוע. אף אחד לא יגיד כן בדיעבד אם לא אמר עכשיו.'),
            [flag('life:master:R-COMM:tin', 'asked'), flag('life:master:R-COMM:voice', 'asked-all'), energy(-5), bond('friend', 2)]),
          o('own', t('Give from your own pocket, or drop part of the plan', 'לתרום ממה שלך או לוותר על חלק מהתוכנית'), s('friend', 'This one is on you alone. Nobody else has to carry it, and nobody should feel they owe you.', 'את זה אתה לבד. אף אחד אחר לא חייב לשאת, ואף אחד לא צריך להרגיש שהוא חייב לך.'),
            [flag('life:master:R-COMM:tin', 'own-pocket'), coins(-4), heart(2)]),
        ],
      }),
      sc({
        id: 'R-COMM-S4', room: 'street', who: 'mate', spot: 'window', verb: 'look', cut: true,
        title: t('The door is already open', 'הדלת כבר פתוחה'),
        lines: [
          s(null, 'The window is lit before you reach it. Somebody opened early today.', 'החלון כבר דולק לפני שהגעת. מישהו פתח מוקדם היום.'),
          s('mate', 'I did not want you to think you owe it. So I did it myself.', 'לא רציתי שתחשוב שאתה חייב. אז עשיתי את זה בעצמי.'),
        ],
        callbacks: [
          {group: 'key', when: is('life:master:R-COMM:key', 'borrowed'), lines: [s(null, 'The key is still in your pocket. It does not belong to you. It never did.', 'המפתח עדיין בכיס שלך. הוא לא שלך. הוא אף פעם לא היה.')]},
          {group: 'key', when: is('life:master:R-COMM:opening', 'friend'), lines: [s(null, 'You never had a key. That made it easier, and a little lonelier.', 'אף פעם לא היה לך מפתח. זה היה קל יותר, ובודד קצת יותר.')]},
        ],
        task: t('Decide who this place is for now', 'להחליט של מי המקום עכשיו'),
        action: [s(null, 'Through the glass, people are already laughing at something that has nothing to do with you.', 'מבעד לזכוכית אנשים כבר צוחקים על משהו שלא קשור אליך.')],
        options: [
          o('guest', t('Stay as a guest', 'להישאר כאורח'), s('mate', 'A guest. Come in, sit, nobody asks you to hold anything. The place will manage without you, and you are still welcome.', 'אורח. כנס, שב, אף אחד לא מבקש ממך להחזיק משהו. המקום יסתדר בלעדיך, ואתה עדיין רצוי.'),
            [flag('life:master:R-COMM:after', 'guest'), bond('mate', 2), heart(1)]),
          o('share', t('Share the role, by agreement', 'לחלוק תפקיד בהסכמה'), s('mate', 'Half each, in writing, so neither of us argues about it in a year. What you did stays on the wall.', 'חצי חצי, בכתב, כדי ששנינו לא נתווכח על זה בעוד שנה. מה שעשית נשאר על הקיר.'),
            [flag('life:master:R-COMM:after', 'shared'), bond('mate', 3), energy(-5)]),
          o('return', t('End the period and hand back the key', 'לסיים תקופה ולהחזיר מפתח'), s('mate', 'Then it goes back where it came from. Thank you for the years you held it. It is not yours to keep, and it was never meant to be.', 'אז הוא חוזר למקום שממנו בא. תודה על השנים שהחזקת אותו. הוא לא שלך לשמור, ומעולם לא היה אמור להיות.'),
            [flag('life:master:R-COMM:after', 'returned'), flag('life:master:R-COMM:key', 'handed-back'), heart(2)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── R-ABROAD · across the water
  chapter({
    id: 'R-ABROAD', age: 29, act: 2, title: t('Across the Water', 'מעבר לים'), when: {flag: 'life:route:abroad'},
    intro: t('A plan, a case, a door that closes behind you, and a different clock on the wall.', 'תוכנית, מזוודה, דלת שנסגרת מאחוריך, ושעון אחר על הקיר.'),
    keep: {id: 'moved-things', name: t('Where your things are, in two homes', 'איפה הדברים שלך, בשני בתים'), note: t('Where each keepsake lives moves with you. Nothing is copied back, nothing is forced home.', 'המקום של כל פריט זז איתך. שום דבר לא משוכפל, שום דבר לא נכפה חזרה הביתה.')},
    scenes: [
      sc({
        id: 'R-ABROAD-S1', room: 'bedroom', who: 'friend', after: [], spot: 'box', verb: 'take',
        title: t('What goes in the case', 'מה נכנס למזוודה'),
        lines: [
          s(null, 'There is room for one more thing in the case, and a wall of things that all think it should be them.', 'יש מקום לעוד דבר אחד במזוודה, וקיר של דברים שכולם חושבים שזה צריך להיות הם.'),
          s('friend', 'This one has been with you for years. That one? You are taking that one?', 'זה כאן איתך שנים. את זה? את זה אתה לוקח?'),
        ],
        task: t('Decide what leaves with you', 'להחליט מה יוצא איתך'),
        action: [s(null, 'The zip is held shut by hope and a knee.', 'הרוכסן נסגר בתקווה ובברך.')],
        options: [
          o('take', t('Take something you own', 'לקחת פריט בבעלותך'), s('friend', 'Then it lives there now, not here. It is the same one, in a different house.', 'אז הוא גר שם עכשיו, לא כאן. אותו הדבר, בבית אחר.'),
            [flag('life:master:R-ABROAD:case', 'took'), flag('life:master:R-ABROAD:item', 'abroad'), heart(1)]),
          o('leave', t('Leave it with someone who agreed', 'להשאיר אצל אדם שהסכים'), s('friend', 'I will keep it. In the cupboard, with a note on it, so nobody says it got lost. It is kept, not gone.', 'אני אשמור. בארון, עם פתק, שאף אחד לא יגיד שזה הלך לאיבוד. זה שמור, לא אבוד.'),
            [flag('life:master:R-ABROAD:case', 'lent'), flag('life:master:R-ABROAD:item', 'stored-with-friend'), bond('friend', 3)]),
          o('empty', t('Go without any object', 'לצאת בלי חפץ'), s('friend', 'Nothing? All right. Belonging does not need a souvenir. It never did.', 'כלום? בסדר. שייכות לא צריכה מזכרת. אף פעם לא צריכה.'),
            [flag('life:master:R-ABROAD:case', 'none'), heart(2)]),
        ],
      }),
      sc({
        id: 'R-ABROAD-S2', room: 'flat-abroad', who: 'friend', spot: 'laptop', verb: 'listen', cut: true,
        title: t('A different hour', 'שעה אחרת'),
        lines: [
          s('friend', '(on the screen) We are starting. For you it is still the middle of your day, I know.', '(על המסך) אנחנו מתחילים. אצלך זה עוד אמצע היום, אני יודע.'),
          s(null, 'The sound comes through thin, a little late. Whether a full evening can come across the water depends on what is there to carry it.', 'הקול מגיע דק, מעט באיחור. אם ערב שלם יכול לעבור את הים תלוי במה שיש שיישא אותו.'),
        ],
        callbacks: [
          {group: 'case', when: is('life:master:R-ABROAD:item', 'abroad'), lines: [s(null, 'What you brought sits on the shelf, a few steps from the screen.', 'מה שהבאת עומד על המדף, כמה צעדים מהמסך.')]},
          {group: 'case', when: is('life:master:R-ABROAD:case', 'none'), lines: [s(null, 'The shelf is empty. The screen is the only thing in the room that knows the colours.', 'המדף ריק. המסך הוא הדבר היחיד בחדר שמכיר את הצבעים.')]},
        ],
        task: t('Choose how to be part of it', 'לבחור איך להיות חלק מזה'),
        action: [s(null, 'Outside the window, the evening is only starting to understand that it is evening.', 'מחוץ לחלון, הערב רק מתחיל להבין שהוא ערב.')],
        options: [
          o('watch', t('Build a watching evening with what the pack supports', 'לבנות מפגש צפייה שהחבילה תומכת בו'), s('friend', 'You mean a room with people in it, there? Here is the address. I will tell them to wear the colours.', 'אתה מתכוון לחדר עם אנשים, שם? הנה הכתובת. אגיד להם ללבוש את הצבעים.'),
            [flag('life:master:R-ABROAD:hour', 'local-gathering'), flag('life:master:R-ABROAD:friends', 'local'), bond('stranger', 2), energy(-10)]),
          o('brief', t('Stay in short touch with home', 'להיות בקשר קצר עם הבית'), s('friend', 'A few words in the middle of the thing. It will not feel like being here. It will feel like a hand on the shoulder from far away.', 'כמה מילים באמצע העניין. זה לא ירגיש כמו להיות כאן. זה ירגיש כמו יד על הכתף מרחוק.'),
            [flag('life:master:R-ABROAD:hour', 'brief-contact'), bond('friend', 2)]),
          o('late', t('Get the update later', 'לקבל עדכון מאוחר'), s('friend', 'I will save you everything and write it down. Read it in the morning, with your coffee, and ask whatever you want.', 'אשמור לך הכול ואכתוב. תקרא את זה בבוקר, עם הקפה, ותשאל מה שבא לך.'),
            [flag('life:master:R-ABROAD:hour', 'later-update'), heart(1), bond('friend', 1)]),
        ],
      }),
      sc({
        id: 'R-ABROAD-S3', room: 'kitchen', who: 'mum', spot: 'table', verb: 'sit', cut: true,
        title: t('Two days at home', 'יומיים בבית'),
        lines: [
          s('mum', 'Two days. I counted already. That is one family evening, and I know you have friends, and I know the friends have counted too.', 'יומיים. כבר ספרתי. זה ערב משפחה אחד, ואני יודעת שיש לך חברים, ואני יודעת שגם הם ספרו.'),
          s(null, 'If a visit could not be paid for this season, this table would be a screen, and the plan would be a call instead. Either way the evening has to be chosen.', 'אם ביקור לא היה אפשרי העונה, השולחן הזה היה מסך, והתוכנית שיחה. כך או כך צריך לבחור את הערב.'),
        ],
        task: t('Choose who gets the evening', 'לבחור למי הערב'),
        action: [s(null, 'There is a plate in front of you that nobody asked about. You eat from it anyway.', 'יש לפניך צלחת שאף אחד לא שאל עליה. אתה אוכל ממנה בכל זאת.')],
        options: [
          o('family', t('Choose the family evening', 'לבחור ערב משפחה'), s('mum', 'You came for us. The friends will understand. A few of them will sulk, and they will be right to.', 'באת בשבילנו. החברים יבינו. כמה מהם ייעלבו, ויהיה להם על מה.'),
            [flag('life:master:R-ABROAD:visit', 'family'), bond('mum', 3), heart(1)]),
          o('friends', t('Choose the friends evening', 'לבחור ערב חברים'), s('mum', 'Go. I will make it up in the morning with the long breakfast, and I will not mention that I noticed.', 'לך. אפצה בבוקר בארוחת הבוקר הארוכה, ולא אזכיר ששמתי לב.'),
            [flag('life:master:R-ABROAD:visit', 'friends'), bond('friend', 3), bond('mum', -1)]),
          o('both', t('Make one shared evening, only if everybody agrees', 'לתאם ערב משותף רק אם כולם מסכימים'), s('mum', 'Everybody, together? You know who does not sit with whom. If they all say yes, fine. If not, we do not force it.', 'כולם יחד? אתה יודע מי לא יושב ליד מי. אם כולם יגידו כן, יופי. אם לא, לא נכריח.'),
            [flag('life:master:R-ABROAD:visit', 'joint-if-all-agree'), energy(-10), heart(1)]),
        ],
      }),
      sc({
        id: 'R-ABROAD-S4', room: 'flat-abroad', who: 'elder', spot: 'banner', verb: 'talk', cut: true,
        title: t('This time they wait at yours', 'הפעם מחכים אצלך'),
        lines: [
          s('elder', 'Where is the door, here? You always came to me. I decided it was my turn to knock.', 'איפה הדלת, כאן? תמיד באת אליי. החלטתי שזה התור שלי לדפוק.'),
          s(null, 'If he cannot come, he is on the screen, holding up the colours. Either way, the chair in the corner is his.', 'אם הוא לא יכול לבוא, הוא על המסך, מחזיק את הצבעים באוויר. כך או כך, הכיסא בפינה שלו.'),
        ],
        callbacks: [
          {group: 'visit', when: is('life:master:R-ABROAD:visit', 'family'), lines: [s('elder', 'Your mother says you chose the family evening. She says it every time we speak.', 'אמא שלך אומרת שבחרת בערב משפחה. היא אומרת את זה בכל פעם שאנחנו מדברים.')]},
          {group: 'visit', when: is('life:master:R-ABROAD:visit', 'friends'), lines: [s('elder', 'I heard you spent the evening with the others. I am not jealous. A little.', 'שמעתי שבילית את הערב עם האחרים. אני לא מקנא. קצת.')]},
        ],
        task: t('Choose how to receive him', 'לבחור איך לקבל אותו'),
        action: [s(null, 'The banner on the wall has found its second wall. It looks like it was always going to.', 'הדגל על הקיר מצא את הקיר השני שלו. נראה כאילו תמיד התכוון.')],
        options: [
          o('life', t('Show him the life you built', 'להראות לו את החיים שבנית'), s('elder', 'It is a home. A real one. And on the wall is the club, as if it just moved in with you.', 'זה בית. אמיתי. ועל הקיר המועדון, כאילו פשוט עבר לגור איתך.'),
            [flag('life:master:R-ABROAD:welcome', 'showed-life'), heart(2), bond('elder', 2)]),
          o('game', t('Go out together to a match that suits the plan', 'לצאת יחד למשחק מאושר שמתאים לתוכנית'), s('elder', 'A match that is actually possible from here, with tickets that actually exist. We do not invent a trip nobody can make.', 'משחק שבאמת אפשרי מכאן, עם כרטיסים שבאמת קיימים. לא ממציאים נסיעה שאף אחד לא יכול לעשות.'),
            [flag('life:master:R-ABROAD:welcome', 'went-out'), energy(-10), coins(-3), bond('elder', 3)]),
          o('stay', t('Stay in with him', 'להישאר בבית איתו'), s('elder', 'In, then. Soup, the colours on the wall, no ticket. That is the nearest we have been in years.', 'פנימה, אם כך. מרק, הצבעים על הקיר, בלי כרטיס. זו הפעם הכי קרובה שהיינו בשנים.'),
            [flag('life:master:R-ABROAD:welcome', 'stayed-in'), bond('elder', 2), heart(1)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── R-DIST · distance and the way back
  chapter({
    id: 'R-DIST', age: 41, act: 2, title: t('Distance and Return', 'מרחק וחזרה'), when: {flag: 'life:route:dist'},
    intro: t('You said you wanted less. Nobody called it a punishment.', 'אמרת שאתה רוצה פחות. אף אחד לא קרא לזה עונש.'),
    keep: {id: 'kept-in-absence', name: t('What stayed while you were away', 'מה שנשאר בזמן שלא היית'), note: t('Nothing you collected spoils from a pause. Being away rubs out no keepsake, and a great night does not drag you back.', 'שום דבר שאספת לא מתקלקל מהפסקה. היעדרות לא מוחקת מזכרת, וערב גדול לא גורר אותך חזרה.')},
    scenes: [
      sc({
        id: 'R-DIST-S1', room: 'bus-stop', who: 'friend', after: [], spot: 'sign', verb: 'talk',
        title: t('Not this Saturday', 'לא השבת הזאת'),
        lines: [
          s('friend', 'Not coming, or not coming anymore? I really want to understand. I am not measuring anything.', 'לא בא, או לא בא יותר? אני באמת רוצה להבין. אני לא מודד כלום.'),
          s(null, 'The bus is slow. For once, nobody is in a hurry to be rescued by it.', 'האוטובוס איטי. הפעם אף אחד לא ממהר שיצילו אותו בו.'),
        ],
        callbacks: [{when: {flag: 'life:route:abroad'}, lines: [s('friend', 'You moved once and kept going. Is this the same, or is it something else?', 'כבר עברת פעם אחת והמשכת. זה אותו דבר, או משהו אחר?')]}],
        task: t('Answer him honestly', 'לענות לו ביושר'),
        action: [s(null, 'The sign above you has not changed its mind in years.', 'השלט מעליך לא שינה את דעתו שנים.')],
        options: [
          o('slow', t('Slow down', 'להוריד קצב'), s('friend', 'Slower, then. I will still ask you now and then. You can say no. It will not be taken off any list.', 'לאט יותר, אם כך. אמשיך להזמין אותך מדי פעם. אפשר להגיד לא. זה לא ירד מאף רשימה.'),
            [flag('life:master:R-DIST:pace', 'slower'), bond('friend', 2)]),
          o('pause', t('Choose a stretch without matches', 'לבחור תקופה בלי משחקים'), s('friend', 'A stretch of life with no matches in it. Fine. Take it. Tell me when it feels like it is over, or when it does not.', 'תקופה של חיים בלי משחקים. בסדר. קח אותה. תגיד לי כשזה מרגיש גמור, או כשלא.'),
            [flag('life:master:R-DIST:pace', 'pause'), heart(1), energy(5)]),
          o('open', t('Choose not to decide forever', 'לבחור לא להחליט לתמיד'), s('friend', 'So it is the shape it has today, with no secret clock on it. I like that. It is not a vote.', 'אז זו הצורה שיש לזה היום, בלי שעון סמוי. אני אוהב את זה. זו לא הצבעה.'),
            [flag('life:master:R-DIST:pace', 'undecided'), heart(2)]),
        ],
      }),
      sc({
        id: 'R-DIST-S2', room: 'street', who: 'stranger', spot: 'crates', verb: 'talk', cut: true,
        title: t('What you did in the meantime', 'מה עשית בינתיים'),
        lines: [
          s('stranger', 'You look different. Lighter, maybe. What did you spend the time on? The project, the habit, the person?', 'אתה נראה אחרת. קל יותר, אולי. על מה בילית את הזמן? הפרויקט, ההרגל, האדם?'),
          s(null, 'He means it. He is somebody from your life now, who has never seen you in a scarf.', 'הוא מתכוון לזה. הוא מהחיים שלך עכשיו, ולא ראה אותך אף פעם עם צעיף.'),
        ],
        callbacks: [{group: 'pace', when: is('life:master:R-DIST:pace', 'pause'), lines: [s(null, 'You said it was a stretch with no matches. It had other things in it, and he is about to hear which.', 'אמרת שזו תקופה בלי משחקים. היו בה דברים אחרים, והוא עומד לשמוע אילו.')]}],
        task: t('Say what filled the time', 'לומר מה מילא את הזמן'),
        action: [s(null, 'The crates behind him hold a stack of things somebody started and did not finish.', 'הארגזים מאחוריו מחזיקים ערימה של דברים שמישהו התחיל ולא סיים.')],
        options: [
          o('finish', t('Finish something you started', 'להשלים דבר שהתחלת'), s('stranger', 'You finished it. A whole thing, and it has nothing to do with the team. I am proud of you.', 'סיימת אותו. דבר שלם, ואין לו קשר לקבוצה. אני גאה בך.'),
            [flag('life:master:R-DIST:meantime', 'finished-thing'), flag('life:master:R-DIST:achievement', 'own'), heart(2), energy(-5)]),
          o('people', t('Be with people, with no goal', 'להיות עם אנשים בלי יעד'), s('stranger', 'Just people, then. Nothing to prove. That sounds like what life is for, not like waiting for something.', 'פשוט אנשים, אם כך. בלי להוכיח כלום. נשמע כמו מה שהחיים בשבילו, לא כמו המתנה למשהו.'),
            [flag('life:master:R-DIST:meantime', 'with-people'), bond('stranger', 3), heart(1)]),
          o('box', t('Open an old collection', 'לפתוח אוסף ישן'), s('stranger', 'You are allowed to miss something and not announce that you are going back. Show me what it is.', 'מותר להתגעגע למשהו בלי להכריז שחוזרים. תראה לי מה זה.'),
            [flag('life:master:R-DIST:meantime', 'old-box'), heart(2)]),
        ],
      }),
      sc({
        id: 'R-DIST-S3', room: 'kitchen', who: 'friend', spot: 'table', verb: 'sit', cut: true,
        title: t('He invited you to eat', 'הוא הזמין אותך לאכול'),
        lines: [
          s('friend', 'It is only dinner. No ticket. We can talk about something else, you know.', 'זו רק ארוחה. בלי כרטיס. אפשר גם לדבר על משהו אחר, אתה יודע.'),
          s(null, 'He has set your old place at the table without making a point of it.', 'הוא הניח את המקום הישן שלך בשולחן בלי להפוך את זה לעניין.'),
        ],
        callbacks: [
          {group: 'meantime', when: is('life:master:R-DIST:meantime', 'finished-thing'), lines: [s('friend', 'I heard what you finished. Bring it, if you want. If not, the soup is good anyway.', 'שמעתי מה סיימת. תביא, אם בא לך. אם לא, המרק טוב בכל מקרה.')]},
          {group: 'meantime', when: is('life:master:R-DIST:meantime', 'old-box'), lines: [s('friend', 'You opened the old box? You should see mine. Eat first.', 'פתחת את הקופסה הישנה? אתה צריך לראות את שלי. קודם תאכל.')]},
        ],
        task: t('Choose how to take the invitation', 'לבחור איך לקבל את ההזמנה'),
        action: [s(null, 'The soup does what soup does. Nobody mentions the empty seat at the end of the table.', 'המרק עושה מה שמרק עושה. אף אחד לא מזכיר את הכיסא הריק בקצה השולחן.')],
        options: [
          o('dinner', t('Come to the dinner only', 'לבוא רק לארוחה'), s('friend', 'Only dinner. A real dinner, and I will not ask once about Saturday. Well, maybe once. I will try not to.', 'רק ארוחה. ארוחה אמיתית, ולא אשאל פעם אחת על שבת. טוב, אולי פעם אחת. אנסה שלא.'),
            [flag('life:master:R-DIST:dinner', 'dinner-only'), bond('friend', 3)]),
          o('night', t('Ask to join the match evening too, if it is possible', 'לבקש להצטרף גם לערב המשחק אם אפשר'), s('friend', 'Join the evening? Yes. Of course yes. I will keep you a place, and no, nobody will make a thing of it.', 'להצטרף לערב? כן. ברור שכן. אשמור לך מקום, ולא, אף אחד לא יעשה מזה עניין.'),
            [flag('life:master:R-DIST:dinner', 'match-evening'), flag('life:master:R-DIST:return', 'gradual'), bond('friend', 2), heart(1)]),
          o('decline', t('Decline and stay in touch another way', 'לסרב ולשמור קשר אחר'), s('friend', 'Another way, then. A message on a rainy day. I will not put you on a list that calls you back on every screen.', 'דרך אחרת, אם כך. הודעה ביום גשום. לא אכניס אותך לרשימה שקוראת לך בכל מסך.'),
            [flag('life:master:R-DIST:dinner', 'declined'), flag('life:master:R-DIST:return', 'none'), heart(1)]),
        ],
      }),
      sc({
        id: 'R-DIST-S4', room: 'gate', who: 'steward', spot: 'board', verb: 'look', cut: true,
        title: t('The place did not wait, the people maybe did', 'המקום לא חיכה, האנשים אולי כן'),
        lines: [
          s('steward', 'Somebody else does that now, over there. The board, the list, even the kettle. You would not recognise it.', 'מישהו אחר עושה את זה עכשיו, שם. הלוח, הרשימה, אפילו הקומקום. לא היית מזהה.'),
          s(null, 'If you did come back, the faces have shifted. If you did not, you are meeting your friend outside the gate, where nobody keeps a list.', 'אם חזרת, הפנים השתנו. אם לא, אתה פוגש את החבר מחוץ לשער, איפה שאף אחד לא מנהל רשימה.'),
        ],
        callbacks: [
          {group: 'return', when: is('life:master:R-DIST:return', 'gradual'), lines: [s(null, 'You came back by a side door, and the side door is the one that stays open.', 'חזרת דרך דלת צדדית, והדלת הצדדית היא זו שנשארת פתוחה.')]},
          {group: 'return', when: is('life:master:R-DIST:return', 'none'), lines: [s(null, 'You are on the outside of the gate, and the gate is not locked against you.', 'אתה בצד החיצוני של השער, והשער לא נעול בפניך.')]},
        ],
        task: t('Decide what you are here, now', 'להחליט מה אתה כאן, עכשיו'),
        action: [s(null, 'Someone else\'s name is on the board in your old handwriting. They copied it, and they did it kindly.', 'שם של מישהו אחר על הלוח בכתב היד הישן שלך. הם העתיקו אותו, ובאהבה.')],
        options: [
          o('plain', t('Be a supporter with no role', 'להיות אוהד בלי תפקיד'), s('steward', 'Nobody owes you the old title. Come in, sit, have a look. That is already something.', 'אף אחד לא חייב לך את התואר הישן. כנס, שב, תראה. זה כבר משהו.'),
            [flag('life:master:R-DIST:now', 'plain-fan'), heart(2)]),
          o('new', t('Take on a new responsibility, if you were invited', 'לבנות אחריות חדשה אם הוזמנת'), s('steward', 'Here is something new, not the old role. Different hours, a different list, and it starts from nothing and counts from today.', 'הנה משהו חדש, לא התפקיד הישן. שעות אחרות, רשימה אחרת, ומתחיל מאפס וסופר מהיום.'),
            [flag('life:master:R-DIST:now', 'new-role'), energy(-10), bond('steward', 3)]),
          o('far', t('Stay at a distance', 'להישאר במרחק'), s('steward', 'From here you can see everything, and it can be a good place to stand. The rest of the road is open, with all the people and keepsakes you already have.', 'מכאן רואים הכול, וזה יכול להיות מקום טוב לעמוד בו. שאר הדרך פתוחה, עם כל האנשים והמזכרות שכבר יש לך.'),
            [flag('life:master:R-DIST:now', 'at-distance'), heart(1), energy(5)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── R-OWNER · an "if it had been different" branch
  chapter({
    id: 'R-OWNER', age: 23, act: 2, title: t('Optional Extension: Ownership in an Alternate History', 'הרחבה אופציונלית: בעלות בהיסטוריה חלופית'), when: {flag: 'life:route:owner'},
    intro: t('This is not what happened. This is what could have been, drawn in pencil.', 'זה לא מה שקרה. זה מה שיכול היה להיות, מצויר בעיפרון.'),
    keep: {id: 'what-if-ledger', name: t('The what-if ledger', 'פנקס האם-היה'), note: t('Kept apart from the archive, marked as invented. It records no fact, and it does not edit a single real result.', 'נשמר בנפרד מהארכיון, מסומן כמומצא. הוא לא רושם שום עובדה, ולא עורך אף תוצאה אמיתית.')},
    scenes: [
      sc({
        id: 'R-OWNER-S1', room: 'street', who: 'boss', after: [], spot: 'window', verb: 'talk',
        title: t('The number that is not on a shirt', 'המספר שאינו על חולצה'),
        lines: [
          s('boss', 'Before anything: this is an "if it had been different" branch. It is a story that did not happen. Nothing you do here changes who really owns {club}, or any real result. Here, and only here, I am pretending I could offer you more.', 'לפני הכול: זה ענף של "אילו היה אחרת". זה סיפור שלא קרה. שום דבר שתעשה כאן לא משנה מי באמת הבעלים של {club}, או תוצאה אמיתית כלשהי. כאן, ורק כאן, אני מעמיד פנים שאני יכול להציע לך יותר.'),
          s(null, 'He slides a ledger across the counter. Its first page says, in his own handwriting, "invented".', 'הוא מחליק פנקס על הדלפק. בעמוד הראשון כתוב, בכתב ידו: "מומצא".'),
          s('boss', 'You can step into the pencil version, stay a supporter with a small business, or just say no and go on with your life.', 'אפשר להיכנס לגרסת העיפרון, להישאר תומך עם עסק קטן, או פשוט להגיד לא ולהמשיך בחיים.'),
        ],
        task: t('Choose whether to enter this branch at all', 'לבחור אם להיכנס לענף הזה בכלל'),
        action: [s(null, 'The ledger smells of new paper and old promises. It is not a document anyone can use.', 'הפנקס מריח מנייר חדש ומהבטחות ישנות. זה לא מסמך שמישהו יכול להשתמש בו.')],
        options: [
          o('enter', t('Explicitly choose the alternate history', 'לבחור במפורש בהיסטוריה חלופית'), s('boss', 'You said it aloud, so we both know where we stand: in the pencil version. The real one is kept elsewhere and stays as it is.', 'אמרת את זה בקול, אז שנינו יודעים איפה אנחנו: בגרסת העיפרון. האמיתית נשמרת במקום אחר ונשארת כפי שהיא.'),
            [flag('life:master:R-OWNER:branch', 'entered'), flag('life:master:R-OWNER:what-if', 'yes'), heart(1)]),
          o('supporter', t('Stay a supporter and a business owner, without buying the club', 'להישאר תומך ובעל עסק בלי רכישת המועדון'), s('boss', 'A business of your own, and a ticket like anyone\'s. That is a good life. The fixed story goes on, unchanged.', 'עסק משלך, וכרטיס כמו של כולם. זה חיים טובים. הסיפור הקבוע ממשיך, ללא שינוי.'),
            [flag('life:master:R-OWNER:branch', 'supporter-business'), flag('life:master:R-OWNER:what-if', 'no'), coins(1), heart(1)]),
          o('decline', t('Decline and carry on with life', 'לסרב ולהמשיך בחיים'), s('boss', 'No. Fine. Nothing closes and nobody takes a title away from you. Shut the ledger, it is only paper.', 'לא. בסדר. שום דבר לא נסגר ואף אחד לא לוקח ממך תואר. סגור את הפנקס, זה רק נייר.'),
            [flag('life:master:R-OWNER:branch', 'declined'), flag('life:master:R-OWNER:what-if', 'no'), heart(2)]),
        ],
      }),
      sc({
        id: 'R-OWNER-S2', room: 'workshop', who: 'mate', spot: 'tools', verb: 'talk', cut: true,
        title: t('Who works with you', 'מי עובד איתך'),
        lines: [
          s(null, 'Still in the pencil version, if you chose it: invented partners, each with a want. One wants speed, one wants safety, one just wants the bench to be swept.', 'עדיין בגרסת העיפרון, אם בחרת בה: שותפים מומצאים, לכל אחד רצון. אחד רוצה מהירות, אחד רוצה ביטחון, אחד רק רוצה שהשולחן יטואטא.'),
          s('mate', 'Shared money and your own savings are two different jars. Do not pour one into the other and count it twice.', 'כסף משותף וחיסכון אישי הם שתי צנצנות שונות. אל תשפוך אחת לתוך השנייה ותספור פעמיים.'),
        ],
        callbacks: [{when: is('life:master:R-OWNER:branch', 'supporter-business'), lines: [s(null, 'You are not in the pencil version. Here the partners are real-sounding names for a small shop, nothing more.', 'אינך בגרסת העיפרון. כאן השותפים הם שמות שנשמעים אמיתיים לחנות קטנה, לא יותר.')]}],
        task: t('Decide how the team and the money are built', 'להחליט איך נבנים הצוות והכסף'),
        action: [s(null, 'The tools on the wall are drawn in outline, each with its owner\'s name pencilled beside it.', 'הכלים על הקיר מצוירים בקווי מתאר, ליד כל אחד שם הבעלים בעיפרון.')],
        options: [
          o('budget', t('Build a real budget and team inside the simulation', 'לבנות תקציב וצוות אמיתיים בתוך הסימולציה'), s('mate', 'Control for as long as the money covers it and the people who agreed stay agreed. A thin kind of control, but yours.', 'שליטה כל עוד הכסף מכסה ואלה שהסכימו נשארים מסכימים. שליטה דקה, אבל שלך.'),
            [flag('life:master:R-OWNER:team', 'own-budget'), coins(-3), energy(-10), bond('mate', 2)]),
          o('partner', t('Bring in a partner and keep less control', 'להכניס שותף ולהקטין שליטה'), s('mate', 'More can be done, and you decide less alone. When two people hold a lever, one of them sometimes lets go early.', 'אפשר לעשות יותר, ואתה מחליט פחות לבד. כששני אנשים מחזיקים מנוף, לפעמים אחד מהם עוזב מוקדם.'),
            [flag('life:master:R-OWNER:team', 'partner'), bond('mate', 3), heart(1)]),
          o('stop', t('Stop the window', 'לעצור את החלון'), s('mate', 'Stop it, then. The attempt stays on the record, and nobody asks you to own what you did not take.', 'לעצור, אם כך. הניסיון נשאר בתיעוד, ואף אחד לא מבקש ממך להחזיק במה שלא לקחת.'),
            [flag('life:master:R-OWNER:team', 'stopped'), heart(2)]),
        ],
      }),
      sc({
        id: 'R-OWNER-S3', room: 'street', who: 'mate', spot: 'crates', verb: 'open', cut: true,
        title: t('On Monday we open', 'ביום שני פותחים'),
        lines: [
          s(null, 'The shutter is half up. Whatever is on this street is paid for out of the same small jar, in this invented version, and each choice shuts another.', 'התריס פתוח למחצה. מה שיש ברחוב הזה משולם מאותה צנצנת קטנה, בגרסה המומצאת הזו, וכל בחירה סוגרת אחרת.'),
          s('mate', 'Service for the neighbours, something new to grow, or a reserve for the bad week. We cannot do all three. Not yet.', 'שירות לשכנים, משהו חדש לגדל, או עתודה לשבוע הרע. אי אפשר שלושתם. עוד לא.'),
        ],
        callbacks: [
          {group: 'team', when: is('life:master:R-OWNER:team', 'partner'), lines: [s(null, 'Your partner is already at the door with an opinion about the shutter.', 'השותף שלך כבר בדלת עם דעה על התריס.')]},
          {group: 'team', when: is('life:master:R-OWNER:team', 'stopped'), lines: [s(null, 'You stopped the window, so this is a small shop, with a small shutter, and nothing pencilled.', 'עצרת את החלון, אז זו חנות קטנה, עם תריס קטן, וכלום בעיפרון.')]},
        ],
        task: t('Choose where the first week\'s money goes', 'לבחור לאן הולך כסף השבוע הראשון'),
        action: [s(null, 'The shutter goes up with a sound like a held breath finally let out.', 'התריס עולה בקול של נשימה עצורה שסוף סוף משתחררת.')],
        options: [
          o('service', t('Invest in a project that serves people', 'להשקיע בפרויקט שמשרת אנשים'), s('mate', 'The neighbours will come for it. And the thing you did not spend on waits, and some of it will not wait long.', 'השכנים יבואו בשבילו. ומה שלא הוצאת עליו מחכה, וחלקו לא יחכה הרבה.'),
            [flag('life:master:R-OWNER:monday', 'service'), flag('life:master:R-OWNER:fiction-result', 'service-in-what-if'), coins(-4), heart(2)]),
          o('reserve', t('Keep a reserve and slow down', 'לשמור עתודה ולהאט'), s('mate', 'Slower. People wait outside, and they grumble. But there is room for the bad Tuesday that is surely coming.', 'לאט יותר. אנשים מחכים בחוץ, ומתלוננים. אבל יש מקום ליום שלישי הרע שוודאי יגיע.'),
            [flag('life:master:R-OWNER:monday', 'reserve'), flag('life:master:R-OWNER:fiction-result', 'reserve-in-what-if'), coins(2), energy(5)]),
          o('delegate', t('Hand authority to the management', 'להעביר סמכות להנהלה'), s('mate', 'They will make decisions. Some of them you would not have made, and you will hear about them last.', 'הם יקבלו החלטות. חלקן לא היית מקבל, ותשמע עליהן אחרון.'),
            [flag('life:master:R-OWNER:monday', 'delegated'), flag('life:master:R-OWNER:fiction-result', 'delegated-in-what-if'), bond('mate', 1), energy(10)]),
        ],
      }),
      sc({
        id: 'R-OWNER-S4', room: 'bedroom', who: 'friend', spot: 'wardrobe', verb: 'look', cut: true,
        title: t('The collection is not the club', 'האוסף אינו המועדון'),
        lines: [
          s(null, 'The childhood shirt is in the same drawer it always was. Nothing in the pencil version has touched it.', 'חולצת הילדות באותה מגירה שהייתה תמיד. שום דבר בגרסת העיפרון לא נגע בה.'),
          s('friend', 'I do not need the owner. I need you, for one evening. Can you come?', 'אני לא צריך את הבעלים. אני צריך אותך, לערב אחד. אתה יכול לבוא?'),
        ],
        callbacks: [
          {group: 'monday', when: is('life:master:R-OWNER:monday', 'delegated'), lines: [s(null, 'You gave authority away, so no phone call is waiting for you tonight. That is new.', 'נתת סמכות הלאה, אז אין טלפון שמחכה לך הערב. זה חדש.')]},
          {group: 'monday', when: is('life:master:R-OWNER:monday', 'service'), lines: [s(null, 'There is flour on your sleeve from the neighbours\' project. It does not wash out of the story.', 'יש קמח על השרוול מהפרויקט של השכנים. הוא לא יוצא מהסיפור בכביסה.')]},
        ],
        task: t('Choose between the evening and the work', 'לבחור בין הערב לעבודה'),
        action: [s(null, 'You hold the shirt for a moment. It is lighter than the ledger and weighs more.', 'אתה מחזיק את החולצה רגע. היא קלה מהפנקס ושוקלת יותר.')],
        options: [
          o('go', t('Hand the responsibility over and go', 'למסור אחריות ולבוא'), s('friend', 'You came. The team will keep things going without you, and neither of us will say a word about it tomorrow.', 'באת. הצוות ימשיך בלעדיך, ושניינו לא נגיד מילה על זה מחר.'),
            [flag('life:master:R-OWNER:evening', 'went'), bond('friend', 3), heart(2)]),
          o('later', t('Set another evening and stay at work', 'לתאם ערב אחר ולהישאר בעבודה'), s('friend', 'Another evening, then. I understand. It will cost something, and the story will remember who paid.', 'ערב אחר, אם כך. אני מבין. זה יעלה משהו, והסיפור יזכור מי שילם.'),
            [flag('life:master:R-OWNER:evening', 'postponed'), flag('life:master:R-OWNER:cost', 'personal'), bond('friend', -1), coins(2)]),
          o('exit', t('Leave the role, inside the scenario', 'לצאת מהתפקיד במסגרת התרחיש'), s('friend', 'You are out of the pencil version. What you lived stays with you, and there is no quiet way back into it. Come, then. Wear the old one.', 'יצאת מגרסת העיפרון. מה שחיית נשאר איתך, ואין דרך שקטה חזרה אליו. בוא, אם כך. לבש את הישנה.'),
            [flag('life:master:R-OWNER:evening', 'left-the-branch'), flag('life:master:R-OWNER:what-if', 'closed'), heart(2), bond('friend', 2)], {wearAdd: 'shirt'}),
        ],
      }),
    ],
  }),
]

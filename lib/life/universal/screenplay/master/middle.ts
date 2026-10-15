import type {ChapterScript} from '../types'
import {chapter, o, s, sc, t} from '../write'
import {bond, flag, heart, is} from '../types'

/**
 * Master screenplay F20–F25 (bible §16, 15.10.2026): the middle of the life — a photograph with someone missing,
 * a place that changed, a hard season, a person who stopped coming, the years somewhere else, an ordinary Saturday.
 *
 * Fiction only. Nothing here dies: absence is a change of availability, never a catastrophe (bible F23).
 * F22-S3 option 3 is the explicit decision to take a pause and raises `life:route:dist`.
 * F24 reads `life:route:abroad` / `life:route:dist` and gives a local alternative to whoever chose neither.
 */
export const MASTER_MIDDLE: ChapterScript[] = [
  // ───────────────────────────────────────────────────────────────────────── F20 · someone is missing from the picture
  chapter({
    id: 'F20', age: 34, act: 2, title: t('Someone Is Missing from the Picture', 'חסר מישהו בתמונה'),
    intro: t('A photograph only keeps the people who were standing there.', 'צילום שומר רק את מי שעמד שם.'),
    keep: {id: 'picture-with-gaps', name: t('The picture, or the memory of it', 'התמונה, או הזיכרון שלה'), note: t('Whoever is in it was there. Whoever is not was somewhere else.', 'מי שבתמונה היה שם. מי שלא, היה במקום אחר.')},
    scenes: [
      sc({
        id: 'F20-S1', room: 'street', who: 'friend', after: [], slot: 'corner', spot: 'window', verb: 'look',
        title: t('Just a moment, nobody move', 'רק רגע אל תזוזו'),
        lines: [
          s('friend', 'Wait. Stay there, all of you. We never take one of us.', 'חכו. תישארו שם, כולכם. אף פעם לא מצלמים אותנו.'),
          s(null, 'Someone counts heads out of habit and gets one fewer than the old number. Nobody says whose place it is.', 'מישהו סופר ראשים מתוך הרגל ויוצא לו אחד פחות מהמספר הישן. אף אחד לא אומר של מי המקום.'),
        ],
        task: t('Decide about the photograph', 'להחליט לגבי הצילום'),
        action: [s(null, 'The light is going soft on the wall behind you. It is the kind of light that makes everybody look like they meant it.', 'האור על הקיר שמאחוריכם נהיה רך. כזה שגורם לכולם להיראות כאילו התכוונו.')],
        options: [
          o('pose', t('Stand in with whoever is here', 'לעמוד עם מי שכאן'), s('friend', 'Closer. Closer. Nobody is going to bite you, we are a family of the {club}.', 'יותר קרוב. עוד. אף אחד לא נושך, אנחנו משפחת {club}.'),
            [flag('life:master:F20:photo', 'taken'), bond('friend', 2), heart(1)]),
          o('wait', t('Wait a little for the late one', 'לחכות קצת למאחר'), s('friend', 'Five minutes. If they are not here by then, the light is gone and so is the idea.', 'חמש דקות. אם הם לא כאן עד אז, האור הולך והרעיון איתו.'),
            [flag('life:master:F20:photo', 'waited'), bond('friend', 1)]),
          o('skip', t('Say let us not', 'להגיד שלא צריך'), s('friend', 'Fine. We will remember it badly, together. That counts too.', 'בסדר. נזכור את זה לא טוב, ביחד. גם זה נחשב.'),
            [flag('life:master:F20:photo', 'skipped'), heart(1)]),
        ],
      }),
      sc({
        id: 'F20-S2', room: 'street', who: 'friend', slot: 'kerb', spot: 'car', verb: 'use',
        title: t('Who holds the camera', 'מי מחזיק את המצלמה'),
        lines: [
          s('friend', 'Somebody has to be on the wrong side of it.', 'מישהו צריך להיות בצד הלא נכון שלה.'),
          s(null, 'Whoever holds the camera is the one person the picture will not have.', 'מי שמחזיק את המצלמה הוא האדם היחיד שהתמונה לא תכיל.'),
        ],
        callbacks: [
          {group: 'photo', when: is('life:master:F20:photo', 'taken'), lines: [s('friend', 'You stood in the middle without being asked. I noticed.', 'עמדת באמצע בלי שביקשו. שמתי לב.')]},
          {group: 'photo', when: is('life:master:F20:photo', 'waited'), lines: [s('friend', 'The late one did not come. The light stayed anyway, a little.', 'המאחר לא הגיע. האור נשאר בכל זאת, קצת.')]},
          {group: 'photo', when: is('life:master:F20:photo', 'skipped'), lines: [s('friend', 'You said no to a picture. Now we are only arguing about who would have held it.', 'אמרת לא לתמונה. עכשיו רק מתווכחים מי היה מחזיק אותה.')]},
        ],
        task: t('Sort out who takes it', 'לסדר מי מצלם'),
        action: [s(null, 'Phones and a borrowed little camera go round the group like a plate of something nobody wants to finish.', 'טלפונים ומצלמה קטנה שהושאלה עוברים בחבורה כמו צלחת שאף אחד לא רוצה לגמור.')],
        options: [
          o('self', t('Take it yourself, at arm\'s length', 'לצלם בעצמך, ביד מושטת'), s('friend', 'Your thumb is in it. It is a very honest thumb.', 'האגודל שלך בפנים. זה אגודל ישר מאוד.'),
            [flag('life:master:F20:camera', 'self'), heart(1)]),
          o('ask', t('Ask the woman by the shutter', 'לבקש מהאישה ליד התריס'), s('stranger', 'Of course. Move in. No — you, the tall one, you are lost behind your own friend.', 'בטח. התקרבו. לא — אתה, הגבוה, אתה נעלם מאחורי החבר שלך.'),
            [flag('life:master:F20:camera', 'asked'), bond('friend', 1)]),
          o('two', t('Take two, or just remember it', 'לצלם שתיים, או רק לזכור'), s('friend', 'Two, then. One for the wall and one for the drawer.', 'שתיים, אם כך. אחת לקיר ואחת למגירה.'),
            [flag('life:master:F20:camera', 'two'), heart(1)]),
        ],
      }),
      sc({
        id: 'F20-S3', room: 'bedroom', who: 'friend', slot: 'byDesk', spot: 'desk', verb: 'use', cut: true,
        title: t('Who you send it to', 'למי שולחים'),
        lines: [
          s(null, 'Later, at your desk, the picture sits on the screen. One face you expected is not in it. They have a life of their own now, and it does not run on our evenings.', 'אחר כך, ליד השולחן, התמונה על המסך. פנים אחד שציפית להן לא בפנים. יש להם חיים משלהם עכשיו, והם לא רצים לפי הערבים שלנו.'),
          s('friend', 'Send it. Or do not. Nobody is waiting by the phone.', 'שלח. או אל תשלח. אף אחד לא מחכה ליד הטלפון.'),
        ],
        callbacks: [
          {group: 'photo', when: is('life:master:F20:photo', 'skipped'), lines: [s(null, 'There is no picture to send. Only the evening, and what you can write about it.', 'אין תמונה לשלוח. רק הערב, ומה שאפשר לכתוב עליו.')]},
          {group: 'photo', when: {not: 'life:master:F20:photo'}, lines: []},
          {group: 'cam', when: is('life:master:F20:camera', 'self'), lines: [s(null, 'You are not in it, except for the edge of a thumb.', 'אתה לא בה, חוץ מקצה של אגודל.')]},
        ],
        task: t('Choose where it goes', 'לבחור לאן זה הולך'),
        action: [s(null, 'The cursor blinks next to a name you have typed many times and not lately.', 'הסמן מהבהב ליד שם שהקלדת הרבה פעמים ולא לאחרונה.')],
        options: [
          o('send', t('Send it with one personal line', 'לשלוח עם משפט אישי אחד'), s('me', 'We missed you in it. No pressure. Just so you have it.', 'חסרת בה. בלי לחץ. רק שתהיה לך.'),
            [flag('life:master:F20:sent', 'sent'), flag('life:master:F20:missing', 'told'), bond('friend', 2), heart(1)]),
          o('later', t('Hold it for the next time you meet', 'לשמור עד הפגישה הבאה'), s('me', 'I will hand it over in person. It will mean more with a coffee.', 'אתן את זה ביד. זה ישמע יותר עם קפה.'),
            [flag('life:master:F20:sent', 'held'), flag('life:master:F20:missing', 'later')]),
          o('private', t('Keep it private', 'להשאיר פרטי'), s('me', 'This one stays with those who stood there.', 'זאת נשארת אצל מי שעמד שם.'),
            [flag('life:master:F20:sent', 'private'), flag('life:master:F20:missing', 'noted'), heart(1)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F21 · here it used to be
  chapter({
    id: 'F21', age: 36, act: 2, title: t('It Used to Be Here', 'כאן היה'),
    intro: t('A place changes more quietly than the people who remember it.', 'מקום משתנה בשקט יותר מהאנשים שזוכרים אותו.'),
    keep: {id: 'meeting-place', name: t('The place you chose to meet', 'המקום שבחרת להיפגש בו'), note: t('A map with one new mark on it, put there by you.', 'מפה עם סימן חדש אחד, ששמת אתה.')},
    scenes: [
      sc({
        id: 'F21-S1', room: 'street', who: 'elder', after: [], slot: 'wall', spot: 'graffiti', verb: 'listen',
        title: t('The stop', 'העצירה'),
        lines: [
          s('elder', 'Here. This is where it was. You walk past now and you would never know.', 'כאן. זה היה המקום. היום עוברים פה ולא יודעים.'),
          s('child', 'What was it?', 'מה זה היה?'),
          s(null, 'The new one is looking at what is there now: a clean wall, a bin, a bicycle chained to a post. The old one is looking through it.', 'החדש מסתכל על מה שיש עכשיו: קיר נקי, פח, אופניים קשורים לעמוד. הוותיק מסתכל דרכו.'),
        ],
        task: t('Choose where to stand', 'לבחור איפה לעמוד'),
        action: [s(null, 'A van pulls away and the whole stretch of kerb looks suddenly open and indifferent.', 'ואן מתרחק, וכל קטע המדרכה נראה פתאום פתוח ואדיש.')],
        options: [
          o('listen', t('Listen to the memory', 'להקשיב לזיכרון'), s('elder', 'It was not mine. I got it from a man who got it from a woman who ran the stall. So take it as a story, not a fact.', 'זה לא היה שלי. קיבלתי אותו מאדם שקיבל מאישה שניהלה את הדוכן. אז קח את זה כסיפור, לא כעובדה.'),
            [flag('life:master:F21:stop', 'memory'), bond('elder', 2), heart(1)]),
          o('follow', t('Follow the new one', 'ללכת אחרי החדש'), s('child', 'Come on, there is a good place round the corner and nobody remembers it yet.', 'בוא, יש מקום טוב מעבר לפינה ועוד אף אחד לא זוכר אותו.'),
            [flag('life:master:F21:stop', 'new'), bond('child', 2)]),
          o('both', t('Meet them both, but separately', 'לפגוש את שניהם, בנפרד'), s('elder', 'Wise. A memory and a morning do not share a bench well.', 'חכם. זיכרון ובוקר לא חולקים ספסל כמו שצריך.'),
            [flag('life:master:F21:stop', 'both'), heart(1)]),
        ],
      }),
      sc({
        id: 'F21-S2', room: 'street', who: 'friend', slot: 'doorstep', spot: 'crates', verb: 'look',
        title: t('Not a mark left', 'לא נשאר סימן'),
        lines: [
          s('friend', 'There is nothing here. Not a nail, not a stain. Maybe it was a bit further along.', 'אין כאן כלום. לא מסמר, לא כתם. אולי זה היה קצת יותר הלאה.'),
          s(null, 'You do not draw a mark that is not there. You look at the wall as it is.', 'אתה לא מצייר סימן שאין. אתה מסתכל על הקיר כמו שהוא.'),
        ],
        callbacks: [
          {group: 'stop', when: is('life:master:F21:stop', 'memory'), lines: [s('friend', 'Your elder\'s story says it faced the road. This wall faces the road.', 'הסיפור של הוותיק שלך אומר שזה פנה לכביש. הקיר הזה פונה לכביש.')]},
          {group: 'stop', when: is('life:master:F21:stop', 'new'), lines: [s('friend', 'The new one never saw it, and still stopped exactly here. People do that.', 'החדש לא ראה את זה, ובכל זאת עצר בדיוק כאן. אנשים עושים את זה.')]},
          {group: 'stop', when: is('life:master:F21:stop', 'both'), lines: [s('friend', 'Two visits, two stories, one wall. The wall has no opinion.', 'שני ביקורים, שני סיפורים, קיר אחד. לקיר אין דעה.')]},
        ],
        task: t('Do something about the empty spot', 'לעשות משהו עם המקום הריק'),
        action: [s(null, 'You run a hand along the plaster, in case it remembers more than the street does.', 'אתה מעביר יד על הטיח, למקרה שהוא זוכר יותר מהרחוב.')],
        options: [
          o('search', t('Search the stretch together', 'לחפש יחד לאורך הקטע'), s('friend', 'Nothing by the corner. Nothing by the gate. Finding nothing is also a morning well spent.', 'כלום ליד הפינה. כלום ליד השער. גם למצוא כלום זה בוקר שהושקע יפה.'),
            [flag('life:master:F21:mark', 'searched'), bond('friend', 2)]),
          o('show', t('Show what you carry', 'להראות מה שיש לך'), s('friend', 'That is an old paper. Where did you keep it all this time? In a coat?', 'זה נייר ישן. איפה שמרת אותו כל הזמן? במעיל?'),
            [flag('life:master:F21:mark', 'shown'), flag('life:master:F21:held', 'kept'), heart(1)]),
          o('ritual', t('Start something new here', 'להתחיל כאן משהו חדש'), s('friend', 'A small thing. Same time, same place, once in a while. Nothing like what it was.', 'משהו קטן. אותה שעה, אותו מקום, מדי פעם. לא דומה למה שהיה.'),
            [flag('life:master:F21:mark', 'ritual'), bond('friend', 1), heart(1)]),
        ],
      }),
      sc({
        id: 'F21-S3', room: 'bus-stop', who: 'child', slot: 'bench', spot: 'sign', verb: 'talk', cut: true,
        title: t('Next time', 'בפעם הבאה'),
        lines: [
          s('child', 'There. Not that spot, this one. It has a roof and a bench, and the coffee is not terrible.', 'שם. לא המקום ההוא, זה. יש גג וספסל, והקפה לא נורא.'),
          s(null, 'It is a meeting place with no history at all. That is rather the appeal.', 'זה מקום מפגש בלי שום היסטוריה. זה בדיוק הקסם שלו.'),
        ],
        callbacks: [
          {group: 'mark', when: is('life:master:F21:mark', 'ritual'), lines: [s(null, 'You already half started this somewhere else. This could be its second home.', 'כבר התחלת חצי את זה בעוד מקום. זה יכול להיות הבית השני שלו.')]},
          {group: 'mark', when: is('life:master:F21:mark', 'searched'), lines: [s(null, 'You came out of the search with empty hands and good company.', 'יצאת מהחיפוש בידיים ריקות ובחברה טובה.')]},
        ],
        task: t('Answer about the new place', 'לענות על המקום החדש'),
        action: [s(null, 'A bus goes past without stopping, and nobody minds.', 'אוטובוס עובר בלי לעצור, ואף אחד לא מתרגז.')],
        options: [
          o('accept', t('Take the new place', 'לקבל את המקום החדש'), s('child', 'Good. Then it is the place. Put it on your list so I can be sure.', 'יופי. אז זה המקום. תרשום אצלך כדי שאהיה בטוח.'),
            [flag('life:master:F21:place', 'new'), bond('child', 2), heart(1)]),
          o('old', t('Ask to keep the old custom too', 'לבקש לשמור גם את המנהג הישן'), s('child', 'Both, then. Old one on the last day of the month, new one on the others. We will not fight over the calendar.', 'שניהם, אם כך. הישן ביום האחרון בחודש, החדש בשאר. לא נריב על הלוח.'),
            [flag('life:master:F21:place', 'both'), bond('child', 1)]),
          o('unsure', t('Say you do not know yet', 'להגיד שאתה עוד לא יודע'), s('child', 'Then you do not know. It will still be here when you do.', 'אז אתה לא יודע. זה עדיין יהיה כאן כשתדע.'),
            [flag('life:master:F21:place', 'open')]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F22 · what is left now
  chapter({
    id: 'F22', age: 38, act: 2, title: t('What Is Left Now', 'מה נשאר עכשיו'),
    intro: t('Hard seasons do not ask what you are made of. They ask how much room you have left.', 'עונות קשות לא שואלות ממה אתה עשוי. הן שואלות כמה מקום נשאר לך.'),
    keep: {id: 'letter-or-list', name: t('The list or the letter', 'הרשימה או המכתב'), note: t('Only what you actually wrote down, and nothing made up for you.', 'רק מה שבאמת כתבת, ושום דבר שהמציאו בשבילך.')},
    scenes: [
      sc({
        id: 'F22-S1', room: 'kitchen', who: 'friend', after: [], slot: 'tableEnd', spot: 'radio', verb: 'listen',
        title: t('Everyone is talking', 'כולם מדברים'),
        lines: [
          s(null, 'The {club} is going through something. The news comes in over the radio, then the phone, then the neighbours. Everyone has a version.', 'ב{club} עובר משהו. החדשות מגיעות ברדיו, אחר כך בטלפון, אחר כך מהשכנים. לכל אחד יש גרסה.'),
          s('friend', 'People are meeting tonight. Come. You do not have to say anything, you just have to be there.', 'אנשים נפגשים הערב. בוא. לא צריך להגיד כלום, רק להיות שם.'),
        ],
        task: t('Decide where to be tonight', 'להחליט איפה להיות הערב'),
        action: [s(null, 'The radio hisses between two stations, and for a second it is more honest than either.', 'הרדיו רוחש בין שתי תחנות, ולרגע הוא ישר יותר משתיהן.')],
        options: [
          o('group', t('Go meet the group', 'ללכת לפגוש את החבורה'), s('friend', 'Good. It is easier to take hard news in a room full of people who also have not slept.', 'טוב. קל יותר לקבל חדשות קשות בחדר מלא אנשים שגם לא ישנו.'),
            [flag('life:master:F22:night', 'group'), bond('friend', 2)]),
          o('home', t('Talk to someone close at home', 'לדבר עם מישהו קרוב בבית'), s('mum', 'Sit. I will make something. We do not have to solve anything.', 'שב. אכין משהו. לא חייבים לפתור כלום.'),
            [flag('life:master:F22:night', 'home'), bond('mum', 2), heart(1)]),
          o('off', t('Switch it all off for the evening', 'לכבות הכול לערב'), s('friend', 'Then I will tell you tomorrow what I would have told you tonight. It will keep.', 'אז אספר לך מחר מה שהייתי מספר הערב. זה יחזיק.'),
            [flag('life:master:F22:night', 'off')]),
        ],
      }),
      sc({
        id: 'F22-S2', room: 'street', who: 'kiosk', slot: 'customer', spot: 'bin', verb: 'talk', cut: true,
        title: t('The small thing you can do', 'הדבר הקטן שאפשר לעשות'),
        lines: [
          s('kiosk', 'I am not asking you to start an association. Carry two crates for me, or just stand here a while.', 'אני לא מבקש שתקים עמותה. תסחב לי שני ארגזים, או סתם תעמוד כאן קצת.'),
          s(null, 'Nobody in the street is asking for a speech. They are asking for ordinary company.', 'אף אחד ברחוב לא מבקש נאום. הם מבקשים חברה רגילה.'),
        ],
        callbacks: [
          {group: 'night', when: is('life:master:F22:night', 'group'), lines: [s('kiosk', 'I heard you were with them last night. They said you listened more than you spoke.', 'שמעתי שהיית איתם אתמול בלילה. אמרו שהקשבת יותר ממה שדיברת.')]},
          {group: 'night', when: is('life:master:F22:night', 'home'), lines: [s('kiosk', 'You stayed in with your people last night. Good. This street will still be here.', 'נשארת בבית עם שלך אתמול בלילה. טוב. הרחוב הזה עוד יהיה כאן.')]},
          {group: 'night', when: is('life:master:F22:night', 'off'), lines: [s('kiosk', 'No news from you since yesterday. That is a quiet kind of answer, too.', 'לא שמעתי ממך מאתמול. גם זו תשובה מסוג שקט.')]},
        ],
        task: t('Answer what he asked', 'לענות למה שביקש'),
        action: [s(null, 'The crates are heavier than they look, which is a thing you can say about most small requests.', 'הארגזים כבדים ממה שנראה, וזה משהו שאפשר להגיד על רוב הבקשות הקטנות.')],
        options: [
          o('do', t('Do the thing he asked', 'לעשות את מה שביקש'), s('kiosk', 'There. That is enough for today. You carry what you can, and you carry it home again.', 'הנה. זה מספיק להיום. סוחבים מה שאפשר, וסוחבים הביתה שוב.'),
            [flag('life:master:F22:small', 'did'), bond('kiosk', 3), heart(1)]),
          o('stay', t('Stay without taking anything on', 'להישאר בלי לקחת על עצמך'), s('kiosk', 'Stand there, then. I have enough people carrying. I do not have enough people standing.', 'תעמוד שם, אם כך. יש לי מספיק אנשים שסוחבים. אין לי מספיק אנשים שעומדים.'),
            [flag('life:master:F22:small', 'stayed'), bond('kiosk', 1)]),
          o('no', t('Say no, clearly', 'להגיד לא, בבירור'), s('kiosk', 'All right. I will hold you to what you said, not to what I hoped.', 'בסדר. אחזיק אותך במה שאמרת, לא במה שקיוויתי.'),
            [flag('life:master:F22:small', 'declined')]),
        ],
      }),
      sc({
        id: 'F22-S3', room: 'kitchen', who: 'mum', slot: 'table', spot: 'table', verb: 'sit', cut: true,
        title: t('How much room to give it', 'כמה מקום נותנים לזה'),
        lines: [
          s('mum', 'I am not asking what proves you are a supporter. I am asking what you want, right now, for yourself.', 'אני לא שואלת מה מוכיח שאתה אוהד. אני שואלת מה אתה רוצה, עכשיו, בשביל עצמך.'),
          s(null, 'It is quiet enough to hear the fridge. The question has been waiting for you longer than the evening has.', 'שקט מספיק כדי לשמוע את המקרר. השאלה מחכה לך יותר זמן מהערב.'),
        ],
        callbacks: [
          {group: 'small', when: is('life:master:F22:small', 'did'), lines: [s('mum', 'You carried things for someone this week. I am only saying it is allowed to also put things down.', 'סחבת דברים למישהו השבוע. אני רק אומרת שמותר גם להניח.')]},
          {group: 'small', when: is('life:master:F22:small', 'declined'), lines: [s('mum', 'You said no this week to something. Was that tiredness, or was that you?', 'אמרת לא השבוע למשהו. זו הייתה עייפות, או שזה היית אתה?')]},
          {group: 'night', when: is('life:master:F22:night', 'group'), lines: [s('mum', 'You came home with the group\'s voice in your coat.', 'חזרת הביתה עם הקול של החבורה במעיל.')]},
        ],
        task: t('Say it to her', 'להגיד לה'),
        action: [s(null, 'You hear yourself breathe out before you speak, and it tells you part of the answer already.', 'אתה שומע את עצמך נושף לפני שאתה מדבר, וזה כבר אומר לך חלק מהתשובה.')],
        options: [
          o('same', t('Keep to the pace you have', 'להמשיך בקצב הנוכחי'), s('mum', 'Then keep it. And tell me if it stops fitting.', 'אז תמשיך. ותגיד לי אם זה מפסיק להתאים.'),
            [flag('life:master:F22:room', 'same'), bond('mum', 2), heart(1)]),
          o('less', t('Be there less, but stay in touch', 'להיות פחות, אבל להישאר בקשר'), s('mum', 'A casual supporter. That is a real kind. Many of the best are.', 'אוהד מזדמן. זה סוג אמיתי. הרבה מהטובים ביותר כאלה.'),
            [flag('life:master:F22:room', 'less'), bond('mum', 2)]),
          o('pause', t('Say clearly that you are taking a break', 'להגיד במפורש שאתה לוקח הפסקה'), s('mum', 'Say it once so it is out in the room. Then it is a decision, not a drift. Nothing of yours disappears.', 'תגיד את זה פעם אחת שזה יהיה בחדר. אז זו החלטה, לא סחף. שום דבר שלך לא נעלם.'),
            [flag('life:master:F22:room', 'pause'), flag('life:route:dist', true), bond('mum', 1), heart(1)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F23 · the place that was not kept
  chapter({
    id: 'F23', age: 40, act: 2, title: t('The Place That Was Not Kept', 'המקום שלא נשמר'),
    intro: t('Somebody\'s seat is empty, and nothing has happened to anyone.', 'המקום של מישהו ריק, ולא קרה כלום לאף אחד.'),
    keep: {id: 'kept-thing', name: t('Something that stayed where it was', 'משהו שנשאר במקומו'), note: t('It still belongs with the person it belonged with.', 'הוא עדיין שייך למי שהוא היה שלו.')},
    scenes: [
      sc({
        id: 'F23-S1', room: 'bus-station', who: 'friend', after: [], slot: 'friend', spot: 'board', verb: 'look',
        title: t('He is not coming today', 'הוא לא בא היום'),
        lines: [
          s('friend', 'He wrote this morning. Something with work, and the car. He said to start without him.', 'הוא כתב הבוקר. משהו עם העבודה, והמכונית. אמר להתחיל בלעדיו.'),
          s(null, 'He used to be always the first one at this pillar. Nobody says it. Everyone looks at the pillar.', 'הוא תמיד היה הראשון ליד העמוד הזה. אף אחד לא אומר. כולם מסתכלים על העמוד.'),
        ],
        task: t('Decide what to do with his absence', 'להחליט מה עושים עם החסר'),
        action: [s(null, 'The board changes a platform number. A few people look up as if it concerned them.', 'הלוח מחליף מספר רציף. כמה אנשים מרימים מבט כאילו זה נוגע להם.')],
        options: [
          o('call', t('Message him, if you can', 'לכתוב לו, אם אפשר'), s('friend', 'Tell him the pillar misses him. No — tell him you saved a seat. Either way.', 'תכתוב לו שהעמוד מתגעגע. לא — שמרת לו מקום. כך או כך.'),
            [flag('life:master:F23:absent', 'reached'), bond('friend', 1), heart(1)]),
          o('here', t('Be with those who did come', 'להיות עם מי שבא'), s('friend', 'Good. A new friend does not have to replace an old one. They can just share the bench.', 'טוב. חבר חדש לא חייב להחליף ישן. אפשר סתם לחלוק ספסל.'),
            [flag('life:master:F23:absent', 'company'), bond('friend', 2)]),
          o('alone', t('Go on alone', 'להמשיך לבד'), s('me', 'It is fine. I know the way. I will be fine.', 'זה בסדר. אני מכיר את הדרך. אסתדר.'),
            [flag('life:master:F23:absent', 'alone'), heart(1)]),
        ],
      }),
      sc({
        id: 'F23-S2', room: 'bus-station', who: 'child', slot: 'pillar', spot: 'bench', verb: 'talk',
        title: t('Who stands next to you', 'מי עומד לידך'),
        lines: [
          s('child', 'Is this your usual spot?', 'זה המקום הקבוע שלך?'),
          s(null, 'The new person asks it lightly, with no idea what the place is made of.', 'האדם החדש שואל בקלילות, בלי לדעת ממה המקום עשוי.'),
        ],
        callbacks: [
          {group: 'absent', when: is('life:master:F23:absent', 'reached'), lines: [s(null, 'Your message is still unanswered. It does not feel like silence yet. It feels like a long way home.', 'ההודעה שלך עדיין בלי תשובה. זה לא מרגיש כמו שתיקה עדיין. זה מרגיש כמו דרך ארוכה הביתה.')]},
          {group: 'absent', when: is('life:master:F23:absent', 'company'), lines: [s(null, 'Whoever came today is still here, a little tired, a little glad.', 'מי שבא היום עדיין כאן, קצת עייף, קצת שמח.')]},
          {group: 'absent', when: is('life:master:F23:absent', 'alone'), lines: [s(null, 'Alone, you notice more: who laughs, who looks away, who saves a corner of the bench.', 'לבד, אתה שם לב ליותר: מי צוחק, מי מסיט מבט, מי שומר פינה בספסל.')]},
        ],
        task: t('Answer the question', 'לענות על השאלה'),
        action: [s(null, 'You shift a little to make a space that was already there.', 'אתה זז מעט כדי לפנות מקום שכבר היה שם.')],
        options: [
          o('tell', t('Tell one memory of the place', 'לספר זיכרון אחד מהמקום'), s('child', 'I will keep that. I will tell it to someone, if you let me. Maybe even right.', 'אני אשמור את זה. אספר למישהו, אם תרשה. אולי אפילו נכון.'),
            [flag('life:master:F23:place', 'told'), bond('child', 2), heart(1)]),
          o('invite', t('Invite them to sit, or stand', 'להזמין אותם לשבת, או לעמוד'), s('child', 'Here? Next to you? You are sure? It looks like somebody\'s spot.', 'כאן? לידך? בטוח? זה נראה כמו המקום של מישהו.'),
            [flag('life:master:F23:place', 'invited'), bond('child', 3)]),
          o('elsewhere', t('Choose another place today', 'לבחור מקום אחר להיום'), s('child', 'All right, I\'ll follow you. Where are we going? I like being led.', 'בסדר, אני אחריך. לאן? אני אוהב שמובילים אותי.'),
            [flag('life:master:F23:place', 'elsewhere'), bond('child', 1)]),
        ],
      }),
      sc({
        id: 'F23-S3', room: 'room', who: 'mum', slot: 'sofaEnd', spot: 'frame', verb: 'look', cut: true,
        title: t('What you do not move', 'מה לא מזיזים'),
        lines: [
          s(null, 'Back at home you find a small thing on a shelf that belongs, in a way, to the one who did not come. A scarf for a different year, a folded note.', 'בבית אתה מוצא על מדף דבר קטן ששייך, בדרך מסוימת, למי שלא בא. צעיף של שנה אחרת, פתק מקופל.'),
          s('mum', 'Do not decide tonight. It has been there a long time.', 'אל תחליט הערב. זה שם הרבה זמן.'),
        ],
        callbacks: [
          {group: 'place', when: is('life:master:F23:place', 'told'), lines: [s(null, 'You told the memory of this place once today. Telling it makes it lighter to look at.', 'סיפרת היום פעם אחת את הזיכרון של המקום. לספר אותו מקל להסתכל.')]},
          {group: 'absent', when: is('life:master:F23:absent', 'reached'), lines: [s(null, 'A reply from him comes in while you stand there: just a thumb, and a word. It is enough to start with.', 'תשובה ממנו מגיעה בזמן שאתה עומד שם: סתם אגודל, ומילה. זה מספיק כדי להתחיל.')]},
        ],
        task: t('Decide what happens to the thing', 'להחליט מה קורה לחפץ'),
        action: [s(null, 'You pick it up, then you hold it the way you hold something that is not entirely yours.', 'אתה מרים אותו, ואז מחזיק כמו שמחזיקים דבר שלא לגמרי שלך.')],
        options: [
          o('leave', t('Leave it exactly where it is', 'להשאיר בדיוק במקום'), s('mum', 'Then it stays what it was. A thing in a place, with a person attached.', 'אז זה נשאר מה שהיה. דבר במקום, עם אדם מחובר אליו.'),
            [flag('life:master:F23:thing', 'left'), flag('life:master:F23:kept', 'in-place'), heart(1)]),
          o('move', t('Move it somewhere you will see it', 'להעביר למקום שתראה אותו'), s('mum', 'The shelf changes. The owner does not. Remember that you did not take it.', 'המדף משתנה. הבעלים לא. תזכור שלא לקחת אותו.'),
            [flag('life:master:F23:thing', 'moved'), flag('life:master:F23:kept', 'near'), bond('mum', 1)]),
          o('return', t('Set it aside to give back, if you can', 'להניח בצד כדי להחזיר, אם אפשר'), s('mum', 'Only if he is there to hand it to. Otherwise it is better that it waits.', 'רק אם הוא שם לקבל. אחרת עדיף שיחכה.'),
            [flag('life:master:F23:thing', 'offered'), flag('life:master:F23:kept', 'return'), bond('mum', 2)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F24 · the years spent elsewhere
  chapter({
    id: 'F24', age: 42, act: 2, title: t('The Years That Were Elsewhere', 'השנים שהיו במקום אחר'),
    intro: t('Some years happen somewhere else, and they are still yours.', 'יש שנים שקורות במקום אחר, והן עדיין שלך.'),
    keep: {id: 'elsewhere-thing', name: t('Something from the other years', 'משהו מהשנים האחרות'), note: t('Made in the new life, or kept safe from the old one.', 'נעשה בחיים החדשים, או נשמר מהישנים.')},
    scenes: [
      sc({
        id: 'F24-S1', room: 'flat-abroad', who: 'stranger', after: [], slot: 'visitor', spot: 'window', verb: 'look',
        title: t('A Saturday without the old plan', 'שבת בלי התוכנית הישנה'),
        lines: [
          s(null, 'It is Saturday, and the old arrangement does not reach this far. The morning is yours to spend.', 'זו שבת, והסידור הישן לא מגיע עד כאן. הבוקר שלך להוציא.'),
          s('stranger', 'You have the whole day. What do you do with it? No wrong answer. It is a lot of day.', 'יש לך יום שלם. מה עושים איתו? אין תשובה לא נכונה. זה הרבה יום.'),
        ],
        callbacks: [
          {group: 'path', when: {flag: 'life:route:abroad'}, lines: [s(null, 'This is the flat you chose, with the window you chose, in a city that still pronounces your name a little wrong.', 'זאת הדירה שבחרת, עם החלון שבחרת, בעיר שעדיין מבטאת את השם שלך קצת לא נכון.')]},
          {group: 'path', when: {all: [{flag: 'life:route:dist'}, {not: 'life:route:abroad'}]}, lines: [s(null, 'You took the pause on purpose, and you are living it: a Saturday that belongs to nobody who is waiting for you.', 'לקחת את ההפסקה בכוונה, ואתה חי אותה: שבת שלא שייכת לאף אחד שמחכה לך.')]},
          {group: 'path', when: {none: [{flag: 'life:route:abroad'}, {flag: 'life:route:dist'}]}, lines: [s(null, 'You never left, and you never stepped back. Today, though, the Saturday goes to someone outside the usual crowd, in a town you know by heart.', 'לא עזבת ולא נסוגת. אבל היום השבת הולכת למישהו מחוץ לחבורה הרגילה, בעיר שאתה מכיר בעל פה.')]},
        ],
        task: t('Choose what the day is for', 'לבחור למה היום מיועד'),
        action: [s(null, 'The kettle clicks off in the next room, and the day offers itself politely, three times.', 'הקומקום נכבה בחדר השני, והיום מציע את עצמו בנימוס, שלוש פעמים.')],
        options: [
          o('project', t('Start a project of your own', 'להתחיל פרויקט משלך'), s('stranger', 'Good. Write down the first step so the second step knows where to find it.', 'טוב. תרשום את הצעד הראשון שהצעד השני יידע איפה למצוא אותו.'),
            [flag('life:master:F24:day', 'project'), flag('life:master:F24:made', 'begun'), heart(1)]),
          o('meet', t('Build a regular meeting of people', 'לבנות מפגש קבוע של אנשים'), s('stranger', 'Same hour, same table, no agenda. People will find it, if they need it.', 'אותה שעה, אותו שולחן, בלי סדר יום. אנשים ימצאו אם הם צריכים.'),
            [flag('life:master:F24:day', 'meeting'), bond('stranger', 2)]),
          o('rest', t('Rest, and do one small thing', 'לנוח ולעשות דבר קטן אחד'), s('stranger', 'One small thing. That is allowed. You do not owe the distance an achievement.', 'דבר קטן אחד. מותר. אתה לא חייב למרחק הישג.'),
            [flag('life:master:F24:day', 'rest'), heart(1)]),
        ],
      }),
      sc({
        id: 'F24-S2', room: 'kitchen', who: 'friend', slot: 'counter', spot: 'table', verb: 'talk', cut: true,
        title: t('It has already started over there', 'אצלכם כבר התחיל'),
        lines: [
          s('friend', 'It is starting here — at home. Everyone is out already. I just wanted to hear your voice.', 'זה מתחיל כאן — בבית. כולם כבר בחוץ. רציתי לשמוע את הקול שלך.'),
          s(null, 'The call comes through a channel that works today, and a little crackly tomorrow. Nobody has promised to answer every Saturday.', 'השיחה מגיעה בערוץ שעובד היום, וקצת מקרטע מחר. אף אחד לא הבטיח לענות בכל שבת.'),
        ],
        callbacks: [
          {group: 'day', when: is('life:master:F24:day', 'project'), lines: [s(null, 'You answer with ink on your hands, a little out of breath from your own project.', 'אתה עונה עם דיו על הידיים, קצת בלי נשימה מהפרויקט שלך.')]},
          {group: 'day', when: is('life:master:F24:day', 'meeting'), lines: [s(null, 'Behind you there are voices: yours is no longer the only one in the room.', 'מאחוריך יש קולות: שלך כבר לא היחיד בחדר.')]},
          {group: 'day', when: is('life:master:F24:day', 'rest'), lines: [s(null, 'You pick up slowly, with a small thing still half done on the table.', 'אתה עונה לאט, עם דבר קטן שעוד לא נגמר על השולחן.')]},
          {group: 'path', when: {flag: 'life:route:abroad'}, lines: [s('friend', 'Your hours are not our hours. I counted. I am still calling.', 'השעות שלך לא השעות שלנו. ספרתי. אני מתקשר בכל זאת.')]},
        ],
        task: t('Decide how to take the call', 'להחליט איך לקבל את השיחה'),
        action: [s(null, 'There is a gap on the line, and you decide not to fill it with an apology.', 'יש רווח בקו, ואתה מחליט לא למלא אותו בהתנצלות.')],
        options: [
          o('now', t('Be in touch right now', 'להיות בקשר עכשיו'), s('friend', 'Tell me about the place. I mean the real one, not the postcard.', 'ספר לי על המקום. את האמיתי, לא את הגלויה.'),
            [flag('life:master:F24:call', 'now'), bond('friend', 3), heart(1)]),
          o('later', t('Ask for another time', 'לבקש זמן אחר'), s('friend', 'Name a time. I will keep it, if you are going to keep it too.', 'תן שעה. אשמור אותה, אם גם אתה תשמור.'),
            [flag('life:master:F24:call', 'later'), bond('friend', 1)]),
          o('own', t('Carry on with your own day', 'להמשיך ביום שלך'), s('friend', 'Fine. No penalty. I will tell you what you missed, if you ask.', 'בסדר. בלי קנס. אספר לך מה פספסת, אם תשאל.'),
            [flag('life:master:F24:call', 'own')]),
        ],
      }),
      sc({
        id: 'F24-S3', room: 'schoolyard', who: 'child', slot: 'bench', spot: 'bench', verb: 'talk', cut: true,
        title: t('There is something to tell', 'יש מה לספר'),
        lines: [
          s('child', 'What do you call the thing you finished? Or the thing you started? You keep saying "it".', 'איך קוראים למה שסיימת? או למה שהתחלת? אתה כל הזמן אומר "זה".'),
          s(null, 'If there is no project, the question is about the day you spent together. Either way it is small, and true.', 'אם אין פרויקט, השאלה היא על היום שחלקתם. כך או כך זה קטן, ואמיתי.'),
        ],
        callbacks: [
          {group: 'day', when: is('life:master:F24:day', 'project'), lines: [s(null, 'It has a name only if you give it one. Names are cheap, and they stick.', 'יש לזה שם רק אם תיתן לו אחד. שמות זולים, והם נדבקים.')]},
          {group: 'day', when: is('life:master:F24:day', 'rest'), lines: [s(null, 'You did one small thing. It is enough for a sentence.', 'עשית דבר קטן אחד. זה מספיק למשפט.')]},
        ],
        task: t('Say what it was', 'להגיד מה זה היה'),
        action: [s(null, 'A ball rolls up to your foot, and you do not pick it up yet.', 'כדור מתגלגל אל הרגל שלך, ואתה עוד לא מרים אותו.')],
        options: [
          o('old', t('Tell the old crowd about it', 'לספר לחבורה הישנה'), s('child', 'Then they will know you exist outside of them. It is a fair thing to tell people.', 'אז הם יֵדעו שאתה קיים גם מחוצה להם. זה דבר הוגן לספר.'),
            [flag('life:master:F24:told', 'old'), bond('child', 1), heart(1)]),
          o('new', t('Keep it for the new place', 'לשמור את זה למקום החדש'), s('child', 'You can hold two identities. They fit better than people think.', 'אפשר להחזיק שתי זהויות. הן מתאימות יותר ממה שחושבים.'),
            [flag('life:master:F24:told', 'new'), bond('child', 2)]),
          o('unfinished', t('Leave it unfinished', 'להשאיר לא גמור'), s('child', 'An unfinished thing is a season, not a test. Nobody is marking it.', 'דבר לא גמור הוא תקופה, לא מבחן. אף אחד לא מסמן אותו.'),
            [flag('life:master:F24:told', 'open')]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F25 · an ordinary Saturday
  chapter({
    id: 'F25', age: 44, act: 2, title: t('An Ordinary Saturday', 'שבת רגילה'),
    intro: t('Nothing is on today. That is exactly why you came.', 'אין היום כלום. בדיוק בגלל זה באת.'),
    keep: {id: 'napkin-list', name: t('The napkin', 'המפית'), note: t('Only if somebody wrote on it. No prize for turning up.', 'רק אם מישהו כתב עליה. אין פרס על עצם ההגעה.'),
      when: {any: [is('life:master:F25:quarrel', 'checked'), is('life:master:F25:end', 'again')]}},
    scenes: [
      sc({
        id: 'F25-S1', room: 'street', who: 'friend', after: [], slot: 'doorstep', spot: 'window', verb: 'talk',
        title: t('Why you came out early', 'למה יצאת מוקדם'),
        lines: [
          s('friend', 'You came early. I thought I was the only one with nothing to do.', 'באת מוקדם. חשבתי שרק לי אין מה לעשות.'),
          s(null, 'No fixture, no event, no story to tell afterwards. {friend} just brought something to eat and sat down.', 'בלי משחק, בלי אירוע, בלי סיפור לספר אחר כך. {friend} פשוט הביא משהו לאכול והתיישב.'),
        ],
        task: t('Choose how to spend the hour', 'לבחור איך להעביר את השעה'),
        action: [s(null, 'The bag crackles. It smells like somebody\'s kitchen.', 'השקית מרשרשת. זה מריח כמו המטבח של מישהו.')],
        options: [
          o('join', t('Join without a purpose', 'להצטרף בלי מטרה'), s('friend', 'Sit. Eat. The conversation will find us. It always does, usually about nothing.', 'שב. תאכל. השיחה תמצא אותנו. היא תמיד מוצאת, בדרך כלל על כלום.'),
            [flag('life:master:F25:hour', 'joined'), bond('friend', 3)]),
          o('game', t('Suggest a short game', 'להציע משחק קצר'), s('friend', 'Best of three. Loser carries the bag. I warn you, I have been practising since last month.', 'הטוב משלוש. המפסיד סוחב את השקית. אני מזהיר, אני מתאמן מאז החודש שעבר.'),
            [flag('life:master:F25:hour', 'game'), bond('friend', 2), heart(1)]),
          o('elsewhere', t('Suggest going somewhere else', 'להציע ללכת למקום אחר'), s('friend', 'Where? Wait — I do know a man who never comes to the stands. He will be at his stall. We could visit.', 'לאן? רגע — אני מכיר אחד שאף פעם לא בא ליציע. הוא ליד הדוכן שלו. אפשר לבקר.'),
            [flag('life:master:F25:hour', 'elsewhere'), bond('friend', 1)]),
        ],
      }),
      sc({
        id: 'F25-S2', room: 'kitchen', who: 'friend', slot: 'table', spot: 'table', verb: 'talk', cut: true,
        title: t('The unimportant question', 'השאלה הלא חשובה'),
        lines: [
          s('friend', 'Who was late the time with the bus? Be honest. It was you.', 'מי איחר בפעם ההיא עם האוטובוס? תהיה כן. זה היה אתה.'),
          s(null, 'A small argument starts about nothing: who remembers what, who ate last, who was late once and never heard the end of it.', 'מתחיל ויכוח קטן על כלום: מי זוכר מה, מי אכל אחרון, מי איחר פעם ולא שמע את הסוף.'),
        ],
        callbacks: [
          {group: 'hour', when: is('life:master:F25:hour', 'game'), lines: [s('friend', 'I still owe you the rematch. Do not think I forgot.', 'אני עוד חייב לך מפגש חוזר. אל תחשוב ששכחתי.')]},
          {group: 'hour', when: is('life:master:F25:hour', 'elsewhere'), lines: [s('friend', 'That stall smelled of oranges. I keep thinking about the oranges.', 'הדוכן ההוא הריח כמו תפוזים. אני כל הזמן חושב על התפוזים.')]},
          {group: 'hour', when: is('life:master:F25:hour', 'joined'), lines: [s('friend', 'We did nothing, and it was the best part of the week.', 'לא עשינו כלום, וזה היה החלק הכי טוב בשבוע.')]},
        ],
        task: t('Take a side in the argument', 'לקחת צד בוויכוח'),
        action: [s(null, 'Someone slides a plate across the table, and the argument takes a short break to eat.', 'מישהו מחליק צלחת על השולחן, והוויכוח לוקח הפסקה קצרה לאכול.')],
        options: [
          o('insist', t('Insist you were right', 'להתעקש שצדקת'), s('friend', 'Fine. I will bring evidence. And a good laugh at your expense. Save a chair.', 'בסדר. אביא ראיה. וצחוק טוב על חשבונך. שמור כיסא.'),
            [flag('life:master:F25:quarrel', 'insisted'), bond('friend', 2)]),
          o('agree', t('Agree just to keep sitting here', 'להסכים רק כדי להמשיך לשבת'), s('friend', 'That was too easy. You gave in. I do not trust it, but I will take it.', 'זה היה קל מדי. ויתרת. אני לא סומך על זה, אבל אקח.'),
            [flag('life:master:F25:quarrel', 'agreed'), bond('friend', 1)]),
          o('check', t('Check something you both have', 'לבדוק יחד חפץ שיש לשניכם'), s('friend', 'The box. The album. Get it, I\'ll clear the table. Careful with the corners.', 'הקופסה. האלבום. תביא, אפנה את השולחן. תיזהר מהפינות.'),
            [flag('life:master:F25:quarrel', 'checked'), flag('life:master:F25:opened', 'box'), heart(1)]),
        ],
      }),
      sc({
        id: 'F25-S3', room: 'street', who: 'friend', slot: 'wall', spot: 'bin', verb: 'sit', cut: true,
        title: t('A bit longer', 'עוד קצת'),
        lines: [
          s(null, 'You could go now. Nothing is pushing you, no errand, no new task waiting round the corner.', 'אפשר ללכת עכשיו. שום דבר לא דוחף אותך, שום סידור, שום משימה חדשה מחכה מעבר לפינה.'),
          s('friend', 'It is up to you. I will be here either way, with this last bit of food.', 'זה בידיים שלך. אהיה כאן בכל מקרה, עם הפירור האחרון של האוכל.'),
        ],
        callbacks: [
          {group: 'quarrel', when: is('life:master:F25:quarrel', 'checked'), lines: [s(null, 'The box is still open on the step, with the lid held down by a mug.', 'הקופסה עדיין פתוחה על המדרגה, והמכסה מוחזק בידי ספל.')]},
          {group: 'quarrel', when: is('life:master:F25:quarrel', 'insisted'), lines: [s(null, 'The argument is over without being settled, which is the usual way.', 'הוויכוח נגמר בלי שהוכרע, וזו הדרך הרגילה.')]},
        ],
        task: t('Decide when to leave', 'להחליט מתי ללכת'),
        action: [s(null, 'The afternoon has gone amber at the edges and nobody has remarked on it.', 'אחר הצהריים נצבע בענבר בקצוות ואף אחד לא העיר על זה.')],
        options: [
          o('stay', t('Stay a little longer', 'להישאר עוד קצת'), s('friend', 'Good. A moment with no thing to be for. I do not have many of those left in the year.', 'טוב. רגע בלי דבר שהוא בשבילו. לא נשארו לי הרבה כאלה בשנה.'),
            [flag('life:master:F25:end', 'stayed'), bond('friend', 3), heart(1)]),
          o('go', t('Go at the time you chose', 'ללכת בזמן שבחרת'), s('friend', 'Go. You have somewhere else to be, and you said so in advance. That is a good way to leave.', 'לך. יש לך מקום אחר, ואמרת את זה מראש. זו דרך טובה ללכת.'),
            [flag('life:master:F25:end', 'left'), bond('friend', 1)]),
          o('again', t('Fix another Saturday', 'לקבוע עוד שבת'), s('friend', 'An invitation, not a promise. I will bring something, you bring yourself. Deal?', 'הזמנה, לא הבטחה. אני אביא משהו, אתה תביא את עצמך. סגרנו?'),
            [flag('life:master:F25:end', 'again'), bond('friend', 2)]),
        ],
      }),
    ],
  }),
]

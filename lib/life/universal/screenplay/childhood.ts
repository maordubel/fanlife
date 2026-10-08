import {chapter, o, s, sc, t} from './write'
import {bond, coins, energy, flag, heart, is, standing} from './types'

/**
 * Ages six to sixteen. A flat, a street, a schoolyard, a pitch, a bus.
 * Everything a child learns about a club he learns from somebody's hands: a radio, a scarf, a shirt that is too big.
 */
export const CHILDHOOD = [
  chapter({
    id: 'c1-colours', age: 6, act: 1, title: t('The Colours', 'הצבעים'),
    intro: t('Dad has looked at the clock four times. You can count to four.', 'אבא הביט בשעון ארבע פעמים. אתה יודע לספור עד ארבע.'),
    keep: {id: 'scarf', name: t('The first scarf', 'הצעיף הראשון'), note: t('It began in a room, not in a league table.', 'זה התחיל בחדר, לא בטבלה.')},
    scenes: [
      sc({
        id: 'S01', room: 'room', who: 'dad', hub: 'wait', after: [], sound: 'radio', game: 'tune', spot: 'tv',
        title: t('The appointed hour', 'השעה שלו'),
        lines: [
          s('dad', 'Quarter to. Bring the radio, the good one with the aerial.', 'רבע לפני. תביא את הרדיו, הטוב, זה עם האנטנה.'),
          s('me', 'Who are we waiting for?', 'מחכים למי?'),
          s('dad', 'For {club}. Nobody in this house waits for anyone else.', 'ל־{club}. בבית הזה לא מחכים לאף אחד אחר.'),
          s('dad', 'And batteries. Your mother believes I think they grow inside it.', 'וגם סוללות. אמא שלך חושבת שאני מאמין שהן גדלות בתוך הרדיו.'),
        ],
        task: t('Bring the radio and the batteries', 'להביא את הרדיו ואת הסוללות'),
        action: [
          s(null, 'The batteries are in the drawer behind the string and the key nobody can name. The radio coughs, then finds a voice.', 'הסוללות במגירה, מאחורי החוט והמפתח שאף אחד לא יודע של מה. הרדיו משתעל ואז מוצא קול.'),
          s('dad', 'You are in charge of the sound. It is a serious position.', 'אתה אחראי על הקול. זה תפקיד רציני.'),
        ],
        reward: {good: [heart(2)]},
        options: [
          o('ask', t('Ask what makes them ours', 'לשאול מה הופך אותם לשלנו'), s('dad', 'Stay beside me. We will find out together.', 'תישאר לידי. נגלה ביחד.'), [flag('life:first:question', 'asked'), bond('dad', 2)]),
          o('joke', t('Ask whether they know us', 'לשאול אם הם בכלל מכירים אותנו'), s('dad', 'Not yet. Be loud enough.', 'עדיין לא. תהיה מספיק חזק.'), [flag('life:first:question', 'joked')]),
          o('listen', t('Sit close and listen', 'לשבת קרוב ולהקשיב'), s(null, 'From the other room your mother calls: he has been saving that seat all morning.', 'מהחדר השני אמא קוראת: הוא שומר לך את המקום הזה כל הבוקר.'), [flag('life:first:question', 'quiet'), bond('dad', 3), heart(2)]),
        ],
      }),
      sc({
        id: 'S02', room: 'bedroom', who: 'mum', hub: 'wait', after: [], game: 'carry', spot: 'box',
        title: t('The box above you', 'הקופסה מעליך'),
        lines: [
          s('mum', 'Top shelf. Your father has been guarding that box since Tuesday.', 'המדף העליון. אבא שומר על הקופסה הזאת מיום שלישי.'),
          s('me', 'The box, or what is inside?', 'הקופסה או מה שיש בפנים?'),
          s('mum', 'He says I am not allowed to separate the two.', 'הוא אומר שאסור לי להפריד ביניהם.'),
          s(null, 'It is a shoebox. It has been opened so often that the lid has learned to bend.', 'זאת קופסת נעליים. פתחו אותה כל כך הרבה שהמכסה למד להתכופף.'),
        ],
        task: t('Open the box and take out the scarf', 'לפתוח את הקופסה ולהוציא את הצעיף'),
        action: [s(null, 'You bring it down in both arms. The scarf is longer than you are. It smells of a cupboard and of a Saturday.', 'אתה מוריד אותה בשתי ידיים. הצעיף ארוך ממך. הוא מריח כמו ארון וכמו שבת.')],
        reward: {good: [heart(1)]},
        options: [
          o('wear', t('Wrap it around yourself', 'לעטוף את עצמך'), s('mum', 'Leave room to breathe. You are going to need it.', 'תשאיר מקום לנשום. אתה עוד תצטרך.'), [flag('life:scarf:way', 'worn'), heart(2)], {wearAdd: 'scarf'}),
          o('share', t('Keep one end for Dad', 'לשמור קצה אחד לאבא'), s('mum', 'He will pretend it is nothing. Let him.', 'הוא יעמיד פנים שזה כלום. תן לו.'), [flag('life:scarf:way', 'shared'), bond('dad', 5)]),
          o('carry', t('Carry it without wearing it', 'לשאת אותו ביד'), s('mum', 'Nobody said you have to be a coat rack.', 'אף אחד לא אמר שאתה צריך להיות קולב.'), [flag('life:scarf:way', 'carried')]),
        ],
      }),
      sc({
        id: 'S03', room: 'room', who: 'dad', after: ['S01', 'S02'], sound: 'roar', game: 'clap', spot: 'tv',
        title: t('The first noise', 'הרעש הראשון'),
        lines: [
          s(null, 'Then the radio cannot hold all the noise. Dad is on his feet before you understand why.', 'ואז הרדיו לא מצליח להכיל את כל הרעש. אבא על הרגליים לפני שאתה מבין למה.'),
          s('mum', 'The neighbours!', 'השכנים!'),
          s('dad', 'They have radios too.', 'גם להם יש רדיו.'),
        ],
        callbacks: [
          {when: is('life:scarf:way', 'worn'), lines: [s('dad', 'You wore it. Of course you wore it.', 'לבשת אותו. ברור שלבשת.')]},
          {when: is('life:first:question', 'asked'), lines: [s('dad', 'You asked what makes them ours. That sound. That is what.', 'שאלת מה הופך אותם לשלנו. הקול הזה. זה מה.')]},
        ],
        task: t('Stay beside Dad until the room is quiet', 'להישאר ליד אבא עד שהחדר נרגע'),
        action: [s(null, 'He lifts you. The ceiling comes near and the floor becomes a memory.', 'הוא מרים אותך. התקרה מתקרבת והרצפה הופכת לזיכרון.')],
        reward: {good: [heart(2)]},
        options: [
          o('face', t('Look at his face', 'להסתכל על הפנים שלו'), s(null, 'For a second you see the boy he used to be.', 'לרגע אתה רואה את הילד שהוא היה.'), [flag('life:first:memory', 'face'), heart(4), bond('dad', 3)]),
          o('noise', t('Jump and make the noise', 'לקפוץ ולהצטרף לרעש'), s('dad', 'Good. You have understood the volume.', 'טוב. הבנת את העוצמה.'), [flag('life:first:memory', 'noise'), heart(5)]),
          o('scarf', t('Lift the scarf between you', 'להרים את הצעיף ביניכם'), s(null, 'Two hands each. Something belongs to both of you.', 'שתי ידיים לכל אחד. משהו שייך לשניכם.'), [flag('life:first:memory', 'scarf'), heart(4), bond('dad', 4)]),
        ],
      }),
    ],
  }),

  chapter({
    id: 'c2-shirt', age: 8, act: 1, title: t('The Shirt', 'החולצה'),
    intro: t('The shirt in the window has taken up your whole week.', 'החולצה בחלון תפסה לך את כל השבוע.'),
    keep: {id: 'shirt', name: t('The first shirt', 'החולצה הראשונה'), note: t('How you got it matters as much as its colour.', 'איך היא הגיעה אליך חשוב כמו הצבע שלה.')},
    scenes: [
      sc({
        id: 'S04', room: 'bedroom', who: 'mum', game: 'count', spot: 'desk', verb: 'take',
        title: t('The tin', 'הקופסה שמרשרשת'),
        lines: [
          s('me', 'I think I have enough.', 'נראה לי שיש לי מספיק.'),
          s('mum', 'Thinking is free. Count it.', 'לחשוב זה בחינם. תספור.'),
          s(null, 'Fourteen coins. You have counted them three ways and got fourteen three times.', 'ארבע עשרה מטבעות. ספרת אותם בשלוש שיטות וקיבלת ארבע עשרה שלוש פעמים.'),
        ],
        callbacks: [{when: is('life:scarf:way', 'shared'), lines: [s('mum', 'You gave your father the end of that scarf. He is still telling people.', 'נתת לאבא את הקצה של הצעיף. הוא עדיין מספר לכולם.')]}],
        task: t('Count the coins and carry the tin', 'לספור את המטבעות ולקחת את הקופסה'),
        action: [s(null, 'You count it once properly and put the coins in your pocket, one by one, like something that could escape.', 'אתה סופר פעם אחת כמו שצריך ושם את המטבעות בכיס, אחד אחד, כאילו יכולים לברוח.')],
        sound: 'coin',
        options: [
          o('alone', t('Keep the plan to yourself', 'לשמור את התוכנית לעצמך'), s('mum', 'I know that face. Wear something you can get dirty.', 'אני מכירה את הפרצוף הזה. תלבש משהו שאפשר ללכלך.'), [flag('life:shirt:asked', 'alone')]),
          o('ask', t('Tell Mum what you want', 'לספר לאמא מה אתה רוצה'), s('mum', 'Tell me the price first. Wanting is the easy part.', 'קודם תגיד מחיר. לרצות זה החלק הקל.'), [flag('life:shirt:asked', 'mum'), bond('mum', 3)]),
          o('dad', t('Ask Dad about his old shirt', 'לשאול את אבא על הישנה שלו'), s('mum', 'Ask him. He will go quiet, then he will go to the wardrobe.', 'תשאל אותו. הוא ישתתק ואז ילך לארון.'), [flag('life:shirt:asked', 'dad')]),
        ],
      }),
      sc({
        id: 'S05', room: 'street', who: 'kiosk', game: 'carry', spot: 'crates', verb: 'take',
        title: t('Six short', 'חסרים שישה'),
        lines: [
          s('kiosk', 'Twenty. Sleeves included.', 'עשרים. כולל שרוולים.'),
          s('me', 'Fourteen. Without the sleeves?', 'ארבע עשרה. בלי שרוולים?'),
          s('kiosk', 'We do not cut history to fit your budget.', 'לא גוזרים את ההיסטוריה לפי התקציב שלך.'),
        ],
        callbacks: [
          {group: 'asked', when: is('life:shirt:asked', 'alone'), lines: [s('kiosk', 'Your mother was in this morning. Said nothing. Bought bread slowly.', 'אמא שלך הייתה פה הבוקר. לא אמרה כלום. קנתה לחם לאט.')]},
          {group: 'asked', when: is('life:shirt:asked', 'mum'), lines: [s('kiosk', 'Your mother told me the number you gave her. An honest boy.', 'אמא שלך אמרה לי את המספר שנתת לה. ילד ישר.')]},
          {group: 'asked', when: is('life:shirt:asked', 'dad'), lines: [s('kiosk', 'Your father came by. Quoted me the price from when he was your age.', 'אבא שלך עבר פה. ציטט לי את המחיר מהימים שהיה בגיל שלך.')]},
        ],
        task: t('Close the gap the way you chose', 'לסגור את הפער בדרך שבחרת'),
        action: [s(null, 'You finish the errand, accept the help, or carry the old shirt home. Nobody calls it a smaller shirt.', 'אתה מסיים את הסידור, מקבל את העזרה או נושא את הישנה הביתה. אף אחד לא קורא לה חולצה קטנה יותר.')],
        options: [
          o('earned', t('Earn the difference with the crates', 'להרוויח את ההפרש עם הארגזים'), s('kiosk', 'Crates first. Shirt second. Keep the order.', 'קודם ארגזים. אחר כך חולצה. תשמור על הסדר.'), [flag('life:shirt:origin', 'earned'), standing(2), energy(-10)]),
          o('gift', t('Accept Mum’s quiet help', 'לקבל את העזרה השקטה של אמא'), s('mum', 'Count again. Slowly this time.', 'תספור שוב. הפעם לאט.'), [flag('life:shirt:origin', 'gift'), bond('mum', 3)]),
          o('handed', t('Take Dad’s old shirt', 'לקחת את הישנה של אבא'), s('dad', 'The sleeves know the way back. Roll them.', 'השרוולים מכירים את הדרך חזרה. תקפל אותם.'), [flag('life:shirt:origin', 'handed'), bond('dad', 4), heart(2)]),
        ],
      }),
      sc({
        id: 'S06', room: 'street', who: 'friend', slot: 'kerb',
        title: t('Too big', 'גדולה מדי'),
        lines: [
          s('friend', 'It is enormous.', 'היא ענקית.'),
          s('me', 'I am growing.', 'אני גדל.'),
          s('friend', 'Quickly, then. We need a goalkeeper.', 'אז מהר. חסר לנו שוער.'),
        ],
        callbacks: [
          {group: 'origin', when: is('life:shirt:origin', 'earned'), lines: [s('friend', 'The crates one? Everybody knows. It counts double.', 'זאת מהארגזים? כולם יודעים. היא נחשבת כפול.')]},
          {group: 'origin', when: is('life:shirt:origin', 'handed'), lines: [s('friend', 'It has a repair by the sleeve. That is a proper one.', 'יש לה תיקון ליד השרוול. זאת אמיתית.')]},
        ],
        task: t('Put it on and step out', 'ללבוש אותה ולצאת'),
        action: [s(null, 'You roll the sleeves. The street sees the shirt before it sees you.', 'אתה מקפל שרוולים. הרחוב רואה את החולצה לפני שהוא רואה אותך.')],
        options: [
          o('proud', t('Walk out first', 'לצאת ראשון'), s(null, 'You remember the walk as well as the shirt.', 'אתה זוכר גם את ההליכה, לא רק את החולצה.'), [flag('life:shirt:show', 'proud'), heart(3), standing(2)], {wearAdd: 'shirt'}),
          o('together', t('Ask your friend to come with you', 'לבקש מהחבר לצאת איתך'), s('friend', 'I was coming anyway. I just wanted to be asked.', 'בכל מקרה באתי. רק רציתי שתבקש.'), [flag('life:shirt:show', 'together'), bond('friend', 5)], {wearAdd: 'shirt'}),
          o('quiet', t('Wear it under your coat today', 'ללבוש אותה היום מתחת למעיל'), s('mum', 'There is no deadline for showing everybody.', 'אין מועד אחרון להראות לכולם.'), [flag('life:shirt:show', 'quiet'), heart(1)], {wearAdd: 'shirt'}),
        ],
      }),
    ],
  }),

  chapter({
    id: 'c3-saturday', age: 9, act: 1, title: t('The First Saturday', 'השבת הראשונה'),
    intro: t('Dad keeps touching the pocket with the tickets.', 'אבא נוגע שוב ושוב בכיס עם הכרטיסים.'),
    keep: {id: 'ticket', name: t('The first torn ticket', 'הכרטיס הקרוע הראשון'), note: t('The grass was real. The hand was familiar.', 'הדשא היה אמיתי. היד הייתה מוכרת.')},
    scenes: [
      sc({
        id: 'S07', room: 'room', who: 'dad', game: 'count', spot: 'table', sound: 'door',
        title: t('Who has the tickets?', 'אצל מי הכרטיסים?'),
        lines: [
          s('dad', 'Ready?', 'מוכן?'),
          s('me', 'I have been ready since yesterday.', 'אני מוכן מאתמול.'),
          s('mum', 'One of you should still check the tickets.', 'אחד מכם בכל זאת צריך לבדוק את הכרטיסים.'),
        ],
        callbacks: [
          {group: 'shirt', when: {wears: 'shirt'}, lines: [s('dad', 'That shirt again. Good. I am not saying it is lucky. I am not saying it is not.', 'שוב החולצה הזאת. יופי. אני לא אומר שהיא מביאה מזל. אני גם לא אומר שלא.')]},
          {group: 'shirt', when: {wears: 'plain'}, lines: [s('mum', 'Not the shirt? It is on the chair. Go on.', 'בלי החולצה? היא על הכיסא. קדימה.')]},
        ],
        task: t('Pack the scarf and check the tickets', 'לארוז את הצעיף ולבדוק את הכרטיסים'),
        action: [s(null, 'You hold the tickets up, count two, and put them back.', 'אתה מרים את הכרטיסים, סופר שניים ומחזיר.')],
        options: [
          o('me', t('Carry your own ticket', 'להחזיק את הכרטיס שלך'), s('dad', 'One pocket. Remember which one.', 'כיס אחד. תזכור איזה.'), [flag('life:ticket:holder', 'me'), standing(1)]),
          o('dad', t('Ask Dad to keep both', 'לבקש מאבא לשמור את שניהם'), s('dad', 'I have done this before. I am still checking.', 'כבר עשיתי את זה פעם. ועדיין בודק.'), [flag('life:ticket:holder', 'dad'), bond('dad', 2)]),
          o('check', t('Check together and share the job', 'לבדוק יחד ולחלוק את האחריות'), s('mum', 'A committee. Before breakfast.', 'ועדה. עוד לפני ארוחת בוקר.'), [flag('life:ticket:holder', 'both'), bond('dad', 2), bond('mum', 2)]),
        ],
      }),
      sc({
        id: 'S08', room: 'tunnel', who: 'dad', sound: 'murmur', spot: 'sign',
        escort: [{who: 'dad', rooms: ['room', 'street', 'route', 'gate']}],
        title: t('Towards the light', 'אל האור'),
        lines: [
          s(null, 'The sound becomes a place. You stop without deciding to.', 'הרעש הופך למקום. אתה עוצר בלי להחליט.'),
          s('dad', 'No hurry. It is still there.', 'לא ממהרים. הוא עדיין שם.'),
        ],
        callbacks: [{when: is('life:first:memory', 'face'), lines: [s('dad', 'You keep looking at me. Look ahead, too.', 'אתה ממשיך להסתכל עליי. תסתכל גם קדימה.')]}],
        task: t('Walk the last stretch together', 'ללכת יחד את הקטע האחרון'),
        action: [s(null, 'You take a step. Then another. The tunnel opens onto {ground}.', 'אתה עושה צעד. ועוד אחד. המנהרה נפתחת אל {ground}.')],
        options: [
          o('hand', t('Take his hand', 'לקחת את היד שלו'), s('dad', 'Like that.', 'ככה.'), [flag('life:tunnel:way', 'hand'), bond('dad', 4), heart(3)]),
          o('lead', t('Walk a little ahead', 'ללכת קצת לפניו'), s('dad', 'I am behind you.', 'אני מאחוריך.'), [flag('life:tunnel:way', 'lead'), standing(2), heart(3)]),
          o('pause', t('Ask for a moment to look', 'לבקש רגע להסתכל'), s('dad', 'Good idea. I forget to do that.', 'רעיון טוב. אני שוכח לעשות את זה.'), [flag('life:tunnel:way', 'pause'), heart(4)]),
        ],
      }),
      sc({
        id: 'S09', room: 'terrace', who: 'elder', game: 'clap', sound: 'roar', spot: 'banner',
        escort: [{who: 'dad', rooms: ['tunnel']}],
        title: t('One line is enough', 'מספיקה שורה אחת'),
        lines: [
          s('elder', 'You know the words?', 'אתה מכיר את המילים?'),
          s('me', 'One line.', 'שורה אחת.'),
          s('elder', 'Then the rest of us are useful.', 'אז כל השאר פה שימושיים.'),
        ],
        callbacks: [{when: {wears: 'scarf'}, lines: [s('elder', 'That scarf has been to more of these than you have. It knows where to stand.', 'הצעיף הזה היה ביותר משחקים ממך. הוא יודע איפה לעמוד.')]}],
        task: t('Join the rhythm your own way', 'להצטרף לקצב בדרך שלך'),
        action: [s(null, 'Hands meet. You find a place inside the sound.', 'הידיים נפגשות. אתה מוצא לך מקום בתוך הקול.')],
        reward: {good: [heart(3)]},
        options: [
          o('sang', t('Sing your one line', 'לשיר את השורה שלך'), s('dad', 'I heard you.', 'שמעתי אותך.'), [flag('life:sang'), flag('life:first:voice', 'sang'), heart(6), standing(2)]),
          o('watched', t('Watch Dad instead', 'להסתכל על אבא'), s(null, 'For once he does not notice being watched.', 'פעם אחת הוא לא שם לב שמסתכלים עליו.'), [flag('life:first:voice', 'watched'), heart(4), bond('dad', 3)]),
          o('clapped', t('Clap and learn the words later', 'למחוא כפיים וללמוד את המילים אחר כך'), s('elder', 'Next time, a second line.', 'בפעם הבאה, שורה שנייה.'), [flag('life:first:voice', 'clapped'), heart(4)]),
        ],
      }),
    ],
  }),

  chapter({
    id: 'c3a-album', age: 10, act: 1, title: t('The Missing Square', 'המשבצת החסרה'),
    intro: t('Ninety-nine faces and one square that keeps the album open.', 'תשעים ותשע פנים ומשבצת אחת שמשאירה את האלבום פתוח.'),
    keep: {id: 'album', name: t('The album', 'האלבום'), note: t('Not every gap has to be hidden.', 'לא כל חוסר צריך להסתיר.')},
    scenes: [
      sc({
        id: 'S10', room: 'bedroom', who: 'friend', hub: 'swap', after: [], game: 'count', spot: 'desk',
        title: t('The duplicates', 'הכפולים'),
        lines: [
          s('friend', 'You have that goalkeeper twice.', 'יש לך את השוער הזה פעמיים.'),
          s('me', 'Three times. He is doing better than the captain.', 'שלוש. הולך לו יותר טוב מהקפטן.'),
        ],
        callbacks: [{when: is('life:ticket:holder', 'me'), lines: [s('friend', 'You kept your own ticket last time, right? Then you can keep a list.', 'שמרת את הכרטיס שלך בעצמך בפעם הקודמת, נכון? אז אתה יכול לנהל רשימה.')]}],
        task: t('Sort the doubles for a swap', 'למיין כפולים להחלפה'),
        action: [s(null, 'You make a small pile. The empty square stays open.', 'אתה מכין ערימה קטנה. המשבצת הריקה נשארת פתוחה.')],
        options: [
          o('fair', t('Take the doubles you can spare', 'לקחת את הכפולים שאפשר לוותר עליהם'), s('friend', 'Finally. A squad with a plan.', 'סוף סוף. סגל עם תוכנית.'), [flag('life:album:offer', 'fair')]),
          o('favourite', t('Offer your favourite double', 'להציע כפול שאתה אוהב'), s('friend', 'You really want that last one.', 'אתה באמת רוצה את האחרון.'), [flag('life:album:offer', 'favourite'), heart(1)]),
          o('look', t('Go and see before you offer anything', 'לבדוק לפני שמציעים משהו'), s('friend', 'Scouting. We are professionals now.', 'סקאוטינג. נהיינו מקצוענים.'), [flag('life:album:offer', 'look')]),
        ],
      }),
      sc({
        id: 'S11', room: 'schoolyard', who: 'rival', hub: 'swap', after: [], game: 'carry', spot: 'ball',
        title: t('A person on the other side', 'מישהי מהצד השני'),
        lines: [
          s('rival', 'I have your missing one.', 'יש לי את זה שחסר לך.'),
          s('me', 'Twice?', 'פעמיים?'),
          s('rival', 'One for me. One for negotiation.', 'אחד בשבילי. אחד למשא ומתן.'),
        ],
        callbacks: [{when: is('life:first:voice', 'sang'), lines: [s('rival', 'My brother says you sang at the ground. Loudly. With one line.', 'אח שלי אומר ששרת במגרש. חזק. עם שורה אחת.')]}],
        task: t('Make the swap, or help with the ball', 'לבצע החלפה או לעזור עם הכדור'),
        action: [s(null, 'You finish what you agreed. Nobody has to pretend it was luck.', 'אתה מבצע את מה שסיכמתם. אף אחד לא צריך להעמיד פנים שזה מזל.')],
        options: [
          o('trade', t('Make the fair swap', 'לבצע החלפה הוגנת'), s('rival', 'Done. Keep the corners straight.', 'סגור. תשמור על הפינות ישרות.'), [flag('life:album:result', 'traded'), flag('life:rival:link', 'open'), bond('rival', 3)]),
          o('earn', t('Fetch her ball back first', 'להחזיר לה את הכדור קודם'), s('rival', 'Five minutes. Not a debt for life.', 'חמש דקות. לא חוב לכל החיים.'), [flag('life:album:result', 'earned'), flag('life:rival:link', 'open'), energy(-10), standing(1)]),
          o('gap', t('Keep your card and leave the square empty', 'לשמור את שלך ולהשאיר משבצת ריקה'), s('rival', 'Tell me if you change your mind.', 'תגיד לי אם תשנה את דעתך.'), [flag('life:album:result', 'gap'), flag('life:rival:link', 'neutral'), heart(2)]),
        ],
      }),
      sc({
        id: 'S12', room: 'street', who: 'kiosk', after: ['S10', 'S11'], spot: 'window',
        title: t('Bring it home', 'לקחת הביתה'),
        lines: [
          s('kiosk', 'Complete?', 'מלא?'),
          s('me', 'Depends what counts.', 'תלוי מה נחשב.'),
          s('kiosk', 'That question costs more than the packet.', 'השאלה הזאת עולה יותר מהחבילה.'),
        ],
        callbacks: [
          {group: 'album', when: is('life:album:result', 'traded'), lines: [s('kiosk', 'Traded for it, I hear. The best way. Not the cheapest, the best.', 'החלפת, שמעתי. הדרך הכי טובה. לא הזולה, הטובה.')]},
          {group: 'album', when: is('life:album:result', 'earned'), lines: [s('kiosk', 'Carried her ball across the yard for it. I know. The whole street knows.', 'סחבת לה את הכדור לאורך החצר בשביל זה. אני יודע. כל הרחוב יודע.')]},
          {group: 'album', when: is('life:album:result', 'gap'), lines: [s('kiosk', 'One square empty. It is more honest than most albums.', 'משבצת אחת ריקה. זה ישר יותר מרוב האלבומים.')]},
        ],
        task: t('Put the album in the box', 'לשים את האלבום בקופסה'),
        action: [s(null, 'You close the cover carefully. It will open at the same page years from now.', 'אתה סוגר בזהירות. בעוד שנים הוא ייפתח באותו עמוד.')],
        options: [
          o('show', t('Show how you got the card', 'להראות איך השגת את המדבקה'), s('friend', 'A whole conversation in one square.', 'שיחה שלמה בתוך משבצת.'), [flag('life:album:memory', 'person'), bond('friend', 3)]),
          o('tell', t('Tell Dad about the swap', 'לספר לאבא על ההחלפה'), s('dad', 'So who did you meet?', 'אז את מי פגשת?'), [flag('life:album:memory', 'told'), bond('dad', 3)]),
          o('keep', t('Keep today to yourself', 'לשמור את היום לעצמך'), s(null, 'You know what happened. That is enough for tonight.', 'אתה יודע מה קרה. זה מספיק להערב.'), [flag('life:album:memory', 'private')]),
        ],
      }),
    ],
  }),

  chapter({
    id: 'c4-yard', age: 12, act: 1, title: t('Monday', 'יום שני'),
    intro: t('The weekend has reached school before you.', 'סוף השבוע הגיע לבית הספר לפניך.'),
    keep: {id: 'armband', name: t('The strip of tape', 'רצועת הדבק'), note: t('Different colours, one team for an afternoon.', 'צבעים שונים, קבוצה אחת לאחר צהריים.')},
    scenes: [
      sc({
        id: 'S13', room: 'classroom', who: 'rival', spot: 'desk',
        title: t('The first joke', 'הבדיחה הראשונה'),
        lines: [
          s('rival', 'Still supporting them?', 'עדיין אוהד אותם?'),
          s('me', 'Still asking?', 'עדיין שואלת?'),
          s('teacher', 'Both of you. The lesson has a fixture too.', 'שניכם. גם לשיעור יש לוח משחקים.'),
        ],
        callbacks: [
          {group: 'link', when: is('life:rival:link', 'open'), lines: [s('rival', 'We swapped, remember? I know exactly what I am asking.', 'החלפנו, זוכר? אני יודעת בדיוק על מה אני שואלת.')]},
          {group: 'link', when: is('life:rival:link', 'neutral'), lines: [s('rival', 'You never did swap with me. Nerves?', 'אף פעם לא החלפת איתי. פחד במה?')]},
        ],
        task: t('Finish the lesson and go out', 'לסיים את השיעור ולצאת'),
        action: [s(null, 'The bell cuts the argument in half. Neither side claims a win.', 'הצלצול חותך את הוויכוח לשניים. אף צד לא מכריז ניצחון.')],
        options: [
          o('serious', t('Say they are yours', 'להגיד שהם שלך'), s('rival', 'All right. I heard you.', 'בסדר. שמעתי.'), [flag('life:yard:answer', 'serious'), standing(2), heart(2)]),
          o('joke', t('Say you signed before you could read', 'להגיד שחתמת לפני שידעת לקרוא'), s('rival', 'Bad lawyer. Good contract.', 'עורך דין גרוע. חוזה טוב.'), [flag('life:yard:answer', 'joke'), bond('rival', 2), standing(1)]),
          o('quiet', t('Leave the scarf where it is and say nothing', 'להשאיר את הצעיף במקום ולשתוק'), s('teacher', 'Not every question needs a class debate.', 'לא כל שאלה צריכה דיון כיתתי.'), [flag('life:yard:answer', 'quiet'), bond('teacher', 3), standing(-1)]),
        ],
      }),
      sc({
        id: 'S14', room: 'schoolyard', who: 'friend', game: 'clap', spot: 'ball',
        title: t('One player short', 'חסר שחקן'),
        lines: [
          s('friend', 'We need a goalkeeper.', 'חסר שוער.'),
          s('rival', 'I can play.', 'אני יכולה לשחק.'),
          s('friend', 'Can you stop talking while you do it?', 'את יכולה להפסיק לדבר תוך כדי?'),
        ],
        callbacks: [{when: {any: [is('life:shirt:show', 'proud'), is('life:shirt:show', 'together')]}, lines: [s('friend', 'Wear the shirt, you said. Show them, you said. Now show them in goal.', 'תלבש את החולצה, אמרת. תראה להם, אמרת. עכשיו תראה להם בשער.')]}],
        task: t('Mark the sides and play together', 'לסמן צדדים ולשחק יחד'),
        action: [s(null, 'You mark the sides, carry the ball and begin. Colours are not positions.', 'אתה מסמן צדדים, מביא כדור ומתחיל. צבעים הם לא עמדות.')],
        reward: {good: [bond('rival', 2)]},
        options: [
          o('invite', t('Invite her onto your side', 'להזמין אותה לצד שלך'), s('rival', 'Do not look surprised when I save one.', 'אל תיראה מופתע אם אעצור כדור.'), [flag('life:rival:link', 'open'), bond('rival', 6)]),
          o('compete', t('Play against her, fairly', 'לשחק נגדה, בהגינות'), s('rival', 'Now that is a proper argument.', 'עכשיו זה ויכוח כמו שצריך.'), [flag('life:rival:link', 'open'), energy(-10), heart(2)]),
          o('watch', t('Let the others play; keep the score', 'לתת לאחרים לשחק ולרשום תוצאה'), s('friend', 'You are the referee. Nobody likes that job.', 'אתה השופט. אף אחד לא אוהב את התפקיד הזה.'), [flag('life:rival:link', 'neutral'), standing(1)]),
        ],
      }),
      sc({
        id: 'S15', room: 'street', who: 'friend', slot: 'corner',
        title: t('The way home', 'הדרך הביתה'),
        lines: [
          s('friend', 'Same time tomorrow?', 'אותה שעה מחר?'),
          s('rival', 'Unless your lot have another disaster.', 'אלא אם לשלך יש עוד אסון.'),
          s('friend', 'The ball does not read the newspaper.', 'הכדור לא קורא עיתון.'),
        ],
        callbacks: [{when: is('life:yard:answer', 'quiet'), lines: [s('friend', 'You went quiet in there. I saw. It is allowed.', 'השתתקת שם. ראיתי. זה מותר.')]}],
        task: t('Walk home with someone', 'ללכת הביתה עם מישהו'),
        action: [s(null, 'You take the long street. Somebody passes you the ball without stopping.', 'אתה בוחר ברחוב הארוך. מישהו מוסר לך כדור בלי לעצור.')],
        options: [
          o('both', t('Walk with both of them', 'ללכת עם שניהם'), s('rival', 'I am still going to make the joke.', 'אני עדיין אספר את הבדיחה.'), [flag('life:yard:walk', 'both'), bond('friend', 2), bond('rival', 2)]),
          o('friend', t('Walk with your old friend', 'ללכת עם החבר הוותיק'), s('friend', 'She was all right, you know.', 'היא הייתה בסדר, אתה יודע.'), [flag('life:yard:walk', 'friend'), bond('friend', 4)]),
          o('alone', t('Take a little time alone', 'לקחת קצת זמן לבד'), s(null, 'The colours stay yours without an audience.', 'הצבעים נשארים שלך גם בלי קהל.'), [flag('life:yard:walk', 'alone'), heart(2)]),
        ],
      }),
    ],
  }),

  chapter({
    id: 'c4a-kickabout', age: 13, act: 1, title: t('Jackets for Goalposts', 'מעילים בתור קורות'),
    intro: t('Nobody owns the pitch. Everybody arrives with something to put down.', 'המגרש הוא של אף אחד. כולם מגיעים עם משהו להניח עליו.'),
    keep: {id: 'jacket-post', name: t('A jacket for a goalpost', 'מעיל בתור קורה'), note: t('You were somebody’s number nine for an afternoon.', 'היית המספר תשע של מישהו לאחר צהריים אחד.')},
    scenes: [
      sc({
        id: 'S55', room: 'pitch', who: 'friend', game: 'kick', spot: 'jackets',
        title: t('Jackets for goalposts', 'מעילים בתור קורות'),
        lines: [
          s('friend', 'Two jackets, six paces. Not five. Five is a cheat.', 'שני מעילים, שישה צעדים. לא חמישה. חמישה זה רמאות.'),
          s('me', 'Whose jacket?', 'המעיל של מי?'),
          s('friend', 'Whoever cares least about being warm.', 'של מי שהכי פחות אכפת לו מקור.'),
        ],
        callbacks: [{when: is('life:yard:walk', 'alone'), lines: [s('friend', 'You walked home alone last week. Today you are in the team. Deal?', 'חזרת הביתה לבד בשבוע שעבר. היום אתה בקבוצה. סגור?')]}],
        task: t('Set out the goal and the lines', 'לסדר את השער ואת הקווים'),
        action: [s(null, 'You pace it out, heel to toe. A pitch appears out of nothing, which is how all of them begin.', 'אתה מודד צעדים, עקב לאגודל. מגרש מופיע מכלום, ככה כולם מתחילים.')],
        reward: {good: [standing(1)]},
        options: [
          o('post', t('Give your jacket for a post', 'לתת את המעיל שלך לקורה'), s('friend', 'It is a good jacket. It will be a good post.', 'זה מעיל טוב. זו תהיה קורה טובה.'), [flag('life:kick:role', 'jacket'), heart(2), standing(1)]),
          o('ball', t('Bring your ball and own the game', 'להביא את הכדור ולהיות הבעלים של המשחק'), s('friend', 'Your ball, your rules. Until you go home with it.', 'הכדור שלך, החוקים שלך. עד שאתה הולך איתו הביתה.'), [flag('life:kick:role', 'ball'), standing(2)]),
          o('line', t('Pace out the pitch and call the lines', 'למדוד את המגרש ולקרוא את הקווים'), s('friend', 'Referee. There is always one, and nobody asks for him.', 'שופט. תמיד יש אחד, ואף אחד לא מבקש אותו.'), [flag('life:kick:role', 'lines'), bond('friend', 3)]),
        ],
      }),
      sc({
        id: 'S56', room: 'pitch', who: 'rival', slot: 'captain',
        title: t('Who picks first', 'מי בוחר ראשון'),
        lines: [
          s('rival', 'I am captain. Obviously. I brought the shorter jacket.', 'אני קפטנית. ברור. הבאתי את המעיל הקצר.'),
          s('friend', 'That is not how captains work.', 'ככה קפטנים לא עובדים.'),
          s('rival', 'It is exactly how captains work.', 'בדיוק ככה קפטנים עובדים.'),
          s(null, 'Eleven bodies on the stones. Two of them are good. One of them is your friend.', 'אחד עשר גופים על האבנים. שניים מהם טובים. אחד מהם חבר שלך.'),
        ],
        callbacks: [{when: is('life:rival:link', 'open'), lines: [s('rival', 'We have met. I will not pick you last. I might pick you last-but-one.', 'אנחנו מכירים. לא אבחר בך אחרון. אולי לפני האחרון.')]}],
        task: t('Choose who plays beside you', 'לבחור מי משחק לצדך'),
        action: [s(null, 'Two lines of children, each one pretending not to be waiting to be chosen.', 'שתי שורות של ילדים, כל אחד מעמיד פנים שהוא לא מחכה שיבחרו בו.')],
        options: [
          o('friend', t('Pick your friend first', 'לבחור קודם את החבר שלך'), s('friend', 'You could have picked the fast one. You did not.', 'יכולת לבחור את המהיר. לא בחרת.'), [flag('life:kick:picked', 'friend'), bond('friend', 5), standing(-1)]),
          o('best', t('Pick the best player and win', 'לבחור את הטוב ביותר ולנצח'), s('rival', 'Ruthless. I like it. I do not like you, but I like it.', 'חסר רחמים. אני אוהבת את זה. אותך אני לא אוהבת, אבל את זה כן.'), [flag('life:kick:picked', 'best'), standing(2), heart(2), bond('friend', -4)]),
          o('toss', t('Toss a coin and let it decide', 'להטיל מטבע ולתת לו להחליט'), s('rival', 'Fair. Annoyingly fair.', 'הוגן. מעצבן כמה שהוא הוגן.'), [flag('life:kick:picked', 'toss'), bond('rival', 2), standing(1)]),
        ],
      }),
      sc({
        id: 'S57', room: 'pitch', who: 'elder', night: true, game: 'kick', sound: 'whistle', final: true,
        title: t('Next goal wins', 'השער הבא מנצח'),
        lines: [
          s(null, 'The light has gone orange and then grey. The ball has become a rumour.', 'האור נהיה כתום ואחר כך אפור. הכדור הפך לשמועה.'),
          s('elder', 'You lot have a home to go to. I have seen you, though. Next goal wins.', 'לכם יש בית לחזור אליו. ראיתי אתכם, בכל זאת. השער הבא מנצח.'),
          s('friend', 'You have to call it. Say who you are.', 'אתה צריך לקרוא. תגיד מי אתה.'),
        ],
        callbacks: [{when: is('life:kick:picked', 'best'), lines: [s('friend', 'The one who picked the quick lad. Go on. Call it.', 'זה שבחר בקל. קדימה. תקרא.')]}],
        task: t('Take the last shot', 'לבעוט את הבעיטה האחרונה'),
        action: [s(null, 'You say a name that is not yours, the name of the one who wears the shirt you love. The ball answers.', 'אתה אומר שם שהוא לא שלך, של זה שלובש את החולצה שאתה אוהב. הכדור עונה.')],
        reward: {good: [heart(3)], slip: [heart(1)]},
        options: [
          o('stay', t('Stay for the last game', 'להישאר למשחק האחרון'), s('elder', 'Good. That is how anyone becomes anything.', 'יפה. ככה כולם הופכים למשהו.'), [flag('life:kick:last', 'stayed'), energy(-10), heart(4)]),
          o('home', t('Go home before dark', 'ללכת הביתה לפני שחשוך'), s('mum', 'Right on the stroke. I only counted twice.', 'בדיוק בזמן. ספרתי רק פעמיים.'), [flag('life:kick:last', 'home'), bond('mum', 3)]),
          o('ref', t('Referee the last game', 'לשפוט את המשחק האחרון'), s('friend', 'Fair. Hated. Fair.', 'הוגן. שנוא. הוגן.'), [flag('life:kick:last', 'ref'), standing(2), bond('friend', -1)]),
        ],
      }),
    ],
  }),

  chapter({
    id: 'c5-away', age: 16, act: 2, title: t('Without Dad', 'בלי אבא'),
    intro: t('The bag has been packed since Thursday. Nobody has asked.', 'התיק ארוז מיום חמישי. אף אחד לא שאל.'),
    keep: {id: 'stub', name: t('The scrap with the time on it', 'הפתק עם השעה'), note: t('The first Saturday you had to explain yourself.', 'השבת הראשונה שהיית צריך להסביר את עצמך.')},
    scenes: [
      sc({
        id: 'S16', room: 'kitchen', who: 'mum', game: 'carry', spot: 'radio',
        title: t('Where to?', 'לאן?'),
        lines: [
          s('mum', 'You are dressed early.', 'התלבשת מוקדם.'),
          s('me', 'It is a big day.', 'זה יום גדול.'),
          s('mum', 'Then use a whole sentence. Also, it is your grandmother’s lunch. Also, there is a test on Monday.', 'אז תשתמש במשפט שלם. וגם, זאת הארוחה אצל סבתא. וגם, יש מבחן ביום שני.'),
          s(null, 'The coach leaves at one. The lunch begins at one. Both of those are true.', 'האוטובוס יוצא באחת. הארוחה מתחילה באחת. שני הדברים נכונים.'),
        ],
        callbacks: [
          {group: 'memory', when: is('life:album:memory', 'told'), lines: [s('mum', 'You told your father about the swap, and he told me. You are a family that talks.', 'סיפרת לאבא על ההחלפה, והוא סיפר לי. אתם משפחה שמדברת.')]},
          {group: 'memory', when: is('life:album:memory', 'private'), lines: [s('mum', 'You keep your days to yourself. I notice. I am not saying anything.', 'אתה שומר את הימים שלך לעצמך. אני שמה לב. אני לא אומרת כלום.')]},
        ],
        task: t('Pack a coat and give a straight answer', 'לארוז מעיל ולתת תשובה ישרה'),
        action: [s(null, 'You take the parcel from the counter. It was for you before you answered.', 'אתה לוקח את החבילה מהשיש. היא הייתה בשבילך עוד לפני שענית.')],
        options: [
          o('tell', t('Tell her about the away coach (6 for the fare)', 'לספר לה על אוטובוס האורחים (6 לנסיעה)'), s('mum', 'I worry better when I know where.', 'אני דואגת טוב יותר כשאני יודעת לאן.'), [flag('life:home:trust', 'open'), flag('life:away:fare', 'paid'), coins(-6), bond('mum', 2)], {when: {min: ['coins', 6]}}),
          o('dodge', t('Say you are at your friend’s (6 for the fare)', 'להגיד שאתה אצל חבר (6 לנסיעה)'), s('mum', 'Say hello to his mother.', 'תמסור שלום לאמא שלו.'), [flag('life:home:trust', 'hidden'), flag('life:away:fare', 'paid'), coins(-6)], {when: {min: ['coins', 6]}}),
          o('later', t('Admit you are nervous and ask Dad for the fare', 'להודות שאתה לחוץ ולבקש מאבא את הנסיעה'), s('dad', 'So was I. Different coach. Same hands.', 'גם אני הייתי. אוטובוס אחר. אותן ידיים.'), [flag('life:home:trust', 'open'), flag('life:away:fare', 'dad'), bond('dad', 4)]),
          o('stay', t('Stay for the lunch and the test, and listen on the radio', 'להישאר לארוחה ולמבחן ולהקשיב ברדיו'), s('mum', 'You do not have to choose the sensible thing. I am glad you did.', 'אתה לא חייב לבחור בדבר הסביר. אני שמחה שבחרת.'), [flag('life:away:stayed'), flag('life:home:trust', 'open'), bond('mum', 4), standing(-1)]),
        ],
      }),
      sc({
        id: 'S17', room: 'bus-station', who: 'friend', east: 'bus-station', when: {not: 'life:away:stayed'}, game: 'count', sound: 'bus', spot: 'board',
        title: t('Two seats, one bag', 'שני מושבים, תיק אחד'),
        lines: [
          s('friend', 'My bag is holding your seat.', 'התיק שלי שומר לך מקום.'),
          s('me', 'How is it doing?', 'איך הולך לו?'),
          s('friend', 'Losing. Hurry.', 'מפסיד. מהר.'),
        ],
        callbacks: [{when: is('life:away:fare', 'dad'), lines: [s('friend', 'Your dad gave you the fare? Mine gave me a lecture. Yours wins.', 'אבא שלך נתן לך את הנסיעה? שלי נתן לי הרצאה. שלך מנצח.')]}],
        task: t('Board together and find the seats', 'לעלות יחד ולמצוא מושבים'),
        action: [s(null, 'You count the fare and lift the bags. The coach smells of a day that has already started.', 'אתה סופר את דמי הנסיעה ומרים תיקים. האוטובוס מריח כמו יום שכבר התחיל.')],
        reward: {good: [heart(2)]},
        options: [
          o('help', t('Help your nervous friend first', 'לעזור קודם לחבר הלחוץ'), s('friend', 'Stay till I am on. Then laugh.', 'תישאר עד שאעלה. אחר כך תצחק.'), [flag('life:away:help', 'helped'), bond('friend', 6), energy(-10)]),
          o('seat', t('Take the seats before they go', 'לתפוס מושבים לפני שייעלמו'), s('friend', 'Save one that is not luggage-sized.', 'תשמור אחד שהוא לא בגודל מזוודה.'), [flag('life:away:help', 'seats'), standing(1)]),
          o('share', t('Ask somebody older to join you', 'לבקש ממישהו מבוגר להצטרף'), s('elder', 'I was waiting for somebody to ask.', 'חיכיתי שמישהו יבקש.'), [flag('life:away:help', 'elder'), heart(3), standing(1)]),
        ],
      }),
      sc({
        id: 'S18', room: 'bus-stop', who: 'dad', east: 'bus-stop', after: ['S17'], final: true, spot: 'sign',
        title: t('Just passing', 'סתם עברתי'),
        lines: [
          s('dad', 'Oh. You. I was passing.', 'אה. אתה. סתם עברתי.'),
          s('me', 'At the last stop?', 'בתחנה האחרונה?'),
          s('dad', 'Slowly.', 'לאט.'),
        ],
        callbacks: [
          {group: 'trust', when: is('life:home:trust', 'hidden'), lines: [s(null, 'The story you gave at home is still in your mouth, like a stone.', 'הסיפור שנתת בבית עדיין בפה שלך, כמו אבן.')]},
          {group: 'trust', when: is('life:away:fare', 'dad'), lines: [s('dad', 'I wanted to see the fare come home with a face on it.', 'רציתי לראות את הנסיעה חוזרת הביתה עם פנים.')]},
        ],
        task: t('Walk home and finish the conversation', 'ללכת הביתה ולסיים את השיחה'),
        action: [s(null, 'The bag changes shoulders. The kitchen light is still on.', 'התיק עובר לכתף השנייה. האור במטבח עדיין דולק.')],
        options: [
          o('honest', t('Tell him where you really went', 'לספר לו לאן באמת נסעת'), s('dad', 'Next time tell me before. I might know a better stop.', 'בפעם הבאה תגיד לי קודם. אולי אני מכיר תחנה טובה יותר.'), [flag('life:home:trust', 'repaired'), heart(3), bond('dad', 3)]),
          o('quiet', t('Stay with the story you gave', 'להישאר עם הסיפור שסיפרת'), s('dad', 'Keep the stub somewhere it will not be washed.', 'תשמור את הפתק במקום שלא יכבסו.'), [flag('life:home:trust', 'hidden')]),
          o('thanks', t('Thank him for waiting and explain', 'להודות לו שחיכה ולהסביר'), s('dad', 'Passing. Slowly. We agreed.', 'עברתי. לאט. סיכמנו.'), [flag('life:home:trust', 'open'), bond('dad', 5), heart(2)]),
        ],
      }),
      sc({
        id: 'S67', room: 'room', who: 'dad', after: ['S16'], when: {flag: 'life:away:stayed'}, final: true, sound: 'radio', game: 'tune', spot: 'tv',
        title: t('The radio at the lunch', 'הרדיו בארוחה'),
        lines: [
          s('dad', 'Your grandmother has turned it down. Your mother has turned it up. We have a treaty.', 'סבתא שלך הנמיכה. אמא שלך הגבירה. יש לנו הסכם.'),
          s('mum', 'He is allowed the radio until the soup. Then it is a family.', 'מותר לו הרדיו עד המרק. אחר כך זאת משפחה.'),
          s('dad', 'Sit. You stayed. I will explain the offside rule using the bread.', 'שב. נשארת. אני אסביר לך נבדל עם הלחם.'),
        ],
        task: t('Listen with them until the soup', 'להקשיב איתם עד המרק'),
        action: [s(null, 'The voice from the coach comes through the speaker, thin and happy. You are not on it. You are here.', 'הקול של האוטובוס עובר דרך הרמקול, דק ושמח. אתה לא שם. אתה כאן.')],
        reward: {good: [heart(3)]},
        options: [
          o('with', t('Listen with Dad, bread in hand', 'להקשיב עם אבא, עם לחם ביד'), s('dad', 'See? The bread is the whole defence.', 'ראית? הלחם הוא כל ההגנה.'), [heart(5), bond('dad', 5)]),
          o('study', t('Slip off to the test book between halves', 'לחמוק לספר המבחן בין המחצית'), s('mum', 'Between halves. A sensible boy. Dad is horrified.', 'בין המחציות. ילד הגיוני. אבא מזועזע.'), [standing(2), heart(2)]),
          o('gran', t('Ask your grandmother about her first match', 'לשאול את סבתא על המשחק הראשון שלה'), s('mum', 'Oh, you should not have. She will begin at the beginning.', 'אוי, לא היית צריך. היא תתחיל מההתחלה.'), [heart(4), bond('mum', 3)]),
        ],
      }),
    ],
  }),
]

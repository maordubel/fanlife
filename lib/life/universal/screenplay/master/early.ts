import type {ChapterScript} from '../types'
import {chapter, o, s, sc, t} from '../write'
import {bond, coins, collect, energy, flag, give, heart, is, lend, standing} from '../types'
import type {Effect} from '../../types'

/** hands, not words (spec 22.10.2026 §3): `id` names the action for the hands layer; `game` is what plays today */
const hands = (game: 'carry' | 'count' | 'clap' | 'tune', id: string, then: Effect[] = []): Effect => ({e: 'play', game, id, then})

/**
 * Master screenplay F04–F08 (bible §16, 15.10.2026): the day of the big match, the day after, the first
 * envelope, the one who has what you are missing, and the other side of the table.
 *
 * Fiction only. No year, no score, no opponent, no real person. The story is told in flags; what he actually holds
 * goes in the collection ledger (`state.collection`): the envelope's stickers and doubles, the favourite, a double
 * given to the one who has it, the favourite lent while he decides. Nothing in the ledger is made from nothing.
 * What F29 and F19 read: F06 `fav`, F07 `deal` and `gap`.
 */
export const MASTER_EARLY: ChapterScript[] = [
  // ───────────────────────────────────────────────────────────────────────── F04 · one more round
  chapter({
    id: 'F04', age: 9, act: 1, title: t('One More Round', 'עוד סיבוב אחד'),
    intro: t('The day is already moving. The only question is which part of it you are in.', 'היום כבר זז. השאלה היחידה היא באיזה חלק שלו אתה.'),
    keep: {id: 'day-scrap', name: t('What you were handed that day', 'מה שנתנו לך באותו יום'), note: t('A stub, a note, something from home. Whoever did not get one has the story instead.', 'ספח, פתק, משהו מהבית. מי שלא קיבל, יש לו את הסיפור.')},
    scenes: [
      sc({
        id: 'F04-S1', room: 'room', who: 'dad', after: [], spot: 'frame', verb: 'look',
        title: t('Leaving soon', 'יוצאים עוד מעט'),
        lines: [
          s(null, '{dadName} is going through the tickets one by one, the way other people count money.', '{dadName} עובר על הכרטיסים אחד אחד, כמו שאחרים סופרים כסף.'),
          s('dad', 'Twenty minutes. Shoes, scarf, and do not ask me where my keys are.', 'עשרים דקות. נעליים, צעיף, ואל תשאל איפה המפתחות שלי.'),
          s(null, 'Outside, {friend} is already shouting that the yard game is starting.', 'בחוץ {friend} כבר צועק שהמשחק בחצר מתחיל.'),
        ],
        callbacks: [
          {group: 'shirt', when: is('life:master:F03:shown', 'friend'), lines: [s('dad', 'Wear what you wore for {friend}. It worked.', 'תלבש מה שלבשת בשביל {friend}. זה עבד.')]},
          {group: 'shirt', when: is('life:master:F03:shown', 'quiet'), lines: [s('dad', 'Whatever you put on, put it on proudly. Or at least on time.', 'מה שתלבש, תלבש בגאווה. או לפחות בזמן.')]},
        ],
        task: t('Decide how to use the last twenty minutes', 'להחליט איך משתמשים בעשרים הדקות האחרונות'),
        action: [s(null, 'Everything you do now has a price, and for once you can see it.', 'לכל דבר שתעשה עכשיו יש מחיר, ובפעם הזאת אתה רואה אותו.')],
        options: [
          o('go', t('Go out with him', 'לצאת איתו'), s('dad', 'Walk next to me. I will tell you things on the way, if you are quiet.', 'תלך לידי. אספר לך דברים בדרך, אם תהיה בשקט.'),
            [flag('life:master:F04:plan', 'with-lead'), bond('dad', 3), energy(-5)]),
          o('yard', t('Play in the yard first', 'לשחק בחצר תחילה'), s('friend', 'Ten minutes! Just ten! You know I am bad at stopping.', 'עשר דקות! רק עשר! אתה יודע שאני גרוע בלעצור.'),
            [flag('life:master:F04:plan', 'yard'), bond('friend', 3), energy(-10)]),
          o('help', t('Help at home', 'לעזור בבית'), s('dad', 'The bins, the bag, the window. Then you are free, and you have earned it twice.', 'הפח, התיק, החלון. ואז אתה חופשי, והרווחת את זה פעמיים.'),
            [flag('life:master:F04:plan', 'home'), bond('dad', 2), coins(2)]),
        ],
      }),
      sc({
        id: 'F04-S2', room: 'street', who: 'friend', slot: 'kerb', spot: 'car', cut: true,
        title: t('The way you chose', 'הדרך שבחרת'),
        lines: [
          s(null, 'The street is full of people going somewhere. Nobody is carrying you there.', 'הרחוב מלא אנשים שהולכים לאנשהו. אף אחד לא נושא אותך לשם.'),
          s('friend', 'It is on the other side. We can still make it, or we can not.', 'זה בצד השני. אנחנו עוד יכולים להספיק, ואפשר שלא.'),
        ],
        callbacks: [
          {group: 'plan', when: is('life:master:F04:plan', 'with-lead'), lines: [s(null, 'His hand is on your shoulder, or ahead of you, you cannot quite tell.', 'היד שלו על הכתף שלך, או לפניך, אי אפשר לדעת.')]},
          {group: 'plan', when: is('life:master:F04:plan', 'yard'), lines: [s(null, 'You are sweating a little, and a little late.', 'אתה קצת מזיע, וקצת מאחר.')]},
          {group: 'plan', when: is('life:master:F04:plan', 'home'), lines: [s(null, 'You are the last one out of the house. The door sticks and you give it a shoulder.', 'אתה האחרון שיוצא מהבית. הדלת נתקעת ואתה נותן לה כתף.')]},
        ],
        task: t('Choose your way', 'לבחור את הדרך שלך'),
        action: [s(null, 'There is no bus that takes children to a place alone. Everything depends on whom you walk with.', 'אין אוטובוס שלוקח ילדים לבד. הכול תלוי עם מי אתה הולך.')],
        options: [
          o('plan', t('Stick to the plan', 'להמשיך לפי התוכנית'), s('friend', 'Then we go the way we said. Fast, and no side streets.', 'אז הולכים כמו שאמרנו. מהר, בלי סמטאות.'),
            [flag('life:master:F04:way', 'plan'), heart(1)]),
          o('help', t('Ask someone you met for help', 'לבקש עזרה ממישהו שפגשת'), s('kiosk', 'Go on, sit here. I will call someone who is going that way, and he will walk you to the corner.', 'בוא, שב כאן. אקרא למישהו שהולך לשם, והוא ילווה אותך עד הפינה.'),
            [flag('life:master:F04:way', 'favour'), flag('life:master:F04:owed', 'kiosk'), bond('kiosk', 3)]),
          o('skip', t('Give up on getting there today', 'לוותר על ההגעה היום'), s('friend', 'All right. We are not going. We are staying, and staying is something too.', 'בסדר. לא הולכים. נשארים, וגם נשארים זה משהו.'),
            [flag('life:master:F04:way', 'stay'), bond('friend', 2)], {skip: ['F04-S4']}),
        ],
      }),
      sc({
        id: 'F04-S4', room: 'terrace', who: 'dad', slot: 'fence', spot: 'pitch', verb: 'look', sound: 'roar',
        title: t('Lost on the grass', 'אבוד על הדשא'),
        lines: [
          s(null, 'The whistle goes. For a second nobody moves. Then the fence is just a fence nobody is guarding, and the whole crowd is on the grass.', 'השריקה נשמעת. לרגע אף אחד לא זז. ואז הגדר היא סתם גדר שאף אחד לא שומר עליה, וכל הקהל על הדשא.'),
          s('dad', 'Hold on to my sleeve. Do not let go of my sleeve.', 'תחזיק לי בשרוול. אל תעזוב את השרוול.'),
          s(null, 'You hold it for eleven steps. Someone lifts a stranger onto their shoulders and the sleeve is gone.', 'אתה מחזיק אחד־עשר צעדים. מישהו מרים זר על הכתפיים, והשרוול נעלם.'),
          s(null, 'All you can see is knees, scarves and the floodlights. Everyone is shouting, and none of them is him.', 'כל מה שאתה רואה זה ברכיים, צעיפים ופנסים. כולם צועקים, ואף אחד מהם הוא לא הוא.'),
          s('steward', 'You are not in trouble, little one. Everyone is lost tonight. Which way is your father?', 'אתה לא בצרות, קטן. כולם אבודים הערב. לאיזה כיוון אבא שלך?'),
        ],
        callbacks: [
          {group: 'way', when: is('life:master:F04:way', 'favour'), lines: [s('kiosk', 'The man from the kiosk is somewhere behind you, still pretending he only walked you to the corner.', 'האיש מהקיוסק נמצא איפשהו מאחוריך, עדיין מעמיד פנים שרק ליווה אותך עד הפינה.')]},
        ],
        task: t('Find your father on the pitch', 'למצוא את אבא על המגרש'),
        action: [s(null, 'You stand where the grass meets the touchline and choose which way to be brave.', 'אתה עומד איפה שהדשא פוגש את קו האורך ובוחר לאיזה כיוון להיות אמיץ.')],
        options: [
          o('search', t('Go and find him', 'ללכת ולמצוא אותו'), s('steward', 'Stay low and follow the loudest singing. Fathers drift towards it.', 'תישאר נמוך ותלך אחרי השירה הכי חזקה. אבות נסחפים אליה.'),
            [flag('life:title:night', 'search'), energy(-15), heart(3), standing(1)], {mission: {template: 'title-night'}}),
          o('waited', t('Stay by the goalpost and wait', 'להישאר ליד הקורה ולחכות'), s(null, 'You hold the post and count to a hundred, twice. He finds you on the third count, out of breath and laughing.', 'אתה מחזיק בקורה וסופר עד מאה, פעמיים. בספירה השלישית הוא מוצא אותך, מתנשף וצוחק.'),
            [flag('life:title:night', 'waited'), heart(2), bond('dad', 2)]),
          o('steward', t('Ask the steward to call for him', 'לבקש מהסדרן לקרוא לו'), s('steward', 'Name? … Good. I will say it into the radio as if it mattered. It does.', 'שם? … טוב. אגיד אותו בקשר כאילו זה חשוב. זה חשוב.'),
            [flag('life:title:night', 'steward'), heart(1)]),
        ],
      }),
      sc({
        id: 'F04-S3', room: 'kitchen', who: 'dad', slot: 'table', spot: 'table', cut: true,
        title: t('Where you were', 'איפה היית'),
        lines: [
          s(null, 'Later. The light in the kitchen is different, the way it is after a day that was bigger than you expected.', 'מאוחר יותר. האור במטבח אחר, כמו אחרי יום שהיה גדול ממה שציפית.'),
          s('dad', 'So? How was it?', 'נו? איך היה?'),
          s(null, 'Even a child who did not go has an answer. It is just a different answer.', 'גם לילד שלא הגיע יש תשובה. זו פשוט תשובה אחרת.'),
        ],
        callbacks: [
          {group: 'way', when: is('life:master:F04:way', 'favour'), lines: [s('dad', 'I heard someone walked you to the corner. We owe him something small.', 'שמעתי שמישהו ליווה אותך עד הפינה. אנחנו חייבים לו משהו קטן.')]},
          {group: 'sleeve', when: is('life:title:night', 'search'), lines: [s('dad', 'You let go of my sleeve and then you found me. I am not sure which of us was lost.', 'עזבת לי את השרוול ואז מצאת אותי. אני לא בטוח מי מאיתנו היה אבוד.')]},
          {group: 'sleeve', when: is('life:title:night', 'waited'), lines: [s('dad', 'A hundred, twice. You kept your head better than I kept my sleeve.', 'מאה, פעמיים. שמרת על הראש טוב יותר משאני שמרתי על השרוול.')]},
          {group: 'way', when: is('life:master:F04:way', 'stay'), lines: [s('dad', 'I would have liked you there. I am also glad you said so out loud.', 'הייתי רוצה שתהיה שם. ואני גם שמח שאמרת את זה בקול.')]},
        ],
        task: t('Answer him', 'לענות לו'),
        action: [s(null, 'There is a scrap of paper on the table. It might be yours, or it might be a story.', 'יש פיסת נייר על השולחן. אולי היא שלך, אולי היא סיפור.')],
        options: [
          o('keep', t('Keep the scrap you actually got', 'לשמור את מה שבאמת קיבלת'), s('dad', 'That one has a crease where it was held. Do not flatten it.', 'לזה יש קמט איפה שהחזיקו אותו. אל תיישר.'),
            [flag('life:master:F04:kept', 'scrap'), heart(2), bond('dad', 2)]),
          o('person', t('Leave the scrap and go with the person', 'להשאיר את הפריט וללכת עם האדם'), s('dad', 'No scrap, only the evening. That is the version that does not fade.', 'בלי פתק, רק הערב. זו הגרסה שלא דוהה.'),
            [flag('life:master:F04:kept', 'memory'), heart(1), bond('dad', 3)]),
          o('hear', t('Ask to hear what happened there', 'לבקש לשמוע מה קרה שם'), s('dad', 'I will tell you what I heard, and what I saw. They are two different tellings.', 'אספר לך מה ששמעתי, ומה שראיתי. אלה שני סיפורים שונים.'),
            [flag('life:master:F04:kept', 'told-by'), heart(1), bond('dad', 2)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F05 · the day after
  chapter({
    id: 'F05', age: 10, act: 1, title: t('The Day After', 'ביום שאחרי'),
    intro: t('Everyone wants the story. Nobody asked what you saw.', 'כולם רוצים את הסיפור. אף אחד לא שאל מה ראית.'),
    keep: {id: 'yard-score', name: t('The yard game tally', 'סימון של משחק החצר'), note: t('A strip of chalk, a pencil scoreline. Made up, and yours.', 'פס גיר, תוצאה בעיפרון. בדיוני, ושלך.')},
    scenes: [
      sc({
        id: 'F05-S1', room: 'classroom', who: 'friend', slot: 'back', spot: 'desk', after: [], verb: 'talk',
        title: t('Everyone asks', 'כולם שואלים'),
        lines: [
          s('friend', 'Nobody is going to let you sit until you tell it.', 'אף אחד לא יתן לך לשבת עד שתספר.'),
          s(null, 'Three rows turn around. {friend} knows where you were, and has no idea what you saw.', 'שלוש שורות מסתובבות. {friend} יודע איפה היית, ואין לו מושג מה ראית.'),
        ],
        callbacks: [
          {group: 'kept', when: is('life:master:F04:kept', 'scrap'), lines: [s(null, 'You still have the scrap in your pocket, and your hand keeps checking it.', 'הפתק עוד בכיס שלך, והיד שלך ממשיכה לבדוק אותו.')]},
          {group: 'kept', when: is('life:master:F04:kept', 'told-by'), lines: [s(null, 'What you have is someone else\'s telling, and you are about to pass it on.', 'מה שיש לך הוא סיפור של מישהו אחר, ואתה עומד להעביר אותו הלאה.')]},
        ],
        task: t('Tell it, or do not', 'לספר, או לא'),
        action: [s(null, 'The teacher is pretending not to listen, which is a kind of listening.', 'המורה מעמידה פנים שהיא לא מקשיבה, וזה סוג של הקשבה.')],
        options: [
          o('exact', t('Tell it exactly', 'לספר בדיוק'), s('friend', 'The man sat on the barrier the whole time? Why is that the best part?', 'האיש ישב על המעקה כל הזמן? למה זה החלק הכי טוב?'),
            [flag('life:master:F05:told', 'exact'), heart(1), bond('friend', 2)]),
          o('big', t('Make it bigger', 'להגדיל את הסיפור'), s('friend', 'The whole stand stood up? All of it? Say that again so I remember.', 'כל היציע קם? כולו? תגיד שוב כדי שאזכור.'),
            [flag('life:master:F05:told', 'bigger'), flag('life:master:F05:version', 'big'), bond('friend', 1)]),
          o('topic', t('Change the subject', 'לשנות נושא'), s('friend', 'Fine. Yard, break, you in goal. You always say you will not.', 'בסדר. חצר, הפסקה, אתה בשער. אתה תמיד אומר שלא.'),
            [flag('life:master:F05:told', 'subject')]),
        ],
      }),
      sc({
        id: 'F05-S2', room: 'pitch', who: 'friend', slot: 'friend', spot: 'jackets',
        title: t('Two coats and a goal', 'שני מעילים ושער'),
        lines: [
          s(null, '{friend} drops a coat for one post, then another, and walks off the distance with his feet.', '{friend} מניח מעיל לקורה אחת, ועוד אחד לשנייה, וצועד את המרחק ברגליים.'),
          s('friend', 'In or at the goal? Decide before the ball does.', 'בפנים או בשער? תחליט לפני הכדור.'),
        ],
        callbacks: [{when: is('life:master:F05:version', 'big'), lines: [s('friend', 'And if you tell the stand story again I will count how many times you say "everyone".', 'ואם תספר שוב את סיפור היציע, אני אספור כמה פעמים אתה אומר "כולם".')]}],
        task: t('Pick your place in the game', 'לבחור את המקום שלך במשחק'),
        action: [s(null, 'The ball is lighter than it looks. It always is when it is not yours.', 'הכדור קל מכפי שהוא נראה. הוא תמיד קל כשהוא לא שלך.')],
        options: [
          o('win', t('Play to win', 'לשחק כדי לנצח'), s('friend', 'First to five! No takebacks, no "that did not count".', 'הראשון לחמש! בלי חזרות, בלי "זה לא נחשב".'),
            [flag('life:master:F05:game', 'win'), energy(-10), heart(1)]),
          o('outside', t('Play with the ones left outside', 'לשחק עם מי שנשאר בחוץ'), s('friend', 'The ones by the wall? They are slow. And a bit sour about it.', 'אלה שליד הקיר? הם איטיים. וקצת עצבניים על זה.'),
            [flag('life:master:F05:game', 'outsiders'), bond('friend', -1), heart(2)]),
          o('judge', t('Count and judge', 'לספור ולשפוט'), s('friend', 'Fine, you are the one who says what counts. We will hate you gently.', 'בסדר, אתה זה שאומר מה נחשב. נשנא אותך בעדינות.'),
            [flag('life:master:F05:game', 'judge'), standing(1)]),
        ],
      }),
      sc({
        id: 'F05-S3', room: 'schoolyard', who: 'friend', slot: 'friend', spot: 'wall',
        title: t('What is left of the story', 'מה נשאר מהסיפור'),
        lines: [
          s('friend', 'Be honest with me. Was it really like that?', 'תהיה כן איתי. זה באמת היה ככה?'),
          s(null, 'The yard has emptied. Only chalk lines remain, and they are not on your side.', 'החצר התרוקנה. רק קווי גיר נשארו, והם לא לצדך.'),
        ],
        callbacks: [
          {group: 'story', when: is('life:master:F05:told', 'exact'), lines: [s('friend', 'You said the part about the barrier. Nobody makes that up.', 'אמרת את החלק על המעקה. אף אחד לא ממציא דבר כזה.')]},
          {group: 'story', when: is('life:master:F05:version', 'big'), lines: [s('friend', 'Nobody stood up, did they. You looked at me a little too long.', 'אף אחד לא קם, נכון. הסתכלת עלי קצת יותר מדי זמן.')]},
          {group: 'story', when: is('life:master:F05:told', 'subject'), lines: [s('friend', 'You never told me. I keep making up my own, and it is getting worse.', 'אף פעם לא סיפרת לי. אני ממשיך להמציא משלי, וזה נהיה גרוע יותר.')]},
        ],
        task: t('Answer', 'לענות'),
        action: [s(null, 'It is a small question with a long handle.', 'זו שאלה קטנה עם ידית ארוכה.')],
        options: [
          o('stand', t('Stand by your version', 'לעמוד בגרסה'), s('friend', 'All right. That is what happened to you, then. I will say "you said".', 'בסדר. אז זה מה שקרה לך. אגיד "אתה אמרת".'),
            [flag('life:master:F05:after', 'stood'), heart(1)]),
          o('laugh', t('Correct it and laugh at yourself', 'לתקן ולצחוק על עצמך'), s('friend', 'You made a stand stand up! Wait, I am going to say that to everyone, forever.', 'גרמת ליציע לקום! רגע, אני עומד לספר את זה לכולם, לנצח.'),
            [flag('life:master:F05:after', 'joke'), bond('friend', 3), heart(1)]),
          o('detail', t('Tell a detail you never told', 'לספר פרט שלא סיפרת'), s('friend', 'You were afraid? Of the noise? Me too. In the stairwell. Do not tell anyone.', 'פחדת? מהרעש? גם אני. בחדר המדרגות. אל תספר לאף אחד.'),
            [flag('life:master:F05:after', 'secret'), bond('friend', 4), heart(2)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F06 · the first envelope
  chapter({
    id: 'F06', age: 10, act: 1, title: t('First Envelope', 'מעטפה ראשונה'),
    intro: t('Something sealed that cost almost nothing, and still fills a pocket.', 'משהו סגור שכמעט לא עלה כלום, ובכל זאת ממלא כיס.'),
    keep: {id: 'envelope-things', name: t('What the envelope held', 'מה שהיה במעטפה'), note: t('Only what you actually got. Or a page that holds only things you own.', 'רק מה שבאמת קיבלת. או דף שמכיל רק דברים שיש לך.')},
    scenes: [
      sc({
        id: 'F06-S1', room: 'street', who: 'kiosk', slot: 'kiosk', spot: 'window', after: [], verb: 'buy',
        title: t('On the counter', 'על הדלפק'),
        lines: [
          s(null, 'There is a small stack of sealed envelopes on the counter. A page in the window says the set is current.', 'ערימה קטנה של מעטפות סגורות על הדלפק. דף בחלון אומר שהסדרה עדכנית.'),
          s('friend', 'Everyone has one already. Do not look at me like that.', 'לכולם יש כבר. אל תסתכל עלי ככה.'),
        ],
        callbacks: [
          {group: 'money', when: is('life:master:F03:source', 'work'), lines: [s('kiosk', 'You are the one with the coins from the small job. I remember who works.', 'אתה זה עם המטבעות מהעבודה הקטנה. אני זוכר מי עובד.')]},
          {group: 'money', when: is('life:master:F03:source', 'gift'), lines: [s('kiosk', 'A gift buys the first one. After that you have to be brave on your own.', 'מתנה קונה את הראשונה. אחר כך צריך להיות אמיץ לבד.')]},
        ],
        task: t('Decide what to do with the counter', 'להחליט מה עושים עם הדלפק'),
        action: [s(null, 'The envelopes do not tell you anything. That is why they are sold.', 'המעטפות לא מספרות לך כלום. בגלל זה מוכרים אותן.')],
        options: [
          o('buy', t('Pay for one', 'לשלם על אחת'), s('kiosk', 'Sealed, and you do not choose. That is the whole thing. Good luck.', 'סגורה, ואתה לא בוחר. זה כל העניין. בהצלחה.'),
            [flag('life:master:F06:path', 'bought'), coins(-3), collect('stickers', 3), collect('doubles', 2), heart(1)], {when: {min: ['coins', 3]}}),
          o('watch', t('Save and watch {friend} open one', 'לחסוך ולהסתכל על {friend}'), s('friend', 'You are going to watch? Fine, then I get to be the one who knows the ending.', 'אתה תסתכל? בסדר, אז אני זה שיודע את הסוף.'),
            [flag('life:master:F06:path', 'watched'), bond('friend', 3)]),
          o('page', t('Start a page from things you own', 'להתחיל דף מדברים שיש לך'), s('friend', 'A page. With only stuff that is really yours. Strict. I like it.', 'דף. רק עם דברים שבאמת שלך. קפדני. מוצא חן בעיני.'),
            [flag('life:master:F06:path', 'page'), heart(2)]),
        ],
      }),
      sc({
        id: 'F06-S2', room: 'schoolyard', who: 'friend', slot: 'bench', spot: 'bench',
        title: t('Slowly, in the corner', 'לאט בפינה'),
        lines: [
          s('friend', 'If you tear from the top, tear it with me. Slowly, like it is a bandage.', 'אם אתה קורע מלמעלה, תקרע איתי. לאט, כמו פלסטר.'),
          s(null, 'The bench has a gap at one end where a small object can sit for as long as it needs to.', 'לספסל יש רווח בקצה שבו חפץ קטן יכול לשבת כמה שהוא צריך.'),
        ],
        callbacks: [{when: is('life:master:F06:path', 'page'), lines: [s('friend', 'And do not cut the only note you have. I mean it. Not even the corner.', 'ואל תגזור את הפתק היחיד שיש לך. אני מתכוון לזה. אפילו לא את הפינה.')]}],
        task: t('Open it, or do not', 'לפתוח, או לא'),
        action: [s(null, 'What is inside will be exactly what is inside. Nothing more, nothing as a punishment.', 'מה שבפנים יהיה בדיוק מה שבפנים. לא יותר, ולא כעונש.')],
        options: [
          o('careful', t('Open it carefully', 'לפתוח בזהירות'), s('friend', 'Slow! Look at each one before you turn it. Who is that, where is it from?', 'לאט! תסתכל על כל אחד לפני שאתה הופך. מי זה, מאיפה זה?'),
            [flag('life:master:F06:open', 'careful'), heart(2), hands('carry', 'packet-open')],
            {action: [s(null, 'The tab gives. One by one, face down, then turned. Two of them you already have; you put those to one side.', 'הלשונית נכנעת. אחד אחד, עם הפנים למטה, ואז הופכים. שניים מהם כבר יש לך; אתה שם אותם בצד.')]}),
          o('quick', t('Tear it open, or mix the page up', 'לקרוע מהר או לערבב את הדף'), s('friend', 'Ha! Everything on the bench. Pick them up, pick them up, nobody sit down.', 'הא! הכול על הספסל. תאסוף, תאסוף, אף אחד לא יושב.'),
            [flag('life:master:F06:open', 'quick'), energy(-5), bond('friend', 2), hands('carry', 'packet-tear')]),
          o('later', t('Keep it closed for now', 'להשאיר סגור לעכשיו'), s('friend', 'You are going to wait? Who waits? Fine, I will not look. I will look.', 'אתה מחכה? מי מחכה? בסדר, לא אסתכל. אסתכל.'),
            [flag('life:master:F06:open', 'sealed'), bond('friend', 1)]),
        ],
      }),
      sc({
        id: 'F06-S3', room: 'bedroom', who: 'friend', slot: 'byDesk', spot: 'desk', cut: true,
        title: t('Who is that to you', 'מי זה בשבילך'),
        lines: [
          s(null, '{friend} is on your floor with the whole page spread out between you, sorted by nothing.', '{friend} על הרצפה שלך עם כל הדף פרוש ביניכם, ממוין לפי כלום.'),
          s('friend', 'Pick one. Not the best, not the rarest. Yours.', 'תבחר אחד. לא הכי טוב, לא הכי נדיר. שלך.'),
        ],
        callbacks: [
          {group: 'open', when: is('life:master:F06:open', 'careful'), lines: [s(null, 'Each of them has a name and a place now. You were careful, and it shows.', 'לכל אחד יש עכשיו שם ומקום. היית זהיר, וזה ניכר.')]},
          {group: 'open', when: is('life:master:F06:open', 'sealed'), lines: [s(null, 'The envelope is still sealed on the desk, a promise you are in no rush to break.', 'המעטפה עדיין סגורה על השולחן, הבטחה שאין לך מהלך למהר לשבור.')]},
        ],
        task: t('Choose a favourite', 'לבחור אהוב'),
        action: [s(null, 'It is not a ranking. It is closer to naming a pet.', 'זה לא דירוג. זה יותר כמו לתת שם לחיית מחמד.')],
        options: [
          o('fav', t('Choose a favourite of your own', 'לבחור מועדף משלך'), s('friend', 'That one? It is so plain. Fine. It is yours, I will stop talking.', 'זה? הוא כל כך פשוט. בסדר. הוא שלך, אפסיק לדבר.'),
            [flag('life:master:F06:fav', 'chosen'), collect('favourite'), heart(3)]),
          o('double', t('Offer a double, if you have one', 'להציע כפול אם יש'), s('friend', 'A double! That is a trade. Name the one you want, and I will say a number.', 'כפול! זו עסקה. תגיד איזה אתה רוצה, ואני אגיד מספר.'),
            [flag('life:master:F06:fav', 'trade'), give('doubles', 'friend'), collect('stickers'), bond('friend', 2)], {when: {owns: ['doubles', 1]}}),
          o('mess', t('Leave the page as it is', 'להשאיר את הדף לא מסודר'), s('friend', 'You are not going to finish it? Good. Finishing it ends the game.', 'אתה לא הולך להשלים אותו? טוב. להשלים אותו זה סוף המשחק.'),
            [flag('life:master:F06:fav', 'loose'), flag('life:master:F06:finish', 'none'), heart(1)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F07 · at the one who has it
  chapter({
    id: 'F07', age: 11, act: 1, title: t('At the One Who Has It', 'אצל מי שחסר'),
    intro: t('There is a square that stays empty. Somebody, somewhere, holds what it is waiting for.', 'יש משבצת שנשארת ריקה. מישהו, איפשהו, מחזיק את מה שהיא מחכה לו.'),
    keep: {id: 'swap-note', name: t('What was traded, or promised', 'מה שהוחלף או הובטח'), note: t('A swap, a promise, or an empty square you chose to keep empty.', 'החלפה, הבטחה, או משבצת ריקה שבחרת להשאיר ריקה.')},
    scenes: [
      sc({
        id: 'F07-S1', room: 'schoolyard', who: 'friend', slot: 'friend', spot: 'bench', after: [], verb: 'talk',
        title: t('The list', 'הרשימה'),
        lines: [
          s(null, 'You point at the square that is still empty. {friend} does not even look at it.', 'אתה מצביע על המשבצת שעוד ריקה. {friend} אפילו לא מסתכל עליה.'),
          s('friend', 'I know who has it. You will not like it.', 'אני יודע אצל מי. לא תאהב את זה.'),
        ],
        callbacks: [
          {group: 'fav', when: is('life:master:F06:fav', 'chosen'), lines: [s(null, 'Your favourite sits in the corner of the page, as if keeping the other squares company.', 'האהוב שלך יושב בפינת הדף, כאילו הוא עושה חברה לשאר המשבצות.')]},
          {group: 'fav', when: is('life:master:F06:finish', 'none'), lines: [s(null, 'You said you would not finish it. Then why does this square bother you?', 'אמרת שלא תשלים. אז למה המשבצת הזאת מציקה לך?')]},
        ],
        task: t('Decide how to go after it', 'להחליט איך הולכים אחריה'),
        action: [s(null, 'The one who has it is in your year, three classrooms away, and has not yet been mentioned.', 'מי שיש לו אותה נמצא בשכבה שלך, שלוש כיתות משם, ועוד לא הוזכר.')],
        options: [
          o('go', t('Go to him', 'לפנות אליו'), s('friend', 'His name is the one written on the bus pass. Come on, I will stand ten steps behind.', 'השם שלו הוא זה שכתוב על כרטיס האוטובוס. בוא, אעמוד עשרה צעדים מאחור.'),
            [flag('life:master:F07:gap', 'chase'), flag('life:master:F07:holder', 'met'), bond('friend', 2)]),
          o('ask', t('Ask what he wants', 'לשאול מה הוא רוצה'), s('friend', 'You will ask what he wants before you even say hello? Smart. And a bit cold.', 'תשאל מה הוא רוצה עוד לפני שלום? חכם. וקצת קר.'),
            [flag('life:master:F07:gap', 'ask'), flag('life:master:F07:holder', 'known'), heart(1)]),
          o('skip', t('Decide not to chase today', 'להחליט לא לרדוף היום'), s('friend', 'Fine. It is only a square. It will be there tomorrow. Probably.', 'בסדר. זו רק משבצת. היא תהיה שם מחר. כנראה.'),
            [flag('life:master:F07:gap', 'left'), bond('friend', 1)]),
        ],
      }),
      sc({
        id: 'F07-S2', room: 'bus-stop', who: 'child', slot: 'bench', spot: 'sign', cut: true,
        title: t('His card', 'הקלף שלו'),
        lines: [
          s(null, 'He sits on the stop bench with a small tin on his lap. He does not hide it, and he does not hand it over.', 'הוא יושב על הספסל בתחנה עם קופסת פח קטנה על הברכיים. הוא לא מסתיר אותה, והוא לא מושיט אותה.'),
          s('child', 'Just because I do not need another does not mean I do not like having two.', 'זה שאני לא צריך עוד אחד לא אומר שאני לא אוהב שניים.'),
        ],
        callbacks: [
          {group: 'meet', when: is('life:master:F07:holder', 'known'), lines: [s('child', 'You asked before you asked. Most people just reach.', 'שאלת לפני ששאלת. רוב האנשים פשוט מושיטים יד.')]},
          {group: 'meet', when: is('life:master:F07:holder', 'met'), lines: [s('child', 'Your friend stood ten steps back. I saw. I liked that.', 'החבר שלך עמד עשרה צעדים מאחור. ראיתי. אהבתי את זה.')]},
        ],
        task: t('Offer something', 'להציע משהו'),
        action: [s(null, 'A bus goes by without stopping. Neither of you looks up.', 'אוטובוס עובר בלי לעצור. אף אחד מכם לא מרים מבט.')],
        options: [
          o('copy', t('Offer a copy you have', 'להציע עותק שיש לך'), s('child', 'I have that one. Twice, actually. Show me what else.', 'את זה יש לי. פעמיים, בעצם. תראה לי מה עוד.'),
            [flag('life:master:F07:offer', 'copy'), give('doubles', 'child'), bond('child', 2), hands('count', 'swap-check')],
            {action: [s(null, 'Two piles on the bench: what he has twice, what you have twice. You check his against your page, square by square.', 'שתי ערימות על הספסל: מה שיש לו פעמיים, מה שיש לך פעמיים. אתה בודק את שלו מול הדף שלך, משבצת אחרי משבצת.')]}),
          o('mine', t('Offer the only one you love', 'להציע את היחיד שאתה אוהב'), s('child', 'That one? You would give that? Then it is a real offer. I need time.', 'את זה? אתה היית נותן את זה? אז זו הצעה אמיתית. אני צריך זמן.'),
            [flag('life:master:F07:offer', 'dear'), lend('favourite', 'child'), heart(-1), bond('child', 3)]),
          o('help', t('Offer to help with something', 'להציע לעזור במשהו'), s('child', 'My little sister has a hole in her bike tyre. Fix it, and we will talk.', 'לאחות הקטנה שלי יש חור בצמיג של האופניים. תתקן, ונדבר.'),
            [flag('life:master:F07:offer', 'promise'), bond('child', 2), energy(-5), hands('carry', 'tyre-fix')]),
        ],
      }),
      sc({
        id: 'F07-S3', room: 'bedroom', who: 'friend', slot: 'byDesk', spot: 'desk', cut: true,
        title: t('The square', 'המשבצת'),
        lines: [
          s(null, 'The page is open on the desk. Someone has been through here, and what is in front of you is the result.', 'הדף פתוח על השולחן. מישהו עבר כאן, ומה שלפניך הוא התוצאה.'),
          s('friend', 'Show me how it ended. Do not make me guess.', 'תראה לי איך זה נגמר. אל תגרום לי לנחש.'),
        ],
        callbacks: [
          {group: 'offer', when: is('life:master:F07:offer', 'copy'), lines: [s(null, 'A swap: your spare for his. Done in two minutes and no handshake.', 'החלפה: המיותר שלך בשלו. נגמר בשתי דקות ובלי לחיצת יד.')]},
          {group: 'offer', when: is('life:master:F07:offer', 'dear'), lines: [s(null, 'You gave away the one you loved. Its square has a different weight now.', 'נתת את מה שאהבת. למשבצת שלו יש עכשיו משקל אחר.')]},
          {group: 'offer', when: is('life:master:F07:offer', 'promise'), lines: [s(null, 'The tyre is mended. The card is not yet yours. It is waiting on a handshake.', 'הצמיג מתוקן. הקלף עוד לא שלך. הוא מחכה ללחיצת יד.')]},
        ],
        task: t('Decide what to do with the square', 'להחליט מה עושים עם המשבצת'),
        action: [s(null, 'The empty square looks less empty when you are the one deciding about it.', 'המשבצת הריקה נראית פחות ריקה כשאתה זה שמחליט לגביה.')],
        options: [
          o('paste', t('Stick in what you have', 'להדביק או לצרף מה שבבעלותך'), s('friend', 'There. It fits. I would not have bet on it.', 'הנה. זה מתאים. לא הייתי מהמר על זה.'),
            [flag('life:master:F07:deal', 'filled'), heart(2), bond('friend', 2)]),
          o('empty', t('Leave the place empty', 'להשאיר את המקום ריק'), s('friend', 'Empty? On purpose? Then I think it is the most honest square on the page.', 'ריק? בכוונה? אז אני חושב שזו המשבצת הכי כנה בדף.'),
            [flag('life:master:F07:deal', 'empty'), flag('life:master:F07:gap', 'kept'), heart(1)]),
          o('person', t('Tell about the one you met', 'לספר על האדם שפגשת'), s('friend', 'Wait. He fixes bikes? And you did not tell me? What else are you hiding?', 'רגע. הוא מתקן אופניים? ולא סיפרת לי? מה עוד אתה מסתיר?'),
            [flag('life:master:F07:deal', 'friend-made'), bond('child', 3), bond('friend', 1)]),
        ],
      }),
    ],
  }),

  // ───────────────────────────────────────────────────────────────────────── F08 · the other side of the table
  chapter({
    id: 'F08', age: 14, act: 2, title: t('The Other Side of the Table', 'הצד השני של השולחן'),
    intro: t('A different colour is just a different colour, until someone makes it a thing.', 'צבע אחר הוא סתם צבע אחר, עד שמישהו הופך אותו לעניין.'),
    keep: {id: 'table-note', name: t('A note from the table', 'פתק מהשולחן'), note: t('Something swapped, or a note to meet again. No souvenir of anyone else\'s side.', 'משהו שהוחלף, או פתק להיפגש שוב. בלי מזכרת מהצד של מישהו אחר.')},
    scenes: [
      sc({
        id: 'F08-S1', room: 'schoolyard', who: 'child', slot: 'bench', spot: 'bench', after: [], verb: 'sit',
        title: t('A free seat', 'מקום פנוי'),
        lines: [
          s(null, 'He is on the bench with a scarf in a colour that is not yours. He looks up first.', 'הוא על הספסל עם צעיף בצבע שלא שלך. הוא מרים מבט ראשון.'),
          s('child', 'Is this seat taken? You can sit. I am not that kind of person.', 'המקום תפוס? אתה יכול לשבת. אני לא מהסוג הזה.'),
        ],
        callbacks: [
          {group: 'old', when: {any: [is('life:master:F07:deal', 'friend-made'), is('life:master:F07:deal', 'filled')]}, lines: [s('child', 'You are the one with the empty square. The page, right? I know it by the way you sit.', 'אתה זה עם המשבצת הריקה. הדף, נכון? אני מכיר אותך לפי הדרך שבה אתה יושב.')]},
          {group: 'old', when: is('life:master:F07:gap', 'left'), lines: [s(null, 'You never chased the square. He does not know your name, and you do not know his.', 'אף פעם לא רדפת אחרי המשבצת. הוא לא מכיר את השם שלך, ואתה לא את שלו.')]},
        ],
        task: t('Decide what to do', 'להחליט מה עושים'),
        action: [s(null, 'There are two seats on the bench and eleven people who would have an opinion about the second.', 'יש שני מקומות על הספסל ואחד עשר אנשים שיהיו להם דעות על השני.')],
        options: [
          o('sit', t('Sit next to him', 'לשבת לידו'), s('child', 'Do you know why I cannot sleep? My neighbour practises the drums in the afternoon.', 'אתה יודע למה אני לא ישן? השכן שלי מתאמן על תופים אחר הצהריים.'),
            [flag('life:master:F08:seat', 'beside'), bond('child', 3), heart(1)]),
          o('game', t('Suggest a game or a swap', 'להציע משחק או החלפה'), s('child', 'A game. I have a pack of cards that is missing the seven. I have always been missing the seven.', 'משחק. יש לי חפיסה שחסר בה השבע. תמיד חסר לי השבע.'),
            [flag('life:master:F08:seat', 'game'), bond('child', 2), energy(-5)]),
          o('group', t('Stay with your group', 'להישאר עם החבורה'), s('child', 'All right. It is a bench, not a flag. Another time.', 'בסדר. זה ספסל, לא דגל. בפעם אחרת.'),
            [flag('life:master:F08:seat', 'group'), bond('friend', 2)]),
        ],
      }),
      sc({
        id: 'F08-S2', room: 'pitch', who: 'friend', slot: 'friend', spot: 'jackets', cut: true,
        title: t('The joke', 'הבדיחה'),
        lines: [
          s('friend', 'Did you hear the one about the supporters of that colour and the bus?', 'שמעת את זו על האוהדים של הצבע ההוא ועל האוטובוס?'),
          s(null, 'He tells it well. It is not even a cruel one. Whether it lands depends on who is listening.', 'הוא מספר אותה טוב. היא אפילו לא אכזרית. אם היא פוגעת תלוי מי מקשיב.'),
        ],
        callbacks: [
          {group: 'seat', when: {any: [is('life:master:F08:seat', 'beside'), is('life:master:F08:seat', 'game')]}, lines: [s(null, 'You know the person the joke is about. He has a name, and a bad drumming neighbour.', 'אתה מכיר את מי שהבדיחה עליו. יש לו שם, ושכן גרוע בתופים.')]},
          {group: 'seat', when: is('life:master:F08:seat', 'group'), lines: [s(null, 'It is a joke about nobody you know. That is exactly the kind that costs nothing.', 'זו בדיחה על אף אחד שאתה מכיר. בדיוק מהסוג שלא עולה כלום.')]},
        ],
        task: t('React', 'להגיב'),
        action: [s(null, 'Four faces are turned toward you, waiting for yours.', 'ארבעה פרצופים פונים אליך, מחכים לשלך.')],
        options: [
          o('join', t('Join in', 'להצטרף'), s('friend', 'See? Even you laughed. It is not even mean. It is just a bus.', 'ראית? אפילו אתה צחקת. זה אפילו לא מרושע. זה סתם אוטובוס.'),
            [flag('life:master:F08:joke', 'joined'), bond('friend', 2), heart(-1)]),
          o('self', t('Tell a joke about yourself', 'לספר בדיחה על עצמך'), s('friend', 'You told one about your own hair? Wait, say it slower, I want to laugh properly.', 'סיפרת על השיער שלך? רגע, תגיד לאט יותר, אני רוצה לצחוק כמו שצריך.'),
            [flag('life:master:F08:joke', 'self'), standing(1), heart(1)]),
          o('away', t('Change the activity', 'לשנות פעילות'), s('friend', 'Where are you going? We are in the middle of a joke. Fine. Fine. Wait for me.', 'לאן אתה הולך? אנחנו באמצע בדיחה. בסדר. בסדר. חכה לי.'),
            [flag('life:master:F08:joke', 'left'), heart(2)]),
        ],
      }),
      sc({
        id: 'F08-S3', room: 'street', who: 'child', slot: 'doorstep', spot: 'window', cut: true,
        title: t('After they left', 'אחרי שהם הלכו'),
        lines: [
          s(null, 'The others went one by one. Now there are two of you at the table by the window.', 'האחרים הלכו אחד אחד. עכשיו אתם שניים ליד השולחן ליד החלון.'),
          s(null, 'Or there is only you and your friend, carrying the evening home between you.', 'או שיש רק אותך ואת החבר שלך, נושאים את הערב הביתה ביניכם.'),
        ],
        callbacks: [
          {group: 'joke', when: is('life:master:F08:joke', 'joined'), lines: [s('child', 'I heard the bus one from across the yard. I laughed, too. It was good.', 'שמעתי את זו של האוטובוס מעבר לחצר. גם אני צחקתי. היא הייתה טובה.')]},
          {group: 'joke', when: is('life:master:F08:joke', 'self'), lines: [s('child', 'You told one about yourself first. That is why I stayed.', 'סיפרת אחת על עצמך קודם. בגלל זה נשארתי.')]},
        ],
        task: t('Decide how the evening ends', 'להחליט איך הערב נגמר'),
        action: [s(null, 'The window shows two reflections, and the street behind them has not changed.', 'החלון מראה שתי השתקפויות, והרחוב מאחוריהן לא השתנה.')],
        options: [
          o('swap', t('Swap an item you choose', 'להחליף פריט שבחרת'), s('child', 'Only if I want it. And I do. This one for that one, no extra.', 'רק אם אני רוצה אותו. ואני רוצה. זה בשביל זה, בלי תוספת.'),
            [flag('life:master:F08:end', 'swapped'), heart(1), bond('child', 3)]),
          o('meet', t('Arrange another meeting', 'לקבוע מפגש אחר'), s('child', 'Saturday, at the stop. Bring your cards. Do not bring any opinions.', 'שבת, בתחנה. תביא את הקלפים. אל תביא דעות.'),
            [flag('life:master:F08:end', 'meet'), bond('child', 4)]),
          o('asis', t('Leave the evening as it was', 'להשאיר את הערב כפי שהיה'), s('child', 'All right. See you around. I mean it, but I will not push.', 'בסדר. נתראה. אני מתכוון לזה, אבל לא אלחץ.'),
            [flag('life:master:F08:end', 'asis')]),
        ],
      }),
    ],
  }),
]

import {chapter, o, s, sc, t} from './write'
import {bond, coins, energy, flag, heart, is, standing} from './types'

/**
 * Ages eighteen to twenty-eight. The first nights out, the first time money and a Saturday want the same hour,
 * a friend who needs a seat kept, a visitor who needs a road. The terrace stops being a place you are taken to.
 */
export const ADULTHOOD = [
  chapter({
    id: 'c5a-last-bus', age: 18, act: 2, title: t('The last bus', 'האוטובוס האחרון'),
    intro: t('The station board goes dark. The scarves are still on. Nobody knows whose idea it was to stop for food.', 'לוח התחנה כבה. הצעיפים עדיין על הצוואר. אף אחד לא זוכר מי הציע לעצור לאכול.'),
    keep: {id: 'last-bus-note', name: t('A folded phone number', 'מספר טלפון מקופל'), note: t('A ride can last longer than the journey.', 'טרמפ יכול להישאר איתך הרבה אחרי הנסיעה.')},
    scenes: [
      sc({
        id: 'S19', room: 'bus-station', who: 'friend', after: [], night: true, east: 'bus-station', sound: 'bus', spot: 'board',
        title: t('No bus', 'אין אוטובוס'),
        lines: [
          s('friend', 'Tell me that says delayed, not tomorrow.', 'תגיד לי שכתוב שם עיכוב ולא מחר.'),
          s(null, 'Your friend laughs, then checks the same empty pocket again.', 'החבר צוחק, ואז בודק שוב את אותו כיס ריק.'),
        ],
        callbacks: [
          {group: 'help', when: is('life:away:help', 'helped'), lines: [s('friend', 'Last time I needed you on the coach steps. Now I need you at a telephone. You are getting a reputation.', 'בפעם הקודמת הייתי צריך אותך על מדרגות האוטובוס. עכשיו אני צריך אותך ליד טלפון. יוצא לך שם.')]},
          {group: 'help', when: is('life:away:help', 'elder'), lines: [s('friend', 'The old man from the coach would have had a number for this. You should have got his number.', 'הזקן מהאוטובוס היה מוצא לזה מספר. היית צריך לקחת ממנו טלפון.')]},
          {when: is('life:home:trust', 'hidden'), lines: [s(null, 'Home is the one number you have been avoiding for a while.', 'הבית הוא המספר היחיד שאתה מתחמק ממנו כבר זמן מה.')]},
        ],
        task: t('Make the call', 'לבצע את השיחה'),
        action: [s(null, 'The public phone swallows the coin. You wait for somebody to answer.', 'הטלפון הציבורי בולע את המטבע. אתה מחכה שמישהו יענה.')],
        options: [
          o('dad', t('Call Dad and tell the whole story', 'להתקשר לאבא ולספר הכול'), s('dad', 'I will come. Stand where there is light. We can discuss the sandwich later.', 'אני בא. תעמדו איפה שיש אור. על הסנדוויץ׳ נדבר אחר כך.'), [flag('life:ride:helper', 'dad'), flag('life:home:trust', 'open'), bond('dad', 3)]),
          o('friend', t('Accept the friend’s lift; repay the petrol', 'לקבל טרמפ מהחבר ולהחזיר על הדלק'), s('friend', 'My brother can collect us. You owe me petrol, not your life.', 'אחי יכול לאסוף. אתה חייב לי דלק, לא את החיים שלך.'), [flag('life:ride:helper', 'friend'), flag('life:promise:ride', 'open')]),
          o('rival', t('Call the rival you actually know', 'להתקשר ליריבה שכבר הכרנו'), s('rival', 'You want a lift in this scarf? All right. The scarf goes in the boot. Joking.', 'טרמפ עם הצעיף הזה? טוב. הצעיף בתא המטען. סתם, תעלה.'), [flag('life:ride:helper', 'rival'), flag('life:promise:ride', 'open'), bond('rival', 4)], {when: is('life:rival:link', 'open')}),
          o('wait', t('Wait together for the morning service', 'לחכות יחד לקו הראשון'), s('friend', 'Then we share the bench. You get the half without the puddle.', 'אז מתחלקים בספסל. אתה מקבל את החצי בלי השלולית.'), [flag('life:ride:helper', 'morning'), energy(-15)]),
        ],
      }),
      sc({
        id: 'S20', room: 'bus-stop', who: 'friend', night: true, east: 'bus-stop', game: 'carry', spot: 'sign',
        title: t('The meeting point', 'נקודת המפגש'),
        lines: [
          s('friend', 'Someone must move the bags. Someone must stay by the sign.', 'מישהו צריך לקחת את התיקים. מישהו צריך להישאר ליד השלט.'),
        ],
        callbacks: [
          {when: {any: [{wears: 'scarf'}, {wears: 'both'}]}, lines: [s('friend', 'You are still wearing it. Half of those people are going to count the scarf as a ticket.', 'אתה עדיין לובש אותו. חצי מהאנשים האלה יחשיבו את הצעיף ככרטיס.')]},
          {when: is('life:ride:helper', 'dad'), lines: [s(null, 'Somewhere behind the bus shelter a pair of headlights are moving slowly. Dad has never driven fast in his life.', 'מאחורי התחנה זוג פנסים מתקדם לאט. אבא מעולם לא נסע מהר.')]},
        ],
        task: t('Move the bags and meet the group', 'להעביר את התיקים ולפגוש את כולם'),
        action: [s(null, 'You check the sign, the bags and the people. This is a journey, not an escape.', 'אתה בודק את השלט, התיקים והאנשים. זו נסיעה, לא בריחה.')],
        reward: {good: [heart(1)]},
        options: [
          o('carry', t('Carry the extra bag', 'לקחת גם את התיק הנוסף'), s('friend', 'You brought half the ground in that bag. Thank you.', 'הבאת חצי יציע בתיק הזה. תודה.'), [flag('life:ride:care', 'carried'), bond('friend', 2), energy(-10)]),
          o('check', t('Count people before leaving', 'לספור אנשים לפני שיוצאים'), s(null, 'Everyone answers. One answer comes from inside a scarf.', 'כולם עונים. תשובה אחת מגיעה מתוך צעיף.'), [flag('life:ride:care', 'counted')]),
          o('shelter', t('Move the waiting group under cover', 'להעביר את המחכים למחסה'), s('friend', 'First useful tactical change of the evening.', 'החילוף הטקטי המועיל הראשון של הערב.'), [flag('life:ride:care', 'sheltered'), standing(1)]),
        ],
      }),
      sc({
        id: 'S21', room: 'kitchen', who: 'dad', cut: true, night: false, spot: 'table',
        title: t('The next morning', 'בבוקר שאחרי'),
        lines: [
          s('dad', 'You look like a man who spent the night arguing with a timetable.', 'אתה נראה כמו אדם שרב כל הלילה עם לוח זמנים.'),
        ],
        callbacks: [
          {group: 'helper', when: is('life:ride:helper', 'dad'), lines: [s('dad', 'You called. I am not going to make a speech about it. I am going to make eggs.', 'התקשרת. אני לא אשא נאום על זה. אני אכין ביצים.')]},
          {group: 'helper', when: is('life:ride:care', 'carried'), lines: [s('dad', 'Your friend’s mother rang to say you carried the bags. She said it twice, as a threat.', 'אמא של החבר התקשרה להגיד שסחבת את התיקים. אמרה את זה פעמיים, כמו איום.')]},
        ],
        task: t('Leave a note about the night', 'להשאיר פתק על הלילה'),
        action: [s(null, 'The kettle clicks. You put the note beside the sugar, where somebody will see it.', 'הקומקום נוקש. אתה מניח פתק ליד הסוכר, במקום שבאמת יראו.')],
        options: [
          o('repay', t('Repay the petrol now with an errand', 'להחזיר את הדלק עכשיו בעזרה בסידור'), s('friend', 'You carried the boxes all morning. We are even. I still get to tell the story.', 'סחבת ארגזים כל הבוקר. אנחנו בסדר. עדיין מותר לי לספר את הסיפור.'), [flag('life:promise:ride', 'kept'), energy(-15)], {when: {flag: 'life:promise:ride'}}),
          o('later', t('Write a real repayment promise', 'לכתוב הבטחה להחזיר בהמשך'), s('friend', 'Put it on paper. Your memory improves dramatically near a ticket office.', 'תרשום. ליד קופת כרטיסים הזיכרון שלך משתפר פלאים.'), [flag('life:promise:ride', 'open')], {when: {flag: 'life:promise:ride'}}),
          o('tell', t('Tell the family what happened', 'לספר בבית מה באמת קרה'), s('dad', 'A wrong turn is repairable. A missing person is harder. Next time, call earlier.', 'טעות בדרך אפשר לתקן. בן אדם שנעלם יותר קשה. בפעם הבאה תתקשר מוקדם.'), [flag('life:ride:account', 'told'), bond('dad', 2)]),
        ],
      }),
    ],
  }),

  chapter({
    id: 'c5b-far-end', age: 20, act: 2, title: t('The Far End', 'היציע הרחוק'),
    intro: t('{club} are playing somewhere you have never been. The same Saturday has a birthday in it.', 'ל־{club} יש משחק במקום שמעולם לא היית בו. באותה שבת יש גם יום הולדת.'),
    keep: {id: 'far-end-ticket', name: t('A ticket from the far end', 'כרטיס מהיציע הרחוק'), note: t('A seat for one Saturday, and what it cost somebody else.', 'מושב לשבת אחת, ומה שזה עלה למישהו אחר.')},
    scenes: [
      sc({
        id: 'S58', room: 'kitchen', who: 'mum', after: [], spot: 'table',
        title: t('Two Saturdays, one table', 'שתי שבתות, שולחן אחד'),
        lines: [
          s('mum', 'Your father is sixty on Saturday. He has not said it. He has bought a cake the size of a tyre.', 'אבא בן שישים בשבת. הוא לא אמר. הוא קנה עוגה בגודל של צמיג.'),
          s('me', 'And {club} are playing two hours away.', 'ו־{club} משחקים שעתיים מכאן.'),
          s('mum', 'I know. I have the same radio you do. Choose, and tell him yourself.', 'אני יודעת. יש לי אותו רדיו כמוך. תבחר, ותגיד לו בעצמך.'),
        ],
        callbacks: [
          {group: 'past', when: {flag: 'life:away:stayed'}, lines: [s('mum', 'Last time you stayed for the lunch. I did not forget that, and he will not either.', 'בפעם הקודמת נשארת לארוחה. אני לא שכחתי, והוא לא ישכח.')]},
          {group: 'past', when: is('life:home:trust', 'hidden'), lines: [s('mum', 'Whatever you decide, say where you are going. I am not asking twice.', 'מה שלא תחליט, תגיד לאן אתה הולך. אני לא שואלת פעמיים.')]},
        ],
        task: t('Tell your parents what you chose', 'להגיד להורים מה בחרת'),
        action: [s(null, 'You say it plainly, to both of them, in the one room where nobody can leave first.', 'אתה אומר את זה בפשטות, לשניהם, בחדר היחיד שבו אף אחד לא יכול לצאת ראשון.')],
        options: [
          o('go', t('Go to the far end, and pay your own way (8)', 'לנסוע ליציע הרחוק ולשלם בעצמך (8)'), s('mum', 'Then go properly. Come back and tell him about it before the cake is gone.', 'אז תיסע כמו שצריך. תחזור ותספר לו לפני שהעוגה נגמרת.'), [flag('life:away2:go'), coins(-8), bond('mum', 1)], {when: {min: ['coins', 8]}}),
          o('borrow', t('Borrow the fare from your friend and go', 'ללוות את הנסיעה מהחבר וליסוע'), s('mum', 'Borrowed money has a face. Remember whose.', 'לכסף שמושאל יש פנים. תזכור של מי.'), [flag('life:away2:go'), flag('life:promise:ride', 'open'), bond('mum', -1)]),
          o('stay', t('Stay for the birthday and take the radio to the table', 'להישאר ליום ההולדת ולקחת את הרדיו לשולחן'), s('mum', 'He will not say what it means. I will say it for him: thank you.', 'הוא לא יגיד מה זה אומר לו. אני אגיד במקומו: תודה.'), [flag('life:away2:stayed'), bond('mum', 3), bond('dad', 4)]),
        ],
      }),
      sc({
        id: 'S59', room: 'bus-station', who: 'friend', after: ['S58'], when: {not: 'life:away2:stayed'}, east: 'bus-station', sound: 'bus', spot: 'board',
        title: t('The coach leaves at nine', 'האוטובוס יוצא בתשע'),
        lines: [
          s('friend', 'There are four hundred of us. The driver has counted three hundred and eighty and given up.', 'אנחנו ארבע מאות. הנהג ספר שלוש מאות ושמונים והתייאש.'),
          s('friend', 'I am four short on the fare. Do not look at me like that. I counted twice.', 'חסרים לי ארבעה לנסיעה. אל תסתכל עליי ככה. ספרתי פעמיים.'),
        ],
        callbacks: [{when: is('life:away:help', 'helped'), lines: [s('friend', 'Last time I was the nervous one. This time I am only the poor one.', 'בפעם הקודמת הייתי הלחוץ. הפעם אני רק העני.')]}],
        task: t('Get on the coach', 'לעלות לאוטובוס'),
        action: [s(null, 'The doors fold shut with a sigh. A song starts at the back and moves forward.', 'הדלתות נסגרות באנחה. שיר מתחיל מאחורה וזז קדימה.')],
        options: [
          o('cover', t('Cover his fare (4)', 'לכסות לו את הנסיעה (4)'), s('friend', 'I will not forget this. I will also pretend I did.', 'אני לא אשכח את זה. אני גם אעמיד פנים ששכחתי.'), [flag('life:away2:fare', 'covered'), coins(-4), bond('friend', 6)], {when: {min: ['coins', 4]}}),
          o('seat', t('Squeeze two onto one seat and say nothing', 'להצטופף שניים על מושב אחד ולא להגיד כלום'), s('friend', 'The driver is looking at us in the mirror. He knows. He has been young.', 'הנהג מסתכל עלינו במראה. הוא יודע. גם הוא היה צעיר.'), [flag('life:away2:fare', 'squeezed'), energy(-10), bond('friend', 3)]),
          o('sing', t('Start the song yourself', 'להתחיל את השיר בעצמך'), s(null, 'The back of the coach wakes up. Somebody hands you a flask.', 'החלק האחורי של האוטובוס מתעורר. מישהו מושיט לך בקבוק תרמוס.'), [flag('life:away2:fare', 'sang'), heart(3), standing(2)]),
        ],
      }),
      sc({
        id: 'S60', room: 'away-end', who: 'friend', after: ['S59'], east: 'bus-station', game: 'chant', sound: 'roar', spot: 'pitch',
        title: t('Behind the other goal', 'מאחורי השער ההפוך'),
        lines: [
          s(null, 'The away end is a cage of voices. Your voice is the smallest in it, and it counts.', 'יציע האורחים הוא כלוב של קולות. הקול שלך הקטן ביותר בו, והוא נספר.'),
          s('steward', 'Hands off the fence, please. The fence has had a long day.', 'ידיים מהגדר, בבקשה. לגדר היה יום ארוך.'),
        ],
        callbacks: [
          {group: 'fare', when: is('life:away2:fare', 'sang'), lines: [s('friend', 'They are still singing your song from the coach. You are going to be asked to start the next one.', 'עדיין שרים את השיר שלך מהאוטובוס. יבקשו ממך להתחיל את הבא.')]},
          {group: 'fare', when: is('life:away2:fare', 'covered'), lines: [s('friend', 'This is the only place I cannot owe you anything. Everyone shouts the same.', 'זה המקום היחיד שבו אני לא יכול להיות חייב לך. כולם צועקים אותו דבר.')]},
        ],
        task: t('Sing with the end', 'לשיר עם היציע'),
        action: [s(null, 'It starts in the back rows and reaches the front like weather. Your chest finds the rhythm before your head does.', 'זה מתחיל בשורות האחוריות ומגיע לחזית כמו מזג אוויר. החזה שלך מוצא את הקצב לפני הראש.')],
        reward: {good: [heart(2)], slip: [heart(1)]},
        options: [
          o('sing', t('Give it everything', 'לתת את הכול'), s('friend', 'I cannot hear myself. That is the point. Do not stop.', 'אני לא שומע את עצמי. זו המטרה. אל תפסיק.'), [flag('life:away2:end', 'sang'), heart(6), energy(-15)]),
          o('watch', t('Hold the fence rail and just watch it happen', 'להחזיק את המעקה ופשוט לראות את זה קורה'), s('steward', 'Most people never see it from here. Take your time.', 'רוב האנשים לא רואים את זה מכאן. קח את הזמן.'), [flag('life:away2:end', 'watched'), heart(4), bond('friend', 2)]),
          o('mind', t('Keep your friend off the fence and out of trouble', 'להרחיק את החבר מהגדר ומצרות'), s('steward', 'You have done my job for me. I will remember your face. Kindly.', 'עשית את העבודה שלי. אזכור את הפנים שלך. בטוב.'), [flag('life:away2:end', 'minded'), heart(3), standing(3), bond('friend', 3)]),
        ],
      }),
      sc({
        id: 'S61', room: 'bus-station', who: 'driver', after: ['S60'], night: true, east: 'bus-station', final: true, sound: 'bus', spot: 'bench',
        title: t('Back at the station', 'חזרה בתחנה'),
        lines: [
          s('driver', 'All off. Take your scarves, your flasks and your voices. Leave me the seat that is not yours.', 'כולם יורדים. קחו צעיפים, תרמוסים וקולות. תשאירו לי את המושב שלא שלכם.'),
          s(null, 'The station is empty, which is how you know it was the whole of your night.', 'התחנה ריקה, וככה אתה יודע שזה היה כל הלילה שלך.'),
        ],
        callbacks: [{when: is('life:away2:fare', 'sang'), lines: [s('driver', 'You were the one at the back. I heard. I kept the radio off for you.', 'אתה היית מאחורה. שמעתי. כיביתי את הרדיו בשבילך.')]}],
        task: t('Walk home before the cake is gone', 'ללכת הביתה לפני שהעוגה נגמרת'),
        action: [s(null, 'It is a long walk and your ears are still ringing. A cake is waiting somewhere with a candle for each of sixty years, give or take.', 'ההליכה ארוכה והאוזניים עדיין מצלצלות. איפשהו מחכה עוגה עם נר לכל אחת משישים השנים, פחות או יותר.')],
        reward: {good: [heart(1)]},
        options: [
          o('late', t('Go straight to the kitchen and apologise', 'ללכת ישר למטבח ולהתנצל'), s('dad', 'You came. I thought the far end had kept you. Sit. Tell me about the end, not the match.', 'באת. חשבתי שהיציע הרחוק שמר אותך. שב. ספר לי על היציע, לא על המשחק.'), [flag('life:away2:home', 'apologised'), bond('dad', 4)]),
          o('quiet', t('Slip in quietly and keep it to yourself', 'להיכנס בשקט ולשמור את זה לעצמך'), s('mum', 'There is a piece in the tin. Do not wake him. He was awake until one.', 'יש חתיכה בקופסה. אל תעיר אותו. הוא היה ער עד אחת.'), [flag('life:away2:home', 'quiet'), bond('mum', 2)]),
          o('gift', t('Leave the ticket stub beside his plate', 'להשאיר את הפתק מהכרטיס ליד הצלחת שלו'), s('dad', 'I have the same one from another year. Another coach. I will keep this one with it.', 'יש לי אחד כזה משנה אחרת. אוטובוס אחר. אשמור את זה לצידו.'), [flag('life:away2:home', 'gift'), bond('dad', 6), heart(3)]),
        ],
      }),
      sc({
        id: 'S62', room: 'room', who: 'dad', after: ['S58'], when: {flag: 'life:away2:stayed'}, final: true, sound: 'radio', game: 'tune', spot: 'tv',
        title: t('Sixty, and a radio', 'שישים, ורדיו'),
        lines: [
          s('dad', 'You stayed. I am not going to make a speech. I am going to make you hold the aerial.', 'נשארת. אני לא אשא נאום. אני אגרום לך להחזיק את האנטנה.'),
          s('mum', 'He wants the radio on at the table. Against the rules of the house. Today only.', 'הוא רוצה את הרדיו על השולחן. נגד חוקי הבית. היום בלבד.'),
        ],
        callbacks: [{when: {flag: 'life:away:stayed'}, lines: [s('dad', 'The second time you stayed. The first time I pretended not to notice. This time I am noticing.', 'הפעם השנייה שנשארת. בפעם הראשונה העמדתי פנים שלא שמתי לב. הפעם אני שם לב.')]}],
        task: t('Hold the aerial and listen with him', 'להחזיק את האנטנה ולהקשיב איתו'),
        action: [s(null, 'The voice from far away is thin and happy. You are not in it. You are here, and someone has put a candle in the cake.', 'הקול מרחוק דק ושמח. אתה לא בו. אתה כאן, ומישהו הדליק נר בעוגה.')],
        reward: {good: [heart(2)]},
        options: [
          o('listen', t('Listen to every minute with him', 'להקשיב איתו לכל דקה'), s('dad', 'Next year I will take you. I know a coach that does not smell of oranges.', 'שנה הבאה אקח אותך. אני מכיר אוטובוס שלא מריח כמו תפוזים.'), [heart(5), bond('dad', 5)]),
          o('story', t('Ask him to tell you about his first away day', 'לבקש ממנו לספר על הנסיעה הראשונה שלו'), s('dad', 'Sit. It begins with a lost shoe. It ends with a good one.', 'שב. זה מתחיל בנעל שאבדה. זה נגמר בנעל טובה.'), [heart(4), bond('dad', 6)]),
          o('toast', t('Raise the cake knife to the radio', 'להרים את סכין העוגה לכיוון הרדיו'), s('mum', 'Put the knife down. But I will allow the toast.', 'תניח את הסכין. אבל את הכוסית אני מתירה.'), [heart(3), standing(1), bond('mum', 2)]),
        ],
      }),
    ],
  }),

  chapter({
    id: 'c6-work', age: 21, act: 2, title: t('The shift', 'המשמרת'),
    intro: t('The shift board and the match notice cover the same Saturday. Your boss has already circled your name.', 'לוח המשמרות והמודעה על המשחק מכסים את אותה שבת. הבוס כבר הקיף את השם שלך.'),
    keep: {id: 'shift-slip', name: t('A shift slip', 'פתק משמרת'), note: t('An agreement has a second person in it.', 'בהסכם יש עוד אדם.')},
    scenes: [
      sc({
        id: 'S22', room: 'workshop', who: 'boss', after: [], east: 'workshop', spot: 'banner', sound: 'radio',
        title: t('Two Saturdays', 'שתי שבתות'),
        lines: [
          s('boss', 'You may swap, but do not write another person’s name for them.', 'אפשר להחליף. אל תכתוב שם של מישהו אחר במקומו.'),
          s('mate', 'Ask me. I am standing right here.', 'תשאל אותי. אני עומד ממש פה.'),
        ],
        callbacks: [
          {when: {flag: 'life:away2:go'}, lines: [s('mate', 'You came back hoarse on Monday. The saw heard you before I did.', 'חזרת צרוד ביום שני. המסור שמע אותך לפניי.')]},
          {when: is('life:promise:ride', 'open'), lines: [s('boss', 'Somebody phoned for you about petrol money. I took a message. It is under the tin of screws.', 'מישהו התקשר אליך בקשר לכסף של הדלק. רשמתי הודעה. היא מתחת לקופסת הברגים.')]},
        ],
        task: t('Write the agreed shift', 'לרשום את המשמרת שסוכמה'),
        action: [s(null, 'You take the pencil and check the board with the people affected.', 'אתה לוקח עיפרון ובודק את הלוח עם האנשים שהסיכום נוגע להם.')],
        options: [
          o('swap', t('Agree on a swap and a return shift', 'לסכם החלפה ומשמרת החזרה'), s('mate', 'I cover this one. You cover mine next week. Agreed?', 'אני מכסה הפעם. אתה בשבוע הבא. סגור?'), [flag('life:promise:shift', 'open'), flag('life:work:route', 'swap')]),
          o('stay', t('Keep the shift and follow later', 'להישאר במשמרת ולהתעדכן אחר כך'), s('boss', 'Work first. Then turn the radio up. Not next to the saw.', 'קודם עבודה. אחר כך תגביר רדיו. לא ליד המסור.'), [flag('life:work:route', 'stay'), standing(1)]),
          o('half', t('Agree a shorter shift before the match', 'לסכם משמרת קצרה לפני המשחק'), s('boss', 'Finish these shelves. Then go. A half-finished shelf is not a shorter shift.', 'תסיים את המדפים האלה ואז צא. מדף חצי גמור זו לא משמרת קצרה.'), [flag('life:work:route', 'half'), energy(-10)]),
        ],
      }),
      sc({
        id: 'S23', room: 'workshop', who: 'mate', east: 'workshop', game: 'count', spot: 'tools',
        title: t('The other half of the agreement', 'החצי השני של ההסכם'),
        lines: [
          s(null, 'Another workday arrives. There is no match notice to make this one exciting.', 'מגיע יום עבודה נוסף. אין מודעת משחק שהופכת אותו למרגש.'),
        ],
        callbacks: [
          {group: 'route', when: is('life:work:route', 'swap'), lines: [s('mate', 'I covered you last time. The saw and I had a long talk about you.', 'כיסיתי אותך בפעם הקודמת. המסור ואני ניהלנו שיחה ארוכה עליך.')]},
          {group: 'route', when: is('life:work:route', 'half'), lines: [s('mate', 'You left at two. The shelf you left at two is still waiting.', 'יצאת בשתיים. המדף שעזבת בשתיים עדיין מחכה.')]},
        ],
        task: t('Finish the work or report the absence', 'לסיים את העבודה או לדווח על ההיעדרות'),
        action: [s(null, 'You go to the board again. The agreement now needs an action.', 'אתה חוזר ללוח. עכשיו ההסכם צריך מעשה.')],
        reward: {good: [coins(4)]},
        options: [
          o('work', t('Work the agreed hours', 'לעבוד את השעות שסוכמו'), s('mate', 'There you are. Apron on. The radio is already tuned.', 'הנה אתה. שים סינר. הרדיו כבר מכוון.'), [flag('life:promise:shift', 'kept'), coins(24), bond('mate', 3), energy(-15)]),
          o('renegotiate', t('Ask for a new date before the shift', 'לבקש מועד חדש לפני המשמרת'), s('mate', 'I can do Tuesday. Write it down and call me if it changes.', 'שלישי אפשר. תרשום ותתקשר אם זה משתנה.'), [flag('life:promise:shift', 'open'), coins(12)]),
          o('miss', t('Fail to arrive and face the call', 'לא להגיע ולהתמודד עם השיחה'), s('mate', 'I waited. Next time your name on the board needs to mean something.', 'חיכיתי. בפעם הבאה השם שלך על הלוח צריך להיות שווה משהו.'), [flag('life:promise:shift', 'broken'), bond('mate', -5)]),
        ],
      }),
      sc({
        id: 'S24', room: 'street', who: 'friend', slot: 'wall', spot: 'bin',
        title: t('After the shift', 'אחרי המשמרת'),
        lines: [
          s('friend', 'How was it? The work, I mean. You always answer with football.', 'איך היה? בעבודה, התכוונתי. אתה תמיד עונה עם כדורגל.'),
          s('friend', 'Also. There is a game on Saturday and I am twelve short for the ticket. I am not asking. I am standing near the subject.', 'ועוד דבר. יש משחק בשבת ואני חסר שתים עשרה לכרטיס. אני לא מבקש. אני עומד ליד הנושא.'),
        ],
        callbacks: [{when: is('life:promise:shift', 'kept'), lines: [s('friend', 'You smell of sawdust and wages. It suits you.', 'אתה מריח כמו נסורת ומשכורת. זה מתאים לך.')]}],
        task: t('Choose where the evening continues', 'לבחור איפה ממשיכים את הערב'),
        action: [s(null, 'You put the slip in your pocket and make room for the evening.', 'אתה מקפל את הפתק בכיס ומפנה מקום לערב.')],
        options: [
          o('ground', t('Meet near the ground', 'להיפגש ליד המגרש'), s('friend', 'I will bring food. You bring the story that is not about the referee.', 'אני אביא אוכל. אתה תביא סיפור שלא קשור לשופט.'), [flag('life:work:evening', 'ground')]),
          o('home', t('Invite the friend home', 'להזמין את החבר הביתה'), s('friend', 'A chair with a back. We have finally made it.', 'כיסא עם משענת. סוף סוף הצלחנו בחיים.'), [flag('life:work:evening', 'home')]),
          o('quiet', t('Take an evening to yourself', 'לקחת ערב לעצמך'), s(null, 'You walk slowly. Football will still exist tomorrow.', 'אתה הולך לאט. הכדורגל יהיה שם גם מחר.'), [flag('life:work:evening', 'quiet'), energy(10)]),
          o('lend', t('Lend him the twelve for the ticket (12)', 'להלוות לו את השתים עשרה לכרטיס (12)'), s('friend', 'I will pay you back. I will pay you back in a way you will not enjoy: with a song.', 'אני אחזיר לך. אחזיר בדרך שלא תיהנה ממנה: עם שיר.'), [flag('life:work:evening', 'ground'), flag('life:lent:ticket'), coins(-12), bond('friend', 6)], {when: {min: ['coins', 12]}}),
        ],
      }),
    ],
  }),

  chapter({
    id: 'c6b-our-saturday', age: 24, act: 2, title: t('Our Saturday', 'השבת שלנו'),
    intro: t('Someone close wants a place in your calendar, not a seat left over after everything else.', 'מישהו קרוב רוצה מקום בלוח שלך, לא כיסא שנשאר אחרי כל השאר.'),
    keep: {id: 'shared-calendar', name: t('A page from a calendar', 'דף מלוח השנה'), note: t('Two people wrote on this page.', 'שני אנשים כתבו בדף הזה.')},
    scenes: [
      sc({
        id: 'S25', room: 'room', who: 'friend', after: [], spot: 'frame',
        title: t('An actual invitation', 'הזמנה אמיתית'),
        lines: [
          s('friend', 'When you say see you Saturday, do you mean before the game, after it, or in a different lifetime?', 'כשאתה אומר נתראה בשבת, זה לפני המשחק, אחריו או בחיים אחרים?'),
        ],
        callbacks: [
          {when: is('life:work:evening', 'home'), lines: [s('friend', 'You invited me home once and I have been thinking about that chair ever since.', 'פעם הזמנת אותי הביתה ואני חושב על הכיסא ההוא מאז.')]},
          {when: {flag: 'life:lent:ticket'}, lines: [s('friend', 'I still owe you twelve. I have not forgotten. I am only making a speech about priorities first.', 'אני עדיין חייב לך שתים עשרה. לא שכחתי. אני רק נושא קודם נאום על סדרי עדיפויות.')]},
        ],
        task: t('Write a time together', 'לכתוב שעה יחד'),
        action: [s(null, 'The calendar stays open. Nobody agrees on behalf of the other person.', 'הלוח נשאר פתוח. אף אחד לא מסכים בשם האדם השני.')],
        options: [
          o('relationship', t('Talk about building a shared life', 'לשוחח על בניית חיים משותפים'), s('friend', 'I want that too. Let us talk about what it would actually look like.', 'גם אני רוצה. בוא נדבר איך זה ייראה באמת.'), [flag('life:household:kind', 'partner')]),
          o('friendship', t('Protect a regular time for friendship', 'לקבוע זמן קבוע לחברות'), s('friend', 'One evening that does not begin with you checking the score. Deal.', 'ערב אחד שלא מתחיל בזה שאתה בודק תוצאה. סגור.'), [flag('life:household:kind', 'friend')]),
          o('space', t('Be honest about needing your own space', 'להגיד בכנות שצריך מרחב אישי'), s('friend', 'Fine. Then invite me when you have room, and mean it.', 'בסדר. אז תזמין כשיש לך מקום, ותתכוון לזה.'), [flag('life:household:kind', 'solo')]),
        ],
      }),
      sc({
        id: 'S26', room: 'kitchen', who: 'friend', spot: 'table',
        title: t('What we agree to', 'מה שסיכמנו'),
        lines: [
          s('friend', 'A home is more than a fixture list. What do you want to make room for?', 'בית הוא יותר מלוח משחקים. למה אתה רוצה לפנות מקום?'),
        ],
        callbacks: [
          {group: 'kind', when: is('life:household:kind', 'partner'), lines: [s(null, 'There are two mugs on the table and one of them has the badge on it.', 'יש שתי ספלים על השולחן ועל אחד מהם הסמל.')]},
          {group: 'kind', when: is('life:household:kind', 'solo'), lines: [s(null, 'There is one mug on the table, which is exactly how you asked for it.', 'יש ספל אחד על השולחן, בדיוק כמו שביקשת.')]},
        ],
        task: t('Put the shared plan on paper', 'להעלות את התוכנית המשותפת על הנייר'),
        action: [s(null, 'You write, stop, and check that the other person wants the same thing.', 'אתה כותב, עוצר ובודק שגם האדם השני רוצה את אותו הדבר.')],
        options: [
          o('children', t('Agree, together, to consider parenthood later', 'להסכים יחד לשקול הורות בעתיד'), s('friend', 'I want us to explore that together. A wish is not a child; we have years to decide.', 'אני רוצה שנבדוק את זה יחד. רצון הוא עדיין לא ילד; יש לנו שנים להחליט.'), [flag('life:family:intent', 'parent')], {when: is('life:household:kind', 'partner')}),
          o('nochildren', t('Choose a shared life without parenting', 'לבחור חיים משותפים בלי הורות'), s('friend', 'Then this is our home too. It does not need to copy anybody else’s.', 'אז גם זה הבית שלנו. הוא לא צריך להעתיק בית של אף אחד.'), [flag('life:family:intent', 'nochild')], {when: is('life:household:kind', 'partner')}),
          o('people', t('Make room for people without a family plan', 'לפנות מקום לאנשים בלי תוכנית משפחתית'), s('friend', 'A table, a spare chair, and an invitation that really happens. Start there.', 'שולחן, כיסא נוסף והזמנה שבאמת מתקיימת. נתחיל בזה.'), [flag('life:family:intent', 'open')]),
        ],
      }),
      sc({
        id: 'S27', room: 'gate', who: 'friend', cut: true, night: true, sound: 'murmur', spot: 'board',
        title: t('The overtime that was not agreed', 'התוספת שלא סוכמה'),
        lines: [
          s(null, 'Your phone rings. You said you would be back by seven. The gates are open behind you and a friend is suggesting one more stop.', 'הטלפון מצלצל. אמרת שתחזור בשבע. השערים פתוחים מאחוריך וחבר מציע עוד עצירה אחת.'),
        ],
        callbacks: [{when: {any: [is('life:household:kind', 'partner'), is('life:household:kind', 'friend')]}, lines: [s(null, 'Somebody at home has made the dinner an hour ago and has not mentioned it once.', 'מישהו בבית הכין את ארוחת הערב לפני שעה ולא הזכיר את זה אפילו פעם אחת.')]}],
        task: t('Act on the plan or change it honestly', 'לקיים את התוכנית או לשנות אותה בכנות'),
        action: [s(null, 'You step away from the queue and make the call before deciding.', 'אתה יוצא מהתור ומתקשר לפני שאתה מחליט.')],
        options: [
          o('leave', t('Go back at the agreed time', 'לחזור בזמן שסוכם'), s('friend', 'You came. I saved the good chair, not the good score.', 'הגעת. שמרתי לך את הכיסא הטוב, לא את התוצאה הטובה.'), [flag('life:promise:home', 'kept'), bond('friend', 3), heart(1)]),
          o('ask', t('Agree a different evening with the other person', 'לסכם ערב אחר עם האדם השני'), s('friend', 'Tomorrow works for me. This is a change we both made.', 'מחר מתאים לי. זה שינוי ששנינו עשינו.'), [flag('life:promise:home', 'open'), heart(2)]),
          o('late', t('Stay and arrive after everyone has left', 'להישאר ולהגיע אחרי שכולם הלכו'), s('friend', 'The food is in the fridge. The evening is not.', 'האוכל במקרר. הערב כבר לא.'), [flag('life:promise:home', 'broken'), bond('friend', -4), heart(4)]),
        ],
      }),
    ],
  }),

  chapter({
    id: 'c6c-world-opens', age: 25, act: 2, title: t('The other scarf', 'הצעיף האחר'),
    intro: t('A visiting supporter asks a simple question. You discover how much of your city you have never had to explain.', 'אוהד אורח שואל שאלה פשוטה. אתה מגלה כמה מהעיר שלך מעולם לא היית צריך להסביר.'),
    keep: {id: 'visitor-map', name: t('A map with two handwritings', 'מפה בשני כתבי יד'), note: t('A route is a conversation, drawn.', 'מסלול הוא שיחה, מצוירת.')},
    scenes: [
      sc({
        id: 'S28', room: 'street', who: 'seller', after: [], spot: 'window',
        title: t('Which way?', 'לאן הולכים?'),
        lines: [
          s('seller', 'They asked me for the ground. I sent them to the bakery. In my defence, it is a very good bakery.', 'שאלו אותי איפה המגרש. שלחתי למאפייה. להגנתי, זו מאפייה מצוינת.'),
        ],
        callbacks: [
          {when: {wears: 'both'}, lines: [s('seller', 'Shirt and scarf both? They will think you are the club shop. They will follow you anywhere.', 'גם חולצה וגם צעיף? יחשבו שאתה חנות המועדון. יעקבו אחריך לכל מקום.')]},
          {when: is('life:rival:link', 'open'), lines: [s('seller', 'Your old classmate was here for the same reason as the visitor. We are a very hospitable street.', 'המכרה מהכיתה הייתה פה מאותה סיבה כמו האורח. אנחנו רחוב מסביר פנים מאוד.')]},
        ],
        task: t('Mark an actual meeting place', 'לסמן נקודת מפגש ברורה'),
        action: [s(null, 'You draw a route on the back of a receipt. There is room for a name and a meeting time.', 'אתה מצייר מסלול בגב קבלה. יש מקום לשם ולשעת מפגש.')],
        options: [
          o('guide', t('Walk with the visitor', 'ללוות את האורח ברגל'), s(null, 'The visitor points at your scarf, then at theirs. Names become easier.', 'האורח מצביע על הצעיף שלך ואז על שלו. השמות כבר קלים יותר.'), [flag('life:visitor:route', 'guide'), energy(-10), standing(2)]),
          o('introduce', t('Introduce someone who can guide them', 'להכיר להם מישהו שיוכל ללוות'), s('friend', 'I can help. Ask them if they want company first.', 'אני יכול לעזור. קודם תשאל אם הם רוצים חברה.'), [flag('life:visitor:route', 'introduce'), bond('friend', 2)]),
          o('map', t('Give clear directions and a contact number', 'לתת הוראות ברורות ומספר קשר'), s(null, 'You check that the directions make sense from their side of the paper.', 'אתה בודק שההוראות מובנות גם מהצד שלהם של הדף.'), [flag('life:visitor:route', 'map')]),
        ],
      }),
      sc({
        id: 'S29', room: 'gate', who: 'steward', sound: 'murmur', spot: 'board',
        title: t('The closed entrance', 'הכניסה הסגורה'),
        lines: [
          s('steward', 'This entrance is closed today. Use the one marked on the board.', 'הכניסה הזו סגורה היום. תשתמשו בזו שמסומנת על הלוח.'),
        ],
        callbacks: [
          {group: 'route', when: is('life:visitor:route', 'guide'), lines: [s('steward', 'You walked them all this way? Then you owe them a seat, not a sign.', 'הלכת איתם עד כאן? אז אתה חייב להם מושב, לא שלט.')]},
          {group: 'route', when: is('life:visitor:route', 'introduce'), lines: [s('steward', 'The guide you sent came through ten minutes ago. Good eyes, that one.', 'המלווה ששלחת עבר פה לפני עשר דקות. עיניים טובות לאחד כזה.')]},
        ],
        task: t('Read the sign and correct the route', 'לקרוא את השלט ולתקן את הדרך'),
        action: [s(null, 'You compare the sign with the receipt. The confident arrow was wrong.', 'אתה משווה את השלט לקבלה. החץ הבטוח היה שגוי.')],
        options: [
          o('admit', t('Admit the mistake and walk round', 'להודות בטעות ולעשות את הסיבוב'), s(null, 'The visitor laughs with you. You are both following the sign now.', 'האורח צוחק איתך. עכשיו שניכם הולכים לפי השלט.'), [flag('life:visitor:trust', 'open'), heart(1)]),
          o('ask', t('Ask the steward to explain the accessible route', 'לבקש מהסדרן להסביר את המסלול הנגיש'), s('steward', 'A little longer, fewer steps. Here is where you turn.', 'קצת יותר ארוך, פחות מדרגות. כאן פונים.'), [flag('life:visitor:trust', 'care'), standing(1)]),
          o('handoff', t('Hand over to the guide you introduced', 'להעביר את הליווי למי שהכרתם'), s('friend', 'I have them. Your arrow now leads to a story, which is an improvement.', 'הם איתי. החץ שלך מוביל עכשיו לסיפור, שזה שיפור.'), [flag('life:visitor:trust', 'shared')], {when: is('life:visitor:route', 'introduce')}),
          o('shrug', t('Shrug and take them in by the nearest door', 'להתעלם ולהכניס אותם דרך הדלת הקרובה'), s('steward', 'That door is closed. You are about to find that out together.', 'הדלת הזאת סגורה. אתם עומדים לגלות את זה ביחד.'), [flag('life:visitor:trust', 'open'), energy(-5)]),
        ],
      }),
      sc({
        id: 'S30', room: 'room', who: 'friend', spot: 'photos',
        title: t('Keep in touch', 'נשמור על קשר'),
        lines: [
          s('friend', 'You have a name and a city, not a free holiday. What happens next?', 'יש לך שם ועיר, לא חופשה חינם. מה הלאה?'),
        ],
        callbacks: [{when: is('life:visitor:trust', 'shared'), lines: [s('friend', 'The one I walked to the gate has already written to me. In capital letters.', 'זה שליוויתי עד השער כבר כתב לי. באותיות גדולות.')]}],
        task: t('Send the message you promised', 'לשלוח את ההודעה שהבטחת'),
        action: [s(null, 'You write a short message and actually send it.', 'אתה כותב הודעה קצרה ובאמת שולח אותה.')],
        options: [
          o('regular', t('Begin an occasional exchange', 'להתחיל קשר מדי פעם'), s(null, 'A reply arrives: their scarf is drying on a chair too.', 'מגיעה תשובה: גם הצעיף שלהם מתייבש על כיסא.'), [flag('life:visitor:contact', 'regular'), bond('friend', 1)]),
          o('visit', t('Say you may visit, without booking anything', 'לומר שאולי תבקר, בלי להזמין נסיעה'), s(null, 'You save the address. A possibility is a possibility, not a ticket.', 'אתה שומר כתובת. אפשרות היא אפשרות, לא כרטיס.'), [flag('life:visitor:contact', 'possible')]),
          o('thanks', t('Thank them and leave it as one good encounter', 'להודות ולהשאיר מפגש טוב אחד'), s(null, 'The map goes into the box. Not every good meeting needs a sequel.', 'המפה נכנסת לקופסה. לא כל מפגש טוב צריך המשך.'), [flag('life:visitor:contact', 'closed')]),
        ],
      }),
    ],
  }),

  chapter({
    id: 'c6a-empty', age: 26, act: 2, title: t('The empty seat', 'הכיסא הריק'),
    intro: t('Your friend misses several Saturdays. The team is still playing. His life has become bigger than the terrace.', 'החבר מחמיץ כמה שבתות. הקבוצה עדיין משחקת. החיים שלו נהיו גדולים יותר מהיציע.'),
    keep: {id: 'empty-seat-note', name: t('An invitation without a deadline', 'הזמנה בלי תאריך תפוגה'), note: t('Space is not the same thing as absence.', 'מרחב הוא לא אותו דבר כמו היעדרות.')},
    scenes: [
      sc({
        id: 'S31', room: 'terrace', who: 'steward', after: [], sound: 'murmur', spot: 'banner',
        title: t('No attendance register', 'בלי פנקס נוכחות'),
        lines: [
          s('steward', 'That seat has been empty for four Saturdays. I am not asking. I am a steward; I count seats.', 'המושב הזה ריק כבר ארבע שבתות. אני לא שואל. אני סדרן; אני סופר כיסאות.'),
          s(null, 'The seat beside you is folded up. Somebody has put a scarf on it so that nobody sits there by accident.', 'המושב לידך מקופל. מישהו הניח עליו צעיף כדי שאף אחד לא ישב שם בטעות.'),
        ],
        callbacks: [
          {when: is('life:work:evening', 'ground'), lines: [s('steward', 'You two used to meet here before the gates opened. I remember the sandwiches.', 'שניכם הייתם נפגשים פה לפני שפתחו את השערים. אני זוכר את הסנדוויצ׳ים.')]},
          {when: {flag: 'life:away2:go'}, lines: [s('steward', 'He was at the far end with you, I heard. That is a long way to go with somebody and not come to the next game.', 'הוא היה איתך ביציע הרחוק, שמעתי. זה הרבה דרך לעשות עם מישהו ולא לבוא למשחק הבא.')]},
        ],
        task: t('Send an invitation with room to refuse', 'לשלוח הזמנה שאפשר גם לסרב לה'),
        action: [s(null, 'You take the accusation out of the message before sending it.', 'אתה מוציא את ההאשמה מההודעה לפני שאתה שולח.')],
        options: [
          o('seat', t('Keep a place when he wants to return', 'לשמור מקום כשירצה לחזור'), s(null, 'His answer comes at half-time: “That helps. Just do not sell it as a rescue operation.”', 'התשובה שלו מגיעה במחצית: ״זה עוזר. רק אל תמכור את זה כמבצע חילוץ.״'), [flag('life:friend:distance', 'seat'), heart(3)]),
          o('home', t('Offer a visit away from football', 'להציע ביקור שלא קשור לכדורגל'), s(null, 'His answer comes in four words: “Thursday. Tea. No commentary.”', 'התשובה שלו מגיעה בארבע מילים: ״חמישי. תה. בלי פרשנות.״'), [flag('life:friend:distance', 'visit')]),
          o('space', t('Give space and a clear way to reconnect', 'לתת מרחב ודרך ברורה לחזור לקשר'), s(null, 'His answer is a thumb, then a line: “I will call. Thank you for not making the silence louder.”', 'התשובה שלו היא אגודל, ואז שורה: ״אני אתקשר. תודה שלא הפכת את השקט לרועש יותר.״'), [flag('life:friend:distance', 'space'), energy(5)]),
        ],
      }),
      sc({
        id: 'S32', room: 'kitchen', who: 'friend', spot: 'table',
        title: t('Do the small thing', 'לעשות את הדבר הקטן'),
        lines: [
          s(null, 'The agreed day arrives. There is no crowd to applaud showing up.', 'מגיע היום שסוכם. אין קהל שימחא כפיים על זה שהגעת.'),
        ],
        callbacks: [
          {group: 'distance', when: is('life:friend:distance', 'visit'), lines: [s('friend', 'Thursday, tea, no commentary. You kept to it. I will keep the biscuits.', 'חמישי, תה, בלי פרשנות. עמדת בזה. אני אשמור את הביסקוויטים.')]},
          {group: 'distance', when: is('life:friend:distance', 'seat'), lines: [s('friend', 'You kept the seat. I noticed. I am not ready, but I noticed.', 'שמרת את המושב. שמתי לב. אני עוד לא מוכן, אבל שמתי לב.')]},
          {when: is('life:household:kind', 'partner'), lines: [s('friend', 'My other half sends hello. And a plate. Eat.', 'בן הזוג שלי שולח שלום. וצלחת. תאכל.')]},
        ],
        task: t('Carry out the invitation', 'לבצע את ההזמנה'),
        action: [s(null, 'You put the kettle on, check the message, and follow the terms of the invitation.', 'אתה מפעיל קומקום, בודק את ההודעה ופועל לפי תנאי ההזמנה.')],
        options: [
          o('listen', t('Listen without fixing his life', 'להקשיב בלי לתקן לו את החיים'), s('friend', 'I did not need an answer. I needed you to stay until I finished.', 'לא הייתי צריך תשובה. הייתי צריך שתישאר עד שאסיים.'), [flag('life:friend:care', 'listened'), bond('friend', 4), energy(-10)]),
          o('practical', t('Offer one task and ask before doing it', 'להציע עזרה אחת ולשאול לפני שעושים'), s('friend', 'You can bring the bag tomorrow. That would actually help.', 'את התיק תוכל להביא מחר. זה באמת יעזור.'), [flag('life:friend:care', 'practical'), bond('friend', 2)]),
          o('light', t('Share something funny and keep it brief', 'לשתף משהו מצחיק ולשמור על ביקור קצר'), s('friend', 'Ten minutes of normal nonsense. I missed that.', 'עשר דקות של שטויות רגילות. לזה התגעגעתי.'), [flag('life:friend:care', 'light'), bond('friend', 1)]),
        ],
      }),
      sc({
        id: 'S33', room: 'bedroom', who: 'dad', night: true, spot: 'box',
        title: t('The seat is not a verdict', 'הכיסא הוא לא פסק דין'),
        lines: [
          s('dad', 'People change their Saturdays. That does not erase the Saturdays you had.', 'אנשים משנים את השבתות שלהם. זה לא מוחק את השבתות שהיו לכם.'),
        ],
        callbacks: [{when: is('life:friend:care', 'listened'), lines: [s('dad', 'You listened to him for an hour? I could not do that for my own brother. Do not tell him I said so.', 'הקשבת לו שעה? אני לא יכולתי את זה לאח שלי. אל תגיד לו שאמרתי.')]}],
        task: t('Save a memory without deciding for the friend', 'לשמור זיכרון בלי להחליט עבור החבר'),
        action: [s(null, 'You fold the note. There is no return date on it.', 'אתה מקפל את הפתק. אין עליו תאריך חזרה.')],
        options: [
          o('open', t('Leave the invitation open', 'להשאיר הזמנה פתוחה'), s(null, 'There is a place, and no attendance register.', 'יש מקום, ואין פנקס נוכחות.'), [flag('life:friend:return', 'open'), heart(2)]),
          o('different', t('Build a different kind of friendship', 'לבנות חברות מסוג אחר'), s(null, 'Next time you meet, nobody asks about the table.', 'בפגישה הבאה אף אחד לא שואל על הטבלה.'), [flag('life:friend:return', 'different')]),
          o('accept', t('Accept that contact may become occasional', 'להסכים שהקשר יהיה מדי פעם'), s(null, 'The good years remain good years.', 'השנים הטובות נשארות שנים טובות.'), [flag('life:friend:return', 'occasional')]),
        ],
      }),
    ],
  }),

  chapter({
    id: 'c6d-route-march', age: 27, act: 2, title: t('The long way to the ground', 'הדרך הארוכה למגרש'),
    intro: t('Before the match, the road itself is the event. Someone has to carry the banner. Someone has to walk slowly beside the old man.', 'לפני המשחק, הדרך עצמה היא האירוע. מישהו צריך לשאת את הדגל. מישהו צריך ללכת לאט ליד הזקן.'),
    keep: {id: 'march-pin', name: t('A pin from the march', 'סיכה מהמצעד'), note: t('Everything you carried that day, and who you carried it for.', 'כל מה שנשאת באותו יום, ולמי נשאת.')},
    scenes: [
      sc({
        id: 'S63', room: 'street', who: 'seller', after: [], game: 'carry', spot: 'crates', verb: 'take',
        title: t('The banner', 'הדגל הגדול'),
        lines: [
          s('seller', 'Two poles, one banner, nobody under forty. Which end do you want?', 'שני מוטות, דגל אחד, אף אחד מתחת לארבעים. איזה קצה אתה רוצה?'),
        ],
        callbacks: [
          {when: {flag: 'life:away2:go'}, lines: [s('seller', 'You were at the far end, I heard. They will want you at the front of this one.', 'היית ביציע הרחוק, שמעתי. ירצו אותך בראש של זה.')]},
          {when: is('life:visitor:contact', 'regular'), lines: [s('seller', 'Your pen friend sent a postcard to the shop. For the march. I am keeping it for the banner.', 'חבר העט שלך שלח גלויה לחנות. בשביל המצעד. אני שומר אותה בשביל הדגל.')]},
        ],
        task: t('Lift the banner and leave the street', 'להרים את הדגל וליצאת מהרחוב'),
        action: [s(null, 'The pole is heavier than it looks. Everyone behind you lifts with you and does not say so.', 'המוט כבד ממה שנראה. כל מי שמאחוריך מרים איתך ולא אומר.')],
        reward: {good: [heart(2)]},
        options: [
          o('front', t('Take the front pole', 'לקחת את המוט הקדמי'), s('seller', 'The front sees the road first. Do not look at your feet.', 'הקדמי רואה את הדרך ראשון. אל תסתכל על הרגליים.'), [flag('life:march:place', 'front'), energy(-20), standing(3), heart(2)]),
          o('back', t('Take the back pole, where you can see them all', 'לקחת את המוט האחורי, שרואים משם את כולם'), s('seller', 'Most people want to be seen. You want to see. I like that.', 'רוב האנשים רוצים להיראות. אתה רוצה לראות. אני אוהב את זה.'), [flag('life:march:place', 'back'), energy(-10), bond('friend', 2)]),
          o('drum', t('Walk with the drum instead', 'ללכת עם התוף במקום'), s('seller', 'A drum is a banner you can hear. Do not hurry it.', 'תוף הוא דגל ששומעים. אל תמהר איתו.'), [flag('life:march:place', 'drum'), energy(-5), heart(3)]),
        ],
      }),
      sc({
        id: 'S64', room: 'route', who: 'elder', sound: 'murmur', spot: 'flags',
        title: t('The old man and the pace', 'הזקן והקצב'),
        lines: [
          s('elder', 'The young ones are running ahead. Somebody has to stay with the stiff knees. It is not a punishment.', 'הצעירים רצים קדימה. מישהו צריך להישאר עם הברכיים הנוקשות. זה לא עונש.'),
        ],
        callbacks: [{group: 'place', when: is('life:march:place', 'front'), lines: [s('elder', 'You came off the front pole already? Then you are the one who can still run.', 'ירדת כבר מהמוט הקדמי? אז אתה זה שעוד יכול לרוץ.')]}, {group: 'place', when: is('life:march:place', 'drum'), lines: [s('elder', 'Your drum is two hundred metres ahead. It sounds guilty.', 'התוף שלך מאתיים מטר קדימה. הוא נשמע אשם.')]}],
        task: t('Choose your pace', 'לבחור את הקצב'),
        action: [s(null, 'The road is longer when you choose it. The ground is on the horizon, and not any nearer.', 'הדרך ארוכה יותר כשבוחרים אותה. המגרש באופק, ולא קרוב יותר.')],
        options: [
          o('fast', t('Run ahead with the young ones', 'לרוץ קדימה עם הצעירים'), s('elder', 'Go. Save me a place near the wall.', 'לך. תשמור לי מקום ליד הקיר.'), [flag('life:march:pace', 'fast'), energy(-25), heart(3), standing(2)]),
          o('slow', t('Stay beside him, step for step', 'להישאר לידו, צעד צעד'), s('elder', 'I will tell you who sat where in nineteen-something. You will pretend to be surprised.', 'אספר לך מי ישב איפה בשנה כלשהי. אתה תעמיד פנים שאתה מופתע.'), [flag('life:march:pace', 'slow'), energy(-5), bond('elder', 6), heart(2)]),
          o('half', t('Run ahead, then come back for him', 'לרוץ קדימה ואז לחזור אליו'), s('elder', 'Twice the road for the same destination. That is an honest sum.', 'פעמיים הדרך לאותו יעד. זה חשבון ישר.'), [flag('life:march:pace', 'both'), energy(-30), bond('elder', 3), heart(3)]),
        ],
      }),
      sc({
        id: 'S65', room: 'gate', who: 'steward', game: 'chant', sound: 'roar', final: true, spot: 'flag',
        title: t('The song at the gate', 'השיר בשער'),
        lines: [
          s('steward', 'You are the last ones. They have been singing for ten minutes without you. Begin.', 'אתם האחרונים. הם שרים כבר עשר דקות בלעדיכם. תתחילו.'),
        ],
        callbacks: [
          {group: 'pace', when: is('life:march:pace', 'slow'), lines: [s(null, 'You came in step with a man who has seen it all. The gate lets you through slowly, as if it knew.', 'נכנסת בצעד אחד עם אדם שראה הכול. השער מעביר אותך לאט, כאילו ידע.')]},
          {group: 'pace', when: is('life:march:pace', 'fast'), lines: [s(null, 'You are out of breath, which is the right way to arrive.', 'נגמר לך האוויר, וזו הדרך הנכונה להגיע.')]},
        ],
        task: t('Sing at the gate', 'לשיר בשער'),
        action: [s(null, 'The song is older than you and it fits your mouth exactly.', 'השיר ישן ממך והוא מתאים לפה שלך בדיוק.')],
        reward: {good: [heart(2)]},
        options: [
          o('lead', t('Begin it yourself', 'להתחיל אותו בעצמך'), s('steward', 'Louder at the back. Everyone is looking at you. Good.', 'חזק יותר מאחורה. כולם מסתכלים עליך. טוב.'), [flag('life:march:song', 'lead'), heart(7), energy(-10), standing(3)]),
          o('join', t('Join it where it already is', 'להצטרף אליו איפה שהוא כבר נמצא'), s(null, 'Your voice goes in like a coin. You do not hear it fall.', 'הקול שלך נכנס כמו מטבע. אתה לא שומע אותו נופל.'), [flag('life:march:song', 'join'), heart(5)]),
          o('listen', t('Let the others sing; you are carrying the banner', 'לתת לאחרים לשיר; אתה נושא את הדגל'), s('steward', 'Someone has to hold it up. It is a song too.', 'מישהו צריך להחזיק אותו למעלה. זה גם שיר.'), [flag('life:march:song', 'carry'), heart(4), standing(2)]),
        ],
      }),
    ],
  }),
]

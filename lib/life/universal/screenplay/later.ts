import {chapter, o, s, sc, t} from './write'
import {bond, coins, energy, flag, heart, is, standing} from './types'

const abroad = is('life:home:place', 'abroad')
const notAbroad = {none: [abroad]}
const asChild = is('life:family', 'child')
const newcomer = {any: [is('life:family', 'child'), is('life:family', 'newfan')]}
const dadStays = is('life:trip:party', 'solo')

/**
 * Ages thirty to forty-six. Distance, a table in a workshop, a debt that comes back, a first visit that belongs to
 * somebody else, a plan in your own pocket. The ground is the same ground; the person holding the ticket has changed.
 */
export const LATER = [
  chapter({
    id: 'c7-far', age: 30, act: 2, title: t('Distance', 'מרחק'),
    intro: t('A suitcase stands by the door. It may be yours, or the friend’s. The distance needs a plan either way.', 'מזוודה עומדת ליד הדלת. היא יכולה להיות שלך או של החבר. המרחק צריך תוכנית בכל מקרה.'),
    keep: {id: 'distance-note', name: t('Two times on one clock', 'שתי שעות על שעון אחד'), note: t('Staying can change a life too.', 'גם להישאר יכול לשנות חיים.')},
    scenes: [
      sc({
        id: 'S34', room: 'room', who: 'friend', after: [], spot: 'table',
        title: t('Whose suitcase?', 'של מי המזוודה?'),
        lines: [
          s('friend', 'We have talked about moving for months. Decide what we are actually saying goodbye to.', 'דיברנו על מעבר חודשים. בוא נחליט ממה אנחנו באמת נפרדים.'),
        ],
        callbacks: [
          {when: is('life:visitor:contact', 'possible'), lines: [s('friend', 'You still have that address from the visitor, the one you never used. There is a spare bed in that city. Just saying.', 'עדיין יש לך את הכתובת מהאורח, זו שמעולם לא השתמשת בה. יש מיטה פנויה בעיר ההיא. סתם אומר.')]},
          {when: is('life:household:kind', 'partner'), lines: [s(null, 'Two names on a luggage tag are a harder thing to write than one.', 'שני שמות על תג מזוודה זה דבר קשה יותר לכתיבה משם אחד.')]},
        ],
        task: t('Label the suitcase or close it', 'לסמן את המזוודה או לסגור אותה'),
        action: [s(null, 'You put a name on the luggage tag. A possible move becomes a chosen route.', 'אתה כותב שם על תג המזוודה. מעבר אפשרי הופך למסלול שנבחר.')],
        options: [
          o('abroad', t('Take the agreed opportunity abroad', 'לקחת את ההזדמנות שסוכמה בחו״ל'), s('friend', 'Then we set a time to call. Not whenever the match ends.', 'אז קובעים זמן לשיחה. לא מתי שהמשחק ייגמר.'), [flag('life:home:place', 'abroad'), energy(-20), standing(-1)]),
          o('stay', t('Stay while the friend moves', 'להישאר כשהחבר עובר'), s('friend', 'You will know the old streets. I will tell you about the new ones.', 'אתה תכיר את הרחובות הישנים. אני אספר על החדשים.'), [flag('life:home:place', 'home'), bond('friend', -1)]),
          o('defer', t('Defer the move and choose life here', 'לדחות את המעבר ולבחור בחיים כאן'), s('friend', 'Then unpack. A closed suitcase is not a life plan.', 'אז תפרוק. מזוודה סגורה היא לא תוכנית לחיים.'), [flag('life:home:place', 'home'), heart(2)]),
        ],
      }),
      sc({
        id: 'S35', room: 'room', who: 'friend', night: true, cut: true, sound: 'radio',
        locations: [{room: 'flat-abroad', when: abroad}, {room: 'room', when: notAbroad}],
        title: t('The first real call', 'השיחה האמיתית הראשונה'),
        lines: [
          s(null, 'The line is not good and you both pretend it is. Somewhere behind the voice there is a radio you cannot quite hear.', 'הקו לא טוב ושניכם מעמידים פנים שכן. איפשהו מאחורי הקול יש רדיו שאתה לא ממש שומע.'),
          s('friend', 'Five minutes without pretending everything is wonderful?', 'חמש דקות בלי להעמיד פנים שהכול נפלא?'),
        ],
        callbacks: [
          {group: 'kind', when: {flag: 'life:friend:return'}, lines: [s('friend', 'Whatever else, you kept my seat open. I thought about that on the plane.', 'מה שלא יהיה, שמרת לי מקום. חשבתי על זה במטוס.')]},
        ],
        task: t('Make the scheduled call', 'לקיים את השיחה שנקבעה'),
        action: [s(null, 'You set the clock aside and let the other person finish.', 'אתה מניח את השעון בצד ונותן לאדם השני לסיים.')],
        options: [
          o('honest', t('Say what is actually difficult', 'לספר מה באמת קשה'), s('friend', 'Good. Now we can talk to a person instead of a postcard.', 'טוב. עכשיו אפשר לדבר עם אדם ולא עם גלויה.'), [flag('life:distance:talk', 'honest'), bond('friend', 3)]),
          o('routine', t('Make a small shared routine', 'לקבוע שגרה קטנה משותפת'), s('friend', 'One meal, one call. Football can join us sometimes.', 'ארוחה אחת, שיחה אחת. הכדורגל יכול להצטרף לפעמים.'), [flag('life:distance:talk', 'routine'), heart(2)]),
          o('short', t('Keep this call short and book the next one', 'לקצר הפעם ולקבוע את השיחה הבאה'), s('friend', 'Next Sunday, then. I will put it where I can see it.', 'אז ביום ראשון הבא. אשים את זה במקום שאוכל לראות.'), [flag('life:distance:talk', 'short'), energy(5)]),
        ],
      }),
      sc({
        id: 'S36', room: 'kitchen', who: 'dad', night: true,
        locations: [{room: 'kitchen', when: notAbroad}, {room: 'flat-abroad', when: abroad}],
        presence: notAbroad,
        solo: [s(null, 'Dad’s voice comes thin through the speaker. He has put the radio down beside the phone, so you can hear {club} playing behind him.', 'הקול של אבא מגיע דק מהרמקול. הוא הניח את הרדיו ליד הטלפון, וככה אפשר לשמוע מאחוריו את {club} משחקים.')],
        title: t('A place at the table', 'מקום ליד השולחן'),
        lines: [
          s('dad', 'You can be far away and still call. You can live next door and forget.', 'אפשר להיות רחוק ועדיין להתקשר. אפשר לגור ליד ולשכוח.'),
        ],
        callbacks: [
          {when: is('life:distance:talk', 'honest'), lines: [s(null, 'You said something hard to someone this week. Telling Dad the easy half of it is still a start.', 'אמרת השבוע משהו קשה למישהו. לספר לאבא את החצי הקל זה עדיין התחלה.')]},
          {when: is('life:home:trust', 'repaired'), lines: [s(null, 'There is no hesitation before you dial. That has not always been true in this family.', 'אין היסוס לפני שאתה מחייג. זה לא תמיד היה נכון במשפחה הזאת.')]},
        ],
        task: t('Make the family call or visit', 'לקיים שיחה או ביקור משפחתי'),
        action: [s(null, 'You make contact before putting the phone away. Distance is not decided by kilometres alone.', 'אתה יוצר קשר לפני שאתה מניח את הטלפון. מרחק לא נמדד רק בקילומטרים.')],
        options: [
          o('regular', t('Agree a regular call with Dad', 'לקבוע שיחה קבועה עם אבא'), s('dad', 'I will answer. Do not start by asking if I saw the goal.', 'אני אענה. אל תפתח בזה שתשאל אם ראיתי את השער.'), [flag('life:dad:contact', 'regular'), bond('dad', 3)], {soloReply: [s(null, 'He says he will answer. You hear the radio cough behind him. You decide not to ask about the goal.', 'הוא אומר שיענה. אתה שומע את הרדיו משתעל מאחוריו. אתה מחליט לא לשאול על השער.')]}),
          o('visit', t('Agree a future visit without promising a ticket', 'לסכם ביקור עתידי בלי להבטיח כרטיס'), s('dad', 'When we know the date and the cost, we make a plan.', 'כשנדע תאריך ועלות נעשה תוכנית.'), [flag('life:dad:contact', 'visit')], {soloReply: [s(null, 'He says: when we know the date and the cost. It is the most Dad sentence in the world.', 'הוא אומר: כשנדע תאריך ועלות. זה המשפט הכי אבא בעולם.')]}),
          o('photo', t('Send a photograph and a proper letter', 'לשלוח תמונה ומכתב אמיתי'), s('dad', 'I put it on the fridge. The magnet is stronger than your handwriting.', 'שמתי על המקרר. המגנט חזק יותר מכתב היד שלך.'), [flag('life:dad:contact', 'letter'), heart(1)], {soloReply: [s(null, 'A week later a photograph of your letter arrives, on a fridge, held by a magnet shaped like the badge.', 'כעבור שבוע מגיעה תמונה של המכתב שלך, על מקרר, מוחזק במגנט בצורת הסמל.')]}),
        ],
      }),
    ],
  }),

  chapter({
    id: 'c7a-meeting', age: 35, act: 3, title: t('The folding table', 'השולחן המתקפל'),
    intro: t('A supporters’ project needs hands, not another speech. Three people bring three different problems.', 'פרויקט אוהדים צריך ידיים, לא עוד נאום. שלושה אנשים מביאים שלוש בעיות שונות.'),
    keep: {id: 'meeting-page', name: t('A page with crossed-out promises', 'דף עם הבטחות מחוקות'), note: t('The crossed-out line was replaced with something we could do.', 'השורה שנמחקה הוחלפה במשהו שיכולנו לבצע.')},
    scenes: [
      sc({
        id: 'S37', room: 'workshop', who: 'elder', hub: 'meeting', after: [], east: 'workshop', spot: 'banner',
        title: t('What is missing?', 'מה חסר?'),
        lines: [
          s('elder', 'People, records, or materials. Choose one thing you can finish.', 'אנשים, מסמכים או חומרים. תבחר דבר אחד שאתה יכול לסיים.'),
          s(null, 'A folding table, three chairs that do not match, and a banner folded so that only half of the name shows.', 'שולחן מתקפל, שלושה כיסאות שלא תואמים, ודגל מקופל כך שרק חצי מהשם נראה.'),
        ],
        callbacks: [
          {when: is('life:march:song', 'lead'), lines: [s('elder', 'I heard who started the song at the gate. Now start something that has a rota.', 'שמעתי מי התחיל את השיר בשער. עכשיו תתחיל משהו שיש לו סידור עבודה.')]},
          {when: is('life:march:pace', 'slow'), lines: [s('elder', 'You walked with me when you could have run. I have never forgotten who walks slowly.', 'הלכת איתי כשיכולת לרוץ. אף פעם לא שכחתי מי הולך לאט.')]},
        ],
        task: t('Take responsibility for one task', 'לקחת אחריות על משימה אחת'),
        action: [s(null, 'You write your name beside one task and ask who must agree before it starts.', 'אתה רושם שם ליד משימה אחת ושואל מי צריך להסכים לפני שמתחילים.')],
        options: [
          o('people', t('Organise volunteers and ask permission', 'לארגן מתנדבים ולבקש הסכמה'), s('elder', 'Names, times, consent. A crowd is not a rota.', 'שמות, שעות, הסכמה. קהל הוא לא סידור עבודה.'), [flag('life:project:role', 'people'), energy(-10)]),
          o('archive', t('Organise records and their sources', 'לסדר מסמכים ואת המקורות שלהם'), s('elder', 'Keep the source with the claim. Leave the date blank if we cannot verify it.', 'תשמור את המקור ליד הטענה. תשאיר תאריך ריק אם אי אפשר לאמת אותו.'), [flag('life:project:role', 'archive'), energy(-10)]),
          o('materials', t('List materials and a realistic budget', 'לרשום חומרים ותקציב מציאותי'), s('elder', 'Measure before ordering. Especially when you are spending somebody else’s money.', 'תמדוד לפני שמזמינים. במיוחד כשהכסף של מישהו אחר.'), [flag('life:project:role', 'materials')]),
        ],
      }),
      sc({
        id: 'S38', room: 'street', who: 'mate', hub: 'meeting', after: [], slot: 'wall', game: 'count', spot: 'window',
        title: t('The tempting shortcut', 'קיצור הדרך המפתה'),
        lines: [
          s('mate', 'We could put a convincing number on this and call it finished.', 'אפשר לכתוב פה מספר משכנע ולהגיד שסיימנו.'),
          s(null, 'He says it quietly, the way you say a thing you know you should not be saying.', 'הוא אומר את זה בשקט, כמו שאומרים דבר שיודעים שאסור להגיד.'),
        ],
        callbacks: [{when: is('life:work:evening', 'ground'), lines: [s('mate', 'You and I stood near this ground on a sawdust evening once. I trusted you then. Do not make me regret it.', 'אתה ואני עמדנו ליד המגרש הזה בערב של נסורת. סמכתי עליך אז. אל תגרום לי לצער.')]}],
        task: t('Check the record before closing it', 'לבדוק את הרשומה לפני שסוגרים'),
        action: [s(null, 'You compare the list, the evidence and the actual resources. The gap becomes visible.', 'אתה משווה את הרשימה, האסמכתאות והמשאבים שיש באמת. הפער נעשה גלוי.')],
        options: [
          o('check', t('Verify the missing detail', 'לאמת את הפרט החסר'), s('mate', 'This one has evidence. The other one stays pending.', 'לזה יש אסמכתא. השני נשאר בהמתנה.'), [flag('life:project:method', 'verified'), energy(-15)]),
          o('reduce', t('Reduce the scope to what can be done', 'להקטין את ההיקף למה שאפשר לבצע'), s('mate', 'A smaller thing completed. I can work with that.', 'דבר קטן יותר שהושלם. עם זה אני יכול לעבוד.'), [flag('life:project:method', 'scoped')]),
          o('pending', t('Mark the gap honestly and ask for help', 'לסמן את החסר בכנות ולבקש עזרה'), s('mate', 'Now the next person knows what to look for.', 'עכשיו האדם הבא יודע מה לחפש.'), [flag('life:project:method', 'pending'), standing(1)]),
        ],
      }),
      sc({
        id: 'S39', room: 'room', who: 'friend', after: ['S37', 'S38'], spot: 'photos',
        title: t('A promise with an owner', 'הבטחה עם אחראי'),
        lines: [
          s('friend', 'Did the meeting produce work or only more meetings?', 'הפגישה יצרה עבודה או רק עוד פגישות?'),
        ],
        callbacks: [
          {when: is('life:project:method', 'verified'), lines: [s('friend', 'You came home smelling of ink and not of excitement. I read that as a good sign.', 'חזרת הביתה מריח כמו דיו ולא כמו התרגשות. אני קורא את זה כסימן טוב.')]},
          {when: {flag: 'life:friend:return'}, lines: [s('friend', 'Someone told me you kept a seat open for somebody who had stopped coming. That is the same skill, you know.', 'מישהו סיפר לי ששמרת מקום למי שהפסיק לבוא. זה אותו כישרון, אתה יודע.')]},
        ],
        task: t('Deliver the small completed part', 'למסור את החלק הקטן שהושלם'),
        action: [s(null, 'You deliver the list with its limits attached. It is usable because somebody can understand it.', 'אתה מוסר את הרשימה יחד עם המגבלות שלה. אפשר להשתמש בה כי מישהו מסוגל להבין אותה.')],
        options: [
          o('continue', t('Keep one regular task', 'להמשיך במשימה קבועה אחת'), s('friend', 'Then leave yourself time to remain a person too.', 'אז תשאיר לעצמך זמן להישאר גם בן אדם.'), [flag('life:project:future', 'regular'), heart(3), energy(-10)]),
          o('handover', t('Hand it over with clear instructions', 'להעביר הלאה עם הוראות ברורות'), s('elder', 'I know where the evidence is. That is a proper handover.', 'אני יודע איפה האסמכתאות. זו העברה כמו שצריך.'), [flag('life:project:future', 'handed'), standing(2)]),
          o('pause', t('Finish this part and step back', 'לסיים את החלק הזה ולקחת צעד אחורה'), s(null, 'The task is done. You do not need to become the whole organisation.', 'המשימה הסתיימה. אתה לא צריך להפוך לכל הארגון.'), [flag('life:project:future', 'paused'), energy(10)]),
          o('paid', t('Complete agreed paid setup work', 'לבצע עבודת הקמה בתשלום שסוכם'), s('mate', 'The shelves are installed. Here is the agreed pay, from the workshop, not the supporters’ budget.', 'המדפים הורכבו. זה השכר שסוכם, מהסדנה ולא מתקציב האוהדים.'), [coins(24), flag('life:project:future', 'paid'), energy(-15)], {when: is('life:project:role', 'materials')}),
        ],
      }),
    ],
  }),

  chapter({
    id: 'c7b-same-table', age: 37, act: 3, title: t('The same table', 'אותו שולחן'),
    intro: t('The old group meets again. Someone brings the same joke. Someone remembers the agreement you hoped they had forgotten.', 'החבורה נפגשת שוב. מישהו מביא אותה בדיחה. מישהו זוכר את הסיכום שקיווית ששכחו.'),
    keep: {id: 'reunion-receipt', name: t('A receipt nobody needs to keep', 'קבלה שכבר לא חייבים לשמור'), note: t('Settling a debt is different from winning an argument.', 'לסגור חוב זה שונה מלנצח בוויכוח.')},
    scenes: [
      sc({
        id: 'S40', room: 'room', who: 'friend', after: [], spot: 'table',
        title: t('What came back with you?', 'מה חזר איתך?'),
        lines: [
          s('friend', 'Sit down. Tell us one thing that is not your team’s latest result.', 'שב. ספר דבר אחד שהוא לא התוצאה האחרונה של הקבוצה שלך.'),
        ],
        callbacks: [
          {when: {flag: 'life:lent:ticket'}, lines: [s('friend', 'And before anybody says anything: I have not forgotten the twelve you lent me for a ticket. I am still working up to a speech.', 'ולפני שמישהו אומר משהו: לא שכחתי את השתים עשרה שהלוית לי לכרטיס. אני עדיין מתכונן לנאום.')]},
          {when: is('life:project:future', 'regular'), lines: [s('friend', 'I hear you still carry a folding table. Some of us only carry opinions.', 'שמעתי שאתה עדיין סוחב שולחן מתקפל. חלק מאיתנו סוחבים רק דעות.')]},
        ],
        task: t('Name the unfinished thing', 'לתת שם לדבר שלא הסתיים'),
        action: [s(null, 'You put the old note on the table before anybody has to ask.', 'אתה מניח את הפתק הישן על השולחן לפני שמישהו צריך לבקש.')],
        options: [
          o('ride', t('Admit the petrol debt from the last bus', 'להודות בחוב הדלק מהאוטובוס האחרון'), s('friend', 'I remember the lift. I would rather have the friendship than interest.', 'אני זוכר את הטרמפ. אני מעדיף חברות על ריבית.'), [flag('life:repair:target', 'ride')], {when: is('life:promise:ride', 'open')}),
          o('shift', t('Admit the shift you still owe', 'להודות במשמרת שעדיין חייבים'), s('mate', 'I am here. Talk to me, not about me.', 'אני פה. תדבר איתי, לא עליי.'), [flag('life:repair:target', 'shift')], {when: {any: [is('life:promise:shift', 'open'), is('life:promise:shift', 'broken')]}}),
          o('home', t('Admit the evening you did not keep', 'להודות בערב שלא קיימת'), s('friend', 'We can repair something. We cannot go back and pretend you arrived.', 'אפשר לתקן משהו. אי אפשר לחזור ולהעמיד פנים שהגעת.'), [flag('life:repair:target', 'home')], {when: {any: [is('life:promise:home', 'open'), is('life:promise:home', 'broken')]}}),
          o('lent', t('Ask, gently, about the twelve you lent', 'לשאול, בעדינות, על השתים עשרה שהלוית'), s('friend', 'I have been rehearsing this for years. I will pay it back in a pint and a story.', 'אני מתאמן על זה שנים. אחזיר בכוסית וסיפור.'), [flag('life:repair:target', 'lent')], {when: {flag: 'life:lent:ticket'}}),
          o('new', t('Make a small new agreement', 'לסכם הסכם קטן חדש'), s('friend', 'A walk next week. No heroic promises.', 'הליכה בשבוע הבא. בלי הבטחות גבורה.'), [flag('life:repair:target', 'new')]),
        ],
      }),
      sc({
        id: 'S41', room: 'street', who: 'friend', slot: 'wall', game: 'carry', spot: 'bin',
        title: t('The following week', 'בשבוע שאחרי'),
        lines: [
          s(null, 'The following week arrives. This is where an apology either becomes an action or stays a sentence.', 'השבוע הבא מגיע. כאן התנצלות הופכת למשהו שעושים או נשארת משפט.'),
        ],
        task: t('Show up for the agreed repair', 'להגיע לתיקון שסוכם'),
        action: [s(null, 'The agreed day arrives. The next action will determine whether this repair happened.', 'היום שסוכם מגיע. הפעולה הבאה תקבע אם התיקון הזה בוצע.')],
        reward: {good: [bond('friend', 1)]},
        options: [
          o('ride', t('Do the errand that settles the ride', 'לבצע את הסידור שסוגר את הטרמפ'), s('friend', 'Done. Keep the note if you like. You no longer owe the lift.', 'סיימנו. תשמור את הפתק אם תרצה. את הטרמפ אתה כבר לא חייב.'), [flag('life:promise:ride', 'repaired'), flag('life:repair:done', 'ride'), bond('friend', 4), energy(-15)], {when: is('life:repair:target', 'ride')}),
          o('shift', t('Cover the agreed work and get paid', 'לכסות את העבודה שסוכמה ולקבל שכר'), s('mate', 'This shift happened. That is what I needed.', 'המשמרת הזו התקיימה. זה מה שהייתי צריך.'), [flag('life:promise:shift', 'repaired'), flag('life:repair:done', 'shift'), coins(24), bond('mate', 4), energy(-20)], {when: is('life:repair:target', 'shift')}),
          o('home', t('Keep the newly agreed evening', 'לקיים את הערב החדש שסוכם'), s('friend', 'You put the phone away. Now you are here.', 'הנחת את הטלפון. עכשיו אתה פה.'), [flag('life:promise:home', 'repaired'), flag('life:repair:done', 'home'), bond('friend', 4)], {when: is('life:repair:target', 'home')}),
          o('lent', t('Take the pint and the story', 'לקבל את הכוסית ואת הסיפור'), s('friend', 'It is the story about the ticket. You know how it ends. You were there.', 'זה הסיפור על הכרטיס. אתה יודע איך הוא נגמר. היית שם.'), [flag('life:lent:ticket', 'settled'), flag('life:repair:done', 'lent'), bond('friend', 5), heart(2)], {when: is('life:repair:target', 'lent')}),
          o('walk', t('Take the walk you agreed on', 'לצאת להליכה שסיכמתם'), s('friend', 'A whole street without checking a score. We should put up a plaque.', 'רחוב שלם בלי לבדוק תוצאה. צריך לשים שלט.'), [flag('life:repair:done', 'new'), energy(-5)], {when: is('life:repair:target', 'new')}),
          o('fail', t('Fail to keep this agreement too', 'לא לקיים גם את ההסכם הזה'), s('friend', 'Then I stop planning around your promises for now.', 'אז כרגע אני מפסיק לתכנן לפי ההבטחות שלך.'), [flag('life:repair:done', 'failed'), bond('friend', -3)]),
        ],
      }),
      sc({
        id: 'S42', room: 'kitchen', who: 'dad', night: true, spot: 'table',
        title: t('No grand speech', 'בלי נאום גדול'),
        lines: [
          s('dad', 'You came back with a different face. What did you actually do?', 'חזרת עם פנים אחרות. מה עשית בפועל?'),
        ],
        callbacks: [
          {group: 'done', when: is('life:repair:done', 'failed'), lines: [s('dad', 'You do not have to tell me it went well. The face tells me what it needs to.', 'אתה לא חייב להגיד שזה הלך טוב. הפנים אומרות מה שהן צריכות.')]},
          {group: 'done', when: {any: [is('life:repair:done', 'ride'), is('life:repair:done', 'shift'), is('life:repair:done', 'home'), is('life:repair:done', 'lent')]}, lines: [s('dad', 'You settled something. It is on you like flour.', 'סגרת משהו. זה עליך כמו קמח.')]},
        ],
        task: t('Put the receipt in the box', 'להניח את הקבלה בקופסה'),
        action: [s(null, 'You write what happened, rather than what you meant to do.', 'אתה כותב מה קרה, ולא מה התכוונת לעשות.')],
        options: [
          o('plain', t('Tell him plainly what happened', 'לספר לו בפשטות מה קרה'), s('dad', 'That is a story I can understand. Even if it is unfinished.', 'זה סיפור שאני מבין. גם אם הוא עוד לא גמור.'), [flag('life:repair:account', 'plain'), bond('dad', 1)]),
          o('ask', t('Ask about one of his unfinished stories', 'לשאול על סיפור שלו שלא הסתיים'), s('dad', 'There is one. Put the kettle on before I start.', 'יש אחד. תפעיל קומקום לפני שאני מתחיל.'), [flag('life:repair:account', 'asked'), bond('dad', 3), heart(1)]),
          o('private', t('Keep this account to yourself', 'לשמור את הסיפור הזה לעצמך'), s(null, 'The receipt stays honest even without an audience.', 'הקבלה נשארת כנה גם בלי קהל.'), [flag('life:repair:account', 'private')]),
        ],
      }),
    ],
  }),

  chapter({
    id: 'c8-seat', age: 40, act: 3, title: t('A first time for somebody else', 'פעם ראשונה של מישהו אחר'),
    intro: t('Years have passed. There is a first visit to the ground, and it is not yours.', 'עברו שנים. יש ביקור ראשון במגרש, והוא לא שלך.'),
    keep: {id: 'new-ticket', name: t('A ticket with a different name', 'כרטיס עם שם אחר'), note: t('An invitation is not an inheritance obligation.', 'הזמנה היא לא חובת ירושה.')},
    scenes: [
      sc({
        id: 'S43', room: 'kitchen', who: 'dad', after: [], spot: 'table',
        title: t('Who is invited?', 'את מי מזמינים?'),
        lines: [
          s('dad', 'Are you inviting somebody, or recruiting them? There is a difference.', 'אתה מזמין מישהו או מגייס אותו? יש הבדל.'),
        ],
        callbacks: [
          {when: is('life:family:intent', 'parent'), lines: [s('dad', 'You said once, with a calendar open, that you would think about it. Think out loud now.', 'אמרת פעם, עם לוח שנה פתוח, שתחשוב על זה. תחשוב בקול עכשיו.')]},
          {when: is('life:first:question', 'asked'), lines: [s('dad', 'When you were six you asked what makes them ours. Can you answer a six-year-old yet?', 'כשהיית בן שש שאלת מה הופך אותם לשלנו. אתה יכול לענות היום לילד בן שש?')]},
        ],
        task: t('Ask the new person what they want', 'לשאול את האדם החדש מה הוא רוצה'),
        action: [s(null, 'You explain the noise, the walk and the option to leave. Then you listen to the answer.', 'אתה מסביר על הרעש, ההליכה והאפשרות לצאת. ואז מקשיב לתשובה.')],
        options: [
          o('child', t('Bring your child, who wants to try', 'לבוא עם הילד שלך, שרוצה לנסות'), s('child', 'Can we go outside if it is too loud?', 'אפשר לצאת החוצה אם יהיה רועש מדי?'), [flag('life:family', 'child')], {when: is('life:family:intent', 'parent')}),
          o('newfan', t('Invite a friend trying football for the first time', 'להזמין חבר שמנסה כדורגל בפעם הראשונה'), s('friend', 'I want to try it. I reserve the right to ask silly questions.', 'אני רוצה לנסות. שומר לעצמי זכות לשאלות טיפשיות.'), [flag('life:family', 'newfan')]),
          o('none', t('Respect the refusal and go without a newcomer', 'לכבד סירוב וללכת בלי מצטרף חדש'), s('dad', 'A no is an answer too. The seat can wait.', 'גם לא זו תשובה. הכיסא יכול לחכות.'), [flag('life:family', 'none')]),
        ],
      }),
      sc({
        id: 'S44', room: 'tunnel', who: 'steward', cut: true, sound: 'murmur', spot: 'sign',
        title: t('The right to stop', 'הזכות לעצור'),
        lines: [
          s('steward', 'Nobody has to prove anything at this gate. Here is the way out if you need it.', 'אף אחד לא צריך להוכיח משהו בשער הזה. הנה הדרך החוצה אם צריך.'),
        ],
        callbacks: [
          {when: {any: [{wears: 'scarf'}, {wears: 'both'}]}, lines: [s('steward', 'Nice scarf. The old ones always look like a small animal that has decided to stay.', 'צעיף יפה. הישנים תמיד נראים כמו חיה קטנה שהחליטה להישאר.')]},
        ],
        task: t('Check the exits and set the pace', 'לבדוק יציאות ולקבוע קצב'),
        action: [s(null, 'You find the quieter edge of the walkway before entering.', 'אתה מוצא את הצד השקט יותר של המעבר לפני הכניסה.')],
        options: [
          o('slow', t('Take the walk slowly', 'לעשות את הדרך לאט'), s(null, 'The first visit is allowed to take longer than yours.', 'לביקור הראשון מותר לקחת יותר זמן משלך.'), [flag('life:newcomer:pace', 'slow'), energy(-5)]),
          o('explain', t('Explain one thing and let the rest be new', 'להסביר דבר אחד ולתת לשאר להיות חדש'), s(null, 'You name the pitch. The person beside you finds the sky without help.', 'אתה נותן שם לדשא. האדם שלצידך מוצא את השמיים בלי עזרה.'), [flag('life:newcomer:pace', 'explain'), heart(3)], {when: newcomer}),
          o('outside', t('Stay outside and decide whether to enter', 'להישאר בחוץ ולהחליט אם להיכנס'), s(null, 'A first visit may be a look from the gate. Nobody takes the ticket away.', 'ביקור ראשון יכול להיות מבט מהשער. אף אחד לא לוקח את הכרטיס.'), [flag('life:newcomer:pace', 'outside')]),
        ],
      }),
      sc({
        id: 'S66', room: 'terrace', who: 'child', after: ['S44'], cut: true, presence: asChild, sound: 'roar',
        locations: [{room: 'terrace', when: {none: [is('life:newcomer:pace', 'outside')]}}, {room: 'gate', when: is('life:newcomer:pace', 'outside')}],
        solo: [s(null, 'The whistle goes for half-time. The noise lowers, the tea comes round, and for a minute you are the only one who knows what you want from the second half.', 'השריקה לסיום המחצית נשמעת. הרעש יורד, התה מגיע, ולרגע אתה היחיד שיודע מה הוא רוצה מהמחצית השנייה.')],
        title: t('Half-time', 'מחצית'),
        lines: [
          s(null, 'The whistle goes. The noise drops, and in the quiet you feel a hand take hold of your sleeve.', 'השריקה נשמעת. הרעש יורד, ובשקט אתה מרגיש יד אוחזת בשרוול שלך.'),
          s('child', 'I want to go home now. Is that all right? Is it rude?', 'אני רוצה לחזור הביתה עכשיו. זה בסדר? זה גס רוח?'),
        ],
        callbacks: [
          {when: is('life:newcomer:pace', 'slow'), lines: [s('child', 'You let me go slowly on the way in. So I think I can say it.', 'נתת לי ללכת לאט בדרך פנימה. אז אני חושב שאני יכול להגיד את זה.')]},
          {when: is('life:newcomer:pace', 'explain'), lines: [s('child', 'You told me the name of the green. I would like to hear more names. Not today.', 'אמרת לי את השם של הירוק. אני רוצה לשמוע עוד שמות. לא היום.')]},
        ],
        task: t('Decide what the second half is for', 'להחליט למה המחצית השנייה'),
        action: [s(null, 'You look at the pitch, then at the person beside you, and say the answer aloud.', 'אתה מסתכל על המגרש, אחר כך על האדם שלצידך, ואומר את התשובה בקול.')],
        options: [
          o('stay', t('Stay for the second half, and keep the offer to leave open', 'להישאר למחצית השנייה, ולהשאיר את ההצעה לצאת פתוחה'), s('child', 'Okay. But tell me when it is a good time to ask again.', 'בסדר. אבל תגיד לי מתי זה זמן טוב לשאול שוב.'), [flag('life:halftime', 'stayed'), heart(5), bond('child', -2), energy(-10)], {soloReply: [s(null, 'You stay. Nobody asks you to. It is the ordinary kind of loyalty, the one that costs only the second half of the tea.', 'אתה נשאר. אף אחד לא מבקש. זו הנאמנות הרגילה, זו שעולה רק את החצי השני של התה.')]}),
          o('leave', t('Leave now. The second half will happen without you', 'לצאת עכשיו. המחצית השנייה תתקיים בלעדיך'), s('child', 'Thank you. I will remember you asked me, not told me.', 'תודה. אזכור שאתה שאלת, לא אמרת.'), [flag('life:halftime', 'left'), bond('child', 6), heart(1)], {soloReply: [s(null, 'You go. The noise follows you into the tunnel like a friendly dog, and then you are out in the dusk with nothing to prove.', 'אתה יוצא. הרעש הולך אחריך למנהרה כמו כלב ידידותי, ואז אתה בחוץ בדמדומים בלי שום דבר להוכיח.')]}),
          o('split', t('Ask your friend to take them out while you stay for the end', 'לבקש מהחבר להוציא אותם בזמן שאתה נשאר עד הסוף'), s('child', 'Can he buy me a roll? Then yes.', 'הוא יכול לקנות לי לחמנייה? אז כן.'), [flag('life:halftime', 'split'), heart(3), bond('child', 3), bond('friend', 3), energy(-10)], {when: {bond: ['friend', 55]}, soloReply: [s('friend', 'I will take them. I am a professional at leaving early. Stay, and tell me everything.', 'אני אקח אותם. אני מקצוען ביציאה מוקדמת. תישאר ותספר לי הכול.')]}),
        ],
      }),
      sc({
        id: 'S45', room: 'room', who: 'dad', after: ['S66'], cut: true, night: true, spot: 'photos',
        title: t('Who owns the memory?', 'של מי הזיכרון?'),
        lines: [
          s('dad', 'Do not tell them what the best part was. Ask.', 'אל תגיד להם מה היה החלק הכי טוב. תשאל.'),
        ],
        callbacks: [
          {group: 'half', when: is('life:halftime', 'left'), lines: [s('dad', 'You left at half-time? Good man. I stayed to the end once with a boy who wanted to go. We did not speak for a year.', 'יצאת במחצית? אדם טוב. אני נשארתי פעם עד הסוף עם ילד שרצה ללכת. לא דיברנו שנה.')]},
          {group: 'half', when: is('life:halftime', 'stayed'), lines: [s('dad', 'Second half and all? You are a stronger man than I was, or a quieter one.', 'גם מחצית שנייה? אתה אדם חזק ממני, או שקט ממני.')]},
        ],
        task: t('Save the answer, including a no', 'לשמור את התשובה, כולל לא'),
        action: [s(null, 'You leave room on the ticket for another handwriting. Or leave it blank.', 'אתה משאיר מקום על הכרטיס לכתב יד אחר. או משאיר אותו ריק.')],
        options: [
          o('ask', t('Ask what they would choose next time', 'לשאול מה ירצו בפעם הבאה'), s(null, 'The answer belongs to the invited person. It may include coming back, or not.', 'התשובה שייכת למי שהוזמן. היא יכולה לכלול לחזור או לא.'), [flag('life:newcomer:agency', 'asked')], {when: newcomer}),
          o('draw', t('Invite a drawing instead of a verdict', 'להציע ציור במקום פסק דין'), s(null, 'The drawing includes a huge sandwich. You cannot argue with the evidence.', 'בציור יש סנדוויץ׳ ענקי. אי אפשר להתווכח עם האסמכתא.'), [flag('life:newcomer:agency', 'draw'), heart(2)], {when: newcomer}),
          o('wait', t('Let the day settle without another question', 'לתת ליום לשקוע בלי עוד שאלה'), s(null, 'The ticket goes into the box without becoming a contract.', 'הכרטיס נכנס לקופסה בלי להפוך לחוזה.'), [flag('life:newcomer:agency', 'wait')]),
        ],
      }),
    ],
  }),

  chapter({
    id: 'c8a-plan', age: 45, act: 3, title: t('This time, my pocket', 'הפעם, בכיס שלי'),
    intro: t('Once Dad held the tickets. This time they are in your pocket. Before a journey becomes a memory, it needs a date, money, and willing people.', 'פעם אבא החזיק את הכרטיסים. הפעם הם בכיס שלך. לפני שנסיעה הופכת לזיכרון צריך תאריך, כסף ואנשים שרוצים לבוא.'),
    keep: {id: 'trip-plan', name: t('A plan with margins', 'תוכנית עם שוליים'), note: t('There was room to change our minds.', 'היה מקום לשנות את דעתנו.')},
    scenes: [
      sc({
        id: 'S46', room: 'kitchen', who: 'dad', hub: 'plan', after: [], spot: 'table',
        title: t('Ask before buying', 'לשאול לפני שקונים'),
        lines: [
          s('dad', 'You have a plan already? Tell me about the walking before you tell me about the seats.', 'כבר יש לך תוכנית? ספר על ההליכה לפני שאתה מספר על המושבים.'),
        ],
        callbacks: [{when: is('life:dad:contact', 'regular'), lines: [s('dad', 'You rang every week and never once asked me the score. I counted. You owe me one question about the score.', 'התקשרת כל שבוע ואף פעם לא שאלת אותי מה התוצאה. ספרתי. אתה חייב לי שאלה אחת על התוצאה.')]}],
        task: t('Agree who is coming', 'לסכם מי בא'),
        action: [s(null, 'You ask each person separately. An invitation does not purchase their agreement.', 'אתה שואל כל אדם בנפרד. הזמנה אינה קונה את ההסכמה שלו.')],
        options: [
          o('pair', t('Go with Dad; he agrees', 'לצאת עם אבא; הוא מסכים'), s('dad', 'Yes. Just leave time to sit down before we arrive.', 'כן. רק תשאיר זמן לשבת לפני שנגיע.'), [flag('life:trip:party', 'dad'), bond('dad', 3)]),
          o('three', t('Invite Dad and the willing newcomer', 'להזמין את אבא ואת המצטרף שרוצה'), s('dad', 'Three tickets, then. Ask them about the pace too.', 'אז שלושה כרטיסים. תשאל גם אותם על הקצב.'), [flag('life:trip:party', 'three'), bond('dad', 2)], {when: newcomer}),
          o('solo', t('Respect Dad’s wish to stay home', 'לכבד את הרצון של אבא להישאר בבית'), s('dad', 'Bring me a story afterwards. That is the trip I want this time.', 'תביא לי סיפור אחר כך. זו הנסיעה שאני רוצה הפעם.'), [flag('life:trip:party', 'solo'), bond('dad', 1)]),
        ],
      }),
      sc({
        id: 'S47', room: 'bedroom', who: 'mum', hub: 'plan', after: [], game: 'count', spot: 'desk', verb: 'take',
        title: t('A real budget', 'תקציב אמיתי'),
        lines: [
          s('mum', 'Thinking is free. Count it.', 'לחשוב זה בחינם. תספור.'),
          s(null, 'It is the same sentence she said over a tin of fourteen coins, thirty-odd years ago. She says it exactly the same.', 'זה אותו משפט שהיא אמרה מעל קופסה של ארבע עשרה מטבעות, לפני שלושים ומשהו שנים. היא אומרת אותו בדיוק אותו דבר.'),
        ],
        callbacks: [
          {group: 'shirt', when: is('life:shirt:origin', 'earned'), lines: [s('mum', 'You earned that first shirt from crates. You count better than your father.', 'הרווחת את החולצה הראשונה מארגזים. אתה סופר טוב יותר מאבא שלך.')]},
          {group: 'shirt', when: is('life:shirt:origin', 'gift'), lines: [s('mum', 'I helped with the first shirt, quietly. I would like a receipt this time.', 'עזרתי עם החולצה הראשונה, בשקט. הפעם הייתי רוצה קבלה.')]},
        ],
        task: t('Count the money and book the feasible plan', 'לספור כסף ולסגור תוכנית שאפשר לממן'),
        action: [s(null, 'You put the money beside the route. No option can spend money you do not have.', 'אתה מניח כסף ליד המסלול. אי אפשר לבחור תוכנית שמוציאה כסף שאין לך.')],
        options: [
          o('far', t('Fund a longer trip (40)', 'לממן נסיעה ארוכה (40)'), s('mum', 'The longer route is paid for. Pack the good shoes.', 'המסלול הארוך מומן. תארוז את הנעליים הטובות.'), [coins(-40), flag('life:trip:budget', 'paid'), flag('life:trip:route', 'far'), flag('life:trip:free', false), heart(3)], {when: {min: ['coins', 40]}}),
          o('local', t('Fund a local outing (20)', 'לממן יציאה מקומית (20)'), s('mum', 'Near is fine. I remember near very well.', 'קרוב זה טוב. אני זוכרת קרוב היטב.'), [coins(-20), flag('life:trip:budget', 'paid'), flag('life:trip:route', 'local'), flag('life:trip:free', false)], {when: {min: ['coins', 20]}}),
          o('shared', t('Choose a free walk by the ground and a home evening', 'לבחור הליכה חינמית ליד המגרש וערב בבית'), s('mum', 'You have not bought a worse memory. You have only kept the money.', 'לא קנית זיכרון פחות טוב. רק שמרת את הכסף.'), [flag('life:trip:budget', 'free'), flag('life:trip:route', 'walk'), flag('life:trip:free', true)]),
        ],
      }),
      sc({
        id: 'S48', room: 'street', who: 'elder', after: ['S46', 'S47'], game: 'carry', spot: 'crates',
        title: t('The route matters', 'גם הדרך חשובה'),
        lines: [
          s('elder', 'The shortest route has steps. The slower one has a bench. Ask who needs what.', 'בדרך הקצרה יש מדרגות. באיטית יש ספסל. תשאל מי צריך מה.'),
        ],
        task: t('Check the route and pack the bag', 'לבדוק את הדרך ולארוז'),
        action: [s(null, 'You check the bag, the agreed pace and the backup plan.', 'אתה בודק את התיק, הקצב שסוכם ותוכנית הגיבוי.')],
        options: [
          o('slow', t('Choose the slower route with breaks', 'לבחור דרך איטית עם הפסקות'), s('dad', 'Good. Now I do not have to pretend your pace is mine.', 'טוב. עכשיו אני לא צריך להעמיד פנים שהקצב שלך הוא שלי.'), [flag('life:trip:pace', 'slow'), flag('life:trip:prepared'), flag('life:trip:at-home', false), energy(-5)]),
          o('direct', t('Use the direct route, with a stop available', 'לבחור בדרך הישירה עם אפשרות לעצירה'), s(null, 'A stop remains part of the plan, even if it is not needed.', 'עצירה נשארת חלק מהתוכנית גם אם לא צריך אותה.'), [flag('life:trip:pace', 'direct'), flag('life:trip:prepared'), flag('life:trip:at-home', false), energy(-15)]),
          o('home', t('Change the outing to a home evening before leaving', 'לשנות לערב בבית עוד לפני היציאה'), s('mum', 'Then we know what we are doing. No dramatic surprise at a gate.', 'אז אנחנו יודעים מה עושים. בלי הפתעה דרמטית בשער.'), [flag('life:trip:pace', 'home'), flag('life:trip:prepared'), flag('life:trip:at-home')]),
        ],
      }),
    ],
  }),

  chapter({
    id: 'c8b-your-turn', age: 46, act: 3, title: t('Your turn', 'התור שלך'),
    intro: t('The bag is ready. You do not have to prove that your plan was perfect. You have to take care of the people who agreed to it.', 'התיק מוכן. אתה לא צריך להוכיח שהתוכנית מושלמת. אתה צריך לדאוג לאנשים שהסכימו לה.'),
    keep: {id: 'return-ticket', name: t('The ticket in my pocket', 'הכרטיס בכיס שלי'), note: t('The person matters more than completing the route.', 'האדם חשוב יותר מהשלמת המסלול.')},
    scenes: [
      sc({
        id: 'S49', room: 'room', who: 'dad', after: [], presence: {none: [dadStays]}, spot: 'table',
        solo: [s(null, 'Dad’s voice on the phone: where did you put the tickets? He says it twice, as if he had never lent you the tickets in his life.', 'הקול של אבא בטלפון: איפה שמת את הכרטיסים? הוא אומר את זה פעמיים, כאילו מעולם לא החזיק כרטיסים בשבילך.')],
        title: t('At the door', 'ליד הדלת'),
        lines: [
          s('dad', 'Where did you put the tickets?', 'איפה שמת את הכרטיסים?'),
        ],
        callbacks: [
          {when: {flag: 'life:trip:at-home'}, lines: [s(null, 'There is a plan in your hand and it has a home evening in it. Nobody will say this is a lesser plan.', 'יש תוכנית ביד שלך ובה ערב בבית. אף אחד לא יגיד שזו תוכנית פחותה.')]},
        ],
        task: t('Check the agreed plan before the day starts', 'לבדוק את הסיכום לפני שמתחיל היום'),
        action: [s(null, 'You check the names, the bag and the chosen route.', 'אתה בודק שמות, תיק והמסלול שנבחר.')],
        options: [
          o('carry', t('Carry what the others agreed you would carry', 'לסחוב את מה שסיכמתם שתסחב'), s('dad', 'I used to carry the bag too. Apparently it has been gaining weight for forty years.', 'גם אני סחבתי פעם. כנראה התיק עולה במשקל כבר ארבעים שנה.'), [flag('life:trip:care', 'carried'), energy(-10)], {soloReply: [s(null, 'You carry it. Dad says on the phone that it has been gaining weight for forty years. He sounds proud.', 'אתה סוחב. אבא אומר בטלפון שהתיק עולה במשקל כבר ארבעים שנה. הוא נשמע גאה.')]}),
          o('share', t('Divide the bag fairly with consent', 'לחלק את התיק בהסכמה'), s(null, 'Nobody is handed a burden as a test of loyalty.', 'אף אחד לא מקבל משקל כמבחן נאמנות.'), [flag('life:trip:care', 'shared')]),
          o('light', t('Leave unnecessary things at home', 'להשאיר דברים מיותרים בבית'), s('dad', 'Three scarves and a radio. Are we moving in?', 'שלושה צעיפים ורדיו. אנחנו עוברים לגור שם?'), [flag('life:trip:care', 'light'), energy(5)], {soloReply: [s(null, 'You leave two of the three scarves on the hook. Dad would have approved. Dad would also have taken the radio.', 'אתה משאיר שניים משלושת הצעיפים על הקולב. אבא היה מאשר. אבא גם היה לוקח את הרדיו.')]}),
        ],
      }),
      sc({
        id: 'S50', room: 'bus-stop', who: 'elder', east: 'bus-stop', spot: 'sign',
        title: t('The plan meets the day', 'התוכנית פוגשת את היום'),
        lines: [
          s(null, 'The plan meets an actual day. A seat, a pause or a closed entrance matters more than your confidence.', 'התוכנית פוגשת יום אמיתי. כיסא, הפסקה או כניסה סגורה חשובים יותר מהביטחון שלך.'),
        ],
        callbacks: [
          {when: is('life:trip:care', 'carried'), lines: [s(null, 'The strap bites your shoulder. You decide that is the price of the plan, not a verdict on it.', 'הרצועה חותכת את הכתף. אתה מחליט שזה המחיר של התוכנית, לא פסק דין עליה.')]},
        ],
        task: t('Make the adjustment and act on it', 'לבצע את ההתאמה בפועל'),
        action: [s(null, 'You stop before the next part. The people involved are asked, not informed after the decision.', 'אתה עוצר לפני החלק הבא. שואלים את האנשים שההחלטה נוגעת להם, לא מודיעים להם אחרי שהתקבלה.')],
        options: [
          o('pause', t('Take the pause, then continue if everyone agrees', 'לעצור ואז להמשיך אם כולם מסכימים'), s(null, 'The pause becomes part of the day. Nobody calls it a defeat.', 'ההפסקה הופכת לחלק מהיום. אף אחד לא קורא לזה הפסד.'), [flag('life:trip:adjustment', 'pause'), flag('life:trip:returned', false), energy(-5)], {when: {not: 'life:trip:at-home'}}),
          o('accessible', t('Use the checked alternative route', 'להשתמש בדרך החלופית שנבדקה'), s(null, 'You follow the marked route, not a shortcut invented on the spot.', 'אתה משתמש בדרך המסומנת, לא בקיצור דרך שהמצאת במקום.'), [flag('life:trip:adjustment', 'alternative'), flag('life:trip:returned', false)], {when: {not: 'life:trip:at-home'}}),
          o('return', t('Choose to return or remain home together', 'לבחור לחזור או להישאר יחד בבית'), s(null, 'You change the destination and tell everyone. Care is an action too.', 'אתה משנה יעד ומעדכן את כולם. גם דאגה היא מעשה.'), [flag('life:trip:adjustment', 'home'), flag('life:trip:returned')]),
        ],
      }),
      sc({
        id: 'S51', room: 'room', who: 'dad', night: true, final: true, presence: {none: [dadStays]}, spot: 'photos',
        solo: [s(null, 'You tell Dad what you saw. It takes a long time, because he asks about the walking before the match, and you are happy to oblige.', 'אתה מספר לאבא מה ראית. זה לוקח זמן רב, כי הוא שואל על ההליכה לפני המשחק, ואתה שמח לעשות לו את הטובה.')],
        title: t('Afterwards', 'אחר כך'),
        lines: [
          s('dad', 'So. Tell me what you noticed.', 'נו. ספר מה ראית.'),
          s(null, 'The answer belongs to the route you actually completed.', 'התשובה שייכת למסלול שביצעת בפועל.'),
        ],
        callbacks: [
          {when: is('life:newcomer:agency', 'draw'), lines: [s('dad', 'Somebody drew me a sandwich once. It is on the fridge. It looks like the same sandwich as before.', 'מישהו צייר לי סנדוויץ׳ פעם. הוא על המקרר. הוא נראה כמו אותו סנדוויץ׳ מקודם.')]},
        ],
        task: t('Finish the day', 'לסיים את היום'),
        action: [s(null, 'The bag comes down. You write the destination that really happened.', 'התיק יורד מהכתף. אתה כותב את היעד שבאמת היה.')],
        options: [
          o('attended', t('Remember the outing you completed', 'לזכור את היציאה שהשלמת'), s('dad', 'You looked after the day. That is what I remember.', 'דאגת ליום הזה. זה מה שאני זוכר.'), [flag('life:trip:result', 'outing'), heart(4)], {when: {all: [{not: 'life:trip:at-home'}, {not: 'life:trip:free'}, {any: [is('life:trip:adjustment', 'pause'), is('life:trip:adjustment', 'alternative')]}]}, soloReply: [s(null, 'You tell him the day. He says you looked after it. It is the nicest thing he has said on the telephone this decade.', 'אתה מספר לו את היום. הוא אומר שדאגת לו. זה הדבר הכי יפה שהוא אמר בטלפון בעשור הזה.')]}),
          o('walk', t('Remember the walk and the home evening', 'לזכור את ההליכה ואת הערב בבית'), s('dad', 'You do not need a turnstile to have a story.', 'לא צריך קרוסלה כדי שיהיה סיפור.'), [flag('life:trip:result', 'walk'), heart(2)], {when: {all: [{flag: 'life:trip:free'}, {not: 'life:trip:at-home'}, {not: 'life:trip:returned'}]}, soloReply: [s(null, 'It was a walk, and an evening. He says you do not need a turnstile to have a story.', 'זו הייתה הליכה וערב. הוא אומר שלא צריך קרוסלה כדי שיהיה סיפור.')]}),
          o('home', t('Keep the home evening as its own ending', 'לשמור את הערב בבית כסיום בפני עצמו'), s('dad', 'Then that was our day. Put it in the box as it was.', 'אז זה היה היום שלנו. תכניס לקופסה כמו שהוא.'), [flag('life:trip:result', 'home'), heart(2)], {soloReply: [s(null, 'You keep the evening as it was and put it in the box exactly like that.', 'אתה שומר את הערב כמו שהיה ומכניס אותו לקופסה בדיוק כך.')]}),
        ],
      }),
    ],
  }),

  chapter({
    id: 'finale', age: 46, act: 3, title: t('The box stays open', 'הקופסה נשארת פתוחה'),
    intro: t('There are tickets here, and things that never passed through a turnstile. A scarf. A note. A name in someone else’s handwriting.', 'יש כאן כרטיסים ודברים שמעולם לא עברו בקרוסלה. צעיף. פתק. שם בכתב יד של מישהו אחר.'),
    keep: {id: 'box-label', name: t('A blank label', 'תווית ריקה'), note: t('There is space for a life that is not ours.', 'יש מקום לחיים שאינם שלנו.')},
    scenes: [
      sc({
        id: 'S52', room: 'bedroom', who: 'dad', after: [], spot: 'box',
        title: t('Which thing first?', 'מה מוציאים קודם?'),
        lines: [
          s('dad', 'The oldest thing is not always the one you keep reaching for.', 'הדבר הכי ישן הוא לא תמיד הדבר שאליו היד הולכת.'),
        ],
        callbacks: [
          {when: {wears: 'both'}, lines: [s('dad', 'Shirt and scarf both, for the big days. You have never once changed that. Don\'t.', 'חולצה וצעיף שניהם, לימים הגדולים. מעולם לא שינית את זה. אל תשנה.')]},
          {when: is('life:tunnel:way', 'hand'), lines: [s('dad', 'You took my hand in the tunnel once. I never said. I am saying.', 'לקחת לי את היד במנהרה פעם. אף פעם לא אמרתי. אני אומר.')]},
          {when: {flag: 'life:sang'}, lines: [s('dad', 'One line, once, in a stand full of people. I was louder than I admit.', 'שורה אחת, פעם אחת, ביציע מלא אנשים. הייתי רועש יותר ממה שאני מודה.')]},
          {when: is('life:shirt:origin', 'handed'), lines: [s('dad', 'I notice the shirt from my wardrobe is not in the box. You are wearing it, or you are saving it. Both are right.', 'אני שם לב שהחולצה מהארון שלי לא בקופסה. אתה לובש אותה או שאתה שומר אותה. שניהם נכונים.')]},
        ],
        task: t('Take one real keepsake out', 'להוציא מזכרת אחת אמיתית'),
        action: [s(null, 'You take an object from the box, not a summary of your score.', 'אתה מוציא חפץ מהקופסה, לא סיכום של הניקוד שלך.')],
        options: [
          o('scarf', t('Take the first scarf', 'להוציא את הצעיף הראשון'), s('dad', 'You used to wear it like a blanket.', 'פעם לבשת אותו כמו שמיכה.'), [flag('life:legacy:object', 'scarf'), heart(4)]),
          o('debt', t('Take the note about an agreement', 'להוציא את הפתק על ההסכם'), s(null, 'Some lines are settled. Some remain honest reminders.', 'חלק מהשורות סגורות. אחרות נשארות תזכורת כנה.'), [flag('life:legacy:object', 'agreement')]),
          o('trip', t('Take the last day’s ticket or note', 'להוציא את הכרטיס או הפתק מהיום האחרון'), s('dad', 'This time you held the plan.', 'הפעם אתה החזקת את התוכנית.'), [flag('life:legacy:object', 'trip'), heart(3)]),
        ],
      }),
      sc({
        id: 'S53', room: 'room', who: 'friend', night: true, spot: 'photos',
        title: t('The version you tell', 'הגרסה שאתה מספר'),
        lines: [
          s('friend', 'You can tell a story without making yourself the hero of every scene.', 'אפשר לספר סיפור בלי להפוך את עצמך לגיבור בכל סצנה.'),
        ],
        callbacks: [
          {when: is('life:repair:done', 'failed'), lines: [s('friend', 'And you can leave in the part where you did not show up. That one is the good bit.', 'ואפשר להשאיר את החלק שבו לא הגעת. זה החלק הטוב.')]},
          {when: {flag: 'life:lent:ticket'}, lines: [s('friend', 'Also, the twelve. Keep the twelve in. It is the best part of my version.', 'ועוד, השתים עשרה. תשאיר את השתים עשרה. זה החלק הכי טוב בגרסה שלי.')]},
        ],
        task: t('Tell one story with its actual outcome', 'לספר סיפור אחד עם התוצאה האמיתית שלו'),
        action: [s(null, 'You say who helped, what went wrong, and what remained unfinished.', 'אתה מספר מי עזר, מה השתבש ומה נשאר לא גמור.')],
        options: [
          o('thanks', t('Tell it as a thank-you', 'לספר אותו כתודה'), s(null, 'The names become the centre of the story.', 'השמות הופכים למרכז הסיפור.'), [flag('life:legacy:voice', 'thanks'), heart(2)]),
          o('funny', t('Tell the funny part, without erasing the cost', 'לספר את החלק המצחיק בלי למחוק את המחיר'), s('friend', 'Keep the sandwich in the story. Leave me some dignity.', 'תשאיר את הסנדוויץ׳ בסיפור. תשאיר לי קצת כבוד.'), [flag('life:legacy:voice', 'funny'), heart(2)]),
          o('honest', t('Tell the unfinished part honestly', 'לספר בכנות את החלק שלא הסתיים'), s(null, 'Nobody awards a trophy. Somebody understands.', 'אף אחד לא מעניק גביע. מישהו מבין.'), [flag('life:legacy:voice', 'honest')]),
        ],
      }),
      sc({
        id: 'S54', room: 'bedroom', who: 'dad', night: true, final: true, spot: 'box',
        title: t('Leave room', 'להשאיר מקום'),
        lines: [
          s('dad', 'Do not fill the whole box. Whoever comes after you needs somewhere to put their own things.', 'אל תמלא את כל הקופסה. מי שיבוא אחריך צריך מקום לדברים שלו.'),
        ],
        callbacks: [
          {when: is('life:trip:result', 'walk'), group: 'result', lines: [s('dad', 'The walk went in, too. Not every good day has a turnstile.', 'גם ההליכה נכנסה. לא לכל יום טוב יש קרוסלה.')]},
          {when: is('life:trip:result', 'outing'), group: 'result', lines: [s('dad', 'The last outing is in there, with the plan folded small. You held it. Good.', 'היציאה האחרונה שם, עם התוכנית מקופלת קטן. אתה החזקת אותה. יפה.')]},
          {when: is('life:trip:result', 'home'), group: 'result', lines: [s('dad', 'The home evening counts. Put it in as it was, and be done with apologising.', 'גם הערב בבית נחשב. תכניס אותו כמו שהיה, ותפסיק להתנצל.')]},
        ],
        task: t('Choose how the box continues', 'לבחור איך הקופסה ממשיכה'),
        action: [s(null, 'You put a blank label beside the keepsakes. The blank part is deliberate.', 'אתה מניח תווית ריקה ליד המזכרות. החלק הריק מכוון.')],
        options: [
          o('give', t('Offer the box without requiring the same colours', 'להציע את הקופסה בלי לדרוש אותם צבעים'), s(null, 'They may take a story, a scarf, or nothing yet. The invitation remains theirs to answer.', 'אפשר לקחת סיפור, צעיף או בינתיים כלום. ההזמנה נשארת שלהם לענות עליה.'), [flag('life:legacy', 'offered'), heart(3)], {when: newcomer}),
          o('open', t('Keep an open box for future visitors', 'לשמור קופסה פתוחה למי שיבוא'), s(null, 'There is room for somebody you have not met yet.', 'יש מקום למישהו שעוד לא פגשת.'), [flag('life:legacy', 'open'), heart(2)]),
          o('own', t('Keep your box and offer someone a new one', 'לשמור את שלך ולהציע למישהו קופסה חדשה'), s(null, 'Your life does not have to become somebody else’s instructions.', 'החיים שלך לא צריכים להפוך להוראות של מישהו אחר.'), [flag('life:legacy', 'new-box'), heart(2)]),
        ],
      }),
    ],
  }),
]

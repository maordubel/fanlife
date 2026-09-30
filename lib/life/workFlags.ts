/**
 * שני דגלים של עבודה, בקובץ שאינו מייבא דבר (21.9.2026).
 *
 * `gigs.ts` הוא טבלת הג׳ובים ו-`activities.ts` מצביע לתוכה; `gigs.ts` מצטט את השכר של
 * פעילות מתוך `activities.ts`. כדי ששני הקבצים לא יייבאו זה את זה, שני השמות ששניהם
 * צריכים גרים כאן — ובמקום אחד, כי שם של דגל שנכתב פעמיים הוא שני דגלים ביום שאחד משתנה
 * (כלל 59). `gigs.ts` מייצא אותם הלאה עם ההסבר המלא.
 */

/** the day flag a gig raises when it is done today */
export const gigFlagOf = (id: string) => `gig:${id}`

/** the chapter's one paid job has been taken — see `gigs.ts` for why there is one */
export const workDoneFlag = (chapter: string) => `work:paid:${chapter}`

/**
 * הטופס — five questions, two shekels each.
 *
 * A "use server" file may only export async functions, so the two numbers behind the Toto
 * slip live here where the card, the action and the tests can all read them.
 */

/** how many questions one slip holds */
export const TOTO_LENGTH = 5

/** whole shekels for a right answer (Maor, 5.9.2026) */
export const TOTO_PER_ANSWER = 2

/** what the ledger calls this money — content, so it lives out of the app folder */
export const TOTO_WHY_HE = 'טוטו'
export const COIN_WHY_HE = 'עץ או פלי'
export const PENALTY_WHY_HE = 'פנדלים'
export const HOOPS_WHY_HE = 'חיובים'

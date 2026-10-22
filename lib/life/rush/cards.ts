/**
 * LIFE · RUSH — the briefing's picture (designer batch P0-02, 22.10.2026): one printed card per
 * mission, in the style of an old football magazine. Fiction, never an archive photograph: no date,
 * no club. Printed in grey so no card can carry a rival's colour onto a club's page. The card prints
 * its English title into the picture; the title a reader and a screen reader get stays in the DOM.
 * A template with no card shows none.
 */
export const RUSH_CARDS: readonly string[] = ['kickoff-run', 'sneak-in', 'away-day', 'cup-final-trip', 'europe-night', 'title-night', 'where-you-stood', 'new-ground', 'derby-banner-raid', 'tifo-carry']

export const cardFor = (template: string): string | null => RUSH_CARDS.includes(template) ? `/life/rush/cards/${template}.webp` : null

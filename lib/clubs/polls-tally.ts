import {NO_TALLY,type TallyStore} from './polls-votes'
/**
 * The tally this build talks to. There is NO club-wide vote table behind FAN LIFE yet, so this is `NO_TALLY` and the screen
 * says "no count yet" (PO-R07/R08, blocker RUNTIME_UNAVAILABLE for a live tally). When the table exists, the store that
 * implements `TallyStore` (same semantics as `memoryTally`) is returned here — nothing else in the gate changes.
 */
export const clientTally=():TallyStore=>NO_TALLY

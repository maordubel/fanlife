/** LIFE · the WATCH LAYER — match highlights, our films and studio interstitials, from repository records only. */
export * from './types'
export {HIGHLIGHTS, OUR_FILMS, TRANSITION_CLIPS} from './data'
export {HUNT_VERIFIED, HUNT_PENDING} from './hunt'
export {watchFor, watchForNight, watchLibrary, transitionFor, embedUrl, watchUrl, isYoutubeId, inSeason, ALL_WATCH} from './resolve'
export {slateOf, slateDate, type WatchSlate} from './slate'
export {watchWord, WATCH_WORDS, type WatchKey} from './words'

import type {HubClub} from './hub-model'
/** A club is OPEN on the hub when a fan, outside preview, can really enter at least one of its gates. Everything else is "in the workshop". */
export const isOpenClub=(strict:HubClub|undefined):boolean=>!!strict&&Object.values(strict.gates).some(g=>!!g.href)

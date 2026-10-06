import type {ResourceKind} from './contract'
/**
 * Registered parsers: providerId + kind → pure function (snapshot bytes → observations). A parser enters this table
 * only with a stored fixture and a test (spec §5/§7). Until then a fetched page is kept as a snapshot and its job
 * ends as `needs-adapter`, so writing the parser later re-parses from disk without a single new request.
 */
export type Observation={subject:string;field:string;value:unknown;locator:string}
export type Parser=(body:Buffer,ctx:{url:string;subjects:string[]})=>{observations:Observation[];diagnostics:string[]}
export const PARSERS:Record<string,Partial<Record<ResourceKind,Parser>>>={}
export const parserFor=(providerId:string,kind:ResourceKind):Parser|null=>PARSERS[providerId]?.[kind]??null

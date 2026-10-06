/**
 * FAN LIFE research engine — no AI, no LLM, no OCR, no machine translation. Known sources, declared parsers,
 * explicit rules. This file is the contract between profiles, the planner, the fetcher, the worker and the admin.
 * Nothing here approves a fact: research output feeds the existing compiler, which stays the only authority.
 */
export const RESEARCH_SCHEMA=1 as const

/** A trusted source configuration. `familyId` is CURATED (never derived from the hostname): two language sites of
 * one club are one family, and two publishers copying one feed may be one family too. */
export type SourceProfile={
 providerId:string;familyId:string;origin:string;adapterVersion:string
 /** path regexes the fetcher may request on this origin, per resource kind */
 paths:Partial<Record<ResourceKind,string>>
 /** what a parser for this source can produce today — a capability not declared here is never planned */
 capabilities:ResourceKind[]
 rate:{minIntervalMs:number;maxBytes:number;timeoutMs:number}
 scope:string
}
export type ResourceKind='season-results'|'match-detail'|'player-profile'|'honours'|'squad'|'kit-page'
export type ClubProfile={
 schemaVersion:typeof RESEARCH_SCHEMA;clubId:string;sport:'football';contentLocale:string;snapshotAsOf:string
 desiredGates:string[];priorityMatchIds:string[];sources:SourceProfile[];notes?:string
}

export type JobState='planned'|'leased'|'fetched'|'parsed'|'unchanged'|'failed'|'exhausted'|'blocked'|'needs-adapter'
export type ResearchJob={
 id:string;clubId:string;task:'fetch_match_detail'|'fetch_resource';kind:ResourceKind;url:string;providerId:string;adapterVersion:string
 priority:number;requestedFields:string[];subjects:string[]
 state:JobState;attempts:number;nextAttemptAt:string|null;lease:string|null;leaseUntil:string|null
 snapshot:string|null;error:string|null;updatedAt:string
}
export type SnapshotMeta={hash:string;url:string;fetchedAt:string;status:number;contentType:string|null;bytes:number;etag:string|null;lastModified:string|null}

export type GateRequirement={gate:string;engineSupported:boolean;target:number;minimum:number;unit:string}
export type PlanIssue={kind:'lineup_requires_review'|'conflict'|'quarantine'|'detail_source_not_allowed'|'no_adapter';recordId:string;matchId?:string|null;reason?:string}
export type PlanReport={
 schemaVersion:typeof RESEARCH_SCHEMA;clubId:string;sport:'football';snapshotAsOf:string;inputVersion:string;mode:'offline_planning_only'
 stats:Record<string,number|null>;readiness:{gate:string;engineSupported:boolean;approvedCandidateCount:number|null;target:number;minimum:number;status:'needs_approved_data'|'compiler_required'|'engine_pending'}[]
 limits:string[]
}
export type ResearchRun={id:string;clubId:string;createdAt:string;kind:'plan'|'fetch';state:'completed'|'partial'|'failed';inputVersion:string|null;counts:Record<string,number>;issues:number;note:string}

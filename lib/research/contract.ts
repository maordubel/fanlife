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

/* ---------- historical archive collection (WordPress REST + HTML), 6.10.2026 ---------- */
/** How a public archive is read. A READER returns documents; turning a document into history is a PARSER's job,
 * and a parser exists only once it was written against stored fixtures of that site. */
export type ArchiveReader='wordpress-rest'|'html'
/** What a source is good for — fan culture is never a results database, and an article is never a match row. */
export type ArchiveRole='results'|'people'|'club-history'|'fan-culture'|'items'|'mixed'
export type ArchiveSource={
 providerId:string;familyId:string;publisher:string;reader:ArchiveReader;origin:string;role:ArchiveRole;locale:string
 /** wordpress-rest: which collections to list (Celtic Wiki = pages, not posts) */
 collections?:('posts'|'pages')[]
 /** html: approved index pages to start from (paths on `origin`), and the path pattern links may be followed by */
 seeds?:string[];follow?:string
 /** every requested path must start with one of these */
 allowedPathPrefixes:string[]
 parserId:string|null
 budget:{perPage:number;maxRequests:number;minDelayMs:number;timeoutMs:number;maxResponseBytes:number}
 /** metadata-only until the source's reuse policy was reviewed; images are never downloaded */
 retention:{rawBody:'metadata-only'|'private-copy';downloadImages:false}
 knownLimits?:string[]
}
export type ArchiveProfile={schemaVersion:typeof RESEARCH_SCHEMA;clubId:string;sport:'football';archive:ArchiveSource[];notes?:string}
export type ArchiveDoc={
 providerKey:string;providerId:string;collection:string;url:string;title:string|null;contentHash:string;bytes:number
 /** publication metadata — NEVER the date of the event a page describes */
 publishedAsReported:string|null;modifiedAsReported:string|null;retrievedAt:string
 firstRunId:string;lastRunId:string;changed:boolean;snapshot:string|null;parse:'needs-parser'|'parsed'
}
export type CheckpointState='new'|'running'|'partial_budget'|'listed'|'blocked'|'not-json'|'schema-changed'|'retry-later'
export type ArchiveCheckpoint={
 schemaVersion:typeof RESEARCH_SCHEMA;providerId:string;collection:string;queryFingerprint:string;parserVersion:string|null
 nextPage:number;lastCommittedPage:number;observedTotalDocuments:number|null;observedTotalPages:number|null;perPage:number
 /** html only: discovered paths still to read, and paths already read */
 queue?:string[];seen?:string[]
 state:CheckpointState;updatedAt:string;lastError:string|null
}
export type EndpointStatus={endpoint:string;providerId:string;state:'ok'|'blocked'|'not-found'|'not-json'|'schema-changed'|'retry-later'|'error';status:number;reason:string|null;checkedAt:string}
export type DiagnosticCode='SOURCE_BLOCKED'|'RESOURCE_NOT_FOUND'|'SOURCE_NOT_JSON'|'SOURCE_SCHEMA_CHANGED'|'RETRY_LATER'|'OFF_ORIGIN_LINK'|'FINGERPRINT_CHANGED'|'NEEDS_PARSER'|'BUDGET_EXHAUSTED'|'PATH_NOT_ALLOWED'
export type ArchiveDiagnostic={code:DiagnosticCode;providerId:string;url:string|null;message:string}
export type ArchiveRun={
 schemaVersion:typeof RESEARCH_SCHEMA;id:string;clubId:string;startedAt:string;finishedAt:string;providers:string[]
 /** never 'complete': a listing that reached its last page is 'listed', which says nothing about historical coverage */
 state:'partial_budget'|'listed'|'blocked'|'failed'|'nothing-to-do'
 counts:{requests:number;documentsRead:number;newDocuments:number;changedDocuments:number;unchangedDocuments:number;recordsExtracted:number;blockedEndpoints:number;budgetLeft:number}
 diagnostics:ArchiveDiagnostic[];completeArchiveClaim:false;approvedForProduction:0
}

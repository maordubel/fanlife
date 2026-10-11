import type {GoalStepRecord} from '@/lib/game/replay/truth'

/**
 * Autonomous goal research (spec 11.10.2026). Five states are kept apart on purpose — ingested, extracted, verified,
 * approved, published — and confidence alone never moves a candidate past a failed hard check (`./gate.ts`).
 */
export const PIPELINE_VERSION='goals-auto-1' as const
export const EXTRACTOR_VERSION='goals-text-1' as const

export type CandidateStatus='candidate'|'sequence_candidate'|'ready_for_review'|'auto_publishable'|'held'|'published'|'rolled_back'

/** Plain-language reasons shown in the admin; every hold carries at least one. */
export type IssueCode=
 |'NO_SEQUENCE'            // scorer and minute only: a goal is not a move
 |'SCORER_UNKNOWN'
 |'TOO_FEW_GROUNDED_STEPS'
 |'TOO_MANY_STEPS'         // the engine plays at most MAX_TOUCHES; never truncated silently
 |'NO_GROUNDED_LOCATION'   // no phrase in the position table, so no honest envelope
 |'STEP_WITHOUT_EVIDENCE'
 |'ACTOR_AMBIGUOUS'
 |'FIXTURE_NOT_FOUND'
 |'FIXTURE_CONFLICT'
 |'NOT_HEBREW_SOURCE'      // the game prints Hebrew narrative; a translation is not invented
 |'TRUTH_REJECTED'
 |'REPLAY_HELD'
 |'SOURCE_NOT_CERTIFIED'
 |'AUTO_PUBLISH_OFF'
 |'STORAGE_NOT_DURABLE'
 |'DUPLICATE_OF_BUNDLED'

export type Evidence={
 sourceId:string;url:string;/** paragraph index or selector */locator:string;/** verbatim span */quote:string
 bodyHash:string;fetchedAt:string;language:'he'|'en'|'el'|'other'
}
export type GroundedStep=GoalStepRecord&{evidence:Evidence}

export type Candidate={
 id:string;clubId:string;sourceIds:string[]
 playedOn:string|null;opponentHe:string|null;minute:string|null;scorerAlias:string|null;ownGoal:boolean
 evidence:Evidence[];steps:GroundedStep[];status:CandidateStatus;issues:IssueCode[]
 extractorVersion:string;pipelineVersion:string;createdAt:string;updatedAt:string
}

export type SourcePolicy={sourceId:string;enabled:boolean;certified:boolean;autoPublish:boolean}
export type Policy={
 /** global switch; default OFF (spec §0) */autoPublish:boolean;paused:boolean
 sources:Record<string,SourcePolicy>;clubs:Record<string,{autoPublish:boolean}>
}
export const DEFAULT_POLICY:Policy={autoPublish:false,paused:false,sources:{},clubs:{}}

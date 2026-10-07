/**
 * Every gate's full-round target and short-round minimum — ONE table read by the readiness code, the control room
 * and the research planner (audit: "single source for minimum, target, names"). Changing a number here changes it
 * everywhere; no other file may type a gate threshold.
 */
export const GATE_THRESHOLDS={
 xi:{target:22,minimum:11,unit:'approved player identities'},
 trivia:{target:60,minimum:3,unit:'eligible questions'},
 lineup:{target:5,minimum:1,unit:'matches with a documented eleven and at least three other squad players'},
 'kit-builder':{target:5,minimum:3,unit:'approved kits naming season, maker and design'},
 kits:{target:8,minimum:1,unit:'approved kits with a season'},
 memory:{target:6,minimum:2,unit:'distinct sourced memory pairs'},
 polls:{target:6,minimum:1,unit:'opinion prompts with eligible club choices'},
 goal:{target:6,minimum:1,unit:'goals with a sourced touch-by-touch sequence'},
 'royal-rumble':{target:20,minimum:5,unit:'players with documented positions (GK, DF, MF, FW each covered)'},
 'blind-cow':{target:30,minimum:1,unit:'canonical players with at least four eligible clues'},
 derby:{target:1,minimum:1,unit:'human-approved primary rival'},
 archive:{target:20,minimum:1,unit:'eligible archive entries'},
 timeline:{target:11,minimum:3,unit:'approved, distinct, exact-date events'},
} as const
export type ThresholdKey=keyof typeof GATE_THRESHOLDS

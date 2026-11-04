/** The control room's areas (CRM 1 §3; Studio added 4.11.2026, owner: "I don't see any video studio"): eight WORK areas ordered by what the owner does, then the TOOLS. */
export const SECTIONS=[
 {key:'overview',label:'Desk',hint:'What needs you now'},
 {key:'clubs',label:'Clubs',hint:'Research, readiness, publish'},
 {key:'players',label:'Players',hint:'Positions, prices, duplicates'},
 {key:'games',label:'Games',hint:'Every gate, every club'},
 {key:'studio',label:'Studio',hint:'Football Stories films'},
 {key:'market',label:'Market',hint:'Shirts, offers, reports'},
 {key:'community',label:'Community',hint:'Fan contributions'},
 {key:'audience',label:'Performance',hint:'Who plays, where they stop'},
] as const
export const TOOLS=[
 {key:'data',label:'Sources & research',hint:'Collect, parse, stage'},
 {key:'operations',label:'Operations',hint:'Runs, storage, schedules'},
 {key:'advertising',label:'Advertising',hint:'Banners, the top ad, DUBID & OFFSIDES'},
 {key:'settings',label:'Settings',hint:'Features, LIFE display, access'},
] as const
export type Section=typeof SECTIONS[number]['key']|typeof TOOLS[number]['key']|'more'

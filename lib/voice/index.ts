/**
 * RED VOICE — one import for a gate (docs/19-red-voice.md).
 *
 *   import { voice, microFeedback, tierFromShare } from '@/lib/voice'
 *
 * Client-safe: messages, a hash and the song metadata file. No server data.
 */
export * from './types'
export { GATE_FAMILY, GATE_MOOD, HARSH_GATES, TIER_FALLBACK, tierFromClues, tierFromShare, type VoiceFamily } from './contexts'
export { SHARE_KEY, VOICES, allVoiceKeys } from './messages'
export { hashSeed, microFeedback, pick, resultPool, voice, voiceAction, whatsappLine } from './select'
export { SONGS, SONG_CATEGORY_URL, songFor, songsFor, validateSongs, type SongContext, type SongSurface } from './songs'

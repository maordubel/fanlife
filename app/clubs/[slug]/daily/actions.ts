'use server'
import { terraceAnswer, terraceToday } from '@/lib/terrace/server'
export type { Public, Fail, Answered } from '@/lib/terrace/server'
export async function todayTerrace(slug: string) { return terraceToday(slug) }
export async function answerTerrace(slug: string, round: number, option: number) { return terraceAnswer(slug, round, option) }
import { boardFor, joinBoard } from '@/lib/terrace/board'
export type { Board } from '@/lib/terrace/board'
export async function terraceBoard(slug: string) { return boardFor(slug) }
export async function joinTerraceBoard(slug: string, nick: string) { return joinBoard(slug, nick) }

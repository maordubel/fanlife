import 'server-only'

import { archive } from '../../archive'
import { goalOpponentConflict } from '../conflicts'
import { fact, sourceOf, yearOf, type Draft, type Template } from '../draft'
import type { QTopic } from '../types'

/**
 * השערים — twenty-one moves whose build-up a published report describes. The clue is
 * the reporter's own sentence, which is the whole reason these can be asked honestly.
 */

type Goal = (typeof archive.goals)[number] & { playedOn?: string | null }

const goals = () => archive.goals as Goal[]

const EURO = /אופ"א|האלופות|הליגה האירופית|אינטרטוטו|הועידה/

export function goalTopics(goal: Goal): QTopic[] {
  if (goal.opponentHe === 'מכבי תל אביב') return ['derby', 'history']
  if (EURO.test(goal.competitionHe)) return ['europe', 'history']
  return ['history']
}

export function goalFact(goal: Goal) {
  const year = yearOf(goal.playedOn ?? null)
  return fact({
    kind: 'goal',
    key: goal.goalId,
    subject: goal.titleHe,
    value: year === null ? goal.competitionHe : String(year),
    valueType: year === null ? 'text' : 'year',
    when: goal.playedOn ?? null,
    topics: goalTopics(goal),
    source: sourceOf(goal),
  })
}

/** the opponent is printed only where it is not the contested thing */
function opponentLine(goal: Goal): string {
  return goalOpponentConflict(goal.goalId) ? goal.competitionHe : `${goal.competitionHe} · ${goal.opponentHe}`
}

export const GOAL_TEMPLATES: Template[] = [
  {
    slug: 'goal-scorer',
    base: 3,
    build: () => {
      const finishers = goals()
        .map((goal) => goal.sequence[goal.sequence.length - 1]?.actorHe)
        .filter((name): name is string => name !== undefined)
      const out: Draft[] = []
      for (const goal of goals()) {
        const last = goal.sequence[goal.sequence.length - 1]
        if (!last) continue
        out.push({
          key: `goal-scorer:${goal.goalId}`,
          legacyKey: `goal-scorer:${goal.goalId}`,
          template: 'goal-scorer',
          type: 'mcq',
          prompt: 'מי סיים את המהלך הזה?',
          quoteHe: goal.narrativeHe,
          quoteByHe: opponentLine(goal),
          answer: last.actorHe,
          pool: finishers,
          source: sourceOf(goal),
          explanation: `${goal.titleHe} · ${goal.subtitleHe}`,
          when: goal.playedOn ?? null,
          topics: goalTopics(goal),
          facts: [goalFact(goal)],
        })
      }
      return out
    },
  },
  {
    /**
     * מול מי? — NOT asked of the 2010 and 2012 cup finals: the opponent of those five
     * goals is contested between sources (see `conflicts.ts`). The builder records the
     * exclusion instead of dropping them silently.
     */
    slug: 'goal-opponent',
    base: 2,
    build: () => {
      const opponents = goals().map((goal) => goal.opponentHe)
      return goals().map(
        (goal): Draft => ({
          key: `goal-opponent:${goal.goalId}`,
          legacyKey: `goal-opponent:${goal.goalId}`,
          template: 'goal-opponent',
          type: 'mcq',
          prompt: `מול מי נכבש השער הזה — "${goal.titleHe}"?`,
          quoteHe: goal.narrativeHe,
          answer: goal.opponentHe,
          pool: opponents,
          source: sourceOf(goal),
          explanation: `${goal.subtitleHe} · ${goal.scoreHe}`,
          when: goal.playedOn ?? null,
          // asked of a derby goal, "against whom" has one answer in the derby topic
          topics: goalTopics(goal).filter((topic) => topic !== 'derby'),
          hint: { kind: 'context', he: goal.competitionHe },
          facts: [goalFact(goal)],
          conflict: goalOpponentConflict(goal.goalId) ?? undefined,
        }),
      )
    },
  },
  {
    slug: 'goal-competition',
    base: 3,
    build: () => {
      const competitions = goals().map((goal) => goal.competitionHe)
      return goals().map(
        (goal): Draft => ({
          key: `goal-competition:${goal.goalId}`,
          legacyKey: `goal-competition:${goal.goalId}`,
          template: 'goal-competition',
          type: 'mcq',
          prompt: `באיזה מפעל נכבש "${goal.titleHe}"?`,
          quoteHe: goal.narrativeHe,
          answer: goal.competitionHe,
          pool: competitions,
          source: sourceOf(goal),
          explanation: goalOpponentConflict(goal.goalId) ? goal.subtitleHe : `${goal.opponentHe} · ${goal.subtitleHe}`,
          when: goal.playedOn ?? null,
          topics: goalTopics(goal),
          facts: [goalFact(goal)],
        }),
      )
    },
  },
  {
    slug: 'goal-assist',
    base: 5,
    build: () => {
      const names = goals()
        .flatMap((goal) => goal.sequence.map((step) => step.actorHe))
        .filter((name) => name !== 'הכדור' && !name.startsWith('השוער'))
      const out: Draft[] = []
      for (const goal of goals()) {
        const finish = goal.sequence[goal.sequence.length - 1]
        const before = [...goal.sequence]
          .slice(0, -1)
          .reverse()
          .find(
            (step) =>
              step.actorHe !== finish?.actorHe && step.actorHe !== 'הכדור' && !step.actorHe.startsWith('השוער'),
          )
        if (!before || !finish) continue
        out.push({
          key: `goal-assist:${goal.goalId}`,
          legacyKey: `goal-assist:${goal.goalId}`,
          template: 'goal-assist',
          type: 'mcq',
          prompt: `מי מסר את הכדור שממנו נולד "${goal.titleHe}"?`,
          quoteHe: goal.narrativeHe,
          answer: before.actorHe,
          pool: names,
          source: sourceOf(goal),
          explanation: `${before.noteHe} · ${goal.subtitleHe}`,
          when: goal.playedOn ?? null,
          topics: goalTopics(goal),
          facts: [goalFact(goal)],
        })
      }
      return out
    },
  },
  {
    slug: 'goal-title',
    base: 4,
    build: () => {
      const titles = goals().map((goal) => goal.titleHe)
      return goals().map(
        (goal): Draft => ({
          key: `goal-title:${goal.goalId}`,
          legacyKey: `goal-title:${goal.goalId}`,
          template: 'goal-title',
          type: 'mcq',
          prompt: 'איזה שער מתואר כאן?',
          quoteHe: goal.narrativeHe,
          answer: goal.titleHe,
          pool: titles,
          source: sourceOf(goal),
          explanation: goalOpponentConflict(goal.goalId) ? goal.subtitleHe : `${goal.subtitleHe} · ${goal.opponentHe}`,
          when: goal.playedOn ?? null,
          topics: goalTopics(goal),
          facts: [goalFact(goal)],
        }),
      )
    },
  },
  {
    /** באיזו שנה — new with the master: the year of the move, on the year scale. */
    slug: 'goal-year',
    base: 3,
    build: () => {
      const years = goals()
        .map((goal) => yearOf(goal.playedOn ?? null))
        .filter((year): year is number => year !== null)
        .map(String)
      const out: Draft[] = []
      for (const goal of goals()) {
        const year = yearOf(goal.playedOn ?? null)
        if (year === null) continue
        out.push({
          key: `goal-year:${goal.goalId}`,
          template: 'goal-year',
          type: 'year',
          prompt: `באיזו שנה נכבש "${goal.titleHe}"?`,
          answer: String(year),
          pool: years,
          source: sourceOf(goal),
          explanation: `${goal.subtitleHe} · ${goal.playedOn}`,
          when: goal.playedOn ?? null,
          topics: goalTopics(goal),
          hint: { kind: 'context', he: goal.competitionHe },
          facts: [goalFact(goal)],
        })
      }
      return out
    },
  },
]

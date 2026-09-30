import 'server-only'

import { archive } from '../../archive'
import { sourceOf, stripThe, type Draft, type Template } from '../draft'

/**
 * הפועל אוסישקין — the association's first elections, from its own site: every
 * candidate, the occupation each declared, the vote count for all twenty-one.
 *
 * `sport: 'basketball'` — the association is the basketball wing, so these reach only a
 * mixed run (rule 14: a TOPIC decides which sports are in scope, and only הכול מהכול
 * admits both). The founder's questions share one capped group with the rest of the
 * Ussishkin family: one per run, never a distractor (rules 16–17).
 */

const FOUNDER = archive.associationRoles.find((role) => role.roleHe === 'מייסד')?.personNameHe ?? null

const ASSOCIATION_NAMES = () =>
  [
    ...new Set([
      ...archive.associationRoles.map((role) => role.personNameHe),
      ...archive.electionCandidates.map((candidate) => candidate.personNameHe),
    ]),
  ].filter((name) => name !== FOUNDER)

// No `when` on the election rows: the source dates the association, not the ballot, and
// a decade chip must not be invented from a guess.
const common = { sport: 'basketball' as const, topics: ['history' as const], when: null }

export const USSISHKIN_TEMPLATES: Template[] = [
  {
    slug: 'election-top',
    base: 4,
    build: () =>
      archive.elections.flatMap((election): Draft[] => {
        const candidates = archive.electionCandidates.filter((row) => row.electionSlug === election.slug)
        const top = candidates.find((row) => row.rank === 1)
        if (!top || top.personNameHe === FOUNDER) return []
        return [
          {
            key: `election-top:${election.slug}`,
            legacyKey: `election-top:${election.slug}`,
            template: 'election-top',
            type: 'mcq',
            prompt: `מי קיבל את מספר הקולות הגדול ביותר ב${stripThe(election.titleHe)} של הפועל אוסישקין?`,
            answer: top.personNameHe,
            pool: candidates.map((row) => row.personNameHe).filter((name) => name !== FOUNDER),
            source: sourceOf(top),
            explanation: `${top.personNameHe} · ${top.votes} קולות`,
            ...common,
          },
        ]
      }),
  },
  {
    slug: 'election-votes',
    base: 5,
    build: () =>
      archive.electionCandidates
        .filter((row) => row.votes !== null && row.personNameHe !== FOUNDER)
        .map((row): Draft => {
          const election = archive.elections.find((item) => item.slug === row.electionSlug)
          return {
            key: `election-votes:${row.electionSlug}:${row.personNameHe}`,
            legacyKey: `election-votes:${row.electionSlug}:${row.personNameHe}`,
            template: 'election-votes',
            type: 'mcq',
            prompt: `כמה קולות קיבל ${row.personNameHe} ב${stripThe(election?.titleHe ?? 'בחירות העמותה')}?`,
            answer: String(row.votes),
            pool: archive.electionCandidates
              .filter((other) => other.electionSlug === row.electionSlug)
              .map((other) => String(other.votes)),
            source: sourceOf(row),
            explanation: `${row.personNameHe} · מקום ${row.rank} · ${row.votes} קולות`,
            ...common,
          }
        }),
  },
  {
    slug: 'election-manifesto',
    base: 5,
    build: () =>
      archive.electionCandidates
        .filter((row) => row.occupationHe !== null && row.occupationHe !== undefined && row.personNameHe !== FOUNDER)
        .map(
          (row): Draft => ({
            key: `election-manifesto:${row.electionSlug}:${row.personNameHe}`,
            legacyKey: `election-manifesto:${row.electionSlug}:${row.personNameHe}`,
            template: 'election-manifesto',
            type: 'mcq',
            prompt: `מי הציג את עצמו במצע לבחירות הראשונות של הפועל אוסישקין כך: "${row.occupationHe}"?`,
            answer: row.personNameHe,
            pool: archive.electionCandidates.map((other) => other.personNameHe).filter((name) => name !== FOUNDER),
            source: sourceOf(row),
            explanation: `${row.personNameHe} · ${row.elected ? 'נבחר' : 'לא נבחר'} · ${row.votes} קולות`,
            ...common,
          }),
        ),
  },
  {
    slug: 'election-turnout',
    base: 4,
    build: () =>
      archive.elections
        .filter((row) => row.eligibleVoters !== null && row.votesCast !== null)
        .map((row): Draft => {
          const numbers = archive.elections
            .flatMap((other) => [other.eligibleVoters, other.votesCast, other.invalidVotes])
            .filter((value): value is number => value !== null)
            .map(String)
          return {
            key: `election-eligible:${row.slug}`,
            legacyKey: `election-eligible:${row.slug}`,
            template: 'election-turnout',
            type: 'mcq',
            prompt: 'כמה חברי עמותה היו בעלי זכות הצבעה בבחירות הראשונות של הפועל אוסישקין?',
            answer: String(row.eligibleVoters),
            pool: numbers,
            source: sourceOf(row),
            explanation: `${row.votesCast} מתוך ${row.eligibleVoters} הצביעו, ${row.invalidVotes} קולות נפסלו`,
            ...common,
          }
        }),
  },
  {
    slug: 'ussishkin-replacement',
    base: 5,
    build: () =>
      archive.associationRoles
        .filter((row) => row.replacedByNameHe)
        .map((row): Draft => {
          const correct = row.replacedByNameHe as string
          return {
            key: `ussishkin-replacement:${correct}`,
            legacyKey: `ussishkin-replacement:${correct}`,
            template: 'ussishkin-replacement',
            type: 'mcq',
            prompt: 'מי נבחר להנהלת הפועל אוסישקין למקום שהתפנה ב־2012?',
            answer: correct,
            pool: ASSOCIATION_NAMES(),
            source: sourceOf(row),
            explanation: `${correct} · נבחר בפברואר 2013`,
            capped: 'founder',
            ...common,
            when: '2013',
          }
        }),
  },
  {
    slug: 'founder-rank',
    base: 4,
    build: () =>
      archive.electionCandidates
        .filter((row) => row.personNameHe === FOUNDER && row.rank === 2)
        .map(
          (row): Draft => ({
            key: `founder-rank:${row.electionSlug}`,
            legacyKey: `founder-rank:${row.electionSlug}`,
            template: 'founder-rank',
            type: 'mcq',
            prompt: 'מי סיים במקום השני בבחירות הראשונות להנהלת עמותת הפועל אוסישקין?',
            answer: row.personNameHe,
            pool: ASSOCIATION_NAMES(),
            source: sourceOf(row),
            explanation: `${row.personNameHe} · ${row.votes} קולות, אחרי נועה סקלי`,
            capped: 'founder',
            ...common,
          }),
        ),
  },
  {
    slug: 'ussishkin',
    base: 3,
    build: () =>
      archive.associationRoles
        .filter((row) => row.roleHe === 'מייסד')
        .map(
          (row): Draft => ({
            key: `ussishkin:${row.personNameHe}`,
            legacyKey: `ussishkin:${row.personNameHe}`,
            template: 'ussishkin',
            type: 'mcq',
            prompt: 'מי רשם את הפועל אוסישקין בליגה עם הקמת העמותה ב־2007?',
            answer: row.personNameHe,
            pool: ASSOCIATION_NAMES(),
            source: sourceOf(row),
            explanation: `${row.personNameHe} · חבר הנהלה 2007–2012`,
            capped: 'founder',
            ...common,
            when: '2007',
          }),
        ),
  },
]

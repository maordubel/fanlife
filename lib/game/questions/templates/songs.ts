import 'server-only'

import { archive, shuffle } from '../../archive'
import { fact, seeded, sourceOf, type Draft, type Template } from '../draft'

/**
 * השירים — asked from METADATA only (rule 12): title, tune, subject, type. No question,
 * explanation or hint prints a verse.
 */

function songFact(row: (typeof archive.songs)[number]) {
  return fact({
    kind: 'song',
    key: row.slug,
    subject: row.titleHe,
    value: row.personNameHe ?? row.originalTitle ?? row.titleHe,
    valueType: 'text',
    when: row.seasonLabel ?? null,
    topics: ['songs'],
    source: sourceOf(row),
  })
}

const LABEL: Record<string, string> = {
  terrace_song: 'שיר יציע',
  player_song: 'שיר לשחקן',
  club_song: 'שיר המועדון',
}

export const SONG_TEMPLATES: Template[] = [
  {
    slug: 'song-tune',
    base: 3,
    build: () => {
      const rows = archive.songs.filter((row) => row.songType !== 'player_song' && row.originalTitle)
      // the pool is every terrace song, not only the ones that record a tune
      const titles = archive.songs.filter((row) => row.songType !== 'player_song').map((row) => row.titleHe)
      return rows.map(
        (row): Draft => ({
          key: `song-tune:${row.slug}`,
          legacyKey: `song-tune:${row.slug}`,
          template: 'song-tune',
          type: 'mcq',
          prompt: `על איזה שיר של היציע הולבש הלחן "${row.originalTitle}"?`,
          answer: row.titleHe,
          pool: titles,
          source: sourceOf(row),
          explanation: row.backgroundHe ?? row.originalArtist ?? row.originalTitle ?? '',
          when: row.seasonLabel ?? null,
          topics: ['songs'],
          facts: [songFact(row)],
        }),
      )
    },
  },
  {
    slug: 'song-about',
    base: 2,
    build: () => {
      const rows = archive.songs.filter((row) => row.songType === 'player_song' && row.personNameHe)
      const names = rows.map((row) => row.personNameHe as string)
      return rows.map(
        (row): Draft => ({
          key: `song-about:${row.slug}`,
          legacyKey: `song-about:${row.slug}`,
          template: 'song-about',
          type: 'mcq',
          prompt: `על מי שר היציע את "${row.originalTitle ?? row.titleHe}"?`,
          answer: row.personNameHe as string,
          pool: names,
          source: sourceOf(row),
          explanation: row.backgroundHe ?? row.titleHe,
          when: row.seasonLabel ?? null,
          topics: ['songs', 'players'],
          facts: [songFact(row)],
        }),
      )
    },
  },
  {
    slug: 'song-era',
    base: 4,
    build: () =>
      archive.songs
        .filter((row) => LABEL[row.songType] !== undefined)
        .map(
          (row): Draft => ({
            key: `song-era:${row.slug}`,
            legacyKey: `song-era:${row.slug}`,
            template: 'song-era',
            type: 'mcq',
            prompt: `"${row.titleHe}" — מה זה?`,
            answer: LABEL[row.songType] as string,
            // the four labels ARE the whole space of answers — fixed, in a stable order
            distractors: shuffle(
              [...Object.values(LABEL), 'שיר של יריבה'].filter((label) => label !== LABEL[row.songType]),
              seeded(`song-era:${row.slug}`),
            ),
            source: sourceOf(row),
            explanation: row.backgroundHe ?? row.titleHe,
            when: row.seasonLabel ?? null,
            topics: ['songs'],
            facts: [songFact(row)],
          }),
        ),
  },
  {
    slug: 'player-song',
    base: 5,
    build: () => {
      const names = archive.songs
        .filter((other) => other.personNameHe)
        .map((other) => other.personNameHe as string)
      return archive.songs
        .filter((row) => row.songType === 'player_song' && row.personNameHe && row.originalTitle)
        .map(
          (row): Draft => ({
            key: `player-song:${row.slug}`,
            legacyKey: `player-song:${row.slug}`,
            template: 'player-song',
            type: 'mcq',
            prompt: `לאיזה שחקן הוקדש השיר על הלחן של "${row.originalTitle}"?`,
            answer: row.personNameHe as string,
            pool: names,
            source: sourceOf(row),
            explanation: `${row.titleHe}${row.originalArtist ? ` · ${row.originalArtist}` : ''}`,
            when: row.seasonLabel ?? null,
            topics: ['songs', 'players'],
            facts: [songFact(row)],
          }),
        )
    },
  },
  {
    slug: 'song-origin',
    base: 4,
    build: () => {
      const tunes = archive.songs.filter((other) => other.originalTitle).map((other) => other.originalTitle as string)
      return archive.songs
        .filter((row) => row.originalTitle && row.songType !== 'player_song')
        .map(
          (row): Draft => ({
            key: `song-origin:${row.slug}`,
            legacyKey: `song-origin:${row.slug}`,
            template: 'song-origin',
            type: 'mcq',
            prompt: `על איזה לחן מבוסס "${row.titleHe}"?`,
            answer: row.originalTitle as string,
            pool: tunes,
            source: sourceOf(row),
            explanation: `${row.originalTitle}${row.originalArtist ? ` — ${row.originalArtist}` : ''}${row.seasonLabel ? ` · נכנס ליציע ב-${row.seasonLabel}` : ''}`,
            when: row.seasonLabel ?? null,
            topics: ['songs'],
            facts: [songFact(row)],
          }),
        )
    },
  },
  {
    slug: 'fan-culture',
    base: 5,
    build: () => {
      const descriptions = archive.fanCulture.map((other) => other.descriptionHe.slice(0, 80))
      return archive.fanCulture
        .filter((row) => row.category === 'gate' || row.category === 'fence')
        .map(
          (row): Draft => ({
            key: `fan-culture:${row.slug}`,
            legacyKey: `fan-culture:${row.slug}`,
            template: 'fan-culture',
            type: 'mcq',
            prompt: `במה מדובר — "${row.titleHe}"?`,
            answer: row.descriptionHe.slice(0, 80),
            pool: descriptions,
            source: sourceOf(row),
            explanation: row.descriptionHe,
            topics: ['songs'],
            hint: row.periodHe ? { kind: 'context', he: row.periodHe } : undefined,
          }),
        )
    },
  },
]

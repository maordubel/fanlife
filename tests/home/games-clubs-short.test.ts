import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'

const games=readFileSync('app/our-games/page.tsx','utf8'),clubs=readFileSync('app/clubs/page.tsx','utf8'),index=readFileSync('components/home/ClubsIndex.tsx','utf8')

describe('Our games and The clubs, short (docs/rules/games-clubs-short.md)',()=>{
 it('Our games: the index of games comes before the two big games',()=>{
  expect(games.indexOf('<PlayIndex')).toBeGreaterThan(-1)
  expect(games.indexOf('<PlayIndex')).toBeLessThan(games.indexOf('className="wkg-pair"'))
 })
 it('Our games: the pick-a-club poster belongs to the old page only',()=>{
  expect(games).toContain('{!fd.open&&<section className="wkg-world')
 })
 it('The clubs: the workshop is folded by the same switch, and stays a section with it off',()=>{
  expect(clubs).toContain("door('frontDoors')")
  expect(clubs).toContain('tuck={fd.open}')
  expect(index).toContain('<details className="ckp-soon ckp-fold">')
  expect(index).toContain('<section className="ckp-soon" aria-labelledby="ckp-soon-h">')
 })
})

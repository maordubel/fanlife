import React, {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it} from 'vitest'
import {KitPlate} from '@/components/clubs/games/KitPlate'

;(globalThis as {React?: typeof React}).React = React

const shirt = {id: 'same-shirt', season: '2001/02', colours: ['green', 'white']}

describe('club kit plate', () => {
 it('renders pinstripes without the wide stripes used by striped shirts', () => {
  const fine = renderToStaticMarkup(createElement(KitPlate, {kit: {...shirt, design: 'pinstripes'}, label: false}))
  const wide = renderToStaticMarkup(createElement(KitPlate, {kit: {...shirt, design: 'stripes'}, label: false}))
  expect(fine.match(/width="4" height="320"/g)).toHaveLength(14)
  expect(fine).not.toContain('width="26" height="320"')
  expect(wide.match(/width="26" height="320"/g)).toHaveLength(6)
  expect(wide).not.toContain('width="4" height="320"')
 })

 it('gives two instances of the same shirt independent clipping paths', () => {
  const kit = {...shirt, design: 'hoops', shorts: {colour: 'white', trim: 'green'}}
  const html = renderToStaticMarkup(createElement('div', null,
   createElement(KitPlate, {kit, label: false}), createElement(KitPlate, {kit, label: false})))
  const ids = [...html.matchAll(/<clipPath id="([^"]+)"/g)].map(match => match[1])
  expect(ids).toHaveLength(4)
  expect(new Set(ids).size).toBe(ids.length)
 })
})

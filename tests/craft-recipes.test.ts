import { describe, expect, it } from 'vitest'

import { CRAFT_RECIPES, CRAFT_RECIPE_IDS, placeables, recipeById, recipeForLevel } from '@/lib/game/craft/recipes'
import { CRAFT_SURFACES, CRAFT_TOOLS, SURFACE_BOX, type CraftMarkKind } from '@/lib/game/craft/types'
import { MESSAGES } from '@/lib/i18n'

/**
 * המתכונים — the registry is data, so the rules about it are tests (spec §12, §16, §35).
 *
 * A recipe is a verb: tools from the bench's own list, a target its tools can reach, and
 * NO route — the same banner serves ULTRAS, CREATOR and a boy helping a friend. The three
 * ages are derived, and derived monotonically: a child never has a tool a teen lacks, and
 * a child is never handed a timer.
 */
const KINDS_BY_TOOL: Record<string, CraftMarkKind[]> = {
  text: ['text'],
  stamp: ['stamp'],
  place: ['stripe', 'stencil'],
  stencil: ['stencil'],
  paint: ['stroke'],
  spray: ['spray'],
  cut: ['cut'],
}

describe('the five recipes of the first batch', () => {
  it('are the ids the spec names, and resolve by id', () => {
    for (const id of ['fan-shirt-first', 'derby-confetti', 'gate5-banner', 'wall-stencil', 'sticker-first']) {
      expect(recipeById(id)?.id, id).toBe(id)
    }
    expect(recipeById('nothing')).toBeNull()
    expect(recipeById(null)).toBeNull()
    expect(CRAFT_RECIPE_IDS.length).toBeGreaterThanOrEqual(5)
  })

  it('use only the bench tools, on a surface that has a box, with a palette of house colours', () => {
    for (const recipe of Object.values(CRAFT_RECIPES)) {
      expect(recipe.id in CRAFT_RECIPES && CRAFT_RECIPES[recipe.id] === recipe).toBe(true)
      expect(CRAFT_SURFACES).toContain(recipe.surface)
      expect(SURFACE_BOX[recipe.surface].w).toBeGreaterThan(0)
      for (const tool of recipe.tools) expect(CRAFT_TOOLS, `${recipe.id}: ${tool}`).toContain(tool)
      expect(new Set(recipe.tools).size).toBe(recipe.tools.length)
      // red / black / white / grey / concrete only — navy is not a paint on this bench
      for (const color of recipe.palette ?? []) expect(['red', 'ink', 'sheet', 'concrete']).toContain(color)
    }
  })

  it('never binds a recipe to a route (spec §16)', () => {
    for (const recipe of Object.values(CRAFT_RECIPES)) {
      expect('route' in recipe, recipe.id).toBe(false)
      expect('routeId' in recipe, recipe.id).toBe(false)
      expect(JSON.stringify(recipe)).not.toMatch(/ULTRAS|CREATOR|FOUNDER|JOURNALIST/)
    }
  })

  it('asks for a target its own tools can reach', () => {
    for (const recipe of Object.values(CRAFT_RECIPES)) {
      const reachable = new Set(recipe.tools.flatMap((tool) => KINDS_BY_TOOL[tool] ?? []))
      const target = recipe.target
      if (target.type === 'complete-layout') {
        expect(target.required.length).toBeGreaterThan(0)
        for (const kind of target.required) expect(reachable, `${recipe.id} needs ${kind}`).toContain(kind)
        for (const kind of target.required) expect(placeables(recipe), `${recipe.id} tray lacks ${kind}`).toContain(kind)
      }
      if (target.type === 'piece-count') {
        expect(recipe.tools).toContain('cut')
        expect(target.min).toBeGreaterThan(1)
      }
      if (target.type === 'coverage') {
        expect(recipe.tools.some((tool) => tool === 'paint' || tool === 'spray' || tool === 'stencil')).toBe(true)
        expect(target.min).toBeGreaterThan(0)
        expect(target.min).toBeLessThanOrEqual(1)
      }
      if (target.type === 'stencil-coverage') {
        expect(recipe.tools).toContain('spray')
        expect(recipe.stencilText, `${recipe.id} has no stencil text`).toBeTruthy()
        expect(target.min).toBeGreaterThan(0)
        expect(target.min).toBeLessThanOrEqual(1)
      }
    }
  })

  it('names stamps the bench can label', () => {
    for (const recipe of Object.values(CRAFT_RECIPES)) {
      for (const stamp of recipe.stamps ?? []) expect(`craft.stamp.${stamp}` in MESSAGES, `${recipe.id}: ${stamp}`).toBe(true)
    }
  })

  it('keeps the persistent outputs the spec promised the world', () => {
    expect(CRAFT_RECIPES['fan-shirt-first']?.output).toEqual({ persistent: true, worldUse: 'pugi:fan-shirt' })
    expect(CRAFT_RECIPES['gate5-banner']?.output).toEqual({ persistent: true, worldUse: 'stand:banner' })
    expect(CRAFT_RECIPES['wall-stencil']?.output).toEqual({ persistent: true, worldUse: 'wall:stencil' })
    expect(CRAFT_RECIPES['derby-confetti']?.target).toEqual({ type: 'piece-count', min: 35 })
    expect(CRAFT_RECIPES['gate5-banner']?.target).toEqual({ type: 'coverage', min: 0.78 })
    expect(CRAFT_RECIPES['wall-stencil']?.target).toEqual({ type: 'stencil-coverage', min: 0.7 })
    expect(CRAFT_RECIPES['wall-stencil']?.constraints?.overspray).toBe(true)
  })
})

describe('three ages, one recipe (spec §35, §49)', () => {
  it('derives monotone variants: tools(child) ⊆ tools(teen) = tools(adult)', () => {
    for (const recipe of Object.values(CRAFT_RECIPES)) {
      const child = recipeForLevel(recipe, 'child')
      const teen = recipeForLevel(recipe, 'teen')
      const adult = recipeForLevel(recipe, 'adult')
      for (const tool of child.tools) expect(teen.tools, `${recipe.id}: child has ${tool}, teen does not`).toContain(tool)
      expect([...teen.tools]).toEqual([...adult.tools])
      expect([...adult.tools]).toEqual([...recipe.tools])
      expect(child.tools.length).toBeGreaterThan(0)
      // the target, the surface and the world use never change with age
      expect(child.target).toEqual(recipe.target)
      expect(teen.surface).toBe(recipe.surface)
      expect(adult.output).toEqual(recipe.output)
      expect(child.id).toBe(recipe.id)
    }
  })

  it('gives a child snap, hints and a wider brush, and never a timer', () => {
    for (const recipe of Object.values(CRAFT_RECIPES)) {
      const child = recipeForLevel(recipe, 'child')
      expect(child.constraints?.snap ?? 0).toBeGreaterThan(0)
      expect(child.constraints?.hints).toBe(true)
      expect(child.constraints?.brush ?? 1).toBeGreaterThan(1)
      expect(child.constraints?.timePressure).toBe(false)
      const teen = recipeForLevel(recipe, 'teen')
      const adult = recipeForLevel(recipe, 'adult')
      expect(teen.constraints?.snap ?? 0).toBe(0)
      expect(adult.constraints?.timePressure).toBe(false)
      // a teen's timer only where the recipe allows one
      expect(teen.constraints?.timePressure).toBe(recipe.constraints?.timePressure === true)
    }
    expect(recipeForLevel(CRAFT_RECIPES['derby-confetti']!, 'teen').constraints?.timePressure).toBe(true)
    expect(recipeForLevel(CRAFT_RECIPES['fan-shirt-first']!, 'teen').constraints?.timePressure).toBe(false)
  })

  it('does not mutate the registry', () => {
    const before = JSON.stringify(CRAFT_RECIPES)
    for (const recipe of Object.values(CRAFT_RECIPES)) for (const level of ['child', 'teen', 'adult'] as const) recipeForLevel(recipe, level)
    expect(JSON.stringify(CRAFT_RECIPES)).toBe(before)
  })
})

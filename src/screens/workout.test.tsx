import { fieldsFor, loadExercises, parseMark, setLine } from '../data/exercise'
import type { Exercise } from '../data/exercise'
import { ensureSeeded } from '../data/store'

const named = (name: string): Exercise => {
  const exercise = loadExercises().exercises.find((item) => item.name === name)
  if (exercise === undefined) throw new Error(`no seeded exercise named ${name}`)
  return exercise
}

beforeEach(() => {
  localStorage.clear()
  ensureSeeded()
})

describe('the next-time mark', () => {
  it('reads a trailing sign off the number, however many times it was typed', () => {
    expect(parseMark('47.5+')).toEqual({ value: 47.5, mark: 'more' })
    expect(parseMark('30--')).toEqual({ value: 30, mark: 'less' })
    expect(parseMark('30')).toEqual({ value: 30, mark: 'same' })
    expect(parseMark('')).toEqual({ value: null, mark: 'same' })
  })

  it('keeps a negative number, which is what an assisted set is written as', () => {
    expect(parseMark('-20')).toEqual({ value: -20, mark: 'same' })
  })

  it('records an unreadable box as blank rather than refusing it', () => {
    expect(parseMark('4 2')).toEqual({ value: null, mark: 'same' })
  })
})

describe('the exercise library', () => {
  it('takes its field list from the kind, and never from source', () => {
    expect(fieldsFor(named('chest press')).map((field) => field.name)).toEqual(['weight', 'reps'])
    expect(fieldsFor(named('run · river path')).map((field) => field.name)).toEqual([
      'distance',
      'duration',
      'incline',
    ])
  })

  it('lets one exercise override its kind, for the one that needs both', () => {
    const rowing = named('rowing machine')
    expect(rowing.kind).toBe('machine')
    expect(fieldsFor(rowing).map((field) => field.unit)).toContain('m')
  })

  it('covers every body part and every kind it ships', () => {
    const { exercises, kinds } = loadExercises()
    expect(new Set(exercises.map((item) => item.body_part))).toEqual(
      new Set(['abdomen', 'back', 'chest', 'hands', 'heartrate', 'legs', 'shoulders']),
    )
    expect(new Set(exercises.map((item) => item.kind))).toEqual(new Set(Object.keys(kinds)))
  })

  it('writes a set out with the separators the seed carries, skipping blanks', () => {
    const run = named('run · river path')
    expect(setLine({ distance: 5, duration: 28, incline: 2, mark: 'same' }, fieldsFor(run))).toBe(
      '5 km / 28 min @ 2 %',
    )
    expect(setLine({ distance: 4, duration: 26, incline: null, mark: 'more' }, fieldsFor(run))).toBe(
      '4 km / 26 min',
    )
    expect(setLine({ weight: 47.5, reps: 10, mark: 'more' }, fieldsFor(named('chest press')))).toBe(
      '47.5 kg × 10',
    )
  })
})

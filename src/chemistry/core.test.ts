import { describe, expect, it } from 'vitest'
import en from '@/i18n/dictionaries/en.json'
import { balance, ChemError, ELEMENTS, idealGas, molarMass, parseFormula, tablePosition } from './core'

describe('elements', () => {
  it('has all 118 elements with unique table cells', () => {
    expect(ELEMENTS).toHaveLength(118)
    const cells = new Set(ELEMENTS.map((e) => JSON.stringify(tablePosition(e))))
    expect(cells.size).toBe(118)
  })
  it('has an English name for every element', () => {
    const names = en.chemistry.elements as Record<string, string>
    expect(ELEMENTS.filter((e) => !names[e.symbol]).map((e) => e.symbol)).toEqual([])
  })
  it('categorises a few elements', () => {
    const cat = (s: string) => ELEMENTS.find((e) => e.symbol === s)!.category
    expect([cat('Na'), cat('Fe'), cat('Cl'), cat('Ar'), cat('Si'), cat('U')]).toEqual([
      'alkali',
      'transition',
      'halogen',
      'noble',
      'metalloid',
      'actinide',
    ])
  })
})

describe('formulas', () => {
  it.each([
    ['H2O', 18.015],
    ['Ca(OH)2', 74.092],
    ['CuSO4·5H2O', 249.68],
    ['K4[Fe(CN)6]', 368.35],
    ['C6H12O6', 180.156],
  ])('M(%s) ≈ %f', (f, m) => expect(molarMass(f).molarMass).toBeCloseTo(m, 1))

  it('counts nested groups', () => {
    expect(Object.fromEntries(parseFormula('Al2(SO4)3'))).toEqual({ Al: 2, S: 3, O: 12 })
  })
  it('converts grams to moles', () => {
    const r = molarMass('H2O', '18.015')
    expect(r.sample!.moles).toBeCloseTo(1, 3)
  })
  it('rejects unknown elements', () => {
    expect(() => parseFormula('Xx2')).toThrow(ChemError)
    expect(() => parseFormula('Ca(OH')).toThrow('Unbalanced brackets')
  })
})

describe('balancing', () => {
  const coefs = (eq: string) => {
    const r = balance(eq)
    return [...r.reactants, ...r.products].map((s) => s.coefficient)
  }
  it.each([
    ['H2 + O2 -> H2O', [2, 1, 2]],
    ['C3H8 + O2 -> CO2 + H2O', [1, 5, 3, 4]],
    ['Fe + O2 = Fe2O3', [4, 3, 2]],
    ['KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2', [2, 16, 2, 2, 8, 5]],
    ['2H2O → H2 + O2', [2, 2, 1]],
  ])('%s', (eq, want) => expect(coefs(eq)).toEqual(want))

  it('formats the balanced equation', () => expect(balance('H2 + O2 -> H2O').equation).toBe('2H2 + O2 → 2H2O'))
  it('accepts subscript digits from the keypad', () => expect(coefs('C₃H₈ + O₂ → CO₂ + H₂O')).toEqual([1, 5, 3, 4]))
  it('conserves mass', () => {
    const { mass } = balance('KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2')
    expect(mass.left).toBeCloseTo(mass.right, 9)
    expect(balance('H2 + O2 -> H2O').reactants[1].molarMass).toBeCloseTo(31.998, 3)
  })
  it('reports impossible equations', () => expect(() => balance('H2O -> H2O2')).toThrow('cannot be balanced'))
  it('reports an element on one side', () => expect(() => balance('H2 -> O2')).toThrow('only one side'))
})

describe('ideal gas', () => {
  it('molar volume at STP ≈ 22.414 L', () => {
    const r = idealGas({ P: '1', V: '', n: '1', T: '273.15', pUnit: 'atm', tUnit: 'K' })
    expect(r.values.V).toBeCloseTo(22.414, 3)
  })
  it('solves for temperature in °C with kPa', () => {
    const r = idealGas({ P: '101.325', V: '22.414', n: '1', T: '', pUnit: 'kPa', tUnit: 'C' })
    expect(r.values.T).toBeCloseTo(0, 1)
  })
  it('needs exactly one unknown', () => {
    expect(() => idealGas({ P: '1', V: '1', n: '1', T: '1', pUnit: 'atm', tUnit: 'K' })).toThrow(ChemError)
  })
})

/**
 * Pure chemistry engine: element data, formula parsing, equation balancing and gas laws.
 * Problems are thrown as `ChemError` with a stable `code` that the UI translates.
 */

// ───────────────────────────── errors ─────────────────────────────

export type ChemErrorCode =
  | 'emptyFormula'
  | 'unknownElement'
  | 'badFormula'
  | 'unbalancedParen'
  | 'noArrow'
  | 'emptySide'
  | 'cannotBalance'
  | 'ambiguousBalance'
  | 'elementOneSide'
  | 'gasUnknowns'
  | 'gasBadValue'

const MESSAGES: Record<ChemErrorCode, string> = {
  emptyFormula: 'Enter a formula',
  unknownElement: 'Unknown element "{symbol}"',
  badFormula: 'Unexpected "{char}" at position {pos}',
  unbalancedParen: 'Unbalanced brackets',
  noArrow: 'Separate reactants and products with -> or =',
  emptySide: 'Both sides need at least one species',
  cannotBalance: 'This equation cannot be balanced',
  ambiguousBalance: 'This equation has more than one independent balance',
  elementOneSide: 'Element {symbol} appears on only one side',
  gasUnknowns: 'Leave exactly one quantity empty',
  gasBadValue: '"{value}" is not a valid positive number',
}

export class ChemError extends Error {
  readonly code: ChemErrorCode
  readonly params: Record<string, string | number>
  constructor(code: ChemErrorCode, params: Record<string, string | number> = {}) {
    super(MESSAGES[code].replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? '')))
    this.name = 'ChemError'
    this.code = code
    this.params = params
  }
}

// ───────────────────────────── elements ─────────────────────────────

export type Category =
  | 'alkali'
  | 'alkaline'
  | 'transition'
  | 'postTransition'
  | 'metalloid'
  | 'nonmetal'
  | 'halogen'
  | 'noble'
  | 'lanthanide'
  | 'actinide'

export interface Element {
  z: number
  symbol: string
  /** Standard atomic weight (g/mol); mass number of the most stable isotope for radioactive elements. */
  mass: number
  /** 1–18, or null for the f-block. */
  group: number | null
  period: number
  category: Category
}

// [symbol, mass, group] in order of atomic number; f-block elements have group 0.
const RAW: [string, number, number][] = [
  ['H', 1.008, 1], ['He', 4.0026, 18],
  ['Li', 6.94, 1], ['Be', 9.0122, 2], ['B', 10.81, 13], ['C', 12.011, 14], ['N', 14.007, 15], ['O', 15.999, 16], ['F', 18.998, 17], ['Ne', 20.18, 18],
  ['Na', 22.99, 1], ['Mg', 24.305, 2], ['Al', 26.982, 13], ['Si', 28.085, 14], ['P', 30.974, 15], ['S', 32.06, 16], ['Cl', 35.45, 17], ['Ar', 39.95, 18],
  ['K', 39.098, 1], ['Ca', 40.078, 2], ['Sc', 44.956, 3], ['Ti', 47.867, 4], ['V', 50.942, 5], ['Cr', 51.996, 6], ['Mn', 54.938, 7], ['Fe', 55.845, 8],
  ['Co', 58.933, 9], ['Ni', 58.693, 10], ['Cu', 63.546, 11], ['Zn', 65.38, 12], ['Ga', 69.723, 13], ['Ge', 72.63, 14], ['As', 74.922, 15], ['Se', 78.971, 16],
  ['Br', 79.904, 17], ['Kr', 83.798, 18],
  ['Rb', 85.468, 1], ['Sr', 87.62, 2], ['Y', 88.906, 3], ['Zr', 91.224, 4], ['Nb', 92.906, 5], ['Mo', 95.95, 6], ['Tc', 98, 7], ['Ru', 101.07, 8],
  ['Rh', 102.91, 9], ['Pd', 106.42, 10], ['Ag', 107.87, 11], ['Cd', 112.41, 12], ['In', 114.82, 13], ['Sn', 118.71, 14], ['Sb', 121.76, 15], ['Te', 127.6, 16],
  ['I', 126.9, 17], ['Xe', 131.29, 18],
  ['Cs', 132.91, 1], ['Ba', 137.33, 2],
  ['La', 138.91, 0], ['Ce', 140.12, 0], ['Pr', 140.91, 0], ['Nd', 144.24, 0], ['Pm', 145, 0], ['Sm', 150.36, 0], ['Eu', 151.96, 0], ['Gd', 157.25, 0],
  ['Tb', 158.93, 0], ['Dy', 162.5, 0], ['Ho', 164.93, 0], ['Er', 167.26, 0], ['Tm', 168.93, 0], ['Yb', 173.05, 0], ['Lu', 174.97, 0],
  ['Hf', 178.49, 4], ['Ta', 180.95, 5], ['W', 183.84, 6], ['Re', 186.21, 7], ['Os', 190.23, 8], ['Ir', 192.22, 9], ['Pt', 195.08, 10], ['Au', 196.97, 11],
  ['Hg', 200.59, 12], ['Tl', 204.38, 13], ['Pb', 207.2, 14], ['Bi', 208.98, 15], ['Po', 209, 16], ['At', 210, 17], ['Rn', 222, 18],
  ['Fr', 223, 1], ['Ra', 226, 2],
  ['Ac', 227, 0], ['Th', 232.04, 0], ['Pa', 231.04, 0], ['U', 238.03, 0], ['Np', 237, 0], ['Pu', 244, 0], ['Am', 243, 0], ['Cm', 247, 0],
  ['Bk', 247, 0], ['Cf', 251, 0], ['Es', 252, 0], ['Fm', 257, 0], ['Md', 258, 0], ['No', 259, 0], ['Lr', 266, 0],
  ['Rf', 267, 4], ['Db', 268, 5], ['Sg', 269, 6], ['Bh', 270, 7], ['Hs', 269, 8], ['Mt', 278, 9], ['Ds', 281, 10], ['Rg', 282, 11],
  ['Cn', 285, 12], ['Nh', 286, 13], ['Fl', 289, 14], ['Mc', 290, 15], ['Lv', 293, 16], ['Ts', 294, 17], ['Og', 294, 18],
]

const METALLOIDS = new Set(['B', 'Si', 'Ge', 'As', 'Sb', 'Te'])
const NONMETALS = new Set(['H', 'C', 'N', 'O', 'P', 'S', 'Se'])

function periodOf(z: number): number {
  return z <= 2 ? 1 : z <= 10 ? 2 : z <= 18 ? 3 : z <= 36 ? 4 : z <= 54 ? 5 : z <= 86 ? 6 : 7
}

function categoryOf(symbol: string, z: number, group: number): Category {
  if (z >= 57 && z <= 71) return 'lanthanide'
  if (z >= 89 && z <= 103) return 'actinide'
  if (METALLOIDS.has(symbol)) return 'metalloid'
  if (NONMETALS.has(symbol)) return 'nonmetal'
  if (group === 1) return 'alkali'
  if (group === 2) return 'alkaline'
  if (group >= 3 && group <= 12) return 'transition'
  if (group === 17) return 'halogen'
  if (group === 18) return 'noble'
  return 'postTransition'
}

export const ELEMENTS: Element[] = RAW.map(([symbol, mass, group], i) => ({
  z: i + 1,
  symbol,
  mass,
  group: group || null,
  period: periodOf(i + 1),
  category: categoryOf(symbol, i + 1, group),
}))

export const BY_SYMBOL = new Map(ELEMENTS.map((e) => [e.symbol, e]))

/** Position in an 18-column table; the f-block goes in two extra rows (8 and 9) under it. */
export function tablePosition(e: Element): { row: number; col: number } {
  if (e.group) return { row: e.period, col: e.group }
  const first = e.category === 'lanthanide' ? 57 : 89
  return { row: e.category === 'lanthanide' ? 8 : 9, col: 3 + e.z - first }
}

// ───────────────────────────── formulas ─────────────────────────────

/** Turn Unicode subscript digits (H₂O) into plain digits (H2O). */
export function normalizeSubscripts(s: string): string {
  return s.replace(/[₀-₉]/g, (c) => String(c.charCodeAt(0) - 0x2080))
}

/** Element symbol → count, in order of first appearance. */
export type Composition = Map<string, number>

function addInto(target: Composition, source: Composition, factor: number): void {
  for (const [el, n] of source) target.set(el, (target.get(el) ?? 0) + n * factor)
}

/**
 * Parse a formula like `H2O`, `Ca(OH)2`, `K4[Fe(CN)6]` or a hydrate `CuSO4·5H2O`.
 * A leading number is a coefficient (`2H2O`).
 */
export function parseFormula(src: string): Composition {
  const s = normalizeSubscripts(src).replace(/\s+/g, '')
  if (!s) throw new ChemError('emptyFormula')
  let i = 0

  const number = (): number | null => {
    const m = /^\d+/.exec(s.slice(i))
    if (!m) return null
    i += m[0].length
    return Number(m[0])
  }

  const sequence = (close: string | null): Composition => {
    const out: Composition = new Map()
    while (i < s.length) {
      const c = s[i]
      if (c === ')' || c === ']') {
        if (c !== close) throw new ChemError('unbalancedParen')
        return out
      }
      if (c === '(' || c === '[') {
        i++
        const inner = sequence(c === '(' ? ')' : ']')
        if (i >= s.length) throw new ChemError('unbalancedParen')
        i++ // closing bracket
        addInto(out, inner, number() ?? 1)
        continue
      }
      const m = /^[A-Z][a-z]*/.exec(s.slice(i))
      if (!m) {
        if ('·*.'.includes(c)) break
        throw new ChemError('badFormula', { char: c, pos: i + 1 })
      }
      if (!BY_SYMBOL.has(m[0])) throw new ChemError('unknownElement', { symbol: m[0] })
      i += m[0].length
      const n = number() ?? 1
      out.set(m[0], (out.get(m[0]) ?? 0) + n)
    }
    if (close) throw new ChemError('unbalancedParen')
    return out
  }

  const total: Composition = new Map()
  while (i < s.length) {
    const coef = number() ?? 1
    addInto(total, sequence(null), coef)
    if (i < s.length) {
      if (!'·*.'.includes(s[i])) throw new ChemError('badFormula', { char: s[i], pos: i + 1 })
      i++
    }
  }
  if (!total.size) throw new ChemError('emptyFormula')
  return total
}

export interface MolarMassReport {
  formula: string
  molarMass: number
  parts: { symbol: string; count: number; mass: number; percent: number }[]
  /** Present when a sample mass was given. */
  sample?: { grams: number; moles: number; particles: number }
}

export const AVOGADRO = 6.02214076e23

export function molarMass(formula: string, grams = ''): MolarMassReport {
  const comp = parseFormula(formula)
  const parts = [...comp].map(([symbol, count]) => ({ symbol, count, mass: count * BY_SYMBOL.get(symbol)!.mass, percent: 0 }))
  const total = parts.reduce((s, p) => s + p.mass, 0)
  for (const p of parts) p.percent = (100 * p.mass) / total
  const report: MolarMassReport = { formula: formula.trim(), molarMass: total, parts }
  if (grams.trim()) {
    const g = positive(grams)
    report.sample = { grams: g, moles: g / total, particles: (g / total) * AVOGADRO }
  }
  return report
}

// ───────────────────────────── equation balancing ─────────────────────────────

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))

/** Exact rational arithmetic, enough for small stoichiometry matrices. */
class Frac {
  readonly n: number
  readonly d: number
  constructor(n: number, d = 1) {
    if (d < 0) {
      n = -n
      d = -d
    }
    const g = gcd(n, d) || 1
    this.n = n / g
    this.d = d / g
  }
  sub(o: Frac) {
    return new Frac(this.n * o.d - o.n * this.d, this.d * o.d)
  }
  mul(o: Frac) {
    return new Frac(this.n * o.n, this.d * o.d)
  }
  div(o: Frac) {
    return new Frac(this.n * o.d, this.d * o.n)
  }
  get zero() {
    return this.n === 0
  }
}

export interface Species {
  formula: string
  coefficient: number
  composition: Composition
  /** g/mol */
  molarMass: number
}

export interface BalanceReport {
  reactants: Species[]
  products: Species[]
  equation: string
  /** Atom counts per element on each side, for the check table. */
  check: { symbol: string; left: number; right: number }[]
  /** Total mass (g) on each side when each coefficient is read as moles. */
  mass: { left: number; right: number }
}

const ARROW = /\s*(?:<=>|<->|->|=>|→|⟶|=)\s*/

/** Strip a user-written leading coefficient: "2H2O" → "H2O". */
const stripCoef = (s: string) => s.trim().replace(/^\d+\s*/, '')

export function balance(equation: string): BalanceReport {
  const sides = normalizeSubscripts(equation).split(ARROW)
  if (sides.length !== 2) throw new ChemError('noArrow')
  const [left, right] = sides.map((side) => side.split('+').map(stripCoef).filter(Boolean))
  if (!left.length || !right.length) throw new ChemError('emptySide')

  const species = [...left, ...right]
  const comps = species.map(parseFormula)
  const elements: string[] = []
  for (const c of comps) for (const el of c.keys()) if (!elements.includes(el)) elements.push(el)
  for (const el of elements) {
    const inLeft = comps.slice(0, left.length).some((c) => c.has(el))
    const inRight = comps.slice(left.length).some((c) => c.has(el))
    if (inLeft !== inRight) throw new ChemError('elementOneSide', { symbol: el })
  }

  // Rows: elements; columns: species (products negated). Solve A·x = 0.
  const cols = species.length
  const m: Frac[][] = elements.map((el) => comps.map((c, j) => new Frac((c.get(el) ?? 0) * (j < left.length ? 1 : -1))))

  // Reduced row echelon form.
  const pivots: number[] = []
  let row = 0
  for (let col = 0; col < cols && row < m.length; col++) {
    const p = m.findIndex((r, i) => i >= row && !r[col].zero)
    if (p < 0) continue
    ;[m[row], m[p]] = [m[p], m[row]]
    const pv = m[row][col]
    m[row] = m[row].map((x) => x.div(pv))
    for (let i = 0; i < m.length; i++) {
      if (i === row || m[i][col].zero) continue
      const f = m[i][col]
      m[i] = m[i].map((x, j) => x.sub(f.mul(m[row][j])))
    }
    pivots.push(col)
    row++
  }
  const free = [...Array(cols).keys()].filter((c) => !pivots.includes(c))
  if (free.length === 0) throw new ChemError('cannotBalance')
  if (free.length > 1) throw new ChemError('ambiguousBalance')

  // Free variable = 1; pivot variables follow from their rows.
  const f = free[0]
  const x: Frac[] = Array.from({ length: cols }, () => new Frac(0))
  x[f] = new Frac(1)
  pivots.forEach((col, r) => (x[col] = new Frac(0).sub(m[r][f])))
  const lcm = x.reduce((l, q) => (l * q.d) / gcd(l, q.d), 1)
  let ints = x.map((q) => (q.n * lcm) / q.d)
  if (ints.every((v) => v <= 0)) ints = ints.map((v) => -v)
  if (ints.some((v) => v <= 0)) throw new ChemError('cannotBalance')
  const g = ints.reduce(gcd)
  ints = ints.map((v) => v / g)

  const massOf = (c: Composition) => [...c].reduce((s, [el, n]) => s + n * BY_SYMBOL.get(el)!.mass, 0)
  const make = (formula: string, k: number): Species => ({
    formula,
    coefficient: ints[k],
    composition: comps[k],
    molarMass: massOf(comps[k]),
  })
  const reactants = left.map((s, k) => make(s, k))
  const products = right.map((s, k) => make(s, left.length + k))
  const side = (list: Species[]) => list.map((sp) => (sp.coefficient === 1 ? sp.formula : `${sp.coefficient}${sp.formula}`)).join(' + ')
  const totalMass = (list: Species[]) => list.reduce((s, sp) => s + sp.coefficient * sp.molarMass, 0)
  const count = (list: Species[], el: string) => list.reduce((s, sp) => s + sp.coefficient * (sp.composition.get(el) ?? 0), 0)
  return {
    reactants,
    products,
    equation: `${side(reactants)} → ${side(products)}`,
    check: elements.map((symbol) => ({ symbol, left: count(reactants, symbol), right: count(products, symbol) })),
    mass: { left: totalMass(reactants), right: totalMass(products) },
  }
}

// ───────────────────────────── ideal gas law ─────────────────────────────

export type PressureUnit = 'atm' | 'kPa' | 'mmHg'
export type TemperatureUnit = 'K' | 'C'
export type GasQuantity = 'P' | 'V' | 'n' | 'T'

/** L·atm/(mol·K) */
export const R = 0.082057366

const ATM_PER: Record<PressureUnit, number> = { atm: 1, kPa: 1 / 101.325, mmHg: 1 / 760 }

function positive(src: string): number {
  const v = Number(src.trim())
  if (!Number.isFinite(v) || v <= 0) throw new ChemError('gasBadValue', { value: src.trim() })
  return v
}

export interface GasInput {
  P: string
  V: string
  n: string
  T: string
  pUnit: PressureUnit
  tUnit: TemperatureUnit
}

export interface GasReport {
  solved: GasQuantity
  /** All four values in the input units (P in pUnit, V in L, n in mol, T in tUnit). */
  values: Record<GasQuantity, number>
}

/** Solve PV = nRT for whichever of P, V, n, T was left empty. */
export function idealGas(input: GasInput): GasReport {
  const keys: GasQuantity[] = ['P', 'V', 'n', 'T']
  const empty = keys.filter((k) => !input[k].trim())
  if (empty.length !== 1) throw new ChemError('gasUnknowns')
  const solved = empty[0]
  const toK = (t: number) => (input.tUnit === 'C' ? t + 273.15 : t)
  const fromK = (t: number) => (input.tUnit === 'C' ? t - 273.15 : t)
  const read = (k: GasQuantity): number => {
    if (k === 'T') {
      const raw = Number(input.T.trim())
      const kelvin = toK(raw)
      if (!Number.isFinite(raw) || kelvin <= 0) throw new ChemError('gasBadValue', { value: input.T.trim() })
      return kelvin
    }
    const v = positive(input[k])
    return k === 'P' ? v * ATM_PER[input.pUnit] : v
  }
  const si: Partial<Record<GasQuantity, number>> = {}
  for (const k of keys) if (k !== solved) si[k] = read(k)
  const { P, V, n, T } = si
  switch (solved) {
    case 'P':
      si.P = (n! * R * T!) / V!
      break
    case 'V':
      si.V = (n! * R * T!) / P!
      break
    case 'n':
      si.n = (P! * V!) / (R * T!)
      break
    case 'T':
      si.T = (P! * V!) / (n! * R)
      break
  }
  return {
    solved,
    values: { P: si.P! / ATM_PER[input.pUnit], V: si.V!, n: si.n!, T: fromK(si.T!) },
  }
}

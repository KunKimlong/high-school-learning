/**
 * Pure calculus engine. No React, no DOM — every topic is exposed as plain functions so it
 * can be unit-tested in isolation. User-facing problems are thrown as `CalcError` with a
 * stable `code` that the UI translates; the English `message` is a developer fallback.
 */
import * as math from 'mathjs'
import type { MathNode } from 'mathjs'

// ───────────────────────────── errors ─────────────────────────────

export type ErrorCode =
  | 'empty'
  | 'parse'
  | 'unknownSymbol'
  | 'unknownFunction'
  | 'badNumber'
  | 'badVariable'
  | 'duplicateVariable'
  | 'pointArity'
  | 'badStart'

const MESSAGES: Record<ErrorCode, string> = {
  empty: 'Enter an expression',
  parse: 'Could not parse: {detail}',
  unknownSymbol: 'Unknown symbol "{name}" — expected {expected}',
  unknownFunction: 'Unknown function "{name}"',
  badNumber: 'Not a number: "{value}"',
  badVariable: 'Invalid variable name "{name}"',
  duplicateVariable: 'Variable "{name}" is listed twice',
  pointArity: 'Expected {expected} coordinates, got {got}',
  badStart: 'The starting index must be an integer',
}

export type ErrorParams = Record<string, string | number>

export class CalcError extends Error {
  readonly code: ErrorCode
  readonly params: ErrorParams
  constructor(code: ErrorCode, params: ErrorParams = {}) {
    super(MESSAGES[code].replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? '')))
    this.name = 'CalcError'
    this.code = code
    this.params = params
  }
}

// ───────────────────────────── parsing ─────────────────────────────

const CONSTANTS: Record<string, number> = {
  e: Math.E,
  pi: Math.PI,
  i: NaN, // complex results are reported as NaN
  phi: (1 + Math.sqrt(5)) / 2,
  tau: 2 * Math.PI,
  Infinity: Infinity,
}

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/

/** Normalise user-friendly syntax before handing it to mathjs. */
export function preprocess(src: string): string {
  return src
    .replace(/(?<![A-Za-z0-9_])ln\s*\(/g, 'log(')
    .replace(/\*\*/g, '^')
    .replace(/π/g, 'pi')
    .replace(/∞/g, 'Infinity')
    .replace(/[−–]/g, '-')
    .replace(/[·×]/g, '*')
}

function validate(node: MathNode, vars: readonly string[]): void {
  node.traverse((n, path, parent) => {
    if (n.type === 'AssignmentNode' || n.type === 'FunctionAssignmentNode') {
      throw new CalcError('parse', { detail: 'assignments are not allowed' })
    }
    if (n.type !== 'SymbolNode') return
    const name = (n as math.SymbolNode).name
    if (parent?.type === 'FunctionNode' && path === 'fn') {
      if (!(name in FUNCS) && typeof (math as unknown as Record<string, unknown>)[name] !== 'function') {
        throw new CalcError('unknownFunction', { name })
      }
      return
    }
    if (vars.includes(name) || name in CONSTANTS) return
    throw new CalcError('unknownSymbol', { name, expected: vars.length ? vars.join(', ') : 'a number' })
  })
}

export function parseExpr(src: string, vars: readonly string[]): MathNode {
  if (!src.trim()) throw new CalcError('empty')
  let node: MathNode
  try {
    node = math.parse(preprocess(src))
  } catch (e) {
    throw new CalcError('parse', { detail: (e as Error).message })
  }
  validate(node, vars)
  return node
}

export function checkVariable(name: string): string {
  const v = name.trim()
  if (!IDENT.test(v) || v in CONSTANTS || v in FUNCS) throw new CalcError('badVariable', { name: v })
  return v
}

export function parseVariables(src: string): string[] {
  const vars = src.split(/[\s,]+/).filter(Boolean).map(checkVariable)
  if (!vars.length) throw new CalcError('badVariable', { name: src })
  for (let i = 0; i < vars.length; i++) {
    if (vars.indexOf(vars[i]) !== i) throw new CalcError('duplicateVariable', { name: vars[i] })
  }
  return vars
}

const INF_WORDS: Record<string, number> = {
  inf: Infinity,
  '+inf': Infinity,
  '-inf': -Infinity,
  '∞': Infinity,
  '+∞': Infinity,
  '-∞': -Infinity,
  '−∞': -Infinity,
  infinity: Infinity,
  '+infinity': Infinity,
  '-infinity': -Infinity,
}

/** Parse a point or bound: a number, a constant expression (`pi/2`) or an infinity keyword. */
export function parsePoint(src: string, allowInfinite = true): number {
  const s = src.trim()
  const word = INF_WORDS[s.toLowerCase().replace(/\s+/g, '')]
  if (word !== undefined) {
    if (!allowInfinite) throw new CalcError('badNumber', { value: s })
    return word
  }
  const v = compileNode(parseExpr(s, []), [])([])
  if (Number.isNaN(v) || (!allowInfinite && !Number.isFinite(v))) throw new CalcError('badNumber', { value: s })
  return v
}

export function parsePointList(src: string, expected: number): number[] {
  const parts = src.split(',').map((p) => p.trim())
  if (parts.length !== expected) throw new CalcError('pointArity', { expected, got: parts.length })
  return parts.map((p) => parsePoint(p, false))
}

// ───────────────────────────── fast compiler ─────────────────────────────
// mathjs' evaluate is too slow for 10⁵-term series and nested quadrature, so supported
// nodes are compiled into plain closures. Anything unusual falls back to mathjs.

type Ev = (a: ArrayLike<number>) => number

const FACT: number[] = [1]
for (let k = 1; k <= 170; k++) FACT[k] = FACT[k - 1] * k

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
]

function gamma(z: number): number {
  if (Number.isInteger(z)) {
    if (z <= 0) return NaN
    return z > 171 ? Infinity : FACT[z - 1]
  }
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z))
  z -= 1
  let x = LANCZOS[0]
  for (let i = 1; i < 9; i++) x += LANCZOS[i] / (z + i)
  const t = z + 7.5
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x
}

function factorial(n: number): number {
  if (Number.isInteger(n)) {
    if (n < 0) return NaN
    return n > 170 ? Infinity : FACT[n]
  }
  return gamma(n + 1)
}

const FUNCS: Record<string, (...x: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sec: (x) => 1 / Math.cos(x),
  csc: (x) => 1 / Math.sin(x),
  cot: (x) => 1 / Math.tan(x),
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  asec: (x) => Math.acos(1 / x),
  acsc: (x) => Math.asin(1 / x),
  acot: (x) => Math.atan(1 / x),
  atan2: Math.atan2,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  sech: (x) => 1 / Math.cosh(x),
  csch: (x) => 1 / Math.sinh(x),
  coth: (x) => 1 / Math.tanh(x),
  asinh: Math.asinh,
  acosh: Math.acosh,
  atanh: Math.atanh,
  exp: Math.exp,
  expm1: Math.expm1,
  log: (x, b) => (b === undefined ? Math.log(x) : Math.log(x) / Math.log(b)),
  log10: Math.log10,
  log2: Math.log2,
  log1p: Math.log1p,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  nthRoot: (x, n = 2) => (x < 0 && Math.abs(n % 2) === 1 ? -Math.pow(-x, 1 / n) : Math.pow(x, 1 / n)),
  pow: Math.pow,
  square: (x) => x * x,
  cube: (x) => x * x * x,
  abs: Math.abs,
  sign: Math.sign,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  fix: Math.trunc,
  mod: (x, y) => (y === 0 ? x : x - y * Math.floor(x / y)),
  max: Math.max,
  min: Math.min,
  hypot: Math.hypot,
  gamma,
  factorial,
}

const OPS: Record<string, (...x: number[]) => number> = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
  multiply: (a, b) => a * b,
  divide: (a, b) => a / b,
  pow: Math.pow,
  unaryMinus: (a) => -a,
  unaryPlus: (a) => a,
  mod: FUNCS.mod,
  factorial,
}

function toNumber(v: unknown): number {
  return typeof v === 'number' ? v : NaN
}

function fallback(node: MathNode, vars: readonly string[]): Ev {
  const code = node.compile()
  return (a) => {
    const scope: Record<string, number> = {}
    vars.forEach((v, i) => (scope[v] = a[i]))
    try {
      return toNumber(code.evaluate(scope))
    } catch {
      return NaN
    }
  }
}

function applyN(fn: (...x: number[]) => number, args: Ev[]): Ev {
  switch (args.length) {
    case 1: {
      const [p] = args
      return (a) => fn(p(a))
    }
    case 2: {
      const [p, q] = args
      return (a) => fn(p(a), q(a))
    }
    default:
      return (a) => fn(...args.map((g) => g(a)))
  }
}

export function compileNode(node: MathNode, vars: readonly string[]): Ev {
  switch (node.type) {
    case 'ConstantNode': {
      const v = toNumber((node as math.ConstantNode).value)
      return () => v
    }
    case 'SymbolNode': {
      const name = (node as math.SymbolNode).name
      const idx = vars.indexOf(name)
      if (idx >= 0) return (a) => a[idx]
      const c = CONSTANTS[name]
      return () => (c === undefined ? NaN : c)
    }
    case 'ParenthesisNode':
      return compileNode((node as math.ParenthesisNode).content, vars)
    case 'OperatorNode': {
      const op = node as math.OperatorNode
      const fn = OPS[op.fn]
      if (!fn || (op.fn !== 'unaryMinus' && op.fn !== 'unaryPlus' && op.fn !== 'factorial' && op.args.length !== 2)) {
        if ((op.fn === 'add' || op.fn === 'multiply') && op.args.length > 2) {
          const parts = op.args.map((n) => compileNode(n, vars))
          return op.fn === 'add'
            ? (a) => parts.reduce((s, g) => s + g(a), 0)
            : (a) => parts.reduce((s, g) => s * g(a), 1)
        }
        return fallback(node, vars)
      }
      return applyN(
        fn,
        op.args.map((n) => compileNode(n, vars)),
      )
    }
    case 'FunctionNode': {
      const fnNode = node as math.FunctionNode
      const fn = FUNCS[fnNode.fn.name]
      if (!fn) return fallback(node, vars)
      return applyN(
        fn,
        fnNode.args.map((n) => compileNode(n, vars)),
      )
    }
    default:
      return fallback(node, vars)
  }
}

/** Compile a one-variable expression into a fast `(x) => number`. */
export function compile1(src: string | MathNode, v: string): (x: number) => number {
  const node = typeof src === 'string' ? parseExpr(src, [v]) : src
  const ev = compileNode(node, [v])
  const buf = [0]
  return (x) => {
    buf[0] = x
    return ev(buf)
  }
}

/** Compile a multi-variable expression into `(args) => number`. */
export function compileN(src: string | MathNode, vars: readonly string[]): (args: ArrayLike<number>) => number {
  const node = typeof src === 'string' ? parseExpr(src, vars) : src
  return compileNode(node, vars)
}

// ───────────────────────────── formatting ─────────────────────────────

const RECOG: [number, string][] = [
  [1, ''],
  [Math.PI, 'π'],
  [Math.E, 'e'],
  [Math.SQRT2, '√2'],
  [Math.sqrt(3), '√3'],
  [Math.sqrt(5), '√5'],
  [Math.LN2, 'ln 2'],
  [Math.log(3), 'ln 3'],
  [Math.LN10, 'ln 10'],
  [Math.sqrt(Math.PI), '√π'],
  [Math.PI * Math.PI, 'π²'],
]

const near = (x: number, v: number) => Math.abs(x - v) <= 1e-6 * Math.abs(v)
const wordy = (s: string) => /^[a-z]/.test(s)

/** Turn a float into a closed form like `π²/6`, `3√2/2` or `1/e` when one is close enough. */
export function recognize(v: number): string {
  if (Number.isNaN(v)) return 'NaN'
  if (v === Infinity) return '∞'
  if (v === -Infinity) return '−∞'
  if (Math.abs(v) < 1e-6) return '0'
  for (const [c, s] of RECOG) {
    for (let q = 1; q <= 12; q++) {
      const p = Math.round((v * q) / c)
      if (p === 0 || Math.abs(p) > 1000 || !near((p * c) / q, v)) continue
      if (!s) return q === 1 ? `${p}` : `${p}/${q}`
      const coef = p === 1 ? '' : p === -1 ? '-' : `${p}`
      const num = coef + (coef && coef !== '-' && wordy(s) ? '·' : '') + s
      return q === 1 ? num : `${num}/${q}`
    }
  }
  for (const [c, s] of RECOG.slice(1)) {
    for (let q = 1; q <= 12; q++) {
      const p = Math.round(v * q * c)
      if (p === 0 || Math.abs(p) > 1000 || !near(p / (q * c), v)) continue
      const den = q === 1 ? s : `${q}${wordy(s) ? '·' : ''}${s}`
      return `${p}/${q > 1 || s.includes(' ') ? `(${den})` : den}`
    }
  }
  return String(Number(v.toPrecision(8)))
}

/** Compact number formatting for tables and labels. */
export function fmt(v: number, digits = 6): string {
  if (Number.isNaN(v)) return '—'
  if (v === Infinity) return '∞'
  if (v === -Infinity) return '−∞'
  if (v === 0) return '0'
  const a = Math.abs(v)
  if (a >= 1e6 || a < 1e-4) return v.toExponential(digits - 1).replace(/\.?0+e/, 'e')
  return String(Number(v.toPrecision(digits)))
}

const isAtomic = (n: MathNode) =>
  n.type === 'SymbolNode' ||
  n.type === 'FunctionNode' ||
  n.type === 'ParenthesisNode' ||
  (n.type === 'ConstantNode' && typeof (n as math.ConstantNode).value === 'number' && (n as math.ConstantNode).value >= 0)

const prettyOptions: { handler: (node: MathNode, options: object) => string | undefined } = {
  handler(node, options) {
    if (node.type === 'OperatorNode') {
      const op = node as math.OperatorNode
      if (op.op === '^' && op.args.length === 2) {
        const wrap = (n: MathNode) => (isAtomic(n) ? n.toString(options) : `(${n.toString(options)})`)
        return `${wrap(op.args[0])}^${wrap(op.args[1])}`
      }
    }
    if (node.type === 'FunctionNode') {
      const fn = node as math.FunctionNode
      if (fn.fn.name === 'log' && fn.args.length === 1) return `ln(${fn.args[0].toString(options)})`
    }
    return undefined
  },
}

/** Readable form: `e^(x^2)` instead of `e ^ x ^ 2`, `ln(` instead of `log(`. */
export function pretty(node: MathNode): string {
  return node.toString(prettyOptions)
}

// ───────────────────────────── limits ─────────────────────────────

export type Side =
  | { kind: 'value'; value: number }
  | { kind: 'inf'; sign: 1 | -1 }
  | { kind: 'undefined' }
  | { kind: 'oscillates' }

export interface Sample {
  x: number
  y: number
}

/** Decide what one side of a sampled limit is doing. `ys` are ordered towards the limit point. */
export function analyzeSide(ys: readonly number[]): Side {
  const vals = ys.filter((y) => !Number.isNaN(y))
  if (!vals.length) return { kind: 'undefined' }

  // Earliest settled pair: later pairs may be ruined by floating-point cancellation.
  for (let i = 1; i < vals.length; i++) {
    const a = vals[i - 1]
    const b = vals[i]
    if (Number.isFinite(b) && Math.abs(b - a) / Math.max(1, Math.abs(b)) < 1e-7) return { kind: 'value', value: b }
  }

  // Slow geometric convergence (√x → 0): extrapolate with Aitken Δ².
  const fin = vals.filter(Number.isFinite)
  if (fin.length >= 7) {
    const t = fin.slice(-7)
    const d = t.slice(1).map((y, i) => y - t[i])
    const sameSign = d.every((x) => x > 0) || d.every((x) => x < 0)
    const shrinking = d.slice(1).every((x, i) => Math.abs(x / d[i]) < 0.8)
    if (sameSign && shrinking) {
      const [x0, x1, x2] = t.slice(-3)
      const den = x2 - 2 * x1 + x0
      return { kind: 'value', value: den === 0 ? x2 : x2 - ((x2 - x1) * (x2 - x1)) / den }
    }
  }

  // Divergence: magnitudes keep growing with a fixed sign.
  if (vals.length >= 4) {
    const t = vals.slice(-4)
    const sign = Math.sign(t[0])
    const growing = t.slice(1).every((y, i) => Math.abs(y) > Math.abs(t[i]) || (Math.abs(y) === Infinity && y === t[i]))
    if (sign !== 0 && t.every((y) => Math.sign(y) === sign) && growing && Math.abs(t[3]) > 10) {
      return { kind: 'inf', sign: sign as 1 | -1 }
    }
  }
  return { kind: 'oscillates' }
}

export type LimitReason = 'sidesDiffer' | 'oscillates' | 'leftUndefined' | 'rightUndefined'

export interface LimitResult {
  kind: 'value' | 'inf' | 'dne' | 'undefined'
  value?: number
  sign?: 1 | -1
  display: string
  reason?: LimitReason
}

export function sideToLimit(s: Side): LimitResult {
  switch (s.kind) {
    case 'value':
      return { kind: 'value', value: s.value, display: recognize(s.value) }
    case 'inf':
      return { kind: 'inf', sign: s.sign, value: s.sign * Infinity, display: s.sign > 0 ? '∞' : '−∞' }
    case 'undefined':
      return { kind: 'undefined', display: 'undefined' }
    case 'oscillates':
      return { kind: 'dne', display: 'DNE', reason: 'oscillates' }
  }
}

/** Combine two one-sided results into a two-sided limit. */
export function combineSides(left: Side, right: Side): LimitResult {
  if (left.kind === 'value' && right.kind === 'value') {
    const { value: l } = left
    const { value: r } = right
    if (Math.abs(l - r) <= 1e-5 * Math.max(1, Math.abs(l), Math.abs(r))) {
      const v = (l + r) / 2
      return { kind: 'value', value: v, display: recognize(v) }
    }
    return { kind: 'dne', display: 'DNE', reason: 'sidesDiffer' }
  }
  if (left.kind === 'inf' && right.kind === 'inf' && left.sign === right.sign) return sideToLimit(left)
  if (left.kind === 'undefined' && right.kind === 'undefined') return sideToLimit(left)
  if (left.kind === 'undefined') return { kind: 'dne', display: 'DNE', reason: 'leftUndefined' }
  if (right.kind === 'undefined') return { kind: 'dne', display: 'DNE', reason: 'rightUndefined' }
  if (left.kind === 'oscillates' || right.kind === 'oscillates') return { kind: 'dne', display: 'DNE', reason: 'oscillates' }
  return { kind: 'dne', display: 'DNE', reason: 'sidesDiffer' }
}

export type Direction = 'both' | 'left' | 'right'

function sampleSide(f: (x: number) => number, a: number, side: 1 | -1): Sample[] {
  const out: Sample[] = []
  if (!Number.isFinite(a)) {
    for (let k = 1; k <= 16; k++) {
      const x = Math.sign(a) * 10 ** k
      out.push({ x, y: f(x) })
    }
    return out
  }
  const scale = Math.max(1, Math.abs(a))
  for (let k = 1; k <= 12; k++) {
    const x = a + side * 10 ** -k * scale
    out.push({ x, y: f(x) })
  }
  return out
}

export interface LimitSide {
  side: 'left' | 'right'
  samples: Sample[]
  result: Side
}

export interface LimitReport {
  result: LimitResult
  point: number
  direction: Direction
  sides: LimitSide[]
  f: (x: number) => number
}

export function limitOf(f: (x: number) => number, a: number, direction: Direction): LimitReport {
  const sides: LimitSide[] = []
  if (!Number.isFinite(a)) {
    // x → +∞ is approached from the left, x → −∞ from the right.
    const samples = sampleSide(f, a, 1)
    sides.push({ side: a > 0 ? 'left' : 'right', samples, result: analyzeSide(samples.map((s) => s.y)) })
    return { result: sideToLimit(sides[0].result), point: a, direction, sides, f }
  }
  for (const side of ['left', 'right'] as const) {
    if (direction !== 'both' && direction !== side) continue
    const samples = sampleSide(f, a, side === 'left' ? -1 : 1)
    sides.push({ side, samples, result: analyzeSide(samples.map((s) => s.y)) })
  }
  const result = sides.length === 2 ? combineSides(sides[0].result, sides[1].result) : sideToLimit(sides[0].result)
  return { result, point: a, direction, sides, f }
}

export function limit(expr: string, variable: string, point: string, direction: Direction = 'both'): LimitReport {
  const v = checkVariable(variable)
  const f = compile1(expr, v)
  return limitOf(f, parsePoint(point), direction)
}

// ───────────────────────────── derivatives ─────────────────────────────

/** Central finite difference for orders 1–4. */
export function finiteDiff(f: (x: number) => number, order: number, x: number): number {
  const h = Math.pow(Number.EPSILON, 1 / (order + 2)) * Math.max(1, Math.abs(x))
  switch (order) {
    case 1:
      return (f(x + h) - f(x - h)) / (2 * h)
    case 2:
      return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h)
    case 3:
      return (f(x + 2 * h) - 2 * f(x + h) + 2 * f(x - h) - f(x - 2 * h)) / (2 * h ** 3)
    default:
      return (f(x + 2 * h) - 4 * f(x + h) + 6 * f(x) - 4 * f(x - h) + f(x - 2 * h)) / h ** 4
  }
}

function simplifySafe(node: MathNode): MathNode {
  try {
    return math.simplify(node)
  } catch {
    return node
  }
}

export interface Tangent {
  m: number
  b: number
  text: string
}

export function lineText(m: number, b: number): string {
  const mm = recognize(m)
  let s = mm === '0' ? '' : mm === '1' ? 'x' : mm === '-1' ? '−x' : `${mm.replace(/^-/, '−')}x`
  const bb = recognize(Math.abs(b))
  if (bb !== '0') s = s ? `${s} ${b < 0 ? '−' : '+'} ${bb}` : `${b < 0 ? '−' : ''}${bb}`
  return `y = ${s || '0'}`
}

export interface DerivativeReport {
  /** Pretty-printed f. */
  f: string
  /** Pretty-printed derivatives, index 0 = f′. Empty strings when only numeric. */
  exprs: string[]
  symbolic: boolean
  /** fns[0] = f, fns[k] = k-th derivative. */
  fns: ((x: number) => number)[]
  order: number
  at?: {
    a: number
    fa: number
    values: number[]
    tangent: Tangent | null
  }
}

export function derivative(expr: string, variable: string, order = 1, point = ''): DerivativeReport {
  const v = checkVariable(variable)
  const n = Math.min(4, Math.max(1, Math.round(order)))
  const node = parseExpr(expr, [v])
  const f = compile1(node, v)
  const fns: ((x: number) => number)[] = [f]
  const exprs: string[] = []
  let symbolic = true
  try {
    let cur = node
    for (let k = 1; k <= n; k++) {
      cur = simplifySafe(math.derivative(cur, v))
      exprs.push(pretty(cur))
      fns.push(compile1(cur, v))
    }
  } catch {
    symbolic = false
    exprs.length = 0
    fns.length = 1
    for (let k = 1; k <= n; k++) {
      fns.push((x) => finiteDiff(f, k, x))
      exprs.push('')
    }
  }
  const report: DerivativeReport = { f: pretty(node), exprs, symbolic, fns, order: n }
  if (point.trim()) {
    const a = parsePoint(point, false)
    const fa = f(a)
    const values = fns.slice(1).map((g) => g(a))
    const m = values[0]
    const tangent = Number.isFinite(m) && Number.isFinite(fa) ? { m, b: fa - m * a, text: lineText(m, fa - m * a) } : null
    report.at = { a, fa, values, tangent }
  }
  return report
}

// ───────────────────────────── quadrature ─────────────────────────────

const XGK = [
  0.991455371120812639206854697526329, 0.949107912342758524526189684047851, 0.864864423359769072789712788640926,
  0.741531185599394439863864773280788, 0.586087235467691130294144845693013, 0.405845151377397166906606412076961,
  0.207784955007898467600689403773245, 0,
]
const WGK = [
  0.02293532201052922496373200805897, 0.063092092629978553290700663189204, 0.104790010322250183839876322541518,
  0.140653259715525918745189590510238, 0.16900472663926790282658342659855, 0.190350578064785409913256402421014,
  0.204432940075298892414161999234649, 0.209482141084727828012999174891714,
]
const WG = [0.129484966168869693270611432679082, 0.27970539148927666790146777142378, 0.381830050505118944950369775488975, 0.417959183673469387755102040816327]

interface Piece {
  a: number
  b: number
  value: number
  error: number
  final: boolean
}

function gk15(g: (t: number) => number, a: number, b: number): { value: number; error: number } {
  const c = (a + b) / 2
  const h = (b - a) / 2
  const fc = g(c)
  let k = fc * WGK[7]
  let gauss = fc * WG[3]
  for (let j = 0; j < 7; j++) {
    const dx = h * XGK[j]
    const s = g(c - dx) + g(c + dx)
    k += WGK[j] * s
    if (j % 2 === 1) gauss += WG[(j - 1) / 2] * s
  }
  return { value: k * h, error: Math.abs((k - gauss) * h) }
}

export type QuadStatus = 'ok' | 'diverges' | 'undefined'

export interface QuadResult {
  value: number
  error: number
  evals: number
  status: QuadStatus
}

/** Map an (in)finite interval onto a finite one so the integrand stays finite. */
function mapInterval(f: (x: number) => number, a: number, b: number): [(t: number) => number, number, number] {
  if (Number.isFinite(a) && Number.isFinite(b)) return [f, a, b]
  // At the exact mapped endpoint return 0: convergent tails become integrable singularities.
  if (Number.isFinite(a)) {
    return [(t) => (t >= 1 ? 0 : guard(f(a + t / (1 - t)), 1 / ((1 - t) * (1 - t)))), 0, 1]
  }
  if (Number.isFinite(b)) {
    return [(t) => (t <= 0 ? 0 : guard(f(b - (1 - t) / t), 1 / (t * t))), 0, 1]
  }
  return [
    (t) => {
      if (Math.abs(t) >= 1) return 0
      const d = 1 - t * t
      return guard(f(t / d), (1 + t * t) / (d * d))
    },
    -1,
    1,
  ]
}

function guard(y: number, jac: number): number {
  if (!Number.isFinite(jac)) return 0
  return y === 0 ? 0 : y * jac
}

/** Adaptive global Gauss–Kronrod 7/15 with infinite-bound substitutions. */
export function quad(f: (x: number) => number, a: number, b: number, tol = 1e-10): QuadResult {
  if (Number.isNaN(a) || Number.isNaN(b)) return { value: NaN, error: NaN, evals: 0, status: 'undefined' }
  if (a === b) return { value: 0, error: 0, evals: 0, status: 'ok' }
  if (a > b) {
    const r = quad(f, b, a, tol)
    return { ...r, value: -r.value }
  }
  const [g, lo, hi] = mapInterval(f, a, b)
  const first = gk15(g, lo, hi)
  let evals = 15
  const pieces: Piece[] = [{ a: lo, b: hi, ...first, final: false }]
  let total = first.value
  let err = first.error

  for (let iter = 0; iter < 3000 && Number.isFinite(total); iter++) {
    if (err <= Math.max(tol, tol * Math.abs(total))) break
    let best = -1
    for (let i = 0; i < pieces.length; i++) {
      if (!pieces[i].final && (best < 0 || pieces[i].error > pieces[best].error)) best = i
    }
    if (best < 0) break
    const p = pieces[best]
    const m = (p.a + p.b) / 2
    if (p.b - p.a < 1e-14 * Math.max(1, Math.abs(m))) {
      p.final = true
      continue
    }
    const l = gk15(g, p.a, m)
    const r = gk15(g, m, p.b)
    evals += 30
    pieces[best] = { a: p.a, b: m, ...l, final: false }
    pieces.push({ a: m, b: p.b, ...r, final: false })
    total += l.value + r.value - p.value
    err += l.error + r.error - p.error
  }
  if (Number.isFinite(total)) {
    total = pieces.reduce((s, p) => s + p.value, 0)
    err = pieces.reduce((s, p) => s + p.error, 0)
  }
  return { value: total, error: err, evals, status: classify(total, err, tol) }
}

function classify(total: number, err: number, tol: number): QuadStatus {
  if (Number.isNaN(total) || Number.isNaN(err)) return Math.abs(total) === Infinity ? 'diverges' : 'undefined'
  if (!Number.isFinite(total)) return 'diverges'
  if (err > Math.max(1e-6, 100 * tol) * Math.max(1, Math.abs(total)) || Math.abs(total) > 1e12) return 'diverges'
  return 'ok'
}

export interface IntegralReport extends QuadResult {
  display: string
  a: number
  b: number
  f: (x: number) => number
}

export function integral(expr: string, variable: string, lower: string, upper: string): IntegralReport {
  const v = checkVariable(variable)
  const f = compile1(expr, v)
  const a = parsePoint(lower)
  const b = parsePoint(upper)
  const r = quad(f, a, b)
  return { ...r, display: r.status === 'ok' ? recognize(r.value) : '', a, b, f }
}

// ───────────────────────────── ODEs ─────────────────────────────

export interface OdePoint {
  x: number
  y: number
  yp?: number
}

export interface OdeReport {
  order: 1 | 2
  status: 'ok' | 'blowup'
  x0: number
  x1: number
  y?: number
  yp?: number
  error?: number
  blowX?: number
  display?: string
  points: OdePoint[]
  table: OdePoint[]
  /** Right-hand side f(x, y[, yp]). */
  f: (args: ArrayLike<number>) => number
}

function rk4(
  f: (args: ArrayLike<number>) => number,
  order: 1 | 2,
  x0: number,
  y0: number,
  p0: number,
  x1: number,
  n: number,
): { points: OdePoint[]; blowX?: number } {
  const h = (x1 - x0) / n
  let y = y0
  let p = p0
  const points: OdePoint[] = [order === 1 ? { x: x0, y } : { x: x0, y, yp: p }]
  const args = [0, 0, 0]
  const F = (x: number, yy: number, pp: number) => {
    args[0] = x
    args[1] = yy
    args[2] = pp
    return f(args)
  }
  for (let i = 0; i < n; i++) {
    const x = x0 + i * h
    if (order === 1) {
      const k1 = F(x, y, 0)
      const k2 = F(x + h / 2, y + (h / 2) * k1, 0)
      const k3 = F(x + h / 2, y + (h / 2) * k2, 0)
      const k4 = F(x + h, y + h * k3, 0)
      y += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4)
    } else {
      const k1y = p
      const k1p = F(x, y, p)
      const k2y = p + (h / 2) * k1p
      const k2p = F(x + h / 2, y + (h / 2) * k1y, k2y)
      const k3y = p + (h / 2) * k2p
      const k3p = F(x + h / 2, y + (h / 2) * k2y, k3y)
      const k4y = p + h * k3p
      const k4p = F(x + h, y + h * k3y, k4y)
      y += (h / 6) * (k1y + 2 * k2y + 2 * k3y + k4y)
      p += (h / 6) * (k1p + 2 * k2p + 2 * k3p + k4p)
    }
    const xn = x0 + (i + 1) * h
    if (!Number.isFinite(y) || !Number.isFinite(p) || Math.abs(y) > 1e10) return { points, blowX: xn }
    points.push(order === 1 ? { x: xn, y } : { x: xn, y, yp: p })
  }
  return { points }
}

export function solveOde(order: 1 | 2, expr: string, x0s: string, y0s: string, yp0s: string, x1s: string): OdeReport {
  const vars = order === 1 ? ['x', 'y'] : ['x', 'y', 'yp']
  const f = compileN(expr, vars)
  const x0 = parsePoint(x0s, false)
  const y0 = parsePoint(y0s, false)
  const p0 = order === 2 ? parsePoint(yp0s, false) : 0
  const x1 = parsePoint(x1s, false)
  const coarse = rk4(f, order, x0, y0, p0, x1, 1000)
  const fine = rk4(f, order, x0, y0, p0, x1, 2000)
  const blowX = fine.blowX ?? coarse.blowX
  const table = fine.points.filter((_, i) => i % 200 === 0)
  if (blowX !== undefined) return { order, status: 'blowup', x0, x1, blowX, points: fine.points, table, f }
  const end = fine.points[fine.points.length - 1]
  const endC = coarse.points[coarse.points.length - 1]
  return {
    order,
    status: 'ok',
    x0,
    x1,
    y: end.y,
    yp: end.yp,
    error: Math.abs(end.y - endC.y) / 15,
    display: recognize(end.y),
    points: fine.points,
    table,
    f,
  }
}

// ───────────────────────────── sequences & series ─────────────────────────────

export interface SequenceReport {
  result: LimitResult
  even: Sample[]
  odd: Sample[]
  f: (n: number) => number
}

export function sequenceLimitOf(f: (n: number) => number): SequenceReport {
  const even: Sample[] = []
  const odd: Sample[] = []
  for (let k = 1; k <= 15; k++) {
    const n = 10 ** k
    even.push({ x: n, y: f(n) })
    odd.push({ x: n + 1, y: f(n + 1) })
  }
  const result = combineSides(analyzeSide(even.map((s) => s.y)), analyzeSide(odd.map((s) => s.y)))
  return { result, even, odd, f }
}

export function sequenceLimit(expr: string, variable = 'n'): SequenceReport {
  return sequenceLimitOf(compile1(expr, checkVariable(variable)))
}

export type SeriesTest = 'nthTerm' | 'ratio' | 'integral' | 'alternating' | 'partialSums'

export interface SeriesRow {
  n: number
  a: number
  s: number
}

export interface SeriesReport {
  verdict: 'converges' | 'diverges' | 'undefined'
  test?: SeriesTest
  ratio?: number
  sum?: number
  display?: string
  exact: boolean
  badTerm?: number
  termLimit: LimitResult
  partials: { n: number; s: number }[]
  rows: SeriesRow[]
  n0: number
}

const MAX_TERMS = 100_000

export function series(expr: string, variable: string, start: string): SeriesReport {
  const v = checkVariable(variable)
  const a = compile1(expr, v)
  const n0 = parsePoint(start, false)
  if (!Number.isInteger(n0)) throw new CalcError('badStart')

  const termLimit = sequenceLimitOf(a).result
  const partials: { n: number; s: number }[] = []
  const rows: SeriesRow[] = []
  const checkpoints = new Map<number, number>() // N terms → S_N
  const marks = new Set([100, 1000, 1001, 10_000, 10_001, 100_000, 100_001])

  let s = 0
  let comp = 0 // Kahan compensation
  let zeros = 0
  let exact = false
  let ratio: number | undefined
  let prev = NaN
  let count = 0
  for (; count <= MAX_TERMS; count++) {
    const n = n0 + count
    const t = a(n)
    if (!Number.isFinite(t)) {
      return { verdict: 'undefined', badTerm: n, exact: false, termLimit, partials, rows, n0 }
    }
    const y = t - comp
    const z = s + y
    comp = z - s - y
    s = z
    const N = count + 1
    if (t !== 0 && prev !== 0 && Number.isFinite(prev)) ratio = Math.abs(t / prev)
    prev = t
    if (N <= 1000) partials.push({ n: N, s })
    if (N <= 10 || marks.has(N)) rows.push({ n, a: t, s })
    if (marks.has(N)) checkpoints.set(N, s)
    zeros = t === 0 ? zeros + 1 : 0
    if (zeros >= 50) {
      exact = true
      break
    }
  }

  const base = { exact, termLimit, partials, rows, n0, ratio }
  const tail = (m: number) => a(n0 + m)
  const done = (verdict: 'converges' | 'diverges', test: SeriesTest): SeriesReport => {
    if (verdict === 'diverges') return { ...base, verdict, test }
    const sum = exact ? s : aitkenSum(checkpoints)
    return { ...base, verdict, test, sum, display: recognize(sum) }
  }

  // 1. n-th term test.
  if (termLimit.kind !== 'value' || Math.abs(termLimit.value!) >= 1e-6) return done('diverges', 'nthTerm')
  // 2. Ratio test at the largest computable n.
  if (ratio !== undefined && ratio < 0.999) return done('converges', 'ratio')
  if (ratio !== undefined && ratio > 1.001) return done('diverges', 'ratio')
  if (exact) return done('converges', 'ratio')
  // 3. Integral test for positive decreasing terms.
  const [t3, t4, t5] = [tail(1e3), tail(1e4), tail(1e5)]
  if (t3 > t4 && t4 > t5 && t5 > 0) {
    const q = quad(a, n0 + 1000, Infinity)
    if (q.status === 'ok') return done('converges', 'integral')
    if (q.status === 'diverges') return done('diverges', 'integral')
  }
  // 4. Alternating series test.
  const alternates = [1e3, 1e4, 1e5].every((m) => tail(m) * tail(m + 1) < 0)
  if (alternates && Math.abs(t3) > Math.abs(t4) && Math.abs(t4) > Math.abs(t5)) return done('converges', 'alternating')
  // 5. Behaviour of averaged partial sums.
  const T = averaged(checkpoints)
  const q = Math.abs((T[2] - T[1]) / (T[1] - T[0]))
  return done(q > 0.95 ? 'diverges' : 'converges', 'partialSums')
}

function averaged(cp: Map<number, number>): number[] {
  return [1000, 10_000, 100_000].map((N) => (cp.get(N)! + cp.get(N + 1)!) / 2)
}

function aitkenSum(cp: Map<number, number>): number {
  const [t3, t4, t5] = averaged(cp)
  const den = t5 - 2 * t4 + t3
  return den === 0 ? t5 : t5 - ((t5 - t4) * (t5 - t4)) / den
}

// ───────────────────────────── continuity ─────────────────────────────

export type ContinuityKind = 'continuous' | 'removable' | 'jump' | 'infinite' | 'oscillating' | 'boundary' | 'notDefined'

export interface ContinuityReport {
  kind: ContinuityKind
  a: number
  fa: number
  left: Side
  right: Side
  limit: LimitResult
  conditions: { defined: boolean; limitExists: boolean; equals: boolean }
  jump?: number
  /** For domain boundaries: the side from which f is continuous, if any. */
  continuousFrom?: 'left' | 'right'
}

const same = (x: number, y: number) => Math.abs(x - y) <= 1e-5 * Math.max(1, Math.abs(x), Math.abs(y))

export function continuityOf(f: (x: number) => number, a: number): ContinuityReport {
  const rep = limitOf(f, a, 'both')
  const left = rep.sides[0].result
  const right = rep.sides[1].result
  const fa = f(a)
  const defined = Number.isFinite(fa)
  const lim = rep.result
  const limitExists = lim.kind === 'value'
  const equals = defined && limitExists && same(lim.value!, fa)
  const base = { a, fa, left, right, limit: lim, conditions: { defined, limitExists, equals } }

  if (left.kind === 'undefined' && right.kind === 'undefined') return { ...base, kind: 'notDefined' }
  if (left.kind === 'inf' || right.kind === 'inf') return { ...base, kind: 'infinite' }
  if (left.kind === 'oscillates' || right.kind === 'oscillates') return { ...base, kind: 'oscillating' }
  if (left.kind === 'undefined' || right.kind === 'undefined') {
    const [side, s] = left.kind === 'undefined' ? (['right', right] as const) : (['left', left] as const)
    const continuousFrom = defined && s.kind === 'value' && same(s.value, fa) ? side : undefined
    return { ...base, kind: 'boundary', continuousFrom }
  }
  if (left.kind === 'value' && right.kind === 'value' && !limitExists) {
    return { ...base, kind: 'jump', jump: right.value - left.value }
  }
  return { ...base, kind: equals ? 'continuous' : 'removable' }
}

export function continuityAt(expr: string, variable: string, point: string): ContinuityReport {
  const v = checkVariable(variable)
  return continuityOf(compile1(expr, v), parsePoint(point, false))
}

export interface ScanReport {
  points: ContinuityReport[]
  samples: Sample[]
  a: number
  b: number
  f: (x: number) => number
}

function jumpSize(y0: number, y1: number): number {
  if (Number.isFinite(y0) !== Number.isFinite(y1)) return Infinity
  const d = Math.abs(y1 - y0)
  return Number.isNaN(d) ? 0 : d
}

export function scanContinuityOf(f: (x: number) => number, a: number, b: number): ScanReport {
  const N = 1200
  const samples: Sample[] = []
  for (let i = 0; i < N; i++) {
    const x = a + ((b - a) * i) / (N - 1)
    samples.push({ x, y: f(x) })
  }
  const diffs: number[] = []
  for (let i = 1; i < N; i++) {
    const d = Math.abs(samples[i].y - samples[i - 1].y)
    if (Number.isFinite(d)) diffs.push(d)
  }
  diffs.sort((p, q) => p - q)
  const median = diffs.length ? diffs[Math.floor(diffs.length / 2)] : 0

  const found: number[] = []
  for (let i = 1; i < N; i++) {
    const p = samples[i - 1]
    const q = samples[i]
    const finChange = Number.isFinite(p.y) !== Number.isFinite(q.y)
    if (!finChange && !(Math.abs(q.y - p.y) > 50 * median)) continue
    let lo = p.x
    let hi = q.x
    let flo = p.y
    let fhi = q.y
    for (let k = 0; k < 60; k++) {
      const m = (lo + hi) / 2
      const fm = f(m)
      if (jumpSize(flo, fm) >= jumpSize(fm, fhi)) {
        hi = m
        fhi = fm
      } else {
        lo = m
        flo = fm
      }
    }
    let x = (lo + hi) / 2
    const snapped = Math.round(x * 1e6) / 1e6
    if (Math.abs(snapped - x) < 1e-8) x = snapped + 0 // + 0 turns −0 into 0
    if (!found.some((y) => Math.abs(y - x) < 1e-6)) found.push(x)
  }
  const points = found
    .sort((p, q) => p - q)
    .map((x) => continuityOf(f, x))
    .filter((r) => r.kind !== 'continuous')
  return { points, samples, a, b, f }
}

export function scanContinuity(expr: string, variable: string, from: string, to: string): ScanReport {
  const v = checkVariable(variable)
  const a = parsePoint(from, false)
  const b = parsePoint(to, false)
  return scanContinuityOf(compile1(expr, v), Math.min(a, b), Math.max(a, b))
}

// ───────────────────────────── partial derivatives ─────────────────────────────

export type CriticalKind = 'min' | 'max' | 'saddle' | 'inconclusive'

export interface PartialReport {
  vars: string[]
  f: string
  fn: (args: ArrayLike<number>) => number
  first: string[]
  second: string[][]
  at?: {
    point: number[]
    value: number
    gradient: number[]
    norm: number
    hessian: number[][]
    critical?: CriticalKind
  }
}

function det(m: number[][]): number {
  if (m.length === 1) return m[0][0]
  if (m.length === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0]
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  )
}

export function classifyCritical(h: number[][]): CriticalKind {
  const minors = h.map((_, k) => det(h.slice(0, k + 1).map((row) => row.slice(0, k + 1))))
  const eps = 1e-10
  if (minors.every((d) => d > eps)) return 'min'
  if (minors.every((d, k) => (k % 2 === 0 ? d < -eps : d > eps))) return 'max'
  if (Math.abs(minors[minors.length - 1]) > eps) return 'saddle'
  return 'inconclusive'
}

export function partials(expr: string, varList: string, point = ''): PartialReport {
  const vars = parseVariables(varList)
  const node = parseExpr(expr, vars)
  const d1 = vars.map((v) => simplifySafe(math.derivative(node, v)))
  const d2 = d1.map((d) => vars.map((v) => simplifySafe(math.derivative(d, v))))
  const report: PartialReport = {
    vars,
    f: pretty(node),
    fn: compileN(node, vars),
    first: d1.map(pretty),
    second: d2.map((row) => row.map(pretty)),
  }
  if (point.trim()) {
    const p = parsePointList(point, vars.length)
    const gradient = d1.map((d) => compileN(d, vars)(p))
    const hessian = d2.map((row) => row.map((d) => compileN(d, vars)(p)))
    const norm = Math.hypot(...gradient)
    report.at = {
      point: p,
      value: report.fn(p),
      gradient,
      norm,
      hessian,
      critical: norm < 1e-8 && vars.length <= 3 ? classifyCritical(hessian) : undefined,
    }
  }
  return report
}

// ───────────────────────────── multiple integrals ─────────────────────────────

export interface Bound {
  lo: string
  hi: string
}

export interface MultipleReport extends QuadResult {
  display: string
  dims: 2 | 3
  /** y-bounds as functions of x, for the region preview of double integrals. */
  region?: { a: number; b: number; lower: (x: number) => number; upper: (x: number) => number }
}

function compileBound(src: string, vars: readonly string[]): (args: ArrayLike<number>) => number {
  const word = INF_WORDS[src.trim().toLowerCase().replace(/\s+/g, '')]
  if (word !== undefined) return () => word
  return compileN(src, vars)
}

export const MULTI_VARS = ['x', 'y', 'z'] as const

export function multipleIntegral(expr: string, bounds: Bound[]): MultipleReport {
  const dims = bounds.length as 2 | 3
  const vars = MULTI_VARS.slice(0, dims)
  const f = compileN(expr, vars)
  const lo = bounds.map((b, i) => compileBound(b.lo, vars.slice(0, i)))
  const hi = bounds.map((b, i) => compileBound(b.hi, vars.slice(0, i)))
  const tol = dims === 2 ? 1e-9 : 1e-7
  const args = [0, 0, 0]
  let evals = 0
  let failure: QuadStatus | null = null

  const levels: ((t: number) => number)[] = []
  for (let level = dims - 1; level >= 0; level--) {
    if (level === dims - 1) {
      levels[level] = (t) => {
        args[level] = t
        evals++
        return f(args)
      }
    } else {
      const inner = levels[level + 1]
      levels[level] = (t) => {
        if (failure) return NaN
        args[level] = t
        const r = quad(inner, lo[level + 1](args), hi[level + 1](args), tol)
        if (r.status !== 'ok') {
          failure = r.status
          return NaN
        }
        return r.value
      }
    }
  }
  const a = lo[0](args)
  const b = hi[0](args)
  if (Number.isNaN(a)) throw new CalcError('badNumber', { value: bounds[0].lo })
  if (Number.isNaN(b)) throw new CalcError('badNumber', { value: bounds[0].hi })
  const r = quad(levels[0], a, b, tol)
  const status: QuadStatus = failure ?? r.status
  const report: MultipleReport = {
    ...r,
    evals,
    status,
    display: status === 'ok' ? recognize(r.value) : '',
    dims,
  }
  if (dims === 2 && Number.isFinite(a) && Number.isFinite(b)) {
    const buf = [0]
    report.region = {
      a,
      b,
      lower: (x) => ((buf[0] = x), lo[1](buf)),
      upper: (x) => ((buf[0] = x), hi[1](buf)),
    }
  }
  return report
}

import { describe, expect, it } from 'vitest'
import {
  CalcError,
  continuityAt,
  derivative,
  integral,
  limit,
  multipleIntegral,
  partials,
  recognize,
  scanContinuity,
  sequenceLimit,
  series,
  solveOde,
} from './core'

describe('input handling', () => {
  it('rejects unknown symbols', () => {
    expect(() => limit('q + x', 'x', '0')).toThrow('Unknown symbol "q" — expected x')
    try {
      limit('q', 'x', '0')
    } catch (e) {
      expect(e).toBeInstanceOf(CalcError)
      expect((e as CalcError).code).toBe('unknownSymbol')
    }
  })
  it('accepts ln, ** and π', () => {
    expect(integral('ln(x)**2 + π', 'x', '1', '1').value).toBe(0)
    expect(limit('ln(x)/(x-1)', 'x', '1').result.display).toBe('1')
  })
})

describe('recognize', () => {
  it.each([
    [1 / 3, '1/3'],
    [Math.PI / 2, 'π/2'],
    [-4 * Math.PI, '-4π'],
    [(3 * Math.SQRT2) / 2, '3√2/2'],
    [2 * Math.LN2, '2·ln 2'],
    [1 / Math.E, '1/e'],
    [Math.PI ** 2 / 6, 'π²/6'],
    [1e-9, '0'],
    [Infinity, '∞'],
  ])('%f → %s', (v, s) => expect(recognize(v)).toBe(s))
})

describe('limits', () => {
  it.each([
    ['sin(x)/x', '0', '1'],
    ['(1-cos(x))/x^2', '0', '1/2'],
    ['(1+1/x)^x', 'inf', 'e'],
    ['sqrt(x^2+x)-x', 'inf', '1/2'],
    ['1/x^2', '0', '∞'],
  ])('lim %s at %s = %s', (f, a, want) => {
    expect(limit(f, 'x', a).result.display).toBe(want)
  })
  it('abs(x)/x at 0 does not exist (sides differ)', () => {
    const r = limit('abs(x)/x', 'x', '0').result
    expect(r.kind).toBe('dne')
    expect(r.reason).toBe('sidesDiffer')
  })
  it('sin(1/x) at 0 oscillates', () => {
    const r = limit('sin(1/x)', 'x', '0').result
    expect(r.kind).toBe('dne')
    expect(r.reason).toBe('oscillates')
  })
  it('sqrt(x) from the right is 0', () => {
    expect(limit('sqrt(x)', 'x', '0', 'right').result.display).toBe('0')
  })
})

describe('derivatives', () => {
  it('x^3 - 2x at 1', () => {
    const r = derivative('x^3 - 2x', 'x', 1, '1')
    expect(r.exprs[0]).toBe('3 * x^2 - 2')
    expect(r.at!.values[0]).toBeCloseTo(1, 12)
    expect(r.at!.tangent!.text).toBe('y = x − 2')
  })
  it('e^(x^2) keeps parentheses', () => {
    const r = derivative('e^(x^2)', 'x')
    expect(r.f).toBe('e^(x^2)')
    expect(r.exprs[0]).toContain('e^(x^2)')
  })
  it('x^x at 1', () => {
    expect(derivative('x^x', 'x', 1, '1').at!.values[0]).toBeCloseTo(1, 10)
  })
  it('abs(x) is not differentiable at 0', () => {
    expect(derivative('abs(x)', 'x', 1, '0').at!.values[0]).toBeNaN()
  })
})

describe('definite integrals', () => {
  it.each([
    ['x^2', '0', '1', '1/3'],
    ['e^(-x^2)', '-inf', 'inf', '√π'],
    ['1/sqrt(x)', '0', '1', '2'],
  ])('∫ %s from %s to %s = %s', (f, a, b, want) => {
    const r = integral(f, 'x', a, b)
    expect(r.status).toBe('ok')
    expect(r.display).toBe(want)
  })
  it('1/x on [1, ∞) diverges', () => expect(integral('1/x', 'x', '1', 'inf').status).toBe('diverges'))
  it('sqrt(x) on [-1, 1] is undefined', () => expect(integral('sqrt(x)', 'x', '-1', '1').status).toBe('undefined'))
  it('reversed bounds flip the sign', () => expect(integral('x', 'x', '1', '0').value).toBeCloseTo(-0.5, 12))
})

describe('differential equations', () => {
  it("y' = y, y(0) = 1 → e", () => {
    const r = solveOde(1, 'y', '0', '1', '', '1')
    expect(r.display).toBe('e')
    expect(r.y).toBeCloseTo(Math.E, 10)
  })
  it("y'' = -y → sin(π/2) = 1", () => {
    const r = solveOde(2, '-y', '0', '0', '1', 'pi/2')
    expect(r.display).toBe('1')
  })
  it("y' = y² blows up near x ≈ 1", () => {
    const r = solveOde(1, 'y^2', '0', '1', '', '2')
    expect(r.status).toBe('blowup')
    expect(r.blowX!).toBeGreaterThan(0.95)
    expect(r.blowX!).toBeLessThan(1.05)
  })
})

describe('sequences', () => {
  it('(1+1/n)^n → e', () => expect(sequenceLimit('(1+1/n)^n').result.display).toBe('e'))
  it('(-1)^n does not converge', () => expect(sequenceLimit('(-1)^n').result.kind).toBe('dne'))
  it('1/n → 0', () => expect(sequenceLimit('1/n').result.display).toBe('0'))
})

describe('series', () => {
  it('Σ 1/n² = π²/6', () => {
    const r = series('1/n^2', 'n', '1')
    expect(r.verdict).toBe('converges')
    expect(r.display).toBe('π²/6')
  })
  it('Σ 1/n diverges', () => expect(series('1/n', 'n', '1').verdict).toBe('diverges'))
  it('Σ (-1)^(n+1)/n = ln 2', () => expect(series('(-1)^(n+1)/n', 'n', '1').display).toBe('ln 2'))
  it('Σ 1/n! = e', () => expect(series('1/factorial(n)', 'n', '0').display).toBe('e'))
  it('Σ 1/n^1.5 ≈ 2.61238', () => {
    const r = series('1/n^1.5', 'n', '1')
    expect(r.verdict).toBe('converges')
    expect(Math.abs(r.sum! - 2.6123753)).toBeLessThan(1e-4)
  })
  it('Σ 1/(n ln n) diverges by the integral test', () => {
    const r = series('1/(n*ln(n))', 'n', '2')
    expect(r.verdict).toBe('diverges')
    expect(r.test).toBe('integral')
  })
  it('Σ (-1)^n/(2n+1) = π/4', () => expect(series('(-1)^n/(2n+1)', 'n', '0').display).toBe('π/4'))
})

describe('continuity', () => {
  it('(x²-1)/(x-1) at 1 is removable', () => expect(continuityAt('(x^2-1)/(x-1)', 'x', '1').kind).toBe('removable'))
  it('sqrt(x) at 0 is a boundary, continuous from the right', () => {
    const r = continuityAt('sqrt(x)', 'x', '0')
    expect(r.kind).toBe('boundary')
    expect(r.continuousFrom).toBe('right')
  })
  it('tan(x) on [-3, 3] has infinite discontinuities at ±π/2', () => {
    const r = scanContinuity('tan(x)', 'x', '-3', '3')
    expect(r.points.map((p) => p.kind)).toEqual(['infinite', 'infinite'])
    expect(r.points[0].a).toBeCloseTo(-Math.PI / 2, 6)
    expect(r.points[1].a).toBeCloseTo(Math.PI / 2, 6)
  })
  it('floor(x) on [-2.5, 2.5] jumps at the integers', () => {
    const r = scanContinuity('floor(x)', 'x', '-2.5', '2.5')
    expect(r.points.map((p) => p.a)).toEqual([-2, -1, 0, 1, 2])
    expect(r.points.every((p) => p.kind === 'jump')).toBe(true)
  })
  it('x³ on [-3, 3] has none', () => expect(scanContinuity('x^3', 'x', '-3', '3').points).toEqual([]))
})

describe('partial derivatives', () => {
  it('x²+y² has a local minimum at the origin', () =>
    expect(partials('x^2+y^2', 'x, y', '0, 0').at!.critical).toBe('min'))
  it('x²-y² has a saddle at the origin', () => expect(partials('x^2-y^2', 'x, y', '0, 0').at!.critical).toBe('saddle'))
  it('∇(xyz) at (1,2,3)', () => {
    const at = partials('x*y*z', 'x, y, z', '1, 2, 3').at!
    expect(at.gradient).toEqual([6, 3, 2])
    expect(at.norm).toBe(7)
  })
})

describe('multiple integrals', () => {
  it('area of the unit disk = π', () => {
    const r = multipleIntegral('1', [
      { lo: '-1', hi: '1' },
      { lo: '-sqrt(1-x^2)', hi: 'sqrt(1-x^2)' },
    ])
    expect(r.status).toBe('ok')
    expect(r.display).toBe('π')
  })
  it('Gaussian over ℝ² = π', () => {
    const r = multipleIntegral('e^(-(x^2+y^2))', [
      { lo: '-inf', hi: 'inf' },
      { lo: '-inf', hi: 'inf' },
    ])
    expect(r.display).toBe('π')
  })
  it('volume of the unit ball = 4π/3', () => {
    const r = multipleIntegral('1', [
      { lo: '-1', hi: '1' },
      { lo: '-sqrt(1-x^2)', hi: 'sqrt(1-x^2)' },
      { lo: '-sqrt(1-x^2-y^2)', hi: 'sqrt(1-x^2-y^2)' },
    ])
    expect(r.display).toBe('4π/3')
  })
  it('1/(xy) on [0,1]² diverges', () => {
    const r = multipleIntegral('1/(x*y)', [
      { lo: '0', hi: '1' },
      { lo: '0', hi: '1' },
    ])
    expect(r.status).toBe('diverges')
  })
})

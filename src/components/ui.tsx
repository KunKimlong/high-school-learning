'use client'

import { useId, type ReactNode, type Ref } from 'react'
import { CalcError, fmt } from '@/calculus/core'
import { ChemError } from '@/chemistry/core'
import type { MessageKey } from '@/i18n/dictionaries'
import { useI18n } from '@/i18n/I18nProvider'
import { useHydrated } from './useCompute'

// ───────────────────────────── layout ─────────────────────────────

export function Panel({ inputs, children }: { inputs: ReactNode; children: ReactNode }) {
  const { t } = useI18n()
  const hydrated = useHydrated()
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <Card className="flex flex-col gap-4 self-start">{inputs}</Card>
      <div className="flex min-w-0 flex-col gap-4">
        {hydrated ? children : <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.computing')}</p>}
      </div>
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {children}
    </section>
  )
}

export function Heading({ children }: { children: ReactNode }) {
  return <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">{children}</h3>
}

export function Mono({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`font-mono break-words ${className}`}>{children}</span>
}

// ───────────────────────────── inputs ─────────────────────────────

export function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  className = '',
  inputRef,
}: {
  label: ReactNode
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: ReactNode
  className?: string
  inputRef?: Ref<HTMLInputElement>
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 text-sm ${className}`}>
      <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900 shadow-inner outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
      {hint && <span className="text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
    </label>
  )
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: ReactNode
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <div role="radiogroup" className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition ${
              o.value === value
                ? 'bg-white font-medium text-indigo-700 shadow-sm dark:bg-slate-950 dark:text-indigo-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Examples({ items }: { items: { label: string; apply: () => void }[] }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('common.examples')}</span>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <button
            key={it.label}
            type="button"
            onClick={it.apply}
            className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 font-mono text-xs text-indigo-800 transition hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200 dark:hover:bg-indigo-900/60"
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ───────────────────────────── results ─────────────────────────────

export function ResultBox({ tone, title, children }: { tone: 'ok' | 'bad'; title?: ReactNode; children: ReactNode }) {
  const { t } = useI18n()
  const styles =
    tone === 'ok'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-50'
      : 'border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-50'
  return (
    <section aria-live="polite" className={`rounded-2xl border p-4 shadow-sm ${styles}`}>
      <div className="mb-1 text-xs font-semibold tracking-wide uppercase opacity-70">{title ?? t('common.result')}</div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}

export function BigMath({ children }: { children: ReactNode }) {
  return <div className="font-mono text-xl break-words sm:text-2xl">{children}</div>
}

export function ErrorBox({ error }: { error: unknown }) {
  const { t } = useI18n()
  const text =
    error instanceof CalcError || error instanceof ChemError
      ? t(`errors.${error.code}` as MessageKey, error.params)
      : t('errors.unexpected', { detail: error instanceof Error ? error.message : String(error) })
  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-100"
    >
      <div className="font-semibold">{t('common.errorTitle')}</div>
      <div className="mt-1 break-words">{text}</div>
    </div>
  )
}

export function DataTable({ title, columns, rows }: { title?: ReactNode; columns: ReactNode[]; rows: ReactNode[][] }) {
  return (
    <div className="min-w-0">
      {title && <div className="mb-2"><Heading>{title}</Heading></div>}
      <div className="max-h-72 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full font-mono text-xs">
          <thead className="sticky top-0 bg-slate-100 text-left text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <tr>
              {columns.map((c, i) => (
                <th key={i} className="px-3 py-1.5 font-semibold whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                {r.map((c, j) => (
                  <td key={j} className="px-3 py-1 whitespace-nowrap">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function Legend({ items }: { items: { label: ReactNode; className: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <svg width="20" height="8" className={it.className} aria-hidden>
            <line x1="0" y1="4" x2="20" y2="4" stroke="currentColor" strokeWidth="2.5" strokeDasharray={it.dashed ? '4 3' : undefined} />
          </svg>
          {it.label}
        </span>
      ))}
    </div>
  )
}

// ───────────────────────────── chart ─────────────────────────────

export interface Pt {
  x: number
  y: number
}

export interface Curve {
  points: Pt[]
  className: string
  dashed?: boolean
}

export interface ChartDot {
  x: number
  y: number
  open?: boolean
  className?: string
}

export interface ChartScale {
  toX: (x: number) => number
  toY: (y: number) => number
  xRange: [number, number]
  yRange: [number, number]
  width: number
  height: number
}

export interface ChartProps {
  xRange: [number, number]
  curves?: Curve[]
  band?: { upper: Pt[]; lower?: Pt[]; className?: string }
  yInclude?: number[]
  /** Fixed y-range; skips the percentile auto-range. */
  yRange?: [number, number]
  vLines?: { x: number; className?: string }[]
  hLines?: { y: number; className?: string }[]
  dots?: ChartDot[]
  overlay?: (scale: ChartScale) => ReactNode
  label?: string
}

const W = 560
const H = 280

/** Sample `f` at `n + 1` evenly spaced points. */
export function sample(f: (x: number) => number, a: number, b: number, n = 600): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const x = a + ((b - a) * i) / n
    out.push({ x, y: f(x) })
  }
  return out
}

function autoRange(values: number[], include: number[]): [number, number] {
  const ys = values.filter(Number.isFinite).sort((p, q) => p - q)
  let lo = ys.length ? ys[Math.floor(0.03 * (ys.length - 1))] : -1
  let hi = ys.length ? ys[Math.ceil(0.97 * (ys.length - 1))] : 1
  for (const y of include) {
    if (!Number.isFinite(y)) continue
    lo = Math.min(lo, y)
    hi = Math.max(hi, y)
  }
  if (hi - lo < 1e-9) {
    lo -= 1
    hi += 1
  }
  const pad = (hi - lo) * 0.12
  return [lo - pad, hi + pad]
}

function linePath(points: Pt[], s: ChartScale): string {
  const [lo, hi] = s.yRange
  const span = hi - lo
  let d = ''
  let prev: number | null = null
  for (const p of points) {
    // Break at NaN, far outside the view, or across a jump bigger than the view (asymptotes).
    if (!Number.isFinite(p.y) || p.y < lo - span || p.y > hi + span || (prev !== null && Math.abs(p.y - prev) > 1.5 * span)) {
      prev = null
      continue
    }
    d += `${prev === null ? 'M' : 'L'}${s.toX(p.x).toFixed(2)},${s.toY(p.y).toFixed(2)}`
    prev = p.y
  }
  return d
}

function bandPaths(upper: Pt[], lower: Pt[] | undefined, s: ChartScale): string[] {
  const [lo, hi] = s.yRange
  const span = hi - lo
  const clamp = (y: number) => Math.min(hi + span, Math.max(lo - span, y))
  const base = Math.min(hi, Math.max(lo, 0))
  const paths: string[] = []
  let run: [Pt, number][] = []
  const flush = () => {
    if (run.length > 1) {
      const top = run.map(([p]) => `${s.toX(p.x).toFixed(2)},${s.toY(clamp(p.y)).toFixed(2)}`)
      const bottom = run
        .slice()
        .reverse()
        .map(([p, y]) => `${s.toX(p.x).toFixed(2)},${s.toY(clamp(y)).toFixed(2)}`)
      paths.push(`M${top.join('L')}L${bottom.join('L')}Z`)
    }
    run = []
  }
  upper.forEach((p, i) => {
    const y = lower ? lower[i]?.y : base
    if (Number.isFinite(p.y) && Number.isFinite(y)) run.push([p, y])
    else flush()
  })
  flush()
  return paths
}

export function Chart({ xRange, curves = [], band, yInclude = [], yRange, vLines = [], hLines = [], dots = [], overlay, label }: ChartProps) {
  const clipId = `clip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const [x0, x1] = xRange
  const yr =
    yRange ??
    autoRange(
      [...curves.flatMap((c) => c.points.map((p) => p.y)), ...(band ? [...band.upper, ...(band.lower ?? [])].map((p) => p.y) : [])],
      [...yInclude, ...dots.map((d) => d.y)],
    )
  const [y0, y1] = yr
  const scale: ChartScale = {
    toX: (x) => ((x - x0) / (x1 - x0)) * W,
    toY: (y) => H - ((y - y0) / (y1 - y0)) * H,
    xRange,
    yRange: yr,
    width: W,
    height: H,
  }
  const label3 = (v: number) => fmt(v, 3)
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={label}
      className="h-auto w-full rounded-xl border border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-600"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={W} height={H} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {overlay?.(scale)}
        {y0 < 0 && y1 > 0 && <line x1="0" x2={W} y1={scale.toY(0)} y2={scale.toY(0)} stroke="currentColor" strokeWidth="1" />}
        {x0 < 0 && x1 > 0 && <line y1="0" y2={H} x1={scale.toX(0)} x2={scale.toX(0)} stroke="currentColor" strokeWidth="1" />}
        {band &&
          bandPaths(band.upper, band.lower, scale).map((d, i) => (
            <path key={i} d={d} className={band.className ?? 'fill-indigo-500/20'} />
          ))}
        {vLines.map((l, i) => (
          <line
            key={i}
            x1={scale.toX(l.x)}
            x2={scale.toX(l.x)}
            y1="0"
            y2={H}
            stroke="currentColor"
            strokeDasharray="5 4"
            strokeWidth="1.25"
            className={l.className ?? 'text-rose-400'}
          />
        ))}
        {hLines.map((l, i) => (
          <line
            key={i}
            y1={scale.toY(l.y)}
            y2={scale.toY(l.y)}
            x1="0"
            x2={W}
            stroke="currentColor"
            strokeDasharray="5 4"
            strokeWidth="1.25"
            className={l.className ?? 'text-emerald-500'}
          />
        ))}
        {curves.map((c, i) => (
          <path
            key={i}
            d={linePath(c.points, scale)}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeDasharray={c.dashed ? '6 4' : undefined}
            className={c.className}
          />
        ))}
        {dots.map((d, i) =>
          Number.isFinite(d.x) && Number.isFinite(d.y) ? (
            <circle
              key={i}
              cx={scale.toX(d.x)}
              cy={scale.toY(d.y)}
              r="4.5"
              stroke="currentColor"
              strokeWidth="2"
              className={`${d.className ?? 'text-indigo-600 dark:text-indigo-400'} ${d.open ? 'fill-white dark:fill-slate-950' : 'fill-current'}`}
            />
          ) : null,
        )}
      </g>
      <g className="fill-slate-500 font-mono text-[11px] dark:fill-slate-400">
        <text x="4" y={H - 4}>
          {label3(x0)}
        </text>
        <text x={W - 4} y={H - 4} textAnchor="end">
          {label3(x1)}
        </text>
        <text x="4" y="13">
          {label3(y1)}
        </text>
        <text x="4" y={H - 18}>
          {label3(y0)}
        </text>
      </g>
    </svg>
  )
}

'use client'

import { useState } from 'react'
import {
  checkVariable,
  compile1,
  continuityAt,
  fmt,
  recognize,
  scanContinuity,
  type ContinuityKind,
  type ContinuityReport,
  type ScanReport,
} from '@/calculus/core'
import { BigMath, Chart, ErrorBox, Examples, Field, Heading, Panel, ResultBox, Segmented, sample, type ChartDot } from '@/components/ui'
import { useCompute } from '@/components/useCompute'
import { useI18n } from '@/i18n/I18nProvider'

type Mode = 'point' | 'scan'

const EXAMPLES: { mode: Mode; expr: string; a: string; b?: string }[] = [
  { mode: 'point', expr: '(x^2-1)/(x-1)', a: '1' },
  { mode: 'point', expr: 'sqrt(x)', a: '0' },
  { mode: 'point', expr: 'floor(x)', a: '1' },
  { mode: 'point', expr: '1/x', a: '0' },
  { mode: 'point', expr: 'sin(1/x)', a: '0' },
  { mode: 'scan', expr: 'tan(x)', a: '-3', b: '3' },
  { mode: 'scan', expr: 'floor(x)', a: '-2.5', b: '2.5' },
  { mode: 'scan', expr: 'x^3', a: '-3', b: '3' },
  { mode: 'scan', expr: 'sign(x) + 1/(x-2)', a: '-3', b: '3' },
]

const KIND_BADGE: Record<ContinuityKind, string> = {
  continuous: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  removable: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  jump: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  infinite: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
  oscillating: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-200',
  boundary: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  notDefined: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
}

type Args = { mode: Mode; expr: string; v: string; a: string; b: string }
const compute = (x: Args): { mode: 'point'; at: ContinuityReport; f: (x: number) => number } | { mode: 'scan'; scan: ScanReport } => {
  if (x.mode === 'scan') return { mode: 'scan', scan: scanContinuity(x.expr, x.v, x.a, x.b) }
  return { mode: 'point', at: continuityAt(x.expr, x.v, x.a), f: compile1(x.expr, checkVariable(x.v)) }
}

/** Open circles at finite one-sided limits, a filled dot at f(a). */
function markers(r: ContinuityReport): ChartDot[] {
  const dots: ChartDot[] = []
  for (const s of [r.left, r.right]) if (s.kind === 'value') dots.push({ x: r.a, y: s.value, open: true, className: 'text-rose-500' })
  if (Number.isFinite(r.fa)) dots.push({ x: r.a, y: r.fa, className: 'text-indigo-600 dark:text-indigo-400' })
  return dots
}

export default function ContinuityPanel() {
  const { t } = useI18n()
  const [mode, setMode] = useState<Mode>('point')
  const [expr, setExpr] = useState('(x^2-1)/(x-1)')
  const [v, setV] = useState('x')
  const [a, setA] = useState('1')
  const [b, setB] = useState('3')
  const r = useCompute({ mode, expr, v, a, b }, compute)

  return (
    <Panel
      inputs={
        <>
          <Segmented
            label={t('continuity.mode')}
            value={mode}
            onChange={setMode}
            options={[
              { value: 'point', label: t('continuity.atPoint') },
              { value: 'scan', label: t('continuity.scan') },
            ]}
          />
          <Field label={`${t('common.function')} f(${v})`} value={expr} onChange={setExpr} hint={t('common.symbolsHint')} />
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('common.variable')} value={v} onChange={setV} />
            {mode === 'point' ? (
              <Field label={t('common.point')} value={a} onChange={setA} />
            ) : (
              <>
                <Field label={t('common.from')} value={a} onChange={setA} />
                <Field label={t('common.to')} value={b} onChange={setB} />
              </>
            )}
          </div>
          <Examples
            items={EXAMPLES.map((e) => ({
              label: e.mode === 'scan' ? `${e.expr} [${e.a}, ${e.b}]` : `${e.expr} @ ${e.a}`,
              apply: () => {
                setMode(e.mode)
                setExpr(e.expr)
                setV('x')
                setA(e.a)
                if (e.b) setB(e.b)
              },
            }))}
          />
        </>
      }
    >
      {!r.ok ? (
        <ErrorBox error={r.error} />
      ) : r.data.mode === 'point' ? (
        <PointResult report={r.data.at} f={r.data.f} />
      ) : (
        <ScanResult report={r.data.scan} />
      )}
    </Panel>
  )
}

function KindBadge({ kind }: { kind: ContinuityKind }) {
  const { t } = useI18n()
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${KIND_BADGE[kind]}`}>{t(`continuity.kind.${kind}`)}</span>
}

function Detail({ r }: { r: ContinuityReport }) {
  const { t } = useI18n()
  if (r.kind === 'jump') return <span>{t('continuity.jumpSize', { size: recognize(r.jump!) })}</span>
  if (r.kind === 'boundary' && r.continuousFrom)
    return <span>{r.continuousFrom === 'right' ? t('continuity.fromRightOnly') : t('continuity.fromLeftOnly')}</span>
  return null
}

function PointResult({ report: r, f }: { report: ContinuityReport; f: (x: number) => number }) {
  const { t } = useI18n()
  const conds: [string, boolean][] = [
    [t('continuity.defined'), r.conditions.defined],
    [t('continuity.limitExists'), r.conditions.limitExists],
    [t('continuity.equals'), r.conditions.equals],
  ]
  const w = 2 * Math.max(1, Math.abs(r.a) / 2)
  return (
    <>
      <ResultBox tone={r.kind === 'continuous' ? 'ok' : 'bad'}>
        <div className="flex flex-wrap items-center gap-3">
          <BigMath>x = {recognize(r.a)}</BigMath>
          <KindBadge kind={r.kind} />
        </div>
        <div className="text-sm">
          <Detail r={r} />
        </div>
        <ul className="flex flex-col gap-0.5 text-sm">
          {conds.map(([label, ok]) => (
            <li key={label} className="flex items-center gap-2">
              <span className={ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{ok ? t('common.yes') : t('common.no')}</span>
              <span className="font-mono">{label}</span>
            </li>
          ))}
        </ul>
        <p className="font-mono text-xs opacity-80">
          f({recognize(r.a)}) = {Number.isFinite(r.fa) ? recognize(r.fa) : '—'} · lim = {r.limit.kind === 'dne' ? 'DNE' : r.limit.display}
        </p>
      </ResultBox>
      <Chart
        label={t('common.chart')}
        xRange={[r.a - w, r.a + w]}
        curves={[{ points: sample(f, r.a - w, r.a + w, 800), className: 'text-indigo-600 dark:text-indigo-400' }]}
        vLines={r.kind === 'infinite' ? [{ x: r.a }] : []}
        dots={markers(r)}
      />
    </>
  )
}

function ScanResult({ report }: { report: ScanReport }) {
  const { t } = useI18n()
  const { a, b, points } = report
  return (
    <>
      <ResultBox tone={points.length ? 'bad' : 'ok'}>
        <BigMath>{points.length ? t('continuity.found', { count: points.length }) : t('continuity.none')}</BigMath>
      </ResultBox>
      <Chart
        label={t('common.chart')}
        xRange={[a, b]}
        curves={[{ points: report.samples, className: 'text-indigo-600 dark:text-indigo-400' }]}
        vLines={points.filter((p) => p.kind === 'infinite').map((p) => ({ x: p.a }))}
        dots={points.flatMap(markers)}
      />
      {points.length > 0 && (
        <div className="flex flex-col gap-2">
          <Heading>{t('continuity.found', { count: points.length })}</Heading>
          <ul className="flex flex-col divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {points.map((p) => (
              <li key={p.a} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                <span className="w-28 font-mono">x = {recognize(p.a)}</span>
                <KindBadge kind={p.kind} />
                <span className="text-slate-600 dark:text-slate-400">
                  <Detail r={p} />
                </span>
                <span className="ml-auto font-mono text-xs text-slate-500">≈ {fmt(p.a, 8)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

'use client'

import { useState } from 'react'
import { fmt, multipleIntegral, MULTI_VARS, type Bound, type MultipleReport } from '@/calculus/core'
import { BigMath, Chart, ErrorBox, Examples, Field, Heading, Panel, ResultBox, Segmented, sample } from '@/components/ui'
import { useCompute } from '@/components/useCompute'
import { useI18n } from '@/i18n/I18nProvider'

type Dims = '2' | '3'

const EXAMPLES: { label: string; expr: string; bounds: Bound[] }[] = [
  {
    label: '∬ 1, unit disk',
    expr: '1',
    bounds: [
      { lo: '-1', hi: '1' },
      { lo: '-sqrt(1-x^2)', hi: 'sqrt(1-x^2)' },
    ],
  },
  {
    label: '∬ e^(-(x²+y²)), ℝ²',
    expr: 'e^(-(x^2+y^2))',
    bounds: [
      { lo: '-inf', hi: 'inf' },
      { lo: '-inf', hi: 'inf' },
    ],
  },
  {
    label: '∭ 1, unit ball',
    expr: '1',
    bounds: [
      { lo: '-1', hi: '1' },
      { lo: '-sqrt(1-x^2)', hi: 'sqrt(1-x^2)' },
      { lo: '-sqrt(1-x^2-y^2)', hi: 'sqrt(1-x^2-y^2)' },
    ],
  },
  {
    label: '∬ 1/(xy), [0,1]²',
    expr: '1/(x*y)',
    bounds: [
      { lo: '0', hi: '1' },
      { lo: '0', hi: '1' },
    ],
  },
  {
    label: '∬ x·y, triangle',
    expr: 'x*y',
    bounds: [
      { lo: '0', hi: '1' },
      { lo: '0', hi: 'x' },
    ],
  },
]

const compute = (a: { expr: string; bounds: Bound[] }) => multipleIntegral(a.expr, a.bounds)

export default function MultiplePanel() {
  const { t } = useI18n()
  const [dims, setDims] = useState<Dims>('2')
  const [expr, setExpr] = useState('1')
  const [bounds, setBounds] = useState<Bound[]>([
    { lo: '-1', hi: '1' },
    { lo: '-sqrt(1-x^2)', hi: 'sqrt(1-x^2)' },
    { lo: '0', hi: '1' },
  ])
  const n = Number(dims)
  const active = bounds.slice(0, n)
  const r = useCompute({ expr, bounds: active }, compute)
  const setBound = (i: number, key: keyof Bound, value: string) =>
    setBounds((bs) => bs.map((b, j) => (j === i ? { ...b, [key]: value } : b)))

  return (
    <Panel
      inputs={
        <>
          <Segmented
            label={t('multiple.dims')}
            value={dims}
            onChange={setDims}
            options={[
              { value: '2', label: t('multiple.double') },
              { value: '3', label: t('multiple.triple') },
            ]}
          />
          <Field label={`${t('common.function')} f(${MULTI_VARS.slice(0, n).join(', ')})`} value={expr} onChange={setExpr} hint={t('common.symbolsHint')} />
          {active.map((b, i) => (
            <div key={i} className="grid grid-cols-2 gap-3">
              <Field label={t('multiple.boundsFor', { v: MULTI_VARS[i] })} value={b.lo} onChange={(v) => setBound(i, 'lo', v)} />
              <Field label={t('common.to')} value={b.hi} onChange={(v) => setBound(i, 'hi', v)} />
            </div>
          ))}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('multiple.innerHint')} {t('common.boundsHint')}
          </p>
          <Examples
            items={EXAMPLES.map((e) => ({
              label: e.label,
              apply: () => {
                setDims(String(e.bounds.length) as Dims)
                setExpr(e.expr)
                setBounds((bs) => bs.map((b, i) => e.bounds[i] ?? b))
              },
            }))}
          />
        </>
      }
    >
      {!r.ok ? <ErrorBox error={r.error} /> : <MultipleResult report={r.data} expr={expr} />}
    </Panel>
  )
}

function MultipleResult({ report, expr }: { report: MultipleReport; expr: string }) {
  const { t } = useI18n()
  const ok = report.status === 'ok'
  const region = report.region
  const vars = MULTI_VARS.slice(0, report.dims)
  return (
    <>
      <ResultBox tone={ok ? 'ok' : 'bad'}>
        <BigMath>
          {report.dims === 2 ? '∬' : '∭'} {expr} d{vars.join(' d')} = <strong>{ok ? report.display : '—'}</strong>
        </BigMath>
        {ok ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-sm">
            <dt>{t('common.value')}</dt>
            <dd className="font-mono">{fmt(report.value, 12)}</dd>
            <dt>{t('common.estimatedError')}</dt>
            <dd className="font-mono">{fmt(report.error, 3)}</dd>
            <dt>{t('common.evaluations')}</dt>
            <dd className="font-mono">{report.evals.toLocaleString()}</dd>
          </dl>
        ) : (
          <p className="text-sm">{report.status === 'diverges' ? t('multiple.diverges') : t('multiple.undefined')}</p>
        )}
      </ResultBox>
      {region && (
        <div className="flex flex-col gap-2">
          <Heading>{t('multiple.region')}</Heading>
          <RegionPreview region={region} />
        </div>
      )}
    </>
  )
}

function RegionPreview({ region }: { region: NonNullable<MultipleReport['region']> }) {
  const { a, b, lower, upper } = region
  const pad = (b - a) * 0.15 || 1
  const lo = sample(lower, a, b, 300)
  const hi = sample(upper, a, b, 300)
  return (
    <Chart
      xRange={[a - pad, b + pad]}
      band={{ upper: hi, lower: lo, className: 'fill-indigo-500/25' }}
      curves={[
        { points: hi, className: 'text-indigo-600 dark:text-indigo-400' },
        { points: lo, className: 'text-indigo-600 dark:text-indigo-400' },
      ]}
      vLines={[
        { x: a, className: 'text-slate-400' },
        { x: b, className: 'text-slate-400' },
      ]}
    />
  )
}

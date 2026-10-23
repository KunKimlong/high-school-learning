'use client'

import { useState } from 'react'
import { fmt, sequenceLimit, series, type SequenceReport, type SeriesReport } from '@/calculus/core'
import { BigMath, Chart, DataTable, ErrorBox, Examples, Field, Legend, Panel, ResultBox, Segmented } from '@/components/ui'
import { useCompute } from '@/components/useCompute'
import { useI18n } from '@/i18n/I18nProvider'

type Mode = 'sequence' | 'series'

const EXAMPLES: { mode: Mode; expr: string; n0?: string }[] = [
  { mode: 'sequence', expr: '(1+1/n)^n' },
  { mode: 'sequence', expr: '(-1)^n' },
  { mode: 'sequence', expr: '1/n' },
  { mode: 'series', expr: '1/n^2', n0: '1' },
  { mode: 'series', expr: '1/n', n0: '1' },
  { mode: 'series', expr: '(-1)^(n+1)/n', n0: '1' },
  { mode: 'series', expr: '1/factorial(n)', n0: '0' },
  { mode: 'series', expr: '1/n^1.5', n0: '1' },
  { mode: 'series', expr: '1/(n*ln(n))', n0: '2' },
  { mode: 'series', expr: '(-1)^n/(2n+1)', n0: '0' },
]

type Args = { mode: Mode; expr: string; v: string; n0: string }
const compute = (a: Args): { mode: 'sequence'; seq: SequenceReport } | { mode: 'series'; ser: SeriesReport } =>
  a.mode === 'sequence' ? { mode: 'sequence', seq: sequenceLimit(a.expr, a.v) } : { mode: 'series', ser: series(a.expr, a.v, a.n0) }

export default function SeriesPanel() {
  const { t } = useI18n()
  const [mode, setMode] = useState<Mode>('series')
  const [expr, setExpr] = useState('1/n^2')
  const [v, setV] = useState('n')
  const [n0, setN0] = useState('1')
  const r = useCompute({ mode, expr, v, n0 }, compute)

  return (
    <Panel
      inputs={
        <>
          <Segmented
            label={t('series.mode')}
            value={mode}
            onChange={setMode}
            options={[
              { value: 'sequence', label: t('series.sequence') },
              { value: 'series', label: t('series.series') },
            ]}
          />
          <Field label={t('series.term')} value={expr} onChange={setExpr} hint={t('common.symbolsHint')} />
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('common.variable')} value={v} onChange={setV} />
            {mode === 'series' && <Field label={t('series.start')} value={n0} onChange={setN0} />}
          </div>
          <Examples
            items={EXAMPLES.map((e) => ({
              label: e.mode === 'series' ? `Σ ${e.expr}, n≥${e.n0}` : e.expr,
              apply: () => {
                setMode(e.mode)
                setExpr(e.expr)
                setV('n')
                if (e.n0) setN0(e.n0)
              },
            }))}
          />
        </>
      }
    >
      {!r.ok ? (
        <ErrorBox error={r.error} />
      ) : r.data.mode === 'sequence' ? (
        <SequenceResult report={r.data.seq} expr={expr} v={v} />
      ) : (
        <SeriesResult report={r.data.ser} expr={expr} v={v} />
      )}
    </Panel>
  )
}

function SequenceResult({ report, expr, v }: { report: SequenceReport; expr: string; v: string }) {
  const { t } = useI18n()
  const res = report.result
  const pts = Array.from({ length: 60 }, (_, i) => ({ x: i + 1, y: report.f(i + 1) }))
  return (
    <>
      <ResultBox tone={res.kind === 'value' ? 'ok' : 'bad'}>
        <BigMath>
          lim<sub className="text-sm">{v}→∞</sub> {expr} = <strong>{res.kind === 'dne' ? 'DNE' : res.display}</strong>
        </BigMath>
        <p className="text-sm">
          {res.kind === 'dne'
            ? t(`limit.reason.${res.reason!}`)
            : res.kind === 'inf'
              ? t('limit.isInfinite')
              : res.kind === 'undefined'
                ? t('limit.isUndefined')
                : t('limit.isValue')}
        </p>
      </ResultBox>
      <Chart
        label={t('common.chart')}
        xRange={[0, 61]}
        curves={[{ points: pts, className: 'text-indigo-600/40 dark:text-indigo-400/40' }]}
        dots={pts.map((p) => ({ ...p, className: 'text-indigo-600 dark:text-indigo-400' }))}
        hLines={res.kind === 'value' ? [{ y: res.value! }] : []}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <DataTable title={t('series.evenSamples')} columns={[v, 'aₙ']} rows={report.even.map((s) => [fmt(s.x, 16), fmt(s.y, 10)])} />
        <DataTable title={t('series.oddSamples')} columns={[v, 'aₙ']} rows={report.odd.map((s) => [fmt(s.x, 16), fmt(s.y, 10)])} />
      </div>
    </>
  )
}

function SeriesResult({ report, expr, v }: { report: SeriesReport; expr: string; v: string }) {
  const { t } = useI18n()
  const ok = report.verdict === 'converges'
  const pts = report.partials.map((p) => ({ x: p.n, y: p.s }))
  return (
    <>
      <ResultBox tone={ok ? 'ok' : 'bad'}>
        <BigMath>
          Σ<sub className="text-sm">
            {v}={report.n0}
          </sub>
          <sup className="text-sm">∞</sup> {expr}
          {ok && (
            <>
              {' '}= <strong>{report.display}</strong>
            </>
          )}
        </BigMath>
        <p className="text-lg font-semibold">
          {report.verdict === 'undefined'
            ? t('series.undefined', { n: report.badTerm! })
            : ok
              ? t('series.converges')
              : t('series.diverges')}
        </p>
        {report.test && <p className="text-sm">{t(`series.test.${report.test}`, { ratio: fmt(report.ratio ?? NaN, 6) })}</p>}
        {report.exact && <p className="text-sm">{t('series.exactSum')}</p>}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-sm">
          <dt>{t('series.termLimit')}</dt>
          <dd className="font-mono">{report.termLimit.kind === 'dne' ? 'DNE' : report.termLimit.display}</dd>
          {ok && (
            <>
              <dt>{t('series.sum')}</dt>
              <dd className="font-mono">{fmt(report.sum!, 12)}</dd>
            </>
          )}
        </dl>
      </ResultBox>
      {pts.length > 1 && (
        <>
          <Chart
            label={t('series.partialSums')}
            xRange={[1, pts[pts.length - 1].x]}
            curves={[{ points: pts, className: 'text-indigo-600 dark:text-indigo-400' }]}
            hLines={ok ? [{ y: report.sum! }] : []}
          />
          <Legend items={[{ label: t('series.legendPartial'), className: 'text-indigo-600 dark:text-indigo-400' }]} />
        </>
      )}
      <DataTable columns={[v, 'aₙ', 'Sₙ']} rows={report.rows.map((row) => [row.n, fmt(row.a, 8), fmt(row.s, 12)])} />
    </>
  )
}

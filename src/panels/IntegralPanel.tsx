'use client'

import { useState } from 'react'
import { fmt, integral, recognize } from '@/calculus/core'
import { BigMath, Chart, ErrorBox, Examples, Field, Panel, ResultBox, sample } from '@/components/ui'
import { useCompute } from '@/components/useCompute'
import { useI18n } from '@/i18n/I18nProvider'

const EXAMPLES = [
  { expr: 'x^2', a: '0', b: '1' },
  { expr: 'e^(-x^2)', a: '-inf', b: 'inf' },
  { expr: '1/sqrt(x)', a: '0', b: '1' },
  { expr: '1/x', a: '1', b: 'inf' },
  { expr: 'sqrt(x)', a: '-1', b: '1' },
  { expr: 'sin(x)', a: '0', b: 'pi' },
  { expr: '1/(1+x^2)', a: '0', b: 'inf' },
]

const compute = (a: { expr: string; v: string; lo: string; hi: string }) => integral(a.expr, a.v, a.lo, a.hi)

const boundLabel = (s: string) => s.trim().replace(/^-?inf(inity)?$/i, (m) => (m.startsWith('-') ? '−∞' : '∞'))

export default function IntegralPanel() {
  const { t } = useI18n()
  const [expr, setExpr] = useState('x^2')
  const [v, setV] = useState('x')
  const [lo, setLo] = useState('0')
  const [hi, setHi] = useState('1')
  const r = useCompute({ expr, v, lo, hi }, compute)

  return (
    <Panel
      inputs={
        <>
          <Field label={`${t('common.function')} f(${v})`} value={expr} onChange={setExpr} hint={t('common.symbolsHint')} />
          <Field label={t('common.variable')} value={v} onChange={setV} />
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('integral.lower')} value={lo} onChange={setLo} />
            <Field label={t('integral.upper')} value={hi} onChange={setHi} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('common.boundsHint')}</p>
          <Examples
            items={EXAMPLES.map((e) => ({
              label: `${e.expr} [${boundLabel(e.a)}, ${boundLabel(e.b)}]`,
              apply: () => {
                setExpr(e.expr)
                setV('x')
                setLo(e.a)
                setHi(e.b)
              },
            }))}
          />
        </>
      }
    >
      {!r.ok ? (
        <ErrorBox error={r.error} />
      ) : (
        <IntegralResult report={r.data} expr={expr} v={v} lo={boundLabel(lo)} hi={boundLabel(hi)} />
      )}
    </Panel>
  )
}

function IntegralResult({ report, expr, v, lo, hi }: { report: ReturnType<typeof integral>; expr: string; v: string; lo: string; hi: string }) {
  const { t } = useI18n()
  const ok = report.status === 'ok'
  const { a, b } = report
  const left = Math.min(a, b)
  const right = Math.max(a, b)
  const from = Number.isFinite(left) ? left : Number.isFinite(right) ? right - 10 : -10
  const to = Number.isFinite(right) ? right : from + 10 + (Number.isFinite(left) ? 0 : 10)
  const pad = (to - from) * 0.15 || 1
  const range: [number, number] = [from - pad, to + pad]
  return (
    <>
      <ResultBox tone={ok ? 'ok' : 'bad'}>
        <BigMath>
          ∫<sub className="text-sm">{lo}</sub>
          <sup className="text-sm">{hi}</sup> {expr} d{v} = <strong>{ok ? report.display : '—'}</strong>
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
          <p className="text-sm">{report.status === 'diverges' ? t('integral.diverges') : t('integral.undefined')}</p>
        )}
      </ResultBox>
      <Chart
        label={t('common.chart')}
        xRange={range}
        curves={[{ points: sample(report.f, range[0], range[1]), className: 'text-indigo-600 dark:text-indigo-400' }]}
        band={{ upper: sample(report.f, from, to, 400), className: ok ? 'fill-emerald-500/25' : 'fill-rose-500/20' }}
        yInclude={[0]}
      />
      {ok && recognize(report.value) !== fmt(report.value, 8) && (
        <p className="text-xs text-slate-500">{t('common.approx', { value: fmt(report.value, 10) })}</p>
      )}
    </>
  )
}

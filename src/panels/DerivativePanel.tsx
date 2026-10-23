'use client'

import { useState } from 'react'
import { derivative, fmt, recognize } from '@/calculus/core'
import { BigMath, Chart, ErrorBox, Examples, Field, Legend, Mono, Panel, ResultBox, Segmented, sample } from '@/components/ui'
import { useCompute } from '@/components/useCompute'
import { useI18n } from '@/i18n/I18nProvider'

const EXAMPLES = [
  { expr: 'x^3 - 2x', point: '1' },
  { expr: 'e^(x^2)', point: '' },
  { expr: 'x^x', point: '1' },
  { expr: 'abs(x)', point: '0' },
  { expr: 'sin(x)*ln(x)', point: 'pi' },
  { expr: 'atan(x)', point: '0' },
]

const ORDERS = ['1', '2', '3', '4'] as const
const PRIMES = ['′', '″', '‴', '⁽⁴⁾']

const compute = (a: { expr: string; v: string; order: number; point: string }) => derivative(a.expr, a.v, a.order, a.point)

export default function DerivativePanel() {
  const { t } = useI18n()
  const [expr, setExpr] = useState('x^3 - 2x')
  const [v, setV] = useState('x')
  const [order, setOrder] = useState<(typeof ORDERS)[number]>('1')
  const [point, setPoint] = useState('1')
  const r = useCompute({ expr, v, order: Number(order), point }, compute)

  return (
    <Panel
      inputs={
        <>
          <Field label={`${t('common.function')} f(${v})`} value={expr} onChange={setExpr} hint={t('common.symbolsHint')} />
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('common.variable')} value={v} onChange={setV} />
            <Field label={t('common.pointOptional')} value={point} onChange={setPoint} />
          </div>
          <Segmented label={t('derivative.order')} value={order} onChange={setOrder} options={ORDERS.map((o) => ({ value: o, label: o }))} />
          <Examples
            items={EXAMPLES.map((e) => ({
              label: e.point ? `${e.expr} @ ${e.point}` : e.expr,
              apply: () => {
                setExpr(e.expr)
                setV('x')
                setPoint(e.point)
                setOrder('1')
              },
            }))}
          />
        </>
      }
    >
      {!r.ok ? (
        <ErrorBox error={r.error} />
      ) : (
        <DerivativeResult report={r.data} v={v} />
      )}
    </Panel>
  )
}

function DerivativeResult({ report, v }: { report: ReturnType<typeof derivative>; v: string }) {
  const { t } = useI18n()
  const at = report.at
  const bad = at !== undefined && !Number.isFinite(at.values[0])
  const n = report.order
  const a = at?.a ?? 0
  const w = 3 * Math.max(1, Math.abs(a) / 2)
  const range: [number, number] = [a - w, a + w]
  const fPts = sample(report.fns[0], range[0], range[1])
  return (
    <>
      <ResultBox tone={bad ? 'bad' : 'ok'}>
        <div className="flex flex-col gap-1">
          {report.exprs.map((e, i) => (
            <BigMath key={i}>
              f{PRIMES[i]}({v}) = {report.symbolic ? e : '—'}
            </BigMath>
          ))}
        </div>
        {!report.symbolic && <p className="text-sm">{t('derivative.numericOnly')}</p>}
        {at && (
          <div className="mt-1 flex flex-col gap-1 text-sm">
            <div className="font-semibold">{t('derivative.atPoint', { a: recognize(at.a) })}</div>
            {bad ? (
              <p>{t('derivative.notDifferentiable', { a: recognize(at.a) })}</p>
            ) : (
              <ul className="grid gap-x-6 gap-y-0.5 font-mono sm:grid-cols-2">
                <li>
                  {t('derivative.fa', { a: recognize(at.a) })} = {recognize(at.fa)}
                </li>
                {at.values.map((d, i) => (
                  <li key={i}>
                    f{PRIMES[i]}({recognize(at.a)}) = {recognize(d)}
                    {Number.isFinite(d) && recognize(d) !== fmt(d, 8) && <span className="opacity-60"> ≈ {fmt(d, 8)}</span>}
                  </li>
                ))}
              </ul>
            )}
            {at.tangent && (
              <p>
                {t('derivative.tangent')}: <Mono>{at.tangent.text}</Mono>
              </p>
            )}
          </div>
        )}
      </ResultBox>
      <Chart
        label={t('common.chart')}
        xRange={range}
        curves={[
          { points: fPts, className: 'text-indigo-600 dark:text-indigo-400' },
          { points: sample(report.fns[n], range[0], range[1]), className: 'text-amber-500', dashed: true },
          ...(at?.tangent ? [{ points: sample((x) => at.tangent!.m * x + at.tangent!.b, range[0], range[1], 2), className: 'text-emerald-500' }] : []),
        ]}
        dots={at && Number.isFinite(at.fa) ? [{ x: at.a, y: at.fa }] : []}
      />
      <Legend
        items={[
          { label: t('derivative.legendF'), className: 'text-indigo-600 dark:text-indigo-400' },
          { label: t('derivative.legendD', { n }), className: 'text-amber-500', dashed: true },
          ...(at?.tangent ? [{ label: t('derivative.legendTangent'), className: 'text-emerald-500' }] : []),
        ]}
      />
    </>
  )
}

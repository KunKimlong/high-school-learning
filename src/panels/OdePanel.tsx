'use client'

import { useState } from 'react'
import { fmt, solveOde, type OdeReport } from '@/calculus/core'
import { BigMath, Chart, DataTable, ErrorBox, Examples, Field, Legend, Panel, ResultBox, Segmented, type ChartScale } from '@/components/ui'
import { useCompute } from '@/components/useCompute'
import { useI18n } from '@/i18n/I18nProvider'

type Order = '1' | '2'

const EXAMPLES: { order: Order; expr: string; x0: string; y0: string; yp0?: string; x1: string }[] = [
  { order: '1', expr: 'y', x0: '0', y0: '1', x1: '1' },
  { order: '2', expr: '-y', x0: '0', y0: '0', yp0: '1', x1: 'pi/2' },
  { order: '1', expr: 'y^2', x0: '0', y0: '1', x1: '2' },
  { order: '1', expr: 'x - y', x0: '0', y0: '1', x1: '3' },
  { order: '2', expr: '-0.5*yp - 4*y', x0: '0', y0: '1', yp0: '0', x1: '10' },
]

const compute = (a: { order: Order; expr: string; x0: string; y0: string; yp0: string; x1: string }) =>
  solveOde(a.order === '1' ? 1 : 2, a.expr, a.x0, a.y0, a.yp0, a.x1)

export default function OdePanel() {
  const { t } = useI18n()
  const [order, setOrder] = useState<Order>('1')
  const [expr, setExpr] = useState('y')
  const [x0, setX0] = useState('0')
  const [y0, setY0] = useState('1')
  const [yp0, setYp0] = useState('0')
  const [x1, setX1] = useState('1')
  const r = useCompute({ order, expr, x0, y0, yp0, x1 }, compute)

  return (
    <Panel
      inputs={
        <>
          <Segmented
            label={t('ode.order')}
            value={order}
            onChange={setOrder}
            options={[
              { value: '1', label: 'y′' },
              { value: '2', label: 'y″' },
            ]}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">{order === '1' ? t('ode.first') : t('ode.second')}</p>
          <Field label={order === '1' ? t('ode.rhs1') : t('ode.rhs2')} value={expr} onChange={setExpr} hint={order === '2' ? t('ode.ypHint') : undefined} />
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('ode.x0')} value={x0} onChange={setX0} />
            <Field label={t('ode.y0')} value={y0} onChange={setY0} />
            {order === '2' && <Field label={t('ode.yp0')} value={yp0} onChange={setYp0} />}
            <Field label={t('ode.x1')} value={x1} onChange={setX1} />
          </div>
          <Examples
            items={EXAMPLES.map((e) => ({
              label: `${e.order === '1' ? 'y′' : 'y″'} = ${e.expr}`,
              apply: () => {
                setOrder(e.order)
                setExpr(e.expr)
                setX0(e.x0)
                setY0(e.y0)
                setYp0(e.yp0 ?? '0')
                setX1(e.x1)
              },
            }))}
          />
        </>
      }
    >
      {!r.ok ? <ErrorBox error={r.error} /> : <OdeResult report={r.data} />}
    </Panel>
  )
}

function OdeResult({ report }: { report: OdeReport }) {
  const { t } = useI18n()
  const ok = report.status === 'ok'
  const lo = Math.min(report.x0, report.x1)
  const hi = Math.max(report.x0, report.x1)
  const range: [number, number] = lo === hi ? [lo - 1, hi + 1] : [lo, hi]
  const pts = report.points.map((p) => ({ x: p.x, y: p.y }))
  return (
    <>
      <ResultBox tone={ok ? 'ok' : 'bad'}>
        {ok ? (
          <>
            <BigMath>
              {t('ode.valueAt', { x: fmt(report.x1, 6) })} = <strong>{report.display}</strong>
            </BigMath>
            {report.order === 2 && (
              <div className="font-mono">
                {t('ode.slopeAt', { x: fmt(report.x1, 6) })} = {fmt(report.yp!, 10)}
              </div>
            )}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-sm">
              <dt>{t('common.value')}</dt>
              <dd className="font-mono">{fmt(report.y!, 12)}</dd>
              <dt>{t('common.estimatedError')}</dt>
              <dd className="font-mono">{fmt(report.error!, 3)}</dd>
            </dl>
            <p className="text-xs opacity-70">{t('ode.method')}</p>
          </>
        ) : (
          <BigMath>{t('ode.blowup', { x: fmt(report.blowX!, 4) })}</BigMath>
        )}
      </ResultBox>
      <Chart
        label={t('common.chart')}
        xRange={range}
        curves={[{ points: pts, className: 'text-indigo-600 dark:text-indigo-400' }]}
        overlay={report.order === 1 ? (s) => <SlopeField scale={s} f={report.f} /> : undefined}
        dots={[{ x: report.x0, y: report.points[0].y }]}
      />
      <Legend
        items={[
          { label: t('ode.legendSolution'), className: 'text-indigo-600 dark:text-indigo-400' },
          ...(report.order === 1 ? [{ label: t('ode.legendField'), className: 'text-slate-400' }] : []),
        ]}
      />
      <DataTable
        columns={report.order === 1 ? ['x', 'y'] : ['x', 'y', 'y′']}
        rows={report.table.map((p) => [fmt(p.x, 6), fmt(p.y, 10), ...(report.order === 2 ? [fmt(p.yp!, 10)] : [])])}
      />
    </>
  )
}

/** 22×12 short segments whose direction is normalised in pixel space. */
function SlopeField({ scale, f }: { scale: ChartScale; f: OdeReport['f'] }) {
  const { xRange, yRange, width, height } = scale
  const sx = width / (xRange[1] - xRange[0])
  const sy = height / (yRange[1] - yRange[0])
  const segs: string[] = []
  for (let i = 0; i < 22; i++) {
    for (let j = 0; j < 12; j++) {
      const x = xRange[0] + ((i + 0.5) / 22) * (xRange[1] - xRange[0])
      const y = yRange[0] + ((j + 0.5) / 12) * (yRange[1] - yRange[0])
      const m = f([x, y, 0])
      if (!Number.isFinite(m)) continue
      let dx = sx
      let dy = -m * sy
      const len = Math.hypot(dx, dy)
      dx = (dx / len) * 7
      dy = (dy / len) * 7
      const cx = scale.toX(x)
      const cy = scale.toY(y)
      segs.push(`M${(cx - dx).toFixed(1)},${(cy - dy).toFixed(1)}L${(cx + dx).toFixed(1)},${(cy + dy).toFixed(1)}`)
    }
  }
  return <path d={segs.join('')} stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" className="text-slate-300 dark:text-slate-700" />
}

'use client'

import { useState } from 'react'
import { fmt, partials, recognize, type PartialReport } from '@/calculus/core'
import { BigMath, Chart, DataTable, ErrorBox, Examples, Field, Heading, Mono, Panel, ResultBox, type ChartScale } from '@/components/ui'
import { useCompute } from '@/components/useCompute'
import { useI18n } from '@/i18n/I18nProvider'

const EXAMPLES = [
  { expr: 'x^2+y^2', vars: 'x, y', point: '0, 0' },
  { expr: 'x^2-y^2', vars: 'x, y', point: '0, 0' },
  { expr: 'x*y*z', vars: 'x, y, z', point: '1, 2, 3' },
  { expr: 'sin(x)*cos(y)', vars: 'x, y', point: 'pi/2, 0' },
  { expr: 'x^3 - 3x + y^2', vars: 'x, y', point: '-1, 0' },
]

const compute = (a: { expr: string; vars: string; point: string }) => partials(a.expr, a.vars, a.point)

const vec = (xs: number[]) => `⟨${xs.map((x) => recognize(x)).join(', ')}⟩`

export default function PartialPanel() {
  const { t } = useI18n()
  const [expr, setExpr] = useState('x^2+y^2')
  const [vars, setVars] = useState('x, y')
  const [point, setPoint] = useState('0, 0')
  const r = useCompute({ expr, vars, point }, compute)

  return (
    <Panel
      inputs={
        <>
          <Field label={t('common.function')} value={expr} onChange={setExpr} hint={t('common.symbolsHint')} />
          <Field label={t('partial.variables')} value={vars} onChange={setVars} />
          <Field label={t('common.pointOptional')} value={point} onChange={setPoint} hint={t('partial.pointHint')} />
          <Examples
            items={EXAMPLES.map((e) => ({
              label: `${e.expr} @ (${e.point})`,
              apply: () => {
                setExpr(e.expr)
                setVars(e.vars)
                setPoint(e.point)
              },
            }))}
          />
        </>
      }
    >
      {!r.ok ? <ErrorBox error={r.error} /> : <PartialResult report={r.data} />}
    </Panel>
  )
}

function PartialResult({ report }: { report: PartialReport }) {
  const { t } = useI18n()
  const { vars, at } = report
  return (
    <>
      <ResultBox tone="ok" title={t('partial.first')}>
        {report.first.map((d, i) => (
          <BigMath key={i}>
            ∂f/∂{vars[i]} = {d}
          </BigMath>
        ))}
        {at && (
          <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-sm">
            <dt>f({at.point.map((x) => recognize(x)).join(', ')})</dt>
            <dd className="font-mono">{recognize(at.value)}</dd>
            <dt>{t('partial.gradient')}</dt>
            <dd className="font-mono">{vec(at.gradient)}</dd>
            <dt>{t('partial.norm')}</dt>
            <dd className="font-mono">{recognize(at.norm)}</dd>
            {at.critical && (
              <>
                <dt>{t('partial.critical')}</dt>
                <dd className="font-semibold">{t(`partial.kind.${at.critical}`)}</dd>
              </>
            )}
          </dl>
        )}
      </ResultBox>
      <div className="flex flex-col gap-2">
        <Heading>{t('partial.second')}</Heading>
        <DataTable
          columns={['', ...vars.map((v) => `∂/∂${v}`)]}
          rows={report.second.map((row, i) => [
            `∂f/∂${vars[i]}`,
            ...row.map((d, j) => (
              <span key={j}>
                <Mono>{d}</Mono>
                {at && <span className="text-slate-500"> = {recognize(at.hessian[i][j])}</span>}
              </span>
            )),
          ])}
        />
      </div>
      {vars.length === 2 && <HeatMap report={report} />}
    </>
  )
}

const CELLS = 44

function HeatMap({ report }: { report: PartialReport }) {
  const { t } = useI18n()
  const [px, py] = report.at?.point ?? [0, 0]
  const w = 2 * Math.max(1, Math.abs(px) / 2, Math.abs(py) / 2)
  const xr: [number, number] = [px - w, px + w]
  const yr: [number, number] = [py - w, py + w]
  const vals: number[][] = []
  const buf = [0, 0]
  for (let i = 0; i < CELLS; i++) {
    vals.push([])
    for (let j = 0; j < CELLS; j++) {
      buf[0] = xr[0] + ((i + 0.5) / CELLS) * (xr[1] - xr[0])
      buf[1] = yr[0] + ((j + 0.5) / CELLS) * (yr[1] - yr[0])
      vals[i].push(report.fn(buf))
    }
  }
  const finite = vals.flat().filter(Number.isFinite).sort((a, b) => a - b)
  const lo = finite[Math.floor(0.02 * (finite.length - 1))] ?? 0
  const hi = finite[Math.ceil(0.98 * (finite.length - 1))] ?? 1
  const color = (v: number) => {
    if (!Number.isFinite(v)) return 'transparent'
    const u = hi > lo ? Math.min(1, Math.max(0, (v - lo) / (hi - lo))) : 0.5
    return `hsl(${240 - 240 * u} 75% 55%)`
  }
  const overlay = (s: ChartScale) => {
    const cw = s.width / CELLS
    const ch = s.height / CELLS
    const g = report.at?.gradient
    let arrow = null
    if (report.at && g && Number.isFinite(g[0]) && Number.isFinite(g[1]) && Math.hypot(g[0], g[1]) > 1e-12) {
      const gx = g[0] * (s.width / (xr[1] - xr[0]))
      const gy = -g[1] * (s.height / (yr[1] - yr[0]))
      const len = Math.hypot(gx, gy)
      const x1 = s.toX(px)
      const y1 = s.toY(py)
      const x2 = x1 + (gx / len) * 60
      const y2 = y1 + (gy / len) * 60
      const ang = Math.atan2(y2 - y1, x2 - x1)
      const head = (d: number) => `${x2 - 10 * Math.cos(ang + d)},${y2 - 10 * Math.sin(ang + d)}`
      arrow = (
        <g className="text-white" stroke="currentColor" strokeWidth="2.5" fill="currentColor">
          <line x1={x1} y1={y1} x2={x2} y2={y2} />
          <polygon points={`${x2},${y2} ${head(0.45)} ${head(-0.45)}`} />
        </g>
      )
    }
    return (
      <>
        {vals.map((col, i) =>
          col.map((v, j) => (
            <rect key={`${i}-${j}`} x={i * cw} y={s.height - (j + 1) * ch} width={cw + 0.5} height={ch + 0.5} fill={color(v)} />
          )),
        )}
        {arrow}
        {report.at && <circle cx={s.toX(px)} cy={s.toY(py)} r="4" className="fill-white stroke-slate-900" strokeWidth="1.5" />}
      </>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <Chart label={t('partial.heatmap')} xRange={xr} yRange={yr} overlay={overlay} />
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {t('partial.heatmap')} <Mono>{fmt(lo, 3)}</Mono> → <Mono>{fmt(hi, 3)}</Mono>
      </p>
    </div>
  )
}

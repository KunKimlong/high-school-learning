'use client'

import { useState } from 'react'
import { fmt, limit, recognize, type Direction, type LimitSide, type Side } from '@/calculus/core'
import { BigMath, Chart, DataTable, ErrorBox, Examples, Field, Panel, ResultBox, Segmented, sample } from '@/components/ui'
import { useCompute } from '@/components/useCompute'
import { useI18n, type Translate } from '@/i18n/I18nProvider'

const EXAMPLES: { expr: string; point: string; dir?: Direction }[] = [
  { expr: 'sin(x)/x', point: '0' },
  { expr: '(1-cos(x))/x^2', point: '0' },
  { expr: '(1+1/x)^x', point: 'inf' },
  { expr: 'sqrt(x^2+x)-x', point: 'inf' },
  { expr: 'abs(x)/x', point: '0' },
  { expr: '1/x^2', point: '0' },
  { expr: 'sin(1/x)', point: '0' },
  { expr: 'sqrt(x)', point: '0', dir: 'right' },
]

const compute = (a: { expr: string; v: string; point: string; dir: Direction }) => limit(a.expr, a.v, a.point, a.dir)

function sideText(s: Side, t: Translate): string {
  switch (s.kind) {
    case 'value':
      return t('limit.side.value', { value: recognize(s.value) })
    case 'inf':
      return t('limit.side.inf', { value: s.sign > 0 ? '∞' : '−∞' })
    default:
      return t(`limit.side.${s.kind}`)
  }
}

export default function LimitPanel() {
  const { t } = useI18n()
  const [expr, setExpr] = useState('sin(x)/x')
  const [v, setV] = useState('x')
  const [point, setPoint] = useState('0')
  const [dir, setDir] = useState<Direction>('both')
  const r = useCompute({ expr, v, point, dir }, compute)

  const pointLabel = r.ok ? recognize(r.data.point) : point
  const sup = dir === 'left' ? '⁻' : dir === 'right' ? '⁺' : ''

  return (
    <Panel
      inputs={
        <>
          <Field label={`${t('common.function')} f(${v})`} value={expr} onChange={setExpr} hint={t('common.symbolsHint')} />
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('common.variable')} value={v} onChange={setV} />
            <Field label={t('limit.approach')} value={point} onChange={setPoint} hint={t('common.boundsHint')} />
          </div>
          <Segmented
            label={t('limit.direction')}
            value={dir}
            onChange={setDir}
            options={[
              { value: 'both', label: t('limit.both') },
              { value: 'left', label: t('limit.left') },
              { value: 'right', label: t('limit.right') },
            ]}
          />
          <Examples
            items={EXAMPLES.map((e) => ({
              label: `${e.expr}, ${e.point}${e.dir === 'right' ? '⁺' : ''}`,
              apply: () => {
                setExpr(e.expr)
                setV('x')
                setPoint(e.point)
                setDir(e.dir ?? 'both')
              },
            }))}
          />
        </>
      }
    >
      {!r.ok ? (
        <ErrorBox error={r.error} />
      ) : (
        <>
          <ResultBox tone={r.data.result.kind === 'value' ? 'ok' : 'bad'}>
            <BigMath>
              <span className="inline-flex items-baseline gap-1">
                <span>lim</span>
                <sub className="text-sm">
                  {v}→{pointLabel}
                  {sup}
                </sub>
              </span>{' '}
              {expr} = <strong>{r.data.result.kind === 'dne' ? 'DNE' : r.data.result.display}</strong>
            </BigMath>
            <p className="text-sm">
              {r.data.result.kind === 'dne'
                ? t(`limit.reason.${r.data.result.reason!}`)
                : r.data.result.kind === 'inf'
                  ? t('limit.isInfinite')
                  : r.data.result.kind === 'undefined'
                    ? t('limit.isUndefined')
                    : t('limit.isValue')}
              {r.data.result.kind === 'value' && ` ≈ ${fmt(r.data.result.value!, 10)}`}
            </p>
            {r.data.sides.length === 2 && (
              <p className="font-mono text-xs opacity-80">
                {v}→{pointLabel}⁻: {sideText(r.data.sides[0].result, t)} · {v}→{pointLabel}⁺: {sideText(r.data.sides[1].result, t)}
              </p>
            )}
          </ResultBox>
          <LimitChart report={r.data} />
          <div className="grid gap-4 md:grid-cols-2">
            {r.data.sides.map((s) => (
              <SideTable key={s.side} side={s} v={v} />
            ))}
          </div>
        </>
      )}
    </Panel>
  )
}

function LimitChart({ report }: { report: ReturnType<typeof limit> }) {
  const { t } = useI18n()
  const a = report.point
  let range: [number, number]
  if (a === Infinity) range = [0, 60]
  else if (a === -Infinity) range = [-60, 0]
  else {
    const w = 2 * Math.max(1, Math.abs(a) / 2)
    range = [report.direction === 'right' ? a - w / 4 : a - w, report.direction === 'left' ? a + w / 4 : a + w]
  }
  const L = report.result.value
  return (
    <Chart
      label={t('common.chart')}
      xRange={range}
      curves={[{ points: sample(report.f, range[0], range[1], 800), className: 'text-indigo-600 dark:text-indigo-400' }]}
      hLines={L !== undefined && Number.isFinite(L) && !Number.isFinite(a) ? [{ y: L }] : []}
      dots={L !== undefined && Number.isFinite(L) && Number.isFinite(a) ? [{ x: a, y: L, open: true }] : []}
      yInclude={L !== undefined && Number.isFinite(L) ? [L] : []}
    />
  )
}

function SideTable({ side, v }: { side: LimitSide; v: string }) {
  const { t } = useI18n()
  return (
    <DataTable
      title={side.side === 'left' ? t('limit.leftSamples') : t('limit.rightSamples')}
      columns={[v, 'f']}
      rows={side.samples.map((s) => [fmt(s.x, 10), fmt(s.y, 10)])}
    />
  )
}

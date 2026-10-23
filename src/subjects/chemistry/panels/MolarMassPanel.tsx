'use client'

import { useState } from 'react'
import { fmt } from '@/calculus/core'
import { BY_SYMBOL, molarMass, type MolarMassReport } from '@/chemistry/core'
import { BigMath, DataTable, ErrorBox, Examples, Field, Heading, Panel, ResultBox } from '@/components/ui'
import { useCompute } from '@/components/useCompute'
import type { MessageKey } from '@/i18n/dictionaries'
import { useI18n } from '@/i18n/I18nProvider'
import { CATEGORY_STYLE, Formula } from '../shared'

const EXAMPLES = ['H2O', 'C6H12O6', 'Ca(OH)2', 'Al2(SO4)3', 'CuSO4·5H2O', 'K4[Fe(CN)6]']

const compute = (a: { formula: string; grams: string }) => molarMass(a.formula, a.grams)

export default function MolarMassPanel() {
  const { t } = useI18n()
  const [formula, setFormula] = useState('C6H12O6')
  const [grams, setGrams] = useState('')
  const r = useCompute({ formula, grams }, compute)

  return (
    <Panel
      inputs={
        <>
          <Field label={t('chemistry.molar.formula')} value={formula} onChange={setFormula} hint={t('chemistry.molar.formulaHint')} />
          <Field label={t('chemistry.molar.sample')} value={grams} onChange={setGrams} placeholder="10" />
          <Examples items={EXAMPLES.map((f) => ({ label: f, apply: () => setFormula(f) }))} />
        </>
      }
    >
      {!r.ok ? <ErrorBox error={r.error} /> : <MolarResult report={r.data} />}
    </Panel>
  )
}

function MolarResult({ report }: { report: MolarMassReport }) {
  const { t } = useI18n()
  return (
    <>
      <ResultBox tone="ok">
        <BigMath>
          M(<Formula text={report.formula} />) = <strong>{fmt(report.molarMass, 7)}</strong> g/mol
        </BigMath>
        {report.sample && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-sm">
            <dt>{t('chemistry.molar.moles')}</dt>
            <dd className="font-mono">{fmt(report.sample.moles, 6)} mol</dd>
            <dt>{t('chemistry.molar.particles')}</dt>
            <dd className="font-mono">{fmt(report.sample.particles, 5)}</dd>
          </dl>
        )}
      </ResultBox>
      <div className="flex flex-col gap-2">
        <Heading>{t('chemistry.molar.composition')}</Heading>
        <div className="flex h-4 overflow-hidden rounded-full">
          {report.parts.map((p) => (
            <div key={p.symbol} title={`${p.symbol} ${fmt(p.percent, 4)}%`} style={{ width: `${p.percent}%` }} className={CATEGORY_STYLE[BY_SYMBOL.get(p.symbol)!.category]} />
          ))}
        </div>
      </div>
      <DataTable
        columns={[t('chemistry.molar.element'), t('chemistry.molar.count'), t('chemistry.molar.mass'), '%']}
        rows={report.parts.map((p) => [
          <span key="el" className="inline-flex items-center gap-2">
            <span className={`rounded px-1.5 font-semibold ${CATEGORY_STYLE[BY_SYMBOL.get(p.symbol)!.category]}`}>{p.symbol}</span>
            <span className="font-sans text-slate-500">{t(`chemistry.elements.${p.symbol}` as MessageKey)}</span>
          </span>,
          p.count,
          fmt(p.mass, 7),
          fmt(p.percent, 4),
        ])}
      />
    </>
  )
}

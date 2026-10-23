'use client'

import { useState } from 'react'
import { fmt } from '@/calculus/core'
import { idealGas, R, type GasInput, type GasQuantity, type GasReport, type PressureUnit, type TemperatureUnit } from '@/chemistry/core'
import { BigMath, ErrorBox, Examples, Field, Panel, ResultBox, Segmented } from '@/components/ui'
import { useCompute } from '@/components/useCompute'
import { useI18n } from '@/i18n/I18nProvider'

const EXAMPLES: { key: 'stp' | 'room' | 'pressure' | 'temperature'; input: GasInput }[] = [
  { key: 'stp', input: { P: '1', V: '', n: '1', T: '273.15', pUnit: 'atm', tUnit: 'K' } },
  { key: 'room', input: { P: '101.325', V: '10', n: '', T: '25', pUnit: 'kPa', tUnit: 'C' } },
  { key: 'pressure', input: { P: '', V: '5', n: '2', T: '300', pUnit: 'atm', tUnit: 'K' } },
  { key: 'temperature', input: { P: '760', V: '12', n: '0.5', T: '', pUnit: 'mmHg', tUnit: 'C' } },
]

export default function GasPanel() {
  const { t } = useI18n()
  const [input, setInput] = useState<GasInput>(EXAMPLES[0].input)
  const r = useCompute(input, idealGas)
  const set = (k: keyof GasInput) => (v: string) => setInput((s) => ({ ...s, [k]: v }))

  return (
    <Panel
      inputs={
        <>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('chemistry.gas.instructions')}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`P (${input.pUnit})`} value={input.P} onChange={set('P')} />
            <Field label="V (L)" value={input.V} onChange={set('V')} />
            <Field label="n (mol)" value={input.n} onChange={set('n')} />
            <Field label={`T (${input.tUnit === 'C' ? '°C' : 'K'})`} value={input.T} onChange={set('T')} />
          </div>
          <Segmented<PressureUnit>
            label={t('chemistry.gas.pressureUnit')}
            value={input.pUnit}
            onChange={set('pUnit') as (v: PressureUnit) => void}
            options={[
              { value: 'atm', label: 'atm' },
              { value: 'kPa', label: 'kPa' },
              { value: 'mmHg', label: 'mmHg' },
            ]}
          />
          <Segmented<TemperatureUnit>
            label={t('chemistry.gas.temperatureUnit')}
            value={input.tUnit}
            onChange={set('tUnit') as (v: TemperatureUnit) => void}
            options={[
              { value: 'K', label: 'K' },
              { value: 'C', label: '°C' },
            ]}
          />
          <Examples items={EXAMPLES.map((e) => ({ label: t(`chemistry.gas.examples.${e.key}`), apply: () => setInput(e.input) }))} />
        </>
      }
    >
      {!r.ok ? <ErrorBox error={r.error} /> : <GasResult report={r.data} input={input} />}
    </Panel>
  )
}

function GasResult({ report, input }: { report: GasReport; input: GasInput }) {
  const { t } = useI18n()
  const units: Record<GasQuantity, string> = { P: input.pUnit, V: 'L', n: 'mol', T: input.tUnit === 'C' ? '°C' : 'K' }
  const { solved, values } = report
  return (
    <ResultBox tone="ok">
      <BigMath>
        {solved} = <strong>{fmt(values[solved], 6)}</strong> {units[solved]}
      </BigMath>
      <p className="font-mono text-sm">PV = nRT</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-sm">
        {(['P', 'V', 'n', 'T'] as const).map((k) => (
          <div key={k} className="contents">
            <dt className={k === solved ? 'font-semibold' : ''}>{t(`chemistry.gas.${k}`)}</dt>
            <dd className={`font-mono ${k === solved ? 'font-semibold' : ''}`}>
              {fmt(values[k], 6)} {units[k]}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-xs opacity-70">{t('chemistry.gas.constant', { R: String(R) })}</p>
    </ResultBox>
  )
}

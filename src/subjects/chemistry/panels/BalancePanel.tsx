'use client'

import { useRef, useState } from 'react'
import { fmt } from '@/calculus/core'
import { balance, BY_SYMBOL, ELEMENTS, normalizeSubscripts, type BalanceReport, type Species } from '@/chemistry/core'
import { BigMath, DataTable, ErrorBox, Examples, Field, Heading, Panel, ResultBox } from '@/components/ui'
import { useCompute } from '@/components/useCompute'
import type { MessageKey } from '@/i18n/dictionaries'
import { useI18n } from '@/i18n/I18nProvider'
import { CATEGORY_STYLE, Formula } from '../shared'

const EXAMPLES = [
  'H2 + O2 -> H2O',
  'C3H8 + O2 -> CO2 + H2O',
  'Fe + O2 -> Fe2O3',
  'KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2',
  'Al + CuSO4 -> Al2(SO4)3 + Cu',
  'C6H12O6 + O2 -> CO2 + H2O',
]

const COMMON = ['H', 'C', 'N', 'O', 'F', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'K', 'Ca', 'Mn', 'Fe', 'Cu', 'Zn', 'Ag', 'Br', 'I', 'Ba', 'Pb']
const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉'

const compute = (a: { equation: string }) => balance(a.equation)

/** Splits on + and arrows, keeping the separators, for the live preview. */
const SEPARATOR = /(\s*\+\s*|\s*(?:<=>|<->|->|=>|→|⟶|=)\s*)/

function Preview({ text }: { text: string }) {
  const parts = normalizeSubscripts(text).split(SEPARATOR)
  return (
    <div className="min-h-8 rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-lg break-words dark:bg-slate-800">
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span key={i} className="text-slate-500">
            {p.includes('+') ? ' + ' : ' → '}
          </span>
        ) : (
          <Formula key={i} text={p.trim()} />
        ),
      )}
    </div>
  )
}

function Side({ list }: { list: Species[] }) {
  return (
    <>
      {list.map((s, i) => (
        <span key={i}>
          {i > 0 && ' + '}
          {s.coefficient > 1 && <strong className="text-indigo-700 dark:text-indigo-300">{s.coefficient}</strong>}
          <Formula text={s.formula} />
        </span>
      ))}
    </>
  )
}

const keyClass =
  'min-w-9 rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-sm text-slate-800 transition hover:border-indigo-400 hover:bg-indigo-50 active:bg-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-indigo-950/50'

export default function BalancePanel() {
  const { t } = useI18n()
  const [equation, setEquation] = useState('C3H8 + O2 -> CO2 + H2O')
  const [showAll, setShowAll] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const r = useCompute({ equation }, compute)

  /** Replace the current selection (or insert at the cursor) and keep focus in the field. */
  const insert = (text: string) => {
    const el = inputRef.current
    const start = el?.selectionStart ?? equation.length
    const end = el?.selectionEnd ?? equation.length
    setEquation(equation.slice(0, start) + text + equation.slice(end))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + text.length, start + text.length)
    })
  }

  const backspace = () => {
    const el = inputRef.current
    const start = el?.selectionStart ?? equation.length
    const end = el?.selectionEnd ?? equation.length
    const from = start === end ? Math.max(0, start - 1) : start
    setEquation(equation.slice(0, from) + equation.slice(end))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(from, from)
    })
  }

  const elementKey = (symbol: string) => (
    <button
      key={symbol}
      type="button"
      onClick={() => insert(symbol)}
      title={t(`chemistry.elements.${symbol}` as MessageKey)}
      className={`min-w-9 rounded-md px-2 py-1.5 font-mono text-sm font-semibold transition hover:ring-2 hover:ring-indigo-400 ${CATEGORY_STYLE[BY_SYMBOL.get(symbol)!.category]}`}
    >
      {symbol}
    </button>
  )

  return (
    <Panel
      inputs={
        <>
          <Field
            label={t('chemistry.balance.equation')}
            value={equation}
            onChange={setEquation}
            hint={t('chemistry.balance.hint')}
            inputRef={inputRef}
          />
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">{t('chemistry.balance.preview')}</span>
            <Preview text={equation} />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('chemistry.balance.keypad')}</span>
            <div className="flex flex-wrap gap-1">{(showAll ? ELEMENTS.map((e) => e.symbol) : COMMON).map(elementKey)}</div>
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="self-start text-xs font-medium text-indigo-700 hover:underline dark:text-indigo-300"
            >
              {showAll ? t('chemistry.balance.commonOnly') : t('chemistry.balance.allElements')}
            </button>
            <div className="flex flex-wrap gap-1">
              {[...SUBSCRIPTS].map((s, d) => (
                <button key={s} type="button" onClick={() => insert(String(d))} className={keyClass} title={String(d)}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {['(', ')', '[', ']', '·'].map((s) => (
                <button key={s} type="button" onClick={() => insert(s)} className={keyClass}>
                  {s}
                </button>
              ))}
              <button type="button" onClick={() => insert(' + ')} className={keyClass}>
                +
              </button>
              <button type="button" onClick={() => insert(' → ')} className={keyClass}>
                →
              </button>
              <button type="button" onClick={backspace} className={keyClass} aria-label={t('chemistry.balance.backspace')}>
                ⌫
              </button>
              <button
                type="button"
                onClick={() => {
                  setEquation('')
                  inputRef.current?.focus()
                }}
                className={`${keyClass} text-rose-700 dark:text-rose-300`}
              >
                {t('chemistry.balance.clear')}
              </button>
            </div>
          </div>

          <Examples items={EXAMPLES.map((e) => ({ label: e, apply: () => setEquation(e) }))} />
        </>
      }
    >
      {!r.ok ? <ErrorBox error={r.error} /> : <BalanceResult report={r.data} />}
    </Panel>
  )
}

function BalanceResult({ report }: { report: BalanceReport }) {
  const { t } = useI18n()
  const all = [...report.reactants, ...report.products]
  const conserved = Math.abs(report.mass.left - report.mass.right) < 1e-6 * Math.max(1, report.mass.left)
  return (
    <>
      <ResultBox tone="ok" title={t('chemistry.balance.result')}>
        <BigMath>
          <Side list={report.reactants} /> → <Side list={report.products} />
        </BigMath>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-sm">
          <dt>{t('chemistry.balance.ratio')}</dt>
          <dd className="font-mono">{all.map((s) => s.coefficient).join(' : ')}</dd>
          <dt>{t('chemistry.balance.massCheck')}</dt>
          <dd className="font-mono">
            {fmt(report.mass.left, 7)} g {conserved ? '=' : '≠'} {fmt(report.mass.right, 7)} g {conserved ? '✓' : '✗'}
          </dd>
        </dl>
        <p className="font-mono text-xs opacity-70">{report.equation}</p>
      </ResultBox>

      <div className="flex flex-col gap-2">
        <Heading>{t('chemistry.balance.substances')}</Heading>
        <DataTable
          columns={[
            t('chemistry.balance.substance'),
            t('chemistry.balance.side'),
            t('chemistry.balance.coefficient'),
            t('chemistry.molar.mass'),
            t('chemistry.balance.totalMass'),
          ]}
          rows={all.map((s, i) => [
            <Formula key="f" text={s.formula} />,
            i < report.reactants.length ? t('chemistry.balance.reactant') : t('chemistry.balance.product'),
            s.coefficient,
            fmt(s.molarMass, 7),
            fmt(s.coefficient * s.molarMass, 7),
          ])}
        />
      </div>

      <DataTable
        title={t('chemistry.balance.check')}
        columns={[t('chemistry.molar.element'), t('chemistry.balance.reactants'), t('chemistry.balance.products'), '']}
        rows={report.check.map((c) => [c.symbol, c.left, c.right, c.left === c.right ? '✓' : '✗'])}
      />
    </>
  )
}

'use client'

import { useState } from 'react'
import { fmt } from '@/calculus/core'
import { ELEMENTS, tablePosition, type Category, type Element } from '@/chemistry/core'
import { Card, Field, Heading } from '@/components/ui'
import type { MessageKey } from '@/i18n/dictionaries'
import { useI18n } from '@/i18n/I18nProvider'
import { CATEGORY_STYLE } from '../shared'

const CATEGORIES = Object.keys(CATEGORY_STYLE) as Category[]

export default function PeriodicTablePanel() {
  const { t } = useI18n()
  const [selected, setSelected] = useState<Element>(ELEMENTS[0])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | null>(null)
  const name = (e: Element) => t(`chemistry.elements.${e.symbol}` as MessageKey)

  const q = query.trim().toLowerCase()
  const matches = (e: Element) =>
    (!q || e.symbol.toLowerCase() === q || name(e).toLowerCase().includes(q) || String(e.z) === q) &&
    (!category || e.category === category)

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <Card className="flex min-w-0 flex-col gap-4">
        <Field label={t('chemistry.periodic.search')} value={query} onChange={setQuery} placeholder={t('chemistry.periodic.searchHint')} />
        <div className="scrollbar-thin overflow-x-auto">
          <div className="grid min-w-[46rem] grid-cols-18 gap-1">
            {ELEMENTS.map((e) => {
              const { row, col } = tablePosition(e)
              const on = matches(e)
              return (
                <button
                  key={e.z}
                  type="button"
                  onClick={() => setSelected(e)}
                  title={name(e)}
                  aria-pressed={selected.z === e.z}
                  style={{ gridRow: row > 7 ? row + 1 : row, gridColumn: col }}
                  className={`flex aspect-square flex-col items-center justify-center rounded-md text-center transition ${CATEGORY_STYLE[e.category]} ${
                    on ? '' : 'opacity-25'
                  } ${selected.z === e.z ? 'ring-2 ring-indigo-600 dark:ring-indigo-400' : 'hover:ring-2 hover:ring-slate-400'}`}
                >
                  <span className="text-[9px] leading-none opacity-70">{e.z}</span>
                  <span className="text-sm leading-tight font-semibold">{e.symbol}</span>
                </button>
              )
            })}
            {(['57–71', '89–103'] as const).map((label, i) => (
              <div
                key={label}
                style={{ gridRow: 6 + i, gridColumn: 3 }}
                className={`flex aspect-square items-center justify-center rounded-md text-[9px] ${CATEGORY_STYLE[i ? 'actinide' : 'lanthanide']}`}
              >
                {label}
              </div>
            ))}
            {/* Spacer row between the main table and the f-block. */}
            <div style={{ gridRow: 8, gridColumn: '1 / -1' }} className="h-2" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(category === c ? null : c)}
              aria-pressed={category === c}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_STYLE[c]} ${
                category && category !== c ? 'opacity-40' : ''
              } ${category === c ? 'ring-2 ring-indigo-600 dark:ring-indigo-400' : ''}`}
            >
              {t(`chemistry.category.${c}`)}
            </button>
          ))}
        </div>
      </Card>
      <ElementCard element={selected} name={name(selected)} />
    </div>
  )
}

function ElementCard({ element: e, name }: { element: Element; name: string }) {
  const { t } = useI18n()
  const radioactive = Number.isInteger(e.mass)
  const rows: [string, string][] = [
    [t('chemistry.periodic.atomicNumber'), String(e.z)],
    [t('chemistry.periodic.atomicMass'), radioactive ? `[${e.mass}]` : fmt(e.mass, 6)],
    [t('chemistry.periodic.group'), e.group ? String(e.group) : '—'],
    [t('chemistry.periodic.period'), String(e.period)],
    [t('chemistry.periodic.category'), t(`chemistry.category.${e.category}`)],
  ]
  return (
    <Card className="flex flex-col gap-4 self-start">
      <Heading>{t('chemistry.periodic.details')}</Heading>
      <div className={`flex items-center gap-4 rounded-xl p-4 ${CATEGORY_STYLE[e.category]}`}>
        <span className="text-4xl font-bold">{e.symbol}</span>
        <div className="flex flex-col">
          <span className="text-lg font-semibold">{name}</span>
          <span className="text-sm opacity-80">Z = {e.z}</span>
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-slate-500 dark:text-slate-400">{k}</dt>
            <dd className="font-mono">{v}</dd>
          </div>
        ))}
      </dl>
      {radioactive && <p className="text-xs text-slate-500 dark:text-slate-400">{t('chemistry.periodic.massNote')}</p>}
    </Card>
  )
}

'use client'

import { useState, type ComponentType } from 'react'

export interface SubjectTab {
  id: string
  icon: string
  name: string
  description: string
  Panel: ComponentType
}

/** Subject page: title, a row of topic tabs, and the topic panels (all kept mounted). */
export default function SubjectTabs({
  title,
  description,
  topicsLabel,
  tabs,
}: {
  title: string
  description: string
  topicsLabel: string
  tabs: SubjectTab[]
}) {
  const [tab, setTab] = useState(tabs[0].id)
  const current = tabs.find((x) => x.id === tab) ?? tabs[0]

  return (
    <div className="flex flex-col">
      <header className="border-b border-slate-200 bg-white px-4 pt-5 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
        <nav aria-label={topicsLabel} className="scrollbar-thin -mx-4 mt-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
          <div role="tablist" className="flex w-max gap-1">
            {tabs.map(({ id, icon, name }) => (
              <button
                key={id}
                id={`tab-${id}`}
                type="button"
                role="tab"
                aria-selected={tab === id}
                aria-controls={`panel-${id}`}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition ${
                  tab === id
                    ? 'border-indigo-600 font-semibold text-indigo-700 dark:border-indigo-400 dark:text-indigo-300'
                    : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                <span className="min-w-6 font-mono text-xs opacity-80">{icon}</span>
                {name}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6">
        <p className="text-sm text-slate-600 dark:text-slate-400">{current.description}</p>
        {/* Every panel stays mounted so each tab keeps its inputs. */}
        {tabs.map(({ id, Panel }) => (
          <div key={id} id={`panel-${id}`} role="tabpanel" aria-labelledby={`tab-${id}`} hidden={tab !== id}>
            <Panel />
          </div>
        ))}
      </div>
    </div>
  )
}

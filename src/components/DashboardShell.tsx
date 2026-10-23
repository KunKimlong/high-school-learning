'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import { SUBJECTS } from '@/subjects'

export default function DashboardShell({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n()
  const pathname = usePathname()

  const links = SUBJECTS.map(({ id, icon }) => {
    const href = `/${locale}/${id}`
    return { id, icon, href, active: pathname === href || pathname.startsWith(`${href}/`) }
  })

  return (
    <div className="min-h-dvh lg:flex">
      {/* Sidebar on large screens, top bar on small ones. */}
      <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 px-4 py-3 lg:px-5 lg:py-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">L</span>
          <span className="text-lg font-semibold tracking-tight">{t('app.title')}</span>
        </div>
        <nav aria-label={t('nav.subjects')} className="flex flex-col gap-1 px-3 pb-3 lg:flex-1 lg:pb-5">
          <span className="hidden px-2 pb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase lg:block dark:text-slate-400">
            {t('nav.subjects')}
          </span>
          <div className="flex gap-1 overflow-x-auto lg:flex-col">
            {links.map((l) => (
              <Link
                key={l.id}
                href={l.href}
                aria-current={l.active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition ${
                  l.active
                    ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`}
              >
                <span className="w-5 text-center font-mono">{l.icon}</span>
                {t(`subjects.${l.id}.name`)}
              </Link>
            ))}
          </div>
          <p className="mt-auto hidden px-2 text-xs text-slate-400 lg:block dark:text-slate-500">{t('nav.comingSoon')}</p>
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}

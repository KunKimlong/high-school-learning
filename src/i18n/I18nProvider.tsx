'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Locale } from './config'
import type { Dictionary, MessageKey } from './dictionaries'

export type Translate = (key: MessageKey, params?: Record<string, string | number>) => string

interface I18n {
  locale: Locale
  t: Translate
}

const I18nContext = createContext<I18n | null>(null)

function lookup(dict: Dictionary, key: string): string {
  let node: unknown = dict
  for (const part of key.split('.')) node = (node as Record<string, unknown> | undefined)?.[part]
  return typeof node === 'string' ? node : key
}

export function I18nProvider({ locale, dict, children }: { locale: Locale; dict: Dictionary; children: ReactNode }) {
  const value = useMemo<I18n>(
    () => ({
      locale,
      t: (key, params) =>
        lookup(dict, key).replace(/\{(\w+)\}/g, (m, name: string) => (params && name in params ? String(params[name]) : m)),
    }),
    [locale, dict],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}

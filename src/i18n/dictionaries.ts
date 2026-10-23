import type { Locale } from './config'
import type en from './dictionaries/en.json'

export type Dictionary = typeof en

// Add a locale here (and to `locales` in config.ts) to ship another language.
const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import('./dictionaries/en.json').then((m) => m.default),
}

export const getDictionary = (locale: Locale) => dictionaries[locale]()

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>
}[keyof T & string]

/** Every dotted key that points at a string, e.g. `"limit.reason.oscillates"`. */
export type MessageKey = Leaves<Dictionary>

import type { Category } from '@/chemistry/core'

/** Solid colours per element category, for light and dark mode. */
export const CATEGORY_STYLE: Record<Category, string> = {
  alkali: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
  alkaline: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200',
  transition: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  postTransition: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200',
  metalloid: 'bg-lime-100 text-lime-900 dark:bg-lime-950 dark:text-lime-200',
  nonmetal: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  halogen: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200',
  noble: 'bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200',
  lanthanide: 'bg-pink-100 text-pink-900 dark:bg-pink-950 dark:text-pink-200',
  actinide: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200',
}

/** Render digits as subscripts, except a leading coefficient or a hydrate multiplier. */
export function Formula({ text }: { text: string }) {
  const parts = text.split(/(\d+)/)
  return (
    <span>
      {parts.map((p, i) => {
        const coefficient = i === 1 && parts[0] === ''
        const afterDot = /[·*.]$/.test(parts[i - 1] ?? '')
        return /^\d+$/.test(p) && !coefficient && !afterDot ? <sub key={i}>{p}</sub> : <span key={i}>{p}</span>
      })}
    </span>
  )
}

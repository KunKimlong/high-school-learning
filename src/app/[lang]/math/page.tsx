import type { Metadata } from 'next'
import { hasLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import MathSubject from '@/subjects/math/MathSubject'

export async function generateMetadata({ params }: PageProps<'/[lang]/math'>): Promise<Metadata> {
  const { lang } = await params
  if (!hasLocale(lang)) return {}
  const dict = await getDictionary(lang)
  return { title: dict.subjects.math.name }
}

export default function Page() {
  return <MathSubject />
}

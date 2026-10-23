import type { Metadata } from 'next'
import { hasLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import ChemistrySubject from '@/subjects/chemistry/ChemistrySubject'

export async function generateMetadata({ params }: PageProps<'/[lang]/chemistry'>): Promise<Metadata> {
  const { lang } = await params
  if (!hasLocale(lang)) return {}
  const dict = await getDictionary(lang)
  return { title: dict.subjects.chemistry.name }
}

export default function Page() {
  return <ChemistrySubject />
}

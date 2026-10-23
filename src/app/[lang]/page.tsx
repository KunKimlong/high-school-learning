import { redirect } from 'next/navigation'
import { DEFAULT_SUBJECT } from '@/subjects'

export default async function Page({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params
  redirect(`/${lang}/${DEFAULT_SUBJECT}`)
}

'use client'

import type { ComponentType } from 'react'
import SubjectTabs from '@/components/SubjectTabs'
import { useI18n } from '@/i18n/I18nProvider'
import BalancePanel from './panels/BalancePanel'
import GasPanel from './panels/GasPanel'
import MolarMassPanel from './panels/MolarMassPanel'
import PeriodicTablePanel from './panels/PeriodicTablePanel'

type TabId = 'periodic' | 'molarMass' | 'balance' | 'gas'

const TABS: { id: TabId; icon: string; Panel: ComponentType }[] = [
  { id: 'periodic', icon: 'Fe', Panel: PeriodicTablePanel },
  { id: 'molarMass', icon: 'g/mol', Panel: MolarMassPanel },
  { id: 'balance', icon: '⇌', Panel: BalancePanel },
  { id: 'gas', icon: 'PV', Panel: GasPanel },
]

export default function ChemistrySubject() {
  const { t } = useI18n()
  return (
    <SubjectTabs
      title={t('subjects.chemistry.name')}
      description={t('subjects.chemistry.description')}
      topicsLabel={t('subjects.chemistry.topics')}
      tabs={TABS.map((tab) => ({
        ...tab,
        name: t(`chemistry.tabs.${tab.id}.name`),
        description: t(`chemistry.tabs.${tab.id}.description`),
      }))}
    />
  )
}

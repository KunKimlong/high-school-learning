'use client'

import type { ComponentType } from 'react'
import SubjectTabs from '@/components/SubjectTabs'
import { useI18n } from '@/i18n/I18nProvider'
import ContinuityPanel from '@/panels/ContinuityPanel'
import DerivativePanel from '@/panels/DerivativePanel'
import IntegralPanel from '@/panels/IntegralPanel'
import LimitPanel from '@/panels/LimitPanel'
import MultiplePanel from '@/panels/MultiplePanel'
import OdePanel from '@/panels/OdePanel'
import PartialPanel from '@/panels/PartialPanel'
import SeriesPanel from '@/panels/SeriesPanel'

type TabId = 'limit' | 'derivative' | 'integral' | 'ode' | 'series' | 'continuity' | 'partial' | 'multiple'

const TABS: { id: TabId; icon: string; Panel: ComponentType }[] = [
  { id: 'limit', icon: 'lim', Panel: LimitPanel },
  { id: 'derivative', icon: 'd/dx', Panel: DerivativePanel },
  { id: 'integral', icon: '∫', Panel: IntegralPanel },
  { id: 'ode', icon: 'y′', Panel: OdePanel },
  { id: 'series', icon: 'Σ', Panel: SeriesPanel },
  { id: 'continuity', icon: '⌇', Panel: ContinuityPanel },
  { id: 'partial', icon: '∂', Panel: PartialPanel },
  { id: 'multiple', icon: '∬', Panel: MultiplePanel },
]

export default function MathSubject() {
  const { t } = useI18n()
  return (
    <SubjectTabs
      title={t('subjects.math.name')}
      description={t('subjects.math.description')}
      topicsLabel={t('subjects.math.topics')}
      tabs={TABS.map((tab) => ({ ...tab, name: t(`tabs.${tab.id}.name`), description: t(`tabs.${tab.id}.description`) }))}
    />
  )
}

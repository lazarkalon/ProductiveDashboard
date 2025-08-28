// BurndownKpiCards.tsx
'use client'

import React from 'react'
import dayjs from 'dayjs'
import {
  Card,
  Flex,
  Metric,
  ProgressBar,
  Text,
  Title,
  CategoryBar,
} from '@tremor/react'
import getHoursFromMinutes from '../../utils/getHoursFromMinutes'
import { BusinessDate } from '../../utils/getBusinessDates'
import getBusinessDaysDiff from '../../utils/getBusinessDaysDiff'

export interface BurndownKpiCardsProps {
  estimatedMinutes: number
  actualMinutes: number
  estimatedTasksCount: number
  actualTasksCount: number
  businessDates: BusinessDate[]

  scopeInitialMinutes?: number
  scopeAddedMinutes?: number
  scopeInitialTasksCount?: number
  scopeAddedTasksCount?: number

  tasksDoneLabel?: string

  /** Optional: override background classes */
  kpiCardBgClasses?: string[] // length 3 (days, tasks, time)
  scopeCardBgClass?: string
}

const BurndownKpiCards: React.FC<BurndownKpiCardsProps> = ({
  estimatedMinutes,
  actualMinutes,
  estimatedTasksCount,
  actualTasksCount,
  businessDates,
  scopeInitialMinutes = 0,
  scopeAddedMinutes = 0,
  scopeInitialTasksCount = 0,
  scopeAddedTasksCount = 0,
  tasksDoneLabel = 'done',

  // default backgrounds (darkish, semi‑transparent)
  kpiCardBgClasses = ['!bg-sky-900/40', '!bg-emerald-900/40', '!bg-violet-900/40'],
  scopeCardBgClass = '!bg-amber-900/40',
}) => {
  const estimatedHours = getHoursFromMinutes(estimatedMinutes)
  const actualHours = getHoursFromMinutes(actualMinutes)
  const dateFormat = 'DD MMM'

  const startOfSprintDay = dayjs(businessDates[0])
  const today = dayjs()
  const businessDaysDiffOfTodayFromStartOfSprintDay = getBusinessDaysDiff(
    startOfSprintDay,
    today,
  )

  // Scope change calcs
  const toHours = (min: number) => Math.round((min / 60) * 10) / 10
  const scopeInitialHours = toHours(scopeInitialMinutes)
  const scopeAddedHours = toHours(scopeAddedMinutes)
  const scopeTotalHours = scopeInitialHours + scopeAddedHours

  const cards = [
    {
      key: 'days',
      category: `Completion by Days (${dayjs(businessDates[0]).format(dateFormat)} –– ${dayjs(
        businessDates.at(-1),
      ).format(dateFormat)})`,
      stat: `${businessDaysDiffOfTodayFromStartOfSprintDay} / ${businessDates.length}`,
      unit: 'business days',
      numerator: businessDaysDiffOfTodayFromStartOfSprintDay,
      numeratorUnit: 'days',
      denominator: businessDates.length || 0,
      denominatorUnit: 'total days',
      renderBar: (pct: number) => <ProgressBar value={pct} className="mt-2" />,
    },
    {
      key: 'tasks',
      category: 'Completion by Tasks',
      stat: `${actualTasksCount} / ${estimatedTasksCount}`,
      unit: 'tasks',
      numerator: actualTasksCount,
      numeratorUnit: tasksDoneLabel,
      denominator: estimatedTasksCount,
      denominatorUnit: 'total tasks',
      renderBar: (pct: number) => <ProgressBar value={pct} className="mt-2" />,
    },
    {
      key: 'time',
      category: 'Completion by Time',
      stat: `${actualHours} h / ${estimatedHours} h`,
      unit: 'hours',
      numerator: actualHours,
      numeratorUnit: 'act. hours',
      denominator: estimatedHours,
      denominatorUnit: 'est. hours',
      renderBar: (pct: number) => <ProgressBar value={pct} className="mt-2" />,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
      {cards.map((item, i) => {
        const {
          key,
          category,
          stat,
          unit,
          numerator,
          numeratorUnit,
          denominator,
          denominatorUnit,
          renderBar,
        } = item
        const percentage = denominator
          ? Math.round((Number(numerator) / Number(denominator)) * 100)
          : 0

        // pick bg by index, fall back if fewer provided
        const bg = kpiCardBgClasses[i] ?? 'bg-slate-800/40'

        return (
          <Card
            key={key}
            className={`flex flex-col ${bg} border-0 shadow-none`}
          >
            <Title>{category}</Title>

            <Flex justifyContent="start" alignItems="baseline" className="space-x-1">
              <Metric>{stat}</Metric>
              <Text>{unit}</Text>
            </Flex>

            <Flex className="mt-4">
              <Text className="truncate">
                {numerator} {numeratorUnit || unit} ({isFinite(percentage) ? percentage : 0}% completed)
              </Text>
              <Text>
                {denominator} {denominatorUnit}
              </Text>
            </Flex>

            {renderBar(isFinite(percentage) ? percentage : 0)}
          </Card>
        )
      })}

      {/* Scope Change card */}
      <Card className={`flex flex-col ${scopeCardBgClass} border-0 shadow-none`}>
        <Title>Scope Change</Title>

        <Flex justifyContent="start" alignItems="baseline" className="space-x-1">
          <Metric>{scopeAddedHours} h added</Metric>
        </Flex>

        <Flex className="mt-4">
          <Text className="truncate">
            {scopeInitialHours} h initial · {scopeInitialTasksCount} tasks
          </Text>
          <Text>
            {scopeAddedHours} h added · {scopeAddedTasksCount} tasks
          </Text>
        </Flex>

        <CategoryBar
          className="mt-2"
          values={[
            scopeTotalHours > 0 ? (scopeInitialHours / scopeTotalHours) * 100 : 0,
            scopeTotalHours > 0 ? (scopeAddedHours / scopeTotalHours) * 100 : 0,
          ]}
          colors={['blue', 'rose']}
          showAnimation
          showLabels={false}
        />

        <Flex className="mt-2 text-xs text-slate-400 justify-between">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> Initial
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-rose-500" /> Added
          </span>
        </Flex>
      </Card>
    </div>
  )
}

export default BurndownKpiCards
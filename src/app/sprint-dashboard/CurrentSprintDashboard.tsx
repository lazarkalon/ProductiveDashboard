// CurrentSprintDashboard.tsx
'use client'

import React, { useMemo, useState } from 'react'
import BurndownKpiCards from './BurndownKpiCards'
import BurndownChart from './BurndownChart'
import { COMPLETE_STATUS_NAMES } from './config'
import EffortByResponsible, { EffortRow } from './EffortByResponsible'
import AtRiskCallouts from '@/app/sprint-dashboard/AtRiskCallouts'
import type { DevRisk, TaskRisk } from '@/lib/dashboardRisk'
import { computeAtRiskCallouts } from '@/lib/Productive/dashboardRisks'
import RemainingWorkStatus from './RemainingWorkStatus'

interface RemainingRow {
  status: string
  taskCount: number
  remainingMinutes: number
}

interface SprintBlock {
  estimatedMinutes: number
  actualMinutes: number
  estimatedTasksCount: number
  actualTasksCount: number
}

interface CurrentSprintDashboardProps {
  sprintData: SprintBlock
  totalData: SprintBlock & { preSprintMinutes?: number }
  businessDates: string[]
  actualByBusinessDatesSprint: Record<string, number>
  actualByBusinessDatesTotal: Record<string, number>
  remainingByStatus: RemainingRow[]
  scopeInitialMinutes: number
  scopeAddedMinutes: number
  scopeInitialTasksCount: number
  scopeAddedTasksCount: number
  /** Sprint-only effort rows (start <= date <= end) */
  effortByResponsibleRows: EffortRow[]
  /** Total-to-end effort rows (date <= end) */
  effortByResponsibleRowsTotal: EffortRow[]

  /** Client-side risk inputs */
  riskTasks?: any[]                 // tasks augmented with { responsibleName: string }
  daysLeft?: number                 // business days left in sprint
}

const CurrentSprintDashboard: React.FC<CurrentSprintDashboardProps> = ({
  sprintData,
  totalData,
  businessDates,
  actualByBusinessDatesSprint,
  actualByBusinessDatesTotal,
  remainingByStatus,
  scopeInitialMinutes,
  scopeAddedMinutes,
  scopeInitialTasksCount,
  scopeAddedTasksCount,
  effortByResponsibleRows,
  effortByResponsibleRowsTotal,

  // risk inputs
  riskTasks = [],
  daysLeft = 0,
}) => {
  const [showTotal, setShowTotal] = useState(true) // Total Time by default
  const [countCompleteStatusesAsDone, setCountCompleteStatusesAsDone] = useState(true)
  // Slider state (default 6 h/day)
  const [capacityPerDayHours, setCapacityPerDayHours] = useState<number>(6)

  const safeBusinessDates = Array.isArray(businessDates) ? businessDates : []
  const dataToShow = showTotal ? totalData : sprintData
  const effortRows = showTotal ? (effortByResponsibleRowsTotal ?? []) : (effortByResponsibleRows ?? [])

  // Count tasks in “Complete” statuses
  const completedViaStatusCount = useMemo(
    () =>
      remainingByStatus
        .filter((r) => COMPLETE_STATUS_NAMES.has(r.status.trim()))
        .reduce((acc, r) => acc + r.taskCount, 0),
    [remainingByStatus],
  )

  const adjustedCompletedTasksCount = countCompleteStatusesAsDone
    ? (dataToShow.actualTasksCount || 0) + completedViaStatusCount
    : (dataToShow.actualTasksCount || 0)

  // Hide “complete” rows in remaining-work widgets when toggle is ON
  const filteredRemainingRows = useMemo(
    () =>
      countCompleteStatusesAsDone
        ? remainingByStatus.filter((r) => !COMPLETE_STATUS_NAMES.has(r.status.trim()))
        : remainingByStatus,
    [remainingByStatus, countCompleteStatusesAsDone],
  )

  // 🔁 Recompute risk on the client whenever slider (capacity) or inputs change
  const { devCallouts, taskCallouts } = useMemo(() => {
    if (!riskTasks?.length) return { devCallouts: [] as DevRisk[], taskCallouts: [] as TaskRisk[] }
    return computeAtRiskCallouts(
      riskTasks as any,
      (t: any) => t?.responsibleName || 'Unassigned',
      safeBusinessDates,
      { capacityPerDayHours }
    )
  }, [riskTasks, safeBusinessDates, capacityPerDayHours])

  return (
    <div>
      {/* Inline, left-aligned toggles */}
      <div className="mt-2 mb-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
        {/* Sprint vs Total */}
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className={!showTotal ? 'font-semibold text-blue-500' : 'text-slate-400'}>
            Sprint Only
          </span>
          <button
            onClick={() => setShowTotal(!showTotal)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
              showTotal ? 'bg-blue-600' : 'bg-gray-400'
            }`}
            aria-label="Toggle Sprint Only / Total Time"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                showTotal ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={showTotal ? 'font-semibold text-blue-500' : 'text-slate-400'}>
            Total Time
          </span>
        </div>

        {/* Count “Complete” as Done */}
        <div className="flex items-center gap-3 whitespace-nowrap">
          <span className={countCompleteStatusesAsDone ? 'font-semibold text-blue-500' : 'text-slate-400'}>
            Count “Complete” Statuses as Done
          </span>
          <button
            onClick={() => setCountCompleteStatusesAsDone((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
              countCompleteStatusesAsDone ? 'bg-blue-600' : 'bg-gray-400'
            }`}
            aria-label="Toggle count complete statuses as done"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                countCompleteStatusesAsDone ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <BurndownKpiCards
        estimatedMinutes={dataToShow.estimatedMinutes || 0}
        actualMinutes={dataToShow.actualMinutes || 0}
        estimatedTasksCount={dataToShow.estimatedTasksCount || 0}
        actualTasksCount={adjustedCompletedTasksCount}
        businessDates={safeBusinessDates}
        scopeInitialMinutes={scopeInitialMinutes || 0}
        scopeAddedMinutes={scopeAddedMinutes || 0}
        scopeInitialTasksCount={scopeInitialTasksCount || 0}
        scopeAddedTasksCount={scopeAddedTasksCount || 0}
      />

      {/* Burndown */}
      <BurndownChart
        estimatedMinutes={(showTotal ? totalData.estimatedMinutes : sprintData.estimatedMinutes) || 0}
        businessDates={safeBusinessDates}
        actualByBusinessDates={showTotal ? actualByBusinessDatesTotal : actualByBusinessDatesSprint}
        mode={showTotal ? 'total' : 'sprint'}
        totalActualMinutes={showTotal ? (totalData.actualMinutes || 0) : undefined}
      />

      {/* At Risk Callouts with a capacity slider (fully wired) */}
      <div className="my-6">
        <AtRiskCallouts
          devs={devCallouts}
          tasks={taskCallouts}
          daysLeft={daysLeft}
          capacityPerDayHours={capacityPerDayHours}
          onCapacityChange={setCapacityPerDayHours}
        />
      </div>

      {/* Effort by Responsible Dev */}
      <EffortByResponsible rows={effortRows} />

      {/* Remaining work */}
      <div className="my-6">
        <RemainingWorkStatus rows={filteredRemainingRows} />
      </div>
    </div>
  )
}

export default CurrentSprintDashboard
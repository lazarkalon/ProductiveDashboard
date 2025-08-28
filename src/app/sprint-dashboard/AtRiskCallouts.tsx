// components/AtRiskCallouts.tsx
'use client'
import React from 'react'
import { Title, Text, Badge } from '@tremor/react'
import type { DevRisk, TaskRisk } from '@/lib/dashboardRisk'
import InfoTooltip from '@/components/InfoTooltip'
import { PRODUCTIVE_ORG_URL } from '@/lib/productiveConfig'

export default function AtRiskCallouts({
  devs = [],
  tasks = [],
  daysLeft = 0,
  capacityPerDayHours,          // controlled
  onCapacityChange,             // controlled
}: {
  devs?: DevRisk[]
  tasks?: TaskRisk[]
  daysLeft?: number
  capacityPerDayHours: number
  onCapacityChange: (next: number) => void
}) {
  const devsAtRisk = (devs ?? []).filter(d => d.status !== 'ok')
  const noDevsAtRisk = devsAtRisk.length === 0
  const noTasksAtRisk = (tasks ?? []).length === 0
  const hoursRemaining = capacityPerDayHours * daysLeft

  return (
    <div className="rounded-xl border border-slate-800 bg-sky-900/40 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <Title>
          At Risk Callouts ({capacityPerDayHours} hours/day, {daysLeft} business day{daysLeft === 1 ? '' : 's'} left)
        </Title>

        {/* Capacity slider (right) */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-300">Capacity</span>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={capacityPerDayHours}
            onChange={(e) => onCapacityChange(Number(e.target.value))}
            className="w-36 accent-sky-400"
          />
          <span className="text-xs text-slate-200 w-5 text-right">{capacityPerDayHours}</span>
          <span className="text-xs text-slate-400">h/day</span>

          <InfoTooltip placement="right">
            <div>Sets the working hours per developer per day used in the risk model.</div>
          </InfoTooltip>
        </div>
      </div>

      <p className="mt-1 text-sm text-slate-500">
        Highlights tasks and developers most at risk of missing the sprint deadline. Risk is based on remaining effort
        compared to available capacity (set above).
      </p>

      {/* Content layout: 1/3 devs | 2/3 tasks */}
      <div className="mt-4 grid grid-cols-[1fr_2fr] gap-10">
        {/* Devs at risk */}
        <div>
          <Title>Devs At Risk</Title>
          <div className="mt-3 space-y-2">
            {noDevsAtRisk ? (
              <Text className="text-emerald-400 italic">No developers at risk 🎉</Text>
            ) : (
              devsAtRisk.map(d => (
                <div
                  key={d.person}
                  className="grid items-center text-sm grid-cols-[140px_130px_1fr]"
                >
                  {/* Name (fixed, ellipsized) */}
                  <Text className="truncate text-slate-200">{d.person}</Text>

                  {/* Status (fixed) */}
                  <div>
                    <Badge
                      color={d.status === 'risk' ? 'rose' : 'amber'}
                      className="w-fit"
                    >
                      {d.status === 'risk' ? 'At capacity' : 'Approaching'}
                    </Badge>
                  </div>

                  {/* Remaining (right-aligned, non-wrapping) */}
                  <div className="text-right text-slate-400 tabular-nums whitespace-nowrap">
                    {d.remainingHours}h / {hoursRemaining}h
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tasks at Risk */}
        <div>
          <Title>Tasks at Risk</Title>

          <div className="mt-3 space-y-2">
            {noTasksAtRisk ? (
              <Text className="text-emerald-400 italic">No tasks at risk 🎉</Text>
            ) : (
              (tasks ?? []).map((t) => {
                const percent = Math.round(t.shareOfDevRemaining * 100)
                return (
                  <div
                    key={`${t.taskName}-${t.person}`}
                    className="grid items-center gap-3
                               grid-cols-[1fr_140px_120px_140px]"
                  >
                    {/* Task (elastic) */}
                    <div className="min-w-0 truncate">
                      <a
                        href={`${PRODUCTIVE_ORG_URL}/tasks/${t.taskId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:underline truncate"
                        title={t.taskName}
                      >
                        {t.taskName}
                      </a>
                    </div>

                    {/* Dev (fixed, no wrap) */}
                    <div className="px-1 whitespace-nowrap truncate text-slate-300">
                      {t.person}
                    </div>

                    {/* Status badge (fixed) */}
                    <div>
                      <Badge color={t.severity === 'critical' ? 'rose' : 'amber'}>
                        {t.severity.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Hours + % (fixed, right-aligned, no wrap) */}
                    <div className="text-right text-slate-300 text-sm tabular-nums whitespace-nowrap pr-2">
                      {t.taskRemainingHours}h / {hoursRemaining}h ({percent}%)
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
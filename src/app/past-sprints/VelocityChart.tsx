// src/app/past-sprints/VelocityChart.tsx
'use client'

import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'

export type SprintVelocityPoint = {
  sprintId: string
  sprintName: string
  plannedHours: number        // initial scope at sprint start (h)
  scopeChangeHours: number    // scope added after sprint start (h)
  completedHours: number      // actual within sprint window (h)
}

const COLORS = {
  initial: '#60a5fa',   // blue
  change:  '#fb923c',   // orange
  done:    '#34d399',   // green
  avg:     '#ef4444',   // red line
}

export default function VelocityChart({ data }: { data: SprintVelocityPoint[] }) {
  // Average of completed
  const avgVelocity = useMemo(() => {
    const total = data.reduce((s, d) => s + (d.completedHours || 0), 0)
    return data.length ? +(total / data.length).toFixed(1) : 0
  }, [data])

  return (
    <div className="rounded-xl border border-slate-800 !bg-sky-900/40 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-base font-semibold text-slate-100">Team Velocity</h3>
        <div className="text-sm text-slate-300">
          Current Average Sprint Velocity:{' '}
          <span className="font-semibold">{avgVelocity}</span>
        </div>
      </div>
      <div className="mb-3">
        <p className="mt-1 text-sm text-slate-500">
          Shows the total hours of planned work (initial scope), scope added during the sprint, and actual hours completed. This helps visualize both team throughput and how scope changes affected delivery.
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="sprintName" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              width={48}
              label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
            />

            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#e2e8f0' }}
              formatter={(value: any, name: any) => {
                const v = Number(value)
                const val = Number.isFinite(v) ? `${v.toFixed(1)} h` : `${value} h`
                return [val, name]
              }}
            />

            {/* Stacked Scope = Planned + Scope Change */}
            <Bar dataKey="plannedHours"      stackId="scope" fill={COLORS.initial} name="Initial Scope" radius={[0,0,0,0]} />
            <Bar dataKey="scopeChangeHours"  stackId="scope" fill={COLORS.change}  name="Scope Change"  radius={[0,0,0,0]} />

            {/* Completed (separate bar) */}
            <Bar dataKey="completedHours" fill={COLORS.done} name="Completed" radius={[0,0,0,0]} />

            {/* Horizontal average of completed */}
            <ReferenceLine
              y={avgVelocity}
              stroke={COLORS.avg}
              strokeWidth={2}
              label={{
                value: 'Average',
                position: 'right',
                fill: COLORS.avg,
                fontSize: 12,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Custom legend (Average + Scope stack + Completed) */}
      <div className="mt-3 flex flex-wrap justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-[2px]" style={{ background: COLORS.avg }} />
          <span className="text-slate-300">Average</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-[2px]" style={{ background: COLORS.initial }} />
          <span className="text-slate-300">Initial Scope</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-[2px]" style={{ background: COLORS.change }} />
          <span className="text-slate-300">Scope Change</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-[2px]" style={{ background: COLORS.done }} />
          <span className="text-slate-300">Completed</span>
        </div>
      </div>
    </div>
  )
}
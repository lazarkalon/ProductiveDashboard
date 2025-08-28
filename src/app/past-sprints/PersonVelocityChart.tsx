// src/app/past-sprints/PersonVelocityChart.tsx
'use client'

import React, { useMemo } from 'react'

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'

type Row = {
  person: string
  avg: number
  // dynamic sprint keys: { [sprintName: string]: number }
  [key: string]: string | number
}

export default function PersonVelocityChart({
  rows,
  sprintNames,
}: {
  rows: Row[]
  sprintNames: string[]
}) {
  // small, readable palette for multiple sprints
  const colors = [
    '#60a5fa', // sky
    '#fb923c', // orange
    '#34d399', // emerald
    '#CBD6E3', // slate (alt)
    '#0084D2', // blue
    '#eab308', // amber
    '#2F0D68', // violet
    '#f472b6', // pink
    '#06b6d4', // cyan
    '#f59e0b', // amber (alt)
    '#22c55e', // green
    '#8b5cf6', // violet (alt)
    '#10b981', // emerald (alt)
  ]

  const fmt = (v: number) => `${Number(v ?? 0).toFixed(1)} h`

  // Build a sorted list of averages for the side panel
  const averages = useMemo(
    () =>
      [...rows]
        .map(r => ({ person: String(r.person), avg: Number(r.avg || 0) }))
        .sort((a, b) => b.avg - a.avg),
    [rows],
  )

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-base font-semibold text-slate-100">
          Velocity by Person (per selected sprints)
        </h3>
        <div className="text-sm text-slate-300">
          Bars = Sprint Hours • Line = Average per Person
        </div>
      </div>
      <div className="mb-3">
        <p className="mt-1 text-sm text-slate-500">
          This chart shows the number of hours worked by each team member across the selected sprints. It highlights individual contributions and workload distribution, making it easier to compare consistency and capacity over time.
        </p>
      </div>

      {/* Chart + averages panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart */}
        <div className="lg:col-span-10">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="person" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  width={48}
                  tickFormatter={(v) => `${v}h`}
                />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(val: any, name: string) => [fmt(val), name]}
                />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ marginTop: 50, fontSize: '14px' }}
                />

                {sprintNames.map((name, i) => (
                  <Bar
                    key={name}
                    dataKey={name}
                    name={name}
                    fill={colors[i % colors.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}

                {/* Average per person (varies by X, so a line across persons) */}
                <Line
                  type="monotone"
                  dataKey="avg"
                  name="Average"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3, stroke: '#ef4444', fill: '#ef4444' }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        

        {/* Averages list */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 h-full">
            <div className="flex items-baseline justify-between mb-3">
              <div className="text-slate-300 font-medium">Averages</div>
              <div className="text-slate-400 text-xs">
                {sprintNames.length} sprint{sprintNames.length === 1 ? '' : 's'}
              </div>
            </div>
            <ul className="space-y-2 max-h-96 overflow-auto pr-1">
              {averages.map(({ person, avg }) => (
                <li
                  key={person}
                  className="flex items-center justify-between text-sm text-slate-200"
                >
                  <span className="truncate pr-3">{person}</span>
                  <span className="tabular-nums text-slate-300">{fmt(avg)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
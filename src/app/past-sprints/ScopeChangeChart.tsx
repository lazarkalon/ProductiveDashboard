'use client'

import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

const COLORS = {
  planned: '#60a5fa', // blue (Initial)
  added:   '#fb923c', // orange (Added after start)
}

export type ScopeChangePoint = {
  sprint: string
  plannedHours: number  // initial_estimate where created_at <= sprint start
  addedHours: number    // initial_estimate where created_at  > sprint start
}

export default function ScopeChangeChart({ data }: { data: ScopeChangePoint[] }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 h-[320px]">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-slate-100">Scope Change</h3>
        <div className="text-xs text-slate-400">Stacked: Planned + Added (hours)</div>
      </div>

      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap={20}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis dataKey="sprint" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis
              width={48}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
            />
            <Tooltip
              formatter={(v: any, name: any) => [`${Number(v).toFixed(1)} h`, name]}
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Bar dataKey="plannedHours" name="Planned (Initial)" stackId="scope" fill={COLORS.planned} radius={[4,4,0,0]} />
            <Bar dataKey="addedHours"   name="Added after Start" stackId="scope" fill={COLORS.added}   radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Simple legend matching our colors */}
      <div className="mt-3 flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-[2px]" style={{ background: COLORS.planned }} />
          <span className="text-slate-300">Planned (Initial)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-[2px]" style={{ background: COLORS.added }} />
          <span className="text-slate-300">Added after Start</span>
        </div>
      </div>
    </div>
  )
}
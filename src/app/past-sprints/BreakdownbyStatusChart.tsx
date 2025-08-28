'use client'

import React, { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import InfoTooltip from '../../components/InfoTooltip'

/* --------------------------------------------------------------------------
   Canonical status order & improved colors (high-contrast, dark-mode friendly)
   Spillover intentionally LAST.
-------------------------------------------------------------------------- */
const STATUS_STYLE: Array<{ name: string; color: string }> = [
  // Not Started
  { name: 'Not Started',               color: '#94A3B8' }, // slate-400
  { name: 'UI/UX Completed',           color: '#06B6D4' }, // cyan-500

  // Started (progression in blue spectrum)
  { name: 'In Progress',               color: '#3B82F6' }, // blue-500
  { name: 'Questions / Blocked',       color: '#F59E0B' }, // amber-500
  { name: 'UI/UX in Progress',         color: '#6366F1' }, // indigo-500
  { name: 'Initial Code Complete',     color: '#4338CA' }, // indigo-700
  { name: 'Pending PR Review',         color: '#2563EB' }, // blue-600
  { name: 'PR Approved',               color: '#1E40AF' }, // blue-900

  // Review stages
  { name: 'Ready for Kalon QA',        color: '#60A5FA' }, // sky-400
  { name: 'Ready for Client Review',   color: '#3B82F6' }, // blue-500
  { name: 'In Client Review',          color: '#1D4ED8' }, // blue-700

  // Done
  { name: 'Approved for Production',   color: '#059669' }, // emerald-600
  { name: 'Complete',                  color: '#10B981' }, // emerald-500

  // Edge cases
  { name: 'Not applicable',            color: '#DC2626' }, // red-600

  // Spillover LAST on purpose
  { name: 'Spillover',                 color: '#EAB308' }, // yellow-500
]

// helper: color lookup
const COLOR_BY_STATUS = STATUS_STYLE.reduce<Record<string, string>>((acc, s) => {
  acc[s.name] = s.color
  return acc
}, {})

type Row = { sprint: string; [key: string]: string | number }

function fmtH(n: number) {
  const v = Number(n || 0)
  return `${v.toFixed(1)} h`
}


export default function BreakdownByStatusChart({
  rows,
  title = 'Breakdown by Status',
  defaultMode = 'worked',
  /** Tooltip copy (you can override from the page if needed) */
  helpText = 'Worked = Worked Time\nRemaining = Initial Estimate (0 if none given) - Worked Time',
}: {
  rows: Row[]
  title?: string
  defaultMode?: 'worked' | 'remaining'
  helpText?: string
}) {
  const [mode, setMode] = useState<'worked' | 'remaining'>(defaultMode)

  // Which statuses are present (keep canonical order; Spillover stays last)
  const orderedStatusesInData = useMemo(() => {
    const present = new Set<string>()
    for (const r of rows) {
      Object.keys(r).forEach((k) => {
        if (k.endsWith('::worked') || k.endsWith('::remaining')) {
          present.add(k.split('::')[0])
        }
      })
    }
    return STATUS_STYLE.map((s) => s.name).filter((name) => present.has(name))
  }, [rows])

  // One Bar per status for the active mode
  const series = useMemo(
    () =>
      orderedStatusesInData.map((status) => ({
        status,
        key: `${status}::${mode}`,
        color: COLOR_BY_STATUS[status] || '#94A3B8',
      })),
    [orderedStatusesInData, mode]
  )

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-100">{title}</h3>
        

        {/* Worked/Remaining toggle + info */}
        <div className="flex items-center gap-3 text-sm">
          <span className={mode === 'worked' ? 'text-slate-200 font-medium' : 'text-slate-400'}>
            Worked
          </span>
          <button
            type="button"
            onClick={() => setMode((m) => (m === 'worked' ? 'remaining' : 'worked'))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
              mode === 'remaining' ? 'bg-blue-600' : 'bg-gray-600'
            }`}
            aria-label="Toggle worked / remaining"
            title="Toggle worked / remaining"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                mode === 'remaining' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={mode === 'remaining' ? 'text-slate-200 font-medium' : 'text-slate-400'}>
            Remaining
          </span>

          {/* Info tooltip */}
          <InfoTooltip placement="right">
            <div className="space-y-1">
              <div><span className="font-semibold">Worked</span> = Worked Time</div>
              <div><span className="font-semibold">Remaining</span> = Initial Estimate (0 if none given) − Worked Time</div>
            </div>
          </InfoTooltip>
        </div>
      </div>
      <div className="mb-3">
        <p className="mt-1 text-sm text-slate-500">
          This chart shows where tasks ended each sprint. 
          Toggle between <strong>Worked</strong> and <strong>Remaining</strong> to see logged time vs. estimated time left.
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="sprint" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} width={50} tickFormatter={(v) => `${v}h`} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#e2e8f0' }}
              formatter={(v, name) => [fmtH(Number(v)), name as string]}
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ marginTop: 20, fontSize: 13 }}
              payload={series.map((s) => ({
                id: s.key,
                type: 'square',
                value: s.status,
                color: s.color,
              })) as any}
            />
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.status}
                stackId="breakdown"
                fill={s.color}
                radius={[0, 0, 0, 0]}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
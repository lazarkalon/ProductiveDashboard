// src/app/past-sprints/EstimationAccuracyChart.tsx
'use client'

import React from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import InfoTooltip from '@/components/InfoTooltip'

type AccuracyRow = { person: string; [key: string]: number | string }
type PersonAvg = { person: string; avgPct: number }

const COLORS = {
  worked: '#60a5fa',    // blue
  remaining: '#a78bfa', // purple
  overrun: '#ef4444',   // red
}

const fmtH = (v: number) => `${Number(v ?? 0).toFixed(1)} h`
const fmtPct = (v: number) => `${Math.round(v)}%`

/** Tooltip that shows ALL sprints for the hovered person. */
function PersonTooltip({
  active,
  payload,
  sprintNames,
}: {
  active?: boolean
  payload?: any[]
  sprintNames: string[]
}) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload ?? {}
  const person = row?.person ?? ''

  const lines = sprintNames
    .map((s) => {
      const w = Number(row[`${s}::Worked`] ?? 0)
      const r = Number(row[`${s}::Remaining`] ?? 0)
      const o = Number(row[`${s}::Overrun`] ?? 0)
      return (w || r || o) ? { sprint: s, worked: w, remaining: r, overrun: o } : null
    })
    .filter(Boolean) as { sprint: string; worked: number; remaining: number; overrun: number }[]

  if (!lines.length) return null

  return (
    <div
      style={{
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: 8,
        padding: '10px 12px',
        maxWidth: 520,
      }}
    >
      <div style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: 8 }}>
        {person}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: '#94a3b8', fontSize: 12 }}>
            <th style={{ textAlign: 'left', paddingRight: 12, paddingBottom: 6 }}>Sprint</th>
            <th style={{ textAlign: 'right', paddingLeft: 12, paddingBottom: 6 }}>Worked</th>
            <th style={{ textAlign: 'right', paddingLeft: 12, paddingBottom: 6 }}>Remaining</th>
            <th style={{ textAlign: 'right', paddingLeft: 12, paddingBottom: 6 }}>Overrun</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((ln) => (
            <tr key={ln.sprint} style={{ color: '#e2e8f0', fontSize: 13 }}>
              <td style={{ padding: '4px 12px 4px 0' }}>{ln.sprint}</td>
              <td style={{ padding: '4px 0 4px 12px', textAlign: 'right' }}>{fmtH(ln.worked)}</td>
              <td style={{ padding: '4px 0 4px 12px', textAlign: 'right' }}>{fmtH(ln.remaining)}</td>
              <td style={{ padding: '4px 0 4px 12px', textAlign: 'right' }}>{fmtH(ln.overrun)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function EstimationAccuracyChart({
  rows,
  sprintNames,
  personAverages,
  title = 'Estimate Accuracy by Person (per sprint)',
}: {
  rows: AccuracyRow[]
  sprintNames: string[]
  personAverages: PersonAvg[]
  title?: string
}) {
  const data = React.useMemo(
    () => [...rows].sort((a, b) => String(a.person).localeCompare(String(b.person))),
    [rows]
  )

  const sortedAvgs = React.useMemo(
    () =>
      [...personAverages].sort((a, b) => {
        const da = Math.abs((a.avgPct || 0) - 100)
        const db = Math.abs((b.avgPct || 0) - 100)
        return da === db ? a.person.localeCompare(b.person) : da - db
      }),
    [personAverages]
  )

  return (
    <div className="rounded-xl border border-slate-800 !bg-emerald-900/40 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-slate-100">{title}</h3>
        <div className="text-sm text-slate-300">
          Stacked per sprint: Worked / Remaining / Overrun • Average Accuracy on Right
        </div>
      </div>
      <div className="mb-3">
        <p className="mt-1 text-sm text-slate-500">
          Shows how each person’s worked time compared to their initial estimates per sprint. Split into Worked, Remaining, and Overrun hours to highlight estimation accuracy.
        </p>
      </div>
      
      <div className="grid grid-cols-12 gap-4">
        {/* Chart (10/12) */}
        <div className="col-span-12 lg:col-span-10">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="person" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} width={50} tickFormatter={(v) => `${v}h`} />

                {/* Person-wide tooltip */}
                <Tooltip content={<PersonTooltip sprintNames={sprintNames} />} />

                {/* One stacked trio per sprint (square caps) */}
                {sprintNames.map((sprint) => (
                  <React.Fragment key={sprint}>
                    <Bar dataKey={`${sprint}::Worked`} stackId={sprint} fill={COLORS.worked} radius={[0, 0, 0, 0]} />
                    <Bar dataKey={`${sprint}::Remaining`} stackId={sprint} fill={COLORS.remaining} radius={[0, 0, 0, 0]} />
                    <Bar dataKey={`${sprint}::Overrun`} stackId={sprint} fill={COLORS.overrun} radius={[0, 0, 0, 0]} />
                  </React.Fragment>
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* ✅ Custom legend INSIDE the slate container, below the chart */}
          <div className="mt-3 flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-[2px]" style={{ background: COLORS.worked }} />
              <span className="text-slate-300">Worked</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-[2px]" style={{ background: COLORS.remaining }} />
              <span className="text-slate-300">Remaining</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-[2px]" style={{ background: COLORS.overrun }} />
              <span className="text-slate-300">Overrun</span>
            </div>
            {/* Info tooltip */}
            <InfoTooltip placement="right">
              <div className="space-y-1">
                <div><span className="font-semibold">Worked</span> = Worked Time</div>
                <div><span className="font-semibold">Remaining</span> = Initial Estimate (0 if none given) − Worked Time</div>
                <div><span className="font-semibold">Overrun</span> = Worked Time > Initial Estimate (0 if none given)</div>
                <div><span className="font-semibold">Total Time Worked = Worked + Overrun</span></div>
              </div>
            </InfoTooltip>
          </div>
        </div>

        {/* Right panel (2/12) */}
        <div className="col-span-12 lg:col-span-2">
          <div className="rounded-lg bg-slate-950/40 border border-slate-800 p-4 h-full">
            <div className="flex items-center justify-between">
              <div className="text-slate-200 font-medium">Accuracy</div>
              <div className="text-xs text-slate-400">
                {sprintNames.length} {sprintNames.length === 1 ? 'sprint' : 'sprints'}
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {sortedAvgs.length ? (
                sortedAvgs.map(({ person, avgPct }) => (
                  <div key={person} className="flex items-center justify-between text-sm">
                    <span className="text-slate-200">{person}</span>
                    <span
                      className={
                        avgPct >= 95 && avgPct <= 105
                          ? 'text-emerald-400'
                          : avgPct < 95
                          ? 'text-sky-400'
                          : 'text-rose-400'
                      }
                      title="100% is perfect; >100% = underestimated; <100% = overestimated"
                    >
                      {fmtPct(avgPct)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-sm">No people found.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
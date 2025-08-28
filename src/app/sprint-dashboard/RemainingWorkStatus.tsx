'use client'

import React, { useMemo } from 'react'
import {
  Card, Title, Text, Divider,
  Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell,
  DonutChart, Legend,
} from '@tremor/react'

type Row = { status: string; taskCount: number; remainingMinutes: number }

const toHours = (min: number) => Math.round(((min ?? 0) / 60) * 10) / 10
const fmtHHMM = (mins: number) => {
  const v = Number(mins ?? 0)
  const sign = v < 0 ? '-' : ''
  const abs = Math.abs(v)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${sign}${h}:${String(m).padStart(2, '0')}`
}

// ----- Tremor-friendly colors (keys only) -----
type TremorColor =
  | 'blue' | 'emerald' | 'violet' | 'amber'
  | 'gray' | 'cyan' | 'pink' | 'lime' | 'fuchsia' | 'orange'

const normalize = (s: string) => (s || '').trim().toLowerCase()

const statusColorMap: Record<string, TremorColor> = {
  'not started': 'gray',
  'ui/ux completed': 'pink',
  'in progress': 'cyan',
  'questions / blocked': 'emerald',
  'ui/ux in progress': 'violet',
  'initial code complete': 'amber',
  'pending pr review': 'blue',
  'pr approved': 'blue',
  'ready for kalon qa': 'lime',
  'ready for client review': 'orange',
  'in client review': 'orange',
  'approved for production': 'emerald',
  'complete': 'emerald',
  'not applicable': 'amber',
  'closed': 'emerald',
  'spillover': 'pink', // will be rare here, but harmless
}

// Optional display order to match the rest of the app
const desiredOrder = [
  'Not Started',
  'UI/UX Completed',
  'In Progress',
  'Questions / Blocked',
  'UI/UX in Progress',
  'Initial Code Complete',
  'Pending PR Review',
  'PR Approved',
  'Ready for Kalon QA',
  'Ready for Client Review',
  'In Client Review',
  'Approved for Production',
  'Complete',
  'Not applicable',
  'Closed',
]
const orderIndex = (name: string) => {
  const i = desiredOrder.indexOf(name)
  return i === -1 ? 10_000 : i
}

export default function RemainingWorkStatus({
  rows = [],
  title = 'Time to Complete by Status',
  subtitle = 'Open tasks grouped by current workflow status. The donut shows the share of time to complete hours (negatives are excluded from the donut but shown in the table).',
}: {
  rows?: Row[]
  title?: string
  subtitle?: string
}) {
  const safeRows = Array.isArray(rows) ? rows : []

  // Table: sort by remaining DESC
  const tableRows = useMemo(
    () =>
      [...safeRows].sort(
        (a, b) => (b.remainingMinutes ?? 0) - (a.remainingMinutes ?? 0)
      ),
    [safeRows]
  )

  // Donut: same data, but only positive remaining contributes to “share”
  const donutData = useMemo(() => {
    const unsorted = safeRows
      .map(r => ({ name: r.status, Hours: toHours(r.remainingMinutes) }))
      .filter(d => d.Hours > 0)

    const sorted = unsorted.sort(
      (a, b) => orderIndex(a.name) - orderIndex(b.name) || a.name.localeCompare(b.name)
    )

    const colors = sorted.map(d => statusColorMap[normalize(d.name)] ?? 'gray')
    return { sorted, colors }
  }, [safeRows])

  return (
    <Card className="p-4 !bg-sky-900/40 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <Title className="text-base">{title}</Title>
          <Text className="mt-1 text-slate-400 text-sm">{subtitle}</Text>
        </div>
      </div>

      <Divider className="my-3" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Table (left) */}
        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell className="text-slate-300 text-sm">Status</TableHeaderCell>
                <TableHeaderCell className="text-slate-300 text-right text-sm">Task Count</TableHeaderCell>
                <TableHeaderCell className="text-slate-300 text-right text-sm">Time to Complete</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-slate-400 py-4 text-sm">
                    No open work.
                  </TableCell>
                </TableRow>
              ) : (
                tableRows.map((r) => (
                  <TableRow key={r.status} className="hover:bg-slate-800/40">
                    <TableCell className="text-slate-200 text-sm">{r.status}</TableCell>
                    <TableCell className="text-right text-slate-200 text-sm">{r.taskCount}</TableCell>
                    <TableCell className="text-right text-slate-200 text-sm">
                      {fmtHHMM(r.remainingMinutes)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Donut (right) */}
        <div className="flex flex-col items-center">
          <DonutChart
            data={donutData.sorted}
            category="Hours"
            index="name"
            colors={donutData.colors}
            className="h-80 w-80"
            showLabel
            valueFormatter={(n: number) => `${n}h`}
          />
          <Legend
            categories={donutData.sorted.map(d => d.name)}
            colors={donutData.colors}
            className="mt-4 flex flex-wrap justify-center gap-4"
          />
        </div>
      </div>
    </Card>
  )
}
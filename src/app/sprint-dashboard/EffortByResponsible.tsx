// src/app/sprint-dashboard/EffortByResponsible.tsx
'use client'

import { Card, Title, BarChart, Text } from '@tremor/react'

export type EffortRow = {
  person: string
  'Initial estimate': number
  'Worked time': number
  'Time to complete': number
}

export default function EffortByResponsible({ rows }: { rows: EffortRow[] }) {
  return (
    <Card className="mt-8 !bg-emerald-900/40">
      <div className="mb-4">
        <Title>Effort by Responsible Dev</Title>
        <Text>Displays the total hours worked by each responsible developer during the current sprint. Use this to track how effort is distributed across the team and identify potential workload imbalances or risks as the sprint progresses. <i>Negative values indicate that more time has been logged than originally estimated, highlighting underestimated tasks.</i></Text>
      </div>

      <BarChart
        className="h-96"
        data={rows}
        index="person"
        categories={['Initial estimate', 'Worked time', 'Time to complete']}
        // keep colors distinct and readable in dark mode
        colors={['amber', 'rose', 'emerald']}
        showLegend
        showGridLines
        yAxisWidth={56}
        valueFormatter={(v) =>
          Number.isFinite(v) ? `${Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(v)} h` : '-'
        }
      />
    </Card>
  )
}
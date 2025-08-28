'use client'

import { Card, AreaChart, Title, Text } from '@tremor/react'
import minBy from 'lodash/minBy'
import dayjs from 'dayjs'
import getHoursFromMinutes from '../../utils/getHoursFromMinutes'
import { BusinessDate } from '../../utils/getBusinessDates'
import { ActualByBusinessDates } from './getActualByBusinessDates'
import { Tomorrow } from 'next/font/google'
import InfoTooltip from '@/components/InfoTooltip'

export interface BurndownChartDatum {
  Date: string
  Estimated: number
  Actual?: number
}
export type BurndownChartData = BurndownChartDatum[]

export interface BurndownChartProps {
  estimatedMinutes: number
  businessDates: BusinessDate[]
  actualByBusinessDates: ActualByBusinessDates
  mode?: 'sprint' | 'total'
  totalActualMinutes?: number // optional, but not used for workedBeforeSprint anymore
}

export default function BurndownChart(props: BurndownChartProps) {
  const { estimatedMinutes, businessDates, actualByBusinessDates, mode } = props

  /*
  console.log('🌍 Estimated Minutes:', estimatedMinutes / 60)
  console.log('🌍 Business Dates:', businessDates)
  console.log('🌍 Actual By Business Dates:', actualByBusinessDates)
  console.log('🌍 Mode:', mode)
  */

  const today = dayjs()
  let lastKnownActual = estimatedMinutes

  // ✅ Adjust initial Actual when Total Time is selected
  if (mode === 'total') {
    const sprintStart = dayjs(businessDates[0])

    // ✅ Calculate only worked minutes before sprint start
    const workedBeforeSprintMinutes = Object.entries(actualByBusinessDates)
      .filter(([date]) => dayjs(date).isBefore(sprintStart, 'day'))
      .reduce((acc, [, minutes]) => acc + minutes, 0)

    const workedBeforeSprintHours = workedBeforeSprintMinutes / 60
    const totalHours = estimatedMinutes / 60
    const remainingHours = Math.max(0, totalHours - workedBeforeSprintHours)

    lastKnownActual = remainingHours * 60 // back to minutes

    /*
    console.log('🌍 Sprint Start Date:', sprintStart.format('YYYY-MM-DD'))
    console.log('🌍 Worked Before Sprint (minutes):', workedBeforeSprintMinutes)
    console.log('🌍 Worked Before Sprint (hours):', workedBeforeSprintHours)
    console.log('🌍 Adjusted Starting Remaining Hours:', remainingHours)
    */
  }

  // ✅ Build burndown data
  const burndownChartData = businessDates.map((businessDate: string, i) => {
    const currentDate = dayjs(businessDate)

    // ✅ Ideal Estimated line across the full range
    const estimatedByDate =
      estimatedMinutes - (i * estimatedMinutes) / (businessDates.length - 1)

    let actualValue: number | undefined = undefined

    // ✅ Plot Actual only up to today
    if (!currentDate.isAfter(today, 'day')) {
      const workedToday = actualByBusinessDates?.[businessDate] ?? 0
      lastKnownActual = Math.max(0, lastKnownActual - workedToday)
      actualValue = lastKnownActual

      //console.log('workedToday', i, businessDate, workedToday / 60, 'h')
    }

    return {
      Date: currentDate.format('ddd, DD MMM'),
      Estimated: estimatedByDate,
      ...(actualValue !== undefined ? { Actual: actualValue } : {}),
    }
  })

  // ✅ Convert to hours for chart rendering
 const chartDataHours = burndownChartData.map((d) => ({
  Date: d.Date,
  Estimated: getHoursFromMinutes(d.Estimated),
  Actual: d.Actual !== undefined ? getHoursFromMinutes(d.Actual) : undefined,
  // alias used only for the chart legend
  Remaining: d.Actual !== undefined ? getHoursFromMinutes(d.Actual) : undefined,
}));

  //console.log('📊 Chart Data (Hours):', chartDataHours)

  const minValue =
  Number(minBy(chartDataHours, ({ Remaining }) => Number(Remaining))?.Remaining) || 0;

  return (
    <Card className="mt-4 md:mt-6">
      <div className="mb-4">
        <Title>Burndown by Hours</Title>
        <Text>Tracks remaining work against the sprint timeline, showing whether the team is on pace to complete planned work. The chart is calculated as Initial Estimate – Worked Time and does not adjust for tasks that are marked complete but still have time remaining.<i> Tasks without an Initial Estimate will greatly impact the accuracy of the burndown chart.</i></Text>
      </div>


      <AreaChart
        className="h-96"
        data={chartDataHours}
        index="Date"
        categories={['Estimated', 'Remaining']}  // legend now says “Remaining”
        colors={['indigo', 'fuchsia']}
        yAxisWidth={50}
        minValue={minValue}
        autoMinValue={minValue <= 0}
        maxValue={Number(getHoursFromMinutes(estimatedMinutes))}
        valueFormatter={(n: number) =>
          !Number.isNaN(Number(n)) ? `${Intl.NumberFormat('us').format(n)}h` : '-'
        }
      />
    </Card>
  )
}
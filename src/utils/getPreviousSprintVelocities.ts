import dayjs from 'dayjs'
import getBusinessDates from './getBusinessDates'

export interface TimeEntry {
  date: string
  time: number
}

export interface VelocityData {
  name: string
  velocity: number
}

export default function getPreviousSprintVelocities(
  businessDates: string[],
  timeEntries: TimeEntry[],
  numberOfSprints = 5
): VelocityData[] {
  if (businessDates.length === 0 || !Array.isArray(timeEntries)) return []

  const sprintLengthDays = dayjs(businessDates[businessDates.length - 1])
    .diff(dayjs(businessDates[0]), 'day') + 1

  const velocities: VelocityData[] = []

  for (let i = numberOfSprints; i >= 1; i--) {
    const periodEnd = dayjs(businessDates[0])
      .subtract((i - 1) * sprintLengthDays, 'day')
      .subtract(1, 'day')

    const periodStart = periodEnd.subtract(sprintLengthDays - 1, 'day')

    const datesInSprint = getBusinessDates(
      periodStart.format('YYYY-MM-DD'),
      periodEnd.format('YYYY-MM-DD')
    )

    const minutes = datesInSprint.reduce((total, date) => {
      const entries = timeEntries.filter((e) => e.date === date)
      return total + entries.reduce((sum, e) => sum + e.time, 0)
    }, 0)

    velocities.push({
      name: `Sprint ${i}`,
      velocity: Math.round(minutes / 60),
    })
  }

  return velocities
}
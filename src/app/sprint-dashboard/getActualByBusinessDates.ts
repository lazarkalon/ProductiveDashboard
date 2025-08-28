import groupBy from 'lodash/groupBy'
import dayjs from 'dayjs'
import { ProductiveTimeEntry } from './types'

export type ActualByBusinessDates = { [key: string]: number }

const getActualByBusinessDates = (
  timeEntrys?: ProductiveTimeEntry[],
  businessDates?: string[],
): { [key: string]: number } => {
  if (!timeEntrys || !businessDates?.length) {
    console.log('🚫 No time entries or business dates provided')
    return {}
  }

  const startDate = dayjs(businessDates[0])
  const sprintEndDate = dayjs(businessDates[businessDates.length - 1])
  const today = dayjs()
  const effectiveEndDate = sprintEndDate //today.isAfter(sprintEndDate, 'day') ? today : sprintEndDate

  // ✅ Normalize and filter
  const normalizedEntries = timeEntrys.map(e => ({
    ...e,
    normalizedDate: dayjs(e.date).format('YYYY-MM-DD'),
  }))

  const filteredEntries = normalizedEntries.filter(({ normalizedDate }) => {
    const d = dayjs(normalizedDate)
    const keep = d.isSameOrAfter(startDate, 'day') && d.isSameOrBefore(effectiveEndDate, 'day')
    //if (!keep) console.log(`⏭️ Skipping entry for ${normalizedDate}`)
    return keep
  })

  // ✅ Group by normalized date
  const timeEntrysByDate = groupBy(filteredEntries, 'normalizedDate')

  // ✅ Sum minutes per normalized date
  const timeEntrysSumByDate = Object.entries(timeEntrysByDate).reduce(
    (acc, [key, entries]) => {
      const total = entries.reduce((sum, { time }) => sum + time, 0)
      //console.log(`📅 Counted Date: ${key}, Total Minutes: ${total}`)
      return { ...acc, [key]: total }
    },
    {} as ActualByBusinessDates,
  )

  return timeEntrysSumByDate
}

export default getActualByBusinessDates
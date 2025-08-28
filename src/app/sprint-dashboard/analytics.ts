// src/app/sprint-dashboard/analytics.ts
import groupBy from 'lodash/groupBy'
import sum from 'lodash/sum'
import dayjs from 'dayjs'

export type RemainingRow = { status: string; taskCount: number; remainingMinutes: number }

export function buildStatusNameMap(included: any[] = []) {
  return new Map<string, string>(
    included
      .filter((r: any) => r.type === 'workflow_statuses')
      .map((r: any) => [r.id, r.attributes?.name ?? 'Unknown']),
  )
}

export function getStatusNameFromTask(t: any, statusNameById: Map<string, string>) {
  const id = t?.relationships?.workflow_status?.data?.id ?? null
  return id ? (statusNameById.get(id) ?? 'Unknown') : 'Unknown'
}

export function calcRemainingByStatus(tasksData: any[], statusNameById: Map<string, string>): RemainingRow[] {
  const map = new Map<string, { count: number; minutes: number }>()
  for (const t of tasksData) {
    const status = getStatusNameFromTask(t, statusNameById)
    const rem = Number(t?.attributes?.remaining_time ?? 0)
    if (!map.has(status)) map.set(status, { count: 0, minutes: 0 })
    const agg = map.get(status)!
    agg.count += 1
    agg.minutes += rem
  }
  return Array.from(map.entries()).map(([status, v]) => ({
    status,
    taskCount: v.count,
    remainingMinutes: v.minutes,
  }))
}

export function calcScope(tasksData: any[], businessDates: string[]) {
  const sprintStartStr = businessDates[0]
  const createdOnOrAfterStartDay = (t: any) => {
    const created = t?.attributes?.created_at
    if (!created) return false
    const d = dayjs(created)
    const s = dayjs(sprintStartStr)
    return d.isSame(s, 'day') || d.isAfter(s, 'day')
  }

  const addedAllTasks = tasksData.filter(createdOnOrAfterStartDay)
  const initialAllTasks = tasksData.filter((t) => !createdOnOrAfterStartDay(t))

  const scopeInitialMinutes = initialAllTasks.reduce(
    (sumM: number, t: any) => sumM + Number(t?.attributes?.initial_estimate ?? 0),
    0,
  )
  const scopeAddedMinutes = addedAllTasks.reduce(
    (sumM: number, t: any) => sumM + Number(t?.attributes?.initial_estimate ?? 0),
    0,
  )

  return {
    scopeInitialMinutes,
    scopeAddedMinutes,
    scopeInitialTasksCount: initialAllTasks.length,
    scopeAddedTasksCount: addedAllTasks.length,
  }
}

export function compactTimeEntriesForBurndown(timeEntrys: any[]) {
  // Returns both sprint-only daily totals and full totals by date
  const totalByDate = Object.entries(groupBy(timeEntrys, 'date')).reduce(
    (acc, [date, entries]) => ({
      ...acc,
      [date]: entries.reduce((s, e) => s + Number(e.time || 0), 0),
    }),
    {} as Record<string, number>,
  )
  return { totalByDate }
}

export function rollupWorkedMinutesByTask(timeEntriesData: any[], businessDates: string[]) {
  const sprintDateSet = new Set(businessDates)
  const workedMinutesByTask: Record<string, number> = timeEntriesData.reduce(
    (map: Record<string, number>, te: any) => {
      const a = te?.attributes ?? {}
      const tId = a?.task_id ? String(a.task_id) : ''
      if (!tId) return map
      if (a.date && sprintDateSet.has(a.date)) {
        map[tId] = (map[tId] || 0) + Number(a.time || 0)
      }
      return map
    },
    {},
  )
  return workedMinutesByTask
}

export function minutesToHours(m: number) {
  return Math.round((m / 60) * 10) / 10
}

export function sumMinutes(arr: number[]) {
  return sum(arr)
}
// src/lib/Productive/analytics.ts
import dayjs from 'dayjs'

/** Build id->statusName map from tasks "included" array */
export function buildStatusNameById(included: any[] = []) {
  return new Map<string, string>(
    included
      .filter((r: any) => r.type === 'workflow_statuses')
      .map((r: any) => [r.id, r.attributes?.name ?? 'Unknown']),
  )
}

export function makeGetStatusNameFromTask(statusNameById: Map<string, string>) {
  const getStatusIdFromTask = (t: any) => t?.relationships?.workflow_status?.data?.id ?? null
  return (t: any) => {
    const id = getStatusIdFromTask(t)
    return id ? (statusNameById.get(id) ?? 'Unknown') : 'Unknown'
  }
}

/** Remaining work by status rows */
export function computeRemainingByStatus(tasksData: any[], getStatusNameFromTask: (t: any) => string) {
  const map = new Map<string, { count: number; minutes: number }>()
  for (const t of tasksData) {
    const status = getStatusNameFromTask(t)
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
/** People id -> "First Only" */
export function buildPersonNameById(people: any[]) {
  // Sort by first_name before mapping
  const sorted = [...people].sort((a, b) => {
    const aName = a?.attributes?.first_name?.toLowerCase() || ''
    const bName = b?.attributes?.first_name?.toLowerCase() || ''
    return aName.localeCompare(bName)
  })

  return new Map<string, string>(
    sorted.map((p: any) => {
      const a = p?.attributes ?? {}
      const name = a.first_name || `ID ${p.id}`
      return [String(p.id), name]
    }),
  )
}

/** Factory that returns a getter using a custom field id for "responsible dev" */
export function makeGetResponsibleName(personNameById: Map<string, string>, RESPONSIBLE_CF_ID: string) {
  return (t: any) => {
    const cfPid = String(t?.attributes?.custom_fields?.[RESPONSIBLE_CF_ID] ?? '')
    if (!cfPid) return 'Unassigned'
    return personNameById.get(cfPid) ?? `ID ${cfPid}`
  }
}

/** Normalize time entries to a flat { date, time, task_id } for burndown */
export function normalizeTimeEntries(timeEntriesData: any[]) {
  return timeEntriesData.map((row: any) => {
    const a = row?.attributes ?? {}
    const relTaskId = row?.relationships?.task?.data?.id
    return { ...a, task_id: relTaskId ?? a.task_id }
  })
}

/**
 * Build two maps of worked minutes per task:
 *  - Sprint: start <= date <= end
 *  - Total:  date <= end
 */
export function splitWorkedMinutesByTask(
  timeEntriesData: any[],
  startDate: string,
  endDate: string,
) {
  const dStart = dayjs(startDate)
  const dEnd = dayjs(endDate)

  const workedMinutesByTaskSprint: Record<string, number> = {}
  const workedMinutesByTaskTotal: Record<string, number> = {}

  for (const te of timeEntriesData) {
    const a = te?.attributes ?? {}
    const d = a?.date ? dayjs(a.date) : null
    const taskId = te?.relationships?.task?.data?.id || a?.task_id
    if (!d || !taskId) continue

    // Total to end: <= endDate
    if (d.isSame(dEnd, 'day') || d.isBefore(dEnd, 'day')) {
      workedMinutesByTaskTotal[String(taskId)] =
        (workedMinutesByTaskTotal[String(taskId)] || 0) + Number(a.time || 0)
    }

    // Sprint only: startDate <= date <= endDate
    const onOrAfterStart = d.isSame(dStart, 'day') || d.isAfter(dStart, 'day')
    const onOrBeforeEnd = d.isSame(dEnd, 'day') || d.isBefore(dEnd, 'day')
    if (onOrAfterStart && onOrBeforeEnd) {
      workedMinutesByTaskSprint[String(taskId)] =
        (workedMinutesByTaskSprint[String(taskId)] || 0) + Number(a.time || 0)
    }
  }

  return { workedMinutesByTaskSprint, workedMinutesByTaskTotal }
}

/** Aggregate per-person using a worked-minutes map; returns [{person, initial, worked, remaining}] */
export function aggregateEffortByPerson(
  tasksData: any[],
  getResponsibleName: (t: any) => string,
  workedMinutesByTask: Record<string, number>,
) {
  type Agg = { initial: number; worked: number; remaining: number }
  const aggByPerson = new Map<string, Agg>()

  for (const t of tasksData) {
    const person = getResponsibleName(t)
    const init = Number(t?.attributes?.initial_estimate || 0)
    const rem = Number(t?.attributes?.remaining_time || 0)
    const worked = Number(workedMinutesByTask[String(t.id)] || 0)

    if (!aggByPerson.has(person)) aggByPerson.set(person, { initial: 0, worked: 0, remaining: 0 })
    const a = aggByPerson.get(person)!
    a.initial += init
    a.remaining += rem
    a.worked += worked
  }

  return Array.from(aggByPerson.entries()).map(([person, a]) => ({ person, ...a }))
}

/** Scope change: split tasks by created_at vs sprint start */
export function computeScopeChange(tasksData: any[], sprintStartISO: string) {
  const sprintStart = dayjs(sprintStartISO)

  const isCreatedOnOrAfterStart = (t: any) => {
    const created = t?.attributes?.created_at
    if (!created) return false
    const d = dayjs(created)
    return d.isSame(sprintStart, 'day') || d.isAfter(sprintStart, 'day')
  }

  const addedTasks = tasksData.filter(isCreatedOnOrAfterStart)
  const initialTasks = tasksData.filter(t => !isCreatedOnOrAfterStart(t))

  const scopeInitialMinutes = initialTasks.reduce(
    (sumM: number, t: any) => sumM + Number(t?.attributes?.initial_estimate ?? 0),
    0,
  )
  const scopeAddedMinutes = addedTasks.reduce(
    (sumM: number, t: any) => sumM + Number(t?.attributes?.initial_estimate ?? 0),
    0,
  )

  return {
    scopeInitialMinutes,
    scopeAddedMinutes,
    scopeInitialTasksCount: initialTasks.length,
    scopeAddedTasksCount: addedTasks.length,
  }
}

/** Minutes → hours (1 decimal) */
export function toHours(m: number) {
  return Math.round((m / 60) * 10) / 10
}
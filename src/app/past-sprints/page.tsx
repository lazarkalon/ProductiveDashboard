// src/app/past-sprints/page.tsx
import { PRODUCTIVE_API_TOKEN, PRODUCTIVE_ORG_ID } from '@/lib/productiveConfig'
import { Title, Text } from '@tremor/react'
import { Metadata } from 'next'
import dayjs from 'dayjs'

import { makeFetchProductive } from '@/lib/Productive'
import {
  fetchAllProductive,
  fetchAllWithIncludedSafe,
} from '@/lib/Productive/productiveDataHelpers'

import ProjectSprintMultiSelector from './ProjectSprintMultiSelector'
import VelocityChart from './VelocityChart'
import PersonVelocityChart from './PersonVelocityChart'
import EstimationAccuracyChart from './EstimationAccuracyChart'
import BreakdownByStatusChart from './BreakdownbyStatusChart'

// ---------- Page meta ----------
export const metadata: Metadata = {
  title: 'Past Sprints',
  description: 'Performance history and trends across sprints',
}

// ---------- Constants ----------
const RESPONSIBLE_CF_ID = '45468' // "Responsible Dev" custom field

// ---------- Helpers ----------
function toHours(mins: number) {
  return Math.round((Number(mins || 0) / 60) * 10) / 10
}

/**
 * Parse a window like "28.07 - 11.08" (accepts ".", "/", "-" separators).
 * Year is inferred; if end < start, bump the end forward.
 */
function parseWindowFromSprintName(name: string, referenceYear: number) {
  const re = /(\d{1,2})[./-](\d{1,2})\s*[–-]\s*(\d{1,2})[./-](\d{1,2})/
  const m = name.match(re)
  if (!m) return null
  const [, d1, m1, d2, m2] = m
  const start = dayjs(`${referenceYear}-${m1}-${d1}`, 'YYYY-M-D', true)
  let end = dayjs(`${referenceYear}-${m2}-${d2}`, 'YYYY-M-D', true)
  if (!start.isValid() || !end.isValid()) return null
  if (end.isBefore(start)) end = end.add(15, 'day')
  return { start, end }
}

// ---------- Types ----------
interface PastSprintsPageProps {
  searchParams?: {
    project_id?: string
    board_id?: string
    task_list_ids?: string // CSV
  }
}

// Updated to match stacked Velocity: Initial (planned) + Scope Change + Completed
export interface SprintVelocityPoint {
  sprintId: string
  sprintName: string
  plannedHours: number          // initial scope at sprint start (h)
  scopeChangeHours: number      // scope added after sprint start (h)
  completedHours: number        // actual within sprint window (h)
}

type BreakdownCounts = Record<string, number>
type BreakdownRow = {
  sprint: string
  [statusKey: string]: string | number | BreakdownCounts
  __counts: BreakdownCounts
}

export default async function PastSprintsPage({ searchParams = {} }: PastSprintsPageProps) {
  const taskListIdsCSV = searchParams.task_list_ids ?? ''
  const taskListIds = taskListIdsCSV.split(',').map(s => s.trim()).filter(Boolean)

  const header = (
    <>
      <Title className="mb-4">Sprint Review & Planning</Title>
      <Text className="mb-4">
        Select Multiple Sprints (Project → Folder → Task List). Metrics are based on the sprint window parsed from the sprint&apos;s name.
      </Text>
      <ProjectSprintMultiSelector />
    </>
  )

  if (taskListIds.length === 0) {
    return (
      <main className="px-3 md:px-6 py-4 mx-auto max-w-7xl">
        {header}
        <div className="mt-6 text-slate-400">
          Choose a project, folder, and one or more sprints to view velocity.
        </div>
      </main>
    )
  }

  // Auth + fetcher (hard-coded config)
  const fetchProductive = makeFetchProductive({
    authToken: PRODUCTIVE_API_TOKEN,
    organizationId: PRODUCTIVE_ORG_ID,
  })

  // Load selected task lists for labels
  const taskLists = await fetchAllProductive(fetchProductive, '/task_lists', {
    'filter[id]': taskListIds.join(','),
    'fields[task_lists]': 'name',
  })

  // ---- Accumulators ----
  const points: SprintVelocityPoint[] = []

  // For Velocity by Person (worked only)
  const perPersonPerSprint = new Map<string, Map<string, number>>() // person → sprintName → minutes

  // For Estimation Accuracy (initial vs worked)
  const initialByPersonBySprint = new Map<string, Map<string, number>>() // person → sprintName → minutes
  const workedByPersonBySprint  = new Map<string, Map<string, number>>() // person → sprintName → minutes

  // People name map (first name)
  const nameById = new Map<string, string>() // people id → first name

  // Breakdown rows (chart owns order/colors)
  const breakdownRows: BreakdownRow[] = []

  // helpers
  const addTo = (map: Map<string, Map<string, number>>, k1: string, k2: string, mins: number) => {
    const inner = map.get(k1) ?? new Map<string, number>()
    inner.set(k2, (inner.get(k2) ?? 0) + mins)
    map.set(k1, inner)
  }

  const yearGuess = dayjs().year()

  for (const tl of taskLists) {
    const tlId = tl.id
    const tlName: string = tl?.attributes?.name ?? `Sprint ${tlId}`

    // Pull tasks (need Responsible, Assignee, and Status for Breakdown grouping)
    const { data: tasksData, included: taskIncluded } = await fetchAllWithIncludedSafe(fetchProductive, '/tasks', {
      'filter[task_list_id]': tlId,
      'fields[tasks]': 'title,initial_estimate,remaining_time,created_at,custom_fields,assignee,task_list,workflow_status',
      'fields[workflow_statuses]': 'name',
      include: 'assignee,task_list,workflow_status',
    })

    // Build status id -> name map
    const statusNameById = new Map<string, string>()
    ;(taskIncluded || [])
      .filter((i: any) => i.type === 'workflow_statuses')
      .forEach((ws: any) => {
        const id = String(ws.id)
        const nm = ws?.attributes?.name ?? 'Unknown'
        statusNameById.set(id, nm)
      })

    // Collect people from included (assignees)
    ;(taskIncluded || [])
      .filter((i: any) => i.type === 'people')
      .forEach((p: any) => {
        const id = String(p.id)
        const fn = p?.attributes?.first_name ?? ''
        const ln = p?.attributes?.last_name ?? ''
        const email = p?.attributes?.email ?? ''
        const display = fn || ln || email || 'Unknown'
        nameById.set(id, fn || display)
      })

    const taskIds = tasksData.map((t: any) => t.id)

    // Pull time entries WITH relationships so we can resolve the person on the entry
    const { data: timeEntriesData, included: teIncluded } =
      taskIds.length
        ? await fetchAllWithIncludedSafe(fetchProductive, '/time_entries', {
            'filter[task_id]': taskIds.join(','),
            include: 'person,task',
            'fields[time_entries]': 'date,time,person,task',
          })
        : { data: [], included: [] as any[] }

    // Merge people from time entry includes (actual workers)
    ;(teIncluded || [])
      .filter((i: any) => i.type === 'people')
      .forEach((p: any) => {
        const id = String(p.id)
        const fn = p?.attributes?.first_name ?? ''
        const ln = p?.attributes?.last_name ?? ''
        const email = p?.attributes?.email ?? ''
        const display = fn || ln || email || 'Unknown'
        nameById.set(id, fn || display)
      })

    // Ensure names for Responsible CF people (might not be in includes)
    const responsibleIds = Array.from(
      new Set(
        tasksData
          .map((t: any) => t?.attributes?.custom_fields?.[RESPONSIBLE_CF_ID])
          .filter(Boolean)
          .map(String),
      ),
    )
    const missingResponsible = responsibleIds.filter((id) => !nameById.has(id))
    if (missingResponsible.length) {
      const fetchedPeople = await fetchAllProductive(fetchProductive, '/people', {
        'filter[id]': missingResponsible.join(','),
        'fields[people]': 'first_name,last_name,email',
      })
      for (const p of fetchedPeople as any[]) {
        const id = String(p.id)
        const fn = p?.attributes?.first_name ?? ''
        const ln = p?.attributes?.last_name ?? ''
        const email = p?.attributes?.email ?? ''
        const display = fn || ln || email || 'Unknown'
        nameById.set(id, fn || display)
      }
    }

    // Try to parse the sprint window from the name
    const window = parseWindowFromSprintName(tlName, yearGuess)

    let plannedMins = 0
    let addedMins = 0
    let completedMins = 0

    // For breakdown (this sprint only)
    let breakdownCounts: BreakdownCounts = {}
    let workedHoursByStatus = new Map<string, number>()
    let remainingHoursByStatus = new Map<string, number>()

    if (window) {
      const { start, end } = window

      // Attribute initial estimates to Responsible (fallback Assignee)
      for (const t of tasksData) {
        const est = Number(t?.attributes?.initial_estimate || 0)
        if (!est) continue

        const cfId       = t?.attributes?.custom_fields?.[RESPONSIBLE_CF_ID]
        const assigneeId = t?.relationships?.assignee?.data?.id
        const person =
          (cfId && nameById.get(String(cfId))) ? nameById.get(String(cfId))! :
          (assigneeId && nameById.get(String(assigneeId))) ? nameById.get(String(assigneeId))! :
          'Unassigned'

        addTo(initialByPersonBySprint, person, tlName, est)

        // Split scope at sprint start
        const createdAt = t?.attributes?.created_at
        if (createdAt && (dayjs(createdAt).isSame(start, 'day') || dayjs(createdAt).isBefore(start, 'day'))) {
          plannedMins += est
        } else {
          addedMins += est
        }
      }

      // Aggregate worked minutes within window by taskId
      const workedByTaskId = new Map<string, number>()
      for (const te of timeEntriesData) {
        const a = te?.attributes ?? {}
        const d = a?.date ? dayjs(a.date) : null
        if (!d) continue
        const inWindow =
          (d.isSame(start, 'day') || d.isAfter(start, 'day')) &&
          (d.isSame(end, 'day')   || d.isBefore(end, 'day'))
        if (!inWindow) continue

        const minutes = Number(a.time || 0)
        completedMins += minutes

        // velocity by person
        const personId: string | undefined = te?.relationships?.person?.data?.id
        const worker = (personId && nameById.get(String(personId))) || 'Unassigned'
        addTo(perPersonPerSprint, worker, tlName, minutes)
        addTo(workedByPersonBySprint, worker, tlName, minutes)

        // breakdown by task
        const taskId = te?.relationships?.task?.data?.id
        if (taskId) workedByTaskId.set(taskId, (workedByTaskId.get(taskId) ?? 0) + minutes)
      }

      // Compute breakdown per task at sprint end and bucket by status (worked & remaining)
      for (const t of tasksData) {
        const taskId = String(t.id)
        const est = Number(t?.attributes?.initial_estimate || 0)
        if (!est) continue

        // Only tasks planned by sprint start contribute to breakdown
        const createdAt = t?.attributes?.created_at
        const isPlanned = createdAt &&
          (dayjs(createdAt).isSame(start, 'day') || dayjs(createdAt).isBefore(start, 'day'))
        if (!isPlanned) continue

        const workedInWindow = workedByTaskId.get(taskId) ?? 0
        const remainingAtEnd = Math.max(est - workedInWindow, 0)

        const statusId = t?.relationships?.workflow_status?.data?.id
        const statusName = (statusId && statusNameById.get(String(statusId))) || 'Unknown'

        if (workedInWindow > 0) {
          workedHoursByStatus.set(
            statusName,
            (workedHoursByStatus.get(statusName) ?? 0) + workedInWindow
          )
        }

        if (remainingAtEnd > 0) {
          remainingHoursByStatus.set(
            statusName,
            (remainingHoursByStatus.get(statusName) ?? 0) + remainingAtEnd
          )
          breakdownCounts[statusName] = (breakdownCounts[statusName] ?? 0) + 1
        }
      }

      // Build row for this sprint (convert mins → hours now)
      const anyWorked = workedHoursByStatus.size > 0
      const anyRemaining = remainingHoursByStatus.size > 0

      if (anyWorked || anyRemaining) {
        const row: BreakdownRow = { sprint: tlName, __counts: breakdownCounts }
        // union of all statuses that had either worked or remaining
        const statuses = new Set<string>([
          ...Array.from(workedHoursByStatus.keys()),
          ...Array.from(remainingHoursByStatus.keys()),
        ])
        for (const status of statuses) {
          const w = workedHoursByStatus.get(status) ?? 0
          const r = remainingHoursByStatus.get(status) ?? 0
          if (w > 0) row[`${status}::worked`] = toHours(w)
          if (r > 0) row[`${status}::remaining`] = toHours(r)
        }
        breakdownRows.push(row)
      } else {
        // still push an empty row so the chart shows the sprint
        breakdownRows.push({ sprint: tlName, __counts: {} })
      }
    } else {
      // No parsable dates -> treat velocity normally; skip breakdown for this sprint
      const totalEst = tasksData.reduce(
        (sum: number, t: any) => sum + Number(t?.attributes?.initial_estimate || 0),
        0
      )
      plannedMins = totalEst
      addedMins = 0

      for (const t of tasksData) {
        const est = Number(t?.attributes?.initial_estimate || 0)
        if (!est) continue
        const cfId       = t?.attributes?.custom_fields?.[RESPONSIBLE_CF_ID]
        const assigneeId = t?.relationships?.assignee?.data?.id
        const person =
          (cfId && nameById.get(String(cfId))) ? nameById.get(String(cfId))! :
          (assigneeId && nameById.get(String(assigneeId))) ? nameById.get(String(assigneeId))! :
          'Unassigned'
        addTo(initialByPersonBySprint, person, tlName, est)
      }

      for (const te of timeEntriesData) {
        const minutes = Number(te?.attributes?.time || 0)
        completedMins += minutes
        const personId: string | undefined = te?.relationships?.person?.data?.id
        const worker = (personId && nameById.get(String(personId))) || 'Unassigned'
        addTo(perPersonPerSprint, worker, tlName, minutes)
        addTo(workedByPersonBySprint, worker, tlName, minutes)
      }

      // push empty breakdown row to keep alignment
      breakdownRows.push({ sprint: tlName, __counts: {} })
    }

    points.push({
      sprintId: tlId,
      sprintName: tlName,
      plannedHours: toHours(plannedMins),
      scopeChangeHours: toHours(addedMins),   // <— matches VelocityChart
      completedHours: toHours(completedMins),
    })
  }

  // ---- Chart data prep ----
  points.sort((a, b) => a.sprintName.localeCompare(b.sprintName, undefined, { numeric: true }))
  const sprintNamesOrdered = points.map(p => p.sprintName)

  // Velocity by Person rows (worked only)
  const personRows: Array<{ person: string; avg: number; [k: string]: number | string }> = []
  for (const [person, bySprint] of perPersonPerSprint.entries()) {
    const row: any = { person }
    let sum = 0, count = 0
    sprintNamesOrdered.forEach(name => {
      const hours = toHours(bySprint.get(name) ?? 0)
      row[name] = hours
      sum += hours
      count += 1
    })
    row.avg = count ? Math.round((sum / count) * 10) / 10 : 0
    personRows.push(row)
  }
  personRows.sort((a, b) => String(a.person).localeCompare(String(b.person)))

  // Estimation Accuracy rows (stacked per sprint) + averages
  type AccuracyRow = { person: string; [key: string]: number | string }
  const peopleSet = new Set([
    ...Array.from(initialByPersonBySprint.keys()),
    ...Array.from(workedByPersonBySprint.keys()),
  ])

  const accuracyRows: AccuracyRow[] = []
  const personAccuracyAvg: { person: string; avgPct: number }[] = []

  for (const person of peopleSet) {
    const row: AccuracyRow = { person }
    let pctSum = 0
    let pctDen = 0

    for (const sprintName of sprintNamesOrdered) {
      const estMins = initialByPersonBySprint.get(person)?.get(sprintName) ?? 0
      const wrkMins = workedByPersonBySprint.get(person)?.get(sprintName) ?? 0

      // split worked vs remaining vs overrun
      const workedH    = toHours(Math.min(wrkMins, estMins))
      const remainingH = toHours(Math.max(estMins - wrkMins, 0))
      const overrunH   = toHours(Math.max(wrkMins - estMins, 0))

      // keys are namespaced by sprint so the stacked bars can be grouped
      row[`${sprintName}::Worked`]    = workedH
      row[`${sprintName}::Remaining`] = remainingH
      row[`${sprintName}::Overrun`]   = overrunH

      if (estMins > 0) {
        const pct = Math.min(wrkMins, estMins) / estMins // cap underruns at 100%
        pctSum += pct
        pctDen += 1
      }
    }

    accuracyRows.push(row)
    personAccuracyAvg.push({
      person,
      avgPct: pctDen ? Math.round((pctSum / pctDen) * 1000) / 10 : 0, // e.g., 87.5
    })
  }

  // sort averages to match chart order (name asc)
  personAccuracyAvg.sort((a, b) => a.person.localeCompare(b.person))

  // Keep breakdown rows in sprint order
  const breakdownRowsOrdered = breakdownRows.slice().sort(
    (a, b) => String(a.sprint).localeCompare(String(b.sprint), undefined, { numeric: true })
  )

  return (
    <main className="px-3 md:px-6 py-4 mx-auto max-w-7xl">
      {header}

      <div className="mt-6 space-y-6">
        {points.length ? (
          <>
            {/* Team Velocity (stacked: Initial + Scope Change) */}
            <VelocityChart data={points} />

            {/* Velocity by Person (worked only) */}
            {personRows.length ? (
              <PersonVelocityChart rows={personRows} sprintNames={sprintNamesOrdered} />
            ) : (
              <Text className="text-slate-400 italic">No per-person data available.</Text>
            )}

            {/* Estimation Accuracy by Person */}
            {accuracyRows.length ? (
              <EstimationAccuracyChart
                rows={accuracyRows}
                sprintNames={sprintNamesOrdered}
                personAverages={personAccuracyAvg}
              />
            ) : null}

            {/* Breakdown by Status — full width, after Estimation Accuracy */}
            <BreakdownByStatusChart
              rows={breakdownRowsOrdered as any}
              title="Breakdown by Status"
            />
          </>
        ) : (
          <Text className="text-slate-400 italic">
            No data for the selected sprints.
          </Text>
        )}
      </div>
    </main>
  )
}
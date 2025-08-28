// src/app/sprint-dashboard/page.tsx
import { PRODUCTIVE_API_TOKEN, PRODUCTIVE_ORG_ID } from '@/lib/productiveConfig'
import { Text, Title } from '@tremor/react'
import sum from 'lodash/sum'
import groupBy from 'lodash/groupBy'
import { Metadata } from 'next'

import dayjs from 'dayjs'
import { makeFetchProductive } from '@/lib/Productive'

import {
  fetchAllProductive,
  fetchAllWithIncludedSafe,
} from '@/lib/Productive/productiveDataHelpers'

import getBusinessDates from '@/utils/getBusinessDates'
import getActualByBusinessDates from './getActualByBusinessDates'
import { ProductiveTask } from './types'
import CurrentSprintDashboard from './CurrentSprintDashboard'
import ProjectTaskListSelector from './ProjectTaskListSelector'

// ⬇️ analytics helpers
import {
  buildStatusNameById,
  makeGetStatusNameFromTask,
  normalizeTimeEntries,
  splitWorkedMinutesByTask,
  aggregateEffortByPerson,
  computeScopeChange,
  computeRemainingByStatus,
  toHours,
} from '@/lib/Productive/analytics'

export const metadata: Metadata = {
  title: 'Current Sprint Dashboard',
  description: 'An overview of your sprint.',
}

export interface BurndownPageProps {
  searchParams?: {
    // IDs-first (new)
    project_id?: string
    sprint_board_id?: string
    sprint_task_list_id?: string

    // Legacy fallbacks (kept for compatibility)
    board_id?: string
    task_list_id?: string
    task_list_name?: string

    // These are no longer used (we derive the window from the sprint name)
    start_date?: string
    end_date?: string
  }
}

const RESPONSIBLE_CF_ID = '45468' // "Responsible Dev" custom field

// Parse "28.07 - 11.08" (also supports ".", "/", "-") into a window.
// If end < start, bump end forward.
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

const Page: React.FC<BurndownPageProps> = async ({ searchParams = {} }) => {
  // ---- New params (with legacy fallbacks) -----------------------------------
  const projectId         = searchParams.project_id ?? ''
  const sprintBoardId     = searchParams.sprint_board_id ?? searchParams.board_id ?? '' // not strictly required
  const sprintTaskListId  = searchParams.sprint_task_list_id ?? searchParams.task_list_id ?? ''
  const taskListNameLegacy= searchParams.task_list_name ?? ''

  // Guard: need either sprint_task_list_id or (legacy) name
  if (!sprintTaskListId && !taskListNameLegacy) {
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <Title>Current Sprint Dashboard</Title>
        <Text>Select a Project → Folder → Task List to view metrics</Text>
        <ProjectTaskListSelector />
      </main>
    )
  }

  // Auth + fetcher (now hard-coded; no URL token)
  const fetchProductive = makeFetchProductive({
    authToken: PRODUCTIVE_API_TOKEN,
    organizationId: PRODUCTIVE_ORG_ID,
  })

  // Prefer filtering by task_list_id; fallback to name-contains for legacy URLs
  const taskFilter: Record<string, string> = sprintTaskListId
    ? { 'filter[task_list_id]': sprintTaskListId }
    : { 'filter[task_list_name][contains]': taskListNameLegacy }

  // --- Fetch the task list to read its name (so we can parse dates)
  const taskListLabel = sprintTaskListId
    ? await fetchAllProductive(fetchProductive, '/task_lists', {
        'filter[id]': sprintTaskListId,
        'fields[task_lists]': 'name',
      }).then((arr: any[]) => arr?.[0]?.attributes?.name ?? '')
    : taskListNameLegacy

  const yearGuess = dayjs().year()
  const window = parseWindowFromSprintName(taskListLabel, yearGuess)

  const startISO = window ? window.start.format('YYYY-MM-DD') : ''
  const endISO   = window ? window.end.format('YYYY-MM-DD')   : ''
  const businessDates = window ? getBusinessDates(startISO, endISO) : []

  // --- Fetch tasks (include workflow_status + assignee) + closed count
  const [{ data: tasksData, included }, actualTasksData] = await Promise.all([
    fetchAllWithIncludedSafe(fetchProductive, '/tasks', {
      ...taskFilter,
      'fields[tasks]':
        // ⬇️ add assignee so we can fall back when CF missing
        'title,initial_estimate,remaining_time,workflow_status,created_at,custom_fields,assignee',
      'fields[workflow_statuses]': 'name',
      // ⬇️ pull both workflow_status and assignee into `included`
      include: 'workflow_status,assignee',
    }),
    fetchAllProductive(fetchProductive, '/tasks', {
      ...taskFilter,
      'filter[workflow_status_category_id]': 3, // Closed
    }),
  ])

  // --- Build person map from BOTH included & explicit fetch ------------------
  // Collect ids from Responsible CF and from assignee relationship
  const responsibleIds = tasksData
    .map((t: any) => t?.attributes?.custom_fields?.[RESPONSIBLE_CF_ID])
    .filter(Boolean)
    .map(String)

  const assigneeIds = tasksData
    .map((t: any) => t?.relationships?.assignee?.data?.id)
    .filter(Boolean)
    .map(String)

  const allIds = Array.from(new Set([...responsibleIds, ...assigneeIds]))

  // People that arrived via `included`
  const includedPeople = (included || []).filter((it: any) => it.type === 'people')

  // Build a map from the included payload (first name only)
  const nameByIdFromIncluded = new Map<string, string>()
  for (const p of includedPeople as any[]) {
    const id = String(p.id)
    const fn = p?.attributes?.first_name ?? ''
    if (id && fn) nameByIdFromIncluded.set(id, fn)
  }

  // Any people still missing -> fetch explicitly
  const missingIds = allIds.filter(id => !nameByIdFromIncluded.has(id))
  const fetchedPeople = missingIds.length
    ? await fetchAllProductive(fetchProductive, '/people', {
        'filter[id]': missingIds.join(','),
        'fields[people]': 'first_name,last_name,email',
      })
    : []

  // Final personNameById as a plain object (first name)
  const personNameById: Record<string, string> = {}
  for (const [id, name] of nameByIdFromIncluded.entries()) personNameById[id] = name
  for (const p of fetchedPeople as any[]) {
    const id = String(p.id)
    const fn = p?.attributes?.first_name ?? ''
    if (id && fn) personNameById[id] = fn
  }

  // Resolver: Responsible Dev → Assignee → placeholders → "Unassigned"
  const getResponsibleOrAssigneeName = (t: any): string => {
    const cfId =
      t?.attributes?.custom_fields?.[RESPONSIBLE_CF_ID] ??
      t?.attributes?.custom_fields?.[String(RESPONSIBLE_CF_ID)]
    if (cfId && personNameById[String(cfId)]) return personNameById[String(cfId)]

    const assigneeId = t?.relationships?.assignee?.data?.id
    if (assigneeId && personNameById[String(assigneeId)]) return personNameById[String(assigneeId)]

    if (cfId) return `Person #${cfId}` // id but no name (rare)
    if (assigneeId) return `Person #${assigneeId}`
    return 'Unassigned'
  }

  // --- Time entries for those tasks (no API date filter; we filter locally by window)
  const taskIds = tasksData.map((t: ProductiveTask) => t.id)
  const timeEntriesData = taskIds.length
    ? await fetchAllProductive(fetchProductive, '/time_entries', {
        'filter[task_id]': taskIds.join(','), // only these tasks
        include: 'task',
      })
    : []

  // Flatten for burndown use
  const timeEntrys = normalizeTimeEntries(timeEntriesData)

  // --- Status lookups & “remaining by status”
  const statusNameById = buildStatusNameById(included || [])
  const getStatusNameFromTask = makeGetStatusNameFromTask(statusNameById)
  const remainingByStatus = computeRemainingByStatus(tasksData, getStatusNameFromTask)

  // --- Business dates & burndown aggregates (derived from sprint name)
  const actualByBusinessDatesSprint = window
    ? getActualByBusinessDates(timeEntrys, businessDates)
    : {}

  const actualByBusinessDatesTotal = Object.entries(groupBy(timeEntrys, 'date')).reduce(
    (acc, [date, entries]) => ({
      ...acc,
      [date]: entries.reduce((s, e) => s + e.time, 0),
    }),
    {} as Record<string, number>,
  )

  const sprintActualMinutes = sum(Object.values(actualByBusinessDatesSprint))
  const totalActualMinutes = timeEntrys.reduce((acc, e) => acc + e.time, 0)

  const estimatedMinutes = tasksData.reduce(
    (acc: number, t: ProductiveTask) => acc + (t.attributes.initial_estimate || 0),
    0,
  )

  const estimatedTasksCount = tasksData.length
  const actualTasksCount = actualTasksData.length

  const sprintData = {
    estimatedMinutes,
    actualMinutes: sprintActualMinutes,
    estimatedTasksCount,
    actualTasksCount,
  }

  const totalData = {
    estimatedMinutes,
    actualMinutes: totalActualMinutes,
    estimatedTasksCount,
    actualTasksCount,
    preSprintMinutes: 0,
  }

  // --- Worked time (build sprint-only and total-to-end maps) using derived window
  const { workedMinutesByTaskSprint, workedMinutesByTaskTotal } = splitWorkedMinutesByTask(
    timeEntriesData,
    startISO,
    endISO,
  )

  // Aggregate effort by person (sprint + total) using the resolver
  const aggSprint = aggregateEffortByPerson(tasksData, getResponsibleOrAssigneeName, workedMinutesByTaskSprint)
  const aggTotal  = aggregateEffortByPerson(tasksData, getResponsibleOrAssigneeName, workedMinutesByTaskTotal)

  const effortByResponsibleRows = aggSprint
    .map(a => ({
      person: a.person,
      'Initial estimate': toHours(a.initial),
      'Worked time': toHours(a.worked),
      'Time to complete': toHours(a.remaining),
    }))
    .sort((x, y) => y['Initial estimate'] - x['Initial estimate'])

  const effortByResponsibleRowsTotal = aggTotal
    .map(a => ({
      person: a.person,
      'Initial estimate': toHours(a.initial),
      'Worked time': toHours(a.worked),
      'Time to complete': toHours(a.remaining),
    }))
    .sort((x, y) => y['Initial estimate'] - x['Initial estimate'])

  // --- Scope Change (use sprint start)
  const {
    scopeInitialMinutes,
    scopeAddedMinutes,
    scopeInitialTasksCount,
    scopeAddedTasksCount,
  } = computeScopeChange(tasksData, window ? businessDates[0] : undefined as any)

  // Ensure all tasks have a usable title
  const tasksWithTitles = tasksData.map((t: any) => ({
    ...t,
    attributes: {
      ...t.attributes,
      title: t.attributes?.title ?? t.attributes?.name ?? `Task ${t.id}`,
    },
  }))

  // ✅ Build client-friendly risk inputs (no server-side callouts computation)
  const riskTasks = (tasksWithTitles as any[]).map(t => ({
    ...t,
    // provide a resolved, serializable responsible name for the client
    responsibleName: getResponsibleOrAssigneeName(t),
  }))

  // ✅ Simple daysLeft derived from businessDates (today and after)
  const daysLeft = (businessDates || []).filter(d =>
    dayjs(d).isSame(dayjs(), 'day') || dayjs(d).isAfter(dayjs(), 'day')
  ).length

  // --- Render
  return (
    <main className="px-3 md:px-6 py-4 mx-auto max-w-7xl">
      <div className="mb-4">
        <Title>Sprint Management</Title>
        <Text>
          Select a Sprint (Project → Folder → Task List). Metrics are based on the sprint window parsed from its name.
        </Text>
      </div>

      <ProjectTaskListSelector />

      <CurrentSprintDashboard
        sprintData={sprintData}
        totalData={totalData as any}
        businessDates={businessDates}
        actualByBusinessDatesSprint={actualByBusinessDatesSprint}
        actualByBusinessDatesTotal={actualByBusinessDatesTotal}
        remainingByStatus={remainingByStatus}
        scopeInitialMinutes={scopeInitialMinutes}
        scopeAddedMinutes={scopeAddedMinutes}
        scopeInitialTasksCount={scopeInitialTasksCount}
        scopeAddedTasksCount={scopeAddedTasksCount}
        effortByResponsibleRows={effortByResponsibleRows}           // Sprint Only
        effortByResponsibleRowsTotal={effortByResponsibleRowsTotal} // Total to End

        // ⬇️ NEW: let the client compute risks with a slider
        riskTasks={riskTasks}
        daysLeft={daysLeft}
      />
    </main>
  )
}

export default Page
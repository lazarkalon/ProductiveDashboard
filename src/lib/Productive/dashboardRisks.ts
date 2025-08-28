// src/lib/dashboardRisk.ts
import dayjs from 'dayjs'

export type ProductiveTask = {
  id: string
  attributes: {
    remaining_time?: number // minutes
    name?: string
    created_at?: string
  }
}

export type DevRisk = {
  person: string
  remainingHours: number
  capacityLeftHours: number
  daysLeft: number
  status: 'ok' | 'warning' | 'risk'
}

export type TaskRisk = {
  taskId: string
  taskName: string
  person: string
  taskRemainingHours: number
  devRemainingHours: number
  shareOfDevRemaining: number // 0..1
  severity: 'none' | 'warning' | 'critical'
}

function round1(n: number) { return Math.round(n * 10) / 10 }
function round2(n: number) { return Math.round(n * 100) / 100 }

/**
 * Compute "At Risk" callouts using a 6h/day default capacity.
 */
export function computeAtRiskCallouts(
  tasks: ProductiveTask[],
  personForTask: (t: ProductiveTask) => string,
  businessDates: string[],
  {
    todayIso = dayjs().format('YYYY-MM-DD'),
    capacityPerDayHours = 6,
  }: { todayIso?: string; capacityPerDayHours?: number } = {}
) {
  // Days left (today inclusive)
  const today = dayjs(todayIso)
  const daysLeft = businessDates.filter(d => !dayjs(d).isBefore(today, 'day')).length
  const capacityLeftHours = daysLeft * capacityPerDayHours

  // Remaining by person
  const remainingByPerson = new Map<string, number>()
  tasks.forEach(t => {
    const person = personForTask(t)
    const remainingH = Number(t.attributes?.remaining_time || 0) / 60
    remainingByPerson.set(person, (remainingByPerson.get(person) || 0) + remainingH)
  })

  // Dev risk
  const devCallouts: DevRisk[] = [...remainingByPerson.entries()]
    .map(([person, remH]) => {
      const warnCut = 0.8 * capacityLeftHours
      const status: DevRisk['status'] =
        remH >= capacityLeftHours ? 'risk' :
        remH >= warnCut ? 'warning' : 'ok'
      return {
        person,
        remainingHours: round1(remH),
        capacityLeftHours: round1(capacityLeftHours),
        daysLeft,
        status,
      }
    })
    .sort((a, b) => b.remainingHours - a.remainingHours)

  const isDevAtRisk = new Map<string, boolean>(
    devCallouts.map(d => [d.person, d.status === 'risk'])
  )

  // Task risk (when dev is at risk)
  const taskCallouts: TaskRisk[] = tasks.map(t => {
    const person = personForTask(t as any)
    const taskRemH = Number(t.attributes?.remaining_time || 0) / 60
    const devRemH  = remainingByPerson.get(person) || 0
    const share    = devRemH > 0 ? taskRemH / devRemH : 0

    let severity: TaskRisk['severity'] = 'none'
    if (isDevAtRisk.get(person)) {
      if (share >= 0.5) severity = 'critical'
      else if (share >= 0.33) severity = 'warning'
    }

    return {
      taskId: t.id,
      taskName: t.attributes?.title || t.attributes?.name || `Task ${t.id}`, // <-- title first
      person,
      taskRemainingHours: round1(taskRemH),
      devRemainingHours: round1(devRemH),
      shareOfDevRemaining: round2(share),
      severity,
    }
  })
  .filter(t => t.severity !== 'none')
  .sort((a, b) => b.shareOfDevRemaining - a.shareOfDevRemaining)

  return { devCallouts, taskCallouts, daysLeft, capacityPerDayHours }
}
import type { NextApiRequest, NextApiResponse } from 'next'
import { makeFetchProductive } from '@/lib/Productive'
import { PRODUCTIVE_API_TOKEN, PRODUCTIVE_ORG_ID } from '@/lib/productiveConfig'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🔹 [API] /productive/task_lists called')
  try {
    const { board_id, project_id } = req.query

    const fetchProductive = makeFetchProductive({
      authToken: PRODUCTIVE_API_TOKEN,
      organizationId: PRODUCTIVE_ORG_ID,
    })

    const params: Record<string, any> = {
      'page[size]': 200,
      'filter[status]': 1,               // ✅ Only active task lists
    }
    if (project_id) params['filter[project_id]'] = project_id
    if (board_id)   params['filter[board_id]'] = board_id

    const response = await fetchProductive('/task_lists', { params })
    const allTaskLists = response?.data || []

    const taskLists = allTaskLists.map((t: any) => ({
      id: t.id,
      name: t.attributes?.name || `Task List ${t.id}`,
      boardId: t.relationships?.board?.data?.id || null,
      projectId: t.relationships?.project?.data?.id || null,
    }))

    return res.status(200).json(taskLists)
  } catch (error: any) {
    console.error('❌ Error fetching task lists:', error?.message || error)
    return res.status(200).json([])
  }
}
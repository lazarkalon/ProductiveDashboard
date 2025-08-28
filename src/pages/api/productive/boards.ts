import type { NextApiRequest, NextApiResponse } from 'next'
import { makeFetchProductive } from '@/lib/Productive'
import { PRODUCTIVE_API_TOKEN, PRODUCTIVE_ORG_ID } from '@/lib/productiveConfig'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🔹 [API] /productive/boards called')
  try {
    const { project_id } = req.query
    const statusParam =
      (req.query['filter[status]'] as string) ||
      (req.query.status as string) ||
      '1' // default to active

    const fetchProductive = makeFetchProductive({
      authToken: PRODUCTIVE_API_TOKEN,
      organizationId: PRODUCTIVE_ORG_ID,
    })

    const params: Record<string, any> = {
      'page[size]': 200,
      'filter[status]': 1,       // active
    }
    if (project_id) params['filter[project_id]'] = project_id

    const response = await fetchProductive('/boards', { params })

    const boards = (response?.data || []).map((b: any) => ({
      id: b.id,
      name: b.attributes?.name || `Board ${b.id}`,
      projectId: b.relationships?.project?.data?.id || null,
    }))

    return res.status(200).json(boards)
  } catch (error: any) {
    console.error('❌ Error fetching boards:', error?.message || error)
    return res.status(200).json([])
  }
}
import type { NextApiRequest, NextApiResponse } from 'next'
import { makeFetchProductive } from '@/lib/Productive'
import { PRODUCTIVE_API_TOKEN, PRODUCTIVE_ORG_ID } from '@/lib/productiveConfig'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🔹 [API] /productive/projects (client + active) called')
  try {
    const fetchProductive = makeFetchProductive({
      authToken: PRODUCTIVE_API_TOKEN,
      organizationId: PRODUCTIVE_ORG_ID,
    })

    const params = {
      'filter[project_type]': 2, // client
      'filter[status]': 1,       // active
      'page[size]': 200,
    }

    const response = await fetchProductive('/projects', { params })
    const projects = (response?.data || []).map((p: any) => ({
      id: p.id,
      name: p.attributes?.name || `Project ${p.id}`,
      status: p.attributes?.status,
      project_type: p.attributes?.project_type,
    }))

    return res.status(200).json(projects)
  } catch (error: any) {
    console.error('❌ Error fetching projects:', error?.message || error)
    return res.status(200).json([])
  }
}
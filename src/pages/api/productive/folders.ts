import type { NextApiRequest, NextApiResponse } from 'next'
import { makeFetchProductive } from '@/lib/Productive'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🔹 [API] /productive/folders called')

  try {
    const { token, project_id } = req.query
    if (!token || typeof token !== 'string') {
      console.error('❌ Missing token')
      return res.status(200).json([])
    }

    if (!project_id || typeof project_id !== 'string') {
      console.error('❌ Missing project_id')
      return res.status(200).json([])
    }

    const [authToken, organizationId] = token.split(':')
    const fetchProductive = makeFetchProductive({ authToken, organizationId })

    // ✅ Fetch folders for the given project
    const folderResponse = await fetchProductive('/folders', {
      params: {
        'filter[project_id]': project_id,
        'page[size]': 200,
      },
    })

    if (!folderResponse?.data) {
      console.warn('⚠️ No folders returned')
      return res.status(200).json([])
    }

    console.log(`✅ Retrieved ${folderResponse.data.length} folders`)

    const folders = folderResponse.data.map((f: any) => ({
      id: f.id,
      name: f.attributes?.name || `Folder ${f.id}`,
    }))

    console.log(`✅ Returning ${folders.length} folders`)
    return res.status(200).json(folders)
  } catch (error: any) {
    console.error('❌ Unexpected error fetching folders:', error.message || error)
    return res.status(200).json([])
  }
}
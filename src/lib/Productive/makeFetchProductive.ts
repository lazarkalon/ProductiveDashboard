// src/lib/Productive/makeFetchProductive.ts
// ❗ Server-only. Do NOT import this file from any `use client` component.

import axios, { AxiosRequestConfig } from 'axios'
import { PRODUCTIVE_API_TOKEN, PRODUCTIVE_ORG_ID } from '@/lib/productiveConfig'

export type ProductiveClient = (
  path: string,
  options?: AxiosRequestConfig
) => Promise<any>

/**
 * Factory that returns a Productive API client.
 * If no args are passed, it uses the hard-coded values from productiveConfig.
 */
export function makeFetchProductive({
  authToken = PRODUCTIVE_API_TOKEN,
  organizationId = PRODUCTIVE_ORG_ID,
}: Partial<{ authToken: string; organizationId: string }> = {}): ProductiveClient {
  // Guard: prevent accidental client-side usage
  if (typeof window !== 'undefined') {
    throw new Error('makeFetchProductive must be used on the server only.')
  }

  return async (path, options: AxiosRequestConfig = {}) => {
    const {
      headers,
      method = 'get',
      params,
      ...rest
    } = options

    try {
      const res = await axios.request({
        baseURL: 'https://api.productive.io/api/v2',
        url: path,
        method,
        // Keep Productive-style filter keys like filter[status]
        params,
        paramsSerializer: {
          serialize: (p) => new URLSearchParams(p as Record<string, string>).toString(),
        },
        headers: {
          'X-Auth-Token': authToken,
          'X-Organization-Id': organizationId,
          'Content-Type': 'application/json',
          ...headers,
        },
        ...rest,
      })

      return res.data
    } catch (err: any) {
      // Surface a concise error; upstream can decide how to handle
      const status = err?.response?.status
      const msg = err?.response?.data || err?.message || err
      console.error('❌ Productive API error:', status, msg)
      throw err
    }
  }
}

/** Preconfigured client using hard-coded values. Prefer this in server code. */
export const fetchProductive = makeFetchProductive()

export default makeFetchProductive
// src/app/settings/ProductiveSettingsForm.tsx
'use client'

import React from 'react'
import { Card, Title, Text, Badge } from '@tremor/react'
import { PRODUCTIVE_API_TOKEN, PRODUCTIVE_ORG_ID } from '@/lib/productiveConfig'
import InfoTooltip from '@/components/InfoTooltip'

export default function ProductiveSettingsForm() {
  const [showOrg, setShowOrg] = React.useState(false)
  const [showToken, setShowToken] = React.useState(false)
  const [copied, setCopied] = React.useState<null | 'org' | 'token'>(null)

  const copy = async (val: string, which: 'org' | 'token') => {
    try {
      await navigator.clipboard.writeText(val)
      setCopied(which)
      setTimeout(() => setCopied(null), 1200)
    } catch {
      // no-op
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Title>Productive Settings</Title>
          <Text className="text-slate-400">
            These values are <span className="font-semibold text-slate-300">hard-coded in the project</span> and are read-only here.
            Edit <code className="mx-1 rounded bg-slate-800 px-1 py-0.5 text-slate-200">src/lib/productiveConfig.ts</code> to change them.
          </Text>
        </div>

        <InfoTooltip placement="left">
          <div className="space-y-1 text-sm">
            <div>
              The API Token &amp; Organization ID are sourced from{' '}
              <code>src/lib/productiveConfig.ts</code> at build time.
            </div>
            <div>They are not saved from this page. The Save button is disabled.</div>
          </div>
        </InfoTooltip>
      </div>

      {/* Org ID */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <label className="block text-sm text-slate-300 mb-1">Organization ID</label>
        <div className="flex items-center gap-2">
          <input
            type={showOrg ? 'text' : 'password'}
            readOnly
            disabled
            value={PRODUCTIVE_ORG_ID}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 disabled:opacity-100"
          />
          <button
            type="button"
            onClick={() => setShowOrg(v => !v)}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
            aria-label={showOrg ? 'Hide Organization ID' : 'Reveal Organization ID'}
          >
            {showOrg ? 'Hide' : 'Reveal'}
          </button>
          <button
            type="button"
            onClick={() => copy(PRODUCTIVE_ORG_ID, 'org')}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
          >
            {copied === 'org' ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* API Token */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <label className="block text-sm text-slate-300 mb-1">API Token</label>
        <div className="flex items-center gap-2">
          <input
            type={showToken ? 'text' : 'password'}
            readOnly
            disabled
            value={PRODUCTIVE_API_TOKEN}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 disabled:opacity-100"
          />
          <button
            type="button"
            onClick={() => setShowToken(v => !v)}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
            aria-label={showToken ? 'Hide API Token' : 'Reveal API Token'}
          >
            {showToken ? 'Hide' : 'Reveal'}
          </button>
          <button
            type="button"
            onClick={() => copy(PRODUCTIVE_API_TOKEN, 'token')}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
          >
            {copied === 'token' ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="mt-2">
          <Badge color="amber">Read-only</Badge>
          <span className="ml-2 text-xs text-slate-400">
            Managed in <code className="rounded bg-slate-800 px-1 py-0.5">productiveConfig.ts</code>
          </span>
        </div>
      </div>

      {/* Disabled submit/footer */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-md bg-slate-800 px-4 py-2 text-sm text-slate-400 opacity-60"
          title="Settings are read-only and stored in code."
        >
          Save (disabled)
        </button>
      </div>

      <div className="text-xs text-slate-500">
        Note: Hard-coding secrets in client-rendered code exposes them to anyone with browser access.
        Consider a server-only config if you later share this tool beyond internal use.
      </div>
    </Card>
  )
}
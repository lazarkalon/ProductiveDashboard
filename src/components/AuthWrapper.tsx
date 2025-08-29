"use client"

import { SessionProvider } from "next-auth/react"
import RequireAuth from "./RequireAuth"

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <RequireAuth>
        {children}
      </RequireAuth>
    </SessionProvider>
  )
}

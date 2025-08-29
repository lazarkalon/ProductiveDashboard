"use client"

import { useSession, signIn } from "next-auth/react"
import { useEffect } from "react"
import { usePathname } from "next/navigation"

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname !== "/" && status === "unauthenticated") {
      signIn("google")
    }
  }, [status, pathname])

  if (status === "loading") {
    return <p>Checking login...</p>
  }

  if (pathname === "/" && status === "unauthenticated") {
    return <>{children}</>
  }

  if (status === "unauthenticated") {
    return <p>Redirecting to Google...</p>
  }

  return <>{children}</>
}

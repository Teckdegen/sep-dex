"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push("/trade")
      } else {
        router.push("/auth/login")
      }
    }
  }, [isAuthenticated, isLoading, router])

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-blue-500">Redirecting...</div>
    </div>
  )
}
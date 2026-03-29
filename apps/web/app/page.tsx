'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context'
import { Button } from '@/components/ui'

interface ApiResponse {
  message: string
  data?: {
    greeting: string
    framework: string
    typescript: boolean
  }
}

interface HealthResponse {
  status: string
  uptime: number
  timestamp: string
  database: {
    status: string
    error: string | null
  }
}

export default function Home() {
  const { user, logout } = useAuth()
  const [apiData, setApiData] = useState<ApiResponse | null>(null)
  const [healthData, setHealthData] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL

    const fetchApiData = fetch(`${baseUrl}/api/hello`)
      .then((res) => res.json())
      .then((data) => setApiData(data))

    const fetchHealthData = fetch(`${baseUrl}/health`)
      .then((res) => res.json())
      .then((data) => setHealthData(data))

    Promise.all([fetchApiData, fetchHealthData])
      .then(() => setLoading(false))
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col gap-8 py-16 px-16 bg-white dark:bg-black">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Woolf Project
          </h1>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {user.name}
              </span>
              <Button size="sm" variant="outline" onClick={logout}>
                Sign out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex h-7 items-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex h-7 items-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-medium text-black dark:text-zinc-50">
            API Connection Test
          </h2>

          {loading && (
            <p className="text-zinc-600 dark:text-zinc-400">Loading API data...</p>
          )}

          {error && (
            <p className="text-red-600 dark:text-red-400 font-medium">Error: {error}</p>
          )}

          {apiData && (
            <div className="flex flex-col gap-2">
              <p className="text-green-700 dark:text-green-400 font-medium">
                ✅ Connected to API
              </p>
              <pre className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 text-sm overflow-x-auto font-mono text-zinc-800 dark:text-zinc-200">
                {JSON.stringify(apiData, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-medium text-black dark:text-zinc-50">
            Database Status
          </h2>

          {healthData && (
            <div className="flex flex-col gap-2">
              <p className={healthData.database.status === 'connected'
                ? 'text-green-700 dark:text-green-400 font-medium'
                : 'text-red-600 dark:text-red-400 font-medium'
              }>
                {healthData.database.status === 'connected'
                  ? '✅ Database Connected'
                  : '❌ Database Disconnected'}
              </p>
              {healthData.database.error && (
                <p className="text-red-600 dark:text-red-400 text-sm">
                  Error: {healthData.database.error}
                </p>
              )}
              <pre className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 text-sm overflow-x-auto font-mono text-zinc-800 dark:text-zinc-200">
                {JSON.stringify(healthData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

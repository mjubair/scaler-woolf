'use client'

import { useEffect, useState } from 'react'

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
  const [apiData, setApiData] = useState<ApiResponse | null>(null)
  const [healthData, setHealthData] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchApiData = fetch('http://localhost:3001/api/hello')
      .then((res) => res.json())
      .then((data) => setApiData(data))

    const fetchHealthData = fetch('http://localhost:3001/health')
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
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Woolf Project
        </h1>

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

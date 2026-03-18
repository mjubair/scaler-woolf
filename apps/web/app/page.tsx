'use client'

import { useEffect, useState } from 'react'
import styles from './page.module.css'

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
    // Fetch API hello endpoint
    const fetchApiData = fetch('http://localhost:3001/api/hello')
      .then((res) => res.json())
      .then((data) => setApiData(data))

    // Fetch health/database status
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
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>Welcome to Woolf Monorepo</h1>
        
        <div className={styles.hero}>
          <p className={styles.subtitle}>
            A modern Turborepo monorepo with Next.js and Express API
          </p>
        </div>

        <div className={styles.grid}>
          <div className={styles.card}>
            <h2>⚡️ Turborepo</h2>
            <p>High-performance build system for JavaScript and TypeScript monorepos</p>
          </div>

          <div className={styles.card}>
            <h2>⚛️ Next.js 15</h2>
            <p>React framework with App Router and server components</p>
          </div>

          <div className={styles.card}>
            <h2>🚀 Express API</h2>
            <p>Node.js backend with TypeScript support</p>
          </div>

          <div className={styles.card}>
            <h2>🔧 Biome</h2>
            <p>Fast linter and formatter for consistent code quality</p>
          </div>
        </div>

        <div className={styles.apiSection}>
          <h2>API Connection Test</h2>
          {loading && <p>Loading API data...</p>}
          {error && <p className={styles.error}>Error: {error}</p>}
          {apiData && (
            <div className={styles.apiData}>
              <p>✅ Successfully connected to API!</p>
              <pre>{JSON.stringify(apiData, null, 2)}</pre>
            </div>
          )}
          {healthData && (
            <div className={styles.apiData}>
              <h3>Database Status</h3>
              <p>
                {healthData.database.status === 'connected' ? (
                  <span>✅ Database Connected</span>
                ) : (
                  <span className={styles.error}>❌ Database Disconnected</span>
                )}
              </p>
              {healthData.database.error && (
                <p className={styles.error}>Error: {healthData.database.error}</p>
              )}
              <pre>{JSON.stringify(healthData, null, 2)}</pre>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

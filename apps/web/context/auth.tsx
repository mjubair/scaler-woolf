'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/axios'

interface User {
  id: number
  name: string
  email: string
  createdAt: string
}

interface AuthContextValue {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('token')
    if (stored) {
      setToken(stored)
      api
        .get('/api/auth/me')
        .then((res) => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem('token')
          setToken(null)
        })
    }
  }, [])

  function persist(token: string, user: User) {
    localStorage.setItem('token', token)
    setToken(token)
    setUser(user)
  }

  async function register(name: string, email: string, password: string) {
    const { data } = await api.post('/api/auth/register', { name, email, password })
    persist(data.token, data.user)
  }

  async function login(email: string, password: string) {
    const { data } = await api.post('/api/auth/login', { email, password })
    persist(data.token, data.user)
  }

  function logout() {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

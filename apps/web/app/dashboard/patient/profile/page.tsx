'use client'

import { useState } from 'react'
import { api } from '@/lib/axios'
import { useAuth } from '@/context'
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from '@/components/ui'

export default function PatientProfile() {
  const { user } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await api.put('/api/patients/profile', { name, phone })
      setMessage('Profile updated successfully')
    } catch {
      setMessage('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">Update your personal information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || ''} disabled className="h-9 bg-muted" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="h-9" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9" placeholder="+91 98765 43210" />
            </div>
            {message && (
              <p className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-destructive'}`}>
                {message}
              </p>
            )}
            <Button type="submit" disabled={saving} className="w-fit">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

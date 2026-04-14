'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from '@/components/ui'
import { Heart, Plus, Trash2, Edit2 } from 'lucide-react'

interface MedicalEntry {
  id: number
  condition: string
  description: string | null
  diagnosedDate: string | null
  isOngoing: boolean
  createdAt: string
}

export default function MedicalHistoryPage() {
  const [entries, setEntries] = useState<MedicalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [condition, setCondition] = useState('')
  const [description, setDescription] = useState('')
  const [diagnosedDate, setDiagnosedDate] = useState('')
  const [isOngoing, setIsOngoing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchHistory()
  }, [])

  async function fetchHistory() {
    setLoading(true)
    try {
      const { data } = await api.get('/api/patients/medical-history')
      setEntries(data.medicalHistory)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setCondition('')
    setDescription('')
    setDiagnosedDate('')
    setIsOngoing(false)
    setEditingId(null)
    setShowForm(false)
  }

  function startEdit(entry: MedicalEntry) {
    setCondition(entry.condition)
    setDescription(entry.description || '')
    setDiagnosedDate(entry.diagnosedDate || '')
    setIsOngoing(entry.isOngoing)
    setEditingId(entry.id)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingId) {
        await api.put(`/api/patients/medical-history/${editingId}`, {
          condition,
          description: description || undefined,
          diagnosedDate: diagnosedDate || undefined,
          isOngoing,
        })
      } else {
        await api.post('/api/patients/medical-history', {
          condition,
          description: description || undefined,
          diagnosedDate: diagnosedDate || undefined,
          isOngoing,
        })
      }
      resetForm()
      fetchHistory()
    } catch {
    } finally {
      setSaving(false)
    }
  }

  async function deleteEntry(id: number) {
    if (!confirm('Delete this medical history entry?')) return
    try {
      await api.delete(`/api/patients/medical-history/${id}`)
      fetchHistory()
    } catch {
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Medical History</h1>
          <p className="text-muted-foreground">Manage your health conditions and medical records</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm) }}>
          <Plus className="size-4 mr-2" />
          Add Entry
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Entry' : 'Add Medical History'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="condition">Condition *</Label>
                <Input id="condition" value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="e.g., Diabetes Type 2" required className="h-9" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="description">Description</Label>
                <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-ring" id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Additional details..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="diagnosedDate">Diagnosed Date</Label>
                  <Input id="diagnosedDate" type="date" value={diagnosedDate} onChange={(e) => setDiagnosedDate(e.target.value)} className="h-9" />
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isOngoing} onChange={(e) => setIsOngoing(e.target.checked)} className="size-4 rounded border-border" />
                    <span className="text-sm">Ongoing condition</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Add Entry'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Heart className="size-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No medical history entries yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{entry.condition}</p>
                      {entry.isOngoing && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Ongoing</span>
                      )}
                    </div>
                    {entry.description && <p className="text-sm text-muted-foreground mt-1">{entry.description}</p>}
                    {entry.diagnosedDate && (
                      <p className="text-xs text-muted-foreground mt-1">Diagnosed: {entry.diagnosedDate}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon-sm" variant="ghost" onClick={() => startEdit(entry)}>
                      <Edit2 className="size-3" />
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => deleteEntry(entry.id)}>
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

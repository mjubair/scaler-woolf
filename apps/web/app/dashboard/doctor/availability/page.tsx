'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from '@/components/ui'
import { Clock, Plus, Trash2 } from 'lucide-react'

interface Slot {
  id: number
  dayOfWeek: number
  startTime: string
  endTime: string
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('09:30')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSlots()
  }, [])

  async function fetchSlots() {
    setLoading(true)
    try {
      const { data } = await api.get('/api/doctors/me/slots')
      setSlots(data.slots)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  async function addSlot(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/api/doctors/me/slots', {
        slots: [{ dayOfWeek, startTime, endTime }],
      })
      setShowForm(false)
      fetchSlots()
    } catch {
    } finally {
      setSaving(false)
    }
  }

  async function deleteSlot(id: number) {
    if (!confirm('Remove this time slot?')) return
    try {
      await api.delete(`/api/doctors/me/slots/${id}`)
      fetchSlots()
    } catch {
    }
  }

  // Group slots by day
  const slotsByDay = DAYS.map((day, index) => ({
    day,
    index,
    slots: slots.filter((s) => s.dayOfWeek === index),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Availability</h1>
          <p className="text-muted-foreground">Set your weekly consultation slots</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="size-4 mr-2" />
          Add Slot
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Time Slot</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addSlot} className="flex flex-wrap gap-4 items-end">
              <div className="grid gap-1.5">
                <Label>Day</Label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
                >
                  {DAYS.map((day, i) => (
                    <option key={i} value={i}>{day}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Start Time</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-9" required />
              </div>
              <div className="grid gap-1.5">
                <Label>End Time</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-9" required />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? 'Adding...' : 'Add'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4">
          {slotsByDay.map(({ day, slots: daySlots }) => (
            <Card key={day}>
              <CardHeader>
                <CardTitle className="text-base">{day}</CardTitle>
              </CardHeader>
              <CardContent>
                {daySlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No slots set</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {daySlots.map((slot) => (
                      <div key={slot.id} className="flex items-center gap-1 bg-muted rounded-lg px-3 py-1.5">
                        <Clock className="size-3 text-muted-foreground" />
                        <span className="text-sm">
                          {slot.startTime.slice(0, 5)} - {slot.endTime.slice(0, 5)}
                        </span>
                        <button onClick={() => deleteSlot(slot.id)} className="ml-1 text-muted-foreground hover:text-destructive">
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

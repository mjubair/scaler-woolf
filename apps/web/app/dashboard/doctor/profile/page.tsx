'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from '@/components/ui'

export default function DoctorProfile() {
  const [specialization, setSpecialization] = useState('')
  const [qualification, setQualification] = useState('')
  const [experience, setExperience] = useState('')
  const [consultationFee, setConsultationFee] = useState('')
  const [bio, setBio] = useState('')
  const [hospitalName, setHospitalName] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    api
      .get('/api/doctors/me/profile')
      .then((res) => {
        const d = res.data.doctor
        setSpecialization(d.specialization || '')
        setQualification(d.qualification || '')
        setExperience(String(d.experience || ''))
        setConsultationFee(d.consultationFee || '')
        setBio(d.bio || '')
        setHospitalName(d.hospitalName || '')
        setAddress(d.address || '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await api.put('/api/doctors/me/profile', {
        specialization,
        qualification,
        experience: Number(experience),
        consultationFee,
        bio,
        hospitalName,
        address,
      })
      setMessage('Profile updated successfully')
    } catch {
      setMessage('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Doctor Profile</h1>
        <p className="text-muted-foreground">Update your professional information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Professional Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="specialization">Specialization *</Label>
                <Input id="specialization" value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="e.g., Cardiologist" className="h-9" required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="qualification">Qualification *</Label>
                <Input id="qualification" value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="e.g., MBBS, MD" className="h-9" required />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="experience">Experience (years)</Label>
                <Input id="experience" type="number" min="0" value={experience} onChange={(e) => setExperience(e.target.value)} className="h-9" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fee">Consultation Fee (Rs.) *</Label>
                <Input id="fee" type="number" min="0" step="0.01" value={consultationFee} onChange={(e) => setConsultationFee(e.target.value)} className="h-9" required />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hospitalName">Hospital / Clinic</Label>
              <Input id="hospitalName" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} placeholder="Hospital or clinic name" className="h-9" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Clinic address" className="h-9" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bio">Bio</Label>
              <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-ring" id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell patients about yourself and your practice..." />
            </div>
            {message && (
              <p className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-destructive'}`}>
                {message}
              </p>
            )}
            <Button type="submit" disabled={saving} className="w-fit">
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

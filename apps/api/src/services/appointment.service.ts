import { eq, and, sql, desc } from 'drizzle-orm'
import { db } from '../db'
import { appointments, doctors, users, availabilitySlots } from '../db/schema'

export async function createAppointment(data: {
  patientId: number
  doctorId: number
  slotId: number
  appointmentDate: string
  startTime: string
  endTime: string
  reason?: string
}) {
  // Check for double booking
  const existing = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, data.doctorId),
        eq(appointments.appointmentDate, data.appointmentDate),
        eq(appointments.startTime, data.startTime),
        sql`${appointments.status} NOT IN ('cancelled')`,
      ),
    )

  if (existing.length > 0) {
    return { error: 'This time slot is already booked' }
  }

  // Verify the doctor exists and is approved
  const [doctor] = await db
    .select({ id: doctors.id, isApproved: doctors.isApproved })
    .from(doctors)
    .where(eq(doctors.id, data.doctorId))

  if (!doctor || !doctor.isApproved) {
    return { error: 'Doctor not found or not available' }
  }

  const [appointment] = await db
    .insert(appointments)
    .values({
      patientId: data.patientId,
      doctorId: data.doctorId,
      slotId: data.slotId,
      appointmentDate: data.appointmentDate,
      startTime: data.startTime,
      endTime: data.endTime,
      reason: data.reason,
      status: 'pending',
    })
    .returning()

  return { appointment }
}

export async function getAppointmentById(appointmentId: number) {
  const [appointment] = await db
    .select({
      id: appointments.id,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      slotId: appointments.slotId,
      appointmentDate: appointments.appointmentDate,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      reason: appointments.reason,
      googleMeetLink: appointments.googleMeetLink,
      googleEventId: appointments.googleEventId,
      cancelledBy: appointments.cancelledBy,
      cancellationReason: appointments.cancellationReason,
      createdAt: appointments.createdAt,
      patientName: users.name,
      patientEmail: users.email,
      doctorName: sql<string>`doctor_user.name`,
      doctorEmail: sql<string>`doctor_user.email`,
      doctorSpecialization: doctors.specialization,
    })
    .from(appointments)
    .innerJoin(users, eq(appointments.patientId, users.id))
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .innerJoin(sql`users as doctor_user`, sql`doctor_user.id = ${doctors.userId}`)
    .where(eq(appointments.id, appointmentId))

  return appointment || null
}

export async function getPatientAppointments(patientId: number, status?: string) {
  const conditions = [eq(appointments.patientId, patientId)]
  if (status) {
    conditions.push(sql`${appointments.status} = ${status}`)
  }

  return db
    .select({
      id: appointments.id,
      appointmentDate: appointments.appointmentDate,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      reason: appointments.reason,
      googleMeetLink: appointments.googleMeetLink,
      createdAt: appointments.createdAt,
      doctorId: appointments.doctorId,
      doctorName: users.name,
      doctorSpecialization: doctors.specialization,
      doctorAvatar: users.avatar,
    })
    .from(appointments)
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .innerJoin(users, eq(doctors.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(appointments.appointmentDate))
}

export async function getDoctorAppointments(doctorId: number, status?: string) {
  const conditions = [eq(appointments.doctorId, doctorId)]
  if (status) {
    conditions.push(sql`${appointments.status} = ${status}`)
  }

  return db
    .select({
      id: appointments.id,
      appointmentDate: appointments.appointmentDate,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      reason: appointments.reason,
      googleMeetLink: appointments.googleMeetLink,
      createdAt: appointments.createdAt,
      patientId: appointments.patientId,
      patientName: users.name,
      patientEmail: users.email,
      patientAvatar: users.avatar,
    })
    .from(appointments)
    .innerJoin(users, eq(appointments.patientId, users.id))
    .where(and(...conditions))
    .orderBy(desc(appointments.appointmentDate))
}

export async function updateAppointmentStatus(
  appointmentId: number,
  status: 'confirmed' | 'completed' | 'cancelled' | 'no_show',
  extras?: { cancelledBy?: 'patient' | 'doctor' | 'admin'; cancellationReason?: string },
) {
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  }

  if (status === 'cancelled' && extras) {
    updateData.cancelledBy = extras.cancelledBy
    updateData.cancellationReason = extras.cancellationReason
  }

  const [updated] = await db
    .update(appointments)
    .set(updateData)
    .where(eq(appointments.id, appointmentId))
    .returning()

  return updated || null
}

export async function setAppointmentMeetLink(
  appointmentId: number,
  meetLink: string,
  eventId: string,
) {
  const [updated] = await db
    .update(appointments)
    .set({
      googleMeetLink: meetLink,
      googleEventId: eventId,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, appointmentId))
    .returning()

  return updated || null
}

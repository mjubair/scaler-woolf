import { eq, and, or, ilike, sql, gte, lte, desc, asc } from 'drizzle-orm'
import { db } from '../db'
import { doctors, users, availabilitySlots, appointments } from '../db/schema'

interface DoctorFilters {
  specialization?: string
  search?: string
  gender?: string
  minRating?: number
  minFee?: number
  maxFee?: number
  isApproved?: boolean
  page?: number
  limit?: number
  sortBy?: 'rating' | 'experience' | 'fee'
  sortOrder?: 'asc' | 'desc'
}

export async function listDoctors(filters: DoctorFilters) {
  const page = filters.page || 1
  const limit = filters.limit || 10
  const offset = (page - 1) * limit

  const conditions = [eq(doctors.isApproved, filters.isApproved ?? true)]

  if (filters.specialization) {
    conditions.push(ilike(doctors.specialization, `%${filters.specialization}%`))
  }
  if (filters.minRating) {
    conditions.push(gte(doctors.avgRating, String(filters.minRating)))
  }
  if (filters.minFee) {
    conditions.push(gte(doctors.consultationFee, String(filters.minFee)))
  }
  if (filters.maxFee) {
    conditions.push(lte(doctors.consultationFee, String(filters.maxFee)))
  }
  if (filters.gender) {
    conditions.push(eq(users.gender, filters.gender))
  }

  let orderBy
  const direction = filters.sortOrder === 'asc' ? asc : desc
  switch (filters.sortBy) {
    case 'rating':
      orderBy = direction(doctors.avgRating)
      break
    case 'experience':
      orderBy = direction(doctors.experience)
      break
    case 'fee':
      orderBy = direction(doctors.consultationFee)
      break
    default:
      orderBy = desc(doctors.avgRating)
  }

  const baseQuery = db
    .select({
      id: doctors.id,
      userId: doctors.userId,
      specialization: doctors.specialization,
      qualification: doctors.qualification,
      experience: doctors.experience,
      consultationFee: doctors.consultationFee,
      bio: doctors.bio,
      hospitalName: doctors.hospitalName,
      address: doctors.address,
      avgRating: doctors.avgRating,
      totalReviews: doctors.totalReviews,
      userName: users.name,
      userEmail: users.email,
      userAvatar: users.avatar,
      userGender: users.gender,
    })
    .from(doctors)
    .innerJoin(users, eq(doctors.userId, users.id))
    .where(and(...conditions))

  // Apply name search filter on user
  if (filters.search) {
    const searchResults = await db
      .select({
        id: doctors.id,
        userId: doctors.userId,
        specialization: doctors.specialization,
        qualification: doctors.qualification,
        experience: doctors.experience,
        consultationFee: doctors.consultationFee,
        bio: doctors.bio,
        hospitalName: doctors.hospitalName,
        address: doctors.address,
        avgRating: doctors.avgRating,
        totalReviews: doctors.totalReviews,
        userName: users.name,
        userEmail: users.email,
        userAvatar: users.avatar,
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(and(
        ...conditions,
        or(
          ilike(users.name, `%${filters.search}%`),
          ilike(doctors.specialization, `%${filters.search}%`),
          ilike(doctors.bio, `%${filters.search}%`),
        ),
      ))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)

    const searchCondition = or(
      ilike(users.name, `%${filters.search}%`),
      ilike(doctors.specialization, `%${filters.search}%`),
      ilike(doctors.bio, `%${filters.search}%`),
    )

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(and(...conditions, searchCondition))

    return {
      doctors: searchResults,
      pagination: {
        page,
        limit,
        total: Number(countResult?.count || 0),
        totalPages: Math.ceil(Number(countResult?.count || 0) / limit),
      },
    }
  }

  const results = await baseQuery.orderBy(orderBy).limit(limit).offset(offset)

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(doctors)
    .innerJoin(users, eq(doctors.userId, users.id))
    .where(and(...conditions))

  return {
    doctors: results,
    pagination: {
      page,
      limit,
      total: Number(countResult?.count || 0),
      totalPages: Math.ceil(Number(countResult?.count || 0) / limit),
    },
  }
}

export async function getDoctorById(doctorId: number) {
  const [doctor] = await db
    .select({
      id: doctors.id,
      userId: doctors.userId,
      specialization: doctors.specialization,
      qualification: doctors.qualification,
      experience: doctors.experience,
      consultationFee: doctors.consultationFee,
      bio: doctors.bio,
      hospitalName: doctors.hospitalName,
      address: doctors.address,
      isApproved: doctors.isApproved,
      avgRating: doctors.avgRating,
      totalReviews: doctors.totalReviews,
      createdAt: doctors.createdAt,
      userName: users.name,
      userEmail: users.email,
      userAvatar: users.avatar,
      userPhone: users.phone,
    })
    .from(doctors)
    .innerJoin(users, eq(doctors.userId, users.id))
    .where(eq(doctors.id, doctorId))

  return doctor || null
}

export async function getDoctorByUserId(userId: number) {
  const [doctor] = await db.select().from(doctors).where(eq(doctors.userId, userId))
  return doctor || null
}

export async function updateDoctorProfile(
  userId: number,
  data: {
    specialization?: string
    qualification?: string
    experience?: number
    consultationFee?: string
    bio?: string
    hospitalName?: string
    address?: string
  },
) {
  const [updated] = await db
    .update(doctors)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(doctors.userId, userId))
    .returning()
  return updated
}

export async function getDoctorSlots(doctorId: number) {
  return db
    .select()
    .from(availabilitySlots)
    .where(and(eq(availabilitySlots.doctorId, doctorId), eq(availabilitySlots.isActive, true)))
    .orderBy(asc(availabilitySlots.dayOfWeek), asc(availabilitySlots.startTime))
}

export async function createSlots(
  doctorId: number,
  slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>,
) {
  const values = slots.map((slot) => ({
    doctorId,
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
  }))

  return db.insert(availabilitySlots).values(values).returning()
}

export async function deleteSlot(slotId: number, doctorId: number) {
  const [deleted] = await db
    .delete(availabilitySlots)
    .where(and(eq(availabilitySlots.id, slotId), eq(availabilitySlots.doctorId, doctorId)))
    .returning()
  return deleted || null
}

export async function getAvailableSlotsForDate(doctorId: number, dateStr: string) {
  const date = new Date(dateStr)
  const dayOfWeek = date.getDay()

  // Get all active slots for this day of week
  const slots = await db
    .select()
    .from(availabilitySlots)
    .where(
      and(
        eq(availabilitySlots.doctorId, doctorId),
        eq(availabilitySlots.dayOfWeek, dayOfWeek),
        eq(availabilitySlots.isActive, true),
      ),
    )
    .orderBy(asc(availabilitySlots.startTime))

  // Get booked appointments for this date
  const bookedAppointments = await db
    .select({ startTime: appointments.startTime, endTime: appointments.endTime })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        eq(appointments.appointmentDate, dateStr),
        sql`${appointments.status} NOT IN ('cancelled')`,
      ),
    )

  // Filter out booked slots
  const bookedTimes = new Set(bookedAppointments.map((a) => a.startTime))

  return slots.filter((slot) => !bookedTimes.has(slot.startTime))
}

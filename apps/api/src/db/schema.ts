import {
  pgTable,
  pgEnum,
  serial,
  text,
  timestamp,
  varchar,
  integer,
  decimal,
  boolean,
  date,
  time,
  jsonb,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ── Enums ──────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['patient', 'doctor', 'admin'])

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
])

export const cancelledByEnum = pgEnum('cancelled_by', ['patient', 'doctor', 'admin'])

export const paymentStatusEnum = pgEnum('payment_status', ['created', 'paid', 'failed', 'refunded'])

// ── Users ──────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('patient'),
  phone: varchar('phone', { length: 20 }),
  avatar: varchar('avatar', { length: 500 }),
  gender: varchar('gender', { length: 10 }),
  isActive: boolean('is_active').notNull().default(true),
  isVerified: boolean('is_verified').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const usersRelations = relations(users, ({ one, many }) => ({
  doctor: one(doctors, { fields: [users.id], references: [doctors.userId] }),
  patientAppointments: many(appointments, { relationName: 'patientAppointments' }),
  reviews: many(reviews),
  prescriptionsAsPatient: many(prescriptions, { relationName: 'patientPrescriptions' }),
  medicalHistory: many(medicalHistory),
  notifications: many(notifications),
}))

// ── Doctors ────────────────────────────────────────────────────────────────

export const doctors = pgTable('doctors', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  specialization: varchar('specialization', { length: 255 }).notNull(),
  qualification: varchar('qualification', { length: 500 }).notNull(),
  experience: integer('experience').notNull().default(0),
  consultationFee: decimal('consultation_fee', { precision: 10, scale: 2 }).notNull(),
  bio: text('bio'),
  hospitalName: varchar('hospital_name', { length: 255 }),
  address: text('address'),
  isApproved: boolean('is_approved').notNull().default(false),
  avgRating: decimal('avg_rating', { precision: 3, scale: 2 }).default('0'),
  totalReviews: integer('total_reviews').notNull().default(0),
  googleRefreshToken: text('google_refresh_token'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user: one(users, { fields: [doctors.userId], references: [users.id] }),
  availabilitySlots: many(availabilitySlots),
  appointments: many(appointments),
  reviews: many(reviews),
  prescriptions: many(prescriptions, { relationName: 'doctorPrescriptions' }),
}))

// ── Availability Slots ─────────────────────────────────────────────────────

export const availabilitySlots = pgTable('availability_slots', {
  id: serial('id').primaryKey(),
  doctorId: integer('doctor_id')
    .notNull()
    .references(() => doctors.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(), // 0=Sunday … 6=Saturday
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  isActive: boolean('is_active').notNull().default(true),
})

export const availabilitySlotsRelations = relations(availabilitySlots, ({ one }) => ({
  doctor: one(doctors, { fields: [availabilitySlots.doctorId], references: [doctors.id] }),
}))

// ── Appointments ───────────────────────────────────────────────────────────

export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  doctorId: integer('doctor_id')
    .notNull()
    .references(() => doctors.id, { onDelete: 'cascade' }),
  slotId: integer('slot_id').references(() => availabilitySlots.id),
  appointmentDate: date('appointment_date').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  status: appointmentStatusEnum('status').notNull().default('pending'),
  reason: text('reason'),
  doctorNotes: text('doctor_notes'),
  googleMeetLink: varchar('google_meet_link', { length: 500 }),
  googleEventId: varchar('google_event_id', { length: 255 }),
  cancelledBy: cancelledByEnum('cancelled_by'),
  cancellationReason: text('cancellation_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  patient: one(users, {
    fields: [appointments.patientId],
    references: [users.id],
    relationName: 'patientAppointments',
  }),
  doctor: one(doctors, { fields: [appointments.doctorId], references: [doctors.id] }),
  slot: one(availabilitySlots, {
    fields: [appointments.slotId],
    references: [availabilitySlots.id],
  }),
  payment: one(payments),
  review: one(reviews),
  prescription: one(prescriptions),
}))

// ── Payments ───────────────────────────────────────────────────────────────

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  appointmentId: integer('appointment_id')
    .notNull()
    .references(() => appointments.id, { onDelete: 'cascade' }),
  patientId: integer('patient_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('INR'),
  razorpayOrderId: varchar('razorpay_order_id', { length: 255 }),
  razorpayPaymentId: varchar('razorpay_payment_id', { length: 255 }),
  razorpaySignature: varchar('razorpay_signature', { length: 255 }),
  status: paymentStatusEnum('status').notNull().default('created'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const paymentsRelations = relations(payments, ({ one }) => ({
  appointment: one(appointments, {
    fields: [payments.appointmentId],
    references: [appointments.id],
  }),
  patient: one(users, { fields: [payments.patientId], references: [users.id] }),
}))

// ── Reviews ────────────────────────────────────────────────────────────────

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  appointmentId: integer('appointment_id')
    .notNull()
    .unique()
    .references(() => appointments.id, { onDelete: 'cascade' }),
  patientId: integer('patient_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  doctorId: integer('doctor_id')
    .notNull()
    .references(() => doctors.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const reviewsRelations = relations(reviews, ({ one }) => ({
  appointment: one(appointments, {
    fields: [reviews.appointmentId],
    references: [appointments.id],
  }),
  patient: one(users, { fields: [reviews.patientId], references: [users.id] }),
  doctor: one(doctors, { fields: [reviews.doctorId], references: [doctors.id] }),
}))

// ── Prescriptions ──────────────────────────────────────────────────────────

export const prescriptions = pgTable('prescriptions', {
  id: serial('id').primaryKey(),
  appointmentId: integer('appointment_id')
    .notNull()
    .references(() => appointments.id, { onDelete: 'cascade' }),
  doctorId: integer('doctor_id')
    .notNull()
    .references(() => doctors.id, { onDelete: 'cascade' }),
  patientId: integer('patient_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  diagnosis: text('diagnosis').notNull(),
  medications: jsonb('medications').notNull(), // [{name, dosage, frequency, duration}]
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const prescriptionsRelations = relations(prescriptions, ({ one }) => ({
  appointment: one(appointments, {
    fields: [prescriptions.appointmentId],
    references: [appointments.id],
  }),
  doctor: one(doctors, {
    fields: [prescriptions.doctorId],
    references: [doctors.id],
    relationName: 'doctorPrescriptions',
  }),
  patient: one(users, {
    fields: [prescriptions.patientId],
    references: [users.id],
    relationName: 'patientPrescriptions',
  }),
}))

// ── Medical History ────────────────────────────────────────────────────────

export const medicalHistory = pgTable('medical_history', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  condition: varchar('condition', { length: 255 }).notNull(),
  description: text('description'),
  diagnosedDate: date('diagnosed_date'),
  isOngoing: boolean('is_ongoing').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const medicalHistoryRelations = relations(medicalHistory, ({ one }) => ({
  patient: one(users, { fields: [medicalHistory.patientId], references: [users.id] }),
}))

// ── Notifications ──────────────────────────────────────────────────────────

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}))

// ── Appointment Attachments ────────────────────────────────────────────────

export const appointmentAttachments = pgTable('appointment_attachments', {
  id: serial('id').primaryKey(),
  appointmentId: integer('appointment_id')
    .notNull()
    .references(() => appointments.id, { onDelete: 'cascade' }),
  patientId: integer('patient_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileType: varchar('file_type', { length: 50 }).notNull(),
  fileSize: integer('file_size').notNull(),
  cloudinaryUrl: varchar('cloudinary_url', { length: 500 }).notNull(),
  cloudinaryId: varchar('cloudinary_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const appointmentAttachmentsRelations = relations(appointmentAttachments, ({ one }) => ({
  appointment: one(appointments, {
    fields: [appointmentAttachments.appointmentId],
    references: [appointments.id],
  }),
  patient: one(users, { fields: [appointmentAttachments.patientId], references: [users.id] }),
}))

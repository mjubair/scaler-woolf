import crypto from 'crypto'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { payments } from '../db/schema'

// Razorpay SDK instance (lazy-loaded)
let razorpayInstance: any = null

function getRazorpay() {
  if (!razorpayInstance) {
    const Razorpay = require('razorpay')
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })
  }
  return razorpayInstance
}

export async function createRazorpayOrder(appointmentId: number, patientId: number, amount: number) {
  const razorpay = getRazorpay()

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100), // Razorpay expects amount in paise
    currency: 'INR',
    receipt: `appointment_${appointmentId}`,
    notes: {
      appointmentId: String(appointmentId),
      patientId: String(patientId),
    },
  })

  // Create payment record in DB
  const [payment] = await db
    .insert(payments)
    .values({
      appointmentId,
      patientId,
      amount: String(amount),
      currency: 'INR',
      razorpayOrderId: order.id,
      status: 'created',
    })
    .returning()

  if (!payment) {
    throw new Error('Failed to persist payment record')
  }

  return { payment, order }
}

export async function verifyPayment(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
) {
  const secret = process.env.RAZORPAY_KEY_SECRET!
  const body = `${razorpayOrderId}|${razorpayPaymentId}`
  const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex')

  if (expectedSignature !== razorpaySignature) {
    return { valid: false }
  }

  // Update payment record
  const [payment] = await db
    .update(payments)
    .set({
      razorpayPaymentId,
      razorpaySignature,
      status: 'paid',
    })
    .where(eq(payments.razorpayOrderId, razorpayOrderId))
    .returning()

  return { valid: true, payment }
}

export async function getPaymentByAppointmentId(appointmentId: number) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.appointmentId, appointmentId))

  return payment || null
}

export async function updatePaymentStatus(
  paymentId: number,
  status: 'paid' | 'failed' | 'refunded',
) {
  const [updated] = await db
    .update(payments)
    .set({ status })
    .where(eq(payments.id, paymentId))
    .returning()

  return updated || null
}

import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }
  return transporter
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@docbook.com'

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_USER) {
    console.log(`[Email skipped] No SMTP configured. To: ${to} | Subject: ${subject}`)
    return
  }
  try {
    const transport = getTransporter()
    await transport.sendMail({
      from: `"DocBook" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    })
    console.log(`[Email sent] To: ${to} | Subject: ${subject}`)
  } catch (error) {
    console.error('Failed to send email:', error)
  }
}

export async function sendBookingConfirmation(params: {
  patientEmail: string
  patientName: string
  doctorName: string
  date: string
  time: string
  meetLink?: string
}) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Appointment Confirmed</h2>
      <p>Hi ${params.patientName},</p>
      <p>Your appointment has been confirmed. Here are the details:</p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Doctor:</strong> ${params.doctorName}</p>
        <p><strong>Date:</strong> ${params.date}</p>
        <p><strong>Time:</strong> ${params.time}</p>
        ${params.meetLink ? `<p><strong>Google Meet Link:</strong> <a href="${params.meetLink}">${params.meetLink}</a></p>` : ''}
      </div>
      <p>Please be on time for your consultation.</p>
      <p>Best regards,<br/>DocBook Team</p>
    </div>
  `
  await sendEmail(params.patientEmail, 'Appointment Confirmed - DocBook', html)
}

export async function sendBookingNotificationToDoctor(params: {
  doctorEmail: string
  doctorName: string
  patientName: string
  date: string
  time: string
  reason?: string
}) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">New Appointment Booked</h2>
      <p>Hi Dr. ${params.doctorName},</p>
      <p>A new appointment has been booked. Here are the details:</p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Patient:</strong> ${params.patientName}</p>
        <p><strong>Date:</strong> ${params.date}</p>
        <p><strong>Time:</strong> ${params.time}</p>
        ${params.reason ? `<p><strong>Reason:</strong> ${params.reason}</p>` : ''}
      </div>
      <p>Please check your dashboard for more details.</p>
      <p>Best regards,<br/>DocBook Team</p>
    </div>
  `
  await sendEmail(params.doctorEmail, 'New Appointment Booked - DocBook', html)
}

export async function sendCancellationEmail(params: {
  email: string
  name: string
  doctorName: string
  date: string
  time: string
  reason?: string
  cancelledBy: string
}) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Appointment Cancelled</h2>
      <p>Hi ${params.name},</p>
      <p>An appointment has been cancelled by the ${params.cancelledBy}.</p>
      <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Doctor:</strong> ${params.doctorName}</p>
        <p><strong>Date:</strong> ${params.date}</p>
        <p><strong>Time:</strong> ${params.time}</p>
        ${params.reason ? `<p><strong>Reason:</strong> ${params.reason}</p>` : ''}
      </div>
      <p>If you need to rebook, please visit our platform.</p>
      <p>Best regards,<br/>DocBook Team</p>
    </div>
  `
  await sendEmail(params.email, 'Appointment Cancelled - DocBook', html)
}

export async function sendDoctorApprovalEmail(params: {
  doctorEmail: string
  doctorName: string
}) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">Welcome to DocBook!</h2>
      <p>Hi Dr. ${params.doctorName},</p>
      <p>Your profile has been approved! You can now:</p>
      <ul>
        <li>Complete your profile with specialization details</li>
        <li>Set your availability slots</li>
        <li>Connect your Google Calendar for automatic Meet link generation</li>
        <li>Start receiving appointment bookings</li>
      </ul>
      <p>Login to your dashboard to get started.</p>
      <p>Best regards,<br/>DocBook Team</p>
    </div>
  `
  await sendEmail(params.doctorEmail, 'Profile Approved - DocBook', html)
}

export async function sendPaymentReceipt(params: {
  patientEmail: string
  patientName: string
  doctorName: string
  amount: string
  date: string
  paymentId: string
}) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Payment Receipt</h2>
      <p>Hi ${params.patientName},</p>
      <p>Your payment has been received successfully.</p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Doctor:</strong> ${params.doctorName}</p>
        <p><strong>Amount:</strong> ₹${params.amount}</p>
        <p><strong>Date:</strong> ${params.date}</p>
        <p><strong>Payment ID:</strong> ${params.paymentId}</p>
      </div>
      <p>Best regards,<br/>DocBook Team</p>
    </div>
  `
  await sendEmail(params.patientEmail, 'Payment Receipt - DocBook', html)
}

export async function sendConsultationCompletedEmail(params: {
  patientEmail: string
  patientName: string
  doctorName: string
  date: string
  time: string
}) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Consultation Completed</h2>
      <p>Hi ${params.patientName},</p>
      <p>Your consultation with Dr. ${params.doctorName} has been completed.</p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Doctor:</strong> Dr. ${params.doctorName}</p>
        <p><strong>Date:</strong> ${params.date}</p>
        <p><strong>Time:</strong> ${params.time}</p>
      </div>
      <p>You can now:</p>
      <ul>
        <li>View your prescription once the doctor uploads it</li>
        <li>Leave a review to help other patients</li>
      </ul>
      <p>Visit your dashboard to view details.</p>
      <p>Best regards,<br/>DocBook Team</p>
    </div>
  `
  await sendEmail(params.patientEmail, 'Consultation Completed - DocBook', html)
}

export async function sendPrescriptionEmail(params: {
  patientEmail: string
  patientName: string
  doctorName: string
  diagnosis: string
  medications: Array<{ name: string; dosage: string; frequency: string; duration: string }>
}) {
  const medsList = params.medications
    .map((m) => `<li><strong>${m.name}</strong> — ${m.dosage}, ${m.frequency}, ${m.duration}</li>`)
    .join('')

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Prescription Available</h2>
      <p>Hi ${params.patientName},</p>
      <p>Dr. ${params.doctorName} has uploaded a prescription for you.</p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>Diagnosis:</strong> ${params.diagnosis}</p>
        <p><strong>Medications:</strong></p>
        <ul>${medsList}</ul>
      </div>
      <p>Login to your dashboard to view the full prescription details.</p>
      <p>Best regards,<br/>DocBook Team</p>
    </div>
  `
  await sendEmail(params.patientEmail, 'New Prescription - DocBook', html)
}

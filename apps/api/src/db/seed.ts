import 'dotenv/config'
import bcrypt from 'bcrypt'
import { eq, sql } from 'drizzle-orm'
import { db, client } from './index'
import {
  users,
  doctors,
  availabilitySlots,
  appointments,
  payments,
  reviews,
  prescriptions,
  medicalHistory,
  notifications,
} from './schema'

const PASSWORD = 'password123'

async function seed() {
  console.log('Seeding database...\n')

  const passwordHash = await bcrypt.hash(PASSWORD, 12)

  // ── 1. Users ──────────────────────────────────────────────────────
  console.log('Creating users...')

  const [admin] = await db
    .insert(users)
    .values({
      name: 'Admin User',
      email: 'admin@docbook.com',
      passwordHash,
      role: 'admin',
      isActive: true,
      isVerified: true,
    })
    .onConflictDoNothing({ target: users.email })
    .returning()

  const patientData = [
    { name: 'Rahul Sharma', email: 'rahul@example.com', phone: '+91-9876543210' },
    { name: 'Priya Patel', email: 'priya@example.com', phone: '+91-9876543211' },
    { name: 'Amit Kumar', email: 'amit@example.com', phone: '+91-9876543212' },
    { name: 'Sneha Reddy', email: 'sneha@example.com', phone: '+91-9876543213' },
    { name: 'Vikram Singh', email: 'vikram@example.com', phone: '+91-9876543214' },
  ]

  const createdPatients = await db
    .insert(users)
    .values(
      patientData.map((p) => ({
        ...p,
        passwordHash,
        role: 'patient' as const,
        isActive: true,
        isVerified: true,
      })),
    )
    .onConflictDoNothing({ target: users.email })
    .returning()

  const doctorUserData = [
    { name: 'Dr. Ananya Iyer', email: 'ananya@docbook.com', phone: '+91-9800000001' },
    { name: 'Dr. Rajesh Menon', email: 'rajesh@docbook.com', phone: '+91-9800000002' },
    { name: 'Dr. Fatima Khan', email: 'fatima@docbook.com', phone: '+91-9800000003' },
    { name: 'Dr. Suresh Nair', email: 'suresh@docbook.com', phone: '+91-9800000004' },
    { name: 'Dr. Meera Joshi', email: 'meera@docbook.com', phone: '+91-9800000005' },
    { name: 'Dr. Arjun Rao', email: 'arjun@docbook.com', phone: '+91-9800000006' },
    { name: 'Dr. Kavitha Pillai', email: 'kavitha@docbook.com', phone: '+91-9800000007' },
    { name: 'Dr. Mohammed Ali', email: 'mohammed@docbook.com', phone: '+91-9800000008' },
  ]

  const createdDoctorUsers = await db
    .insert(users)
    .values(
      doctorUserData.map((d) => ({
        ...d,
        passwordHash,
        role: 'doctor' as const,
        isActive: true,
        isVerified: true,
      })),
    )
    .onConflictDoNothing({ target: users.email })
    .returning()

  if (createdDoctorUsers.length === 0 || createdPatients.length === 0) {
    console.log('Users already exist — skipping rest of seed to avoid duplicates.')
    console.log('To re-seed, run: psql $DATABASE_URL -c "TRUNCATE users CASCADE"')
    await client.end()
    process.exit(0)
  }

  console.log(`  ${createdPatients.length} patients, ${createdDoctorUsers.length} doctors, 1 admin`)

  // ── 2. Doctor profiles ────────────────────────────────────────────
  console.log('Creating doctor profiles...')

  const doctorProfiles = [
    {
      userId: createdDoctorUsers[0]!.id,
      specialization: 'Cardiology',
      qualification: 'MD, DM Cardiology (AIIMS Delhi)',
      experience: 15,
      consultationFee: '1500.00',
      bio: 'Senior cardiologist with 15 years of experience in interventional cardiology. Specializes in heart failure management and preventive cardiac care.',
      hospitalName: 'Apollo Hospital',
      address: 'Jubilee Hills, Hyderabad',
      isApproved: true,
      avgRating: '4.80',
      totalReviews: 3,
    },
    {
      userId: createdDoctorUsers[1]!.id,
      specialization: 'Dermatology',
      qualification: 'MD Dermatology (CMC Vellore)',
      experience: 10,
      consultationFee: '800.00',
      bio: 'Expert in cosmetic dermatology, acne treatment, and skin allergies. Uses latest laser and light-based therapies.',
      hospitalName: 'Fortis Hospital',
      address: 'Bannerghatta Road, Bangalore',
      isApproved: true,
      avgRating: '4.50',
      totalReviews: 2,
    },
    {
      userId: createdDoctorUsers[2]!.id,
      specialization: 'Pediatrics',
      qualification: 'MD Pediatrics (KEM Hospital, Mumbai)',
      experience: 12,
      consultationFee: '1000.00',
      bio: 'Compassionate pediatrician specializing in newborn care, childhood vaccinations, and developmental disorders.',
      hospitalName: 'Rainbow Children Hospital',
      address: 'Banjara Hills, Hyderabad',
      isApproved: true,
      avgRating: '4.90',
      totalReviews: 2,
    },
    {
      userId: createdDoctorUsers[3]!.id,
      specialization: 'Orthopedics',
      qualification: 'MS Orthopedics, Fellowship in Joint Replacement (UK)',
      experience: 20,
      consultationFee: '1200.00',
      bio: 'Leading orthopedic surgeon with expertise in knee and hip replacements. Pioneer of minimally invasive joint surgery in South India.',
      hospitalName: 'KIMS Hospital',
      address: 'Secunderabad, Hyderabad',
      isApproved: true,
      avgRating: '4.60',
      totalReviews: 2,
    },
    {
      userId: createdDoctorUsers[4]!.id,
      specialization: 'General Medicine',
      qualification: 'MD General Medicine (JIPMER)',
      experience: 8,
      consultationFee: '600.00',
      bio: 'Experienced general physician specializing in diabetes management, hypertension, and preventive healthcare.',
      hospitalName: 'Yashoda Hospital',
      address: 'Somajiguda, Hyderabad',
      isApproved: true,
      avgRating: '4.30',
      totalReviews: 1,
    },
    {
      userId: createdDoctorUsers[5]!.id,
      specialization: 'Neurology',
      qualification: 'DM Neurology (NIMHANS)',
      experience: 14,
      consultationFee: '1800.00',
      bio: 'Neurologist specializing in epilepsy, stroke management, and headache disorders. Active researcher in neurodegenerative diseases.',
      hospitalName: 'Continental Hospital',
      address: 'Gachibowli, Hyderabad',
      isApproved: true,
      avgRating: '4.70',
      totalReviews: 1,
    },
    {
      userId: createdDoctorUsers[6]!.id,
      specialization: 'Gynecology',
      qualification: 'MD Obstetrics & Gynecology (Manipal)',
      experience: 11,
      consultationFee: '1000.00',
      bio: 'Specializes in high-risk pregnancies, fertility treatments, and minimally invasive gynecological surgeries.',
      hospitalName: 'Care Hospital',
      address: 'Hi-Tech City, Hyderabad',
      isApproved: false, // pending approval
      avgRating: '0',
      totalReviews: 0,
    },
    {
      userId: createdDoctorUsers[7]!.id,
      specialization: 'ENT',
      qualification: 'MS ENT (PGIMER Chandigarh)',
      experience: 9,
      consultationFee: '700.00',
      bio: 'ENT specialist with expertise in sinus surgeries, hearing disorders, and pediatric ENT conditions.',
      hospitalName: 'MaxCure Hospital',
      address: 'Madhapur, Hyderabad',
      isApproved: false, // pending approval
      avgRating: '0',
      totalReviews: 0,
    },
  ]

  const createdDoctors = await db.insert(doctors).values(doctorProfiles).returning()
  console.log(`  ${createdDoctors.length} doctor profiles (${createdDoctors.filter((d) => d.isApproved).length} approved, ${createdDoctors.filter((d) => !d.isApproved).length} pending)`)

  // ── 3. Availability slots ─────────────────────────────────────────
  console.log('Creating availability slots...')

  const approvedDoctors = createdDoctors.filter((d) => d.isApproved)
  const slotValues: Array<{
    doctorId: number
    dayOfWeek: number
    startTime: string
    endTime: string
  }> = []

  for (const doc of approvedDoctors) {
    // Monday to Friday slots
    for (let day = 1; day <= 5; day++) {
      slotValues.push(
        { doctorId: doc.id, dayOfWeek: day, startTime: '09:00', endTime: '09:30' },
        { doctorId: doc.id, dayOfWeek: day, startTime: '09:30', endTime: '10:00' },
        { doctorId: doc.id, dayOfWeek: day, startTime: '10:00', endTime: '10:30' },
        { doctorId: doc.id, dayOfWeek: day, startTime: '10:30', endTime: '11:00' },
        { doctorId: doc.id, dayOfWeek: day, startTime: '14:00', endTime: '14:30' },
        { doctorId: doc.id, dayOfWeek: day, startTime: '14:30', endTime: '15:00' },
        { doctorId: doc.id, dayOfWeek: day, startTime: '15:00', endTime: '15:30' },
        { doctorId: doc.id, dayOfWeek: day, startTime: '15:30', endTime: '16:00' },
      )
    }
    // Saturday morning only
    slotValues.push(
      { doctorId: doc.id, dayOfWeek: 6, startTime: '09:00', endTime: '09:30' },
      { doctorId: doc.id, dayOfWeek: 6, startTime: '09:30', endTime: '10:00' },
      { doctorId: doc.id, dayOfWeek: 6, startTime: '10:00', endTime: '10:30' },
      { doctorId: doc.id, dayOfWeek: 6, startTime: '10:30', endTime: '11:00' },
    )
  }

  await db.insert(availabilitySlots).values(slotValues)
  console.log(`  ${slotValues.length} slots across ${approvedDoctors.length} doctors`)

  // ── 4. Appointments ───────────────────────────────────────────────
  console.log('Creating appointments...')

  const appointmentData = [
    // Completed appointments (past) — for reviews and prescriptions
    {
      patientId: createdPatients[0]!.id,
      doctorId: createdDoctors[0]!.id,
      appointmentDate: '2026-03-10',
      startTime: '09:00',
      endTime: '09:30',
      status: 'completed' as const,
      reason: 'Chest pain and shortness of breath during exercise',
      doctorNotes: 'ECG normal. Advised stress test. Prescribed beta blocker.',
    },
    {
      patientId: createdPatients[1]!.id,
      doctorId: createdDoctors[0]!.id,
      appointmentDate: '2026-03-12',
      startTime: '10:00',
      endTime: '10:30',
      status: 'completed' as const,
      reason: 'Routine cardiac checkup — family history of heart disease',
      doctorNotes: 'Lipid panel elevated. Started statin therapy. Follow up in 3 months.',
    },
    {
      patientId: createdPatients[2]!.id,
      doctorId: createdDoctors[0]!.id,
      appointmentDate: '2026-03-15',
      startTime: '14:00',
      endTime: '14:30',
      status: 'completed' as const,
      reason: 'Palpitations and irregular heartbeat',
      doctorNotes: 'Holter monitor recommended. Likely benign PVCs. Reassured patient.',
    },
    {
      patientId: createdPatients[0]!.id,
      doctorId: createdDoctors[1]!.id,
      appointmentDate: '2026-03-18',
      startTime: '09:30',
      endTime: '10:00',
      status: 'completed' as const,
      reason: 'Persistent acne and skin pigmentation',
      doctorNotes: 'Moderate acne vulgaris. Started retinoid cream and oral antibiotics.',
    },
    {
      patientId: createdPatients[3]!.id,
      doctorId: createdDoctors[1]!.id,
      appointmentDate: '2026-03-20',
      startTime: '14:30',
      endTime: '15:00',
      status: 'completed' as const,
      reason: 'Eczema flare-up on arms and legs',
      doctorNotes: 'Atopic dermatitis. Topical steroid and moisturizer prescribed. Avoid triggers.',
    },
    {
      patientId: createdPatients[1]!.id,
      doctorId: createdDoctors[2]!.id,
      appointmentDate: '2026-03-22',
      startTime: '10:00',
      endTime: '10:30',
      status: 'completed' as const,
      reason: 'Child vaccination — 6 month schedule',
      doctorNotes: 'Vaccines administered per schedule. Next due at 9 months. Growth on track.',
    },
    {
      patientId: createdPatients[4]!.id,
      doctorId: createdDoctors[2]!.id,
      appointmentDate: '2026-03-25',
      startTime: '09:00',
      endTime: '09:30',
      status: 'completed' as const,
      reason: 'Child has persistent cough and mild fever',
      doctorNotes: 'Upper respiratory infection. Symptomatic treatment prescribed. Return if fever worsens.',
    },
    {
      patientId: createdPatients[2]!.id,
      doctorId: createdDoctors[3]!.id,
      appointmentDate: '2026-03-28',
      startTime: '09:00',
      endTime: '09:30',
      status: 'completed' as const,
      reason: 'Knee pain while climbing stairs',
      doctorNotes: 'Mild osteoarthritis. Physiotherapy recommended. Anti-inflammatory prescribed.',
    },
    {
      patientId: createdPatients[3]!.id,
      doctorId: createdDoctors[3]!.id,
      appointmentDate: '2026-04-01',
      startTime: '14:00',
      endTime: '14:30',
      status: 'completed' as const,
      reason: 'Lower back pain — ongoing for 2 weeks',
      doctorNotes: 'Lumbar strain. MRI ordered. Core strengthening exercises recommended.',
    },
    {
      patientId: createdPatients[0]!.id,
      doctorId: createdDoctors[4]!.id,
      appointmentDate: '2026-04-02',
      startTime: '10:00',
      endTime: '10:30',
      status: 'completed' as const,
      reason: 'Annual health checkup',
      doctorNotes: 'Blood sugar borderline. Advised dietary changes and retest in 3 months.',
    },
    {
      patientId: createdPatients[4]!.id,
      doctorId: createdDoctors[5]!.id,
      appointmentDate: '2026-04-05',
      startTime: '15:00',
      endTime: '15:30',
      status: 'completed' as const,
      reason: 'Recurring headaches and dizziness',
      doctorNotes: 'Tension-type headache. Migraine ruled out. Lifestyle modifications advised.',
    },
    // Confirmed (upcoming)
    {
      patientId: createdPatients[0]!.id,
      doctorId: createdDoctors[0]!.id,
      appointmentDate: '2026-04-18',
      startTime: '09:00',
      endTime: '09:30',
      status: 'confirmed' as const,
      reason: 'Follow-up: stress test results review',
    },
    {
      patientId: createdPatients[2]!.id,
      doctorId: createdDoctors[2]!.id,
      appointmentDate: '2026-04-19',
      startTime: '10:30',
      endTime: '11:00',
      status: 'confirmed' as const,
      reason: 'Child development checkup — 1 year milestone',
    },
    {
      patientId: createdPatients[3]!.id,
      doctorId: createdDoctors[5]!.id,
      appointmentDate: '2026-04-21',
      startTime: '14:00',
      endTime: '14:30',
      status: 'confirmed' as const,
      reason: 'Numbness in hands — needs nerve conduction study',
    },
    // Pending
    {
      patientId: createdPatients[1]!.id,
      doctorId: createdDoctors[4]!.id,
      appointmentDate: '2026-04-22',
      startTime: '09:30',
      endTime: '10:00',
      status: 'pending' as const,
      reason: 'Persistent fatigue and low energy',
    },
    {
      patientId: createdPatients[4]!.id,
      doctorId: createdDoctors[1]!.id,
      appointmentDate: '2026-04-23',
      startTime: '15:00',
      endTime: '15:30',
      status: 'pending' as const,
      reason: 'Skin rash after new medication',
    },
    // Cancelled
    {
      patientId: createdPatients[2]!.id,
      doctorId: createdDoctors[4]!.id,
      appointmentDate: '2026-04-10',
      startTime: '14:30',
      endTime: '15:00',
      status: 'cancelled' as const,
      reason: 'Follow-up for blood work',
      cancelledBy: 'patient' as const,
      cancellationReason: 'Travelling out of town, will reschedule',
    },
  ]

  const createdAppointments = await db.insert(appointments).values(appointmentData).returning()
  const completed = createdAppointments.filter((a) => a.status === 'completed')
  console.log(`  ${createdAppointments.length} appointments (${completed.length} completed, 3 confirmed, 2 pending, 1 cancelled)`)

  // ── 5. Payments (for completed + confirmed appointments) ──────────
  console.log('Creating payments...')

  const paidAppointments = createdAppointments.filter(
    (a) => a.status === 'completed' || a.status === 'confirmed',
  )

  const paymentValues = paidAppointments.map((apt) => {
    const doc = createdDoctors.find((d) => d.id === apt.doctorId)!
    return {
      appointmentId: apt.id,
      patientId: apt.patientId,
      amount: doc.consultationFee,
      currency: 'INR',
      razorpayOrderId: `order_seed_${apt.id}`,
      razorpayPaymentId: `pay_seed_${apt.id}`,
      razorpaySignature: `sig_seed_${apt.id}`,
      status: 'paid' as const,
    }
  })

  await db.insert(payments).values(paymentValues)
  console.log(`  ${paymentValues.length} payments`)

  // ── 6. Reviews (for completed appointments) ───────────────────────
  console.log('Creating reviews...')

  const reviewData = [
    { aptIdx: 0, rating: 5, comment: 'Dr. Ananya was incredibly thorough. She explained everything clearly and made me feel at ease. Highly recommended!' },
    { aptIdx: 1, rating: 5, comment: 'Very professional and knowledgeable. Took time to answer all my questions about heart health.' },
    { aptIdx: 2, rating: 4, comment: 'Good doctor, but had to wait a bit. The consultation itself was excellent.' },
    { aptIdx: 3, rating: 4, comment: 'My skin has improved a lot after following Dr. Rajesh\'s treatment plan. Very satisfied.' },
    { aptIdx: 4, rating: 5, comment: 'Finally found relief from eczema! Dr. Rajesh really understands skin conditions.' },
    { aptIdx: 5, rating: 5, comment: 'Dr. Fatima is amazing with children. My baby was calm throughout the visit.' },
    { aptIdx: 6, rating: 5, comment: 'Very caring and patient with kids. Explained the vaccination schedule clearly to us.' },
    { aptIdx: 7, rating: 5, comment: 'Excellent diagnosis. The physiotherapy plan is already helping with my knee pain.' },
    { aptIdx: 8, rating: 4, comment: 'Good consultation. The exercises he recommended are helping with my back pain.' },
    { aptIdx: 9, rating: 4, comment: 'Straightforward and practical advice. Appreciated the dietary recommendations.' },
    { aptIdx: 10, rating: 5, comment: 'Dr. Arjun correctly identified the cause of my headaches. Very knowledgeable neurologist.' },
  ]

  const reviewValues = reviewData.map((r) => ({
    appointmentId: completed[r.aptIdx]!.id,
    patientId: completed[r.aptIdx]!.patientId,
    doctorId: completed[r.aptIdx]!.doctorId,
    rating: r.rating,
    comment: r.comment,
  }))

  await db.insert(reviews).values(reviewValues)
  console.log(`  ${reviewValues.length} reviews`)

  // ── 7. Prescriptions (for completed appointments) ─────────────────
  console.log('Creating prescriptions...')

  const prescriptionData = [
    {
      aptIdx: 0,
      diagnosis: 'Exercise-induced angina — likely stable',
      medications: [
        { name: 'Metoprolol', dosage: '25mg', frequency: 'Once daily', duration: '30 days' },
        { name: 'Aspirin', dosage: '75mg', frequency: 'Once daily', duration: '90 days' },
      ],
      notes: 'Schedule stress test within 2 weeks. Avoid strenuous exercise until results.',
    },
    {
      aptIdx: 1,
      diagnosis: 'Hyperlipidemia',
      medications: [
        { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily at bedtime', duration: '90 days' },
      ],
      notes: 'Recheck lipid profile in 3 months. Low-fat diet and 30 min daily walking advised.',
    },
    {
      aptIdx: 3,
      diagnosis: 'Acne vulgaris (moderate) with post-inflammatory hyperpigmentation',
      medications: [
        { name: 'Tretinoin cream 0.025%', dosage: 'Pea-sized amount', frequency: 'Once daily at night', duration: '60 days' },
        { name: 'Doxycycline', dosage: '100mg', frequency: 'Twice daily', duration: '14 days' },
        { name: 'Niacinamide serum 10%', dosage: 'Apply thin layer', frequency: 'Morning', duration: '90 days' },
      ],
      notes: 'Use sunscreen SPF 50 daily. Avoid picking at skin. Follow up in 6 weeks.',
    },
    {
      aptIdx: 4,
      diagnosis: 'Atopic dermatitis — moderate flare',
      medications: [
        { name: 'Mometasone furoate cream 0.1%', dosage: 'Thin application on affected areas', frequency: 'Twice daily', duration: '14 days' },
        { name: 'Cetirizine', dosage: '10mg', frequency: 'Once daily at bedtime', duration: '30 days' },
        { name: 'Cetaphil moisturizer', dosage: 'Liberal application', frequency: '3 times daily', duration: 'Ongoing' },
      ],
      notes: 'Avoid hot showers and harsh soaps. Identify and avoid triggers (dust, certain fabrics).',
    },
    {
      aptIdx: 7,
      diagnosis: 'Early-stage osteoarthritis — right knee',
      medications: [
        { name: 'Diclofenac gel', dosage: 'Apply to knee', frequency: 'Twice daily', duration: '14 days' },
        { name: 'Glucosamine sulfate', dosage: '1500mg', frequency: 'Once daily', duration: '90 days' },
      ],
      notes: 'Start physiotherapy (quadriceps strengthening). Avoid prolonged standing. Use warm compress.',
    },
    {
      aptIdx: 8,
      diagnosis: 'Acute lumbar strain',
      medications: [
        { name: 'Aceclofenac', dosage: '100mg', frequency: 'Twice daily after meals', duration: '7 days' },
        { name: 'Thiocolchicoside', dosage: '4mg', frequency: 'Twice daily', duration: '7 days' },
      ],
      notes: 'MRI lumbar spine ordered. Core strengthening exercises daily. Ergonomic chair recommended.',
    },
    {
      aptIdx: 9,
      diagnosis: 'Prediabetes (fasting glucose 112 mg/dL)',
      medications: [
        { name: 'Metformin SR', dosage: '500mg', frequency: 'Once daily after dinner', duration: '90 days' },
      ],
      notes: 'Diet: reduce refined carbs and sugar. 30 min brisk walking daily. Repeat fasting glucose in 3 months.',
    },
  ]

  const prescriptionValues = prescriptionData.map((p) => ({
    appointmentId: completed[p.aptIdx]!.id,
    doctorId: completed[p.aptIdx]!.doctorId,
    patientId: completed[p.aptIdx]!.patientId,
    diagnosis: p.diagnosis,
    medications: p.medications,
    notes: p.notes,
  }))

  await db.insert(prescriptions).values(prescriptionValues)
  console.log(`  ${prescriptionValues.length} prescriptions`)

  // ── 8. Medical history ────────────────────────────────────────────
  console.log('Creating medical history...')

  const historyValues = [
    {
      patientId: createdPatients[0]!.id,
      condition: 'Hypertension',
      description: 'Diagnosed at age 35. Managed with lifestyle changes and ACE inhibitor.',
      diagnosedDate: '2023-06-15',
      isOngoing: true,
    },
    {
      patientId: createdPatients[0]!.id,
      condition: 'Type 2 Diabetes (Prediabetic)',
      description: 'Borderline fasting glucose. Currently managing with diet and metformin.',
      diagnosedDate: '2026-04-02',
      isOngoing: true,
    },
    {
      patientId: createdPatients[1]!.id,
      condition: 'Asthma',
      description: 'Childhood asthma. Mild intermittent. Uses inhaler as needed.',
      diagnosedDate: '2010-03-01',
      isOngoing: true,
    },
    {
      patientId: createdPatients[2]!.id,
      condition: 'Appendectomy',
      description: 'Emergency appendectomy performed. Full recovery.',
      diagnosedDate: '2021-11-20',
      isOngoing: false,
    },
    {
      patientId: createdPatients[3]!.id,
      condition: 'Atopic Dermatitis',
      description: 'Chronic eczema with periodic flare-ups. Managed with topical steroids.',
      diagnosedDate: '2019-08-10',
      isOngoing: true,
    },
    {
      patientId: createdPatients[4]!.id,
      condition: 'Migraine',
      description: 'Episodic migraines, 2-3 per month. Triggered by stress and lack of sleep.',
      diagnosedDate: '2022-01-15',
      isOngoing: true,
    },
  ]

  await db.insert(medicalHistory).values(historyValues)
  console.log(`  ${historyValues.length} medical history entries`)

  // ── 9. Notifications ──────────────────────────────────────────────
  console.log('Creating notifications...')

  const notifValues = [
    {
      userId: createdPatients[0]!.id,
      type: 'appointment_confirmed',
      title: 'Appointment Confirmed',
      message: 'Your appointment with Dr. Ananya Iyer on Apr 18 at 9:00 AM has been confirmed.',
      isRead: false,
    },
    {
      userId: createdPatients[0]!.id,
      type: 'prescription_created',
      title: 'New Prescription',
      message: 'Dr. Ananya Iyer has created a prescription for your visit on Mar 10. View it in your dashboard.',
      isRead: true,
    },
    {
      userId: createdPatients[2]!.id,
      type: 'appointment_confirmed',
      title: 'Appointment Confirmed',
      message: 'Your appointment with Dr. Fatima Khan on Apr 19 at 10:30 AM has been confirmed.',
      isRead: false,
    },
    {
      userId: createdDoctorUsers[0]!.id,
      type: 'new_appointment',
      title: 'New Appointment Booked',
      message: 'Rahul Sharma has booked an appointment for Apr 18 at 9:00 AM.',
      isRead: false,
    },
    {
      userId: createdDoctorUsers[0]!.id,
      type: 'new_review',
      title: 'New Review',
      message: 'You received a 5-star review from Rahul Sharma. Keep up the great work!',
      isRead: true,
    },
    {
      userId: createdDoctorUsers[6]!.id,
      type: 'profile_pending',
      title: 'Profile Under Review',
      message: 'Your doctor profile is pending admin approval. You will be notified once approved.',
      isRead: false,
    },
    {
      userId: createdDoctorUsers[7]!.id,
      type: 'profile_pending',
      title: 'Profile Under Review',
      message: 'Your doctor profile is pending admin approval. You will be notified once approved.',
      isRead: false,
    },
  ]

  await db.insert(notifications).values(notifValues)
  console.log(`  ${notifValues.length} notifications`)

  // ── Done ──────────────────────────────────────────────────────────
  console.log('\n✓ Seed complete!\n')
  console.log('Login credentials (all use the same password):')
  console.log('  Password: password123\n')
  console.log('  Admin:    admin@docbook.com')
  console.log('  Patient:  rahul@example.com, priya@example.com, amit@example.com, sneha@example.com, vikram@example.com')
  console.log('  Doctor:   ananya@docbook.com, rajesh@docbook.com, fatima@docbook.com, suresh@docbook.com, meera@docbook.com, arjun@docbook.com')
  console.log('  Pending:  kavitha@docbook.com, mohammed@docbook.com (not yet approved)')

  await client.end()
  process.exit(0)
}

seed().catch(async (err) => {
  console.error('Seed failed:', err)
  await client.end()
  process.exit(1)
})

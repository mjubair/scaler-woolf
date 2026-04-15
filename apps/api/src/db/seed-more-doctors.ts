import 'dotenv/config'
import bcrypt from 'bcrypt'
import { db, client } from './index'
import { users, doctors, availabilitySlots } from './schema'

const MORE_DOCTORS = [
  // ── Cardiology ──
  { name: 'Dr. Vikram Chauhan', email: 'vikram.c@docbook.com', phone: '+91-9810000001', specialization: 'Cardiology', qualification: 'MD, DM Cardiology (MAMC Delhi)', experience: 22, fee: '2000.00', bio: 'Expert in interventional cardiology, chest pain, heart disease, and BP management. Performed 5000+ angioplasties.', hospital: 'Medanta Hospital', address: 'Gurugram, Haryana' },
  { name: 'Dr. Lakshmi Venkat', email: 'lakshmi.v@docbook.com', phone: '+91-9810000002', specialization: 'Cardiology', qualification: 'MD Cardiology (CMC Vellore)', experience: 8, fee: '800.00', bio: 'Specializes in preventive cardiology, heart failure, high blood pressure, and cholesterol management.', hospital: 'Narayana Health', address: 'Bommasandra, Bangalore' },
  { name: 'Dr. Sanjay Gupta', email: 'sanjay.g@docbook.com', phone: '+91-9810000003', specialization: 'Cardiology', qualification: 'DNB Cardiology (Fortis)', experience: 12, fee: '1200.00', bio: 'Cardiac electrophysiologist treating arrhythmia, palpitations, and chest pain. Pioneer in cardiac device implantation.', hospital: 'Max Hospital', address: 'Saket, New Delhi' },

  // ── Dermatology ──
  { name: 'Dr. Nisha Sharma', email: 'nisha.s@docbook.com', phone: '+91-9810000004', specialization: 'Dermatology', qualification: 'MD Dermatology (AIIMS)', experience: 14, fee: '1200.00', bio: 'Expert in acne treatment, skin rash, hair loss, pigmentation, and laser procedures. Published 30+ research papers.', hospital: 'Skin & You Clinic', address: 'Koramangala, Bangalore' },
  { name: 'Dr. Arun Patel', email: 'arun.p@docbook.com', phone: '+91-9810000005', specialization: 'Dermatology', qualification: 'DVD, DNB Dermatology', experience: 6, fee: '500.00', bio: 'Young dermatologist specializing in acne, eczema, skin allergies, and cosmetic treatments at affordable prices.', hospital: 'ClearSkin Clinic', address: 'Andheri, Mumbai' },
  { name: 'Dr. Prerna Khanna', email: 'prerna.k@docbook.com', phone: '+91-9810000006', specialization: 'Dermatology', qualification: 'MD Dermatology (PGI Chandigarh)', experience: 18, fee: '1500.00', bio: 'Senior dermatologist treating psoriasis, vitiligo, hair loss, and skin cancer. Expert in dermoscopy and skin biopsy.', hospital: 'Apollo Clinic', address: 'Jubilee Hills, Hyderabad' },

  // ── ENT ──
  { name: 'Dr. Ravi Shankar', email: 'ravi.s@docbook.com', phone: '+91-9810000007', specialization: 'ENT', qualification: 'MS ENT (JIPMER)', experience: 16, fee: '1000.00', bio: 'ENT surgeon specializing in sinus surgery, hearing loss treatment, sore throat, and tonsillectomy. 2000+ surgeries performed.', hospital: 'Global Hospital', address: 'LB Nagar, Hyderabad' },
  { name: 'Dr. Sunita Reddy', email: 'sunita.r@docbook.com', phone: '+91-9810000008', specialization: 'ENT', qualification: 'DNB ENT (Manipal)', experience: 5, fee: '400.00', bio: 'Treats ear infections, sore throat, nasal blockage, snoring, and hearing loss. Gentle approach for pediatric ENT.', hospital: 'ENT Care Centre', address: 'HSR Layout, Bangalore' },
  { name: 'Dr. Deepak Joshi', email: 'deepak.j@docbook.com', phone: '+91-9810000009', specialization: 'ENT', qualification: 'MS ENT, Fellowship Otology (UK)', experience: 20, fee: '1500.00', bio: 'Leading ENT surgeon for cochlear implants, sinus treatment, and skull base surgery. International fellowship trained.', hospital: 'Fortis Hospital', address: 'Mulund, Mumbai' },

  // ── General Medicine ──
  { name: 'Dr. Amrita Das', email: 'amrita.d@docbook.com', phone: '+91-9810000010', specialization: 'General Medicine', qualification: 'MD Medicine (AIIMS Patna)', experience: 10, fee: '500.00', bio: 'General physician treating fever, cold, cough, diabetes, hypertension, and thyroid disorders. Holistic approach to care.', hospital: 'City Health Clinic', address: 'Salt Lake, Kolkata' },
  { name: 'Dr. Karthik Raman', email: 'karthik.r@docbook.com', phone: '+91-9810000011', specialization: 'General Medicine', qualification: 'MBBS, DNB Medicine', experience: 4, fee: '300.00', bio: 'Affordable consultations for fever, cough, cold, diabetes management, infections, and general health checkups.', hospital: 'MedPlus Clinic', address: 'T Nagar, Chennai' },
  { name: 'Dr. Pooja Mishra', email: 'pooja.m@docbook.com', phone: '+91-9810000012', specialization: 'General Medicine', qualification: 'MD Internal Medicine (BHU)', experience: 15, fee: '900.00', bio: 'Senior physician specializing in diabetes, hypertension, fever management, respiratory infections, and preventive medicine.', hospital: 'Medica Hospital', address: 'Mukundapur, Kolkata' },
  { name: 'Dr. Farhan Sheikh', email: 'farhan.s@docbook.com', phone: '+91-9810000013', specialization: 'General Medicine', qualification: 'MD General Medicine (GMC Mumbai)', experience: 7, fee: '600.00', bio: 'Treats fever, cold, cough, infections, diabetes, and lifestyle diseases. Strong focus on patient education.', hospital: 'Lilavati Hospital', address: 'Bandra, Mumbai' },

  // ── Gynecology ──
  { name: 'Dr. Swati Agarwal', email: 'swati.a@docbook.com', phone: '+91-9810000014', specialization: 'Gynecology', qualification: 'MD Obstetrics & Gynecology (AIIMS Delhi)', experience: 19, fee: '1500.00', bio: 'Senior gynecologist treating PCOS, period problems, pregnancy care, infertility, and menopause management.', hospital: 'Cloudnine Hospital', address: 'Whitefield, Bangalore' },
  { name: 'Dr. Rekha Iyer', email: 'rekha.i@docbook.com', phone: '+91-9810000015', specialization: 'Gynecology', qualification: 'MS OBG (Kasturba Medical College)', experience: 9, fee: '700.00', bio: 'Specializes in period problems, PCOS, pregnancy complications, and laparoscopic gynecological surgeries.', hospital: 'Motherhood Hospital', address: 'Indiranagar, Bangalore' },
  { name: 'Dr. Zainab Hussain', email: 'zainab.h@docbook.com', phone: '+91-9810000016', specialization: 'Gynecology', qualification: 'DNB OBG, Fellowship Reproductive Medicine', experience: 13, fee: '1200.00', bio: 'Fertility specialist and gynecologist. Expert in IVF, pregnancy care, PCOS treatment, and minimally invasive surgery.', hospital: 'Nova IVF Centre', address: 'Banjara Hills, Hyderabad' },

  // ── Neurology ──
  { name: 'Dr. Ashwin Kumar', email: 'ashwin.k@docbook.com', phone: '+91-9810000017', specialization: 'Neurology', qualification: 'DM Neurology (AIIMS Delhi)', experience: 17, fee: '2000.00', bio: 'Senior neurologist treating migraine, headache, epilepsy, seizures, stroke, and Parkinson\'s disease. 20+ years of research.', hospital: 'NIMHANS', address: 'Hosur Road, Bangalore' },
  { name: 'Dr. Divya Nair', email: 'divya.n@docbook.com', phone: '+91-9810000018', specialization: 'Neurology', qualification: 'DM Neurology (SCTIMST)', experience: 7, fee: '1000.00', bio: 'Neurologist treating headache, migraine, vertigo, numbness, and nerve disorders. Special interest in neuro-rehabilitation.', hospital: 'Amrita Hospital', address: 'Kochi, Kerala' },
  { name: 'Dr. Manish Bhatt', email: 'manish.b@docbook.com', phone: '+91-9810000019', specialization: 'Neurology', qualification: 'MD, DM Neurology (PGI Chandigarh)', experience: 11, fee: '1400.00', bio: 'Expert in epilepsy, seizures, headache disorders, multiple sclerosis, and neuromuscular diseases.', hospital: 'Fortis Hospital', address: 'Mohali, Punjab' },

  // ── Orthopedics ──
  { name: 'Dr. Rajendra Singh', email: 'rajendra.s@docbook.com', phone: '+91-9810000020', specialization: 'Orthopedics', qualification: 'MS Orthopedics, MCh (AIIMS)', experience: 25, fee: '1800.00', bio: 'Senior orthopedic surgeon for knee pain, back pain, joint replacement, fractures, and sports injuries. 3000+ surgeries.', hospital: 'Indian Spinal Injuries Centre', address: 'Vasant Kunj, New Delhi' },
  { name: 'Dr. Neha Kapoor', email: 'neha.kp@docbook.com', phone: '+91-9810000021', specialization: 'Orthopedics', qualification: 'DNB Orthopedics (Hinduja Hospital)', experience: 6, fee: '600.00', bio: 'Treats back pain, knee pain, fractures, sprains, and arthritis. Focus on non-surgical orthopedic treatment.', hospital: 'OrthoCare Clinic', address: 'Powai, Mumbai' },
  { name: 'Dr. Harish Babu', email: 'harish.b@docbook.com', phone: '+91-9810000022', specialization: 'Orthopedics', qualification: 'MS Orthopedics, Fellowship Spine Surgery', experience: 14, fee: '1400.00', bio: 'Spine surgeon and orthopedist treating back pain, disc problems, knee pain, and complex fractures.', hospital: 'Apollo Hospitals', address: 'Greams Road, Chennai' },

  // ── Pediatrics ──
  { name: 'Dr. Smita Jain', email: 'smita.j@docbook.com', phone: '+91-9810000023', specialization: 'Pediatrics', qualification: 'MD Pediatrics (AIIMS Delhi)', experience: 16, fee: '1200.00', bio: 'Senior pediatrician for child fever, vaccination schedules, growth monitoring, and childhood asthma. Loved by kids.', hospital: 'Rainbow Children Hospital', address: 'Marathahalli, Bangalore' },
  { name: 'Dr. Rohan Mehta', email: 'rohan.m@docbook.com', phone: '+91-9810000024', specialization: 'Pediatrics', qualification: 'MBBS, DCH Pediatrics', experience: 3, fee: '400.00', bio: 'Affordable pediatric care for vaccination, child fever, cough, cold, nutrition advice, and developmental milestones.', hospital: 'Kids First Clinic', address: 'Viman Nagar, Pune' },
  { name: 'Dr. Anita George', email: 'anita.g@docbook.com', phone: '+91-9810000025', specialization: 'Pediatrics', qualification: 'MD Pediatrics, Fellowship Neonatology', experience: 12, fee: '900.00', bio: 'Neonatologist and pediatrician specializing in newborn care, vaccination, child fever, growth issues, and allergies.', hospital: 'Aster CMI Hospital', address: 'Hebbal, Bangalore' },
]

async function seedMore() {
  console.log('Seeding additional doctors...\n')
  const PASSWORD_HASH = await bcrypt.hash('password123', 12)

  for (const doc of MORE_DOCTORS) {
    // Create user
    const [user] = await db
      .insert(users)
      .values({
        name: doc.name,
        email: doc.email,
        phone: doc.phone,
        passwordHash: PASSWORD_HASH,
        role: 'doctor',
        isActive: true,
        isVerified: true,
      })
      .onConflictDoNothing({ target: users.email })
      .returning()

    if (!user) {
      console.log(`  Skipped ${doc.email} (already exists)`)
      continue
    }

    // Create doctor profile
    const rating = (3.5 + Math.random() * 1.5).toFixed(2) // 3.50 - 5.00
    const reviewCount = Math.floor(Math.random() * 40) + 1

    const [doctor] = await db
      .insert(doctors)
      .values({
        userId: user.id,
        specialization: doc.specialization,
        qualification: doc.qualification,
        experience: doc.experience,
        consultationFee: doc.fee,
        bio: doc.bio,
        hospitalName: doc.hospital,
        address: doc.address,
        isApproved: true,
        avgRating: rating,
        totalReviews: reviewCount,
      })
      .returning()

    // Create availability slots (Mon-Fri 8 slots + Sat 4)
    const slotValues: Array<{ doctorId: number; dayOfWeek: number; startTime: string; endTime: string }> = []
    for (let day = 1; day <= 5; day++) {
      slotValues.push(
        { doctorId: doctor.id, dayOfWeek: day, startTime: '09:00', endTime: '09:30' },
        { doctorId: doctor.id, dayOfWeek: day, startTime: '09:30', endTime: '10:00' },
        { doctorId: doctor.id, dayOfWeek: day, startTime: '10:00', endTime: '10:30' },
        { doctorId: doctor.id, dayOfWeek: day, startTime: '10:30', endTime: '11:00' },
        { doctorId: doctor.id, dayOfWeek: day, startTime: '14:00', endTime: '14:30' },
        { doctorId: doctor.id, dayOfWeek: day, startTime: '14:30', endTime: '15:00' },
        { doctorId: doctor.id, dayOfWeek: day, startTime: '15:00', endTime: '15:30' },
        { doctorId: doctor.id, dayOfWeek: day, startTime: '15:30', endTime: '16:00' },
      )
    }
    slotValues.push(
      { doctorId: doctor.id, dayOfWeek: 6, startTime: '09:00', endTime: '09:30' },
      { doctorId: doctor.id, dayOfWeek: 6, startTime: '09:30', endTime: '10:00' },
      { doctorId: doctor.id, dayOfWeek: 6, startTime: '10:00', endTime: '10:30' },
      { doctorId: doctor.id, dayOfWeek: 6, startTime: '10:30', endTime: '11:00' },
    )
    await db.insert(availabilitySlots).values(slotValues)

    console.log(`  ${doc.name} — ${doc.specialization} (Rs. ${doc.fee}, ${doc.experience}yr exp, ${rating} rating)`)
  }

  console.log(`\n✓ Seeded ${MORE_DOCTORS.length} additional doctors across 8 specializations`)
  console.log('  All use password: password123')

  await client.end()
  process.exit(0)
}

seedMore().catch(async (err) => {
  console.error('Seed failed:', err)
  await client.end()
  process.exit(1)
})

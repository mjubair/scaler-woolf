'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { DoctorSearch, SPECIALIZATIONS } from '@/components/layout/doctor-search'
import { Button, Card, CardContent } from '@/components/ui'
import {
  Stethoscope,
  Calendar,
  Video,
  Shield,
  Star,
  FileText,
  Heart,
  CreditCard,
  ArrowRight,
  Clock,
} from 'lucide-react'

const features = [
  {
    icon: <Stethoscope className="size-6" />,
    title: 'Verified Doctors',
    description: 'All doctors are verified and approved by our admin team before they can accept bookings.',
  },
  {
    icon: <Calendar className="size-6" />,
    title: 'Easy Booking',
    description: 'Browse doctors, pick a time slot, and book your consultation in just a few clicks.',
  },
  {
    icon: <Video className="size-6" />,
    title: 'Google Meet Consultations',
    description: 'Get a shareable Google Meet link and calendar invite automatically upon booking.',
  },
  {
    icon: <CreditCard className="size-6" />,
    title: 'Secure Payments',
    description: 'Pay securely through Razorpay. Your payment is processed before the consultation.',
  },
  {
    icon: <FileText className="size-6" />,
    title: 'Digital Prescriptions',
    description: 'Receive digital prescriptions from your doctor after your consultation.',
  },
  {
    icon: <Heart className="size-6" />,
    title: 'Medical History',
    description: 'Maintain your medical history and share it with doctors during consultations.',
  },
  {
    icon: <Star className="size-6" />,
    title: 'Reviews & Ratings',
    description: 'Rate and review doctors after your consultation to help other patients.',
  },
  {
    icon: <Shield className="size-6" />,
    title: 'Privacy First',
    description: 'Your health data is secure and only shared with your consulting doctor.',
  },
]

export default function Home() {
  const router = useRouter()

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Hero Section with Search */}
      <section className="relative bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center mb-10">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Your Home for{' '}
              <span className="text-primary">Health</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Consult top doctors online. Get prescriptions,
              manage your medical history, and connect via Google Meet — all from
              the comfort of your home.
            </p>
          </div>

          {/* Search bar */}
          <DoctorSearch
            variant="hero"
            onSelect={(type, value) => {
              if (type === 'specialization') {
                router.push(`/doctors?specialization=${encodeURIComponent(value)}`)
              } else {
                router.push(`/doctors?search=${encodeURIComponent(value)}`)
              }
            }}
          />

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-6 sm:gap-10 mt-10 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-green-600" />
              <span>Verified Doctors</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-blue-600" />
              <span>Available in 15 min</span>
            </div>
            <div className="flex items-center gap-2">
              <Video className="size-5 text-purple-600" />
              <span>Video Consultation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Specialization cards */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight">Consult by Specialization</h2>
            <p className="mt-2 text-muted-foreground">Choose a specialty to find the right doctor for you</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SPECIALIZATIONS.map((spec) => {
              const Icon = spec.icon
              return (
                <Link
                  key={spec.name}
                  href={`/doctors?specialization=${encodeURIComponent(spec.name)}`}
                  className="group text-left rounded-2xl border border-border bg-background p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-200"
                >
                  <div className={`size-12 rounded-xl ${spec.bg} flex items-center justify-center mb-4`}>
                    <Icon className={`size-6 ${spec.color}`} />
                  </div>
                  <h3 className="font-semibold text-base mb-0.5">{spec.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{spec.conditions}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">
                      From Rs. {spec.startingFee}
                    </span>
                    <span className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Consult Now &rarr;
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
            <p className="mt-2 text-muted-foreground">Book a consultation in 3 simple steps</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Choose a Doctor', desc: 'Pick a specialization or search for a doctor by name. View profiles, ratings, and fees.' },
              { step: '2', title: 'Book & Pay', desc: 'Select a convenient time slot, pay securely via Razorpay, and get instant confirmation.' },
              { step: '3', title: 'Consult Online', desc: 'Join via Google Meet at your appointment time. Get prescriptions and follow-up notes.' },
            ].map((item) => (
              <div key={item.step} className="text-center px-4">
                <div className="size-12 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mx-auto mb-4 text-lg">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight">Everything You Need</h2>
            <p className="mt-2 text-muted-foreground">A complete healthcare consultation platform</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature) => (
              <Card key={feature.title} className="hover:ring-2 hover:ring-primary/10 transition-all">
                <CardContent className="pt-6">
                  <div className="size-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">Ready to Get Started?</h2>
          <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
            Join thousands of patients and doctors on DocBook. Book your first
            consultation today.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2 bg-white text-primary hover:bg-white/90 font-semibold">
                Create Account
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/doctors">
              <Button size="lg" className="bg-transparent border border-white/30 text-white hover:bg-white/10">
                Browse Doctors
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary/10 py-8 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-primary">
            <Stethoscope className="size-5" />
            DocBook
          </div>
          <p className="text-sm text-muted-foreground">
            Online Doctor Consultation Booking Platform
          </p>
        </div>
      </footer>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
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

const steps = [
  { step: '1', title: 'Find a Doctor', description: 'Search by specialization, rating, or name' },
  { step: '2', title: 'Book a Slot', description: 'Choose a date and available time slot' },
  { step: '3', title: 'Make Payment', description: 'Pay the consultation fee securely via Razorpay' },
  { step: '4', title: 'Consult Online', description: 'Join via Google Meet at the scheduled time' },
]

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Your Health,{' '}
              <span className="text-primary">One Click Away</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Book online consultations with verified doctors. Get prescriptions,
              manage your medical history, and consult via Google Meet — all from
              the comfort of your home.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/doctors">
                <Button size="lg" className="gap-2">
                  Find a Doctor
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline">
                  Join as Doctor
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
            <p className="mt-2 text-muted-foreground">Book a consultation in 4 simple steps</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 size-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-12">
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
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Ready to Get Started?</h2>
          <p className="mt-4 text-lg opacity-90 max-w-xl mx-auto">
            Join thousands of patients and doctors on DocBook. Book your first
            consultation today.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="gap-2">
                Create Account
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/doctors">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                Browse Doctors
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-semibold">
            <Stethoscope className="size-5 text-primary" />
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

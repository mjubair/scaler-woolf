import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Woolf - Turborepo Monorepo',
  description: 'A modern monorepo with Next.js and Express API',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

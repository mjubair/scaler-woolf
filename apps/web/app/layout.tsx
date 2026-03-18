import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Woolf Project',
  description: 'A master degree project built with Next.js and Express, demonstrating a full-stack monorepo architecture.',
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

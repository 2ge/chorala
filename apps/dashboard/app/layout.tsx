import type { Metadata } from 'next'
import { Fraunces, Hanken_Grotesk } from 'next/font/google'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import { THEME_IDS } from '@/lib/themes'
import './globals.css'

const sans = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  weight: ['400', '500', '600', '700'],
})

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'Heed — Admin',
  description: 'Heed feedback platform dashboard',
  robots: { index: false, follow: false },
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieTheme = (await cookies()).get('heed-theme')?.value
  const theme = cookieTheme && THEME_IDS.includes(cookieTheme) ? cookieTheme : 'paper'

  return (
    <html lang="en" data-theme={theme} className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  )
}

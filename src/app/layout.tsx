import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'VoiceAI — Smart Missed Call Assistant',
  description: 'Automate missed call handling with AI. Capture customer details, schedule appointments, and never miss a business opportunity.',
  keywords: 'voice AI, missed call, business automation, AI assistant, customer service',
  openGraph: {
    title: 'VoiceAI — Smart Missed Call Assistant',
    description: 'Automate missed call handling with AI for any small business.',
    type: 'website',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#16161f',
              color: '#f1f1f5',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#16161f' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#16161f' } },
          }}
        />
      </body>
    </html>
  )
}

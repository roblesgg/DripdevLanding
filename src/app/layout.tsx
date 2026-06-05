import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DripDev | Excellence in Digital Apps',
  description: 'Ultra-premium app studio specialized in social and utility apps.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}

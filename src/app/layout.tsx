import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DripDev | Desarrollos creativos y eficaces',
  description: 'Marca personal de desarrollo de aplicaciones y herramientas digitales. Creador de VeoVeo, RDLC Auto Header y más proyectos.',
  keywords: ['DripDev', 'Álvaro Robles González', 'VeoVeo', 'desarrollador apps', 'React Native', 'Next.js', 'RDLC Auto Header'],
  authors: [{ name: 'Álvaro Robles González' }],
  icons: {
    icon: '/dripdev-logo.png',
    shortcut: '/dripdev-logo.png',
    apple: '/dripdev-logo.png',
  },
  openGraph: {
    title: 'DripDev | Desarrollos creativos y eficaces',
    description: 'Marca personal de desarrollo de aplicaciones y herramientas digitales.',
    type: 'website',
  },
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

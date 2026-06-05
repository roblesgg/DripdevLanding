'use client'

import React from 'react'
import { motion } from 'framer-motion'
import SpaceScene from '@/components/SpaceScene'
import GlassCard from '@/components/GlassCard'

export default function Home() {
  const apps = [
    {
      title: 'VeoVeo',
      description: 'El match definitivo para tus películas y amigos. No pierdas más tiempo eligiendo qué ver.',
      link: 'https://veoveo.dripdev.dev',
      icon: '🍿'
    },
    {
      title: 'DripPay',
      description: 'Próximamente. La forma más fluida de gestionar tus suscripciones digitales.',
      link: '#',
      icon: '💳'
    },
    {
      title: 'Studio Cloud',
      description: 'Próximamente. Tu espacio creativo en la nube para proyectos colaborativos.',
      link: '#',
      icon: '☁️'
    }
  ]

  return (
    <main>
      <nav className="nav">
        <div className="logo">DRIPDEV</div>
        <div style={{ opacity: 0.5, fontSize: '0.8rem', fontWeight: 600 }}>v1.1</div>
      </nav>

      <SpaceScene />

      <section className="hero-section">
        <motion.p 
          className="tagline"
          initial={{ opacity: 0, letterSpacing: '1rem' }}
          whileInView={{ opacity: 1, letterSpacing: '0.3rem' }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        >
          Celestial Hub
        </motion.p>
        
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
        >
          DripDev
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          style={{ cursor: 'pointer' }}
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
        >
          <div style={{ fontSize: '1.5rem', marginTop: '20px' }}>↓</div>
        </motion.div>
      </section>

      <section className="apps-section">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          Nuestras Apps
        </motion.h2>
        
        <div className="grid-apps">
          {apps.map((app, i) => (
            <motion.div
              key={app.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: i * 0.2 }}
            >
              <GlassCard {...app} />
            </motion.div>
          ))}
        </div>
      </section>

      <footer style={{ 
        padding: '100px 24px',
        textAlign: 'center', 
        color: 'rgba(255,255,255,0.1)',
        fontSize: '0.7rem',
        letterSpacing: '2px'
      }}>
        © 2026 DRIPDEV STUDIO • CRAFTING DIGITAL GEMS
      </footer>
    </main>
  )
}

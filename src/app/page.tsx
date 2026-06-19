'use client'

import { motion } from 'framer-motion'
import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import MeshGradientBackground from '@/components/MeshGradientBackground'
import ProjectCarousel3D from '@/components/ProjectCarousel3D'
import AnimatedSection from '@/components/AnimatedSection'
import { SocialButtons } from '@/components/SocialLinks'

const EasterEggJet = dynamic(() => import('@/components/EasterEggJet'), { ssr: false })

const features = [
  { icon: '🎯', title: 'Criterio', desc: 'Cada proyecto resuelve una necesidad real, sin relleno.' },
  { icon: '⚡', title: 'Velocidad', desc: 'Desde idea hasta build funcional en el menor tiempo posible.' },
  { icon: '∞', title: 'Continuidad', desc: 'Mantenimiento activo y mejoras constantes tras el lanzamiento.' },
]

const stats = [
  { number: '2+', label: 'Proyectos públicos' },
  { number: '1', label: 'App publicada' },
  { number: '1', label: 'Extensión VS Code' },
  { number: '∞', label: 'En desarrollo' },
]

const LETTERS = 'DripDev'.split('')

export default function Home() {
  const [exploded, setExploded] = useState(false)
  const [showLogo, setShowLogo] = useState(false)
  const handleImpact = useCallback(() => {
    setExploded(true)
    // Once the letters have blasted away, reveal the logo in their place
    setTimeout(() => setShowLogo(true), 700)
  }, [])

  return (
    <main>
      <MeshGradientBackground />

      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="lg-effect" />
        <div className="lg-tint" />
        <div className="lg-shine" />
        <div className="navbar-inner">
          <button
            className="logo"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Volver arriba"
          >
            DRIPDEV
          </button>
          <nav className="nav-links">
            <a href="#dripdev">Sobre mí</a>
            <a href="#contacto">Contacto</a>
          </nav>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero" style={{ minHeight: 'auto', paddingBottom: '20px' }}>

        <motion.div
          className="hero-badge"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <span className="hero-badge-dot" />
          Apps · Extensiones · Herramientas
        </motion.div>

        <motion.h1
          className={`hero-title${exploded ? ' exploded' : ''}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
        >
          {showLogo ? (
            <motion.img
              src="/dripdev-logo.png"
              alt="DripDev"
              className="hero-logo"
              initial={{ opacity: 0, scale: 0.3, rotate: -15 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 140, damping: 12 }}
            />
          ) : (
            <span className="gradient">
              {LETTERS.map((char, i) => (
                <span key={i} className="letter" style={{ '--i': i } as React.CSSProperties}>
                  {char}
                </span>
              ))}
            </span>
          )}
        </motion.h1>

        <motion.p
          className="hero-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Desarrollos creativos y eficaces.
        </motion.p>

        <motion.div
          className="hero-cta"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55 }}
        >
          <a href="#contacto" className="btn btn-primary">Contactar</a>
          <a href="#dripdev" className="btn btn-secondary">Saber más</a>
        </motion.div>

        <ProjectCarousel3D />

        <motion.a
          href="#dripdev"
          className="scroll-hint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >↓</motion.a>
      </section>

      {/* ── Qué es DripDev ── */}
      <section id="dripdev" className="section">
        <div className="container">
          <AnimatedSection>
            <h2 className="section-title">Qué es DripDev</h2>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <p className="section-subtitle">
              Marca personal de desarrollo de aplicaciones y herramientas digitales.
            </p>
          </AnimatedSection>

          <div className="feature-grid">
            {features.map((f, i) => (
              <AnimatedSection key={f.title} delay={i * 0.12}>
                <div className="feature-card">
                  <div className="lg-effect" />
                  <div className="lg-tint" />
                  <div className="lg-shine" />
                  <div className="feature-card-inner">
                    <div className="feature-icon">{f.icon}</div>
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <div className="stats-row">
            {stats.map((s, i) => (
              <AnimatedSection key={s.label} delay={0.3 + i * 0.08}>
                <div className="stat-card">
                  <div className="stat-number">{s.number}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contacto ── */}
      <section id="contacto" className="section contact-section">
        <div className="container">
          <AnimatedSection>
            <div className="contact-card">
              <div className="lg-effect" />
              <div className="lg-tint" style={{ background: 'linear-gradient(155deg, rgba(99,102,241,0.1) 0%, rgba(255,255,255,0.58) 60%)' }} />
              <div className="lg-shine" />
              <div className="contact-card-inner">
                <div className="contact-avatar">
                  <img src="/alvaro.jpeg" alt="Álvaro Robles" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                </div>
                <h2 className="contact-name">Álvaro Robles González</h2>
                <p className="contact-role">Desarrollador de aplicaciones multiplataforma</p>
                <a href="mailto:Roblesgg16@gmail.com" className="contact-email">
                  Roblesgg16@gmail.com
                </a>
                <p className="contact-location">📍 Murcia</p>
                <SocialButtons />
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <EasterEggJet onImpact={handleImpact} />

      <footer className="footer">
        <div className="container">
          <p>© {new Date().getFullYear()} DripDev · Álvaro Robles González</p>
        </div>
      </footer>
    </main>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import MeshGradientBackground from '@/components/MeshGradientBackground'
import ProjectCarousel3D from '@/components/ProjectCarousel3D'
import AnimatedSection from '@/components/AnimatedSection'
import { SocialButtons } from '@/components/SocialLinks'
import LemonModel from '@/components/LemonModel'

export default function Home() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <main>
      <MeshGradientBackground />

      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-inner">
          <div className="logo">DRIPDEV</div>
        </div>
      </nav>

      <section className="hero" style={{ minHeight: 'auto', paddingBottom: '20px' }}>
        <motion.h1
          className="hero-title"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <span className="gradient">DripDev</span>
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
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <a href="#contacto" className="btn btn-primary">
            Contactar
          </a>
          <a href="#dripdev" className="btn btn-secondary">
            Saber más
          </a>
        </motion.div>

        <ProjectCarousel3D />

        <motion.a
          href="#dripdev"
          className="scroll-hint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          ↓
        </motion.a>
      </section>

      <section id="dripdev" className="section">
        <div className="container">
          <AnimatedSection>
            <h2 className="section-title">Qué es DripDev</h2>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <p className="section-subtitle">Marca personal de desarrollo de aplicaciones y herramientas digitales.</p>
          </AnimatedSection>

          <div className="about-grid">
            <AnimatedSection delay={0.2} className="about-text">
              <p>
                <span className="about-highlight">DripDev</span> es una marca creada para diseñar
                y desarrollar aplicaciones, extensiones y herramientas digitales con criterio,
                orden y atención al detalle.
              </p>

              <p>
                Cada proyecto responde a una necesidad concreta: algo que falta, algo que se puede
                mejorar, o una idea que merece existir.
              </p>
            </AnimatedSection>

            <AnimatedSection delay={0.3}>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-number">2+</div>
                  <div className="stat-label">Proyectos públicos</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">1</div>
                  <div className="stat-label">App publicada</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">1</div>
                  <div className="stat-label">Extensión VS Code</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">∞</div>
                  <div className="stat-label">En desarrollo</div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <section id="contacto" className="section contact-section">
        <div className="container">
          <AnimatedSection>
            <h2 className="section-title">Autor</h2>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <p className="section-subtitle" style={{ marginBottom: '32px' }}>
              Datos de contacto profesional.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h3
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: 'var(--fg)',
                  marginBottom: '8px',
                }}
              >
                Álvaro Robles González
              </h3>
              <p style={{ color: 'var(--fg-muted)', fontSize: '1rem' }}>
                Desarrollador de aplicaciones multiplataforma
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.3}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                alignItems: 'center',
                marginBottom: '40px',
              }}
            >
              <a href="mailto:Roblesgg16@gmail.com" className="contact-email">
                Roblesgg16@gmail.com
              </a>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: 'var(--fg-muted)',
                  fontSize: '0.95rem',
                }}
              >
                <span>Murcia</span>
                <LemonModel />
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.4}>
            <SocialButtons />
          </AnimatedSection>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <p>© {new Date().getFullYear()} DripDev • Álvaro Robles González</p>
        </div>
      </footer>
    </main>
  )
}

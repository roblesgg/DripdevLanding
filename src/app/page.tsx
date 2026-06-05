'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import GlassmorphismBackground from '@/components/GlassmorphismBackground'
import AnimatedSection from '@/components/AnimatedSection'
import { SocialButtons, SocialIcons } from '@/components/SocialLinks'

const projects = [
  {
    title: 'VeoVeo',
    description: 'App social para descubrir películas y hacer match con amigos. Disponible en web y próximamente en iOS/Android.',
    icon: '🍿',
    status: 'live',
    statusText: 'En vivo',
    link: 'https://veoveo.dripdev.dev',
  },
  {
    title: 'RDLC Auto Header',
    description: 'Extensión de Visual Studio Code que automatiza encabezados en informes RDLC, ahorrando tiempo en cada reporte.',
    icon: '🧩',
    status: 'live',
    statusText: 'Publicada',
    link: 'https://marketplace.visualstudio.com/items?itemName=b3325c32-f6ee-4fad-9894-9af09cca5946.rdlc-autoheader',
  },
]

const stats = [
  { number: '2+', label: 'Proyectos públicos' },
  { number: '1', label: 'App publicada' },
  { number: '1', label: 'Extensión VS Code' },
  { number: '∞', label: 'Ganas de crear' },
]

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
      <GlassmorphismBackground />

      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-inner">
          <div className="logo">DRIPDEV</div>
          <div className="nav-links">
            <SocialIcons />
          </div>
        </div>
      </nav>

      <section className="hero">
        <motion.p
          className="hero-label"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Desarrollo de aplicaciones multiplataforma
        </motion.p>

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
          Apps con código limpio, diseño cuidado y propósito real.{' '}
          <strong style={{ color: 'var(--accent)' }}>De la idea al producto.</strong>
        </motion.p>

        <motion.div
          className="hero-cta"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <a href="#proyectos" className="btn btn-primary">
            Ver proyectos
          </a>
          <a href="#contacto" className="btn btn-secondary">
            Contactar
          </a>
        </motion.div>

        <SocialButtons />

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
            <p className="section-subtitle">
              No es una agencia. Es mi rincón personal para desarrollar apps y herramientas en mi
              tiempo libre.
            </p>
          </AnimatedSection>

          <div className="about-grid">
            <AnimatedSection delay={0.2} className="about-text">
              <p>
                <span className="about-highlight">DripDev</span> soy yo, Álvaro. Mientras termino el
                Grado Superior en Desarrollo de Aplicaciones Multiplataforma, dedico mi tiempo libre
                a crear apps y pequeñas utilidades que resuelvan problemas reales.
              </p>
              <p>
                Me gusta el código limpio, aprender tecnologías nuevas y aplicar con cabeza lo que
                voy aprendiendo de metodologías ágiles. Trabajo principalmente con{' '}
                <span className="about-highlight">React Native</span>,{' '}
                <span className="about-highlight">Next.js</span> y{' '}
                <span className="about-highlight">Firebase</span>.
              </p>
              <p>
                Cada proyecto empieza con algo que me molesta, algo que echo de menos o una idea que
                no me deja dormir. Si puede servirle a alguien más, mejor.
              </p>
            </AnimatedSection>

            <AnimatedSection delay={0.3}>
              <div className="stats-grid">
                {stats.map((stat) => (
                  <div key={stat.label} className="stat-card">
                    <div className="stat-number">{stat.number}</div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <section id="proyectos" className="section" style={{ background: 'var(--bg-light)' }}>
        <div className="container">
          <AnimatedSection>
            <h2 className="section-title">Proyectos</h2>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <p className="section-subtitle">Apps y herramientas que hemos publicado hasta ahora.</p>
          </AnimatedSection>

          <div className="projects-grid">
            {projects.map((project, index) => (
              <AnimatedSection key={project.title} delay={0.2 + index * 0.15}>
                <a
                  href={project.link}
                  target={project.link !== '#' ? '_blank' : undefined}
                  rel={project.link !== '#' ? 'noopener noreferrer' : undefined}
                  className="project-card"
                >
                  <span className={`project-status status-${project.status}`}>
                    {project.statusText}
                  </span>
                  <div className="project-icon">{project.icon}</div>
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                  <span className="project-arrow">
                    {project.status === 'live' ? 'Visitar' : 'Más info'}
                    <span>→</span>
                  </span>
                </a>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section id="fundador" className="section">
        <div className="container">
          <AnimatedSection>
            <h2 className="section-title">Quién hay detrás</h2>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <p className="section-subtitle">
              DripDev nace de la mano de una persona con actitud senior y sed de aprender.
            </p>
          </AnimatedSection>

          <div className="about-grid">
            <AnimatedSection delay={0.2} className="about-text">
              <p>
                Me llamo <span className="about-highlight">Álvaro Robles González</span>, tengo 23
                años y estoy terminando el Grado Superior en{' '}
                <strong>Desarrollo de Aplicaciones Multiplataforma</strong>.
              </p>
              <p>
                Aunque me inicio como perfil junior en programación, llevo trabajando desde los 16
                años. Siete años en hostelería y logística me han enseñado disciplina, trabajo bajo
                presión y lo que significa que un equipo dependa de ti.
              </p>
              <p>
                Dispongo de vehículo propio, carnet de conducir tipo B e incorporación inmediata.
                Estoy ubicado en <strong>Sangonera la Seca, Murcia</strong>, pero puedo desplazarme
                sin problema.
              </p>
              <p>
                Me apasiona el orden, las metodologías ágiles y construir código que sea mantenible.
                No quiero solo &quot;picar código&quot;, sino hacerlo bien.
              </p>
            </AnimatedSection>

            <AnimatedSection delay={0.3}>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-number">23</div>
                  <div className="stat-label">Años</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">7+</div>
                  <div className="stat-label">Años trabajando</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">DAM</div>
                  <div className="stat-label">Grado Superior</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">B</div>
                  <div className="stat-label">Carnet + vehículo</div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <section id="contacto" className="section contact-section">
        <div className="container">
          <AnimatedSection>
            <h2 className="section-title">¿Hablamos?</h2>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <p className="section-subtitle">
              Si tienes una idea, una propuesta de trabajo o simplemente quieres charlar sobre
              tecnología, aquí me tienes.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
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
              <p style={{ color: 'var(--fg-muted)', fontSize: '0.95rem' }}>
                Sangonera la Seca, Murcia
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.3}>
            <SocialButtons />
          </AnimatedSection>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-socials">
            <a
              href="https://www.linkedin.com/in/%C3%A1lvaro-robles-gonz%C3%A1lez-bbb017240/"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              LinkedIn
            </a>
            <a
              href="https://github.com/roblesgg"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              GitHub
            </a>
            <a href="mailto:Roblesgg16@gmail.com" className="footer-link">
              Email
            </a>
          </div>
          <p>© {new Date().getFullYear()} DripDev • Álvaro Robles González</p>
        </div>
      </footer>
    </main>
  )
}

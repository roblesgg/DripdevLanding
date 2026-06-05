'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

interface Project {
  title: string
  description: string
  image: string
  fallbackIcon: React.ReactNode
  status: string
  link: string
}

const projects: Project[] = [
  {
    title: 'VeoVeo',
    description: 'App social para descubrir películas y hacer match con amigos.',
    image: '/veoveo-icon.png',
    fallbackIcon: '🍿',
    status: 'En vivo',
    link: 'https://veoveo.dripdev.dev',
  },
  {
    title: 'RDLC Auto Header',
    description: 'Extensión VS Code para automatizar encabezados en informes RDLC.',
    image: '',
    fallbackIcon: (
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    status: 'Publicada',
    link: 'https://marketplace.visualstudio.com/items?itemName=b3325c32-f6ee-4fad-9894-9af09cca5946.rdlc-autoheader',
  },
]

export default function ProjectCarousel3D() {
  const [current, setCurrent] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const slideNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % projects.length)
  }, [])

  const slidePrev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + projects.length) % projects.length)
  }, [])

  useEffect(() => {
    if (isDragging) return
    const interval = setInterval(() => {
      slideNext()
    }, 5000)
    return () => clearInterval(interval)
  }, [isDragging, slideNext])

  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    setIsDragging(false)
    const threshold = 60
    if (info.offset.x > threshold || info.velocity.x > 400) {
      slidePrev()
    } else if (info.offset.x < -threshold || info.velocity.x < -400) {
      slideNext()
    }
  }

  const getPosition = (index: number) => {
    const diff = index - current
    const normalizedDiff = ((diff + projects.length + Math.floor(projects.length / 2)) % projects.length) - Math.floor(projects.length / 2)

    return {
      x: normalizedDiff * 320,
      scale: normalizedDiff === 0 ? 1 : 0.82,
      opacity: normalizedDiff === 0 ? 1 : 0.35,
      zIndex: normalizedDiff === 0 ? 10 : 5 - Math.abs(normalizedDiff),
      blur: normalizedDiff === 0 ? 0 : 2,
    }
  }

  return (
    <div className="carousel-section" id="proyectos">
      <div className="carousel-viewport">
        <motion.div
          className="carousel-track-modern"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.08}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
        >
          <AnimatePresence mode="popLayout">
            {projects.map((project, index) => {
              const pos = getPosition(index)
              const isActive = index === current

              return (
                <motion.a
                  key={project.title}
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`carousel-card-modern ${isActive ? 'active' : ''}`}
                  initial={false}
                  animate={{
                    x: pos.x,
                    scale: pos.scale,
                    opacity: pos.opacity,
                    zIndex: pos.zIndex,
                    filter: `blur(${pos.blur}px)`,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 120,
                    damping: 22,
                    mass: 1,
                  }}
                  whileHover={isActive ? { y: -8, scale: 1.02 } : {}}
                >
                  <div className="carousel-card-visual">
                    {project.image ? (
                      <Image
                        src={project.image}
                        alt={project.title}
                        width={140}
                        height={140}
                        className="carousel-card-img"
                      />
                    ) : (
                      <div className="carousel-card-fallback">{project.fallbackIcon}</div>
                    )}
                    <span className="carousel-card-badge">{project.status}</span>
                  </div>
                  <div className="carousel-card-content">
                    <h3 className="carousel-card-title">{project.title}</h3>
                    <p className="carousel-card-desc">{project.description}</p>
                    <span className="carousel-card-link">
                      Visitar proyecto <span>→</span>
                    </span>
                  </div>
                </motion.a>
              )
            })}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="carousel-controls">
        <button
          className="carousel-arrow"
          onClick={slidePrev}
          aria-label="Proyecto anterior"
        >
          ←
        </button>
        <div className="carousel-dots">
          {projects.map((_, index) => (
            <button
              key={index}
              className={`carousel-dot ${index === current ? 'active' : ''}`}
              onClick={() => setCurrent(index)}
              aria-label={`Ir al proyecto ${index + 1}`}
            />
          ))}
        </div>
        <button
          className="carousel-arrow"
          onClick={slideNext}
          aria-label="Proyecto siguiente"
        >
          →
        </button>
      </div>
    </div>
  )
}

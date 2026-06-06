'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, PanInfo } from 'framer-motion'

interface Project {
  title: string
  description: string
  image: string
  fallbackIcon: string
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
    image: '/rdlc-icon.png',
    fallbackIcon: '</>',
    status: 'Publicada',
    link: 'https://marketplace.visualstudio.com/items?itemName=b3325c32-f6ee-4fad-9894-9af09cca5946.rdlc-autoheader',
  },
]

const AUTO_INTERVAL = 6000 // ms between slides
const PAUSE_AFTER_INTERACTION = 10000 // ms

function getOffset(cardIndex: number, activeIndex: number, count: number) {
  const diff = cardIndex - activeIndex
  let offset = ((diff % count) + count) % count
  if (offset > count / 2) offset -= count
  return offset
}

function useCardSpacing() {
  const [spacing, setSpacing] = useState(320)
  const [rotate, setRotate] = useState(45)

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w < 400) {
        setSpacing(160)
        setRotate(35)
      } else if (w < 640) {
        setSpacing(220)
        setRotate(40)
      } else if (w < 768) {
        setSpacing(280)
        setRotate(42)
      } else if (w < 1024) {
        setSpacing(340)
        setRotate(45)
      } else {
        setSpacing(400)
        setRotate(48)
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return { spacing, rotate }
}

function getVariant(offset: number, spacing: number, rotate: number) {
  if (offset === 0) {
    return {
      x: 0,
      rotateY: 0,
      scale: 1,
      opacity: 1,
      zIndex: 10,
      filter: 'blur(0px) brightness(1)',
    }
  }
  const dir = offset > 0 ? -1 : 1
  return {
    x: offset * spacing,
    rotateY: dir * rotate,
    scale: 0.72,
    opacity: 0.45,
    zIndex: 10 - Math.abs(offset),
    filter: 'blur(4px) brightness(0.9)',
  }
}

export default function ProjectCarousel3D() {
  const [active, setActive] = useState(0)
  const { spacing, rotate } = useCardSpacing()
  const lastInteraction = useRef<number>(0)

  const markInteraction = () => {
    lastInteraction.current = Date.now()
  }

  // Auto-advance
  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() - lastInteraction.current < PAUSE_AFTER_INTERACTION) return
      setActive((prev) => (prev + 1) % projects.length)
    }, AUTO_INTERVAL)
    return () => clearInterval(timer)
  }, [])

  const handleDragStart = () => {
    markInteraction()
  }

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -80 || info.velocity.x < -300) {
      setActive((prev) => (prev + 1) % projects.length)
    } else if (info.offset.x > 80 || info.velocity.x > 300) {
      setActive((prev) => (prev - 1 + projects.length) % projects.length)
    }
  }

  const slideNext = () => {
    markInteraction()
    setActive((prev) => (prev + 1) % projects.length)
  }
  const slidePrev = () => {
    markInteraction()
    setActive((prev) => (prev - 1 + projects.length) % projects.length)
  }
  const goTo = (index: number) => {
    markInteraction()
    setActive(index)
  }

  return (
    <div className="coverflow-section" id="proyectos">
      <div className="coverflow-stage">
        <motion.div
          className="coverflow-track"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.08}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {projects.map((project, index) => {
            const offset = getOffset(index, active, projects.length)
            const variant = getVariant(offset, spacing, rotate)
            const isCenter = offset === 0

            return (
              <motion.a
                key={project.title}
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                className="coverflow-card"
                initial={false}
                animate={variant}
                transition={{
                  type: 'spring',
                  stiffness: 60,
                  damping: 22,
                  mass: 1.2,
                }}
                whileHover={isCenter ? { y: -6, scale: 1.02 } : {}}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="coverflow-card-inner">
                  <div className="coverflow-card-visual">
                    <img src={project.image} alt="" className="coverflow-card-img" />
                    <div className="coverflow-card-fallback" style={{ display: 'none' }}>
                      {project.fallbackIcon}
                    </div>
                    <span className="coverflow-card-badge">{project.status}</span>
                  </div>
                  <div className="coverflow-card-content">
                    <h3 className="coverflow-card-title">{project.title}</h3>
                    <p className="coverflow-card-desc">{project.description}</p>
                    <span className="coverflow-card-link">
                      Visitar <span>→</span>
                    </span>
                  </div>
                </div>
                <div className="coverflow-card-reflection" />
              </motion.a>
            )
          })}
        </motion.div>
      </div>

      <div className="coverflow-controls">
        <button className="coverflow-arrow" onClick={slidePrev} aria-label="Proyecto anterior">
          ←
        </button>
        <div className="coverflow-dots">
          {projects.map((_, index) => (
            <button
              key={index}
              className={`coverflow-dot ${active === index ? 'active' : ''}`}
              onClick={() => goTo(index)}
              aria-label={`Ir al proyecto ${index + 1}`}
            />
          ))}
        </div>
        <button className="coverflow-arrow" onClick={slideNext} aria-label="Proyecto siguiente">
          →
        </button>
      </div>
    </div>
  )
}

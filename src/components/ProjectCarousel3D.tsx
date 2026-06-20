'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, PanInfo } from 'framer-motion'

interface Project {
  title: string
  description: string
  image: string
  status: string
  statusType: 'live' | 'published'
  link: string
  accent: string
}

const projects: Project[] = [
  {
    title: 'VeoVeo',
    description: 'App social para descubrir películas y hacer match con amigos.',
    image: '/veoveo-icon.png',
    status: 'En vivo',
    statusType: 'live',
    link: 'https://veoveo.dripdev.dev/descargar',
    accent: '#6366f1',
  },
  {
    title: 'RDLC Auto Header',
    description: 'Extensión VS Code para automatizar encabezados en informes RDLC.',
    image: '/rdlc-icon.png',
    status: 'Publicada',
    statusType: 'published',
    link: 'https://marketplace.visualstudio.com/items?itemName=b3325c32-f6ee-4fad-9894-9af09cca5946.rdlc-autoheader',
    accent: '#0ea5e9',
  },
]

const AUTO_INTERVAL = 6000
const PAUSE_AFTER_INTERACTION = 10000

function getOffset(cardIndex: number, activeIndex: number, count: number) {
  const diff = cardIndex - activeIndex
  let offset = ((diff % count) + count) % count
  if (offset > count / 2) offset -= count
  return offset
}

function useCardSpacing() {
  const [spacing, setSpacing] = useState(320)
  const [rotate, setRotate] = useState(48)

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w < 400) { setSpacing(170); setRotate(35) }
      else if (w < 640) { setSpacing(240); setRotate(42) }
      else if (w < 768) { setSpacing(300); setRotate(45) }
      else if (w < 1024) { setSpacing(360); setRotate(48) }
      else { setSpacing(430); setRotate(52) }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return { spacing, rotate }
}

function getVariant(offset: number, spacing: number, rotate: number) {
  if (offset === 0) {
    return { x: 0, rotateY: 0, scale: 1, opacity: 1, zIndex: 10, filter: 'blur(0px) brightness(1)' }
  }
  const dir = offset > 0 ? -1 : 1
  return {
    x: offset * spacing,
    rotateY: dir * rotate,
    scale: 0.66,
    opacity: 0.5,
    zIndex: 10 - Math.abs(offset),
    filter: 'blur(4px) brightness(0.82)',
  }
}

export default function ProjectCarousel3D() {
  const [active, setActive] = useState(0)
  const { spacing, rotate } = useCardSpacing()
  const lastInteraction = useRef<number>(0)
  const markInteraction = () => { lastInteraction.current = Date.now() }

  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() - lastInteraction.current < PAUSE_AFTER_INTERACTION) return
      setActive((prev) => (prev + 1) % projects.length)
    }, AUTO_INTERVAL)
    return () => clearInterval(timer)
  }, [])

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    markInteraction()
    if (info.offset.x < -80 || info.velocity.x < -300) setActive((p) => (p + 1) % projects.length)
    else if (info.offset.x > 80 || info.velocity.x > 300) setActive((p) => (p - 1 + projects.length) % projects.length)
  }

  const slideNext = () => { markInteraction(); setActive((p) => (p + 1) % projects.length) }
  const slidePrev = () => { markInteraction(); setActive((p) => (p - 1 + projects.length) % projects.length) }
  const goTo = (i: number) => { markInteraction(); setActive(i) }

  const current = projects[active]

  return (
    <div className="coverflow-section" id="proyectos">

      {/* Ambient glow that follows the active project color */}
      <motion.div
        className="coverflow-glow"
        animate={{ background: `radial-gradient(ellipse at 50% 60%, ${current.accent}28 0%, transparent 68%)` }}
        transition={{ duration: 1, ease: 'easeInOut' }}
      />

      <div className="coverflow-stage">
        <motion.div
          className="coverflow-track"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.08}
          onDragStart={markInteraction}
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
                className={`coverflow-card${isCenter ? ' active' : ''}`}
                initial={false}
                animate={variant}
                transition={{ type: 'spring', stiffness: 52, damping: 19, mass: 1.1 }}
                whileHover={isCenter ? { y: -10, scale: 1.03 } : { scale: 0.72, opacity: 0.7 }}
                style={{ transformStyle: 'preserve-3d' }}
                onClick={(e) => {
                  // A non-active card just gets selected (brought to the front),
                  // it does NOT open the link. Only the active card opens.
                  if (!isCenter) { e.preventDefault(); goTo(index) }
                  else markInteraction()
                }}
              >
                {/* Liquid glass layers */}
                <div className="lg-effect" />
                <div
                  className="lg-tint"
                  style={{
                    background: isCenter
                      ? `linear-gradient(155deg, ${project.accent}1a 0%, rgba(255,255,255,0.52) 55%)`
                      : 'rgba(255,255,255,0.48)',
                  }}
                />
                <div className="lg-shine" />

                {/* Card content */}
                <div className="coverflow-card-inner">

                  {/* Visual area */}
                  <div
                    className="coverflow-card-visual"
                    style={{ background: `linear-gradient(145deg, ${project.accent}1c 0%, ${project.accent}08 100%)` }}
                  >
                    <img
                      src={project.image}
                      alt={project.title}
                      className="coverflow-card-img"
                    />

                    {/* Glow ring under icon when active */}
                    {isCenter && (
                      <motion.div
                        className="card-icon-glow"
                        style={{ background: project.accent }}
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 0.18, scale: 1 }}
                        transition={{ duration: 0.6 }}
                      />
                    )}

                    <span className={`coverflow-card-badge badge-${project.statusType}`}>
                      <span className="badge-dot" />
                      {project.status}
                    </span>
                  </div>

                  {/* Text area */}
                  <div className="coverflow-card-content">
                    <h3 className="coverflow-card-title">{project.title}</h3>
                    <p className="coverflow-card-desc">{project.description}</p>
                    <span className="coverflow-card-link" style={{ color: project.accent }}>
                      Ver proyecto <span className="link-arrow">→</span>
                    </span>
                  </div>
                </div>
              </motion.a>
            )
          })}
        </motion.div>
      </div>

      {/* Controls */}
      <div className="coverflow-controls">
        <button className="coverflow-arrow" onClick={slidePrev} aria-label="Anterior">‹</button>

        <div className="coverflow-dots">
          {projects.map((_, i) => (
            <motion.button
              key={i}
              className={`coverflow-dot${active === i ? ' active' : ''}`}
              onClick={() => goTo(i)}
              animate={{
                width: active === i ? 28 : 10,
                background: active === i ? current.accent : 'rgba(0,0,0,0.14)',
              }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              aria-label={`Ir a ${projects[i].title}`}
            />
          ))}
        </div>

        <button className="coverflow-arrow" onClick={slideNext} aria-label="Siguiente">›</button>
      </div>
    </div>
  )
}

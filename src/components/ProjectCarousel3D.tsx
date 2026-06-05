'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform, PanInfo, MotionValue } from 'framer-motion'

interface Project {
  title: string
  description: string
  image: string
  fallbackIcon: string
  status: string
  link: string
  isPlaceholder?: boolean
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
  {
    title: 'Próximamente',
    description: 'Nueva herramienta en desarrollo. Pronto más detalles.',
    image: '',
    fallbackIcon: '🔜',
    status: 'En desarrollo',
    link: '#proyectos',
    isPlaceholder: true,
  },
  {
    title: 'Próximamente',
    description: 'Proyecto en fase inicial de diseño y arquitectura.',
    image: '',
    fallbackIcon: '🚀',
    status: 'Planificación',
    link: '#proyectos',
    isPlaceholder: true,
  },
]

const AUTO_SPEED = 0.035 // indices per second (~28s per card, ~114s full loop)

function useResponsiveSpacing() {
  const [spacing, setSpacing] = useState(200)
  const [rotate, setRotate] = useState(45)

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w < 400) {
        setSpacing(105)
        setRotate(35)
      } else if (w < 640) {
        setSpacing(130)
        setRotate(40)
      } else if (w < 768) {
        setSpacing(160)
        setRotate(42)
      } else if (w < 1024) {
        setSpacing(180)
        setRotate(45)
      } else {
        setSpacing(210)
        setRotate(48)
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return { spacing, rotate }
}

function getShortestOffset(index: number, current: number, count: number) {
  const diff = index - current
  let offset = ((diff % count) + count) % count
  if (offset > count / 2) offset -= count
  return offset
}

function ProjectIcon({ src, fallback }: { src: string; fallback: string }) {
  if (!src) {
    return <div className="coverflow-card-fallback">{fallback}</div>
  }
  return <img src={src} alt="" className="coverflow-card-img" />
}

function CarouselCard({
  project,
  index,
  motionCurrent,
  spacing,
  rotate,
}: {
  project: Project
  index: number
  motionCurrent: MotionValue<number>
  spacing: number
  rotate: number
}) {
  const x = useTransform(motionCurrent, (v) => {
    const offset = getShortestOffset(index, v, projects.length)
    return offset * spacing
  })

  const rotateY = useTransform(motionCurrent, (v) => {
    const offset = getShortestOffset(index, v, projects.length)
    return offset * rotate
  })

  const scale = useTransform(motionCurrent, (v) => {
    const offset = Math.abs(getShortestOffset(index, v, projects.length))
    return offset < 0.5 ? 1 : 0.78
  })

  const opacity = useTransform(motionCurrent, (v) => {
    const offset = Math.abs(getShortestOffset(index, v, projects.length))
    if (offset < 0.5) return 1
    if (offset < 1.5) return 0.6
    return 0.25
  })

  const filter = useTransform(motionCurrent, (v) => {
    const offset = Math.abs(getShortestOffset(index, v, projects.length))
    const blur = offset < 0.5 ? 0 : 3
    const brightness = offset < 0.5 ? 1 : 0.92
    return `blur(${blur}px) brightness(${brightness})`
  })

  const zIndex = useTransform(motionCurrent, (v) => {
    const offset = Math.abs(getShortestOffset(index, v, projects.length))
    return 10 - Math.round(offset)
  })

  if (project.isPlaceholder) {
    return (
      <motion.div
        className="coverflow-card coverflow-card-placeholder"
        style={{
          x,
          rotateY,
          scale,
          opacity,
          filter,
          zIndex,
          transformStyle: 'preserve-3d',
        }}
      >
        <div className="coverflow-card-inner">
          <div className="coverflow-card-visual">
            <div className="coverflow-card-fallback" style={{ display: 'flex' }}>
              {project.fallbackIcon}
            </div>
            <span
              className="coverflow-card-badge"
              style={{
                background: 'rgba(107, 114, 128, 0.1)',
                color: '#6b7280',
                borderColor: 'rgba(107, 114, 128, 0.2)',
              }}
            >
              {project.status}
            </span>
          </div>
          <div className="coverflow-card-content">
            <h3 className="coverflow-card-title">{project.title}</h3>
            <p className="coverflow-card-desc">{project.description}</p>
          </div>
        </div>
        <div className="coverflow-card-reflection" />
      </motion.div>
    )
  }

  return (
    <motion.a
      href={project.link}
      target="_blank"
      rel="noopener noreferrer"
      className="coverflow-card"
      style={{
        x,
        rotateY,
        scale,
        opacity,
        filter,
        zIndex,
        transformStyle: 'preserve-3d',
      }}
      whileHover={{ y: -6, scale: 1.02 }}
    >
      <div className="coverflow-card-inner">
        <div className="coverflow-card-visual">
          <ProjectIcon src={project.image} fallback={project.fallbackIcon} />
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
}

export default function ProjectCarousel3D() {
  const motionCurrent = useMotionValue(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartValue = useRef<number | null>(null)
  const { spacing, rotate } = useResponsiveSpacing()

  // Continuous slow auto-rotation
  useEffect(() => {
    if (isDragging) return
    let raf: number
    let lastTime = performance.now()

    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000
      lastTime = now
      motionCurrent.set(motionCurrent.get() + delta * AUTO_SPEED)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)

    const unsubscribe = motionCurrent.on('change', (v) => {
      const idx = Math.round(v)
      const normalized = ((idx % projects.length) + projects.length) % projects.length
      setActiveIndex(normalized)
    })

    return () => {
      cancelAnimationFrame(raf)
      unsubscribe()
    }
  }, [isDragging, motionCurrent])

  const handleDragStart = () => {
    setIsDragging(true)
    dragStartValue.current = motionCurrent.get()
  }

  const handleDrag = (_: unknown, info: PanInfo) => {
    if (dragStartValue.current === null) return
    const sensitivity = 0.004
    motionCurrent.set(dragStartValue.current - info.offset.x * sensitivity)
  }

  const handleDragEnd = () => {
    dragStartValue.current = null
    setIsDragging(false)
  }

  const goTo = (index: number) => {
    const current = motionCurrent.get()
    const currentNormalized = ((Math.round(current) % projects.length) + projects.length) % projects.length
    let diff = index - currentNormalized
    if (diff > projects.length / 2) diff -= projects.length
    if (diff < -projects.length / 2) diff += projects.length
    motionCurrent.set(current + diff)
  }

  const slideNext = () => {
    motionCurrent.set(motionCurrent.get() + 1)
  }

  const slidePrev = () => {
    motionCurrent.set(motionCurrent.get() - 1)
  }

  return (
    <div className="coverflow-section" id="proyectos">
      <div className="coverflow-stage">
        <motion.div
          className="coverflow-track"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.02}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
        >
          {projects.map((project, index) => (
            <CarouselCard
              key={`${project.title}-${index}`}
              project={project}
              index={index}
              motionCurrent={motionCurrent}
              spacing={spacing}
              rotate={rotate}
            />
          ))}
        </motion.div>
      </div>

      <div className="coverflow-controls">
        <button
          className="coverflow-arrow"
          onClick={slidePrev}
          aria-label="Proyecto anterior"
        >
          ←
        </button>
        <div className="coverflow-dots">
          {projects.map((_, index) => (
            <button
              key={index}
              className={`coverflow-dot ${activeIndex === index ? 'active' : ''}`}
              onClick={() => goTo(index)}
              aria-label={`Ir al proyecto ${index + 1}`}
            />
          ))}
        </div>
        <button
          className="coverflow-arrow"
          onClick={slideNext}
          aria-label="Proyecto siguiente"
        >
          →
        </button>
      </div>
    </div>
  )
}

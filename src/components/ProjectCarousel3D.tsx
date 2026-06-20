'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

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

const N = projects.length
const AUTO_INTERVAL = 6000
const PAUSE_AFTER = 9000

function roundRect(x: CanvasRenderingContext2D, X: number, Y: number, w: number, h: number, r: number) {
  x.beginPath()
  x.moveTo(X + r, Y)
  x.arcTo(X + w, Y, X + w, Y + h, r)
  x.arcTo(X + w, Y + h, X, Y + h, r)
  x.arcTo(X, Y + h, X, Y, r)
  x.arcTo(X, Y, X + w, Y, r)
  x.closePath()
}

// Bake a whole card (rounded glass panel + accent glow + icon) into one texture
function bakeCard(project: Project): Promise<THREE.Texture> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const s = 512
      const c = document.createElement('canvas')
      c.width = c.height = s
      const x = c.getContext('2d')!
      x.shadowColor = 'rgba(20,25,50,0.22)'
      x.shadowBlur = 46
      x.shadowOffsetY = 22
      const grad = x.createLinearGradient(0, 0, 0, s)
      grad.addColorStop(0, project.accent + '26')
      grad.addColorStop(0.55, '#ffffff')
      grad.addColorStop(1, '#f3f5fb')
      x.fillStyle = grad
      roundRect(x, 40, 36, s - 80, s - 76, 60)
      x.fill()
      x.shadowColor = 'transparent'
      // accent glow behind icon
      const gg = x.createRadialGradient(s / 2, s * 0.46, 0, s / 2, s * 0.46, s * 0.32)
      gg.addColorStop(0, project.accent + '40')
      gg.addColorStop(1, project.accent + '00')
      x.fillStyle = gg
      x.fillRect(0, 0, s, s)
      const iw = s * 0.52
      x.drawImage(img, (s - iw) / 2, s * 0.46 - iw / 2, iw, iw)
      const t = new THREE.CanvasTexture(c)
      t.anisotropy = 8
      t.needsUpdate = true
      resolve(t)
    }
    img.src = project.image
  })
}

function wrapRel(i: number, pos: number) {
  let r = i - pos
  while (r > N / 2) r -= N
  while (r < -N / 2) r += N
  return r
}

function Card({ i, tex, posRef, onPick }: { i: number; tex: THREE.Texture; posRef: React.MutableRefObject<number>; onPick: (i: number) => void }) {
  const g = useRef<THREE.Group>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(() => {
    const grp = g.current
    if (!grp) return
    const rel = wrapRel(i, posRef.current)
    const a = Math.abs(rel)
    grp.position.set(rel * 2.35, 0, -a * 1.9)
    grp.rotation.y = -rel * 0.5
    grp.scale.setScalar(Math.max(0.45, 1 - a * 0.14))
    grp.renderOrder = Math.round((2 - a) * 10)
    if (mat.current) mat.current.opacity = Math.max(0.28, 1 - a * 0.55)
  })
  return (
    <group
      ref={g}
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onPick(i) }}
      onPointerOver={() => { document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = '' }}
    >
      <mesh>
        <planeGeometry args={[2.4, 2.4]} />
        <meshBasicMaterial ref={mat} map={tex} transparent depthWrite={false} />
      </mesh>
    </group>
  )
}

function Rig({ active, posRef, dragging }: { active: number; posRef: React.MutableRefObject<number>; dragging: React.MutableRefObject<boolean> }) {
  useFrame(() => {
    if (dragging.current) return
    let d = active - posRef.current
    while (d > N / 2) d -= N
    while (d < -N / 2) d += N
    posRef.current += d * 0.12
    if (Math.abs(d) < 0.001) posRef.current = active
  })
  return null
}

export default function ProjectCarousel3D() {
  const [active, setActive] = useState(0)
  const [textures, setTextures] = useState<THREE.Texture[]>([])
  const posRef = useRef(0)
  const dragging = useRef(false)
  const moved = useRef(false)
  const dragStart = useRef({ x: 0, pos: 0 })
  const lastInteraction = useRef(0)
  const current = projects[active]

  useEffect(() => {
    let alive = true
    Promise.all(projects.map(bakeCard)).then((t) => { if (alive) setTextures(t) })
    return () => { alive = false }
  }, [])

  // auto-advance
  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() - lastInteraction.current < PAUSE_AFTER) return
      setActive((p) => (p + 1) % N)
    }, AUTO_INTERVAL)
    return () => clearInterval(id)
  }, [])

  const mark = () => { lastInteraction.current = Date.now() }
  const goTo = (i: number) => { mark(); setActive(((i % N) + N) % N) }
  const next = () => goTo(active + 1)
  const prev = () => goTo(active - 1)

  const pick = (i: number) => {
    if (moved.current) return
    if (i === active) window.open(projects[i].link, '_blank', 'noopener,noreferrer')
    else goTo(i)
  }

  const onDown = (e: React.PointerEvent) => {
    dragging.current = true; moved.current = false
    dragStart.current = { x: e.clientX, pos: posRef.current }
    mark()
  }
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - dragStart.current.x
    if (Math.abs(dx) > 4) moved.current = true
    posRef.current = dragStart.current.pos - dx / 180
  }
  const onUp = () => {
    if (!dragging.current) return
    dragging.current = false
    mark()
    const snapped = ((Math.round(posRef.current) % N) + N) % N
    setActive(snapped)
    setTimeout(() => { moved.current = false }, 0)
  }

  return (
    <div className="r3f-section" id="proyectos">
      <div
        className="r3f-glow"
        style={{ background: `radial-gradient(ellipse at 50% 45%, ${current.accent}24 0%, transparent 66%)` }}
      />

      <div
        className="r3f-stage"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        <Canvas camera={{ position: [0, 0, 5.4], fov: 42 }} gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
          <Rig active={active} posRef={posRef} dragging={dragging} />
          {textures.length === N && projects.map((_, i) => (
            <Card key={i} i={i} tex={textures[i]} posRef={posRef} onPick={pick} />
          ))}
        </Canvas>
      </div>

      {/* Active project info (HTML overlay) */}
      <div className="r3f-info">
        <span className={`coverflow-card-badge badge-${current.statusType}`} style={{ position: 'static' }}>
          <span className="badge-dot" />
          {current.status}
        </span>
        <h3 className="r3f-title">{current.title}</h3>
        <p className="r3f-desc">{current.description}</p>
        <a className="r3f-link" href={current.link} target="_blank" rel="noopener noreferrer" style={{ color: current.accent }}>
          Ver proyecto <span className="link-arrow">→</span>
        </a>
      </div>

      {/* Controls */}
      <div className="coverflow-controls">
        <button className="coverflow-arrow" onClick={prev} aria-label="Anterior">‹</button>
        <div className="coverflow-dots">
          {projects.map((_, i) => (
            <button
              key={i}
              className="coverflow-dot"
              onClick={() => goTo(i)}
              aria-label={`Ir a ${projects[i].title}`}
              style={{
                width: active === i ? 28 : 10,
                background: active === i ? current.accent : 'rgba(0,0,0,0.14)',
                transition: 'all 0.35s ease',
              }}
            />
          ))}
        </div>
        <button className="coverflow-arrow" onClick={next} aria-label="Siguiente">›</button>
      </div>
    </div>
  )
}

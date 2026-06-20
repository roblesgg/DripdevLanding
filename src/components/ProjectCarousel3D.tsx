'use client'

import { useEffect, useRef, useState } from 'react'
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
const CARD_W = 2.0
const CARD_H = 2.66

function roundRect(x: CanvasRenderingContext2D, X: number, Y: number, w: number, h: number, r: number) {
  x.beginPath()
  x.moveTo(X + r, Y)
  x.arcTo(X + w, Y, X + w, Y + h, r)
  x.arcTo(X + w, Y + h, X, Y + h, r)
  x.arcTo(X, Y + h, X, Y, r)
  x.arcTo(X, Y, X + w, Y, r)
  x.closePath()
}

function wrapText(x: CanvasRenderingContext2D, text: string, X: number, Y: number, maxW: number, lineH: number) {
  const words = text.split(' ')
  let line = ''
  let yy = Y
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (x.measureText(test).width > maxW && line) {
      x.fillText(line, X, yy)
      line = w
      yy += lineH
    } else line = test
  }
  x.fillText(line, X, yy)
}

// Bake the whole card (icon + badge + title + description + link) into a texture
function bakeCard(project: Project): Promise<THREE.Texture> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const W = 560, H = 745
      const c = document.createElement('canvas')
      c.width = W; c.height = H
      const x = c.getContext('2d')!
      const F = 'Inter, -apple-system, sans-serif'

      // card body
      x.shadowColor = 'rgba(20,25,50,0.22)'; x.shadowBlur = 48; x.shadowOffsetY = 22
      const bg = x.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#f3f5fb')
      x.fillStyle = bg
      roundRect(x, 28, 24, W - 56, H - 48, 46); x.fill()
      x.shadowColor = 'transparent'

      // top visual area (accent)
      x.save()
      roundRect(x, 28, 24, W - 56, 296, 46); x.clip()
      const va = x.createLinearGradient(0, 24, 0, 320)
      va.addColorStop(0, project.accent + '33'); va.addColorStop(1, project.accent + '0d')
      x.fillStyle = va; x.fillRect(28, 24, W - 56, 296)
      const gg = x.createRadialGradient(W / 2, 176, 0, W / 2, 176, 175)
      gg.addColorStop(0, project.accent + '4a'); gg.addColorStop(1, project.accent + '00')
      x.fillStyle = gg; x.fillRect(0, 0, W, 320)
      x.restore()

      // icon
      const iw = 188
      x.drawImage(img, (W - iw) / 2, 176 - iw / 2, iw, iw)

      // badge pill (top-right)
      const live = project.statusType === 'live'
      const col = live ? '#16a34a' : '#2563eb'
      const bgc = live ? 'rgba(22,163,74,0.14)' : 'rgba(37,99,235,0.14)'
      x.font = '700 21px ' + F
      x.textAlign = 'left'
      const tw = x.measureText(project.status).width
      const pad = 16, dot = 8, gap = 8, ph = 38
      const pw = pad * 2 + dot + gap + tw
      const px = W - 52 - pw, py = 48
      x.fillStyle = bgc; roundRect(x, px, py, pw, ph, ph / 2); x.fill()
      x.fillStyle = col; x.beginPath(); x.arc(px + pad + dot / 2, py + ph / 2, dot / 2, 0, Math.PI * 2); x.fill()
      x.fillStyle = col; x.fillText(project.status, px + pad + dot + gap, py + ph / 2 + 7)

      // title (fit to width)
      let ts = 48
      do { x.font = `900 ${ts}px ${F}`; if (x.measureText(project.title).width <= W - 104) break; ts -= 2 } while (ts > 26)
      x.fillStyle = '#0a0a0a'; x.textAlign = 'left'
      x.fillText(project.title, 52, 400)

      // description
      x.fillStyle = '#6b7280'; x.font = '500 25px ' + F
      wrapText(x, project.description, 52, 452, W - 104, 36)

      // link
      x.fillStyle = project.accent; x.font = '800 27px ' + F
      x.fillText('Ver proyecto  →', 52, H - 64)

      const t = new THREE.CanvasTexture(c)
      t.anisotropy = 8; t.needsUpdate = true
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
  const hover = useRef(0)
  useFrame((state) => {
    const grp = g.current
    if (!grp) return
    const rel = wrapRel(i, posRef.current)
    const a = Math.abs(rel)
    const t = state.clock.elapsedTime
    // float + gentle bob; active card lifts a touch
    const lift = Math.max(0, 1 - a) * (0.12 + hover.current * 0.12)
    grp.position.x = rel * 2.05
    grp.position.y = Math.sin(t * 1.1 + i * 1.7) * 0.05 + lift
    grp.position.z = -a * 1.85
    grp.rotation.y = -rel * 0.5
    grp.rotation.z = Math.sin(t * 0.8 + i) * 0.012
    const sc = Math.max(0.5, 1 - a * 0.13) * (1 + hover.current * 0.04)
    grp.scale.setScalar(sc + (grp.scale.x - sc) * 0)   // direct
    grp.renderOrder = Math.round((2 - a) * 10)
    if (mat.current) mat.current.opacity = Math.max(0.3, 1 - a * 0.5)
    hover.current += ((grp.userData.hovered ? 1 : 0) - hover.current) * 0.15
  })
  return (
    <group
      ref={g}
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onPick(i) }}
      onPointerOver={(e) => { e.stopPropagation(); if (g.current) g.current.userData.hovered = true; document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { if (g.current) g.current.userData.hovered = false; document.body.style.cursor = '' }}
    >
      <mesh>
        <planeGeometry args={[CARD_W, CARD_H]} />
        <meshBasicMaterial ref={mat} map={tex} transparent depthWrite={false} />
      </mesh>
    </group>
  )
}

function Rig({ activeRef, posRef, dragging, velRef, onSettle }: {
  activeRef: React.MutableRefObject<number>
  posRef: React.MutableRefObject<number>
  dragging: React.MutableRefObject<boolean>
  velRef: React.MutableRefObject<number>
  onSettle: (i: number) => void
}) {
  useFrame(() => {
    if (dragging.current) return
    if (Math.abs(velRef.current) > 0.0008) {
      // inertia
      posRef.current += velRef.current
      velRef.current *= 0.9
      if (Math.abs(velRef.current) <= 0.0008) {
        const snapped = ((Math.round(posRef.current) % N) + N) % N
        onSettle(snapped)
      }
    } else {
      // ease to the active card (shortest wrapped path)
      let d = activeRef.current - posRef.current
      while (d > N / 2) d -= N
      while (d < -N / 2) d += N
      posRef.current += d * 0.1
      if (Math.abs(d) < 0.001) posRef.current = activeRef.current
    }
  })
  return null
}

export default function ProjectCarousel3D() {
  const [active, setActive] = useState(0)
  const [textures, setTextures] = useState<THREE.Texture[]>([])
  const activeRef = useRef(0)
  const posRef = useRef(0)
  const velRef = useRef(0)
  const dragging = useRef(false)
  const moved = useRef(false)
  const dragStart = useRef({ x: 0, pos: 0 })
  const lastMove = useRef({ x: 0, t: 0 })
  const lastInteraction = useRef(0)
  const current = projects[active]

  useEffect(() => { activeRef.current = active }, [active])

  useEffect(() => {
    let alive = true
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts
    const run = () => Promise.all(projects.map(bakeCard)).then((t) => { if (alive) setTextures(t) })
    if (fonts?.ready) fonts.ready.then(run); else run()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() - lastInteraction.current < PAUSE_AFTER) return
      setActive((p) => (p + 1) % N)
    }, AUTO_INTERVAL)
    return () => clearInterval(id)
  }, [])

  const mark = () => { lastInteraction.current = Date.now() }
  const goTo = (i: number) => { mark(); velRef.current = 0; setActive(((i % N) + N) % N) }

  const pick = (i: number) => {
    if (moved.current) return
    if (i === active) window.open(projects[i].link, '_blank', 'noopener,noreferrer')
    else goTo(i)
  }

  const onDown = (e: React.PointerEvent) => {
    dragging.current = true; moved.current = false; velRef.current = 0
    dragStart.current = { x: e.clientX, pos: posRef.current }
    lastMove.current = { x: e.clientX, t: performance.now() }
    mark()
  }
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - dragStart.current.x
    if (Math.abs(dx) > 4) moved.current = true
    posRef.current = dragStart.current.pos - dx / 175
    const now = performance.now()
    const dt = Math.max(1, now - lastMove.current.t)
    velRef.current = -((e.clientX - lastMove.current.x) / 175) * (16 / dt)
    lastMove.current = { x: e.clientX, t: now }
  }
  const onUp = () => {
    if (!dragging.current) return
    dragging.current = false
    mark()
    velRef.current = THREE.MathUtils.clamp(velRef.current, -0.5, 0.5)
    if (Math.abs(velRef.current) < 0.01) {
      const snapped = ((Math.round(posRef.current) % N) + N) % N
      setActive(snapped)
      velRef.current = 0
    }
    setTimeout(() => { moved.current = false }, 0)
  }

  return (
    <div className="r3f-section" id="proyectos">
      <div className="r3f-glow" style={{ background: `radial-gradient(ellipse at 50% 45%, ${current.accent}26 0%, transparent 66%)` }} />

      <div className="r3f-stage" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
        <Canvas camera={{ position: [0, 0, 5.0], fov: 42 }} gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
          <Rig activeRef={activeRef} posRef={posRef} dragging={dragging} velRef={velRef} onSettle={(i) => setActive(i)} />
          {textures.length === N && projects.map((_, i) => (
            <Card key={i} i={i} tex={textures[i]} posRef={posRef} onPick={pick} />
          ))}
        </Canvas>
      </div>

      <div className="coverflow-controls">
        <button className="coverflow-arrow" onClick={() => goTo(active - 1)} aria-label="Anterior">‹</button>
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
        <button className="coverflow-arrow" onClick={() => goTo(active + 1)} aria-label="Siguiente">›</button>
      </div>
    </div>
  )
}

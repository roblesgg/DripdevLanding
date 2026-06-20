'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

function lerpN(a: number, b: number, t: number) { return a + (b - a) * t }

type SmokePart = { m: THREE.Sprite; life: number; maxLife: number; v: THREE.Vector3; grow: number; maxOp: number }

// Fluffy, irregular smoke puff (cloudy texture from many overlapping soft blobs
// → reads as volumetric when layered, same core technique as three.quarks)
function makeSmokeTexture() {
  const size = 256
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  for (let i = 0; i < 42; i++) {
    const ang = Math.random() * Math.PI * 2
    const rad = Math.pow(Math.random(), 0.6) * size * 0.34   // biased to the centre
    const x = size / 2 + Math.cos(ang) * rad
    const y = size / 2 + Math.sin(ang) * rad
    const r = size * (0.10 + Math.random() * 0.17)
    const a = 0.05 + Math.random() * 0.10
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(255,255,255,${a})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

// A thick wide cloud that fully covers the title while the text swaps to the logo
function addTitleSmoke(scene: THREE.Scene, tex: THREE.Texture, center: THREE.Vector3, halfW: number, out: SmokePart[]) {
  for (let i = 0; i < 95; i++) {
    const g = 0.6 + Math.random() * 0.2
    const mat = new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(g, g, g * 1.03), transparent: true, opacity: 0, depthWrite: false })
    mat.rotation = Math.random() * Math.PI * 2
    const s = new THREE.Sprite(mat)
    s.position.copy(center).add(new THREE.Vector3((Math.random() - 0.5) * halfW * 2.0, (Math.random() - 0.5) * halfW * 0.9, (Math.random() - 0.5) * 2.5))
    s.scale.setScalar(halfW * 0.8 + Math.random() * halfW * 0.8)
    scene.add(s)
    const L = 3.2 + Math.random() * 1.8
    out.push({
      m: s, life: L, maxLife: L, grow: halfW * 0.55 + Math.random() * halfW * 0.5, maxOp: 0.95,
      v: new THREE.Vector3((Math.random() - 0.5) * 0.55, 0.06 + Math.random() * 0.3, (Math.random() - 0.5) * 0.55),
    })
  }
}

function addPuff(scene: THREE.Scene, tex: THREE.Texture, pos: THREE.Vector3, out: SmokePart[], big: boolean) {
  const n = big ? 36 : 1
  for (let i = 0; i < n; i++) {
    const g = 0.58 + Math.random() * 0.22
    const mat = new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(g, g, g * 1.03), transparent: true, opacity: 0, depthWrite: false })
    mat.rotation = Math.random() * Math.PI * 2
    const s = new THREE.Sprite(mat)
    const spread = big ? 3.8 : 0.6
    s.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread * 0.6, (Math.random() - 0.5) * spread))
    s.scale.setScalar((big ? 2.4 : 1.0) + Math.random() * 1.4)
    scene.add(s)
    const L = (big ? 3.0 : 1.2) + Math.random() * (big ? 1.6 : 0.8)
    out.push({
      m: s, life: L, maxLife: L, grow: (big ? 2.6 : 1.0) + Math.random() * 1.6, maxOp: 0.55,
      v: new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.12 + Math.random() * 0.4, (Math.random() - 0.5) * 0.5),
    })
  }
}

type Phase = 'idle' | 'fly' | 'settle' | 'fadeout'

export default function EasterEggJet({ onImpact }: { onImpact: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const phaseRef = useRef<Phase>('idle')
  const launchRef = useRef<(() => void) | null>(null)
  const onImpactRef = useRef(onImpact)
  const [launched, setLaunched] = useState(false)

  useEffect(() => { onImpactRef.current = onImpact }, [onImpact])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false

    ;(async () => {
      try {
        await new Promise(r => requestAnimationFrame(r))

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setSize(window.innerWidth, window.innerHeight, false)
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.setClearColor(0x000000, 0)

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 2000)
        camera.position.set(0, 0, 30)
        camera.lookAt(0, 0, 0)

        const resize = () => {
          renderer.setSize(window.innerWidth, window.innerHeight, false)
          camera.aspect = window.innerWidth / window.innerHeight
          camera.updateProjectionMatrix()
        }
        window.addEventListener('resize', resize)

        scene.add(new THREE.AmbientLight(0xffffff, 1.9))
        const sun = new THREE.DirectionalLight(0xffffff, 2.6); sun.position.set(6, 12, 10); scene.add(sun)
        const fill = new THREE.DirectionalLight(0x88aaff, 1.2); fill.position.set(-8, 4, -6); scene.add(fill)

        const smokeTex = makeSmokeTexture()

        const gltf = await new GLTFLoader().loadAsync('/f16.glb')
        if (cancelled) return
        const model = gltf.scene
        const msz = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
        model.scale.setScalar(3.0 / Math.max(msz.x, msz.y, msz.z))
        const mc = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3())
        model.position.sub(mc)
        model.traverse((o: THREE.Object3D) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true } })
        // Landing gear retracted (gear-up)
        model.traverse((o: THREE.Object3D) => {
          if (o.name.includes('landingOff')) o.visible = true
          else if (o.name.includes('landingOn')) o.visible = false
        })

        const roller = new THREE.Group(); roller.add(model)
        const jet = new THREE.Group(); jet.add(roller); jet.visible = false; scene.add(jet)

        // Afterburner cone out the tail
        const fb = new THREE.Box3().setFromObject(model)
        const abMat = new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
        const ab = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3.0, 14, 1, true), abMat)
        ab.rotation.z = Math.PI / 2
        ab.position.x = fb.min.x - 1.2
        model.add(ab)

        const smoke: SmokePart[] = []
        const tmpV = new THREE.Vector3()
        const jetPos = new THREE.Vector3()
        const worldFromNdc = (nx: number, ny: number, dist: number, out: THREE.Vector3) => {
          tmpV.set(nx, ny, 0.5).unproject(camera).sub(camera.position).normalize()
          return out.copy(camera.position).addScaledVector(tmpV, dist)
        }

        const DIST = 27
        const START_NDCY = -1.3            // below the screen (where the button is)
        const END_NDCY = 1.45              // off the top
        let titleNdcY = 0.4
        let titleWorldY = 0
        const titleCenter = new THREE.Vector3()
        let titleHalfW = 4
        let curve: THREE.CatmullRomCurve3 | null = null
        let phaseT = 0
        let released = false
        let trailT = 0
        let last = performance.now()
        const X_AXIS = new THREE.Vector3(1, 0, 0)
        const DUR = { fly: 8.8, settle: 3.0 }
        const smoothstep = (x: number) => { const c = THREE.MathUtils.clamp(x, 0, 1); return c * c * (3 - 2 * c) }

        // Lock / unlock page scroll while the jet is flying
        let scrollLock: (() => void) | null = null
        const lockScroll = () => {
          if (scrollLock) return
          const b = document.body.style, h = document.documentElement.style
          const pb = b.overflow, ph = h.overflow
          b.overflow = 'hidden'; h.overflow = 'hidden'
          scrollLock = () => { b.overflow = pb; h.overflow = ph; scrollLock = null }
        }

        const launch = () => {
          if (phaseRef.current !== 'idle') return
          // Jump to the top INSTANTLY so the view is fixed (camera never follows),
          // then the jet flies up from the bottom to the letters.
          const html = document.documentElement
          const prev = html.style.scrollBehavior
          html.style.scrollBehavior = 'auto'
          window.scrollTo(0, 0)
          html.style.scrollBehavior = prev
          let titleNdcW = 0.6
          const el = document.querySelector('.hero-title')
          if (el) {
            const r = el.getBoundingClientRect()
            titleNdcY = THREE.MathUtils.clamp(1 - 2 * ((r.top + r.height / 2) / window.innerHeight), -0.6, 0.78)
            titleNdcW = r.width / window.innerWidth
          }
          // Title position (lowered a touch so the smoke sits ON the letters) + width
          worldFromNdc(0, titleNdcY - 0.18, DIST, titleCenter)
          titleWorldY = titleCenter.y
          titleHalfW = Math.max(3, Math.abs(worldFromNdc(titleNdcW, titleNdcY, DIST, new THREE.Vector3()).x - titleCenter.x))

          // Smooth flight path (CatmullRom): a gentle rising spiral up to the
          // letters and off the top — no tight loops, fluid banking.
          // Y is strictly increasing → it never dips: it just keeps climbing.
          const wp: [number, number, number][] = [
            [0.0, -1.35, 0], [0.22, -0.95, 1.4], [0.0, -0.55, -1.4], [-0.22, -0.12, 1.2],
            [0.08, 0.12, -0.7], [0.06, titleNdcY - 0.16, 0.3],   // straighten toward the centre…
            // …then a STRAIGHT vertical exit (all x=0, z=0 → no break, just up & away)
            [0.0, titleNdcY - 0.02, 0], [0.0, titleNdcY + 0.4, 0], [0.0, 1.15, 0], [0.0, 1.6, 0],
          ]
          const pts = wp.map(([x, y, z]) => { const p = worldFromNdc(x, y, DIST, new THREE.Vector3()); p.z += z; return p })
          curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5)
          lockScroll()
          canvas.style.opacity = '1'
          jet.visible = true
          released = false; phaseT = 0
          phaseRef.current = 'fly'
          setLaunched(true)
        }
        launchRef.current = launch

        const tick = () => {
          if (cancelled) return
          rafRef.current = requestAnimationFrame(tick)
          const now = performance.now()
          const dt = Math.min((now - last) / 1000, 0.05)
          last = now
          const phase = phaseRef.current

          if (phase === 'fly') {
            phaseT += dt / DUR.fly
            const t = Math.min(phaseT, 1)
            if (curve) {
              curve.getPointAt(t, jet.position)                 // arc-length → constant speed
              curve.getTangentAt(t, tmpV)                       // smooth tangent → fluid banking
              jet.quaternion.setFromUnitVectors(X_AXIS, tmpV)   // nose follows the path
              // ONE smooth barrel roll mid-climb (no constant spinning)
              model.rotation.x = smoothstep((t - 0.46) / 0.3) * Math.PI * 2
            }
            abMat.opacity = 0.55 * (0.7 + Math.random() * 0.3)
            ab.scale.x = 0.8 + Math.random() * 0.5

            // Smoke trail
            trailT += dt
            if (trailT > 0.04) { trailT = 0; addPuff(scene, smokeTex, jet.position, smoke, false) }

            // Big WIDE cloud over the whole title, released a bit EARLY; the
            // text→logo swap happens hidden behind it.
            if (!released && jet.position.y >= titleWorldY - 2.4) {
              released = true
              addTitleSmoke(scene, smokeTex, titleCenter, titleHalfW, smoke)
              onImpactRef.current()
            }
            if (phaseT >= 1) { jet.visible = false; phaseRef.current = 'settle'; phaseT = 0 }

          } else if (phase === 'settle') {
            phaseT += dt / DUR.settle
            if (phaseT >= 1) { phaseRef.current = 'fadeout'; phaseT = 0 }

          } else if (phase === 'fadeout') {
            const cur = parseFloat(canvas.style.opacity || '1')
            canvas.style.opacity = String(Math.max(0, cur - dt * 1.3))
            if (cur <= 0.05) {
              for (const s of smoke) { scene.remove(s.m); (s.m.material as THREE.SpriteMaterial).dispose() }
              smoke.length = 0
              renderer.render(scene, camera)
              canvas.style.opacity = '1'
              scrollLock?.()                 // re-enable page scroll
              phaseRef.current = 'idle'
              setLaunched(false)
            }
          }

          // Smoke puffs: drift, grow, fade in then slowly out
          for (let i = smoke.length - 1; i >= 0; i--) {
            const s = smoke[i]
            s.life -= dt
            s.m.position.addScaledVector(s.v, dt * 3)
            s.v.multiplyScalar(0.97)
            s.m.scale.setScalar(s.m.scale.x + s.grow * dt)
            const t = s.life / s.maxLife
            ;(s.m.material as THREE.SpriteMaterial).opacity = Math.max(0, Math.min(1, (1 - t) * 12) * Math.min(1, t * 2.6) * s.maxOp)
            if (s.life <= 0) { scene.remove(s.m); (s.m.material as THREE.SpriteMaterial).dispose(); smoke.splice(i, 1) }
          }

          if (phase !== 'idle') renderer.render(scene, camera)
        }
        tick()

      } catch (err) {
        console.error('[EasterEggJet]', err)
      }
    })()

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [])

  return (
    <>
      <canvas ref={canvasRef} className="jet-canvas-overlay" />
      <div className="jet-launch-wrap">
        <button
          className="jet-launch-btn"
          onClick={() => launchRef.current?.()}
          aria-label="Despegar F-16"
          style={launched ? { opacity: 0.35, pointerEvents: 'none' } : undefined}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
        </button>
      </div>
    </>
  )
}

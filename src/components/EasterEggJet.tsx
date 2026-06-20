'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

function lerpN(a: number, b: number, t: number) { return a + (b - a) * t }

type SmokePart = { m: THREE.Sprite; life: number; maxLife: number; v: THREE.Vector3; grow: number }

// Soft billboard sprites (same core technique as three.quarks / three-nebula)
function makeSmokeTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.4)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

function addPuff(scene: THREE.Scene, tex: THREE.Texture, pos: THREE.Vector3, out: SmokePart[], big: boolean) {
  const n = big ? 36 : 1
  for (let i = 0; i < n; i++) {
    const g = 0.58 + Math.random() * 0.22
    const mat = new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(g, g, g * 1.03), transparent: true, opacity: 0, depthWrite: false })
    const s = new THREE.Sprite(mat)
    const spread = big ? 3.8 : 0.6
    s.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread * 0.6, (Math.random() - 0.5) * spread))
    s.scale.setScalar((big ? 2.4 : 1.0) + Math.random() * 1.4)
    scene.add(s)
    const L = (big ? 3.0 : 1.2) + Math.random() * (big ? 1.6 : 0.8)
    out.push({
      m: s, life: L, maxLife: L, grow: (big ? 2.6 : 1.0) + Math.random() * 1.6,
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
        let phaseT = 0
        let released = false
        let trailT = 0
        let last = performance.now()
        const DUR = { fly: 8.4, settle: 3.0 }

        const launch = () => {
          if (phaseRef.current !== 'idle') return
          // Jump to the top INSTANTLY so the view is fixed (camera never follows),
          // then the jet flies up from the bottom to the letters.
          const html = document.documentElement
          const prev = html.style.scrollBehavior
          html.style.scrollBehavior = 'auto'
          window.scrollTo(0, 0)
          html.style.scrollBehavior = prev
          const el = document.querySelector('.hero-title')
          if (el) {
            const r = el.getBoundingClientRect()
            titleNdcY = THREE.MathUtils.clamp(1 - 2 * ((r.top + r.height / 2) / window.innerHeight), -0.6, 0.78)
          }
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
            const u = Math.min(phaseT, 1)
            const env = Math.sin(Math.min(u, 0.97) * Math.PI)   // 0 at ends, 1 mid
            const baseY = lerpN(START_NDCY, END_NDCY, u)

            // Smooth weave + a vertical LOOP (pirouette) in the lower-middle
            let nx = Math.sin(u * Math.PI * 2) * 0.16 * env
            let ny = baseY
            let pitch = Math.PI / 2                              // nose straight up by default
            if (u > 0.25 && u < 0.5) {
              const a = ((u - 0.25) / 0.25) * Math.PI * 2        // one full loop
              const lr = 0.3
              nx += (1 - Math.cos(a)) * lr
              ny += Math.sin(a) * lr
              pitch = Math.atan2(Math.cos(a), Math.sin(a))       // nose follows the loop
            }
            worldFromNdc(nx, ny, DIST, jetPos)

            // gentle circular spiral for 3D depth
            const sang = u * Math.PI * 2 * 2.4
            const srad = 1.5
            jet.position.set(jetPos.x + Math.cos(sang) * srad * 0.4, jetPos.y, jetPos.z + Math.sin(sang) * srad)
            roller.rotation.set(0, 0, pitch)

            // Barrel roll (a roll on itself) after the loop, on the way up
            const rollP = THREE.MathUtils.clamp((u - 0.55) / 0.33, 0, 1)
            model.rotation.x = rollP * Math.PI * 2 * 2           // two clean rolls

            abMat.opacity = 0.55 * (0.7 + Math.random() * 0.3)
            ab.scale.x = 0.8 + Math.random() * 0.5

            // Light smoke trail
            trailT += dt
            if (trailT > 0.07) { trailT = 0; addPuff(scene, smokeTex, jet.position, smoke, false) }

            // Passing the letters → a big 3D smoke cloud + swap to the logo
            if (!released && ny >= titleNdcY) {
              released = true
              worldFromNdc(0, titleNdcY, DIST, tmpV)
              addPuff(scene, smokeTex, tmpV, smoke, true)
              addPuff(scene, smokeTex, tmpV, smoke, true)   // extra: more smoke at the swap
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
            ;(s.m.material as THREE.SpriteMaterial).opacity = Math.max(0, Math.min(1, (1 - t) * 6) * Math.min(1, t * 2.6) * 0.6)
            if (s.life <= 0) { scene.remove(s.m); (s.m.material as THREE.SpriteMaterial).dispose(); smoke.splice(i, 1) }
          }

          if (phase !== 'idle') renderer.render(scene, camera)
        }
        tick()

      } catch (err) {
        console.error('[EasterEggJet]', err)
      }
    })()

    return () => { cancelled = true; if (rafRef.current) cancelAnimationFrame(rafRef.current) }
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

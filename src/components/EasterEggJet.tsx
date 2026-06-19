'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

function easeIn(t: number)  { return t * t }
function lerpN(a: number, b: number, t: number) { return a + (b-a)*t }

type ExpPart = { m: THREE.Mesh, v: THREE.Vector3, life: number, spin: number }

function spawnExplosion(scene: THREE.Scene, pos: THREE.Vector3, out: ExpPart[]) {
  const cols = [0xff6600,0xff3300,0xffaa00,0xffffff,0xff0044,0x44aaff,0xffee00,0xff8800]
  for (let i = 0; i < 150; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: cols[Math.floor(Math.random()*cols.length)], transparent: true, opacity: 1 })
    const sz  = 0.05 + Math.random() * 0.45
    const geo = Math.random() > 0.4 ? new THREE.BoxGeometry(sz,sz,sz) : new THREE.SphereGeometry(sz*0.55,5,5)
    const m   = new THREE.Mesh(geo, mat)
    m.position.copy(pos)
    scene.add(m)
    const theta = Math.random()*Math.PI*2, phi = Math.random()*Math.PI, spd = 0.06+Math.random()*0.36
    out.push({
      m, life: 0.8+Math.random()*0.6, spin: (Math.random()-0.5)*0.25,
      v: new THREE.Vector3(Math.sin(phi)*Math.cos(theta)*spd, Math.sin(phi)*Math.sin(theta)*spd*0.8+0.05, Math.cos(phi)*spd*0.6)
    })
  }
}

type Phase = 'loading'|'ground'|'taxi'|'return'|'climb'|'impact'|'fadeout'

export default function EasterEggJet({ onImpact }: { onImpact: () => void }) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const rafRef      = useRef<number|null>(null)
  const phaseRef    = useRef<Phase>('loading')
  const launchRef   = useRef<(()=>void)|null>(null)
  const onImpactRef = useRef(onImpact)
  const [launched, setLaunched] = useState(false)
  const [hint,     setHint]     = useState('Cargando F-16…')
  const [done,     setDone]     = useState(false)

  useEffect(() => { onImpactRef.current = onImpact }, [onImpact])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false

    ;(async () => {
      try {
        await new Promise(r => requestAnimationFrame(r))
        await new Promise(r => requestAnimationFrame(r))

        const W0 = canvas.clientWidth || 960
        const H0 = canvas.clientHeight || 360

        // alpha:false → the canvas is ALWAYS opaque, so the jet is guaranteed
        // visible in every browser (no transparent-compositing issues)
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setSize(W0, H0, false)
        renderer.outputColorSpace = THREE.SRGBColorSpace

        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0x0a0e1a)   // night sky

        const GROUND_Y = -2

        const camera = new THREE.PerspectiveCamera(40, W0/H0, 0.01, 1000)
        const CAM_GROUND = new THREE.Vector3(0, 0.4, 14)
        const LOOK_GROUND = new THREE.Vector3(0, GROUND_Y + 0.6, 0)
        camera.position.copy(CAM_GROUND)
        camera.lookAt(LOOK_GROUND)

        scene.add(new THREE.AmbientLight(0xffffff, 1.7))
        const sun = new THREE.DirectionalLight(0xffffff, 2.8); sun.position.set(8, 16, 12); scene.add(sun)
        const fill = new THREE.DirectionalLight(0x88aaff, 1.3); fill.position.set(-8, 4, -6); scene.add(fill)
        const engineGlow = new THREE.PointLight(0xff8800, 0, 24); scene.add(engineGlow)

        // Runway line
        const runway = new THREE.Mesh(
          new THREE.PlaneGeometry(80, 0.05),
          new THREE.MeshBasicMaterial({ color: 0x3a4570, transparent: true, opacity: 0.55 })
        )
        runway.position.set(0, GROUND_Y - 0.02, 0)
        scene.add(runway)

        // Spinning cube while the model loads
        const testBox = new THREE.Mesh(
          new THREE.BoxGeometry(1,1,1),
          new THREE.MeshPhongMaterial({ color: 0x6366f1 })
        )
        testBox.position.set(0, GROUND_Y + 0.6, 0)
        scene.add(testBox)
        renderer.render(scene, camera)

        const gltf = await new Promise<{ scene: THREE.Group }>((res, rej) =>
          new GLTFLoader().load(
            '/f16.glb',
            res as () => void,
            (e) => { if (e.total) setHint(`Cargando F-16… ${Math.round(e.loaded/e.total*100)}%`) },
            rej
          )
        )

        scene.remove(testBox)
        testBox.geometry.dispose()

        const jet = gltf.scene

        // Smaller — normalise longest axis to 4.5 units
        const box    = new THREE.Box3().setFromObject(jet)
        const size   = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        jet.scale.setScalar(4.5 / maxDim)

        const box2 = new THREE.Box3().setFromObject(jet)
        box2.getCenter(jet.position).negate()

        const pivot = new THREE.Group()
        pivot.add(jet)
        scene.add(pivot)
        pivot.rotation.y = Math.PI   // nose faces LEFT (parked)

        jet.traverse((c: THREE.Object3D) => {
          const mesh = c as THREE.Mesh
          if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true }
        })

        // Landing gear: model ships both states as separate nodes
        const gearDown: THREE.Object3D[] = []
        const gearUp:   THREE.Object3D[] = []
        jet.traverse((o: THREE.Object3D) => {
          if (o.name.includes('landingOff')) gearUp.push(o)
          else if (o.name.includes('landingOn')) gearDown.push(o)
        })
        const setGear = (down: boolean) => {
          gearDown.forEach(o => { o.visible = down })
          gearUp.forEach(o => { o.visible = !down })
        }
        setGear(true)

        // Sit wheels on the runway
        const jetBox = new THREE.Box3().setFromObject(pivot)
        const restY = GROUND_Y - jetBox.min.y + pivot.position.y
        pivot.position.y = restY

        // Afterburner cones (tail at model −X after the Y-flip)
        const mkCone = (color: number, r: number, h: number, op: number) => {
          const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op })
          return new THREE.Mesh(new THREE.ConeGeometry(r, h, 14), mat)
        }
        const flames = [
          { mesh: mkCone(0xffffff, 0.12, 0.5, 0.95), baseOp: 0.95 },
          { mesh: mkCone(0xffee44, 0.18, 0.9, 0.90), baseOp: 0.90 },
          { mesh: mkCone(0xff8800, 0.25, 1.4, 0.80), baseOp: 0.80 },
          { mesh: mkCone(0xff3300, 0.30, 2.0, 0.55), baseOp: 0.55 },
        ]
        const fb = new THREE.Box3().setFromObject(jet)
        const tailX = fb.min.x - 0.15
        flames.forEach(({ mesh }) => {
          mesh.rotation.z = Math.PI / 2
          mesh.position.set(tailX, (fb.min.y + fb.max.y) / 2, 0)
          jet.add(mesh)
          mesh.visible = false
        })

        // Render the parked jet immediately so it's visible BEFORE any click
        renderer.render(scene, camera)

        setHint('✈  Haz clic para despegar')
        phaseRef.current = 'ground'

        const FLY_Y = GROUND_Y + 3.2   // cruising altitude on the return pass
        const expParts: ExpPart[] = []
        let globalT = 0, phaseT = 0
        let lastTime = performance.now()
        let scrollFrom = 0
        const setFlames = (on: boolean) => flames.forEach(({ mesh }) => { mesh.visible = on })

        const launch = () => {
          const W = window.innerWidth, H = window.innerHeight
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
          renderer.setSize(W, H, false)
          camera.aspect = W / H
          camera.updateProjectionMatrix()
          setFlames(true)
          engineGlow.intensity = 12
          scrollFrom = window.scrollY
          phaseRef.current = 'taxi'; phaseT = 0
        }
        launchRef.current = launch

        const tick = () => {
          if (cancelled) return
          rafRef.current = requestAnimationFrame(tick)
          const now = performance.now()
          const dt = Math.min((now - lastTime) / 1000, 0.05)
          lastTime = now
          globalT += dt; phaseT += dt

          flames.forEach(({ mesh, baseOp }) => {
            const mat = mesh.material as THREE.MeshBasicMaterial
            mat.opacity = baseOp * (0.7 + Math.random() * 0.3)
            mesh.scale.x = 0.8 + Math.random() * 0.5
            mesh.scale.y = mesh.scale.z = 0.85 + Math.random() * 0.3
          })

          const phase = phaseRef.current

          if (phase === 'ground') {
            // Parked at the bottom, straight, gear down
            pivot.position.set(0, restY, 0)
            pivot.rotation.set(0, Math.PI, 0)
            camera.position.copy(CAM_GROUND); camera.lookAt(LOOK_GROUND)

          } else if (phase === 'taxi') {
            // Accelerate along the ground to the LEFT, gear down, until off-screen
            const DUR = 2.0, p = Math.min(phaseT / DUR, 1)
            pivot.position.x = lerpN(0, -22, easeIn(p))
            pivot.position.y = restY
            pivot.rotation.set(0, Math.PI, 0)
            engineGlow.position.copy(pivot.position)
            engineGlow.intensity = 13 + Math.random() * 5
            camera.position.copy(CAM_GROUND); camera.lookAt(LOOK_GROUND)
            if (p >= 1) {
              // Off-screen: turn around + retract gear, ready to fly back in
              setGear(false)
              phaseRef.current = 'return'; phaseT = 0
            }

          } else if (phase === 'return') {
            // Re-enter from the left, FLYING (gear up, nose right), to the center
            const DUR = 2.2, p = Math.min(phaseT / DUR, 1)
            pivot.position.x = lerpN(-24, 0, p)              // linear, constant speed
            pivot.position.y = FLY_Y + Math.sin(globalT * 1.5) * 0.15
            pivot.rotation.set(0, 0, 0)                      // nose faces RIGHT now
            engineGlow.position.copy(pivot.position)
            engineGlow.intensity = 15 + Math.random() * 5
            camera.position.copy(CAM_GROUND); camera.lookAt(0, FLY_Y, 0)
            if (p >= 1) { phaseRef.current = 'climb'; phaseT = 0 }

          } else if (phase === 'climb') {
            // From the centre, pitch up and climb — slow, continuous, LINEAR
            const DUR = 4.2, p = Math.min(phaseT / DUR, 1)
            pivot.position.x = 0
            pivot.position.y = lerpN(FLY_Y, FLY_Y + 26, p)  // linear climb
            pivot.rotation.set(0, 0, lerpN(0, Math.PI / 2.3, Math.min(p * 2.5, 1)))  // pitch nose up early
            engineGlow.position.copy(pivot.position)
            engineGlow.intensity = 16 + Math.random() * 5
            // Camera rises linearly with the jet — constant velocity tracking
            camera.position.set(0, lerpN(CAM_GROUND.y, CAM_GROUND.y + 26, p), 14)
            camera.lookAt(0, lerpN(FLY_Y, FLY_Y + 26, p) - 1, 0)
            // Scroll the page up to the hero, linearly
            window.scrollTo(0, lerpN(scrollFrom, 0, p))
            if (p >= 1) {
              phaseRef.current = 'impact'; phaseT = 0
              spawnExplosion(scene, pivot.position.clone(), expParts)
              pivot.visible = false; setFlames(false); engineGlow.intensity = 0
              onImpactRef.current()
            }

          } else if (phase === 'impact') {
            const k = dt * 60
            let anyAlive = false
            for (const pt of expParts) {
              if (pt.life > 0) {
                anyAlive = true; pt.life -= 0.013 * k
                pt.m.position.addScaledVector(pt.v, k); pt.v.y -= 0.006 * k
                pt.m.rotation.x += pt.spin * k; pt.m.rotation.z += pt.spin * 0.7 * k
                ;(pt.m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, pt.life * 1.25)
                pt.m.scale.setScalar(Math.max(0.01, 1 - (1 - pt.life) * 0.3))
              } else { pt.m.visible = false }
            }
            if (!anyAlive || phaseT > 2) { phaseRef.current = 'fadeout'; phaseT = 0 }

          } else if (phase === 'fadeout') {
            const cur = parseFloat(canvas.style.opacity || '1')
            canvas.style.opacity = String(Math.max(0, cur - 0.04 * dt * 60))
            if (cur <= 0.05) { cancelled = true; setDone(true); return }
          }

          renderer.render(scene, camera)
        }
        tick()

      } catch (err) {
        console.error('[EasterEggJet]', err)
        setHint('⚠ ' + (err instanceof Error ? err.message : String(err)))
      }
    })()

    return () => { cancelled = true; if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  useEffect(() => {
    if (!launched) return
    requestAnimationFrame(() => { launchRef.current?.() })
  }, [launched])

  if (done) return null

  return (
    <section className="jet-section">
      <p className="jet-hint">{hint}</p>
      <canvas
        ref={canvasRef}
        onClick={() => { if (phaseRef.current === 'ground') setLaunched(true) }}
        className={launched ? 'jet-canvas-fullscreen' : 'jet-canvas-inline'}
      />
    </section>
  )
}

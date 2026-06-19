'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

function easeIn(t: number)    { return t * t * t }
function easeOut(t: number)   { return 1 - Math.pow(1 - t, 3) }
function easeInOut(t: number) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2 }
function lerpN(a: number, b: number, t: number) { return a + (b-a)*t }

type ExpPart = { m: THREE.Mesh, v: THREE.Vector3, life: number, spin: number }

function spawnExplosion(scene: THREE.Scene, pos: THREE.Vector3, out: ExpPart[]) {
  const cols = [0xff6600,0xff3300,0xffaa00,0xffffff,0xff0044,0x44aaff,0xffee00,0xff8800]
  for (let i = 0; i < 140; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: cols[Math.floor(Math.random()*cols.length)], transparent: true, opacity: 1 })
    const sz  = 0.05 + Math.random() * 0.4
    const geo = Math.random() > 0.4 ? new THREE.BoxGeometry(sz,sz,sz) : new THREE.SphereGeometry(sz*0.55,5,5)
    const m   = new THREE.Mesh(geo, mat)
    m.position.copy(pos)
    scene.add(m)
    const theta = Math.random()*Math.PI*2, phi = Math.random()*Math.PI, spd = 0.06+Math.random()*0.34
    out.push({
      m, life: 0.8+Math.random()*0.6, spin: (Math.random()-0.5)*0.25,
      v: new THREE.Vector3(Math.sin(phi)*Math.cos(theta)*spd, Math.sin(phi)*Math.sin(theta)*spd*0.8+0.05, Math.cos(phi)*spd*0.6)
    })
  }
}

type Phase = 'loading'|'ground'|'takeoff'|'flying'|'impact'|'fadeout'

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
        // Let the layout settle so canvas has real dimensions
        await new Promise(r => requestAnimationFrame(r))
        await new Promise(r => requestAnimationFrame(r))

        const W0 = canvas.clientWidth || 960
        const H0 = canvas.clientHeight || 360

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setSize(W0, H0, false)
        renderer.outputColorSpace = THREE.SRGBColorSpace
        // Opaque dark while landed (setClearColor is reliable with alpha:true,
        // unlike scene.background which can composite transparent)
        renderer.setClearColor(0x0a0a14, 1)

        const scene = new THREE.Scene()

        const camera = new THREE.PerspectiveCamera(42, W0/H0, 0.01, 1000)
        camera.position.set(0, 0.8, 11)
        camera.lookAt(0, 0, 0)

        scene.add(new THREE.AmbientLight(0xffffff, 1.5))
        const sun = new THREE.DirectionalLight(0xffffff, 2.6); sun.position.set(8, 16, 12); scene.add(sun)
        const fill = new THREE.DirectionalLight(0x88aaff, 1.1); fill.position.set(-8, 4, -6); scene.add(fill)
        const engineGlow = new THREE.PointLight(0xff8800, 0, 22); scene.add(engineGlow)

        // Spinning cube while the model loads (so the canvas is alive immediately)
        const testBox = new THREE.Mesh(
          new THREE.BoxGeometry(1.4,1.4,1.4),
          new THREE.MeshPhongMaterial({ color: 0x6366f1 })
        )
        scene.add(testBox)
        renderer.render(scene, camera)

        setHint('Cargando modelo…')
        const gltf = await new Promise<{ scene: THREE.Group }>((res, rej) =>
          new GLTFLoader().load('/f16.glb', res as () => void, undefined, rej)
        )

        scene.remove(testBox)
        testBox.geometry.dispose()

        const jet = gltf.scene

        // Normalise scale on the longest axis so the jet fills the frame nicely
        const box    = new THREE.Box3().setFromObject(jet)
        const size   = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        jet.scale.setScalar(11 / maxDim)

        // Center the model on its own origin
        const box2 = new THREE.Box3().setFromObject(jet)
        box2.getCenter(jet.position).negate()

        // Wrap in a pivot group so we can rotate/move cleanly
        const pivot = new THREE.Group()
        pivot.add(jet)
        scene.add(pivot)

        // Model: fuselage runs along X (nose at +X), wings along Z, up = Y.
        // Rotate 180° on Y so the nose faces LEFT (−X on screen) → landed side profile.
        pivot.rotation.y = Math.PI

        jet.traverse((c: THREE.Object3D) => {
          const mesh = c as THREE.Mesh
          if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true }
        })

        // Afterburner cones, pointing out the tail (+X in model space → behind when facing left)
        const mkCone = (color: number, r: number, h: number, op: number) => {
          const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op })
          const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 14), mat)
          return c
        }
        const flames = [
          { mesh: mkCone(0xffffff, 0.16, 0.7, 0.95), baseOp: 0.95 },
          { mesh: mkCone(0xffee44, 0.26, 1.1, 0.90), baseOp: 0.90 },
          { mesh: mkCone(0xff8800, 0.36, 1.8, 0.80), baseOp: 0.80 },
          { mesh: mkCone(0xff3300, 0.42, 2.6, 0.55), baseOp: 0.55 },
        ]
        // Tail is at model −X after the Y-flip → place flames there, pointing further back
        const box3 = new THREE.Box3().setFromObject(jet)
        const tailX = box3.min.x - 0.2
        flames.forEach(({ mesh }) => {
          mesh.rotation.z = Math.PI / 2   // cone axis along X, tip pointing −X
          mesh.position.set(tailX, (box3.min.y + box3.max.y) / 2, 0)
          jet.add(mesh)
          mesh.visible = false
        })

        setHint('✈  Haz clic para despegar')
        phaseRef.current = 'ground'

        const expParts: ExpPart[] = []
        let globalT = 0, phaseT = 0
        let lastTime = performance.now()
        const startScrollY = () => window.scrollY
        let scrollFrom = 0

        const camPos    = new THREE.Vector3().copy(camera.position)
        const camTarget = new THREE.Vector3(0, 0, 0)

        const setFlames = (on: boolean) => flames.forEach(({ mesh }) => { mesh.visible = on })

        const launch = () => {
          const W = window.innerWidth, H = window.innerHeight
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
          renderer.setSize(W, H, false)
          renderer.setClearColor(0x000000, 0)  // transparent: jet flies over the page
          camera.aspect = W / H
          camera.fov = 52
          camera.updateProjectionMatrix()
          setFlames(true)
          engineGlow.intensity = 10
          scrollFrom = startScrollY()
          phaseRef.current = 'takeoff'; phaseT = 0
        }
        launchRef.current = launch

        const tick = () => {
          if (cancelled) return
          rafRef.current = requestAnimationFrame(tick)
          // Real elapsed time (clamped) so the animation runs at the same speed
          // regardless of frame rate — no slow-mo on weaker devices
          const now = performance.now()
          const dt = Math.min((now - lastTime) / 1000, 0.05)
          lastTime = now
          globalT += dt; phaseT += dt

          // Flicker the afterburner
          flames.forEach(({ mesh, baseOp }) => {
            const mat = mesh.material as THREE.MeshBasicMaterial
            mat.opacity = baseOp * (0.7 + Math.random() * 0.3)
            mesh.scale.x = 0.8 + Math.random() * 0.5
            mesh.scale.y = mesh.scale.z = 0.85 + Math.random() * 0.3
          })

          const phase = phaseRef.current

          if (phase === 'ground') {
            // Gentle idle bob, side profile facing left
            pivot.position.y = Math.sin(globalT * 1.6) * 0.08
            pivot.rotation.y = Math.PI + Math.sin(globalT * 0.4) * 0.04
            pivot.rotation.z = Math.sin(globalT * 1.1) * 0.012
            camera.position.set(0, 0.8, 11); camera.lookAt(0, 0, 0)

          } else if (phase === 'takeoff') {
            // Pitch nose up and start to rise; scroll the page toward the top
            const DUR = 2.2, p = Math.min(phaseT / DUR, 1)
            pivot.position.y = lerpN(0, 4, easeIn(p))
            pivot.position.x = lerpN(0, -1.5, p)
            pivot.rotation.y = Math.PI
            pivot.rotation.z = lerpN(0, Math.PI / 2.4, easeInOut(p)) // nose pitches up
            engineGlow.position.copy(pivot.position)
            engineGlow.intensity = 14 + Math.random() * 6
            window.scrollTo(0, lerpN(scrollFrom, 0, easeInOut(p)))
            camTarget.lerp(pivot.position, 0.1)
            camPos.set(lerpN(0, 4, p), pivot.position.y - 2, lerpN(13, 15, p))
            camera.position.lerp(camPos, 0.08); camera.lookAt(camTarget)
            if (p >= 1) { phaseRef.current = 'flying'; phaseT = 0 }

          } else if (phase === 'flying') {
            // Climb to the top of the screen, camera chasing
            const DUR = 2.0, p = Math.min(phaseT / DUR, 1)
            pivot.position.y = lerpN(4, 17, easeOut(p))
            pivot.position.x = -1.5 + Math.sin(globalT * 1.2) * 0.3
            pivot.rotation.z = Math.PI / 2.4 + Math.sin(globalT * 3) * 0.06
            engineGlow.position.copy(pivot.position)
            window.scrollTo(0, 0)
            camTarget.set(pivot.position.x, pivot.position.y + 1.5, 0)
            camPos.set(2, pivot.position.y - 3, 15)
            camera.position.lerp(camPos, 0.08); camera.lookAt(camTarget)
            if (p >= 1) {
              phaseRef.current = 'impact'; phaseT = 0
              spawnExplosion(scene, pivot.position.clone(), expParts)
              pivot.visible = false; setFlames(false); engineGlow.intensity = 0
              onImpactRef.current()
            }

          } else if (phase === 'impact') {
            const shake = Math.max(0, 0.4 - phaseT) * 0.7
            camera.position.x += (Math.random() - 0.5) * shake
            camera.position.y += (Math.random() - 0.5) * shake
            camera.lookAt(camTarget)
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
            if (!anyAlive || phaseT > 3) { phaseRef.current = 'fadeout'; phaseT = 0 }

          } else if (phase === 'fadeout') {
            const cur = parseFloat(canvas.style.opacity || '1')
            canvas.style.opacity = String(Math.max(0, cur - 0.03 * dt * 60))
            if (cur <= 0.04) { cancelled = true; setDone(true); return }
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

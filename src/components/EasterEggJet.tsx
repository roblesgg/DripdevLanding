'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function cubicBezier(
  t: number,
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  out: THREE.Vector3
) {
  const u = 1 - t
  const u2 = u * u
  const u3 = u2 * u
  const t2 = t * t
  const t3 = t2 * t
  out.set(0, 0, 0)
  out.addScaledVector(p0, u3)
  out.addScaledVector(p1, 3 * u2 * t)
  out.addScaledVector(p2, 3 * u * t2)
  out.addScaledVector(p3, t3)
  return out
}

type ExpPart = { m: THREE.Mesh; v: THREE.Vector3; life: number; spin: number }

function spawnExplosion(scene: THREE.Scene, pos: THREE.Vector3, out: ExpPart[], flash: THREE.PointLight) {
  const fireCols = [0xffeebb, 0xffcc33, 0xff8800, 0xff4400, 0xff2200, 0x882200, 0x553322, 0x221111]
  for (let i = 0; i < 160; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: fireCols[Math.floor(Math.random() * fireCols.length)],
      transparent: true,
      opacity: 1,
      depthWrite: false,
    })
    const sz = 0.06 + Math.random() * 0.55
    const geo = new THREE.SphereGeometry(sz * 0.6, 6, 6)
    const m = new THREE.Mesh(geo, mat)
    m.position.copy(pos)
    scene.add(m)
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI * 0.65
    const spd = 0.04 + Math.random() * 0.32
    out.push({
      m,
      life: 0.6 + Math.random() * 0.9,
      spin: (Math.random() - 0.5) * 0.3,
      v: new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * spd,
        Math.sin(phi) * Math.sin(theta) * spd * 0.6 + 0.08 + Math.random() * 0.12,
        Math.cos(phi) * spd * 0.5
      ),
    })
  }
  flash.position.copy(pos)
  flash.intensity = 5
}

type Phase = 'loading' | 'ground' | 'taxi' | 'return' | 'climb' | 'impact' | 'fadeout'

export default function EasterEggJet({ onImpact }: { onImpact: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const phaseRef = useRef<Phase>('loading')
  const launchRef = useRef<(() => void) | null>(null)
  const onImpactRef = useRef(onImpact)
  const [hint, setHint] = useState('Cargando F-16…')
  const [done, setDone] = useState(false)

  useEffect(() => { onImpactRef.current = onImpact }, [onImpact])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false

    const load = async () => {
      await new Promise((r) => requestAnimationFrame(r))
      await new Promise((r) => requestAnimationFrame(r))

      const W0 = canvas.clientWidth || 960
      const H0 = canvas.clientHeight || 320

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(W0, H0, false)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.setClearColor(0x000000, 0)

      const scene = new THREE.Scene()

      const GROUND_Y = -0.85
      const camera = new THREE.PerspectiveCamera(42, W0 / H0, 0.01, 1000)
      const camPos = new THREE.Vector3(0, 1.8, 28)
      const camLook = new THREE.Vector3(0, GROUND_Y + 0.5, 0)
      camera.position.copy(camPos)
      camera.lookAt(camLook)

      scene.add(new THREE.AmbientLight(0xffffff, 2.2))
      const sun = new THREE.DirectionalLight(0xffffff, 3.2)
      sun.position.set(8, 16, 12)
      scene.add(sun)
      const fill = new THREE.DirectionalLight(0xaaccff, 1.8)
      fill.position.set(-8, 4, -6)
      scene.add(fill)
      const rim = new THREE.DirectionalLight(0x4455ff, 1.2)
      rim.position.set(0, 6, -10)
      scene.add(rim)
      const flash = new THREE.PointLight(0xff6600, 0, 18)
      scene.add(flash)

      // Runway
      const runway = new THREE.Mesh(
        new THREE.PlaneGeometry(22, 0.12),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14 })
      )
      runway.rotation.x = -Math.PI / 2
      runway.position.set(0, GROUND_Y + 0.01, 0)
      scene.add(runway)

      // Landing light pool
      const pool = new THREE.Mesh(
        new THREE.CircleGeometry(1.8, 32),
        new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.1 })
      )
      pool.rotation.x = -Math.PI / 2
      pool.position.set(0, GROUND_Y + 0.02, 0)
      scene.add(pool)

      const gltf = await new GLTFLoader().loadAsync('/f16.glb')
      if (cancelled) return

      const model = gltf.scene
      const SCALE = 0.055
      model.scale.setScalar(SCALE)

      let gearOn: THREE.Object3D | null = null
      let gearOff: THREE.Object3D | null = null
      model.traverse((o) => {
        if (o.name.includes('landingOn') || o.name.includes('landingOnLight')) gearOn = o
        if (o.name.includes('landingOff')) gearOff = o
      })

      const jet = new THREE.Group()
      jet.add(model)
      scene.add(jet)

      // Model base: nose points +X. Rotate Y=π so nose points left (-X).
      model.rotation.y = Math.PI
      model.position.y = 0.42

      const parkedX = 4.0
      jet.position.set(parkedX, GROUND_Y, 0)

      const setGear = (down: boolean) => {
        if (gearOn) gearOn.visible = down
        if (gearOff) gearOff.visible = !down
      }
      setGear(true)

      // Trajectory points
      const p0 = new THREE.Vector3(parkedX, GROUND_Y, 0)
      const p1 = new THREE.Vector3(0.5, GROUND_Y, 0)
      const p2 = new THREE.Vector3(-8.0, GROUND_Y, 0)
      const p3 = new THREE.Vector3(-10.5, 0.6, 0)

      const q0 = new THREE.Vector3(-10.5, 0.6, 0)
      const q1 = new THREE.Vector3(-7.5, 1.6, 0)
      const q2 = new THREE.Vector3(-3.0, 2.6, 0)
      const q3 = new THREE.Vector3(0, 5.0, 0)

      const r0 = new THREE.Vector3(0, 5.0, 0)
      const r1 = new THREE.Vector3(0.5, 8.0, 0)
      const r2 = new THREE.Vector3(-0.3, 12.0, 0)
      const r3 = new THREE.Vector3(0, 17.0, 0)

      const pos = new THREE.Vector3()
      const lookTarget = new THREE.Vector3().copy(camLook)

      // Afterburner (child of model so it rotates with the jet)
      const abGeo = new THREE.ConeGeometry(2.2, 18, 16, 1, true)
      const abMat = new THREE.MeshBasicMaterial({
        color: 0xffaa33,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
      const afterburner = new THREE.Mesh(abGeo, abMat)
      afterburner.rotation.z = Math.PI / 2
      afterburner.position.set(-2.8, 0.2, 0)
      model.add(afterburner)
      const getAbMat = () => afterburner.material as THREE.MeshBasicMaterial

      // Ground shadow
      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(2.4, 32),
        new THREE.MeshBasicMaterial({ color: 0x0a0c1a, transparent: true, opacity: 0.35 })
      )
      shadow.rotation.x = -Math.PI / 2
      shadow.position.set(0, -0.42, 0)
      jet.add(shadow)

      const parts: ExpPart[] = []
      let impactCalled = false

      let phase: Phase = 'ground'
      phaseRef.current = 'ground'
      let phaseT = 0

      const setPhase = (p: Phase) => {
        phase = p
        phaseRef.current = p
        phaseT = 0
        if (p === 'taxi') setGear(true)
        if (p === 'return') setGear(false)
      }

      setPhase('ground')
      setHint('✈  Haz clic para despegar')

      const launch = () => {
        if (phase !== 'ground') return
        setPhase('taxi')
      }
      launchRef.current = launch
      canvas.addEventListener('click', launch)

      const targetCamPos = new THREE.Vector3().copy(camPos)
      const targetLook = new THREE.Vector3().copy(camLook)

      const phaseDuration: Record<Exclude<Phase, 'loading' | 'fadeout'>, number> = {
        ground: Infinity,
        taxi: 1.9,
        return: 2.4,
        climb: 3.8,
        impact: 1.1,
      }

      // Euler targets for the model.
      // Model axes: X = fuselage, Y = up, Z = wingspan.
      // So: Y = yaw, Z = pitch, X = roll/bank.
      const modelRot = { x: 0, y: Math.PI, z: 0 }

      let last = performance.now()
      const tick = () => {
        if (cancelled) return
        const now = performance.now()
        const dt = Math.min((now - last) / 1000, 0.05)
        last = now

        const duration = phaseDuration[phase as keyof typeof phaseDuration] || 1
        if (phase !== 'ground') phaseT += dt / duration

        if (phase === 'ground') {
          pos.set(parkedX, GROUND_Y, 0)
          jet.position.lerp(pos, 0.08)
          modelRot.x = 0
          modelRot.z = 0
          shadow.visible = true
          getAbMat().opacity = THREE.MathUtils.lerp(getAbMat().opacity, 0, 0.1)
          targetCamPos.set(0, 1.8, 28)
          targetLook.set(parkedX * 0.5, GROUND_Y + 0.5, 0)
        }

        if (phase === 'taxi') {
          const u = easeInOutCubic(Math.min(phaseT, 1))
          cubicBezier(u, p0, p1, p2, p3, pos)
          jet.position.lerp(pos, 0.12)
          modelRot.x = Math.sin(u * Math.PI * 6) * 0.015 // runway wobble (roll)
          modelRot.z = 0
          shadow.visible = true
          getAbMat().opacity = THREE.MathUtils.lerp(getAbMat().opacity, 0.35, 0.1)
          targetCamPos.set(jet.position.x * 0.35, 1.6, 26)
          targetLook.set(jet.position.x, GROUND_Y + 0.6, 0)
          if (phaseT >= 1) setPhase('return')
        }

        if (phase === 'return') {
          const u = easeInOutCubic(Math.min(phaseT, 1))
          cubicBezier(u, q0, q1, q2, q3, pos)
          jet.position.lerp(pos, 0.1)
          // Nose-up pitch (Z), keep wings level
          modelRot.z = THREE.MathUtils.lerp(0, -0.55, u)
          modelRot.x = 0
          shadow.visible = false
          getAbMat().opacity = THREE.MathUtils.lerp(getAbMat().opacity, 0.55, 0.08)
          targetCamPos.set(jet.position.x * 0.4, jet.position.y * 0.55 + 1.8, 24)
          targetLook.set(jet.position.x * 0.5, jet.position.y, 0)
          if (phaseT >= 1) setPhase('climb')
        }

        if (phase === 'climb') {
          const u = easeInOutCubic(Math.min(phaseT, 1))
          cubicBezier(u, r0, r1, r2, r3, pos)
          jet.position.lerp(pos, 0.08)
          modelRot.z = THREE.MathUtils.lerp(-0.55, -0.85, u)
          modelRot.x = 0
          shadow.visible = false
          getAbMat().opacity = THREE.MathUtils.lerp(getAbMat().opacity, 0.7, 0.06)
          targetCamPos.set(jet.position.x * 0.25, jet.position.y * 0.6 + 2.0, 22)
          targetLook.set(jet.position.x * 0.2, jet.position.y + 0.8, 0)

          const maxScroll = document.body.scrollHeight - window.innerHeight
          window.scrollTo({ top: maxScroll * (1 - u), behavior: 'auto' })

          if (phaseT >= 1) setPhase('impact')
        }

        if (phase === 'impact') {
          const u = Math.min(phaseT, 1)
          modelRot.z = THREE.MathUtils.lerp(-0.85, -0.9, u)
          modelRot.x = 0
          getAbMat().opacity = THREE.MathUtils.lerp(getAbMat().opacity, 0, 0.12)
          targetCamPos.set(jet.position.x * 0.15, jet.position.y + 1.8, 20)
          targetLook.set(jet.position.x * 0.1, jet.position.y + 2, 0)
          if (u >= 0.25 && !impactCalled) {
            impactCalled = true
            spawnExplosion(scene, jet.position, parts, flash)
            onImpactRef.current()
          }
          if (phaseT >= 1) setPhase('fadeout')
        }

        if (phase === 'fadeout') {
          const el = renderer.domElement
          el.style.opacity = String(Math.max(0, parseFloat(el.style.opacity || '1') - dt * 1.2))
          if (parseFloat(el.style.opacity) <= 0.01) {
            setDone(true)
            cancelled = true
            renderer.dispose()
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            return
          }
        }

        // Apply smooth rotation to the model
        model.rotation.x = THREE.MathUtils.lerp(model.rotation.x, modelRot.x, 0.08)
        model.rotation.y = THREE.MathUtils.lerp(model.rotation.y, modelRot.y, 0.08)
        model.rotation.z = THREE.MathUtils.lerp(model.rotation.z, modelRot.z, 0.08)

        // Camera follow
        camera.position.lerp(targetCamPos, 0.035)
        lookTarget.lerp(targetLook, 0.04)
        camera.lookAt(lookTarget)

        // Fire particles
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i]
          p.life -= dt
          p.m.position.addScaledVector(p.v, dt * 55)
          p.v.y += dt * 0.18
          p.v.x += (Math.random() - 0.5) * dt * 0.08
          p.v.z += (Math.random() - 0.5) * dt * 0.08
          p.v.multiplyScalar(0.97)
          p.m.scale.setScalar(1 + (1 - p.life) * 1.8)
          p.m.rotation.x += p.spin
          p.m.rotation.y += p.spin * 0.7
          const m = p.m.material as THREE.MeshBasicMaterial
          m.opacity = Math.max(0, Math.min(1, p.life * 1.4))
          if (p.life <= 0) {
            scene.remove(p.m)
            p.m.geometry.dispose()
            parts.splice(i, 1)
          }
        }
        flash.intensity = THREE.MathUtils.lerp(flash.intensity, 0, 0.08)

        renderer.render(scene, camera)
        rafRef.current = requestAnimationFrame(tick)
      }

      rafRef.current = requestAnimationFrame(tick)

      const onResize = () => {
        if (cancelled || !canvas.parentElement) return
        const W = canvas.clientWidth || 960
        const H = canvas.clientHeight || 320
        camera.aspect = W / H
        camera.updateProjectionMatrix()
        renderer.setSize(W, H, false)
      }
      window.addEventListener('resize', onResize)

      return () => {
        window.removeEventListener('resize', onResize)
        canvas.removeEventListener('click', launch)
      }
    }

    const cleanupPromise = load()

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      cleanupPromise.catch(() => {})
    }
  }, [])

  if (done) return null

  return (
    <section className="jet-section">
      <div className="jet-hint">{hint}</div>
      <canvas ref={canvasRef} className="jet-canvas-inline" />
    </section>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

function easeInOut(t: number) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2 }
function easeIn(t: number)    { return t * t }
function lerpN(a: number, b: number, t: number) { return a + (b-a)*t }

type ExpPart = { m: THREE.Mesh, v: THREE.Vector3, life: number, spin: number }

function spawnExplosion(scene: THREE.Scene, pos: THREE.Vector3, out: ExpPart[], flash: THREE.PointLight) {
  const cols = [0xffeebb,0xffcc33,0xff8800,0xff4400,0xff2200,0xffffff,0x44aaff]
  for (let i = 0; i < 160; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: cols[Math.floor(Math.random()*cols.length)], transparent: true, opacity: 1, depthWrite: false })
    const sz = 0.06 + Math.random() * 0.5
    const m  = new THREE.Mesh(new THREE.SphereGeometry(sz*0.6, 6, 6), mat)
    m.position.copy(pos)
    scene.add(m)
    const theta = Math.random()*Math.PI*2, phi = Math.random()*Math.PI, spd = 0.05+Math.random()*0.34
    out.push({
      m, life: 0.7+Math.random()*0.7, spin: (Math.random()-0.5)*0.3,
      v: new THREE.Vector3(Math.sin(phi)*Math.cos(theta)*spd, Math.sin(phi)*Math.sin(theta)*spd*0.7+0.06, Math.cos(phi)*spd*0.5)
    })
  }
  flash.position.copy(pos); flash.intensity = 6
}

type Phase = 'loading'|'ground'|'taxi'|'return'|'climb'|'impact'|'fadeout'

export default function EasterEggJet({ onImpact }: { onImpact: () => void }) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const rafRef       = useRef<number|null>(null)
  const phaseRef     = useRef<Phase>('loading')
  const launchRef    = useRef<(()=>void)|null>(null)
  const resizeRef    = useRef<(()=>void)|null>(null)
  const onImpactRef  = useRef(onImpact)
  const [fullscreen, setFullscreen] = useState(false)
  const [hint, setHint] = useState('Cargando F-16…')
  const [done, setDone] = useState(false)

  useEffect(() => { onImpactRef.current = onImpact }, [onImpact])

  // Resize the renderer/camera whenever the canvas changes size (inline ↔ fullscreen)
  useEffect(() => { requestAnimationFrame(() => resizeRef.current?.()) }, [fullscreen])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false

    ;(async () => {
      try {
        await new Promise(r => requestAnimationFrame(r))
        await new Promise(r => requestAnimationFrame(r))

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setSize(canvas.clientWidth || 960, canvas.clientHeight || 600, false)
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.setClearColor(0x000000, 0)   // transparent — the CSS section is the night sky

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 2000)

        resizeRef.current = () => {
          const W = canvas.clientWidth || 960, H = canvas.clientHeight || 600
          renderer.setSize(W, H, false)
          camera.aspect = W / H
          camera.updateProjectionMatrix()
        }
        resizeRef.current()

        // ── Lights ──
        scene.add(new THREE.AmbientLight(0xffffff, 1.6))
        const sun = new THREE.DirectionalLight(0xffffff, 2.6); sun.position.set(8, 16, 10); scene.add(sun)
        const fill = new THREE.DirectionalLight(0x88aaff, 1.3); fill.position.set(-8, 5, -6); scene.add(fill)
        const flash = new THREE.PointLight(0xff6600, 0, 30); scene.add(flash)

        // ── Ground (black) ──
        const ground = new THREE.Mesh(
          new THREE.PlaneGeometry(400, 400),
          new THREE.MeshStandardMaterial({ color: 0x05060d, roughness: 1 })
        )
        ground.rotation.x = -Math.PI / 2
        ground.position.y = 0
        scene.add(ground)

        // ── Runway markings (white lines) ──
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
        const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
        // side lines (run along X)
        ;[-3.2, 3.2].forEach(z => {
          const l = new THREE.Mesh(new THREE.PlaneGeometry(120, 0.12), lineMat)
          l.rotation.x = -Math.PI / 2; l.position.set(0, 0.01, z); scene.add(l)
        })
        // dashed centre line
        for (let x = -55; x <= 55; x += 4) {
          const d = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.1), dashMat)
          d.rotation.x = -Math.PI / 2; d.position.set(x, 0.01, 0); scene.add(d)
        }

        // ── Control tower (GLB from Sketchfab) ──
        const TOWER_X = -1, TOWER_Z = -6, TOWER_H = 9
        const towerGltf = await new GLTFLoader().loadAsync('/torre.glb')
        const tower = towerGltf.scene
        const ts = new THREE.Box3().setFromObject(tower).getSize(new THREE.Vector3())
        tower.scale.setScalar(TOWER_H / ts.y)
        const tbox = new THREE.Box3().setFromObject(tower)
        const tc = tbox.getCenter(new THREE.Vector3())
        tower.position.x += TOWER_X - tc.x
        tower.position.z += TOWER_Z - tc.z
        tower.position.y += -tbox.min.y
        tower.traverse((o: THREE.Object3D) => {
          const m = o as THREE.Mesh
          if (m.isMesh) { m.castShadow = true; m.receiveShadow = true }
        })
        scene.add(tower)
        // Blinking red beacon light on top
        const beaconLight = new THREE.PointLight(0xff3344, 0, 16)
        beaconLight.position.set(TOWER_X, TOWER_H + 0.5, TOWER_Z)
        scene.add(beaconLight)

        // ── Loading cube ──
        const testBox = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({ color: 0x6366f1 }))
        testBox.position.set(0, 2, 0); scene.add(testBox)

        const CAM_PARK = new THREE.Vector3(-1, 4.4, 27)   // pulled back → diorama smaller
        const LOOK_PARK = new THREE.Vector3(0, 2.2, 0)
        camera.position.copy(CAM_PARK); camera.lookAt(LOOK_PARK)
        renderer.render(scene, camera)

        const gltf = await new Promise<{ scene: THREE.Group }>((res, rej) =>
          new GLTFLoader().load('/f16.glb', res as () => void,
            (e) => { if (e.total) setHint(`Cargando F-16… ${Math.round(e.loaded/e.total*100)}%`) }, rej)
        )
        if (cancelled) return
        scene.remove(testBox); testBox.geometry.dispose()

        const model = gltf.scene

        // Normalise size (longest axis → 3.6 units) and centre on origin
        const mb = new THREE.Box3().setFromObject(model)
        const ms = mb.getSize(new THREE.Vector3())
        model.scale.setScalar(2.6 / Math.max(ms.x, ms.y, ms.z))
        const mb2 = new THREE.Box3().setFromObject(model)
        const mc = mb2.getCenter(new THREE.Vector3())
        model.position.sub(mc)              // centre at origin
        const halfH = (mb2.max.y - mb2.min.y) / 2   // half-height for ground placement

        model.traverse((o: THREE.Object3D) => {
          const m = o as THREE.Mesh
          if (m.isMesh) { m.castShadow = true; m.receiveShadow = true }
        })

        // Landing gear (model ships both states as separate nodes) — use ARRAYS
        const gearDown: THREE.Object3D[] = []
        const gearUp:   THREE.Object3D[] = []
        model.traverse((o: THREE.Object3D) => {
          if (o.name.includes('landingOff')) gearUp.push(o)
          else if (o.name.includes('landingOn')) gearDown.push(o)
        })
        const setGear = (down: boolean) => {
          gearDown.forEach(o => { o.visible = down })
          gearUp.forEach(o => { o.visible = !down })
        }
        setGear(true)

        // Orientation rig:
        //   jet   → world position
        //   roller→ heading (yaw on Y, pitch on Z)   model nose = +X
        //   model → barrel-roll (spin on its local X / fuselage)
        const roller = new THREE.Group()
        roller.add(model)
        const jet = new THREE.Group()
        jet.add(roller)
        scene.add(jet)

        // Afterburner flame out the tail (model −X), child of model so it rolls too
        const abMat = new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
        const ab = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3.4, 16, 1, true), abMat)
        ab.rotation.z = Math.PI / 2          // cone axis along X
        ab.position.x = mb2.min.x - mc.x - 1.4
        model.add(ab)

        // Ground shadow under the jet
        const shadow = new THREE.Mesh(
          new THREE.CircleGeometry(2.2, 32),
          new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })
        )
        shadow.rotation.x = -Math.PI / 2
        jet.add(shadow)

        const GROUND_Y = halfH                 // wheels touch y=0
        const PARK_X = 2.5
        jet.position.set(PARK_X, GROUND_Y, 0)
        roller.rotation.set(0, Math.PI, 0)     // parked: nose LEFT

        // Render the parked jet right away so it's visible BEFORE any click
        renderer.render(scene, camera)
        setHint('✈  Haz clic para despegar')
        phaseRef.current = 'ground'

        const parts: ExpPart[] = []
        let phase: Phase = 'ground'
        let phaseT = 0
        let rollAngle = 0
        let impactCalled = false
        let lastTime = performance.now()
        let scrollFrom = 0
        let bt = 0   // beacon timer

        const setPhase = (p: Phase) => { phase = p; phaseRef.current = p; phaseT = 0 }

        const durations: Record<string, number> = { taxi: 1.7, return: 2.4, climb: 8.0, impact: 1.2 }

        const camPos  = new THREE.Vector3().copy(CAM_PARK)
        const camLook = new THREE.Vector3().copy(LOOK_PARK)

        const launch = () => {
          if (phase !== 'ground') return
          setFullscreen(true)   // switch once, at the click, so taxi+return+climb
          setPhase('taxi')      // share ONE consistent shot (no mid-air reframe)
        }
        launchRef.current = launch

        const tick = () => {
          if (cancelled) return
          rafRef.current = requestAnimationFrame(tick)
          const now = performance.now()
          // Clamp generously so the cinematic still finishes in roughly real
          // wall-clock time on low-fps devices (and never locks scroll for long)
          const dt = Math.min((now - lastTime) / 1000, 0.1)
          lastTime = now
          bt += dt

          const dur = durations[phase] || 1
          if (phase !== 'ground' && phase !== 'fadeout') phaseT += dt / dur

          // Afterburner flicker
          abMat.opacity = THREE.MathUtils.lerp(abMat.opacity, phase === 'ground' ? 0 : 0.6, 0.1) * (0.7 + Math.random() * 0.3)
          ab.scale.x = 0.8 + Math.random() * 0.5
          // Beacon blink
          beaconLight.intensity = Math.sin(bt * 6) > 0 ? 2.5 : 0

          if (phase === 'ground') {
            // Parked: jet and camera dead still
            jet.position.set(PARK_X, GROUND_Y, 0)
            roller.rotation.set(0, Math.PI, 0)
            model.rotation.x = 0
            shadow.visible = true; shadow.position.y = -GROUND_Y + 0.02
            camera.position.copy(CAM_PARK); camera.lookAt(LOOK_PARK)

          } else if (phase === 'taxi') {
            // Accelerate down the runway to the LEFT, gear down, until off-screen
            const u = easeIn(Math.min(phaseT, 1))
            jet.position.x = lerpN(PARK_X, -26, u)
            jet.position.y = GROUND_Y
            roller.rotation.set(0, Math.PI, 0)   // facing left
            model.rotation.x = 0
            shadow.visible = true; shadow.position.y = -GROUND_Y + 0.02
            // Camera stays completely still — the jet runs across and exits frame
            camPos.copy(CAM_PARK); camLook.copy(LOOK_PARK)
            if (phaseT >= 1) {
              // Off-screen: retract gear + turn around to fly back in (still INLINE)
              setGear(false)
              shadow.visible = false
              setPhase('return')
            }

          } else if (phase === 'return') {
            // Fly in from the far left, LEVEL, to the centre. Stays INLINE so the
            // shot is identical to the parked view (camera fully static).
            const u = easeInOut(Math.min(phaseT, 1))
            jet.position.set(lerpN(-26, 0, u), 5, 0)
            roller.rotation.set(0, 0, 0)        // nose RIGHT, level
            model.rotation.x = 0
            shadow.visible = false
            if (phaseT >= 1) setPhase('climb')

          } else if (phase === 'climb') {
            // Clean pull-up to vertical, then a slow climb that scrolls the whole
            // page up to the title; gentle barrel roll on the way up.
            const u = Math.min(phaseT, 1)
            const pitch = lerpN(0, Math.PI / 2, easeInOut(Math.min(u / 0.5, 1)))
            const jy = lerpN(5, 56, u)              // steady (linear) climb
            jet.position.set(0, jy, 0)
            roller.rotation.set(0, 0, pitch)
            if (u > 0.3) { rollAngle += dt * 2.0; model.rotation.x = rollAngle } else model.rotation.x = 0
            shadow.visible = false
            // Smooth handoff from the parked framing, then the jet visibly RISES
            // through the frame (centre → top) as it climbs. Camera set DIRECTLY
            // (no lerp) so there is no lag or teleport.
            const blend = easeInOut(Math.min(u / 0.16, 1))
            const riseInFrame = lerpN(0, 11, u)     // jet gains height within the frame
            const lookY = lerpN(LOOK_PARK.y, jy - riseInFrame, blend)
            const posY  = lerpN(CAM_PARK.y, jy - riseInFrame - 3, blend)
            camera.position.set(CAM_PARK.x, posY, CAM_PARK.z)
            camera.lookAt(LOOK_PARK.x, lookY, 0)
            camLook.set(LOOK_PARK.x, lookY, 0)       // remembered for the impact shake
            // Leave the dark airfield "box" behind fast (page reaches the hero by
            // ~u 0.35), so the jet then climbs FREELY up the open/light page
            const maxScroll = document.body.scrollHeight - window.innerHeight
            window.scrollTo(0, Math.max(0, maxScroll * (1 - easeInOut(Math.min(u / 0.35, 1)))))
            if (phaseT >= 1) setPhase('impact')

          } else if (phase === 'impact') {
            if (phaseT >= 0.15 && !impactCalled) {
              impactCalled = true
              spawnExplosion(scene, jet.position, parts, flash)
              jet.visible = false
              onImpactRef.current()
            }
            // Keep the camera where the climb left it, with a brief shake
            const shake = Math.max(0, 0.3 - phaseT) * 0.7
            camera.position.x += (Math.random() - 0.5) * shake
            camera.position.y += (Math.random() - 0.5) * shake
            camera.lookAt(camLook)
            if (phaseT >= 1) setPhase('fadeout')

          } else if (phase === 'fadeout') {
            const cur = parseFloat(canvas.style.opacity || '1')
            canvas.style.opacity = String(Math.max(0, cur - dt * 1.1))
            if (cur <= 0.03) { cancelled = true; setDone(true); renderer.dispose(); if (rafRef.current) cancelAnimationFrame(rafRef.current); return }
          }

          // Camera: ground/climb/impact set their own above; taxi & return use
          // the exact static parked framing.
          if (phase === 'taxi' || phase === 'return') {
            camera.position.copy(CAM_PARK); camera.lookAt(LOOK_PARK)
          }

          // Particles
          for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i]
            p.life -= dt
            p.m.position.addScaledVector(p.v, dt * 55)
            p.v.y += dt * 0.15
            p.v.multiplyScalar(0.97)
            p.m.scale.setScalar(1 + (1 - p.life) * 1.7)
            ;(p.m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, Math.min(1, p.life * 1.4))
            if (p.life <= 0) { scene.remove(p.m); p.m.geometry.dispose(); parts.splice(i, 1) }
          }
          flash.intensity = THREE.MathUtils.lerp(flash.intensity, 0, 0.08)

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

  if (done) return null

  return (
    <section className="jet-section">
      <div className="jet-hint">{hint}</div>
      <canvas
        ref={canvasRef}
        onClick={() => { if (phaseRef.current === 'ground') launchRef.current?.() }}
        className={fullscreen ? 'jet-canvas-fullscreen' : 'jet-canvas-inline'}
      />
    </section>
  )
}

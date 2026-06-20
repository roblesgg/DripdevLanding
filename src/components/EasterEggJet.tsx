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

type SmokePart = { m: THREE.Mesh, life: number, maxLife: number, v: THREE.Vector3, grow: number }

function spawnSmoke(scene: THREE.Scene, pos: THREE.Vector3, out: SmokePart[]) {
  // Very light smoke haze that lets the logo read through
  for (let i = 0; i < 8; i++) {
    const g = 0.55 + Math.random() * 0.18
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(g, g, g * 1.02), transparent: true, opacity: 0, depthWrite: false })
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), mat)
    m.position.copy(pos).add(new THREE.Vector3((Math.random()-0.5)*4.0, (Math.random()-0.5)*2.5, (Math.random()-0.5)*4.0))
    m.scale.setScalar(0.2 + Math.random() * 0.3)
    scene.add(m)
    const L = 1.4 + Math.random() * 1.2
    out.push({
      m, life: L, maxLife: L, grow: 0.45 + Math.random() * 0.65,
      v: new THREE.Vector3((Math.random()-0.5)*0.35, 0.1 + Math.random()*0.2, (Math.random()-0.5)*0.35),
    })
  }
}

type Phase = 'loading'|'ground'|'taxi'|'return'|'climb'|'smoke'|'fadeout'

export default function EasterEggJet({ onImpact }: { onImpact: () => void }) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const backdropRef  = useRef<HTMLDivElement>(null)
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

        // Airfield group (ground + runway + tower) — hidden once the jet climbs
        // away so it doesn't "follow" the jet up the page
        const airfield = new THREE.Group()
        scene.add(airfield)

        // ── Ground (black) ──
        const ground = new THREE.Mesh(
          new THREE.PlaneGeometry(400, 400),
          new THREE.MeshStandardMaterial({ color: 0x05060d, roughness: 1 })
        )
        ground.rotation.x = -Math.PI / 2
        ground.position.y = 0
        airfield.add(ground)

        // ── Runway markings (white lines) ──
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
        const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
        // side lines (run along X)
        ;[-3.2, 3.2].forEach(z => {
          const l = new THREE.Mesh(new THREE.PlaneGeometry(120, 0.12), lineMat)
          l.rotation.x = -Math.PI / 2; l.position.set(0, 0.01, z); airfield.add(l)
        })
        // dashed centre line
        for (let x = -55; x <= 55; x += 4) {
          const d = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.1), dashMat)
          d.rotation.x = -Math.PI / 2; d.position.set(x, 0.01, 0); airfield.add(d)
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
        airfield.add(tower)
        // Blinking red beacon light on top
        const beaconLight = new THREE.PointLight(0xff3344, 0, 16)
        beaconLight.position.set(TOWER_X, TOWER_H + 0.5, TOWER_Z)
        airfield.add(beaconLight)

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
        const smoke: SmokePart[] = []
        let phase: Phase = 'ground'
        let phaseT = 0
        let rollAngle = 0
        let impactCalled = false
        let lastTime = performance.now()
        let scrollFrom = 0
        let scrollTo = 0
        let restoreScrollBehavior: (() => void) | null = null
        let bt = 0   // beacon timer

        const setPhase = (p: Phase) => { phase = p; phaseRef.current = p; phaseT = 0 }

        const durations: Record<string, number> = { taxi: 1.7, return: 2.8, climb: 5.5, smoke: 1.5 }
        const RETURN_PULL_PITCH = Math.PI * 0.22
        const CAM_CLIMB_Y = 55   // camera rises high so the airfield recedes naturally
        const climbEnd = new THREE.Vector3(3, 80, 0)
        const climbStart = new THREE.Vector3()

        const useImmediateScroll = () => {
          if (restoreScrollBehavior) return
          const htmlStyle = document.documentElement.style
          const bodyStyle = document.body.style
          const htmlScrollBehavior = htmlStyle.scrollBehavior
          const bodyScrollBehavior = bodyStyle.scrollBehavior
          htmlStyle.scrollBehavior = 'auto'
          bodyStyle.scrollBehavior = 'auto'
          restoreScrollBehavior = () => {
            htmlStyle.scrollBehavior = htmlScrollBehavior
            bodyStyle.scrollBehavior = bodyScrollBehavior
            restoreScrollBehavior = null
          }
        }

        const beginClimb = () => {
          scrollFrom = window.scrollY
          scrollTo = 0
          setPhase('climb')
        }

        const launch = () => {
          if (phase !== 'ground') return
          useImmediateScroll()
          setFullscreen(true)   // switch once, at the click, so taxi+return+climb
          if (backdropRef.current) backdropRef.current.style.opacity = '1'
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
            camera.position.copy(CAM_PARK); camera.lookAt(LOOK_PARK)
            if (phaseT >= 1) {
              // Off-screen: retract gear + turn around to fly back in (still INLINE)
              setGear(false)
              shadow.visible = false
              setPhase('return')
            }

          } else if (phase === 'return') {
            // Fly in from the far left, LEVEL, to the centre. Stays INLINE so the
            // shot is identical to the parked view (camera fully static).
            const raw = Math.min(phaseT, 1)
            const u = easeInOut(raw)
            const pull = easeInOut(THREE.MathUtils.clamp((raw - 0.68) / 0.32, 0, 1))
            jet.position.set(lerpN(-26, -0.15, u), lerpN(5, 5.7, pull), 0)
            roller.rotation.set(0, 0, RETURN_PULL_PITCH * pull)
            model.rotation.x = 0
            shadow.visible = false
            airfield.visible = true
            if (phaseT >= 1) beginClimb()

          } else if (phase === 'climb') {
            // Clean climb: camera and jet both rise; the airfield stays put and
            // simply recedes below. No artificial sinking, no giant close-up.
            if (phaseT === 0) climbStart.copy(jet.position)
            const u = Math.min(phaseT, 1)
            const moveT = easeInOut(u)
            const scrollT = easeInOut(Math.min(u / 0.45, 1))
            const pitchT = easeInOut(Math.min(u / 0.38, 1))

            roller.rotation.set(0, 0, lerpN(RETURN_PULL_PITCH, Math.PI / 2, pitchT))
            model.rotation.x = Math.sin(u * Math.PI) * 0.10
            shadow.visible = false

            // Camera follows the jet up; the airfield naturally falls away
            const camY = lerpN(CAM_PARK.y, CAM_CLIMB_Y, moveT)
            camera.position.set(CAM_PARK.x, camY, CAM_PARK.z)
            camera.lookAt(LOOK_PARK.x, lerpN(LOOK_PARK.y, 34, moveT), LOOK_PARK.z)

            // Scroll page up to hero while we are hidden by the dark backdrop
            window.scrollTo(0, Math.max(0, lerpN(scrollFrom, scrollTo, scrollT)))

            // Jet climbs in a straight, smooth arc
            jet.position.lerpVectors(climbStart, climbEnd, moveT)

            // Smoke release when the jet crosses the title band, then it keeps going
            if (!impactCalled && jet.position.y >= 25) {
              impactCalled = true
              spawnSmoke(scene, jet.position.clone(), smoke)
              onImpactRef.current()
            }
            if (phaseT >= 1) { jet.visible = false; airfield.visible = false; setPhase('smoke') }

          } else if (phase === 'smoke') {
            // Jet is gone; smoke drifts over the title while the dark backdrop
            // dissolves, revealing the hero logo underneath.
            camera.position.copy(CAM_PARK); camera.lookAt(LOOK_PARK)
            if (backdropRef.current) {
              const op = Math.max(0, parseFloat(backdropRef.current.style.opacity || '1') - dt * 0.55)
              backdropRef.current.style.opacity = String(op)
            }
            if (phaseT >= 1) setPhase('fadeout')

          } else if (phase === 'fadeout') {
            const cur = parseFloat(canvas.style.opacity || '1')
            const next = Math.max(0, cur - dt * 1.4)
            canvas.style.opacity = String(next)
            if (backdropRef.current) backdropRef.current.style.opacity = String(next)
            if (next <= 0.03) {
              cancelled = true
              restoreScrollBehavior?.()
              setDone(true)
              renderer.dispose()
              if (rafRef.current) cancelAnimationFrame(rafRef.current)
              return
            }
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

          // Smoke puffs: drift, grow, fade in then slowly out
          for (let i = smoke.length - 1; i >= 0; i--) {
            const s = smoke[i]
            s.life -= dt
            s.m.position.addScaledVector(s.v, dt * 3)
            s.v.multiplyScalar(0.97)
            s.m.scale.setScalar(s.m.scale.x + s.grow * dt)
            const t = s.life / s.maxLife                       // 1 → 0
            const op = Math.min(1, (1 - t) * 6) * Math.min(1, t * 2.6) * 0.25
            ;(s.m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, op)
            if (s.life <= 0) { scene.remove(s.m); s.m.geometry.dispose(); smoke.splice(i, 1) }
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

  if (done) return null

  return (
    <section className="jet-section">
      <div className="jet-hint">{hint}</div>
      <div ref={backdropRef} className="jet-backdrop" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        onClick={() => { if (phaseRef.current === 'ground') launchRef.current?.() }}
        className={fullscreen ? 'jet-canvas-fullscreen' : 'jet-canvas-inline'}
      />
    </section>
  )
}

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
  for (let i = 0; i < 70; i++) {
    const g = 0.55 + Math.random() * 0.28
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(g, g, g * 1.03), transparent: true, opacity: 0, depthWrite: false })
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), mat)
    m.position.copy(pos).add(new THREE.Vector3((Math.random()-0.5)*5, (Math.random()-0.5)*4, (Math.random()-0.5)*5))
    m.scale.setScalar(0.5 + Math.random() * 0.9)
    scene.add(m)
    const L = 2.4 + Math.random() * 2.2
    out.push({
      m, life: L, maxLife: L, grow: 1.6 + Math.random() * 2.4,
      v: new THREE.Vector3((Math.random()-0.5)*0.7, 0.2 + Math.random()*0.6, (Math.random()-0.5)*0.7),
    })
  }
}

type Phase = 'loading'|'ground'|'taxi'|'return'|'climb'|'smoke'|'fadeout'

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
        let titleNdcY = 0.38
        let lastTime = performance.now()
        let scrollFrom = 0
        let scrollTo = 0
        let climbDistance = 26
        let restoreScrollBehavior: (() => void) | null = null
        let bt = 0   // beacon timer
        const smokeOrigin = new THREE.Vector3()

        const setPhase = (p: Phase) => { phase = p; phaseRef.current = p; phaseT = 0 }

        const durations: Record<string, number> = { taxi: 1.7, return: 2.8, climb: 5.4, smoke: 3.0 }
        const RETURN_PULL_PITCH = Math.PI * 0.22

        const camPos  = new THREE.Vector3().copy(CAM_PARK)
        const camLook = new THREE.Vector3().copy(LOOK_PARK)
        const tmpV    = new THREE.Vector3()
        const climbStartNdc = new THREE.Vector2()
        const climbTargetNdc = new THREE.Vector2(0, 0.38)

        const worldFromNdc = (ndcX: number, ndcY: number, distance: number, out: THREE.Vector3) => {
          tmpV.set(ndcX, ndcY, 0.5).unproject(camera).sub(camera.position).normalize()
          return out.copy(camera.position).addScaledVector(tmpV, distance)
        }

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
          camera.position.copy(CAM_PARK)
          camera.lookAt(LOOK_PARK)
          camera.updateMatrixWorld()

          const start = jet.position.clone().project(camera)
          climbStartNdc.set(start.x, start.y)
          climbDistance = camera.position.distanceTo(jet.position)
          scrollFrom = window.scrollY
          scrollTo = 0

          const titleEl = document.querySelector('.hero-title')
          if (titleEl) {
            const r = titleEl.getBoundingClientRect()
            const finalTitleCenterY = r.top + window.scrollY + r.height / 2 - scrollTo
            titleNdcY = THREE.MathUtils.clamp(1 - 2 * (finalTitleCenterY / window.innerHeight), -0.55, 0.72)
          } else {
            titleNdcY = 0.38
          }
          climbTargetNdc.x = 0
          climbTargetNdc.y = 1.55   // fly PAST the title and off the top of the screen
          setPhase('climb')
        }

        const launch = () => {
          if (phase !== 'ground') return
          useImmediateScroll()
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
            // Clean pull-up to vertical, then a slow climb that scrolls the whole
            // page up to the title; gentle barrel roll on the way up.
            const u = Math.min(phaseT, 1)
            // Nose pitches up to vertical quickly & smoothly → climbs nose-first
            // (not levitating). Gentle barrel roll on the way up.
            const pitchT = easeInOut(Math.min(u / 0.35, 1))   // nose → vertical over the first 35%
            const moveT = u                                     // LINEAR rise: keeps moving to the end
            const scrollT = easeInOut(Math.min(u / 0.32, 1))   // reach the hero BEFORE the smoke drops
            roller.rotation.set(0, 0, lerpN(RETURN_PULL_PITCH, Math.PI / 2, pitchT))
            // CONTINUOUS corkscrew spin the whole way — never freezes
            rollAngle += dt * (3.4 + u * 3.6)
            model.rotation.x = rollAngle
            shadow.visible = false
            airfield.visible = u < 0.15

            // Camera stays EXACTLY at the parked framing (no follow → no wobble)
            camera.position.copy(CAM_PARK); camera.lookAt(LOOK_PARK); camera.updateMatrixWorld()

            // Scroll up to the hero fast so the DripDev title comes into view
            window.scrollTo(0, Math.max(0, lerpN(scrollFrom, scrollTo, scrollT)))

            // Base climb toward the title (screen-targeted), then a 3D helix
            // (spiral with real depth) that corkscrews up and converges on the
            // letters at the end.
            const ndcX = lerpN(climbStartNdc.x, climbTargetNdc.x, moveT)
            const ndcY = lerpN(climbStartNdc.y, climbTargetNdc.y, moveT)
            worldFromNdc(ndcX, ndcY, climbDistance, jet.position)
            const ang = u * Math.PI * 2 * 2.5         // 2.5 turns up
            const rad = (1 - u) * 2.4                 // shrinks → lands on the letters
            jet.position.x += Math.cos(ang) * rad
            jet.position.z += Math.sin(ang) * rad     // depth → reads as 3D
            jet.position.y += Math.cos(ang) * rad * 0.22

            // As the jet passes over the DripDev letters, dump a big cloud of
            // smoke there and swap the title for the logo (hidden by the smoke).
            // The jet just keeps going and flies off the top of the screen.
            if (!impactCalled && ndcY >= titleNdcY) {
              impactCalled = true
              worldFromNdc(0, titleNdcY, climbDistance, smokeOrigin)
              spawnSmoke(scene, smokeOrigin, smoke)
              onImpactRef.current()
            }
            if (phaseT >= 1) { jet.visible = false; setPhase('smoke') }

          } else if (phase === 'smoke') {
            // Jet is gone; the smoke billows over the title then clears, revealing
            // the logo underneath. Camera holds the framing.
            camera.position.copy(CAM_PARK); camera.lookAt(LOOK_PARK)
            if (phaseT >= 1) setPhase('fadeout')

          } else if (phase === 'fadeout') {
            const cur = parseFloat(canvas.style.opacity || '1')
            canvas.style.opacity = String(Math.max(0, cur - dt * 1.1))
            if (cur <= 0.03) { cancelled = true; restoreScrollBehavior?.(); setDone(true); renderer.dispose(); if (rafRef.current) cancelAnimationFrame(rafRef.current); return }
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
            const op = Math.min(1, (1 - t) * 6) * Math.min(1, t * 2.6) * 0.6
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
      <canvas
        ref={canvasRef}
        onClick={() => { if (phaseRef.current === 'ground') launchRef.current?.() }}
        className={fullscreen ? 'jet-canvas-fullscreen' : 'jet-canvas-inline'}
      />
    </section>
  )
}

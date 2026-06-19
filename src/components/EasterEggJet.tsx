'use client'

import { useEffect, useRef, useState } from 'react'

function easeIn(t: number)    { return t * t * t }
function easeInOut(t: number) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2 }
function lerpN(a: number, b: number, t: number) { return a + (b-a)*t }

function spawnExplosion(THREE: any, scene: any, pos: any, out: any[]) {
  const cols = [0xff6600,0xff3300,0xffaa00,0xffffff,0xff0044,0x44aaff,0xffee00,0xff8800]
  for (let i = 0; i < 120; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: cols[Math.floor(Math.random()*cols.length)], transparent: true, opacity: 1 })
    const sz  = 0.04 + Math.random() * 0.32
    const geo = Math.random() > 0.4 ? new THREE.BoxGeometry(sz,sz,sz) : new THREE.SphereGeometry(sz*0.55,4,4)
    const m   = new THREE.Mesh(geo, mat); m.position.copy(pos); scene.add(m)
    const theta = Math.random()*Math.PI*2, phi = Math.random()*Math.PI, spd = 0.04+Math.random()*0.28
    out.push({ m, life: 0.8+Math.random()*0.6, spin: (Math.random()-0.5)*0.2,
      v: new THREE.Vector3(Math.sin(phi)*Math.cos(theta)*spd, Math.sin(phi)*Math.sin(theta)*spd*0.7, Math.cos(phi)*spd*0.5) })
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
  const [hint,     setHint]     = useState('Cargando F-16...')
  const [done,     setDone]     = useState(false)

  useEffect(() => { onImpactRef.current = onImpact }, [onImpact])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false

    ;(async () => {
      try {
        const THREE = await import('three')
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')

        // Wait for layout paint
        await new Promise(r => requestAnimationFrame(r))
        await new Promise(r => requestAnimationFrame(r))

        const W0 = window.innerWidth
        const H0 = 340

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
        renderer.setSize(W0, H0, false)
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
        renderer.outputColorSpace = THREE.SRGBColorSpace

        const scene  = new THREE.Scene()
        scene.background = new THREE.Color(0x06060f)   // dark bg — always visible

        const camera = new THREE.PerspectiveCamera(45, W0/H0, 0.01, 1000)
        camera.position.set(0, 2, 14)
        camera.lookAt(0, 0, 0)

        scene.add(new THREE.AmbientLight(0xffffff, 1.4))
        const sun = new THREE.DirectionalLight(0xffffff, 2.5); sun.position.set(10,20,15); scene.add(sun)
        const fill = new THREE.DirectionalLight(0x88aaff, 1.0); fill.position.set(-8,5,-5); scene.add(fill)
        const engineGlow = new THREE.PointLight(0xff8800, 10, 20); scene.add(engineGlow)

        // Simple test: render a spinning box while loading
        const testBox = new THREE.Mesh(
          new THREE.BoxGeometry(1,1,1),
          new THREE.MeshPhongMaterial({ color: 0x6366f1 })
        )
        scene.add(testBox)

        // Render one frame immediately so canvas goes dark
        renderer.render(scene, camera)

        // Load GLB (no Draco — simpler, avoid external dep)
        setHint('Cargando modelo...')
        const gltf = await new Promise<any>((res, rej) =>
          new GLTFLoader().load('/f16.glb', res, undefined, rej)
        )

        scene.remove(testBox)

        const jet = gltf.scene

        // Scale
        const box    = new THREE.Box3().setFromObject(jet)
        const size   = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        jet.scale.setScalar(7 / maxDim)

        // Center
        const box2 = new THREE.Box3().setFromObject(jet)
        box2.getCenter(jet.position).negate()

        jet.traverse((c: any) => {
          if (c.isMesh) { c.castShadow = true; c.receiveShadow = true }
        })

        scene.add(jet)

        // Afterburner flames attached to jet
        const mkCone = (color: number, r: number, h: number, op: number) => {
          const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op })
          const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 12), m)
          c.rotation.x = Math.PI; return c
        }
        const flames = [
          { mesh: mkCone(0xffffff,0.18,0.7, 0.95), baseOp:0.95 },
          { mesh: mkCone(0xffee44,0.30,1.1, 0.90), baseOp:0.90 },
          { mesh: mkCone(0xff8800,0.40,1.8, 0.80), baseOp:0.80 },
          { mesh: mkCone(0xff3300,0.44,2.4, 0.55), baseOp:0.55 },
        ]

        // Place flames at bottom of jet bounding box
        const box3    = new THREE.Box3().setFromObject(jet)
        const exhaustY = box3.min.y - 0.3
        flames.forEach(({ mesh }) => { mesh.position.set(0, exhaustY, 0); jet.add(mesh) })

        // Reorient jet: detect longest axis and rotate nose up
        const sz = box3.getSize(new THREE.Vector3())
        if (sz.z > sz.y && sz.z > sz.x) {
          // nose along Z — rotate so it points up (Y)
          jet.rotation.x = -Math.PI / 2
        } else if (sz.x > sz.y) {
          // nose along X
          jet.rotation.z = Math.PI / 2
        }
        // if already Y-up, no rotation needed

        setHint('✈ Haz clic para despegar')
        phaseRef.current = 'ground'

        const expParts: Array<{m:any,v:any,life:number,spin:number}> = []
        let globalT = 0, phaseT = 0
        const TARGET_Y  = 14
        const camPos    = new THREE.Vector3(0, 2, 14)
        const camTarget = new THREE.Vector3(0, 0, 0)
        const groundRotX = jet.rotation.x
        const groundRotZ = jet.rotation.z

        const launch = () => {
          const W = window.innerWidth, H = window.innerHeight
          renderer.setSize(W, H, false)
          scene.background = null             // transparent in fullscreen
          camera.aspect = W/H; camera.fov = 55; camera.updateProjectionMatrix()
          jet.position.set(0, -14, 0)
          camPos.set(5, -11, 18); camTarget.set(0, -11, 0)
          camera.position.copy(camPos); camera.lookAt(camTarget)
          phaseRef.current = 'takeoff'; phaseT = 0
        }
        launchRef.current = launch

        const tick = () => {
          if (cancelled) return
          rafRef.current = requestAnimationFrame(tick)
          const dt = 0.016; globalT += dt; phaseT += dt

          flames.forEach(({ mesh, baseOp }) => {
            mesh.material.opacity = baseOp*(0.72+Math.random()*0.28)
            mesh.scale.y = 0.8+Math.random()*0.5
            mesh.scale.x = mesh.scale.z = 0.85+Math.random()*0.3
          })
          engineGlow.intensity = 8+Math.random()*6

          const phase = phaseRef.current

          if (phase === 'ground') {
            jet.position.y   = Math.sin(globalT*1.8)*0.1
            jet.rotation.y   = Math.sin(globalT*0.5)*0.06
            jet.rotation.x   = groundRotX + Math.sin(globalT*1.2)*0.015
            engineGlow.position.set(0, jet.position.y + exhaustY, 0)
            camera.position.copy(camPos); camera.lookAt(camTarget)

          } else if (phase === 'takeoff') {
            const DUR = 2.6, p = Math.min(phaseT/DUR, 1)
            jet.position.y = lerpN(-14, -3, easeIn(p))
            jet.position.x = lerpN(0.4, 0, p)
            jet.rotation.x = lerpN(groundRotX, -Math.PI/2, easeInOut(p))
            jet.rotation.z = lerpN(groundRotZ, 0, easeInOut(p))
            jet.rotation.y = lerpN(0, 0, p)
            engineGlow.position.set(jet.position.x, jet.position.y + exhaustY, 0)
            camTarget.set(jet.position.x, jet.position.y+2, 0)
            camPos.set(lerpN(5,6,easeInOut(p)), jet.position.y-4, lerpN(18,16,p))
            camera.position.lerp(camPos, 0.07); camera.lookAt(camTarget)
            if (p >= 1) { phaseRef.current='flying'; phaseT=0 }

          } else if (phase === 'flying') {
            const DUR = 2.4, p = Math.min(phaseT/DUR, 1)
            jet.position.y = lerpN(-3, TARGET_Y, easeInOut(p))
            jet.position.x = Math.sin(globalT*0.9)*0.25
            jet.rotation.z = Math.sin(globalT*2.5)*0.07
            engineGlow.position.set(jet.position.x, jet.position.y + exhaustY, 0)
            camTarget.set(jet.position.x, jet.position.y+2, 0)
            const angle = lerpN(0, Math.PI*0.2, easeInOut(p))
            camPos.set(Math.sin(angle)*14, jet.position.y-4, Math.cos(angle)*16)
            camera.position.lerp(camPos, 0.07); camera.lookAt(camTarget)
            if (p >= 1) {
              phaseRef.current='impact'; phaseT=0
              spawnExplosion(THREE, scene, jet.position.clone(), expParts)
              jet.visible=false; onImpactRef.current()
            }

          } else if (phase === 'impact') {
            const shake = Math.max(0,0.4-phaseT)*0.65
            camPos.x+=(Math.random()-0.5)*shake; camPos.y+=(Math.random()-0.5)*shake
            camTarget.set(0, TARGET_Y, 0)
            camera.position.lerp(camPos,0.12); camera.lookAt(camTarget)
            let anyAlive = false
            for (const p of expParts) {
              if (p.life>0) {
                anyAlive=true; p.life-=0.013; p.m.position.add(p.v); p.v.y-=0.006
                p.m.rotation.x+=p.spin; p.m.rotation.z+=p.spin*0.7
                p.m.material.opacity=Math.max(0,p.life*1.25)
                p.m.scale.setScalar(Math.max(0.01,1-(1-p.life)*0.35))
              } else { p.m.visible=false }
            }
            if (!anyAlive||phaseT>3.5) { phaseRef.current='fadeout'; phaseT=0 }

          } else if (phase === 'fadeout') {
            camera.position.lerp(camPos,0.07); camera.lookAt(camTarget)
            const cur = parseFloat(canvas.style.opacity||'1')
            canvas.style.opacity = String(Math.max(0,cur-0.02))
            if (cur<=0.02) { cancelled=true; setDone(true); return }
          }

          renderer.render(scene, camera)
        }
        tick()

      } catch (err: any) {
        console.error('[EasterEggJet]', err)
        setHint('Error: ' + (err?.message || String(err)))
      }
    })()

    return () => { cancelled=true; if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  useEffect(() => {
    if (!launched) return
    requestAnimationFrame(() => { launchRef.current?.() })
  }, [launched])

  if (done) return null

  return (
    <section style={{
      width: '100%', padding: '2rem 1.5rem 3rem',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: 'linear-gradient(180deg, #08080f 0%, #0d0d1a 100%)',
    }}>
      <p style={{
        color: '#a0b0ff', fontSize: '0.8rem',
        letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem',
      }}>
        {hint}
      </p>
      <canvas
        ref={canvasRef}
        onClick={() => { if (phaseRef.current==='ground') setLaunched(true) }}
        style={launched ? {
          position: 'fixed', inset: 0, width: '100vw', height: '100vh',
          zIndex: 9999, pointerEvents: 'none', display: 'block',
        } : {
          width: '100%', maxWidth: '960px', height: '340px',
          display: 'block', cursor: 'pointer', borderRadius: '1.25rem',
          border: '1px solid rgba(120,130,255,0.25)',
          background: '#06060f',
        }}
      />
    </section>
  )
}

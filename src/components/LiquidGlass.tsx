'use client'

import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { 
  MeshTransmissionMaterial, 
  Environment, 
  Float,
  Sparkles,
} from '@react-three/drei'
import * as THREE from 'three'

function LiquidBlob() {
  const mesh = useRef<THREE.Mesh>(null!)
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    mesh.current.rotation.x = Math.sin(time * 0.2) * 0.2
    mesh.current.rotation.y = Math.cos(time * 0.3) * 0.2
    
    // Subtle organic pulsation
    const s = 1 + Math.sin(time * 1.5) * 0.03
    mesh.current.scale.set(s, s, s)
  })

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={mesh}>
        <sphereGeometry args={[1.5, 64, 64]} />
        <MeshTransmissionMaterial
          backside
          samples={16}
          thickness={0.2}
          chromaticAberration={0.05}
          anisotropy={0.1}
          distortion={0.5}
          distortionScale={0.5}
          temporalDistortion={0.1}
          clearcoat={1}
          attenuationDistance={0.5}
          attenuationColor="#ffffff"
          color="#c9e9ff"
          ior={1.2}
        />
      </mesh>
    </Float>
  )
}

function Scene() {
  return (
    <>
      <color attach="background" args={['#020617']} />
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
      <pointLight position={[-10, -10, -10]} intensity={1} color="#0ea5e9" />
      
      <LiquidBlob />
      
      {/* Dynamic particles for depth and premium feel */}
      <Sparkles count={50} scale={10} size={2} speed={0.4} color="#38bdf8" />
      
      <Environment preset="city" />
    </>
  )
}

export default function LiquidGlass() {
  return (
    <div className="canvas-container">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
        <Scene />
      </Canvas>
    </div>
  )
}

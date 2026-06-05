'use client'

import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { 
  Stars, 
  Float,
  PerspectiveCamera,
  Environment
} from '@react-three/drei'
import * as THREE from 'three'

function MovingStars() {
  const starsRef = useRef<THREE.Points>(null!)
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    starsRef.current.rotation.y = time * 0.05
    starsRef.current.rotation.x = time * 0.02
  })

  return (
    <Stars 
      ref={starsRef}
      radius={100} 
      depth={50} 
      count={5000} 
      factor={4} 
      saturation={0} 
      fade 
      speed={1} 
    />
  )
}

function Nebula() {
  return (
    <>
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#38bdf8" />
      <pointLight position={[-10, -10, -10]} intensity={1} color="#818cf8" />
      <ambientLight intensity={0.2} />
    </>
  )
}

export default function SpaceScene() {
  return (
    <div className="canvas-container">
      <Canvas dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />
        <color attach="background" args={['#020617']} />
        
        <Nebula />
        <MovingStars />
        
        <Environment preset="night" />
      </Canvas>
    </div>
  )
}

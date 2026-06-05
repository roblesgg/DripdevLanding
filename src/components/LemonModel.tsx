'use client'

import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

function LemonShape() {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4
      groupRef.current.rotation.x = Math.sin(Date.now() * 0.001) * 0.08
    }
  })

  return (
    <group ref={groupRef} scale={1.1} position={[0, 0, 0]}>
      {/* Main lemon body - slightly elongated sphere */}
      <mesh scale={[0.95, 1.15, 0.95]}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial
          color="#facc15"
          roughness={0.35}
          metalness={0.05}
          emissive="#ca8a04"
          emissiveIntensity={0.08}
        />
      </mesh>
      {/* Stem nub */}
      <mesh position={[0, 1.05, 0]} scale={[0.18, 0.22, 0.18]}>
        <cylinderGeometry args={[0.5, 0.7, 1, 16]} />
        <meshStandardMaterial color="#65a30d" roughness={0.8} />
      </mesh>
      {/* Bottom tip */}
      <mesh position={[0, -1.12, 0]} scale={[0.12, 0.18, 0.12]}>
        <coneGeometry args={[1, 1, 16]} />
        <meshStandardMaterial color="#facc15" roughness={0.35} />
      </mesh>
    </group>
  )
}

export default function LemonModel() {
  return (
    <div className="lemon-canvas-wrapper" aria-label="Modelo 3D de un limón">
      <Canvas
        camera={{ position: [0, 0, 3.2], fov: 38 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[4, 5, 4]} intensity={1.4} />
        <directionalLight position={[-3, -2, -4]} intensity={0.5} />
        <LemonShape />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={false}
          rotateSpeed={0.7}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={(Math.PI * 3) / 4}
        />
      </Canvas>
    </div>
  )
}

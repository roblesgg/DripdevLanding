'use client'

import React, { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { MeshTransmissionMaterial, RoundedBox } from '@react-three/drei'

interface GlassCardProps {
  title: string
  description: string
  link: string
  icon: string
}

function GlassMaterial() {
  return (
    <MeshTransmissionMaterial
      backside
      samples={8}
      thickness={0.1}
      chromaticAberration={0.02}
      anisotropy={0.1}
      distortion={0.3}
      distortionScale={0.3}
      temporalDistortion={0.1}
      clearcoat={1}
      color="#ffffff"
      ior={1.1}
    />
  )
}

export default function GlassCard({ title, description, link, icon }: GlassCardProps) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const mouseXSpring = useSpring(x)
  const mouseYSpring = useSpring(y)

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['10deg', '-10deg'])
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-10deg', '10deg'])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const xPct = mouseX / width - 0.5
    const yPct = mouseY / height - 0.5
    x.set(xPct)
    y.set(yPct)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      className="glass-card-wrapper"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="glass-card-content">
        <div className="icon-badge">{icon}</div>
        <h3>{title}</h3>
        <p>{description}</p>
        <a href={link} target="_blank" rel="noopener noreferrer" className="btn-card">
          Explorar
        </a>
      </div>
      
      {/* 3D Glass Layer behind content */}
      <div className="glass-bg-canvas">
        <Canvas camera={{ position: [0, 0, 2], fov: 50 }} gl={{ alpha: true }}>
          <ambientLight intensity={0.5} />
          <mesh rotation={[0, 0, 0]}>
            <RoundedBox args={[1.8, 2.8, 0.05]} radius={0.1} smoothness={4}>
              <GlassMaterial />
            </RoundedBox>
          </mesh>
        </Canvas>
      </div>
    </motion.div>
  )
}

'use client'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stars, Float } from '@react-three/drei'
import { useRef, useMemo, useEffect, useState, Suspense } from 'react'
import { usePathname } from 'next/navigation'
import * as THREE from 'three'

// ── Camera drifts toward mouse ────────────────────────────────────────────────
function CameraDrift() {
  const { camera, mouse } = useThree()
  useFrame(() => {
    camera.position.x += (mouse.x * 3 - camera.position.x) * 0.015
    camera.position.y += (mouse.y * 2 - camera.position.y) * 0.015
    camera.lookAt(0, 0, 0)
  })
  return null
}

// ── Dense glow particle field ─────────────────────────────────────────────────
function QuantumField({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null)
  const PALETTE: [number,number,number][] = [
    [0.0, 0.83, 1.0],   // cyan
    [0.49, 0.23, 1.0],  // violet
    [0.0, 1.0, 0.88],   // teal
    [0.67, 0.55, 1.0],  // lavender
    [0.9, 0.95, 1.0],   // white-blue
  ]
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors    = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r     = 3 + Math.pow(Math.random(), 0.5) * 32
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      positions[i*3]   = r * Math.sin(phi) * Math.cos(theta)
      positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.55
      positions[i*3+2] = (r * Math.cos(phi)) - 4
      const c = PALETTE[i % PALETTE.length]
      colors[i*3] = c[0]; colors[i*3+1] = c[1]; colors[i*3+2] = c[2]
    }
    return { positions, colors }
  }, [count])

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.elapsedTime * 0.025
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute args={[colors, 3]}    attach="attributes-color"    count={count} array={colors}    itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.14} vertexColors transparent opacity={0.75} sizeAttenuation depthWrite={false} />
    </points>
  )
}

// ── Floating wireframe polyhedra ──────────────────────────────────────────────
const SHAPE_CONFIGS = [
  { p: [-8,  4, -12] as [number,number,number], g: 'ico', c: '#00d4ff', s: 0.40, sc: 1.2 },
  { p: [ 9, -3, -16] as [number,number,number], g: 'oct', c: '#7c3aff', s: 0.30, sc: 1.6 },
  { p: [-5, -6,  -9] as [number,number,number], g: 'ico', c: '#00ffe0', s: 0.55, sc: 0.9 },
  { p: [ 6,  7, -14] as [number,number,number], g: 'oct', c: '#00d4ff', s: 0.25, sc: 1.1 },
  { p: [-13, 2, -20] as [number,number,number], g: 'ico', c: '#7c3aff', s: 0.35, sc: 2.0 },
  { p: [ 11,-8, -15] as [number,number,number], g: 'ico', c: '#00ffe0', s: 0.45, sc: 0.8 },
  { p: [ -1, 10, -22] as [number,number,number], g: 'oct', c: '#00d4ff', s: 0.20, sc: 2.2 },
  { p: [-10,-9, -17] as [number,number,number], g: 'oct', c: '#a78bfa', s: 0.50, sc: 0.7 },
  { p: [ 14, 1, -25] as [number,number,number], g: 'ico', c: '#00ffe0', s: 0.18, sc: 2.5 },
  { p: [ -2,-12, -11] as [number,number,number], g: 'ico', c: '#7c3aff', s: 0.60, sc: 0.6 },
]

function WireShape({ p, g, c, s, sc }: typeof SHAPE_CONFIGS[0]) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.x = clock.elapsedTime * s * 0.38
    ref.current.rotation.y = clock.elapsedTime * s * 0.62
  })
  return (
    <Float speed={s * 0.7} rotationIntensity={0.08} floatIntensity={0.7}>
      <mesh ref={ref} position={p} scale={sc}>
        {g === 'ico'
          ? <icosahedronGeometry args={[1, 0]} />
          : <octahedronGeometry  args={[1, 0]} />
        }
        <meshBasicMaterial color={c} wireframe transparent opacity={0.22} />
      </mesh>
    </Float>
  )
}

// ── Orbital rings at varying depths ──────────────────────────────────────────
const RING_CONFIGS = [
  { p: [0,0,-6]  as [number,number,number], r: 6.5,  t: 0.025, c: '#00d4ff', spd:  0.14, rot: [0.4,0,0]     as [number,number,number] },
  { p: [0,0,-14] as [number,number,number], r: 9.5,  t: 0.018, c: '#7c3aff', spd: -0.09, rot: [1.1,0.3,0]   as [number,number,number] },
  { p: [1,0,-8]  as [number,number,number], r: 4.0,  t: 0.030, c: '#00ffe0', spd:  0.24, rot: [0,0,0.8]      as [number,number,number] },
  { p: [0,0,-22] as [number,number,number], r: 15.0, t: 0.010, c: '#0044aa', spd: -0.05, rot: [0.8,1.2,0.4] as [number,number,number] },
  { p: [2,1,-5]  as [number,number,number], r: 2.8,  t: 0.035, c: '#aa44ff', spd:  0.42, rot: [1.5,0.5,0]   as [number,number,number] },
  { p: [-1,0,-18] as [number,number,number], r: 12.0, t: 0.012, c: '#00ccff', spd:  0.07, rot: [0.3,1.5,0.6] as [number,number,number] },
]

function QuantumRing({ p, r, t, c, spd, rot }: typeof RING_CONFIGS[0]) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (!ref.current) return
    ref.current.rotation.y += spd * 0.008
    ref.current.rotation.x += spd * 0.004
  })
  return (
    <mesh ref={ref} position={p} rotation={rot}>
      <torusGeometry args={[r, t, 8, 120]} />
      <meshBasicMaterial color={c} transparent opacity={0.55} />
    </mesh>
  )
}

// ── Orbiting glow nodes on the first ring ─────────────────────────────────────
function RingNodes() {
  const groupRef = useRef<THREE.Group>(null)
  const nodeRefs = useRef<THREE.Mesh[]>([])
  const NODES = 5
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    nodeRefs.current.forEach((n, i) => {
      if (!n) return
      const angle = t * 0.18 + (i / NODES) * Math.PI * 2
      n.position.set(Math.cos(angle) * 6.5, Math.sin(angle) * 6.5 * 0.25, -6 + Math.sin(angle * 0.4) * 0.5)
    })
  })
  return (
    <group ref={groupRef}>
      {Array.from({ length: NODES }, (_, i) => (
        <mesh key={i} ref={el => { if (el) nodeRefs.current[i] = el }}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshBasicMaterial color={i % 2 === 0 ? '#00d4ff' : '#7c3aff'} />
        </mesh>
      ))}
    </group>
  )
}

// ── Grid plane ────────────────────────────────────────────────────────────────
function QuantumGrid() {
  const ref = useRef<THREE.GridHelper>(null)
  useEffect(() => {
    if (!ref.current) return
    const mat = ref.current.material as THREE.Material | THREE.Material[]
    const apply = (m: THREE.Material) => { m.transparent = true; m.opacity = 0.28 }
    Array.isArray(mat) ? mat.forEach(apply) : apply(mat)
  }, [])
  return (
    <gridHelper
      ref={ref}
      args={[120, 60, 0x001144, 0x000a22]}
      position={[0, -12, -8]}
    />
  )
}

// ── Animated point lights ─────────────────────────────────────────────────────
function DynamicLights() {
  const l1 = useRef<THREE.PointLight>(null)
  const l2 = useRef<THREE.PointLight>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (l1.current) {
      l1.current.position.set(10 * Math.cos(t * 0.22), 6 * Math.sin(t * 0.15), 5)
    }
    if (l2.current) {
      l2.current.position.set(-8 * Math.cos(t * 0.18 + 1), -5 * Math.sin(t * 0.12), 3)
    }
  })
  return (
    <>
      <ambientLight color={0x06061a} intensity={5} />
      <pointLight ref={l1} color={0x0055ff} intensity={12} distance={50} />
      <pointLight ref={l2} color={0x6600ff} intensity={8}  distance={40} />
      <pointLight position={[0, 0, 10]}  color={0x00ffee} intensity={5}  distance={35} />
    </>
  )
}

// ── Scene assembles everything ────────────────────────────────────────────────
function Scene({ mobile }: { mobile: boolean }) {
  return (
    <>
      <fog attach="fog" args={[0x000208, 22, 85]} />
      <CameraDrift />
      <DynamicLights />

      {/* Deep starfield */}
      <Stars radius={160} depth={55} count={mobile ? 2500 : 5500} factor={4} saturation={0.15} fade speed={0.4} />

      {/* Close particle cloud */}
      <QuantumField count={mobile ? 280 : 680} />

      {/* Wireframe shapes — skip half on mobile */}
      {SHAPE_CONFIGS.slice(0, mobile ? 5 : 10).map((cfg, i) => (
        <WireShape key={i} {...cfg} />
      ))}

      {/* Orbital rings */}
      {RING_CONFIGS.map((cfg, i) => (
        <QuantumRing key={i} {...cfg} />
      ))}

      <RingNodes />
      <QuantumGrid />
    </>
  )
}

// ── Public component ─────────────────────────────────────────────────────────
export function QuantumSpace() {
  const pathname = usePathname()
  const [mobile,        setMobile]        = useState(false)
  const [institutional, setInstitutional] = useState(false)

  useEffect(() => {
    setMobile(window.innerWidth < 768 || window.devicePixelRatio < 1.5)
    const check = () => setInstitutional(
      localStorage.getItem('qufi_theme') === 'light' ||
      localStorage.getItem('qufi_user_type') === 'institutional'
    )
    check()
    window.addEventListener('qufi-profile-changed', check)
    return () => window.removeEventListener('qufi-profile-changed', check)
  }, [])

  // No 3-D space for institutional clean UI or landing page
  if (pathname === '/' || institutional) return null

  return (
    <div style={{
      position: 'fixed', inset: 0,
      zIndex: 0,
      pointerEvents: 'none',
      background: '#000208',
    }}>
      <Canvas
        camera={{ position: [0, 0, 22], fov: 58 }}
        gl={{ antialias: !mobile, alpha: false, powerPreference: 'high-performance' }}
        dpr={mobile ? 1 : Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)}
        style={{ background: '#000208' }}
        frameloop="always"
      >
        <Suspense fallback={null}>
          <Scene mobile={mobile} />
        </Suspense>
      </Canvas>
    </div>
  )
}

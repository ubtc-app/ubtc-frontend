'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as THREE from 'three'

export default function LandingPage() {
  const mountRef    = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const frameRef    = useRef<number>(0)
  const mouseRef    = useRef({ x: 0, y: 0 })
  const enteringRef = useRef(false)
  const router      = useRouter()
  const [ready,    setReady]    = useState(false)
  const [entering, setEntering] = useState(false)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene  = new THREE.Scene()
    scene.fog    = new THREE.FogExp2(0x000308, 0.014)
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500)
    camera.position.set(0, 0, 30)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000308, 1)
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // ── Starfield ──────────────────────────────────────────────────────────
    const starGeo  = new THREE.BufferGeometry()
    const starCount = 4000
    const starPos   = new Float32Array(starCount * 3)
    const starColors = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3]     = (Math.random() - 0.5) * 400
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 400
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 400
      // Vary star colour: white / cyan / violet
      const roll = Math.random()
      if (roll < 0.33) { starColors[i*3]=0.6; starColors[i*3+1]=0.9; starColors[i*3+2]=1.0 }
      else if (roll < 0.66) { starColors[i*3]=0.75; starColors[i*3+1]=0.55; starColors[i*3+2]=1.0 }
      else { starColors[i*3]=0.9; starColors[i*3+1]=0.95; starColors[i*3+2]=1.0 }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    starGeo.setAttribute('color',    new THREE.BufferAttribute(starColors, 3))
    const starMat = new THREE.PointsMaterial({ size: 0.2, vertexColors: true, transparent: true, opacity: 0.85 })
    const stars = new THREE.Points(starGeo, starMat)
    scene.add(stars)

    // ── Central quantum core ───────────────────────────────────────────────
    const coreGeo = new THREE.SphereGeometry(1.4, 64, 64)
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0055dd,
      emissive: 0x2200ff,
      emissiveIntensity: 1.6,
      metalness: 0.9,
      roughness: 0.05,
      transparent: true,
      opacity: 0.88,
    })
    const core = new THREE.Mesh(coreGeo, coreMat)
    scene.add(core)

    // Outer glow shell
    const glowGeo = new THREE.SphereGeometry(2.2, 32, 32)
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x4400ff, transparent: true, opacity: 0.05, side: THREE.BackSide })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    scene.add(glow)

    // Second pulse ring (cyan)
    const pulse2Geo = new THREE.SphereGeometry(3.0, 32, 32)
    const pulse2Mat = new THREE.MeshBasicMaterial({ color: 0x00ddff, transparent: true, opacity: 0.03, side: THREE.BackSide })
    const pulse2 = new THREE.Mesh(pulse2Geo, pulse2Mat)
    scene.add(pulse2)

    // ── Quantum orbital rings ───────────────────────────────────────────────
    type RingEntry = { mesh: THREE.Mesh; speed: number }
    const rings: RingEntry[] = []

    const ringConfigs = [
      { radius: 3.8,  tube: 0.025, color: 0x00aaff, speed:  0.40, tilt: new THREE.Euler(0.4,  0,    0) },
      { radius: 5.2,  tube: 0.020, color: 0x7733ff, speed: -0.27, tilt: new THREE.Euler(1.1,  0.3,  0) },
      { radius: 6.8,  tube: 0.018, color: 0x00eeff, speed:  0.19, tilt: new THREE.Euler(0.2,  1.0,  0.5) },
      { radius: 8.5,  tube: 0.015, color: 0x5500dd, speed: -0.14, tilt: new THREE.Euler(1.5,  0.6,  0.2) },
      { radius: 10.5, tube: 0.013, color: 0x0066cc, speed:  0.10, tilt: new THREE.Euler(0.8,  1.4,  0.9) },
      { radius: 3.3,  tube: 0.022, color: 0x00ffcc, speed: -0.55, tilt: new THREE.Euler(Math.PI / 2, 0, 0.7) },
      { radius: 4.5,  tube: 0.016, color: 0xaa44ff, speed:  0.33, tilt: new THREE.Euler(Math.PI / 3, 0.5, 0) },
      { radius: 7.6,  tube: 0.014, color: 0x0099ff, speed: -0.22, tilt: new THREE.Euler(0.6,  0.9,  1.2) },
      { radius: 12.0, tube: 0.010, color: 0x3300cc, speed:  0.07, tilt: new THREE.Euler(1.2,  0.3,  0.6) },
    ]

    ringConfigs.forEach(cfg => {
      const geo  = new THREE.TorusGeometry(cfg.radius, cfg.tube, 8, 160)
      const mat  = new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.7 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.setRotationFromEuler(cfg.tilt)
      scene.add(mesh)
      rings.push({ mesh, speed: cfg.speed })
    })

    // ── Orbiting particles on rings ────────────────────────────────────────
    const orbitParticles: { mesh: THREE.Mesh; ring: number; angle: number; speed: number }[] = []
    const particleGeo = new THREE.SphereGeometry(0.07, 8, 8)

    ringConfigs.forEach((cfg, ri) => {
      const count = 3 + ri
      for (let i = 0; i < count; i++) {
        const mat  = new THREE.MeshBasicMaterial({ color: cfg.color })
        const mesh = new THREE.Mesh(particleGeo, mat)
        scene.add(mesh)
        orbitParticles.push({ mesh, ring: ri, angle: (i / count) * Math.PI * 2, speed: cfg.speed * 1.5 })
      }
    })

    // ── Grid plane (subtle quantum grid at the bottom) ─────────────────────
    const gridHelper = new THREE.GridHelper(120, 60, 0x001133, 0x001133)
    ;(gridHelper.material as THREE.Material).transparent = true
    ;(gridHelper.material as THREE.Material).opacity = 0.3
    gridHelper.position.y = -14
    scene.add(gridHelper)

    // ── Lights ─────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x0a0a2a, 3))
    const pl1 = new THREE.PointLight(0x0066ff, 8, 35); pl1.position.set(0, 0, 0); scene.add(pl1)
    const pl2 = new THREE.PointLight(0x6600ff, 4, 50); pl2.position.set(12, 8, 5); scene.add(pl2)
    const pl3 = new THREE.PointLight(0x00ffee, 3, 40); pl3.position.set(-10, -6, 8); scene.add(pl3)

    // ── Mouse tracking ─────────────────────────────────────────────────────
    const onMouse = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: -(e.clientY / window.innerHeight - 0.5) * 2,
      }
    }
    window.addEventListener('mousemove', onMouse)

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    // ── Animation loop ────────────────────────────────────────────────────
    let t = 0
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      t += 0.008

      rings.forEach(r => {
        r.mesh.rotation.y += r.speed * 0.012
        r.mesh.rotation.x += r.speed * 0.006
      })

      orbitParticles.forEach(p => {
        p.angle += p.speed * 0.014
        const cfg      = ringConfigs[p.ring]
        const ringMesh = rings[p.ring].mesh
        const local    = new THREE.Vector3(Math.cos(p.angle) * cfg.radius, Math.sin(p.angle) * cfg.radius, 0)
        local.applyEuler(ringMesh.rotation)
        p.mesh.position.copy(local)
      })

      // Core breathe
      const breathe = 1 + 0.10 * Math.sin(t * 2.2)
      glow.scale.setScalar(breathe)
      glowMat.opacity = 0.04 + 0.03 * Math.sin(t * 2.2)
      pulse2.scale.setScalar(1 + 0.07 * Math.sin(t * 1.5 + 1))
      pulse2Mat.opacity = 0.02 + 0.02 * Math.sin(t * 1.5)
      coreMat.emissiveIntensity = 1.4 + 0.6 * Math.sin(t * 1.8)
      core.rotation.y += 0.004
      core.rotation.z += 0.002

      stars.rotation.y += 0.00008
      stars.rotation.x += 0.00004

      // Mouse parallax
      if (!enteringRef.current) {
        camera.position.x += (mouseRef.current.x * 2.0 - camera.position.x) * 0.025
        camera.position.y += (mouseRef.current.y * 1.2 - camera.position.y) * 0.025
        camera.lookAt(0, 0, 0)
      }

      // Enter fly-through
      if (enteringRef.current) {
        camera.position.z -= 0.8
        camera.position.x *= 0.95
        camera.position.y *= 0.95
        camera.lookAt(0, 0, 0)
      }

      renderer.render(scene, camera)
    }
    animate()
    setTimeout(() => setReady(true), 350)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  const handleEnter = () => {
    if (enteringRef.current) return
    enteringRef.current = true
    setEntering(true)
    setTimeout(() => router.push('/unlock'), 1400)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000308', overflow: 'hidden', cursor: entering ? 'none' : 'default' }}>
      {/* Three.js canvas */}
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Radial vignette overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, rgba(0,1,8,0.65) 100%)',
        zIndex: 5,
      }} />

      {/* Scanline overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
      }} />

      {/* Flash-to-white on enter */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'white', opacity: entering ? 1 : 0,
        transition: entering ? 'opacity 0.6s ease 0.9s' : 'none',
        zIndex: 30,
      }} />

      {/* ── Main UI overlay ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        opacity: ready ? 1 : 0,
        transition: 'opacity 1.4s ease',
        pointerEvents: 'none',
        padding: '0 24px',
        gap: 0,
      }}>
        {/* System badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          marginBottom: '32px',
          opacity: entering ? 0 : 1,
          transition: 'opacity 0.4s',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ffcc', boxShadow: '0 0 10px #00ffcc', animation: 'none' }} />
          <span style={{
            color: 'rgba(0,220,200,0.55)', fontSize: '9px',
            fontFamily: 'monospace', letterSpacing: '0.32em', textTransform: 'uppercase',
          }}>
            QAP · QUANTUM FINANCIAL INFRASTRUCTURE · ONLINE
          </span>
        </div>

        {/* Main headline */}
        <div style={{
          textAlign: 'center', marginBottom: '16px',
          opacity: entering ? 0 : 1,
          transition: 'opacity 0.4s',
        }}>
          <p style={{
            color: 'rgba(120,160,255,0.45)',
            fontSize: 'clamp(9px,1.1vw,11px)',
            fontFamily: 'monospace', letterSpacing: '0.28em',
            textTransform: 'uppercase', marginBottom: '20px',
          }}>
            Welcome to the new
          </p>

          <h1 style={{
            fontFamily: "'Oxanium', monospace",
            fontSize: 'clamp(32px, 5.5vw, 72px)',
            fontWeight: 800,
            letterSpacing: '0.06em',
            lineHeight: 1.0,
            margin: 0,
            textTransform: 'uppercase',
            position: 'relative',
          }}>
            {/* Chromatic ghost layers */}
            <span style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, #00d4ff 0%, #7c3aff 50%, #00ffe0 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              filter: 'blur(0px)',
              transform: 'translate(-2px, 0)',
              opacity: 0.35,
              userSelect: 'none',
            }} aria-hidden>Quantum Financial<br />System</span>
            <span style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, #ff00aa 0%, #00ffee 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              transform: 'translate(2px, 0)',
              opacity: 0.25,
              userSelect: 'none',
            }} aria-hidden>Quantum Financial<br />System</span>
            {/* Main text */}
            <span style={{
              background: 'linear-gradient(135deg, #e8f4ff 0%, rgba(140,200,255,0.9) 40%, #7c3aff 75%, #00d4ff 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              position: 'relative',
              textShadow: 'none',
              display: 'block',
            }}>
              Quantum Financial<br />System
            </span>
          </h1>
        </div>

        {/* Divider line */}
        <div style={{
          width: 'clamp(120px, 20vw, 280px)', height: 1, marginBottom: '28px',
          background: 'linear-gradient(90deg, transparent, rgba(0,180,255,0.5), rgba(124,58,255,0.5), transparent)',
          opacity: entering ? 0 : 1,
          transition: 'opacity 0.4s',
        }} />

        {/* Spec pills */}
        <div style={{
          display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center',
          marginBottom: '48px',
          opacity: entering ? 0 : 1,
          transition: 'opacity 0.4s',
        }}>
          {['FIPS 204', 'FIPS 205', 'FIPS 203', 'Taproot', 'Bitcoin-Native'].map(tag => (
            <span key={tag} style={{
              color: 'rgba(100,180,255,0.6)', fontSize: '8px',
              fontFamily: 'monospace', letterSpacing: '0.18em',
              border: '1px solid rgba(0,120,255,0.2)', borderRadius: '20px',
              padding: '4px 12px', textTransform: 'uppercase',
              background: 'rgba(0,20,60,0.3)',
              backdropFilter: 'blur(6px)',
            }}>{tag}</span>
          ))}
        </div>

        {/* Enter button */}
        <button
          onClick={handleEnter}
          style={{
            pointerEvents: entering ? 'none' : 'auto',
            background: 'rgba(0,10,40,0.4)',
            border: '1px solid rgba(0,180,255,0.45)',
            color: 'rgba(120,210,255,0.95)',
            borderRadius: '50px',
            padding: '18px 72px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'monospace',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 0 40px rgba(0,120,255,0.12), 0 0 80px rgba(80,0,255,0.06), inset 0 1px 0 rgba(120,210,255,0.12)',
            opacity: entering ? 0 : 1,
            transition: 'opacity 0.4s, box-shadow 0.3s, border-color 0.3s',
            position: 'relative',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget
            el.style.boxShadow = '0 0 60px rgba(0,160,255,0.3), 0 0 120px rgba(80,0,255,0.12), inset 0 1px 0 rgba(120,210,255,0.18)'
            el.style.borderColor = 'rgba(0,200,255,0.7)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget
            el.style.boxShadow = '0 0 40px rgba(0,120,255,0.12), 0 0 80px rgba(80,0,255,0.06), inset 0 1px 0 rgba(120,210,255,0.12)'
            el.style.borderColor = 'rgba(0,180,255,0.45)'
          }}
        >
          Enter
        </button>
      </div>
    </div>
  )
}

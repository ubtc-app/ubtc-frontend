'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as THREE from 'three'

export default function LandingPage() {
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const frameRef = useRef<number>(0)
  const mouseRef = useRef({ x: 0, y: 0 })
  const enteringRef = useRef(false)
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [entering, setEntering] = useState(false)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x000408, 0.018)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400)
    camera.position.set(0, 0, 28)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000408, 1)
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // ── Starfield ──────────────────────────────────────────────────────────
    const starGeo = new THREE.BufferGeometry()
    const starCount = 2800
    const starPositions = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount * 3; i++) {
      starPositions[i] = (Math.random() - 0.5) * 300
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    const starMat = new THREE.PointsMaterial({ color: 0x99ccff, size: 0.18, transparent: true, opacity: 0.7 })
    const stars = new THREE.Points(starGeo, starMat)
    scene.add(stars)

    // ── Central glow sphere (logo stand-in core) ───────────────────────────
    const coreGeo = new THREE.SphereGeometry(1.2, 64, 64)
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0088ff,
      emissive: 0x0044cc,
      emissiveIntensity: 1.2,
      metalness: 0.8,
      roughness: 0.1,
      transparent: true,
      opacity: 0.92,
    })
    const core = new THREE.Mesh(coreGeo, coreMat)
    scene.add(core)

    // Inner pulse sphere
    const pulseGeo = new THREE.SphereGeometry(1.6, 32, 32)
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0x0066ff, transparent: true, opacity: 0.08, side: THREE.BackSide })
    const pulse = new THREE.Mesh(pulseGeo, pulseMat)
    scene.add(pulse)

    // ── Logo image texture ────────────────────────────────────────────────
    const logoTex = new THREE.TextureLoader().load('/wlb.png')
    const logoGeo = new THREE.PlaneGeometry(3.2, 3.2)
    const logoMat = new THREE.MeshBasicMaterial({
      map: logoTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending, // dark bg becomes transparent, bright logo glows
    })
    const logo = new THREE.Mesh(logoGeo, logoMat)
    logo.position.z = 1.4
    scene.add(logo)

    // ── Quantum orbital rings ───────────────────────────────────────────────
    const rings: { mesh: THREE.Mesh; speed: number; axis: THREE.Vector3; tilt: THREE.Euler }[] = []

    const ringConfigs = [
      { radius: 3.8, tube: 0.022, color: 0x00aaff, speed: 0.38, tilt: new THREE.Euler(0.4, 0, 0) },
      { radius: 5.2, tube: 0.018, color: 0x0066dd, speed: -0.25, tilt: new THREE.Euler(1.1, 0.3, 0) },
      { radius: 6.8, tube: 0.016, color: 0x0044bb, speed: 0.18, tilt: new THREE.Euler(0.2, 1.0, 0.5) },
      { radius: 8.5, tube: 0.014, color: 0x003399, speed: -0.13, tilt: new THREE.Euler(1.5, 0.6, 0.2) },
      { radius: 10.2, tube: 0.012, color: 0x002266, speed: 0.09, tilt: new THREE.Euler(0.8, 1.4, 0.9) },
      { radius: 3.4, tube: 0.020, color: 0x44ccff, speed: -0.52, tilt: new THREE.Euler(Math.PI / 2, 0, 0.7) },
      { radius: 4.6, tube: 0.015, color: 0x2299ee, speed: 0.31, tilt: new THREE.Euler(Math.PI / 3, 0.5, 0) },
    ]

    ringConfigs.forEach(cfg => {
      const geo = new THREE.TorusGeometry(cfg.radius, cfg.tube, 8, 128)
      const mat = new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.65 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.setRotationFromEuler(cfg.tilt)
      scene.add(mesh)
      rings.push({ mesh, speed: cfg.speed, axis: new THREE.Vector3(0.2, 1, 0.1).normalize(), tilt: cfg.tilt })
    })

    // ── Orbiting particles on rings ────────────────────────────────────────
    const orbitParticles: { mesh: THREE.Mesh; ring: number; angle: number; speed: number }[] = []
    const particleGeo = new THREE.SphereGeometry(0.06, 8, 8)

    ringConfigs.forEach((cfg, ri) => {
      const count = 3 + ri
      for (let i = 0; i < count; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: cfg.color })
        const mesh = new THREE.Mesh(particleGeo, mat)
        scene.add(mesh)
        orbitParticles.push({ mesh, ring: ri, angle: (i / count) * Math.PI * 2, speed: cfg.speed * 1.4 })
      }
    })

    // ── Ambient / point lights ─────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x112244, 2))
    const pl = new THREE.PointLight(0x0088ff, 6, 30)
    pl.position.set(0, 0, 0)
    scene.add(pl)
    const pl2 = new THREE.PointLight(0x004488, 3, 50)
    pl2.position.set(10, 8, 5)
    scene.add(pl2)

    // ── Mouse tracking ─────────────────────────────────────────────────────
    const onMouse = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: -(e.clientY / window.innerHeight - 0.5) * 2,
      }
    }
    window.addEventListener('mousemove', onMouse)

    // ── Resize ────────────────────────────────────────────────────────────
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

      // Rotate rings
      rings.forEach((r, i) => {
        r.mesh.rotation.y += r.speed * 0.012
        r.mesh.rotation.x += r.speed * 0.006
      })

      // Update orbiting particles
      orbitParticles.forEach(p => {
        p.angle += p.speed * 0.015
        const cfg = ringConfigs[p.ring]
        const ringMesh = rings[p.ring].mesh
        // Position on ring in local space then transform
        const local = new THREE.Vector3(
          Math.cos(p.angle) * cfg.radius,
          Math.sin(p.angle) * cfg.radius,
          0
        )
        local.applyEuler(ringMesh.rotation)
        p.mesh.position.copy(local)
      })

      // Core pulse
      const pScale = 1 + 0.12 * Math.sin(t * 2.5)
      pulse.scale.setScalar(pScale)
      pulseMat.opacity = 0.06 + 0.04 * Math.sin(t * 2.5)

      // Logo always faces camera
      logo.lookAt(camera.position)

      // Subtle core rotation glow
      core.rotation.y += 0.003
      ;(coreMat as THREE.MeshStandardMaterial).emissiveIntensity = 1.0 + 0.4 * Math.sin(t * 1.8)

      // Stars slow drift
      stars.rotation.y += 0.0001
      stars.rotation.x += 0.00005

      // Mouse parallax on camera (subtle)
      if (!enteringRef.current) {
        camera.position.x += (mouseRef.current.x * 1.5 - camera.position.x) * 0.03
        camera.position.y += (mouseRef.current.y * 1.0 - camera.position.y) * 0.03
        camera.lookAt(0, 0, 0)
      }

      // ── Enter animation: fly through to logo ──
      if (enteringRef.current) {
        camera.position.z -= 0.7
        camera.position.x *= 0.96
        camera.position.y *= 0.96
        camera.lookAt(0, 0, 0)
      }

      renderer.render(scene, camera)
    }
    animate()

    // Fade in
    setTimeout(() => setReady(true), 300)

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
    // White flash appears at 0.9s (CSS transition), navigate just after
    setTimeout(() => router.push('/unlock'), 1400)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000408', overflow: 'hidden', cursor: entering ? 'none' : 'default' }}>
      {/* Three.js canvas mount */}
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Flash-to-white on enter */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'white',
        opacity: entering ? 1 : 0,
        transition: entering ? 'opacity 0.6s ease 0.9s' : 'none',
        zIndex: 30,
      }} />

      {/* UI overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-end',
        padding: '0 0 60px',
        opacity: ready ? 1 : 0,
        transition: 'opacity 1.2s ease',
        pointerEvents: 'none',
      }}>
        {/* Enter button */}
        <button
          onClick={handleEnter}
          style={{
            pointerEvents: entering ? 'none' : 'auto',
            background: 'rgba(0,30,60,0.3)',
            border: '1px solid rgba(0,160,255,0.4)',
            color: 'rgba(100,200,255,0.9)',
            borderRadius: '50px',
            padding: '16px 64px',
            fontSize: '12px',
            fontWeight: '700',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'monospace',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 0 30px rgba(0,100,255,0.15), inset 0 1px 0 rgba(100,200,255,0.1)',
            opacity: entering ? 0 : 1,
            transition: 'opacity 0.4s, box-shadow 0.3s',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.boxShadow = '0 0 50px rgba(0,140,255,0.35), inset 0 1px 0 rgba(100,200,255,0.2)' }}
          onMouseLeave={e => { (e.target as HTMLElement).style.boxShadow = '0 0 30px rgba(0,100,255,0.15), inset 0 1px 0 rgba(100,200,255,0.1)' }}
        >
          Enter
        </button>

        {/* Tiny tagline */}
        <p style={{
          marginTop: '20px',
          color: 'rgba(60,120,180,0.5)',
          fontSize: '9px',
          fontFamily: 'monospace',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          opacity: entering ? 0 : 1,
          transition: 'opacity 0.3s',
        }}>
          FIPS 204 · FIPS 205 · FIPS 203 · Post-Quantum
        </p>
      </div>
    </div>
  )
}

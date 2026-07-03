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
    scene.fog    = new THREE.FogExp2(0x000208, 0.012)
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 600)
    camera.position.set(0, 0, 32)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000208, 1)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // ── Post-processing bloom via composer ─────────────────────────────────
    let composer: { render: () => void; setSize: (w: number, h: number) => void } | null = null
    ;(async () => {
      try {
        const { EffectComposer } = await import('three/addons/postprocessing/EffectComposer.js' as any)
        const { RenderPass }     = await import('three/addons/postprocessing/RenderPass.js' as any)
        const { UnrealBloomPass } = await import('three/addons/postprocessing/UnrealBloomPass.js' as any)
        const comp = new EffectComposer(renderer)
        comp.addPass(new RenderPass(scene, camera))
        const bloom = new UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          1.8,   // strength
          0.5,   // radius
          0.15,  // threshold
        )
        comp.addPass(bloom)
        composer = comp
      } catch {
        // bloom not available — fall back to plain renderer
      }
    })()

    // ── Starfield ──────────────────────────────────────────────────────────
    const starCount  = 5000
    const starPos    = new Float32Array(starCount * 3)
    const starColors = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      const r = 50 + Math.random() * 350
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      starPos[i*3]   = r * Math.sin(phi) * Math.cos(theta)
      starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta)
      starPos[i*3+2] = r * Math.cos(phi)
      const roll = Math.random()
      if (roll < 0.33) { starColors[i*3]=0.5; starColors[i*3+1]=0.85; starColors[i*3+2]=1.0 }
      else if (roll < 0.6) { starColors[i*3]=0.7; starColors[i*3+1]=0.5; starColors[i*3+2]=1.0 }
      else { starColors[i*3]=0.92; starColors[i*3+1]=0.96; starColors[i*3+2]=1.0 }
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    starGeo.setAttribute('color',    new THREE.BufferAttribute(starColors, 3))
    const starMat = new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, opacity: 0.9, sizeAttenuation: true })
    const stars = new THREE.Points(starGeo, starMat)
    scene.add(stars)

    // ── Nebula particle clusters ───────────────────────────────────────────
    const nebulaClusters = [
      { pos: new THREE.Vector3(-30, 15, -60), color: 0x1a00ff, count: 600 },
      { pos: new THREE.Vector3( 40, -20, -80), color: 0x00aaff, count: 500 },
      { pos: new THREE.Vector3(-15, -30, -50), color: 0x7700ff, count: 400 },
    ]
    nebulaClusters.forEach(({ pos, color, count }) => {
      const geo  = new THREE.BufferGeometry()
      const pts  = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) {
        pts[i*3]   = pos.x + (Math.random() - 0.5) * 30
        pts[i*3+1] = pos.y + (Math.random() - 0.5) * 20
        pts[i*3+2] = pos.z + (Math.random() - 0.5) * 25
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pts, 3))
      const mat = new THREE.PointsMaterial({ color, size: 0.15, transparent: true, opacity: 0.18, sizeAttenuation: true })
      scene.add(new THREE.Points(geo, mat))
    })

    // ── Central quantum core ───────────────────────────────────────────────
    const coreGeo = new THREE.SphereGeometry(1.5, 64, 64)
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0044cc,
      emissive: 0x3300ff,
      emissiveIntensity: 3.0,
      metalness: 0.95,
      roughness: 0.02,
      transparent: true,
      opacity: 0.92,
    })
    const core = new THREE.Mesh(coreGeo, coreMat)
    scene.add(core)

    // Inner energy orb (hotter)
    const innerGeo = new THREE.SphereGeometry(0.7, 32, 32)
    const innerMat = new THREE.MeshBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.6 })
    const innerOrb = new THREE.Mesh(innerGeo, innerMat)
    scene.add(innerOrb)

    // Glow shells
    const glowGeo  = new THREE.SphereGeometry(2.4, 32, 32)
    const glowMat  = new THREE.MeshBasicMaterial({ color: 0x3300ff, transparent: true, opacity: 0.06, side: THREE.BackSide })
    const glow     = new THREE.Mesh(glowGeo, glowMat)
    scene.add(glow)

    const pulse2Geo = new THREE.SphereGeometry(3.4, 32, 32)
    const pulse2Mat = new THREE.MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.03, side: THREE.BackSide })
    const pulse2    = new THREE.Mesh(pulse2Geo, pulse2Mat)
    scene.add(pulse2)

    const pulse3Geo = new THREE.SphereGeometry(5.0, 32, 32)
    const pulse3Mat = new THREE.MeshBasicMaterial({ color: 0x0055ff, transparent: true, opacity: 0.015, side: THREE.BackSide })
    scene.add(new THREE.Mesh(pulse3Geo, pulse3Mat))

    // ── Quantum orbital rings ───────────────────────────────────────────────
    type RingEntry = { mesh: THREE.Mesh; speed: number; mat: THREE.MeshBasicMaterial }
    const rings: RingEntry[] = []

    const ringConfigs = [
      { radius: 3.8,  tube: 0.03,  color: 0x00aaff, speed:  0.42, tilt: new THREE.Euler(0.4,  0,    0) },
      { radius: 5.2,  tube: 0.025, color: 0x8833ff, speed: -0.28, tilt: new THREE.Euler(1.1,  0.3,  0) },
      { radius: 6.8,  tube: 0.022, color: 0x00eeff, speed:  0.20, tilt: new THREE.Euler(0.2,  1.0,  0.5) },
      { radius: 8.5,  tube: 0.018, color: 0x6600ff, speed: -0.15, tilt: new THREE.Euler(1.5,  0.6,  0.2) },
      { radius: 10.5, tube: 0.015, color: 0x0088ee, speed:  0.10, tilt: new THREE.Euler(0.8,  1.4,  0.9) },
      { radius: 3.3,  tube: 0.028, color: 0x00ffcc, speed: -0.58, tilt: new THREE.Euler(Math.PI / 2, 0, 0.7) },
      { radius: 4.5,  tube: 0.020, color: 0xaa44ff, speed:  0.35, tilt: new THREE.Euler(Math.PI / 3, 0.5, 0) },
      { radius: 7.6,  tube: 0.016, color: 0x0099ff, speed: -0.23, tilt: new THREE.Euler(0.6,  0.9,  1.2) },
      { radius: 12.0, tube: 0.012, color: 0x4400dd, speed:  0.07, tilt: new THREE.Euler(1.2,  0.3,  0.6) },
      { radius: 14.5, tube: 0.010, color: 0x0066bb, speed: -0.05, tilt: new THREE.Euler(0.9,  1.7,  0.4) },
    ]

    ringConfigs.forEach(cfg => {
      const geo  = new THREE.TorusGeometry(cfg.radius, cfg.tube, 8, 160)
      const mat  = new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.8 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.setRotationFromEuler(cfg.tilt)
      scene.add(mesh)
      rings.push({ mesh, speed: cfg.speed, mat })
    })

    // ── Orbiting particles on rings ────────────────────────────────────────
    const orbitParticles: { mesh: THREE.Mesh; ring: number; angle: number; speed: number }[] = []
    const particleGeo = new THREE.SphereGeometry(0.09, 8, 8)

    ringConfigs.forEach((cfg, ri) => {
      const count = 3 + ri
      for (let i = 0; i < count; i++) {
        const mat  = new THREE.MeshBasicMaterial({ color: cfg.color })
        const mesh = new THREE.Mesh(particleGeo, mat)
        scene.add(mesh)
        orbitParticles.push({ mesh, ring: ri, angle: (i / count) * Math.PI * 2, speed: cfg.speed * 1.5 })
      }
    })

    // ── Electric arc lines (energy tendrils) ──────────────────────────────
    const arcLines: THREE.Line[] = []
    const arcData: { phase: number; speed: number; targetRing: number }[] = []
    const arcCount = 8

    for (let i = 0; i < arcCount; i++) {
      const points: THREE.Vector3[] = []
      const segments = 12
      for (let s = 0; s <= segments; s++) points.push(new THREE.Vector3())
      const geo = new THREE.BufferGeometry().setFromPoints(points)
      const mat = new THREE.LineBasicMaterial({
        color: i % 2 === 0 ? 0x00d4ff : 0x7c3aff,
        transparent: true,
        opacity: 0.6,
      })
      const line = new THREE.Line(geo, mat)
      scene.add(line)
      arcLines.push(line)
      arcData.push({ phase: (i / arcCount) * Math.PI * 2, speed: 0.8 + Math.random() * 1.2, targetRing: i % ringConfigs.length })
    }

    function updateArc(line: THREE.Line, phase: number, targetRing: number, t: number) {
      const cfg    = ringConfigs[targetRing]
      const angle  = phase + t * 0.4
      const endX   = Math.cos(angle) * cfg.radius * 0.7
      const endY   = Math.sin(angle) * cfg.radius * 0.7
      const endZ   = Math.sin(angle * 0.6) * 2
      const posArr = line.geometry.attributes.position as THREE.BufferAttribute
      const segs   = posArr.count - 1

      for (let s = 0; s <= segs; s++) {
        const frac  = s / segs
        const jitter = Math.sin(frac * Math.PI * 3 + t * arcData.findIndex(d => d.phase === phase) * 0.1) * 0.3 * Math.sin(frac * Math.PI)
        posArr.setXYZ(s,
          endX * frac + jitter,
          endY * frac + jitter * 0.6,
          endZ * frac,
        )
      }
      posArr.needsUpdate = true
    }

    // ── Wormhole tunnel rings (deep background) ────────────────────────────
    const tunnelRings: THREE.Mesh[] = []
    for (let i = 0; i < 20; i++) {
      const z   = -20 - i * 8
      const rad = 6 + i * 1.2
      const geo = new THREE.TorusGeometry(rad, 0.04, 6, 80)
      const hue = i % 2 === 0 ? 0x0033aa : 0x220055
      const mat = new THREE.MeshBasicMaterial({ color: hue, transparent: true, opacity: Math.max(0.04, 0.18 - i * 0.008) })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.z = z
      scene.add(mesh)
      tunnelRings.push(mesh)
    }

    // ── Grid plane ────────────────────────────────────────────────────────
    const gridHelper = new THREE.GridHelper(160, 80, 0x001144, 0x000822)
    ;(gridHelper.material as THREE.Material).transparent = true
    ;(gridHelper.material as THREE.Material).opacity = 0.35
    gridHelper.position.y = -16
    scene.add(gridHelper)

    // ── Lights ────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x080820, 4))
    const pl1 = new THREE.PointLight(0x0044ff, 12, 40); pl1.position.set(0, 0, 0); scene.add(pl1)
    const pl2 = new THREE.PointLight(0x6600ff, 6,  60); pl2.position.set(12, 8, 5); scene.add(pl2)
    const pl3 = new THREE.PointLight(0x00ffee, 4,  45); pl3.position.set(-10, -6, 8); scene.add(pl3)
    const pl4 = new THREE.PointLight(0xff0088, 2,  30); pl4.position.set(0, 10, -5); scene.add(pl4)

    // ── Mouse tracking ────────────────────────────────────────────────────
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
      if (composer) composer.setSize(window.innerWidth, window.innerHeight)
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
        // subtle opacity pulse per ring
        r.mat.opacity = 0.65 + 0.2 * Math.sin(t * 1.2 + r.speed)
      })

      orbitParticles.forEach(p => {
        p.angle += p.speed * 0.014
        const cfg      = ringConfigs[p.ring]
        const ringMesh = rings[p.ring].mesh
        const local    = new THREE.Vector3(Math.cos(p.angle) * cfg.radius, Math.sin(p.angle) * cfg.radius, 0)
        local.applyEuler(ringMesh.rotation)
        p.mesh.position.copy(local)
      })

      // Electric arcs
      arcData.forEach((d, i) => {
        updateArc(arcLines[i], d.phase + t * d.speed * 0.15, d.targetRing, t)
        ;(arcLines[i].material as THREE.LineBasicMaterial).opacity = 0.3 + 0.4 * Math.abs(Math.sin(t * d.speed + d.phase))
      })

      // Tunnel ring slow spin
      tunnelRings.forEach((r, i) => {
        r.rotation.z += 0.002 * (i % 2 === 0 ? 1 : -1)
      })

      // Core breathe
      const breathe = 1 + 0.12 * Math.sin(t * 2.2)
      glow.scale.setScalar(breathe)
      glowMat.opacity  = 0.05 + 0.04 * Math.sin(t * 2.2)
      pulse2.scale.setScalar(1 + 0.08 * Math.sin(t * 1.5 + 1))
      pulse2Mat.opacity = 0.025 + 0.02 * Math.sin(t * 1.5)
      coreMat.emissiveIntensity = 2.5 + 1.0 * Math.sin(t * 1.8)
      core.rotation.y  += 0.005
      core.rotation.z  += 0.003
      innerOrb.scale.setScalar(0.9 + 0.18 * Math.sin(t * 3.1))
      innerMat.opacity = 0.4 + 0.3 * Math.sin(t * 2.5)

      // Rotating point lights
      pl2.position.x = 12 * Math.cos(t * 0.3)
      pl2.position.z = 12 * Math.sin(t * 0.3)
      pl3.position.x = -10 * Math.cos(t * 0.2 + 1)
      pl3.position.z =  10 * Math.sin(t * 0.2 + 1)

      stars.rotation.y += 0.00006
      stars.rotation.x += 0.00003

      // Mouse parallax
      if (!enteringRef.current) {
        camera.position.x += (mouseRef.current.x * 2.5 - camera.position.x) * 0.022
        camera.position.y += (mouseRef.current.y * 1.5 - camera.position.y) * 0.022
        camera.lookAt(0, 0, 0)
      }

      // Enter fly-through — accelerating plunge into the core
      if (enteringRef.current) {
        camera.position.z -= 1.1 + (32 - camera.position.z) * 0.02
        camera.position.x *= 0.93
        camera.position.y *= 0.93
        coreMat.emissiveIntensity = Math.min(8, coreMat.emissiveIntensity + 0.15)
        innerMat.opacity = Math.min(1, innerMat.opacity + 0.05)
        camera.lookAt(0, 0, 0)
      }

      if (composer) {
        composer.render()
      } else {
        renderer.render(scene, camera)
      }
    }
    animate()
    setTimeout(() => setReady(true), 300)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  const handleEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (enteringRef.current) return
    enteringRef.current = true
    setEntering(true)
    const rect = e.currentTarget.getBoundingClientRect()
    const ox = rect.left + rect.width / 2
    const oy = rect.top  + rect.height / 2
    // Fire local particle burst via custom event (QuantumTransition listens)
    window.dispatchEvent(new CustomEvent('qt-burst', { detail: { x: ox, y: oy } }))
    setTimeout(() => router.push('/unlock'), 1600)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000208', overflow: 'hidden', cursor: entering ? 'none' : 'default' }}>
      {/* Three.js canvas */}
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Radial vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 65% 65% at 50% 50%, transparent 25%, rgba(0,1,8,0.7) 100%)',
        zIndex: 5,
      }} />

      {/* Scanline texture */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 4px)',
      }} />

      {/* Entering white flash */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(100,160,255,1), white)',
        opacity: entering ? 1 : 0,
        transition: entering ? 'opacity 0.5s ease 1.2s' : 'none',
        zIndex: 30,
      }} />

      {/* ── Main UI overlay ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        opacity: ready ? 1 : 0,
        transition: 'opacity 1.6s ease',
        pointerEvents: 'none',
        padding: '0 24px',
      }}>
        {/* System badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          marginBottom: '36px',
          opacity: entering ? 0 : 1,
          transition: 'opacity 0.4s',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ffcc', boxShadow: '0 0 12px 3px #00ffcc88' }} />
          <span style={{
            color: 'rgba(0,220,200,0.55)', fontSize: '9px',
            fontFamily: 'monospace', letterSpacing: '0.32em', textTransform: 'uppercase',
          }}>
            QAP · QUANTUM FINANCIAL INFRASTRUCTURE · ONLINE
          </span>
        </div>

        {/* Main headline with chromatic aberration */}
        <div style={{
          textAlign: 'center', marginBottom: '18px',
          opacity: entering ? 0 : 1,
          transition: 'opacity 0.4s',
        }}>
          <p style={{
            color: 'rgba(120,160,255,0.45)',
            fontSize: 'clamp(9px,1.1vw,11px)',
            fontFamily: 'monospace', letterSpacing: '0.28em',
            textTransform: 'uppercase', marginBottom: '22px',
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
            filter: 'drop-shadow(0 0 40px rgba(0,100,255,0.4))',
          }}>
            <span style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, #00d4ff 0%, #7c3aff 50%, #00ffe0 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
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
            <span style={{
              background: 'linear-gradient(135deg, #e8f4ff 0%, rgba(140,200,255,0.9) 40%, #7c3aff 75%, #00d4ff 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              position: 'relative',
              display: 'block',
            }}>
              Quantum Financial<br />System
            </span>
          </h1>
        </div>

        {/* Divider */}
        <div style={{
          width: 'clamp(120px, 20vw, 280px)', height: 1, marginBottom: '28px',
          background: 'linear-gradient(90deg, transparent, rgba(0,180,255,0.6), rgba(124,58,255,0.6), transparent)',
          opacity: entering ? 0 : 1,
          transition: 'opacity 0.4s',
          boxShadow: '0 0 12px rgba(0,150,255,0.4)',
        }} />

        {/* Spec pills */}
        <div style={{
          display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center',
          marginBottom: '52px',
          opacity: entering ? 0 : 1,
          transition: 'opacity 0.4s',
        }}>
          {['FIPS 204', 'FIPS 205', 'FIPS 203', 'Taproot', 'Bitcoin-Native'].map(tag => (
            <span key={tag} style={{
              color: 'rgba(100,180,255,0.65)', fontSize: '8px',
              fontFamily: 'monospace', letterSpacing: '0.18em',
              border: '1px solid rgba(0,120,255,0.25)', borderRadius: '20px',
              padding: '4px 12px', textTransform: 'uppercase',
              background: 'rgba(0,20,60,0.35)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 0 10px rgba(0,80,255,0.08)',
            }}>{tag}</span>
          ))}
        </div>

        {/* Enter button */}
        <button
          onClick={handleEnter}
          style={{
            pointerEvents: entering ? 'none' : 'auto',
            background: 'rgba(0,10,40,0.45)',
            border: '1px solid rgba(0,180,255,0.5)',
            color: 'rgba(120,210,255,0.95)',
            borderRadius: '50px',
            padding: '18px 72px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'monospace',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 0 50px rgba(0,120,255,0.15), 0 0 100px rgba(80,0,255,0.08), inset 0 1px 0 rgba(120,210,255,0.15)',
            opacity: entering ? 0 : 1,
            transition: 'opacity 0.4s, box-shadow 0.3s, border-color 0.3s, transform 0.2s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget
            el.style.boxShadow = '0 0 80px rgba(0,160,255,0.35), 0 0 140px rgba(80,0,255,0.15), inset 0 1px 0 rgba(120,210,255,0.2)'
            el.style.borderColor = 'rgba(0,210,255,0.8)'
            el.style.transform = 'scale(1.04)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget
            el.style.boxShadow = '0 0 50px rgba(0,120,255,0.15), 0 0 100px rgba(80,0,255,0.08), inset 0 1px 0 rgba(120,210,255,0.15)'
            el.style.borderColor = 'rgba(0,180,255,0.5)'
            el.style.transform = 'scale(1)'
          }}
        >
          Enter
        </button>
      </div>
    </div>
  )
}

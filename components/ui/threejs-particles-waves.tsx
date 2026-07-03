'use client'
import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { cn } from '@/lib/utils'

interface ParticleWavesProps {
  className?: string
  initialDensity?: number
  initialSpeed?: number
  initialAmplitude?: number
  initialSeparation?: number
  initialParticleColor?: string
  initialBgColor?: string
  showControls?: boolean
}

const ParticleWaves = ({
  className,
  initialDensity = 50,
  initialSpeed = 0.1,
  initialAmplitude = 50,
  initialSeparation = 100,
  initialParticleColor = '#00d4ff',
  initialBgColor = '#000208',
  showControls = false,
}: ParticleWavesProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const particlesRef = useRef<THREE.Sprite[]>([])
  const materialRef = useRef<THREE.SpriteMaterial | null>(null)
  const animationRef = useRef<number>(0)

  const [density, setDensity] = useState(initialDensity)
  const [speed, setSpeed] = useState(initialSpeed)
  const [amplitude, setAmplitude] = useState(initialAmplitude)
  const [separation, setSeparation] = useState(initialSeparation)
  const [particleColor, setParticleColor] = useState(initialParticleColor)
  const [bgColor, setBgColor] = useState(initialBgColor)

  const countRef = useRef(0)
  const mouseRef = useRef({ x: 0, y: 0 })
  const windowHalfRef = useRef({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
  })

  const densityRef = useRef(density)
  const speedRef = useRef(speed)
  const amplitudeRef = useRef(amplitude)
  const separationRef = useRef(separation)

  useEffect(() => { densityRef.current = density }, [density])
  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { amplitudeRef.current = amplitude }, [amplitude])
  useEffect(() => { separationRef.current = separation }, [separation])

  const createParticleMaterial = (color: string) => {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const context = canvas.getContext('2d')!
    context.clearRect(0, 0, 32, 32)
    // Glowing dot with radial gradient
    const grad = context.createRadialGradient(16, 16, 0, 16, 16, 14)
    grad.addColorStop(0, color)
    grad.addColorStop(0.5, color + 'aa')
    grad.addColorStop(1, color + '00')
    context.fillStyle = grad
    context.beginPath()
    context.arc(16, 16, 14, 0, Math.PI * 2, true)
    context.fill()
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return new THREE.SpriteMaterial({ map: texture, transparent: true, blending: THREE.AdditiveBlending })
  }

  const recreateParticles = (
    scene: THREE.Scene,
    material: THREE.SpriteMaterial,
    d: number,
    sep: number,
  ) => {
    particlesRef.current.forEach(p => scene.remove(p))
    particlesRef.current = []
    for (let ix = 0; ix < d; ix++) {
      for (let iy = 0; iy < d; iy++) {
        const particle = new THREE.Sprite(material)
        particle.position.x = ix * sep - (d * sep) / 2
        particle.position.z = iy * sep - (d * sep) / 2
        particle.position.y = -400
        particle.scale.setScalar(10)
        particlesRef.current.push(particle)
        scene.add(particle)
      }
    }
  }

  useEffect(() => {
    if (!containerRef.current) return

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 10000)
    camera.position.z = 1000
    camera.position.y = 800
    cameraRef.current = camera

    const scene = new THREE.Scene()
    sceneRef.current = scene

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(new THREE.Color(bgColor), 1)
    rendererRef.current = renderer
    containerRef.current.appendChild(renderer.domElement)

    materialRef.current = createParticleMaterial(particleColor)
    recreateParticles(scene, materialRef.current, densityRef.current, separationRef.current)

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX - windowHalfRef.current.x
      mouseRef.current.y = e.clientY - windowHalfRef.current.y
    }
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        mouseRef.current.x = e.touches[0].pageX - windowHalfRef.current.x
        mouseRef.current.y = e.touches[0].pageY - windowHalfRef.current.y
      }
    }
    const handleResize = () => {
      windowHalfRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate)
      camera.position.x += (mouseRef.current.x - camera.position.x) * 0.05
      camera.position.y += (-mouseRef.current.y - camera.position.y) * 0.05
      camera.lookAt(scene.position)

      let i = 0
      const d = densityRef.current
      const amp = amplitudeRef.current
      const spd = speedRef.current
      for (let ix = 0; ix < d; ix++) {
        for (let iy = 0; iy < d; iy++) {
          if (i < particlesRef.current.length) {
            const p = particlesRef.current[i++]
            p.position.y =
              -400 +
              Math.sin((ix + countRef.current) * 0.3) * amp +
              Math.sin((iy + countRef.current) * 0.5) * amp
            const scale =
              (Math.sin((ix + countRef.current) * 0.3) + 1) * 2 +
              (Math.sin((iy + countRef.current) * 0.5) + 1) * 2
            p.scale.setScalar(scale * 2)
          }
        }
      }

      renderer.render(scene, camera)
      countRef.current += spd
    }
    animate()

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationRef.current)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      const el = containerRef.current
      if (el && renderer.domElement.parentNode === el) el.removeChild(renderer.domElement)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync bg color
  useEffect(() => {
    rendererRef.current?.setClearColor(new THREE.Color(bgColor), 1)
  }, [bgColor])

  // Sync particle color
  useEffect(() => {
    if (!sceneRef.current) return
    materialRef.current = createParticleMaterial(particleColor)
    particlesRef.current.forEach(p => { p.material = materialRef.current! })
  }, [particleColor]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync density / separation — recreate grid
  useEffect(() => {
    if (!sceneRef.current || !materialRef.current) return
    recreateParticles(sceneRef.current, materialRef.current, density, separation)
  }, [density, separation])

  const applyPreset = (pc: string, bc: string) => { setParticleColor(pc); setBgColor(bc) }

  return (
    <div className={cn('relative w-full h-screen overflow-hidden', className)}>
      <div ref={containerRef} className="absolute inset-0" />

      {showControls && (
        <>
          <div className="absolute top-3 left-3 text-white/40 text-[10px] z-10 font-mono tracking-widest uppercase">
            Move mouse to control camera
          </div>

          <div className="absolute top-3 right-3 z-10 w-52 rounded-xl border border-white/10 bg-black/70 backdrop-blur-xl p-4 text-white text-xs space-y-3">
            {[
              { label: 'Density', min: 10, max: 80, step: 1, val: density, set: setDensity, fmt: (v: number) => `${v}×${v}` },
              { label: 'Wave Speed', min: 0.01, max: 0.3, step: 0.01, val: speed, set: setSpeed, fmt: (v: number) => v.toFixed(2) },
              { label: 'Wave Height', min: 10, max: 150, step: 1, val: amplitude, set: setAmplitude, fmt: (v: number) => `${v}` },
              { label: 'Spacing', min: 50, max: 200, step: 1, val: separation, set: setSeparation, fmt: (v: number) => `${v}` },
            ].map(({ label, min, max, step, val, set, fmt }) => (
              <div key={label}>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-white/80">{label}</span>
                  <span className="text-white/40 font-mono">{fmt(val as number)}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={val as number}
                  onChange={e => (set as (v: number) => void)(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
                  className="w-full accent-cyan-400 h-1"
                />
              </div>
            ))}

            <div>
              <div className="font-semibold text-white/80 mb-2">Colors</div>
              <div className="flex gap-3 mb-2">
                {[
                  { label: 'Particles', val: particleColor, set: setParticleColor },
                  { label: 'Background', val: bgColor, set: setBgColor },
                ].map(({ label, val, set }) => (
                  <div key={label} className="flex-1">
                    <div className="text-white/40 text-[10px] mb-1">{label}</div>
                    <input type="color" value={val}
                      onChange={e => set(e.target.value)}
                      className="w-10 h-6 rounded border-none cursor-pointer bg-transparent"
                    />
                  </div>
                ))}
              </div>
              <div className="text-white/40 text-[10px] mb-1">Presets</div>
              <div className="grid grid-cols-5 gap-1">
                {[
                  ['#ffffff','#000000'],['#00d4ff','#000208'],['#ff6b6b','#0a0a0a'],
                  ['#7c3aff','#0d0020'],['#00ffe0','#001a14'],
                ].map(([pc, bc]) => (
                  <button key={pc+bc} onClick={() => applyPreset(pc, bc)}
                    className="h-6 rounded border border-white/20 hover:border-white/60 hover:scale-110 transition-all"
                    style={{ background: `linear-gradient(90deg, ${pc} 50%, ${bc} 50%)` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ParticleWaves

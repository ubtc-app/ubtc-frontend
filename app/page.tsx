'use client'
import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animId: number
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; pulse: number }[] = []

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
        pulse: Math.random() * Math.PI * 2,
      })
    }

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      particles.forEach((p, i) => {
        p.x += p.vx
        p.y += p.vy
        p.pulse += 0.02
        if (p.x < 0) p.x = canvas!.width
        if (p.x > canvas!.width) p.x = 0
        if (p.y < 0) p.y = canvas!.height
        if (p.y > canvas!.height) p.y = 0

        const glow = p.alpha * (0.5 + 0.5 * Math.sin(p.pulse))
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(0, 191, 255, ${glow})`
        ctx!.fill()

        particles.slice(i + 1).forEach(p2 => {
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx!.beginPath()
            ctx!.moveTo(p.x, p.y)
            ctx!.lineTo(p2.x, p2.y)
            ctx!.strokeStyle = `rgba(0, 191, 255, ${0.06 * (1 - dist / 120)})`
            ctx!.lineWidth = 0.5
            ctx!.stroke()
          }
        })
      })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
}

function QuantumRing({ delay = 0, size = 300, duration = 20 }: { delay?: number; size?: number; duration?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotateX: 75, rotateZ: 0 }}
      animate={{ opacity: [0, 0.15, 0.15, 0], scale: [0.8, 1, 1.1, 1.2], rotateZ: 360 }}
      transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
      style={{
        position: 'absolute', width: size, height: size,
        border: '1px solid rgba(0, 191, 255, 0.2)',
        borderRadius: '50%',
        transformStyle: 'preserve-3d',
      }}
    />
  )
}

function GlowOrb() {
  return (
    <motion.div
      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(0,191,255,0.15) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(40px)',
      }}
    />
  )
}

const textReveal: any = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.8, delay: i * 0.15, ease: [0.25, 0.4, 0.25, 1] }
  }),
}

const letterReveal: any = {
  hidden: { opacity: 0, y: 50 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: 0.8 + i * 0.03, ease: [0.25, 0.4, 0.25, 1] }
  }),
}

export default function LandingPage() {
  const router = useRouter()
  const [entered, setEntered] = useState(false)
  const [hovering, setHovering] = useState(false)
  const title = 'World Local Bank'
  const techStack = ['Taproot', 'ML-DSA-65', 'SLH-DSA', 'ML-KEM-1024', 'FROST', 'BIP340']

  return (
    <div style={{
      minHeight: '100vh', background: '#04040a', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      position: 'relative', fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <ParticleField />

      <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <QuantumRing delay={0} size={500} duration={25} />
        <QuantumRing delay={2} size={400} duration={20} />
        <QuantumRing delay={4} size={300} duration={15} />
        <GlowOrb />
      </div>

      <AnimatePresence mode="wait">
        {!entered ? (
          <motion.div
            key="landing"
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(20px)' }}
            transition={{ duration: 0.6 }}
            style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 24px', maxWidth: 680 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotateY: -180 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 1.2, ease: [0.25, 0.4, 0.25, 1] }}
              style={{ marginBottom: 48 }}
            >
              <img src="/wlb.png" alt="uBTC" style={{ height: 80, objectFit: 'contain', filter: 'drop-shadow(0 0 30px rgba(0,191,255,0.3))' }} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40, rotateX: 10 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              style={{
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 24, padding: '48px 40px',
                marginBottom: 40,
                boxShadow: '0 0 80px rgba(0,191,255,0.05), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <motion.p custom={0} variants={textReveal} initial="hidden" animate="visible"
                style={{ color: '#86868b', fontSize: 14, fontFamily: 'monospace', lineHeight: 2, margin: '0 0 24px' }}>
                If you are reading this, you are part of an early group entering a new financial system.
              </motion.p>

              <motion.div custom={1} variants={textReveal} initial="hidden" animate="visible"
                style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.2), transparent)', margin: '0 0 24px' }} />

              <motion.p custom={2} variants={textReveal} initial="hidden" animate="visible"
                style={{ color: '#6b6b80', fontSize: 14, fontFamily: 'monospace', lineHeight: 2, margin: '0 0 16px' }}>
                This is not simply a stablecoin. This is a decentralized monetary layer built directly on Bitcoin.
              </motion.p>

              <motion.p custom={3} variants={textReveal} initial="hidden" animate="visible"
                style={{ color: '#00bfff', fontSize: 14, fontFamily: 'monospace', lineHeight: 2, margin: '0 0 16px' }}>
                Trust is replaced by cryptography. Banks are replaced by protocol. Control is replaced by consensus.
              </motion.p>

              <motion.p custom={4} variants={textReveal} initial="hidden" animate="visible"
                style={{ color: '#ff9f0a', fontSize: 14, fontFamily: 'monospace', lineHeight: 2, margin: '0 0 24px' }}>
                Each participant becomes their own local bank.
              </motion.p>

              <motion.div custom={5} variants={textReveal} initial="hidden" animate="visible"
                style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.2), transparent)', margin: '0 0 24px' }} />

              <div style={{ overflow: 'hidden' }}>
                <p style={{ color: '#e8e8f0', fontSize: 17, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.05em', margin: 0 }}>
                  {'Welcome to the '}
                  {title.split('').map((char, i) => (
                    <motion.span key={i} custom={i} variants={letterReveal} initial="hidden" animate="visible"
                      style={{ display: 'inline-block', color: '#00bfff' }}>
                      {char === ' ' ? ' ' : char}
                    </motion.span>
                  ))}
                  .
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.5 }}
            >
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(0,191,255,0.3), 0 0 80px rgba(0,191,255,0.1)' }}
                whileTap={{ scale: 0.97 }}
                onHoverStart={() => setHovering(true)}
                onHoverEnd={() => setHovering(false)}
                onClick={() => { setEntered(true); setTimeout(() => router.push('/home'), 600) }}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(0,191,255,0.3)',
                  color: '#00bfff',
                  borderRadius: 50, padding: '18px 72px',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'monospace', letterSpacing: '0.25em',
                  textTransform: 'uppercase' as const,
                  boxShadow: '0 0 20px rgba(0,191,255,0.1)',
                  position: 'relative' as const, overflow: 'hidden' as const,
                }}
              >
                <motion.div
                  animate={{ x: hovering ? '200%' : '-100%' }}
                  transition={{ duration: 0.6 }}
                  style={{
                    position: 'absolute' as const, top: 0, left: 0,
                    width: '50%', height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.15), transparent)',
                  }}
                />
                Enter
              </motion.button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 2 }}
              style={{ marginTop: 48, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' as const }}
            >
              {techStack.map((tech, i) => (
                <motion.span
                  key={tech}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 0.4, y: 0 }}
                  transition={{ duration: 0.4, delay: 2 + i * 0.1 }}
                  whileHover={{ opacity: 1, scale: 1.1 }}
                  style={{
                    fontSize: 10, fontFamily: 'monospace', color: '#3a3a50',
                    letterSpacing: '0.15em', textTransform: 'uppercase' as const,
                    padding: '4px 12px', cursor: 'default',
                    border: '1px solid rgba(255,255,255,0.04)', borderRadius: 20,
                  }}
                >
                  {tech}
                </motion.span>
              ))}
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ duration: 1, delay: 2.5 }}
              style={{
                color: '#3a3a50', fontSize: 9, fontFamily: 'monospace',
                marginTop: 32, letterSpacing: '0.2em', textTransform: 'uppercase' as const,
              }}
            >
              FIPS 204 &middot; FIPS 205 &middot; FIPS 203 &middot; Post-Quantum Secured
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="transition"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              style={{
                width: 40, height: 40,
                border: '2px solid rgba(0,191,255,0.3)',
                borderTopColor: '#00bfff',
                borderRadius: '50%',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

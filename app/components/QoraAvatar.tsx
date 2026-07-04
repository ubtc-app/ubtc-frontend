'use client'
import { useEffect, useState } from 'react'

interface QoraAvatarProps {
  size?: number
  speaking?: boolean
  theme?: 'dark' | 'light'
  waving?: boolean
}

export function QoraAvatar({ size = 110, speaking = false, theme = 'dark', waving = false }: QoraAvatarProps) {
  const [blink, setBlink] = useState(false)

  const accent  = theme === 'dark' ? '#00D4FF' : '#c8a84b'
  const accent2 = theme === 'dark' ? '#7C3AFF' : '#1e3a5f'
  const bodyFill= theme === 'dark' ? '#0c1420' : '#1a2235'
  const bodyEdge= theme === 'dark' ? 'rgba(0,212,255,0.18)' : 'rgba(200,168,75,0.3)'
  const glowCol = theme === 'dark' ? 'rgba(0,212,255,0.35)' : 'rgba(200,168,75,0.4)'
  const id      = theme === 'dark' ? 'qora-dark' : 'qora-light'

  useEffect(() => {
    const blinker = () => {
      setBlink(true)
      setTimeout(() => setBlink(false), 160)
      setTimeout(blinker, 2800 + Math.random() * 3000)
    }
    const t = setTimeout(blinker, 1400)
    return () => clearTimeout(t)
  }, [])

  const W = 100
  const H = 150

  return (
    <div style={{
      width: size, height: size * 1.5,
      position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'qora-float 3.2s ease-in-out infinite',
      filter: `drop-shadow(0 8px 24px ${glowCol})`,
    }}>
      <svg width={size} height={size * 1.5} viewBox={`0 0 ${W} ${H}`} fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id={`${id}-body`} cx="35%" cy="25%" r="75%">
            <stop offset="0%" stopColor={theme === 'dark' ? '#162035' : '#1e2d44'} />
            <stop offset="100%" stopColor={theme === 'dark' ? '#080f1a' : '#0f1923'} />
          </radialGradient>
          <radialGradient id={`${id}-eye`} cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={theme === 'dark' ? '#80f0ff' : '#f5d98a'} />
            <stop offset="45%" stopColor={accent} stopOpacity="0.95" />
            <stop offset="100%" stopColor={theme === 'dark' ? '#0066aa' : '#9a7830'} stopOpacity="0.6" />
          </radialGradient>
          <radialGradient id={`${id}-ant`} cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="white" stopOpacity="0.9" />
            <stop offset="100%" stopColor={accent} />
          </radialGradient>
          <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id={`${id}-chest`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.12" />
            <stop offset="100%" stopColor={accent2} stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {/* === SHADOW === */}
        <ellipse cx="50" cy="148" rx="26" ry="4" fill="black" opacity="0.25" />

        {/* === ANTENNA === */}
        <line x1="50" y1="10" x2="50" y2="22" stroke={bodyEdge} strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="7" r="6" fill={`url(#${id}-ant)`} filter={`url(#${id}-glow)`} opacity="0.95" />
        <circle cx="50" cy="7" r="3" fill="white" opacity="0.55" />

        {/* === HEAD === */}
        {/* Outer glow ring */}
        <rect x="13" y="20" width="74" height="62" rx="15" fill="none" stroke={accent} strokeWidth="0.5" opacity="0.25" />
        {/* Main head */}
        <rect x="15" y="22" width="70" height="58" rx="13" fill={`url(#${id}-body)`} stroke={bodyEdge} strokeWidth="1.2" />
        {/* Specular highlight top-left */}
        <ellipse cx="28" cy="32" rx="14" ry="7" fill="white" opacity="0.04" />
        {/* Edge rim light bottom-right */}
        <rect x="15" y="22" width="70" height="58" rx="13" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

        {/* === EYES === */}
        {/* Left eye socket */}
        <circle cx="36" cy="48" r="11" fill="#040c17" stroke={`${accent}30`} strokeWidth="1" />
        {/* Left eye iris */}
        {!blink && <circle cx="36" cy="48" r="8.5" fill={`url(#${id}-eye)`} filter={`url(#${id}-glow)`} />}
        {blink && <rect x="27" y="46.5" width="18" height="3" rx="1.5" fill={accent} opacity="0.6" />}
        {/* Left eye specular */}
        {!blink && <circle cx="33" cy="45" r="2.5" fill="white" opacity="0.55" />}
        {!blink && <circle cx="38" cy="51" r="1" fill={accent} opacity="0.4" />}

        {/* Right eye socket */}
        <circle cx="64" cy="48" r="11" fill="#040c17" stroke={`${accent}30`} strokeWidth="1" />
        {/* Right eye iris */}
        {!blink && <circle cx="64" cy="48" r="8.5" fill={`url(#${id}-eye)`} filter={`url(#${id}-glow)`} />}
        {blink && <rect x="55" y="46.5" width="18" height="3" rx="1.5" fill={accent} opacity="0.6" />}
        {/* Right eye specular */}
        {!blink && <circle cx="61" cy="45" r="2.5" fill="white" opacity="0.55" />}
        {!blink && <circle cx="66" cy="51" r="1" fill={accent} opacity="0.4" />}

        {/* === MOUTH / SPEAKER === */}
        <rect x="34" y="68" width="32" height="7" rx="3.5" fill="#040c17" stroke={`${accent}22`} strokeWidth="0.8" />
        {speaking ? (
          <>
            <rect x="36" y="69.5" width="4" height="4" rx="1" fill={accent} opacity="0.7" />
            <rect x="42" y="70" width="4" height="3" rx="1" fill={accent} opacity="0.5" />
            <rect x="48" y="69" width="4" height="5" rx="1" fill={accent} opacity="0.8" />
            <rect x="54" y="70.5" width="4" height="2.5" rx="1" fill={accent} opacity="0.5" />
            <rect x="60" y="69.5" width="4" height="4" rx="1" fill={accent} opacity="0.65" />
          </>
        ) : (
          <>
            {[36, 41, 46, 51, 56, 61].map((x, i) => (
              <circle key={i} cx={x} cy="71.5" r="1.3" fill={accent} opacity="0.35" />
            ))}
          </>
        )}

        {/* === NECK === */}
        <rect x="41" y="80" width="18" height="10" rx="5" fill={bodyFill} stroke={bodyEdge} strokeWidth="1" />
        <line x1="46" y1="83" x2="54" y2="83" stroke={accent} strokeWidth="0.7" opacity="0.3" />
        <line x1="46" y1="86" x2="54" y2="86" stroke={accent} strokeWidth="0.7" opacity="0.2" />

        {/* === BODY === */}
        {/* Body glow */}
        <rect x="11" y="89" width="78" height="52" rx="12" fill="none" stroke={accent} strokeWidth="0.4" opacity="0.15" />
        {/* Body main */}
        <rect x="13" y="91" width="74" height="49" rx="11" fill={`url(#${id}-body)`} stroke={bodyEdge} strokeWidth="1.2" />
        {/* Body specular */}
        <ellipse cx="28" cy="99" rx="14" ry="5" fill="white" opacity="0.03" />

        {/* Chest display panel */}
        <rect x="22" y="100" width="56" height="32" rx="6" fill="#030a14" stroke={`${accent}28`} strokeWidth="0.8" />
        <rect x="22" y="100" width="56" height="32" rx="6" fill={`url(#${id}-chest)`} />
        {/* Scanline */}
        <rect x="22" y="100" width="56" height="32" rx="6" fill="url(#scanlines)" opacity="0.4" />
        {/* QUFI text */}
        <text x="50" y="114" textAnchor="middle" fill={accent} fontSize="7" fontFamily="monospace" letterSpacing="3" opacity="0.85">QUFI</text>
        <text x="50" y="122" textAnchor="middle" fill={accent} fontSize="4.5" fontFamily="monospace" letterSpacing="1.5" opacity="0.5">QORA · AI</text>
        {/* Status bar */}
        <rect x="28" y="126" width="44" height="2.5" rx="1.2" fill={`${accent}18`} stroke={`${accent}20`} strokeWidth="0.5" />
        <rect x="28" y="126" width="30" height="2.5" rx="1.2" fill={accent} opacity="0.5" />
        <circle cx="62" cy="127.2" r="1.5" fill={theme === 'dark' ? '#00ff88' : '#22c55e'} opacity="0.8" />

        {/* Shoulder bolts */}
        <circle cx="19" cy="96" r="3" fill={bodyFill} stroke={bodyEdge} strokeWidth="0.8" />
        <circle cx="81" cy="96" r="3" fill={bodyFill} stroke={bodyEdge} strokeWidth="0.8" />

        {/* === LEFT ARM (relaxed/down) === */}
        <rect x="2" y="93" width="13" height="38" rx="6.5" fill={bodyFill} stroke={bodyEdge} strokeWidth="1.1"
          transform="rotate(5, 8.5, 93)" />
        <circle cx="7" cy="131" r="5" fill={bodyFill} stroke={bodyEdge} strokeWidth="1" />

        {/* === RIGHT ARM (waving) === */}
        <g style={{ transformOrigin: '92px 94px', animation: waving ? 'qora-wave 1.2s ease-in-out infinite' : 'qora-idle-arm 4s ease-in-out infinite' }}>
          <rect x="85" y="93" width="13" height="38" rx="6.5" fill={bodyFill} stroke={bodyEdge} strokeWidth="1.1"
            transform="rotate(-12, 91.5, 93)" />
          <circle cx="93" cy="129" r="5" fill={bodyFill} stroke={bodyEdge} strokeWidth="1" transform="rotate(-12, 91.5, 93)" />
        </g>

        {/* === LEGS === */}
        <rect x="22" y="138" width="22" height="16" rx="7" fill={bodyFill} stroke={bodyEdge} strokeWidth="1" />
        <rect x="56" y="138" width="22" height="16" rx="7" fill={bodyFill} stroke={bodyEdge} strokeWidth="1" />
        {/* Feet */}
        <rect x="18" y="151" width="28" height="9" rx="4.5" fill={bodyFill} stroke={bodyEdge} strokeWidth="1" />
        <rect x="54" y="151" width="28" height="9" rx="4.5" fill={bodyFill} stroke={bodyEdge} strokeWidth="1" />
        {/* Boot accents */}
        <line x1="22" y1="155" x2="42" y2="155" stroke={accent} strokeWidth="0.6" opacity="0.3" />
        <line x1="58" y1="155" x2="78" y2="155" stroke={accent} strokeWidth="0.6" opacity="0.3" />
      </svg>

      <style>{`
        @keyframes qora-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes qora-wave {
          0%   { transform: rotate(0deg); }
          25%  { transform: rotate(-35deg); }
          75%  { transform: rotate(10deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes qora-idle-arm {
          0%, 100% { transform: rotate(0deg); }
          50%      { transform: rotate(-5deg); }
        }
      `}</style>
    </div>
  )
}

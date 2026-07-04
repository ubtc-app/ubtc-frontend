'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { QoraAvatar } from './components/QoraAvatar'

type Step = 'intro' | 'name-input' | 'user-type' | 'ui-pref' | 'routing'

const INTRO_TEXT = "Hi, I am QORA — A Quantum Operational Reasoning Agent. My friends call me QORA."
const INTRO_Q    = "What's your name?"
const USER_TYPE_Q = (name: string) => `Hi @${name}! Before we get started, may I ask:`
const UI_PREF_Q  = "One more thing — we want your experience to be personalized to your taste."

function useTypewriter(text: string, speed = 26, active = true) {
  const [displayed, setDisplayed] = useState('')
  const [done,      setDone]      = useState(false)
  useEffect(() => {
    if (!active) { setDisplayed(''); setDone(false); return }
    setDisplayed(''); setDone(false)
    let i = 0
    const iv = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) { clearInterval(iv); setDone(true) }
    }, speed)
    return () => clearInterval(iv)
  }, [text, active, speed])
  return { displayed, done }
}

function Cursor({ visible }: { visible: boolean }) {
  const [on, setOn] = useState(true)
  useEffect(() => {
    const t = setInterval(() => setOn(v => !v), 530)
    return () => clearInterval(t)
  }, [])
  if (!visible) return null
  return <span style={{ display: 'inline-block', width: 2, height: '1.05em', background: '#c8a84b', marginLeft: 2, verticalAlign: 'text-bottom', opacity: on ? 1 : 0, transition: 'opacity 0.1s' }} />
}

function ChoiceCard({
  icon, title, desc, accentColor, borderHover, bgHover, onClick,
}: {
  icon: React.ReactNode; title: string; desc: string
  accentColor: string; borderHover: string; bgHover: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'rgba(10,14,22,0.85)',
        border: '1px solid rgba(40,56,80,0.7)',
        borderRadius: 14,
        padding: '22px 20px',
        cursor: 'pointer', textAlign: 'left',
        transition: 'all 0.22s', fontFamily: 'inherit',
        flex: 1,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.borderColor = borderHover
        el.style.background  = bgHover
        el.style.transform   = 'translateY(-3px)'
        el.style.boxShadow   = `0 8px 24px rgba(0,0,0,0.4), 0 0 20px ${bgHover}`
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.borderColor = 'rgba(40,56,80,0.7)'
        el.style.background  = 'rgba(10,14,22,0.85)'
        el.style.transform   = 'none'
        el.style.boxShadow   = 'none'
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 9,
        background: `${accentColor}14`,
        border: `1px solid ${accentColor}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
      }}>
        {icon}
      </div>
      <p style={{ color: '#dde4ed', fontSize: '13px', fontWeight: 600, margin: '0 0 6px', letterSpacing: '0.02em' }}>
        {title}
      </p>
      <p style={{ color: 'rgba(120,144,172,0.65)', fontSize: '11px', lineHeight: 1.55, margin: 0 }}>
        {desc}
      </p>
    </button>
  )
}

export default function OnboardingPage() {
  const router   = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [step,          setStep]          = useState<Step>('intro')
  const [name,          setName]          = useState('')
  const [inputValue,    setInputValue]    = useState('')
  const [userType,      setUserType]      = useState<'institutional' | 'consumer' | null>(null)
  const [routingMsg,    setRoutingMsg]    = useState('')
  const [showNameQ,     setShowNameQ]     = useState(false)
  const [showUserTypeQ, setShowUserTypeQ] = useState(false)
  const [showChoices,   setShowChoices]   = useState(false)
  const [showUiPrefQ,   setShowUiPrefQ]   = useState(false)
  const [showUiChoices, setShowUiChoices] = useState(false)

  const intro     = useTypewriter(INTRO_TEXT, 24, step !== 'routing')
  const introQ    = useTypewriter(INTRO_Q, 26, showNameQ && step !== 'routing')
  const userTypeQ = useTypewriter(USER_TYPE_Q(name), 24, showUserTypeQ && step !== 'routing')
  const uiPrefQ   = useTypewriter(UI_PREF_Q, 24, showUiPrefQ && step !== 'routing')

  // After intro finishes → show name question
  useEffect(() => {
    if (intro.done && step === 'intro') {
      setTimeout(() => setShowNameQ(true), 300)
    }
  }, [intro.done, step])

  useEffect(() => {
    if (introQ.done && step === 'intro') {
      setTimeout(() => setStep('name-input'), 250)
    }
  }, [introQ.done, step])

  // Focus input
  useEffect(() => {
    if (step === 'name-input') setTimeout(() => inputRef.current?.focus(), 100)
  }, [step])

  // Start user-type question
  useEffect(() => {
    if (step === 'user-type') setShowUserTypeQ(true)
  }, [step])

  useEffect(() => {
    if (userTypeQ.done && step === 'user-type') {
      setTimeout(() => setShowChoices(true), 300)
    }
  }, [userTypeQ.done, step])

  // Start ui-pref question
  useEffect(() => {
    if (step === 'ui-pref') {
      setTimeout(() => setShowUiPrefQ(true), 200)
    }
  }, [step])

  useEffect(() => {
    if (uiPrefQ.done && step === 'ui-pref') {
      setTimeout(() => setShowUiChoices(true), 300)
    }
  }, [uiPrefQ.done, step])

  const handleNameSubmit = useCallback(() => {
    const n = inputValue.trim()
    if (!n) return
    setName(n)
    setStep('user-type')
  }, [inputValue])

  const handleUserType = useCallback((type: 'institutional' | 'consumer') => {
    setUserType(type)
    setShowChoices(false)
    setStep('ui-pref')
  }, [])

  const handleUiPref = useCallback((theme: 'futuristic' | 'light') => {
    setShowUiChoices(false)
    setStep('routing')

    const finalUserType = theme === 'light' ? 'institutional' : (userType ?? 'consumer')

    // Save both preferences
    localStorage.setItem('qufi_name',      name)
    localStorage.setItem('qufi_user_type', finalUserType)
    localStorage.setItem('qufi_theme',     theme)
    window.dispatchEvent(new Event('qufi-profile-changed'))

    setRoutingMsg(
      theme === 'light'
        ? 'Setting up your professional platform...'
        : 'Initialising your Quantum environment...'
    )

    setTimeout(() => router.push('/unlock'), 1800)
  }, [name, userType, router])

  const isSpeaking = step === 'intro' && !intro.done
  const showIntroBlock = step !== 'routing'

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#07090d',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'JetBrains Mono', monospace",
      padding: '24px',
      overflow: 'hidden',
    }}>
      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(40,56,80,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(40,56,80,0.1) 1px, transparent 1px)
        `,
        backgroundSize: '52px 52px',
        maskImage: 'radial-gradient(ellipse 75% 75% at 50% 50%, black 20%, transparent 100%)',
      }} />

      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '25%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 700, height: 500, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(0,180,255,0.04) 0%, rgba(200,168,75,0.03) 50%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Main layout: QORA left, conversation right */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'flex-start', gap: 48,
        width: '100%', maxWidth: 760,
      }}>

        {/* QORA Avatar column */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          flexShrink: 0, paddingTop: 8,
          opacity: step === 'routing' ? 0 : 1,
          transition: 'opacity 0.6s',
        }}>
          <QoraAvatar size={100} speaking={isSpeaking} theme="dark" waving={step === 'intro'} />
          <div style={{
            marginTop: 10,
            padding: '4px 12px',
            background: 'rgba(0,212,255,0.06)',
            border: '1px solid rgba(0,212,255,0.18)',
            borderRadius: 20,
          }}>
            <span style={{
              color: 'rgba(0,212,255,0.6)', fontSize: '9px',
              letterSpacing: '0.22em', textTransform: 'uppercase',
            }}>QORA · AI</span>
          </div>
        </div>

        {/* Conversation column */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32,
            opacity: step === 'routing' ? 0 : 1, transition: 'opacity 0.6s',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#00D4FF',
              boxShadow: '0 0 8px rgba(0,212,255,0.8)',
              animation: 'breathe 2s ease-in-out infinite',
            }} />
            <span style={{ color: 'rgba(0,212,255,0.4)', fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
              QuFi · Quantum Financial System
            </span>
          </div>

          {/* INTRO text */}
          {showIntroBlock && (
            <div style={{
              paddingLeft: 20,
              borderLeft: '2px solid rgba(0,212,255,0.25)',
              marginBottom: 28,
            }}>
              <p style={{
                color: '#dde4ed', fontSize: 'clamp(15px, 2.1vw, 20px)',
                lineHeight: 1.65, margin: 0, fontWeight: 400,
              }}>
                {intro.displayed}
                <Cursor visible={!intro.done && step === 'intro'} />
              </p>
              {showNameQ && (
                <p style={{
                  color: 'rgba(180,210,240,0.7)', fontSize: 'clamp(13px, 1.8vw, 17px)',
                  lineHeight: 1.65, margin: '12px 0 0', fontWeight: 400,
                  animation: 'fade-up 0.35s ease both',
                }}>
                  {introQ.displayed}
                  <Cursor visible={!introQ.done && showNameQ} />
                </p>
              )}
            </div>
          )}

          {/* Name input */}
          {step === 'name-input' && (
            <div style={{ paddingLeft: 20, animation: 'fade-up 0.4s ease both', marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input
                  ref={inputRef}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
                  placeholder="Enter your name"
                  style={{
                    background: 'rgba(8,12,20,0.95)',
                    border: '1px solid rgba(40,56,80,0.8)',
                    borderRadius: 8, padding: '13px 18px',
                    color: '#dde4ed', fontSize: '15px',
                    fontFamily: 'inherit', outline: 'none', flex: 1,
                    letterSpacing: '0.02em', transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = 'rgba(0,212,255,0.5)'
                    e.target.style.boxShadow   = '0 0 0 3px rgba(0,212,255,0.08)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'rgba(40,56,80,0.8)'
                    e.target.style.boxShadow   = 'none'
                  }}
                />
                <button
                  onClick={handleNameSubmit}
                  disabled={!inputValue.trim()}
                  style={{
                    background: inputValue.trim() ? 'rgba(0,212,255,0.1)' : 'rgba(20,28,40,0.6)',
                    border: `1px solid ${inputValue.trim() ? 'rgba(0,212,255,0.4)' : 'rgba(40,56,80,0.5)'}`,
                    borderRadius: 8, padding: '13px 22px',
                    color: inputValue.trim() ? '#00D4FF' : 'rgba(120,144,172,0.3)',
                    fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase',
                    cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit', transition: 'all 0.2s', whiteSpace: 'nowrap',
                  }}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* User type question */}
          {(step === 'user-type' || step === 'ui-pref') && showUserTypeQ && (
            <div style={{
              paddingLeft: 20,
              borderLeft: `2px solid ${step === 'user-type' ? 'rgba(0,212,255,0.25)' : 'rgba(0,212,255,0.12)'}`,
              marginBottom: 24,
              animation: 'fade-up 0.4s ease both',
              opacity: step === 'ui-pref' ? 0.5 : 1,
              transition: 'opacity 0.4s',
            }}>
              <p style={{
                color: step === 'ui-pref' ? 'rgba(180,200,220,0.45)' : '#dde4ed',
                fontSize: 'clamp(14px, 1.9vw, 18px)',
                lineHeight: 1.65, margin: '0 0 6px', fontWeight: 400,
              }}>
                {userTypeQ.displayed}
                <Cursor visible={!userTypeQ.done && step === 'user-type'} />
              </p>
              {userTypeQ.done && step === 'user-type' && (
                <p style={{
                  color: 'rgba(180,196,216,0.55)', fontSize: '12px', lineHeight: 1.7,
                  margin: 0, animation: 'fade-up 0.35s ease both',
                }}>
                  Are you a Bitcoin Native or crypto enthusiast — or an Institution working in Digital Assets?
                </p>
              )}
              {step === 'ui-pref' && userType && (
                <p style={{ color: 'rgba(0,212,255,0.4)', fontSize: '11px', margin: '4px 0 0', fontFamily: 'inherit' }}>
                  ✓ {userType === 'institutional' ? 'Institution' : 'Bitcoin Native'}
                </p>
              )}
            </div>
          )}

          {/* User type choice cards */}
          {showChoices && step === 'user-type' && (
            <div style={{
              display: 'flex', gap: 14, paddingLeft: 20,
              animation: 'fade-up 0.45s ease both',
            }}>
              <ChoiceCard
                onClick={() => handleUserType('consumer')}
                accentColor="#4a8fa8" borderHover="rgba(74,143,168,0.6)" bgHover="rgba(74,143,168,0.06)"
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a8fa8" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>}
                title="Bitcoin Native"
                desc="Self-custody, crypto enthusiast, or personal use"
              />
              <ChoiceCard
                onClick={() => handleUserType('institutional')}
                accentColor="#c8a84b" borderHover="rgba(200,168,75,0.55)" bgHover="rgba(200,168,75,0.05)"
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c8a84b" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>}
                title="Institution"
                desc="Treasury, fund, family office, or custodian"
              />
            </div>
          )}

          {/* UI preference question */}
          {step === 'ui-pref' && showUiPrefQ && (
            <div style={{
              paddingLeft: 20,
              borderLeft: '2px solid rgba(124,58,255,0.3)',
              marginBottom: 24,
              animation: 'fade-up 0.4s ease both',
            }}>
              <p style={{
                color: '#dde4ed', fontSize: 'clamp(14px, 1.9vw, 18px)',
                lineHeight: 1.65, margin: '0 0 8px', fontWeight: 400,
              }}>
                {uiPrefQ.displayed}
                <Cursor visible={!uiPrefQ.done} />
              </p>
              {uiPrefQ.done && (
                <p style={{
                  color: 'rgba(180,196,216,0.55)', fontSize: '12px', lineHeight: 1.7,
                  margin: 0, animation: 'fade-up 0.35s ease both',
                }}>
                  Do you prefer a new age futuristic UI — or a clean, modern light layout?
                </p>
              )}
            </div>
          )}

          {/* UI preference cards */}
          {showUiChoices && (
            <div style={{
              display: 'flex', gap: 14, paddingLeft: 20,
              animation: 'fade-up 0.45s ease both',
            }}>
              {/* Futuristic */}
              <button
                onClick={() => handleUiPref('futuristic')}
                style={{
                  flex: 1, background: 'rgba(8,12,22,0.9)',
                  border: '1px solid rgba(40,56,80,0.7)',
                  borderRadius: 14, padding: '20px 18px',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.22s', fontFamily: 'inherit',
                  position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget
                  el.style.borderColor = 'rgba(0,212,255,0.5)'
                  el.style.background  = 'rgba(0,212,255,0.05)'
                  el.style.transform   = 'translateY(-3px)'
                  el.style.boxShadow   = '0 8px 28px rgba(0,0,0,0.5), 0 0 30px rgba(0,212,255,0.12)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget
                  el.style.borderColor = 'rgba(40,56,80,0.7)'
                  el.style.background  = 'rgba(8,12,22,0.9)'
                  el.style.transform   = 'none'
                  el.style.boxShadow   = 'none'
                }}
              >
                {/* Mini dark UI preview */}
                <div style={{
                  width: '100%', height: 44, borderRadius: 6, marginBottom: 14,
                  background: 'linear-gradient(135deg, #07090d 0%, #0c1525 100%)',
                  border: '1px solid rgba(0,212,255,0.2)',
                  padding: '7px 9px', boxSizing: 'border-box',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <div style={{ width: 20, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #00D4FF, #7C3AFF)', opacity: 0.8 }} />
                    <div style={{ width: 28, height: 4, borderRadius: 2, background: 'rgba(0,212,255,0.2)' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {['rgba(0,212,255,0.35)', 'rgba(124,58,255,0.3)', 'rgba(0,255,160,0.25)'].map((c, i) => (
                      <div key={i} style={{ flex: 1, height: 14, borderRadius: 4, background: '#0a1020', border: `1px solid ${c}` }} />
                    ))}
                  </div>
                </div>
                <p style={{ color: '#dde4ed', fontSize: '13px', fontWeight: 600, margin: '0 0 5px' }}>Futuristic</p>
                <p style={{ color: 'rgba(120,144,172,0.6)', fontSize: '10px', lineHeight: 1.5, margin: 0 }}>
                  Dark, quantum-inspired, immersive
                </p>
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#00D4FF', boxShadow: '0 0 8px rgba(0,212,255,0.8)',
                  opacity: 0.7,
                }} />
              </button>

              {/* Clean & Modern */}
              <button
                onClick={() => handleUiPref('light')}
                style={{
                  flex: 1, background: 'rgba(8,12,22,0.9)',
                  border: '1px solid rgba(40,56,80,0.7)',
                  borderRadius: 14, padding: '20px 18px',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.22s', fontFamily: 'inherit',
                  position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget
                  el.style.borderColor = 'rgba(200,168,75,0.5)'
                  el.style.background  = 'rgba(200,168,75,0.04)'
                  el.style.transform   = 'translateY(-3px)'
                  el.style.boxShadow   = '0 8px 28px rgba(0,0,0,0.5), 0 0 30px rgba(200,168,75,0.1)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget
                  el.style.borderColor = 'rgba(40,56,80,0.7)'
                  el.style.background  = 'rgba(8,12,22,0.9)'
                  el.style.transform   = 'none'
                  el.style.boxShadow   = 'none'
                }}
              >
                {/* Mini light UI preview */}
                <div style={{
                  width: '100%', height: 44, borderRadius: 6, marginBottom: 14,
                  background: '#f5f6f8',
                  border: '1px solid #e2e8f0',
                  padding: '7px 9px', boxSizing: 'border-box',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <div style={{ width: 20, height: 4, borderRadius: 2, background: '#0f172a', opacity: 0.7 }} />
                    <div style={{ width: 28, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {['#e2e8f0', '#e2e8f0', '#e2e8f0'].map((c, i) => (
                      <div key={i} style={{ flex: 1, height: 14, borderRadius: 4, background: '#fff', border: `1px solid ${c}` }} />
                    ))}
                  </div>
                </div>
                <p style={{ color: '#dde4ed', fontSize: '13px', fontWeight: 600, margin: '0 0 5px' }}>Clean & Modern</p>
                <p style={{ color: 'rgba(120,144,172,0.6)', fontSize: '10px', lineHeight: 1.5, margin: 0 }}>
                  Light, minimal, professional
                </p>
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#c8a84b', boxShadow: '0 0 8px rgba(200,168,75,0.7)',
                  opacity: 0.7,
                }} />
              </button>
            </div>
          )}

          {/* Routing */}
          {step === 'routing' && (
            <div style={{
              paddingLeft: 20, borderLeft: '2px solid rgba(0,212,255,0.4)',
              animation: 'fade-up 0.4s ease both',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 16, height: 16,
                  border: '2px solid rgba(0,212,255,0.25)',
                  borderTopColor: '#00D4FF', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite', flexShrink: 0,
                }} />
                <p style={{ color: '#00D4FF', fontSize: '14px', margin: 0, letterSpacing: '0.02em' }}>
                  {routingMsg}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes breathe  { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(120,144,172,0.35); }
      `}</style>
    </div>
  )
}

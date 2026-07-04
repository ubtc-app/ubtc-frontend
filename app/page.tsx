'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { setUserProfile } from './lib/userProfile'

type Step = 'greeting' | 'name-input' | 'question' | 'routing'

const GREETING = "Hi — Welcome to QuFi, the Quantum Financial System."
const QUESTION_PRE = (name: string) => `Hi @${name} — before we get started, may I ask:`

function useTypewriter(text: string, speed = 28, active = true) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!active) { setDisplayed(''); setDone(false); return }
    setDisplayed('')
    setDone(false)
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) { clearInterval(interval); setDone(true) }
    }, speed)
    return () => clearInterval(interval)
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
  return <span style={{ display: 'inline-block', width: 2, height: '1.1em', background: '#c8a84b', marginLeft: 2, verticalAlign: 'text-bottom', opacity: on ? 1 : 0, transition: 'opacity 0.1s' }} />
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('greeting')
  const [name, setName] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [questionVisible, setQuestionVisible] = useState(false)
  const [choicesVisible, setChoicesVisible] = useState(false)
  const [routingMsg, setRoutingMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const greeting = useTypewriter(GREETING, 26, step !== 'routing')
  const question = useTypewriter(
    QUESTION_PRE(name),
    24,
    questionVisible && step !== 'routing'
  )

  // After greeting finishes, show name input
  useEffect(() => {
    if (greeting.done && step === 'greeting') {
      setTimeout(() => setStep('name-input'), 400)
    }
  }, [greeting.done, step])

  // Focus input when it appears
  useEffect(() => {
    if (step === 'name-input') setTimeout(() => inputRef.current?.focus(), 100)
  }, [step])

  // After name submitted, start question typewriter
  useEffect(() => {
    if (step === 'question') {
      setQuestionVisible(true)
    }
  }, [step])

  // After question finishes, show choices
  useEffect(() => {
    if (question.done && step === 'question') {
      setTimeout(() => setChoicesVisible(true), 300)
    }
  }, [question.done, step])

  const handleNameSubmit = useCallback(() => {
    const n = inputValue.trim()
    if (!n) return
    setName(n)
    setStep('question')
  }, [inputValue])

  const handleChoice = useCallback((type: 'institutional' | 'consumer') => {
    setChoicesVisible(false)
    setStep('routing')

    const label = type === 'institutional'
      ? 'Taking you to the Institutional Platform...'
      : 'Taking you to your Quantum Wallet...'
    setRoutingMsg(label)

    setUserProfile(name, type)
    window.dispatchEvent(new Event('qufi-profile-changed'))

    setTimeout(() => router.push('/unlock'), 1800)
  }, [name, router])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#07090d',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'JetBrains Mono', monospace",
      padding: '24px',
      overflow: 'hidden',
    }}>

      {/* Subtle grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(40,56,80,0.12) 1px, transparent 1px),
          linear-gradient(90deg, rgba(40,56,80,0.12) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)',
      }} />

      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 600, height: 400, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(200,168,75,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Main conversation container */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 580 }}>

        {/* System badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 48,
          opacity: step === 'routing' ? 0 : 1,
          transition: 'opacity 0.6s',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'linear-gradient(135deg, rgba(200,168,75,0.2), rgba(200,168,75,0.06))',
            border: '1px solid rgba(200,168,75,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c8a84b" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
          </div>
          <span style={{ color: 'rgba(200,168,75,0.5)', fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
            QuFi · Quantum Financial System · Secure
          </span>
        </div>

        {/* Greeting message */}
        {(step !== 'routing' || routingMsg === '') && (
          <div style={{
            marginBottom: 32,
            paddingLeft: 20,
            borderLeft: '2px solid rgba(200,168,75,0.3)',
          }}>
            <p style={{
              color: '#dde4ed',
              fontSize: 'clamp(16px, 2.2vw, 22px)',
              lineHeight: 1.6,
              margin: 0,
              fontWeight: 400,
              letterSpacing: '-0.01em',
            }}>
              {greeting.displayed}
              <Cursor visible={step === 'greeting'} />
            </p>
          </div>
        )}

        {/* Name input */}
        {(step === 'name-input') && (
          <div style={{
            marginBottom: 32, paddingLeft: 20,
            animation: 'fade-up 0.4s ease both',
          }}>
            <label style={{
              display: 'block',
              color: 'rgba(120,144,172,0.7)',
              fontSize: '11px', letterSpacing: '0.22em',
              textTransform: 'uppercase', marginBottom: 14,
            }}>
              What&apos;s your name?
            </label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
                placeholder="Enter your name"
                style={{
                  background: 'rgba(12,16,24,0.9)',
                  border: '1px solid rgba(40,56,80,0.8)',
                  borderRadius: 8,
                  padding: '13px 18px',
                  color: '#dde4ed',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  flex: 1,
                  letterSpacing: '0.02em',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(200,168,75,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(40,56,80,0.8)')}
              />
              <button
                onClick={handleNameSubmit}
                disabled={!inputValue.trim()}
                style={{
                  background: inputValue.trim() ? 'rgba(200,168,75,0.12)' : 'rgba(20,28,40,0.6)',
                  border: `1px solid ${inputValue.trim() ? 'rgba(200,168,75,0.4)' : 'rgba(40,56,80,0.5)'}`,
                  borderRadius: 8,
                  padding: '13px 22px',
                  color: inputValue.trim() ? '#c8a84b' : 'rgba(120,144,172,0.3)',
                  fontSize: '11px', letterSpacing: '0.18em',
                  textTransform: 'uppercase', cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Question */}
        {(step === 'question') && questionVisible && (
          <div style={{
            marginBottom: 32, paddingLeft: 20,
            borderLeft: '2px solid rgba(200,168,75,0.3)',
            animation: 'fade-up 0.4s ease both',
          }}>
            <p style={{
              color: '#dde4ed',
              fontSize: 'clamp(15px, 2vw, 19px)',
              lineHeight: 1.65,
              margin: '0 0 20px',
              fontWeight: 400,
            }}>
              {question.displayed}
              <Cursor visible={!question.done} />
            </p>

            {/* Sub-question text */}
            {question.done && (
              <p style={{
                color: 'rgba(180,196,216,0.6)',
                fontSize: '13px', lineHeight: 1.7,
                margin: 0,
                animation: 'fade-up 0.35s ease both',
              }}>
                Are you a Bitcoin Native or crypto enthusiast — or an Institution working in Digital Assets?
              </p>
            )}
          </div>
        )}

        {/* Choice cards */}
        {choicesVisible && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 14, paddingLeft: 20,
            animation: 'fade-up 0.45s ease both',
          }}>
            {/* Consumer */}
            <button
              onClick={() => handleChoice('consumer')}
              style={{
                background: 'rgba(12,16,24,0.8)',
                border: '1px solid rgba(40,56,80,0.7)',
                borderRadius: 12,
                padding: '22px 20px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.22s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget
                el.style.borderColor = 'rgba(74,143,168,0.6)'
                el.style.background = 'rgba(74,143,168,0.06)'
                el.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                el.style.borderColor = 'rgba(40,56,80,0.7)'
                el.style.background = 'rgba(12,16,24,0.8)'
                el.style.transform = 'none'
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'rgba(74,143,168,0.12)',
                border: '1px solid rgba(74,143,168,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 14,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a8fa8" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
                </svg>
              </div>
              <p style={{ color: '#dde4ed', fontSize: '13px', fontWeight: 600, margin: '0 0 6px', letterSpacing: '0.02em' }}>
                Bitcoin Native
              </p>
              <p style={{ color: 'rgba(120,144,172,0.65)', fontSize: '11px', lineHeight: 1.55, margin: 0 }}>
                Self-custody, crypto enthusiast, or personal use
              </p>
            </button>

            {/* Institutional */}
            <button
              onClick={() => handleChoice('institutional')}
              style={{
                background: 'rgba(12,16,24,0.8)',
                border: '1px solid rgba(40,56,80,0.7)',
                borderRadius: 12,
                padding: '22px 20px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.22s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget
                el.style.borderColor = 'rgba(200,168,75,0.55)'
                el.style.background = 'rgba(200,168,75,0.05)'
                el.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                el.style.borderColor = 'rgba(40,56,80,0.7)'
                el.style.background = 'rgba(12,16,24,0.8)'
                el.style.transform = 'none'
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'rgba(200,168,75,0.1)',
                border: '1px solid rgba(200,168,75,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 14,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c8a84b" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                  <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
                </svg>
              </div>
              <p style={{ color: '#dde4ed', fontSize: '13px', fontWeight: 600, margin: '0 0 6px', letterSpacing: '0.02em' }}>
                Institution
              </p>
              <p style={{ color: 'rgba(120,144,172,0.65)', fontSize: '11px', lineHeight: 1.55, margin: 0 }}>
                Treasury, fund, family office, or custodian
              </p>
            </button>
          </div>
        )}

        {/* Routing message */}
        {step === 'routing' && (
          <div style={{
            paddingLeft: 20,
            borderLeft: '2px solid rgba(200,168,75,0.5)',
            animation: 'fade-up 0.4s ease both',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 16, height: 16,
                border: '2px solid rgba(200,168,75,0.3)',
                borderTopColor: '#c8a84b',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                flexShrink: 0,
              }} />
              <p style={{ color: '#c8a84b', fontSize: '14px', margin: 0, letterSpacing: '0.02em' }}>
                {routingMsg}
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(120,144,172,0.35); }
      `}</style>
    </div>
  )
}

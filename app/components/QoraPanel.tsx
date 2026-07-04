'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { QoraAvatar } from './QoraAvatar'
import { useIsMobile } from '../lib/useIsMobile'

// ── Knowledge base ────────────────────────────────────────────────────────────

function match(q: string, keywords: string[]): boolean {
  return keywords.some(k => q.includes(k))
}

function getQoraResponse(input: string): string {
  const q = input.toLowerCase().trim()

  // Greetings
  if (match(q, ['hello', 'hi ', 'hey', 'hiya', 'howdy', 'sup', 'good morning', 'good evening', 'good afternoon', 'good day']) || q === 'hi' || q === 'hey' || q === 'hello') {
    const opts = [
      "Hey! Good to hear from you. I'm here to help with anything — whether it's about your vaults, minting UBTC, how the quantum security works, or just general questions. What's on your mind?",
      "Hi there! I'm QORA. Ask me anything about the platform — accounts, vaults, minting, transfers, quantum crypto — or honestly anything else. I've got you.",
      "Hello! Great to connect. What can I help you with today?",
    ]
    return opts[Math.floor(Math.random() * opts.length)]
  }

  // Who / what is QORA
  if (match(q, ['who are you', 'what are you', 'what is qora', 'tell me about yourself', 'introduce yourself', 'your name'])) {
    return "I'm QORA — short for Quantum Operational Reasoning Agent. I live inside the QuFi platform and I'm here to help you navigate everything: opening accounts, locking BTC, minting UBTC, understanding the quantum cryptography, whatever you need. Think of me as your built-in assistant who actually knows how this place works."
  }

  // What is QuFi / the platform
  if (match(q, ['what is qufi', 'what is this platform', 'what does this do', 'what is this app', 'explain the platform', 'how does qufi work', 'what is ubtc platform', 'about qufi'])) {
    return "QuFi is a post-quantum financial infrastructure platform. The core idea is simple: you lock Bitcoin in a self-custody vault, and against that collateral you can mint UBTC — a Bitcoin-backed synthetic asset. Everything is secured with post-quantum cryptography (ML-DSA-65 and SLH-DSA-SHAKE-256s), meaning your assets are protected against both classical and future quantum computer attacks. Your keys never leave your device."
  }

  // UBTC
  if (match(q, ['ubtc', 'what is ubtc', 'synthetic', 'backed by bitcoin', 'bitcoin backed'])) {
    return "UBTC is a Bitcoin-backed synthetic asset minted on the QuFi platform. You lock BTC in your vault as collateral and mint UBTC against it. The minimum collateral ratio is 150% — so to mint $10,000 of UBTC, you need at least $15,000 worth of BTC locked. If the BTC price drops and your ratio falls below 150%, you're at risk of liquidation, so it's worth keeping a healthy buffer."
  }

  // Minting
  if (match(q, ['mint', 'how do i mint', 'minting', 'create ubtc', 'issue ubtc', 'how to mint'])) {
    return "To mint UBTC, go to your account and hit 'Create UBTC'. You'll choose an amount — the platform shows you exactly how much you can safely mint based on your BTC collateral. You'll sign the transaction with your wallet password (which triggers the post-quantum signing process), and the UBTC appears in your account. The whole thing takes about 30 seconds once your vault has BTC in it."
  }

  // Vault / custody vault
  if (match(q, ['vault', 'custody', 'custody vault', 'what is a vault', 'how does the vault work', 'open vault', 'create vault', 'open account'])) {
    return "A vault is essentially your self-custody Bitcoin account. When you open one, you get a unique Bitcoin deposit address (a MAST address secured with post-quantum keys). You send BTC there, it gets confirmed, and then you can mint UBTC against it. The vault uses ML-DSA-65 keys for signing — your private keys are stored encrypted on your device, never sent anywhere."
  }

  // Wallet
  if (match(q, ['wallet', 'my wallet', 'quantum wallet', 'how does the wallet work', 'wallet keys', 'private key', 'seed phrase'])) {
    return "Your QuFi wallet holds two post-quantum key pairs: ML-DSA-65 (lattice-based, FIPS 204) and SLH-DSA-SHAKE-256s (hash-based, FIPS 205). Both are used together for signing transactions, which makes it extremely robust. Your keys are stored encrypted on your device — the platform never has access to them. When you sign something, the signing happens locally and only the signature is sent to the backend."
  }

  // Quantum security / cryptography
  if (match(q, ['quantum', 'post-quantum', 'ml-dsa', 'slh-dsa', 'fips', 'cryptography', 'encryption', 'quantum safe', 'quantum resistant', 'lattice', 'hash-based', 'dilithium'])) {
    return "QuFi uses two NIST-standardised post-quantum algorithms: ML-DSA-65 (FIPS 204, lattice-based) and SLH-DSA-SHAKE-256s (FIPS 205, hash-based stateless signatures). Both are resistant to attacks from quantum computers, unlike the elliptic curve cryptography used in most current systems. Every transaction you sign on QuFi uses both algorithms together — the signatures are verified before anything is processed."
  }

  // Collateral ratio / liquidation
  if (match(q, ['collateral', 'ratio', 'liquidation', 'liquidate', '150', 'undercollateral', 'risk', 'margin'])) {
    return "The collateral ratio is the value of your locked BTC divided by your UBTC outstanding, expressed as a percentage. QuFi requires at least 150% — so your BTC is always worth at least 1.5x what you've minted. If BTC price drops and your ratio falls below 150%, your position risks liquidation. You can reduce risk by minting less (staying well above 150%), or by locking more BTC. The dashboard shows your current ratio in real time."
  }

  // UUSDT / UUSDC / stablecoins
  if (match(q, ['uusdt', 'uusdc', 'stablecoin', 'tether', 'usdc', 'stable', 'usdt'])) {
    return "UUSDT and UUSDC are quantum-secured versions of the major stablecoins. You can deposit USDT or USDC into your vault to hold them under post-quantum protection. Stablecoin minting through the vault is currently being upgraded with the hybrid post-quantum authorization system and will be available very shortly."
  }

  // Bitcoin / BTC
  if (match(q, ['bitcoin', 'btc', 'satoshi', 'sats', 'bitcoin price', 'btc price'])) {
    return "Bitcoin is the collateral that powers the whole QuFi system. You deposit BTC to your vault address, and once confirmed on-chain, that collateral lets you mint UBTC. The live BTC price is pulled in real time and used to calculate your collateral ratio and how much you can safely mint. You can see the current BTC price on your dashboard."
  }

  // Transfer / sending
  if (match(q, ['transfer', 'send', 'authorise transfer', 'authorize transfer', 'send ubtc', 'move funds', 'move ubtc'])) {
    return "Transfers on QuFi use distributed threshold signing — every transaction requires the minimum number of authorised signatories to sign off before it goes through. When you initiate a transfer, you'll use your wallet to sign it with both ML-DSA and SLH-DSA signatures. The signing overlay shows while this happens — it usually takes a few seconds. Don't close that window while it's running."
  }

  // Dashboard / portfolio
  if (match(q, ['dashboard', 'portfolio', 'overview', 'my portfolio', 'total value', 'balance'])) {
    return "Your dashboard shows a live overview of your entire QuFi portfolio — total BTC locked, UBTC balance, UUSDT and UUSDC, and your total value in USD at the current BTC price. Each vault has its own card showing the collateral ratio, what you've minted, and quick access to manage it. It refreshes in real time so the numbers are always current."
  }

  // Accounts
  if (match(q, ['account', 'accounts', 'my account', 'current account', 'savings account'])) {
    return "Your account is tied to a vault. You can have different account types — current, savings, yield, and others — each with its own vault and collateral position. From the accounts page you can see your real-time balances, create UBTC, move funds to your wallet, and access your transaction history."
  }

  // Getting started / how to start
  if (match(q, ['get started', 'how do i start', 'first steps', 'new here', 'how to begin', 'onboard', 'setup', 'set up', 'create account', 'sign up'])) {
    return "Getting started is pretty quick. First, make sure you have a quantum wallet set up — that gives you your signing keys. Then open an account (vault) and you'll get a Bitcoin deposit address. Send BTC to that address, wait for confirmation, and once it's showing in your vault you can mint UBTC against it. The whole first setup takes about 5 minutes."
  }

  // Proof / audit / compliance
  if (match(q, ['proof', 'audit', 'compliance', 'signature proof', 'tamper', 'record', 'audit trail'])) {
    return "Every signing event on QuFi produces a cryptographic proof — a tamper-evident record that captures exactly what was signed, when, and by which keys. These proofs are stored and accessible from the proofs section. You can export them for regulatory compliance or internal audit. Because they use post-quantum signatures, they're also future-proof against quantum attacks."
  }

  // Security / safe / trust
  if (match(q, ['security', 'safe', 'trust', 'is it safe', 'how secure', 'protection', 'secure'])) {
    return "QuFi is designed around a 'your keys, your assets' philosophy, secured with post-quantum cryptography. Your private keys are generated and stored encrypted on your device — the backend never sees them. Every transaction is signed locally before being sent. The quantum-resistant algorithms used (ML-DSA-65 and SLH-DSA-SHAKE-256s) are NIST-standardised and designed to remain secure even against quantum computers."
  }

  // Fees
  if (match(q, ['fee', 'fees', 'cost', 'how much does it cost', 'charges', 'pricing'])) {
    return "For specific fee information, the platform's fee schedule is something you'd want to check with the QuFi team directly — I don't want to give you outdated numbers. What I can tell you is that the minting and vault processes don't involve gas fees in the traditional sense since it's not running on a public chain."
  }

  // Support / contact / help
  if (match(q, ['support', 'contact', 'help me', 'i need help', 'problem', 'issue', 'not working', 'broken', 'bug', 'error'])) {
    return "If something isn't working as expected, the best move is to reach out to the QuFi support team directly — they'll be able to look at your specific account and situation. For any technical issues with signing or vault setup, make sure your wallet is properly set up first (that's the most common cause of issues). What's the problem you're running into? I might be able to help diagnose it."
  }

  // Thanks / appreciation
  if (match(q, ['thanks', 'thank you', 'cheers', 'appreciate', 'helpful', 'great', 'awesome', 'perfect', 'brilliant'])) {
    const opts = [
      "Happy to help! Anything else you want to know?",
      "Of course! That's what I'm here for. Any other questions?",
      "Glad that helped! Feel free to ask me anything else.",
    ]
    return opts[Math.floor(Math.random() * opts.length)]
  }

  // Goodbye
  if (match(q, ['bye', 'goodbye', 'see you', 'cya', 'later', 'talk later', 'done'])) {
    return "Take care! Come back anytime — I'll be right here. Stay quantum-secure."
  }

  // What can you do
  if (match(q, ['what can you do', 'what do you know', 'capabilities', 'what can you help', 'how can you help'])) {
    return "I can explain anything about the QuFi platform — how vaults work, how to mint UBTC, what the collateral ratio means, how the post-quantum cryptography protects your assets, how transfers work, and more. I can also just have a regular conversation or help with general questions. What do you want to know?"
  }

  // How are you / small talk
  if (match(q, ['how are you', 'how are u', 'how r u', 'you ok', 'you good', 'whats up', 'what up'])) {
    return "I'm doing great, thanks for asking! Running at full quantum capacity. How can I help you today?"
  }

  // General AI / ChatGPT comparison
  if (match(q, ['are you ai', 'are you a bot', 'are you chatgpt', 'are you gpt', 'are you real', 'ai assistant'])) {
    return "I'm an AI assistant built into the QuFi platform — specifically trained on how QuFi works. I'm not ChatGPT, but I can answer general questions too. My main speciality is helping you navigate QuFi — vaults, minting, quantum crypto, all of it. What can I help with?"
  }

  // General fallback — try to be helpful and human
  const genericResponses = [
    `Hmm, that's a bit outside my speciality, but I'll give it a shot. "${input}" — could you give me a bit more context? I want to make sure I give you a useful answer rather than a guess.`,
    `Good question. I'm primarily here to help with QuFi-related things, but I'm happy to try and help with that too. Could you expand on what you're looking for?`,
    `I want to make sure I give you a genuinely useful answer here. Can you tell me a bit more about what you're trying to figure out?`,
  ]
  return genericResponses[Math.floor(Math.random() * genericResponses.length)]
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: number
  role: 'qora' | 'user'
  text: string
}

const GREETING = "Hey! I'm QORA — your AI guide inside QuFi. Ask me anything about the platform, your vaults, how minting works, the quantum security, or honestly anything else. What's on your mind?"

let msgId = 0

// ── Component ─────────────────────────────────────────────────────────────────

export function QoraPanel() {
  const pathname  = usePathname()
  const isMobile  = useIsMobile()

  const [open,      setOpen]      = useState(false)
  const [visible,   setVisible]   = useState(false)
  const [messages,  setMessages]  = useState<Message[]>([])
  const [typingId,  setTypingId]  = useState<number | null>(null)
  const [charIdx,   setCharIdx]   = useState(0)
  const [thinking,  setThinking]  = useState(false)
  const [input,     setInput]     = useState('')
  const [speaking,  setSpeaking]  = useState(false)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  // Hide on onboarding and unlock pages
  if (pathname === '/' || pathname === '/unlock') return null

  // Button eases up after 2s
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 2000)
    return () => clearTimeout(t)
  }, [])

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, charIdx, thinking])

  // Typewriter for the latest QORA message
  useEffect(() => {
    if (typingId === null) return
    const msg = messages.find(m => m.id === typingId)
    if (!msg) return
    setCharIdx(0)
    setSpeaking(true)
    let i = 0
    const iv = setInterval(() => {
      i++
      setCharIdx(i)
      if (i >= msg.text.length) {
        clearInterval(iv)
        setSpeaking(false)
        setTypingId(null)
      }
    }, 18)
    return () => { clearInterval(iv); setSpeaking(false) }
  }, [typingId])  // eslint-disable-line react-hooks/exhaustive-deps

  const addQoraMessage = useCallback((text: string) => {
    const id = ++msgId
    setMessages(prev => [...prev, { id, role: 'qora', text }])
    setTypingId(id)
    setCharIdx(0)
  }, [])

  const handleOpen = () => {
    setOpen(true)
    if (messages.length === 0) {
      setTimeout(() => addQoraMessage(GREETING), 200)
    }
    setTimeout(() => inputRef.current?.focus(), 600)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || thinking || typingId !== null) return
    setInput('')
    const userMsg: Message = { id: ++msgId, role: 'user', text }
    setMessages(prev => [...prev, userMsg])
    setThinking(true)
    // Simulate natural thinking delay
    const delay = 600 + Math.random() * 700
    setTimeout(() => {
      setThinking(false)
      addQoraMessage(getQoraResponse(text))
    }, delay)
  }, [input, thinking, typingId, addQoraMessage])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* ── Floating CALL QORA button ── */}
      <div style={{
        position: 'fixed', bottom: 32, right: 32, zIndex: 9000,
        transform: visible && !open ? 'translateY(0)' : 'translateY(120px)',
        opacity:   visible && !open ? 1 : 0,
        transition: 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1), opacity 0.5s ease',
        pointerEvents: visible && !open ? 'auto' : 'none',
      }}>
        <button
          onClick={handleOpen}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'linear-gradient(135deg, rgba(10,14,24,0.96), rgba(18,10,36,0.96))',
            border: '1px solid rgba(160,80,255,0.4)',
            borderRadius: 50,
            padding: '10px 20px 10px 10px',
            cursor: 'pointer',
            boxShadow: '0 0 30px rgba(140,60,255,0.25), 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
            transition: 'all 0.25s',
            animation: 'qora-btn-pulse 3s ease-in-out infinite',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = '0 0 50px rgba(140,60,255,0.5), 0 12px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)'
            e.currentTarget.style.borderColor = 'rgba(160,80,255,0.7)'
            e.currentTarget.style.transform = 'scale(1.04)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = '0 0 30px rgba(140,60,255,0.25), 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)'
            e.currentTarget.style.borderColor = 'rgba(160,80,255,0.4)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: '#000', border: '1px solid rgba(160,80,255,0.4)',
            overflow: 'hidden', position: 'relative', flexShrink: 0,
          }}>
            <img src="/qora.png" alt="QORA" style={{ width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'screen' }} />
          </div>
          <div>
            <p style={{ color: '#dde4ed', fontSize: '12px', fontWeight: 600, margin: 0, letterSpacing: '0.04em', fontFamily: 'inherit' }}>CALL QORA</p>
            <p style={{ color: 'rgba(160,80,255,0.7)', fontSize: '9px', margin: 0, letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'inherit' }}>Your AI Guide</p>
          </div>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#a050ff', boxShadow: '0 0 8px rgba(160,80,255,0.9)', animation: 'qora-live 1.5s ease-in-out infinite' }} />
        </button>
      </div>

      {/* ── Backdrop ── */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9001,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.35s ease',
        }}
      />

      {/* ── QORA Chat Panel ── */}
      <div style={{
        position: 'fixed', bottom: 0, right: 0, zIndex: 9002,
        width: isMobile ? '100vw' : 420,
        maxWidth: '100vw',
        transform: open ? 'translateY(0)' : 'translateY(110%)',
        transition: 'transform 0.55s cubic-bezier(0.34,1.2,0.64,1)',
        borderRadius: isMobile ? '20px 20px 0 0' : '24px 24px 0 0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: isMobile ? '82vh' : 560,
      }}>
        <div style={{
          background: 'linear-gradient(160deg, rgba(8,6,20,0.98) 0%, rgba(14,6,28,0.98) 100%)',
          border: '1px solid rgba(160,80,255,0.2)',
          borderBottom: 'none',
          borderRadius: isMobile ? '20px 20px 0 0' : '24px 24px 0 0',
          boxShadow: '0 -20px 80px rgba(140,60,255,0.2), 0 -4px 40px rgba(0,0,0,0.8)',
          display: 'flex', flexDirection: 'column',
          flex: 1, overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Top glow bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(160,80,255,0.8), rgba(100,200,255,0.6), transparent)', zIndex: 1 }} />

          {/* Ambient glow */}
          <div style={{ position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)', width: 400, height: 250, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(120,40,220,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {/* ── Header ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', flexShrink: 0, borderBottom: '1px solid rgba(160,80,255,0.12)', position: 'relative', zIndex: 1 }}>
            {/* QORA avatar — small in header */}
            <div style={{ flexShrink: 0 }}>
              <QoraAvatar size={48} speaking={speaking} globalMouse style={{ filter: 'drop-shadow(0 0 12px rgba(140,60,255,0.5))' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <p style={{ color: '#dde4ed', fontSize: '14px', fontWeight: 700, margin: 0, fontFamily: 'inherit', letterSpacing: '0.02em' }}>QORA</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a050ff', boxShadow: '0 0 8px rgba(160,80,255,0.9)', animation: 'qora-live 1.5s ease-in-out infinite' }} />
                  <span style={{ color: 'rgba(160,80,255,0.7)', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'monospace' }}>Online</span>
                </div>
              </div>
              <p style={{ color: 'rgba(160,80,255,0.6)', fontSize: '10px', margin: 0, fontFamily: 'monospace', letterSpacing: '0.1em' }}>Quantum Operational Reasoning Agent</p>
            </div>
            <button
              onClick={handleClose}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: 'rgba(200,200,220,0.5)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', fontFamily: 'inherit', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,80,80,0.1)'; e.currentTarget.style.color = 'rgba(255,100,100,0.8)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(200,200,220,0.5)' }}
            >✕</button>
          </div>

          {/* ── Messages ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map(msg => {
              const isTyping = msg.id === typingId
              const displayText = isTyping ? msg.text.slice(0, charIdx) : msg.text

              if (msg.role === 'user') {
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{
                      maxWidth: '78%',
                      background: 'linear-gradient(135deg, rgba(100,40,200,0.45), rgba(60,20,160,0.45))',
                      border: '1px solid rgba(160,80,255,0.3)',
                      borderRadius: '16px 16px 4px 16px',
                      padding: '10px 14px',
                      backdropFilter: 'blur(10px)',
                    }}>
                      <p style={{ color: 'rgba(220,200,255,0.92)', fontSize: '13px', lineHeight: 1.6, margin: 0, fontFamily: "'Inter', -apple-system, system-ui, sans-serif" }}>
                        {msg.text}
                      </p>
                    </div>
                  </div>
                )
              }

              return (
                <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  {/* Small QORA dot for message attribution */}
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#000', border: '1px solid rgba(160,80,255,0.35)', overflow: 'hidden', flexShrink: 0, marginBottom: 2 }}>
                    <img src="/qora.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'screen' }} />
                  </div>
                  <div style={{
                    maxWidth: '82%',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(160,80,255,0.18)',
                    borderRadius: '16px 16px 16px 4px',
                    padding: '10px 14px',
                    backdropFilter: 'blur(10px)',
                  }}>
                    <p style={{ color: 'rgba(210,220,240,0.9)', fontSize: '13px', lineHeight: 1.65, margin: 0, fontFamily: "'Inter', -apple-system, system-ui, sans-serif" }}>
                      {displayText}
                      {isTyping && (
                        <span style={{ display: 'inline-block', width: 2, height: '1em', background: 'rgba(160,80,255,0.7)', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'qora-cursor 0.5s step-end infinite' }} />
                      )}
                    </p>
                  </div>
                </div>
              )
            })}

            {/* Thinking indicator */}
            {thinking && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#000', border: '1px solid rgba(160,80,255,0.35)', overflow: 'hidden', flexShrink: 0 }}>
                  <img src="/qora.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'screen' }} />
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(160,80,255,0.18)', borderRadius: '16px 16px 16px 4px', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(160,80,255,0.6)', animation: `qora-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── Input bar ── */}
          <div style={{ padding: '10px 14px 20px', flexShrink: 0, borderTop: '1px solid rgba(160,80,255,0.1)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask me anything..."
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(160,80,255,0.2)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  color: 'rgba(220,225,240,0.9)',
                  fontSize: '13px',
                  fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(160,80,255,0.5)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(160,80,255,0.2)' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || thinking || typingId !== null}
                style={{
                  width: 40, height: 40, borderRadius: 12, border: 'none',
                  background: input.trim() && !thinking && typingId === null
                    ? 'linear-gradient(135deg, rgba(120,50,220,0.9), rgba(80,30,180,0.9))'
                    : 'rgba(255,255,255,0.06)',
                  cursor: input.trim() && !thinking && typingId === null ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                  boxShadow: input.trim() && !thinking && typingId === null ? '0 0 16px rgba(140,60,255,0.35)' : 'none',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !thinking && typingId === null ? 'rgba(220,180,255,0.95)' : 'rgba(255,255,255,0.2)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <p style={{ color: 'rgba(160,80,255,0.35)', fontSize: '9px', textAlign: 'center', margin: '8px 0 0', fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              QORA · QuFi AI Guide
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes qora-btn-pulse {
          0%, 100% { box-shadow: 0 0 30px rgba(140,60,255,0.25), 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06); }
          50%       { box-shadow: 0 0 50px rgba(140,60,255,0.45), 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06); }
        }
        @keyframes qora-live {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50%       { opacity: 1.0; transform: scale(1.3); }
        }
        @keyframes qora-cursor {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes qora-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%           { transform: scale(1.1); opacity: 1; }
        }
      `}</style>
    </>
  )
}

'use client'
import { useState, Suspense } from 'react'
import { API_URL } from '../lib/supabase'

const btnPrimary: any = { background: 'linear-gradient(135deg, hsl(205, 85%, 55%), hsl(190, 80%, 50%))', color: 'white', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', boxShadow: '0 0 30px hsl(205 85% 55% / 0.4)', width: '100%' }
const btnAmber: any = { background: 'hsl(38 92% 50%)', color: 'white', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', width: '100%' }
const btnGhost: any = { background: 'none', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 65%)', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', width: '100%' }
const btnDisabled: any = { background: 'hsl(220 10% 14%)', color: 'hsl(0 0% 40%)', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'not-allowed', fontFamily: 'var(--font-display)', width: '100%' }

function KeyCard({ label, value, color, badge, badgeColor, description, warning }: {
  label: string, value: string, color: string, badge: string, badgeColor: string, description: string, warning?: string
}) {
  const mono: any = { fontFamily: 'var(--font-mono)' }
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ background: 'hsl(220 15% 5%)', border: `1px solid ${color}30`, borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'hsl(0 0% 55%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{label}</span>
          <span style={{ fontSize: '10px', ...mono, color: badgeColor, border: `1px solid ${badgeColor}40`, borderRadius: '20px', padding: '2px 8px', textTransform: 'uppercase' }}>{badge}</span>
        </div>
        <button onClick={copy} style={{ background: 'hsl(220 12% 12%)', border: '1px solid hsl(220 10% 20%)', color: copied ? 'hsl(142 76% 36%)' : 'hsl(0 0% 55%)', borderRadius: '6px', padding: '4px 10px', fontSize: '10px', cursor: 'pointer', ...mono }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <p style={{ color, fontSize: '11px', ...mono, margin: '0 0 8px', wordBreak: 'break-all' as const, lineHeight: '1.6' }}>
        {value.length > 80 ? value.slice(0, 80) + '...' : value}
      </p>
      <p style={{ color: 'hsl(0 0% 45%)', fontSize: '11px', ...mono, margin: warning ? '0 0 8px' : '0', lineHeight: '1.6' }}>{description}</p>
      {warning && (
        <p style={{ color: 'hsl(0 84% 60%)', fontSize: '11px', ...mono, margin: 0, lineHeight: '1.6' }}>{warning}</p>
      )}
    </div>
  )
}

function WalletContent() {
  const [tab, setTab] = useState<'create' | 'send' | 'view'>('create')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [fromAddress, setFromAddress] = useState('')
  const [toTarget, setToTarget] = useState('')
  const [amount, setAmount] = useState('')
  const [sendType, setSendType] = useState<'internal' | 'external'>('internal')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [walletInfo, setWalletInfo] = useState<any>(null)
  const [viewAddress, setViewAddress] = useState('')
  const [viewWallet, setViewWallet] = useState<any>(null)
  const [lookupResult, setLookupResult] = useState<any>(null)
  const [showExternalWarning, setShowExternalWarning] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const mono: any = { fontFamily: 'var(--font-mono)' }
  const inputStyle: any = { display: 'block', width: '100%', padding: '14px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', color: 'hsl(0 0% 92%)', fontSize: '13px', fontFamily: 'var(--font-mono)', marginBottom: '16px', boxSizing: 'border-box', outline: 'none' }

  const createWallet = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch(`${API_URL}/wallet/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const loadWallet = async (address: string) => {
    if (!address || address.length < 10) return
    try {
      const res = await fetch(`${API_URL}/wallet/${address}`)
      const data = await res.json()
      if (res.ok) setWalletInfo(data)
      else setWalletInfo(null)
    } catch (e) { console.error(e) }
  }

  const lookupUser = async (target: string) => {
    if (!target || target.length < 2) return
    try {
      const res = await fetch(`${API_URL}/wallet/lookup/${target}`)
      const data = await res.json()
      setLookupResult(data)
    } catch (e) { console.error(e) }
  }

  const executeSend = async () => {
    setShowExternalWarning(false)
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_URL}/wallet/${fromAddress}/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_address: fromAddress, to_username_or_address: toTarget, amount, send_type: sendType })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      await loadWallet(fromAddress)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const tabs = [
    { id: 'create', label: 'Create Wallet', icon: '⚛️' },
    { id: 'send', label: 'Send UBTC', icon: '↗️' },
    { id: 'view', label: 'View Wallet', icon: '👁' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 5%)', padding: '40px 24px', fontFamily: 'var(--font-display)' }}>

      {/* External warning modal */}
      {showExternalWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'hsl(220 15% 5% / 0.95)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(0 84% 60%)', borderRadius: '16px', padding: '32px', maxWidth: '480px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <span style={{ fontSize: '28px' }}>⚠️</span>
              <h2 style={{ color: 'hsl(0 84% 60%)', fontSize: '18px', fontWeight: '700', margin: 0 }}>External Transfer Warning</h2>
            </div>
            <p style={{ color: 'hsl(0 0% 92%)', fontSize: '13px', ...mono, lineHeight: '1.8', marginBottom: '20px' }}>
              You are sending UBTC outside the UBTC system. The recipient will gain redemption rights over the equivalent BTC value. This cannot be undone.
            </p>
            <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid hsl(220 10% 14%)' }}>
                <span style={{ color: 'hsl(0 0% 55%)', fontSize: '12px', ...mono }}>Amount</span>
                <span style={{ color: 'hsl(0 84% 60%)', fontWeight: '700', ...mono }}>${parseFloat(amount || '0').toLocaleString()} UBTC</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ color: 'hsl(0 0% 55%)', fontSize: '12px', ...mono }}>To</span>
                <span style={{ color: 'hsl(0 0% 92%)', fontSize: '11px', ...mono }}>{toTarget.slice(0, 24)}...</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowExternalWarning(false)} style={btnGhost}>Cancel</button>
              <button onClick={executeSend} disabled={loading} style={btnAmber}>
                {loading ? 'Sending...' : 'I Understand — Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(205 85% 55%)', boxShadow: '0 0 10px hsl(205 85% 55% / 0.8)' }} />
          <span style={{ fontSize: '11px', ...mono, color: 'hsl(205 85% 55%)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>UBTC Wallet</span>
        </div>

        <h1 style={{ fontSize: '40px', fontWeight: '700', color: 'hsl(0 0% 92%)', marginBottom: '12px' }}>UBTC Wallet</h1>
        <p style={{ color: 'hsl(0 0% 65%)', fontSize: '14px', ...mono, marginBottom: '32px', lineHeight: '1.8' }}>
          Post-quantum secured wallet. Send to anyone by username or address.
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id as any); setResult(null); setError('') }} style={{
              flex: 1, background: tab === t.id ? 'hsl(205 85% 55% / 0.15)' : 'hsl(220 12% 8%)',
              border: `1px solid ${tab === t.id ? 'hsl(205 85% 55%)' : 'hsl(220 10% 16%)'}`,
              color: tab === t.id ? 'hsl(205 85% 55%)' : 'hsl(0 0% 65%)',
              borderRadius: '10px', padding: '12px 8px', fontSize: '12px', fontWeight: '600',
              cursor: 'pointer', ...mono, textAlign: 'center' as const,
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '16px', padding: '28px' }}>

          {/* ── Create Wallet ── */}
          {tab === 'create' && !result && (
            <>
              <div style={{ background: 'hsl(205 85% 55% / 0.05)', border: '1px solid hsl(205 85% 55% / 0.2)', borderRadius: '10px', padding: '14px 16px', marginBottom: '24px', display: 'flex', gap: '10px' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>⚛️</span>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.7' }}>
                  Your wallet is secured by post-quantum cryptography. Keys are generated using true quantum randomness — measurements of quantum vacuum fluctuations — making them physically impossible to predict.
                </p>
              </div>

              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Username</label>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="satoshi" style={inputStyle} />

              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />

              <button onClick={createWallet} disabled={loading || !username || !email} style={loading || !username || !email ? btnDisabled : btnPrimary}>
                {loading ? 'Generating Quantum Wallet...' : '⚛️ Create Wallet'}
              </button>
            </>
          )}

          {/* ── Wallet Created ── */}
          {tab === 'create' && result && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>✅</span>
                <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>Wallet Created</h2>
                <p style={{ color: 'hsl(0 0% 55%)', fontSize: '13px', ...mono, margin: 0 }}>@{result.username}</p>
              </div>

              {/* Critical warning first */}
              <div style={{ background: 'hsl(0 84% 60% / 0.08)', border: '2px solid hsl(0 84% 60%)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <p style={{ color: 'hsl(0 84% 60%)', fontSize: '13px', fontWeight: '700', margin: '0 0 8px' }}>⚠ Save All Three Keys — Read This First</p>
                <p style={{ color: 'hsl(0 0% 92%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.7' }}>
                  Three pieces of information have been generated for your wallet. Each serves a different purpose. Your private key is shown <strong>once only</strong> and is never stored by UBTC. If you lose it, in production you would lose access to your wallet permanently.
                </p>
              </div>

              {/* Wallet Address */}
              <KeyCard
                label="Wallet Address"
                value={result.wallet_address}
                color="hsl(205 85% 55%)"
                badge="Public — Safe to Share"
                badgeColor="hsl(142 76% 36%)"
                description="Your public identity on the UBTC network. Share this with anyone who wants to send you UBTC. Like a bank account number — visible to all, safe to share."
              />

              {/* Public Key */}
              <KeyCard
                label="Post-Quantum Public Key"
                value={result.public_key}
                color="hsl(38 92% 50%)"
                badge="Public — Safe to Share"
                badgeColor="hsl(142 76% 36%)"
                description="Your cryptographic identity derived from quantum randomness. Used to verify that transactions are genuinely from you. Cannot be used to sign or move funds — only your private key can do that."
              />

              {/* Private Key */}
              <KeyCard
                label="Post-Quantum Private Key"
                value={result.private_key}
                color="hsl(0 84% 60%)"
                badge="Private — Never Share"
                badgeColor="hsl(0 84% 60%)"
                description="The master key to your wallet. In production, every transaction would require this key to sign. Store it offline like a seed phrase — written on paper, kept in a safe place."
                warning="⚠ This is shown once only and is never stored by UBTC. Anyone who has this key can control your wallet. Never share it with anyone including UBTC support."
              />

              {/* Confirm saved */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '20px', padding: '14px', background: 'hsl(220 15% 5%)', borderRadius: '10px', cursor: 'pointer' }} onClick={() => setConfirmed(!confirmed)}>
                <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: `2px solid ${confirmed ? 'hsl(142 76% 36%)' : 'hsl(220 10% 30%)'}`, background: confirmed ? 'hsl(142 76% 36%)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                  {confirmed && <span style={{ color: 'white', fontSize: '12px', fontWeight: '700' }}>✓</span>}
                </div>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>
                  I have saved my wallet address, public key and private key in a safe place. I understand the private key is shown once only and UBTC cannot recover it.
                </p>
              </div>

              <button onClick={() => { if (confirmed) { setResult(null); setTab('send') } }} disabled={!confirmed} style={confirmed ? btnPrimary : btnDisabled}>
                I Have Saved My Keys — Continue →
              </button>
            </>
          )}

          {/* ── Send UBTC ── */}
          {tab === 'send' && !result && (
            <>
              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Your Wallet Address</label>
              <input value={fromAddress} onChange={e => { setFromAddress(e.target.value); loadWallet(e.target.value) }} placeholder="ubtc1..." style={inputStyle} />

              {walletInfo && (
                <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                  <p style={{ color: 'hsl(0 0% 55%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>@{walletInfo.username}</p>
                  <p style={{ color: 'hsl(205 85% 55%)', fontSize: '24px', fontWeight: '700', ...mono, margin: 0 }}>${parseFloat(walletInfo.balance).toLocaleString()} UBTC</p>
                </div>
              )}

              <p style={{ color: 'hsl(0 0% 65%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 10px' }}>Send Type</p>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <div onClick={() => setSendType('internal')} style={{ flex: 1, background: sendType === 'internal' ? 'hsl(205 85% 55% / 0.1)' : 'hsl(220 15% 5%)', border: `2px solid ${sendType === 'internal' ? 'hsl(205 85% 55%)' : 'hsl(220 10% 16%)'}`, borderRadius: '10px', padding: '14px', cursor: 'pointer' }}>
                  <p style={{ color: sendType === 'internal' ? 'hsl(205 85% 55%)' : 'hsl(0 0% 92%)', fontWeight: '600', fontSize: '13px', margin: '0 0 4px' }}>🔒 Internal</p>
                  <p style={{ color: 'hsl(0 0% 55%)', fontSize: '11px', ...mono, margin: 0, lineHeight: '1.5' }}>To a UBTC user by username. BTC value stays with you.</p>
                </div>
                <div onClick={() => setSendType('external')} style={{ flex: 1, background: sendType === 'external' ? 'hsl(38 92% 50% / 0.1)' : 'hsl(220 15% 5%)', border: `2px solid ${sendType === 'external' ? 'hsl(38 92% 50%)' : 'hsl(220 10% 16%)'}`, borderRadius: '10px', padding: '14px', cursor: 'pointer' }}>
                  <p style={{ color: sendType === 'external' ? 'hsl(38 92% 50%)' : 'hsl(0 0% 92%)', fontWeight: '600', fontSize: '13px', margin: '0 0 4px' }}>↗️ External</p>
                  <p style={{ color: 'hsl(0 0% 55%)', fontSize: '11px', ...mono, margin: 0, lineHeight: '1.5' }}>To a Bitcoin address. Transfers BTC redemption rights.</p>
                </div>
              </div>

              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
                {sendType === 'internal' ? 'Recipient Username or Wallet Address' : 'Destination Bitcoin Address'}
              </label>
              <input value={toTarget} onChange={e => { setToTarget(e.target.value); if (sendType === 'internal') lookupUser(e.target.value) }} placeholder={sendType === 'internal' ? '@username or ubtc1...' : 'bcrt1q...'} style={inputStyle} />

              {lookupResult && sendType === 'internal' && toTarget.length > 1 && (
                <div style={{ background: lookupResult.found ? 'hsl(142 76% 36% / 0.08)' : 'hsl(0 84% 60% / 0.08)', border: `1px solid ${lookupResult.found ? 'hsl(142 76% 36% / 0.3)' : 'hsl(0 84% 60% / 0.3)'}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
                  <p style={{ color: lookupResult.found ? 'hsl(142 76% 36%)' : 'hsl(0 84% 60%)', fontSize: '12px', ...mono, margin: 0 }}>
                    {lookupResult.found ? `✓ Found: @${lookupResult.username}` : '✗ User not found on UBTC'}
                  </p>
                </div>
              )}

              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Amount (UBTC)</label>
              <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="1000" type="number" style={inputStyle} />

              <button
                onClick={() => sendType === 'external' ? setShowExternalWarning(true) : executeSend()}
                disabled={loading || !fromAddress || !toTarget || !amount}
                style={loading || !fromAddress || !toTarget || !amount ? btnDisabled : sendType === 'external' ? btnAmber : btnPrimary}
              >
                {loading ? 'Sending...' : sendType === 'external' ? '⚠ Send Externally' : `Send $${parseFloat(amount || '0').toLocaleString()} UBTC`}
              </button>
            </>
          )}

          {tab === 'send' && result && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>✅</span>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '12px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>Sent</p>
                <p style={{ fontSize: '32px', fontWeight: '700', color: 'hsl(205 85% 55%)', margin: 0 }}>${parseFloat(result.amount).toLocaleString()} UBTC</p>
              </div>
              <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                {[
                  { label: 'Transaction ID', value: result.transaction_id },
                  { label: 'To', value: result.to },
                  { label: 'Type', value: result.send_type === 'internal' ? '🔒 Internal — BTC value preserved' : '↗️ External — BTC rights transferred' },
                ].map(item => (
                  <div key={item.label} style={{ padding: '8px 0', borderBottom: '1px solid hsl(220 10% 14%)' }}>
                    <p style={{ color: 'hsl(0 0% 55%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>{item.label}</p>
                    <p style={{ color: 'hsl(0 0% 92%)', fontSize: '12px', ...mono, margin: 0 }}>{item.value}</p>
                  </div>
                ))}
              </div>
              <p style={{ color: 'hsl(0 0% 55%)', fontSize: '12px', ...mono, lineHeight: '1.6', marginBottom: '16px' }}>{result.message}</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => { setResult(null); setAmount(''); setToTarget('') }} style={btnPrimary}>Send Again</button>
                <a href="/dashboard" style={{ ...btnGhost, display: 'block', textAlign: 'center', textDecoration: 'none' }}>Dashboard</a>
              </div>
            </>
          )}

          {/* ── View Wallet ── */}
          {tab === 'view' && (
            <>
              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Wallet Address</label>
              <input value={viewAddress} onChange={e => { setViewAddress(e.target.value); if (e.target.value.length > 10) { fetch(`${API_URL}/wallet/${e.target.value}`).then(r => r.json()).then(d => setViewWallet(d.error ? null : d)) } }} placeholder="ubtc1..." style={inputStyle} />

              {viewWallet && (
                <>
                  <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '12px', padding: '20px', marginBottom: '16px', textAlign: 'center' as const }}>
                    <p style={{ color: 'hsl(0 0% 55%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>@{viewWallet.username}</p>
                    <p style={{ color: 'hsl(205 85% 55%)', fontSize: '36px', fontWeight: '700', margin: '0 0 4px' }}>${parseFloat(viewWallet.balance).toLocaleString()}</p>
                    <p style={{ color: 'hsl(0 0% 45%)', fontSize: '11px', ...mono, margin: 0 }}>UBTC Balance</p>
                  </div>
                  <KeyCard
                    label="Wallet Address"
                    value={viewWallet.wallet_address}
                    color="hsl(205 85% 55%)"
                    badge="Public"
                    badgeColor="hsl(142 76% 36%)"
                    description="Share this to receive UBTC payments."
                  />
                  <KeyCard
                    label="Post-Quantum Public Key"
                    value={viewWallet.public_key}
                    color="hsl(38 92% 50%)"
                    badge="Public"
                    badgeColor="hsl(142 76% 36%)"
                    description="Cryptographic proof of wallet ownership. Cannot be used to move funds."
                  />
                </>
              )}

              {viewAddress.length > 10 && !viewWallet && (
                <p style={{ color: 'hsl(0 84% 60%)', fontSize: '13px', ...mono }}>Wallet not found</p>
              )}
            </>
          )}

          {error && <p style={{ color: 'hsl(0 84% 60%)', marginTop: '16px', fontSize: '13px', ...mono }}>{error}</p>}
        </div>
      </div>
    </div>
  )
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div style={{ color: 'hsl(0 0% 65%)', padding: '40px', fontFamily: 'var(--font-mono)' }}>Loading...</div>}>
      <WalletContent />
    </Suspense>
  )
}
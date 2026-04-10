'use client'
import { useState, useEffect, Suspense } from 'react'
import { API_URL } from '../lib/supabase'
import { Icons } from '../components/Icons'

function WalletContent() {
  const [view, setView] = useState<'landing' | 'create' | 'lookup' | 'dashboard'>('landing')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [walletName, setWalletName] = useState('')
  const [linkedVaultId, setLinkedVaultId] = useState('')
  const [lookupUsername, setLookupUsername] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [walletData, setWalletData] = useState<any>(null)
  const [walletTxs, setWalletTxs] = useState<any[]>([])
  const [vaults, setVaults] = useState<any[]>([])
  const [tokens, setTokens] = useState({ ubtc: true, uusdt: false, uusdc: false })
  const [showManageTokens, setShowManageTokens] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createResult, setCreateResult] = useState<any>(null)
  const [lookupResult, setLookupResult] = useState<any>(null)
  const [copied, setCopied] = useState('')
  const [protocolKeySaved, setProtocolKeySaved] = useState(false)

  const mono: any = { fontFamily: 'var(--font-mono)' }

 useEffect(() => {
    const stored = localStorage.getItem('ubtc_wallet_address')
    if (stored) {
      setWalletAddress(stored)
      // Don't auto-load — just show the button on landing
    }
    loadVaults()
  }, [])

  const loadVaults = async () => {
    try {
      const res = await fetch(`${API_URL}/dashboard`)
      const data = await res.json()
      setVaults(data.vaults || [])
    } catch (e) { console.error(e) }
  }

  const loadWallet = async (addr: string) => {
    if (!addr) return
    try {
      const res = await fetch(`${API_URL}/wallets/all`)
      const data = await res.json()
      const wData = (data.wallets || []).find((w: any) => w.wallet_address === addr)
      if (wData) {
        setWalletData(wData)
        setView('dashboard')
      } else {
        localStorage.removeItem('ubtc_wallet_address')
        setView('landing')
      }
      try {
        const txRes = await fetch(`${API_URL}/wallet/${addr}/transactions`)
        if (txRes.ok) {
          const txData = await txRes.json()
          setWalletTxs(txData.transactions || [])
        }
      } catch {}
    } catch (e) { console.error(e) }
  }

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(''), 2000)
  }

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button onClick={() => copy(text, id)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: copied === id ? 'hsl(142 76% 36% / 0.15)' : 'hsl(220 12% 12%)', border: `1px solid ${copied === id ? 'hsl(142 76% 36% / 0.4)' : 'hsl(220 10% 20%)'}`, color: copied === id ? 'hsl(142 76% 36%)' : 'hsl(0 0% 50%)', borderRadius: '7px', padding: '6px 12px', fontSize: '11px', cursor: 'pointer', ...mono, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
      {copied === id ? Icons.check(13, 'hsl(142 76% 36%)') : Icons.copy(13, 'hsl(0 0% 50%)')}
      {copied === id ? 'Copied' : 'Copy'}
    </button>
  )

  const createWallet = async () => {
    if (!username || !email) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_URL}/wallet/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, wallet_name: walletName || 'My Wallet', linked_vault_id: linkedVaultId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCreateResult(data)
      localStorage.setItem('ubtc_wallet_address', data.wallet_address)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const lookupUser = async () => {
    if (!lookupUsername) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_URL}/wallets/all`)
      const data = await res.json()
      const match = (data.wallets || []).find((w: any) =>
        w.username?.toLowerCase() === lookupUsername.toLowerCase() ||
        w.wallet_address?.toLowerCase() === lookupUsername.toLowerCase()
      )
      if (!match) throw new Error('User not found')
      setLookupResult(match)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const inputStyle: any = { display: 'block', width: '100%', padding: '13px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '12px', color: 'hsl(0 0% 92%)', fontSize: '14px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '12px' }

  const accountMeta: Record<string, { icon: string; title: string }> = {
    current: { icon: '💳', title: 'Current Account' },
    savings: { icon: '🔐', title: 'Savings Account' },
    yield: { icon: '₿', title: 'Yield Account' },
    custody_yield: { icon: '📊', title: 'Custody Yield' },
    prime: { icon: '💎', title: 'Prime Account' },
    managed_yield: { icon: '🏦', title: 'Managed Yield' },
  }

  const balance = parseFloat(walletData?.balance || '0')

  // ── LANDING ──
  if (view === 'landing') return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', fontFamily: 'var(--font-display)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' as const }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'hsl(205 85% 55% / 0.1)', border: '2px solid hsl(205 85% 55% / 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          {Icons.wallet(32, 'hsl(205 85% 55%)')}
        </div>
        <h1 style={{ color: 'hsl(0 0% 92%)', fontSize: '28px', fontWeight: '700', margin: '0 0 8px' }}>UBTC Wallet</h1>
        <p style={{ color: 'hsl(0 0% 35%)', fontSize: '14px', ...mono, margin: '0 0 32px', lineHeight: '1.7' }}>Send and receive UBTC, UUSDT and UUSDC instantly.</p>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
          <button onClick={() => setView('create')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))', color: 'white', border: 'none', borderRadius: '14px', padding: '16px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-display)', boxShadow: '0 0 30px hsl(205 85% 55% / 0.3)' }}>
            {Icons.plus(18, 'white')} Create New Wallet
          </button>
          <button onClick={() => setView('lookup')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 60%)', borderRadius: '14px', padding: '16px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
            {Icons.user(18, 'hsl(0 0% 60%)')} Find a User
          </button>
          {walletAddress && (
            <button onClick={() => loadWallet(walletAddress)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'hsl(220 12% 10%)', border: '1px solid hsl(205 85% 55% / 0.35)', color: 'hsl(205 85% 60%)', borderRadius: '14px', padding: '16px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
              {Icons.wallet(18, 'hsl(205 85% 60%)')} Open My Wallet
            </button>
          )}
          <a href="/dashboard" style={{ color: 'hsl(0 0% 25%)', fontSize: '13px', ...mono, textDecoration: 'none', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            {Icons.back(14, 'hsl(0 0% 25%)')} Back to Accounts
          </a>
        </div>
      </div>
    </div>
  )

  // ── CREATE ──
  if (view === 'create') return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', fontFamily: 'var(--font-display)', padding: '40px 20px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
          <button onClick={() => setView('landing')} style={{ background: 'none', border: 'none', color: 'hsl(0 0% 40%)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>{Icons.back(20, 'hsl(0 0% 40%)')}</button>
          <h1 style={{ color: 'hsl(0 0% 92%)', fontSize: '24px', fontWeight: '700', margin: 0 }}>Create Wallet</h1>
        </div>

        {createResult ? (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>
            <div style={{ textAlign: 'center' as const, marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>{Icons.key(52, 'hsl(205 85% 55%)')}</div>
              <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '24px', fontWeight: '700', margin: '0 0 6px' }}>Save Your Keys</h2>
              <p style={{ color: 'hsl(0 0% 38%)', fontSize: '14px', ...mono, margin: 0 }}>@{createResult.username} · Wallet created</p>
            </div>

            <div style={{ background: 'hsl(220 12% 8%)', border: '2px solid hsl(205 85% 55% / 0.4)', borderRadius: '18px', padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {Icons.key(16, 'hsl(205 85% 55%)')}
                  <div>
                    <p style={{ color: 'hsl(205 85% 55%)', fontWeight: '700', fontSize: '14px', margin: '0 0 2px' }}>Protocol Second Key</p>
                    <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, margin: 0 }}>Enter this when minting or transferring</p>
                  </div>
                </div>
                <CopyBtn text={createResult.private_key?.slice(0, 64) || ''} id="psk" />
              </div>
              <div style={{ background: 'hsl(220 15% 4%)', border: '1px solid hsl(205 85% 55% / 0.15)', borderRadius: '12px', padding: '14px', marginBottom: '10px' }}>
                <p style={{ color: 'hsl(205 85% 55%)', fontSize: '11px', ...mono, wordBreak: 'break-all' as const, lineHeight: '1.8', margin: 0 }}>{createResult.private_key?.slice(0, 64)}</p>
              </div>
              <p style={{ color: 'hsl(0 0% 30%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>Use when prompted for "Protocol Authorization Key" during Mint and Transfer.</p>
            </div>

            <div style={{ background: 'hsl(220 12% 8%)', border: '2px solid hsl(0 84% 60% / 0.4)', borderRadius: '18px', padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {Icons.quantum(16, 'hsl(0 84% 60%)')}
                  <div>
                    <p style={{ color: 'hsl(0 84% 60%)', fontWeight: '700', fontSize: '14px', margin: '0 0 2px' }}>Quantum Signing Key (QSK)</p>
                    <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, margin: 0 }}>Signs quantum transactions — once only</p>
                  </div>
                </div>
                <CopyBtn text={createResult.private_key || ''} id="qsk" />
              </div>
              <div style={{ background: 'hsl(220 15% 4%)', border: '1px solid hsl(0 84% 60% / 0.15)', borderRadius: '12px', padding: '14px' }}>
                <p style={{ color: 'hsl(0 84% 60%)', fontSize: '11px', ...mono, wordBreak: 'break-all' as const, lineHeight: '1.8', margin: 0 }}>{createResult.private_key}</p>
              </div>
            </div>

            <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 13%)', borderRadius: '16px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                {Icons.wallet(14, 'hsl(0 0% 30%)')}
                <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Wallet Address</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <p style={{ color: 'hsl(205 85% 55%)', fontSize: '12px', ...mono, margin: 0, flex: 1, wordBreak: 'break-all' as const }}>{createResult.wallet_address}</p>
                <CopyBtn text={createResult.wallet_address} id="addr" />
              </div>
            </div>

            <div onClick={() => setProtocolKeySaved(!protocolKeySaved)} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'hsl(220 12% 8%)', border: `1px solid ${protocolKeySaved ? 'hsl(142 76% 36% / 0.4)' : 'hsl(220 10% 14%)'}`, borderRadius: '12px', padding: '14px', cursor: 'pointer' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${protocolKeySaved ? 'hsl(142 76% 36%)' : 'hsl(220 10% 28%)'}`, background: protocolKeySaved ? 'hsl(142 76% 36%)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {protocolKeySaved && Icons.check(13, 'white')}
              </div>
              <p style={{ color: 'hsl(0 0% 45%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.6' }}>I have saved both keys. I understand they cannot be recovered.</p>
            </div>

            <button
              onClick={() => {
                if (protocolKeySaved) {
                  setWalletData(createResult)
                  setWalletAddress(createResult.wallet_address)
                  setView('dashboard')
                  loadWallet(createResult.wallet_address)
                }
              }}
              disabled={!protocolKeySaved}
              style={{ background: protocolKeySaved ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : 'hsl(220 10% 12%)', color: protocolKeySaved ? 'white' : 'hsl(0 0% 28%)', border: 'none', borderRadius: '14px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: protocolKeySaved ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', boxShadow: protocolKeySaved ? '0 0 30px hsl(205 85% 55% / 0.4)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {Icons.wallet(18, protocolKeySaved ? 'white' : 'hsl(0 0% 28%)')}
              Open My Wallet →
            </button>
          </div>
        ) : (
          <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '20px', padding: '28px' }}>
            <label style={{ display: 'block', color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="satoshi" style={inputStyle} autoFocus />

            <label style={{ display: 'block', color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="satoshi@bitcoin.org" type="email" style={inputStyle} />

            <label style={{ display: 'block', color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Wallet Name (optional)</label>
            <input value={walletName} onChange={e => setWalletName(e.target.value)} placeholder="My Main Wallet" style={inputStyle} />

            <label style={{ display: 'block', color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Link to Vault (optional)</label>
            <select value={linkedVaultId} onChange={e => setLinkedVaultId(e.target.value)} style={{ ...inputStyle, appearance: 'none' as const }}>
              <option value="">No vault linked</option>
              {vaults.map(v => {
                const meta = accountMeta[v.account_type] || { icon: '💳', title: v.account_type }
                return <option key={v.vault_id} value={v.vault_id}>{meta.icon} {meta.title} — {v.vault_id}</option>
              })}
            </select>

            <div style={{ background: 'hsl(205 85% 55% / 0.05)', border: '1px solid hsl(205 85% 55% / 0.15)', borderRadius: '12px', padding: '14px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              {Icons.shield(16, 'hsl(205 85% 55%)')}
              <div>
                <p style={{ color: 'hsl(205 85% 55%)', fontWeight: '600', fontSize: '12px', ...mono, margin: '0 0 4px' }}>Two keys will be generated</p>
                <p style={{ color: 'hsl(0 0% 35%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>
                  <strong style={{ color: 'hsl(0 0% 60%)' }}>Protocol Second Key</strong> — enter when minting or transferring<br />
                  <strong style={{ color: 'hsl(0 0% 60%)' }}>Quantum Signing Key</strong> — signs quantum transactions<br />
                  Both shown once only.
                </p>
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.25)', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
                {Icons.warning(14, 'hsl(0 84% 60%)')}
                <p style={{ color: 'hsl(0 84% 60%)', fontSize: '13px', ...mono, margin: 0 }}>{error}</p>
              </div>
            )}

            <button onClick={createWallet} disabled={loading || !username || !email} style={{ width: '100%', background: username && email && !loading ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : 'hsl(220 10% 12%)', color: username && email && !loading ? 'white' : 'hsl(0 0% 28%)', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: username && email && !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', boxShadow: username && email && !loading ? '0 0 30px hsl(205 85% 55% / 0.35)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {Icons.key(18, username && email && !loading ? 'white' : 'hsl(0 0% 28%)')}
              {loading ? 'Creating...' : 'Create Wallet & Generate Keys'}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  // ── LOOKUP ──
  if (view === 'lookup') return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', fontFamily: 'var(--font-display)', padding: '40px 20px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
          <button onClick={() => { setView('landing'); setError(''); setLookupResult(null); setLookupUsername('') }} style={{ background: 'none', border: 'none', color: 'hsl(0 0% 40%)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>{Icons.back(20, 'hsl(0 0% 40%)')}</button>
          <h1 style={{ color: 'hsl(0 0% 92%)', fontSize: '24px', fontWeight: '700', margin: 0 }}>Find a User</h1>
        </div>

        <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '20px', padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            {Icons.user(14, 'hsl(0 0% 35%)')}
            <label style={{ color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Username or Wallet Address</label>
          </div>
          <input value={lookupUsername} onChange={e => { setLookupUsername(e.target.value); setError(''); setLookupResult(null) }} onKeyDown={e => e.key === 'Enter' && lookupUser()} placeholder="@username" style={inputStyle} autoFocus />

          {error && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.25)', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
              {Icons.warning(14, 'hsl(0 84% 60%)')}
              <p style={{ color: 'hsl(0 84% 60%)', fontSize: '13px', ...mono, margin: 0 }}>{error}</p>
            </div>
          )}

          <button onClick={lookupUser} disabled={loading || !lookupUsername} style={{ width: '100%', background: lookupUsername && !loading ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : 'hsl(220 10% 12%)', color: lookupUsername && !loading ? 'white' : 'hsl(0 0% 28%)', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: lookupUsername && !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {Icons.user(16, lookupUsername && !loading ? 'white' : 'hsl(0 0% 28%)')}
            {loading ? 'Searching...' : 'Find User'}
          </button>
        </div>

        {lookupResult && (
          <div style={{ marginTop: '16px', background: 'hsl(220 12% 8%)', border: '1px solid hsl(142 76% 36% / 0.3)', borderRadius: '16px', padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'hsl(205 85% 55% / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {Icons.user(24, 'hsl(205 85% 55%)')}
              </div>
              <div>
                <p style={{ color: 'hsl(0 0% 92%)', fontWeight: '700', fontSize: '16px', margin: '0 0 3px' }}>@{lookupResult.username}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {Icons.check(12, 'hsl(142 76% 36%)')}
                  <p style={{ color: 'hsl(142 76% 36%)', fontSize: '11px', ...mono, margin: 0 }}>User found</p>
                </div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid hsl(220 10% 12%)', paddingTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                {Icons.wallet(13, 'hsl(0 0% 30%)')}
                <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', margin: 0 }}>Wallet Address</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '11px', ...mono, margin: 0, flex: 1, wordBreak: 'break-all' as const }}>{lookupResult.wallet_address}</p>
                <CopyBtn text={lookupResult.wallet_address} id="lookup-addr" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // ── DASHBOARD ──
  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', fontFamily: 'var(--font-display)' }}>

      {/* Manage tokens modal */}
      {showManageTokens && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '20px', padding: '28px', maxWidth: '400px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              {Icons.settings(18, 'hsl(0 0% 60%)')}
              <h3 style={{ color: 'hsl(0 0% 92%)', fontSize: '18px', fontWeight: '700', margin: 0 }}>Manage Tokens</h3>
            </div>
            <p style={{ color: 'hsl(0 0% 38%)', fontSize: '13px', ...mono, margin: '0 0 20px' }}>Toggle tokens to show in your wallet.</p>
            {[
              { key: 'ubtc', icon: Icons.bitcoin(18, 'hsl(38 92% 50%)'), name: 'UBTC', sub: 'Bitcoin-backed · Always enabled', color: 'hsl(38 92% 50%)', locked: true },
              { key: 'uusdt', icon: Icons.lock(18, 'hsl(142 76% 36%)'), name: 'UUSDT', sub: '1:1 USDT · Bitcoin-native', color: 'hsl(142 76% 36%)', locked: false },
              { key: 'uusdc', icon: Icons.lock(18, 'hsl(220 85% 60%)'), name: 'UUSDC', sub: '1:1 USDC · Bitcoin-native', color: 'hsl(220 85% 60%)', locked: false },
            ].map(t => (
              <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderBottom: '1px solid hsl(220 10% 12%)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: t.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{t.icon}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'hsl(0 0% 88%)', fontWeight: '600', fontSize: '14px', margin: '0 0 2px' }}>{t.name}</p>
                  <p style={{ color: 'hsl(0 0% 32%)', fontSize: '11px', ...mono, margin: 0 }}>{t.sub}</p>
                </div>
                <div onClick={() => !t.locked && setTokens(prev => ({ ...prev, [t.key]: !prev[t.key as keyof typeof prev] }))} style={{ width: '44px', height: '26px', borderRadius: '13px', background: tokens[t.key as keyof typeof tokens] ? t.color : 'hsl(220 12% 14%)', cursor: t.locked ? 'default' : 'pointer', position: 'relative' as const, transition: 'all 0.2s', flexShrink: 0 }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute' as const, top: '3px', left: tokens[t.key as keyof typeof tokens] ? '21px' : '3px', transition: 'left 0.2s' }} />
                </div>
              </div>
            ))}
            <button onClick={() => setShowManageTokens(false)} style={{ width: '100%', background: 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))', color: 'white', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-display)', marginTop: '20px' }}>Done</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: 'hsl(220 15% 5%)', borderBottom: '1px solid hsl(220 10% 10%)', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <a href="/dashboard" style={{ color: 'hsl(0 0% 38%)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', ...mono }}>
          {Icons.back(16, 'hsl(0 0% 38%)')} Accounts
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {Icons.wallet(18, 'hsl(0 0% 50%)')}
          <span style={{ color: 'hsl(0 0% 55%)', fontWeight: '700', fontSize: '15px' }}>UBTC Wallet</span>
        </div>
        <button onClick={() => loadWallet(walletData?.wallet_address || walletAddress)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'hsl(0 0% 28%)' }}>
          {Icons.refresh(18, 'hsl(0 0% 28%)')}
        </button>
      </div>

      {/* Balance hero */}
      <div style={{ background: 'hsl(220 15% 4%)', padding: '40px 24px 32px', textAlign: 'center' as const, borderBottom: '1px solid hsl(220 10% 9%)' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'hsl(205 85% 55% / 0.1)', border: '2px solid hsl(205 85% 55% / 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          {Icons.wallet(28, 'hsl(205 85% 55%)')}
        </div>
        <p style={{ color: 'hsl(0 0% 38%)', fontSize: '12px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>@{walletData?.username}</p>
        <p style={{ color: 'hsl(0 0% 92%)', fontSize: '44px', fontWeight: '700', ...mono, margin: '0 0 4px', lineHeight: '1' }}>
          ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p style={{ color: 'hsl(0 0% 28%)', fontSize: '12px', ...mono, margin: '0 0 24px' }}>UBTC Balance</p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', maxWidth: '320px', margin: '0 auto' }}>
          {[
            { label: 'Send', icon: Icons.send(18, 'hsl(0 0% 55%)'), href: '/transfer' },
            { label: 'Receive', icon: Icons.receive(18, 'hsl(0 0% 55%)'), action: () => copy(walletData?.wallet_address || '', 'recv') },
            { label: 'Tokens', icon: Icons.settings(18, 'hsl(0 0% 55%)'), action: () => setShowManageTokens(true) },
          ].map(btn => (
            btn.href
              ? <a key={btn.label} href={btn.href} style={{ flex: 1, background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 10% 15%)', borderRadius: '14px', padding: '14px 8px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                  {btn.icon}
                  <span style={{ color: 'hsl(0 0% 48%)', fontSize: '12px', fontWeight: '600', ...mono }}>{btn.label}</span>
                </a>
              : <button key={btn.label} onClick={btn.action} style={{ flex: 1, background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 10% 15%)', borderRadius: '14px', padding: '14px 8px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '6px', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
                  {btn.icon}
                  <span style={{ color: 'hsl(0 0% 48%)', fontSize: '12px', fontWeight: '600', ...mono }}>{btn.label}</span>
                </button>
          ))}
        </div>
        {copied === 'recv' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
            {Icons.check(13, 'hsl(142 76% 36%)')}
            <p style={{ color: 'hsl(142 76% 36%)', fontSize: '12px', ...mono, margin: 0 }}>Address copied</p>
          </div>
        )}
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px' }}>

        {/* Assets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
          {Icons.chart(14, 'hsl(0 0% 28%)')}
          <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Assets</p>
        </div>

        {[
          { show: true, icon: Icons.bitcoin(20, 'hsl(38 92% 50%)'), name: 'UBTC', sub: 'Bitcoin-backed', color: 'hsl(38 92% 50%)', bal: '$' + balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), unit: 'UBTC' },
          { show: tokens.uusdt, icon: Icons.lock(20, 'hsl(142 76% 36%)'), name: 'UUSDT', sub: '1:1 USDT · Bitcoin-native', color: 'hsl(142 76% 36%)', bal: '$0.00', unit: 'UUSDT' },
          { show: tokens.uusdc, icon: Icons.lock(20, 'hsl(220 85% 60%)'), name: 'UUSDC', sub: '1:1 USDC · Bitcoin-native', color: 'hsl(220 85% 60%)', bal: '$0.00', unit: 'UUSDC' },
        ].filter(t => t.show).map(t => (
          <div key={t.name} style={{ background: 'hsl(220 12% 8%)', border: `1px solid ${t.color}1a`, borderRadius: '14px', padding: '16px 18px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: t.color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{t.icon}</div>
            <div style={{ flex: 1 }}>
              <p style={{ color: 'hsl(0 0% 88%)', fontWeight: '600', fontSize: '14px', margin: '0 0 2px' }}>{t.name}</p>
              <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, margin: 0 }}>{t.sub}</p>
            </div>
            <div style={{ textAlign: 'right' as const }}>
              <p style={{ color: t.color, fontWeight: '700', fontSize: '18px', ...mono, margin: '0 0 1px' }}>{t.bal}</p>
              <p style={{ color: 'hsl(0 0% 24%)', fontSize: '10px', ...mono, margin: 0 }}>{t.unit}</p>
            </div>
          </div>
        ))}

        {/* Wallet address */}
        {walletData && (
          <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 12%)', borderRadius: '14px', padding: '16px', margin: '16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              {Icons.wallet(13, 'hsl(0 0% 28%)')}
              <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Wallet Address</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <p style={{ color: 'hsl(205 85% 55%)', fontSize: '11px', ...mono, margin: 0, flex: 1, wordBreak: 'break-all' as const }}>{walletData.wallet_address}</p>
              <CopyBtn text={walletData.wallet_address} id="wal-addr" />
            </div>
          </div>
        )}

        {/* Transactions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', margin: '16px 0 10px' }}>
          {Icons.chart(14, 'hsl(0 0% 28%)')}
          <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Transactions</p>
        </div>

        {walletTxs.length === 0 ? (
          <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 12%)', borderRadius: '14px', padding: '40px', textAlign: 'center' as const }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', opacity: 0.2 }}>{Icons.chart(36, 'hsl(0 0% 50%)')}</div>
            <p style={{ color: 'hsl(0 0% 25%)', fontSize: '13px', ...mono, margin: 0 }}>No transactions yet</p>
          </div>
        ) : walletTxs.map((tx: any, i: number) => {
          const isIn = tx.is_incoming
          const color = isIn ? 'hsl(142 76% 36%)' : 'hsl(0 84% 60%)'
          return (
            <div key={tx.id} style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 11%)', borderRadius: '12px', padding: '14px 16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {isIn ? Icons.receive(16, color) : Icons.send(16, color)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: 'hsl(0 0% 82%)', fontWeight: '600', fontSize: '13px', margin: '0 0 2px' }}>{tx.description}</p>
                <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, margin: 0 }}>{new Date(tx.created_at).toLocaleString()}</p>
              </div>
              <p style={{ color, fontWeight: '700', fontSize: '14px', ...mono, margin: 0 }}>
                {isIn ? '+' : '-'}{tx.amount} UBTC
              </p>
            </div>
          )
        })}

        {/* Sign out */}
        <button onClick={() => { localStorage.removeItem('ubtc_wallet_address'); setWalletData(null); setView('landing') }} style={{ width: '100%', background: 'none', border: '1px solid hsl(220 10% 12%)', color: 'hsl(0 0% 22%)', borderRadius: '12px', padding: '12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-mono)', marginTop: '16px' }}>
          Sign out of wallet
        </button>
      </div>
    </div>
  )
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(0 0% 28%)', fontFamily: 'var(--font-mono)' }}>Loading...</div>}>
      <WalletContent />
    </Suspense>
  )
}
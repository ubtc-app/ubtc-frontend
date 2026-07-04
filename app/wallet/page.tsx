'use client'

import { useState, useEffect, Suspense } from 'react'
import { API_URL, supabase } from '../lib/supabase'
import { QuantumLoader } from '../components/QuantumLoader'
import { Icons } from '../components/Icons'
import { isInTelegram } from '../lib/telegram'

const isInstitutional = () =>
  typeof window !== 'undefined' &&
  (localStorage.getItem('qufi_theme') === 'light' || localStorage.getItem('qufi_user_type') === 'institutional')

function WalletContent() {
  const [view, setView] = useState<'landing' | 'loading' | 'create' | 'lookup' | 'dashboard'>('landing')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [walletName, setWalletName] = useState('')
  const [linkedVaultId, setLinkedVaultId] = useState('')
  const [lookupUsername, setLookupUsername] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [walletData, setWalletData] = useState<any>(null)
  const [walletTxs, setWalletTxs] = useState<any[]>([])
  const [vaults, setVaults] = useState<any[]>([])
  const [tokens, setTokens] = useState({ ubtc: true, uusdt: true, uusdc: true })
  const [showManageTokens, setShowManageTokens] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createResult, setCreateResult] = useState<any>(null)
  const [lookupResult, setLookupResult] = useState<any>(null)
  const [copied, setCopied] = useState('')
  const [protocolKeySaved, setProtocolKeySaved] = useState(false)
  const [pendingProofs, setPendingProofs] = useState<any[]>([])
  const [proofModal, setProofModal] = useState<{ type: 'warning' | 'success' | null, proof?: any }>({ type: null })

  const mono: any = { fontFamily: 'var(--font-mono)' }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlAddress = params.get('address')
    const addr = urlAddress || localStorage.getItem('ubtc_wallet_address') || ''
    if (urlAddress) {
      setWalletAddress(urlAddress)
      localStorage.setItem('ubtc_wallet_address', urlAddress)
      setView('dashboard')   // skip landing immediately — data fills in async
      loadWallet(urlAddress)
    } else if (addr) {
      setWalletAddress(addr)
      setView('dashboard')   // skip landing immediately — data fills in async
      loadWallet(addr)
    }
    loadVaults()

    if (addr) {
      const walletSub = supabase
        .channel('wallet-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ubtc_wallets' }, () => loadWallet(addr))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ubtc_proofs' }, () => loadWallet(addr))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions' }, () => loadWallet(addr))
        .subscribe()
      return () => { supabase.removeChannel(walletSub) }
    }
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
      const res = await fetch(`${API_URL}/wallet/${addr}`)
      const wData = res.ok ? await res.json() : null
      // Always go to dashboard if we have a stored address — never drop back to landing
      if (wData) setWalletData(wData)
      setView('dashboard')
      try {
        const txRes = await fetch(`${API_URL}/wallet/${addr}/transactions`)
        if (txRes.ok) { const txData = await txRes.json(); setWalletTxs(txData.transactions || []) }
      } catch {}
      try {
        const proofRes = await fetch(`${API_URL}/proofs/${addr}`)
        if (proofRes.ok) { const proofData = await proofRes.json(); setPendingProofs(proofData.proofs || []) }
      } catch {}
    } catch (e) { console.error(e) }
  }

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(''), 2000)
  }

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button onClick={() => copy(text, id)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: copied === id ? 'var(--t-green-bg)' : 'var(--t-surface2)', border: `1px solid ${copied === id ? 'hsl(142 76% 36% / 0.4)' : 'var(--t-border)'}`, color: copied === id ? 'var(--t-green)' : 'var(--t-muted)', borderRadius: '7px', padding: '6px 12px', fontSize: '11px', cursor: 'pointer', ...mono, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
      {copied === id ? Icons.check(13, 'var(--t-green)') : Icons.copy(13, 'var(--t-muted)')}
      {copied === id ? 'Copied' : 'Copy'}
    </button>
  )

  const downloadProof = async (proof: any) => {
    try {
      const res = await fetch(`${API_URL}/proofs/${proof.proof_id}/download`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { alert('Error: ' + data.error); return }
      const blob = new Blob([JSON.stringify(data.proof, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${proof.proof_id}.ubtc`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    // Mark as downloaded locally so the UI badge updates immediately
      setPendingProofs(prev => prev.map((p: any) => p.proof_id === proof.proof_id ? { ...p, downloaded: true, downloaded_at: new Date().toISOString() } : p))
      setProofModal({ type: 'success', proof })
    } catch (e: any) { alert('Download failed: ' + e.message) }
  }

  const createWallet = async () => {
    if (!username || !email) return
    setLoading(true); setError('')
    try {
      // Step 1 — generate all keys client-side, never touch server
      const { createWallet: generateWallet, persistWallet } = await import('../lib/wallet/wallet')
      const wallet = await generateWallet()

      // Step 2 — send ONLY public keys to server (no secrets, ever)
      const res = await fetch(`${API_URL}/wallet/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          wallet_name: walletName || 'My Wallet',
          linked_vault_id: linkedVaultId,
          kyber_pk: wallet.publicKeys.kyber,
          dilithium_pk: wallet.publicKeys.dilithium,
          sphincs_pk: wallet.publicKeys.sphincs,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Step 3 — persist encrypted wallet locally (no secrets on server)
      await persistWallet(wallet)
      localStorage.setItem('ubtc_wallet_address', data.wallet_address)

      // Step 4 — show mnemonic to user (only time it's ever shown)
      setCreateResult({ ...data, mnemonic: wallet.mnemonic })

      // NO sessionStorage of private keys — they live encrypted in IndexedDB
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

  const inputStyle: any = { display: 'block', width: '100%', padding: '13px 16px', background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: '12px', color: 'var(--t-text)', fontSize: '14px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '12px' }

  const accountMeta: Record<string, { icon: string; title: string }> = {
    current: { icon: '💳', title: 'Current Account' }, savings: { icon: '🔐', title: 'Savings Account' },
    yield: { icon: '₿', title: 'Yield Account' }, custody_yield: { icon: '📊', title: 'Custody Yield' },
    prime: { icon: '💎', title: 'Prime Account' }, managed_yield: { icon: '🏦', title: 'Managed Yield' },
  }

  const balance = parseFloat(walletData?.balance || '0')
  const uusdtBalance = parseFloat(walletData?.uusdt_balance || '0')
  const uusdcBalance = parseFloat(walletData?.uusdc_balance || '0')
  const inst = isInstitutional()

  // ── LOADING (auto-fetching wallet) ──
  if (view === 'loading') return (
    <div style={{ minHeight: '100vh', background: inst ? '#f5f7fa' : 'var(--q-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid rgba(0,212,255,0.15)', borderTopColor: 'var(--q-electric)', animation: 'wlb-spin .85s linear infinite' }} />
      <p style={{ color: 'var(--q-text-3)', fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Opening Wallet…</p>
      <style>{`@keyframes wlb-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // ── LANDING ──
  if (view === 'landing') return (
    <div style={{ minHeight: '100vh', background: inst ? '#f5f7fa' : 'var(--q-bg)', fontFamily: 'var(--font-display)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '40px 20px', position: 'relative', overflow: 'hidden' }}>
      {/* Quantum ambient */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div className="q-glow-node" style={{ top: '15%', left: '10%', width: 500, height: 500, background: 'rgba(0,212,255,0.04)' }} />
        <div className="q-glow-node" style={{ bottom: '10%', right: '8%', width: 450, height: 450, background: 'rgba(124,58,255,0.05)' }} />
        <div className="q-circuit-grid" style={{ position: 'absolute', inset: 0, opacity: 0.35 }} />
      </div>
      <div className="warp-in" style={{ maxWidth: '420px', width: '100%', textAlign: 'center' as const, position: 'relative', zIndex: 1 }}>
        {/* Icon */}
        <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: '0 0 40px rgba(0,212,255,0.12), inset 0 1px 0 rgba(255,255,255,0.08)', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: '1px solid rgba(0,212,255,0.12)', animation: 'vortex-cw 8s linear infinite' }} />
          <img src="/ubtcqwallet-logo.png" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
        </div>
        <p style={{ color: 'var(--q-electric)', fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: '0.32em', textTransform: 'uppercase' as const, marginBottom: '14px', opacity: 0.7 }}>QAP · QUANTUM WALLET</p>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '32px', fontWeight: 800, letterSpacing: '0.03em', textTransform: 'uppercase' as const, margin: '0 0 12px', background: 'linear-gradient(135deg, var(--q-text) 0%, var(--q-electric) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>UBTC Wallet</h1>
        <p style={{ color: 'var(--q-text-3)', fontSize: '13px', ...mono, margin: '0 0 36px', lineHeight: '1.8' }}>Send and receive UBTC, UUSDT and UUSDC instantly.</p>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
          <button onClick={() => setView('create')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg, var(--q-electric), var(--q-cyan))', color: '#000', border: 'none', borderRadius: '14px', padding: '16px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: 'var(--font-syne)', letterSpacing: '0.05em', boxShadow: '0 0 30px rgba(0,212,255,0.25)' }}>
            {Icons.plus(16, '#000')} CREATE NEW WALLET
          </button>
          <button onClick={() => setView('lookup')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--q-surface)', border: '1px solid var(--q-border)', color: 'var(--q-text-2)', borderRadius: '14px', padding: '16px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', backdropFilter: 'blur(20px)' }}>
            {Icons.user(16, 'var(--q-text-2)')} Find a User
          </button>
          {walletAddress && (
            <button onClick={() => loadWallet(walletAddress)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--q-electric-dim)', border: '1px solid rgba(0,212,255,0.3)', color: 'var(--q-electric)', borderRadius: '14px', padding: '16px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
              {Icons.wallet(16, 'var(--q-electric)')} Open My Wallet
            </button>
          )}
          <a href="/dashboard" style={{ color: 'var(--q-text-3)', fontSize: '12px', ...mono, textDecoration: 'none', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', letterSpacing: '0.12em' }}>
            {Icons.back(13, 'var(--q-text-3)')} Back to Accounts
          </a>
        </div>
      </div>
    </div>
  )

  // ── CREATE ──
  if (view === 'create') return (
    <div style={{ minHeight: '100vh', background: inst ? '#f5f7fa' : 'var(--q-bg)', fontFamily: 'var(--font-display)', padding: '40px 20px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
          <button onClick={() => setView('landing')} style={{ background: 'none', border: 'none', color: 'var(--t-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>{Icons.back(20, 'var(--t-muted)')}</button>
          <h1 style={{ color: 'var(--t-text)', fontSize: '24px', fontWeight: '700', margin: 0 }}>Create Wallet</h1>
        </div>
        {createResult ? (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>
            <div style={{ textAlign: 'center' as const, marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>{Icons.key(52, 'var(--t-accent)')}</div>
              <h2 style={{ color: 'var(--t-text)', fontSize: '24px', fontWeight: '700', margin: '0 0 6px' }}>Save Your Recovery Phrase</h2>
              <p style={{ color: 'var(--t-faint)', fontSize: '14px', ...mono, margin: 0 }}>@{createResult.username} · Wallet created</p>
            </div>
            {createResult.mnemonic && (
              <div style={{ background: 'var(--t-surface)', border: '1px solid hsl(38 92% 50% / 0.5)', borderRadius: '12px', padding: '20px' }}>
                <p style={{ color: 'var(--t-orange)', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase' as const, letterSpacing: '0.2em', margin: '0 0 16px', fontWeight: 700 }}>⚠️ Your 24-Word Recovery Phrase</p>
                <p style={{ color: 'var(--t-muted)', fontSize: '12px', fontFamily: 'monospace', margin: '0 0 16px', lineHeight: '1.6' }}>These 24 words are the ONLY way to recover your wallet and the ONLY way to authorise spending. Never share them. Never store them digitally. Write them on paper and store safely offline.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                  {createResult.mnemonic.split(' ').map((word: string, i: number) => (
                    <div key={i} style={{ background: 'var(--t-surface2)', border: '1px solid var(--t-border)', borderRadius: '8px', padding: '8px 10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ color: 'var(--t-faint)', fontSize: '10px', fontFamily: 'monospace', minWidth: '20px' }}>{i + 1}.</span>
                      <span style={{ color: 'var(--t-text)', fontSize: '13px', fontFamily: 'monospace', fontWeight: 600 }}>{word}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => {
                  navigator.clipboard.writeText(createResult.mnemonic)
                }} style={{ background: 'var(--t-surface2)', color: 'var(--t-muted)', border: '1px solid var(--t-border)', borderRadius: '8px', padding: '10px 16px', fontSize: '12px', fontFamily: 'monospace', cursor: 'pointer', width: '100%' }}>
                  Copy to clipboard (paste into secure password manager)
                </button>
              </div>
            )}
            <div onClick={() => setProtocolKeySaved(!protocolKeySaved)} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'var(--t-surface)', border: `1px solid ${protocolKeySaved ? 'hsl(142 76% 36% / 0.4)' : 'var(--t-border)'}`, borderRadius: '12px', padding: '14px', cursor: 'pointer' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${protocolKeySaved ? 'var(--t-green)' : 'var(--t-border)'}`, background: protocolKeySaved ? 'var(--t-green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {protocolKeySaved && Icons.check(13, 'white')}
              </div>
              <p style={{ color: 'var(--t-muted)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.6' }}>I have written down my 24-word recovery phrase and stored it safely offline.</p>
            </div>
            <button onClick={() => { if (protocolKeySaved) { setWalletData(createResult); setWalletAddress(createResult.wallet_address); setView('dashboard'); loadWallet(createResult.wallet_address) } }} disabled={!protocolKeySaved} style={{ background: protocolKeySaved ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : 'var(--t-border)', color: protocolKeySaved ? 'white' : 'var(--t-faint)', border: 'none', borderRadius: '14px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: protocolKeySaved ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', boxShadow: protocolKeySaved ? '0 0 30px hsl(205 85% 55% / 0.4)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {Icons.wallet(18, protocolKeySaved ? 'white' : 'var(--t-faint)')} Open My Wallet →
            </button>
          </div>
        ) : (
          <div style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: '20px', padding: '28px' }}>
            <label style={{ display: 'block', color: 'var(--t-faint)', fontSize: '11px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: '8px' }}>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="satoshi" style={inputStyle} autoFocus />
            <label style={{ display: 'block', color: 'var(--t-faint)', fontSize: '11px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: '8px' }}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="satoshi@bitcoin.org" type="email" style={inputStyle} />
            <label style={{ display: 'block', color: 'var(--t-faint)', fontSize: '11px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: '8px' }}>Wallet Name (optional)</label>
            <input value={walletName} onChange={e => setWalletName(e.target.value)} placeholder="My Main Wallet" style={inputStyle} />
            <label style={{ display: 'block', color: 'var(--t-faint)', fontSize: '11px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: '8px' }}>Link to Vault (optional)</label>
            <select value={linkedVaultId} onChange={e => setLinkedVaultId(e.target.value)} style={{ ...inputStyle, appearance: 'none' as const }}>
              <option value="">No vault linked</option>
              {vaults.map(v => { const meta = accountMeta[v.account_type] || { icon: '💳', title: v.account_type }; return <option key={v.vault_id} value={v.vault_id}>{meta.icon} {meta.title} — {v.vault_id}</option> })}
            </select>
            {error && <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--t-red-bg)', border: '1px solid hsl(0 84% 60% / 0.25)', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>{Icons.warning(14, 'var(--t-red)')}<p style={{ color: 'var(--t-red)', fontSize: '13px', ...mono, margin: 0 }}>{error}</p></div>}
            <button onClick={createWallet} disabled={loading || !username || !email} style={{ width: '100%', background: username && email && !loading ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : 'var(--t-border)', color: username && email && !loading ? 'white' : 'var(--t-faint)', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: username && email && !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {Icons.key(18, username && email && !loading ? 'white' : 'var(--t-faint)')}
              {loading ? 'Creating...' : 'Create Wallet & Generate Keys'}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  // ── LOOKUP ──
  if (view === 'lookup') return (
    <div style={{ minHeight: '100vh', background: inst ? '#f5f7fa' : 'var(--q-bg)', fontFamily: 'var(--font-display)', padding: '40px 20px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
          <button onClick={() => { setView('landing'); setError(''); setLookupResult(null); setLookupUsername('') }} style={{ background: 'none', border: 'none', color: 'var(--t-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>{Icons.back(20, 'var(--t-muted)')}</button>
          <h1 style={{ color: 'var(--t-text)', fontSize: '24px', fontWeight: '700', margin: 0 }}>Find a User</h1>
        </div>
        <div style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: '20px', padding: '28px' }}>
          <input value={lookupUsername} onChange={e => { setLookupUsername(e.target.value); setError(''); setLookupResult(null) }} onKeyDown={e => e.key === 'Enter' && lookupUser()} placeholder="@username or wallet address" style={inputStyle} autoFocus />
          {error && <p style={{ color: 'var(--t-red)', fontSize: '13px', ...mono, marginBottom: '12px' }}>{error}</p>}
          <button onClick={lookupUser} disabled={loading || !lookupUsername} style={{ width: '100%', background: lookupUsername && !loading ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : 'var(--t-border)', color: lookupUsername && !loading ? 'white' : 'var(--t-faint)', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: lookupUsername && !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)' }}>
            {loading ? 'Searching...' : 'Find User'}
          </button>
        </div>
        {lookupResult && (
          <div style={{ marginTop: '16px', background: 'var(--t-surface)', border: '1px solid hsl(142 76% 36% / 0.3)', borderRadius: '16px', padding: '22px' }}>
            <p style={{ color: 'var(--t-text)', fontWeight: '700', fontSize: '16px', margin: '0 0 8px' }}>@{lookupResult.username}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <p style={{ color: 'var(--t-muted)', fontSize: '11px', ...mono, margin: 0, flex: 1, wordBreak: 'break-all' as const }}>{lookupResult.wallet_address}</p>
              <CopyBtn text={lookupResult.wallet_address} id="lookup-addr" />
            </div>
            <button onClick={() => { setWalletAddress(lookupResult.wallet_address); localStorage.setItem('ubtc_wallet_address', lookupResult.wallet_address); loadWallet(lookupResult.wallet_address) }} style={{ width: '100%', background: 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))', color: 'white', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>Open Wallet →</button>
          </div>
        )}
      </div>
    </div>
  )

  // ── DASHBOARD ──
  return (
    <div style={{ minHeight: '100vh', background: inst ? '#f5f7fa' : 'var(--q-bg)', fontFamily: 'var(--font-display)' }}>

      {/* Proof download modal */}
      {proofModal.type && (
        <div style={{ position: 'fixed', inset: 0, background: inst ? 'rgba(245,247,250,0.97)' : 'var(--q-bg)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'var(--t-surface)', borderRadius: '24px', padding: '40px', maxWidth: '480px', width: '100%', border: `2px solid ${proofModal.type === 'success' ? 'hsl(142 76% 36% / 0.4)' : 'hsl(38 92% 50% / 0.4)'}` }}>
            {proofModal.type === 'warning' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'hsl(38 92% 50% / 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>⚠️</div>
                  <div>
                    <h2 style={{ color: 'var(--t-text)', fontSize: '20px', fontWeight: '700', margin: '0 0 2px' }}>Read Before Downloading</h2>
                    <p style={{ color: 'var(--t-orange)', fontSize: '12px', ...mono, margin: 0 }}>Bearer Instrument Warning</p>
                  </div>
                </div>
                <div style={{ background: 'var(--t-surface)', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
                  <p style={{ color: 'hsl(0 0% 75%)', fontSize: '13px', ...mono, margin: '0 0 16px', lineHeight: '1.7' }}>This proof file is <strong style={{ color: 'var(--t-orange)' }}>digital cash</strong>. Anyone with both of these can redeem your Bitcoin:</p>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px', marginBottom: '16px' }}>
                    {[{ icon: '📄', label: 'This .ubtc proof file' }, { icon: '🔑', label: 'Your 24-word recovery phrase' }].map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--t-red-bg)', border: '1px solid hsl(0 84% 60% / 0.2)', borderRadius: '8px', padding: '12px 14px' }}>
                        <span style={{ fontSize: '18px' }}>{item.icon}</span>
                        <p style={{ color: 'hsl(0 0% 82%)', fontSize: '13px', ...mono, margin: 0, fontWeight: 600 }}>{item.label}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: '1px solid var(--t-border-subtle)', paddingTop: '14px', display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
                    {['Store proof file and recovery phrase in separate secure locations', 'Never store them together on the same device', 'Never send them in the same email or message', 'Treat this file like physical cash'].map((rule, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ color: 'var(--t-orange)', fontSize: '12px', marginTop: '1px', flexShrink: 0 }}>→</span>
                        <p style={{ color: 'var(--t-muted)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.5' }}>{rule}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setProofModal({ type: null })} style={{ background: 'none', border: '1px solid var(--t-border)', color: 'var(--t-muted)', borderRadius: '12px', padding: '14px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>Cancel</button>
                  <button onClick={() => downloadProof(proofModal.proof)} style={{ flex: 1, background: 'var(--t-orange)', color: '#000', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>I Understand — Download</button>
                </div>
              </>
            )}
            {proofModal.type === 'success' && (
              <>
                <div style={{ textAlign: 'center' as const, marginBottom: '24px' }}>
                  <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--t-green-bg)', border: '2px solid hsl(142 76% 36% / 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '32px' }}>✅</div>
                  <h2 style={{ color: 'var(--t-text)', fontSize: '22px', fontWeight: '700', margin: '0 0 6px' }}>Proof File Downloaded</h2>
                  <p style={{ color: 'var(--t-green)', fontSize: '13px', ...mono, margin: 0 }}>{proofModal.proof?.proof_data?.ownership?.ubtc_amount || '?'} UBTC bearer instrument</p>
                </div>
                <div style={{ background: 'var(--t-surface)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                  <p style={{ color: 'var(--t-muted)', fontSize: '12px', ...mono, margin: '0 0 14px', lineHeight: '1.7' }}>Server copy marked for deletion. Store your proof file now:</p>
                  {[
                    { icon: '💾', text: 'Save the .ubtc file to a USB drive or secure offline storage' },
                    { icon: '🔑', text: 'Store recovery phrase separately — different device or location' },
                    { icon: '🔴', text: 'Never put both on the same cloud storage or device' },
                    { icon: '₿', text: 'To redeem: tap Redeem in your wallet and upload your proof file + enter recovery phrase' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
                      <p style={{ color: 'hsl(0 0% 70%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.5' }}>{item.text}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setProofModal({ type: null })} style={{ flex: 1, background: 'none', border: '1px solid var(--t-border)', color: 'var(--t-muted)', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>Done</button>
                  <a href="/redeem/proof" style={{ flex: 1, background: 'linear-gradient(135deg, hsl(38,92%,50%), hsl(32,90%,45%))', color: '#000', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-display)', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Redeem Now →</a>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Manage Tokens Modal */}
      {showManageTokens && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: '20px', padding: '28px', maxWidth: '400px', width: '100%' }}>
            <h3 style={{ color: 'var(--t-text)', fontSize: '18px', fontWeight: '700', margin: '0 0 20px' }}>Manage Tokens</h3>
            {[
              { key: 'ubtc', name: 'UBTC', sub: 'Bitcoin-backed · Always enabled', color: 'var(--t-orange)', locked: true },
              { key: 'uusdt', name: 'UUSDT', sub: '1:1 USDT · Bitcoin-native', color: 'var(--t-green)', locked: false },
              { key: 'uusdc', name: 'UUSDC', sub: '1:1 USDC · Bitcoin-native', color: 'var(--t-accent)', locked: false },
            ].map(t => (
              <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderBottom: '1px solid var(--t-border-subtle)' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'var(--t-text)', fontWeight: '600', fontSize: '14px', margin: '0 0 2px' }}>{t.name}</p>
                  <p style={{ color: 'var(--t-faint)', fontSize: '11px', ...mono, margin: 0 }}>{t.sub}</p>
                </div>
                <div onClick={() => !t.locked && setTokens(prev => ({ ...prev, [t.key]: !prev[t.key as keyof typeof prev] }))} style={{ width: '44px', height: '26px', borderRadius: '13px', background: tokens[t.key as keyof typeof tokens] ? t.color : 'var(--t-surface3)', cursor: t.locked ? 'default' : 'pointer', position: 'relative' as const, transition: 'all 0.2s', flexShrink: 0 }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute' as const, top: '3px', left: tokens[t.key as keyof typeof tokens] ? '21px' : '3px', transition: 'left 0.2s' }} />
                </div>
              </div>
            ))}
            <button onClick={() => setShowManageTokens(false)} style={{ width: '100%', background: 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))', color: 'white', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-display)', marginTop: '20px' }}>Done</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes w-pulse { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
        @keyframes w-scan  { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes w-in    { from{opacity:0;transform:translateY(16px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes w-shimmer { 0%{left:-100%} 100%{left:200%} }
        .w-in  { animation: w-in .45s cubic-bezier(.22,1,.36,1) both }
        .w-card-3d {
          transition: transform .12s ease, box-shadow .2s ease;
          transform-style: preserve-3d;
          will-change: transform;
        }
        .w-card-3d:hover { box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 40px rgba(0,212,255,0.12) !important }
        .w-action-btn {
          transition: transform .15s ease, box-shadow .15s ease;
          transform-style: preserve-3d;
          will-change: transform;
          cursor: pointer;
        }
        .w-action-btn:hover { transform: translateY(-4px) scale(1.04); box-shadow: 0 16px 40px rgba(0,0,0,0.5) !important }
        .w-tx-row { transition: background .15s }
        .w-tx-row:hover { background: rgba(0,212,255,0.05) !important }
        .w-shimmer { position:relative; overflow:hidden }
        .w-shimmer::after { content:''; position:absolute; top:0; left:-100%; width:60%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent); animation: w-shimmer 3s ease infinite }
      `}</style>

      {/* Scanline */}
      {!inst && <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(0,212,255,0.08),transparent)', animation: 'w-scan 10s linear infinite' }} />
      </div>}

      {/* Back nav */}
      <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px 0' }}>
        <a href="/dashboard" style={{ color: inst ? '#64748b' : 'rgba(120,160,220,0.5)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {Icons.back(12, inst ? '#64748b' : 'rgba(120,160,220,0.5)')} Accounts
        </a>
        <button onClick={() => loadWallet(walletData?.wallet_address || walletAddress)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: inst ? '#64748b' : 'rgba(120,160,220,0.4)', padding: 4 }}>
          {Icons.refresh(15, inst ? '#64748b' : 'rgba(120,160,220,0.4)')}
        </button>
      </div>

      {/* ── BALANCE HERO ── */}
      <div className="w-in" style={{ textAlign: 'center', padding: '36px 24px 32px', position: 'relative', zIndex: 3 }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-60%)', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <p style={{ color: inst ? '#64748b' : '#00D4FF', fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.35em', margin: '0 0 12px', opacity: inst ? 1 : 0.7 }}>
          {walletData?.username || 'Wallet'}
        </p>
        <p style={{ color: inst?'#0f172a':'#fff', fontSize: 'clamp(48px,9vw,72px)', fontWeight: 800, fontFamily: 'var(--font-mono)', margin: '0 0 6px', lineHeight: 1, letterSpacing: '-0.03em', textShadow: inst?'none':'0 0 60px rgba(0,212,255,0.3), 0 2px 0 rgba(0,0,0,0.5)' }}>
          ${(balance + uusdtBalance + uusdcBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <div style={{ width: 80, height: 1, background: 'linear-gradient(90deg,transparent,#00D4FF,transparent)', margin: '10px auto 10px' }} />
        <p style={{ color: inst ? '#64748b' : 'rgba(120,160,220,0.5)', fontSize: 11, fontFamily: 'var(--font-mono)', margin: 0, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Total Portfolio Value</p>
        {copied === 'recv' && <p style={{ color: '#00FFE0', fontSize: 11, fontFamily: 'var(--font-mono)', margin: '10px 0 0', letterSpacing: '0.1em' }}>Address copied ✓</p>}
      </div>

      {/* ── ACTION BUTTONS ── */}
      <div className="w-in" style={{ display: 'flex', gap: 10, padding: '0 16px 28px', maxWidth: 480, margin: '0 auto', animationDelay: '.06s' }}>
        {([
          { label: 'Send',    icon: Icons.send(22, inst?'#1d4ed8':'#00D4FF'),    href: `/transfer?from_wallet=${walletData?.wallet_address}&ubtc=${balance}&uusdt=${uusdtBalance}&uusdc=${uusdcBalance}`, color: inst?'#1d4ed8':'#00D4FF', bg: inst?'#fff':'linear-gradient(145deg,#001a2e,#002844)', glow: 'rgba(0,212,255,0.35)' },
          { label: 'Receive', icon: Icons.receive(22, inst?'#059669':'#00FFE0'),  action: () => copy(walletData?.wallet_address || '', 'recv'),                                          color: inst?'#059669':'#00FFE0', bg: inst?'#fff':'linear-gradient(145deg,#001a20,#002820)', glow: 'rgba(0,255,224,0.3)'  },
          { label: 'Redeem',  icon: Icons.redeem(22, inst?'#d97706':'#F59E0B'),   href: '/redeem/proof',                                                                                color: inst?'#d97706':'#F59E0B', bg: inst?'#fff':'linear-gradient(145deg,#1a1000,#2a1a00)', glow: 'rgba(245,158,11,0.4)'  },
          { label: 'Tokens',  icon: Icons.settings(22, inst?'#7c3aed':'#A78BFA'), action: () => setShowManageTokens(true),                                                              color: inst?'#7c3aed':'#A78BFA', bg: inst?'#fff':'linear-gradient(145deg,#0e0028,#160040)', glow: 'rgba(167,139,250,0.3)' },
        ] as any[]).map((btn: any) => {
          const inner = (
            <div className="w-action-btn" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '18px 8px 14px', borderRadius: 20, background: btn.bg, border: inst ? `1px solid ${btn.color}40` : `1px solid ${btn.color}30`, boxShadow: inst ? '0 2px 12px rgba(0,0,0,0.08)' : `0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 ${btn.color}20, 0 0 0 0 ${btn.glow}` }}>
              <div style={{ width: 48, height: 48, borderRadius: 15, background: `${btn.color}18`, border: `1px solid ${btn.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: inst ? 'none' : `0 0 20px ${btn.glow}, inset 0 1px 0 ${btn.color}30` }}>
                {btn.icon}
              </div>
              <span style={{ color: inst ? btn.color : '#e0eeff', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.06em' }}>{btn.label}</span>
            </div>
          )
          return btn.href
            ? <a key={btn.label} href={btn.href} style={{ flex: 1, textDecoration: 'none' }}>{inner}</a>
            : <button key={btn.label} onClick={btn.action} style={{ flex: 1, background: 'none', border: 'none', padding: 0 }}>{inner}</button>
        })}
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 48px', position: 'relative', zIndex: 3 }}>

        {/* SECTION LABEL */}
        <p className="w-in" style={{ color: inst ? '#94a3b8' : '#00D4FF', fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.35em', margin: '0 0 10px', opacity: inst ? 1 : 0.5, animationDelay: '.1s' }}>Assets</p>

        {/* ASSET CARDS — individual 3D tilt cards */}
        <div className="w-in" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, animationDelay: '.12s' }}>
          {([
            { show: true,         name: 'UBTC',  sub: 'Bitcoin-backed · Quantum-secured', color: '#F59E0B', bg: inst?'#fff':'linear-gradient(135deg,#1a1000 0%,#0d0800 100%)', bal: balance,       unit: 'UBTC'  },
            { show: tokens.uusdt, name: 'UUSDT', sub: '1:1 USDT · Bitcoin-native',        color: '#22C55E', bg: inst?'#fff':'linear-gradient(135deg,#001a08 0%,#000d04 100%)', bal: uusdtBalance, unit: 'UUSDT' },
            { show: tokens.uusdc, name: 'UUSDC', sub: '1:1 USDC · Bitcoin-native',        color: '#00D4FF', bg: inst?'#fff':'linear-gradient(135deg,#00111a 0%,#000810 100%)', bal: uusdcBalance, unit: 'UUSDC' },
          ] as any[]).filter((t: any) => t.show).map((t: any) => (
            <div key={t.name} className="w-card-3d w-shimmer"
              style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', borderRadius: 18, background: t.bg, border: inst ? `1px solid ${t.color}50` : `1px solid ${t.color}25`, boxShadow: inst ? '0 2px 12px rgba(0,0,0,0.06)' : `0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 ${t.color}15` }}
              onMouseMove={e => {
                const r = e.currentTarget.getBoundingClientRect()
                const x = ((e.clientX - r.left) / r.width  - 0.5) * 16
                const y = ((e.clientY - r.top)  / r.height - 0.5) * -16
                e.currentTarget.style.transform = `perspective(700px) rotateX(${y}deg) rotateY(${x}deg) translateZ(8px)`
              }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) translateZ(0px)'; e.currentTarget.style.transition = 'transform .5s cubic-bezier(.23,1,.32,1), box-shadow .2s' }}
            >
              <div style={{ width: 46, height: 46, borderRadius: 14, background: `${t.color}18`, border: `1px solid ${t.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 20px ${t.color}30, inset 0 1px 0 ${t.color}25` }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: `radial-gradient(circle at 35% 35%, #fff, ${t.color})`, boxShadow: `0 0 12px ${t.color}` }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#fff', fontWeight: 800, fontSize: 16, margin: '0 0 3px', fontFamily: 'var(--font-syne)', letterSpacing: '0.02em' }}>{t.name}</p>
                <p style={{ color: 'rgba(160,200,240,0.45)', fontSize: 11, fontFamily: 'var(--font-mono)', margin: 0 }}>{t.sub}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: t.color, fontWeight: 800, fontSize: 20, fontFamily: 'var(--font-mono)', margin: '0 0 2px', textShadow: `0 0 16px ${t.color}80` }}>
                  ${t.bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p style={{ color: `${t.color}80`, fontSize: 11, fontFamily: 'var(--font-mono)', margin: 0, fontWeight: 600 }}>{t.unit}</p>
              </div>
            </div>
          ))}
        </div>

        {/* WALLET ADDRESS */}
        {walletData && (
          <div className="w-in w-card-3d" style={{ borderRadius: 16, padding: '14px 18px', background: inst?'#fff':'linear-gradient(135deg,#050f20,#020810)', border: inst?'1px solid #e2e8f0':'1px solid rgba(0,212,255,0.12)', boxShadow: inst?'0 2px 12px rgba(0,0,0,0.06)':'0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(0,212,255,0.08)', marginBottom: 16, animationDelay: '.16s' }}
            onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); const x = ((e.clientX-r.left)/r.width-.5)*10; const y = ((e.clientY-r.top)/r.height-.5)*-10; e.currentTarget.style.transform = `perspective(600px) rotateX(${y}deg) rotateY(${x}deg)` }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg)'; e.currentTarget.style.transition = 'transform .4s ease' }}
          >
            <p style={{ color: 'rgba(0,212,255,0.4)', fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.3em', margin: '0 0 8px' }}>Wallet Address</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <p style={{ color: '#00D4FF', fontSize: 11, fontFamily: 'var(--font-mono)', margin: 0, flex: 1, wordBreak: 'break-all', opacity: 0.75 }}>{walletData.wallet_address}</p>
              <CopyBtn text={walletData.wallet_address} id="wal-addr" />
            </div>
          </div>
        )}

        {/* PENDING PROOFS */}
        {pendingProofs.length > 0 && (
          <div className="w-in w-card-3d" style={{ borderRadius: 20, padding: 20, background: inst?'#fffbeb':'linear-gradient(135deg,#1a0e00,#0d0700)', border: '1px solid rgba(245,158,11,0.4)', boxShadow: inst?'0 2px 12px rgba(0,0,0,0.06)':'0 8px 40px rgba(0,0,0,0.5), 0 0 30px rgba(245,158,11,0.12)', marginBottom: 16, animationDelay: '.19s' }}
            onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); const x = ((e.clientX-r.left)/r.width-.5)*12; const y = ((e.clientY-r.top)/r.height-.5)*-12; e.currentTarget.style.transform = `perspective(700px) rotateX(${y}deg) rotateY(${x}deg)` }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg)'; e.currentTarget.style.transition = 'transform .5s ease' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', boxShadow: '0 0 10px #F59E0B', animation: 'w-pulse 2s ease infinite' }} />
              <p style={{ color: '#F59E0B', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0, fontWeight: 700 }}>
                {pendingProofs.length} Proof File{pendingProofs.length > 1 ? 's' : ''} — Action Required
              </p>
            </div>
            <p style={{ color: 'rgba(200,160,100,0.6)', fontSize: 11, fontFamily: 'var(--font-mono)', margin: '0 0 14px', lineHeight: 1.7 }}>
              You have received UBTC. Redeem to Bitcoin or download your proof file.
            </p>
            {pendingProofs.map((proof: any) => {
              const isDownloaded = !!proof.downloaded
              return (
                <div key={proof.proof_id} style={{ background: inst?'rgba(255,255,255,0.7)':'rgba(0,0,0,0.4)', borderRadius: 12, padding: '12px 14px', marginBottom: 8, border: `1px solid ${isDownloaded ? (inst?'#e2e8f0':'rgba(255,255,255,0.06)') : 'rgba(0,212,255,0.2)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <p style={{ color: '#fff', fontSize: 15, fontFamily: 'var(--font-mono)', margin: 0, fontWeight: 700 }}>{proof.proof_data?.ownership?.ubtc_amount || '?'} UBTC</p>
                        <span style={{ background: isDownloaded ? 'rgba(255,255,255,0.06)' : 'rgba(0,212,255,0.15)', color: isDownloaded ? 'rgba(160,180,220,0.4)' : '#00D4FF', fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase' }}>
                          {isDownloaded ? 'Saved' : 'New'}
                        </span>
                      </div>
                      <p style={{ color: 'rgba(160,180,220,0.4)', fontSize: 10, fontFamily: 'var(--font-mono)', margin: 0 }}>{new Date(proof.created_at).toLocaleString()}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {!isInTelegram() && (
                        <button onClick={() => downloadProof(proof)} style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(160,190,240,0.6)', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, cursor: 'pointer' }}>
                          {isDownloaded ? '↻' : '↓'}
                        </button>
                      )}
                      <button onClick={() => window.location.href = `/redeem/proof?proof_id=${proof.proof_id}&vault_id=${proof.sender_vault_id}&amount=${proof.proof_data?.ownership?.ubtc_amount}`} style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, padding: '8px 14px', border: 'none', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 0 16px rgba(34,197,94,0.3)' }}>
                        ⚡ Redeem
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TRANSACTIONS */}
        <p className="w-in" style={{ color: inst ? '#94a3b8' : '#00D4FF', fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.35em', margin: '0 0 10px', opacity: inst ? 1 : 0.5, animationDelay: '.21s' }}>Transactions</p>
        <div className="w-in w-card-3d w-shimmer" style={{ borderRadius: 20, overflow: 'hidden', border: inst?'1px solid #e2e8f0':'1px solid rgba(255,255,255,0.07)', background: inst?'#fff':'linear-gradient(145deg,#050f20,#020810)', boxShadow: inst?'0 2px 12px rgba(0,0,0,0.06)':'0 12px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)', marginBottom: 20, animationDelay: '.23s' }}
          onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); const x = ((e.clientX-r.left)/r.width-.5)*8; const y = ((e.clientY-r.top)/r.height-.5)*-8; e.currentTarget.style.transform = `perspective(800px) rotateX(${y}deg) rotateY(${x}deg)` }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'perspective(800px) rotateX(0) rotateY(0)'; e.currentTarget.style.transition = 'transform .5s ease' }}
        >
          {walletTxs.length === 0 ? (
            <div style={{ padding: '44px 20px', textAlign: 'center' }}>
              <p style={{ color: inst ? '#94a3b8' : 'rgba(120,160,220,0.3)', fontSize: 12, fontFamily: 'var(--font-mono)', margin: 0, letterSpacing: '0.15em' }}>No transactions yet</p>
            </div>
          ) : walletTxs.map((tx: any, i: number) => {
            const isIn = tx.is_incoming
            const color = isIn ? '#22C55E' : '#EF4444'
            return (
              <div key={tx.id} className="w-tx-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: i < walletTxs.length - 1 ? `1px solid ${inst?'#f1f5f9':'rgba(255,255,255,0.04)'}` : 'none' }}>
                <div style={{ width: 40, height: 40, borderRadius: 13, background: `${color}14`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 12px ${color}20` }}>
                  {isIn ? Icons.receive(17, color) : Icons.send(17, color)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: inst ? '#1e293b' : '#e0eeff', fontWeight: 600, fontSize: 13, margin: '0 0 3px', fontFamily: 'var(--font-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</p>
                  <p style={{ color: inst ? '#64748b' : 'rgba(120,160,220,0.4)', fontSize: 10, fontFamily: 'var(--font-mono)', margin: 0 }}>{new Date(tx.created_at).toLocaleString()}</p>
                </div>
                <p style={{ color, fontWeight: 800, fontSize: 15, fontFamily: 'var(--font-mono)', margin: 0, textShadow: `0 0 12px ${color}70`, whiteSpace: 'nowrap' }}>
                  {isIn ? '+' : '−'}{parseFloat(tx.amount).toLocaleString()} <span style={{ fontSize: 10, opacity: 0.6 }}>UBTC</span>
                </p>
              </div>
            )
          })}
        </div>

        {/* DISCONNECT */}
        <button onClick={() => { localStorage.removeItem('ubtc_wallet_address'); setWalletData(null); setView('landing') }}
          style={{ width: '100%', background: 'none', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(120,150,200,0.35)', borderRadius: 12, padding: 12, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', transition: 'border-color .2s, color .2s, background .2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)'; e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.06)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(120,150,200,0.35)'; e.currentTarget.style.background = 'none' }}
        >
          Disconnect Wallet
        </button>
      </div>
    </div>
  )
}

function WalletPageInner() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <QuantumLoader />
  return <WalletContent />
}

export default function WalletPage() {
  return (
    <Suspense fallback={<QuantumLoader />}>
      <WalletPageInner />
    </Suspense>
  )
}
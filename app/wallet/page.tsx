'use client'

import { useState, useEffect, Suspense } from 'react'
import { API_URL, supabase } from '../lib/supabase'
import { Icons } from '../components/Icons'
import { isInTelegram } from '../lib/telegram'


function WalletContent() {
  // Start in 'loading' if we already have an address — skip the landing screen
  const getInitialView = () => {
    if (typeof window === 'undefined') return 'landing' as const
    const params = new URLSearchParams(window.location.search)
    const addr = params.get('address') || localStorage.getItem('ubtc_wallet_address') || ''
    return addr ? 'loading' as const : 'landing' as const
  }
  const [view, setView] = useState<'landing' | 'loading' | 'create' | 'lookup' | 'dashboard'>(getInitialView)
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
      loadWallet(urlAddress)
    } else if (addr) {
      setWalletAddress(addr)
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
      const res = await fetch(`${API_URL}/wallets/all`)
      const data = await res.json()
      const wData = (data.wallets || []).find((w: any) => w.wallet_address === addr)
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

  // ── LOADING (auto-fetching wallet) ──
  if (view === 'loading') return (
    <div style={{ minHeight: '100vh', background: 'var(--q-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid rgba(0,212,255,0.15)', borderTopColor: 'var(--q-electric)', animation: 'wlb-spin .85s linear infinite' }} />
      <p style={{ color: 'var(--q-text-3)', fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Opening Wallet…</p>
      <style>{`@keyframes wlb-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // ── LANDING ──
  if (view === 'landing') return (
    <div style={{ minHeight: '100vh', background: 'var(--q-bg)', fontFamily: 'var(--font-display)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '40px 20px', position: 'relative', overflow: 'hidden' }}>
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
    <div style={{ minHeight: '100vh', background: 'var(--q-bg)', fontFamily: 'var(--font-display)', padding: '40px 20px' }}>
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
    <div style={{ minHeight: '100vh', background: 'var(--q-bg)', fontFamily: 'var(--font-display)', padding: '40px 20px' }}>
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
    <div style={{ minHeight: '100vh', background: 'var(--q-bg)', fontFamily: 'var(--font-display)' }}>

      {/* Proof download modal */}
      {proofModal.type && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--q-bg)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
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

      {/* Header */}
      <div style={{ background: 'var(--q-surface)', borderBottom: '1px solid var(--q-border)', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', backdropFilter: 'blur(20px)' }}>
        <a href="/dashboard" style={{ color: 'var(--q-text-3)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
          {Icons.back(14, 'var(--q-text-3)')} ACCOUNTS
        </a>
        <span style={{ color: 'var(--q-text)', fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>UBTC Wallet</span>
        <button onClick={() => loadWallet(walletData?.wallet_address || walletAddress)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--q-text-3)' }}>
          {Icons.refresh(16, 'var(--q-text-3)')}
        </button>
      </div>

      {/* Balance hero */}
      <div style={{ background: 'var(--q-bg)', padding: '40px 24px 32px', textAlign: 'center' as const, borderBottom: '1px solid var(--q-border)' }}>
        <p style={{ color: 'var(--q-electric)', fontSize: '10px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: '0.25em', margin: '0 0 6px', opacity: 0.8 }}>@{walletData?.username}</p>
        <p style={{ color: 'var(--q-text)', fontSize: '44px', fontWeight: '700', fontFamily: 'var(--font-mono)', margin: '0 0 4px', lineHeight: '1' }}>
          ${(balance + uusdtBalance + uusdcBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p style={{ color: 'var(--t-faint)', fontSize: '12px', ...mono, margin: '0 0 24px' }}>Total Balance</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', maxWidth: '380px', margin: '0 auto' }}>
          {[
            { label: 'Send', icon: Icons.send(18, 'var(--t-muted)'), href: `/transfer?from_wallet=${walletData?.wallet_address}&ubtc=${balance}&uusdt=${uusdtBalance}&uusdc=${uusdcBalance}` },
            { label: 'Receive', icon: Icons.receive(18, 'var(--t-muted)'), action: () => copy(walletData?.wallet_address || '', 'recv') },
            { label: 'Redeem', icon: Icons.redeem(18, 'var(--t-orange)'), href: '/redeem/proof', highlight: true },
            { label: 'Tokens', icon: Icons.settings(18, 'var(--t-muted)'), action: () => setShowManageTokens(true) },
          ].map(btn => (
            btn.href
              ? <a key={btn.label} href={btn.href} style={{ flex: 1, background: (btn as any).highlight ? 'var(--t-orange-bg)' : 'var(--t-surface2)', border: `1px solid ${(btn as any).highlight ? 'hsl(38 92% 50% / 0.3)' : 'var(--t-border)'}`, borderRadius: '14px', padding: '14px 8px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                {btn.icon}
                <span style={{ color: (btn as any).highlight ? 'var(--t-orange)' : 'hsl(0 0% 48%)', fontSize: '11px', fontWeight: '600', ...mono }}>{btn.label}</span>
              </a>
              : <button key={btn.label} onClick={(btn as any).action} style={{ flex: 1, background: 'var(--t-surface2)', border: '1px solid var(--t-border)', borderRadius: '14px', padding: '14px 8px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '6px', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
                {btn.icon}
                <span style={{ color: 'hsl(0 0% 48%)', fontSize: '11px', fontWeight: '600', ...mono }}>{btn.label}</span>
              </button>
          ))}
        </div>
      </div>
      {copied === 'recv' && <p style={{ color: 'var(--t-green)', fontSize: '12px', ...mono, margin: '12px 0 0', textAlign: 'center' as const }}>Address copied</p>}

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px' }}>

        {/* Assets */}
        <p style={{ color: 'var(--t-faint)', fontSize: '10px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.15em', margin: '0 0 10px' }}>Assets</p>
        {[
          { show: true, name: 'UBTC', sub: 'Bitcoin-backed', color: 'var(--t-orange)', bal: '$' + balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), unit: 'UBTC' },
          { show: tokens.uusdt, name: 'UUSDT', sub: '1:1 USDT · Bitcoin-native', color: 'var(--t-green)', bal: '$' + uusdtBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), unit: 'UUSDT' },
          { show: tokens.uusdc, name: 'UUSDC', sub: '1:1 USDC · Bitcoin-native', color: 'var(--t-accent)', bal: '$' + uusdcBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), unit: 'UUSDC' },
        ].filter(t => t.show).map(t => (
          <div key={t.name} style={{ background: 'var(--t-surface)', border: `1px solid ${t.color}1a`, borderRadius: '14px', padding: '16px 18px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: 'var(--t-text)', fontWeight: '600', fontSize: '14px', margin: '0 0 2px' }}>{t.name}</p>
              <p style={{ color: 'var(--t-faint)', fontSize: '11px', ...mono, margin: 0 }}>{t.sub}</p>
            </div>
            <div style={{ textAlign: 'right' as const }}>
              <p style={{ color: t.color, fontWeight: '700', fontSize: '18px', ...mono, margin: '0 0 1px' }}>{t.bal}</p>
              <p style={{ color: 'hsl(0 0% 24%)', fontSize: '10px', ...mono, margin: 0 }}>{t.unit}</p>
            </div>
          </div>
        ))}

        {/* Wallet address */}
        {walletData && (
          <div style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border-subtle)', borderRadius: '14px', padding: '16px', margin: '16px 0' }}>
            <p style={{ color: 'var(--t-faint)', fontSize: '10px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.15em', margin: '0 0 8px' }}>Wallet Address</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <p style={{ color: 'var(--t-accent)', fontSize: '11px', ...mono, margin: 0, flex: 1, wordBreak: 'break-all' as const }}>{walletData.wallet_address}</p>
              <CopyBtn text={walletData.wallet_address} id="wal-addr" />
            </div>
          </div>
        )}

        {/* Pending Proof Files */}
        {pendingProofs.length > 0 && (
          <div style={{ background: 'var(--t-surface)', border: '2px solid hsl(38 92% 50% / 0.6)', borderRadius: '16px', padding: '20px', margin: '16px 0', boxShadow: '0 0 24px hsl(38 92% 50% / 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '18px' }}>📥</span>
              <p style={{ color: 'var(--t-orange)', fontSize: '12px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.15em', margin: 0, fontWeight: 700 }}>
                {pendingProofs.length} Incoming Proof File{pendingProofs.length > 1 ? 's' : ''} — Action Required
              </p>
            </div>
            <p style={{ color: 'var(--t-muted)', fontSize: '11px', ...mono, margin: '0 0 16px', lineHeight: '1.7' }}>
              You have received UBTC. Enter your recovery phrase to redeem directly to Bitcoin.
            </p>
            {pendingProofs.map((proof: any) => {
              const isDownloaded = !!proof.downloaded
              const accentColor = isDownloaded ? 'var(--t-faint)' : 'hsl(190 80% 50%)'
              const borderColor = isDownloaded ? 'var(--t-border)' : 'hsl(190 80% 50% / 0.35)'
              return (
              <div key={proof.proof_id} style={{ background: 'var(--t-surface)', borderRadius: '10px', padding: '14px', marginBottom: '10px', border: `1px solid ${borderColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <p style={{ color: 'hsl(0 0% 75%)', fontSize: '13px', ...mono, margin: 0, fontWeight: 700 }}>{proof.proof_data?.ownership?.ubtc_amount || '?'} UBTC</p>
                      {!isDownloaded && (
                        <span style={{ background: 'hsl(190 80% 50% / 0.15)', color: 'hsl(190 80% 65%)', fontSize: '9px', ...mono, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 7px', borderRadius: '999px', textTransform: 'uppercase' }}>New</span>
                      )}
                      {isDownloaded && (
                        <span style={{ background: 'var(--t-border-subtle)', color: 'var(--t-muted)', fontSize: '9px', ...mono, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 7px', borderRadius: '999px', textTransform: 'uppercase' }}>Saved</span>
                      )}
                    </div>
                    <p style={{ color: accentColor, fontSize: '10px', ...mono, margin: 0 }}>from {proof.sender_vault_id} · {new Date(proof.created_at).toLocaleString()}</p>
                    {isDownloaded && proof.downloaded_at && (
                      <p style={{ color: 'var(--t-faint)', fontSize: '9px', ...mono, margin: '2px 0 0' }}>Saved to your device · {new Date(proof.downloaded_at).toLocaleString()}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                   {!isInTelegram() && (
                    <button onClick={() => downloadProof(proof)} title={isDownloaded ? 'Re-download proof file' : 'Download proof file'} style={{ background: 'transparent', color: 'var(--t-muted)', ...mono, fontSize: '11px', fontWeight: 600, padding: '10px 12px', border: '1px solid var(--t-border)', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                      {isDownloaded ? '↻ Re-download' : '↓ Download'}
                    </button>
                    )}
                    <button onClick={() => window.location.href = `/redeem/proof?proof_id=${proof.proof_id}&vault_id=${proof.sender_vault_id}&amount=${proof.proof_data?.ownership?.ubtc_amount}`} style={{ background: 'var(--t-green)', color: 'white', ...mono, fontSize: '11px', fontWeight: 700, padding: '10px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                      ⚡ Redeem to Bitcoin
                    </button>
                  </div>
                </div>
                <p style={{ color: 'hsl(0 0% 22%)', fontSize: '9px', ...mono, margin: 0 }}>ID: {proof.proof_id}</p>
              </div>
              )
            })}
			</div>
        )}

        {/* Transactions */}
        <p style={{ color: 'var(--t-faint)', fontSize: '10px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.15em', margin: '16px 0 10px' }}>Transactions</p>
        {walletTxs.length === 0 ? (
          <div style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border-subtle)', borderRadius: '14px', padding: '40px', textAlign: 'center' as const }}>
            <p style={{ color: 'var(--t-faint)', fontSize: '13px', ...mono, margin: 0 }}>No transactions yet</p>
          </div>
        ) : walletTxs.map((tx: any) => {
          const isIn = tx.is_incoming
          const color = isIn ? 'var(--t-green)' : 'var(--t-red)'
          return (
            <div key={tx.id} style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border-subtle)', borderRadius: '12px', padding: '14px 16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {isIn ? Icons.receive(16, color) : Icons.send(16, color)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: 'hsl(0 0% 82%)', fontWeight: '600', fontSize: '13px', margin: '0 0 2px' }}>{tx.description}</p>
                <p style={{ color: 'var(--t-faint)', fontSize: '11px', ...mono, margin: 0 }}>{new Date(tx.created_at).toLocaleString()}</p>
              </div>
              <p style={{ color, fontWeight: '700', fontSize: '14px', ...mono, margin: 0 }}>{isIn ? '+' : '-'}{parseFloat(tx.amount).toLocaleString()} UBTC</p>
            </div>
          )
        })}

        <button onClick={() => { localStorage.removeItem('ubtc_wallet_address'); setWalletData(null); setView('landing') }} style={{ width: '100%', background: 'none', border: '1px solid var(--t-border-subtle)', color: 'hsl(0 0% 22%)', borderRadius: '12px', padding: '12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', ...mono, marginTop: '16px' }}>
          Sign out of wallet
        </button>
      </div>
    </div>
  )
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--q-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t-faint)', fontFamily: 'var(--font-mono)' }}>Loading...</div>}>
      <WalletContent />
    </Suspense>
  )
}
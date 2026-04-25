'use client'
import { useState, useEffect, Suspense } from 'react'
import { API_URL, supabase } from '../lib/supabase'
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

    // Realtime subscriptions
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
      if (wData) { setWalletData(wData); setView('dashboard') }
      else { localStorage.removeItem('ubtc_wallet_address'); setView('landing') }
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
    <button onClick={() => copy(text, id)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: copied === id ? 'hsl(142 76% 36% / 0.15)' : 'hsl(220 12% 12%)', border: `1px solid ${copied === id ? 'hsl(142 76% 36% / 0.4)' : 'hsl(220 10% 20%)'}`, color: copied === id ? 'hsl(142 76% 36%)' : 'hsl(0 0% 50%)', borderRadius: '7px', padding: '6px 12px', fontSize: '11px', cursor: 'pointer', ...mono, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
      {copied === id ? Icons.check(13, 'hsl(142 76% 36%)') : Icons.copy(13, 'hsl(0 0% 50%)')}
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
      setPendingProofs(prev => prev.filter((p: any) => p.proof_id !== proof.proof_id))
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

      // Step 2 — send ONLY public keys to server for registration
      const res = await fetch(`${API_URL}/wallet/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          wallet_name: walletName || 'My Wallet',
          linked_vault_id: linkedVaultId,
          wallet_address: wallet.address,
          kyber_pk: wallet.publicKeys.kyber,
          taproot_pk: wallet.publicKeys.taproot,
          dilithium_pk: wallet.publicKeys.dilithium,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Step 3 — persist encrypted wallet locally (no secrets on server)
      await persistWallet(wallet)
      localStorage.setItem('ubtc_wallet_address', wallet.address)

      // Step 4 — show mnemonic to user (only time it's ever shown)
      setCreateResult({ ...data, mnemonic: wallet.mnemonic, wallet_address: wallet.address })

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

  const inputStyle: any = { display: 'block', width: '100%', padding: '13px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '12px', color: 'hsl(0 0% 92%)', fontSize: '14px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '12px' }

  const accountMeta: Record<string, { icon: string; title: string }> = {
    current: { icon: '💳', title: 'Current Account' }, savings: { icon: '🔐', title: 'Savings Account' },
    yield: { icon: '₿', title: 'Yield Account' }, custody_yield: { icon: '📊', title: 'Custody Yield' },
    prime: { icon: '💎', title: 'Prime Account' }, managed_yield: { icon: '🏦', title: 'Managed Yield' },
  }

  const balance = parseFloat(walletData?.balance || '0')
  const uusdtBalance = parseFloat(walletData?.uusdt_balance || '0')
  const uusdcBalance = parseFloat(walletData?.uusdc_balance || '0')

  // ── LANDING ──
  if (view === 'landing') return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', fontFamily: 'var(--font-display)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' as const }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'hsl(205 85% 55% / 0.1)', border: '2px solid hsl(205 85% 55% / 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <img src="/ubtcqwallet-logo.png" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
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
            <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(38 92% 50% / 0.4)', borderRadius: '12px', padding: '20px' }}>
              <p style={{ color: 'hsl(38 92% 50%)', fontSize: '11px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.2em', margin: '0 0 12px' }}>⚠️ You have 3 Quantum Keys — Understand Each One</p>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
                {[
                  { color: 'hsl(205 85% 55%)', label: 'KEY 1 — Dilithium3 Quantum Signing Key (QSK)', desc: 'Used to SIGN every UBTC transfer. Without this key you cannot send UBTC. Store it securely offline.', note: 'Post-quantum secure · Dilithium3 lattice-based · NIST standard' },
                  { color: 'hsl(142 70% 45%)', label: 'KEY 2 — SPHINCS+ Backup Signing Key', desc: 'A second quantum signature using a completely different algorithm. Store separately from KEY 1.', note: 'Post-quantum secure · Hash-based · Different mathematical family to KEY 1' },
                  { color: 'hsl(38 92% 50%)', label: 'KEY 3 — Kyber Redemption Key', desc: 'Decrypts your embedded Bitcoin redemption transaction. Lets you claim BTC directly with NO server needed. Guard this with your life.', note: 'Post-quantum secure · Kyber KEM · Self-sovereign redemption' },
                ].map(k => (
                  <div key={k.label} style={{ background: 'hsl(220 15% 7%)', borderRadius: '8px', padding: '12px', borderLeft: `3px solid ${k.color}` }}>
                    <p style={{ color: k.color, fontSize: '11px', ...mono, fontWeight: 700, margin: '0 0 4px' }}>{k.label}</p>
                    <p style={{ color: 'hsl(0 0% 50%)', fontSize: '11px', ...mono, margin: '0 0 4px', lineHeight: '1.7' }}>{k.desc}</p>
                    <p style={{ color: 'hsl(0 0% 30%)', fontSize: '10px', ...mono, margin: 0 }}>{k.note}</p>
                  </div>
                ))}
              </div>
            </div>
            {createResult.mnemonic && (
              <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(38 92% 50% / 0.5)', borderRadius: '12px', padding: '20px' }}>
                <p style={{ color: 'hsl(38 92% 50%)', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase' as const, letterSpacing: '0.2em', margin: '0 0 16px', fontWeight: 700 }}>⚠️ Your Recovery Phrase — Write This Down Now</p>
                <p style={{ color: 'hsl(0 0% 45%)', fontSize: '12px', fontFamily: 'monospace', margin: '0 0 16px', lineHeight: '1.6' }}>These 24 words are the ONLY way to recover your wallet. Never share them. Never store them digitally. Write them on paper and store safely offline.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                  {createResult.mnemonic.split(' ').map((word: string, i: number) => (
                    <div key={i} style={{ background: 'hsl(220 15% 8%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '8px', padding: '8px 10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', fontFamily: 'monospace', minWidth: '20px' }}>{i + 1}.</span>
                      <span style={{ color: 'hsl(0 0% 88%)', fontSize: '13px', fontFamily: 'monospace', fontWeight: 600 }}>{word}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => {
                  navigator.clipboard.writeText(createResult.mnemonic)
                }} style={{ background: 'hsl(220 12% 12%)', color: 'hsl(0 0% 55%)', border: '1px solid hsl(220 10% 18%)', borderRadius: '8px', padding: '10px 16px', fontSize: '12px', fontFamily: 'monospace', cursor: 'pointer', width: '100%' }}>
                  Copy to clipboard (paste into secure password manager)
                </button>
              </div>
            )}
            <div onClick={() => setProtocolKeySaved(!protocolKeySaved)} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'hsl(220 12% 8%)', border: `1px solid ${protocolKeySaved ? 'hsl(142 76% 36% / 0.4)' : 'hsl(220 10% 14%)'}`, borderRadius: '12px', padding: '14px', cursor: 'pointer' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${protocolKeySaved ? 'hsl(142 76% 36%)' : 'hsl(220 10% 28%)'}`, background: protocolKeySaved ? 'hsl(142 76% 36%)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {protocolKeySaved && Icons.check(13, 'white')}
              </div>
              <p style={{ color: 'hsl(0 0% 45%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.6' }}>I have written down my 24-word recovery phrase and stored it safely offline.</p>
            </div>
            <button onClick={() => { if (protocolKeySaved) { setWalletData(createResult); setWalletAddress(createResult.wallet_address); setView('dashboard'); loadWallet(createResult.wallet_address) } }} disabled={!protocolKeySaved} style={{ background: protocolKeySaved ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : 'hsl(220 10% 12%)', color: protocolKeySaved ? 'white' : 'hsl(0 0% 28%)', border: 'none', borderRadius: '14px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: protocolKeySaved ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', boxShadow: protocolKeySaved ? '0 0 30px hsl(205 85% 55% / 0.4)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {Icons.wallet(18, protocolKeySaved ? 'white' : 'hsl(0 0% 28%)')} Open My Wallet →
            </button>
          </div>
        ) : (
          <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '20px', padding: '28px' }}>
            <label style={{ display: 'block', color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: '8px' }}>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="satoshi" style={inputStyle} autoFocus />
            <label style={{ display: 'block', color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: '8px' }}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="satoshi@bitcoin.org" type="email" style={inputStyle} />
            <label style={{ display: 'block', color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: '8px' }}>Wallet Name (optional)</label>
            <input value={walletName} onChange={e => setWalletName(e.target.value)} placeholder="My Main Wallet" style={inputStyle} />
            <label style={{ display: 'block', color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: '8px' }}>Link to Vault (optional)</label>
            <select value={linkedVaultId} onChange={e => setLinkedVaultId(e.target.value)} style={{ ...inputStyle, appearance: 'none' as const }}>
              <option value="">No vault linked</option>
              {vaults.map(v => { const meta = accountMeta[v.account_type] || { icon: '💳', title: v.account_type }; return <option key={v.vault_id} value={v.vault_id}>{meta.icon} {meta.title} — {v.vault_id}</option> })}
            </select>
            {error && <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.25)', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>{Icons.warning(14, 'hsl(0 84% 60%)')}<p style={{ color: 'hsl(0 84% 60%)', fontSize: '13px', ...mono, margin: 0 }}>{error}</p></div>}
            <button onClick={createWallet} disabled={loading || !username || !email} style={{ width: '100%', background: username && email && !loading ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : 'hsl(220 10% 12%)', color: username && email && !loading ? 'white' : 'hsl(0 0% 28%)', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: username && email && !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
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
          <input value={lookupUsername} onChange={e => { setLookupUsername(e.target.value); setError(''); setLookupResult(null) }} onKeyDown={e => e.key === 'Enter' && lookupUser()} placeholder="@username or wallet address" style={inputStyle} autoFocus />
          {error && <p style={{ color: 'hsl(0 84% 60%)', fontSize: '13px', ...mono, marginBottom: '12px' }}>{error}</p>}
          <button onClick={lookupUser} disabled={loading || !lookupUsername} style={{ width: '100%', background: lookupUsername && !loading ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : 'hsl(220 10% 12%)', color: lookupUsername && !loading ? 'white' : 'hsl(0 0% 28%)', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: lookupUsername && !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)' }}>
            {loading ? 'Searching...' : 'Find User'}
          </button>
        </div>
        {lookupResult && (
          <div style={{ marginTop: '16px', background: 'hsl(220 12% 8%)', border: '1px solid hsl(142 76% 36% / 0.3)', borderRadius: '16px', padding: '22px' }}>
            <p style={{ color: 'hsl(0 0% 92%)', fontWeight: '700', fontSize: '16px', margin: '0 0 8px' }}>@{lookupResult.username}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <p style={{ color: 'hsl(0 0% 65%)', fontSize: '11px', ...mono, margin: 0, flex: 1, wordBreak: 'break-all' as const }}>{lookupResult.wallet_address}</p>
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
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', fontFamily: 'var(--font-display)' }}>

      {/* Proof download modal */}
      {proofModal.type && (
        <div style={{ position: 'fixed', inset: 0, background: 'hsl(220 15% 2% / 0.95)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '24px', padding: '40px', maxWidth: '480px', width: '100%', border: `2px solid ${proofModal.type === 'success' ? 'hsl(142 76% 36% / 0.4)' : 'hsl(38 92% 50% / 0.4)'}` }}>
            {proofModal.type === 'warning' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'hsl(38 92% 50% / 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>⚠️</div>
                  <div>
                    <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: '0 0 2px' }}>Read Before Downloading</h2>
                    <p style={{ color: 'hsl(38 92% 50%)', fontSize: '12px', ...mono, margin: 0 }}>Bearer Instrument Warning</p>
                  </div>
                </div>
                <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
                  <p style={{ color: 'hsl(0 0% 75%)', fontSize: '13px', ...mono, margin: '0 0 16px', lineHeight: '1.7' }}>This proof file is <strong style={{ color: 'hsl(38 92% 50%)' }}>digital cash</strong>. Anyone with both of these can redeem your Bitcoin:</p>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px', marginBottom: '16px' }}>
                    {[{ icon: '📄', label: 'This .ubtc proof file' }, { icon: '🔑', label: 'Your KEY 3 (Kyber key)' }].map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.2)', borderRadius: '8px', padding: '12px 14px' }}>
                        <span style={{ fontSize: '18px' }}>{item.icon}</span>
                        <p style={{ color: 'hsl(0 0% 82%)', fontSize: '13px', ...mono, margin: 0, fontWeight: 600 }}>{item.label}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: '1px solid hsl(220 10% 12%)', paddingTop: '14px', display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
                    {['Store proof file and KEY 3 in separate secure locations', 'Never store them together on the same device', 'Never send them in the same email or message', 'Treat this file like physical cash'].map((rule, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ color: 'hsl(38 92% 50%)', fontSize: '12px', marginTop: '1px', flexShrink: 0 }}>→</span>
                        <p style={{ color: 'hsl(0 0% 55%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.5' }}>{rule}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setProofModal({ type: null })} style={{ background: 'none', border: '1px solid hsl(220 10% 18%)', color: 'hsl(0 0% 40%)', borderRadius: '12px', padding: '14px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>Cancel</button>
                  <button onClick={() => downloadProof(proofModal.proof)} style={{ flex: 1, background: 'hsl(38 92% 50%)', color: '#000', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>I Understand — Download</button>
                </div>
              </>
            )}
            {proofModal.type === 'success' && (
              <>
                <div style={{ textAlign: 'center' as const, marginBottom: '24px' }}>
                  <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'hsl(142 76% 36% / 0.15)', border: '2px solid hsl(142 76% 36% / 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '32px' }}>✅</div>
                  <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '22px', fontWeight: '700', margin: '0 0 6px' }}>Proof File Downloaded</h2>
                  <p style={{ color: 'hsl(142 76% 36%)', fontSize: '13px', ...mono, margin: 0 }}>{proofModal.proof?.proof_data?.ownership?.ubtc_amount || '?'} UBTC bearer instrument</p>
                </div>
                <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                  <p style={{ color: 'hsl(0 0% 55%)', fontSize: '12px', ...mono, margin: '0 0 14px', lineHeight: '1.7' }}>Server copy marked for deletion. Store your proof file now:</p>
                  {[
                    { icon: '💾', text: 'Save the .ubtc file to a USB drive or secure offline storage' },
                    { icon: '🔑', text: 'Store KEY 3 separately — different device or location' },
                    { icon: '🔴', text: 'Never put both files on the same cloud storage or device' },
                    { icon: '₿', text: 'To redeem: tap Redeem in your wallet and upload your proof file + KEY 3' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
                      <p style={{ color: 'hsl(0 0% 70%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.5' }}>{item.text}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setProofModal({ type: null })} style={{ flex: 1, background: 'none', border: '1px solid hsl(220 10% 18%)', color: 'hsl(0 0% 40%)', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>Done</button>
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
          <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '20px', padding: '28px', maxWidth: '400px', width: '100%' }}>
            <h3 style={{ color: 'hsl(0 0% 92%)', fontSize: '18px', fontWeight: '700', margin: '0 0 20px' }}>Manage Tokens</h3>
            {[
              { key: 'ubtc', name: 'UBTC', sub: 'Bitcoin-backed · Always enabled', color: 'hsl(38 92% 50%)', locked: true },
              { key: 'uusdt', name: 'UUSDT', sub: '1:1 USDT · Bitcoin-native', color: 'hsl(142 76% 36%)', locked: false },
              { key: 'uusdc', name: 'UUSDC', sub: '1:1 USDC · Bitcoin-native', color: 'hsl(220 85% 60%)', locked: false },
            ].map(t => (
              <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderBottom: '1px solid hsl(220 10% 12%)' }}>
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
        <span style={{ color: 'hsl(0 0% 55%)', fontWeight: '700', fontSize: '15px' }}>UBTC Wallet</span>
        <button onClick={() => loadWallet(walletData?.wallet_address || walletAddress)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(0 0% 28%)' }}>
          {Icons.refresh(18, 'hsl(0 0% 28%)')}
        </button>
      </div>

      {/* Balance hero */}
      <div style={{ background: 'hsl(220 15% 4%)', padding: '40px 24px 32px', textAlign: 'center' as const, borderBottom: '1px solid hsl(220 10% 9%)' }}>
        <p style={{ color: 'hsl(0 0% 38%)', fontSize: '12px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.15em', margin: '0 0 6px' }}>@{walletData?.username}</p>
        <p style={{ color: 'hsl(0 0% 92%)', fontSize: '44px', fontWeight: '700', ...mono, margin: '0 0 4px', lineHeight: '1' }}>
          ${(balance + uusdtBalance + uusdcBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p style={{ color: 'hsl(0 0% 28%)', fontSize: '12px', ...mono, margin: '0 0 24px' }}>Total Balance</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', maxWidth: '380px', margin: '0 auto' }}>
          {[
            { label: 'Send', icon: Icons.send(18, 'hsl(0 0% 55%)'), href: `/transfer?from_wallet=${walletData?.wallet_address}&ubtc=${balance}&uusdt=${uusdtBalance}&uusdc=${uusdcBalance}` },
            { label: 'Receive', icon: Icons.receive(18, 'hsl(0 0% 55%)'), action: () => copy(walletData?.wallet_address || '', 'recv') },
            { label: 'Redeem', icon: Icons.redeem(18, 'hsl(38 92% 50%)'), href: '/redeem/proof', highlight: true },
            { label: 'Tokens', icon: Icons.settings(18, 'hsl(0 0% 55%)'), action: () => setShowManageTokens(true) },
          ].map(btn => (
            btn.href
              ? <a key={btn.label} href={btn.href} style={{ flex: 1, background: (btn as any).highlight ? 'hsl(38 92% 50% / 0.1)' : 'hsl(220 12% 10%)', border: `1px solid ${(btn as any).highlight ? 'hsl(38 92% 50% / 0.3)' : 'hsl(220 10% 15%)'}`, borderRadius: '14px', padding: '14px 8px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                {btn.icon}
                <span style={{ color: (btn as any).highlight ? 'hsl(38 92% 55%)' : 'hsl(0 0% 48%)', fontSize: '11px', fontWeight: '600', ...mono }}>{btn.label}</span>
              </a>
              : <button key={btn.label} onClick={(btn as any).action} style={{ flex: 1, background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 10% 15%)', borderRadius: '14px', padding: '14px 8px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '6px', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
                {btn.icon}
                <span style={{ color: 'hsl(0 0% 48%)', fontSize: '11px', fontWeight: '600', ...mono }}>{btn.label}</span>
              </button>
          ))}
        </div>
      </div>
      {copied === 'recv' && <p style={{ color: 'hsl(142 76% 36%)', fontSize: '12px', ...mono, margin: '12px 0 0', textAlign: 'center' as const }}>Address copied</p>}

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px' }}>

        {/* Assets */}
        <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.15em', margin: '0 0 10px' }}>Assets</p>
        {[
          { show: true, name: 'UBTC', sub: 'Bitcoin-backed', color: 'hsl(38 92% 50%)', bal: '$' + balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), unit: 'UBTC' },
          { show: tokens.uusdt, name: 'UUSDT', sub: '1:1 USDT · Bitcoin-native', color: 'hsl(142 76% 36%)', bal: '$' + uusdtBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), unit: 'UUSDT' },
          { show: tokens.uusdc, name: 'UUSDC', sub: '1:1 USDC · Bitcoin-native', color: 'hsl(220 85% 60%)', bal: '$' + uusdcBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), unit: 'UUSDC' },
        ].filter(t => t.show).map(t => (
          <div key={t.name} style={{ background: 'hsl(220 12% 8%)', border: `1px solid ${t.color}1a`, borderRadius: '14px', padding: '16px 18px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '14px' }}>
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
            <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.15em', margin: '0 0 8px' }}>Wallet Address</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <p style={{ color: 'hsl(205 85% 55%)', fontSize: '11px', ...mono, margin: 0, flex: 1, wordBreak: 'break-all' as const }}>{walletData.wallet_address}</p>
              <CopyBtn text={walletData.wallet_address} id="wal-addr" />
            </div>
          </div>
        )}

        {/* Pending Proof Files */}
        {pendingProofs.length > 0 && (
          <div style={{ background: 'hsl(220 12% 8%)', border: '2px solid hsl(38 92% 50% / 0.6)', borderRadius: '16px', padding: '20px', margin: '16px 0', boxShadow: '0 0 24px hsl(38 92% 50% / 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '18px' }}>📥</span>
              <p style={{ color: 'hsl(38 92% 50%)', fontSize: '12px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.15em', margin: 0, fontWeight: 700 }}>
                {pendingProofs.length} Incoming Proof File{pendingProofs.length > 1 ? 's' : ''} — Action Required
              </p>
            </div>
<p style={{ color: 'hsl(0 0% 45%)', fontSize: '11px', ...mono, margin: '0 0 16px', lineHeight: '1.7' }}>
              You have received UBTC. Enter your wallet password to redeem directly to Bitcoin — no file download needed.
            </p>
            {pendingProofs.map((proof: any) => (
              <div key={proof.proof_id} style={{ background: 'hsl(220 15% 5%)', borderRadius: '10px', padding: '14px', marginBottom: '10px', border: '1px solid hsl(220 10% 14%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div>
                    <p style={{ color: 'hsl(0 0% 75%)', fontSize: '13px', ...mono, margin: '0 0 2px', fontWeight: 700 }}>{proof.proof_data?.ownership?.ubtc_amount || '?'} UBTC</p>
                    <p style={{ color: 'hsl(0 0% 30%)', fontSize: '10px', ...mono, margin: 0 }}>from {proof.sender_vault_id} · {new Date(proof.created_at).toLocaleString()}</p>
                  </div>
                <button onClick={() => window.location.href = `/redeem/proof?proof_id=${proof.proof_id}&vault_id=${proof.sender_vault_id}&amount=${proof.proof_data?.ownership?.ubtc_amount}`} style={{ background: 'hsl(142 76% 36%)', color: 'white', ...mono, fontSize: '11px', fontWeight: 700, padding: '10px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                    ⚡ Redeem to Bitcoin
                  </button>
                </div>
                <p style={{ color: 'hsl(0 0% 22%)', fontSize: '9px', ...mono, margin: 0 }}>ID: {proof.proof_id}</p>
              </div>
            ))}
          </div>
        )}

        {/* Transactions */}
        <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.15em', margin: '16px 0 10px' }}>Transactions</p>
        {walletTxs.length === 0 ? (
          <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 12%)', borderRadius: '14px', padding: '40px', textAlign: 'center' as const }}>
            <p style={{ color: 'hsl(0 0% 25%)', fontSize: '13px', ...mono, margin: 0 }}>No transactions yet</p>
          </div>
        ) : walletTxs.map((tx: any) => {
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
              <p style={{ color, fontWeight: '700', fontSize: '14px', ...mono, margin: 0 }}>{isIn ? '+' : '-'}{parseFloat(tx.amount).toLocaleString()} UBTC</p>
            </div>
          )
        })}

        <button onClick={() => { localStorage.removeItem('ubtc_wallet_address'); setWalletData(null); setView('landing') }} style={{ width: '100%', background: 'none', border: '1px solid hsl(220 10% 12%)', color: 'hsl(0 0% 22%)', borderRadius: '12px', padding: '12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', ...mono, marginTop: '16px' }}>
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
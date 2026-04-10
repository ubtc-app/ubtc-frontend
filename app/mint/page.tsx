'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { API_URL } from '../lib/supabase'
import { Icons } from '../components/Icons'

function MintContent() {
  const searchParams = useSearchParams()
  const vaultId = searchParams.get('vault') || ''
  const currencyParam = (searchParams.get('currency') || 'ubtc').toLowerCase()

  const [vault, setVault] = useState<any>(null)
  const [stablecoins, setStablecoins] = useState<any[]>([])
  const [btcPrice, setBtcPrice] = useState(0)
  const [activeCurrency, setActiveCurrency] = useState(currencyParam)
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<'amount' | 'quantum' | 'done'>('amount')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [otpId, setOtpId] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpExpires, setOtpExpires] = useState('')
  const [qPubKey, setQPubKey] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [secondKey, setSecondKey] = useState('')
  const [mintResult, setMintResult] = useState<any>(null)
  const [qSigningKey, setQSigningKey] = useState('')
  const [keySaved, setKeySaved] = useState(false)
  const [copied, setCopied] = useState('')

  const mono: any = { fontFamily: 'var(--font-mono)' }

  const currencies = [
    { key: 'ubtc', label: 'UBTC', sub: 'Bitcoin-backed · 150% collateral', color: 'hsl(205 85% 55%)', icon: Icons.bitcoin },
    { key: 'uusdt', label: 'UUSDT', sub: 'Quantum-wrapped Tether · 1:1 USDT', color: 'hsl(142 76% 36%)', icon: Icons.lock },
    { key: 'uusdc', label: 'UUSDC', sub: 'Quantum-wrapped USD Coin · 1:1 USDC', color: 'hsl(220 85% 60%)', icon: Icons.lock },
  ]

  const cur = currencies.find(c => c.key === activeCurrency) || currencies[0]
  const isStable = activeCurrency === 'uusdt' || activeCurrency === 'uusdc'
  const tokenName = activeCurrency === 'uusdt' ? 'USDT' : activeCurrency === 'uusdc' ? 'USDC' : 'BTC'

  useEffect(() => {
    if (vaultId) {
      fetch(`${API_URL}/vaults/${vaultId}`).then(r => r.json()).then(setVault)
      fetch(`${API_URL}/price`).then(r => r.json()).then(d => setBtcPrice(parseFloat(d.btc_usd) || 0))
      fetch(`${API_URL}/stablecoins`).then(r => r.json()).then(d => setStablecoins(d.stablecoins || []))
    }
  }, [vaultId])

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

  const btcLocked = (vault?.btc_amount_sats || 0) / 100_000_000
  const btcValue = btcLocked * btcPrice
  const ubtcMinted = parseFloat(vault?.ubtc_minted || '0')
  const maxUbtc = Math.max(0, (btcValue / 1.5) - ubtcMinted)
  const accountType = vault?.account_type || ''
  const scVaults = stablecoins.filter(s => s.account_type === accountType)
  const uusdtDeposited = scVaults.filter(s => s.currency === 'UUSDT').reduce((s, x) => s + parseFloat(x.deposited_amount || '0'), 0)
  const uusdtMinted = scVaults.filter(s => s.currency === 'UUSDT').reduce((s, x) => s + parseFloat(x.balance || '0'), 0)
  const uusdcDeposited = scVaults.filter(s => s.currency === 'UUSDC').reduce((s, x) => s + parseFloat(x.deposited_amount || '0'), 0)
  const uusdcMinted = scVaults.filter(s => s.currency === 'UUSDC').reduce((s, x) => s + parseFloat(x.balance || '0'), 0)
  const maxStable = activeCurrency === 'uusdt'
    ? Math.max(0, uusdtDeposited - uusdtMinted)
    : Math.max(0, uusdcDeposited - uusdcMinted)
  const maxAmount = isStable ? maxStable : maxUbtc

  const makeQSK = (raw: string): string => {
    if (!raw || raw.length < 32) {
      const r = () => Math.random().toString(36).slice(2, 10).toUpperCase()
      return `QSK-${r()}-${r()}-${r()}-${r()}`
    }
    return 'QSK-' + [0, 8, 16, 24].map(i => raw.slice(i, i + 8).toUpperCase()).join('-')
  }

  const requestMint = async () => {
    if (!amount || parseFloat(amount) <= 0) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_URL}/wallet/otp/request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: vaultId, amount, destination: `mint-${activeCurrency}` })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOtpId(data.otp_id)
      setOtpCode(data.otp_code)
      setOtpExpires(data.expires_at)
      setQPubKey(data.pq_public_key)
      setQSigningKey(makeQSK(data.pq_public_key || ''))
      setStep('quantum')
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const verifyAndMint = async () => {
    if (!otpInput || !secondKey) return
    setLoading(true); setError('')
    try {
      const verifyRes = await fetch(`${API_URL}/wallet/otp/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp_id: otpId, otp_code: otpInput, second_key: secondKey })
      })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok || !verifyData.verified) throw new Error(verifyData.error || 'Invalid OTP or second key')

      if (isStable) {
        const currency = activeCurrency === 'uusdt' ? 'UUSDT' : 'UUSDC'
        const existingSc = scVaults.find(s => s.currency === currency)
        let scVaultId: string
        if (existingSc) {
          scVaultId = existingSc.vault_id
        } else {
          const depRes = await fetch(`${API_URL}/stablecoin/deposit`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currency, amount, account_type: accountType })
          })
          const depData = await depRes.json()
          if (!depRes.ok) throw new Error(depData.error)
          scVaultId = depData.vault_id
        }
        const mintRes = await fetch(`${API_URL}/stablecoin/mint`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vault_id: scVaultId, amount })
        })
        const mintData = await mintRes.json()
        if (!mintRes.ok) throw new Error(mintData.error)
        setMintResult(mintData)
      } else {
        const mintRes = await fetch(`${API_URL}/mint`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vault_id: vaultId, ubtc_amount: amount })
        })
        const mintData = await mintRes.json()
        if (!mintRes.ok) throw new Error(mintData.error)
        setMintResult(mintData)
      }

      setQSigningKey(makeQSK(verifyData.pq_signature || qSigningKey))
      setStep('done')
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const canProceed = !!amount && parseFloat(amount) > 0 && parseFloat(amount) <= maxAmount && vault?.status === 'active'
  const fieldStyle: any = { display: 'block', width: '100%', padding: '14px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '12px', color: 'hsl(0 0% 92%)', fontSize: '14px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '12px' }

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', fontFamily: 'var(--font-display)' }}>

      {/* Header */}
      <div style={{ background: 'hsl(220 15% 5%)', borderBottom: '1px solid hsl(220 10% 10%)', height: '60px', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '16px' }}>
        <a href={`/account/${vaultId}?currency=${activeCurrency}`} style={{ color: 'hsl(0 0% 40%)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          {Icons.back(20, 'hsl(0 0% 40%)')}
        </a>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
          {['amount', 'quantum', 'done'].map((s, i) => (
            <div key={s} style={{ width: step === s ? '24px' : '8px', height: '8px', borderRadius: '4px', background: ['amount', 'quantum', 'done'].indexOf(step) >= i ? cur.color : 'hsl(220 10% 18%)', transition: 'all 0.3s' }} />
          ))}
        </div>
        <span style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {step === 'amount' ? 'Amount' : step === 'quantum' ? 'Authorize' : 'Done'}
        </span>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '36px 20px' }}>

        {/* ── STEP 1: AMOUNT ── */}
        {step === 'amount' && (
          <>
            <div style={{ textAlign: 'center' as const, marginBottom: '32px' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '22px', background: cur.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                {cur.icon(32, cur.color)}
              </div>
              <h1 style={{ color: 'hsl(0 0% 92%)', fontSize: '28px', fontWeight: '700', margin: '0 0 6px' }}>Mint {cur.label}</h1>
              <p style={{ color: 'hsl(0 0% 35%)', fontSize: '14px', ...mono, margin: 0 }}>{cur.sub}</p>
            </div>

            {/* Currency selector */}
            <div style={{ display: 'flex', background: 'hsl(220 12% 8%)', borderRadius: '16px', padding: '4px', gap: '4px', marginBottom: '24px' }}>
              {currencies.map(c => (
                <button key={c.key} onClick={() => { setActiveCurrency(c.key); setAmount(''); setError('') }} style={{ flex: 1, background: activeCurrency === c.key ? 'hsl(220 15% 14%)' : 'transparent', border: activeCurrency === c.key ? `1px solid ${c.color}35` : '1px solid transparent', borderRadius: '12px', padding: '11px 6px', cursor: 'pointer', fontFamily: 'var(--font-display)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '6px', transition: 'all 0.15s' }}>
                  {c.icon(18, activeCurrency === c.key ? c.color : 'hsl(0 0% 35%)')}
                  <span style={{ fontSize: '11px', fontWeight: '600', color: activeCurrency === c.key ? 'hsl(0 0% 88%)' : 'hsl(0 0% 38%)' }}>{c.label}</span>
                </button>
              ))}
            </div>

            {/* Amount input */}
            <div style={{ background: 'hsl(220 12% 8%)', border: `1px solid ${cur.color}18`, borderRadius: '22px', padding: '24px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Amount to mint</p>
                <button onClick={() => setAmount(maxAmount.toFixed(2))} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: cur.color + '12', border: `1px solid ${cur.color}28`, color: cur.color, borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', ...mono }}>
                  {Icons.plus(12, cur.color)} Max ${maxAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
                <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" type="number" autoFocus style={{ flex: 1, background: 'transparent', border: 'none', color: cur.color, fontSize: '48px', fontWeight: '700', fontFamily: 'var(--font-mono)', outline: 'none', padding: '0', width: '100%' }} />
                <span style={{ color: cur.color, fontSize: '18px', fontWeight: '700', ...mono, flexShrink: 0 }}>{cur.label}</span>
              </div>
              <div style={{ height: '1px', background: 'hsl(220 10% 13%)', marginBottom: '14px' }} />
              <div style={{ display: 'flex', gap: '6px' }}>
                {[25, 50, 75, 100].map(pct => (
                  <button key={pct} onClick={() => setAmount((maxAmount * pct / 100).toFixed(2))} style={{ flex: 1, background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 13%)', color: 'hsl(0 0% 38%)', borderRadius: '9px', padding: '9px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', ...mono }}>{pct}%</button>
                ))}
              </div>
            </div>

            {/* Stats */}
            {!isStable && vault?.status === 'active' && (
              <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '16px', padding: '16px', marginBottom: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                {[
                  { icon: Icons.lock(14, 'hsl(38 92% 50%)'), label: 'BTC Locked', value: btcLocked.toFixed(4) + ' BTC', color: 'hsl(38 92% 50%)' },
                  { icon: Icons.mint(14, 'hsl(205 85% 55%)'), label: 'Minted', value: '$' + ubtcMinted.toLocaleString(undefined, { maximumFractionDigits: 0 }), color: 'hsl(205 85% 55%)' },
                  { icon: Icons.chart(14, 'hsl(0 0% 45%)'), label: 'BTC Price', value: '$' + btcPrice.toLocaleString(), color: 'hsl(0 0% 45%)' },
                ].map(item => (
                  <div key={item.label} style={{ textAlign: 'center' as const }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '5px' }}>
                      {item.icon}
                      <p style={{ color: 'hsl(0 0% 28%)', fontSize: '9px', ...mono, textTransform: 'uppercase', margin: 0 }}>{item.label}</p>
                    </div>
                    <p style={{ color: item.color, fontWeight: '700', fontSize: '13px', ...mono, margin: 0 }}>{item.value}</p>
                  </div>
                ))}
              </div>
            )}

            {isStable && (
              <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '16px', padding: '16px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {Icons.deposit(14, 'hsl(0 0% 35%)')}
                    <span style={{ color: 'hsl(0 0% 35%)', fontSize: '12px', ...mono }}>{tokenName} deposited</span>
                  </div>
                  <span style={{ color: cur.color, fontWeight: '700', fontSize: '14px', ...mono }}>
                    ${(activeCurrency === 'uusdt' ? uusdtDeposited : uusdcDeposited).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {Icons.mint(14, 'hsl(0 0% 35%)')}
                    <span style={{ color: 'hsl(0 0% 35%)', fontSize: '12px', ...mono }}>{cur.label} already minted</span>
                  </div>
                  <span style={{ color: 'hsl(0 0% 50%)', fontWeight: '600', fontSize: '14px', ...mono }}>
                    ${(activeCurrency === 'uusdt' ? uusdtMinted : uusdcMinted).toLocaleString()}
                  </span>
                </div>
                {maxAmount === 0 && (
                  <div style={{ marginTop: '12px', background: 'hsl(38 92% 50% / 0.07)', border: '1px solid hsl(38 92% 50% / 0.2)', borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {Icons.warning(14, 'hsl(38 92% 50%)')}
                    <div>
                      <p style={{ color: 'hsl(38 92% 50%)', fontSize: '12px', ...mono, margin: '0 0 4px' }}>No {tokenName} available to mint against</p>
                      <a href={`/deposit?vault=${vaultId}&currency=${activeCurrency}`} style={{ color: cur.color, fontSize: '12px', ...mono }}>Deposit {tokenName} first →</a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quantum notice */}
            <div style={{ background: 'hsl(38 92% 50% / 0.05)', border: '1px solid hsl(38 92% 50% / 0.15)', borderRadius: '14px', padding: '14px 16px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              {Icons.quantum(16, 'hsl(38 92% 50%)')}
              <div>
                <p style={{ color: 'hsl(38 92% 50%)', fontWeight: '600', fontSize: '12px', ...mono, margin: '0 0 4px' }}>Quantum authorization required</p>
                <p style={{ color: 'hsl(0 0% 35%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>You will receive an OTP and a Quantum Signing Key (QSK) — shown once only. Your QSK authorizes all future {cur.label} transfers.</p>
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.25)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px' }}>
                {Icons.warning(14, 'hsl(0 84% 60%)')}
                <p style={{ color: 'hsl(0 84% 60%)', fontSize: '13px', ...mono, margin: 0 }}>{error}</p>
              </div>
            )}

            <button onClick={requestMint} disabled={!canProceed || loading} style={{ width: '100%', background: canProceed && !loading ? `linear-gradient(135deg, ${cur.color}, ${cur.color}bb)` : 'hsl(220 10% 12%)', color: canProceed && !loading ? 'white' : 'hsl(0 0% 28%)', border: 'none', borderRadius: '16px', padding: '18px', fontSize: '17px', fontWeight: '700', cursor: canProceed && !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', boxShadow: canProceed && !loading ? `0 0 40px ${cur.color}35` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {Icons.mint(20, canProceed && !loading ? 'white' : 'hsl(0 0% 28%)')}
              {loading ? 'Generating OTP...' : !vault || vault.status !== 'active' ? 'Fund account first' : parseFloat(amount || '0') > maxAmount ? 'Amount too high' : `Mint ${amount || '0'} ${cur.label}`}
            </button>
          </>
        )}

        {/* ── STEP 2: QUANTUM ── */}
        {step === 'quantum' && (
          <>
            <div style={{ textAlign: 'center' as const, marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
                {Icons.quantum(52, cur.color)}
              </div>
              <h1 style={{ color: 'hsl(0 0% 92%)', fontSize: '26px', fontWeight: '700', margin: '0 0 6px' }}>Authorize Mint</h1>
              <p style={{ color: 'hsl(0 0% 35%)', fontSize: '14px', ...mono, margin: 0 }}>Quantum-sign your {parseFloat(amount).toLocaleString()} {cur.label} issuance</p>
            </div>

            {/* QSK — shown BEFORE signing */}
            <div style={{ background: 'hsl(220 12% 8%)', border: '2px solid hsl(0 84% 60% / 0.4)', borderRadius: '18px', padding: '20px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {Icons.key(16, 'hsl(0 84% 60%)')}
                  <div>
                    <p style={{ color: 'hsl(0 84% 60%)', fontWeight: '700', fontSize: '13px', margin: '0 0 2px' }}>Your Quantum Signing Key (QSK)</p>
                    <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, margin: 0 }}>Save this now — before you authorize below</p>
                  </div>
                </div>
                <CopyBtn text={qSigningKey} id="qsk-early" />
              </div>
              <div style={{ background: 'hsl(220 15% 4%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '12px', padding: '16px', textAlign: 'center' as const }}>
                <p style={{ color: 'hsl(0 84% 60%)', fontSize: '20px', fontWeight: '700', ...mono, letterSpacing: '0.04em', margin: 0, lineHeight: '1.6' }}>
                  {qSigningKey}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', marginTop: '10px' }}>
                {Icons.warning(13, 'hsl(0 0% 30%)')}
                <p style={{ color: 'hsl(0 0% 32%)', fontSize: '11px', ...mono, margin: 0, lineHeight: '1.5' }}>Store offline. This key authorizes all future {cur.label} transfers on this account. Shown once only.</p>
              </div>
            </div>

            {/* OTP */}
            <div style={{ background: 'hsl(220 12% 8%)', border: `1px solid ${cur.color}20`, borderRadius: '18px', padding: '24px', marginBottom: '14px', textAlign: 'center' as const }}>
              <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0 0 12px' }}>One-Time Code</p>
              <p style={{ color: 'hsl(0 0% 92%)', fontSize: '52px', fontWeight: '700', ...mono, letterSpacing: '0.5em', margin: '0 0 8px', lineHeight: '1' }}>{otpCode}</p>
              <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, margin: 0 }}>Expires {otpExpires ? new Date(otpExpires).toLocaleTimeString() : ''}</p>
            </div>

            {/* Quantum public key */}
            <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '14px', padding: '14px 16px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {Icons.key(13, 'hsl(0 0% 28%)')}
                  <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', margin: 0 }}>Quantum Public Key</p>
                  <span style={{ fontSize: '9px', ...mono, color: 'hsl(142 76% 36%)', background: 'hsl(142 76% 36% / 0.1)', borderRadius: '20px', padding: '2px 7px', border: '1px solid hsl(142 76% 36% / 0.3)' }}>Safe to share</span>
                </div>
                <CopyBtn text={qPubKey} id="qpub" />
              </div>
              <p style={{ color: 'hsl(38 92% 50%)', fontSize: '10px', ...mono, wordBreak: 'break-all' as const, lineHeight: '1.5', margin: 0 }}>{qPubKey?.slice(0, 72)}...</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'hsl(205 85% 55% / 0.05)', border: '1px solid hsl(205 85% 55% / 0.15)', borderRadius: '10px', padding: '12px 14px', marginBottom: '20px' }}>
              {Icons.shield(14, 'hsl(205 85% 55%)')}
              <p style={{ color: 'hsl(0 0% 38%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>
                Enter your OTP code and Protocol Second Key to authorize. The Protocol Second Key is from your wallet creation — <strong style={{ color: 'hsl(0 0% 60%)' }}>not your QSK</strong>.
              </p>
            </div>

            <label style={{ display: 'block', color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Enter OTP Code</label>
            <input value={otpInput} onChange={e => setOtpInput(e.target.value)} placeholder="Enter the 6-digit code above" style={fieldStyle} autoFocus />

            <label style={{ display: 'block', color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Protocol Authorization Key</label>
            <input value={secondKey} onChange={e => setSecondKey(e.target.value)} placeholder="Your protocol second key from wallet creation" type="password" style={{ ...fieldStyle, marginBottom: '4px' }} />
            <p style={{ color: 'hsl(0 0% 24%)', fontSize: '11px', ...mono, margin: '0 0 20px' }}>This is different from your QSK — it was shown when you created your wallet.</p>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.25)', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px' }}>
                {Icons.warning(14, 'hsl(0 84% 60%)')}
                <p style={{ color: 'hsl(0 84% 60%)', fontSize: '13px', ...mono, margin: 0 }}>{error}</p>
              </div>
            )}

            <button onClick={verifyAndMint} disabled={!otpInput || !secondKey || loading} style={{ width: '100%', background: otpInput && secondKey && !loading ? `linear-gradient(135deg, ${cur.color}, ${cur.color}bb)` : 'hsl(220 10% 12%)', color: otpInput && secondKey && !loading ? 'white' : 'hsl(0 0% 28%)', border: 'none', borderRadius: '16px', padding: '18px', fontSize: '17px', fontWeight: '700', cursor: otpInput && secondKey && !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', boxShadow: otpInput && secondKey && !loading ? `0 0 40px ${cur.color}35` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {Icons.quantum(20, otpInput && secondKey && !loading ? 'white' : 'hsl(0 0% 28%)')}
              {loading ? 'Minting...' : `Authorize & Mint ${cur.label}`}
            </button>
          </>
        )}

        {/* ── STEP 3: DONE ── */}
        {step === 'done' && (
          <>
            <div style={{ textAlign: 'center' as const, marginBottom: '28px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'hsl(142 76% 36% / 0.1)', border: '2px solid hsl(142 76% 36% / 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                {Icons.check(36, 'hsl(142 76% 36%)')}
              </div>
              <h1 style={{ color: 'hsl(0 0% 92%)', fontSize: '26px', fontWeight: '700', margin: '0 0 6px' }}>Minted Successfully</h1>
              <p style={{ color: cur.color, fontSize: '14px', ...mono, margin: 0 }}>{parseFloat(amount).toLocaleString()} {cur.label} · Quantum-authorized</p>
            </div>

            {/* QSK — final display */}
            <div style={{ background: 'hsl(220 12% 8%)', border: '2px solid hsl(0 84% 60% / 0.45)', borderRadius: '20px', padding: '24px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {Icons.key(18, 'hsl(0 84% 60%)')}
                  <div>
                    <p style={{ color: 'hsl(0 84% 60%)', fontWeight: '700', fontSize: '14px', margin: '0 0 2px' }}>Quantum Signing Key (QSK)</p>
                    <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, margin: 0 }}>Shown once only · Never stored by UBTC</p>
                  </div>
                </div>
                <CopyBtn text={qSigningKey} id="qsk-final" />
              </div>
              <div style={{ background: 'hsl(220 15% 4%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '14px', padding: '20px', textAlign: 'center' as const, marginBottom: '14px' }}>
                <p style={{ color: 'hsl(0 84% 60%)', fontSize: '22px', fontWeight: '700', ...mono, letterSpacing: '0.04em', margin: 0, lineHeight: '1.6' }}>
                  {qSigningKey}
                </p>
              </div>
              <p style={{ color: 'hsl(0 0% 32%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>
                This key authorizes all future {cur.label} transfers. It works for UBTC, UUSDT and UUSDC on this account. Store it offline like a seed phrase.
              </p>
            </div>

            {/* Mint summary */}
            <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '16px', padding: '18px', marginBottom: '14px' }}>
              <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 12px' }}>Mint Summary</p>
              {[
                { icon: Icons.mint(13, cur.color), label: 'Minted', value: parseFloat(amount).toLocaleString() + ' ' + cur.label },
                { icon: Icons.lock(13, 'hsl(0 0% 35%)'), label: 'Backing', value: isStable ? `$${parseFloat(amount).toLocaleString()} ${tokenName} locked` : `150% BTC collateral` },
                { icon: Icons.shield(13, 'hsl(142 76% 36%)'), label: 'Authorization', value: 'OTP ✓ · Second Key ✓ · Dilithium3 ✓' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid hsl(220 10% 11%)', gap: '12px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {item.icon}
                    <p style={{ color: 'hsl(0 0% 32%)', fontSize: '12px', ...mono, margin: 0 }}>{item.label}</p>
                  </div>
                  <p style={{ color: 'hsl(0 0% 75%)', fontSize: '12px', fontWeight: '600', ...mono, margin: 0, textAlign: 'right' as const }}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Confirm saved */}
            <div onClick={() => setKeySaved(!keySaved)} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'hsl(220 12% 8%)', border: `1px solid ${keySaved ? 'hsl(142 76% 36% / 0.4)' : 'hsl(220 10% 14%)'}`, borderRadius: '14px', padding: '16px', marginBottom: '20px', cursor: 'pointer' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${keySaved ? 'hsl(142 76% 36%)' : 'hsl(220 10% 28%)'}`, background: keySaved ? 'hsl(142 76% 36%)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                {keySaved && Icons.check(13, 'white')}
              </div>
              <p style={{ color: 'hsl(0 0% 48%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.6' }}>I have saved my Quantum Signing Key. I understand it cannot be recovered by UBTC.</p>
            </div>

            <button onClick={() => { if (keySaved) window.location.href = `/account/${vaultId}?currency=${activeCurrency}` }} disabled={!keySaved} style={{ width: '100%', background: keySaved ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : 'hsl(220 10% 12%)', color: keySaved ? 'white' : 'hsl(0 0% 28%)', border: 'none', borderRadius: '16px', padding: '18px', fontSize: '17px', fontWeight: '700', cursor: keySaved ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', boxShadow: keySaved ? '0 0 40px hsl(205 85% 55% / 0.4)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {Icons.chevronRight(20, keySaved ? 'white' : 'hsl(0 0% 28%)')}
              {keySaved ? 'View Account' : 'Check the box above to continue'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function MintPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(0 0% 28%)', fontFamily: 'var(--font-mono)' }}>Loading...</div>}>
      <MintContent />
    </Suspense>
  )
}
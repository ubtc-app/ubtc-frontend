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
  const [maxWarningAcknowledged, setMaxWarningAcknowledged] = useState(false)
  const [alertEmail, setAlertEmail] = useState('')
  const [alertPhone, setAlertPhone] = useState('')

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
  const maxStable = activeCurrency === 'uusdt' ? Math.max(0, uusdtDeposited - uusdtMinted) : Math.max(0, uusdcDeposited - uusdcMinted)
  const maxAmount = isStable ? maxStable : maxUbtc
  const safeMaxUbtc = Math.max(0, maxUbtc - 50)
  const displayMax = isStable ? maxStable : safeMaxUbtc

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
      setOtpId(data.otp_id); setOtpCode(data.otp_code); setOtpExpires(data.expires_at); setQPubKey(data.pq_public_key)
      setStep('quantum')
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const verifyAndMint = async () => {
    if (!otpInput || !secondKey) return
    setLoading(true); setError('')
    try {
      // vault_id is required so backend checks the correct PSK hash per vault
      const verifyRes = await fetch(`${API_URL}/wallet/otp/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp_id: otpId, otp_code: otpInput, second_key: secondKey, vault_id: vaultId })
      })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok || !verifyData.verified) throw new Error(verifyData.error || 'Invalid OTP or second key')

      if (isStable) {
        const currency = activeCurrency === 'uusdt' ? 'UUSDT' : 'UUSDC'
        const existingSc = scVaults.find(s => s.currency === currency)
        let scVaultId: string
        if (existingSc) { scVaultId = existingSc.vault_id } else {
          const depRes = await fetch(`${API_URL}/stablecoin/deposit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currency, amount, account_type: accountType }) })
          const depData = await depRes.json()
          if (!depRes.ok) throw new Error(depData.error)
          scVaultId = depData.vault_id
        }
        const mintRes = await fetch(`${API_URL}/stablecoin/mint`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vault_id: scVaultId, amount }) })
        const mintData = await mintRes.json()
        if (!mintRes.ok) throw new Error(mintData.error)
        setMintResult(mintData)
      } else {
        const mintRes = await fetch(`${API_URL}/mint`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vault_id: vaultId, ubtc_amount: amount }) })
        const mintData = await mintRes.json()
        if (!mintRes.ok) throw new Error(mintData.error)
        setMintResult(mintData)
      }
      setStep('done')
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const parsedAmount = parseFloat(amount || '0')
  const isMaxAmount = !isStable && displayMax > 0 && parsedAmount >= displayMax * 0.99
  const totalUbtcAfterMint = ubtcMinted + parsedAmount
  const liqPrice = btcLocked > 0 ? Math.round((totalUbtcAfterMint * 1.10) / btcLocked) : 0
  const alert120Price = btcLocked > 0 ? Math.round((totalUbtcAfterMint * 1.20) / btcLocked) : 0
  const alert115Price = btcLocked > 0 ? Math.round((totalUbtcAfterMint * 1.15) / btcLocked) : 0
  const canProceed = !!amount && parsedAmount > 0 && parsedAmount <= maxAmount && vault?.status === 'active' && (!isMaxAmount || maxWarningAcknowledged)
  const fieldStyle: any = { display: 'block', width: '100%', padding: '14px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '12px', color: 'hsl(0 0% 92%)', fontSize: '14px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '12px' }

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', fontFamily: 'var(--font-display)' }}>
      <div style={{ background: 'hsl(220 15% 5%)', borderBottom: '1px solid hsl(220 10% 10%)', height: '60px', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '16px' }}>
        <a href={`/account/${vaultId}?currency=${activeCurrency}`} style={{ color: 'hsl(0 0% 40%)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>{Icons.back(20, 'hsl(0 0% 40%)')}</a>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
          {['amount', 'quantum', 'done'].map((s, i) => (
            <div key={s} style={{ width: step === s ? '24px' : '8px', height: '8px', borderRadius: '4px', background: ['amount', 'quantum', 'done'].indexOf(step) >= i ? cur.color : 'hsl(220 10% 18%)', transition: 'all 0.3s' }} />
          ))}
        </div>
        <span style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{step === 'amount' ? 'Amount' : step === 'quantum' ? 'Authorize' : 'Done'}</span>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '36px 20px' }}>

        {step === 'amount' && (
          <>
            <div style={{ textAlign: 'center' as const, marginBottom: '32px' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '22px', background: cur.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>{cur.icon(32, cur.color)}</div>
              <h1 style={{ color: 'hsl(0 0% 92%)', fontSize: '28px', fontWeight: '700', margin: '0 0 6px' }}>Mint {cur.label}</h1>
              <p style={{ color: 'hsl(0 0% 35%)', fontSize: '14px', ...mono, margin: 0 }}>{cur.sub}</p>
            </div>

            <div style={{ display: 'flex', background: 'hsl(220 12% 8%)', borderRadius: '16px', padding: '4px', gap: '4px', marginBottom: '24px' }}>
              {currencies.map(c => (
                <button key={c.key} onClick={() => { setActiveCurrency(c.key); setAmount(''); setError(''); setMaxWarningAcknowledged(false) }} style={{ flex: 1, background: activeCurrency === c.key ? 'hsl(220 15% 14%)' : 'transparent', border: activeCurrency === c.key ? `1px solid ${c.color}35` : '1px solid transparent', borderRadius: '12px', padding: '11px 6px', cursor: 'pointer', fontFamily: 'var(--font-display)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '6px' }}>
                  {c.icon(18, activeCurrency === c.key ? c.color : 'hsl(0 0% 35%)')}
                  <span style={{ fontSize: '11px', fontWeight: '600', color: activeCurrency === c.key ? 'hsl(0 0% 88%)' : 'hsl(0 0% 38%)' }}>{c.label}</span>
                </button>
              ))}
            </div>

            <div style={{ background: 'hsl(220 12% 8%)', border: `1px solid ${cur.color}18`, borderRadius: '22px', padding: '24px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Amount to mint</p>
                <button onClick={() => { setAmount(Math.floor(displayMax).toString()); setMaxWarningAcknowledged(false) }} style={{ background: cur.color + '12', border: `1px solid ${cur.color}28`, color: cur.color, borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', ...mono }}>Max ${displayMax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
                <input value={amount} onChange={e => { setAmount(e.target.value); setMaxWarningAcknowledged(false) }} placeholder="0" type="number" autoFocus style={{ flex: 1, background: 'transparent', border: 'none', color: cur.color, fontSize: '48px', fontWeight: '700', fontFamily: 'var(--font-mono)', outline: 'none', padding: '0', width: '100%' }} />
                <span style={{ color: cur.color, fontSize: '18px', fontWeight: '700', ...mono, flexShrink: 0 }}>{cur.label}</span>
              </div>
              <div style={{ height: '1px', background: 'hsl(220 10% 13%)', marginBottom: '14px' }} />
              <div style={{ display: 'flex', gap: '6px' }}>
                {[25, 50, 75, 100].map(pct => (
                  <button key={pct} onClick={() => { setAmount(Math.floor(displayMax * pct / 100).toString()); setMaxWarningAcknowledged(false) }} style={{ flex: 1, background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 13%)', color: 'hsl(0 0% 38%)', borderRadius: '9px', padding: '9px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', ...mono }}>{pct}%</button>
                ))}
              </div>
            </div>

            {!isStable && vault?.status === 'active' && (
              <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '16px', padding: '16px', marginBottom: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                {[
                  { label: 'BTC Locked', value: btcLocked.toFixed(4) + ' BTC', color: 'hsl(38 92% 50%)' },
                  { label: 'Minted', value: '$' + ubtcMinted.toLocaleString(undefined, { maximumFractionDigits: 0 }), color: 'hsl(205 85% 55%)' },
                  { label: 'BTC Price', value: '$' + btcPrice.toLocaleString(), color: 'hsl(0 0% 45%)' },
                ].map(item => (
                  <div key={item.label} style={{ textAlign: 'center' as const }}>
                    <p style={{ color: 'hsl(0 0% 28%)', fontSize: '9px', ...mono, textTransform: 'uppercase', margin: '0 0 5px' }}>{item.label}</p>
                    <p style={{ color: item.color, fontWeight: '700', fontSize: '13px', ...mono, margin: 0 }}>{item.value}</p>
                  </div>
                ))}
              </div>
            )}

            {isMaxAmount && (
              <div style={{ background: 'hsl(0 84% 60% / 0.07)', border: '2px solid hsl(0 84% 60% / 0.5)', borderRadius: '18px', padding: '22px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  {Icons.warning(18, 'hsl(0 84% 60%)')}
                  <p style={{ color: 'hsl(0 84% 60%)', fontWeight: '700', fontSize: '14px', ...mono, margin: 0 }}>Liquidation Risk Warning</p>
                </div>
                <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '12px', padding: '4px', marginBottom: '14px' }}>
                  {[
                    { label: '120% — Early Warning', price: alert120Price, color: 'hsl(38 92% 50%)' },
                    { label: '115% — Danger Zone', price: alert115Price, color: 'hsl(38 70% 45%)' },
                    { label: '110% — LIQUIDATION', price: liqPrice, color: 'hsl(0 84% 60%)' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: i < 2 ? '1px solid hsl(220 10% 10%)' : 'none' }}>
                      <p style={{ color: item.color, fontSize: '11px', fontWeight: '700', ...mono, margin: 0 }}>{item.label}</p>
                      <p style={{ color: item.color, fontSize: '15px', fontWeight: '700', ...mono, margin: 0 }}>${item.price.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <input value={alertEmail} onChange={e => setAlertEmail(e.target.value)} placeholder="Email for liquidation alerts" type="email" style={{ display: 'block', width: '100%', padding: '12px 14px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 18%)', borderRadius: '10px', color: 'hsl(0 0% 88%)', fontSize: '13px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '8px' }} />
                <div onClick={() => setMaxWarningAcknowledged(!maxWarningAcknowledged)} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer', padding: '12px', background: maxWarningAcknowledged ? 'hsl(142 76% 36% / 0.08)' : 'hsl(220 15% 5%)', border: maxWarningAcknowledged ? '1px solid hsl(142 76% 36% / 0.4)' : '1px solid hsl(220 10% 16%)', borderRadius: '10px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '5px', border: maxWarningAcknowledged ? '2px solid hsl(142 76% 36%)' : '2px solid hsl(220 10% 30%)', background: maxWarningAcknowledged ? 'hsl(142 76% 36%)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {maxWarningAcknowledged && Icons.check(12, 'white')}
                  </div>
                  <p style={{ color: 'hsl(0 0% 55%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>I understand my vault will be liquidated if BTC drops to <strong style={{ color: 'hsl(0 84% 65%)' }}>${liqPrice.toLocaleString()}</strong>.</p>
                </div>
              </div>
            )}

            {error && <div style={{ background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.25)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px' }}><p style={{ color: 'hsl(0 84% 60%)', fontSize: '13px', ...mono, margin: 0 }}>{error}</p></div>}

            <button onClick={requestMint} disabled={!canProceed || loading} style={{ width: '100%', background: canProceed && !loading ? `linear-gradient(135deg, ${cur.color}, ${cur.color}bb)` : 'hsl(220 10% 12%)', color: canProceed && !loading ? 'white' : 'hsl(0 0% 28%)', border: 'none', borderRadius: '16px', padding: '18px', fontSize: '17px', fontWeight: '700', cursor: canProceed && !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {loading ? 'Generating OTP...' : !vault || vault.status !== 'active' ? 'Fund account first' : parsedAmount > maxAmount ? 'Amount too high' : isMaxAmount && !maxWarningAcknowledged ? 'Acknowledge the warning above' : `Mint ${amount || '0'} ${cur.label}`}
            </button>
          </>
        )}

        {step === 'quantum' && (
          <>
            <div style={{ textAlign: 'center' as const, marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>{Icons.quantum(52, cur.color)}</div>
              <h1 style={{ color: 'hsl(0 0% 92%)', fontSize: '26px', fontWeight: '700', margin: '0 0 6px' }}>Authorize Mint</h1>
              <p style={{ color: 'hsl(0 0% 35%)', fontSize: '14px', ...mono, margin: 0 }}>Quantum-sign your {parseFloat(amount).toLocaleString()} {cur.label} issuance</p>
            </div>

            <div style={{ background: 'hsl(220 12% 8%)', border: `1px solid ${cur.color}20`, borderRadius: '18px', padding: '24px', marginBottom: '14px', textAlign: 'center' as const }}>
              <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0 0 12px' }}>One-Time Code</p>
              <p style={{ color: 'hsl(0 0% 92%)', fontSize: '52px', fontWeight: '700', ...mono, letterSpacing: '0.5em', margin: '0 0 8px', lineHeight: '1' }}>{otpCode}</p>
              <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, margin: 0 }}>Expires {otpExpires ? new Date(otpExpires).toLocaleTimeString() : ''}</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'hsl(205 85% 55% / 0.05)', border: '1px solid hsl(205 85% 55% / 0.15)', borderRadius: '10px', padding: '12px 14px', marginBottom: '20px' }}>
              {Icons.shield(14, 'hsl(205 85% 55%)')}
              <p style={{ color: 'hsl(0 0% 38%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>Enter your OTP and Protocol Second Key — the key shown when you created your account (not your QSK).</p>
            </div>

            <label style={{ display: 'block', color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Enter OTP Code</label>
            <input value={otpInput} onChange={e => setOtpInput(e.target.value)} placeholder="Enter the 6-digit code above" style={fieldStyle} autoFocus />

            <label style={{ display: 'block', color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Protocol Authorization Key</label>
            <input value={secondKey} onChange={e => setSecondKey(e.target.value)} placeholder="Your protocol second key from account creation" type="password" style={{ ...fieldStyle, marginBottom: '4px' }} />
            <p style={{ color: 'hsl(0 0% 24%)', fontSize: '11px', ...mono, margin: '0 0 20px' }}>Found in your downloaded key file as "protocol_second_key".</p>

            {error && <div style={{ background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.25)', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px' }}><p style={{ color: 'hsl(0 84% 60%)', fontSize: '13px', ...mono, margin: 0 }}>{error}</p></div>}

            <button onClick={verifyAndMint} disabled={!otpInput || !secondKey || loading} style={{ width: '100%', background: otpInput && secondKey && !loading ? `linear-gradient(135deg, ${cur.color}, ${cur.color}bb)` : 'hsl(220 10% 12%)', color: otpInput && secondKey && !loading ? 'white' : 'hsl(0 0% 28%)', border: 'none', borderRadius: '16px', padding: '18px', fontSize: '17px', fontWeight: '700', cursor: otpInput && secondKey && !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {Icons.quantum(20, otpInput && secondKey && !loading ? 'white' : 'hsl(0 0% 28%)')}
              {loading ? 'Minting...' : `Authorize & Mint ${cur.label}`}
            </button>
          </>
        )}

        {step === 'done' && (
          <>
            <div style={{ textAlign: 'center' as const, marginBottom: '28px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'hsl(142 76% 36% / 0.1)', border: '2px solid hsl(142 76% 36% / 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                {Icons.check(36, 'hsl(142 76% 36%)')}
              </div>
              <h1 style={{ color: 'hsl(0 0% 92%)', fontSize: '26px', fontWeight: '700', margin: '0 0 6px' }}>Minted Successfully</h1>
              <p style={{ color: cur.color, fontSize: '14px', ...mono, margin: 0 }}>{parseFloat(amount).toLocaleString()} {cur.label} · Quantum-authorized</p>
            </div>

            <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '16px', padding: '18px', marginBottom: '14px' }}>
              <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 12px' }}>Mint Summary</p>
              {[
                { label: 'Minted', value: parseFloat(amount).toLocaleString() + ' ' + cur.label },
                { label: 'Vault', value: vaultId },
                { label: 'Backing', value: isStable ? `$${parseFloat(amount).toLocaleString()} ${tokenName} locked` : '150% BTC collateral' },
                { label: 'Authorization', value: 'OTP · Second Key · Quantum' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid hsl(220 10% 11%)', gap: '12px', alignItems: 'center' }}>
                  <p style={{ color: 'hsl(0 0% 32%)', fontSize: '12px', ...mono, margin: 0 }}>{item.label}</p>
                  <p style={{ color: 'hsl(0 0% 75%)', fontSize: '12px', fontWeight: '600', ...mono, margin: 0, textAlign: 'right' as const, wordBreak: 'break-all' as const }}>{item.value}</p>
                </div>
              ))}
            </div>

            <div onClick={() => setKeySaved(!keySaved)} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'hsl(220 12% 8%)', border: `1px solid ${keySaved ? 'hsl(142 76% 36% / 0.4)' : 'hsl(220 10% 14%)'}`, borderRadius: '14px', padding: '16px', marginBottom: '20px', cursor: 'pointer' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${keySaved ? 'hsl(142 76% 36%)' : 'hsl(220 10% 28%)'}`, background: keySaved ? 'hsl(142 76% 36%)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                {keySaved && Icons.check(13, 'white')}
              </div>
              <p style={{ color: 'hsl(0 0% 48%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.6' }}>I have noted my vault details and saved my key file.</p>
            </div>

            <button onClick={() => { if (keySaved) window.location.href = `/account/${vaultId}?currency=${activeCurrency}` }} disabled={!keySaved} style={{ width: '100%', background: keySaved ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : 'hsl(220 10% 12%)', color: keySaved ? 'white' : 'hsl(0 0% 28%)', border: 'none', borderRadius: '16px', padding: '18px', fontSize: '17px', fontWeight: '700', cursor: keySaved ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
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
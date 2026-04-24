'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { API_URL } from '../lib/supabase'
import { Icons } from '../components/Icons'

function RiskGauge({ pct, collateralRatio, liqPrice, alert120, alert115, ubtcAmount }: {
  pct: number; collateralRatio: number; liqPrice: number; alert120: number; alert115: number; ubtcAmount: number
}) {
  const CX = 210, CY = 140, R = 115, ZONE = 75
  const isAmber = pct >= ZONE
  const needleColor = isAmber ? 'hsl(38 92% 50%)' : 'hsl(142 76% 36%)'
  const mono = 'var(--font-mono)'
  const c = Math.min(Math.max(pct, 0), 100)

  function pt(deg: number, r: number) {
    const rad = deg * Math.PI / 180
    return { x: CX + r * Math.cos(rad), y: CY - r * Math.sin(rad) }
  }
  function arcPath(p1: number, p2: number) {
    const s = pt(180 - p1 * 1.8, R), e = pt(180 - p2 * 1.8, R)
    return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} A ${R} ${R} 0 ${(p2 - p1) * 1.8 >= 180 ? 1 : 0} 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)}`
  }

  const tip = pt(180 - c * 1.8, R - 10)

  return (
    <div style={{ background: 'hsl(220 12% 7%)', border: `1px solid ${isAmber ? 'hsl(38 92% 50% / 0.2)' : 'hsl(220 10% 11%)'}`, borderRadius: '18px', padding: '16px 16px 14px', transition: 'border-color 0.3s' }}>
      <svg viewBox="0 -18 420 190" style={{ width: '100%', display: 'block' }}>
        {/* Muted background zones */}
        <path d="M 95 140 A 115 115 0 0 1 291 59" fill="none" stroke="hsl(142 40% 8%)" strokeWidth="22" strokeLinecap="butt" />
        <path d="M 291 59 A 115 115 0 0 1 325 140" fill="none" stroke="hsl(38 40% 8%)" strokeWidth="22" strokeLinecap="round" />
        {/* Active fill */}
        {c > 0 && c <= ZONE && (
          <path d={arcPath(0, c)} fill="none" stroke="hsl(142 76% 36%)" strokeWidth="22" strokeLinecap="round" />
        )}
        {c > 0 && c > ZONE && (
          <>
            <path d={arcPath(0, ZONE)} fill="none" stroke="hsl(142 76% 36%)" strokeWidth="22" strokeLinecap="butt" />
            <path d={arcPath(ZONE, c)} fill="none" stroke="hsl(38 92% 50%)" strokeWidth="22" strokeLinecap="round" />
          </>
        )}
        {/* Track start cap */}
        <path d="M 95 140 A 115 115 0 0 1 96 137" fill="none" stroke={c > 0 ? 'hsl(142 76% 36%)' : 'hsl(220 10% 10%)'} strokeWidth="22" strokeLinecap="round" />
        {/* Tick marks */}
        <line x1="140" y1="94" x2="124" y2="78" stroke="hsl(220 15% 3%)" strokeWidth="2" />
        <line x1="210" y1="55" x2="210" y2="33" stroke="hsl(220 15% 3%)" strokeWidth="2" />
        <line x1="280" y1="94" x2="296" y2="78" stroke="hsl(220 15% 3%)" strokeWidth="2" />
        {/* Tick labels — outside the arc (radius 138 from centre) */}
        <text x="112" y="46" fontSize="9" textAnchor="middle" fill="hsl(0 0% 72%)" fontFamily={mono}>25%</text>
        <text x="210" y="4" fontSize="9" textAnchor="middle" fill="hsl(0 0% 72%)" fontFamily={mono}>50%</text>
        <text x="308" y="46" fontSize="9" textAnchor="middle" fill="hsl(0 0% 72%)" fontFamily={mono}>75%</text>
        {/* Zone end labels */}
        <text x="78" y="170" fontSize="10" fontWeight="600" textAnchor="middle" fill="hsl(142 50% 28%)" fontFamily={mono}>Safe</text>
        <text x="342" y="170" fontSize="10" fontWeight="600" textAnchor="start" fill="hsl(38 65% 36%)" fontFamily={mono}>Caution</text>
        {/* Needle */}
        {c > 0 && <line x1={CX} y1={CY} x2={tip.x.toFixed(1)} y2={tip.y.toFixed(1)} stroke={needleColor} strokeWidth="2.5" strokeLinecap="round" />}
        <circle cx={CX} cy={CY} r="5" fill="hsl(220 15% 7%)" stroke={c > 0 ? needleColor : 'hsl(220 10% 15%)'} strokeWidth="2.5" />
      </svg>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '6px' }}>
        {[
          { label: 'Collateral ratio', value: c > 0 ? `${Math.round(collateralRatio)}%` : '—', color: isAmber ? 'hsl(38 92% 50%)' : 'hsl(142 76% 36%)' },
          { label: 'UBTC to mint', value: c > 0 ? ubtcAmount.toFixed(2) : '—', color: 'hsl(205 85% 55%)' },
          { label: 'Liquidation if BTC hits', value: c > 0 ? `$${liqPrice.toLocaleString()}` : '—', color: 'hsl(0 84% 62%)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'hsl(220 15% 5%)', borderRadius: '10px', padding: '8px 10px' }}>
            <p style={{ color: 'hsl(0 0% 62%)', fontSize: '9px', fontFamily: mono, textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 4px' }}>{s.label}</p>
            <p style={{ color: s.color, fontSize: '13px', fontWeight: '700', fontFamily: mono, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Status text */}
      {c > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '10px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: needleColor, flexShrink: 0 }} />
          <p style={{ fontSize: '11px', color: isAmber ? 'hsl(38 75% 45%)' : 'hsl(142 50% 30%)', fontFamily: mono, margin: 0 }}>
            {isAmber
              ? `Caution — your vault collateralises at ${Math.round(collateralRatio)}%. BTC would need to drop to $${liqPrice.toLocaleString()} to trigger liquidation.`
              : `Safe — you are well above the liquidation threshold. BTC would need to drop to $${liqPrice.toLocaleString()} to affect your vault.`}
          </p>
        </div>
      )}
    </div>
  )
}

function MintContent() {
  const searchParams = useSearchParams()
  const vaultId = searchParams.get('vault') || ''
  const currencyParam = (searchParams.get('currency') || 'ubtc').toLowerCase()

  const [vault, setVault] = useState<any>(null)
  const [stablecoins, setStablecoins] = useState<any[]>([])
  const [btcPrice, setBtcPrice] = useState(0)
  const [activeCurrency, setActiveCurrency] = useState(currencyParam)
  const [amount, setAmount] = useState('')
  const [selectedPct, setSelectedPct] = useState(0)
  const [step, setStep] = useState<'amount' | 'quantum' | 'done'>('amount')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [otpId, setOtpId] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpExpires, setOtpExpires] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [secondKey, setSecondKey] = useState('')
  const [mintResult, setMintResult] = useState<any>(null)
  const [keySaved, setKeySaved] = useState(false)
  const [copied, setCopied] = useState('')
  const [maxWarningAcknowledged, setMaxWarningAcknowledged] = useState(false)
  const [alertEmail, setAlertEmail] = useState('')
  const [alertPhone, setAlertPhone] = useState('')
  const [alertSaved, setAlertSaved] = useState(false)

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
    navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(''), 2000)
  }

  const btcLocked = (vault?.btc_amount_sats || 0) / 100_000_000
  const btcValue = btcLocked * btcPrice
  const ubtcMinted = parseFloat(vault?.ubtc_minted || '0')
  // maxUbtc = true maximum mintable at 150% collateral requirement
  const maxUbtc = Math.max(0, (btcValue / 1.5) - ubtcMinted)
  const accountType = vault?.account_type || ''
  const scVaults = stablecoins.filter(s => s.account_type === accountType)
  const uusdtDeposited = scVaults.filter(s => s.currency === 'UUSDT').reduce((s, x) => s + parseFloat(x.deposited_amount || '0'), 0)
  const uusdtMinted = scVaults.filter(s => s.currency === 'UUSDT').reduce((s, x) => s + parseFloat(x.balance || '0'), 0)
  const uusdcDeposited = scVaults.filter(s => s.currency === 'UUSDC').reduce((s, x) => s + parseFloat(x.deposited_amount || '0'), 0)
  const uusdcMinted = scVaults.filter(s => s.currency === 'UUSDC').reduce((s, x) => s + parseFloat(x.balance || '0'), 0)
  const maxStable = activeCurrency === 'uusdt' ? Math.max(0, uusdtDeposited - uusdtMinted) : Math.max(0, uusdcDeposited - uusdcMinted)
  const maxAmount = isStable ? maxStable : maxUbtc

  // % button click — uses maxUbtc directly so amount is always non-zero
  const handlePct = (pct: number) => {
    if (maxUbtc <= 0) return
    const amt = maxUbtc * pct / 100
    setAmount(amt.toFixed(2))
    setSelectedPct(pct)
    setMaxWarningAcknowledged(false)
  }

  const parsedAmount = parseFloat(amount || '0')

  // gaugeAmount: uses selectedPct*maxUbtc when a button was clicked, parsedAmount when manual
  const gaugeAmount = selectedPct > 0 && maxUbtc > 0
    ? maxUbtc * selectedPct / 100
    : parsedAmount

  // gaugePct: selectedPct directly when button clicked, computed when manual
  const gaugePct = !isStable
    ? (selectedPct > 0
        ? selectedPct
        : (maxUbtc > 0 && parsedAmount > 0 ? Math.min(100, parsedAmount / maxUbtc * 100) : 0))
    : 0

  const gaugeTotalUbtc = ubtcMinted + gaugeAmount
  const gaugeCollateralRatio = gaugeTotalUbtc > 0 && btcLocked > 0 ? (btcLocked * btcPrice / gaugeTotalUbtc) * 100 : 0
  const gaugeLiqPrice = btcLocked > 0 && gaugeTotalUbtc > 0 ? Math.round(gaugeTotalUbtc * 1.10 / btcLocked) : 0
  const gaugeAlert120 = btcLocked > 0 && gaugeTotalUbtc > 0 ? Math.round(gaugeTotalUbtc * 1.20 / btcLocked) : 0
  const gaugeAlert115 = btcLocked > 0 && gaugeTotalUbtc > 0 ? Math.round(gaugeTotalUbtc * 1.15 / btcLocked) : 0

  // For the actual mint submission
  const totalUbtcAfterMint = ubtcMinted + parsedAmount
  const isMaxAmount = !isStable && maxUbtc > 0 && parsedAmount >= maxUbtc * 0.99
  const canProceed = !!amount && parsedAmount > 0 && parsedAmount <= maxAmount && vault?.status === 'active' && (!isMaxAmount || maxWarningAcknowledged)

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
      setOtpId(data.otp_id); setOtpCode(data.otp_code); setOtpExpires(data.expires_at)
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
        body: JSON.stringify({ otp_id: otpId, otp_code: otpInput, second_key: secondKey, vault_id: vaultId })
      })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok || !verifyData.verified) throw new Error(verifyData.error || 'Invalid OTP or second key')
      if (isStable) {
        const currency = activeCurrency === 'uusdt' ? 'UUSDT' : 'UUSDC'
        const existingSc = scVaults.find(s => s.currency === currency)
        let scVaultId: string
        if (existingSc) { scVaultId = existingSc.vault_id }
        else {
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

  const fieldStyle: any = { display: 'block', width: '100%', padding: '14px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '12px', color: 'hsl(0 0% 92%)', fontSize: '14px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '12px' }
  const inputSmall: any = { flex: 1, padding: '10px 12px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', color: 'hsl(0 0% 80%)', fontSize: '13px', fontFamily: 'var(--font-mono)', outline: 'none', minWidth: 0 }

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', fontFamily: 'var(--font-display)' }}>

      {/* Header */}
      <div style={{ background: 'hsl(220 15% 5%)', borderBottom: '1px solid hsl(220 10% 10%)', height: '60px', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '16px' }}>
        <a href={`/account/${vaultId}?currency=${activeCurrency}`} style={{ color: 'hsl(0 0% 40%)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>{Icons.back(20, 'hsl(0 0% 40%)')}</a>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
          {['amount', 'quantum', 'done'].map((s, i) => (
            <div key={s} style={{ width: step === s ? '24px' : '8px', height: '8px', borderRadius: '4px', background: ['amount', 'quantum', 'done'].indexOf(step) >= i ? cur.color : 'hsl(220 10% 18%)', transition: 'all 0.3s' }} />
          ))}
        </div>
        <span style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
          {step === 'amount' ? 'Amount' : step === 'quantum' ? 'Authorize' : 'Done'}
        </span>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 20px' }}>

        {/* ── STEP 1 ── */}
        {step === 'amount' && (
          <>
            <div style={{ textAlign: 'center' as const, marginBottom: '26px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: cur.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>{cur.icon(28, cur.color)}</div>
              <h1 style={{ color: 'hsl(0 0% 92%)', fontSize: '26px', fontWeight: '700', margin: '0 0 4px' }}>Mint {cur.label}</h1>
              <p style={{ color: 'hsl(0 0% 35%)', fontSize: '13px', ...mono, margin: 0 }}>{cur.sub}</p>
            </div>

            {/* Currency tabs */}
            <div style={{ display: 'flex', background: 'hsl(220 12% 8%)', borderRadius: '14px', padding: '4px', gap: '4px', marginBottom: '18px' }}>
              {currencies.map(c => (
                <button key={c.key} onClick={() => { setActiveCurrency(c.key); setAmount(''); setSelectedPct(0); setError(''); setMaxWarningAcknowledged(false) }} style={{ flex: 1, background: activeCurrency === c.key ? 'hsl(220 15% 14%)' : 'transparent', border: activeCurrency === c.key ? `1px solid ${c.color}35` : '1px solid transparent', borderRadius: '10px', padding: '10px 6px', cursor: 'pointer', fontFamily: 'var(--font-display)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '5px' }}>
                  {c.icon(16, activeCurrency === c.key ? c.color : 'hsl(0 0% 35%)')}
                  <span style={{ fontSize: '11px', fontWeight: '600', color: activeCurrency === c.key ? 'hsl(0 0% 88%)' : 'hsl(0 0% 38%)' }}>{c.label}</span>
                </button>
              ))}
            </div>

            {/* Amount card */}
            <div style={{ background: 'hsl(220 12% 8%)', border: `1px solid ${cur.color}18`, borderRadius: '20px', padding: '20px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <p style={{ color: 'hsl(0 0% 26%)', fontSize: '10px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.15em', margin: 0 }}>Amount to mint</p>
                <button onClick={() => handlePct(100)} style={{ background: cur.color + '12', border: `1px solid ${cur.color}28`, color: cur.color, borderRadius: '7px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', ...mono }}>
                  Max {maxUbtc > 0 ? maxUbtc.toFixed(2) : '0'} UBTC
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '14px' }}>
                <input
                  value={amount}
                  onChange={e => { setAmount(e.target.value); setSelectedPct(0); setMaxWarningAcknowledged(false) }}
                  placeholder="0.00"
                  type="number"
                  autoFocus
                  style={{ flex: 1, background: 'transparent', border: 'none', color: cur.color, fontSize: '44px', fontWeight: '700', fontFamily: 'var(--font-mono)', outline: 'none', padding: '0', width: '100%' }}
                />
                <span style={{ color: cur.color, fontSize: '16px', fontWeight: '700', ...mono, flexShrink: 0 }}>{cur.label}</span>
              </div>
              <div style={{ height: '1px', background: 'hsl(220 10% 12%)', marginBottom: '12px' }} />
              <div style={{ display: 'flex', gap: '6px' }}>
                {[25, 50, 75, 100].map(pct => (
                  <button
                    key={pct}
                    onClick={() => handlePct(pct)}
                    style={{
                      flex: 1,
                      background: selectedPct === pct ? cur.color + '18' : 'hsl(220 15% 5%)',
                      border: selectedPct === pct ? `1px solid ${cur.color}50` : '1px solid hsl(220 10% 12%)',
                      color: selectedPct === pct ? cur.color : 'hsl(0 0% 36%)',
                      borderRadius: '8px', padding: '8px 0', fontSize: '12px', fontWeight: '600',
                      cursor: 'pointer', ...mono, transition: 'all 0.15s'
                    }}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Risk gauge — UBTC only */}
            {!isStable && vault?.status === 'active' && (
              <RiskGauge
                pct={gaugePct}
                collateralRatio={gaugeCollateralRatio}
                liqPrice={gaugeLiqPrice}
                alert120={gaugeAlert120}
                alert115={gaugeAlert115}
                ubtcAmount={gaugeAmount}
              />
            )}

            {/* 100% warning — full liquidation info + alerts */}
            {!isStable && isMaxAmount && (
              <div style={{ background: 'hsl(38 92% 50% / 0.05)', border: '1px solid hsl(38 92% 50% / 0.25)', borderRadius: '16px', padding: '18px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  {Icons.warning(15, 'hsl(38 92% 50%)')}
                  <p style={{ color: 'hsl(38 92% 50%)', fontWeight: '700', fontSize: '13px', ...mono, margin: 0 }}>Maximum mint — liquidation terms apply</p>
                </div>

                {/* Reassurance message */}
                <p style={{ color: 'hsl(0 0% 45%)', fontSize: '12px', ...mono, lineHeight: '1.7', margin: '0 0 14px' }}>
                  If BTC drops to <strong style={{ color: 'hsl(38 92% 55%)' }}>${gaugeLiqPrice.toLocaleString()}</strong>, your vault will automatically liquidate. This is not a loss of your Bitcoin — the remaining BTC, minus a small protocol fee, is returned directly to your wallet.
                </p>

                {/* Price thresholds */}
                <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '12px', overflow: 'hidden', marginBottom: '14px' }}>
                  {[
                    { label: 'First alert', sublabel: 'BTC drops to', price: gaugeAlert120, color: 'hsl(142 60% 38%)', bg: 'hsl(142 40% 6%)' },
                    { label: 'Top up urgently', sublabel: 'BTC drops to', price: gaugeAlert115, color: 'hsl(38 80% 48%)', bg: 'hsl(38 40% 6%)' },
                    { label: 'Auto-liquidation', sublabel: 'BTC drops to', price: gaugeLiqPrice, color: 'hsl(0 75% 58%)', bg: 'hsl(0 40% 6%)' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', background: item.bg, borderBottom: i < 2 ? '1px solid hsl(220 10% 10%)' : 'none' }}>
                      <div>
                        <p style={{ color: item.color, fontSize: '12px', fontWeight: '700', ...mono, margin: 0 }}>{item.label}</p>
                        <p style={{ color: 'hsl(0 0% 30%)', fontSize: '10px', ...mono, margin: '2px 0 0' }}>{item.sublabel}</p>
                      </div>
                      <p style={{ color: item.color, fontSize: '18px', fontWeight: '700', ...mono, margin: 0 }}>${item.price.toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                {/* Alert signup — only at 100% */}
                {!alertSaved ? (
                  <>
                    <p style={{ color: 'hsl(0 0% 30%)', fontSize: '11px', ...mono, margin: '0 0 8px' }}>
                      Add your contact details to receive alerts before each threshold
                    </p>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                      <input value={alertEmail} onChange={e => setAlertEmail(e.target.value)} placeholder="Email address" type="email" style={inputSmall} />
                      <input value={alertPhone} onChange={e => setAlertPhone(e.target.value)} placeholder="+971 mobile" type="tel" style={inputSmall} />
                      <button
                        onClick={() => { if (alertEmail || alertPhone) setAlertSaved(true) }}
                        disabled={!alertEmail && !alertPhone}
                        style={{ padding: '10px 14px', background: alertEmail || alertPhone ? 'hsl(38 92% 50%)' : 'hsl(220 10% 12%)', border: 'none', borderRadius: '10px', color: alertEmail || alertPhone ? 'hsl(220 15% 5%)' : 'hsl(0 0% 28%)', fontSize: '12px', fontWeight: '700', ...mono, cursor: alertEmail || alertPhone ? 'pointer' : 'not-allowed', flexShrink: 0 }}
                      >
                        Save
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'hsl(142 76% 36% / 0.08)', border: '1px solid hsl(142 76% 36% / 0.25)', borderRadius: '10px', marginBottom: '10px' }}>
                    {Icons.check(13, 'hsl(142 76% 36%)')}
                    <p style={{ color: 'hsl(142 76% 36%)', fontSize: '12px', ...mono, margin: 0 }}>Alerts saved — we will notify you at each threshold</p>
                  </div>
                )}

                {/* Acknowledgement checkbox */}
                <div
                  onClick={() => setMaxWarningAcknowledged(!maxWarningAcknowledged)}
                  style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', padding: '11px 12px', background: maxWarningAcknowledged ? 'hsl(142 76% 36% / 0.07)' : 'hsl(220 15% 5%)', border: maxWarningAcknowledged ? '1px solid hsl(142 76% 36% / 0.35)' : '1px solid hsl(220 10% 14%)', borderRadius: '10px' }}
                >
                  <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: maxWarningAcknowledged ? '2px solid hsl(142 76% 36%)' : '2px solid hsl(220 10% 26%)', background: maxWarningAcknowledged ? 'hsl(142 76% 36%)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                    {maxWarningAcknowledged && Icons.check(11, 'white')}
                  </div>
                  <p style={{ color: 'hsl(0 0% 50%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>
                    I understand my vault auto-liquidates if BTC drops to <strong style={{ color: 'hsl(38 92% 58%)' }}>${gaugeLiqPrice.toLocaleString()}</strong> and I will receive the remaining BTC back minus the protocol fee.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div style={{ background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.25)', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px' }}>
                <p style={{ color: 'hsl(0 84% 60%)', fontSize: '13px', ...mono, margin: 0 }}>{error}</p>
              </div>
            )}

            <button
              onClick={requestMint}
              disabled={!canProceed || loading}
              style={{ width: '100%', background: canProceed && !loading ? `linear-gradient(135deg, ${cur.color}, ${cur.color}bb)` : 'hsl(220 10% 12%)', color: canProceed && !loading ? 'white' : 'hsl(0 0% 28%)', border: 'none', borderRadius: '16px', padding: '18px', fontSize: '16px', fontWeight: '700', cursor: canProceed && !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {loading ? 'Generating OTP...'
                : !vault || vault.status !== 'active' ? 'Fund account first'
                : parsedAmount > maxAmount ? 'Amount too high'
                : isMaxAmount && !maxWarningAcknowledged ? 'Acknowledge the terms above'
                : `Mint ${amount || '0'} ${cur.label}`}
            </button>
          </>
        )}

        {/* ── STEP 2 ── */}
        {step === 'quantum' && (
          <>
            <div style={{ textAlign: 'center' as const, marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>{Icons.quantum(52, cur.color)}</div>
              <h1 style={{ color: 'hsl(0 0% 92%)', fontSize: '26px', fontWeight: '700', margin: '0 0 6px' }}>Authorize Mint</h1>
              <p style={{ color: 'hsl(0 0% 35%)', fontSize: '14px', ...mono, margin: 0 }}>Quantum-sign your {parseFloat(amount).toLocaleString()} {cur.label} issuance</p>
            </div>
            <div style={{ background: 'hsl(220 12% 8%)', border: `1px solid ${cur.color}20`, borderRadius: '18px', padding: '24px', marginBottom: '14px', textAlign: 'center' as const }}>
              <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.2em', margin: '0 0 12px' }}>One-Time Code</p>
              <p style={{ color: 'hsl(0 0% 92%)', fontSize: '52px', fontWeight: '700', ...mono, letterSpacing: '0.5em', margin: '0 0 8px', lineHeight: '1' }}>{otpCode}</p>
              <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, margin: 0 }}>Expires {otpExpires ? new Date(otpExpires).toLocaleTimeString() : ''}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'hsl(205 85% 55% / 0.05)', border: '1px solid hsl(205 85% 55% / 0.15)', borderRadius: '10px', padding: '12px 14px', marginBottom: '20px' }}>
              {Icons.shield(14, 'hsl(205 85% 55%)')}
              <p style={{ color: 'hsl(0 0% 38%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>Enter your OTP and Protocol Second Key — the key shown when you created your account (not your QSK).</p>
            </div>
            <label style={{ display: 'block', color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: '8px' }}>Enter OTP Code</label>
            <input value={otpInput} onChange={e => setOtpInput(e.target.value)} placeholder="Enter the 6-digit code above" style={fieldStyle} autoFocus />
          <label style={{ display: 'block', color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: '8px' }}>Protocol Authorization Key</label>
            <button
              onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json'; i.onchange = (e: any) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { try { const j = JSON.parse(ev.target?.result as string); const k = j?.protocol_second_key?.key || j?.protocol_second_key || ''; if (k) setSecondKey(k); else setError('Key file does not contain protocol_second_key'); } catch { setError('Invalid key file'); } }; r.readAsText(f); }; i.click(); }}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', background: secondKey ? 'hsl(142 76% 36% / 0.07)' : 'hsl(220 12% 8%)', border: `1px solid ${secondKey ? 'hsl(142 76% 36% / 0.4)' : 'hsl(220 10% 16%)'}`, borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', fontFamily: 'var(--font-display)', marginBottom: '4px' }}
            >
              <span style={{ fontSize: '20px', flexShrink: 0 }}>🔑</span>
              <div style={{ textAlign: 'left' as const }}>
                <p style={{ color: secondKey ? 'hsl(142 76% 45%)' : 'hsl(0 0% 75%)', fontSize: '13px', fontWeight: '600', margin: '0 0 2px' }}>
                  {secondKey ? '✅ Key file loaded — Protocol Second Key extracted' : 'Upload your key file'}
                </p>
                <p style={{ color: 'hsl(0 0% 35%)', fontSize: '11px', fontFamily: 'var(--font-mono)', margin: 0 }}>
                  {secondKey ? 'Ready to authorize' : 'Your downloaded ubtc-keys-*.json file'}
                </p>
              </div>
            </button>
            <p style={{ color: 'hsl(0 0% 24%)', fontSize: '11px', ...mono, margin: '4px 0 20px' }}>Or paste the protocol_second_key manually below</p>
            <input value={secondKey} onChange={e => setSecondKey(e.target.value)} placeholder="Or paste protocol second key manually..." type="password" style={{ ...fieldStyle, marginBottom: '4px' }} />
            {error && <div style={{ background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.25)', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px' }}><p style={{ color: 'hsl(0 84% 60%)', fontSize: '13px', ...mono, margin: 0 }}>{error}</p></div>}
            <button onClick={verifyAndMint} disabled={!otpInput || !secondKey || loading} style={{ width: '100%', background: otpInput && secondKey && !loading ? `linear-gradient(135deg, ${cur.color}, ${cur.color}bb)` : 'hsl(220 10% 12%)', color: otpInput && secondKey && !loading ? 'white' : 'hsl(0 0% 28%)', border: 'none', borderRadius: '16px', padding: '18px', fontSize: '16px', fontWeight: '700', cursor: otpInput && secondKey && !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {Icons.quantum(20, otpInput && secondKey && !loading ? 'white' : 'hsl(0 0% 28%)')}
              {loading ? 'Minting...' : `Authorize & Mint ${cur.label}`}
            </button>
          </>
        )}

        {/* ── STEP 3 ── */}
        {step === 'done' && (
          <>
            <div style={{ textAlign: 'center' as const, marginBottom: '28px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'hsl(142 76% 36% / 0.1)', border: '2px solid hsl(142 76% 36% / 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>{Icons.check(36, 'hsl(142 76% 36%)')}</div>
              <h1 style={{ color: 'hsl(0 0% 92%)', fontSize: '26px', fontWeight: '700', margin: '0 0 6px' }}>Minted Successfully</h1>
              <p style={{ color: cur.color, fontSize: '14px', ...mono, margin: 0 }}>{parseFloat(amount).toLocaleString()} {cur.label} · Quantum-authorized</p>
            </div>
            <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '16px', padding: '18px', marginBottom: '14px' }}>
              <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.15em', margin: '0 0 12px' }}>Mint Summary</p>
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
            <button onClick={() => { if (keySaved) window.location.href = `/account/${vaultId}?currency=${activeCurrency}` }} disabled={!keySaved} style={{ width: '100%', background: keySaved ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : 'hsl(220 10% 12%)', color: keySaved ? 'white' : 'hsl(0 0% 28%)', border: 'none', borderRadius: '16px', padding: '18px', fontSize: '16px', fontWeight: '700', cursor: keySaved ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
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
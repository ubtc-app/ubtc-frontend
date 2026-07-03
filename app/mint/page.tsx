'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { API_URL } from '../lib/supabase'
import { QuantumLoader } from '../components/QuantumLoader'
import { Icons } from '../components/Icons'
import { PasswordModal } from '../components/PasswordModal'
import { signedSpendWithPassword } from '../lib/wallet/challenge'

function RiskGauge({ pct, collateralRatio, liqPrice, alert120, alert115, ubtcAmount }: {
  pct: number; collateralRatio: number; liqPrice: number; alert120: number; alert115: number; ubtcAmount: number
}) {
  const CX = 210, CY = 140, R = 115, ZONE = 75
  const isAmber = pct >= ZONE
  const needleColor = isAmber ? 'var(--t-orange)' : 'var(--t-green)'
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
    <div style={{ background: 'linear-gradient(135deg,#080c1a,#04080e)', border: `1px solid ${isAmber ? 'rgba(255,184,0,0.25)' : 'rgba(0,212,255,0.12)'}`, borderRadius: '18px', padding: '16px 16px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', transition: 'border-color 0.3s' }}>
      <svg viewBox="0 -18 420 190" style={{ width: '100%', display: 'block' }}>
        <path d="M 95 140 A 115 115 0 0 1 291 59" fill="none" stroke="hsl(142 40% 8%)" strokeWidth="22" strokeLinecap="butt" />
        <path d="M 291 59 A 115 115 0 0 1 325 140" fill="none" stroke="hsl(38 40% 8%)" strokeWidth="22" strokeLinecap="round" />
        {c > 0 && c <= ZONE && (
          <path d={arcPath(0, c)} fill="none" stroke="hsl(142 76% 36%)" strokeWidth="22" strokeLinecap="round" />
        )}
        {c > 0 && c > ZONE && (
          <>
            <path d={arcPath(0, ZONE)} fill="none" stroke="hsl(142 76% 36%)" strokeWidth="22" strokeLinecap="butt" />
            <path d={arcPath(ZONE, c)} fill="none" stroke="hsl(38 92% 50%)" strokeWidth="22" strokeLinecap="round" />
          </>
        )}
        <path d="M 95 140 A 115 115 0 0 1 96 137" fill="none" stroke={c > 0 ? 'var(--t-green)' : 'var(--t-border-subtle)'} strokeWidth="22" strokeLinecap="round" />
        <line x1="140" y1="94" x2="124" y2="78" stroke="var(--t-bg)" strokeWidth="2" />
        <line x1="210" y1="55" x2="210" y2="33" stroke="var(--t-bg)" strokeWidth="2" />
        <line x1="280" y1="94" x2="296" y2="78" stroke="var(--t-bg)" strokeWidth="2" />
        <text x="112" y="46" fontSize="9" textAnchor="middle" fill="hsl(0 0% 72%)" fontFamily={mono}>25%</text>
        <text x="210" y="4" fontSize="9" textAnchor="middle" fill="hsl(0 0% 72%)" fontFamily={mono}>50%</text>
        <text x="308" y="46" fontSize="9" textAnchor="middle" fill="hsl(0 0% 72%)" fontFamily={mono}>75%</text>
        <text x="78" y="170" fontSize="10" fontWeight="600" textAnchor="middle" fill="hsl(142 50% 28%)" fontFamily={mono}>Safe</text>
        <text x="342" y="170" fontSize="10" fontWeight="600" textAnchor="start" fill="hsl(38 65% 36%)" fontFamily={mono}>Caution</text>
        {c > 0 && <line x1={CX} y1={CY} x2={tip.x.toFixed(1)} y2={tip.y.toFixed(1)} stroke={needleColor} strokeWidth="2.5" strokeLinecap="round" />}
        <circle cx={CX} cy={CY} r="5" fill="var(--t-surface2)" stroke={c > 0 ? needleColor : 'var(--t-border)'} strokeWidth="2.5" />
      </svg>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '6px' }}>
        {[
          { label: 'Collateral ratio', value: c > 0 ? `${Math.round(collateralRatio)}%` : '-', color: isAmber ? 'var(--t-orange)' : 'var(--t-green)' },
          { label: 'UBTC to mint', value: c > 0 ? ubtcAmount.toFixed(2) : '-', color: 'var(--t-accent)' },
          { label: 'Liquidation if BTC hits', value: c > 0 ? `$${liqPrice.toLocaleString()}` : '-', color: 'hsl(0 84% 62%)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--t-surface)', borderRadius: '10px', padding: '8px 10px' }}>
            <p style={{ color: 'hsl(0 0% 62%)', fontSize: '9px', fontFamily: mono, textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 4px' }}>{s.label}</p>
            <p style={{ color: s.color, fontSize: '13px', fontWeight: '700', fontFamily: mono, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {c > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '10px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: needleColor, flexShrink: 0 }} />
          <p style={{ fontSize: '11px', color: isAmber ? 'hsl(38 75% 45%)' : 'hsl(142 50% 30%)', fontFamily: mono, margin: 0 }}>
            {isAmber
              ? `Caution - your vault collateralises at ${Math.round(collateralRatio)}%. BTC would need to drop to $${liqPrice.toLocaleString()} to trigger liquidation.`
              : `Safe - you are well above the liquidation threshold. BTC would need to drop to $${liqPrice.toLocaleString()} to affect your vault.`}
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
  const [step, setStep] = useState<'amount' | 'done'>('amount')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mintResult, setMintResult] = useState<any>(null)
  const [maxWarningAcknowledged, setMaxWarningAcknowledged] = useState(false)
  const [alertEmail, setAlertEmail] = useState('')
  const [alertPhone, setAlertPhone] = useState('')
  const [alertSaved, setAlertSaved] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [signingStage, setSigningStage] = useState<'' | 'signing' | 'broadcasting'>('')

  const mono: any = { fontFamily: 'var(--font-mono)' }

  const currencies = [
    { key: 'ubtc', label: 'UBTC', sub: 'Bitcoin-backed - 150% collateral', color: 'var(--t-accent)', icon: Icons.bitcoin },
    { key: 'uusdt', label: 'UUSDT', sub: 'Quantum-wrapped Tether - coming soon', color: 'var(--t-green)', icon: Icons.lock },
    { key: 'uusdc', label: 'UUSDC', sub: 'Quantum-wrapped USD Coin - coming soon', color: 'var(--t-accent)', icon: Icons.lock },
  ]

  const cur = currencies.find(c => c.key === activeCurrency) || currencies[0]
  const isStable = activeCurrency === 'uusdt' || activeCurrency === 'uusdc'

  useEffect(() => {
    if (vaultId) {
      fetch(`${API_URL}/vaults/${vaultId}`).then(r => r.json()).then(setVault)
      fetch(`${API_URL}/price`).then(r => r.json()).then(d => setBtcPrice(parseFloat(d.btc_usd) || 0))
      fetch(`${API_URL}/stablecoins`).then(r => r.json()).then(d => setStablecoins(d.stablecoins || []))
    }
  }, [vaultId])

  const btcLocked = (vault?.btc_amount_sats || 0) / 100_000_000
  const btcValue = btcLocked * btcPrice
  const ubtcMinted = parseFloat(vault?.ubtc_minted || '0')
  const maxUbtc = Math.max(0, (btcValue / 1.5) - ubtcMinted)
  const accountType = vault?.account_type || ''
  const scVaults = stablecoins.filter(s => s.account_type === accountType)
  const maxAmount = isStable ? 0 : maxUbtc

  const handlePct = (pct: number) => {
    if (maxUbtc <= 0) return
    const amt = maxUbtc * pct / 100
    setAmount(amt.toFixed(2))
    setSelectedPct(pct)
    setMaxWarningAcknowledged(false)
  }

  const parsedAmount = parseFloat(amount || '0')

  const gaugeAmount = selectedPct > 0 && maxUbtc > 0
    ? maxUbtc * selectedPct / 100
    : parsedAmount

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

  const isMaxAmount = !isStable && maxUbtc > 0 && parsedAmount >= maxUbtc * 0.99
  const canProceed = !isStable && !!amount && parsedAmount > 0 && parsedAmount <= maxAmount && vault?.status === 'active' && (!isMaxAmount || maxWarningAcknowledged)

  const handleMintClick = () => {
    if (!amount || parseFloat(amount) <= 0) return
    if (isStable) return
    setError('')
    setPasswordModalOpen(true)
  }

  const handlePasswordSubmit = async (password: string) => {
    setPasswordModalOpen(false)
    setLoading(true); setError(''); setSigningStage('signing')
    try {
      const walletAddress = localStorage.getItem('ubtc_wallet_address')
      if (!walletAddress) throw new Error('No wallet found in this browser. Restore your wallet first.')

      const ubtcAmountStr = amount.trim()
      const paramsString = `${vaultId}|${ubtcAmountStr}`

      const { challenge_id, signature, sphincs_signature } = await signedSpendWithPassword(
        walletAddress,
        'mint',
        paramsString,
        password
      )

      setSigningStage('broadcasting')
      const mintRes = await fetch(`${API_URL}/mint`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vault_id: vaultId,
          ubtc_amount: ubtcAmountStr,
          challenge_id,
          signature,
          sphincs_signature,
        })
      })
      const mintData = await mintRes.json()
      if (!mintRes.ok) throw new Error(mintData.error || `Mint failed (${mintRes.status})`)
      setMintResult(mintData)
      setStep('done')
    } catch (e: any) {
      setError(e?.message || 'Mint failed')
    } finally {
      setLoading(false)
      setSigningStage('')
    }
  }

  const inputSmall: any = { flex: 1, padding: '10px 12px', background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: '10px', color: 'hsl(0 0% 80%)', fontSize: '13px', fontFamily: 'var(--font-mono)', outline: 'none', minWidth: 0 }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--q-bg)', fontFamily: 'var(--font-display)' }}>

      <PasswordModal
        isOpen={passwordModalOpen}
        onCancel={() => setPasswordModalOpen(false)}
        onSubmit={handlePasswordSubmit}
        title="Authorize Mint"
        subtitle={`Sign the mint of ${amount} ${cur.label} from vault ${vaultId.slice(0, 16)}... with your wallet password.`}
      />

      <div style={{ background: 'linear-gradient(135deg,#050f20,#020810)', borderBottom: '1px solid rgba(0,212,255,0.12)', height: '60px', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '16px' }}>
        <a href={`/account/${vaultId}?currency=${activeCurrency}`} style={{ color: 'var(--t-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>{Icons.back(20, 'var(--t-muted)')}</a>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
          {['amount', 'done'].map((s, i) => (
            <div key={s} style={{ width: step === s ? '24px' : '8px', height: '8px', borderRadius: '4px', background: ['amount', 'done'].indexOf(step) >= i ? cur.color : 'var(--t-border)', transition: 'all 0.3s' }} />
          ))}
        </div>
        <span style={{ color: 'var(--t-faint)', fontSize: '11px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
          {step === 'amount' ? 'Amount' : 'Done'}
        </span>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 20px' }}>

        {step === 'amount' && (
          <>
            <div style={{ textAlign: 'center' as const, marginBottom: '26px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: cur.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>{cur.icon(28, cur.color)}</div>
              <h1 style={{ color: 'var(--t-text)', fontSize: '26px', fontWeight: '700', margin: '0 0 4px' }}>Mint {cur.label}</h1>
              <p style={{ color: 'var(--t-faint)', fontSize: '13px', ...mono, margin: 0 }}>{cur.sub}</p>
            </div>

            <div style={{ display: 'flex', background: 'linear-gradient(135deg,#050f20,#020810)', border: '1px solid rgba(0,212,255,0.12)', borderRadius: '14px', padding: '4px', gap: '4px', marginBottom: '18px' }}>
              {currencies.map(c => (
                <button key={c.key} onClick={() => { setActiveCurrency(c.key); setAmount(''); setSelectedPct(0); setError(''); setMaxWarningAcknowledged(false) }} style={{ flex: 1, background: activeCurrency === c.key ? 'var(--t-surface3)' : 'transparent', border: activeCurrency === c.key ? `1px solid ${c.color}35` : '1px solid transparent', borderRadius: '10px', padding: '10px 6px', cursor: 'pointer', fontFamily: 'var(--font-display)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '5px' }}>
                  {c.icon(16, activeCurrency === c.key ? c.color : 'var(--t-faint)')}
                  <span style={{ fontSize: '11px', fontWeight: '600', color: activeCurrency === c.key ? 'var(--t-text)' : 'var(--t-faint)' }}>{c.label}</span>
                </button>
              ))}
            </div>

            {isStable && (
              <div style={{ background: 'hsl(38 92% 50% / 0.05)', border: '1px solid hsl(38 92% 50% / 0.2)', borderRadius: '16px', padding: '20px', marginBottom: '14px', textAlign: 'center' as const }}>
                <p style={{ color: 'hsl(38 92% 60%)', fontSize: '14px', fontWeight: '600', ...mono, margin: '0 0 6px' }}>Coming Soon</p>
                <p style={{ color: 'var(--t-muted)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>
                  Stablecoin minting is being upgraded with hybrid post-quantum authorization. Available shortly.
                </p>
              </div>
            )}

            {!isStable && (
              <>
                <div style={{ background: 'linear-gradient(135deg,#050f20,#020810)', border: `1px solid ${cur.color}28`, borderRadius: '20px', padding: '20px', marginBottom: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
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
                  <div style={{ height: '1px', background: 'var(--t-border)', marginBottom: '12px' }} />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[25, 50, 75, 100].map(pct => (
                      <button
                        key={pct}
                        onClick={() => handlePct(pct)}
                        style={{
                          flex: 1,
                          background: selectedPct === pct ? cur.color + '18' : 'var(--t-surface)',
                          border: selectedPct === pct ? `1px solid ${cur.color}50` : '1px solid var(--t-border-subtle)',
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

                {vault?.status === 'active' && (
                  <RiskGauge
                    pct={gaugePct}
                    collateralRatio={gaugeCollateralRatio}
                    liqPrice={gaugeLiqPrice}
                    alert120={gaugeAlert120}
                    alert115={gaugeAlert115}
                    ubtcAmount={gaugeAmount}
                  />
                )}

                <div style={{ background: 'hsl(205 85% 55% / 0.06)', border: '1px solid hsl(205 85% 55% / 0.25)', borderRadius: '14px', padding: '14px 16px', marginTop: '12px', marginBottom: '12px' }}>
                  <p style={{ color: 'var(--t-accent)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>
                    You will be asked for your wallet password to sign this mint with hybrid post-quantum signatures (ML-DSA-65 + SLH-DSA-SHAKE-256s). Your phrase never leaves this browser.
                  </p>
                </div>

                {isMaxAmount && (
                  <div style={{ background: 'hsl(38 92% 50% / 0.05)', border: '1px solid hsl(38 92% 50% / 0.25)', borderRadius: '16px', padding: '18px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      {Icons.warning(15, 'var(--t-orange)')}
                      <p style={{ color: 'var(--t-orange)', fontWeight: '700', fontSize: '13px', ...mono, margin: 0 }}>Maximum mint - liquidation terms apply</p>
                    </div>

                    <p style={{ color: 'var(--t-muted)', fontSize: '12px', ...mono, lineHeight: '1.7', margin: '0 0 14px' }}>
                      If BTC drops to <strong style={{ color: 'var(--t-orange)' }}>${gaugeLiqPrice.toLocaleString()}</strong>, your vault will automatically liquidate. This is not a loss of your Bitcoin - the remaining BTC, minus a small protocol fee, is returned directly to your wallet.
                    </p>

                    <div style={{ background: 'var(--t-surface)', borderRadius: '12px', overflow: 'hidden', marginBottom: '14px' }}>
                      {[
                        { label: 'First alert', sublabel: 'BTC drops to', price: gaugeAlert120, color: 'hsl(142 60% 38%)', bg: 'hsl(142 40% 6%)' },
                        { label: 'Top up urgently', sublabel: 'BTC drops to', price: gaugeAlert115, color: 'hsl(38 80% 48%)', bg: 'hsl(38 40% 6%)' },
                        { label: 'Auto-liquidation', sublabel: 'BTC drops to', price: gaugeLiqPrice, color: 'hsl(0 75% 58%)', bg: 'hsl(0 40% 6%)' },
                      ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', background: item.bg, borderBottom: i < 2 ? '1px solid var(--t-border-subtle)' : 'none' }}>
                          <div>
                            <p style={{ color: item.color, fontSize: '12px', fontWeight: '700', ...mono, margin: 0 }}>{item.label}</p>
                            <p style={{ color: 'var(--t-faint)', fontSize: '10px', ...mono, margin: '2px 0 0' }}>{item.sublabel}</p>
                          </div>
                          <p style={{ color: item.color, fontSize: '18px', fontWeight: '700', ...mono, margin: 0 }}>${item.price.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>

                    {!alertSaved ? (
                      <>
                        <p style={{ color: 'var(--t-faint)', fontSize: '11px', ...mono, margin: '0 0 8px' }}>
                          Add your contact details to receive alerts before each threshold
                        </p>
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                          <input value={alertEmail} onChange={e => setAlertEmail(e.target.value)} placeholder="Email address" type="email" style={inputSmall} />
                          <input value={alertPhone} onChange={e => setAlertPhone(e.target.value)} placeholder="+971 mobile" type="tel" style={inputSmall} />
                          <button
                            onClick={() => { if (alertEmail || alertPhone) setAlertSaved(true) }}
                            disabled={!alertEmail && !alertPhone}
                            style={{ padding: '10px 14px', background: alertEmail || alertPhone ? 'var(--t-orange)' : 'var(--t-border)', border: 'none', borderRadius: '10px', color: alertEmail || alertPhone ? 'var(--t-surface)' : 'var(--t-faint)', fontSize: '12px', fontWeight: '700', ...mono, cursor: alertEmail || alertPhone ? 'pointer' : 'not-allowed', flexShrink: 0 }}
                          >
                            Save
                          </button>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'var(--t-green-bg)', border: '1px solid hsl(142 76% 36% / 0.25)', borderRadius: '10px', marginBottom: '10px' }}>
                        {Icons.check(13, 'var(--t-green)')}
                        <p style={{ color: 'var(--t-green)', fontSize: '12px', ...mono, margin: 0 }}>Alerts saved - we will notify you at each threshold</p>
                      </div>
                    )}

                    <div
                      onClick={() => setMaxWarningAcknowledged(!maxWarningAcknowledged)}
                      style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', padding: '11px 12px', background: maxWarningAcknowledged ? 'hsl(142 76% 36% / 0.07)' : 'var(--t-surface)', border: maxWarningAcknowledged ? '1px solid hsl(142 76% 36% / 0.35)' : '1px solid var(--t-border)', borderRadius: '10px' }}
                    >
                      <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: maxWarningAcknowledged ? '2px solid hsl(142 76% 36%)' : '2px solid var(--t-border)', background: maxWarningAcknowledged ? 'var(--t-green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                        {maxWarningAcknowledged && Icons.check(11, 'white')}
                      </div>
                      <p style={{ color: 'var(--t-muted)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>
                        I understand my vault auto-liquidates if BTC drops to <strong style={{ color: 'hsl(38 92% 58%)' }}>${gaugeLiqPrice.toLocaleString()}</strong> and I will receive the remaining BTC back minus the protocol fee.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {error && (
              <div style={{ background: 'var(--t-red-bg)', border: '1px solid hsl(0 84% 60% / 0.25)', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px' }}>
                <p style={{ color: 'var(--t-red)', fontSize: '13px', ...mono, margin: 0 }}>{error}</p>
              </div>
            )}

            <button
              onClick={handleMintClick}
              disabled={!canProceed || loading || isStable}
              style={{ width: '100%', background: canProceed && !loading ? `linear-gradient(135deg, ${cur.color}, ${cur.color}bb)` : 'var(--t-border)', color: canProceed && !loading ? 'white' : 'var(--t-faint)', border: 'none', borderRadius: '16px', padding: '18px', fontSize: '16px', fontWeight: '700', cursor: canProceed && !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {loading
                ? signingStage === 'signing' ? 'Signing locally...' : signingStage === 'broadcasting' ? 'Broadcasting on Bitcoin...' : 'Processing...'
                : isStable ? 'Stablecoin minting coming soon'
                : !vault || vault.status !== 'active' ? 'Fund account first'
                : parsedAmount > maxAmount ? 'Amount too high'
                : isMaxAmount && !maxWarningAcknowledged ? 'Acknowledge the terms above'
                : `Mint ${amount || '0'} ${cur.label}`}
            </button>
          </>
        )}

        {step === 'done' && (
          <>
            <div style={{ textAlign: 'center' as const, marginBottom: '28px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--t-green-bg)', border: '2px solid hsl(142 76% 36% / 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>{Icons.check(36, 'var(--t-green)')}</div>
              <h1 style={{ color: 'var(--t-text)', fontSize: '26px', fontWeight: '700', margin: '0 0 6px' }}>Minted Successfully</h1>
              <p style={{ color: cur.color, fontSize: '14px', ...mono, margin: 0 }}>{parseFloat(amount).toLocaleString()} {cur.label} - Hybrid PQ-authorized</p>
            </div>
            <div style={{ background: 'linear-gradient(135deg,#050f20,#020810)', border: '1px solid rgba(0,212,255,0.12)', borderRadius: '16px', padding: '18px', marginBottom: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              <p style={{ color: 'var(--t-faint)', fontSize: '10px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.15em', margin: '0 0 12px' }}>Mint Summary</p>
              {[
                { label: 'Minted', value: parseFloat(amount).toLocaleString() + ' ' + cur.label },
                { label: 'Vault', value: vaultId },
                { label: 'Backing', value: '150% BTC collateral' },
                { label: 'Authorization', value: 'ML-DSA-65 + SLH-DSA-SHAKE-256s' },
                ...(mintResult?.collateral_ratio ? [{ label: 'Collateral ratio', value: mintResult.collateral_ratio + '%' }] : []),
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--t-border-subtle)', gap: '12px', alignItems: 'center' }}>
                  <p style={{ color: 'var(--t-faint)', fontSize: '12px', ...mono, margin: 0 }}>{item.label}</p>
                  <p style={{ color: 'hsl(0 0% 75%)', fontSize: '12px', fontWeight: '600', ...mono, margin: 0, textAlign: 'right' as const, wordBreak: 'break-all' as const }}>{item.value}</p>
                </div>
              ))}
            </div>
            {mintResult?.bitcoin_txid && (
              <a href={`https://mempool.space/testnet4/tx/${mintResult.bitcoin_txid}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', boxSizing: 'border-box' as const, textAlign: 'center' as const, background: 'var(--t-surface)', border: '1px solid var(--t-border-subtle)', color: 'hsl(205,85%,65%)', textDecoration: 'none', borderRadius: '12px', padding: '14px', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-mono)', marginBottom: '10px', wordBreak: 'break-all' as const }}>
                View QUANTUM:MINT on Bitcoin →
              </a>
            )}
            <a href={`/account/${vaultId}?currency=${activeCurrency}`} style={{ display: 'block', width: '100%', boxSizing: 'border-box' as const, textAlign: 'center' as const, background: 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))', color: 'white', textDecoration: 'none', borderRadius: '16px', padding: '18px', fontSize: '16px', fontWeight: '700', fontFamily: 'var(--font-display)' }}>View Account</a>
          </>
        )}

      </div>
    </div>
  )
}

export default function MintPage() {
  return (
    <Suspense fallback={<QuantumLoader />}>
      <MintContent />
    </Suspense>
  )
}
'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { API_URL } from '../lib/supabase'

const btnPrimary: any = { background: 'linear-gradient(135deg, hsl(205, 85%, 55%), hsl(190, 80%, 50%))', color: 'white', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', boxShadow: '0 0 30px hsl(205 85% 55% / 0.4)', width: '100%' }
const btnRed: any = { background: 'hsl(0 84% 60%)', color: 'white', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', width: '100%' }
const btnDisabled: any = { background: 'hsl(220 10% 14%)', color: 'hsl(0 0% 40%)', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'not-allowed', fontFamily: 'var(--font-display)', width: '100%' }

function MintContent() {
  const searchParams = useSearchParams()
  const [vaultId, setVaultId] = useState(searchParams.get('vault') || '')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [vaultInfo, setVaultInfo] = useState<any>(null)
  const [btcPrice, setBtcPrice] = useState<number>(0)
  const [maxMintable, setMaxMintable] = useState<number>(0)
  const [showWarning, setShowWarning] = useState(false)
  const [alertEmail, setAlertEmail] = useState('')
  const [alertSaved, setAlertSaved] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])

  const mono: any = { fontFamily: 'var(--font-mono)' }
  const inputStyle: any = { display: 'block', width: '100%', padding: '14px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', color: 'hsl(0 0% 92%)', fontSize: '13px', fontFamily: 'var(--font-mono)', marginBottom: '20px', boxSizing: 'border-box', outline: 'none' }

  const loadVaultInfo = async (id: string) => {
    if (!id) return
    try {
      const [vaultRes, priceRes] = await Promise.all([
        fetch(`${API_URL}/vaults/${id}`),
        fetch(`${API_URL}/price`),
      ])
      const vault = await vaultRes.json()
      const price = await priceRes.json()
      if (vaultRes.ok) {
        setVaultInfo(vault)
        const p = parseFloat(price.btc_usd)
        setBtcPrice(p)
        const btcLocked = vault.btc_amount_sats / 100_000_000
        const btcValue = btcLocked * p
        const existingUbtc = parseFloat(vault.ubtc_minted) || 0
        const max = (btcValue / 1.5) - existingUbtc
        setMaxMintable(Math.max(0, max))
      }
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    fetch(`${API_URL}/dashboard`)
      .then(r => r.json())
      .then(d => {
        const active = d.vaults?.filter((v: any) => v.status === 'active') || []
        setAccounts(active)
      })
  }, [])

  useEffect(() => { if (vaultId) loadVaultInfo(vaultId) }, [vaultId])

  const btcLocked = vaultInfo ? vaultInfo.btc_amount_sats / 100_000_000 : 0
  const btcValue = btcLocked * btcPrice
  const outstanding = vaultInfo ? (parseFloat(vaultInfo.ubtc_minted) || 0) : 0
  const mintAmount = parseFloat(amount) || 0
  const totalAfterMint = outstanding + mintAmount
  const collateralRatio = btcValue > 0 && totalAfterMint > 0 ? (btcValue / totalAfterMint) * 100 : 0

  // Liquidation price — BTC price at which ratio hits 110%
  // ratio = (btcLocked * btcLiqPrice) / totalAfterMint = 1.10
  // btcLiqPrice = (totalAfterMint * 1.10) / btcLocked
  const liquidationBtcPrice = btcLocked > 0 && totalAfterMint > 0 ? (totalAfterMint * 1.10) / btcLocked : 0
  const warningBtcPrice = btcLocked > 0 && totalAfterMint > 0 ? (totalAfterMint * 1.30) / btcLocked : 0

  const ratioColor = collateralRatio <= 0 ? 'hsl(0 0% 55%)' : collateralRatio >= 200 ? 'hsl(142 76% 36%)' : collateralRatio >= 150 ? 'hsl(205 85% 55%)' : collateralRatio >= 120 ? 'hsl(38 92% 50%)' : 'hsl(0 84% 60%)'
  const isHighRisk = mintAmount > 0 && maxMintable > 0 && mintAmount > maxMintable * 0.95

  const handleMintClick = () => {
    if (isHighRisk) { setShowWarning(true) } else { executeMint() }
  }

  const executeMint = async () => {
    setShowWarning(false)
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch(`${API_URL}/mint`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vault_id: vaultId, ubtc_amount: amount })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      setAmount('')
      await loadVaultInfo(vaultId)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const saveAlert = async () => {
    if (!alertEmail || !vaultId) return
    try {
      await fetch(`${API_URL}/alerts/setup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vault_id: vaultId, email: alertEmail, alert_threshold: 130, liquidation_threshold: 110 })
      })
      setAlertSaved(true)
    } catch (e) { console.error(e) }
  }

  const canMint = !loading && vaultId && amount && mintAmount > 0 && mintAmount <= maxMintable + outstanding

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 5%)', padding: '40px 24px', fontFamily: 'var(--font-display)' }}>

      {/* Liquidation Warning Modal */}
      {showWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'hsl(220 15% 5% / 0.95)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(0 84% 60%)', borderRadius: '16px', padding: '32px', maxWidth: '480px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <span style={{ fontSize: '24px' }}>⚠️</span>
              <h2 style={{ color: 'hsl(0 84% 60%)', fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '700', margin: 0 }}>Liquidation Risk Warning</h2>
            </div>
            <p style={{ color: 'hsl(0 0% 92%)', fontSize: '13px', ...mono, lineHeight: '1.8', marginBottom: '20px' }}>
              You are minting near the maximum. Based on the current BTC price of <span style={{ color: 'hsl(205 85% 55%)' }}>${btcPrice.toLocaleString()}</span>:
            </p>
            <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid hsl(220 10% 16%)' }}>
                <span style={{ color: 'hsl(0 0% 65%)', fontSize: '12px', ...mono, textTransform: 'uppercase' }}>Your collateral ratio</span>
                <span style={{ color: ratioColor, fontWeight: '700', ...mono }}>{collateralRatio.toFixed(1)}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid hsl(220 10% 16%)' }}>
                <span style={{ color: 'hsl(0 0% 65%)', fontSize: '12px', ...mono, textTransform: 'uppercase' }}>Alert price (130%)</span>
                <span style={{ color: 'hsl(38 92% 50%)', fontWeight: '700', ...mono }}>${warningBtcPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, textTransform: 'uppercase' }}>Liquidation price (110%)</span>
                <span style={{ color: 'hsl(0 84% 60%)', fontWeight: '700', ...mono }}>${liquidationBtcPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
            <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, lineHeight: '1.7', marginBottom: '24px' }}>
              If BTC drops to <strong>${liquidationBtcPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>, your vault will be automatically liquidated. Set up an email alert to get notified at <strong>${warningBtcPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>.
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Set up email alert (optional)</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input value={alertEmail} onChange={e => setAlertEmail(e.target.value)} placeholder="your@email.com" style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
                <button onClick={saveAlert} style={{ background: alertSaved ? 'hsl(205 85% 55% / 0.2)' : 'hsl(220 15% 5%)', border: `1px solid ${alertSaved ? 'hsl(205 85% 55%)' : 'hsl(220 10% 16%)'}`, color: alertSaved ? 'hsl(205 85% 55%)' : 'hsl(0 0% 65%)', borderRadius: '10px', padding: '0 16px', fontSize: '12px', cursor: 'pointer', ...mono, whiteSpace: 'nowrap' as const }}>
                  {alertSaved ? '✓ Saved' : 'Save Alert'}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowWarning(false)} style={{ ...btnRed, flex: 1 }}>Cancel</button>
              <button onClick={executeMint} style={{ background: 'hsl(220 12% 8%)', color: 'hsl(0 0% 65%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', padding: '14px 0', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', flex: 1 }}>
                I Understand — Mint Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(205 85% 55%)', boxShadow: '0 0 10px hsl(205 85% 55% / 0.8)' }} />
          <span style={{ fontSize: '11px', ...mono, color: 'hsl(205 85% 55%)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Issue UBTC</span>
        </div>
        <h1 style={{ fontSize: '40px', fontWeight: '700', lineHeight: '1', marginBottom: '12px', color: 'hsl(0 0% 92%)' }}>Issue UBTC</h1>
        <p style={{ color: 'hsl(0 0% 65%)', fontSize: '14px', ...mono, marginBottom: '40px', lineHeight: '1.8' }}>
          Mint dollar-stable UBTC against your Bitcoin collateral. Liquidation at 110%.
        </p>

        <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '16px', padding: '28px' }}>

          {/* Account selector */}
          <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Select Account</label>
          <select value={vaultId} onChange={e => setVaultId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">— Choose account —</option>
            {accounts.map((v, i) => (
              <option key={v.vault_id} value={v.vault_id}>
                {v.account_type === 'custody' ? '🔐' : '💳'} {v.account_type === 'custody' ? 'Custody' : 'Current'} Account — {(v.btc_amount_sats / 100_000_000).toFixed(4)} BTC locked
              </option>
            ))}
          </select>

          {vaultInfo && (
            <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>BTC Locked</p>
                  <p style={{ color: 'hsl(0 0% 92%)', fontSize: '15px', fontWeight: '700', ...mono, margin: 0 }}>{btcLocked.toFixed(4)}</p>
                </div>
                <div>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>BTC Price</p>
                  <p style={{ color: 'hsl(0 0% 92%)', fontSize: '15px', fontWeight: '700', ...mono, margin: 0 }}>${btcPrice.toLocaleString()}</p>
                </div>
                <div>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Available to Issue</p>
                  <p style={{ color: 'hsl(205 85% 55%)', fontSize: '15px', fontWeight: '700', ...mono, margin: 0 }}>${maxMintable.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
              </div>
            </div>
          )}

          {maxMintable > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: 'hsl(0 0% 65%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 10px' }}>Quick Select</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[{ label: '25%', value: maxMintable * 0.25 }, { label: '50%', value: maxMintable * 0.5 }, { label: '75%', value: maxMintable * 0.75 }, { label: 'Max', value: maxMintable * 0.999 }].map(btn => (
                  <button key={btn.label} onClick={() => setAmount(btn.value.toFixed(2))} style={{ flex: 1, background: amount === btn.value.toFixed(2) ? 'hsl(205 85% 55% / 0.2)' : 'hsl(220 15% 5%)', border: `1px solid ${amount === btn.value.toFixed(2) ? 'hsl(205 85% 55%)' : 'hsl(220 10% 16%)'}`, color: amount === btn.value.toFixed(2) ? 'hsl(205 85% 55%)' : 'hsl(0 0% 65%)', borderRadius: '8px', padding: '10px 0', fontSize: '11px', fontWeight: '600', cursor: 'pointer', ...mono, textAlign: 'center' as const }}>
                    {btn.label}<br /><span style={{ fontSize: '10px', opacity: 0.8 }}>${btn.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>UBTC Amount (USD)</label>
          <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="10000" type="number" style={inputStyle} />

          {collateralRatio > 0 && (
            <div style={{ background: 'hsl(220 15% 5%)', border: `1px solid ${ratioColor}40`, borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: 'hsl(0 0% 65%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Collateral Ratio</span>
                <span style={{ color: ratioColor, fontWeight: '700', fontSize: '18px', ...mono }}>{collateralRatio.toFixed(1)}%</span>
              </div>
              {liquidationBtcPrice > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'hsl(0 84% 60%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Liquidation if BTC drops to</span>
                  <span style={{ color: 'hsl(0 84% 60%)', fontWeight: '700', fontSize: '14px', ...mono }}>${liquidationBtcPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              )}
            </div>
          )}

          {isHighRisk && (
            <div style={{ background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.4)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
              <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, margin: 0 }}>
                ⚠ You are minting near the maximum. A liquidation warning will appear.
              </p>
            </div>
          )}

          <button onClick={handleMintClick} disabled={!canMint} style={!canMint ? btnDisabled : isHighRisk ? btnRed : btnPrimary}>
            {loading ? 'Issuing UBTC...' : isHighRisk ? `⚠ Issue $${mintAmount.toLocaleString()} UBTC (High Risk)` : `Issue $${mintAmount.toLocaleString()} UBTC`}
          </button>

          {error && <p style={{ color: 'hsl(0 84% 60%)', marginTop: '16px', fontSize: '13px', ...mono }}>{error}</p>}

          {result && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '10px', padding: '20px', marginBottom: '16px', textAlign: 'center' as const }}>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>UBTC Issued Successfully</p>
                <p style={{ fontSize: '40px', fontWeight: '700', color: 'hsl(205 85% 55%)', margin: 0 }}>${parseFloat(result.ubtc_minted).toLocaleString()}</p>
              </div>

              {!alertSaved && (
                <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(38 92% 50% / 0.3)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                  <p style={{ color: 'hsl(38 92% 50%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 12px' }}>Set Up Liquidation Alert</p>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '12px', ...mono, margin: '0 0 12px', lineHeight: '1.6' }}>
                    Get emailed when BTC drops toward your liquidation price of <strong style={{ color: 'hsl(0 84% 60%)' }}>${liquidationBtcPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input value={alertEmail} onChange={e => setAlertEmail(e.target.value)} placeholder="your@email.com" style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
                    <button onClick={saveAlert} style={{ background: 'hsl(38 92% 50% / 0.15)', border: '1px solid hsl(38 92% 50%)', color: 'hsl(38 92% 50%)', borderRadius: '10px', padding: '0 16px', fontSize: '12px', cursor: 'pointer', ...mono, whiteSpace: 'nowrap' as const }}>
                      Set Alert
                    </button>
                  </div>
                </div>
              )}
              {alertSaved && (
                <div style={{ background: 'hsl(205 85% 55% / 0.08)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
                  <p style={{ color: 'hsl(205 85% 55%)', fontSize: '12px', ...mono, margin: 0 }}>✓ Alert set for ${warningBtcPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <a href={`/account/${vaultId}`} style={{ ...btnPrimary, flex: 1, display: 'block', textAlign: 'center', textDecoration: 'none' }}>View Account</a>
                <a href="/dashboard" style={{ background: 'none', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 65%)', borderRadius: '10px', padding: '14px 0', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', flex: 1, display: 'block', textAlign: 'center', textDecoration: 'none' }}>Dashboard</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MintPage() {
  return (
    <Suspense fallback={<div style={{ color: 'hsl(0 0% 65%)', padding: '40px', fontFamily: 'var(--font-mono)' }}>Loading...</div>}>
      <MintContent />
    </Suspense>
  )
}
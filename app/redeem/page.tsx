'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { API_URL } from '../lib/supabase'

const btnPrimary: any = { backgroundImage: 'var(--gradient-mint)', color: 'white', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', boxShadow: '0 0 30px hsl(205 85% 55% / 0.4)', width: '100%', display: 'block', textAlign: 'center', textDecoration: 'none' }
const btnRed: any = { background: 'hsl(0 84% 60%)', color: 'white', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', boxShadow: '0 0 30px hsl(0 84% 60% / 0.4)', width: '100%' }
const btnGhost: any = { background: 'none', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 65%)', borderRadius: '10px', padding: '12px 24px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }
const btnDisabled: any = { background: 'hsl(220 10% 14%)', color: 'hsl(0 0% 40%)', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'not-allowed', fontFamily: 'var(--font-display)', width: '100%' }

function RedeemContent() {
  const searchParams = useSearchParams()
  const [vaultId, setVaultId] = useState(searchParams.get('vault') || '')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [vaultInfo, setVaultInfo] = useState<any>(null)
  const [btcPrice, setBtcPrice] = useState<number>(0)

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
      if (vaultRes.ok) { setVaultInfo(vault); setBtcPrice(parseFloat(price.btc_usd)) }
    } catch (e) { console.error(e) }
  }

  useEffect(() => { if (vaultId) loadVaultInfo(vaultId) }, [vaultId])

  const burn = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch(`${API_URL}/burn`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vault_id: vaultId, ubtc_to_burn: amount }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const outstanding = vaultInfo ? parseFloat(vaultInfo.ubtc_minted) : 0
  const btcLocked = vaultInfo ? vaultInfo.btc_amount_sats / 100_000_000 : 0
  const btcValue = btcLocked * btcPrice
  const burnAmount = parseFloat(amount) || 0
  const btcToRelease = btcPrice > 0 && burnAmount > 0 ? burnAmount / btcPrice : 0
  const remainingUbtc = outstanding - burnAmount
  const remainingRatio = btcPrice > 0 && remainingUbtc > 0 ? (btcValue / remainingUbtc) * 100 : 0
  const canBurn = !loading && vaultId && amount && burnAmount > 0 && burnAmount <= outstanding

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 5%)', padding: '40px 24px', fontFamily: 'var(--font-display)' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(0 84% 60%)', boxShadow: '0 0 10px hsl(0 84% 60% / 0.8)' }} />
          <span style={{ fontSize: '11px', ...mono, color: 'hsl(0 84% 60%)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Redeem BTC</span>
        </div>
        <h1 style={{ fontSize: '48px', fontWeight: '700', lineHeight: '1', marginBottom: '12px', backgroundImage: 'var(--gradient-vivid)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Burn UBTC</h1>
        <p style={{ color: 'hsl(0 0% 65%)', fontSize: '14px', ...mono, marginBottom: '40px', lineHeight: '1.8' }}>Burn your UBTC to release your Bitcoin collateral.</p>

        <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '16px', padding: '28px' }}>
          <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Vault ID</label>
          <input value={vaultId} onChange={e => { setVaultId(e.target.value); if (e.target.value.length > 8) loadVaultInfo(e.target.value) }} placeholder="vault_bc22a374" style={inputStyle} />

          {vaultInfo && (
            <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'UBTC Outstanding', value: `$${outstanding.toLocaleString()}`, color: 'hsl(0 84% 60%)' },
                  { label: 'BTC Locked', value: `${btcLocked.toFixed(4)}`, color: 'hsl(0 0% 92%)' },
                  { label: 'BTC Price', value: `$${btcPrice.toLocaleString()}`, color: 'hsl(0 0% 92%)' },
                ].map(item => (
                  <div key={item.label}>
                    <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>{item.label}</p>
                    <p style={{ color: item.color, fontSize: '15px', fontWeight: '700', ...mono, margin: 0 }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {outstanding > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: 'hsl(0 0% 65%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 10px' }}>Quick Select</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[{ label: '25%', value: outstanding * 0.25 }, { label: '50%', value: outstanding * 0.5 }, { label: '75%', value: outstanding * 0.75 }, { label: 'All', value: outstanding }].map(btn => (
                  <button key={btn.label} onClick={() => setAmount(btn.value.toFixed(2))} style={{ flex: 1, background: amount === btn.value.toFixed(2) ? 'hsl(0 84% 60% / 0.15)' : 'hsl(220 15% 5%)', border: `1px solid ${amount === btn.value.toFixed(2) ? 'hsl(0 84% 60%)' : 'hsl(220 10% 16%)'}`, color: amount === btn.value.toFixed(2) ? 'hsl(0 84% 60%)' : 'hsl(0 0% 65%)', borderRadius: '8px', padding: '10px 0', fontSize: '11px', fontWeight: '600', cursor: 'pointer', ...mono, textAlign: 'center' as const }}>
                    {btn.label}<br /><span style={{ fontSize: '10px', opacity: 0.8 }}>${btn.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>UBTC to Burn</label>
          <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="20000" type="number" style={inputStyle} />

          {burnAmount > 0 && btcPrice > 0 && (
            <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>BTC You Receive</p>
                  <p style={{ color: 'hsl(205 85% 55%)', fontSize: '18px', fontWeight: '700', ...mono, margin: 0 }}>{btcToRelease.toFixed(6)} BTC</p>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, margin: '2px 0 0' }}>${burnAmount.toLocaleString()} USD value</p>
                </div>
                <div>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Remaining UBTC</p>
                  <p style={{ color: remainingUbtc < 0 ? 'hsl(0 84% 60%)' : 'hsl(0 0% 92%)', fontSize: '18px', fontWeight: '700', ...mono, margin: 0 }}>${Math.max(0, remainingUbtc).toLocaleString()}</p>
                  {remainingRatio > 0 && <p style={{ color: remainingRatio >= 150 ? 'hsl(205 85% 55%)' : 'hsl(0 84% 60%)', fontSize: '10px', ...mono, margin: '2px 0 0' }}>Ratio: {remainingRatio.toFixed(1)}%</p>}
                </div>
              </div>
            </div>
          )}

          <button onClick={burn} disabled={!canBurn} style={canBurn ? btnRed : btnDisabled}>
            {loading ? 'Burning...' : burnAmount > outstanding ? 'Exceeds outstanding' : `Burn $${burnAmount.toLocaleString()} UBTC`}
          </button>

          {error && <p style={{ color: 'hsl(0 84% 60%)', marginTop: '16px', fontSize: '13px', ...mono }}>{error}</p>}

          {result && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '10px', padding: '20px', marginBottom: '16px', textAlign: 'center' }}>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>UBTC Burned Successfully</p>
                <p style={{ fontSize: '36px', fontWeight: '700', color: 'hsl(0 84% 60%)', margin: '0 0 8px' }}>${parseFloat(result.ubtc_burned).toLocaleString()}</p>
                <p style={{ color: 'hsl(205 85% 55%)', fontSize: '14px', ...mono, margin: 0 }}>{(parseFloat(result.ubtc_burned) / btcPrice).toFixed(6)} BTC released</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', padding: '14px' }}>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>Remaining UBTC</p>
                  <p style={{ color: 'hsl(0 0% 92%)', fontWeight: '600', ...mono, margin: 0 }}>${result.new_outstanding}</p>
                </div>
                <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', padding: '14px' }}>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>Vault Status</p>
                  <p style={{ color: result.vault_status === 'closed' ? 'hsl(0 84% 60%)' : 'hsl(205 85% 55%)', fontWeight: '600', ...mono, margin: 0, textTransform: 'capitalize' }}>{result.vault_status}</p>
                </div>
              </div>
              {result.vault_status === 'closed' && (
                <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                  <p style={{ color: 'hsl(205 85% 55%)', ...mono, fontSize: '13px', margin: 0 }}>Vault closed. Your Bitcoin has been released.</p>
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px' }}>
                <a href="/dashboard" style={{ ...btnPrimary, flex: 1 }}>Back to Dashboard</a>
                {result.vault_status === 'active' && (
                  <a href={`/mint?vault=${vaultId}`} style={{ ...btnGhost, textDecoration: 'none' }}>Mint More</a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RedeemPage() {
  return (
    <Suspense fallback={<div style={{ color: 'hsl(0 0% 65%)', padding: '40px', fontFamily: 'var(--font-mono)' }}>Loading...</div>}>
      <RedeemContent />
    </Suspense>
  )
}
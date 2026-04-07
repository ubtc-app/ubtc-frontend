'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { API_URL } from '../lib/supabase'

const btnPrimary: any = { backgroundImage: 'var(--gradient-mint)', color: 'white', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', boxShadow: '0 0 30px hsl(205 85% 55% / 0.4)', width: '100%', display: 'block', textAlign: 'center', textDecoration: 'none' }
const btnGhost: any = { background: 'none', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 65%)', borderRadius: '10px', padding: '12px 24px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', textDecoration: 'none', display: 'inline-block' }
const btnDisabled: any = { background: 'hsl(220 10% 14%)', color: 'hsl(0 0% 40%)', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'not-allowed', fontFamily: 'var(--font-display)', width: '100%' }

function WithdrawContent() {
  const searchParams = useSearchParams()
  const [vaultId, setVaultId] = useState(searchParams.get('vault') || '')
  const [amount, setAmount] = useState('')
  const [destination, setDestination] = useState('')
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
      if (vaultRes.ok) {
        setVaultInfo(vault)
        setBtcPrice(parseFloat(price.btc_usd))
      }
    } catch (e) { console.error(e) }
  }

  useEffect(() => { if (vaultId) loadVaultInfo(vaultId) }, [vaultId])

  const withdraw = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch(`${API_URL}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vault_id: vaultId, ubtc_amount: amount, destination_address: destination })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const outstanding = vaultInfo ? parseFloat(vaultInfo.ubtc_minted) : 0
  const withdrawAmount = parseFloat(amount) || 0
  const btcToReceive = btcPrice > 0 && withdrawAmount > 0 ? withdrawAmount / btcPrice : 0
  const canWithdraw = !loading && vaultId && amount && destination && withdrawAmount > 0 && withdrawAmount <= outstanding

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 5%)', padding: '40px 24px', fontFamily: 'var(--font-display)' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(205 85% 55%)', boxShadow: '0 0 10px hsl(205 85% 55% / 0.8)' }} />
          <span style={{ fontSize: '11px', ...mono, color: 'hsl(205 85% 55%)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Withdraw</span>
        </div>

        <h1 style={{ fontSize: '48px', fontWeight: '700', lineHeight: '1', marginBottom: '12px', backgroundImage: 'var(--gradient-vivid)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          Withdraw BTC
        </h1>
        <p style={{ color: 'hsl(0 0% 65%)', fontSize: '14px', ...mono, marginBottom: '40px', lineHeight: '1.8' }}>
          Burn UBTC and receive the equivalent Bitcoin value at the live price.
        </p>

        <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '16px', padding: '28px' }}>

          <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Vault ID</label>
          <input value={vaultId} onChange={e => { setVaultId(e.target.value); if (e.target.value.length > 8) loadVaultInfo(e.target.value) }} placeholder="vault_bc22a374" style={inputStyle} />

          {vaultInfo && (
            <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>UBTC Available</p>
                  <p style={{ color: 'hsl(205 85% 55%)', fontSize: '16px', fontWeight: '700', ...mono, margin: 0 }}>${outstanding.toLocaleString()}</p>
                </div>
                <div>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>BTC Locked</p>
                  <p style={{ color: 'hsl(0 0% 92%)', fontSize: '16px', fontWeight: '700', ...mono, margin: 0 }}>{(vaultInfo.btc_amount_sats / 100_000_000).toFixed(4)}</p>
                </div>
                <div>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>BTC Price</p>
                  <p style={{ color: 'hsl(0 0% 92%)', fontSize: '16px', fontWeight: '700', ...mono, margin: 0 }}>${btcPrice.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {outstanding > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: 'hsl(0 0% 65%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 10px' }}>Quick Select</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[{ label: '25%', value: outstanding * 0.25 }, { label: '50%', value: outstanding * 0.5 }, { label: '75%', value: outstanding * 0.75 }, { label: 'All', value: outstanding }].map(btn => (
                  <button key={btn.label} onClick={() => setAmount(btn.value.toFixed(2))} style={{ flex: 1, background: amount === btn.value.toFixed(2) ? 'hsl(205 85% 55% / 0.2)' : 'hsl(220 15% 5%)', border: `1px solid ${amount === btn.value.toFixed(2) ? 'hsl(205 85% 55%)' : 'hsl(220 10% 16%)'}`, color: amount === btn.value.toFixed(2) ? 'hsl(205 85% 55%)' : 'hsl(0 0% 65%)', borderRadius: '8px', padding: '10px 0', fontSize: '11px', fontWeight: '600', cursor: 'pointer', ...mono, textAlign: 'center' as const }}>
                    {btn.label}<br /><span style={{ fontSize: '10px', opacity: 0.8 }}>${btn.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>UBTC Amount to Withdraw</label>
          <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="10000" type="number" style={inputStyle} />

          {btcToReceive > 0 && (
            <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>You will receive</p>
              <p style={{ fontSize: '28px', fontWeight: '700', backgroundImage: 'var(--gradient-mint)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: '0 0 4px' }}>{btcToReceive.toFixed(6)} BTC</p>
              <p style={{ color: 'hsl(0 0% 65%)', fontSize: '11px', ...mono, margin: 0 }}>at ${btcPrice.toLocaleString()} / BTC</p>
            </div>
          )}

          <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Destination Bitcoin Address</label>
          <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="bcrt1q..." style={inputStyle} />

          <button onClick={withdraw} disabled={!canWithdraw} style={canWithdraw ? { ...btnPrimary } : btnDisabled}>
            {loading ? 'Withdrawing...' : `Withdraw $${withdrawAmount.toLocaleString()} UBTC`}
          </button>

          {error && <p style={{ color: 'hsl(0 84% 60%)', marginTop: '16px', fontSize: '13px', ...mono }}>{error}</p>}

          {result && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '10px', padding: '20px', marginBottom: '16px', textAlign: 'center' }}>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>Withdrawal Complete</p>
                <p style={{ fontSize: '36px', fontWeight: '700', backgroundImage: 'var(--gradient-mint)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: '0 0 4px' }}>{result.btc_sent} BTC</p>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '12px', ...mono, margin: 0 }}>sent to {result.destination_address.slice(0, 20)}...</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                {[
                  { label: 'UBTC Burned', value: `$${parseFloat(result.ubtc_burned).toLocaleString()}` },
                  { label: 'BTC Price', value: `$${parseFloat(result.btc_price_usd).toLocaleString()}` },
                  { label: 'Remaining UBTC', value: `$${result.new_outstanding}` },
                  { label: 'Vault Status', value: result.vault_status },
                ].map(item => (
                  <div key={item.label} style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', padding: '14px' }}>
                    <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>{item.label}</p>
                    <p style={{ color: 'hsl(0 0% 92%)', fontWeight: '600', ...mono, margin: 0, fontSize: '13px', textTransform: 'capitalize' }}>{item.value}</p>
                  </div>
                ))}
              </div>
              <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>Transaction ID</p>
                <p style={{ color: 'hsl(205 85% 55%)', fontSize: '12px', wordBreak: 'break-all', ...mono, margin: 0 }}>{result.txid}</p>
              </div>
              <a href="/dashboard" style={{ ...btnPrimary }}>Back to Dashboard</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function WithdrawPage() {
  return (
    <Suspense fallback={<div style={{ color: 'hsl(0 0% 65%)', padding: '40px', fontFamily: 'var(--font-mono)' }}>Loading...</div>}>
      <WithdrawContent />
    </Suspense>
  )
}
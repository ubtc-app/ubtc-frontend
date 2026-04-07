'use client'
import { useState, useEffect } from 'react'
import { API_URL } from '../lib/supabase'

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = async () => {
    try {
      const res = await fetch(`${API_URL}/dashboard`)
      const json = await res.json()
      setData(json)
      setLastUpdated(new Date())
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])

  const mono: any = { fontFamily: 'var(--font-mono)' }

  const getRatio = (v: any, btcPrice: number) => {
    if (v.btc_amount_sats === 0) return null
    const btcValue = (v.btc_amount_sats / 100_000_000) * btcPrice
    const outstanding = parseFloat(v.ubtc_minted)
    if (outstanding === 0) return null
    return (btcValue / outstanding) * 100
  }

  const getAvailableToMint = (v: any, btcPrice: number) => {
    const btcValue = (v.btc_amount_sats / 100_000_000) * btcPrice
    const maxMintable = btcValue / 1.5
    const outstanding = parseFloat(v.ubtc_minted)
    return Math.max(0, maxMintable - outstanding)
  }

  const ratioColor = (ratio: number | null) => {
    if (!ratio) return 'hsl(0 0% 65%)'
    if (ratio >= 200) return 'hsl(205 85% 55%)'
    if (ratio >= 150) return 'hsl(38 92% 50%)'
    return 'hsl(0 84% 60%)'
  }

  const ratioLabel = (ratio: number | null) => {
    if (!ratio) return 'No debt'
    if (ratio >= 200) return 'Safe'
    if (ratio >= 150) return 'Healthy'
    if (ratio >= 120) return 'Warning'
    return 'At Risk'
  }

  const statusCol = (s: string) => s === 'active' ? 'hsl(205 85% 55%)' : s === 'closed' ? 'hsl(0 84% 60%)' : 'hsl(38 92% 50%)'

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 5%)', padding: '40px 24px', fontFamily: 'var(--font-display)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(205 85% 55%)', boxShadow: '0 0 10px hsl(205 85% 55% / 0.8)', animation: 'pulse-glow 2s ease-in-out infinite' }} />
            <span style={{ fontSize: '11px', ...mono, color: 'hsl(205 85% 55%)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Live Dashboard</span>
          </div>
          {lastUpdated && (
            <span style={{ fontSize: '11px', ...mono, color: 'hsl(0 0% 45%)' }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
          <h1 style={{ fontSize: '48px', fontWeight: '700', lineHeight: '1', backgroundImage: 'var(--gradient-vivid)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
            Protocol Overview
          </h1>
          <a href="/vault" style={{ backgroundImage: 'var(--gradient-mint)', color: 'white', textDecoration: 'none', borderRadius: '10px', padding: '12px 24px', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-display)', boxShadow: '0 0 20px hsl(205 85% 55% / 0.4)' }}>
            + New Vault
          </a>
        </div>

        <p style={{ color: 'hsl(0 0% 65%)', fontSize: '14px', ...mono, marginBottom: '40px' }}>
          Collateral ratios update every 30 seconds using live BTC price.
        </p>

        {loading && <p style={{ color: 'hsl(0 0% 65%)', ...mono }}>Loading...</p>}

        {data && (
          <>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
              {[
                { label: 'Active Vaults', value: String(data.active_vaults) },
                { label: 'Total BTC Locked', value: `${(data.total_btc_sats / 100_000_000).toFixed(4)} BTC` },
                { label: 'Total UBTC Minted', value: `$${parseFloat(data.total_ubtc_minted).toLocaleString()}` },
                { label: 'BTC Price', value: `$${parseFloat(data.btc_price_usd).toLocaleString()}` },
              ].map(s => (
                <div key={s.label} style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '16px', padding: '20px' }}>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>{s.label}</p>
                 <p style={{ fontSize: '20px', fontWeight: '700', color: 'hsl(205 85% 55%)', margin: 0 }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Vaults */}
            <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'hsl(0 0% 92%)', margin: 0 }}>Your Vaults</h2>
                <button onClick={load} style={{ background: 'none', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 65%)', borderRadius: '8px', padding: '6px 14px', fontSize: '11px', ...mono, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Refresh
                </button>
              </div>

              {data.vaults.length === 0 && (
                <p style={{ color: 'hsl(0 0% 65%)', ...mono, fontSize: '13px' }}>
                  No vaults yet. <a href="/vault" style={{ color: 'hsl(205 85% 55%)' }}>Create one</a>
                </p>
              )}

              {data.vaults.map((v: any) => {
                const btcPrice = parseFloat(data.btc_price_usd)
                const btcValue = (v.btc_amount_sats / 100_000_000) * btcPrice
                const ratio = getRatio(v, btcPrice)
                const available = getAvailableToMint(v, btcPrice)
                const rColor = ratioColor(ratio)
                const barWidth = ratio ? Math.min(100, (ratio / 300) * 100) : 0

                return (
                  <div key={v.vault_id} style={{ background: 'hsl(220 15% 5%)', border: `1px solid ${v.status === 'active' ? 'hsl(220 10% 16%)' : 'hsl(0 84% 60% / 0.3)'}`, borderRadius: '12px', padding: '20px', marginBottom: '12px' }}>

                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span style={{ color: 'hsl(205 85% 55%)', fontWeight: '600', ...mono, fontSize: '13px' }}>{v.vault_id}</span>
                      <span style={{ color: statusCol(v.status), fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', background: 'hsl(220 12% 8%)', padding: '4px 12px', borderRadius: '20px', border: `1px solid ${statusCol(v.status)}` }}>
                        {v.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Key metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '8px', padding: '12px' }}>
                        <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>BTC Locked</p>
                        <p style={{ color: 'hsl(0 0% 92%)', fontSize: '13px', fontWeight: '600', ...mono, margin: 0 }}>{(v.btc_amount_sats / 100_000_000).toFixed(4)}</p>
                      </div>
                      <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '8px', padding: '12px' }}>
                        <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>BTC Value</p>
                        <p style={{ color: 'hsl(0 0% 92%)', fontSize: '13px', fontWeight: '600', ...mono, margin: 0 }}>${btcValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '8px', padding: '12px' }}>
                        <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>UBTC Minted</p>
                        <p style={{ color: 'hsl(0 0% 92%)', fontSize: '13px', fontWeight: '600', ...mono, margin: 0 }}>${parseFloat(v.ubtc_minted).toLocaleString()}</p>
                      </div>
                      <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '8px', padding: '12px' }}>
                        <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Can Mint</p>
                        <p style={{ color: 'hsl(205 85% 55%)', fontSize: '13px', fontWeight: '600', ...mono, margin: 0 }}>${available.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>

                    {/* Collateral ratio bar */}
                    {ratio !== null && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Collateral Ratio</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: rColor, fontSize: '11px', ...mono, fontWeight: '600' }}>{ratioLabel(ratio)}</span>
                            <span style={{ color: rColor, fontSize: '14px', fontWeight: '700', ...mono }}>{ratio.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div style={{ height: '4px', background: 'hsl(220 12% 8%)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${barWidth}%`, background: rColor, borderRadius: '2px', transition: 'width 0.5s ease' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                          <span style={{ color: 'hsl(0 84% 60%)', fontSize: '9px', ...mono }}>120% liquidation</span>
                          <span style={{ color: 'hsl(38 92% 50%)', fontSize: '9px', ...mono }}>150% minimum</span>
                          <span style={{ color: 'hsl(205 85% 55%)', fontSize: '9px', ...mono }}>200%+ safe</span>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                   {parseFloat(v.ubtc_minted) > 0 && (
  <div style={{ background: 'hsl(205 85% 55% / 0.08)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ color: 'hsl(205 85% 55%)', fontSize: '12px', ...mono }}>You have ${parseFloat(v.ubtc_minted).toLocaleString()} UBTC available to withdraw</span>
    <a href={`/withdraw?vault=${v.vault_id}`} style={{ color: 'hsl(205 85% 55%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none', fontWeight: '600', whiteSpace: 'nowrap', marginLeft: '12px' }}>Withdraw</a>
  </div>
)}
<div style={{ display: 'flex', gap: '10px' }}>
  <a href={`/deposit?vault=${v.vault_id}`} style={{ color: 'hsl(205 85% 55%)', textDecoration: 'none', fontSize: '11px', ...mono, letterSpacing: '0.1em', textTransform: 'uppercase', border: '1px solid hsl(205 85% 55% / 0.4)', padding: '7px 16px', borderRadius: '6px' }}>Deposit</a>
  <a href={`/mint?vault=${v.vault_id}`} style={{ color: 'hsl(205 85% 55%)', textDecoration: 'none', fontSize: '11px', ...mono, letterSpacing: '0.1em', textTransform: 'uppercase', border: '1px solid hsl(205 85% 55% / 0.4)', padding: '7px 16px', borderRadius: '6px' }}>Mint</a>
  <a href={`/redeem?vault=${v.vault_id}`} style={{ color: 'hsl(0 84% 60%)', textDecoration: 'none', fontSize: '11px', ...mono, letterSpacing: '0.1em', textTransform: 'uppercase', border: '1px solid hsl(0 84% 60% / 0.4)', padding: '7px 16px', borderRadius: '6px' }}>Redeem</a>
  <a href={`/withdraw?vault=${v.vault_id}`} style={{ color: 'hsl(205 85% 55%)', textDecoration: 'none', fontSize: '11px', ...mono, letterSpacing: '0.1em', textTransform: 'uppercase', border: '1px solid hsl(205 85% 55% / 0.4)', padding: '7px 16px', borderRadius: '6px' }}>Withdraw</a>
</div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
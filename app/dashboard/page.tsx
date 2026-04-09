'use client'
import { useState, useEffect } from 'react'
import { API_URL } from '../lib/supabase'

export default function Dashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/dashboard`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const mono: any = { fontFamily: 'var(--font-mono)' }

  const btcPrice = data?.btc_price_usd ? parseFloat(data.btc_price_usd) : 0
  const totalUbtc = data?.total_ubtc_minted ? parseFloat(data.total_ubtc_minted) : 0
  const totalBtc = data?.total_btc_sats ? data.total_btc_sats / 100_000_000 : 0
  const totalValue = totalBtc * btcPrice

  const getAccountName = (vault: any, index: number) => {
    if (vault.account_type === 'custody') return `Custody Account`
    return `Current Account`
  }

  const getCollateralRatio = (vault: any) => {
    const ubtc = parseFloat(vault.ubtc_minted) || 0
    if (ubtc === 0) return null
    const btcValue = (vault.btc_amount_sats / 100_000_000) * btcPrice
    return (btcValue / ubtc) * 100
  }

  const getRatioColor = (ratio: number | null) => {
    if (!ratio) return 'hsl(205 85% 55%)'
    if (ratio >= 200) return 'hsl(142 76% 36%)'
    if (ratio >= 150) return 'hsl(205 85% 55%)'
    if (ratio >= 120) return 'hsl(38 92% 50%)'
    return 'hsl(0 84% 60%)'
  }

  const currencies = [
    { symbol: 'UBTC', name: 'Bitcoin Stable', balance: totalUbtc, prefix: '$', color: 'hsl(38 92% 50%)', icon: '₿', active: true },
    { symbol: 'USDT', name: 'Tether Dollar', balance: 0, prefix: '$', color: 'hsl(142 76% 36%)', icon: '₮', active: false },
    { symbol: 'USDC', name: 'USD Coin', balance: 0, prefix: '$', color: 'hsl(220 85% 55%)', icon: '$', active: false },
  ]

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 5%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'hsl(0 0% 65%)', ...mono }}>Loading accounts...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', fontFamily: 'var(--font-display)' }}>

      {/* Top header */}
      <div style={{ background: 'hsl(220 15% 5%)', borderBottom: '1px solid hsl(220 10% 12%)', padding: '24px 32px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: 'hsl(0 0% 55%)', fontSize: '12px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Total Balance</p>
            <h1 style={{ fontSize: '42px', fontWeight: '700', color: 'hsl(0 0% 92%)', margin: 0 }}>
              ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </h1>
            <p style={{ color: 'hsl(0 0% 55%)', fontSize: '13px', ...mono, margin: '4px 0 0' }}>
              {totalBtc.toFixed(4)} BTC locked · {data?.active_vaults || 0} active accounts
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <a href="/vault" style={{ backgroundImage: 'var(--gradient-mint)', color: 'white', textDecoration: 'none', borderRadius: '10px', padding: '12px 24px', fontSize: '13px', fontWeight: '600' }}>+ New Account</a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px' }}>

        {/* Currency cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '40px' }}>
          {currencies.map(c => (
            <div key={c.symbol} style={{ background: 'hsl(220 12% 8%)', border: `1px solid ${c.active ? c.color + '40' : 'hsl(220 10% 14%)'}`, borderRadius: '16px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: c.color + '15' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: c.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: c.color }}>{c.icon}</div>
                  <div>
                    <p style={{ color: 'hsl(0 0% 92%)', fontWeight: '600', fontSize: '15px', margin: 0 }}>{c.symbol}</p>
                    <p style={{ color: 'hsl(0 0% 55%)', fontSize: '11px', ...mono, margin: 0 }}>{c.name}</p>
                  </div>
                </div>
                <span style={{ fontSize: '10px', ...mono, color: c.active ? c.color : 'hsl(0 0% 40%)', border: `1px solid ${c.active ? c.color + '40' : 'hsl(220 10% 20%)'}`, borderRadius: '20px', padding: '3px 10px', textTransform: 'uppercase' }}>
                  {c.active ? 'Active' : 'Coming Soon'}
                </span>
              </div>
              <p style={{ color: 'hsl(0 0% 55%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Balance</p>
              <p style={{ color: c.active ? 'hsl(0 0% 92%)' : 'hsl(0 0% 40%)', fontSize: '28px', fontWeight: '700', margin: '0 0 16px' }}>
                {c.prefix}{c.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              {c.active ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a href="/transfer" style={{ flex: 1, background: c.color + '15', border: `1px solid ${c.color}40`, color: c.color, borderRadius: '8px', padding: '8px 0', fontSize: '12px', fontWeight: '600', textAlign: 'center', textDecoration: 'none', ...mono }}>Send</a>
                  <a href="/deposit" style={{ flex: 1, background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 65%)', borderRadius: '8px', padding: '8px 0', fontSize: '12px', fontWeight: '600', textAlign: 'center', textDecoration: 'none', ...mono }}>Fund</a>
                  <a href="/mint" style={{ flex: 1, background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 65%)', borderRadius: '8px', padding: '8px 0', fontSize: '12px', fontWeight: '600', textAlign: 'center', textDecoration: 'none', ...mono }}>Issue</a>
                </div>
              ) : (
                <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <p style={{ color: 'hsl(0 0% 40%)', fontSize: '11px', ...mono, margin: 0 }}>Integration coming soon</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* BTC Price ticker */}
        <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '12px', padding: '16px 24px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(142 76% 36%)', boxShadow: '0 0 8px hsl(142 76% 36% / 0.8)' }} />
            <span style={{ color: 'hsl(0 0% 65%)', fontSize: '12px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Live Bitcoin Price</span>
          </div>
          <span style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', ...mono }}>${btcPrice.toLocaleString()}</span>
          <div style={{ display: 'flex', gap: '24px' }}>
            {[
              { label: 'Alert at 130%', color: 'hsl(38 92% 50%)' },
              { label: 'Alert at 120%', color: 'hsl(38 92% 50%)' },
              { label: 'Liquidation at 110%', color: 'hsl(0 84% 60%)' },
            ].map(t => (
              <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.color }} />
                <span style={{ color: 'hsl(0 0% 55%)', fontSize: '11px', ...mono }}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Accounts list */}
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '18px', fontWeight: '600', margin: 0 }}>My Accounts</h2>
          <a href="/vault" style={{ color: 'hsl(205 85% 55%)', fontSize: '13px', textDecoration: 'none', ...mono }}>+ Open Account</a>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px', marginBottom: '40px' }}>
          {(!data?.vaults || data.vaults.length === 0) && (
            <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
              <p style={{ color: 'hsl(0 0% 55%)', ...mono, margin: '0 0 16px' }}>No accounts yet</p>
              <a href="/vault" style={{ backgroundImage: 'var(--gradient-mint)', color: 'white', textDecoration: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '13px', fontWeight: '600' }}>Open Your First Account</a>
            </div>
          )}
          {data?.vaults?.map((vault: any, index: number) => {
            const ratio = getCollateralRatio(vault)
            const ratioColor = getRatioColor(ratio)
            const ubtcBalance = parseFloat(vault.ubtc_minted) || 0
            const btcLocked = vault.btc_amount_sats / 100_000_000
            const btcValue = btcLocked * btcPrice
            const isCustody = vault.account_type === 'custody'
            const accentColor = isCustody ? 'hsl(38 92% 50%)' : 'hsl(205 85% 55%)'

            return (
              <a key={vault.vault_id} href={`/account/${vault.vault_id}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '14px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer' }}>

                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: accentColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '22px' }}>
                    {isCustody ? '🔐' : '💳'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <p style={{ color: 'hsl(0 0% 92%)', fontWeight: '600', fontSize: '15px', margin: 0 }}>{getAccountName(vault, index)}</p>
                      <span style={{ fontSize: '10px', ...mono, color: vault.status === 'active' ? 'hsl(142 76% 36%)' : 'hsl(38 92% 50%)', border: '1px solid currentColor', borderRadius: '20px', padding: '2px 8px', textTransform: 'uppercase', opacity: 0.8 }}>
                        {vault.status === 'pending_deposit' ? 'Needs Funding' : vault.status}
                      </span>
                    </div>
                    <p style={{ color: 'hsl(0 0% 45%)', fontSize: '11px', ...mono, margin: 0 }}>
                      {vault.vault_id} · {btcLocked.toFixed(4)} BTC locked
                    </p>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ color: 'hsl(0 0% 92%)', fontWeight: '700', fontSize: '18px', margin: '0 0 2px', ...mono }}>${ubtcBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                    <p style={{ color: 'hsl(0 0% 55%)', fontSize: '11px', ...mono, margin: 0 }}>UBTC · ${btcValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} BTC value</p>
                  </div>

                  {ratio && (
                    <div style={{ textAlign: 'center', flexShrink: 0, minWidth: '80px' }}>
                      <p style={{ color: ratioColor, fontWeight: '700', fontSize: '18px', margin: '0 0 2px', ...mono }}>{ratio.toFixed(0)}%</p>
                      <p style={{ color: 'hsl(0 0% 55%)', fontSize: '10px', ...mono, margin: 0, textTransform: 'uppercase' }}>Collateral</p>
                    </div>
                  )}

                  {ratio && (
                    <div style={{ width: '80px', flexShrink: 0 }}>
                      <div style={{ height: '4px', background: 'hsl(220 10% 14%)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, (ratio / 300) * 100)}%`, background: ratioColor, borderRadius: '2px' }} />
                      </div>
                      <p style={{ color: 'hsl(0 0% 40%)', fontSize: '10px', ...mono, margin: '4px 0 0', textAlign: 'right' as const }}>
                        {ratio >= 200 ? 'Healthy' : ratio >= 150 ? 'Safe' : ratio >= 120 ? 'Watch' : 'Risk'}
                      </p>
                    </div>
                  )}

                  <div style={{ color: 'hsl(0 0% 40%)', fontSize: '18px', flexShrink: 0 }}>›</div>
                </div>
              </a>
            )
          })}
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { label: 'Open Account', desc: 'Create BTC account', href: '/vault', icon: '🏦' },
            { label: 'Issue UBTC', desc: 'Mint stablecoins', href: '/mint', icon: '💵' },
            { label: 'Send', desc: 'Transfer UBTC', href: '/transfer', icon: '↗️' },
            { label: 'Recover', desc: 'Account recovery', href: '/recovery', icon: '🔐' },
          ].map(a => (
            <a key={a.label} href={a.href} style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '12px', padding: '20px', textDecoration: 'none', display: 'block' }}>
              <span style={{ fontSize: '24px', display: 'block', marginBottom: '10px' }}>{a.icon}</span>
              <p style={{ color: 'hsl(0 0% 92%)', fontWeight: '600', fontSize: '14px', margin: '0 0 4px' }}>{a.label}</p>
              <p style={{ color: 'hsl(0 0% 55%)', fontSize: '11px', ...mono, margin: 0 }}>{a.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
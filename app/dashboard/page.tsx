'use client'
import { useState, useEffect } from 'react'
import { API_URL } from '../lib/supabase'
import { Icons } from '../components/Icons'

export default function Dashboard() {
  const [vaults, setVaults] = useState<any[]>([])
  const [stablecoins, setStablecoins] = useState<any[]>([])
  const [btcPrice, setBtcPrice] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'self' | 'managed'>('self')

  const mono: any = { fontFamily: 'var(--font-mono)' }

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [dashRes, scRes, priceRes] = await Promise.all([
        fetch(`${API_URL}/dashboard`),
        fetch(`${API_URL}/stablecoins`),
        fetch(`${API_URL}/price`),
      ])
      const dash = await dashRes.json()
      const sc = await scRes.json()
      const price = await priceRes.json()
      setVaults(dash.vaults || [])
      setStablecoins(sc.stablecoins || [])
      setBtcPrice(parseFloat(price.btc_usd) || 0)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const selfCustody = ['current', 'savings', 'yield']
  const managed = ['custody_yield', 'prime', 'managed_yield']

  const accountMeta: Record<string, { icon: any; title: string; color: string; tag: string }> = {
    current: { icon: Icons.currentAccount(22, 'hsl(205 85% 55%)'), title: 'Current Account', color: 'hsl(205 85% 55%)', tag: 'Self-Custody' },
    savings: { icon: Icons.savings(22, 'hsl(38 92% 50%)'), title: 'Savings Account', color: 'hsl(38 92% 50%)', tag: 'Self-Custody' },
    yield: { icon: Icons.yield(22, 'hsl(142 76% 36%)'), title: 'Yield Account', color: 'hsl(142 76% 36%)', tag: 'Babylon 3-5%' },
    custody_yield: { icon: Icons.chart(22, 'hsl(205 85% 55%)'), title: 'Custody Yield', color: 'hsl(205 85% 55%)', tag: 'Managed 4-6%' },
    prime: { icon: Icons.vault(22, 'hsl(270 85% 65%)'), title: 'Prime Account', color: 'hsl(270 85% 65%)', tag: 'Managed 5-8%' },
    managed_yield: { icon: Icons.yield(22, 'hsl(142 76% 36%)'), title: 'Managed Yield', color: 'hsl(142 76% 36%)', tag: 'Managed 6-10%' },
  }

  const getScBal = (accountType: string, currency: string) =>
    stablecoins.filter(s => s.account_type === accountType && s.currency === currency)
      .reduce((s, x) => s + parseFloat(x.balance || '0'), 0)

  const getScDep = (accountType: string, currency: string) =>
    stablecoins.filter(s => s.account_type === accountType && s.currency === currency)
      .reduce((s, x) => s + parseFloat(x.deposited_amount || '0'), 0)

  const filteredVaults = vaults.filter(v =>
    tab === 'self' ? selfCustody.includes(v.account_type) : managed.includes(v.account_type)
  )

  const totalUbtc = vaults.reduce((s, v) => s + parseFloat(v.ubtc_minted || '0'), 0)
  const totalUusdt = vaults.reduce((s, v) => s + getScBal(v.account_type, 'UUSDT'), 0)
  const totalUusdc = vaults.reduce((s, v) => s + getScBal(v.account_type, 'UUSDC'), 0)
  const totalBalance = totalUbtc + totalUusdt + totalUusdc
  const totalBtcLocked = vaults.reduce((s, v) => s + (v.btc_amount_sats || 0) / 100_000_000, 0)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'hsl(0 0% 30%)', fontSize: '14px', ...mono }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', fontFamily: 'var(--font-display)' }}>

      {/* Header */}
      <div style={{ background: 'hsl(220 15% 5%)', borderBottom: '1px solid hsl(220 10% 10%)', padding: '0 28px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a href="/" style={{ color: 'hsl(0 0% 38%)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>{Icons.back(20, 'hsl(0 0% 38%)')}</a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {Icons.bitcoin(22, 'hsl(205 85% 55%)')}
            <span style={{ color: 'hsl(0 0% 82%)', fontWeight: '700', fontSize: '17px' }}>UBTC</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <a href="/vault" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 60%)', textDecoration: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: '600' }}>
            {Icons.plus(16, 'hsl(0 0% 60%)')}
            <span>New Account</span>
          </a>
        <a href="/wallet" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'hsl(205 85% 55% / 0.1)', border: '1px solid hsl(205 85% 55% / 0.3)', color: 'hsl(205 85% 65%)', textDecoration: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: '600' }}>
            {Icons.wallet(16, 'hsl(205 85% 65%)')}
            <span>My Wallet</span>
          </a>         
 <button onClick={loadAll} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'hsl(0 0% 30%)' }}>
            {Icons.refresh(20, 'hsl(0 0% 30%)')}
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ background: 'hsl(220 15% 4%)', borderBottom: '1px solid hsl(220 10% 9%)', padding: '28px 32px' }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0 0 6px' }}>Total Portfolio</p>
            <p style={{ color: 'hsl(0 0% 92%)', fontSize: '42px', fontWeight: '700', ...mono, margin: '0 0 4px', lineHeight: '1' }}>
              ${totalBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p style={{ color: 'hsl(0 0% 28%)', fontSize: '12px', ...mono, margin: 0 }}>
              {totalBtcLocked.toFixed(4)} BTC locked · ${(totalBtcLocked * btcPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })} collateral
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[
              { icon: Icons.bitcoin(16, 'hsl(38 92% 50%)'), label: 'UBTC', val: '$' + totalUbtc.toLocaleString(undefined, { maximumFractionDigits: 0 }), color: 'hsl(38 92% 50%)' },
              { icon: Icons.savings(16, 'hsl(142 76% 36%)'), label: 'UUSDT', val: '$' + totalUusdt.toLocaleString(undefined, { maximumFractionDigits: 0 }), color: 'hsl(142 76% 36%)' },
              { icon: Icons.savings(16, 'hsl(220 85% 60%)'), label: 'UUSDC', val: '$' + totalUusdc.toLocaleString(undefined, { maximumFractionDigits: 0 }), color: 'hsl(220 85% 60%)' },
              { icon: Icons.chart(16, 'hsl(0 0% 45%)'), label: 'BTC', val: '$' + btcPrice.toLocaleString(), color: 'hsl(0 0% 45%)' },
            ].map(item => (
              <div key={item.label} style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 13%)', borderRadius: '12px', padding: '12px 16px', textAlign: 'center' as const, minWidth: '90px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center', marginBottom: '5px' }}>
                  {item.icon}
                  <p style={{ color: 'hsl(0 0% 32%)', fontSize: '9px', ...mono, textTransform: 'uppercase', margin: 0 }}>{item.label}</p>
                </div>
                <p style={{ color: item.color, fontWeight: '700', fontSize: '14px', ...mono, margin: 0 }}>{item.val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '28px 28px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'hsl(220 12% 8%)', borderRadius: '14px', padding: '4px', marginBottom: '24px', width: 'fit-content' }}>
          {[
            { key: 'self', icon: Icons.shield(16, tab === 'self' ? 'hsl(205 85% 55%)' : 'hsl(0 0% 35%)'), label: 'Self-Custody' },
            { key: 'managed', icon: Icons.vault(16, tab === 'managed' ? 'hsl(205 85% 55%)' : 'hsl(0 0% 35%)'), label: 'Managed Custody' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)} style={{ display: 'flex', alignItems: 'center', gap: '7px', background: tab === t.key ? 'hsl(220 15% 14%)' : 'transparent', border: tab === t.key ? '1px solid hsl(220 10% 20%)' : '1px solid transparent', color: tab === t.key ? 'hsl(0 0% 88%)' : 'hsl(0 0% 38%)', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', transition: 'all 0.15s' }}>
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Account cards */}
        {filteredVaults.length === 0 ? (
          <div style={{ background: 'hsl(220 12% 8%)', border: '1px dashed hsl(220 10% 16%)', borderRadius: '20px', padding: '60px', textAlign: 'center' as const }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', opacity: 0.3 }}>
              {Icons.vault(48, 'hsl(205 85% 55%)')}
            </div>
            <p style={{ color: 'hsl(0 0% 38%)', fontSize: '16px', fontWeight: '600', margin: '0 0 8px' }}>No accounts yet</p>
            <p style={{ color: 'hsl(0 0% 28%)', fontSize: '13px', ...mono, margin: '0 0 24px' }}>Create your first account to get started</p>
            <a href="/vault" style={{ background: 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))', color: 'white', textDecoration: 'none', borderRadius: '12px', padding: '12px 28px', fontSize: '14px', fontWeight: '700', fontFamily: 'var(--font-display)', display: 'inline-block' }}>
              Create Account →
            </a>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '16px' }}>
            {filteredVaults.map(vault => {
              const meta = accountMeta[vault.account_type] || { icon: Icons.currentAccount(22, 'hsl(205 85% 55%)'), title: vault.account_type, color: 'hsl(205 85% 55%)', tag: '' }
              const btcLocked = vault.btc_amount_sats / 100_000_000
              const btcValue = btcLocked * btcPrice
              const ubtcBal = parseFloat(vault.ubtc_minted || '0')
              const uusdtBal = getScBal(vault.account_type, 'UUSDT')
              const uusdcBal = getScBal(vault.account_type, 'UUSDC')
              const uusdtDep = getScDep(vault.account_type, 'UUSDT')
              const uusdcDep = getScDep(vault.account_type, 'UUSDC')
              const total = ubtcBal + uusdtBal + uusdcBal
              const ratio = ubtcBal > 0 ? (btcValue / ubtcBal * 100) : 0
              const ratioColor = ratio >= 200 ? 'hsl(142 76% 36%)' : ratio >= 150 ? 'hsl(38 92% 50%)' : ratio > 0 ? 'hsl(0 84% 60%)' : 'hsl(0 0% 35%)'

              return (
                <div key={vault.vault_id} style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 13%)', borderRadius: '20px', overflow: 'hidden' }}>

                  {/* Card header */}
                  <div style={{ padding: '20px 22px', borderBottom: '1px solid hsl(220 10% 11%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: meta.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {meta.icon}
                      </div>
                      <div>
                        <p style={{ color: 'hsl(0 0% 88%)', fontWeight: '700', fontSize: '15px', margin: '0 0 3px' }}>{meta.title}</p>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ fontSize: '9px', ...mono, color: meta.color, border: `1px solid ${meta.color}35`, borderRadius: '20px', padding: '2px 8px' }}>{meta.tag}</span>
                          <span style={{ fontSize: '9px', ...mono, color: vault.status === 'active' ? 'hsl(142 76% 36%)' : 'hsl(38 92% 50%)', }}>
                            {vault.status === 'active' ? '● Active' : '○ Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' as const }}>
                      <p style={{ color: 'hsl(0 0% 92%)', fontWeight: '700', fontSize: '22px', ...mono, margin: '0 0 2px', lineHeight: '1' }}>
                        ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                      <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, margin: 0 }}>total balance</p>
                    </div>
                  </div>

                  {/* Currency rows */}
                  <div style={{ padding: '10px 12px' }}>
                    {/* UBTC */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 12px', background: 'hsl(220 15% 5%)', borderRadius: '12px', marginBottom: '6px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'hsl(38 92% 50% / 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {Icons.bitcoin(18, 'hsl(38 92% 50%)')}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: 'hsl(0 0% 78%)', fontWeight: '600', fontSize: '13px', margin: '0 0 1px' }}>UBTC</p>
                        <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, margin: 0 }}>
                          {btcLocked.toFixed(4)} BTC locked
                          {ratio > 0 && <span style={{ color: ratioColor, marginLeft: '8px' }}>· {ratio.toFixed(0)}% collateral</span>}
                        </p>
                      </div>
                      <p style={{ color: 'hsl(38 92% 50%)', fontWeight: '700', fontSize: '15px', ...mono, margin: 0 }}>
                        ${ubtcBal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>

                    {/* UUSDT */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 12px', background: 'hsl(220 15% 5%)', borderRadius: '12px', marginBottom: '6px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'hsl(142 76% 36% / 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {Icons.lock(18, 'hsl(142 76% 36%)')}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: 'hsl(0 0% 78%)', fontWeight: '600', fontSize: '13px', margin: '0 0 1px' }}>UUSDT</p>
                        <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, margin: 0 }}>
                          {uusdtDep > 0 ? `$${uusdtDep.toLocaleString()} USDT locked` : 'Not added'}
                        </p>
                      </div>
                      {uusdtBal > 0
                        ? <p style={{ color: 'hsl(142 76% 36%)', fontWeight: '700', fontSize: '15px', ...mono, margin: 0 }}>${uusdtBal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        : <a href={`/deposit?vault=${vault.vault_id}&currency=uusdt`} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'hsl(142 76% 36% / 0.08)', border: '1px solid hsl(142 76% 36% / 0.25)', color: 'hsl(142 76% 36%)', textDecoration: 'none', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', fontWeight: '600', ...mono }}>
                            {Icons.plus(12, 'hsl(142 76% 36%)')} Add
                          </a>
                      }
                    </div>

                    {/* UUSDC */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 12px', background: 'hsl(220 15% 5%)', borderRadius: '12px', marginBottom: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'hsl(220 85% 60% / 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {Icons.lock(18, 'hsl(220 85% 60%)')}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: 'hsl(0 0% 78%)', fontWeight: '600', fontSize: '13px', margin: '0 0 1px' }}>UUSDC</p>
                        <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, margin: 0 }}>
                          {uusdcDep > 0 ? `$${uusdcDep.toLocaleString()} USDC locked` : 'Not added'}
                        </p>
                      </div>
                      {uusdcBal > 0
                        ? <p style={{ color: 'hsl(220 85% 60%)', fontWeight: '700', fontSize: '15px', ...mono, margin: 0 }}>${uusdcBal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        : <a href={`/deposit?vault=${vault.vault_id}&currency=uusdc`} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'hsl(220 85% 60% / 0.08)', border: '1px solid hsl(220 85% 60% / 0.25)', color: 'hsl(220 85% 60%)', textDecoration: 'none', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', fontWeight: '600', ...mono }}>
                            {Icons.plus(12, 'hsl(220 85% 60%)')} Add
                          </a>
                      }
                    </div>

                    {/* Open account button */}
                    <a href={`/account/${vault.vault_id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: meta.color + '08', border: `1px solid ${meta.color}22`, borderRadius: '12px', padding: '12px 16px', textDecoration: 'none' }}>
                      <span style={{ color: meta.color, fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-display)' }}>Open Account</span>
                      {Icons.chevronRight(18, meta.color)}
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Add account prompt */}
        {filteredVaults.length > 0 && (
          <a href="/vault" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px', background: 'hsl(220 12% 8%)', border: '1px dashed hsl(220 10% 16%)', borderRadius: '16px', padding: '18px 22px', textDecoration: 'none', transition: 'border-color 0.15s' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'hsl(220 12% 12%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {Icons.plus(20, 'hsl(0 0% 35%)')}
            </div>
            <div>
              <p style={{ color: 'hsl(0 0% 55%)', fontWeight: '600', fontSize: '14px', margin: '0 0 2px' }}>Open Another Account</p>
              <p style={{ color: 'hsl(0 0% 28%)', fontSize: '12px', ...mono, margin: 0 }}>Current, Savings, Yield or Managed</p>
            </div>
          </a>
        )}
      </div>
    </div>
  )
}
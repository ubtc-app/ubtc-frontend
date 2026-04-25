'use client'
import { useState, useEffect, useRef } from 'react'
import { API_URL } from '../lib/supabase'
import { Icons } from '../components/Icons'

export default function Dashboard() {
  const [vaults, setVaults] = useState<any[]>([])
  const [stablecoins, setStablecoins] = useState<any[]>([])
  const [btcPrice, setBtcPrice] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'self' | 'managed'>('self')
  const [scanning, setScanning] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<Record<string, string>>({})
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const mono: any = { fontFamily: 'var(--font-mono)' }

  useEffect(() => {
    loadAll()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  // Auto-poll pending vaults every 30 seconds
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    const hasPending = vaults.some(v => v.status === 'pending_deposit')
    if (hasPending) {
      pollRef.current = setInterval(async () => {
        const pending = vaults.filter(v => v.status === 'pending_deposit')
        for (const v of pending) {
          await scanVault(v.vault_id, true)
        }
      }, 30_000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [vaults])

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

  const scanVault = async (vaultId: string, silent = false) => {
    if (!silent) setScanning(vaultId)
    try {
      const res = await fetch(`${API_URL}/deposit/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vault_id: vaultId })
      })
      const data = await res.json()
      if (data.found) {
        setScanResult(prev => ({ ...prev, [vaultId]: `✅ ${data.amount_btc} BTC detected — vault active` }))
        await loadAll()
      } else {
        if (!silent) setScanResult(prev => ({ ...prev, [vaultId]: 'No deposit found yet. Check back in a few minutes.' }))
      }
    } catch {
      if (!silent) setScanResult(prev => ({ ...prev, [vaultId]: 'Scan failed — check your connection' }))
    }
    if (!silent) setScanning(null)
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

      {/* Summary bar */}
      <div style={{ background: 'hsl(220 15% 4%)', borderBottom: '1px solid hsl(220 10% 9%)', padding: '28px 32px' }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.2em', margin: '0 0 6px' }}>Total Collateral · BTC locked in USD</p>
            <p style={{ color: 'hsl(0 0% 92%)', fontSize: '42px', fontWeight: '700', ...mono, margin: '0 0 4px', lineHeight: '1' }}>
              ${(totalBtcLocked * btcPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p style={{ color: 'hsl(142 76% 36%)', fontSize: '12px', fontWeight: '600', ...mono, margin: '0 0 2px' }}>
              ${(totalBtcLocked * btcPrice - totalUbtc).toLocaleString(undefined, { maximumFractionDigits: 2 })} available to mint
            </p>
            <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, margin: 0 }}>
              {totalBtcLocked.toFixed(6)} BTC locked · {totalUbtc.toLocaleString()} UBTC debt outstanding
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
                  <p style={{ color: 'hsl(0 0% 32%)', fontSize: '9px', ...mono, textTransform: 'uppercase' as const, margin: 0 }}>{item.label}</p>
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
           const total = btcValue
              const availableToMint = Math.max(0, (btcValue / 1.5) - ubtcBal)
              const ratio = ubtcBal > 0 ? (btcValue / ubtcBal * 100) : 0
              const ratioColor = ratio >= 200 ? 'hsl(142 76% 36%)' : ratio >= 150 ? 'hsl(38 92% 50%)' : ratio > 0 ? 'hsl(0 84% 60%)' : 'hsl(0 0% 35%)'
              const isPending = vault.status === 'pending_deposit'
              const isScanning = scanning === vault.vault_id
              const thisScanResult = scanResult[vault.vault_id]

              return (
                <div key={vault.vault_id} style={{ background: 'hsl(220 12% 8%)', border: `1px solid ${isPending ? 'hsl(38 92% 50% / 0.3)' : 'hsl(220 10% 13%)'}`, borderRadius: '20px', overflow: 'hidden' }}>

                  {/* Pending deposit banner */}
                  {isPending && (
                    <div style={{ background: 'hsl(38 92% 50% / 0.08)', borderBottom: '1px solid hsl(38 92% 50% / 0.2)', padding: '12px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(38 92% 50%)', animation: 'pulse 2s infinite' }} />
                          <p style={{ color: 'hsl(38 92% 55%)', fontSize: '12px', ...mono, margin: 0 }}>
                            Waiting for Bitcoin deposit · auto-checking every 30s
                          </p>
                        </div>
                        <button
                          onClick={() => scanVault(vault.vault_id)}
                          disabled={isScanning}
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'hsl(38 92% 50%)', color: '#000', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: '700', cursor: isScanning ? 'not-allowed' : 'pointer', ...mono, flexShrink: 0, opacity: isScanning ? 0.7 : 1 }}
                        >
                          {Icons.refresh(12, '#000')}
                          {isScanning ? 'Scanning...' : 'Scan Now'}
                        </button>
                      </div>
                      {thisScanResult && (
                        <p style={{ color: thisScanResult.startsWith('✅') ? 'hsl(142 76% 45%)' : 'hsl(0 0% 40%)', fontSize: '11px', ...mono, margin: '8px 0 0' }}>
                          {thisScanResult}
                        </p>
                      )}
                      <div style={{ marginTop: '10px', background: 'hsl(220 15% 5%)', borderRadius: '8px', padding: '10px 12px' }}>
                        <p style={{ color: 'hsl(0 0% 28%)', fontSize: '9px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.12em', margin: '0 0 4px' }}>Send BTC to this address</p>
                        <p style={{ color: 'hsl(205 85% 60%)', fontSize: '11px', ...mono, margin: 0, wordBreak: 'break-all' as const }}>
                          {vault.mast_address || vault.deposit_address}
                        </p>
                      </div>
                    </div>
                  )}

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
                          <span style={{ fontSize: '9px', ...mono, color: isPending ? 'hsl(38 92% 50%)' : 'hsl(142 76% 36%)' }}>
                            {isPending ? '○ Awaiting Deposit' : '● Active'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' as const }}>
                    <p style={{ color: 'hsl(0 0% 92%)', fontWeight: '700', fontSize: '22px', ...mono, margin: '0 0 2px', lineHeight: '1' }}>
                        ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p style={{ color: 'hsl(142 76% 36%)', fontSize: '10px', ...mono, margin: '0 0 1px' }}>BTC collateral · live price</p>
                      <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, margin: '0 0 1px' }}>{ubtcBal > 0 ? ubtcBal.toFixed(2) + ' UBTC minted' : 'No UBTC minted'}</p>
                      <p style={{ color: 'hsl(38 92% 50%)', fontSize: '10px', ...mono, margin: 0 }}>${availableToMint.toFixed(2)} available to mint</p>
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

                  <a href={`/account/${vault.vault_id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: meta.color + '08', border: `1px solid ${meta.color}22`, borderRadius: '12px', padding: '12px 16px', textDecoration: 'none' }}>
                      <span style={{ color: meta.color, fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-display)' }}>View Account</span>
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
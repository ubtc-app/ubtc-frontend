'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { API_URL } from '../lib/supabase'

function RedeemContent() {
  const searchParams = useSearchParams()
  const vaultId = searchParams.get('vault') || ''
  const currencyParam = (searchParams.get('currency') || 'ubtc').toLowerCase()

  const [vault, setVault] = useState<any>(null)
  const [stablecoins, setStablecoins] = useState<any[]>([])
  const [btcPrice, setBtcPrice] = useState(0)
  const [activeCurrency, setActiveCurrency] = useState(currencyParam)
  const [amount, setAmount] = useState('')
  const [destination, setDestination] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const mono: any = { fontFamily: 'var(--font-mono)' }
  const inputBase: any = { display: 'block', width: '100%', padding: '14px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '12px', color: 'hsl(0 0% 92%)', fontSize: '14px', fontFamily: 'var(--font-mono)', boxSizing: 'border-box' as const, outline: 'none' }

  const isUusdt = activeCurrency === 'uusdt'
  const isUusdc = activeCurrency === 'uusdc'
  const isStable = isUusdt || isUusdc
  const utokenName = isUusdt ? 'UUSDT' : isUusdc ? 'UUSDC' : 'UBTC'
  const tokenName = isUusdt ? 'USDT' : isUusdc ? 'USDC' : 'BTC'
  const tokenColor = isUusdt ? 'hsl(142 76% 36%)' : isUusdc ? 'hsl(220 85% 60%)' : 'hsl(38 92% 50%)'
  const tokenIcon = isUusdt ? '₮' : isUusdc ? '$' : '₿'

  useEffect(() => {
    if (vaultId) {
      fetch(`${API_URL}/vaults/${vaultId}`).then(r => r.json()).then(setVault)
      fetch(`${API_URL}/price`).then(r => r.json()).then(d => setBtcPrice(parseFloat(d.btc_usd) || 0))
      fetch(`${API_URL}/stablecoins`).then(r => r.json()).then(d => setStablecoins(d.stablecoins || []))
    }
  }, [vaultId])

  const btcLocked = (vault?.btc_amount_sats || 0) / 100_000_000
  const ubtcBalance = parseFloat(vault?.ubtc_minted || '0')
  const accountType = vault?.account_type || ''
  const scVaults = stablecoins.filter(s => s.account_type === accountType)
  const uusdtBal = scVaults.filter(s => s.currency === 'UUSDT').reduce((s, x) => s + parseFloat(x.balance || '0'), 0)
  const uusdtDeposited = scVaults.filter(s => s.currency === 'UUSDT').reduce((s, x) => s + parseFloat(x.deposited_amount || '0'), 0)
  const uusdcBal = scVaults.filter(s => s.currency === 'UUSDC').reduce((s, x) => s + parseFloat(x.balance || '0'), 0)
  const uusdcDeposited = scVaults.filter(s => s.currency === 'UUSDC').reduce((s, x) => s + parseFloat(x.deposited_amount || '0'), 0)
  const activeBalance = isUusdt ? uusdtBal : isUusdc ? uusdcBal : ubtcBalance
  const activeDeposited = isUusdt ? uusdtDeposited : isUusdc ? uusdcDeposited : btcLocked

  const youReceive = () => {
    if (!amount || parseFloat(amount) <= 0) return null
    if (isStable) return `$${parseFloat(amount).toLocaleString()} ${tokenName}`
    const btcBack = ((parseFloat(amount) / (ubtcBalance || 1)) * btcLocked).toFixed(6)
    return `${btcBack} BTC ($${(parseFloat(btcBack) * btcPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })})`
  }

  const handleRedeem = async () => {
    if (!amount || !destination) return
    setLoading(true); setError('')
    try {
      if (isStable) {
        const scVault = scVaults.find(s => s.currency === utokenName)
        if (!scVault) throw new Error(`No ${utokenName} vault found — please add ${utokenName} to this account first`)
        const res = await fetch(`${API_URL}/stablecoin/burn`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vault_id: scVault.vault_id, amount })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setResult({ ...data, destination })
      } else {
        const res = await fetch(`${API_URL}/redeem`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vault_id: vaultId, ubtc_to_burn: amount, destination_address: destination })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setResult(data)
      }
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const canRedeem = !!amount && !!destination && parseFloat(amount) > 0 && parseFloat(amount) <= activeBalance && !loading

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', fontFamily: 'var(--font-display)' }}>

      {/* Nav */}
      <div style={{ background: 'hsl(220 15% 5%)', borderBottom: '1px solid hsl(220 10% 10%)', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <a href={`/account/${vaultId}?currency=${activeCurrency}`} style={{ color: 'hsl(0 0% 50%)', textDecoration: 'none', fontSize: '13px', ...mono, background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '8px', padding: '8px 14px' }}>← Back</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: tokenColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: tokenColor }}>{tokenIcon}</div>
          <div>
            <p style={{ color: 'hsl(0 0% 92%)', fontWeight: '700', fontSize: '17px', margin: 0 }}>Redeem {utokenName}</p>
            <p style={{ color: 'hsl(0 0% 38%)', fontSize: '11px', ...mono, margin: 0 }}>Burn {utokenName} → receive {tokenName} from vault</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '28px 20px' }}>

        {result ? (
          <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: 'hsl(142 76% 36% / 0.1)', border: '2px solid hsl(142 76% 36% / 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>✓</div>
            <div style={{ textAlign: 'center' as const }}>
              <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '26px', fontWeight: '700', margin: '0 0 6px' }}>Redemption Complete</h2>
              <p style={{ color: 'hsl(0 0% 45%)', fontSize: '14px', ...mono, margin: 0 }}>{amount} {utokenName} burned · {tokenName} released</p>
            </div>
            <div style={{ width: '100%', background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 13%)', borderRadius: '18px', padding: '22px' }}>
              {(isStable ? [
                { label: `${utokenName} Burned`, value: (result.burned || amount) + ' ' + utokenName },
                { label: `${tokenName} Released`, value: '$' + parseFloat(result.returned || amount).toLocaleString() + ' ' + tokenName },
                { label: 'Destination', value: result.destination || destination },
                { label: 'Burn ID', value: result.burn_id },
                { label: 'Note', value: `${tokenName} sent to your ERC-20 address` },
              ] : [
                { label: 'UBTC Burned', value: (result.ubtc_burned || amount) + ' UBTC' },
                { label: 'BTC Released', value: result.btc_sent + ' BTC' },
                { label: 'Destination', value: result.destination_address },
                { label: 'Transaction ID', value: result.txid },
                { label: 'Vault Status', value: result.vault_status },
              ]).map((item: any) => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid hsl(220 10% 11%)', gap: '12px' }}>
                  <p style={{ color: 'hsl(0 0% 38%)', fontSize: '12px', ...mono, margin: 0, flexShrink: 0 }}>{item.label}</p>
                  <p style={{ color: 'hsl(0 0% 85%)', fontSize: '12px', fontWeight: '600', ...mono, margin: 0, textAlign: 'right' as const, wordBreak: 'break-all' as const }}>{item.value}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button onClick={() => { setResult(null); setAmount(''); setDestination('') }} style={{ flex: 1, background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 60%)', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>Redeem More</button>
              <a href={`/account/${vaultId}?currency=${activeCurrency}`} style={{ flex: 1, background: 'linear-gradient(135deg, hsl(205, 85%, 55%), hsl(190, 80%, 50%))', color: 'white', textDecoration: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '600', fontFamily: 'var(--font-display)', textAlign: 'center' as const, display: 'block' }}>Done →</a>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>

            {/* Currency tabs */}
            <div style={{ display: 'flex', gap: '4px', background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 13%)', borderRadius: '16px', padding: '4px' }}>
              {[
                { key: 'ubtc', icon: '₿', label: 'UBTC → BTC', bal: ubtcBalance, color: 'hsl(38 92% 50%)' },
                { key: 'uusdt', icon: '₮', label: 'UUSDT → USDT', bal: uusdtBal, color: 'hsl(142 76% 36%)' },
                { key: 'uusdc', icon: '$', label: 'UUSDC → USDC', bal: uusdcBal, color: 'hsl(220 85% 60%)' },
              ].map(c => (
                <button key={c.key} onClick={() => { setActiveCurrency(c.key); setAmount(''); setError('') }} style={{ flex: 1, background: activeCurrency === c.key ? 'hsl(220 15% 14%)' : 'transparent', border: activeCurrency === c.key ? '1px solid hsl(220 10% 20%)' : '1px solid transparent', color: activeCurrency === c.key ? 'hsl(0 0% 88%)' : 'hsl(0 0% 38%)', borderRadius: '12px', padding: '13px 8px', cursor: 'pointer', fontFamily: 'var(--font-display)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '5px', transition: 'all 0.15s' }}>
                  <span style={{ color: c.color, fontWeight: '700', fontSize: '20px' }}>{c.icon}</span>
                  <span style={{ fontSize: '11px', fontWeight: '600' }}>{c.label}</span>
                  <span style={{ fontSize: '10px', color: c.color, ...mono }}>${c.bal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </button>
              ))}
            </div>

            {/* Balance */}
            <div style={{ background: tokenColor + '08', border: `1px solid ${tokenColor}28`, borderRadius: '18px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: activeDeposited > 0 ? '14px' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: tokenColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '700', color: tokenColor }}>{tokenIcon}</div>
                  <div>
                    <p style={{ color: 'hsl(0 0% 88%)', fontWeight: '700', fontSize: '16px', margin: '0 0 3px' }}>{utokenName}</p>
                    <p style={{ color: 'hsl(0 0% 38%)', fontSize: '11px', ...mono, margin: 0 }}>
                      {isStable ? `1:1 ${tokenName} · Burn to release ${tokenName} from quantum vault` : 'BTC-backed · Burn to release BTC from Taproot vault'}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' as const }}>
                  <p style={{ color: tokenColor, fontWeight: '700', fontSize: '26px', ...mono, margin: '0 0 2px', lineHeight: '1' }}>${activeBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p style={{ color: 'hsl(0 0% 32%)', fontSize: '11px', ...mono, margin: 0 }}>available</p>
                </div>
              </div>
              {activeDeposited > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '10px', padding: '10px 12px' }}>
                    <p style={{ color: 'hsl(0 0% 35%)', fontSize: '9px', ...mono, textTransform: 'uppercase', margin: '0 0 3px' }}>{isStable ? tokenName + ' Locked in Vault' : 'BTC Locked'}</p>
                    <p style={{ color: tokenColor, fontWeight: '700', fontSize: '14px', ...mono, margin: 0 }}>
                      {isStable ? `$${activeDeposited.toLocaleString()} ${tokenName}` : `${btcLocked.toFixed(4)} BTC`}
                    </p>
                  </div>
                  <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '10px', padding: '10px 12px' }}>
                    <p style={{ color: 'hsl(0 0% 35%)', fontSize: '9px', ...mono, textTransform: 'uppercase', margin: '0 0 3px' }}>{isStable ? 'USD Value' : 'BTC Value'}</p>
                    <p style={{ color: 'hsl(0 0% 65%)', fontWeight: '700', fontSize: '14px', ...mono, margin: 0 }}>
                      {isStable ? `$${activeDeposited.toLocaleString()}` : `$${(btcLocked * btcPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Amount */}
            <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 13%)', borderRadius: '18px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <p style={{ color: 'hsl(0 0% 35%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Amount to Redeem</p>
                <button onClick={() => setAmount(activeBalance.toFixed(2))} style={{ background: tokenColor + '14', border: `1px solid ${tokenColor}35`, color: tokenColor, borderRadius: '8px', padding: '5px 12px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', ...mono }}>Max</button>
              </div>
              <div style={{ position: 'relative' as const, marginBottom: '12px' }}>
                <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" type="number" style={{ ...inputBase, fontSize: '32px', fontWeight: '700', color: 'hsl(0 84% 60%)', paddingRight: '100px' }} />
                <span style={{ position: 'absolute' as const, right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(0 84% 60%)', fontWeight: '700', fontSize: '13px', ...mono }}>{utokenName}</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: amount && parseFloat(amount) > 0 ? '12px' : '0' }}>
                {[25, 50, 75, 100].map(pct => (
                  <button key={pct} onClick={() => setAmount((activeBalance * pct / 100).toFixed(2))} style={{ flex: 1, background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 14%)', color: 'hsl(0 0% 45%)', borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', ...mono }}>{pct}%</button>
                ))}
              </div>
              {amount && parseFloat(amount) > 0 && parseFloat(amount) <= activeBalance && (
                <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ color: 'hsl(0 0% 38%)', fontSize: '12px', ...mono, margin: 0 }}>You receive</p>
                  <p style={{ color: tokenColor, fontSize: '15px', fontWeight: '700', ...mono, margin: 0 }}>{youReceive()}</p>
                </div>
              )}
            </div>

            {/* Destination */}
            <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 13%)', borderRadius: '18px', padding: '20px' }}>
              <p style={{ color: 'hsl(0 0% 35%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 12px' }}>
                {isStable ? `Destination ${tokenName} Address (ERC-20 Ethereum)` : 'Destination Bitcoin Address'}
              </p>
              <input value={destination} onChange={e => setDestination(e.target.value)} placeholder={isStable ? '0x... Ethereum ERC-20 address' : 'bc1q... or regtest address'} style={{ ...inputBase, marginBottom: '10px' }} />
              <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, margin: 0, lineHeight: '1.5' }}>
                {isStable
                  ? `Your ${tokenName} is released from the quantum vault and sent to this ERC-20 address on Ethereum. Only ERC-20 supported — TRC-20 and BEP-20 coming soon.`
                  : 'Your BTC is released from the Taproot vault and sent on-chain to this Bitcoin address.'}
              </p>
            </div>

            {/* Warning */}
            <div style={{ background: 'hsl(0 84% 60% / 0.05)', border: '1px solid hsl(0 84% 60% / 0.18)', borderRadius: '14px', padding: '14px 16px' }}>
              <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>
                ⚠ Burning {utokenName} is irreversible. {isStable
                  ? `$${amount ? parseFloat(amount).toLocaleString() : '0'} ${tokenName} will be released from your quantum vault.`
                  : `Proportional BTC will be released from your Taproot vault on-chain.`}
              </p>
            </div>

            {error && (
              <div style={{ background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.25)', borderRadius: '12px', padding: '14px 16px' }}>
                <p style={{ color: 'hsl(0 84% 60%)', fontSize: '13px', ...mono, margin: 0 }}>{error}</p>
              </div>
            )}

            {parseFloat(amount || '0') > activeBalance && (
              <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, margin: 0 }}>⚠ Exceeds balance of ${activeBalance.toLocaleString()} {utokenName}</p>
            )}

            <button onClick={handleRedeem} disabled={!canRedeem} style={{ width: '100%', background: canRedeem ? `linear-gradient(135deg, ${tokenColor}, ${tokenColor}bb)` : 'hsl(220 10% 11%)', color: canRedeem ? 'white' : 'hsl(0 0% 28%)', border: 'none', borderRadius: '14px', padding: '18px', fontSize: '16px', fontWeight: '700', cursor: canRedeem ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', boxShadow: canRedeem ? `0 0 40px ${tokenColor}45` : 'none', transition: 'all 0.2s' }}>
              {loading ? 'Processing...' : canRedeem ? `Burn ${parseFloat(amount).toLocaleString()} ${utokenName} → Receive ${tokenName}` : 'Enter amount and destination'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function RedeemPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', color: 'hsl(0 0% 35%)' }}>Loading...</div>}>
      <RedeemContent />
    </Suspense>
  )
}
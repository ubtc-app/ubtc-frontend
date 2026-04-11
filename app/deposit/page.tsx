'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { API_URL } from '../lib/supabase'

function DepositContent() {
  const searchParams = useSearchParams()
  const vaultId = searchParams.get('vault') || ''
  const currencyParam = (searchParams.get('currency') || 'ubtc').toLowerCase()

  const [vault, setVault] = useState<any>(null)
  const [stablecoins, setStablecoins] = useState<any[]>([])
  const [btcPrice, setBtcPrice] = useState(0)
  const [activeCurrency, setActiveCurrency] = useState(currencyParam)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  const mono: any = { fontFamily: 'var(--font-mono)' }

  const isUusdt = activeCurrency === 'uusdt'
  const isUusdc = activeCurrency === 'uusdc'
  const isStable = isUusdt || isUusdc
  const tokenName = isUusdt ? 'USDT' : isUusdc ? 'USDC' : 'BTC'
  const utokenName = isUusdt ? 'UUSDT' : isUusdc ? 'UUSDC' : 'UBTC'
  const tokenColor = isUusdt ? 'hsl(142 76% 36%)' : isUusdc ? 'hsl(220 85% 60%)' : 'hsl(38 92% 50%)'
  const tokenIcon = isUusdt ? '₮' : isUusdc ? '$' : '₿'

  const stablecoinAddr = vaultId
    ? '0x' + vaultId.replace('vault_', '').padEnd(40, 'a1b2c3d4e5f67890abcdef12')
    : '0xa1b2c3d4e5f6789012345678901234567890abcd'

  useEffect(() => {
    if (vaultId) {
      fetch(`${API_URL}/vaults/${vaultId}`).then(r => r.json()).then(setVault)
      fetch(`${API_URL}/price`).then(r => r.json()).then(d => setBtcPrice(parseFloat(d.btc_usd) || 0))
      fetch(`${API_URL}/stablecoins`).then(r => r.json()).then(d => setStablecoins(d.stablecoins || []))
    }
  }, [vaultId])

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(''), 2000)
  }

  const btcLocked = (vault?.btc_amount_sats || 0) / 100_000_000
  const btcValue = btcLocked * btcPrice
  const ubtcMinted = parseFloat(vault?.ubtc_minted || '0')
  const maxMintable = Math.max(0, (btcValue / 1.5) - ubtcMinted)

  // Deposit BTC (regtest simulate)
  const depositBtc = async () => {
    if (!amount || !vaultId) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_URL}/deposit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vault_id: vaultId, amount_btc: amount })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  // Deposit stablecoin (adds to deposited_amount — ready to mint)
  const depositStable = async () => {
    if (!amount || !vaultId) return
    setLoading(true); setError('')
    try {
      const accountType = vault?.account_type || 'current'
      const currency = isUusdt ? 'UUSDT' : 'UUSDC'
      const existingSc = stablecoins.find(s => s.currency === currency && s.account_type === accountType)

      if (existingSc) {
        // Add more to existing vault — just deposit (no mint here — user goes to mint page)
        const res = await fetch(`${API_URL}/stablecoin/deposit`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currency, amount, account_type: accountType })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setResult({ ...data, deposited: amount, currency })
      } else {
        const res = await fetch(`${API_URL}/stablecoin/deposit`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currency, amount, account_type: accountType })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setResult({ ...data, deposited: amount, currency })
      }
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const canDeposit = !!amount && parseFloat(amount) > 0 && (!isStable || parseFloat(amount) >= 10) && !loading

  const inputStyle: any = { width: '100%', padding: '14px 16px', background: 'transparent', border: 'none', color: tokenColor, fontSize: '40px', fontWeight: '700', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', fontFamily: 'var(--font-display)' }}>

      {/* Header */}
      <div style={{ background: 'hsl(220 15% 5%)', borderBottom: '1px solid hsl(220 10% 10%)', padding: '0 28px', height: '64px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <a href={`/account/${vaultId}?currency=${activeCurrency}`} style={{ color: 'hsl(0 0% 40%)', textDecoration: 'none', fontSize: '13px', ...mono }}>← Back</a>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: tokenColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: tokenColor }}>{tokenIcon}</div>
          <span style={{ color: 'hsl(0 0% 80%)', fontWeight: '700', fontSize: '17px' }}>Deposit {tokenName}</span>
        </div>
        <div style={{ width: '40px' }} />
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 20px' }}>

        {result ? (
          /* Success */
          <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: 'hsl(142 76% 36% / 0.1)', border: '2px solid hsl(142 76% 36% / 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>✓</div>
            <div style={{ textAlign: 'center' as const }}>
              <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '28px', fontWeight: '700', margin: '0 0 6px' }}>Deposited</h2>
              <p style={{ color: 'hsl(0 0% 40%)', fontSize: '14px', ...mono, margin: 0 }}>
                {isStable ? `$${parseFloat(amount).toLocaleString()} ${tokenName} locked in vault` : `${amount} BTC deposited`}
              </p>
            </div>
            <div style={{ width: '100%', background: 'hsl(220 12% 8%)', borderRadius: '20px', padding: '22px' }}>
            {(isStable ? [
                { label: `${tokenName} Locked`, value: '$' + parseFloat(amount).toLocaleString() + ' ' + tokenName },
                { label: 'Vault ID', value: result.vault_id },
                { label: 'Next Step', value: `Mint ${utokenName} 1:1 from your account` },
              ] : [
                { label: 'BTC Deposited', value: amount + ' BTC' },
                { label: 'USD Value', value: '$' + (parseFloat(amount) * btcPrice).toLocaleString(undefined, { maximumFractionDigits: 0 }) },
                { label: 'Max UBTC Mintable', value: '$' + ((parseFloat(amount) * btcPrice) / 1.5).toLocaleString(undefined, { maximumFractionDigits: 0 }) },
                { label: 'Transaction ID', value: result.txid },
              ]).map((item: any) => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid hsl(220 10% 11%)', gap: '12px' }}>
                  <p style={{ color: 'hsl(0 0% 35%)', fontSize: '12px', ...mono, margin: 0, flexShrink: 0 }}>{item.label}</p>
                  <p style={{ color: 'hsl(0 0% 82%)', fontSize: '12px', fontWeight: '600', ...mono, margin: 0, textAlign: 'right' as const, wordBreak: 'break-all' as const }}>{item.value}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <a href={`/mint?vault=${vaultId}&currency=${activeCurrency}`} style={{ flex: 1, background: `linear-gradient(135deg, ${tokenColor}, ${tokenColor}bb)`, color: 'white', textDecoration: 'none', borderRadius: '14px', padding: '15px', fontSize: '15px', fontWeight: '700', fontFamily: 'var(--font-display)', textAlign: 'center' as const, display: 'block', boxShadow: `0 0 30px ${tokenColor}40` }}>
                {isStable ? `Mint ${utokenName} →` : 'Mint UBTC →'}
              </a>
              <a href={`/account/${vaultId}?currency=${activeCurrency}`} style={{ flex: 1, background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 55%)', textDecoration: 'none', borderRadius: '14px', padding: '15px', fontSize: '15px', fontWeight: '600', fontFamily: 'var(--font-display)', textAlign: 'center' as const, display: 'block' }}>Account</a>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>

            {/* Currency tabs */}
            <div style={{ display: 'flex', background: 'hsl(220 12% 8%)', borderRadius: '16px', padding: '4px', gap: '4px' }}>
              {[
                { key: 'ubtc', icon: '₿', label: 'Bitcoin', sub: 'Collateral for UBTC', color: 'hsl(38 92% 50%)' },
                { key: 'uusdt', icon: '₮', label: 'USDT', sub: 'ERC-20 only', color: 'hsl(142 76% 36%)' },
                { key: 'uusdc', icon: '$', label: 'USDC', sub: 'ERC-20 only', color: 'hsl(220 85% 60%)' },
              ].map(c => (
                <button key={c.key} onClick={() => { setActiveCurrency(c.key); setAmount(''); setError(''); setResult(null) }} style={{ flex: 1, background: activeCurrency === c.key ? 'hsl(220 15% 14%)' : 'transparent', border: activeCurrency === c.key ? `1px solid ${c.color}35` : '1px solid transparent', borderRadius: '12px', padding: '12px 8px', cursor: 'pointer', fontFamily: 'var(--font-display)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '3px', transition: 'all 0.12s' }}>
                  <span style={{ fontSize: '20px', fontWeight: '700', color: c.color }}>{c.icon}</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: activeCurrency === c.key ? 'hsl(0 0% 85%)' : 'hsl(0 0% 38%)' }}>{c.label}</span>
                  <span style={{ fontSize: '10px', color: 'hsl(0 0% 30%)', ...mono }}>{c.sub}</span>
                </button>
              ))}
            </div>

            {/* Deposit address */}
            <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '20px', padding: '22px' }}>
              <p style={{ color: 'hsl(0 0% 30%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 14px' }}>
                {isStable ? `Your ${tokenName} Deposit Address` : 'Your Bitcoin Deposit Address'}
              </p>

              {isStable && (
                <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                  <div style={{ flex: 1, background: tokenColor + '12', border: `1px solid ${tokenColor}35`, borderRadius: '10px', padding: '10px', textAlign: 'center' as const }}>
                    <p style={{ color: tokenColor, fontWeight: '700', fontSize: '12px', margin: '0 0 2px' }}>ERC-20</p>
                    <p style={{ color: 'hsl(0 0% 35%)', fontSize: '10px', ...mono, margin: 0 }}>Ethereum · Active</p>
                  </div>
                  {['TRC-20', 'BEP-20'].map(n => (
                    <div key={n} style={{ flex: 1, background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 12%)', borderRadius: '10px', padding: '10px', textAlign: 'center' as const, opacity: 0.5 }}>
                      <p style={{ color: 'hsl(0 0% 35%)', fontWeight: '600', fontSize: '12px', margin: '0 0 2px' }}>{n}</p>
                      <p style={{ color: 'hsl(0 0% 25%)', fontSize: '10px', ...mono, margin: 0 }}>Coming Soon</p>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px' }}>
                <p style={{ color: tokenColor, fontSize: '12px', ...mono, wordBreak: 'break-all' as const, margin: '0 0 10px', lineHeight: '1.5' }}>
                  {isStable ? stablecoinAddr : (vault?.deposit_address || 'Loading...')}
                </p>
                <button onClick={() => copy(isStable ? stablecoinAddr : vault?.deposit_address || '', 'addr')} style={{ background: copied === 'addr' ? 'hsl(142 76% 36% / 0.14)' : 'hsl(220 12% 12%)', border: `1px solid ${copied === 'addr' ? 'hsl(142 76% 36% / 0.4)' : 'hsl(220 10% 18%)'}`, color: copied === 'addr' ? 'hsl(142 76% 36%)' : 'hsl(0 0% 45%)', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', ...mono }}>
                  {copied === 'addr' ? '✓ Copied' : 'Copy Address'}
                </button>
              </div>

              {isStable && (
                <div style={{ background: 'hsl(38 92% 50% / 0.05)', border: '1px solid hsl(38 92% 50% / 0.14)', borderRadius: '10px', padding: '10px 14px' }}>
                  <p style={{ color: 'hsl(38 92% 50%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.5' }}>⚠ Only send {tokenName} on Ethereum (ERC-20). Wrong network = permanent loss.</p>
                </div>
              )}
            </div>

            {/* Amount — simulate deposit */}
            <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '20px', padding: '20px 24px' }}>
              <p style={{ color: 'hsl(0 0% 30%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 14px' }}>
                {isStable ? `Amount of ${tokenName} Deposited` : 'Amount (Bitcoin)'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" type="number" step={isStable ? '1' : '0.01'} style={inputStyle} autoFocus />
                <span style={{ color: tokenColor, fontSize: '16px', fontWeight: '700', ...mono, flexShrink: 0 }}>{tokenName}</span>
              </div>
              <div style={{ height: '1px', background: 'hsl(220 10% 13%)', marginBottom: '14px' }} />

              {/* Preview */}
              {amount && parseFloat(amount) > 0 && (
                <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '12px', padding: '14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: 'hsl(0 0% 32%)', fontSize: '10px', ...mono, textTransform: 'uppercase', margin: '0 0 4px' }}>{isStable ? tokenName + ' locked' : 'USD Value'}</p>
                    <p style={{ color: tokenColor, fontWeight: '700', fontSize: '18px', ...mono, margin: 0 }}>
                      {isStable ? '$' + parseFloat(amount).toLocaleString() : '$' + (parseFloat(amount) * btcPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' as const }}>
                    <p style={{ color: 'hsl(0 0% 32%)', fontSize: '10px', ...mono, textTransform: 'uppercase', margin: '0 0 4px' }}>{isStable ? utokenName + ' mintable' : 'Max UBTC'}</p>
                    <p style={{ color: 'hsl(205 85% 55%)', fontWeight: '700', fontSize: '18px', ...mono, margin: 0 }}>
                      {isStable ? parseFloat(amount).toLocaleString() : '$' + ((parseFloat(amount) * btcPrice) / 1.5).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '6px' }}>
                {(isStable ? ['1000', '5000', '10000', '50000'] : ['0.1', '0.25', '0.5', '1.0']).map(v => (
                  <button key={v} onClick={() => setAmount(v)} style={{ flex: 1, background: amount === v ? tokenColor + '14' : 'hsl(220 15% 5%)', border: `1px solid ${amount === v ? tokenColor + '35' : 'hsl(220 10% 13%)'}`, color: amount === v ? tokenColor : 'hsl(0 0% 38%)', borderRadius: '9px', padding: '9px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', ...mono }}>
                    {isStable ? '$' + parseInt(v).toLocaleString() : v + ' BTC'}
                  </button>
                ))}
              </div>

              {isStable && parseFloat(amount || '0') > 0 && parseFloat(amount || '0') < 10 && (
                <p style={{ color: 'hsl(38 92% 50%)', fontSize: '12px', ...mono, marginTop: '10px' }}>⚠ Minimum deposit 10 {tokenName}</p>
              )}
            </div>

            {error && (
              <div style={{ background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.22)', borderRadius: '14px', padding: '14px 16px' }}>
                <p style={{ color: 'hsl(0 84% 60%)', fontSize: '13px', ...mono, margin: 0 }}>{error}</p>
              </div>
            )}

            <button
              onClick={isStable ? depositStable : depositBtc}
              disabled={!canDeposit}
              style={{ width: '100%', background: canDeposit ? `linear-gradient(135deg, ${tokenColor}, ${tokenColor}bb)` : 'hsl(220 10% 11%)', color: canDeposit ? 'white' : 'hsl(0 0% 26%)', border: 'none', borderRadius: '16px', padding: '18px', fontSize: '17px', fontWeight: '700', cursor: canDeposit ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', boxShadow: canDeposit ? `0 0 40px ${tokenColor}40` : 'none', transition: 'all 0.2s' }}
            >
              {loading ? 'Processing...' : canDeposit ? `Deposit ${amount} ${tokenName} →` : `Enter ${tokenName} amount`}
            </button>

            <p style={{ color: 'hsl(0 0% 22%)', fontSize: '12px', ...mono, textAlign: 'center' as const, margin: 0 }}>
              {isStable ? `After depositing, go to Mint to issue ${utokenName} 1:1 with quantum authorization` : 'After depositing BTC, go to Mint to issue UBTC with quantum authorization'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DepositPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(0 0% 30%)', fontFamily: 'var(--font-mono)' }}>Loading...</div>}>
      <DepositContent />
    </Suspense>
  )
}
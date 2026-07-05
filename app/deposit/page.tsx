'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { API_URL } from '../lib/supabase'
import { QuantumLoader } from '../components/QuantumLoader'

const isInstitutional = () =>
  typeof window !== 'undefined' &&
  (localStorage.getItem('qufi_theme') === 'light' || localStorage.getItem('qufi_user_type') === 'institutional')

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
  const tokenColor = isUusdt ? 'var(--t-green)' : isUusdc ? 'var(--t-accent)' : 'var(--t-orange)'
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
  const inst = isInstitutional()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--q-bg)', fontFamily: 'var(--font-display)' }}>

      {/* Header */}
      <div style={{ background: inst?'#fff':'linear-gradient(135deg,#050f20,#020810)', borderBottom: inst?'1px solid #e2e8f0':'1px solid rgba(0,212,255,0.12)', padding: '0 28px', height: '64px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <a href={`/account/${vaultId}?currency=${activeCurrency}`} style={{ color: 'var(--t-muted)', textDecoration: 'none', fontSize: '13px', ...mono }}>← Back</a>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: tokenColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: tokenColor }}>{tokenIcon}</div>
          <span style={{ color: 'var(--t-text)', fontWeight: '700', fontSize: '17px' }}>Deposit {tokenName}</span>
        </div>
        <div style={{ width: '40px' }} />
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 20px' }}>

        {result ? (
          /* Success */
          <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: 'var(--t-green-bg)', border: '2px solid hsl(142 76% 36% / 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>✓</div>
            <div style={{ textAlign: 'center' as const }}>
              <h2 style={{ color: 'var(--t-text)', fontSize: '28px', fontWeight: '700', margin: '0 0 6px' }}>Deposited</h2>
              <p style={{ color: 'var(--t-muted)', fontSize: '14px', ...mono, margin: 0 }}>
                {isStable ? `$${parseFloat(amount).toLocaleString()} ${tokenName} locked in vault` : `${amount} BTC deposited`}
              </p>
            </div>
            <div style={{ width: '100%', background: inst?'#fff':'linear-gradient(135deg,#050f20,#020810)', border: inst?'1px solid #e2e8f0':'1px solid rgba(0,212,255,0.12)', borderRadius: '20px', padding: '22px', boxShadow: inst?'0 4px 16px rgba(0,0,0,0.06)':'0 8px 32px rgba(0,0,0,0.5)' }}>
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
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--t-border-subtle)', gap: '12px' }}>
                  <p style={{ color: 'var(--t-faint)', fontSize: '12px', ...mono, margin: 0, flexShrink: 0 }}>{item.label}</p>
                  <p style={{ color: 'var(--t-text)', fontSize: '12px', fontWeight: '600', ...mono, margin: 0, textAlign: 'right' as const, wordBreak: 'break-all' as const }}>{item.value}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <a href={`/mint?vault=${vaultId}&currency=${activeCurrency}`} style={{ flex: 1, background: `linear-gradient(135deg, ${tokenColor}, ${tokenColor}bb)`, color: 'white', textDecoration: 'none', borderRadius: '14px', padding: '15px', fontSize: '15px', fontWeight: '700', fontFamily: 'var(--font-display)', textAlign: 'center' as const, display: 'block', boxShadow: `0 0 30px ${tokenColor}40` }}>
                {isStable ? `Mint ${utokenName} →` : 'Mint UBTC →'}
              </a>
              <a href={`/account/${vaultId}?currency=${activeCurrency}`} style={{ flex: 1, background: inst?'#f8fafc':'linear-gradient(135deg,#050f20,#020810)', border: inst?'1px solid #e2e8f0':'1px solid rgba(0,212,255,0.15)', color: inst?'var(--q-text-3)':'rgba(0,212,255,0.7)', textDecoration: 'none', borderRadius: '14px', padding: '15px', fontSize: '15px', fontWeight: '600', fontFamily: 'var(--font-display)', textAlign: 'center' as const, display: 'block' }}>Account</a>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>

            {/* Currency tabs */}
            <div style={{ display: 'flex', background: inst?'#f8fafc':'linear-gradient(135deg,#050f20,#020810)', border: inst?'1px solid #e2e8f0':'1px solid rgba(0,212,255,0.12)', borderRadius: '16px', padding: '4px', gap: '4px' }}>
              {[
                { key: 'ubtc', icon: '₿', label: 'Bitcoin', sub: 'Collateral for UBTC', color: 'var(--t-orange)' },
                { key: 'uusdt', icon: '₮', label: 'USDT', sub: 'ERC-20 only', color: 'var(--t-green)' },
                { key: 'uusdc', icon: '$', label: 'USDC', sub: 'ERC-20 only', color: 'var(--t-accent)' },
              ].map(c => (
                <button key={c.key} onClick={() => { setActiveCurrency(c.key); setAmount(''); setError(''); setResult(null) }} style={{ flex: 1, background: activeCurrency === c.key ? 'var(--t-surface3)' : 'transparent', border: activeCurrency === c.key ? `1px solid ${c.color}35` : '1px solid transparent', borderRadius: '12px', padding: '12px 8px', cursor: 'pointer', fontFamily: 'var(--font-display)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '3px', transition: 'all 0.12s' }}>
                  <span style={{ fontSize: '20px', fontWeight: '700', color: c.color }}>{c.icon}</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: activeCurrency === c.key ? 'var(--t-text)' : 'var(--t-faint)' }}>{c.label}</span>
                  <span style={{ fontSize: '10px', color: 'var(--t-faint)', ...mono }}>{c.sub}</span>
                </button>
              ))}
            </div>

            {/* Deposit address */}
            <div style={{ background: inst?'#fff':'linear-gradient(135deg,#050f20,#020810)', border: inst?'1px solid #e2e8f0':'1px solid rgba(0,212,255,0.12)', borderRadius: '20px', padding: '22px', boxShadow: inst?'0 4px 16px rgba(0,0,0,0.06)':'0 8px 32px rgba(0,0,0,0.5)' }}>
              <p style={{ color: 'var(--t-faint)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 14px' }}>
                {isStable ? `Your ${tokenName} Deposit Address` : 'Your Bitcoin Deposit Address'}
              </p>

              {isStable && (
                <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                  <div style={{ flex: 1, background: tokenColor + '12', border: `1px solid ${tokenColor}35`, borderRadius: '10px', padding: '10px', textAlign: 'center' as const }}>
                    <p style={{ color: tokenColor, fontWeight: '700', fontSize: '12px', margin: '0 0 2px' }}>ERC-20</p>
                    <p style={{ color: 'var(--t-faint)', fontSize: '10px', ...mono, margin: 0 }}>Ethereum · Active</p>
                  </div>
                  {['TRC-20', 'BEP-20'].map(n => (
                    <div key={n} style={{ flex: 1, background: 'var(--t-surface)', border: '1px solid var(--t-border-subtle)', borderRadius: '10px', padding: '10px', textAlign: 'center' as const, opacity: 0.5 }}>
                      <p style={{ color: 'var(--t-faint)', fontWeight: '600', fontSize: '12px', margin: '0 0 2px' }}>{n}</p>
                      <p style={{ color: 'var(--t-faint)', fontSize: '10px', ...mono, margin: 0 }}>Coming Soon</p>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ background: 'var(--t-surface)', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px' }}>
                <p style={{ color: tokenColor, fontSize: '12px', ...mono, wordBreak: 'break-all' as const, margin: '0 0 10px', lineHeight: '1.5' }}>
                  {isStable ? stablecoinAddr : (vault?.deposit_address || 'Loading...')}
                </p>
                <button onClick={() => copy(isStable ? stablecoinAddr : vault?.deposit_address || '', 'addr')} style={{ background: copied === 'addr' ? 'hsl(142 76% 36% / 0.14)' : 'var(--t-surface2)', border: `1px solid ${copied === 'addr' ? 'hsl(142 76% 36% / 0.4)' : 'var(--t-border)'}`, color: copied === 'addr' ? 'var(--t-green)' : 'var(--t-muted)', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', ...mono }}>
                  {copied === 'addr' ? '✓ Copied' : 'Copy Address'}
                </button>
              </div>

              {isStable && (
                <div style={{ background: 'hsl(38 92% 50% / 0.05)', border: '1px solid hsl(38 92% 50% / 0.14)', borderRadius: '10px', padding: '10px 14px' }}>
                  <p style={{ color: 'var(--t-orange)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.5' }}>⚠ Only send {tokenName} on Ethereum (ERC-20). Wrong network = permanent loss.</p>
                </div>
              )}
            </div>

            {/* Amount — simulate deposit */}
            <div style={{ background: inst?'#fff':'linear-gradient(135deg,#050f20,#020810)', border: inst?'1px solid #e2e8f0':'1px solid rgba(0,212,255,0.12)', borderRadius: '20px', padding: '20px 24px', boxShadow: inst?'0 4px 16px rgba(0,0,0,0.06)':'0 8px 32px rgba(0,0,0,0.5)' }}>
              <p style={{ color: 'var(--t-faint)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 14px' }}>
                {isStable ? `Amount of ${tokenName} Deposited` : 'Amount (Bitcoin)'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" type="number" step={isStable ? '1' : '0.01'} style={inputStyle} autoFocus />
                <span style={{ color: tokenColor, fontSize: '16px', fontWeight: '700', ...mono, flexShrink: 0 }}>{tokenName}</span>
              </div>
              <div style={{ height: '1px', background: 'var(--t-border)', marginBottom: '14px' }} />

              {/* Preview */}
              {amount && parseFloat(amount) > 0 && (
                <div style={{ background: 'var(--t-surface)', borderRadius: '12px', padding: '14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: 'var(--t-faint)', fontSize: '10px', ...mono, textTransform: 'uppercase', margin: '0 0 4px' }}>{isStable ? tokenName + ' locked' : 'USD Value'}</p>
                    <p style={{ color: tokenColor, fontWeight: '700', fontSize: '18px', ...mono, margin: 0 }}>
                      {isStable ? '$' + parseFloat(amount).toLocaleString() : '$' + (parseFloat(amount) * btcPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' as const }}>
                    <p style={{ color: 'var(--t-faint)', fontSize: '10px', ...mono, textTransform: 'uppercase', margin: '0 0 4px' }}>{isStable ? utokenName + ' mintable' : 'Max UBTC'}</p>
                    <p style={{ color: 'var(--t-accent)', fontWeight: '700', fontSize: '18px', ...mono, margin: 0 }}>
                      {isStable ? parseFloat(amount).toLocaleString() : '$' + ((parseFloat(amount) * btcPrice) / 1.5).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '6px' }}>
                {(isStable ? ['1000', '5000', '10000', '50000'] : ['0.1', '0.25', '0.5', '1.0']).map(v => (
                  <button key={v} onClick={() => setAmount(v)} style={{ flex: 1, background: amount === v ? tokenColor + '14' : 'var(--t-surface)', border: `1px solid ${amount === v ? tokenColor + '35' : 'var(--t-border)'}`, color: amount === v ? tokenColor : 'var(--t-faint)', borderRadius: '9px', padding: '9px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', ...mono }}>
                    {isStable ? '$' + parseInt(v).toLocaleString() : v + ' BTC'}
                  </button>
                ))}
              </div>

              {isStable && parseFloat(amount || '0') > 0 && parseFloat(amount || '0') < 10 && (
                <p style={{ color: 'var(--t-orange)', fontSize: '12px', ...mono, marginTop: '10px' }}>⚠ Minimum deposit 10 {tokenName}</p>
              )}
            </div>

            {error && (
              <div style={{ background: 'var(--t-red-bg)', border: '1px solid hsl(0 84% 60% / 0.22)', borderRadius: '14px', padding: '14px 16px' }}>
                <p style={{ color: 'var(--t-red)', fontSize: '13px', ...mono, margin: 0 }}>{error}</p>
              </div>
            )}

            <button
              onClick={isStable ? depositStable : depositBtc}
              disabled={!canDeposit}
              style={{ width: '100%', background: canDeposit ? `linear-gradient(135deg, ${tokenColor}, ${tokenColor}bb)` : 'var(--t-border-subtle)', color: canDeposit ? 'white' : 'hsl(0 0% 26%)', border: 'none', borderRadius: '16px', padding: '18px', fontSize: '17px', fontWeight: '700', cursor: canDeposit ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', boxShadow: canDeposit ? `0 0 40px ${tokenColor}40` : 'none', transition: 'all 0.2s' }}
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
    <Suspense fallback={<QuantumLoader />}>
      <DepositContent />
    </Suspense>
  )
}


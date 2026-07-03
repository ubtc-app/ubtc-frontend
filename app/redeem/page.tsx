'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { API_URL } from '../lib/supabase'
import { QuantumLoader } from '../components/QuantumLoader'
import { MnemonicModal } from '../components/MnemonicModal'
import { SigningOverlay } from '../components/SigningOverlay'
import { signedSpend } from '../lib/wallet/challenge'

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
  const [mnemonicModalOpen, setMnemonicModalOpen] = useState(false)
  const [signingStage, setSigningStage] = useState<'' | 'signing' | 'broadcasting'>('')

  const mono: any = { fontFamily: 'var(--font-mono)' }
  const inputBase: any = { display: 'block', width: '100%', padding: '14px 16px', background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: '12px', color: 'var(--t-text)', fontSize: '14px', fontFamily: 'var(--font-mono)', boxSizing: 'border-box' as const, outline: 'none' }

  const isUusdt = activeCurrency === 'uusdt'
  const isUusdc = activeCurrency === 'uusdc'
  const isStable = isUusdt || isUusdc
  const utokenName = isUusdt ? 'UUSDT' : isUusdc ? 'UUSDC' : 'UBTC'
  const tokenName = isUusdt ? 'USDT' : isUusdc ? 'USDC' : 'BTC'
  const tokenColor = isUusdt ? 'var(--t-green)' : isUusdc ? 'var(--t-accent)' : 'var(--t-orange)'
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
    const btcBack = (parseFloat(amount) / btcPrice).toFixed(6)
    return `${btcBack} BTC ($${(parseFloat(btcBack) * btcPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })})`
  }

  // Stablecoin redeem path — unchanged from previous, no PQ challenge gate yet on backend
  const redeemStable = async () => {
    setLoading(true); setError('')
    try {
      const scVault = scVaults.find(s => s.currency === utokenName)
      if (!scVault) throw new Error(`No ${utokenName} vault found`)
      const res = await fetch(`${API_URL}/stablecoin/burn`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vault_id: scVault.vault_id, amount })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult({ ...data, destination })
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  // UBTC redeem entry point — opens mnemonic modal
  const handleRedeem = async () => {
    if (!amount || !destination) return
    setError('')
    if (isStable) {
      await redeemStable()
      return
    }
    // UBTC path: open mnemonic modal, actual signing happens on submit
    setMnemonicModalOpen(true)
  }

  // Called when user submits the 24-word phrase in the modal
  const handleMnemonicSubmit = async (mnemonic: string) => {
    setMnemonicModalOpen(false)
    setLoading(true); setError(''); setSigningStage('signing')
    try {
      const walletAddress = localStorage.getItem('ubtc_wallet_address')
      if (!walletAddress) throw new Error('No wallet found in this browser. Restore your wallet first.')

      // Backend params format (main.rs:3127): "{vault_id}|{destination}|{ubtc_amount}"
      // ubtc_amount is sent as the original string (no f64 conversion) so frontend
      // and backend produce the same params_hash.
      const ubtcAmountStr = amount.trim()
      const paramsString = `${vaultId}|${destination}|${ubtcAmountStr}`

      const { challenge_id, signature, sphincs_signature } = await signedSpend(
        walletAddress,
        'redeem_ubtc',
        paramsString,
        mnemonic
      )

      setSigningStage('broadcasting')
      const res = await fetch(`${API_URL}/ubtc/redeem`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vault_id: vaultId,
          ubtc_amount: ubtcAmountStr,
          destination_address: destination,
          challenge_id,
          signature,
          sphincs_signature,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Redeem failed (${res.status})`)
      setResult(data)
    } catch (e: any) {
      setError(e?.message || 'Redemption failed')
    } finally {
      setLoading(false)
      setSigningStage('')
    }
  }

  const canRedeem = !!amount && !!destination && parseFloat(amount) > 0 &&
    parseFloat(amount) <= activeBalance && !loading

  return (
    <div style={{ minHeight: '100vh', background: 'var(--q-bg)', fontFamily: 'var(--font-display)' }}>

      <MnemonicModal
        isOpen={mnemonicModalOpen}
        onCancel={() => setMnemonicModalOpen(false)}
        onSubmit={handleMnemonicSubmit}
        title={`Authorize ${utokenName} Redemption`}
        subtitle={`Sign the redemption of ${amount} ${utokenName} to ${destination.slice(0, 16)}... with your 24-word recovery phrase.`}
      />

      <SigningOverlay
        stage={signingStage}
        tokenColor={tokenColor}
        tokenName={utokenName}
        amount={amount}
        context={`Authorizing ${utokenName} redemption`}
      />

      {/* Nav */}
      <div style={{ background: 'linear-gradient(135deg,#050f20,#020810)', borderBottom: '1px solid rgba(0,212,255,0.12)', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <a href={`/account/${vaultId}?currency=${activeCurrency}`} style={{ color: 'var(--t-muted)', textDecoration: 'none', fontSize: '13px', ...mono, background: 'var(--t-surface2)', border: '1px solid var(--t-border)', borderRadius: '8px', padding: '8px 14px' }}>← Back</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: tokenColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: tokenColor }}>{tokenIcon}</div>
          <div>
            <p style={{ color: 'var(--t-text)', fontWeight: '700', fontSize: '17px', margin: 0 }}>Redeem {utokenName}</p>
            <p style={{ color: 'var(--t-faint)', fontSize: '11px', ...mono, margin: 0 }}>Burn {utokenName} → receive {tokenName} on Bitcoin</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '28px 20px' }}>

        {result ? (
          <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: 'var(--t-green-bg)', border: '2px solid hsl(142 76% 36% / 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>✓</div>
            <div style={{ textAlign: 'center' as const }}>
              <h2 style={{ color: 'var(--t-text)', fontSize: '26px', fontWeight: '700', margin: '0 0 6px' }}>Redemption Complete</h2>
              <p style={{ color: 'var(--t-muted)', fontSize: '14px', ...mono, margin: 0 }}>{amount} {utokenName} burned · {tokenName} sent on-chain</p>
            </div>
            <div style={{ width: '100%', background: 'linear-gradient(135deg,#050f20,#020810)', border: '1px solid rgba(0,212,255,0.12)', borderRadius: '18px', padding: '22px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              {[
                { label: 'UBTC Burned', value: result.ubtc_burned + ' UBTC' },
                { label: 'BTC Released', value: result.btc_released_btc + ' BTC (' + result.btc_released_sats + ' sats)' },
                { label: 'Destination', value: result.destination },
                { label: 'Bitcoin Transaction', value: result.bitcoin_txid },
                { label: 'Remaining UBTC', value: result.remaining_ubtc + ' UBTC' },
                { label: 'Status', value: result.status },
              ].map((item: any) => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--t-border-subtle)', gap: '12px' }}>
                  <p style={{ color: 'var(--t-faint)', fontSize: '12px', ...mono, margin: 0, flexShrink: 0 }}>{item.label}</p>
                  <p style={{ color: 'hsl(0 0% 85%)', fontSize: '11px', fontWeight: '600', ...mono, margin: 0, textAlign: 'right' as const, wordBreak: 'break-all' as const }}>{item.value}</p>
                </div>
              ))}
            </div>
            {result.bitcoin_txid && (
              <a href={`https://mempool.space/testnet4/tx/${result.bitcoin_txid}`} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--t-accent)', fontSize: '12px', ...mono, textDecoration: 'none' }}>
                View on mempool.space →
              </a>
            )}
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button onClick={() => { setResult(null); setAmount(''); setDestination('') }}
                style={{ flex: 1, background: 'var(--t-surface2)', border: '1px solid var(--t-border)', color: 'var(--t-muted)', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
                Redeem More
              </button>
              <a href={`/account/${vaultId}?currency=${activeCurrency}`}
                style={{ flex: 1, background: 'linear-gradient(135deg, hsl(205, 85%, 55%), hsl(190, 80%, 50%))', color: 'white', textDecoration: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '600', fontFamily: 'var(--font-display)', textAlign: 'center' as const, display: 'block' }}>
                Done →
              </a>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>

            {/* Currency tabs */}
            <div style={{ display: 'flex', gap: '4px', background: 'linear-gradient(135deg,#050f20,#020810)', border: '1px solid rgba(0,212,255,0.12)', borderRadius: '16px', padding: '4px' }}>
              {[
                { key: 'ubtc', icon: '₿', label: 'UBTC → BTC', bal: ubtcBalance, color: 'var(--t-orange)' },
                { key: 'uusdt', icon: '₮', label: 'UUSDT → USDT', bal: uusdtBal, color: 'var(--t-green)' },
                { key: 'uusdc', icon: '$', label: 'UUSDC → USDC', bal: uusdcBal, color: 'var(--t-accent)' },
              ].map(c => (
                <button key={c.key} onClick={() => { setActiveCurrency(c.key); setAmount(''); setError('') }}
                  style={{ flex: 1, background: activeCurrency === c.key ? 'var(--t-surface3)' : 'transparent', border: activeCurrency === c.key ? '1px solid var(--t-border)' : '1px solid transparent', color: activeCurrency === c.key ? 'var(--t-text)' : 'var(--t-faint)', borderRadius: '12px', padding: '13px 8px', cursor: 'pointer', fontFamily: 'var(--font-display)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: c.color, fontWeight: '700', fontSize: '20px' }}>{c.icon}</span>
                  <span style={{ fontSize: '11px', fontWeight: '600' }}>{c.label}</span>
                  <span style={{ fontSize: '10px', color: c.color, ...mono }}>${c.bal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </button>
              ))}
            </div>

            {/* Balance */}
            <div style={{ background: tokenColor + '08', border: `1px solid ${tokenColor}28`, borderRadius: '18px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: tokenColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '700', color: tokenColor }}>{tokenIcon}</div>
                  <div>
                    <p style={{ color: 'var(--t-text)', fontWeight: '700', fontSize: '16px', margin: '0 0 3px' }}>{utokenName}</p>
                    <p style={{ color: 'var(--t-faint)', fontSize: '11px', ...mono, margin: 0 }}>
                      {isStable ? `Burn to release ${tokenName} from quantum vault` : 'Burn to release BTC from Taproot vault on Bitcoin'}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' as const }}>
                  <p style={{ color: tokenColor, fontWeight: '700', fontSize: '26px', ...mono, margin: '0 0 2px', lineHeight: '1' }}>${activeBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p style={{ color: 'var(--t-faint)', fontSize: '11px', ...mono, margin: 0 }}>available</p>
                </div>
              </div>
              {!isStable && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                  <div style={{ background: 'var(--t-surface)', borderRadius: '10px', padding: '10px 12px' }}>
                    <p style={{ color: 'var(--t-faint)', fontSize: '9px', ...mono, textTransform: 'uppercase', margin: '0 0 3px' }}>BTC in Taproot Vault</p>
                    <p style={{ color: tokenColor, fontWeight: '700', fontSize: '14px', ...mono, margin: 0 }}>{btcLocked.toFixed(6)} BTC</p>
                  </div>
                  <div style={{ background: 'var(--t-surface)', borderRadius: '10px', padding: '10px 12px' }}>
                    <p style={{ color: 'var(--t-faint)', fontSize: '9px', ...mono, textTransform: 'uppercase', margin: '0 0 3px' }}>BTC Value</p>
                    <p style={{ color: 'var(--t-muted)', fontWeight: '700', fontSize: '14px', ...mono, margin: 0 }}>${(btcLocked * btcPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Amount */}
            <div style={{ background: 'linear-gradient(135deg,#050f20,#020810)', border: '1px solid rgba(0,212,255,0.12)', borderRadius: '18px', padding: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <p style={{ color: 'var(--t-faint)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Amount to Redeem</p>
                <button onClick={() => setAmount(activeBalance.toFixed(2))}
                  style={{ background: tokenColor + '14', border: `1px solid ${tokenColor}35`, color: tokenColor, borderRadius: '8px', padding: '5px 12px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', ...mono }}>
                  Max
                </button>
              </div>
              <div style={{ position: 'relative' as const, marginBottom: '12px' }}>
                <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" type="number"
                  style={{ ...inputBase, fontSize: '32px', fontWeight: '700', color: 'var(--t-red)', paddingRight: '100px' }} />
                <span style={{ position: 'absolute' as const, right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t-red)', fontWeight: '700', fontSize: '13px', ...mono }}>{utokenName}</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                {[25, 50, 75, 100].map(pct => (
                  <button key={pct} onClick={() => setAmount((activeBalance * pct / 100).toFixed(2))}
                    style={{ flex: 1, background: 'var(--t-surface)', border: '1px solid var(--t-border)', color: 'var(--t-muted)', borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', ...mono }}>
                    {pct}%
                  </button>
                ))}
              </div>
              {amount && parseFloat(amount) > 0 && parseFloat(amount) <= activeBalance && (
                <div style={{ background: 'var(--t-surface)', borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ color: 'var(--t-faint)', fontSize: '12px', ...mono, margin: 0 }}>You receive approximately</p>
                  <p style={{ color: tokenColor, fontSize: '15px', fontWeight: '700', ...mono, margin: 0 }}>{youReceive()}</p>
                </div>
              )}
            </div>

            {/* Destination */}
            <div style={{ background: 'linear-gradient(135deg,#050f20,#020810)', border: '1px solid rgba(0,212,255,0.12)', borderRadius: '18px', padding: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              <p style={{ color: 'var(--t-faint)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 12px' }}>
                {isStable ? `Destination ${tokenName} Address` : 'Destination Bitcoin Address'}
              </p>
              <input value={destination} onChange={e => setDestination(e.target.value)}
                placeholder={isStable ? '0x... Ethereum address' : 'tb1q... or bc1q... Bitcoin address'}
                style={{ ...inputBase, background: 'rgba(0,5,20,0.8)', border: '1px solid rgba(0,212,255,0.15)', color: '#f0f6ff', marginBottom: '8px' }} />
              <p style={{ color: 'var(--t-faint)', fontSize: '11px', ...mono, margin: 0, lineHeight: '1.5' }}>
                {isStable
                  ? `Your ${tokenName} will be released from the vault and sent to this address.`
                  : 'Real Bitcoin will be sent on-chain from your Taproot vault to this address.'}
              </p>
            </div>

            {/* PQ auth notice — UBTC only */}
            {!isStable && (
              <div style={{ background: 'hsl(205 85% 55% / 0.06)', border: '1px solid hsl(205 85% 55% / 0.25)', borderRadius: '14px', padding: '14px 16px' }}>
                <p style={{ color: 'var(--t-accent)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>
                  🔐 You will be asked for your 24-word recovery phrase to sign this redemption with hybrid post-quantum signatures (ML-DSA-65 + SLH-DSA-SHAKE-256s). Your phrase never leaves this browser.
                </p>
              </div>
            )}

            {/* Warning */}
            <div style={{ background: 'hsl(0 84% 60% / 0.05)', border: '1px solid hsl(0 84% 60% / 0.18)', borderRadius: '14px', padding: '14px 16px' }}>
              <p style={{ color: 'var(--t-red)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>
                ⚠ Burning {utokenName} is irreversible. {isStable
                  ? `$${amount ? parseFloat(amount).toLocaleString() : '0'} ${tokenName} will be released from your quantum vault.`
                  : `Real Bitcoin will be sent on-chain from your Taproot vault. This cannot be undone.`}
              </p>
            </div>

            {error && (
              <div style={{ background: 'var(--t-red-bg)', border: '1px solid hsl(0 84% 60% / 0.25)', borderRadius: '12px', padding: '14px 16px' }}>
                <p style={{ color: 'var(--t-red)', fontSize: '13px', ...mono, margin: 0 }}>{error}</p>
              </div>
            )}

            {parseFloat(amount || '0') > activeBalance && (
              <p style={{ color: 'var(--t-red)', fontSize: '12px', ...mono, margin: 0 }}>⚠ Exceeds balance of ${activeBalance.toLocaleString()} {utokenName}</p>
            )}

            <button onClick={handleRedeem} disabled={!canRedeem}
              style={{ width: '100%', background: canRedeem ? `linear-gradient(135deg, ${tokenColor}, ${tokenColor}bb)` : 'var(--t-border-subtle)', color: canRedeem ? 'white' : 'var(--t-faint)', border: 'none', borderRadius: '14px', padding: '18px', fontSize: '16px', fontWeight: '700', cursor: canRedeem ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', boxShadow: canRedeem ? `0 0 40px ${tokenColor}45` : 'none', transition: 'all 0.2s' }}>
              {loading
                ? signingStage === 'signing' ? 'Signing locally...' : signingStage === 'broadcasting' ? 'Broadcasting on Bitcoin...' : 'Processing...'
                : canRedeem ? `Burn ${parseFloat(amount || '0').toLocaleString()} ${utokenName} → Receive ${tokenName}` : 'Enter amount and destination'}
            </button>

          </div>
        )}
      </div>
    </div>
  )
}

export default function RedeemPage() {
  return (
    <Suspense fallback={<QuantumLoader />}>
      <RedeemContent />
    </Suspense>
  )
}
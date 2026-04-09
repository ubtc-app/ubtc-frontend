'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { API_URL } from '../../lib/supabase'

export default function AccountPage() {
  const params = useParams()
  const vaultId = params.id as string
  const [vault, setVault] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [btcPrice, setBtcPrice] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  const mono: any = { fontFamily: 'var(--font-mono)' }

  useEffect(() => {
    if (!vaultId) return
    Promise.all([
      fetch(`${API_URL}/vaults/${vaultId}`).then(r => r.json()),
      fetch(`${API_URL}/vaults/${vaultId}/transactions`).then(r => r.json()),
      fetch(`${API_URL}/price`).then(r => r.json()),
    ]).then(([v, t, p]) => {
      setVault(v)
      setTransactions(t.transactions || [])
      setBtcPrice(parseFloat(p.btc_usd) || 0)
      setLoading(false)
    })
  }, [vaultId])

  const getTransactionIcon = (kind: string) => {
    switch (kind) {
      case 'mint': return '💵'
      case 'redeem': return '🏦'
      case 'withdraw': return '⬆️'
      case 'transfer': return '↗️'
      case 'deposit': return '₿'
      default: return '📋'
    }
  }

  const getTransactionColor = (kind: string) => {
    switch (kind) {
      case 'mint': return 'hsl(205 85% 55%)'
      case 'deposit': return 'hsl(142 76% 36%)'
      case 'redeem': return 'hsl(38 92% 50%)'
      case 'withdraw': return 'hsl(38 92% 50%)'
      case 'transfer': return 'hsl(0 84% 60%)'
      default: return 'hsl(0 0% 65%)'
    }
  }

  const getTransactionSign = (kind: string) => {
    switch (kind) {
      case 'mint': return '+'
      case 'deposit': return '+'
      default: return '-'
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'hsl(0 0% 55%)', ...mono }}>Loading account...</p>
    </div>
  )

  if (!vault || vault.error) return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'hsl(0 84% 60%)', ...mono }}>Account not found</p>
    </div>
  )

  const ubtcBalance = parseFloat(vault.ubtc_minted) || 0
  const btcLocked = vault.btc_amount_sats / 100_000_000
  const btcValue = btcLocked * btcPrice
  const collateralRatio = ubtcBalance > 0 ? (btcValue / ubtcBalance) * 100 : 0
  const isCustody = vault.account_type === 'custody'
  const accentColor = isCustody ? 'hsl(38 92% 50%)' : 'hsl(205 85% 55%)'

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', fontFamily: 'var(--font-display)' }}>

      {/* Account header */}
      <div style={{ background: 'hsl(220 15% 5%)', borderBottom: '1px solid hsl(220 10% 12%)', padding: '32px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <a href="/dashboard" style={{ color: 'hsl(0 0% 55%)', fontSize: '12px', ...mono, textDecoration: 'none' }}>← My Accounts</a>
            <span style={{ color: 'hsl(0 0% 30%)', fontSize: '12px' }}>/</span>
            <span style={{ color: 'hsl(0 0% 55%)', fontSize: '12px', ...mono }}>{isCustody ? 'Custody Account' : 'Current Account'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: accentColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                {isCustody ? '🔐' : '💳'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h1 style={{ color: 'hsl(0 0% 92%)', fontSize: '22px', fontWeight: '700', margin: 0 }}>
                    {isCustody ? 'Custody Account' : 'Current Account'}
                  </h1>
                  <span style={{ fontSize: '10px', ...mono, color: vault.status === 'active' ? 'hsl(142 76% 36%)' : 'hsl(38 92% 50%)', border: '1px solid currentColor', borderRadius: '20px', padding: '3px 10px', textTransform: 'uppercase' }}>
                    {vault.status === 'pending_deposit' ? 'Needs Funding' : vault.status}
                  </span>
                </div>
                <p style={{ color: 'hsl(0 0% 45%)', fontSize: '11px', ...mono, margin: 0 }}>{vaultId}</p>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
              <a href={`/deposit?vault=${vaultId}`} style={{ background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 10% 20%)', color: 'hsl(0 0% 92%)', textDecoration: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-display)' }}>
                + Fund
              </a>
              <a href={`/mint?vault=${vaultId}`} style={{ background: accentColor + '20', border: `1px solid ${accentColor}50`, color: accentColor, textDecoration: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-display)' }}>
                Issue UBTC
              </a>
              <a href={`/transfer?vault=${vaultId}`} style={{ background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 10% 20%)', color: 'hsl(0 0% 92%)', textDecoration: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-display)' }}>
                Send
              </a>
              <a href={`/redeem?vault=${vaultId}`} style={{ background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 10% 20%)', color: 'hsl(0 0% 92%)', textDecoration: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-display)' }}>
                Redeem
              </a>
              <a href={`/withdraw?vault=${vaultId}`} style={{ background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 10% 20%)', color: 'hsl(0 0% 92%)', textDecoration: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-display)' }}>
                Withdraw
              </a>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px' }}>

        {/* Balance cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: 'UBTC Balance', value: `$${ubtcBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, sub: 'Stablecoin balance', color: accentColor },
            { label: 'BTC Locked', value: `${btcLocked.toFixed(4)}`, sub: `$${btcValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD value`, color: 'hsl(38 92% 50%)' },
            { label: 'Collateral Ratio', value: collateralRatio > 0 ? `${collateralRatio.toFixed(1)}%` : '—', sub: collateralRatio >= 200 ? 'Healthy' : collateralRatio >= 150 ? 'Safe' : collateralRatio > 0 ? 'Watch' : 'No UBTC issued', color: collateralRatio >= 200 ? 'hsl(142 76% 36%)' : collateralRatio >= 150 ? accentColor : collateralRatio > 0 ? 'hsl(38 92% 50%)' : 'hsl(0 0% 55%)' },
            { label: 'BTC Price', value: `$${btcPrice.toLocaleString()}`, sub: 'Live — Coinbase', color: 'hsl(0 0% 92%)' },
          ].map(card => (
            <div key={card.label} style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '14px', padding: '20px' }}>
              <p style={{ color: 'hsl(0 0% 55%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>{card.label}</p>
              <p style={{ color: card.color, fontSize: '22px', fontWeight: '700', margin: '0 0 4px', ...mono }}>{card.value}</p>
              <p style={{ color: 'hsl(0 0% 45%)', fontSize: '11px', ...mono, margin: 0 }}>{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Deposit address */}
        <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '14px', padding: '20px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: 'hsl(0 0% 55%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Bitcoin Deposit Address</p>
              <p style={{ color: 'hsl(0 0% 92%)', fontSize: '12px', ...mono, margin: 0, wordBreak: 'break-all' as const }}>{vault.deposit_address}</p>
            </div>
            <a href={`/deposit?vault=${vaultId}`} style={{ background: 'linear-gradient(135deg, hsl(205, 85%, 55%), hsl(190, 80%, 50%))', color: 'white', textDecoration: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '12px', fontWeight: '600', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
              Fund Account
            </a>
          </div>
        </div>

        {/* Transaction history */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '18px', fontWeight: '600', margin: 0 }}>Transaction History</h2>
            <span style={{ color: 'hsl(0 0% 45%)', fontSize: '11px', ...mono }}>{transactions.length} transactions</span>
          </div>

          {transactions.length === 0 ? (
            <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '14px', padding: '40px', textAlign: 'center' as const }}>
              <p style={{ color: 'hsl(0 0% 45%)', ...mono, margin: '0 0 16px', fontSize: '14px' }}>No transactions yet</p>
              <a href={`/deposit?vault=${vaultId}`} style={{ color: accentColor, fontSize: '13px', ...mono, textDecoration: 'none' }}>Fund your account to get started →</a>
            </div>
          ) : (
            <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '14px', overflow: 'hidden' }}>
              {transactions.map((tx, index) => (
                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: index < transactions.length - 1 ? '1px solid hsl(220 10% 12%)' : 'none', gap: '16px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: getTransactionColor(tx.kind) + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    {getTransactionIcon(tx.kind)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: 'hsl(0 0% 92%)', fontWeight: '600', fontSize: '14px', margin: '0 0 2px' }}>{tx.description}</p>
                    <p style={{ color: 'hsl(0 0% 45%)', fontSize: '11px', ...mono, margin: 0 }}>
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                    <p style={{ color: getTransactionColor(tx.kind), fontWeight: '700', fontSize: '15px', margin: '0 0 4px', ...mono }}>
                      {getTransactionSign(tx.kind)}{tx.currency === 'UBTC' ? '$' : ''}{parseFloat(tx.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })} {tx.currency}
                    </p>
                    <span style={{ fontSize: '10px', ...mono, color: getTransactionColor(tx.kind), border: `1px solid ${getTransactionColor(tx.kind)}40`, borderRadius: '20px', padding: '2px 8px', textTransform: 'uppercase' as const }}>
                      {tx.kind}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Custody security info */}
        {isCustody && (
          <div style={{ marginTop: '24px', background: 'hsl(38 92% 50% / 0.05)', border: '1px solid hsl(38 92% 50% / 0.2)', borderRadius: '14px', padding: '20px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '24px', flexShrink: 0 }}>⚛️</span>
            <div>
              <p style={{ color: 'hsl(38 92% 50%)', fontWeight: '600', fontSize: '13px', margin: '0 0 4px' }}>Quantum-Protected Custody Account</p>
              <p style={{ color: 'hsl(0 0% 55%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>
                All transfers require OTP verification + Dilithium3 post-quantum signature. Protected against both classical and quantum computer attacks.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
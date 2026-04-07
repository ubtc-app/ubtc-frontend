'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { API_URL } from '../lib/supabase'

const btnPrimary: any = { backgroundImage: 'var(--gradient-mint)', color: 'white', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', boxShadow: '0 0 30px hsl(205 85% 55% / 0.4)', width: '100%', display: 'block', textAlign: 'center', textDecoration: 'none' }
const btnGhost: any = { background: 'none', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 65%)', borderRadius: '10px', padding: '12px 24px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', textDecoration: 'none', display: 'inline-block' }
const btnDisabled: any = { background: 'hsl(220 10% 14%)', color: 'hsl(0 0% 40%)', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'not-allowed', fontFamily: 'var(--font-display)', width: '100%' }

function DepositContent() {
  const searchParams = useSearchParams()
  const [vaultId, setVaultId] = useState(searchParams.get('vault') || '')
  const [amount, setAmount] = useState('0.5')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [vault, setVault] = useState<any>(null)
  const [depositResult, setDepositResult] = useState<any>(null)
  const [error, setError] = useState('')

  const mono: any = { fontFamily: 'var(--font-mono)' }
  const inputStyle: any = { display: 'block', width: '100%', padding: '14px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', color: 'hsl(0 0% 92%)', fontSize: '13px', fontFamily: 'var(--font-mono)', marginBottom: '20px', boxSizing: 'border-box', outline: 'none' }

  const checkVault = async () => {
    if (!vaultId) return
    setChecking(true); setError('')
    try {
      const res = await fetch(`${API_URL}/vaults/${vaultId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Vault not found')
      setVault(data)
    } catch (e: any) { setError(e.message) }
    setChecking(false)
  }

  const depositBTC = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_URL}/deposit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vault_id: vaultId, amount_btc: amount }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDepositResult(data)
      await checkVault()
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  useEffect(() => { if (vaultId) checkVault() }, [])

  const statusColor = (s: string) => s === 'active' ? 'hsl(205 85% 55%)' : s === 'closed' ? 'hsl(0 84% 60%)' : 'hsl(38 92% 50%)'

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 5%)', padding: '40px 24px', fontFamily: 'var(--font-display)' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(205 85% 55%)', boxShadow: '0 0 10px hsl(205 85% 55% / 0.8)' }} />
          <span style={{ fontSize: '11px', ...mono, color: 'hsl(205 85% 55%)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Deposit BTC</span>
        </div>
        <h1 style={{ fontSize: '48px', fontWeight: '700', lineHeight: '1', marginBottom: '12px', backgroundImage: 'var(--gradient-vivid)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Fund Vault</h1>
        <p style={{ color: 'hsl(0 0% 65%)', fontSize: '14px', ...mono, marginBottom: '40px', lineHeight: '1.8' }}>Send Bitcoin to your vault to activate it as collateral.</p>

        <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '16px', padding: '28px' }}>
          <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Vault ID</label>
          <input value={vaultId} onChange={e => setVaultId(e.target.value)} placeholder="vault_bc22a374" style={inputStyle} />

          <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Amount (BTC)</label>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {['0.1', '0.25', '0.5', '1.0'].map(a => (
              <button key={a} onClick={() => setAmount(a)} style={{ flex: 1, background: amount === a ? 'hsl(205 85% 55% / 0.2)' : 'hsl(220 15% 5%)', border: `1px solid ${amount === a ? 'hsl(205 85% 55%)' : 'hsl(220 10% 16%)'}`, color: amount === a ? 'hsl(205 85% 55%)' : 'hsl(0 0% 65%)', borderRadius: '8px', padding: '10px 0', fontSize: '12px', fontWeight: '600', cursor: 'pointer', ...mono }}>{a} BTC</button>
            ))}
          </div>

          {vault && (
            <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              {[
                { label: 'Status', value: vault.status.replace('_', ' '), color: statusColor(vault.status) },
                { label: 'BTC Deposited', value: `${(vault.btc_amount_sats / 100_000_000).toFixed(8)} BTC`, color: 'hsl(0 0% 92%)' },
                { label: 'Confirmations', value: String(vault.confirmations), color: 'hsl(0 0% 92%)' },
                { label: 'UBTC Minted', value: `$${vault.ubtc_minted}`, color: 'hsl(0 0% 92%)' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid hsl(220 10% 16%)' }}>
                  <span style={{ color: 'hsl(0 0% 65%)', fontSize: '12px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{row.label}</span>
                  <span style={{ color: row.color, fontSize: '12px', ...mono, fontWeight: '600', textTransform: 'capitalize' }}>{row.value}</span>
                </div>
              ))}
              <div style={{ marginTop: '12px' }}>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>Deposit Address</p>
                <p style={{ color: 'hsl(0 0% 92%)', fontSize: '12px', wordBreak: 'break-all', ...mono, margin: 0 }}>{vault.deposit_address}</p>
              </div>
            </div>
          )}

          {depositResult && (
            <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>Transaction Confirmed</p>
              <p style={{ color: 'hsl(205 85% 55%)', fontSize: '12px', wordBreak: 'break-all', ...mono, margin: 0 }}>{depositResult.txid}</p>
            </div>
          )}

          {error && <p style={{ color: 'hsl(0 84% 60%)', marginTop: '0', marginBottom: '16px', fontSize: '13px', ...mono }}>{error}</p>}

          {!depositResult ? (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={checkVault} disabled={checking || !vaultId} style={{ ...btnGhost, flex: '0 0 auto' }}>
                {checking ? 'Checking...' : 'Check'}
              </button>
              <button onClick={depositBTC} disabled={loading || !vaultId} style={loading || !vaultId ? { ...btnDisabled, flex: 1 } : { ...btnPrimary, flex: 1, boxShadow: '0 0 30px hsl(205 85% 55% / 0.4)' }}>
                {loading ? 'Depositing...' : `Deposit ${amount} BTC`}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <a href={`/mint?vault=${vaultId}`} style={{ ...btnPrimary, flex: 1 }}>Mint UBTC</a>
              <a href="/dashboard" style={{ ...btnGhost }}>Dashboard</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DepositPage() {
  return (
    <Suspense fallback={<div style={{ color: 'hsl(0 0% 65%)', padding: '40px', fontFamily: 'var(--font-mono)' }}>Loading...</div>}>
      <DepositContent />
    </Suspense>
  )
}
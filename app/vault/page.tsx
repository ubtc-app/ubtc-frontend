'use client'
import { useState } from 'react'
import { API_URL } from '../lib/supabase'

const btnPrimary: any = { backgroundImage: 'var(--gradient-mint)', color: 'white', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', boxShadow: '0 0 30px hsl(205 85% 55% / 0.4)', width: '100%', display: 'block', textAlign: 'center', textDecoration: 'none' }
const btnGhost: any = { background: 'none', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 65%)', borderRadius: '10px', padding: '12px 24px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', textDecoration: 'none', display: 'inline-block' }
const btnDisabled: any = { background: 'hsl(220 10% 14%)', color: 'hsl(0 0% 40%)', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'not-allowed', fontFamily: 'var(--font-display)', width: '100%' }

export default function VaultPage() {
  const [pubkey, setPubkey] = useState('')
  const [loading, setLoading] = useState(false)
  const [depositing, setDepositing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [depositResult, setDepositResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [amount, setAmount] = useState('0.5')

  const mono: any = { fontFamily: 'var(--font-mono)' }

  const createVault = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch(`${API_URL}/vaults`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_pubkey: pubkey, network: 'regtest', recovery_blocks: 6 }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const depositBTC = async () => {
    if (!result) return
    setDepositing(true); setError('')
    try {
      const res = await fetch(`${API_URL}/deposit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vault_id: result.vault_id, amount_btc: amount }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDepositResult(data)
    } catch (e: any) { setError(e.message) }
    setDepositing(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 5%)', padding: '40px 24px', fontFamily: 'var(--font-display)' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(205 85% 55%)', boxShadow: '0 0 10px hsl(205 85% 55% / 0.8)' }} />
          <span style={{ fontSize: '11px', ...mono, color: 'hsl(205 85% 55%)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Create Vault</span>
        </div>
        <h1 style={{ fontSize: '48px', fontWeight: '700', lineHeight: '1', marginBottom: '12px', backgroundImage: 'var(--gradient-vivid)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Lock Bitcoin</h1>
        <p style={{ color: 'hsl(0 0% 65%)', fontSize: '14px', ...mono, marginBottom: '40px', lineHeight: '1.8' }}>Create a Taproot vault and deposit BTC as collateral to mint UBTC.</p>

        <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '16px', padding: '28px' }}>

          {!result ? (
            <>
              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Your Bitcoin public key</label>
              <input value={pubkey} onChange={e => setPubkey(e.target.value)} placeholder="02a1b2c3..." style={{ display: 'block', width: '100%', padding: '14px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', color: 'hsl(0 0% 92%)', fontSize: '13px', fontFamily: 'var(--font-mono)', marginBottom: '20px', boxSizing: 'border-box', outline: 'none' }} />
              <button onClick={createVault} disabled={loading || !pubkey} style={loading || !pubkey ? btnDisabled : { ...btnPrimary }}>
                {loading ? 'Creating...' : 'Create Vault'}
              </button>
              {error && <p style={{ color: 'hsl(0 84% 60%)', marginTop: '16px', fontSize: '13px', ...mono }}>{error}</p>}
            </>
          ) : !depositResult ? (
            <>
              <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>Vault Created</p>
                <p style={{ color: 'hsl(205 85% 55%)', fontWeight: '600', ...mono, margin: '0 0 12px' }}>{result.vault_id}</p>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>Deposit Address</p>
                <p style={{ color: 'hsl(0 0% 92%)', fontSize: '12px', wordBreak: 'break-all', ...mono, margin: 0 }}>{result.deposit_address}</p>
              </div>

              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Amount to deposit</label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                {['0.1', '0.25', '0.5', '1.0'].map(a => (
                  <button key={a} onClick={() => setAmount(a)} style={{ flex: 1, background: amount === a ? 'hsl(205 85% 55% / 0.2)' : 'hsl(220 15% 5%)', border: `1px solid ${amount === a ? 'hsl(205 85% 55%)' : 'hsl(220 10% 16%)'}`, color: amount === a ? 'hsl(205 85% 55%)' : 'hsl(0 0% 65%)', borderRadius: '8px', padding: '10px 0', fontSize: '12px', fontWeight: '600', cursor: 'pointer', ...mono }}>{a} BTC</button>
                ))}
              </div>

              <button onClick={depositBTC} disabled={depositing} style={depositing ? btnDisabled : { ...btnPrimary }}>
                {depositing ? 'Depositing...' : `Deposit ${amount} BTC`}
              </button>
              {error && <p style={{ color: 'hsl(0 84% 60%)', marginTop: '16px', fontSize: '13px', ...mono }}>{error}</p>}
            </>
          ) : (
            <>
              <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '10px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>Vault Active</p>
                <p style={{ fontSize: '32px', fontWeight: '700', backgroundImage: 'var(--gradient-mint)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: '0 0 8px' }}>{amount} BTC</p>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '12px', ...mono, margin: '0 0 8px' }}>Deposited and confirmed</p>
                <p style={{ color: 'hsl(205 85% 55%)', fontSize: '11px', wordBreak: 'break-all', ...mono, margin: 0 }}>{depositResult.txid}</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <a href={`/mint?vault=${result.vault_id}`} style={{ ...btnPrimary, flex: 1 }}>Mint UBTC</a>
                <a href="/dashboard" style={{ ...btnGhost }}>Dashboard</a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
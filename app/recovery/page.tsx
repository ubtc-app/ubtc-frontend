'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { API_URL } from '../lib/supabase'

const btnPrimary: any = { backgroundImage: 'var(--gradient-mint)', color: 'white', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', boxShadow: '0 0 30px hsl(205 85% 55% / 0.4)', width: '100%' }
const btnRed: any = { background: 'hsl(0 84% 60%)', color: 'white', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', width: '100%' }
const btnGhost: any = { background: 'none', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 65%)', borderRadius: '10px', padding: '12px 24px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', textDecoration: 'none', display: 'inline-block' }
const btnDisabled: any = { background: 'hsl(220 10% 14%)', color: 'hsl(0 0% 40%)', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'not-allowed', fontFamily: 'var(--font-display)', width: '100%' }

function RecoveryContent() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'setup' | 'initiate' | 'cancel' | 'execute'>('setup')
  const [vaultId, setVaultId] = useState(searchParams.get('vault') || '')
  const [recoveryKey, setRecoveryKey] = useState('')
  const [destination, setDestination] = useState('')
  const [amount, setAmount] = useState('')
  const [requestId, setRequestId] = useState('')
  const [cancelKey, setCancelKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const mono: any = { fontFamily: 'var(--font-mono)' }
  const inputStyle: any = { display: 'block', width: '100%', padding: '14px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', color: 'hsl(0 0% 92%)', fontSize: '13px', fontFamily: 'var(--font-mono)', marginBottom: '16px', boxSizing: 'border-box', outline: 'none' }

  const call = async (endpoint: string, body: any) => {
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const tabs = [
    { id: 'setup', label: 'Setup Recovery' },
    { id: 'initiate', label: 'Initiate Recovery' },
    { id: 'cancel', label: 'Cancel Recovery' },
    { id: 'execute', label: 'Execute Recovery' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 5%)', padding: '40px 24px', fontFamily: 'var(--font-display)' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(38 92% 50%)', boxShadow: '0 0 10px hsl(38 92% 50% / 0.8)' }} />
          <span style={{ fontSize: '11px', ...mono, color: 'hsl(38 92% 50%)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Vault Recovery</span>
        </div>

        <h1 style={{ fontSize: '40px', fontWeight: '700', lineHeight: '1', marginBottom: '12px', color: 'hsl(0 0% 92%)' }}>
          Recovery System
        </h1>
        <p style={{ color: 'hsl(0 0% 65%)', fontSize: '14px', ...mono, marginBottom: '32px', lineHeight: '1.8' }}>
          2-of-3 key model. 48-hour time lock. No admin override.
        </p>

        {/* Warning banner */}
        <div style={{ background: 'hsl(38 92% 50% / 0.08)', border: '1px solid hsl(38 92% 50% / 0.3)', borderRadius: '10px', padding: '14px 16px', marginBottom: '32px' }}>
          <p style={{ color: 'hsl(38 92% 50%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>
            ⚠ Recovery key is never stored by UBTC. Store it offline. Anyone with the cancel key can abort a recovery during the 48-hour window.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id as any); setResult(null); setError('') }} style={{
              background: tab === t.id ? 'hsl(205 85% 55% / 0.2)' : 'hsl(220 12% 8%)',
              border: `1px solid ${tab === t.id ? 'hsl(205 85% 55%)' : 'hsl(220 10% 16%)'}`,
              color: tab === t.id ? 'hsl(205 85% 55%)' : 'hsl(0 0% 65%)',
              borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: '600',
              cursor: 'pointer', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '16px', padding: '28px' }}>

          {tab === 'setup' && (
            <>
              <p style={{ color: 'hsl(0 0% 65%)', fontSize: '13px', ...mono, marginBottom: '20px', lineHeight: '1.7' }}>
                Register a recovery key for your vault. This key is hashed and stored — the original is never saved. Store it offline like a seed phrase.
              </p>
              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Vault ID</label>
              <input value={vaultId} onChange={e => setVaultId(e.target.value)} placeholder="vault_feddd867" style={inputStyle} />
              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Recovery Key (store offline)</label>
              <input value={recoveryKey} onChange={e => setRecoveryKey(e.target.value)} placeholder="my-offline-recovery-key-never-share" type="password" style={inputStyle} />
              <button onClick={() => call('recovery/setup', { vault_id: vaultId, recovery_key: recoveryKey })} disabled={loading || !vaultId || !recoveryKey} style={loading || !vaultId || !recoveryKey ? btnDisabled : btnPrimary}>
                {loading ? 'Setting up...' : 'Register Recovery Key'}
              </button>
            </>
          )}

          {tab === 'initiate' && (
            <>
              <p style={{ color: 'hsl(0 0% 65%)', fontSize: '13px', ...mono, marginBottom: '20px', lineHeight: '1.7' }}>
                Start the 48-hour recovery process. You will receive a cancel key to abort if needed.
              </p>
              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Vault ID</label>
              <input value={vaultId} onChange={e => setVaultId(e.target.value)} placeholder="vault_feddd867" style={inputStyle} />
              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Recovery Key</label>
              <input value={recoveryKey} onChange={e => setRecoveryKey(e.target.value)} placeholder="your offline recovery key" type="password" style={inputStyle} />
              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Destination Address</label>
              <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="bcrt1q..." style={inputStyle} />
              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>UBTC Amount</label>
              <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="10000" type="number" style={inputStyle} />
              <button onClick={() => call('recovery/initiate', { vault_id: vaultId, recovery_key: recoveryKey, destination_address: destination, ubtc_amount: amount })} disabled={loading || !vaultId || !recoveryKey || !destination || !amount} style={loading || !vaultId || !recoveryKey || !destination || !amount ? btnDisabled : btnRed}>
                {loading ? 'Initiating...' : 'Start 48-Hour Recovery'}
              </button>
            </>
          )}

          {tab === 'cancel' && (
            <>
              <p style={{ color: 'hsl(0 0% 65%)', fontSize: '13px', ...mono, marginBottom: '20px', lineHeight: '1.7' }}>
                Cancel a pending recovery using the cancel key provided when recovery was initiated.
              </p>
              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Recovery Request ID</label>
              <input value={requestId} onChange={e => setRequestId(e.target.value)} placeholder="rrq_..." style={inputStyle} />
              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Cancel Key</label>
              <input value={cancelKey} onChange={e => setCancelKey(e.target.value)} placeholder="cancel_..." style={inputStyle} />
              <button onClick={() => call('recovery/cancel', { request_id: requestId, cancel_key: cancelKey })} disabled={loading || !requestId || !cancelKey} style={loading || !requestId || !cancelKey ? btnDisabled : btnPrimary}>
                {loading ? 'Cancelling...' : 'Cancel Recovery'}
              </button>
            </>
          )}

          {tab === 'execute' && (
            <>
              <p style={{ color: 'hsl(0 0% 65%)', fontSize: '13px', ...mono, marginBottom: '20px', lineHeight: '1.7' }}>
                Execute recovery after the 48-hour time lock has expired.
              </p>
              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Recovery Request ID</label>
              <input value={requestId} onChange={e => setRequestId(e.target.value)} placeholder="rrq_..." style={inputStyle} />
              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Recovery Key</label>
              <input value={recoveryKey} onChange={e => setRecoveryKey(e.target.value)} placeholder="your offline recovery key" type="password" style={inputStyle} />
              <button onClick={() => call('recovery/execute', { request_id: requestId, recovery_key: recoveryKey })} disabled={loading || !requestId || !recoveryKey} style={loading || !requestId || !recoveryKey ? btnDisabled : btnPrimary}>
                {loading ? 'Executing...' : 'Execute Recovery'}
              </button>
            </>
          )}

          {error && <p style={{ color: 'hsl(0 84% 60%)', marginTop: '16px', fontSize: '13px', ...mono }}>{error}</p>}

          {result && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                {Object.entries(result).filter(([k]) => k !== 'message').map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid hsl(220 10% 16%)' }}>
                    <span style={{ color: 'hsl(0 0% 65%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k.replace(/_/g, ' ')}</span>
                    <span style={{ color: 'hsl(205 85% 55%)', fontSize: '11px', ...mono, fontWeight: '600', maxWidth: '60%', textAlign: 'right', wordBreak: 'break-all' }}>{String(v)}</span>
                  </div>
                ))}
              </div>
              {result.message && (
                <p style={{ color: 'hsl(38 92% 50%)', fontSize: '12px', ...mono, lineHeight: '1.6' }}>{result.message}</p>
              )}
              {result.cancel_key && (
                <div style={{ marginTop: '12px', background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.3)', borderRadius: '10px', padding: '14px' }}>
                  <p style={{ color: 'hsl(0 84% 60%)', fontSize: '11px', ...mono, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Save this cancel key now</p>
                  <p style={{ color: 'hsl(0 0% 92%)', fontSize: '12px', ...mono, margin: 0, wordBreak: 'break-all' }}>{result.cancel_key}</p>
                </div>
              )}
              <a href="/dashboard" style={{ ...btnGhost, marginTop: '16px', width: '100%', textAlign: 'center' as const }}>Back to Dashboard</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RecoveryPage() {
  return (
    <Suspense fallback={<div style={{ color: 'hsl(0 0% 65%)', padding: '40px', fontFamily: 'var(--font-mono)' }}>Loading...</div>}>
      <RecoveryContent />
    </Suspense>
  )
}
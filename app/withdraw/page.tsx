'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { API_URL } from '../lib/supabase'

const btnPrimary: any = { background: 'linear-gradient(135deg, hsl(205, 85%, 55%), hsl(190, 80%, 50%))', color: 'white', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', boxShadow: '0 0 30px hsl(205 85% 55% / 0.4)', width: '100%' }
const btnRed: any = { background: 'hsl(0 84% 60%)', color: 'white', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', width: '100%' }
const btnGhost: any = { background: 'none', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 65%)', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', width: '100%' }
const btnDisabled: any = { background: 'hsl(220 10% 14%)', color: 'hsl(0 0% 40%)', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'not-allowed', fontFamily: 'var(--font-display)', width: '100%' }

function WithdrawContent() {
  const searchParams = useSearchParams()
  const [vaultId, setVaultId] = useState(searchParams.get('vault') || '')
  const [destination, setDestination] = useState('')
  const [amount, setAmount] = useState('')
  const [otp, setOtp] = useState('')
  const [secondKey, setSecondKey] = useState('')
  const [step, setStep] = useState<'form' | 'warning' | 'verify' | 'done'>('form')
  const [withdrawId, setWithdrawId] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [vaultInfo, setVaultInfo] = useState<any>(null)
  const [btcPrice, setBtcPrice] = useState<number>(0)
  const [accounts, setAccounts] = useState<any[]>([])

  const mono: any = { fontFamily: 'var(--font-mono)' }
  const inputStyle: any = { display: 'block', width: '100%', padding: '14px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', color: 'hsl(0 0% 92%)', fontSize: '13px', fontFamily: 'var(--font-mono)', marginBottom: '20px', boxSizing: 'border-box', outline: 'none' }

  const loadVaultInfo = async (id: string) => {
    if (!id) return
    try {
      const [vaultRes, priceRes] = await Promise.all([
        fetch(`${API_URL}/vaults/${id}`),
        fetch(`${API_URL}/price`),
      ])
      const vault = await vaultRes.json()
      const price = await priceRes.json()
      if (vaultRes.ok) {
        setVaultInfo(vault)
        setBtcPrice(parseFloat(price.btc_usd) || 0)
      }
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    fetch(`${API_URL}/dashboard`)
      .then(r => r.json())
      .then(d => {
        const active = d.vaults?.filter((v: any) => v.status === 'active') || []
        setAccounts(active)
      })
  }, [])

  useEffect(() => { if (vaultId) loadVaultInfo(vaultId) }, [vaultId])

  const outstanding = vaultInfo ? (parseFloat(vaultInfo.ubtc_minted) || 0) : 0
  const btcLocked = vaultInfo ? vaultInfo.btc_amount_sats / 100_000_000 : 0
  const withdrawAmount = parseFloat(amount) || 0
  const btcToRelease = btcPrice > 0 && withdrawAmount > 0 && outstanding > 0
    ? (withdrawAmount / outstanding) * btcLocked
    : 0
  const btcRemainingAfter = btcLocked - btcToRelease
  const ubtcRemainingAfter = outstanding - withdrawAmount

  const requestWithdraw = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_URL}/withdraw/request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vault_id: vaultId, ubtc_amount: amount, destination_address: destination })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setWithdrawId(data.withdraw_id)
      setOtpCode(data.otp_code)
      setExpiresAt(data.expires_at)
      setStep('verify')
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const verifyWithdraw = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_URL}/withdraw/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdraw_id: withdrawId, otp_code: otp, second_key: secondKey })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      setStep('done')
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const canProceed = vaultId && amount && destination && withdrawAmount > 0 && withdrawAmount <= outstanding

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 5%)', padding: '40px 24px', fontFamily: 'var(--font-display)' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(205 85% 55%)', boxShadow: '0 0 10px hsl(205 85% 55% / 0.8)' }} />
          <span style={{ fontSize: '11px', ...mono, color: 'hsl(205 85% 55%)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Quantum-Secure Withdraw</span>
        </div>

        <h1 style={{ fontSize: '40px', fontWeight: '700', lineHeight: '1', marginBottom: '12px', color: 'hsl(0 0% 92%)' }}>Withdraw BTC</h1>
        <p style={{ color: 'hsl(0 0% 65%)', fontSize: '14px', ...mono, marginBottom: '32px', lineHeight: '1.8' }}>
          Burn UBTC and receive the equivalent BTC from your vault.
        </p>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', alignItems: 'center' }}>
          {[{ n: 1, label: 'Details' }, { n: 2, label: 'Confirm' }, { n: 3, label: 'Authorize' }, { n: 4, label: 'Done' }].map((s, i) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: (step === 'form' && s.n === 1) || (step === 'warning' && s.n === 2) || (step === 'verify' && s.n === 3) || (step === 'done' && s.n === 4)
                  ? 'hsl(205 85% 55%)' : 'hsl(220 12% 8%)',
                border: '1px solid hsl(220 10% 16%)', fontSize: '12px', fontWeight: '700', color: 'white',
              }}>{s.n}</div>
              <span style={{ fontSize: '11px', ...mono, color: 'hsl(0 0% 55%)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</span>
              {i < 3 && <div style={{ width: '20px', height: '1px', background: 'hsl(220 10% 16%)' }} />}
            </div>
          ))}
        </div>

        <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '16px', padding: '28px' }}>

          {/* Step 1 — Form */}
          {step === 'form' && (
            <>
              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Select Account</label>
              <select value={vaultId} onChange={e => setVaultId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">— Choose account —</option>
                {accounts.map((v) => (
                  <option key={v.vault_id} value={v.vault_id}>
                    {v.account_type === 'custody' ? '🔐' : '💳'} {v.account_type === 'custody' ? 'Custody' : 'Current'} Account — ${parseFloat(v.ubtc_minted).toLocaleString()} UBTC
                  </option>
                ))}
              </select>

              {vaultInfo && outstanding > 0 && (
                <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>UBTC Balance</p>
                      <p style={{ color: 'hsl(205 85% 55%)', fontSize: '15px', fontWeight: '700', ...mono, margin: 0 }}>${outstanding.toLocaleString()}</p>
                    </div>
                    <div>
                      <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>BTC Locked</p>
                      <p style={{ color: 'hsl(0 0% 92%)', fontSize: '15px', fontWeight: '700', ...mono, margin: 0 }}>{btcLocked.toFixed(4)}</p>
                    </div>
                    <div>
                      <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>BTC Price</p>
                      <p style={{ color: 'hsl(0 0% 92%)', fontSize: '15px', fontWeight: '700', ...mono, margin: 0 }}>${btcPrice.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {outstanding > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 10px' }}>Quick Select</p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {[{ label: '25%', value: outstanding * 0.25 }, { label: '50%', value: outstanding * 0.5 }, { label: '75%', value: outstanding * 0.75 }, { label: 'All', value: outstanding * 0.999 }].map(btn => (
                      <button key={btn.label} onClick={() => setAmount(btn.value.toFixed(2))} style={{ flex: 1, background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 65%)', borderRadius: '8px', padding: '10px 0', fontSize: '11px', fontWeight: '600', cursor: 'pointer', ...mono, textAlign: 'center' as const }}>
                        {btn.label}<br /><span style={{ fontSize: '10px', opacity: 0.8 }}>${btn.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>UBTC Amount to Withdraw</label>
              <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="10000" type="number" style={inputStyle} />

              {btcToRelease > 0 && (
                <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(205 85% 55% / 0.2)', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>You Will Receive</p>
                  <p style={{ color: 'hsl(205 85% 55%)', fontSize: '20px', fontWeight: '700', ...mono, margin: 0 }}>{btcToRelease.toFixed(6)} BTC</p>
                </div>
              )}

              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Destination Bitcoin Address</label>
              <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="bcrt1q..." style={inputStyle} />

              <button onClick={() => canProceed && setStep('warning')} disabled={!canProceed} style={canProceed ? btnPrimary : btnDisabled}>
                Continue →
              </button>
            </>
          )}

          {/* Step 2 — Warning */}
          {step === 'warning' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <span style={{ fontSize: '28px' }}>⚠️</span>
                <h2 style={{ color: 'hsl(38 92% 50%)', fontSize: '18px', fontWeight: '700', margin: 0 }}>Confirm Withdrawal</h2>
              </div>

              <p style={{ color: 'hsl(0 0% 92%)', fontSize: '13px', ...mono, lineHeight: '1.8', marginBottom: '20px' }}>
                You are about to burn UBTC and release the equivalent BTC from your vault. Please review carefully before proceeding.
              </p>

              <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                {[
                  { label: 'UBTC to burn', value: `$${withdrawAmount.toLocaleString()} UBTC`, color: 'hsl(0 84% 60%)' },
                  { label: 'BTC to release', value: `${btcToRelease.toFixed(6)} BTC`, color: 'hsl(205 85% 55%)' },
                  { label: 'Destination', value: `${destination.slice(0, 16)}...`, color: 'hsl(0 0% 92%)' },
                  { label: 'UBTC remaining after', value: `$${ubtcRemainingAfter.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: 'hsl(0 0% 92%)' },
                  { label: 'BTC remaining in vault', value: `${btcRemainingAfter.toFixed(6)} BTC`, color: 'hsl(0 0% 92%)' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid hsl(220 10% 14%)' }}>
                    <span style={{ color: 'hsl(0 0% 55%)', fontSize: '12px', ...mono }}>{item.label}</span>
                    <span style={{ color: item.color, fontWeight: '700', fontSize: '12px', ...mono }}>{item.value}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: 'hsl(0 84% 60% / 0.06)', border: '1px solid hsl(0 84% 60% / 0.3)', borderRadius: '10px', padding: '14px', marginBottom: '24px' }}>
                <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.7' }}>
                  This action is irreversible. After confirmation you will need to complete OTP verification and quantum signature approval before BTC is released.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setStep('form')} style={btnGhost}>← Back</button>
                <button onClick={requestWithdraw} disabled={loading} style={btnRed}>
                  {loading ? 'Generating OTP...' : 'Confirm — Proceed to Authorization'}
                </button>
              </div>
            </>
          )}

          {/* Step 3 — OTP + Quantum */}
          {step === 'verify' && (
            <>
              <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>Withdraw ID</p>
                <p style={{ color: 'hsl(205 85% 55%)', fontWeight: '600', ...mono, margin: '0 0 16px', fontSize: '13px' }}>{withdrawId}</p>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>Your OTP Code</p>
                <p style={{ color: 'hsl(0 0% 92%)', fontWeight: '700', ...mono, margin: '0 0 12px', fontSize: '32px', letterSpacing: '0.4em' }}>{otpCode}</p>
                <p style={{ color: 'hsl(38 92% 50%)', fontSize: '11px', ...mono, margin: 0 }}>Expires: {new Date(expiresAt).toLocaleTimeString()}</p>
              </div>

              <div style={{ background: 'hsl(205 85% 55% / 0.05)', border: '1px solid hsl(205 85% 55% / 0.2)', borderRadius: '10px', padding: '14px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>⚛️</span>
                <p style={{ color: 'hsl(205 85% 55%)', fontSize: '11px', ...mono, margin: 0, lineHeight: '1.6' }}>
                  This withdrawal is protected by post-quantum cryptography. Your OTP + protocol second key will generate a Dilithium3 signature before BTC is released.
                </p>
              </div>

              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Enter OTP Code</label>
              <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456" style={inputStyle} />

              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Protocol Second Key</label>
              <input value={secondKey} onChange={e => setSecondKey(e.target.value)} placeholder="Protocol authorization key" type="password" style={inputStyle} />

              <button onClick={verifyWithdraw} disabled={loading || !otp || !secondKey} style={loading || !otp || !secondKey ? btnDisabled : btnPrimary}>
                {loading ? 'Signing with Quantum Key...' : 'Authorize Withdrawal'}
              </button>
              <button onClick={() => setStep('form')} style={{ ...btnGhost, marginTop: '12px' }}>Cancel</button>
            </>
          )}

          {/* Step 4 — Done */}
          {step === 'done' && result && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>✅</span>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '12px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>Withdrawal Complete</p>
                <p style={{ fontSize: '32px', fontWeight: '700', color: 'hsl(205 85% 55%)', margin: 0 }}>{result.btc_sent} BTC</p>
                <p style={{ color: 'hsl(0 0% 55%)', fontSize: '12px', ...mono, margin: '8px 0 0' }}>sent to destination address</p>
              </div>

              <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                {[
                  { label: 'Transaction ID', value: result.txid, color: 'hsl(205 85% 55%)' },
                  { label: 'UBTC Burned', value: `$${withdrawAmount.toLocaleString()}`, color: 'hsl(0 84% 60%)' },
                  { label: 'Security', value: 'OTP ✓ Second Key ✓ Quantum ✓', color: 'hsl(142 76% 36%)' },
                ].map(item => (
                  <div key={item.label} style={{ padding: '8px 0', borderBottom: '1px solid hsl(220 10% 14%)' }}>
                    <p style={{ color: 'hsl(0 0% 55%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>{item.label}</p>
                    <p style={{ color: item.color, fontSize: '12px', ...mono, margin: 0, wordBreak: 'break-all' as const }}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <a href={`/account/${vaultId}`} style={{ ...btnPrimary, flex: 1, display: 'block', textAlign: 'center', textDecoration: 'none' }}>View Account</a>
                <a href="/dashboard" style={{ ...btnGhost, flex: 1, display: 'block', textAlign: 'center', textDecoration: 'none' }}>Dashboard</a>
              </div>
            </>
          )}

          {error && <p style={{ color: 'hsl(0 84% 60%)', marginTop: '16px', fontSize: '13px', ...mono }}>{error}</p>}
        </div>
      </div>
    </div>
  )
}

export default function WithdrawPage() {
  return (
    <Suspense fallback={<div style={{ color: 'hsl(0 0% 65%)', padding: '40px', fontFamily: 'var(--font-mono)' }}>Loading...</div>}>
      <WithdrawContent />
    </Suspense>
  )
}
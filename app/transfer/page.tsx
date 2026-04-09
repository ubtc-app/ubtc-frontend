'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { API_URL } from '../lib/supabase'

const btnPrimary: any = { backgroundImage: 'var(--gradient-mint)', color: 'white', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', boxShadow: '0 0 30px hsl(205 85% 55% / 0.4)', width: '100%' }
const btnGhost: any = { background: 'none', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 65%)', borderRadius: '10px', padding: '12px 24px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', textDecoration: 'none', display: 'inline-block' }
const btnDisabled: any = { background: 'hsl(220 10% 14%)', color: 'hsl(0 0% 40%)', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'not-allowed', fontFamily: 'var(--font-display)', width: '100%' }

function TransferContent() {
  const searchParams = useSearchParams()
  const [vaultId, setVaultId] = useState(searchParams.get('vault') || '')
  const [destination, setDestination] = useState('')
  const [amount, setAmount] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [secondKey, setSecondKey] = useState('')
  const [step, setStep] = useState<'request' | 'verify' | 'done'>('request')
  const [transferId, setTransferId] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [vaultInfo, setVaultInfo] = useState<any>(null)
  const [btcPrice, setBtcPrice] = useState<number>(0)
  const [pqPublicKey, setPqPublicKey] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

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
      if (vaultRes.ok) { setVaultInfo(vault); setBtcPrice(parseFloat(price.btc_usd)) }
    } catch (e) { console.error(e) }
  }

  useEffect(() => { if (vaultId) loadVaultInfo(vaultId) }, [vaultId])

  const requestTransfer = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_URL}/transfer/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vault_id: vaultId, destination_address: destination, ubtc_amount: amount, user_email: email })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTransferId(data.transfer_id)
      setOtpCode(data.otp_code)
      setPqPublicKey(data.pq_public_key)
      setExpiresAt(data.expires_at)
      setStep('verify')
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const verifyTransfer = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_URL}/transfer/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transfer_id: transferId, otp_code: otp, second_key: secondKey })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      setStep('done')
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const outstanding = vaultInfo ? parseFloat(vaultInfo.ubtc_minted) : 0
  const transferAmount = parseFloat(amount) || 0
  const btcEquivalent = btcPrice > 0 && transferAmount > 0 ? transferAmount / btcPrice : 0

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 5%)', padding: '40px 24px', fontFamily: 'var(--font-display)' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(205 85% 55%)', boxShadow: '0 0 10px hsl(205 85% 55% / 0.8)' }} />
          <span style={{ fontSize: '11px', ...mono, color: 'hsl(205 85% 55%)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Quantum-Secure Transfer</span>
        </div>

        <h1 style={{ fontSize: '40px', fontWeight: '700', lineHeight: '1', marginBottom: '12px', backgroundImage: 'var(--gradient-vivid)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          Transfer UBTC
        </h1>
        <p style={{ color: 'hsl(0 0% 65%)', fontSize: '14px', ...mono, marginBottom: '12px', lineHeight: '1.8' }}>
          OTP + Dual-Key + Dilithium3 Post-Quantum Signature
        </p>

        {/* Security badges */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {['OTP Protected', 'Dual-Key Auth', 'Dilithium3 PQ', 'QRNG Entropy'].map(badge => (
            <span key={badge} style={{ fontSize: '10px', ...mono, color: 'hsl(205 85% 55%)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '20px', padding: '4px 10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {badge}
            </span>
          ))}
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', alignItems: 'center' }}>
          {[{ n: 1, label: 'Request' }, { n: 2, label: 'Verify' }, { n: 3, label: 'Complete' }].map((s, i) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: step === 'request' && s.n === 1 || step === 'verify' && s.n === 2 || step === 'done' && s.n === 3
                  ? 'hsl(205 85% 55%)' : step === 'verify' && s.n === 1 || step === 'done' && s.n <= 2
                  ? 'hsl(205 85% 55% / 0.3)' : 'hsl(220 12% 8%)',
                border: '1px solid hsl(220 10% 16%)',
                fontSize: '12px', fontWeight: '700', color: 'white',
              }}>{s.n}</div>
              <span style={{ fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</span>
              {i < 2 && <div style={{ width: '24px', height: '1px', background: 'hsl(220 10% 16%)' }} />}
            </div>
          ))}
        </div>

        <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '16px', padding: '28px' }}>

          {step === 'request' && (
            <>
              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Vault ID</label>
              <input value={vaultId} onChange={e => { setVaultId(e.target.value); if (e.target.value.length > 8) loadVaultInfo(e.target.value) }} placeholder="vault_feddd867" style={inputStyle} />

              {vaultInfo && (
                <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>UBTC Available</p>
                      <p style={{ color: 'hsl(205 85% 55%)', fontSize: '16px', fontWeight: '700', ...mono, margin: 0 }}>${outstanding.toLocaleString()}</p>
                    </div>
                    <div>
                      <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>BTC Price</p>
                      <p style={{ color: 'hsl(0 0% 92%)', fontSize: '16px', fontWeight: '700', ...mono, margin: 0 }}>${btcPrice.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Destination Bitcoin Address</label>
              <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="bcrt1q..." style={inputStyle} />

              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>UBTC Amount</label>
              {outstanding > 0 && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {[{ label: '25%', value: outstanding * 0.25 }, { label: '50%', value: outstanding * 0.5 }, { label: '75%', value: outstanding * 0.75 }, { label: 'All', value: outstanding }].map(btn => (
                    <button key={btn.label} onClick={() => setAmount(btn.value.toFixed(2))} style={{ flex: 1, background: amount === btn.value.toFixed(2) ? 'hsl(205 85% 55% / 0.2)' : 'hsl(220 15% 5%)', border: `1px solid ${amount === btn.value.toFixed(2) ? 'hsl(205 85% 55%)' : 'hsl(220 10% 16%)'}`, color: amount === btn.value.toFixed(2) ? 'hsl(205 85% 55%)' : 'hsl(0 0% 65%)', borderRadius: '8px', padding: '8px 0', fontSize: '11px', fontWeight: '600', cursor: 'pointer', ...mono, textAlign: 'center' as const }}>
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}
              <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="1000" type="number" style={inputStyle} />

              {btcEquivalent > 0 && (
                <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(205 85% 55% / 0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px' }}>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>BTC Equivalent</p>
                  <p style={{ color: 'hsl(205 85% 55%)', fontSize: '18px', fontWeight: '700', ...mono, margin: 0 }}>{btcEquivalent.toFixed(6)} BTC</p>
                </div>
              )}

              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Email (for OTP)</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />

              <button onClick={requestTransfer} disabled={loading || !vaultId || !destination || !amount} style={loading || !vaultId || !destination || !amount ? btnDisabled : btnPrimary}>
                {loading ? 'Generating OTP + PQ Keys...' : 'Request Transfer'}
              </button>
            </>
          )}

          {step === 'verify' && (
            <>
              <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>Transfer ID</p>
                <p style={{ color: 'hsl(205 85% 55%)', fontWeight: '600', ...mono, margin: '0 0 12px', fontSize: '13px' }}>{transferId}</p>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>Your OTP Code</p>
                <p style={{ color: 'hsl(0 0% 92%)', fontWeight: '700', ...mono, margin: '0 0 12px', fontSize: '28px', letterSpacing: '0.3em' }}>{otpCode}</p>
                <p style={{ color: 'hsl(38 92% 50%)', fontSize: '11px', ...mono, margin: 0 }}>
                  Expires: {new Date(expiresAt).toLocaleTimeString()}
                </p>
              </div>

              <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>Dilithium3 Public Key</p>
                <p style={{ color: 'hsl(205 85% 55%)', fontSize: '10px', wordBreak: 'break-all', ...mono, margin: 0 }}>{pqPublicKey.slice(0, 64)}...</p>
              </div>

              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Enter OTP Code</label>
              <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="534912" style={inputStyle} />

              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Protocol Second Key</label>
              <input value={secondKey} onChange={e => setSecondKey(e.target.value)} placeholder="Protocol authorization key" type="password" style={inputStyle} />

              <button onClick={verifyTransfer} disabled={loading || !otp || !secondKey} style={loading || !otp || !secondKey ? btnDisabled : btnPrimary}>
                {loading ? 'Signing with Dilithium3...' : 'Authorize Transfer'}
              </button>

              <button onClick={() => setStep('request')} style={{ ...btnGhost, width: '100%', marginTop: '12px', textAlign: 'center' as const }}>
                Back
              </button>
            </>
          )}

          {step === 'done' && result && (
            <>
              <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '10px', padding: '20px', marginBottom: '16px', textAlign: 'center' }}>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>Transfer Complete</p>
                <p style={{ fontSize: '32px', fontWeight: '700', backgroundImage: 'var(--gradient-mint)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: '0 0 8px' }}>${transferAmount.toLocaleString()} UBTC</p>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '12px', ...mono, margin: 0 }}>Quantum-secured transfer broadcast</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', padding: '14px' }}>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>Transaction ID</p>
                  <p style={{ color: 'hsl(205 85% 55%)', fontSize: '12px', wordBreak: 'break-all', ...mono, margin: 0 }}>{result.txid}</p>
                </div>
                <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', padding: '14px' }}>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>Dilithium3 Signature</p>
                  <p style={{ color: 'hsl(205 85% 55%)', fontSize: '10px', wordBreak: 'break-all', ...mono, margin: 0 }}>{result.pq_signature?.slice(0, 80)}...</p>
                </div>
                <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', padding: '14px' }}>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>Security Stack</p>
                  <p style={{ color: 'hsl(0 0% 92%)', fontSize: '12px', ...mono, margin: 0 }}>OTP ✓ + Second Key ✓ + Dilithium3 ✓ + QRNG ✓</p>
                </div>
              </div>

              <a href="/dashboard" style={{ ...btnPrimary, display: 'block', textAlign: 'center', textDecoration: 'none' }}>Back to Dashboard</a>
            </>
          )}

          {error && <p style={{ color: 'hsl(0 84% 60%)', marginTop: '16px', fontSize: '13px', ...mono }}>{error}</p>}
        </div>
      </div>
    </div>
  )
}

export default function TransferPage() {
  return (
    <Suspense fallback={<div style={{ color: 'hsl(0 0% 65%)', padding: '40px', fontFamily: 'var(--font-mono)' }}>Loading...</div>}>
      <TransferContent />
    </Suspense>
  )
}
'use client'
import { useState, useEffect } from 'react'
import { API_URL } from '../lib/supabase'

const PUBKEY = '032bb4a115bddb717274ba34d757338d309865e632232f31c874a0707c2c566ef5'

export default function VaultPage() {
  const [accountType, setAccountType] = useState<'current' | 'custody' | null>(null)
  const [step, setStep] = useState<'choose' | 'confirm' | 'done'>('choose')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [existingTypes, setExistingTypes] = useState<string[]>([])

  const mono: any = { fontFamily: 'var(--font-mono)' }

  useEffect(() => {
    fetch(`${API_URL}/dashboard`)
      .then(r => r.json())
      .then(d => {
        const types = (d.vaults || []).map((v: any) => v.account_type)
        setExistingTypes(types)
      })
  }, [])

  const hasCurrentAccount = existingTypes.includes('current')
  const hasCustodyAccount = existingTypes.includes('custody')
  const bothExist = hasCurrentAccount && hasCustodyAccount

  const btnBlue: any = {
    background: 'linear-gradient(135deg, hsl(205, 85%, 55%), hsl(190, 80%, 50%))',
    color: 'white', border: 'none', borderRadius: '10px', padding: '16px 32px',
    fontSize: '15px', fontWeight: '600', cursor: 'pointer',
    fontFamily: 'var(--font-display)', width: '100%',
    boxShadow: '0 0 30px hsl(205 85% 55% / 0.4)',
  }

  const btnAmber: any = {
    background: 'hsl(38 92% 50%)',
    color: 'white', border: 'none', borderRadius: '10px', padding: '16px 32px',
    fontSize: '15px', fontWeight: '600', cursor: 'pointer',
    fontFamily: 'var(--font-display)', width: '100%',
    boxShadow: '0 0 30px hsl(38 92% 50% / 0.3)',
  }

  const btnDisabled: any = {
    background: 'hsl(220 10% 14%)', color: 'hsl(0 0% 40%)', border: 'none',
    borderRadius: '10px', padding: '16px 32px', fontSize: '15px', fontWeight: '600',
    cursor: 'not-allowed', fontFamily: 'var(--font-display)', width: '100%',
  }

  const getBtn = () => {
    if (!accountType) return btnDisabled
    if (accountType === 'custody') return btnAmber
    return btnBlue
  }

  const createAccount = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_URL}/vaults`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_pubkey: PUBKEY,
          network: 'regtest',
          recovery_blocks: 6,
          account_type: accountType,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      setStep('done')
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 5%)', padding: '40px 24px', fontFamily: 'var(--font-display)' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(205 85% 55%)', boxShadow: '0 0 10px hsl(205 85% 55% / 0.8)' }} />
          <span style={{ fontSize: '11px', ...mono, color: 'hsl(205 85% 55%)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Open Account</span>
        </div>

        <h1 style={{ fontSize: '40px', fontWeight: '700', color: 'hsl(0 0% 92%)', marginBottom: '12px' }}>Open an Account</h1>
        <p style={{ color: 'hsl(0 0% 65%)', fontSize: '14px', ...mono, marginBottom: '40px', lineHeight: '1.8' }}>
          Choose the account type that suits you. Both are Bitcoin-backed and quantum-secure.
        </p>

        {bothExist && (
          <div style={{ background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.3)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
            <p style={{ color: 'hsl(0 84% 60%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.6' }}>
              You already have both a Current and Custody account. To open a new account, please close your existing account of that type from the dashboard first.
            </p>
          </div>
        )}

        {step === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '16px' }}>

            {/* Current Account */}
            <div
              onClick={() => !hasCurrentAccount && setAccountType('current')}
              style={{
                background: 'hsl(220 12% 8%)',
                border: `2px solid ${accountType === 'current' ? 'hsl(205 85% 55%)' : hasCurrentAccount ? 'hsl(220 10% 12%)' : 'hsl(220 10% 16%)'}`,
                borderRadius: '16px', padding: '28px',
                cursor: hasCurrentAccount ? 'not-allowed' : 'pointer',
                opacity: hasCurrentAccount ? 0.5 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'hsl(205 85% 55% / 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💳</div>
                  <div>
                    <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: 0 }}>Current Account</h2>
                    <p style={{ color: 'hsl(0 0% 55%)', fontSize: '12px', ...mono, margin: 0 }}>Everyday banking</p>
                  </div>
                </div>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${accountType === 'current' ? 'hsl(205 85% 55%)' : 'hsl(220 10% 30%)'}`, background: accountType === 'current' ? 'hsl(205 85% 55%)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {accountType === 'current' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />}
                </div>
              </div>
              <p style={{ color: 'hsl(0 0% 65%)', fontSize: '13px', ...mono, lineHeight: '1.7', marginBottom: '16px' }}>
                For everyday spending, transfers and payments. Easy access to your UBTC balance with full quantum security on all withdrawals.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const, marginBottom: hasCurrentAccount ? '12px' : '0' }}>
                {['Quantum-Secure', 'Free Transfers', 'Instant Access', 'BTC Backed'].map(f => (
                  <span key={f} style={{ fontSize: '10px', ...mono, color: 'hsl(205 85% 55%)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '20px', padding: '3px 10px', textTransform: 'uppercase' }}>{f}</span>
                ))}
              </div>
              {hasCurrentAccount && (
                <div style={{ background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.2)', borderRadius: '8px', padding: '10px 14px', marginTop: '12px' }}>
                  <p style={{ color: 'hsl(0 84% 60%)', fontSize: '11px', ...mono, margin: 0 }}>
                    ✗ You already have a Current Account. Close it from the dashboard to open a new one.
                  </p>
                </div>
              )}
            </div>

            {/* Custody Account */}
            <div
              onClick={() => !hasCustodyAccount && setAccountType('custody')}
              style={{
                background: 'hsl(220 12% 8%)',
                border: `2px solid ${accountType === 'custody' ? 'hsl(38 92% 50%)' : hasCustodyAccount ? 'hsl(220 10% 12%)' : 'hsl(220 10% 16%)'}`,
                borderRadius: '16px', padding: '28px',
                cursor: hasCustodyAccount ? 'not-allowed' : 'pointer',
                opacity: hasCustodyAccount ? 0.5 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'hsl(38 92% 50% / 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🔐</div>
                  <div>
                    <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: 0 }}>Custody Account</h2>
                    <p style={{ color: 'hsl(0 0% 55%)', fontSize: '12px', ...mono, margin: 0 }}>Institutional-grade security</p>
                  </div>
                </div>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${accountType === 'custody' ? 'hsl(38 92% 50%)' : 'hsl(220 10% 30%)'}`, background: accountType === 'custody' ? 'hsl(38 92% 50%)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {accountType === 'custody' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />}
                </div>
              </div>
              <p style={{ color: 'hsl(0 0% 65%)', fontSize: '13px', ...mono, lineHeight: '1.7', marginBottom: '16px' }}>
                Designed for long-term secure storage. Protected by post-quantum cryptography — the same technology used by governments and financial institutions. Every transfer requires explicit confirmation.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const, marginBottom: hasCustodyAccount ? '12px' : '0' }}>
                {['Post-Quantum', 'Transfer Warnings', 'Long-Term Storage', 'BTC Backed'].map(f => (
                  <span key={f} style={{ fontSize: '10px', ...mono, color: 'hsl(38 92% 50%)', border: '1px solid hsl(38 92% 50% / 0.3)', borderRadius: '20px', padding: '3px 10px', textTransform: 'uppercase' }}>{f}</span>
                ))}
              </div>
              {hasCustodyAccount && (
                <div style={{ background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.2)', borderRadius: '8px', padding: '10px 14px', marginTop: '12px' }}>
                  <p style={{ color: 'hsl(0 84% 60%)', fontSize: '11px', ...mono, margin: 0 }}>
                    ✗ You already have a Custody Account. Close it from the dashboard to open a new one.
                  </p>
                </div>
              )}
            </div>

            {/* Quantum note */}
            <div style={{ background: 'hsl(205 85% 55% / 0.05)', border: '1px solid hsl(205 85% 55% / 0.2)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ fontSize: '20px', flexShrink: 0 }}>⚛️</span>
              <div>
                <p style={{ color: 'hsl(205 85% 55%)', fontSize: '12px', fontWeight: '600', margin: '0 0 4px' }}>Both accounts are quantum-secure</p>
                <p style={{ color: 'hsl(0 0% 55%)', fontSize: '11px', ...mono, margin: 0, lineHeight: '1.6' }}>
                  All withdrawals use post-quantum signatures with quantum random number generation. Your funds are protected against both classical and quantum computer attacks.
                </p>
              </div>
            </div>

            <button onClick={() => accountType && setStep('confirm')} disabled={!accountType} style={getBtn()}>
              {accountType ? `Open ${accountType === 'current' ? 'Current' : 'Custody'} Account →` : 'Select an account type'}
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '16px', padding: '32px' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>{accountType === 'current' ? '💳' : '🔐'}</span>
              <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '22px', fontWeight: '700', margin: '0 0 8px' }}>
                Open {accountType === 'current' ? 'Current' : 'Custody'} Account
              </h2>
              <p style={{ color: 'hsl(0 0% 55%)', fontSize: '13px', ...mono, margin: 0 }}>
                A Bitcoin deposit address will be generated for your account
              </p>
            </div>

            <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Account Type', value: accountType === 'current' ? 'Current Account' : 'Custody Account' },
                { label: 'Currency', value: 'UBTC (Bitcoin-backed)' },
                { label: 'Network', value: 'Bitcoin Regtest' },
                { label: 'Security', value: 'Post-Quantum (Dilithium3)' },
                { label: 'Min Collateral', value: '150%' },
                { label: 'Liquidation', value: '110%' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid hsl(220 10% 12%)' }}>
                  <span style={{ color: 'hsl(0 0% 55%)', fontSize: '12px', ...mono }}>{item.label}</span>
                  <span style={{ color: 'hsl(0 0% 92%)', fontSize: '12px', fontWeight: '600', ...mono }}>{item.value}</span>
                </div>
              ))}
            </div>

            {accountType === 'custody' && (
              <div style={{ background: 'hsl(38 92% 50% / 0.08)', border: '1px solid hsl(38 92% 50% / 0.3)', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
                <p style={{ color: 'hsl(38 92% 50%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>
                  🔐 Custody Account — any transfer out will require explicit confirmation to protect your funds.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep('choose')} style={{ background: 'none', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 65%)', borderRadius: '10px', padding: '14px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
                Back
              </button>
              <button onClick={createAccount} disabled={loading} style={{ flex: 1, ...(accountType === 'custody' ? btnAmber : btnBlue), padding: '14px 32px', fontSize: '14px' }}>
                {loading ? 'Creating account...' : 'Confirm — Open Account'}
              </button>
            </div>

            {error && <p style={{ color: 'hsl(0 84% 60%)', marginTop: '16px', fontSize: '13px', ...mono }}>{error}</p>}
          </div>
        )}

        {step === 'done' && result && (
          <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '16px', padding: '32px' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>✅</span>
              <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '22px', fontWeight: '700', margin: '0 0 8px' }}>Account Opened</h2>
              <p style={{ color: 'hsl(0 0% 55%)', fontSize: '13px', ...mono, margin: 0 }}>
                Your {accountType === 'current' ? 'Current' : 'Custody'} Account is ready
              </p>
            </div>

            <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: 'hsl(0 0% 55%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>Account ID</p>
                <p style={{ color: 'hsl(205 85% 55%)', fontSize: '14px', fontWeight: '600', ...mono, margin: 0 }}>{result.vault_id}</p>
              </div>
              <div>
                <p style={{ color: 'hsl(0 0% 55%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>Bitcoin Deposit Address</p>
                <p style={{ color: 'hsl(0 0% 92%)', fontSize: '13px', ...mono, margin: 0, wordBreak: 'break-all' }}>{result.deposit_address}</p>
              </div>
            </div>

            <div style={{ background: 'hsl(38 92% 50% / 0.08)', border: '1px solid hsl(38 92% 50% / 0.3)', borderRadius: '10px', padding: '14px', marginBottom: '24px' }}>
              <p style={{ color: 'hsl(38 92% 50%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>
                Next — fund your account by depositing Bitcoin, then issue UBTC against your collateral.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <a href={`/deposit?vault=${result.vault_id}`} style={{ flex: 1, background: 'linear-gradient(135deg, hsl(205, 85%, 55%), hsl(190, 80%, 50%))', color: 'white', textDecoration: 'none', borderRadius: '10px', padding: '14px 0', fontSize: '14px', fontWeight: '600', fontFamily: 'var(--font-display)', textAlign: 'center' as const, display: 'block' }}>
                Fund Account →
              </a>
              <a href="/dashboard" style={{ flex: 1, background: 'none', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 65%)', textDecoration: 'none', borderRadius: '10px', padding: '14px 0', fontSize: '14px', fontWeight: '600', fontFamily: 'var(--font-display)', textAlign: 'center' as const, display: 'block' }}>
                Dashboard
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
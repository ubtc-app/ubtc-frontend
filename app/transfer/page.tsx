'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { API_URL } from '../lib/supabase'

const btnPrimary: any = { backgroundImage: 'var(--gradient-mint)', color: 'white', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', boxShadow: '0 0 30px hsl(205 85% 55% / 0.4)', width: '100%' }
const btnRed: any = { background: 'hsl(0 84% 60%)', color: 'white', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', width: '100%' }
const btnGhost: any = { background: 'none', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 65%)', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', width: '100%' }
const btnDisabled: any = { background: 'hsl(220 10% 14%)', color: 'hsl(0 0% 40%)', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: 'not-allowed', fontFamily: 'var(--font-display)', width: '100%' }

function TransferContent() {
  const searchParams = useSearchParams()
  const [vaultId, setVaultId] = useState(searchParams.get('vault') || '')
  const [destination, setDestination] = useState('')
  const [amount, setAmount] = useState('')
  const [recipientType, setRecipientType] = useState<'own' | 'other' | null>(null)
  const [step, setStep] = useState<'select_account' | 'recipient_type' | 'warning' | 'form' | 'done'>('select_account')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [vaultInfo, setVaultInfo] = useState<any>(null)
  const [btcPrice, setBtcPrice] = useState<number>(0)
  const [accounts, setAccounts] = useState<any[]>([])

  const mono: any = { fontFamily: 'var(--font-mono)' }
  const inputStyle: any = { display: 'block', width: '100%', padding: '14px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', color: 'hsl(0 0% 92%)', fontSize: '13px', fontFamily: 'var(--font-mono)', marginBottom: '20px', boxSizing: 'border-box', outline: 'none' }

  useEffect(() => {
    fetch(`${API_URL}/dashboard`)
      .then(r => r.json())
      .then(d => {
        const active = d.vaults?.filter((v: any) => v.status === 'active' && parseFloat(v.ubtc_minted) > 0) || []
        setAccounts(active)
        setBtcPrice(parseFloat(d.btc_price_usd) || 0)
        if (searchParams.get('vault')) {
          const v = active.find((a: any) => a.vault_id === searchParams.get('vault'))
          if (v) { setVaultInfo(v); setStep('recipient_type') }
        }
      })
  }, [])

  const selectAccount = (vault: any) => {
    setVaultId(vault.vault_id)
    setVaultInfo(vault)
    setStep('recipient_type')
  }

  const outstanding = vaultInfo ? parseFloat(vaultInfo.ubtc_minted) : 0
  const transferAmount = parseFloat(amount) || 0
  const btcEquivalent = btcPrice > 0 && transferAmount > 0 ? transferAmount / btcPrice : 0
  const btcLocked = vaultInfo ? vaultInfo.btc_amount_sats / 100_000_000 : 0
  const btcClaimableAfter = btcLocked - btcEquivalent

  const executeSend = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_URL}/transfer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_vault_id: vaultId,
          to_address: destination,
          ubtc_amount: amount,
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
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(205 85% 55%)', boxShadow: '0 0 10px hsl(205 85% 55% / 0.8)' }} />
          <span style={{ fontSize: '11px', ...mono, color: 'hsl(205 85% 55%)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Send UBTC</span>
        </div>

        <h1 style={{ fontSize: '40px', fontWeight: '700', lineHeight: '1', marginBottom: '32px', color: 'hsl(0 0% 92%)' }}>Send</h1>

        <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '16px', padding: '28px' }}>

          {/* Step 1 — Select account */}
          {step === 'select_account' && (
            <>
              <p style={{ color: 'hsl(0 0% 65%)', fontSize: '13px', ...mono, marginBottom: '20px' }}>Select which account to send from:</p>
              {accounts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p style={{ color: 'hsl(0 0% 55%)', ...mono, marginBottom: '16px' }}>No accounts with UBTC balance</p>
                  <a href="/mint" style={{ color: 'hsl(205 85% 55%)', ...mono, fontSize: '13px' }}>Issue UBTC first →</a>
                </div>
              )}
              {accounts.map((vault, index) => (
                <div key={vault.vault_id} onClick={() => selectAccount(vault)} style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '12px', padding: '16px 20px', marginBottom: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'hsl(205 85% 55% / 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>₿</div>
                    <div>
                      <p style={{ color: 'hsl(0 0% 92%)', fontWeight: '600', fontSize: '14px', margin: '0 0 2px' }}>Account {index + 1}</p>
                      <p style={{ color: 'hsl(0 0% 45%)', fontSize: '11px', ...mono, margin: 0 }}>{vault.vault_id}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: 'hsl(205 85% 55%)', fontWeight: '700', fontSize: '16px', margin: '0 0 2px', ...mono }}>${parseFloat(vault.ubtc_minted).toLocaleString()}</p>
                    <p style={{ color: 'hsl(0 0% 45%)', fontSize: '11px', ...mono, margin: 0 }}>UBTC available</p>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Step 2 — Recipient type */}
          {step === 'recipient_type' && vaultInfo && (
            <>
              <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '10px', padding: '14px 16px', marginBottom: '24px' }}>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Sending from</p>
                <p style={{ color: 'hsl(0 0% 92%)', fontWeight: '600', fontSize: '14px', margin: '0 0 2px' }}>
                  Account {accounts.findIndex(a => a.vault_id === vaultId) + 1}
                </p>
                <p style={{ color: 'hsl(205 85% 55%)', fontSize: '16px', fontWeight: '700', ...mono, margin: 0 }}>
                  ${outstanding.toLocaleString()} UBTC available
                </p>
              </div>

              <p style={{ color: 'hsl(0 0% 92%)', fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Who are you sending to?</p>

              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px', marginBottom: '8px' }}>
                <div onClick={() => { setRecipientType('own'); setStep('form') }} style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '12px', padding: '20px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '28px' }}>🔒</span>
                    <div>
                      <p style={{ color: 'hsl(0 0% 92%)', fontWeight: '600', fontSize: '14px', margin: '0 0 4px' }}>My own wallet</p>
                      <p style={{ color: 'hsl(0 0% 55%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.5' }}>
                        Moving UBTC to another address I control. My BTC stays safe and claimable by me.
                      </p>
                    </div>
                  </div>
                </div>

                <div onClick={() => { setRecipientType('other'); setStep('warning') }} style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(0 84% 60% / 0.3)', borderRadius: '12px', padding: '20px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '28px' }}>↗️</span>
                    <div>
                      <p style={{ color: 'hsl(0 0% 92%)', fontWeight: '600', fontSize: '14px', margin: '0 0 4px' }}>Another person</p>
                      <p style={{ color: 'hsl(0 0% 55%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.5' }}>
                        Sending UBTC to someone else. They will be able to claim the backing BTC.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 3 — Warning for other person */}
          {step === 'warning' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <span style={{ fontSize: '28px' }}>⚠️</span>
                <h2 style={{ color: 'hsl(0 84% 60%)', fontSize: '18px', fontWeight: '700', margin: 0 }}>Important Warning</h2>
              </div>

              <div style={{ background: 'hsl(0 84% 60% / 0.06)', border: '1px solid hsl(0 84% 60% / 0.3)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                <p style={{ color: 'hsl(0 0% 92%)', fontSize: '13px', ...mono, lineHeight: '1.8', margin: 0 }}>
                  When you send UBTC to another person, you are transferring your right to claim the backing Bitcoin from your vault.
                  <br /><br />
                  The recipient will be able to redeem your UBTC for real BTC.
                  <br /><br />
                  <strong style={{ color: 'hsl(0 84% 60%)' }}>This cannot be undone.</strong>
                </p>
              </div>

              <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>Current vault position</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid hsl(220 10% 16%)' }}>
                  <span style={{ color: 'hsl(0 0% 65%)', fontSize: '12px', ...mono }}>Your UBTC balance</span>
                  <span style={{ color: 'hsl(0 0% 92%)', fontWeight: '700', ...mono }}>${outstanding.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid hsl(220 10% 16%)' }}>
                  <span style={{ color: 'hsl(0 0% 65%)', fontSize: '12px', ...mono }}>BTC locked in vault</span>
                  <span style={{ color: 'hsl(0 0% 92%)', fontWeight: '700', ...mono }}>{btcLocked.toFixed(4)} BTC</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ color: 'hsl(38 92% 50%)', fontSize: '12px', ...mono }}>⚠ Note — taproot placeholder</span>
                  <span style={{ color: 'hsl(38 92% 50%)', fontWeight: '600', ...mono, fontSize: '11px' }}>On-chain enforcement coming</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setStep('recipient_type')} style={btnGhost}>Cancel</button>
                <button onClick={() => setStep('form')} style={btnRed}>I Understand — Continue</button>
              </div>
            </>
          )}

          {/* Step 4 — Form */}
          {step === 'form' && (
            <>
              {recipientType === 'own' && (
                <div style={{ background: 'hsl(205 85% 55% / 0.08)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px' }}>
                  <p style={{ color: 'hsl(205 85% 55%)', fontSize: '12px', ...mono, margin: 0 }}>
                    🔒 Sending to your own wallet — your BTC remains claimable by you
                  </p>
                </div>
              )}
              {recipientType === 'other' && (
                <div style={{ background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px' }}>
                  <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, margin: 0 }}>
                    ⚠ Sending to another person — they will receive the BTC redemption rights
                  </p>
                </div>
              )}

              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Amount (UBTC)</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {[25, 50, 75, 100].map(pct => (
                  <button key={pct} onClick={() => setAmount(pct === 100 ? (outstanding * 0.999).toFixed(2) : (outstanding * pct / 100).toFixed(2))} style={{ flex: 1, background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 65%)', borderRadius: '8px', padding: '8px 0', fontSize: '11px', fontWeight: '600', cursor: 'pointer', ...mono }}>
                    {pct}%
                  </button>
                ))}
              </div>
              <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="10000" type="number" style={inputStyle} />

              {btcEquivalent > 0 && (
                <div style={{ background: 'hsl(220 15% 5%)', border: `1px solid ${recipientType === 'other' ? 'hsl(0 84% 60% / 0.3)' : 'hsl(205 85% 55% / 0.2)'}`, borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'hsl(0 0% 65%)', fontSize: '12px', ...mono }}>BTC rights being transferred</span>
                    <span style={{ color: recipientType === 'other' ? 'hsl(0 84% 60%)' : 'hsl(205 85% 55%)', fontWeight: '700', ...mono }}>{btcEquivalent.toFixed(6)} BTC</span>
                  </div>
                  {recipientType === 'other' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'hsl(0 0% 65%)', fontSize: '12px', ...mono }}>Your claimable BTC after</span>
                      <span style={{ color: 'hsl(38 92% 50%)', fontWeight: '700', ...mono }}>{btcClaimableAfter.toFixed(6)} BTC</span>
                    </div>
                  )}
                </div>
              )}

              <label style={{ display: 'block', fontSize: '11px', ...mono, color: 'hsl(0 0% 65%)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Destination Address</label>
              <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="bcrt1q..." style={inputStyle} />

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setStep('recipient_type')} style={{ ...btnGhost, flex: '0 0 auto', width: 'auto', padding: '14px 20px' }}>Back</button>
                <button onClick={executeSend} disabled={loading || !amount || !destination} style={{ flex: 1, ...(loading || !amount || !destination ? btnDisabled : recipientType === 'other' ? btnRed : btnPrimary) }}>
                  {loading ? 'Sending...' : recipientType === 'other' ? `⚠ Send $${parseFloat(amount || '0').toLocaleString()} UBTC` : `Send $${parseFloat(amount || '0').toLocaleString()} UBTC`}
                </button>
              </div>
            </>
          )}

          {/* Step 5 — Done */}
          {step === 'done' && result && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>✅</span>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '12px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>Transfer Complete</p>
                <p style={{ fontSize: '36px', fontWeight: '700', color: 'hsl(205 85% 55%)', margin: 0 }}>${transferAmount.toLocaleString()} UBTC</p>
              </div>

              {recipientType === 'other' && (
                <div style={{ background: 'hsl(38 92% 50% / 0.08)', border: '1px solid hsl(38 92% 50% / 0.3)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                  <p style={{ color: 'hsl(38 92% 50%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>
                    ⚠ The recipient now holds {btcEquivalent.toFixed(6)} BTC worth of redemption rights. This transfer is recorded as a Taproot Asset placeholder and will be enforced on-chain when tapd integration is complete.
                  </p>
                </div>
              )}

              {recipientType === 'own' && (
                <div style={{ background: 'hsl(205 85% 55% / 0.08)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                  <p style={{ color: 'hsl(205 85% 55%)', fontSize: '12px', ...mono, margin: 0 }}>
                    🔒 UBTC moved to your address. Your BTC remains claimable by you.
                  </p>
                </div>
              )}

              <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>Transfer ID</p>
                <p style={{ color: 'hsl(205 85% 55%)', fontSize: '12px', ...mono, margin: 0, wordBreak: 'break-all' }}>{result.transfer_id}</p>
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
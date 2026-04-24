'use client'
import { useState } from 'react'
import { API_URL } from '../../lib/supabase'

export default function RedeemProofPage() {
  const [proofFile, setProofFile] = useState<any>(null)
  const [password, setPassword] = useState('')
  const [decrypted, setDecrypted] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'upload' | 'password' | 'redeem' | 'done'>('upload')
  const [btcAddress, setBtcAddress] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const mono: any = { fontFamily: 'var(--font-mono)' }

  function handleProofUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const json = JSON.parse(ev.target?.result as string)
        setProofFile(json); setStep('password'); setError('')
      } catch { setError('Invalid proof file') }
    }
    reader.readAsText(file)
  }

  async function decryptWithPassword() {
    setError(''); setLoading(true)
    try {
      const { loadWallet, loadPasswordVault } = await import('../../lib/wallet/storage')
      const { unsealWithPassword } = await import('../../lib/wallet/password')
      const { decrypt: aesDecrypt, toHex } = await import('../../lib/wallet/encryption')

      const stored = await loadWallet()
      if (!stored) throw new Error('No wallet found in this browser')

      const vault = await loadPasswordVault()
      if (!vault) throw new Error('No password vault found — please set a password first')

      // Unseal localEncKey using password
      const localEncKey = await unsealWithPassword(vault, password)

      // Decrypt Kyber SK using localEncKey
      const kyberSk = await aesDecrypt(stored.encrypted.kyber_sk, localEncKey)
      localEncKey.fill(0)

      // Send Kyber SK to backend for proof decryption
      const enc = proofFile?.redemption_template?.taproot_secret_key_encrypted
      if (!enc) throw new Error('No encrypted key found in proof')

      const kyberSkHex = toHex(kyberSk)
      kyberSk.fill(0)

      const res = await fetch(`${API_URL}/proofs/decrypt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encrypted: enc, kyber_sk: kyberSkHex })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setDecrypted(data.taproot_key)
      setStep('redeem')
    } catch (e: any) {
      setError(e.message === 'Wrong password' ? 'Incorrect password — try again' : e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRedeem() {
    setLoading(true); setError('')
    try {
     const body: any = {
        proof_id: proofFile.proof_id,
        vault_id: proofFile.collateral?.vault_id,
        ubtc_amount: proofFile.ownership?.ubtc_amount,
        destination_address: btcAddress,
        taproot_key: decrypted,
      }
      const res = await fetch(`${API_URL}/proofs/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data); setStep('done')
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center' as const, marginBottom: '32px' }}>
          <h1 style={{ color: 'hsl(0 0% 92%)', fontSize: '28px', fontWeight: '700', margin: '0 0 8px' }}>Redeem UBTC</h1>
          <p style={{ color: 'hsl(0 0% 38%)', fontSize: '13px', ...mono, margin: 0 }}>Convert your UBTC proof to Bitcoin</p>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', justifyContent: 'center' }}>
          {['Upload Proof', 'Unlock', 'Redeem', 'Done'].map((s, i) => {
            const current = ['upload', 'password', 'redeem', 'done'].indexOf(step)
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: i <= current ? 'hsl(142 76% 36%)' : 'hsl(220 12% 12%)', border: `1px solid ${i <= current ? 'hsl(142 76% 36%)' : 'hsl(220 10% 18%)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: i <= current ? 'white' : 'hsl(0 0% 30%)', fontSize: '11px', fontWeight: 700 }}>{i + 1}</span>
                </div>
                {i < 3 && <div style={{ width: '24px', height: '1px', background: i < current ? 'hsl(142 76% 36%)' : 'hsl(220 10% 18%)' }} />}
              </div>
            )
          })}
        </div>

        <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 13%)', borderRadius: '20px', padding: '28px' }}>

          {/* Step 1 — Upload proof */}
          {step === 'upload' && (
            <div>
              <p style={{ color: 'hsl(0 0% 88%)', fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>Upload your proof file</p>
              <p style={{ color: 'hsl(0 0% 38%)', fontSize: '12px', ...mono, margin: '0 0 20px', lineHeight: '1.7' }}>Download your .ubtc proof file from your wallet, then upload it here.</p>
              <label style={{ display: 'block', border: '2px dashed hsl(220 10% 18%)', borderRadius: '12px', padding: '32px', textAlign: 'center' as const, cursor: 'pointer' }}>
                <p style={{ color: 'hsl(0 0% 45%)', fontSize: '13px', ...mono, margin: '0 0 8px' }}>Click to upload .ubtc file</p>
                <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, margin: 0 }}>Your proof file from the wallet page</p>
                <input type="file" accept=".ubtc,.json" onChange={handleProofUpload} style={{ display: 'none' }} />
              </label>
            </div>
          )}

          {/* Step 2 — Password unlock */}
          {step === 'password' && (
            <div>
              <p style={{ color: 'hsl(0 0% 88%)', fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>Enter your wallet password</p>
              <p style={{ color: 'hsl(0 0% 38%)', fontSize: '12px', ...mono, margin: '0 0 8px', lineHeight: '1.7' }}>
                Proof: <span style={{ color: 'hsl(142 76% 36%)' }}>{proofFile?.proof_id}</span>
              </p>
              <p style={{ color: 'hsl(0 0% 38%)', fontSize: '12px', ...mono, margin: '0 0 20px', lineHeight: '1.7' }}>
                Amount: <span style={{ color: 'hsl(38 92% 50%)' }}>{proofFile?.ownership?.ubtc_amount} UBTC</span>
              </p>
              <input
                type="password"
                placeholder="Your wallet password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && decryptWithPassword()}
                style={{ width: '100%', padding: '14px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 18%)', borderRadius: '10px', color: 'hsl(0 0% 88%)', fontSize: '14px', fontFamily: 'monospace', marginBottom: '12px', boxSizing: 'border-box' as const, outline: 'none' }}
              />
              {error && <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, margin: '0 0 12px' }}>{error}</p>}
              <button onClick={decryptWithPassword} disabled={loading || !password} style={{ width: '100%', background: loading ? 'hsl(220 10% 14%)' : 'hsl(142 76% 36%)', color: 'white', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-display)' }}>
                {loading ? 'Unlocking...' : 'Unlock Proof →'}
              </button>
              <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, margin: '12px 0 0', textAlign: 'center' as const }}>Forgot password? Use your 24-word recovery phrase to reset.</p>
            </div>
          )}

          {/* Step 3 — Redeem */}
          {step === 'redeem' && (
            <div>
              <p style={{ color: 'hsl(0 0% 88%)', fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>Enter your Bitcoin address</p>
              <p style={{ color: 'hsl(0 0% 38%)', fontSize: '12px', ...mono, margin: '0 0 20px', lineHeight: '1.7' }}>
                Redeeming <span style={{ color: 'hsl(38 92% 50%)' }}>{proofFile?.ownership?.ubtc_amount} UBTC</span> — BTC will be sent to this address.
              </p>
              <input
                type="text"
                placeholder="tb1q... or bc1q..."
                value={btcAddress}
                onChange={e => setBtcAddress(e.target.value)}
                style={{ width: '100%', padding: '14px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 18%)', borderRadius: '10px', color: 'hsl(0 0% 88%)', fontSize: '13px', fontFamily: 'monospace', marginBottom: '12px', boxSizing: 'border-box' as const, outline: 'none' }}
              />
              {error && <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, margin: '0 0 12px' }}>{error}</p>}
              <button onClick={handleRedeem} disabled={loading || !btcAddress} style={{ width: '100%', background: loading ? 'hsl(220 10% 14%)' : 'hsl(38 92% 50%)', color: '#000', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-display)' }}>
                {loading ? 'Broadcasting...' : 'Redeem to Bitcoin →'}
              </button>
            </div>
          )}

          {/* Step 4 — Done */}
          {step === 'done' && result && (
            <div style={{ textAlign: 'center' as const }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <p style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>Redemption Complete</p>
              <p style={{ color: 'hsl(0 0% 38%)', fontSize: '12px', ...mono, margin: '0 0 24px' }}>BTC is on its way to your address</p>
              <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '10px', padding: '16px', textAlign: 'left' as const }}>
                <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.15em', margin: '0 0 4px' }}>Bitcoin Transaction</p>
                <p style={{ color: 'hsl(205 85% 55%)', fontSize: '11px', ...mono, margin: '0 0 12px', wordBreak: 'break-all' as const }}>{result.txid}</p>
                <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.15em', margin: '0 0 4px' }}>Amount</p>
                <p style={{ color: 'hsl(142 76% 36%)', fontSize: '14px', fontWeight: 700, ...mono, margin: 0 }}>{result.amount_sats?.toLocaleString()} sats</p>
              </div>
              <a href={`https://mempool.space/testnet4/tx/${result.txid}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: '16px', color: 'hsl(205 85% 55%)', fontSize: '12px', ...mono }}>
                View on mempool.space →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
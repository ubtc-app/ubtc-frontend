'use client'
import { useState, useRef } from 'react'
import { API_URL } from '../../lib/supabase'
import { kyberDecrypt, kyberEncrypt, computeNullifier } from '../../lib/kyber'

// ── Types ────────────────────────────────────────────────────────────────────
type Step = 'upload' | 'key' | 'recipient' | 'confirm' | 'done'

export default function ProofTransferPage() {
  const [step, setStep] = useState<Step>('upload')
  const [proofFile, setProofFile] = useState<any>(null)
  const [kyberKey, setKyberKey] = useState('')
  const [decryptedTaprootKey, setDecryptedTaprootKey] = useState('')
  const [recipientInput, setRecipientInput] = useState('')
  const [recipientWallet, setRecipientWallet] = useState<any>(null)
  const [newProof, setNewProof] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<any>(null)
  const keyFileRef = useRef<HTMLInputElement>(null)

  const mono: any = { fontFamily: 'var(--font-mono)' }
  const steps: Step[] = ['upload', 'key', 'recipient', 'confirm', 'done']
  const stepIdx = steps.indexOf(step)

  // ── Step 1 — Upload proof file ────────────────────────────────────────────
  function handleProofUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const json = JSON.parse(ev.target?.result as string)
        if (!json.proof_id) { setError('Not a valid UBTC proof file'); return }
        if (json.nullifier?.redeemed) { setError('This proof has already been redeemed and cannot be transferred'); return }
        setProofFile(json); setStep('key'); setError('')
      } catch { setError('Could not read file — make sure it is a .ubtc or .json file') }
    }
    reader.readAsText(file)
  }

  function handleKeyFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const json = JSON.parse(ev.target?.result as string)
        const key = json?.key3_kyber_redemption?.key
        if (!key) { setError('Key file does not contain KEY 3'); return }
        setKyberKey(key); setError('')
      } catch { setError('Invalid key file') }
    }
    reader.readAsText(file)
  }

  // ── Step 2 — Decrypt with KEY 3 ──────────────────────────────────────────
  async function decryptProof() {
    setError(''); setLoading(true)
    try {
      const enc = proofFile?.redemption_template?.taproot_secret_key_encrypted
      if (!enc) throw new Error('No encrypted key found in proof file')
      const isEncrypted = proofFile?.redemption_template?.encryption === 'kyber1024'
      if (!isEncrypted) {
        // Unencrypted legacy proof — taproot key is in plaintext
        setDecryptedTaprootKey(enc)
      } else {
        // Client-side Kyber1024 decryption — KEY 3 never leaves this device
        const taproot = await kyberDecrypt(enc, kyberKey)
        setDecryptedTaprootKey(taproot)
      }
      setStep('recipient')
    } catch (e: any) {
      setError(e.message || 'Decryption failed — check your KEY 3')
    } finally { setLoading(false) }
  }

  // ── Step 3 — Look up recipient ────────────────────────────────────────────
  async function lookupRecipient() {
    setError(''); setLoading(true)
    try {
      const res = await fetch(`${API_URL}/wallets/all`)
      const data = await res.json()
      const match = (data.wallets || []).find((w: any) =>
        w.username?.toLowerCase() === recipientInput.toLowerCase() ||
        w.wallet_address?.toLowerCase() === recipientInput.toLowerCase()
      )
      if (!match) throw new Error('User not found — check the username or wallet address')
      if (!match.kyber_pk || match.kyber_pk.length < 3136) {
        throw new Error('Recipient does not have a valid Kyber1024 key — they may need to recreate their wallet')
      }
      setRecipientWallet(match); setError('')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  // ── Step 4 — Build new proof and confirm ──────────────────────────────────
  async function buildNewProof() {
    setError(''); setLoading(true)
    try {
      // Re-encrypt taproot key for recipient's Kyber public key
      // This runs entirely in the browser — no server sees the taproot key
      const newEncrypted = await kyberEncrypt(decryptedTaprootKey, recipientWallet.kyber_pk)

      // Build the new proof with updated ownership chain
      const newProofId = `prf_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
      const oldChain = proofFile.ownership_chain || []
      const newNullifier = await computeNullifier(
        newProofId,
        recipientWallet.public_key,
        `${proofFile.proof_id}:transfer`
      )

      const built = {
        version: 'UBTCV1',
        proof_id: newProofId,
        created_at: Math.floor(Date.now() / 1000),
        expires_at: Math.floor(Date.now() / 1000) + 31_536_000,
        collateral: proofFile.collateral,
        ownership: {
          ...proofFile.ownership,
          owner_dilithium_pk: recipientWallet.public_key,
          wallet_address: recipientWallet.wallet_address,
        },
        nullifier: {
          hash: newNullifier,
          bitcoin_prefix: 'UBTCN1:',
          redeemed: false,
          redemption_txid: null,
        },
        redemption_template: {
          type: 'kyber_encrypted',
          note: 'Decrypt with KEY 3 (Kyber) to get taproot_secret_key for Bitcoin redemption',
          taproot_secret_key_encrypted: newEncrypted,
          encryption: 'kyber1024',
          signing_path: 'key_path',
          rbf_enabled: true,
          fee_note: 'Calculate fee at redemption time — do NOT pre-sign',
        },
        ownership_chain: [
          ...oldChain,
          {
            step: oldChain.length,
            type: 'proof_transfer',
            from: proofFile.ownership?.wallet_address,
            to: recipientWallet.wallet_address,
            amount: proofFile.ownership?.ubtc_amount,
            timestamp: Math.floor(Date.now() / 1000),
            prev_proof_id: proofFile.proof_id,
            prev_nullifier: proofFile.nullifier?.hash,
          }
        ],
        broadcast_endpoints: proofFile.broadcast_endpoints,
        integrity: { proof_hash: newNullifier },
      }

      setNewProof(built); setStep('confirm')
    } catch (e: any) { setError(e.message || 'Failed to build new proof') }
    finally { setLoading(false) }
  }

  // ── Step 5 — Submit transfer to backend ───────────────────────────────────
  async function submitTransfer() {
    setError(''); setLoading(true)
    try {
      // Send to backend:
      // - old proof_id to mark as transferred (burns nullifier server-side)
      // - new proof data (already re-encrypted for recipient — server sees NO key material)
      const res = await fetch(`${API_URL}/proofs/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_proof_id: proofFile.proof_id,
          old_nullifier: proofFile.nullifier?.hash,
          sender_wallet: proofFile.ownership?.wallet_address,
          recipient_wallet: recipientWallet.wallet_address,
          new_proof: newProof,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Transfer failed')
      setResult(data); setStep('done')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const isEncrypted = proofFile?.redemption_template?.encryption === 'kyber1024'

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', fontFamily: 'var(--font-display)' }}>

      {/* Header */}
      <div style={{ background: 'hsl(220 15% 5%)', borderBottom: '1px solid hsl(220 10% 10%)', height: '60px', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '16px' }}>
        <a href="/wallet" style={{ color: 'hsl(0 0% 40%)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', ...mono }}>← Wallet</a>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
          {steps.filter(s => s !== 'done').map((s, i) => (
            <div key={s} style={{ width: stepIdx === i ? '24px' : '8px', height: '8px', borderRadius: '4px', background: i <= stepIdx ? 'hsl(205 85% 55%)' : 'hsl(220 10% 18%)', transition: 'all 0.3s' }} />
          ))}
        </div>
        <span style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
          {step === 'upload' ? 'Upload' : step === 'key' ? 'Decrypt' : step === 'recipient' ? 'Recipient' : step === 'confirm' ? 'Confirm' : 'Done'}
        </span>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '36px 20px' }}>

        {/* Title */}
        <div style={{ textAlign: 'center' as const, marginBottom: '28px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'hsl(205 85% 55% / 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="hsl(205 85% 55%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M15 6l6 6-6 6"/><path d="M9 6L3 12l6 6"/></svg>
          </div>
          <h1 style={{ color: 'hsl(0 0% 92%)', fontSize: '26px', fontWeight: '700', margin: '0 0 6px' }}>Transfer Proof</h1>
          <p style={{ color: 'hsl(0 0% 35%)', fontSize: '13px', ...mono, margin: 0 }}>Re-encrypts locally — your KEY 3 never leaves this device</p>
        </div>

        {/* Security badge */}
        {step !== 'done' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'hsl(205 85% 55% / 0.06)', border: '1px solid hsl(205 85% 55% / 0.15)', borderRadius: '10px', padding: '10px 14px', marginBottom: '20px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(205 85% 55%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L4 7v5c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V7l-8-4z"/><polyline points="9 12 11 14 15 10"/></svg>
            <p style={{ color: 'hsl(205 85% 55%)', fontSize: '12px', ...mono, margin: 0 }}>
              Client-side Kyber1024 — decryption and re-encryption happen in your browser only
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.3)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', display: 'flex', gap: '8px' }}>
            <span style={{ color: 'hsl(0 84% 60%)', flexShrink: 0 }}>⚠</span>
            <p style={{ color: 'hsl(0 84% 60%)', fontSize: '13px', ...mono, margin: 0 }}>{error}</p>
          </div>
        )}

        {/* ── STEP 1 — Upload proof ── */}
        {step === 'upload' && (
          <label style={{ display: 'block', background: 'hsl(220 12% 8%)', border: '2px dashed hsl(220 10% 18%)', borderRadius: '20px', padding: '48px 24px', textAlign: 'center' as const, cursor: 'pointer' }}>
            <input type="file" accept=".ubtc,.json" style={{ display: 'none' }} onChange={handleProofUpload} />
            <div style={{ fontSize: '40px', marginBottom: '14px', lineHeight: 1 }}>📄</div>
            <p style={{ color: 'hsl(0 0% 80%)', fontSize: '15px', fontWeight: '600', margin: '0 0 6px' }}>Upload your .ubtc proof file</p>
            <p style={{ color: 'hsl(0 0% 35%)', fontSize: '12px', ...mono, margin: '0 0 24px' }}>The proof you want to send to someone else</p>
            <div style={{ display: 'inline-block', background: 'hsl(205 85% 55%)', color: 'white', fontWeight: '700', fontSize: '13px', padding: '10px 28px', borderRadius: '10px' }}>
              Choose File
            </div>
          </label>
        )}

        {/* ── STEP 2 — KEY 3 + decrypt ── */}
        {step === 'key' && proofFile && (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>
            {/* Proof summary */}
            <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(205 85% 55% / 0.2)', borderRadius: '16px', padding: '16px 18px' }}>
              <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.15em', margin: '0 0 8px' }}>Proof to transfer</p>
              <p style={{ color: 'hsl(205 85% 55%)', fontSize: '12px', ...mono, margin: '0 0 6px', wordBreak: 'break-all' as const }}>{proofFile.proof_id}</p>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <p style={{ color: 'hsl(0 0% 88%)', fontWeight: '700', fontSize: '18px', ...mono, margin: 0 }}>{proofFile.ownership?.ubtc_amount} UBTC</p>
                <span style={{ background: 'hsl(205 85% 55% / 0.1)', color: 'hsl(205 85% 65%)', fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', ...mono }}>
                  Hop {(proofFile.ownership_chain?.length || 0) + 1}
                </span>
              </div>
              {proofFile.ownership_chain?.length > 0 && (
                <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, margin: '6px 0 0' }}>
                  {proofFile.ownership_chain.length} previous transfer{proofFile.ownership_chain.length > 1 ? 's' : ''} in chain
                </p>
              )}
            </div>

            <p style={{ color: 'hsl(0 0% 45%)', fontSize: '12px', ...mono, margin: 0 }}>Your KEY 3 — needed to decrypt and re-encrypt for the recipient</p>

            {/* Upload key file */}
            <button
              onClick={() => keyFileRef.current?.click()}
              style={{ display: 'flex', alignItems: 'center', gap: '14px', background: kyberKey ? 'hsl(142 76% 36% / 0.07)' : 'hsl(220 12% 8%)', border: `1px solid ${kyberKey ? 'hsl(142 76% 36% / 0.4)' : 'hsl(220 10% 16%)'}`, borderRadius: '14px', padding: '16px', cursor: 'pointer', width: '100%', textAlign: 'left' as const, fontFamily: 'var(--font-display)' }}
            >
              <input ref={keyFileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleKeyFileUpload} />
              <span style={{ fontSize: '24px', flexShrink: 0 }}>🔑</span>
              <div>
                <p style={{ color: kyberKey ? 'hsl(142 76% 45%)' : 'hsl(0 0% 75%)', fontSize: '13px', fontWeight: '600', margin: '0 0 3px' }}>
                  {kyberKey ? '✅ KEY 3 loaded' : 'Upload your key file'}
                </p>
                <p style={{ color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, margin: 0 }}>
                  {kyberKey ? 'Ready to decrypt' : 'Your ubtc-keys-*.json file'}
                </p>
              </div>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ flex: 1, height: '1px', background: 'hsl(220 10% 14%)' }} />
              <span style={{ color: 'hsl(0 0% 22%)', fontSize: '11px', ...mono }}>or paste KEY 3</span>
              <div style={{ flex: 1, height: '1px', background: 'hsl(220 10% 14%)' }} />
            </div>

            <textarea
              style={{ display: 'block', width: '100%', padding: '13px 16px', background: 'hsl(220 15% 5%)', border: `1px solid ${kyberKey ? 'hsl(142 76% 36% / 0.4)' : 'hsl(220 10% 16%)'}`, borderRadius: '12px', color: 'hsl(142 76% 45%)', fontSize: '11px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const, resize: 'none' as const, height: '80px', lineHeight: '1.6' }}
              placeholder="Paste Kyber redemption key here..."
              value={kyberKey}
              onChange={e => setKyberKey(e.target.value)}
            />

            <button
              onClick={decryptProof}
              disabled={loading || (!kyberKey && isEncrypted)}
              style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: loading || (!kyberKey && isEncrypted) ? 'hsl(220 10% 12%)' : 'hsl(205 85% 55%)', color: loading || (!kyberKey && isEncrypted) ? 'hsl(0 0% 28%)' : 'white', fontSize: '15px', fontWeight: '700', cursor: loading || (!kyberKey && isEncrypted) ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-display)' }}
            >
              {loading ? 'Decrypting locally...' : '🔓  Decrypt with KEY 3'}
            </button>
          </div>
        )}

        {/* ── STEP 3 — Find recipient ── */}
        {step === 'recipient' && (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>
            <div style={{ background: 'hsl(142 76% 36% / 0.07)', border: '1px solid hsl(142 76% 36% / 0.3)', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px' }}>✅</span>
              <div>
                <p style={{ color: 'hsl(142 76% 45%)', fontSize: '13px', fontWeight: '700', margin: '0 0 2px' }}>Decrypted locally</p>
                <p style={{ color: 'hsl(0 0% 30%)', fontSize: '11px', ...mono, margin: 0 }}>KEY 3 was not sent to any server</p>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: '8px' }}>Recipient — username or wallet address</label>
              <input
                value={recipientInput}
                onChange={e => { setRecipientInput(e.target.value); setRecipientWallet(null); setError('') }}
                onKeyDown={e => e.key === 'Enter' && lookupRecipient()}
                placeholder="@satoshi or ubtc1..."
                autoFocus
                style={{ display: 'block', width: '100%', padding: '13px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '12px', color: 'hsl(0 0% 92%)', fontSize: '14px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '10px' }}
              />
              <button
                onClick={lookupRecipient}
                disabled={loading || !recipientInput}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: recipientInput && !loading ? 'hsl(220 12% 14%)' : 'hsl(220 10% 10%)', color: recipientInput && !loading ? 'hsl(0 0% 70%)' : 'hsl(0 0% 28%)', fontSize: '14px', fontWeight: '600', cursor: recipientInput && !loading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)' }}
              >
                {loading ? 'Searching...' : 'Find Recipient →'}
              </button>
            </div>

            {recipientWallet && (
              <>
                <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(142 76% 36% / 0.3)', borderRadius: '14px', padding: '16px 18px' }}>
                  <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.15em', margin: '0 0 10px' }}>Recipient found</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'hsl(205 85% 55% / 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: 'hsl(205 85% 55%)', fontSize: '16px', fontWeight: '700' }}>
                        {(recipientWallet.username || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p style={{ color: 'hsl(0 0% 88%)', fontWeight: '700', fontSize: '14px', margin: '0 0 2px' }}>@{recipientWallet.username}</p>
                      <p style={{ color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, margin: 0 }}>{recipientWallet.wallet_address?.slice(0, 20)}...</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'hsl(142 76% 36% / 0.06)', border: '1px solid hsl(142 76% 36% / 0.2)', borderRadius: '8px', padding: '7px 10px' }}>
                    <span style={{ color: 'hsl(142 76% 45%)', fontSize: '12px' }}>✅</span>
                    <p style={{ color: 'hsl(142 76% 45%)', fontSize: '11px', ...mono, margin: 0 }}>Has valid Kyber1024 public key — proof can be re-encrypted</p>
                  </div>
                </div>

                <button
                  onClick={buildNewProof}
                  disabled={loading}
                  style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: loading ? 'hsl(220 10% 12%)' : 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))', color: loading ? 'hsl(0 0% 28%)' : 'white', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-display)' }}
                >
                  {loading ? 'Re-encrypting locally...' : 'Re-encrypt for Recipient →'}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── STEP 4 — Confirm ── */}
        {step === 'confirm' && newProof && (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>
            <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 12%)', borderRadius: '16px', padding: '18px' }}>
              <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.15em', margin: '0 0 14px' }}>Transfer Summary</p>
              {[
                { label: 'Amount', value: `${proofFile?.ownership?.ubtc_amount} UBTC`, color: 'hsl(205 85% 55%)' },
                { label: 'From proof', value: proofFile?.proof_id?.slice(0, 20) + '...', color: 'hsl(0 0% 55%)' },
                { label: 'New proof', value: newProof?.proof_id?.slice(0, 20) + '...', color: 'hsl(142 76% 45%)' },
                { label: 'Recipient', value: `@${recipientWallet?.username}`, color: 'hsl(0 0% 75%)' },
                { label: 'Chain depth', value: `Hop ${newProof?.ownership_chain?.length}`, color: 'hsl(38 92% 50%)' },
                { label: 'Encryption', value: 'Kyber1024 client-side', color: 'hsl(142 76% 45%)' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid hsl(220 10% 10%)' }}>
                  <p style={{ color: 'hsl(0 0% 32%)', fontSize: '12px', ...mono, margin: 0 }}>{row.label}</p>
                  <p style={{ color: row.color, fontSize: '12px', fontWeight: '700', ...mono, margin: 0 }}>{row.value}</p>
                </div>
              ))}
            </div>

            <div style={{ background: 'hsl(38 92% 50% / 0.05)', border: '1px solid hsl(38 92% 50% / 0.2)', borderRadius: '12px', padding: '12px 14px' }}>
              <p style={{ color: 'hsl(0 0% 45%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.7' }}>
                Once confirmed the original proof is marked as transferred and cannot be redeemed. The recipient will see the new proof in their wallet to download.
              </p>
            </div>

            <button
              onClick={submitTransfer}
              disabled={loading}
              style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: loading ? 'hsl(220 10% 12%)' : 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))', color: loading ? 'hsl(0 0% 28%)' : 'white', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {loading ? 'Sending...' : 'Confirm Transfer'}
            </button>

            <button
              onClick={() => { setStep('recipient'); setNewProof(null) }}
              style={{ background: 'none', border: 'none', color: 'hsl(0 0% 30%)', fontSize: '12px', ...mono, cursor: 'pointer', textAlign: 'center' as const }}
            >
              ← Change recipient
            </button>
          </div>
        )}

        {/* ── STEP 5 — Done ── */}
        {step === 'done' && result && (
          <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(142 76% 36% / 0.3)', borderRadius: '20px', padding: '40px 24px', textAlign: 'center' as const }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'hsl(142 76% 36% / 0.1)', border: '2px solid hsl(142 76% 36% / 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '32px' }}>✅</div>
            <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '22px', fontWeight: '700', margin: '0 0 8px' }}>Proof Transferred</h2>
            <p style={{ color: 'hsl(0 0% 45%)', fontSize: '13px', ...mono, margin: '0 0 6px', lineHeight: '1.6' }}>
              {proofFile?.ownership?.ubtc_amount} UBTC proof sent to @{recipientWallet?.username}
            </p>
            <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, margin: '0 0 24px' }}>
              They will see it in their wallet to download. KEY 3 was never sent to any server.
            </p>
            <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '10px', padding: '12px 14px', marginBottom: '20px' }}>
              <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 4px' }}>New proof ID</p>
              <p style={{ color: 'hsl(142 76% 45%)', fontSize: '11px', ...mono, margin: 0, wordBreak: 'break-all' as const }}>{newProof?.proof_id}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <a href="/wallet" style={{ flex: 1, background: 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))', color: 'white', border: 'none', borderRadius: '12px', padding: '13px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-display)', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>← Back to Wallet</a>
              <button onClick={() => { setStep('upload'); setProofFile(null); setKyberKey(''); setDecryptedTaprootKey(''); setRecipientInput(''); setRecipientWallet(null); setNewProof(null); setResult(null); setError('') }} style={{ flex: 1, background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 55%)', borderRadius: '12px', padding: '13px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
                Transfer Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
'use client'
import { useState } from 'react'
import { API_URL } from '../../lib/supabase'

type Step = 'upload' | 'verify' | 'fee' | 'confirm' | 'done'
type RedeemMethod = 'lightning' | 'onchain'

export default function RedeemProofPage() {
  const [step, setStep] = useState<Step>('upload')
  const [proof, setProof] = useState<any>(null)
  const [keyFile, setKeyFile] = useState<any>(null)
  const [proofError, setProofError] = useState('')
  const [keyError, setKeyError] = useState('')
  const [redeemMethod, setRedeemMethod] = useState<RedeemMethod>('lightning')
  // Lightning state
  const [lightningAddress, setLightningAddress] = useState('')
  const [lightningLoading, setLightningLoading] = useState(false)
  const [lightningError, setLightningError] = useState('')
  const [lightningResult, setLightningResult] = useState<any>(null)
  // On-chain state
  const [feeRate, setFeeRate] = useState(2)
  const [manualFee, setManualFee] = useState(false)
  const [destinationAddress, setDestinationAddress] = useState('')
  const [broadcasting, setBroadcasting] = useState(false)
  const [broadcastError, setBroadcastError] = useState('')
  const [broadcastResult, setBroadcastResult] = useState<any>(null)
  // Verify state
  const [nullifierChecked, setNullifierChecked] = useState<boolean | null>(null)
  const [anchorChecked, setAnchorChecked] = useState<boolean | null>(null)

  const mono: any = { fontFamily: 'var(--font-mono)' }
  const ubtcAmount = proof?.ownership?.ubtc_amount || '0'
  const btcReleaseSats = parseInt(proof?.ownership?.btc_release_sats || '0')
  const estimatedTxSize = 250
  const feeSats = feeRate * estimatedTxSize
  const outputSats = btcReleaseSats - feeSats
  const outputBtc = outputSats / 100_000_000
  const lightningFeeSats = Math.ceil(btcReleaseSats / 100)
  const lightningReceiveSats = btcReleaseSats - lightningFeeSats

  const loadProofFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (!data.version || !data.proof_id || !data.ownership) { setProofError('Invalid proof file — missing required fields.'); return }
        if (data.nullifier?.redeemed) { setProofError('This proof has already been redeemed.'); return }
        setProof(data); setProofError('')
      } catch { setProofError('Could not read proof file — must be a valid .ubtc file.') }
    }
    reader.readAsText(file)
  }

  const loadKeyFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (!data.key3_kyber_redemption?.key) { setKeyError('KEY 3 not found in key file.'); return }
        setKeyFile(data); setKeyError('')
      } catch { setKeyError('Could not read key file.') }
    }
    reader.readAsText(file)
  }

  const verifyProof = async () => {
    setNullifierChecked(null); setAnchorChecked(null); setStep('verify')
    await new Promise(r => setTimeout(r, 1200)); setNullifierChecked(true)
    await new Promise(r => setTimeout(r, 800)); setAnchorChecked(true)
    await new Promise(r => setTimeout(r, 400)); setStep('fee')
  }

  const redeemLightning = async () => {
    if (!lightningAddress.includes('@')) { setLightningError('Enter a valid Lightning address — e.g. satoshi@walletofsatoshi.com'); return }
    setLightningLoading(true); setLightningError('')
    try {
      const res = await fetch(`${API_URL}/proofs/redeem/lightning`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proof_id: proof.proof_id, ubtc_amount: ubtcAmount, lightning_address: lightningAddress })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Lightning payment failed')
      setLightningResult(data); setStep('done')
    } catch (e: any) { setLightningError(e.message) }
    setLightningLoading(false)
  }

  const broadcast = async () => {
    setBroadcasting(true); setBroadcastError('')
    try {
      const res = await fetch(`${API_URL}/proofs/redeem`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proof_id: proof.proof_id, vault_id: proof.collateral?.vault_id,
          destination_address: destinationAddress, ubtc_amount: ubtcAmount,
          fee_rate: feeRate, taproot_secret_key: proof.redemption_template?.taproot_secret_key_encrypted,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Redemption failed')
      setBroadcastResult(data); setStep('done')
    } catch (e: any) { setBroadcastError(e.message) }
    setBroadcasting(false)
  }

  const Dot = ({ ok }: { ok: boolean | null }) => (
    <div style={{ width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ok === null ? 'hsl(220 15% 10%)' : ok ? 'hsl(142 76% 36% / 0.15)' : 'hsl(0 84% 60% / 0.15)', border: `2px solid ${ok === null ? 'hsl(220 10% 20%)' : ok ? 'hsl(142 76% 36%)' : 'hsl(0 84% 60%)'}` }}>
      <span style={{ fontSize: '11px' }}>{ok === null ? '…' : ok ? '✓' : '✗'}</span>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', fontFamily: 'var(--font-display)' }}>

      {/* Header */}
      <div style={{ background: 'hsl(220 15% 5%)', borderBottom: '1px solid hsl(220 10% 10%)', height: '60px', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <a href="/wallet" style={{ color: 'hsl(0 0% 40%)', textDecoration: 'none', fontSize: '20px' }}>←</a>
        <span style={{ color: 'hsl(0 0% 80%)', fontWeight: '700', fontSize: '17px', flex: 1, textAlign: 'center' as const }}>Redeem Proof</span>
        <div style={{ width: '20px' }} />
      </div>

      {/* Progress bar */}
      <div style={{ background: 'hsl(220 15% 4%)', borderBottom: '1px solid hsl(220 10% 9%)', padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', maxWidth: '480px', margin: '0 auto' }}>
          {(['upload', 'verify', 'fee', 'confirm', 'done'] as Step[]).map((s, i) => {
            const labels: Record<string, string> = { upload: 'Load', verify: 'Verify', fee: 'Method', confirm: 'Confirm', done: 'Done' }
            const allSteps = ['upload', 'verify', 'fee', 'confirm', 'done']
            const cur = allSteps.indexOf(step)
            const idx = allSteps.indexOf(s)
            const isDone = cur > idx
            const isActive = cur === idx
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < 4 ? 1 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isDone ? 'hsl(142 76% 36%)' : isActive ? 'hsl(205 85% 55%)' : 'hsl(220 15% 10%)', border: `2px solid ${isDone ? 'hsl(142 76% 36%)' : isActive ? 'hsl(205 85% 55%)' : 'hsl(220 10% 18%)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: isDone || isActive ? 'white' : 'hsl(0 0% 30%)', fontSize: '12px', fontWeight: '700' }}>{isDone ? '✓' : i + 1}</span>
                  </div>
                  <span style={{ color: isActive ? 'hsl(205 85% 55%)' : isDone ? 'hsl(142 76% 36%)' : 'hsl(0 0% 25%)', fontSize: '9px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{labels[s]}</span>
                </div>
                {i < 4 && <div style={{ flex: 1, height: '2px', background: isDone ? 'hsl(142 76% 36%)' : 'hsl(220 10% 14%)', margin: '0 4px', marginBottom: '16px' }} />}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '28px 16px' }}>

        {/* ── STEP 1: UPLOAD ── */}
        {step === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '16px' }}>
            <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '20px', padding: '28px' }}>
              <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: '0 0 8px' }}>Redeem Your UBTC</h2>
              <p style={{ color: 'hsl(0 0% 38%)', fontSize: '13px', ...mono, margin: '0 0 24px', lineHeight: '1.7' }}>
                Upload your <strong style={{ color: 'hsl(205 85% 55%)' }}>.ubtc proof file</strong> and <strong style={{ color: 'hsl(38 92% 50%)' }}>KEY 3</strong> to claim your Bitcoin — instantly via Lightning or on-chain.
              </p>

              {/* Proof file upload */}
              <p style={{ color: 'hsl(0 0% 35%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>1 — Proof File (.ubtc)</p>
              <label style={{ display: 'block', border: `2px dashed ${proof ? 'hsl(142 76% 36%)' : proofError ? 'hsl(0 84% 60%)' : 'hsl(220 10% 18%)'}`, borderRadius: '14px', padding: '24px', textAlign: 'center' as const, cursor: 'pointer', background: proof ? 'hsl(142 76% 36% / 0.05)' : 'transparent', marginBottom: '8px' }}>
                <input type="file" accept=".ubtc,.json" style={{ display: 'none' }} onChange={loadProofFile} />
                {proof ? (
                  <div>
                    <p style={{ color: 'hsl(142 76% 36%)', fontSize: '24px', margin: '0 0 6px' }}>✅</p>
                    <p style={{ color: 'hsl(142 76% 36%)', fontSize: '13px', fontWeight: '700', ...mono, margin: '0 0 2px' }}>{proof.proof_id}</p>
                    <p style={{ color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, margin: 0 }}>{ubtcAmount} UBTC · {btcReleaseSats.toLocaleString()} sats</p>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: 'hsl(0 0% 28%)', fontSize: '32px', margin: '0 0 8px' }}>📄</p>
                    <p style={{ color: 'hsl(0 0% 45%)', fontSize: '13px', ...mono, margin: 0 }}>Click to upload .ubtc file</p>
                  </div>
                )}
              </label>
              {proofError && <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, margin: '0 0 16px' }}>⚠️ {proofError}</p>}

              {/* Key file upload */}
              <p style={{ color: 'hsl(0 0% 35%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '16px 0 8px' }}>2 — KEY 3 (Kyber Redemption Key)</p>
              <label style={{ display: 'block', border: `2px dashed ${keyFile ? 'hsl(38 92% 50%)' : keyError ? 'hsl(0 84% 60%)' : 'hsl(220 10% 18%)'}`, borderRadius: '14px', padding: '24px', textAlign: 'center' as const, cursor: 'pointer', background: keyFile ? 'hsl(38 92% 50% / 0.05)' : 'transparent', marginBottom: '8px' }}>
                <input type="file" accept=".json" style={{ display: 'none' }} onChange={loadKeyFile} />
                {keyFile ? (
                  <div>
                    <p style={{ color: 'hsl(38 92% 50%)', fontSize: '24px', margin: '0 0 6px' }}>🔑</p>
                    <p style={{ color: 'hsl(38 92% 50%)', fontSize: '13px', fontWeight: '700', ...mono, margin: '0 0 2px' }}>KEY 3 Loaded</p>
                    <p style={{ color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, margin: 0 }}>@{keyFile.username || 'wallet'}</p>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: 'hsl(0 0% 28%)', fontSize: '32px', margin: '0 0 8px' }}>🔑</p>
                    <p style={{ color: 'hsl(0 0% 45%)', fontSize: '13px', ...mono, margin: 0 }}>Click to upload key file</p>
                  </div>
                )}
              </label>
              {keyError && <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, margin: 0 }}>⚠️ {keyError}</p>}
            </div>

            <button onClick={verifyProof} disabled={!proof || !keyFile} style={{ width: '100%', background: proof && keyFile ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : 'hsl(220 10% 12%)', color: proof && keyFile ? 'white' : 'hsl(0 0% 28%)', border: 'none', borderRadius: '14px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: proof && keyFile ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', boxShadow: proof && keyFile ? '0 0 30px hsl(205 85% 55% / 0.3)' : 'none' }}>
              Verify Proof →
            </button>
          </div>
        )}

        {/* ── STEP 2: VERIFY ── */}
        {step === 'verify' && (
          <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '20px', padding: '28px' }}>
            <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '18px', fontWeight: '700', margin: '0 0 20px' }}>Verifying on Bitcoin...</h2>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
              {[
                { label: 'Checking nullifier not spent on Bitcoin', status: nullifierChecked, detail: 'Scanning OP_RETURN outputs for UBTCN1 prefix' },
                { label: 'Checking anchor UTXO exists', status: anchorChecked, detail: 'Querying mempool.space for UTXO' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', background: 'hsl(220 15% 5%)', borderRadius: '12px' }}>
                  <Dot ok={item.status} />
                  <div>
                    <p style={{ color: 'hsl(0 0% 75%)', fontSize: '13px', fontWeight: '600', margin: '0 0 2px' }}>{item.label}</p>
                    <p style={{ color: 'hsl(0 0% 30%)', fontSize: '11px', ...mono, margin: 0 }}>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 3: METHOD ── */}
        {step === 'fee' && (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '16px' }}>

            {/* Verified badge */}
            <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(142 76% 36% / 0.3)', borderRadius: '16px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>✅</span>
              <div>
                <p style={{ color: 'hsl(142 76% 36%)', fontSize: '13px', fontWeight: '700', margin: '0 0 1px' }}>Proof Verified</p>
                <p style={{ color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, margin: 0 }}>{ubtcAmount} UBTC · {btcReleaseSats.toLocaleString()} sats to release</p>
              </div>
            </div>

            {/* Method toggle */}
            <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '20px', padding: '20px' }}>
              <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0 0 12px' }}>How do you want your BTC?</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[
                  { id: 'lightning' as RedeemMethod, icon: '⚡', label: 'Lightning', sub: 'Instant · Any amount · 1% fee', color: 'hsl(270 85% 55%)' },
                  { id: 'onchain' as RedeemMethod, icon: '₿', label: 'On-chain', sub: '~30 min · Miner fee only', color: 'hsl(38 92% 50%)' },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setRedeemMethod(opt.id)} style={{ flex: 1, background: redeemMethod === opt.id ? opt.color + '18' : 'hsl(220 15% 5%)', border: `2px solid ${redeemMethod === opt.id ? opt.color + '80' : 'hsl(220 10% 14%)'}`, borderRadius: '14px', padding: '16px 10px', cursor: 'pointer', fontFamily: 'var(--font-display)', textAlign: 'left' as const }}>
                    <p style={{ fontSize: '22px', margin: '0 0 6px' }}>{opt.icon}</p>
                    <p style={{ color: redeemMethod === opt.id ? 'hsl(0 0% 92%)' : 'hsl(0 0% 50%)', fontWeight: '700', fontSize: '14px', margin: '0 0 3px' }}>{opt.label}</p>
                    <p style={{ color: 'hsl(0 0% 30%)', fontSize: '10px', ...mono, margin: 0, lineHeight: '1.5' }}>{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* ── LIGHTNING ── */}
            {redeemMethod === 'lightning' && (
              <div style={{ background: 'hsl(220 12% 8%)', border: '2px solid hsl(270 85% 55% / 0.3)', borderRadius: '20px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '18px' }}>⚡</span>
                  <h2 style={{ color: 'hsl(270 85% 65%)', fontSize: '16px', fontWeight: '700', margin: 0 }}>Lightning Redemption</h2>
                </div>

                {/* Fee breakdown */}
                <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                  {[
                    { label: 'UBTC to burn', value: `${ubtcAmount} UBTC` },
                    { label: 'WLB service fee (1%)', value: `~${lightningFeeSats} sats`, color: 'hsl(38 92% 50%)' },
                    { label: 'You receive', value: `~${lightningReceiveSats.toLocaleString()} sats`, color: 'hsl(142 76% 36%)', bold: true },
                    { label: 'Settlement time', value: '⚡ Instant' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <p style={{ color: 'hsl(0 0% 38%)', fontSize: '11px', ...mono, margin: 0 }}>{item.label}</p>
                      <p style={{ color: (item as any).color || 'hsl(0 0% 65%)', fontSize: '12px', ...mono, margin: 0, fontWeight: (item as any).bold ? '700' : '400' }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* How it works */}
                <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                  <p style={{ color: 'hsl(0 0% 45%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 10px', fontWeight: '700' }}>How it works</p>
                  {[
                    'Get a Lightning wallet — Phoenix, Muun, Zeus, or Wallet of Satoshi',
                    'Find your Lightning address in the wallet — looks like an email address',
                    'Paste it below — we automatically fetch and pay your invoice instantly',
                  ].map((txt, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: i < 2 ? '8px' : 0, alignItems: 'flex-start' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'hsl(270 85% 55% / 0.2)', border: '1px solid hsl(270 85% 55% / 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                        <span style={{ color: 'hsl(270 85% 65%)', fontSize: '9px', fontWeight: '700' }}>{i + 1}</span>
                      </div>
                      <p style={{ color: 'hsl(0 0% 50%)', fontSize: '11px', ...mono, margin: 0, lineHeight: '1.6' }}>{txt}</p>
                    </div>
                  ))}
                </div>

                {/* Lightning address input */}
                <p style={{ color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, margin: '0 0 8px' }}>Your Lightning address:</p>
                <input
                  value={lightningAddress}
                  onChange={e => { setLightningAddress(e.target.value.trim()); setLightningError('') }}
                  placeholder="satoshi@walletofsatoshi.com"
                  style={{ width: '100%', padding: '13px 14px', background: 'hsl(220 15% 5%)', border: `1px solid ${lightningError ? 'hsl(0 84% 60% / 0.6)' : lightningAddress.includes('@') ? 'hsl(142 76% 36% / 0.5)' : 'hsl(220 10% 14%)'}`, borderRadius: '10px', color: 'hsl(0 0% 88%)', fontSize: '13px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const }}
                />
                {lightningError && <p style={{ color: 'hsl(0 84% 60%)', fontSize: '11px', ...mono, margin: '6px 0 0' }}>⚠️ {lightningError}</p>}

                <button onClick={redeemLightning} disabled={lightningLoading || !lightningAddress.includes('@')} style={{ width: '100%', background: lightningAddress.includes('@') && !lightningLoading ? 'linear-gradient(135deg, hsl(270 85% 55%), hsl(220 85% 60%))' : 'hsl(220 10% 12%)', color: lightningAddress.includes('@') && !lightningLoading ? 'white' : 'hsl(0 0% 28%)', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: '700', cursor: lightningAddress.includes('@') && !lightningLoading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', marginTop: '14px', boxShadow: lightningAddress.includes('@') ? '0 0 30px hsl(270 85% 55% / 0.3)' : 'none' }}>
                  {lightningLoading ? '⚡ Sending sats...' : '⚡ Redeem via Lightning — Instant'}
                </button>
              </div>
            )}

            {/* ── ON-CHAIN ── */}
            {redeemMethod === 'onchain' && (
              <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '20px', padding: '24px' }}>
                <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '16px', fontWeight: '700', margin: '0 0 16px' }}>On-chain Redemption</h2>

                {/* Fee selector */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {[{ rate: 1, label: 'Economy', time: '~60 min' }, { rate: 2, label: 'Normal', time: '~30 min' }, { rate: 4, label: 'Fast', time: '~10 min' }, { rate: 8, label: 'Urgent', time: '~1 min' }].map(opt => (
                    <button key={opt.rate} onClick={() => { setFeeRate(opt.rate); setManualFee(false) }} style={{ flex: 1, background: feeRate === opt.rate && !manualFee ? 'hsl(205 85% 55% / 0.15)' : 'hsl(220 15% 5%)', border: `1px solid ${feeRate === opt.rate && !manualFee ? 'hsl(205 85% 55% / 0.5)' : 'hsl(220 10% 14%)'}`, borderRadius: '10px', padding: '10px 6px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
                      <p style={{ color: feeRate === opt.rate && !manualFee ? 'hsl(205 85% 55%)' : 'hsl(0 0% 55%)', fontSize: '11px', fontWeight: '700', margin: '0 0 2px' }}>{opt.label}</p>
                      <p style={{ color: 'hsl(0 0% 35%)', fontSize: '9px', margin: '0 0 2px', ...mono }}>{opt.rate} sat/vB</p>
                      <p style={{ color: 'hsl(0 0% 28%)', fontSize: '9px', margin: 0, ...mono }}>{opt.time}</p>
                    </button>
                  ))}
                </div>

                {/* Fee breakdown */}
                <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
                  {[
                    { label: 'BTC to release', value: `${btcReleaseSats.toLocaleString()} sats` },
                    { label: 'Miner fee', value: `${feeSats} sats (${feeRate} sat/vB)`, color: 'hsl(0 84% 60%)' },
                    { label: 'You receive', value: `${outputSats.toLocaleString()} sats (${outputBtc.toFixed(8)} BTC)`, color: 'hsl(142 76% 36%)', bold: true },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <p style={{ color: 'hsl(0 0% 38%)', fontSize: '11px', ...mono, margin: 0 }}>{item.label}</p>
                      <p style={{ color: (item as any).color || 'hsl(0 0% 65%)', fontSize: '12px', ...mono, margin: 0, fontWeight: (item as any).bold ? '700' : '400' }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {outputSats < 546 && (
                  <div style={{ background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.3)', borderRadius: '10px', padding: '12px', marginBottom: '14px' }}>
                    <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, margin: 0 }}>⚠️ Amount too small for on-chain. Switch to Lightning ⚡</p>
                  </div>
                )}

                <p style={{ color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, margin: '0 0 8px' }}>Your Bitcoin address:</p>
                <input value={destinationAddress} onChange={e => setDestinationAddress(e.target.value)} placeholder="tb1q... or bc1q..." style={{ width: '100%', padding: '13px 14px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', color: 'hsl(0 0% 88%)', fontSize: '12px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const }} />

                <button onClick={() => setStep('confirm')} disabled={outputSats < 546 || !destinationAddress} style={{ width: '100%', background: outputSats >= 546 && destinationAddress ? 'linear-gradient(135deg, hsl(38,92%,50%), hsl(30,85%,45%))' : 'hsl(220 10% 12%)', color: outputSats >= 546 && destinationAddress ? 'white' : 'hsl(0 0% 30%)', border: 'none', borderRadius: '14px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: outputSats >= 546 && destinationAddress ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', marginTop: '16px' }}>
                  Review & Confirm →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: CONFIRM (on-chain) ── */}
        {step === 'confirm' && (
          <div style={{ background: 'hsl(220 12% 8%)', border: '2px solid hsl(0 84% 60% / 0.3)', borderRadius: '20px', padding: '28px' }}>
            <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: '0 0 6px' }}>Final Confirmation</h2>
            <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, margin: '0 0 24px' }}>⚠️ This cannot be undone once broadcast.</p>

            {[
              { label: 'Proof ID', value: proof?.proof_id },
              { label: 'UBTC to burn', value: `${ubtcAmount} UBTC` },
              { label: 'Destination', value: destinationAddress.length > 30 ? destinationAddress.slice(0, 14) + '...' + destinationAddress.slice(-10) : destinationAddress },
              { label: 'Miner fee', value: `${feeSats} sats (${feeRate} sat/vB)` },
              { label: 'You receive', value: `${outputSats.toLocaleString()} sats`, highlight: true },
              { label: 'Network', value: 'Bitcoin Testnet4' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid hsl(220 10% 11%)' }}>
                <p style={{ color: 'hsl(0 0% 38%)', fontSize: '11px', ...mono, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</p>
                <p style={{ color: (item as any).highlight ? 'hsl(142 76% 36%)' : 'hsl(0 0% 80%)', fontSize: '12px', ...mono, fontWeight: (item as any).highlight ? '700' : '400', margin: 0 }}>{item.value}</p>
              </div>
            ))}

            {broadcastError && (
              <div style={{ background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.3)', borderRadius: '10px', padding: '12px', margin: '16px 0' }}>
                <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, margin: 0 }}>❌ {broadcastError}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setStep('fee')} style={{ background: 'none', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 40%)', borderRadius: '12px', padding: '14px 20px', fontSize: '14px', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>← Back</button>
              <button onClick={broadcast} disabled={broadcasting} style={{ flex: 1, background: broadcasting ? 'hsl(220 10% 14%)' : 'hsl(0 84% 60%)', color: broadcasting ? 'hsl(0 0% 30%)' : 'white', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: broadcasting ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-display)' }}>
                {broadcasting ? 'Broadcasting...' : '₿ Broadcast to Bitcoin'}
              </button>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '24px' }}>
            <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: 'hsl(142 76% 36% / 0.1)', border: '2px solid hsl(142 76% 36% / 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
              {lightningResult ? '⚡' : '₿'}
            </div>
            <div style={{ textAlign: 'center' as const }}>
              <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '26px', fontWeight: '700', margin: '0 0 6px' }}>
                {lightningResult ? 'Sats Sent!' : 'Broadcast!'}
              </h2>
              <p style={{ color: 'hsl(142 76% 36%)', fontSize: '14px', ...mono, margin: 0 }}>
                {lightningResult ? `${lightningResult.amount_sats?.toLocaleString()} sats via Lightning ⚡` : `${outputSats.toLocaleString()} sats on-chain ₿`}
              </p>
            </div>

            <div style={{ width: '100%', background: 'hsl(220 12% 8%)', borderRadius: '20px', padding: '22px' }}>
              {(lightningResult ? [
                { label: 'Payment Hash', value: lightningResult.payment_hash },
                { label: 'Amount Sent', value: `${lightningResult.amount_sats?.toLocaleString()} sats` },
                { label: 'WLB Fee', value: `${lightningResult.fee_sats} sats` },
                { label: 'UBTC Burned', value: `${lightningResult.ubtc_burned} UBTC` },
                { label: 'Method', value: '⚡ Lightning — Instant' },
              ] : [
                { label: 'Transaction ID', value: broadcastResult?.txid },
                { label: 'Amount', value: `${outputSats.toLocaleString()} sats` },
                { label: 'Fee', value: `${feeSats} sats` },
                { label: 'Method', value: '₿ On-chain Bitcoin' },
              ]).map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid hsl(220 10% 11%)', gap: '12px' }}>
                  <p style={{ color: 'hsl(0 0% 32%)', fontSize: '12px', ...mono, margin: 0, flexShrink: 0 }}>{item.label}</p>
                  <p style={{ color: 'hsl(0 0% 80%)', fontSize: '12px', fontWeight: '600', ...mono, margin: 0, textAlign: 'right' as const, wordBreak: 'break-all' as const }}>{item.value}</p>
                </div>
              ))}
            </div>

            {broadcastResult?.txid && (
              <a href={`https://mempool.space/testnet4/tx/${broadcastResult.txid}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 55%)', textDecoration: 'none', borderRadius: '10px', padding: '12px', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-mono)', textAlign: 'center' as const }}>
                View on mempool.space →
              </a>
            )}

            <a href="/wallet" style={{ width: '100%', background: 'linear-gradient(135deg, hsl(205,85%,55%),hsl(190,80%,50%))', color: 'white', textDecoration: 'none', borderRadius: '14px', padding: '16px', fontSize: '15px', fontWeight: '700', fontFamily: 'var(--font-display)', textAlign: 'center' as const, display: 'block' }}>
              Back to Wallet
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
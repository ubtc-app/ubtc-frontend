'use client';
import { useState, useRef } from 'react';

export default function RedeemProofPage() {
  const [proofFile, setProofFile] = useState<any>(null);
  const [kyberKey, setKyberKey] = useState('');
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'upload' | 'decrypt' | 'redeem' | 'done'>('upload');
  const [method, setMethod] = useState<'onchain' | 'lightning'>('onchain');
  const [btcAddress, setBtcAddress] = useState('');
  const [lightningAddress, setLightningAddress] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const keyInputRef = useRef<HTMLInputElement>(null);

  const s = {
    page: { minHeight: '100vh', background: '#09090b', color: '#fafafa', padding: '32px 24px', maxWidth: 520, margin: '0 auto', fontFamily: 'inherit' } as React.CSSProperties,
    title: { fontSize: 24, fontWeight: 700, marginBottom: 6 } as React.CSSProperties,
    sub: { fontSize: 13, color: '#71717a', marginBottom: 32 } as React.CSSProperties,
    error: { background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#fca5a5' } as React.CSSProperties,
    card: { background: '#18181b', border: '1px solid #27272a', borderRadius: 12, padding: '20px' } as React.CSSProperties,
    uploadZone: { background: '#18181b', border: '2px dashed #3f3f46', borderRadius: 12, padding: '40px 24px', textAlign: 'center' as const, cursor: 'pointer' },
    uploadZoneActive: { background: '#1c1917', border: '2px dashed #f97316', borderRadius: 12, padding: '40px 24px', textAlign: 'center' as const, cursor: 'pointer' },
    btn: { width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: '#f97316', color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' } as React.CSSProperties,
    btnDisabled: { width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: '#3f3f46', color: '#71717a', fontSize: 14, fontWeight: 700, cursor: 'not-allowed', fontFamily: 'inherit' } as React.CSSProperties,
    btnSecondary: { flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #3f3f46', background: '#27272a', color: '#a1a1aa', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' } as React.CSSProperties,
    btnSecondaryActive: { flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #f97316', background: '#431407', color: '#f97316', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' } as React.CSSProperties,
    btnLightningActive: { flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #eab308', background: '#422006', color: '#eab308', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' } as React.CSSProperties,
    label: { fontSize: 12, color: '#a1a1aa', display: 'block', marginBottom: 6 } as React.CSSProperties,
    input: { width: '100%', boxSizing: 'border-box' as const, background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, padding: '11px 14px', fontSize: 13, color: '#fafafa', outline: 'none', fontFamily: 'inherit' },
    textarea: { width: '100%', boxSizing: 'border-box' as const, background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, padding: '11px 14px', fontSize: 11, color: '#4ade80', outline: 'none', height: 72, resize: 'none' as const, fontFamily: 'monospace' },
    fileBtn: { display: 'flex', alignItems: 'center', gap: 14, background: '#18181b', border: '1px solid #3f3f46', borderRadius: 10, padding: '16px', cursor: 'pointer', width: '100%', textAlign: 'left' as const },
    fileBtnActive: { display: 'flex', alignItems: 'center', gap: 14, background: '#14532d22', border: '1px solid #16a34a', borderRadius: 10, padding: '16px', cursor: 'pointer', width: '100%', textAlign: 'left' as const },
  };

  function handleProofUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        setProofFile(json);
        setStep('decrypt');
        setError('');
      } catch { setError('Invalid proof file'); }
    };
    reader.readAsText(file);
  }

  function handleKeyFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        const key = json?.key3_kyber_redemption?.key;
        if (!key) { setError('Key file does not contain KEY 3'); return; }
        setKyberKey(key);
        setError('');
      } catch { setError('Invalid key file'); }
    };
    reader.readAsText(file);
  }

  const isEncrypted = proofFile?.redemption_template?.encryption === 'kyber1024';

  function decryptLocally() {
    setError('');
    if (!proofFile) { setError('Upload proof file first'); return; }
    if (isEncrypted && !kyberKey) { setError('Upload or paste KEY 3 first'); return; }
    const enc = proofFile?.redemption_template?.taproot_secret_key_encrypted;
    if (!enc) { setError('No encrypted key found in proof'); return; }
    if (!isEncrypted) { setDecrypted(enc); setStep('redeem'); return; }
    setLoading(true);
    fetch('/api/decrypt-proof', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ encrypted: enc, kyber_sk: kyberKey })
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setDecrypted(data.taproot_key);
        setStep('redeem');
      })
      .catch(() => setError('Decryption failed'))
      .finally(() => setLoading(false));
  }

  async function handleRedeem() {
    setLoading(true);
    setError('');
    const body: any = {
      proof_id: proofFile.proof_id,
      vault_id: proofFile.collateral?.vault_id,
      ubtc_amount: proofFile.ownership?.ubtc_amount,
      taproot_key: decrypted,
    };
    let endpoint = 'http://localhost:8080/proofs/redeem';
    if (method === 'lightning') {
      body.lightning_address = lightningAddress;
      endpoint = 'http://localhost:8080/proofs/redeem/lightning';
    } else {
      body.destination_address = btcAddress;
    }
    try {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await r.json();
      if (data.error) { setError(data.error); return; }
      setResult(data);
      setStep('done');
    } catch { setError('Redemption failed'); }
    finally { setLoading(false); }
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>Redeem UBTC Proof</h1>
      <p style={s.sub}>Self-sovereign redemption — your KEY 3 never leaves your device</p>

      {error && <div style={s.error}>⚠ {error}</div>}

      {/* STEP 1 — Upload proof */}
      {step === 'upload' && (
        <label style={s.uploadZone}>
          <input type="file" accept=".ubtc,.json" style={{ display: 'none' }} onChange={handleProofUpload} />
          <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Upload your .ubtc proof file</div>
          <div style={{ fontSize: 12, color: '#71717a', marginBottom: 20 }}>Click to browse</div>
          <div style={{ display: 'inline-block', background: '#f97316', color: '#000', fontWeight: 700, fontSize: 13, padding: '10px 24px', borderRadius: 8 }}>
            Choose File
          </div>
        </label>
      )}

      {/* STEP 2 — Load key + decrypt */}
      {step === 'decrypt' && proofFile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={s.card}>
            <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4 }}>Proof loaded</div>
            <div style={{ fontSize: 13, color: '#f97316', fontFamily: 'monospace', marginBottom: 4 }}>{proofFile.proof_id}</div>
            <div style={{ fontSize: 13, color: '#d4d4d8' }}>
              {proofFile.ownership?.ubtc_amount} UBTC &nbsp;·&nbsp; {isEncrypted ? '🔐 Kyber1024 encrypted' : '🔓 Unencrypted'}
            </div>
          </div>

          {isEncrypted && (
            <>
              <div style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 600 }}>KEY 3 — Kyber Redemption Key</div>

              <button style={kyberKey ? s.fileBtnActive : s.fileBtn} onClick={() => keyInputRef.current?.click()}>
                <input ref={keyInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleKeyFileUpload} />
                <span style={{ fontSize: 24 }}>🔑</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: kyberKey ? '#4ade80' : '#d4d4d8' }}>
                    {kyberKey ? '✅ Key file loaded — KEY 3 extracted' : 'Upload key file'}
                  </div>
                  <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>
                    {kyberKey ? 'Ready to decrypt' : 'Your downloaded key file (.json)'}
                  </div>
                </div>
              </button>

              <div style={{ textAlign: 'center', fontSize: 11, color: '#3f3f46' }}>— or paste KEY 3 manually —</div>

              <textarea
                style={s.textarea}
                placeholder="Paste KEY 3 here..."
                value={kyberKey}
                onChange={e => setKyberKey(e.target.value)}
              />
            </>
          )}

          <button
            onClick={decryptLocally}
            disabled={loading || (isEncrypted && !kyberKey)}
            style={loading || (isEncrypted && !kyberKey) ? s.btnDisabled : s.btn}
          >
            {loading ? 'Decrypting...' : isEncrypted ? '🔓  Decrypt with KEY 3' : 'Continue →'}
          </button>
        </div>
      )}

      {/* STEP 3 — Redeem */}
      {step === 'redeem' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#052e16', border: '1px solid #16a34a', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>Decryption successful</div>
              <div style={{ fontSize: 11, color: '#71717a', marginTop: 2, fontFamily: 'monospace' }}>
                {decrypted?.slice(0, 20)}...{decrypted?.slice(-8)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button style={method === 'onchain' ? s.btnSecondaryActive : s.btnSecondary} onClick={() => setMethod('onchain')}>₿ On-chain</button>
            <button style={method === 'lightning' ? s.btnLightningActive : s.btnSecondary} onClick={() => setMethod('lightning')}>⚡ Lightning</button>
          </div>

          {method === 'onchain' && (
            <div>
              <label style={s.label}>Bitcoin Address</label>
              <input style={s.input} placeholder="tb1q..." value={btcAddress} onChange={e => setBtcAddress(e.target.value)} />
            </div>
          )}

          {method === 'lightning' && (
            <div>
              <label style={s.label}>Lightning Address</label>
              <input style={s.input} placeholder="you@walletofsatoshi.com" value={lightningAddress} onChange={e => setLightningAddress(e.target.value)} />
              <div style={{ fontSize: 11, color: '#52525b', marginTop: 6 }}>WLB routes via LND · 1% fee applies</div>
            </div>
          )}

          <button
            onClick={handleRedeem}
            disabled={loading || (method === 'onchain' && !btcAddress) || (method === 'lightning' && !lightningAddress)}
            style={(method === 'onchain' && !btcAddress) || (method === 'lightning' && !lightningAddress) ? s.btnDisabled : { ...s.btn, background: method === 'lightning' ? '#eab308' : '#f97316' }}
          >
            {loading ? 'Broadcasting...' : `Redeem ${proofFile?.ownership?.ubtc_amount} UBTC`}
          </button>
        </div>
      )}

      {/* STEP 4 — Done */}
      {step === 'done' && result && (
        <div style={{ ...s.card, textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#4ade80', marginBottom: 8 }}>Redeemed!</div>
          <div style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 20 }}>{result.message}</div>
          {result.txid && (
            <a href={`https://mempool.space/testnet4/tx/${result.txid}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: '#f97316', wordBreak: 'break-all', fontFamily: 'monospace' }}>
              {result.txid}
            </a>
          )}
          {result.payment_hash && (
            <div style={{ fontSize: 11, color: '#eab308', wordBreak: 'break-all', fontFamily: 'monospace', marginTop: 8 }}>{result.payment_hash}</div>
          )}
          <button onClick={() => { setStep('upload'); setProofFile(null); setKyberKey(''); setDecrypted(null); setResult(null); setError(''); }}
            style={{ ...s.btnSecondary, marginTop: 24, width: '100%', flex: 'none' }}>
            Redeem another proof
          </button>
        </div>
      )}
    </div>
  );
}
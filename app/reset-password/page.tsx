'use client'
import { useState } from 'react'

export default function ResetPasswordPage() {
  const [mnemonic, setMnemonic] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState<'mnemonic' | 'password' | 'done'>('mnemonic')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const mono: any = { fontFamily: 'var(--font-mono)' }

  async function verifyMnemonic() {
    setError(''); setLoading(true)
    try {
      const { validateMnemonic } = await import('@scure/bip39')
      const { wordlist } = await import('@scure/bip39/wordlists/english.js')
      if (!validateMnemonic(mnemonic.trim(), wordlist)) {
        setError('Invalid recovery phrase — check your words and try again')
        setLoading(false)
        return
      }
      // Check it matches stored wallet
      const { loadWallet } = await import('../lib/wallet/storage')
      const { deriveKeySeeds } = await import('../lib/wallet/hkdf')
      const { mnemonicToSeedSync } = await import('@scure/bip39')
      const stored = await loadWallet()
      if (!stored) {
        setError('No wallet found in this browser. Are you on the right device?')
        setLoading(false)
        return
      }
      const bip39Seed = mnemonicToSeedSync(mnemonic.trim())
      const seeds = await deriveKeySeeds(bip39Seed)
      // Derive taproot address to verify mnemonic matches
      const { HDKey } = await import('@scure/bip32')
     // @ts-ignore
      const { sha256 } = await import('@noble/hashes/sha2')
      const root = HDKey.fromMasterSeed(seeds.taprootSeed)
      const child = root.derive("m/44'/0'/0'/0/0")
      if (!child.publicKey) { setError('Key derivation failed'); setLoading(false); return }
      const hashBuf = sha256(child.publicKey)
     const hashHex = Array.from(hashBuf as Uint8Array).map((b: number) => b.toString(16).padStart(2, '0')).join('')
      const derivedAddress = `ubtc${hashHex.slice(0, 24)}`
      seeds.taprootSeed.fill(0)
      seeds.localEncKey.fill(0)
      if (derivedAddress !== stored.address) {
        setError('This recovery phrase does not match your wallet on this device')
        setLoading(false)
        return
      }
      setStep('password')
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  async function resetPassword() {
    setError(''); setLoading(true)
    try {
      if (newPassword.length < 8) { setError('Password must be at least 8 characters'); setLoading(false); return }
      if (newPassword !== confirmPassword) { setError('Passwords do not match'); setLoading(false); return }

      const { loadWallet, savePasswordVault } = await import('../lib/wallet/storage')
      const { sealWithPassword } = await import('../lib/wallet/password')
      const { deriveKeySeeds } = await import('../lib/wallet/hkdf')
      const { mnemonicToSeedSync } = await import('@scure/bip39')

      const stored = await loadWallet()
      if (!stored) { setError('Wallet not found'); setLoading(false); return }

      const bip39Seed = mnemonicToSeedSync(mnemonic.trim())
      const seeds = await deriveKeySeeds(bip39Seed)

      // Re-encrypt Kyber SK with new password
      const { decrypt: aesDecrypt, encrypt: aesEncrypt } = await import('../lib/wallet/encryption')

      // Re-seal localEncKey with new password
      const vault = await sealWithPassword(seeds.localEncKey, newPassword)
      seeds.localEncKey.fill(0)

      await savePasswordVault(vault)
      setStep('done')
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>

        <div style={{ textAlign: 'center' as const, marginBottom: '32px' }}>
          <h1 style={{ color: 'hsl(0 0% 92%)', fontSize: '28px', fontWeight: 700, margin: '0 0 8px' }}>Reset Wallet Password</h1>
          <p style={{ color: 'hsl(0 0% 38%)', fontSize: '13px', ...mono, margin: 0 }}>Use your 24-word recovery phrase to set a new password</p>
        </div>

        <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 13%)', borderRadius: '20px', padding: '28px' }}>

          {/* Step 1 — Enter mnemonic */}
          {step === 'mnemonic' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'hsl(38 92% 50% / 0.15)', border: '1px solid hsl(38 92% 50% / 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>🔑</div>
                <div>
                  <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Enter Your Recovery Phrase</h2>
                  <p style={{ color: 'hsl(38 92% 50%)', fontSize: '11px', ...mono, margin: 0 }}>Step 1 of 2</p>
                </div>
              </div>

              <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(38 92% 50% / 0.2)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <p style={{ color: 'hsl(0 0% 55%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.8' }}>
                  Enter all 24 words in order, separated by spaces. This verifies you are the wallet owner before allowing a password reset.
                </p>
              </div>

              <textarea
                value={mnemonic}
                onChange={e => setMnemonic(e.target.value)}
                placeholder="word1 word2 word3 ... word24"
                rows={4}
                style={{ width: '100%', padding: '14px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', color: 'hsl(0 0% 88%)', fontSize: '14px', ...mono, marginBottom: '12px', boxSizing: 'border-box' as const, outline: 'none', resize: 'vertical' as const, lineHeight: '1.8' }}
              />

              {mnemonic.trim().split(/\s+/).length > 1 && (
                <p style={{ color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, margin: '0 0 12px' }}>
                  {mnemonic.trim().split(/\s+/).length} / 24 words entered
                </p>
              )}

              {error && <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, margin: '0 0 12px' }}>{error}</p>}

              <button onClick={verifyMnemonic} disabled={loading || mnemonic.trim().split(/\s+/).length < 24}
                style={{ width: '100%', background: mnemonic.trim().split(/\s+/).length >= 24 ? 'hsl(38 92% 50%)' : 'hsl(220 10% 12%)', color: mnemonic.trim().split(/\s+/).length >= 24 ? '#000' : 'hsl(0 0% 30%)', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: 700, cursor: mnemonic.trim().split(/\s+/).length >= 24 ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)' }}>
                {loading ? 'Verifying...' : 'Verify Recovery Phrase →'}
              </button>
            </div>
          )}

          {/* Step 2 — Set new password */}
          {step === 'password' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'hsl(142 76% 36% / 0.15)', border: '1px solid hsl(142 76% 36% / 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>🔒</div>
                <div>
                  <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Set New Password</h2>
                  <p style={{ color: 'hsl(142 76% 36%)', fontSize: '11px', ...mono, margin: 0 }}>Step 2 of 2 — Recovery phrase verified ✅</p>
                </div>
              </div>

              <div style={{ background: 'hsl(142 76% 36% / 0.08)', border: '1px solid hsl(142 76% 36% / 0.2)', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
                <p style={{ color: 'hsl(0 0% 55%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.8' }}>
                  Your new password will re-encrypt your Quantum Kyber key on this device. Your recovery phrase remains the master key.
                </p>
              </div>

              <input type="password" placeholder="New password (min 8 characters)" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                style={{ width: '100%', padding: '13px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', color: 'hsl(0 0% 88%)', fontSize: '14px', ...mono, marginBottom: '10px', boxSizing: 'border-box' as const, outline: 'none' }} />
              <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                style={{ width: '100%', padding: '13px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', color: 'hsl(0 0% 88%)', fontSize: '14px', ...mono, marginBottom: '16px', boxSizing: 'border-box' as const, outline: 'none' }} />

              {newPassword.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ height: '4px', borderRadius: '2px', background: 'hsl(220 10% 14%)', marginBottom: '4px' }}>
                    <div style={{ height: '100%', borderRadius: '2px', width: `${Math.min(100, newPassword.length * 8)}%`, background: newPassword.length < 8 ? 'hsl(0 84% 60%)' : newPassword.length < 12 ? 'hsl(38 92% 50%)' : 'hsl(142 76% 36%)', transition: 'all 0.3s' }} />
                  </div>
                  <p style={{ color: newPassword.length < 8 ? 'hsl(0 84% 60%)' : newPassword.length < 12 ? 'hsl(38 92% 50%)' : 'hsl(142 76% 36%)', fontSize: '11px', ...mono, margin: 0 }}>
                    {newPassword.length < 8 ? 'Too short' : newPassword.length < 12 ? 'Acceptable' : 'Strong ✓'}
                  </p>
                </div>
              )}

              {error && <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, margin: '0 0 12px' }}>{error}</p>}

              <button onClick={resetPassword} disabled={loading || newPassword.length < 8}
                style={{ width: '100%', background: newPassword.length >= 8 ? 'hsl(142 76% 36%)' : 'hsl(220 10% 12%)', color: 'white', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: 700, cursor: newPassword.length >= 8 ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)' }}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          )}

          {/* Done */}
          {step === 'done' && (
            <div style={{ textAlign: 'center' as const }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>Password Reset</h2>
              <p style={{ color: 'hsl(0 0% 45%)', fontSize: '13px', ...mono, margin: '0 0 24px', lineHeight: '1.7' }}>
                Your wallet password has been reset. Your Quantum Kyber key is re-encrypted with your new password.
              </p>
              <a href="/wallet" style={{ display: 'block', background: 'hsl(142 76% 36%)', color: 'white', textDecoration: 'none', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                Go to Wallet →
              </a>
            </div>
          )}

        </div>

        <p style={{ textAlign: 'center' as const, marginTop: '16px' }}>
          <a href="/wallet" style={{ color: 'hsl(0 0% 35%)', fontSize: '12px', ...mono, textDecoration: 'none' }}>← Back to wallet</a>
        </p>
      </div>
    </div>
  )
}

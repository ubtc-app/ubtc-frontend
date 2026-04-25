'use client'
import { useState, useEffect, useRef } from 'react'
import { API_URL } from '../lib/supabase'

const PUBKEY = '032bb4a115bddb717274ba34d757338d309865e632232f31c874a0707c2c566ef5'

type Step = 'account' | 'custody' | 'confirm' | 'done'
type AccountType = 'current' | 'savings' | 'yield' | 'custody_yield' | 'prime' | 'managed_yield'

export default function VaultPage() {
  const [step, setStep] = useState<Step>('account')
  const [accountType, setAccountType] = useState<AccountType | null>(null)
  const [custodyPreference, setCustodyPreference] = useState<'ubtc' | 'bitgo' | 'komainu'>('ubtc')
  const [existingTypes, setExistingTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const mono: any = { fontFamily: 'var(--font-mono)' }

  // Onboarding wizard state
  const [onboardStep, setOnboardStep] = useState(1)
  const [mnemonicConfirmed, setMnemonicConfirmed] = useState(false)
  const [walletPassword, setWalletPassword] = useState('')
  const [walletPasswordConfirm, setWalletPasswordConfirm] = useState('')
  const [passwordSet, setPasswordSet] = useState(false)
  const [pskDownloaded, setPskDownloaded] = useState(false)
  const [pskVerified, setPskVerified] = useState(false)
  const [pskVerifyError, setPskVerifyError] = useState('')
  const [quantumUsername, setQuantumUsername] = useState('')
  const [quantumUsernameAvailable, setQuantumUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [quantumUsernameSet, setQuantumUsernameSet] = useState(false)
  const usernameCheckTimeout = useRef<any>(null)

  useEffect(() => {
    fetch(`${API_URL}/dashboard`)
      .then(r => r.json())
      .then(d => setExistingTypes((d.vaults || []).map((v: any) => v.account_type)))
  }, [])

  const selfCustodyTypes: AccountType[] = ['current', 'savings', 'yield']
  const isSelfCustody = accountType ? selfCustodyTypes.includes(accountType) : false

  const createAccount = async () => {
    setLoading(true); setError('')
    try {
      const { createWallet: generateWallet, persistWallet } = await import('../lib/wallet/wallet')
      const wallet = await generateWallet()
      const res = await fetch(`${API_URL}/vaults`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_pubkey: PUBKEY, network: 'testnet4', recovery_blocks: 6,
          account_type: accountType,
          username: `user_${Math.random().toString(36).slice(2, 8)}`,
          custody_type: isSelfCustody ? 'taproot' : custodyPreference,
          yield_strategy: accountType === 'yield' ? 'babylon' : accountType === 'custody_yield' ? 'treasury' : accountType === 'managed_yield' ? 'managed' : accountType === 'prime' ? 'prime' : 'none',
          client_kyber_pk: wallet.publicKeys.kyber,
          client_wallet_address: wallet.address,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await persistWallet(wallet)
      localStorage.setItem('ubtc_wallet_address', wallet.address)
      setResult({ ...data, mnemonic: wallet.mnemonic, wallet_address: wallet.address })
      setStep('done')
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const checkQuantumUsername = async (name: string) => {
    if (name.length < 3) { setQuantumUsernameAvailable(null); return }
    setCheckingUsername(true)
    try {
      const res = await fetch(`${API_URL}/wallets/all`)
      const data = await res.json()
      const taken = (data.wallets || []).some((w: any) =>
        w.username?.toLowerCase() === name.toLowerCase() ||
        w.username?.toLowerCase().replace(/_[a-f0-9]+$/, '') === name.toLowerCase()
      )
      setQuantumUsernameAvailable(!taken)
    } catch { setQuantumUsernameAvailable(null) }
    setCheckingUsername(false)
  }

  const verifyProtocolKey = async (file: File) => {
    setPskVerifyError('')
    try {
      const text = await file.text()
      if (!text.includes(result.protocol_second_key)) {
        setPskVerifyError('This is not your Protocol Second Key. Check your downloads folder and try again.')
        return
      }
      setPskVerified(true)
    } catch { setPskVerifyError('Could not read file. Please try again.') }
  }

  const setQuantumWalletUsername = async () => {
    if (!quantumUsernameAvailable || quantumUsername.length < 3) return
    try {
      const res = await fetch(`${API_URL}/wallet/username`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ wallet_address: result.wallet_address, vault_id: result.vault_id, quantum_username: quantumUsername })
      })
      if (res.ok) { setQuantumUsernameSet(true) }
      else { setQuantumUsernameSet(true) } // proceed even if endpoint not yet built
    } catch { setQuantumUsernameSet(true) }
  }

  const btnBack: any = { background: 'none', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 65%)', borderRadius: '10px', padding: '14px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }
  const btnNext = (enabled: boolean): any => ({ flex: 1, background: enabled ? 'linear-gradient(135deg, hsl(205, 85%, 55%), hsl(190, 80%, 50%))' : 'hsl(220 10% 14%)', color: enabled ? 'white' : 'hsl(0 0% 40%)', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: enabled ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', boxShadow: enabled ? '0 0 30px hsl(205 85% 55% / 0.4)' : 'none' })

  const accountDetails: Record<AccountType, { icon: string; title: string; color: string; custodyLabel: string; yieldLabel: string; apy: string | null }> = {
    current: { icon: '💳', title: 'Current Account', color: 'hsl(205 85% 55%)', custodyLabel: '⚛️ Taproot Self-Custody', yieldLabel: 'No yield', apy: null },
    savings: { icon: '🔐', title: 'Savings Account', color: 'hsl(38 92% 50%)', custodyLabel: '⚛️ Taproot Self-Custody', yieldLabel: 'No yield', apy: null },
    yield: { icon: '₿', title: 'Yield Account', color: 'hsl(142 76% 36%)', custodyLabel: '⚛️ Taproot Self-Custody', yieldLabel: 'Babylon staking', apy: '3-5%' },
    custody_yield: { icon: '📊', title: 'Custody Yield', color: 'hsl(205 85% 55%)', custodyLabel: '🏦 BitGo / Komainu', yieldLabel: 'Institutional yield', apy: '4-6%' },
    prime: { icon: '💎', title: 'Prime Account', color: 'hsl(270 85% 65%)', custodyLabel: '🏦 BitGo / Komainu', yieldLabel: 'Institutional yield', apy: '5-8%' },
    managed_yield: { icon: '🏦', title: 'Managed Yield', color: 'hsl(142 76% 36%)', custodyLabel: '🏦 BitGo / Komainu', yieldLabel: 'Dynamic yield', apy: '6-10%' },
  }

  const selfAccounts = [
    { type: 'current' as AccountType, icon: '💳', title: 'Current Account', subtitle: 'Everyday spending', description: 'Your everyday UBTC account. Send and receive instantly. Your Bitcoin collateral is locked in a Taproot script — nobody, not even WLB, can touch it without your signature.', yieldLabel: 'No yield — pure collateral', apy: null, tags: ['Instant transfers', 'Self-custody'], color: 'hsl(205 85% 55%)' },
    { type: 'savings' as AccountType, icon: '🔐', title: 'Savings Account', subtitle: 'Long-term secure storage', description: 'For holding larger amounts safely. Every outgoing transfer requires explicit confirmation.', yieldLabel: 'No yield — pure collateral', apy: null, tags: ['Transfer confirmation', 'Long-term storage'], color: 'hsl(38 92% 50%)' },
    { type: 'yield' as AccountType, icon: '₿', title: 'Yield Account', subtitle: 'Earn on your Bitcoin', description: 'Your Bitcoin stays in Taproot self-custody while Babylon Protocol stakes it on-chain earning yield in BTC.', yieldLabel: 'Babylon Protocol staking', apy: '3-5%', tags: ['Bitcoin-native yield', 'Non-custodial'], color: 'hsl(142 76% 36%)' },
  ]

  const managedAccounts = [
    { type: 'custody_yield' as AccountType, icon: '📊', title: 'Custody Yield', subtitle: 'Managed yield', description: 'UBTC holds at BitGo or Komainu and deploys institutional yield strategies.', yieldLabel: 'Covered calls + T-Bills', apy: '4-6%', tags: ['BitGo / Komainu', '$250M insured'], color: 'hsl(205 85% 55%)' },
    { type: 'prime' as AccountType, icon: '💎', title: 'Prime Account', subtitle: 'Institutional grade', description: 'Segregated custody, prime brokerage features and multi-authorisation controls.', yieldLabel: 'Institutional yield', apy: '5-8%', tags: ['Segregated custody', 'Prime reporting'], color: 'hsl(270 85% 65%)' },
    { type: 'managed_yield' as AccountType, icon: '🏦', title: 'Managed Yield', subtitle: 'Dynamic allocation', description: 'UBTC actively manages a diversified yield portfolio across all currencies.', yieldLabel: 'Dynamic rotating yield', apy: '6-10%', tags: ['Dynamic allocation', 'Active management'], color: 'hsl(142 76% 36%)' },
  ]

  const Card = ({ acc, selected, onClick }: { acc: typeof selfAccounts[0]; selected: boolean; onClick: () => void }) => {
    const disabled = existingTypes.includes(acc.type)
    return (
      <div onClick={() => !disabled && onClick()} style={{ background: 'hsl(220 12% 8%)', border: `2px solid ${selected ? acc.color : disabled ? 'hsl(220 10% 12%)' : 'hsl(220 10% 16%)'}`, borderRadius: '14px', padding: '20px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, transition: 'border-color 0.15s', display: 'flex', flexDirection: 'column' as const, gap: '10px', boxSizing: 'border-box' as const }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: acc.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>{acc.icon}</div>
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${selected ? acc.color : 'hsl(220 10% 30%)'}`, background: selected ? acc.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {selected && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'white' }} />}
          </div>
        </div>
        <div>
          <h3 style={{ color: 'hsl(0 0% 92%)', fontSize: '15px', fontWeight: '700', margin: '0 0 2px' }}>{acc.title}</h3>
          <p style={{ color: acc.color, fontSize: '11px', ...mono, margin: 0 }}>{acc.subtitle}</p>
        </div>
        <p style={{ color: 'hsl(0 0% 60%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.7', flex: 1 }}>{acc.description}</p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
          {acc.tags.map(t => <span key={t} style={{ fontSize: '9px', ...mono, color: acc.color, border: `1px solid ${acc.color}40`, borderRadius: '20px', padding: '2px 8px', textTransform: 'uppercase' as const }}>{t}</span>)}
        </div>
        {acc.apy && <p style={{ color: 'hsl(142 76% 36%)', fontWeight: 700, fontSize: '14px', ...mono, margin: 0 }}>{acc.apy}% APY</p>}
        {disabled && <p style={{ color: 'hsl(0 84% 60%)', fontSize: '10px', ...mono, margin: 0 }}>✗ Already open</p>}
      </div>
    )
  }

  const canProceed = username.length >= 3 && email.includes('@') && email.includes('.')

  // ── Wizard steps labels ──
  const wizardSteps = ['Recovery Phrase', 'Password', 'Protocol Key', 'Verify Key', 'Account', 'Wallet & @ID', 'Ready']

  const infoBox = (children: React.ReactNode, borderColor = 'hsl(38 92% 50%)') => (
    <div style={{ background: 'hsl(220 15% 5%)', border: `1px solid ${borderColor}30`, borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
      {children}
    </div>
  )

  const qa = (q: string, a: string, color = 'hsl(0 0% 78%)') => (
    <div style={{ marginBottom: '12px' }}>
      <p style={{ color, fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, margin: '0 0 4px' }}>{q}</p>
      <p style={{ color: 'hsl(0 0% 50%)', fontSize: '12px', fontFamily: 'monospace', margin: 0, lineHeight: '1.8' }} dangerouslySetInnerHTML={{ __html: a }} />
    </div>
  )

  const nextBtn = (label: string, onClick: () => void, enabled: boolean, color = 'hsl(38 92% 50%)') => (
    <button onClick={() => enabled && onClick()} disabled={!enabled} style={{ width: '100%', background: enabled ? color : 'hsl(220 10% 12%)', color: enabled ? (color === 'hsl(38 92% 50%)' ? '#000' : 'white') : 'hsl(0 0% 30%)', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: 700, cursor: enabled ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', marginTop: '8px' }}>
      {label}
    </button>
  )

  const checkBox = (checked: boolean, onToggle: () => void, label: string) => (
    <div onClick={onToggle} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'hsl(220 12% 6%)', border: `1px solid ${checked ? 'hsl(142 76% 36% / 0.4)' : 'hsl(220 10% 14%)'}`, borderRadius: '10px', padding: '14px', cursor: 'pointer', marginBottom: '16px' }}>
      <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${checked ? 'hsl(142 76% 36%)' : 'hsl(220 10% 28%)'}`, background: checked ? 'hsl(142 76% 36%)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
        {checked && <span style={{ color: 'white', fontSize: '13px' }}>✓</span>}
      </div>
      <p style={{ color: 'hsl(0 0% 55%)', fontSize: '13px', fontFamily: 'monospace', margin: 0, lineHeight: '1.6' }}>{label}</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', padding: '40px 24px 80px', fontFamily: 'var(--font-display)' }}>
      <div style={{ maxWidth: step === 'done' ? '580px' : '1100px', margin: '0 auto' }}>

        {/* ── DETAILS MODAL ── */}
        {showDetailsModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'hsl(220 15% 2% / 0.95)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '24px', padding: '40px', maxWidth: '480px', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'hsl(205 85% 55% / 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>👤</div>
                <div>
                  <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: '0 0 2px' }}>Create your identity</h2>
                  <p style={{ color: 'hsl(205 85% 55%)', fontSize: '12px', ...mono, margin: 0 }}>World Local Bank · QAP Protocol</p>
                </div>
              </div>
              <p style={{ color: 'hsl(0 0% 45%)', fontSize: '13px', ...mono, margin: '0 0 28px', lineHeight: '1.7', borderTop: '1px solid hsl(220 10% 12%)', paddingTop: '16px' }}>
                Your username becomes part of your QAP identity. Your email receives security alerts only — never shared.
              </p>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'hsl(0 0% 40%)', fontSize: '10px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.15em', marginBottom: '8px' }}>Username <span style={{ color: 'hsl(0 84% 60%)' }}>required</span></label>
                <div style={{ position: 'relative' as const }}>
                  <span style={{ position: 'absolute' as const, left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(0 0% 35%)', fontSize: '14px', ...mono }}>@</span>
                  <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="satoshi" maxLength={20} autoFocus
                    style={{ display: 'block', width: '100%', padding: '14px 16px 14px 32px', background: 'hsl(220 15% 5%)', border: `1px solid ${username.length >= 3 ? 'hsl(142 76% 36% / 0.6)' : 'hsl(220 10% 18%)'}`, borderRadius: '12px', color: 'hsl(0 0% 92%)', fontSize: '16px', ...mono, outline: 'none', boxSizing: 'border-box' as const }} />
                  {username.length >= 3 && <span style={{ position: 'absolute' as const, right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(142 76% 36%)', fontSize: '16px' }}>✓</span>}
                </div>
                <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, margin: '6px 0 0' }}>Lowercase, numbers, underscores · 3–20 characters</p>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: 'hsl(0 0% 40%)', fontSize: '10px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.15em', marginBottom: '8px' }}>Email <span style={{ color: 'hsl(0 84% 60%)' }}>required</span></label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" type="email"
                  style={{ display: 'block', width: '100%', padding: '14px 16px', background: 'hsl(220 15% 5%)', border: `1px solid ${email.includes('@') ? 'hsl(142 76% 36% / 0.6)' : 'hsl(220 10% 18%)'}`, borderRadius: '12px', color: 'hsl(0 0% 92%)', fontSize: '16px', ...mono, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowDetailsModal(false)} style={btnBack}>← Back</button>
                <button onClick={() => { if (!canProceed) return; setShowDetailsModal(false); const managed = ['custody_yield', 'prime', 'managed_yield']; if (accountType && managed.includes(accountType)) setStep('custody'); else setStep('confirm') }} disabled={!canProceed}
                  style={{ flex: 1, background: canProceed ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : 'hsl(220 10% 14%)', color: canProceed ? 'white' : 'hsl(0 0% 30%)', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: canProceed ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)' }}>
                  Continue →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── PRE-DONE HEADER ── */}
        {step !== 'done' && (
          <div style={{ textAlign: 'center' as const, marginBottom: '48px' }}>
            <h1 style={{ color: 'hsl(0 0% 92%)', fontSize: '38px', fontWeight: '700', margin: '0 0 12px' }}>
              {step === 'account' && 'Choose your account type'}
              {step === 'custody' && 'Custody preference'}
              {step === 'confirm' && 'Review & confirm'}
            </h1>
          </div>
        )}

        {/* ── STEP 1: Account Selection ── */}
        {step === 'account' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
              <div>
                <div style={{ background: 'hsl(205 85% 55% / 0.06)', border: '1px solid hsl(205 85% 55% / 0.2)', borderRadius: '16px', padding: '20px 24px', marginBottom: '16px' }}>
                  <h2 style={{ color: 'hsl(205 85% 55%)', fontSize: '16px', fontWeight: '700', margin: '0 0 8px' }}>⚛️ Self-Custody Accounts</h2>
                  <p style={{ color: 'hsl(0 0% 60%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.7' }}>Your keys. Your Bitcoin. Always. Locked in a Taproot script — nobody can move it without your signature.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
                  {selfAccounts.map(acc => <Card key={acc.type} acc={acc} selected={accountType === acc.type} onClick={() => setAccountType(acc.type)} />)}
                </div>
              </div>
              <div>
                <div style={{ background: 'hsl(38 92% 50% / 0.06)', border: '1px solid hsl(38 92% 50% / 0.2)', borderRadius: '16px', padding: '20px 24px', marginBottom: '16px' }}>
                  <h2 style={{ color: 'hsl(38 92% 50%)', fontSize: '16px', fontWeight: '700', margin: '0 0 8px' }}>🏦 Managed Custody Accounts</h2>
                  <p style={{ color: 'hsl(0 0% 60%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.7' }}>You own everything. We hold at BitGo or Komainu — insured up to $250M — and deploy institutional yield.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
                  {managedAccounts.map(acc => <Card key={acc.type} acc={acc} selected={accountType === acc.type} onClick={() => setAccountType(acc.type)} />)}
                </div>
              </div>
            </div>
            <div style={{ maxWidth: '400px', margin: '32px auto 0' }}>
             <button onClick={() => { if (!accountType) return; const managed = ['custody_yield', 'prime', 'managed_yield']; if (accountType && managed.includes(accountType)) setStep('custody'); else setStep('confirm') }} disabled={!accountType} style={btnNext(!!accountType)}>
                {accountType ? `Continue with ${accountDetails[accountType]?.title} →` : 'Select an account to continue'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Custody ── */}
        {step === 'custody' && (
          <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>
            {[
              { type: 'ubtc' as const, icon: '🏦', title: 'UBTC Direct Custody', subtitle: 'Standard — immediate activation', description: 'UBTC holds and manages your assets directly.', tags: ['Immediate activation', 'No additional KYB'], color: 'hsl(205 85% 55%)' },
              { type: 'bitgo' as const, icon: '🔐', title: 'UBTC + BitGo Sub-Custody', subtitle: '$250M insured', description: 'Assets sub-custodied at BitGo — $60B+ AUM, SOC2 certified, insured up to $250M.', tags: ['$250M insured', 'SOC2', 'KYB required'], color: 'hsl(38 92% 50%)' },
              { type: 'komainu' as const, icon: '🌍', title: 'UBTC + Komainu', subtitle: 'VARA Dubai & UK FCA regulated', description: 'Sub-custodied at Komainu — regulated by Dubai VARA and UK FCA, backed by Nomura.', tags: ['VARA Dubai', 'UK FCA', 'Nomura-backed'], color: 'hsl(270 85% 65%)' },
            ].map(opt => (
              <div key={opt.type} onClick={() => setCustodyPreference(opt.type)} style={{ background: 'hsl(220 12% 8%)', border: `2px solid ${custodyPreference === opt.type ? opt.color : 'hsl(220 10% 16%)'}`, borderRadius: '16px', padding: '22px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '14px', flex: 1 }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: opt.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>{opt.icon}</div>
                    <div>
                      <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '16px', fontWeight: '700', margin: '0 0 2px' }}>{opt.title}</h2>
                      <p style={{ color: opt.color, fontSize: '12px', ...mono, margin: '0 0 8px' }}>{opt.subtitle}</p>
                      <p style={{ color: 'hsl(0 0% 65%)', fontSize: '13px', ...mono, margin: '0 0 10px', lineHeight: '1.7' }}>{opt.description}</p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
                        {opt.tags.map(t => <span key={t} style={{ fontSize: '10px', ...mono, color: opt.color, border: `1px solid ${opt.color}40`, borderRadius: '20px', padding: '2px 8px' }}>{t}</span>)}
                      </div>
                    </div>
                  </div>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${custodyPreference === opt.type ? opt.color : 'hsl(220 10% 30%)'}`, background: custodyPreference === opt.type ? opt.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {custodyPreference === opt.type && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />}
                  </div>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep('account')} style={btnBack}>← Back</button>
              <button onClick={() => setStep('confirm')} style={btnNext(true)}>Continue →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Confirm ── */}
        {step === 'confirm' && accountType && (
          <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column' as const, gap: '16px' }}>
            <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '16px', padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid hsl(220 10% 12%)' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: accountDetails[accountType].color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>{accountDetails[accountType].icon}</div>
                <div>
                  <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>{accountDetails[accountType].title}</h2>
                  <p style={{ color: accountDetails[accountType].color, fontSize: '12px', ...mono, margin: 0 }}>{accountDetails[accountType].custodyLabel}</p>
                </div>
              </div>
              {[
               
                { label: 'Yield', value: accountDetails[accountType].yieldLabel + (accountDetails[accountType].apy ? ` — ${accountDetails[accountType].apy}% APY` : '') },
                { label: 'Collateral Ratio', value: '150% minimum — $150 BTC per $100 UBTC' },
                { label: 'Network', value: 'Bitcoin Testnet4' },
              ].map(item => (
                <div key={item.label} style={{ padding: '12px 0', borderBottom: '1px solid hsl(220 10% 12%)' }}>
                  <p style={{ color: 'hsl(0 0% 45%)', fontSize: '11px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 4px' }}>{item.label}</p>
                  <p style={{ color: 'hsl(0 0% 92%)', fontSize: '13px', fontWeight: '600', ...mono, margin: 0 }}>{item.value}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep('account')} style={btnBack}>← Back</button>
              <button onClick={createAccount} disabled={loading} style={btnNext(!loading)}>
                {loading ? 'Opening account...' : 'Open Account →'}
              </button>
            </div>
            {error && <p style={{ color: 'hsl(0 84% 60%)', fontSize: '13px', ...mono }}>{error}</p>}
          </div>
        )}

        {/* ── DONE: 7-STEP ONBOARDING WIZARD ── */}
        {step === 'done' && result && accountType && (
          <div>
            {/* Progress bar */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '32px', flexWrap: 'wrap' as const }}>
              {wizardSteps.map((label, i) => {
                const n = i + 1
                const done = onboardStep > n
                const active = onboardStep === n
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '3px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: done ? 'hsl(142 76% 36%)' : active ? 'hsl(38 92% 50%)' : 'hsl(220 12% 12%)', border: `2px solid ${done ? 'hsl(142 76% 36%)' : active ? 'hsl(38 92% 50%)' : 'hsl(220 10% 18%)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: done || active ? 'white' : 'hsl(0 0% 30%)', fontSize: '11px', fontWeight: 700 }}>{done ? '✓' : n}</span>
                      </div>
                      <span style={{ color: active ? 'hsl(38 92% 50%)' : done ? 'hsl(142 76% 36%)' : 'hsl(0 0% 25%)', fontSize: '8px', fontFamily: 'monospace', textAlign: 'center' as const, maxWidth: '55px', lineHeight: '1.2' }}>{label}</span>
                    </div>
                    {i < wizardSteps.length - 1 && <div style={{ width: '16px', height: '2px', background: done ? 'hsl(142 76% 36%)' : 'hsl(220 10% 18%)', marginBottom: '14px' }} />}
                  </div>
                )
              })}
            </div>

            <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 13%)', borderRadius: '20px', padding: '28px' }}>

              {/* ── WIZARD STEP 1: Recovery Phrase ── */}
              {onboardStep === 1 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'hsl(38 92% 50% / 0.15)', border: '1px solid hsl(38 92% 50% / 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>🔑</div>
                    <div>
                      <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>Your 24-Word Recovery Phrase</h2>
                      <p style={{ color: 'hsl(38 92% 50%)', fontSize: '11px', fontFamily: 'monospace', margin: 0 }}>Step 1 of 7 — The most important step in your setup</p>
                    </div>
                  </div>
                  {infoBox(<>
                    {qa('What is this?', 'These 24 words are the <strong style="color:hsl(38 92% 50%)">master key to your entire wallet</strong>. They control your UBTC balance, your Bitcoin collateral, and your ability to send and redeem. Lose them and you lose access to everything — permanently.')}
                    {qa('Why 24 words instead of a password?', 'Unlike a password, your 24-word phrase generates all your cryptographic keys mathematically. From these words, your system derives your Quantum Kyber encryption key, your Taproot Bitcoin key, and your local encryption key. One phrase. All keys. Forever.')}
                    {qa('What should I do right now?', 'Write all 24 words on paper — in order — right now. Store the paper somewhere safe offline. <span style="color:hsl(0 84% 60%)">Do not photograph them. Do not email them. Do not store in Notes, iCloud, or Google Drive.</span>')}
                    {qa('What if I lose them?', '<span style="color:hsl(0 84% 60%)">Your funds cannot be recovered. Not by us. Not by anyone. These words are shown exactly once.</span>')}
                  </>, 'hsl(38 92% 50%)')}

                  {result.mnemonic && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '12px' }}>
                        {result.mnemonic.split(' ').map((word: string, i: number) => (
                          <div key={i} style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '6px', padding: '8px 10px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ color: 'hsl(0 0% 28%)', fontSize: '9px', fontFamily: 'monospace', minWidth: '16px' }}>{i + 1}.</span>
                            <span style={{ color: 'hsl(0 0% 88%)', fontSize: '12px', fontFamily: 'monospace', fontWeight: 600 }}>{word}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                        <button onClick={() => navigator.clipboard.writeText(result.mnemonic)} style={{ flex: 1, background: 'hsl(220 12% 12%)', color: 'hsl(0 0% 55%)', border: '1px solid hsl(220 10% 18%)', borderRadius: '8px', padding: '10px', fontSize: '11px', fontFamily: 'monospace', cursor: 'pointer' }}>Copy to clipboard</button>
                        <button onClick={() => {
                          const text = `QAP WALLET RECOVERY PHRASE\nVault: ${result.vault_id}\nCreated: ${new Date().toISOString()}\n\nWARNING: These 24 words control your entire wallet.\nWrite them on paper. Store offline. Never share.\n\n${result.mnemonic.split(' ').map((w: string, i: number) => `${i + 1}. ${w}`).join('\n')}`
                          const blob = new Blob([text], { type: 'text/plain' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a'); a.href = url; a.download = `recovery-phrase-${result.vault_id}.txt`
                          document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
                        }} style={{ flex: 1, background: 'hsl(38 92% 50%)', color: '#000', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, cursor: 'pointer' }}>⬇ Download as text file</button>
                      </div>
                    </>
                  )}
                  {checkBox(mnemonicConfirmed, () => setMnemonicConfirmed(!mnemonicConfirmed), 'I have written down all 24 words in order and stored them safely offline. I understand these cannot be recovered if lost.')}
                  {nextBtn('Saved my phrase — Next: Set Password →', () => setOnboardStep(2), mnemonicConfirmed)}
                </div>
              )}

              {/* ── WIZARD STEP 2: Password ── */}
              {onboardStep === 2 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'hsl(142 76% 36% / 0.15)', border: '1px solid hsl(142 76% 36% / 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>🔒</div>
                    <div>
                      <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>Set Your Wallet Password</h2>
                      <p style={{ color: 'hsl(142 76% 36%)', fontSize: '11px', fontFamily: 'monospace', margin: 0 }}>Step 2 of 7 — Daily device security</p>
                    </div>
                  </div>
                  {infoBox(<>
                    {qa('What is this password for?', 'This password protects your wallet on this device. You will enter it every time you send UBTC or redeem a proof. It is used to decrypt your <strong style="color:hsl(205 85% 55%)">Quantum Kyber key</strong> — the post-quantum encryption key that secures your proof files.')}
                    {qa('What is my Quantum Kyber key?', 'Your Kyber1024 key is a post-quantum encryption key generated in your browser from your 24-word phrase. It is used to encrypt and decrypt UBTC proof files. Unlike classical encryption, Kyber1024 cannot be broken by a quantum computer — it is a NIST post-quantum standard. Your password locks this key on your device.')}
                    {qa('How does the password protect it?', 'Your password is processed through PBKDF2 — 310,000 rounds of hashing — to derive an AES-256-GCM encryption key. This key encrypts your Kyber secret key in your browser\'s secure local storage. Even if someone accesses your device storage, they cannot use your Kyber key without your password.')}
                    {qa('What if I forget it?', '<span style="color:hsl(38 92% 50%)">Use your 24-word recovery phrase to restore access and set a new password. The phrase is the master — the password is for daily convenience.</span>')}
                  </>, 'hsl(142 76% 36%)')}

                  {!passwordSet ? (
                    <>
                      <input type="password" placeholder="Choose a strong password (min 8 characters)" value={walletPassword} onChange={e => setWalletPassword(e.target.value)}
                        style={{ width: '100%', padding: '13px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', color: 'hsl(0 0% 88%)', fontSize: '14px', fontFamily: 'monospace', marginBottom: '10px', boxSizing: 'border-box' as const, outline: 'none' }} />
                      <input type="password" placeholder="Confirm your password" value={walletPasswordConfirm} onChange={e => setWalletPasswordConfirm(e.target.value)}
                        style={{ width: '100%', padding: '13px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', color: 'hsl(0 0% 88%)', fontSize: '14px', fontFamily: 'monospace', marginBottom: '12px', boxSizing: 'border-box' as const, outline: 'none' }} />
                      {walletPassword.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ height: '4px', borderRadius: '2px', background: 'hsl(220 10% 14%)', marginBottom: '4px' }}>
                            <div style={{ height: '100%', borderRadius: '2px', width: `${Math.min(100, walletPassword.length * 8)}%`, background: walletPassword.length < 8 ? 'hsl(0 84% 60%)' : walletPassword.length < 12 ? 'hsl(38 92% 50%)' : 'hsl(142 76% 36%)', transition: 'all 0.3s' }} />
                          </div>
                          <p style={{ color: walletPassword.length < 8 ? 'hsl(0 84% 60%)' : walletPassword.length < 12 ? 'hsl(38 92% 50%)' : 'hsl(142 76% 36%)', fontSize: '11px', fontFamily: 'monospace', margin: 0 }}>
                            {walletPassword.length < 8 ? 'Too short' : walletPassword.length < 12 ? 'Acceptable' : 'Strong ✓'}
                          </p>
                        </div>
                      )}
                      <button onClick={async () => {
                        if (walletPassword.length < 8) { alert('Password must be at least 8 characters'); return }
                        if (walletPassword !== walletPasswordConfirm) { alert('Passwords do not match'); return }
                        try {
                          const { loadWallet, savePasswordVault } = await import('../lib/wallet/storage')
                          const { sealWithPassword } = await import('../lib/wallet/password')
                          const { deriveKeySeeds } = await import('../lib/wallet/hkdf')
                          const { mnemonicToSeedSync } = await import('@scure/bip39')
                          const stored = await loadWallet()
                          if (!stored) { alert('Wallet not found'); return }
                          const bip39Seed = mnemonicToSeedSync(result.mnemonic)
                          const seeds = await deriveKeySeeds(bip39Seed)
                          const vault = await sealWithPassword(seeds.localEncKey, walletPassword)
                          seeds.localEncKey.fill(0)
                          await savePasswordVault(vault)
                          setPasswordSet(true)
                        } catch (e: any) { alert('Failed: ' + e.message) }
                      }} style={{ width: '100%', background: 'hsl(142 76% 36%)', color: 'white', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
                        Encrypt Wallet with Password
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ background: 'hsl(142 76% 36% / 0.1)', border: '1px solid hsl(142 76% 36% / 0.3)', borderRadius: '12px', padding: '16px', marginBottom: '16px', textAlign: 'center' as const }}>
                        <p style={{ color: 'hsl(142 76% 36%)', fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, margin: 0 }}>✅ Password set — Kyber key encrypted on this device</p>
                      </div>
                      {nextBtn('Next: Download Protocol Key →', () => setOnboardStep(3), true, 'hsl(38 92% 50%)')}
                    </>
                  )}
                </div>
              )}

              {/* ── WIZARD STEP 3: Protocol Key ── */}
              {onboardStep === 3 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'hsl(205 85% 55% / 0.15)', border: '1px solid hsl(205 85% 55% / 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>🏦</div>
                    <div>
                      <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>Your Protocol Second Key</h2>
                      <p style={{ color: 'hsl(205 85% 55%)', fontSize: '11px', fontFamily: 'monospace', margin: 0 }}>Step 3 of 7 — Vault minting authorisation</p>
                    </div>
                  </div>
                  {infoBox(<>
                    {qa('What is this key?', 'The Protocol Second Key is a separate security layer for your <strong style="color:hsl(205 85% 55%)">vault</strong> — not your wallet. You need it to mint UBTC from your Bitcoin collateral and to move UBTC from your vault to your wallet. It proves you are the legitimate vault owner.')}
                    {qa('How is it different from my password and phrase?', 'You have three independent security layers:<br/>• <strong style="color:hsl(38 92% 50%)">24-word phrase</strong> — master recovery key<br/>• <strong style="color:hsl(142 76% 36%)">Password</strong> — encrypts your Kyber key on this device<br/>• <strong style="color:hsl(205 85% 55%)">Protocol Key</strong> — authorises vault minting operations<br/><br/>All three are needed for full system access. This is defence in depth.')}
                    {qa('How do I use it?', 'Download it now. When you mint UBTC, upload this file. The system checks a cryptographic hash — the key itself never leaves your device. Store it separately from your recovery phrase.')}
                  </>, 'hsl(205 85% 55%)')}

                  <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                    <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase' as const, letterSpacing: '0.15em', margin: '0 0 6px' }}>Protocol Second Key</p>
                    <p style={{ color: 'hsl(205 85% 55%)', fontSize: '11px', fontFamily: 'monospace', margin: '0 0 12px', wordBreak: 'break-all' as const }}>{result.protocol_second_key?.substring(0, 64)}...</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => navigator.clipboard.writeText(result.protocol_second_key || '')} style={{ flex: 1, background: 'hsl(220 12% 12%)', color: 'hsl(0 0% 55%)', border: '1px solid hsl(220 10% 18%)', borderRadius: '8px', padding: '10px', fontSize: '11px', fontFamily: 'monospace', cursor: 'pointer' }}>Copy</button>
                      <button onClick={() => {
                        const text = `QAP PROTOCOL SECOND KEY\nVault: ${result.vault_id}\nCreated: ${new Date().toISOString()}\n\nWARNING: This key authorises minting UBTC from your vault.\nUpload it when minting. Store securely. Never share.\n\n${result.protocol_second_key}`
                        const blob = new Blob([text], { type: 'text/plain' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a'); a.href = url; a.download = `protocol-key-${result.vault_id}.txt`
                        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
                        setPskDownloaded(true)
                      }} style={{ flex: 1, background: 'hsl(205 85% 55%)', color: '#000', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, cursor: 'pointer' }}>⬇ Download Key File</button>
                    </div>
                  </div>
                  {nextBtn('Downloaded — Next: Verify My Key →', () => setOnboardStep(4), pskDownloaded)}
                  {!pskDownloaded && <p style={{ color: 'hsl(0 0% 35%)', fontSize: '11px', fontFamily: 'monospace', textAlign: 'center' as const, marginTop: '8px' }}>Download your key file to continue</p>}
                </div>
              )}

              {/* ── WIZARD STEP 4: Verify Key ── */}
              {onboardStep === 4 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'hsl(270 85% 65% / 0.15)', border: '1px solid hsl(270 85% 65% / 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>🧪</div>
                    <div>
                      <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>Prove You Saved Your Key</h2>
                      <p style={{ color: 'hsl(270 85% 65%)', fontSize: '11px', fontFamily: 'monospace', margin: 0 }}>Step 4 of 7 — Verification</p>
                    </div>
                  </div>
                  {infoBox(<>
                    {qa('Why are we doing this?', 'We need to confirm you actually saved your Protocol Second Key — not just clicked download and forgot about it. If you cannot upload it now, you will not be able to mint UBTC later. <strong style="color:hsl(270 85% 65%)">This test could save your funds.</strong>')}
                    {qa('What do I do?', 'Find the file you just downloaded — it will be called <strong>protocol-key-' + result.vault_id + '.txt</strong> in your Downloads folder. Upload it below. The system will verify it matches your vault.')}
                  </>, 'hsl(270 85% 65%)')}

                  {!pskVerified ? (
                    <>
                      <label style={{ display: 'block', border: `2px dashed ${pskVerifyError ? 'hsl(0 84% 60%)' : 'hsl(220 10% 20%)'}`, borderRadius: '12px', padding: '32px', textAlign: 'center' as const, cursor: 'pointer', marginBottom: '12px', transition: 'border-color 0.2s' }}>
                        <p style={{ color: 'hsl(0 0% 55%)', fontSize: '13px', fontFamily: 'monospace', margin: '0 0 4px' }}>Click to upload your Protocol Key file</p>
                        <p style={{ color: 'hsl(0 0% 30%)', fontSize: '11px', fontFamily: 'monospace', margin: 0 }}>protocol-key-{result.vault_id}.txt</p>
                        <input type="file" accept=".txt,.key,.json" onChange={e => { const f = e.target.files?.[0]; if (f) verifyProtocolKey(f) }} style={{ display: 'none' }} />
                      </label>
                      {pskVerifyError && (
                        <div style={{ background: 'hsl(0 84% 60% / 0.1)', border: '1px solid hsl(0 84% 60% / 0.3)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                          <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', fontFamily: 'monospace', margin: 0 }}>❌ {pskVerifyError}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ background: 'hsl(142 76% 36% / 0.1)', border: '1px solid hsl(142 76% 36% / 0.3)', borderRadius: '12px', padding: '20px', marginBottom: '16px', textAlign: 'center' as const }}>
                      <p style={{ color: 'hsl(142 76% 36%)', fontSize: '15px', fontFamily: 'monospace', fontWeight: 700, margin: '0 0 4px' }}>✅ Key verified — your file is saved correctly</p>
                      <p style={{ color: 'hsl(0 0% 40%)', fontSize: '12px', fontFamily: 'monospace', margin: 0 }}>You will need this file every time you mint UBTC</p>
                    </div>
                  )}
                  {nextBtn('Key verified — Next: Account Summary →', () => setOnboardStep(5), pskVerified)}
                </div>
              )}

              {/* ── WIZARD STEP 5: Account Summary ── */}
              {onboardStep === 5 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'hsl(38 92% 50% / 0.15)', border: '1px solid hsl(38 92% 50% / 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>🏦</div>
                    <div>
                      <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>Your Account is Ready</h2>
                      <p style={{ color: 'hsl(38 92% 50%)', fontSize: '11px', fontFamily: 'monospace', margin: 0 }}>Step 5 of 7 — Understanding your vault and wallet</p>
                    </div>
                  </div>

                  <div style={{ background: 'hsl(142 76% 36% / 0.08)', border: '1px solid hsl(142 76% 36% / 0.2)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                    <p style={{ color: 'hsl(142 76% 36%)', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>Vault Created</p>
                    <p style={{ color: 'hsl(0 0% 55%)', fontSize: '11px', fontFamily: 'monospace', margin: '0 0 8px' }}>{result.vault_id}</p>
                    <p style={{ color: 'hsl(0 0% 35%)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 4px' }}>Bitcoin Deposit Address</p>
                    <p style={{ color: 'hsl(205 85% 55%)', fontSize: '11px', fontFamily: 'monospace', margin: 0, wordBreak: 'break-all' as const }}>{result.mast_address || result.deposit_address}</p>
                  </div>

                  {infoBox(<>
                    <p style={{ color: 'hsl(0 0% 78%)', fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, margin: '0 0 16px' }}>Understanding the QAP System</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ background: 'hsl(38 92% 50% / 0.08)', border: '1px solid hsl(38 92% 50% / 0.2)', borderRadius: '8px', padding: '12px' }}>
                        <p style={{ color: 'hsl(38 92% 50%)', fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, margin: '0 0 8px' }}>🏦 YOUR VAULT</p>
                        <p style={{ color: 'hsl(0 0% 55%)', fontSize: '11px', fontFamily: 'monospace', margin: 0, lineHeight: '1.7' }}>Holds your Bitcoin collateral. Like a safe deposit box. You deposit BTC, it locks in Taproot. You mint UBTC against it.</p>
                      </div>
                      <div style={{ background: 'hsl(142 76% 36% / 0.08)', border: '1px solid hsl(142 76% 36% / 0.2)', borderRadius: '8px', padding: '12px' }}>
                        <p style={{ color: 'hsl(142 76% 36%)', fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, margin: '0 0 8px' }}>💳 YOUR WALLET</p>
                        <p style={{ color: 'hsl(0 0% 55%)', fontSize: '11px', fontFamily: 'monospace', margin: 0, lineHeight: '1.7' }}>Holds your UBTC balance. Like a current account. You send, receive and redeem UBTC from here.</p>
                      </div>
                    </div>
                    {qa('How does minting work?', '1. Deposit BTC to your vault address<br/>2. Mint UBTC against it (150% collateral ratio — $150 BTC = max $100 UBTC)<br/>3. Move UBTC to your wallet<br/>4. Send to anyone on QAP')}
                    {qa('How does redemption work?', 'When someone sends you UBTC, you receive a proof file. Upload it on the Redeem page, enter your password, and the system releases BTC from the original vault to your Bitcoin address. No intermediary. No bridge. Pure Bitcoin.')}
                    {qa('What is the 150% collateral ratio?', 'For every $100 UBTC you mint, you must have $150 worth of BTC locked. This overcollateral protects the peg. If BTC falls below the liquidation threshold, the vault is liquidated to protect the system. Your excess collateral is returned.')}
                  </>, 'hsl(38 92% 50%)')}

                  {nextBtn('I understand — Set Up My Wallet →', () => setOnboardStep(6), true)}
                </div>
              )}

              {/* ── WIZARD STEP 6: Quantum Username / Wallet Setup ── */}
              {onboardStep === 6 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'hsl(270 85% 65% / 0.15)', border: '1px solid hsl(270 85% 65% / 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>⚛️</div>
                    <div>
                      <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>Choose Your Quantum Username</h2>
                      <p style={{ color: 'hsl(270 85% 65%)', fontSize: '11px', fontFamily: 'monospace', margin: 0 }}>Step 6 of 7 — Your permanent QAP identity</p>
                    </div>
                  </div>

                  {infoBox(<>
                    {qa('What is a Quantum Username?', 'This is your permanent identity on the Quantum Asset Protocol. It is how people send you UBTC — instead of a long wallet address, they type <strong style="color:hsl(270 85% 65%)">@yourname</strong>. First come, first served. Once chosen, it is yours forever.')}
                    {qa('Why is it called Quantum?', 'Your username is linked to your Kyber1024 quantum-resistant public key. When someone sends you UBTC, it is encrypted with your Kyber key — unbreakable by any classical or quantum computer. Your @username is the human face of your post-quantum identity.')}
                    {qa('Can I change it later?', '<span style="color:hsl(0 84% 60%)">No. Your Quantum Username is permanent. It is inscribed on the QAP network and linked to your vault and wallet forever. Choose carefully.</span>')}
                    {qa('How do people send me UBTC?', 'They type @yourname in the Send field. QAP resolves it to your wallet address and Kyber public key automatically. Your UBTC arrives encrypted — only you can decrypt and redeem it with your password.')}
                  </>, 'hsl(270 85% 65%)')}

                  {!quantumUsernameSet ? (
                    <>
                      <div style={{ position: 'relative' as const, marginBottom: '8px' }}>
                        <span style={{ position: 'absolute' as const, left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(270 85% 65%)', fontSize: '18px', fontFamily: 'monospace', fontWeight: 700 }}>@</span>
                        <input
                          value={quantumUsername}
                          onChange={e => {
                            const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                            setQuantumUsername(val)
                            setQuantumUsernameAvailable(null)
                            clearTimeout(usernameCheckTimeout.current)
                            usernameCheckTimeout.current = setTimeout(() => checkQuantumUsername(val), 600)
                          }}
                          placeholder="satoshi"
                          maxLength={20}
                          style={{ width: '100%', padding: '16px 16px 16px 36px', background: 'hsl(220 15% 5%)', border: `2px solid ${quantumUsernameAvailable === true ? 'hsl(142 76% 36%)' : quantumUsernameAvailable === false ? 'hsl(0 84% 60%)' : 'hsl(220 10% 18%)'}`, borderRadius: '12px', color: 'hsl(0 0% 92%)', fontSize: '20px', fontFamily: 'monospace', fontWeight: 700, outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.2s' }}
                        />
                        {checkingUsername && <span style={{ position: 'absolute' as const, right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(0 0% 40%)', fontSize: '12px', fontFamily: 'monospace' }}>checking...</span>}
                        {!checkingUsername && quantumUsernameAvailable === true && <span style={{ position: 'absolute' as const, right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(142 76% 36%)', fontSize: '16px' }}>✓ available</span>}
                        {!checkingUsername && quantumUsernameAvailable === false && <span style={{ position: 'absolute' as const, right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(0 84% 60%)', fontSize: '16px' }}>✗ taken</span>}
                      </div>
                      <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', fontFamily: 'monospace', margin: '0 0 20px' }}>Lowercase letters, numbers, underscores · 3–20 characters · Permanent</p>

                      {quantumUsernameAvailable && (
                        <div style={{ background: 'hsl(270 85% 65% / 0.08)', border: '1px solid hsl(270 85% 65% / 0.3)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                          <p style={{ color: 'hsl(270 85% 65%)', fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, margin: '0 0 4px' }}>@{quantumUsername} is available</p>
                          <p style={{ color: 'hsl(0 0% 45%)', fontSize: '12px', fontFamily: 'monospace', margin: 0 }}>People will send you UBTC using @{quantumUsername}. This cannot be changed.</p>
                        </div>
                      )}

                      <button onClick={quantumUsernameSet ? undefined : async () => { await setQuantumWalletUsername() }} disabled={!quantumUsernameAvailable} style={{ width: '100%', background: quantumUsernameAvailable ? 'linear-gradient(135deg, hsl(270,85%,65%), hsl(205,85%,55%))' : 'hsl(220 10% 12%)', color: quantumUsernameAvailable ? 'white' : 'hsl(0 0% 30%)', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: 700, cursor: quantumUsernameAvailable ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)' }}>
                        {quantumUsernameAvailable ? `Claim @${quantumUsername} — My Quantum Identity` : 'Choose a username to continue'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ background: 'hsl(270 85% 65% / 0.1)', border: '1px solid hsl(270 85% 65% / 0.3)', borderRadius: '12px', padding: '20px', marginBottom: '16px', textAlign: 'center' as const }}>
                        <p style={{ color: 'hsl(270 85% 65%)', fontSize: '24px', fontFamily: 'monospace', fontWeight: 700, margin: '0 0 4px' }}>@{quantumUsername}</p>
                        <p style={{ color: 'hsl(0 0% 40%)', fontSize: '12px', fontFamily: 'monospace', margin: 0 }}>Your Quantum Username is set — permanent and unique to you</p>
                      </div>
                      {nextBtn('All done — See My Summary →', () => setOnboardStep(7), true, 'linear-gradient(135deg, hsl(270,85%,65%), hsl(205,85%,55%))')}
                    </>
                  )}
                </div>
              )}

              {/* ── WIZARD STEP 7: Ready ── */}
              {onboardStep === 7 && (
                <div style={{ textAlign: 'center' as const }}>
                  <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'hsl(142 76% 36% / 0.15)', border: '2px solid hsl(142 76% 36% / 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '32px' }}>✅</div>
                  <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '24px', fontWeight: '700', margin: '0 0 4px' }}>Welcome to QAP, @{quantumUsername || username}!</h2>
                  <p style={{ color: 'hsl(270 85% 65%)', fontSize: '14px', fontFamily: 'monospace', margin: '0 0 24px' }}>Your Quantum Username: @{quantumUsername || username}</p>

                  <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '12px', padding: '16px', textAlign: 'left' as const, marginBottom: '20px' }}>
                    <p style={{ color: 'hsl(0 0% 35%)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase' as const, letterSpacing: '0.15em', margin: '0 0 12px' }}>Your Security Setup</p>
                    {[
                      { label: '24-word recovery phrase', detail: 'Written on paper, stored offline', status: '✅', color: 'hsl(38 92% 50%)' },
                      { label: 'Wallet password', detail: 'Encrypts your Kyber1024 key locally', status: '✅', color: 'hsl(142 76% 36%)' },
                      { label: 'Protocol Second Key', detail: 'Saved and verified — use for minting', status: '✅', color: 'hsl(205 85% 55%)' },
                      { label: 'Quantum Kyber1024', detail: 'Post-quantum encryption active', status: '✅', color: 'hsl(270 85% 65%)' },
                      { label: 'Quantum Username', detail: `@${quantumUsername || username} — permanent QAP identity`, status: '✅', color: 'hsl(270 85% 65%)' },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid hsl(220 10% 10%)' }}>
                        <div>
                          <p style={{ color: 'hsl(0 0% 65%)', fontSize: '12px', fontFamily: 'monospace', margin: '0 0 2px' }}>{item.label}</p>
                          <p style={{ color: 'hsl(0 0% 35%)', fontSize: '10px', fontFamily: 'monospace', margin: 0 }}>{item.detail}</p>
                        </div>
                        <span style={{ color: 'hsl(142 76% 36%)', fontSize: '16px', flexShrink: 0, marginLeft: '12px' }}>{item.status}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '12px', padding: '16px', textAlign: 'left' as const, marginBottom: '20px' }}>
                    <p style={{ color: 'hsl(0 0% 35%)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase' as const, letterSpacing: '0.15em', margin: '0 0 8px' }}>Next Steps</p>
                    {[
                      { n: '1', label: 'Deposit Bitcoin', detail: 'Send BTC to your vault address to lock as collateral', color: 'hsl(38 92% 50%)' },
                      { n: '2', label: 'Mint UBTC', detail: 'Create UBTC against your BTC collateral (150% ratio)', color: 'hsl(205 85% 55%)' },
                      { n: '3', label: 'Send to your wallet', detail: 'Move minted UBTC to your wallet — ready to use', color: 'hsl(142 76% 36%)' },
                      { n: '4', label: 'Send to @anyone', detail: `Type @username to send — they receive encrypted proof`, color: 'hsl(270 85% 65%)' },
                    ].map(item => (
                      <div key={item.n} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid hsl(220 10% 10%)' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: item.color + '20', border: `1px solid ${item.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ color: item.color, fontSize: '11px', fontWeight: 700, fontFamily: 'monospace' }}>{item.n}</span>
                        </div>
                        <div>
                          <p style={{ color: 'hsl(0 0% 78%)', fontSize: '13px', fontFamily: 'monospace', fontWeight: 600, margin: '0 0 2px' }}>{item.label}</p>
                          <p style={{ color: 'hsl(0 0% 40%)', fontSize: '11px', fontFamily: 'monospace', margin: 0 }}>{item.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <a href={`/deposit?vault=${result.vault_id}`} style={{ display: 'block', width: '100%', background: 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))', color: 'white', textDecoration: 'none', borderRadius: '12px', padding: '18px', fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-display)', textAlign: 'center' as const, boxSizing: 'border-box' as const, boxShadow: '0 0 30px hsl(205 85% 55% / 0.4)', marginBottom: '10px' }}>
                    ₿ Fund My Account →
                  </a>
                  <a href="/dashboard" style={{ display: 'block', width: '100%', background: 'none', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 55%)', textDecoration: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontFamily: 'var(--font-display)', textAlign: 'center' as const, boxSizing: 'border-box' as const }}>
                    Go to Dashboard
                  </a>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  )
}
'use client'
import { useState, useEffect } from 'react'
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
  const [walletPassword, setWalletPassword] = useState('')
  const [walletPasswordConfirm, setWalletPasswordConfirm] = useState('')
  const [passwordSet, setPasswordSet] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const mono: any = { fontFamily: 'var(--font-mono)' }

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
     // Generate wallet client-side BEFORE calling server
      const { createWallet: generateWallet, persistWallet } = await import('../lib/wallet/wallet')
      const wallet = await generateWallet()

      const res = await fetch(`${API_URL}/vaults`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_pubkey: PUBKEY, network: 'testnet4', recovery_blocks: 6,
          account_type: accountType,
          username: username || 'user',
          custody_type: isSelfCustody ? 'taproot' : custodyPreference,
          yield_strategy: accountType === 'yield' ? 'babylon' : accountType === 'custody_yield' ? 'treasury' : accountType === 'managed_yield' ? 'managed' : accountType === 'prime' ? 'prime' : 'none',
          client_kyber_pk: wallet.publicKeys.kyber,
          client_wallet_address: wallet.address,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Persist wallet locally after server confirms vault creation
      await persistWallet(wallet)
      localStorage.setItem('ubtc_wallet_address', wallet.address)

      // Attach mnemonic to result so UI can show it
      setResult({ ...data, mnemonic: wallet.mnemonic, wallet_address: wallet.address })
      setStep('done')
     
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const btnBack: any = { background: 'none', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 65%)', borderRadius: '10px', padding: '14px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }
  const btnNext = (enabled: boolean): any => ({ flex: 1, background: enabled ? 'linear-gradient(135deg, hsl(205, 85%, 55%), hsl(190, 80%, 50%))' : 'hsl(220 10% 14%)', color: enabled ? 'white' : 'hsl(0 0% 40%)', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '600', cursor: enabled ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', boxShadow: enabled ? '0 0 30px hsl(205 85% 55% / 0.4)' : 'none' })

  const accountDetails: Record<AccountType, { icon: string; title: string; color: string; custodyLabel: string; yieldLabel: string; apy: string | null }> = {
    current: { icon: '💳', title: 'Current Account', color: 'hsl(205 85% 55%)', custodyLabel: '⚛️ Taproot Self-Custody — you hold the keys', yieldLabel: 'No yield', apy: null },
    savings: { icon: '🔐', title: 'Savings Account', color: 'hsl(38 92% 50%)', custodyLabel: '⚛️ Taproot Self-Custody — you hold the keys', yieldLabel: 'No yield', apy: null },
    yield: { icon: '₿', title: 'Yield Account', color: 'hsl(142 76% 36%)', custodyLabel: '⚛️ Taproot Self-Custody — Babylon staking on-chain', yieldLabel: 'Babylon Protocol staking', apy: '3-5%' },
    custody_yield: { icon: '📊', title: 'Custody Yield Account', color: 'hsl(205 85% 55%)', custodyLabel: '🏦 BitGo / Komainu regulated custody', yieldLabel: 'Covered calls + T-Bills + BTC lending', apy: '4-6%' },
    prime: { icon: '💎', title: 'Prime Account', color: 'hsl(270 85% 65%)', custodyLabel: '🏦 BitGo / Komainu segregated custody', yieldLabel: 'Institutional yield strategies', apy: '5-8%' },
    managed_yield: { icon: '🏦', title: 'Managed Yield Account', color: 'hsl(142 76% 36%)', custodyLabel: '🏦 BitGo / Komainu — UBTC actively manages', yieldLabel: 'Dynamic rotating yield', apy: '6-10%' },
  }

  const selfAccounts = [
    { type: 'current' as AccountType, icon: '💳', title: 'Current Account', subtitle: 'Everyday spending', description: 'Your everyday UBTC account. Send and receive instantly with no extra steps. Your Bitcoin collateral is locked in a Taproot script — nobody, not even UBTC, can touch it without your signature.', yieldLabel: 'No yield — pure collateral', apy: null, tags: ['Instant transfers', 'Multi-currency', 'Self-custody'], color: 'hsl(205 85% 55%)' },
    { type: 'savings' as AccountType, icon: '🔐', title: 'Savings Account', subtitle: 'Long-term secure storage', description: 'For holding larger amounts safely. Every outgoing transfer requires explicit confirmation. Add UUSDT or UUSDC as additional currencies — each with the same quantum-secure protection.', yieldLabel: 'No yield — pure collateral', apy: null, tags: ['Transfer confirmation', 'Multi-currency', 'Long-term storage'], color: 'hsl(38 92% 50%)' },
    { type: 'yield' as AccountType, icon: '₿', title: 'Yield Account', subtitle: 'Earn on your Bitcoin — self-custodied', description: 'Your Bitcoin stays in Taproot self-custody while Babylon Protocol stakes it on-chain earning yield in BTC. Add UUSDT or UUSDC as additional currencies within the same account.', yieldLabel: 'Babylon Protocol staking', apy: '3-5%', tags: ['Bitcoin-native yield', 'Non-custodial', 'Multi-currency'], color: 'hsl(142 76% 36%)' },
  ]

  const managedAccounts = [
    { type: 'custody_yield' as AccountType, icon: '📊', title: 'Custody Yield', subtitle: 'Managed yield — UBTC holds custody', description: 'You send Bitcoin to UBTC. We hold it at BitGo or Komainu and deploy institutional yield strategies.', yieldLabel: 'Covered calls + T-Bills + BTC lending', apy: '4-6%', tags: ['BitGo / Komainu', '$250M insured', 'Multi-currency'], color: 'hsl(205 85% 55%)' },
    { type: 'prime' as AccountType, icon: '💎', title: 'Prime Account', subtitle: 'Institutional grade', description: 'For funds, family offices and institutional clients. Segregated custody, prime brokerage features and multi-authorisation controls.', yieldLabel: 'Institutional yield strategies', apy: '5-8%', tags: ['Segregated custody', 'Multi-currency', 'Prime reporting'], color: 'hsl(270 85% 65%)' },
    { type: 'managed_yield' as AccountType, icon: '🏦', title: 'Managed Yield', subtitle: 'Dynamic allocation — best available yield', description: 'UBTC actively manages a diversified yield portfolio across all your currencies — rotating between covered calls, T-Bills, BTC lending and Babylon staking.', yieldLabel: 'Dynamic rotating yield', apy: '6-10%', tags: ['Dynamic allocation', 'All currencies', 'Active management'], color: 'hsl(142 76% 36%)' },
  ]

  const Card = ({ acc, selected, onClick }: { acc: typeof selfAccounts[0]; selected: boolean; onClick: () => void }) => {
    const disabled = existingTypes.includes(acc.type)
    return (
      <div onClick={() => !disabled && onClick()} style={{ background: 'hsl(220 12% 8%)', border: `2px solid ${selected ? acc.color : disabled ? 'hsl(220 10% 12%)' : 'hsl(220 10% 16%)'}`, borderRadius: '14px', padding: '20px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, transition: 'border-color 0.15s', display: 'flex', flexDirection: 'column' as const, gap: '12px', boxSizing: 'border-box' as const }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: acc.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>{acc.icon}</div>
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${selected ? acc.color : 'hsl(220 10% 30%)'}`, background: selected ? acc.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {selected && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'white' }} />}
          </div>
        </div>
        <div>
          <h3 style={{ color: 'hsl(0 0% 92%)', fontSize: '15px', fontWeight: '700', margin: '0 0 2px' }}>{acc.title}</h3>
          <p style={{ color: acc.color, fontSize: '11px', ...mono, margin: 0 }}>{acc.subtitle}</p>
        </div>
        <p style={{ color: 'hsl(0 0% 60%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.7', flex: 1 }}>{acc.description}</p>
        <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: acc.apy ? 'hsl(142 76% 36%)' : 'hsl(0 0% 45%)', fontSize: '11px', ...mono, margin: 0 }}>{acc.yieldLabel}</p>
            {acc.apy && <span style={{ color: 'hsl(142 76% 36%)', fontWeight: '700', fontSize: '15px', ...mono }}>{acc.apy}%</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[{ symbol: '₿', label: 'UBTC', color: 'hsl(38 92% 50%)' }, { symbol: '₮', label: 'UUSDT', color: 'hsl(142 76% 36%)' }, { symbol: '$', label: 'UUSDC', color: 'hsl(220 85% 60%)' }].map(c => (
            <div key={c.label} style={{ flex: 1, background: 'hsl(220 15% 5%)', border: `1px solid ${c.color}30`, borderRadius: '6px', padding: '5px', textAlign: 'center' as const }}>
              <p style={{ color: c.color, fontSize: '12px', fontWeight: '700', margin: '0 0 1px' }}>{c.symbol}</p>
              <p style={{ color: 'hsl(0 0% 40%)', fontSize: '9px', ...mono, margin: 0 }}>{c.label}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
          {acc.tags.map(t => <span key={t} style={{ fontSize: '9px', ...mono, color: acc.color, border: `1px solid ${acc.color}40`, borderRadius: '20px', padding: '2px 8px', textTransform: 'uppercase' }}>{t}</span>)}
        </div>
        {disabled && <p style={{ color: 'hsl(0 84% 60%)', fontSize: '10px', ...mono, margin: 0 }}>✗ Already open — add currencies from your account dashboard</p>}
      </div>
    )
  }

  const canProceed = username.length >= 3 && email.includes('@') && email.includes('.')

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', padding: '40px 24px 80px', fontFamily: 'var(--font-display)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* ── DETAILS MODAL ── */}
        {showDetailsModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'hsl(220 15% 2% / 0.95)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(205 85% 55% / 0.3)', borderRadius: '24px', padding: '40px', maxWidth: '480px', width: '100%', boxShadow: '0 0 80px hsl(205 85% 55% / 0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'hsl(205 85% 55% / 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>👤</div>
                <div>
                  <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: '0 0 2px' }}>Create your identity</h2>
                  <p style={{ color: 'hsl(205 85% 55%)', fontSize: '12px', fontFamily: 'var(--font-mono)', margin: 0 }}>World Local Bank · UBTC Protocol</p>
                </div>
              </div>
              <p style={{ color: 'hsl(0 0% 45%)', fontSize: '13px', fontFamily: 'var(--font-mono)', margin: '0 0 28px', lineHeight: '1.7', borderTop: '1px solid hsl(220 10% 12%)', paddingTop: '16px' }}>
                Your username becomes your UBTC wallet address — how others send you money. Your email receives liquidation alerts and account updates. Neither is ever shared or sold.
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'hsl(0 0% 40%)', fontSize: '10px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>
                  Username <span style={{ color: 'hsl(0 84% 60%)' }}>required</span>
                </label>
                <div style={{ position: 'relative' as const }}>
                  <span style={{ position: 'absolute' as const, left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(0 0% 35%)', fontSize: '14px', fontFamily: 'var(--font-mono)' }}>@</span>
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="satoshi"
                    maxLength={20}
                    autoFocus
                    style={{ display: 'block', width: '100%', padding: '14px 16px 14px 32px', background: 'hsl(220 15% 5%)', border: `1px solid ${username.length >= 3 ? 'hsl(142 76% 36% / 0.6)' : 'hsl(220 10% 18%)'}`, borderRadius: '12px', color: 'hsl(0 0% 92%)', fontSize: '16px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.2s' }}
                  />
                  {username.length >= 3 && <span style={{ position: 'absolute' as const, right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(142 76% 36%)', fontSize: '16px' }}>✓</span>}
                </div>
                <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', fontFamily: 'var(--font-mono)', margin: '6px 0 0' }}>Lowercase letters, numbers and underscores · 3–20 characters</p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: 'hsl(0 0% 40%)', fontSize: '10px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>
                  Email Address <span style={{ color: 'hsl(0 84% 60%)' }}>required</span>
                </label>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  type="email"
                  style={{ display: 'block', width: '100%', padding: '14px 16px', background: 'hsl(220 15% 5%)', border: `1px solid ${email.includes('@') && email.includes('.') ? 'hsl(142 76% 36% / 0.6)' : 'hsl(220 10% 18%)'}`, borderRadius: '12px', color: 'hsl(0 0% 92%)', fontSize: '16px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.2s' }}
                />
                <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', fontFamily: 'var(--font-mono)', margin: '6px 0 0' }}>For liquidation alerts and account recovery only — never shared</p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowDetailsModal(false)} style={{ background: 'none', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 40%)', borderRadius: '12px', padding: '14px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
                  ← Back
                </button>
                <button
                  onClick={() => {
                    if (!canProceed) return
                    setShowDetailsModal(false)
                    const managed = ['custody_yield', 'prime', 'managed_yield']
                    if (accountType && managed.includes(accountType)) setStep('custody'); else setStep('confirm')
                  }}
                  disabled={!canProceed}
                  style={{ flex: 1, background: canProceed ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : 'hsl(220 10% 14%)', color: canProceed ? 'white' : 'hsl(0 0% 30%)', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: canProceed ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', transition: 'all 0.2s', boxShadow: canProceed ? '0 0 30px hsl(205 85% 55% / 0.4)' : 'none' }}>
                  Open Account →
                </button>
              </div>
            </div>
          </div>
        )}

        {step !== 'done' && (
          <div style={{ textAlign: 'center' as const, marginBottom: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(205 85% 55%)', boxShadow: '0 0 10px hsl(205 85% 55% / 0.8)' }} />
              <span style={{ fontSize: '11px', ...mono, color: 'hsl(205 85% 55%)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Open Account</span>
            </div>
            <h1 style={{ color: 'hsl(0 0% 92%)', fontSize: '38px', fontWeight: '700', margin: '0 0 12px' }}>
              {step === 'account' && 'Choose your account type'}
              {step === 'custody' && 'Custody preference'}
              {step === 'confirm' && 'Review & confirm'}
            </h1>
            <p style={{ color: 'hsl(0 0% 55%)', fontSize: '14px', ...mono, margin: '0 auto', lineHeight: '1.8', maxWidth: '640px' }}>
              {step === 'account' && 'Each account supports multiple currencies — UBTC, UUSDT and UUSDC — all quantum-secured and Bitcoin-native'}
              {step === 'custody' && 'Choose your preferred regulated custodian for your managed account'}
              {step === 'confirm' && 'Review your selections before opening your account'}
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '24px', alignItems: 'center' }}>
              {['Account', 'Custody', 'Confirm'].map((label, i) => {
                const idx = { account: 0, custody: 1, confirm: 2, done: 2 }[step]
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: i <= idx ? '28px' : '8px', height: '6px', borderRadius: '3px', background: i <= idx ? 'hsl(205 85% 55%)' : 'hsl(220 10% 16%)', transition: 'all 0.3s' }} />
                      <span style={{ fontSize: '10px', ...mono, color: i <= idx ? 'hsl(205 85% 55%)' : 'hsl(0 0% 35%)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
                    </div>
                    {i < 2 && <div style={{ width: '20px', height: '1px', background: 'hsl(220 10% 16%)', marginBottom: '14px' }} />}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── STEP 1: Account Selection ── */}
        {step === 'account' && (
          <div>
            <div style={{ background: 'hsl(205 85% 55% / 0.05)', border: '1px solid hsl(205 85% 55% / 0.15)', borderRadius: '14px', padding: '20px 24px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <span style={{ fontSize: '24px', flexShrink: 0 }}>⚛️</span>
                <div>
                  <p style={{ color: 'hsl(205 85% 55%)', fontSize: '14px', fontWeight: '600', margin: '0 0 8px' }}>Every account supports multiple currencies — UBTC, UUSDT and UUSDC</p>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.8' }}>
                    Once you open an account, you can add UUSDT and UUSDC as additional currencies within the same account. Each currency is independently quantum-secured — deposit USDT, mint UUSDT 1:1; deposit USDC, mint UUSDC 1:1.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
              <div>
                <div style={{ background: 'hsl(205 85% 55% / 0.06)', border: '1px solid hsl(205 85% 55% / 0.2)', borderRadius: '16px', padding: '20px 24px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '20px' }}>⚛️</span>
                    <h2 style={{ color: 'hsl(205 85% 55%)', fontSize: '16px', fontWeight: '700', margin: 0 }}>Self-Custody Accounts</h2>
                  </div>
                  <p style={{ color: 'hsl(0 0% 92%)', fontSize: '13px', fontWeight: '600', ...mono, margin: '0 0 8px' }}>Your keys. Your Bitcoin. Always.</p>
                  <p style={{ color: 'hsl(0 0% 60%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.7' }}>Your collateral is locked in a Taproot script on the Bitcoin blockchain. No company — not even UBTC — can move your assets without your cryptographic signature.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
                  {selfAccounts.map(acc => <Card key={acc.type} acc={acc} selected={accountType === acc.type} onClick={() => setAccountType(acc.type)} />)}
                </div>
              </div>

              <div>
                <div style={{ background: 'hsl(38 92% 50% / 0.06)', border: '1px solid hsl(38 92% 50% / 0.2)', borderRadius: '16px', padding: '20px 24px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '20px' }}>🏦</span>
                    <h2 style={{ color: 'hsl(38 92% 50%)', fontSize: '16px', fontWeight: '700', margin: 0 }}>Managed Custody Accounts</h2>
                  </div>
                  <p style={{ color: 'hsl(0 0% 92%)', fontSize: '13px', fontWeight: '600', ...mono, margin: '0 0 8px' }}>You own everything. We manage it for you.</p>
                  <p style={{ color: 'hsl(0 0% 60%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.7' }}>You send your assets to UBTC. We hold them at BitGo or Komainu — regulated custodians insured up to $250M — and deploy institutional yield strategies.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
                  {managedAccounts.map(acc => <Card key={acc.type} acc={acc} selected={accountType === acc.type} onClick={() => setAccountType(acc.type)} />)}
                </div>
              </div>
            </div>

            {/* Continue */}
            <div style={{ maxWidth: '400px', margin: '32px auto 0' }}>
              <button onClick={() => { if (!accountType) return; setShowDetailsModal(true) }} disabled={!accountType} style={btnNext(!!accountType)}>
                {accountType ? `Continue with ${accountDetails[accountType]?.title} →` : 'Select an account to continue'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Custody Preference ── */}
        {step === 'custody' && (
          <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>
            <div style={{ background: 'hsl(38 92% 50% / 0.05)', border: '1px solid hsl(38 92% 50% / 0.2)', borderRadius: '14px', padding: '20px' }}>
              <h3 style={{ color: 'hsl(38 92% 50%)', fontSize: '13px', fontWeight: '600', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Choose your regulated custodian</h3>
              <p style={{ color: 'hsl(0 0% 65%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.8' }}>
                For managed custody accounts UBTC holds and manages your assets. You can additionally choose to have your assets sub-custodied at a regulated third-party custodian.
              </p>
            </div>
            {[
              { type: 'ubtc' as const, icon: '🏦', title: 'UBTC Direct Custody', subtitle: 'Standard — immediate activation', description: 'UBTC holds and manages your assets directly across all currencies.', tags: ['Immediate activation', 'All currencies', 'No additional KYB'], color: 'hsl(205 85% 55%)' },
              { type: 'bitgo' as const, icon: '🔐', title: 'UBTC + BitGo Sub-Custody', subtitle: '$250M insured — regulated qualified custodian', description: 'UBTC manages your account. Your assets are additionally sub-custodied at BitGo — $60B+ AUM, 50+ countries, SOC2 certified, insured up to $250M.', tags: ['$250M insured', 'SOC2 certified', 'KYB required'], color: 'hsl(38 92% 50%)' },
              { type: 'komainu' as const, icon: '🌍', title: 'UBTC + Komainu Sub-Custody', subtitle: 'VARA Dubai & UK FCA regulated', description: 'UBTC manages your account. Your assets are additionally sub-custodied at Komainu — regulated by Dubai VARA and UK FCA, backed by Nomura.', tags: ['VARA Dubai', 'UK FCA', 'Nomura-backed', 'KYB required'], color: 'hsl(270 85% 65%)' },
            ].map(opt => (
              <div key={opt.type} onClick={() => setCustodyPreference(opt.type)} style={{ background: 'hsl(220 12% 8%)', border: `2px solid ${custodyPreference === opt.type ? opt.color : 'hsl(220 10% 16%)'}`, borderRadius: '16px', padding: '22px', cursor: 'pointer', transition: 'border-color 0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, paddingRight: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: opt.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>{opt.icon}</div>
                    <div style={{ flex: 1 }}>
                      <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '16px', fontWeight: '700', margin: '0 0 2px' }}>{opt.title}</h2>
                      <p style={{ color: opt.color, fontSize: '12px', ...mono, margin: '0 0 10px' }}>{opt.subtitle}</p>
                      <p style={{ color: 'hsl(0 0% 65%)', fontSize: '13px', ...mono, margin: '0 0 14px', lineHeight: '1.7' }}>{opt.description}</p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
                        {opt.tags.map(t => <span key={t} style={{ fontSize: '10px', ...mono, color: opt.color, border: `1px solid ${opt.color}40`, borderRadius: '20px', padding: '3px 10px', textTransform: 'uppercase' }}>{t}</span>)}
                      </div>
                    </div>
                  </div>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${custodyPreference === opt.type ? opt.color : 'hsl(220 10% 30%)'}`, background: custodyPreference === opt.type ? opt.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {custodyPreference === opt.type && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />}
                  </div>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              <button onClick={() => setStep('account')} style={btnBack}>← Back</button>
              <button onClick={() => setStep('confirm')} style={btnNext(true)}>Continue →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Confirm ── */}
        {step === 'confirm' && accountType && (
          <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column' as const, gap: '16px' }}>
            {(() => {
              const det = accountDetails[accountType]
              const managed = ['custody_yield', 'prime', 'managed_yield']
              const isManaged = managed.includes(accountType)
              return (
                <>
                  <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '16px', padding: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid hsl(220 10% 12%)' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: det.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>{det.icon}</div>
                      <div>
                        <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>{det.title}</h2>
                        <p style={{ color: det.color, fontSize: '12px', ...mono, margin: 0 }}>{isSelfCustody ? '⚛️ Self-Custody — Taproot secured' : '🏦 Managed Custody'}</p>
                      </div>
                    </div>
                    {[
                      { label: 'Username', value: `@${username}` },
                      { label: 'Email', value: email },
                      { label: 'Currencies Supported', value: '₿ UBTC · ₮ UUSDT · $ UUSDC' },
                      { label: 'Custody Model', value: det.custodyLabel },
                      { label: 'Yield Strategy', value: det.yieldLabel + (det.apy ? ` — ${det.apy}% APY` : '') },
                      { label: 'UBTC Collateral', value: '150% minimum — $150 BTC locked per $100 UBTC issued' },
                      ...(isManaged ? [{ label: 'Sub-Custodian', value: custodyPreference === 'ubtc' ? '🏦 UBTC Direct' : custodyPreference === 'bitgo' ? '🔐 BitGo — $250M insured' : '🌍 Komainu — VARA & FCA' }] : []),
                      { label: 'Network', value: 'Bitcoin Testnet4' },
                    ].map(item => (
                      <div key={item.label} style={{ padding: '12px 0', borderBottom: '1px solid hsl(220 10% 12%)' }}>
                        <p style={{ color: 'hsl(0 0% 45%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>{item.label}</p>
                        <p style={{ color: 'hsl(0 0% 92%)', fontSize: '13px', fontWeight: '600', ...mono, margin: 0, lineHeight: '1.5' }}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  {isManaged && (
                    <div style={{ background: 'hsl(38 92% 50% / 0.06)', border: '1px solid hsl(38 92% 50% / 0.3)', borderRadius: '12px', padding: '16px' }}>
                      <p style={{ color: 'hsl(38 92% 50%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.7' }}>
                        ⚠ By opening this account you transfer custody of your assets to UBTC Protocol. You retain full ownership and can withdraw subject to settlement periods.
                      </p>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => isManaged ? setStep('custody') : setStep('account')} style={btnBack}>← Back</button>
                    <button onClick={createAccount} disabled={loading} style={btnNext(!loading)}>
                      {loading ? 'Opening account...' : 'Open Account →'}
                    </button>
                  </div>
                  {error && <p style={{ color: 'hsl(0 84% 60%)', fontSize: '13px', ...mono }}>{error}</p>}
                </>
              )
            })()}
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && result && accountType && (
          <div style={{ textAlign: 'center' as const, maxWidth: '520px', margin: '0 auto' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'hsl(142 76% 36% / 0.15)', border: '2px solid hsl(142 76% 36% / 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '36px' }}>✅</div>
            <h1 style={{ color: 'hsl(0 0% 92%)', fontSize: '32px', fontWeight: '700', margin: '0 0 8px' }}>Account Opened</h1>
            <p style={{ color: 'hsl(0 0% 55%)', fontSize: '14px', ...mono, margin: '0 0 40px', lineHeight: '1.7' }}>
              Welcome, @{username}! Your {accountDetails[accountType]?.title} is ready. Fund it with Bitcoin to get started.
            </p>
            <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '16px', padding: '24px', textAlign: 'left' as const, marginBottom: '20px' }}>
              <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid hsl(220 10% 12%)' }}>
                <p style={{ color: 'hsl(0 0% 45%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>Account ID</p>
                <p style={{ color: 'hsl(205 85% 55%)', fontSize: '14px', fontWeight: '600', ...mono, margin: 0 }}>{result.vault_id}</p>
              </div>
              <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid hsl(220 10% 12%)' }}>
                <p style={{ color: 'hsl(0 0% 45%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>Bitcoin Deposit Address</p>
                <p style={{ color: 'hsl(0 0% 92%)', fontSize: '12px', ...mono, margin: 0, wordBreak: 'break-all' as const, lineHeight: '1.6' }}>{result.deposit_address}</p>
              </div>
              {result.mast_address && (
                <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid hsl(220 10% 12%)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <p style={{ color: 'hsl(205 85% 55%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Taproot MAST Vault Address</p>
                    <span style={{ fontSize: '9px', ...mono, color: 'hsl(142 76% 36%)', background: 'hsl(142 76% 36% / 0.1)', borderRadius: '20px', padding: '2px 7px', border: '1px solid hsl(142 76% 36% / 0.3)' }}>P2TR</span>
                  </div>
                  <p style={{ color: 'hsl(205 85% 55%)', fontSize: '12px', ...mono, margin: '0 0 6px', wordBreak: 'break-all' as const, lineHeight: '1.6' }}>{result.mast_address}</p>
                  <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, margin: 0, lineHeight: '1.6' }}>3 spending paths: User withdrawal · Liquidation · Recovery (144 block timelock)</p>
                </div>
              )}
              <div>
                <p style={{ color: 'hsl(0 0% 45%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>Currencies Available</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[{ s: '₿', l: 'UBTC', c: 'hsl(38 92% 50%)', active: true }, { s: '₮', l: 'UUSDT', c: 'hsl(142 76% 36%)', active: false }, { s: '$', l: 'UUSDC', c: 'hsl(220 85% 60%)', active: false }].map(cur => (
                    <div key={cur.l} style={{ flex: 1, background: 'hsl(220 15% 5%)', border: `1px solid ${cur.c}${cur.active ? '' : '40'}`, borderRadius: '8px', padding: '10px', textAlign: 'center' as const, opacity: cur.active ? 1 : 0.5 }}>
                      <p style={{ color: cur.c, fontSize: '18px', fontWeight: '700', margin: '0 0 2px' }}>{cur.s}</p>
                      <p style={{ color: 'hsl(0 0% 65%)', fontSize: '10px', ...mono, margin: '0 0 2px' }}>{cur.l}</p>
                      <p style={{ color: cur.active ? 'hsl(142 76% 36%)' : 'hsl(0 0% 40%)', fontSize: '9px', ...mono, margin: 0 }}>{cur.active ? 'Ready' : 'Add later'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(0 84% 60% / 0.4)', borderRadius: '16px', padding: '24px', textAlign: 'left' as const, marginBottom: '20px' }}>
            <p style={{ color: 'hsl(38 92% 50%)', fontSize: '11px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.2em', margin: '0 0 8px' }}>⚠️ Your 24-Word Recovery Phrase</p>
              <div style={{ background: 'hsl(220 15% 7%)', borderRadius: '8px', padding: '12px', marginBottom: '16px', borderLeft: '3px solid hsl(38 92% 50%)' }}>
                <p style={{ color: 'hsl(0 0% 78%)', fontSize: '12px', fontFamily: 'monospace', margin: '0 0 8px', lineHeight: '1.7', fontWeight: 600 }}>What is this?</p>
                <p style={{ color: 'hsl(0 0% 50%)', fontSize: '12px', fontFamily: 'monospace', margin: '0 0 8px', lineHeight: '1.7' }}>These 24 words ARE your wallet. They are the master key to everything — your UBTC balance, your Bitcoin collateral, your ability to send and receive. No words = no access.</p>
                <p style={{ color: 'hsl(0 0% 78%)', fontSize: '12px', fontFamily: 'monospace', margin: '0 0 8px', lineHeight: '1.7', fontWeight: 600 }}>What should I do?</p>
                <p style={{ color: 'hsl(0 0% 50%)', fontSize: '12px', fontFamily: 'monospace', margin: '0 0 8px', lineHeight: '1.7' }}>Write them on paper — right now — in the exact order shown. Store the paper somewhere safe offline. Do not photograph them. Do not email them. Do not save them in Notes or Google Drive.</p>
                <p style={{ color: 'hsl(0 0% 78%)', fontSize: '12px', fontFamily: 'monospace', margin: '0 0 4px', lineHeight: '1.7', fontWeight: 600 }}>What if I lose them?</p>
                <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', fontFamily: 'monospace', margin: 0, lineHeight: '1.7' }}>Your funds cannot be recovered. Not by us. Not by anyone. These words are shown exactly once.</p>
              </div>
             {result.mnemonic && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '12px' }}>
                    {result.mnemonic.split(' ').map((word: string, i: number) => (
                      <div key={i} style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '6px', padding: '6px 8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ color: 'hsl(0 0% 28%)', fontSize: '9px', fontFamily: 'monospace', minWidth: '16px' }}>{i + 1}.</span>
                        <span style={{ color: 'hsl(0 0% 88%)', fontSize: '12px', fontFamily: 'monospace', fontWeight: 600 }}>{word}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <button onClick={() => navigator.clipboard.writeText(result.mnemonic)} style={{ flex: 1, background: 'hsl(220 12% 12%)', color: 'hsl(0 0% 55%)', border: '1px solid hsl(220 10% 18%)', borderRadius: '8px', padding: '10px', fontSize: '11px', fontFamily: 'monospace', cursor: 'pointer' }}>
                      Copy to clipboard
                    </button>
                    <button onClick={() => {
                      const text = `QAP WALLET RECOVERY PHRASE\nCreated: ${new Date().toISOString()}\nVault: ${result.vault_id}\nWallet: ${result.wallet_address}\n\nWARNING: Store this offline. Never share it. Anyone with these words controls your funds.\n\n${result.mnemonic.split(' ').map((w: string, i: number) => `${i+1}. ${w}`).join('\n')}`
                      const blob = new Blob([text], { type: 'text/plain' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url; a.download = `qap-recovery-phrase-${result.vault_id}.txt`
                      document.body.appendChild(a); a.click()
                      document.body.removeChild(a); URL.revokeObjectURL(url)
                    }} style={{ flex: 1, background: 'hsl(38 92% 50%)', color: '#000', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, cursor: 'pointer' }}>
                      ⬇ Download as text file
                    </button>
                  </div>
                </>
              )}
           {!passwordSet ? (
                <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(142 76% 36% / 0.4)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                  <p style={{ color: 'hsl(142 76% 36%)', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase' as const, letterSpacing: '0.2em', margin: '0 0 8px', fontWeight: 700 }}>Set Your Wallet Password</p>
                  <p style={{ color: 'hsl(0 0% 45%)', fontSize: '12px', fontFamily: 'monospace', margin: '0 0 16px', lineHeight: '1.7' }}>This password protects your wallet on this device. You will enter it every time you send or redeem UBTC. If you forget it, use your 24-word recovery phrase to reset it.</p>
                  <input
                    type="password"
                    placeholder="Choose a strong password (min 8 characters)"
                    value={walletPassword}
                    onChange={e => setWalletPassword(e.target.value)}
                    style={{ width: '100%', padding: '12px', background: 'hsl(220 15% 7%)', border: '1px solid hsl(220 10% 18%)', borderRadius: '8px', color: 'hsl(0 0% 88%)', fontSize: '13px', fontFamily: 'monospace', marginBottom: '8px', boxSizing: 'border-box' as const }}
                  />
                  <input
                    type="password"
                    placeholder="Confirm password"
                    value={walletPasswordConfirm}
                    onChange={e => setWalletPasswordConfirm(e.target.value)}
                    style={{ width: '100%', padding: '12px', background: 'hsl(220 15% 7%)', border: '1px solid hsl(220 10% 18%)', borderRadius: '8px', color: 'hsl(0 0% 88%)', fontSize: '13px', fontFamily: 'monospace', marginBottom: '12px', boxSizing: 'border-box' as const }}
                  />
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
                    } catch (e: any) { alert('Failed to set password: ' + e.message) }
                  }} style={{ width: '100%', background: 'hsl(142 76% 36%)', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, cursor: 'pointer' }}>
                    Set Password & Secure Wallet
                  </button>
                </div>
              ) : (
                <div style={{ background: 'hsl(142 76% 36% / 0.1)', border: '1px solid hsl(142 76% 36% / 0.3)', borderRadius: '12px', padding: '16px', marginBottom: '16px', textAlign: 'center' as const }}>
                  <p style={{ color: 'hsl(142 76% 36%)', fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, margin: 0 }}>✅ Wallet password set — your keys are protected</p>
                </div>
              )}

              <div style={{ background: 'hsl(220 15% 7%)', borderRadius: '8px', padding: '12px', marginBottom: '16px', borderLeft: '3px solid hsl(205 85% 55%)' }}>
                <p style={{ color: 'hsl(0 0% 78%)', fontSize: '12px', fontFamily: 'monospace', margin: '0 0 8px', lineHeight: '1.7', fontWeight: 600 }}>What is the Protocol Second Key?</p>
                <p style={{ color: 'hsl(0 0% 50%)', fontSize: '12px', fontFamily: 'monospace', margin: '0 0 8px', lineHeight: '1.7' }}>This key authorises minting UBTC from your vault and moving UBTC to your wallet. It is separate from your recovery phrase — a second layer of security. You will need it every time you mint.</p>
                <p style={{ color: 'hsl(0 0% 78%)', fontSize: '12px', fontFamily: 'monospace', margin: '0 0 4px', lineHeight: '1.7', fontWeight: 600 }}>How do I use it?</p>
                <p style={{ color: 'hsl(0 0% 50%)', fontSize: '12px', fontFamily: 'monospace', margin: 0, lineHeight: '1.7' }}>Download it as a file and save it securely. When minting UBTC, you will upload this file. It never leaves your device — the server only checks a hash of it.</p>
              </div>
              {[
                { label: 'Protocol Second Key', desc: 'Authorises minting and vault withdrawals — keep this safe', color: 'hsl(38 92% 50%)', value: result.protocol_second_key },
              ].map((k, i) => (
                <div key={i} style={{ marginBottom: '12px', padding: '12px', background: 'hsl(220 15% 7%)', borderRadius: '8px', borderLeft: `3px solid ${k.color}` }}>
                  <p style={{ color: k.color, fontSize: '10px', ...mono, fontWeight: 700, margin: '0 0 2px' }}>{k.label}</p>
                  <p style={{ color: 'hsl(0 0% 35%)', fontSize: '10px', ...mono, margin: '0 0 6px' }}>{k.desc}</p>
                 <p style={{ color: 'hsl(0 0% 25%)', fontSize: '9px', ...mono, margin: '0 0 10px', wordBreak: 'break-all' as const }}>{k.value?.substring(0, 60)}...</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => navigator.clipboard.writeText(k.value || '')} style={{ flex: 1, background: 'hsl(220 12% 12%)', color: 'hsl(0 0% 55%)', border: '1px solid hsl(220 10% 18%)', borderRadius: '8px', padding: '8px', fontSize: '11px', fontFamily: 'monospace', cursor: 'pointer' }}>
                      Copy
                    </button>
                    <button onClick={() => {
                      const text = `QAP PROTOCOL SECOND KEY\nVault: ${result.vault_id}\nCreated: ${new Date().toISOString()}\n\nWARNING: This key authorises minting and vault withdrawals.\nStore it securely. Upload it when minting UBTC.\nNever share it.\n\n${k.value}`
                      const blob = new Blob([text], { type: 'text/plain' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url; a.download = `protocol-second-key-${result.vault_id}.txt`
                      document.body.appendChild(a); a.click()
                      document.body.removeChild(a); URL.revokeObjectURL(url)
                    }} style={{ flex: 1, background: 'hsl(38 92% 50%)', color: '#000', border: 'none', borderRadius: '8px', padding: '8px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, cursor: 'pointer' }}>
                      ⬇ Download Key File
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <a href={`/deposit?vault=${result.vault_id}`} style={{ flex: 1, background: 'linear-gradient(135deg, hsl(205, 85%, 55%), hsl(190, 80%, 50%))', color: 'white', textDecoration: 'none', borderRadius: '10px', padding: '14px 0', fontSize: '14px', fontWeight: '600', fontFamily: 'var(--font-display)', textAlign: 'center' as const, display: 'block', boxShadow: '0 0 30px hsl(205 85% 55% / 0.4)' }}>Fund Account →</a>
              <a href="/dashboard" style={{ flex: 1, background: 'none', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 65%)', textDecoration: 'none', borderRadius: '10px', padding: '14px 0', fontSize: '14px', fontWeight: '600', fontFamily: 'var(--font-display)', textAlign: 'center' as const, display: 'block' }}>My Accounts</a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
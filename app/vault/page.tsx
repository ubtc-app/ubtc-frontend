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
  const [result, setResult] = useState<any>(null)
 const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
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
      const res = await fetch(`${API_URL}/vaults`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
             user_pubkey: PUBKEY, network: 'testnet4', recovery_blocks: 6,
         account_type: accountType,
          username: username || 'user',
          custody_type: isSelfCustody ? 'taproot' : custodyPreference,
          yield_strategy: accountType === 'yield' ? 'babylon' : accountType === 'custody_yield' ? 'treasury' : accountType === 'managed_yield' ? 'managed' : accountType === 'prime' ? 'prime' : 'none',
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
     setResult(data); setStep('done')
      // Store keys in session for immediate use
      if (data.qsk_private) sessionStorage.setItem('ubtc_qsk', data.qsk_private)
      if (data.kyber_sk) sessionStorage.setItem('ubtc_kyber_sk', data.kyber_sk)
      if (data.sphincs_sk) sessionStorage.setItem('ubtc_sphincs_sk', data.sphincs_sk)
      // Auto-download key file
      const keyData = {
       vault_id: data.vault_id,
        wallet_address: data.wallet_address,
        username: username || data.vault_id,
        created_at: new Date().toISOString(),
        warning: 'STORE THIS FILE SECURELY OFFLINE. NEVER SHARE IT.',
        protocol_second_key: { purpose: 'Authorises minting and withdrawals', key: data.protocol_second_key },
        key1_dilithium3_qsk: { purpose: 'Signs every UBTC transfer — your quantum identity', key: data.qsk_private },
        key2_sphincs_backup: { purpose: 'Backup quantum signing — different algorithm to KEY 1', key: data.sphincs_sk },
        key3_kyber_redemption: { purpose: 'Decrypts embedded BTC redemption — self-sovereign Bitcoin claim', key: data.kyber_sk }
      }
      const blob = new Blob([JSON.stringify(keyData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
     a.href = url; a.download = `ubtc-keys-${username || data.vault_id}-${Date.now()}.json`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
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
    { type: 'current' as AccountType, icon: '💳', title: 'Current Account', subtitle: 'Everyday spending', description: 'Your everyday UBTC account. Send and receive instantly with no extra steps. Your Bitcoin collateral is locked in a Taproot script — nobody, not even UBTC, can touch it without your signature. Add UUSDT or UUSDC as additional currencies within this account.', yieldLabel: 'No yield — pure collateral', apy: null, tags: ['Instant transfers', 'Multi-currency', 'Self-custody'], color: 'hsl(205 85% 55%)' },
    { type: 'savings' as AccountType, icon: '🔐', title: 'Savings Account', subtitle: 'Long-term secure storage', description: 'For holding larger amounts safely. Every outgoing transfer requires explicit confirmation. Add UUSDT or UUSDC as additional currencies — each with the same quantum-secure protection.', yieldLabel: 'No yield — pure collateral', apy: null, tags: ['Transfer confirmation', 'Multi-currency', 'Long-term storage'], color: 'hsl(38 92% 50%)' },
    { type: 'yield' as AccountType, icon: '₿', title: 'Yield Account', subtitle: 'Earn on your Bitcoin — self-custodied', description: 'Your Bitcoin stays in Taproot self-custody while Babylon Protocol stakes it on-chain earning yield in BTC. Add UUSDT or UUSDC as additional currencies within the same account.', yieldLabel: 'Babylon Protocol staking', apy: '3-5%', tags: ['Bitcoin-native yield', 'Non-custodial', 'Multi-currency'], color: 'hsl(142 76% 36%)' },
  ]

  const managedAccounts = [
    { type: 'custody_yield' as AccountType, icon: '📊', title: 'Custody Yield', subtitle: 'Managed yield — UBTC holds custody', description: 'You send Bitcoin to UBTC. We hold it at BitGo or Komainu and deploy institutional yield strategies. Add UUSDT or UUSDC as additional managed currencies within the same account.', yieldLabel: 'Covered calls + T-Bills + BTC lending', apy: '4-6%', tags: ['BitGo / Komainu', '$250M insured', 'Multi-currency'], color: 'hsl(205 85% 55%)' },
    { type: 'prime' as AccountType, icon: '💎', title: 'Prime Account', subtitle: 'Institutional grade', description: 'For funds, family offices and institutional clients. Segregated custody, prime brokerage features and multi-authorisation controls. Full multi-currency support with dedicated reporting per currency.', yieldLabel: 'Institutional yield strategies', apy: '5-8%', tags: ['Segregated custody', 'Multi-currency', 'Prime reporting'], color: 'hsl(270 85% 65%)' },
    { type: 'managed_yield' as AccountType, icon: '🏦', title: 'Managed Yield', subtitle: 'Dynamic allocation — best available yield', description: 'UBTC actively manages a diversified yield portfolio across all your currencies — rotating between covered calls, T-Bills, BTC lending and Babylon staking based on market conditions.', yieldLabel: 'Dynamic rotating yield', apy: '6-10%', tags: ['Dynamic allocation', 'All currencies', 'Active management'], color: 'hsl(142 76% 36%)' },
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

        {/* Currency preview */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { symbol: '₿', label: 'UBTC', color: 'hsl(38 92% 50%)' },
            { symbol: '₮', label: 'UUSDT', color: 'hsl(142 76% 36%)' },
            { symbol: '$', label: 'UUSDC', color: 'hsl(220 85% 60%)' },
          ].map(c => (
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

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', padding: '40px 24px 80px', fontFamily: 'var(--font-display)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

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
            {/* Multi-currency explainer */}
            <div style={{ background: 'hsl(205 85% 55% / 0.05)', border: '1px solid hsl(205 85% 55% / 0.15)', borderRadius: '14px', padding: '20px 24px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <span style={{ fontSize: '24px', flexShrink: 0 }}>⚛️</span>
                <div>
                  <p style={{ color: 'hsl(205 85% 55%)', fontSize: '14px', fontWeight: '600', margin: '0 0 8px' }}>Every account supports multiple currencies — UBTC, UUSDT and UUSDC</p>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.8' }}>
                    Once you open an account, you can add UUSDT and UUSDC as additional currencies within the same account. Each currency is independently quantum-secured — deposit USDT, mint UUSDT 1:1; deposit USDC, mint UUSDC 1:1. All currencies travel on the Bitcoin network as Taproot Assets, sharing the same quantum key pair and security model. UUSDT and UUSDC are not Bitcoin-backed — they are 1:1 backed by the underlying stablecoin locked in your quantum vault.
                  </p>
                </div>
              </div>
            </div>

            {/* Two column — Self vs Managed */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>

              {/* LEFT — Self Custody */}
              <div>
                <div style={{ background: 'hsl(205 85% 55% / 0.06)', border: '1px solid hsl(205 85% 55% / 0.2)', borderRadius: '16px', padding: '20px 24px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '20px' }}>⚛️</span>
                    <h2 style={{ color: 'hsl(205 85% 55%)', fontSize: '16px', fontWeight: '700', margin: 0 }}>Self-Custody Accounts</h2>
                  </div>
                  <p style={{ color: 'hsl(0 0% 92%)', fontSize: '13px', fontWeight: '600', ...mono, margin: '0 0 8px' }}>Your keys. Your Bitcoin. Always.</p>
                  <p style={{ color: 'hsl(0 0% 60%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.7' }}>
                    Your collateral is locked in a Taproot script on the Bitcoin blockchain. No company — not even UBTC — can move your assets without your cryptographic signature. You are the sole keyholder. This applies to UBTC, UUSDT and UUSDC equally within the same account.
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
                  {selfAccounts.map(acc => <Card key={acc.type} acc={acc} selected={accountType === acc.type} onClick={() => setAccountType(acc.type)} />)}
                </div>
              </div>

              {/* RIGHT — Managed Custody */}
              <div>
                <div style={{ background: 'hsl(38 92% 50% / 0.06)', border: '1px solid hsl(38 92% 50% / 0.2)', borderRadius: '16px', padding: '20px 24px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '20px' }}>🏦</span>
                    <h2 style={{ color: 'hsl(38 92% 50%)', fontSize: '16px', fontWeight: '700', margin: 0 }}>Managed Custody Accounts</h2>
                  </div>
                  <p style={{ color: 'hsl(0 0% 92%)', fontSize: '13px', fontWeight: '600', ...mono, margin: '0 0 8px' }}>You own everything. We manage it for you.</p>
                  <p style={{ color: 'hsl(0 0% 60%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.7' }}>
                    You send your assets to UBTC. We hold them at BitGo or Komainu — regulated custodians insured up to $250M — and deploy institutional yield strategies across all your currencies. UBTC, UUSDT and UUSDC all benefit from the same managed yield strategies within one account.
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
                  {managedAccounts.map(acc => <Card key={acc.type} acc={acc} selected={accountType === acc.type} onClick={() => setAccountType(acc.type)} />)}
                </div>
              </div>
            </div>

            {/* High Yield — full width */}
            <div style={{ background: 'hsl(220 12% 7%)', border: '2px solid hsl(270 85% 65% / 0.3)', borderRadius: '20px', padding: '32px', marginBottom: '32px', position: 'relative' as const, overflow: 'hidden' }}>
              <div style={{ position: 'absolute' as const, top: '-60px', right: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'hsl(270 85% 65% / 0.06)', pointerEvents: 'none' as const }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap' as const, gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'hsl(270 85% 65% / 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>🚀</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                      <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: 0 }}>High Yield Investment Account</h2>
                      <span style={{ background: 'hsl(270 85% 65% / 0.15)', color: 'hsl(270 85% 65%)', fontSize: '10px', fontWeight: '700', ...mono, padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase', border: '1px solid hsl(270 85% 65% / 0.3)' }}>Coming Soon</span>
                    </div>
                    <p style={{ color: 'hsl(270 85% 65%)', fontSize: '13px', ...mono, margin: 0 }}>Active trading — maximum yield — all currencies</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' as const }}>
                  <p style={{ color: 'hsl(270 85% 65%)', fontSize: '32px', fontWeight: '700', ...mono, margin: '0 0 2px', lineHeight: '1' }}>15-25%</p>
                  <p style={{ color: 'hsl(0 0% 45%)', fontSize: '11px', ...mono, margin: 0 }}>Target APY</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '13px', ...mono, margin: '0 0 12px', lineHeight: '1.8' }}>
                    You send your Bitcoin, USDT or USDC to UBTC. We actively trade all your currencies at our institutional trading desk — derivatives, structured products, arbitrage and market making — targeting significantly higher returns than any passive strategy.
                  </p>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.8' }}>
                    Supports UBTC, UUSDT and UUSDC in a single high-yield account.
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
                  <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '12px', padding: '14px' }}>
                    <p style={{ color: 'hsl(0 0% 55%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Custody</p>
                    <p style={{ color: 'hsl(270 85% 65%)', fontSize: '12px', ...mono, margin: '0 0 4px', fontWeight: '600' }}>🔐 BitGo Regulated Custody</p>
                    <p style={{ color: 'hsl(0 0% 55%)', fontSize: '11px', ...mono, margin: 0, lineHeight: '1.6' }}>Your assets held by BitGo on behalf of UBTC — insured up to $250M. UBTC has full trading authority. No self-custody version available.</p>
                  </div>
                  <div style={{ background: 'hsl(0 84% 60% / 0.06)', border: '1px solid hsl(0 84% 60% / 0.2)', borderRadius: '10px', padding: '12px' }}>
                    <p style={{ color: 'hsl(0 84% 60%)', fontSize: '11px', ...mono, margin: 0, lineHeight: '1.6' }}>⚠ High-risk investment product. Target yields not guaranteed. Capital is at risk.</p>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
                {['Active trading', 'BitGo insured custody', 'UBTC + UUSDT + UUSDC', 'Derivatives & arbitrage', 'Structured products', '15-25% target APY'].map(t => (
                  <span key={t} style={{ fontSize: '10px', ...mono, color: 'hsl(270 85% 65%)', border: '1px solid hsl(270 85% 65% / 0.3)', borderRadius: '20px', padding: '3px 10px', textTransform: 'uppercase' }}>{t}</span>
                ))}
              </div>
            </div>

            {/* Continue */}
            <div style={{ maxWidth: '400px', margin: '0 auto' }}>
              <button onClick={() => { if (!accountType) return; const managed = ['custody_yield', 'prime', 'managed_yield']; if (managed.includes(accountType)) setStep('custody'); else setStep('confirm') }} disabled={!accountType} style={btnNext(!!accountType)}>
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
                For managed custody accounts UBTC holds and manages your assets. You can additionally choose to have your assets sub-custodied at a regulated third-party custodian — adding an extra layer of regulatory oversight and insurance on top of UBTC management.
              </p>
            </div>
            {[
              { type: 'ubtc' as const, icon: '🏦', title: 'UBTC Direct Custody', subtitle: 'Standard — immediate activation', description: 'UBTC holds and manages your assets directly across all currencies. No additional KYB or custodian fees beyond standard onboarding.', tags: ['Immediate activation', 'All currencies', 'No additional KYB'], color: 'hsl(205 85% 55%)' },
              { type: 'bitgo' as const, icon: '🔐', title: 'UBTC + BitGo Sub-Custody', subtitle: '$250M insured — regulated qualified custodian', description: 'UBTC manages your account. Your assets are additionally sub-custodied at BitGo — $60B+ AUM, 50+ countries, SOC2 certified, insured up to $250M.', tags: ['$250M insured', 'SOC2 certified', 'KYB required', 'Institutional'], color: 'hsl(38 92% 50%)' },
              { type: 'komainu' as const, icon: '🌍', title: 'UBTC + Komainu Sub-Custody', subtitle: 'VARA Dubai & UK FCA regulated', description: 'UBTC manages your account. Your assets are additionally sub-custodied at Komainu — regulated by Dubai VARA and UK FCA, backed by Nomura. Ideal for Middle East and Asian clients.', tags: ['VARA Dubai', 'UK FCA', 'Nomura-backed', 'KYB required'], color: 'hsl(270 85% 65%)' },
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
            <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '16px', padding: '24px' }}>
              <p style={{ color: 'hsl(0 0% 35%)', fontSize: '10px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 16px' }}>Your Details</p>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username (e.g. Satoshi)" style={{ display: 'block', width: '100%', padding: '13px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', color: 'hsl(0 0% 92%)', fontSize: '14px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '10px' }} />
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email" style={{ display: 'block', width: '100%', padding: '13px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '10px', color: 'hsl(0 0% 92%)', fontSize: '14px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const }} />
            </div>
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
                      { label: 'Currencies Supported', value: '₿ UBTC · ₮ UUSDT · $ UUSDC — add currencies after opening' },
                      { label: 'Custody Model', value: det.custodyLabel },
                      { label: 'Yield Strategy', value: det.yieldLabel + (det.apy ? ` — ${det.apy}% APY` : '') },
                      { label: 'UBTC Collateral', value: '150% minimum — $150 BTC locked per $100 UBTC issued' },
                      { label: 'UUSDT / UUSDC', value: '1:1 backed — $1 USDT locked per $1 UUSDT issued' },
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
                        ⚠ By opening this account you transfer custody of your assets to UBTC Protocol. Held at {custodyPreference === 'komainu' ? 'Komainu' : custodyPreference === 'bitgo' ? 'BitGo' : 'UBTC'}. You retain full ownership and can withdraw subject to settlement periods.
                        {(custodyPreference === 'bitgo' || custodyPreference === 'komainu') && ' KYB verification within 24-48 hours.'}
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
              Your {accountDetails[accountType]?.title} is ready. Fund it with Bitcoin then add UUSDT or UUSDC as additional currencies from your account dashboard.
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
            {/* QUANTUM KEYS DISPLAY */}
            <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(0 84% 60% / 0.4)', borderRadius: '16px', padding: '24px', textAlign: 'left' as const, marginBottom: '20px' }}>
              <p style={{ color: 'hsl(0 84% 60%)', fontSize: '11px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.2em', margin: '0 0 4px' }}>⚠️ Your Quantum Keys — Save Now</p>
              <p style={{ color: 'hsl(0 0% 30%)', fontSize: '11px', ...mono, margin: '0 0 16px' }}>A key file has been downloaded automatically. Store it securely offline. These keys are never stored on our servers.</p>
              {[
                { label: 'Protocol Second Key', desc: 'Authorises minting and withdrawals', color: 'hsl(38 92% 50%)', value: result.protocol_second_key },
                { label: 'KEY 1 — Quantum Signing Key (QSK)', desc: 'Signs every UBTC transfer — your quantum identity', color: 'hsl(205 85% 55%)', value: result.qsk_private },
                { label: 'KEY 2 — SPHINCS+ Backup', desc: 'Backup quantum signing — different algorithm to KEY 1', color: 'hsl(142 70% 45%)', value: result.sphincs_sk },
                { label: 'KEY 3 — Kyber Redemption Key', desc: 'Decrypts embedded BTC redemption — self-sovereign Bitcoin claim', color: 'hsl(270 85% 65%)', value: result.kyber_sk },
              ].map((k, i) => (
                <div key={i} style={{ marginBottom: '12px', padding: '12px', background: 'hsl(220 15% 7%)', borderRadius: '8px', borderLeft: `3px solid ${k.color}` }}>
                  <p style={{ color: k.color, fontSize: '10px', ...mono, fontWeight: 700, margin: '0 0 2px' }}>{k.label}</p>
                  <p style={{ color: 'hsl(0 0% 35%)', fontSize: '10px', ...mono, margin: '0 0 6px' }}>{k.desc}</p>
                  <p style={{ color: 'hsl(0 0% 25%)', fontSize: '9px', ...mono, margin: 0, wordBreak: 'break-all' as const }}>{k.value?.substring(0, 60)}...</p>
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
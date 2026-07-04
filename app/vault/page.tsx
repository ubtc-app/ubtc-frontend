'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { API_URL } from '../lib/supabase'
import { isInTelegram } from '../lib/telegram'
import { TelegramSafeDisplay } from '../components/TelegramSafeDisplay'
import { InstitutionalVault } from '../components/InstitutionalVault'
const PUBKEY = '032bb4a115bddb717274ba34d757338d309865e632232f31c874a0707c2c566ef5'
type Step = 'account' | 'custody' | 'confirm' | 'done'
type AccountType = 'current' | 'savings' | 'yield' | 'custody_yield' | 'prime' | 'managed_yield'

function ThemeRouter({ children }: { children: React.ReactNode }) {
  const [institutional, setInstitutional] = useState(false)
  useEffect(() => {
    setInstitutional(
      localStorage.getItem('qufi_theme') === 'light' ||
      localStorage.getItem('qufi_user_type') === 'institutional'
    )
  }, [])
  if (institutional) return <InstitutionalVault />
  return <>{children}</>
}

export default function VaultPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <div style={{ position: 'relative', width: 80, height: 80 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(0,212,255,0.15)', borderTopColor: '#00D4FF', animation: 'q-spin 1s linear infinite' }} />
          <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '1px solid rgba(124,58,255,0.15)', borderTopColor: '#7C3AFF', animation: 'q-spin .7s linear infinite reverse' }} />
          <div style={{ position: 'absolute', inset: 16, borderRadius: '50%', border: '1px solid rgba(0,255,224,0.15)', borderTopColor: '#00FFE0', animation: 'q-spin 1.3s linear infinite' }} />
          <div style={{ position: 'absolute', inset: '50%', transform: 'translate(-50%,-50%)', width: 8, height: 8, borderRadius: '50%', background: '#00D4FF', boxShadow: '0 0 12px #00D4FF' }} />
        </div>
        <p style={{ color: 'rgba(0,212,255,0.6)', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0 }}>Initialising...</p>
        <style>{`@keyframes q-spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    }>
      <ThemeRouter>
        <VaultPageInner />
      </ThemeRouter>
    </Suspense>
  )
}
function VaultPageInner() {
  const [step, setStep] = useState<Step>('account')
  const [accountType, setAccountType] = useState<AccountType | null>(null)
  const [custodyPreference, setCustodyPreference] = useState<'ubtc' | 'bitgo' | 'komainu'>('ubtc')
  const [existingTypes, setExistingTypes] = useState<string[]>([])
  const [existingMnemonic, setExistingMnemonic] = useState('')
  const [hasExistingWallet, setHasExistingWallet] = useState(false)
  const [existingWalletAddress, setExistingWalletAddress] = useState<string | null>(null)
  const [existingWalletUsername, setExistingWalletUsername] = useState<string | null>(null)
  const [newWalletMnemonic, setNewWalletMnemonic] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const mono: any = { fontFamily: 'var(--font-mono)' }

// Telegram identity (passed from /telegram landing page)
  const searchParams = useSearchParams()
  const tgId = searchParams.get('tg_id')
  const tgHandle = searchParams.get('tg_handle') || ''
  const tgName = searchParams.get('tg_name') || ''
  // Pre-fill username from Telegram handle on first render
  useEffect(() => {
    if (tgHandle && !username) setUsername(tgHandle)
  }, [tgHandle])
  // Onboarding wizard state
  const [onboardStep, setOnboardStep] = useState(1)
  const [mnemonicConfirmed, setMnemonicConfirmed] = useState(false)
  const [walletPassword, setWalletPassword] = useState('')
  const [walletPasswordConfirm, setWalletPasswordConfirm] = useState('')
  const [passwordSet, setPasswordSet] = useState(false)
  const [pskDownloaded, setPskDownloaded] = useState(false)
  const [pskVerified, setPskVerified] = useState(false)
  const [pskVerifyError, setPskVerifyError] = useState('')
  const [pskPasteInput, setPskPasteInput] = useState('')
  const [quantumUsername, setQuantumUsername] = useState('')
  const [quantumUsernameAvailable, setQuantumUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [quantumUsernameSet, setQuantumUsernameSet] = useState(false)
  const usernameCheckTimeout = useRef<any>(null)
  const [useRecoveryPhrase, setUseRecoveryPhrase] = useState(false)
  const [recoveryPhraseInput, setRecoveryPhraseInput] = useState('')

  useEffect(() => {
    import('../lib/wallet/storage').then(({ loadActiveWallet }) => loadActiveWallet()).then(wallet => {
      if (!wallet) return
      setHasExistingWallet(true)
      setExistingWalletAddress(wallet.address)
      const pubkey = wallet.publicKeys?.dilithium
      if (!pubkey) return
      fetch(`${API_URL}/dashboard?user_pubkey=${encodeURIComponent(pubkey)}`)
        .then(r => r.json())
        .then(d => setExistingTypes((d.vaults || []).map((v: any) => v.account_type)))
        .catch(() => {})
      fetch(`${API_URL}/wallets/all`)
        .then(r => r.json())
        .then(d => {
          const match = (d.wallets || []).find((w: any) => w.wallet_address === wallet.address || w.dilithium_pk === pubkey)
          if (match?.username) setExistingWalletUsername(match.username)
        })
        .catch(() => {})
    })
  }, [])

  const selfCustodyTypes: AccountType[] = ['current', 'savings', 'yield']
  const isSelfCustody = accountType ? selfCustodyTypes.includes(accountType) : false

 const createAccount = async () => {
      setLoading(true); setError('')
      try {
        const { createWallet: generateWallet, createWalletFromMnemonic, persistWallet, deriveVaultTaproot } = await import('../lib/wallet/wallet')
        const { listWallets, loadActiveWallet, setActiveWallet } = await import('../lib/wallet/storage')
        const { wrapTaprootSk } = await import('../lib/wallet/vault-wrap')
        const { fromHex } = await import('../lib/wallet/encryption')

        // If a wallet already exists, derive the next account from the same mnemonic.
        // The user must provide their mnemonic to unlock it — we never store it.
        // For the first account (no existing wallet), generate fresh keys.
        const existingWallets = await listWallets()
        const activeWallet = await loadActiveWallet()

        let wallet: Awaited<ReturnType<typeof generateWallet>>
        let mnemonic: string | null = null
        let vaultMnemonic: string

        if (existingWallets.length === 0 || !activeWallet) {
          // First-time setup — generate brand new wallet at account index 0
          wallet = await generateWallet(0)
          mnemonic = wallet.mnemonic
          vaultMnemonic = mnemonic
        } else {
          // Additional account — decrypt mnemonic using wallet password, derive next index
          if (!existingMnemonic) {
            setError('Enter your wallet password to add a new account.')
            setLoading(false)
            return
          }
          const { loadMnemonicVault } = await import('../lib/wallet/storage')
          const { unsealWithPassword } = await import('../lib/wallet/password')
          const { validateMnemonic } = await import('@scure/bip39')
          const { wordlist } = await import('@scure/bip39/wordlists/english.js')
          const mnemonicVault = await loadMnemonicVault()
          if (!mnemonicVault || useRecoveryPhrase) {
            // Fallback: user enters their 24-word phrase directly
            if (!recoveryPhraseInput.trim()) {
              setUseRecoveryPhrase(true)
              setError('Enter your 24-word recovery phrase to add a new account.')
              setLoading(false)
              return
            }
            const trimmed = recoveryPhraseInput.trim()
            if (!validateMnemonic(trimmed, wordlist)) {
              setError('Invalid recovery phrase. Check spelling and word count.')
              setLoading(false)
              return
            }
            vaultMnemonic = trimmed
          } else {
          let decryptedMnemonicBytes: Uint8Array
          try {
            decryptedMnemonicBytes = await unsealWithPassword(mnemonicVault, existingMnemonic)
          } catch {
            setError('Incorrect password. If you forgot it, use your 24-word recovery phrase below.')
            setUseRecoveryPhrase(true)
            setLoading(false)
            return
          }
          vaultMnemonic = new TextDecoder().decode(decryptedMnemonicBytes)
          decryptedMnemonicBytes.fill(0)
          }
          const nextIndex = Math.max(...existingWallets.map(w => w.accountIndex ?? 0)) + 1
          wallet = await createWalletFromMnemonic(vaultMnemonic, nextIndex)
        }
        const { taprootSk, taprootPubKey } = await deriveVaultTaproot(vaultMnemonic, wallet.accountIndex ?? 0)
        const kyberPubKeyBytes = fromHex(wallet.publicKeys.kyber)
        const taprootSkKyberWrapped = await wrapTaprootSk(taprootSk, kyberPubKeyBytes)
        taprootSk.fill(0)

        // POST only public material + opaque ciphertext envelope
        const res = await fetch(`${API_URL}/vaults`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dilithium_pk: wallet.publicKeys.dilithium,
            sphincs_pk: wallet.publicKeys.sphincs,
            kyber_pk: wallet.publicKeys.kyber,
            taproot_pubkey: Array.from(taprootPubKey).map(b => b.toString(16).padStart(2, '0')).join(''),
            taproot_sk_kyber_wrapped: taprootSkKyberWrapped,
            network: 'testnet4',
            recovery_blocks: 6,
            account_type: accountType,
            username: tgHandle || `user_${Math.random().toString(36).slice(2, 8)}`,
            telegram_id: tgId ? Number(tgId) : undefined,
            telegram_handle: tgHandle || undefined,
          })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)

        // Persist encrypted wallet locally; server has no secret keys
        await persistWallet(wallet)
        await setActiveWallet(wallet.address)
        localStorage.setItem('ubtc_wallet_address', wallet.address)
        window.dispatchEvent(new CustomEvent('wallets-updated'))

        // Track mnemonic in dedicated state — avoids backend response overwriting it
        if (mnemonic) setNewWalletMnemonic(mnemonic)
        setResult({ ...data, wallet_address: wallet.address })
        if (data.vault_id) localStorage.setItem('ubtc_active_vault_id', data.vault_id)
        setStep('done')
      } catch (e: any) { setError(e.message) }
      setLoading(false)
    }

  const checkQuantumUsername = async (name: string) => {
    if (name.length < 3) { setQuantumUsernameAvailable(null); return }
    setCheckingUsername(true)
    try {
      const res = await fetch(`${API_URL}/wallets/all`)
      if (!res.ok) { setQuantumUsernameAvailable(true); setCheckingUsername(false); return }
      const data = await res.json()
      const taken = (data.wallets || []).some((w: any) =>
        w.username?.toLowerCase() === name.toLowerCase()
      )
      setQuantumUsernameAvailable(!taken)
    } catch { setQuantumUsernameAvailable(true) }
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
  const verifyProtocolKeyText = (text: string) => {
    setPskVerifyError('')
    const trimmed = (text || '').trim()
    if (!trimmed) {
      setPskVerifyError('Paste your Protocol Second Key to verify')
      return
    }
    if (!trimmed.includes(result.protocol_second_key) && trimmed !== result.protocol_second_key) {
      setPskVerifyError('This is not your Protocol Second Key. Check your password manager and try again.')
      return
    }
    setPskVerified(true)
  }

  const setQuantumWalletUsername = async () => {
    if (!quantumUsernameAvailable || quantumUsername.length < 3) return
    try {
      const res = await fetch(`${API_URL}/wallet/username`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ wallet_address: result.wallet_address, vault_id: result.vault_id, quantum_username: quantumUsername })
      })
      if (res.ok) { setQuantumUsernameSet(true) }
      else { setQuantumUsernameSet(true) }
    } catch { setQuantumUsernameSet(true) }
    // Save username locally so the Header can display it without an API call
    const addr = result?.wallet_address
    if (addr) localStorage.setItem(`ubtc_username_${addr}`, quantumUsername)
  }

  const btnBack: any = { background: 'linear-gradient(135deg,#050f20,#020810)', border: '1px solid rgba(0,212,255,0.15)', color: 'rgba(0,212,255,0.6)', borderRadius: '10px', padding: '14px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }
  const btnNext = (enabled: boolean): any => ({ flex: 1, background: enabled ? 'linear-gradient(135deg,#0066cc,#0044aa)' : 'rgba(255,255,255,0.04)', color: enabled ? 'white' : 'rgba(120,160,220,0.3)', border: enabled ? 'none' : '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 32px', fontSize: '14px', fontWeight: '700', cursor: enabled ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', boxShadow: enabled ? '0 0 30px rgba(0,212,255,0.3)' : 'none' })

  const accountDetails: Record<AccountType, { icon: string; title: string; color: string; custodyLabel: string; yieldLabel: string; apy: string | null }> = {
    current: { icon: '💳', title: 'Current Account', color: '#00D4FF', custodyLabel: '⚛️ Taproot Self-Custody', yieldLabel: 'No yield', apy: null },
    savings: { icon: '🔐', title: 'Savings Account', color: '#f59e0b', custodyLabel: '⚛️ Taproot Self-Custody', yieldLabel: 'No yield', apy: null },
    yield: { icon: '₿', title: 'Yield Account', color: '#22c55e', custodyLabel: '⚛️ Taproot Self-Custody', yieldLabel: 'Babylon staking', apy: '3-5%' },
    custody_yield: { icon: '📊', title: 'Custody Yield', color: '#00D4FF', custodyLabel: '🏦 BitGo / Komainu', yieldLabel: 'Institutional yield', apy: '4-6%' },
    prime: { icon: '💎', title: 'Prime Account', color: '#a855f7', custodyLabel: '🏦 BitGo / Komainu', yieldLabel: 'Institutional yield', apy: '5-8%' },
    managed_yield: { icon: '🏦', title: 'Managed Yield', color: '#22c55e', custodyLabel: '🏦 BitGo / Komainu', yieldLabel: 'Dynamic yield', apy: '6-10%' },
  }

  const selfAccounts = [
    {
      type: 'current' as AccountType,
      icon: '💳',
      title: 'Standard Account',
      subtitle: 'Everyday spending & transfers',
      description: 'Your primary UBTC account. Send, receive, and redeem instantly. Your Bitcoin collateral is locked in a Taproot script secured by post-quantum signatures — nobody, not even World Local Bank, can move it without your authorisation.',
      yieldLabel: 'No yield — pure self-custody',
      apy: null,
      tags: ['Instant transfers', 'Self-custody', 'PQ-secured'],
      color: '#00D4FF',
      comingSoon: false,
    },
    {
      type: 'savings' as AccountType,
      icon: '🏛️',
      title: 'Savings Account',
      subtitle: 'Earn yield via Babylon staking — Coming Soon',
      description: 'Your Bitcoin collateral is staked through Babylon Protocol — a non-custodial Bitcoin staking layer — while remaining in your Taproot vault. Earn native BTC yield without giving up custody. Withdrawals require a confirmation window.',
      yieldLabel: 'Babylon Protocol staking',
      apy: '3-5%',
      tags: ['Babylon staking', 'BTC-native yield', 'Self-custody'],
      color: '#f59e0b',
      comingSoon: true,
    },
    {
      type: 'yield' as AccountType,
      icon: '📈',
      title: 'High Yield Investment Account',
      subtitle: 'Up to 20–30% APY — Coming Soon',
      description: '25% of your Bitcoin collateral is actively deployed into institutional trading strategies — covered calls, basis trades, and structured products — while 75% remains in your self-custody Taproot vault. Target yield of 20–30% per year paid in UBTC.',
      yieldLabel: 'Institutional trading strategies',
      apy: '20-30',
      tags: ['25% deployed', '75% self-custody', 'Active management'],
      color: '#22c55e',
      comingSoon: true,
    },
  ]

  const managedAccounts = [
    { type: 'custody_yield' as AccountType, icon: '📊', title: 'Custody Yield', subtitle: 'Managed yield', description: 'UBTC holds at BitGo or Komainu and deploys institutional yield strategies.', yieldLabel: 'Covered calls + T-Bills', apy: '4-6%', tags: ['BitGo / Komainu', '$250M insured'], color: '#00D4FF', comingSoon: true },
    { type: 'prime' as AccountType, icon: '💎', title: 'Prime Account', subtitle: 'Institutional grade', description: 'Segregated custody, prime brokerage features and multi-authorisation controls.', yieldLabel: 'Institutional yield', apy: '5-8%', tags: ['Segregated custody', 'Prime reporting'], color: '#a855f7', comingSoon: true },
    { type: 'managed_yield' as AccountType, icon: '🏦', title: 'Managed Yield', subtitle: 'Dynamic allocation', description: 'UBTC actively manages a diversified yield portfolio across all currencies.', yieldLabel: 'Dynamic rotating yield', apy: '6-10%', tags: ['Dynamic allocation', 'Active management'], color: '#22c55e', comingSoon: true },
  ]

  const Card = ({ acc, selected, onClick }: { acc: typeof selfAccounts[0]; selected: boolean; onClick: () => void }) => {
    const disabled = existingTypes.includes(acc.type) || acc.comingSoon
    return (
      <div onClick={() => !disabled && onClick()} style={{ background: selected ? `linear-gradient(135deg,${acc.color}12,${acc.color}06)` : 'linear-gradient(135deg,#050f20,#020810)', border: `2px solid ${selected ? acc.color + '60' : disabled ? 'rgba(0,212,255,0.06)' : 'rgba(0,212,255,0.12)'}`, borderRadius: '14px', padding: '20px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: acc.comingSoon ? 0.7 : disabled ? 0.5 : 1, transition: 'all 0.15s', display: 'flex', flexDirection: 'column' as const, gap: '10px', boxSizing: 'border-box' as const, position: 'relative' as const, boxShadow: selected ? `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${acc.color}15` : '0 4px 16px rgba(0,0,0,0.4)' }}>
        {acc.comingSoon && (
          <div style={{ position: 'absolute' as const, top: '12px', right: '12px', background: 'hsl(38 92% 50% / 0.15)', border: '1px solid hsl(38 92% 50% / 0.4)', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', fontWeight: '700', color: 'hsl(38 92% 60%)', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.05em' }}>
            COMING SOON
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: acc.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>{acc.icon}</div>
          {!acc.comingSoon && (
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${selected ? acc.color : 'rgba(0,212,255,0.15)'}`, background: selected ? acc.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {selected && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'white' }} />}
            </div>
          )}
        </div>
        <div>
          <h3 style={{ color: '#f0f6ff', fontSize: '15px', fontWeight: '700', margin: '0 0 2px' }}>{acc.title}</h3>
          <p style={{ color: acc.color, fontSize: '11px', ...mono, margin: 0 }}>{acc.subtitle}</p>
        </div>
        <p style={{ color: 'rgba(160,200,240,0.7)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.7', flex: 1 }}>{acc.description}</p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
          {acc.tags.map(t => <span key={t} style={{ fontSize: '9px', ...mono, color: acc.color, border: `1px solid ${acc.color}40`, borderRadius: '20px', padding: '2px 8px', textTransform: 'uppercase' as const }}>{t}</span>)}
        </div>
        {acc.apy && !acc.comingSoon && <p style={{ color: '#22c55e', fontWeight: 700, fontSize: '14px', ...mono, margin: 0 }}>{acc.apy}% APY</p>}
        {acc.apy && acc.comingSoon && <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: '14px', ...mono, margin: 0 }}>Up to {acc.apy}% APY</p>}
        {existingTypes.includes(acc.type) && !acc.comingSoon && <p style={{ color: '#ef4444', fontSize: '10px', ...mono, margin: 0 }}>✗ Already open</p>}
      </div>
    )
  }

  const canProceed = username.length >= 3 && email.includes('@') && email.includes('.')

  // ── Wizard steps labels ──
  const wizardSteps = ['Recovery Phrase', 'Password', 'Protocol Key', 'Verify Key', 'Account', 'Wallet & @ID', 'Ready']

  const infoBox = (children: React.ReactNode, borderColor = '#FF8C00') => (
    <div style={{ background: 'linear-gradient(135deg,#050f20,#020810)', border: `1px solid ${borderColor}30`, borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
      {children}
    </div>
  )

  const qa = (q: string, a: string, color = 'hsl(0 0% 78%)') => (
    <div style={{ marginBottom: '12px' }}>
      <p style={{ color, fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, margin: '0 0 4px' }}>{q}</p>
      <p style={{ color: 'rgba(160,200,240,0.7)', fontSize: '12px', fontFamily: 'monospace', margin: 0, lineHeight: '1.8' }} dangerouslySetInnerHTML={{ __html: a }} />
    </div>
  )

  const nextBtn = (label: string, onClick: () => void, enabled: boolean, color = '#FF8C00') => (
    <button onClick={() => enabled && onClick()} disabled={!enabled} style={{ width: '100%', background: enabled ? `linear-gradient(135deg,${color},${color}bb)` : 'rgba(255,255,255,0.04)', color: enabled ? '#fff' : 'rgba(120,160,220,0.3)', border: enabled ? 'none' : '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: 700, cursor: enabled ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', marginTop: '8px', boxShadow: enabled ? `0 0 24px ${color}40` : 'none' }}>
      {label}
    </button>
  )

  const checkBox = (checked: boolean, onToggle: () => void, label: string) => (
    <div onClick={onToggle} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'linear-gradient(135deg,#050f20,#020810)', border: `1px solid ${checked ? 'rgba(34,197,94,0.4)' : 'rgba(0,212,255,0.12)'}`, borderRadius: '10px', padding: '14px', cursor: 'pointer', marginBottom: '16px' }}>
      <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${checked ? '#22c55e' : 'rgba(0,212,255,0.2)'}`, background: checked ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
        {checked && <span style={{ color: 'white', fontSize: '13px' }}>✓</span>}
      </div>
      <p style={{ color: 'rgba(160,200,240,0.7)', fontSize: '13px', fontFamily: 'monospace', margin: 0, lineHeight: '1.6' }}>{label}</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--q-bg)', padding: '40px 24px 80px', fontFamily: 'var(--font-display)', position: 'relative', overflow: 'hidden' }}>

      {/* Quantum ambient glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div className="q-glow-node" style={{ top: '-10%', left: '20%',  width: 700, height: 700, background: 'rgba(0,212,255,0.035)' }} />
        <div className="q-glow-node" style={{ bottom: '-5%', right: '10%', width: 600, height: 600, background: 'rgba(124,58,255,0.04)' }} />
        <div className="q-circuit-grid" style={{ position: 'absolute', inset: 0, opacity: 0.4 }} />
      </div>

      <div style={{ maxWidth: step === 'done' ? '580px' : '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* ── DETAILS MODAL ── */}
        {showDetailsModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,4,15,0.85)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div style={{ background: 'linear-gradient(135deg,#050f20,#020810)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: '24px', padding: '40px', maxWidth: '480px', width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(0,212,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>👤</div>
                <div>
                  <h2 style={{ color: '#f0f6ff', fontSize: '20px', fontWeight: '700', margin: '0 0 2px' }}>Create your identity</h2>
                  <p style={{ color: '#00D4FF', fontSize: '12px', ...mono, margin: 0 }}>World Local Bank · QAP Protocol</p>
                </div>
              </div>
              <p style={{ color: 'rgba(160,200,240,0.7)', fontSize: '13px', ...mono, margin: '0 0 28px', lineHeight: '1.7', borderTop: '1px solid rgba(0,212,255,0.08)', paddingTop: '16px' }}>
                Your username becomes part of your QAP identity. Your email receives security alerts only — never shared.
              </p>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'rgba(0,212,255,0.5)', fontSize: '9px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.35em', marginBottom: '8px' }}>Username <span style={{ color: '#ff4d6d' }}>required</span></label>
                <div style={{ position: 'relative' as const }}>
                  <span style={{ position: 'absolute' as const, left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,212,255,0.4)', fontSize: '14px', ...mono }}>@</span>
                  <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="satoshi" maxLength={20} autoFocus
                    style={{ display: 'block', width: '100%', padding: '14px 16px 14px 32px', background: 'rgba(0,5,20,0.8)', border: `1px solid ${username.length >= 3 ? 'rgba(34,197,94,0.5)' : 'rgba(0,212,255,0.15)'}`, borderRadius: '12px', color: '#f0f6ff', fontSize: '16px', ...mono, outline: 'none', boxSizing: 'border-box' as const }} />
                  {username.length >= 3 && <span style={{ position: 'absolute' as const, right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#22c55e', fontSize: '16px' }}>✓</span>}
                </div>
                <p style={{ color: 'rgba(100,150,200,0.5)', fontSize: '11px', ...mono, margin: '6px 0 0' }}>Lowercase, numbers, underscores · 3–20 characters</p>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: 'rgba(0,212,255,0.5)', fontSize: '9px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.35em', marginBottom: '8px' }}>Email <span style={{ color: '#ff4d6d' }}>required</span></label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" type="email"
                  style={{ display: 'block', width: '100%', padding: '14px 16px', background: 'rgba(0,5,20,0.8)', border: `1px solid ${email.includes('@') ? 'rgba(34,197,94,0.5)' : 'rgba(0,212,255,0.15)'}`, borderRadius: '12px', color: '#f0f6ff', fontSize: '16px', ...mono, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowDetailsModal(false)} style={btnBack}>← Back</button>
                <button onClick={() => { if (!canProceed) return; setShowDetailsModal(false); const managed = ['custody_yield', 'prime', 'managed_yield']; if (accountType && managed.includes(accountType)) setStep('custody'); else setStep('confirm') }} disabled={!canProceed}
                  style={{ flex: 1, background: canProceed ? 'linear-gradient(135deg,#0066cc,#0044aa)' : 'rgba(255,255,255,0.04)', color: canProceed ? 'white' : 'rgba(120,160,220,0.3)', border: canProceed ? 'none' : '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: canProceed ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', boxShadow: canProceed ? '0 0 30px rgba(0,212,255,0.3)' : 'none' }}>
                  Continue →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── PRE-DONE HEADER ── */}
        {step !== 'done' && (
          <div className="warp-in" style={{ textAlign: 'center' as const, marginBottom: '48px' }}>
            <p style={{ color: 'var(--q-electric)', fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: '0.32em', textTransform: 'uppercase' as const, marginBottom: '16px', opacity: 0.7 }}>
              QAP · QUANTUM ACCOUNT PROTOCOL
            </p>
            <h1 style={{
              fontFamily: 'var(--font-syne)',
              fontSize: 'clamp(26px,4vw,42px)', fontWeight: 800,
              letterSpacing: '0.03em', textTransform: 'uppercase' as const, margin: '0 0 12px',
              background: 'linear-gradient(135deg, var(--q-text) 0%, var(--q-electric) 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              {step === 'account' && 'Choose Account Type'}
              {step === 'custody' && 'Custody Preference'}
              {step === 'confirm' && 'Open Your Account'}
            </h1>
          </div>
        )}

        {/* ── STEP 1: Account Selection ── */}
        {step === 'account' && (
          <div>
            {/* Self-custody section */}
            <div style={{ background: 'hsl(205 85% 55% / 0.06)', border: '1px solid hsl(205 85% 55% / 0.2)', borderRadius: '16px', padding: '20px 24px', marginBottom: '16px' }}>
              <h2 style={{ color: '#00D4FF', fontSize: '16px', fontWeight: '700', margin: '0 0 6px' }}>⚛️ Self-Custody Accounts</h2>
              <p style={{ color: 'rgba(160,200,240,0.7)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.7' }}>Your keys. Your Bitcoin. Always. Locked in a Taproot script secured by post-quantum signatures.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '32px' }}>
              {selfAccounts.map(acc => <Card key={acc.type} acc={acc} selected={accountType === acc.type} onClick={() => setAccountType(acc.type)} />)}
            </div>

            {/* Managed custody section */}
            <div style={{ background: 'hsl(38 92% 50% / 0.06)', border: '1px solid hsl(38 92% 50% / 0.2)', borderRadius: '16px', padding: '20px 24px', marginBottom: '16px' }}>
              <h2 style={{ color: '#f59e0b', fontSize: '16px', fontWeight: '700', margin: '0 0 6px' }}>🏦 Managed Custody Accounts</h2>
              <p style={{ color: 'rgba(160,200,240,0.7)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.7' }}>You own everything. We hold at BitGo or Komainu — insured up to $250M — and deploy institutional yield strategies.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '32px' }}>
              {managedAccounts.map(acc => <Card key={acc.type} acc={acc} selected={accountType === acc.type} onClick={() => setAccountType(acc.type)} />)}
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
              { type: 'ubtc' as const, icon: '🏦', title: 'UBTC Direct Custody', subtitle: 'Standard — immediate activation', description: 'UBTC holds and manages your assets directly.', tags: ['Immediate activation', 'No additional KYB'], color: '#00D4FF' },
              { type: 'bitgo' as const, icon: '🔐', title: 'UBTC + BitGo Sub-Custody', subtitle: '$250M insured', description: 'Assets sub-custodied at BitGo — $60B+ AUM, SOC2 certified, insured up to $250M.', tags: ['$250M insured', 'SOC2', 'KYB required'], color: '#f59e0b' },
              { type: 'komainu' as const, icon: '🌍', title: 'UBTC + Komainu', subtitle: 'VARA Dubai & UK FCA regulated', description: 'Sub-custodied at Komainu — regulated by Dubai VARA and UK FCA, backed by Nomura.', tags: ['VARA Dubai', 'UK FCA', 'Nomura-backed'], color: '#a855f7' },
            ].map(opt => (
              <div key={opt.type} onClick={() => setCustodyPreference(opt.type)} style={{ background: 'linear-gradient(135deg,#050f20,#020810)', border: `2px solid ${custodyPreference === opt.type ? opt.color : 'rgba(0,212,255,0.1)'}`, borderRadius: '16px', padding: '22px', cursor: 'pointer', boxShadow: custodyPreference === opt.type ? `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${opt.color}15` : '0 4px 16px rgba(0,0,0,0.4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '14px', flex: 1 }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: opt.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>{opt.icon}</div>
                    <div>
                      <h2 style={{ color: '#f0f6ff', fontSize: '16px', fontWeight: '700', margin: '0 0 2px' }}>{opt.title}</h2>
                      <p style={{ color: opt.color, fontSize: '12px', ...mono, margin: '0 0 8px' }}>{opt.subtitle}</p>
                      <p style={{ color: 'rgba(160,200,240,0.7)', fontSize: '13px', ...mono, margin: '0 0 10px', lineHeight: '1.7' }}>{opt.description}</p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
                        {opt.tags.map(t => <span key={t} style={{ fontSize: '10px', ...mono, color: opt.color, border: `1px solid ${opt.color}40`, borderRadius: '20px', padding: '2px 8px' }}>{t}</span>)}
                      </div>
                    </div>
                  </div>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${custodyPreference === opt.type ? opt.color : 'rgba(0,212,255,0.15)'}`, background: custodyPreference === opt.type ? opt.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
        {step === 'confirm' && accountType && (() => {
          const det = accountDetails[accountType]
          const isSavings = accountType === 'savings'
          const confirmRows: { label: string; value: string; highlight?: string }[] = [
            { label: 'Account Type', value: det.title },
            { label: 'Custody', value: det.custodyLabel },
            ...(isSavings ? [
              { label: 'Staking Protocol', value: 'Babylon — Bitcoin-native staking', highlight: '#f59e0b' },
              { label: 'Yield', value: `Babylon staking rewards — ${det.apy ?? '3-5'}% APY`, highlight: '#22c55e' },
              { label: 'Lock-up', value: 'Unbonding period applies (Babylon protocol)' },
            ] : [
              { label: 'Yield', value: det.yieldLabel + (det.apy ? ` — ${det.apy}% APY` : 'None') },
            ]),
            { label: 'Vault', value: 'Dedicated Taproot address — separate from other accounts' },
            { label: 'UBTC Tracking', value: 'Mint & redemption linked to this vault ID' },
            { label: 'Collateral Ratio', value: '150% minimum — $150 BTC per $100 UBTC' },
            { label: 'Network', value: 'Bitcoin Testnet4' },
          ]
          return (
            <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column' as const, gap: '16px' }}>
              <div style={{ background: 'linear-gradient(135deg,#050f20,#020810)', border: `1px solid ${det.color}40`, borderRadius: '16px', padding: '28px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: det.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>{det.icon}</div>
                  <div>
                    <h2 style={{ color: '#f0f6ff', fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>{det.title}</h2>
                    <p style={{ color: det.color, fontSize: '12px', ...mono, margin: 0 }}>{det.custodyLabel}</p>
                  </div>
                </div>
                {isSavings && (
                  <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
                    <p style={{ color: '#f59e0b', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.7' }}>
                      Your BTC collateral will be staked via <strong>Babylon Protocol</strong> — a Bitcoin-native staking layer. You earn yield without bridging or wrapping. An unbonding period applies before redemption.
                    </p>
                  </div>
                )}
                {confirmRows.map(item => (
                  <div key={item.label} style={{ padding: '12px 0', borderBottom: '1px solid rgba(0,212,255,0.06)' }}>
                    <p style={{ color: 'rgba(0,212,255,0.5)', fontSize: '9px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.35em', margin: '0 0 4px' }}>{item.label}</p>
                    <p style={{ color: item.highlight ?? '#f0f6ff', fontSize: '13px', fontWeight: '600', ...mono, margin: 0 }}>{item.value}</p>
                  </div>
                ))}
              </div>
              {hasExistingWallet ? (
                <div style={{ background: 'linear-gradient(135deg,#050f20,#020810)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: '16px', padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>⚛️</div>
                    <div>
                      <p style={{ color: '#f0f6ff', fontSize: '16px', fontWeight: '700', margin: '0 0 3px', fontFamily: 'var(--font-display)' }}>
                        {existingWalletUsername ? `@${existingWalletUsername}` : 'Your wallet'}
                      </p>
                      <p style={{ color: 'rgba(100,150,200,0.5)', fontSize: '11px', fontFamily: 'ui-monospace, monospace', margin: 0 }}>
                        {existingWalletAddress ? `${existingWalletAddress.slice(0, 14)}…${existingWalletAddress.slice(-6)}` : ''}
                      </p>
                    </div>
                    <div style={{ marginLeft: 'auto', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '20px', padding: '4px 10px' }}>
                      <span style={{ color: '#22c55e', fontSize: '10px', fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>ACTIVE</span>
                    </div>
                  </div>
                  <p style={{ color: 'rgba(160,200,240,0.7)', fontSize: '12px', ...mono, margin: '0 0 14px', lineHeight: '1.7' }}>
                    This account will be added to your existing wallet. Enter your password to connect and open it — no new recovery phrase will be created.
                  </p>
                  {!useRecoveryPhrase ? (
                    <>
                      <input
                        type="password"
                        value={existingMnemonic}
                        onChange={e => setExistingMnemonic(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && existingMnemonic.length >= 8 && !loading) createAccount() }}
                        placeholder="Wallet password"
                        style={{ width: '100%', background: 'rgba(0,5,20,0.8)', border: `1px solid ${existingMnemonic.length >= 8 ? 'rgba(0,212,255,0.4)' : 'rgba(0,212,255,0.15)'}`, borderRadius: '10px', padding: '13px 16px', color: '#f0f6ff', fontSize: '14px', fontFamily: 'ui-monospace, monospace', boxSizing: 'border-box' as const, outline: 'none', marginBottom: '8px' }}
                      />
                      <button onClick={() => setUseRecoveryPhrase(true)} style={{ background: 'none', border: 'none', color: 'rgba(0,212,255,0.35)', fontSize: '11px', fontFamily: 'ui-monospace, monospace', cursor: 'pointer', padding: '0 0 14px', textDecoration: 'underline' }}>
                        Forgot password? Use 24-word recovery phrase instead
                      </button>
                    </>
                  ) : (
                    <>
                      <p style={{ color: '#f59e0b', fontSize: '12px', ...mono, margin: '0 0 8px' }}>Enter your 24-word recovery phrase:</p>
                      <textarea
                        value={recoveryPhraseInput}
                        onChange={e => setRecoveryPhraseInput(e.target.value)}
                        placeholder="word1 word2 word3 ... word24"
                        rows={3}
                        style={{ width: '100%', background: 'rgba(0,5,20,0.8)', border: `1px solid ${recoveryPhraseInput.trim().split(' ').length === 24 ? 'rgba(34,197,94,0.5)' : 'rgba(0,212,255,0.15)'}`, borderRadius: '10px', padding: '13px 16px', color: '#f0f6ff', fontSize: '13px', fontFamily: 'ui-monospace, monospace', boxSizing: 'border-box' as const, outline: 'none', resize: 'vertical' as const, marginBottom: '8px' }}
                      />
                      <button onClick={() => { setUseRecoveryPhrase(false); setRecoveryPhraseInput(''); setError('') }} style={{ background: 'none', border: 'none', color: 'rgba(0,212,255,0.35)', fontSize: '11px', fontFamily: 'ui-monospace, monospace', cursor: 'pointer', padding: '0 0 14px', textDecoration: 'underline' }}>
                        Use password instead
                      </button>
                    </>
                  )}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setStep('account')} style={btnBack}>← Back</button>
                    <button
                      onClick={createAccount}
                      disabled={loading || (!useRecoveryPhrase && existingMnemonic.length < 8) || (useRecoveryPhrase && recoveryPhraseInput.trim().split(' ').length < 24)}
                      style={{ ...btnNext((!useRecoveryPhrase && existingMnemonic.length >= 8 || useRecoveryPhrase && recoveryPhraseInput.trim().split(' ').length >= 24) && !loading), flex: 1 }}
                    >
                      {loading ? 'Connecting…' : `Connect & Open ${det.title} →`}
                    </button>
                  </div>
                  {error && <p style={{ color: '#ef4444', fontSize: '13px', ...mono, margin: '12px 0 0' }}>{error}</p>}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setStep('account')} style={btnBack}>← Back</button>
                  <button onClick={createAccount} disabled={loading} style={btnNext(!loading)}>
                    {loading ? 'Opening account...' : `Open ${det.title} →`}
                  </button>
                </div>
              )}
              {!hasExistingWallet && error && <p style={{ color: '#ef4444', fontSize: '13px', ...mono }}>{error}</p>}
            </div>
          )
        })()}

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
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: done ? '#22c55e' : active ? '#f59e0b' : 'rgba(0,212,255,0.05)', border: `2px solid ${done ? '#22c55e' : active ? '#f59e0b' : 'rgba(0,212,255,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: done || active ? 'white' : 'rgba(0,212,255,0.4)', fontSize: '11px', fontWeight: 700 }}>{done ? '✓' : n}</span>
                      </div>
                      <span style={{ color: active ? '#f59e0b' : done ? '#22c55e' : 'rgba(0,212,255,0.35)', fontSize: '8px', fontFamily: 'monospace', textAlign: 'center' as const, maxWidth: '55px', lineHeight: '1.2' }}>{label}</span>
                    </div>
                    {i < wizardSteps.length - 1 && <div style={{ width: '16px', height: '2px', background: done ? '#22c55e' : 'rgba(0,212,255,0.1)', marginBottom: '14px' }} />}
                  </div>
                )
              })}
            </div>

            <div style={{ background: 'linear-gradient(135deg,#050f20,#020810)', border: '1px solid rgba(0,212,255,0.12)', borderRadius: '20px', padding: '28px', boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(0,212,255,0.08)' }}>

              {/* ── WIZARD STEP 1: Recovery Phrase ── */}
              {onboardStep === 1 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'hsl(38 92% 50% / 0.15)', border: '1px solid hsl(38 92% 50% / 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>🔑</div>
                    <div>
                      <h2 style={{ color: '#f0f6ff', fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>Your 24-Word Recovery Phrase</h2>
                      <p style={{ color: '#f59e0b', fontSize: '11px', fontFamily: 'monospace', margin: 0 }}>Step 1 of 7 — The most important step in your setup</p>
                    </div>
                  </div>
                  {infoBox(<>
                    {qa('What is this?', 'These 24 words are the <strong style="color:hsl(38 92% 50%)">master key to your entire wallet</strong>. They control your UBTC balance, your Bitcoin collateral, and your ability to send and redeem. Lose them and you lose access to everything — permanently.')}
                    {qa('Why 24 words instead of a password?', 'Unlike a password, your 24-word phrase generates all your cryptographic keys mathematically. From these words, your system derives your Quantum Kyber encryption key, your Taproot Bitcoin key, and your local encryption key. One phrase. All keys. Forever.')}
                    {qa('What should I do right now?', 'Write all 24 words on paper — in order — right now. Store the paper somewhere safe offline. <span style="color:hsl(0 84% 60%)">Do not photograph them. Do not email them. Do not store in Notes, iCloud, or Google Drive.</span>')}
                    {qa('What if I lose them?', '<span style="color:hsl(0 84% 60%)">Your funds cannot be recovered. Not by us. Not by anyone. These words are shown exactly once.</span>')}
                  </>, '#f59e0b')}

                  {!newWalletMnemonic && (
                    <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                      <p style={{ color: '#22c55e', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.7' }}>
                        ✓ This account was added to your existing wallet. Your 24-word recovery phrase is unchanged — the same phrase you already have covers all your accounts.
                      </p>
                    </div>
                  )}
                  {newWalletMnemonic && isInTelegram() && (
                    <TelegramSafeDisplay
                      title="24-Word Recovery Phrase"
                      content={newWalletMnemonic}
                      description="Tap Copy to save into your password manager (1Password, Bitwarden, Apple Passwords). Or tap Show QR to scan with another device. This phrase will not be shown again."
                      confirmed={mnemonicConfirmed}
                      onConfirmedChange={setMnemonicConfirmed}
                      confirmLabel="I have copied my 24 words into a secure password manager or written them down offline. I understand losing them means losing my wallet."
                    />
                  )}
                  {newWalletMnemonic && !isInTelegram() && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '12px' }}>
                        {newWalletMnemonic.split(' ').map((word: string, i: number) => (
                          <div key={i} style={{ background: 'rgba(0,5,20,0.8)', border: '1px solid rgba(0,212,255,0.1)', borderRadius: '6px', padding: '8px 10px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ color: 'rgba(0,212,255,0.35)', fontSize: '9px', fontFamily: 'monospace', minWidth: '16px' }}>{i + 1}.</span>
                            <span style={{ color: '#f0f6ff', fontSize: '12px', fontFamily: 'monospace', fontWeight: 600 }}>{word}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                        <button onClick={() => navigator.clipboard.writeText(newWalletMnemonic)} style={{ flex: 1, background: 'linear-gradient(135deg,#050f20,#020810)', color: 'rgba(160,200,240,0.7)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: '8px', padding: '10px', fontSize: '11px', fontFamily: 'monospace', cursor: 'pointer' }}>Copy to clipboard</button>
                        <button onClick={() => {
                          const text = `QAP WALLET RECOVERY PHRASE\nVault: ${result.vault_id}\nCreated: ${new Date().toISOString()}\n\nWARNING: These 24 words control your entire wallet.\nWrite them on paper. Store offline. Never share.\n\n${newWalletMnemonic.split(' ').map((w: string, i: number) => `${i + 1}. ${w}`).join('\n')}`
                          const blob = new Blob([text], { type: 'text/plain' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a'); a.href = url; a.download = `recovery-phrase-${result.vault_id}.txt`
                          document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
                        }} style={{ flex: 1, background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#000', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, cursor: 'pointer' }}>⬇ Download as text file</button>
                      </div>
                    </>
                  )}
                  {newWalletMnemonic && !isInTelegram() && checkBox(mnemonicConfirmed, () => setMnemonicConfirmed(!mnemonicConfirmed), 'I have written down all 24 words in order and stored them safely offline. I understand these cannot be recovered if lost.')}
                  {nextBtn(newWalletMnemonic ? 'Saved my phrase — Next: Set Password →' : 'Continue — Next: Set Password →', () => setOnboardStep(2), newWalletMnemonic ? mnemonicConfirmed : true)}
                </div>
              )}

              {/* ── WIZARD STEP 2: Password ── */}
              {onboardStep === 2 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>🔒</div>
                    <div>
                      <h2 style={{ color: '#f0f6ff', fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>Set Your Wallet Password</h2>
                      <p style={{ color: '#22c55e', fontSize: '11px', fontFamily: 'monospace', margin: 0 }}>Step 2 of 7 — Daily device security</p>
                    </div>
                  </div>
                  {infoBox(<>
                    {qa('What is this password for?', 'This password protects your wallet on this device. You will enter it every time you send UBTC or redeem a proof. It is used to decrypt your <strong style="color:hsl(205 85% 55%)">Quantum Kyber key</strong> — the post-quantum encryption key that secures your proof files.')}
                    {qa('What is my Quantum Kyber key?', 'Your Kyber1024 key is a post-quantum encryption key generated in your browser from your 24-word phrase. It is used to encrypt and decrypt UBTC proof files. Unlike classical encryption, Kyber1024 cannot be broken by a quantum computer — it is a NIST post-quantum standard. Your password locks this key on your device.')}
                    {qa('How does the password protect it?', 'Your password is processed through PBKDF2 — 310,000 rounds of hashing — to derive an AES-256-GCM encryption key. This key encrypts your Kyber secret key in your browser\'s secure local storage. Even if someone accesses your device storage, they cannot use your Kyber key without your password.')}
                    {qa('What if I forget it?', '<span style="color:hsl(38 92% 50%)">Use your 24-word recovery phrase to restore access and set a new password. The phrase is the master — the password is for daily convenience.</span>')}
                  </>, '#22c55e')}

                  {!passwordSet ? (
                    <>
                      <input type="password" placeholder="Choose a strong password (min 8 characters)" value={walletPassword} onChange={e => setWalletPassword(e.target.value)}
                        style={{ width: '100%', padding: '13px 16px', background: 'rgba(0,5,20,0.8)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: '10px', color: '#f0f6ff', fontSize: '14px', fontFamily: 'monospace', marginBottom: '10px', boxSizing: 'border-box' as const, outline: 'none' }} />
                      <input type="password" placeholder="Confirm your password" value={walletPasswordConfirm} onChange={e => setWalletPasswordConfirm(e.target.value)}
                        style={{ width: '100%', padding: '13px 16px', background: 'rgba(0,5,20,0.8)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: '10px', color: '#f0f6ff', fontSize: '14px', fontFamily: 'monospace', marginBottom: '12px', boxSizing: 'border-box' as const, outline: 'none' }} />
                      {walletPassword.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(0,212,255,0.1)', marginBottom: '4px' }}>
                            <div style={{ height: '100%', borderRadius: '2px', width: `${Math.min(100, walletPassword.length * 8)}%`, background: walletPassword.length < 8 ? '#ef4444' : walletPassword.length < 12 ? '#f59e0b' : '#22c55e', transition: 'all 0.3s' }} />
                          </div>
                          <p style={{ color: walletPassword.length < 8 ? '#ef4444' : walletPassword.length < 12 ? '#f59e0b' : '#22c55e', fontSize: '11px', fontFamily: 'monospace', margin: 0 }}>
                            {walletPassword.length < 8 ? 'Too short' : walletPassword.length < 12 ? 'Acceptable' : 'Strong ✓'}
                          </p>
                        </div>
                      )}
                      <button onClick={async () => {
                        if (walletPassword.length < 8) { alert('Password must be at least 8 characters'); return }
                        if (walletPassword !== walletPasswordConfirm) { alert('Passwords do not match'); return }
                        try {
                          const { loadWallet, savePasswordVault, saveMnemonicVault } = await import('../lib/wallet/storage')
                          const { sealWithPassword } = await import('../lib/wallet/password')
                          const { deriveKeySeeds } = await import('../lib/wallet/hkdf')
                          const { mnemonicToSeedSync } = await import('@scure/bip39')
                          const stored = await loadWallet()
                          if (!stored) { alert('Wallet not found'); return }
                          const bip39Seed = mnemonicToSeedSync(newWalletMnemonic!)
                          const seeds = await deriveKeySeeds(bip39Seed)
                          const vault = await sealWithPassword(seeds.localEncKey, walletPassword)
                          seeds.localEncKey.fill(0)
                          await savePasswordVault(vault)
                          // Also store mnemonic encrypted with same password so new accounts
                          // can be derived without re-entering the 24 words
                          const mnemonicBytes = new TextEncoder().encode(newWalletMnemonic!)
                          const mnemonicVault = await sealWithPassword(mnemonicBytes, walletPassword)
                          mnemonicBytes.fill(0)
                          await saveMnemonicVault(mnemonicVault)
                          setPasswordSet(true)
                        } catch (e: any) { alert('Failed: ' + e.message) }
                      }} style={{ width: '100%', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: 'white', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)', boxShadow: '0 0 24px rgba(34,197,94,0.3)' }}>
                        Encrypt Wallet with Password
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '16px', textAlign: 'center' as const }}>
                        <p style={{ color: '#22c55e', fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, margin: 0 }}>✅ Password set — Kyber key encrypted on this device</p>
                      </div>
                      {nextBtn('Next: Download Protocol Key →', () => setOnboardStep(3), true, '#f59e0b')}
                    </>
                  )}
                </div>
              )}

              {/* ── WIZARD STEP 3: Protocol Key ── */}
              {onboardStep === 3 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>🏦</div>
                    <div>
                      <h2 style={{ color: '#f0f6ff', fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>Your Protocol Second Key</h2>
                      <p style={{ color: '#00D4FF', fontSize: '11px', fontFamily: 'monospace', margin: 0 }}>Step 3 of 7 — Vault minting authorisation</p>
                    </div>
                  </div>
                  {infoBox(<>
                    {qa('What is this key?', 'The Protocol Second Key is a separate security layer for your <strong style="color:hsl(205 85% 55%)">vault</strong> — not your wallet. You need it to mint UBTC from your Bitcoin collateral and to move UBTC from your vault to your wallet. It proves you are the legitimate vault owner.')}
                    {qa('How is it different from my password and phrase?', 'You have three independent security layers:<br/>• <strong style="color:hsl(38 92% 50%)">24-word phrase</strong> — master recovery key<br/>• <strong style="color:hsl(142 76% 36%)">Password</strong> — encrypts your Kyber key on this device<br/>• <strong style="color:hsl(205 85% 55%)">Protocol Key</strong> — authorises vault minting operations<br/><br/>All three are needed for full system access. This is defence in depth.')}
                    {qa('How do I use it?', 'Download it now. When you mint UBTC, upload this file. The system checks a cryptographic hash — the key itself never leaves your device. Store it separately from your recovery phrase.')}
                  </>, '#00D4FF')}

                  <div style={{ background: 'linear-gradient(135deg,#050f20,#020810)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                    {isInTelegram() && result.protocol_second_key && (
                      <TelegramSafeDisplay
                        title="Protocol Second Key"
                        content={result.protocol_second_key}
                        description="Tap Copy to save into your password manager. Or tap Show QR to scan with another device. You will need this to mint UBTC and move UBTC out of your vault."
                        confirmed={pskDownloaded}
                        onConfirmedChange={setPskDownloaded}
                        confirmLabel="I have copied my Protocol Second Key into a secure password manager. I understand I will need this to mint UBTC."
                        accentColor="hsl(205 85% 55%)"
                      />
                    )}
                    {!isInTelegram() && <>
                    <p style={{ color: 'rgba(0,212,255,0.5)', fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase' as const, letterSpacing: '0.35em', margin: '0 0 6px' }}>Protocol Second Key</p>
                    <p style={{ color: '#00D4FF', fontSize: '11px', fontFamily: 'monospace', margin: '0 0 12px', wordBreak: 'break-all' as const }}>{result.protocol_second_key?.substring(0, 64)}...</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => navigator.clipboard.writeText(result.protocol_second_key || '')} style={{ flex: 1, background: 'linear-gradient(135deg,#050f20,#020810)', color: 'rgba(160,200,240,0.7)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: '8px', padding: '10px', fontSize: '11px', fontFamily: 'monospace', cursor: 'pointer' }}>Copy</button>
                      <button onClick={() => {
                        const text = `QAP PROTOCOL SECOND KEY\nVault: ${result.vault_id}\nCreated: ${new Date().toISOString()}\n\nWARNING: This key authorises minting UBTC from your vault.\nUpload it when minting. Store securely. Never share.\n\n${result.protocol_second_key}`
                        const blob = new Blob([text], { type: 'text/plain' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a'); a.href = url; a.download = `protocol-key-${result.vault_id}.txt`
                        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
                        setPskDownloaded(true)
                     }} style={{ flex: 1, background: 'linear-gradient(135deg,#0066cc,#0044aa)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 16px rgba(0,212,255,0.25)' }}>⬇ Download Key File</button>
                    </div>
                    </>}
                    </div>
              
                  {nextBtn(isInTelegram() ? 'Saved — Next: Verify My Key →' : 'Downloaded — Next: Verify My Key →', () => setOnboardStep(4), pskDownloaded)}
                  {!pskDownloaded && <p style={{ color: 'rgba(0,212,255,0.35)', fontSize: '11px', fontFamily: 'monospace', textAlign: 'center' as const, marginTop: '8px' }}>{isInTelegram() ? 'Copy your key and confirm to continue' : 'Download your key file to continue'}</p>}
                </div>
              )}

              {/* ── WIZARD STEP 4: Verify Key ── */}
              {onboardStep === 4 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'hsl(270 85% 65% / 0.15)', border: '1px solid hsl(270 85% 65% / 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>🧪</div>
                    <div>
                      <h2 style={{ color: '#f0f6ff', fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>Prove You Saved Your Key</h2>
                      <p style={{ color: '#a855f7', fontSize: '11px', fontFamily: 'monospace', margin: 0 }}>Step 4 of 7 — Verification</p>
                    </div>
                  </div>
                  {infoBox(<>
                    {qa('Why are we doing this?', 'We need to confirm you actually saved your Protocol Second Key — not just clicked download and forgot about it. If you cannot upload it now, you will not be able to mint UBTC later. <strong style="color:hsl(270 85% 65%)">This test could save your funds.</strong>')}
                    {qa('What do I do?', 'Find the file you just downloaded — it will be called <strong>protocol-key-' + result.vault_id + '.txt</strong> in your Downloads folder. Upload it below. The system will verify it matches your vault.')}
                  </>, '#a855f7')}

                  {!pskVerified ? (
                    <>
                      {!isInTelegram() && (
                        <label style={{ display: 'block', border: `2px dashed ${pskVerifyError ? '#ef4444' : 'rgba(0,212,255,0.2)'}`, borderRadius: '12px', padding: '32px', textAlign: 'center' as const, cursor: 'pointer', marginBottom: '12px', transition: 'border-color 0.2s', background: 'rgba(0,212,255,0.02)' }}>
                          <p style={{ color: 'rgba(160,200,240,0.7)', fontSize: '13px', fontFamily: 'monospace', margin: '0 0 4px' }}>Click to upload your Protocol Key file</p>
                          <p style={{ color: 'rgba(0,212,255,0.35)', fontSize: '11px', fontFamily: 'monospace', margin: 0 }}>protocol-key-{result.vault_id}.txt</p>
                          <input type="file" accept=".txt,.key,.json" onChange={e => { const f = e.target.files?.[0]; if (f) verifyProtocolKey(f) }} style={{ display: 'none' }} />
                        </label>
                      )}
                      {isInTelegram() && (
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', color: 'rgba(0,212,255,0.5)', fontSize: '11px', fontFamily: 'monospace', marginBottom: '8px' }}>Paste your Protocol Second Key</label>
                          <textarea
                            value={pskPasteInput}
                            onChange={e => setPskPasteInput(e.target.value)}
                            placeholder="Paste the key you saved earlier..."
                            rows={3}
                            style={{ width: '100%', background: 'rgba(0,5,20,0.8)', border: `1px solid ${pskVerifyError ? '#ef4444' : 'rgba(0,212,255,0.15)'}`, borderRadius: '10px', padding: '12px 14px', color: '#f0f6ff', fontSize: '12px', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' as const, resize: 'vertical' as const, marginBottom: '10px' }}
                          />
                          <button
                            onClick={() => verifyProtocolKeyText(pskPasteInput)}
                            disabled={!pskPasteInput.trim()}
                            style={{ width: '100%', background: pskPasteInput.trim() ? 'linear-gradient(135deg,#7c3aed,#5b21b6)' : 'rgba(255,255,255,0.04)', color: pskPasteInput.trim() ? 'white' : 'rgba(120,160,220,0.3)', border: pskPasteInput.trim() ? 'none' : '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '12px', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-display)', cursor: pskPasteInput.trim() ? 'pointer' : 'not-allowed' }}
                          >
                            Verify My Key
                          </button>
                        </div>
                      )}
                      {pskVerifyError && (
                        <div style={{ background: 'hsl(0 84% 60% / 0.1)', border: '1px solid hsl(0 84% 60% / 0.3)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                          <p style={{ color: '#ef4444', fontSize: '12px', fontFamily: 'monospace', margin: 0 }}>❌ {pskVerifyError}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '12px', padding: '20px', marginBottom: '16px', textAlign: 'center' as const }}>
                      <p style={{ color: '#22c55e', fontSize: '15px', fontFamily: 'monospace', fontWeight: 700, margin: '0 0 4px' }}>✅ Key verified — your file is saved correctly</p>
                      <p style={{ color: 'rgba(160,200,240,0.6)', fontSize: '12px', fontFamily: 'monospace', margin: 0 }}>You will need this file every time you mint UBTC</p>
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
                      <h2 style={{ color: '#f0f6ff', fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>Your Account is Ready</h2>
                      <p style={{ color: '#f59e0b', fontSize: '11px', fontFamily: 'monospace', margin: 0 }}>Step 5 of 7 — Understanding your vault and wallet</p>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                    <p style={{ color: '#22c55e', fontSize: '9px', fontFamily: 'monospace', fontWeight: 700, margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '0.35em' }}>Vault Created</p>
                    <p style={{ color: 'rgba(160,200,240,0.7)', fontSize: '11px', fontFamily: 'monospace', margin: '0 0 8px' }}>{result.vault_id}</p>
                    <p style={{ color: 'rgba(0,212,255,0.5)', fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase' as const, letterSpacing: '0.35em', margin: '0 0 4px' }}>Bitcoin Deposit Address</p>
                    <p style={{ color: '#00D4FF', fontSize: '11px', fontFamily: 'monospace', margin: 0, wordBreak: 'break-all' as const }}>{result.mast_address || result.deposit_address}</p>
                  </div>

                  {infoBox(<>
                    <p style={{ color: 'hsl(0 0% 78%)', fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, margin: '0 0 16px' }}>Understanding the QAP System</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '12px' }}>
                        <p style={{ color: '#f59e0b', fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, margin: '0 0 8px' }}>🏦 YOUR VAULT</p>
                        <p style={{ color: 'rgba(160,200,240,0.7)', fontSize: '11px', fontFamily: 'monospace', margin: 0, lineHeight: '1.7' }}>Holds your Bitcoin collateral. Like a safe deposit box. You deposit BTC, it locks in Taproot. You mint UBTC against it.</p>
                      </div>
                      <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', padding: '12px' }}>
                        <p style={{ color: '#22c55e', fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, margin: '0 0 8px' }}>💳 YOUR WALLET</p>
                        <p style={{ color: 'rgba(160,200,240,0.7)', fontSize: '11px', fontFamily: 'monospace', margin: 0, lineHeight: '1.7' }}>Holds your UBTC balance. Like a current account. You send, receive and redeem UBTC from here.</p>
                      </div>
                    </div>
                    {qa('How does minting work?', '1. Deposit BTC to your vault address<br/>2. Mint UBTC against it (150% collateral ratio — $150 BTC = max $100 UBTC)<br/>3. Move UBTC to your wallet<br/>4. Send to anyone on QAP')}
                    {qa('How does redemption work?', 'When someone sends you UBTC, you receive a proof file. Upload it on the Redeem page, enter your password, and the system releases BTC from the original vault to your Bitcoin address. No intermediary. No bridge. Pure Bitcoin.')}
                    {qa('What is the 150% collateral ratio?', 'For every $100 UBTC you mint, you must have $150 worth of BTC locked. This overcollateral protects the peg. If BTC falls below the liquidation threshold, the vault is liquidated to protect the system. Your excess collateral is returned.')}
                  </>, '#f59e0b')}

                  {nextBtn('I understand — Set Up My Wallet →', () => setOnboardStep(6), true)}
                </div>
              )}

              {/* ── WIZARD STEP 6: Quantum Username / Wallet Setup ── */}
              {onboardStep === 6 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'hsl(270 85% 65% / 0.15)', border: '1px solid hsl(270 85% 65% / 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>⚛️</div>
                    <div>
                      <h2 style={{ color: '#f0f6ff', fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>Choose Your Quantum Username</h2>
                      <p style={{ color: '#a855f7', fontSize: '11px', fontFamily: 'monospace', margin: 0 }}>Step 6 of 7 — Your permanent QAP identity</p>
                    </div>
                  </div>

                  {infoBox(<>
                    {qa('What is a Quantum Username?', 'This is your permanent identity on the Quantum Asset Protocol. It is how people send you UBTC — instead of a long wallet address, they type <strong style="color:hsl(270 85% 65%)">@yourname</strong>. First come, first served. Once chosen, it is yours forever.')}
                    {qa('Why is it called Quantum?', 'Your username is linked to your Kyber1024 quantum-resistant public key. When someone sends you UBTC, it is encrypted with your Kyber key — unbreakable by any classical or quantum computer. Your @username is the human face of your post-quantum identity.')}
                    {qa('Can I change it later?', '<span style="color:hsl(0 84% 60%)">No. Your Quantum Username is permanent. It is inscribed on the QAP network and linked to your vault and wallet forever. Choose carefully.</span>')}
                    {qa('How do people send me UBTC?', 'They type @yourname in the Send field. QAP resolves it to your wallet address and Kyber public key automatically. Your UBTC arrives encrypted — only you can decrypt and redeem it with your password.')}
                  </>, '#a855f7')}

                  {!quantumUsernameSet ? (
                    <>
                      <div style={{ position: 'relative' as const, marginBottom: '8px' }}>
                        <span style={{ position: 'absolute' as const, left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#a855f7', fontSize: '18px', fontFamily: 'monospace', fontWeight: 700 }}>@</span>
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
                          style={{ width: '100%', padding: '16px 16px 16px 36px', background: 'rgba(0,5,20,0.8)', border: `2px solid ${quantumUsernameAvailable === true ? 'rgba(34,197,94,0.5)' : quantumUsernameAvailable === false ? '#ef4444' : 'rgba(0,212,255,0.15)'}`, borderRadius: '12px', color: '#f0f6ff', fontSize: '20px', fontFamily: 'monospace', fontWeight: 700, outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.2s' }}
                        />
                        {checkingUsername && <span style={{ position: 'absolute' as const, right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(160,200,240,0.5)', fontSize: '12px', fontFamily: 'monospace' }}>checking...</span>}
                        {!checkingUsername && quantumUsernameAvailable === true && <span style={{ position: 'absolute' as const, right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#22c55e', fontSize: '16px' }}>✓ available</span>}
                        {!checkingUsername && quantumUsernameAvailable === false && <span style={{ position: 'absolute' as const, right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#ef4444', fontSize: '16px' }}>✗ taken</span>}
                      </div>
                      <p style={{ color: 'rgba(0,212,255,0.35)', fontSize: '11px', fontFamily: 'monospace', margin: '0 0 20px' }}>Lowercase letters, numbers, underscores · 3–20 characters · Permanent</p>

                      {quantumUsernameAvailable && (
                        <div style={{ background: 'hsl(270 85% 65% / 0.08)', border: '1px solid hsl(270 85% 65% / 0.3)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                          <p style={{ color: '#a855f7', fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, margin: '0 0 4px' }}>@{quantumUsername} is available</p>
                          <p style={{ color: 'rgba(160,200,240,0.6)', fontSize: '12px', fontFamily: 'monospace', margin: 0 }}>People will send you UBTC using @{quantumUsername}. This cannot be changed.</p>
                        </div>
                      )}

                      <button onClick={quantumUsernameSet ? undefined : async () => { await setQuantumWalletUsername() }} disabled={!quantumUsernameAvailable} style={{ width: '100%', background: quantumUsernameAvailable ? 'linear-gradient(135deg,#7c3aed,#0066cc)' : 'rgba(255,255,255,0.04)', color: quantumUsernameAvailable ? 'white' : 'rgba(120,160,220,0.3)', border: quantumUsernameAvailable ? 'none' : '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: 700, cursor: quantumUsernameAvailable ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', boxShadow: quantumUsernameAvailable ? '0 0 30px rgba(124,58,237,0.4)' : 'none' }}>
                        {quantumUsernameAvailable ? `Claim @${quantumUsername} — My Quantum Identity` : 'Choose a username to continue'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ background: 'hsl(270 85% 65% / 0.1)', border: '1px solid hsl(270 85% 65% / 0.3)', borderRadius: '12px', padding: '20px', marginBottom: '16px', textAlign: 'center' as const }}>
                        <p style={{ color: '#a855f7', fontSize: '24px', fontFamily: 'monospace', fontWeight: 700, margin: '0 0 4px' }}>@{quantumUsername}</p>
                        <p style={{ color: 'rgba(160,200,240,0.6)', fontSize: '12px', fontFamily: 'monospace', margin: 0 }}>Your Quantum Username is set — permanent and unique to you</p>
                      </div>
                      {nextBtn('All done — See My Summary →', () => setOnboardStep(7), true, '#7c3aed')}
                    </>
                  )}
                </div>
              )}

              {/* ── WIZARD STEP 7: Ready ── */}
              {onboardStep === 7 && (
                <div style={{ textAlign: 'center' as const }}>
                  <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(34,197,94,0.08)', border: '2px solid rgba(34,197,94,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '32px' }}>✅</div>
                  <h2 style={{ color: '#f0f6ff', fontSize: '24px', fontWeight: '700', margin: '0 0 4px' }}>Welcome to QAP, @{quantumUsername || username}!</h2>
                  <p style={{ color: '#a855f7', fontSize: '14px', fontFamily: 'monospace', margin: '0 0 24px' }}>Your Quantum Username: @{quantumUsername || username}</p>

                  <div style={{ background: 'rgba(0,5,20,0.6)', border: '1px solid rgba(0,212,255,0.1)', borderRadius: '12px', padding: '16px', textAlign: 'left' as const, marginBottom: '20px' }}>
                    <p style={{ color: 'rgba(0,212,255,0.5)', fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase' as const, letterSpacing: '0.35em', margin: '0 0 12px' }}>Your Security Setup</p>
                    {[
                      { label: '24-word recovery phrase', detail: 'Written on paper, stored offline', status: '✅', color: '#f59e0b' },
                      { label: 'Wallet password', detail: 'Encrypts your Kyber1024 key locally', status: '✅', color: '#22c55e' },
                      { label: 'Protocol Second Key', detail: 'Saved and verified — use for minting', status: '✅', color: '#00D4FF' },
                      { label: 'Quantum Kyber1024', detail: 'Post-quantum encryption active', status: '✅', color: '#a855f7' },
                      { label: 'Quantum Username', detail: `@${quantumUsername || username} — permanent QAP identity`, status: '✅', color: '#a855f7' },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid rgba(0,212,255,0.06)' }}>
                        <div>
                          <p style={{ color: 'rgba(160,200,240,0.7)', fontSize: '12px', fontFamily: 'monospace', margin: '0 0 2px' }}>{item.label}</p>
                          <p style={{ color: 'rgba(0,212,255,0.35)', fontSize: '10px', fontFamily: 'monospace', margin: 0 }}>{item.detail}</p>
                        </div>
                        <span style={{ color: '#22c55e', fontSize: '16px', flexShrink: 0, marginLeft: '12px' }}>{item.status}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: 'rgba(0,5,20,0.6)', border: '1px solid rgba(0,212,255,0.1)', borderRadius: '12px', padding: '16px', textAlign: 'left' as const, marginBottom: '20px' }}>
                    <p style={{ color: 'rgba(0,212,255,0.5)', fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase' as const, letterSpacing: '0.35em', margin: '0 0 8px' }}>Next Steps</p>
                    {[
                      { n: '1', label: 'Deposit Bitcoin', detail: 'Send BTC to your vault address to lock as collateral', color: '#f59e0b' },
                      { n: '2', label: 'Mint UBTC', detail: 'Create UBTC against your BTC collateral (150% ratio)', color: '#00D4FF' },
                      { n: '3', label: 'Send to your wallet', detail: 'Move minted UBTC to your wallet — ready to use', color: '#22c55e' },
                      { n: '4', label: 'Send to @anyone', detail: `Type @username to send — they receive encrypted proof`, color: '#a855f7' },
                    ].map(item => (
                      <div key={item.n} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid rgba(0,212,255,0.06)' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: item.color + '20', border: `1px solid ${item.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ color: item.color, fontSize: '11px', fontWeight: 700, fontFamily: 'monospace' }}>{item.n}</span>
                        </div>
                        <div>
                          <p style={{ color: 'hsl(0 0% 78%)', fontSize: '13px', fontFamily: 'monospace', fontWeight: 600, margin: '0 0 2px' }}>{item.label}</p>
                          <p style={{ color: 'rgba(160,200,240,0.5)', fontSize: '11px', fontFamily: 'monospace', margin: 0 }}>{item.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <a href={`/deposit?vault=${result.vault_id}`} style={{ display: 'block', width: '100%', background: 'linear-gradient(135deg,#0066cc,#0044aa)', color: 'white', textDecoration: 'none', borderRadius: '12px', padding: '18px', fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-display)', textAlign: 'center' as const, boxSizing: 'border-box' as const, boxShadow: '0 0 30px rgba(0,212,255,0.4)', marginBottom: '10px' }}>
                    ₿ Fund My Account →
                  </a>
                  <a href="/dashboard" style={{ display: 'block', width: '100%', background: 'linear-gradient(135deg,#050f20,#020810)', border: '1px solid rgba(0,212,255,0.15)', color: 'rgba(0,212,255,0.6)', textDecoration: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontFamily: 'var(--font-display)', textAlign: 'center' as const, boxSizing: 'border-box' as const }}>
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
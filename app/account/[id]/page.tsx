'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { API_URL, supabase } from '../../lib/supabase'
import { QuantumLoader } from '../../components/QuantumLoader'
import { Icons } from '../../components/Icons'
import { PasswordModal } from '../../components/PasswordModal'
import { signedSpendWithPassword } from '../../lib/wallet/challenge'
import { useIsMobile } from '../../lib/useIsMobile'

// ── Shared style helpers ─────────────────────────────────────────────────────
const mono: any = { fontFamily: 'var(--font-mono)' }

const isInstitutional = () =>
  typeof window !== 'undefined' &&
  (localStorage.getItem('qufi_theme') === 'light' || localStorage.getItem('qufi_user_type') === 'institutional')

const glass = (_extra?: string) => isInstitutional() ? {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '20px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
} : {
  background: 'linear-gradient(135deg,#050f20,#020810)',
  border: '1px solid rgba(0,212,255,0.12)',
  borderRadius: '20px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(0,212,255,0.08)',
}

function AccountContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const vaultId = params.id as string
  const initialCurrency = (searchParams.get('currency') || 'ubtc').toLowerCase()

  const [vault, setVault]                     = useState<any>(null)
  const [transactions, setTransactions]       = useState<any[]>([])
  const [walletTxs, setWalletTxs]             = useState<any[]>([])
  const [walletBalance, setWalletBalance]     = useState(0)
  const [showMoveModal, setShowMoveModal]     = useState(false)
  const [moveAmount, setMoveAmount]           = useState('')
  const [moveLoading, setMoveLoading]         = useState(false)
  const [moveError, setMoveError]             = useState('')
  const [moveDone, setMoveDone]               = useState(false)
  const [movePsk, setMovePsk]                 = useState('')
  const movePskInputRef                       = useRef<HTMLInputElement>(null)
  const moveInProgress                        = useRef(false)
  const [movePasswordOpen, setMovePasswordOpen] = useState(false)
  const [stablecoins, setStablecoins]         = useState<any[]>([])
  const [scTransactions, setScTransactions]   = useState<any[]>([])
  const [btcPrice, setBtcPrice]               = useState(0)
  const [loading, setLoading]                 = useState(true)
  const [currencyTab, setCurrencyTab]         = useState<'ubtc'|'uusdt'|'uusdc'>(initialCurrency as any)
  const [showAddModal, setShowAddModal]       = useState<'UUSDT'|'UUSDC'|null>(null)
  const [addStep, setAddStep]                 = useState<'deposit'|'quantum'|'done'>('deposit')
  const [depositAmount, setDepositAmount]     = useState('')
  const [addLoading, setAddLoading]           = useState(false)
  const [addError, setAddError]               = useState('')
  const [otpId, setOtpId]                     = useState('')
  const [otpCode, setOtpCode]                 = useState('')
  const [otpExpires, setOtpExpires]           = useState('')
  const [otpInput, setOtpInput]               = useState('')
  const [secondKey, setSecondKey]             = useState('')
  const [qSigningKey, setQSigningKey]         = useState('')
  const [keySaved, setKeySaved]               = useState(false)
  const [copied, setCopied]                   = useState('')
  const [notifications, setNotifications]     = useState<any[]>([])
  const [ubtcCirculation, setUbtcCirculation] = useState(0)
  const [redemptionHistory, setRedemptionHistory] = useState<any[]>([])
  const isMobile = useIsMobile()

  const accountMeta: Record<string, { icon: any; title: string; color: string }> = {
    current:       { icon: Icons.currentAccount(20, 'var(--q-electric)'), title: 'Current Account',  color: 'var(--q-electric)' },
    savings:       { icon: Icons.savings(20, 'var(--q-btc)'),             title: 'Savings Account',  color: 'var(--q-btc)' },
    yield:         { icon: Icons.yield(20, 'var(--q-green)'),             title: 'Yield Account',    color: 'var(--q-green)' },
    custody_yield: { icon: Icons.chart(20, 'var(--q-electric)'),          title: 'Custody Yield',    color: 'var(--q-electric)' },
    prime:         { icon: Icons.vault(20, 'var(--q-violet)'),            title: 'Prime Account',    color: 'var(--q-violet)' },
    managed_yield: { icon: Icons.yield(20, 'var(--q-green)'),             title: 'Managed Yield',    color: 'var(--q-green)' },
  }

  useEffect(() => {
    loadAll()
    const vaultSub = supabase.channel('vault-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vaults', filter: `id=eq.${vaultId}` }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ubtc_wallets' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ubtc_proofs' }, () => loadAll())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vault_notifications', filter: `vault_id=eq.${vaultId}` }, () => loadAll())
      .subscribe()
    return () => { supabase.removeChannel(vaultSub) }
  }, [vaultId])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [vaultRes, txRes, priceRes, scRes] = await Promise.all([
        fetch(`${API_URL}/vaults/${vaultId}`),
        fetch(`${API_URL}/vaults/${vaultId}/transactions`),
        fetch(`${API_URL}/price`),
        fetch(`${API_URL}/stablecoins`),
      ])
      const vaultData = await vaultRes.json()
      const txData    = await txRes.json()
      const priceData = await priceRes.json()
      const scData    = await scRes.json()
      setVault(vaultData)
      setTransactions(txData.transactions || [])
      setBtcPrice(parseFloat(priceData.btc_usd) || 0)
      if (vaultData.linked_wallet) {
        const [walRes, wtxRes] = await Promise.all([
          fetch(`${API_URL}/wallets/all`).catch(() => null),
          fetch(`${API_URL}/wallet/${vaultData.linked_wallet}/transactions`).catch(() => null),
        ])
        if (walRes) {
          const walData = await walRes.json().catch(() => null)
          const myWallet = (walData?.wallets || []).find((w: any) => w.wallet_address === vaultData.linked_wallet)
          if (myWallet) setWalletBalance(parseFloat(myWallet.balance || '0'))
        }
        if (wtxRes) {
          const wtxData = await wtxRes.json().catch(() => null)
          setWalletTxs(wtxData?.transactions || [])
        }
      }
      const accountSc = (scData.stablecoins || []).filter((s: any) => s.account_type === vaultData.account_type)
      setStablecoins(accountSc)
      const scTxResults = await Promise.all(accountSc.map((sc: any) =>
        fetch(`${API_URL}/stablecoin/${sc.vault_id}/transactions`).then(r => r.json()).catch(() => ({ transactions: [] }))
      ))
      setScTransactions(scTxResults.flatMap((r: any) => r.transactions || []))
    } catch (e) { console.error(e) }
    try {
      const redRes = await fetch(`${API_URL}/vaults/${vaultId}/redemptions`)
      setRedemptionHistory((await redRes.json()).redemptions || [])
    } catch {}
    try {
      const circRes = await fetch(`${API_URL}/vaults/${vaultId}/circulation`)
      setUbtcCirculation(parseFloat((await circRes.json()).total_in_circulation || '0'))
    } catch {}
    try {
      const notifRes = await fetch(`${API_URL}/vaults/${vaultId}/notifications`)
      setNotifications((await notifRes.json()).notifications || [])
    } catch {}
    setLoading(false)
  }

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(''), 2000)
  }

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button onClick={() => copy(text, id)} style={{
      display: 'flex', alignItems: 'center', gap: '5px',
      background: copied === id ? 'rgba(0,255,157,0.1)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${copied === id ? 'rgba(0,255,157,0.3)' : 'var(--q-border-subtle)'}`,
      color: copied === id ? 'var(--q-green)' : 'var(--q-text-3)',
      borderRadius: '8px', padding: '6px 12px',
      fontSize: '10px', cursor: 'pointer', ...mono,
      whiteSpace: 'nowrap', flexShrink: 0,
      letterSpacing: '0.06em',
      transition: 'all 0.2s',
    }}>
      {copied === id ? Icons.check(11, 'var(--q-green)') : Icons.copy(11, 'var(--q-text-3)')}
      {copied === id ? 'Copied' : 'Copy'}
    </button>
  )

  const makeQSK = (raw: string): string => {
    if (!raw || raw.length < 32) { const r = () => Math.random().toString(36).slice(2, 10).toUpperCase(); return `QSK-${r()}-${r()}-${r()}-${r()}` }
    return 'QSK-' + [0, 8, 16, 24].map(i => raw.slice(i, i + 8).toUpperCase()).join('-')
  }

  const handleDeposit = async () => {
    if (!depositAmount || !showAddModal) return
    setAddLoading(true); setAddError('')
    try {
      const depRes = await fetch(`${API_URL}/stablecoin/deposit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currency: showAddModal, amount: depositAmount, account_type: vault.account_type }) })
      const depData = await depRes.json()
      if (!depRes.ok) throw new Error(depData.error)
      const otpRes = await fetch(`${API_URL}/wallet/otp/request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wallet_address: vaultId, amount: depositAmount, destination: `mint-${showAddModal}` }) })
      const otpData = await otpRes.json()
      if (!otpRes.ok) throw new Error(otpData.error)
      setOtpId(otpData.otp_id); setOtpCode(otpData.otp_code); setOtpExpires(otpData.expires_at)
      setAddStep('quantum')
    } catch (e: any) { setAddError(e.message) }
    setAddLoading(false)
  }

  const handleQuantumMint = async () => {
    if (!otpInput || !secondKey || !showAddModal) return
    setAddLoading(true); setAddError('')
    try {
      const verifyRes = await fetch(`${API_URL}/wallet/otp/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ otp_id: otpId, otp_code: otpInput, second_key: secondKey }) })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok || !verifyData.verified) throw new Error(verifyData.error || 'Invalid OTP or second key')
      const sc = stablecoins.find(s => s.currency === showAddModal)
      if (!sc) throw new Error('Stablecoin vault not found')
      const mintRes = await fetch(`${API_URL}/stablecoin/mint`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vault_id: sc.vault_id, amount: depositAmount }) })
      const mintData = await mintRes.json()
      if (!mintRes.ok) throw new Error(mintData.error)
      setQSigningKey(makeQSK(verifyData.pq_signature || '')); setAddStep('done'); await loadAll()
    } catch (e: any) { setAddError(e.message) }
    setAddLoading(false)
  }

  const handleMoveToWallet = () => {
    if (!moveAmount || !vault.linked_wallet) return
    if (parseFloat(moveAmount) <= 0 || parseFloat(moveAmount) > ubtcBalance) return
    setMoveError(''); setMovePasswordOpen(true)
  }

  const submitMoveToWallet = async (password: string) => {
    if (moveInProgress.current) return
    moveInProgress.current = true
    setMovePasswordOpen(false); setMoveLoading(true); setMoveError('')
    try {
      const walletAddress = localStorage.getItem('ubtc_wallet_address') || ''
      const { challenge_id, signature, sphincs_signature } = await signedSpendWithPassword(
        walletAddress, 'vault_to_wallet', `${vaultId}|${vault.linked_wallet}|${moveAmount}`, password
      )
      const res = await fetch(`${API_URL}/vaults/${vaultId}/send-to-wallet`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vault_id: vaultId, wallet_address: vault.linked_wallet, ubtc_amount: moveAmount, second_key: String(movePsk).trim(), challenge_id, signature, sphincs_signature })
      })
      const text = await res.text()
      let data: any = {}
      try { data = JSON.parse(text) } catch { throw new Error(text || 'Transfer failed') }
      if (!res.ok) throw new Error(data.error || 'Transfer failed')
      setMoveDone(true); await loadAll()
    } catch (e: any) { setMoveError(e.message) }
    setMoveLoading(false); moveInProgress.current = false
  }

  const dismissNotification = async (notifId: string) => {
    await fetch(`${API_URL}/vaults/${vaultId}/notifications/${notifId}/dismiss`, { method: 'POST' })
    setNotifications(prev => prev.filter(n => n.id !== notifId))
  }

  const resetModal = () => {
    setShowAddModal(null); setAddStep('deposit'); setDepositAmount(''); setAddError('')
    setOtpId(''); setOtpCode(''); setOtpExpires(''); setOtpInput(''); setSecondKey(''); setQSigningKey(''); setKeySaved(false)
  }

  if (loading) return <QuantumLoader text="Loading account" />
  if (!vault) return (
    <div style={{ minHeight: '100vh', background: 'var(--q-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--q-red)', fontSize: '13px', ...mono }}>Account not found</p>
    </div>
  )

  const meta             = accountMeta[vault.account_type] || { icon: Icons.currentAccount(20, 'var(--q-electric)'), title: vault.account_type, color: 'var(--q-electric)' }
  const btcLocked        = vault.btc_amount_sats / 100_000_000
  const btcValue         = btcLocked * btcPrice
  const ubtcBalance      = parseFloat(vault.ubtc_minted || '0')
  const maxMintable      = btcValue / 1.5
  const remainingMintable = maxMintable - ubtcBalance
  const ratio            = ubtcBalance > 0 ? (btcValue / ubtcBalance * 100) : 0
  const ratioColor       = ratio >= 200 ? 'var(--q-green)' : ratio >= 150 ? 'var(--q-btc)' : ratio > 0 ? 'var(--q-red)' : 'var(--q-text-3)'
  const safetyLabel      = ratio >= 200 ? 'Healthy' : ratio >= 150 ? 'Adequate' : ratio > 0 ? 'Low — add BTC' : '—'
  const uusdtSc          = stablecoins.filter(s => s.currency === 'UUSDT')
  const uusdcSc          = stablecoins.filter(s => s.currency === 'UUSDC')
  const uusdtBal         = uusdtSc.reduce((s, x) => s + parseFloat(x.balance || '0'), 0)
  const uusdcBal         = uusdcSc.reduce((s, x) => s + parseFloat(x.balance || '0'), 0)
  const isActive         = vault.status === 'active'
  const hasMinted        = ubtcBalance > 0
  const availableToMove  = Math.max(0, ubtcBalance - ubtcCirculation)
  const depositAddr      = vault.mast_address || vault.deposit_address
  const scColor          = showAddModal === 'UUSDT' ? 'var(--q-green)' : 'var(--q-cyan)'
  const scToken          = showAddModal === 'UUSDT' ? 'USDT' : 'USDC'
  const scUToken         = showAddModal || 'UUSDT'
  const scAddr           = '0x' + vaultId.replace('vault_', '').padEnd(40, 'a1b2c3d4e5f67890abcdef12')
  const inst = isInstitutional()
  const fieldStyle: any  = { display: 'block', width: '100%', padding: '14px 16px', background: inst?'#f8fafc':'rgba(0,5,20,0.7)', border: '1px solid var(--q-border)', borderRadius: '12px', color: 'var(--q-text)', fontSize: '14px', ...mono, outline: 'none', boxSizing: 'border-box' }

  const kindColor = (kind: string) => {
    const map: Record<string, string> = { mint: 'var(--q-electric)', deposit: 'var(--q-btc)', redeem: 'var(--q-green)', burn: 'var(--q-red)', transfer: 'var(--q-violet)', to_wallet: 'var(--q-green)', external_send: 'var(--q-red)', wallet_redeem: 'var(--q-red)', withdraw: 'var(--q-red)' }
    return map[kind] || 'var(--q-text-3)'
  }
  const txIcon = (kind: string) => {
    const map: Record<string, any> = { mint: Icons.mint, deposit: Icons.deposit, redeem: Icons.redeem, burn: Icons.redeem, transfer: Icons.transfer, to_wallet: Icons.send, external_send: Icons.send, wallet_redeem: Icons.redeem, withdraw: Icons.send }
    return (map[kind] || Icons.chart)(15, kindColor(kind))
  }

  const TxRow = ({ tx, i, total }: { tx: any; i: number; total: number }) => {
    const isCredit = ['deposit', 'mint'].includes(tx.kind)
    const color = kindColor(tx.kind)
    const txInst = isInstitutional()
    return (
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '14px 20px',
        borderBottom: i < total - 1 ? `1px solid ${txInst ? '#f1f5f9' : 'rgba(255,255,255,0.03)'}` : 'none',
        gap: '14px',
        transition: 'background 0.15s',
      }}
        onMouseEnter={e => (e.currentTarget.style.background = txInst ? '#f8fafc' : 'rgba(255,255,255,0.02)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <div style={{
          width: '38px', height: '38px', borderRadius: '11px',
          background: color + '14', border: `1px solid ${color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>{txIcon(tx.kind)}</div>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'var(--q-text)', fontWeight: '600', fontSize: '13px', margin: '0 0 2px' }}>{tx.description}</p>
          <p style={{ color: 'var(--q-text-3)', fontSize: '10px', ...mono, margin: 0, letterSpacing: '0.04em' }}>{new Date(tx.created_at).toLocaleString()}</p>
        </div>
        <p style={{ color, fontWeight: '700', fontSize: '14px', ...mono, margin: 0 }}>{isCredit ? '+' : '−'}{tx.amount} {tx.currency}</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: inst ? '#f5f7fa' : 'var(--q-bg)', fontFamily: 'var(--font-display)', position: 'relative', overflow: 'hidden' }}>

      {/* Background */}
      {!inst && <div className="dot-grid" style={{ position: 'fixed', inset: 0, opacity: 0.3, pointerEvents: 'none' }} />}
      {!inst && <div style={{ position: 'fixed', top: '-20%', right: '20%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 65%)', pointerEvents: 'none' }} />}

      {/* ── NOTIFICATIONS ── */}
      {notifications.map(notif => (
        <div key={notif.id} style={{
          position: 'fixed', top: '80px', right: '24px', zIndex: 200,
          background: 'rgba(255,184,0,0.92)',
          borderRadius: '16px', padding: '16px 20px', maxWidth: '380px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 30px rgba(255,184,0,0.2)',
          display: 'flex', gap: '12px', alignItems: 'flex-start',
          backdropFilter: 'blur(20px)',
        }}>
          <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠</span>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#000', fontSize: '13px', fontWeight: '700', margin: '0 0 4px', fontFamily: 'var(--font-syne)' }}>Collateral Update</p>
            <p style={{ color: 'rgba(0,0,0,0.7)', fontSize: '11px', ...mono, margin: '0 0 10px', lineHeight: '1.6' }}>{notif.message}</p>
            <button onClick={() => dismissNotification(notif.id)} style={{ background: '#000', color: 'var(--q-btc)', border: 'none', borderRadius: '8px', padding: '6px 16px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>Dismiss</button>
          </div>
        </div>
      ))}

      {/* ── MOVE TO WALLET MODAL ── */}
      {showMoveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,2,10,0.92)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(20px)' }}>
          <div style={{ background: inst?'#fff':'linear-gradient(135deg,#050f20,#020810)', border: '1px solid rgba(255,184,0,0.22)', borderRadius: '20px', padding: '36px', maxWidth: '440px', width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}>
            {!moveDone ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 30px rgba(255,184,0,0.15)' }}>
                    {Icons.wallet(26, 'var(--q-btc)')}
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-syne)', color: 'var(--q-text)', fontSize: '20px', fontWeight: '800', margin: '0 0 6px', letterSpacing: '-0.03em' }}>Move UBTC to Wallet</h2>
                  <p style={{ color: 'var(--q-text-3)', fontSize: '11px', ...mono, margin: 0, letterSpacing: '0.04em' }}>Available: {Math.max(0, ubtcBalance - ubtcCirculation).toFixed(2)} UBTC</p>
                </div>

                {/* Quick amounts */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '14px' }}>
                  {(() => {
                    const avail = Math.max(0, ubtcBalance - ubtcCirculation)
                    return [Math.floor(avail*0.25), Math.floor(avail*0.5), Math.floor(avail*0.75), Math.floor(avail)]
                  })().map((v, i) => ['25%','50%','75%','Max'][i]).map((label, i) => {
                    const v = String(Math.floor(Math.max(0,ubtcBalance-ubtcCirculation)*[0.25,0.5,0.75,1][i]))
                    return <button key={label} onClick={() => setMoveAmount(v)} style={{ background: moveAmount===v ? 'rgba(255,184,0,0.14)' : 'rgba(255,255,255,0.03)', border: `1px solid ${moveAmount===v ? 'rgba(255,184,0,0.4)' : 'var(--q-border-subtle)'}`, color: moveAmount===v ? 'var(--q-btc)' : 'var(--q-text-3)', borderRadius: '9px', padding: '8px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', ...mono, letterSpacing: '0.06em' }}>{label}</button>
                  })}
                </div>

                <label style={{ display: 'block', color: 'var(--q-text-3)', fontSize: '9px', ...mono, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '8px' }}>Amount (UBTC)</label>
                <input value={moveAmount} onChange={e => setMoveAmount(e.target.value)} placeholder="0.00" type="number" max={ubtcBalance} style={{ ...fieldStyle, fontSize: '20px', marginBottom: '8px' }} autoFocus />

                <div style={{ background: inst?'#f8fafc':'rgba(0,5,20,0.5)', borderRadius: '10px', padding: '10px 14px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', border: '1px solid var(--q-border-subtle)' }}>
                  <span style={{ color: 'var(--q-text-3)', fontSize: '10px', ...mono, letterSpacing: '0.06em' }}>Destination</span>
                  <span style={{ color: 'var(--q-btc)', fontSize: '10px', ...mono }}>{vault.linked_wallet?.slice(0,18)}…</span>
                </div>

                <label style={{ display: 'block', color: 'var(--q-text-3)', fontSize: '9px', ...mono, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '8px' }}>Protocol Second Key</label>

                <div onClick={() => movePskInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: movePsk ? 'rgba(0,255,157,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${movePsk ? 'rgba(0,255,157,0.25)' : 'var(--q-border)'}`, borderRadius: '12px', padding: '13px 16px', cursor: 'pointer', marginBottom: '10px', transition: 'all 0.2s' }}>
                  <input ref={movePskInputRef} type="file" accept=".json,.txt,.key" style={{ display: 'none' }} onChange={e => {
                    const file = e.target.files?.[0]; if (!file) return
                    const reader = new FileReader()
                    reader.onload = ev => {
                      try {
                        const content = ev.target?.result as string
                        let key = ''
                        try { const json = JSON.parse(content); const raw = json?.protocol_second_key || json?.second_key || json?.psk; key = raw?.key || raw || '' }
                        catch { const match = content.match(/[a-f0-9]{64,}/); key = match ? match[0] : '' }
                        if (key) { setMovePsk(key); setMoveError('') } else setMoveError('Key not found in file')
                      } catch { setMoveError('Invalid key file') }
                    }
                    reader.readAsText(file)
                  }} />
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: movePsk ? 'rgba(0,255,157,0.1)' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{movePsk ? '✓' : '⬆'}</div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: movePsk ? 'var(--q-green)' : 'var(--q-text)', marginBottom: '2px' }}>{movePsk ? 'Key file loaded' : 'Upload key file'}</div>
                    <div style={{ fontSize: '10px', color: 'var(--q-text-3)', ...mono }}>Auto-extracts protocol second key</div>
                  </div>
                </div>

                <div style={{ textAlign: 'center', fontSize: '9px', color: 'var(--q-text-3)', marginBottom: '8px', ...mono, letterSpacing: '0.1em', textTransform: 'uppercase' }}>— or paste manually —</div>

                <input value={movePsk} onChange={e => setMovePsk(e.target.value)} placeholder="Protocol second key" type="password" style={{ ...fieldStyle, marginBottom: '20px' }} />

                {moveError && <p style={{ color: 'var(--q-red)', fontSize: '11px', ...mono, marginBottom: '12px', letterSpacing: '0.03em' }}>{moveError}</p>}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => { setShowMoveModal(false); setMovePsk('') }} style={{ background: 'transparent', border: '1px solid var(--q-border)', color: 'var(--q-text-3)', borderRadius: '12px', padding: '14px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>Cancel</button>
                  <button
                    onClick={() => { if (!moveInProgress.current) handleMoveToWallet() }}
                    disabled={moveLoading || !moveAmount || parseFloat(moveAmount) <= 0 || parseFloat(moveAmount) > ubtcBalance || !movePsk}
                    style={{
                      flex: 1,
                      background: moveAmount && parseFloat(moveAmount) > 0 && movePsk && !moveLoading ? 'var(--q-btc)' : 'rgba(255,255,255,0.04)',
                      color: moveAmount && parseFloat(moveAmount) > 0 && movePsk && !moveLoading ? '#000' : 'var(--q-text-3)',
                      border: 'none', borderRadius: '12px', padding: '14px',
                      fontSize: '13px', fontWeight: '800', cursor: 'pointer',
                      fontFamily: 'var(--font-syne)',
                      boxShadow: moveAmount && parseFloat(moveAmount) > 0 && movePsk && !moveLoading ? '0 0 24px rgba(255,184,0,0.3)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    {moveLoading ? 'Moving…' : `Move ${moveAmount || '0'} UBTC →`}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px', boxShadow: '0 0 30px rgba(0,255,157,0.15)' }}>✓</div>
                <h2 style={{ fontFamily: 'var(--font-syne)', color: 'var(--q-green)', fontSize: '20px', fontWeight: '800', margin: '0 0 8px' }}>Transfer Complete</h2>
                <p style={{ color: 'var(--q-text-3)', fontSize: '12px', ...mono, margin: '0 0 28px' }}>{moveAmount} UBTC moved to your wallet</p>
                <button onClick={() => { setShowMoveModal(false); setMovePsk(''); window.location.href = '/wallet?address=' + (vault.linked_wallet || '') }} style={{ background: 'var(--q-btc)', color: '#000', border: 'none', borderRadius: '12px', padding: '14px 32px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', fontFamily: 'var(--font-syne)', boxShadow: '0 0 24px rgba(255,184,0,0.3)' }}>
                  Open Wallet →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <PasswordModal
        isOpen={movePasswordOpen}
        onCancel={() => setMovePasswordOpen(false)}
        onSubmit={submitMoveToWallet}
        title="Move UBTC to Wallet"
        subtitle="Enter your wallet password to authorize this PQ-signed move"
      />

      {/* ── ADD STABLECOIN MODAL ── */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,2,10,0.92)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto', backdropFilter: 'blur(20px)' }}>
          <div style={{ background: inst?'#fff':'linear-gradient(135deg,#050f20,#020810)', border: inst?'1px solid #e2e8f0':`1px solid ${scColor}22`, borderRadius: '20px', padding: '36px', maxWidth: '520px', width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}>
            {/* Progress */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
              {['deposit','quantum','done'].map((s, i) => {
                const idx = { deposit:0, quantum:1, done:2 }[addStep] as number
                return <div key={s} style={{ width: s===addStep ? '28px' : '8px', height: '6px', borderRadius: '3px', background: i<=idx ? scColor : 'rgba(255,255,255,0.06)', transition: 'all 0.35s', boxShadow: i<=idx ? `0 0 12px ${scColor}60` : 'none' }} />
              })}
            </div>

            {addStep === 'deposit' && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: scColor+'12', border: `1px solid ${scColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: `0 0 30px ${scColor}20` }}>{Icons.deposit(28, scColor)}</div>
                  <h2 style={{ fontFamily: 'var(--font-syne)', color: 'var(--q-text)', fontSize: '22px', fontWeight: '800', margin: '0 0 6px', letterSpacing: '-0.03em' }}>Deposit {scToken}</h2>
                  <p style={{ color: 'var(--q-text-3)', fontSize: '11px', ...mono, margin: 0 }}>Lock {scToken} · Mint {scUToken} 1:1</p>
                </div>
                <div style={{ background: inst?'#f8fafc':'rgba(0,5,20,0.6)', border: inst?'1px solid #e2e8f0':`1px solid ${scColor}18`, borderRadius: '14px', padding: '16px', marginBottom: '14px' }}>
                  <p style={{ color: 'var(--q-text-3)', fontSize: '9px', ...mono, textTransform: 'uppercase', letterSpacing: '0.18em', margin: '0 0 8px' }}>{scToken} Deposit Address (ERC-20)</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <p style={{ color: scColor, fontSize: '10px', ...mono, margin: 0, flex: 1, wordBreak: 'break-all', lineHeight: '1.7' }}>{scAddr}</p>
                    <CopyBtn text={scAddr} id="sc-addr" />
                  </div>
                </div>
                <label style={{ display: 'block', color: 'var(--q-text-3)', fontSize: '9px', ...mono, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '8px' }}>Amount (min 10)</label>
                <input value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="10000" type="number" autoFocus style={{ ...fieldStyle, marginBottom: '10px' }} />
                <div style={{ display: 'flex', gap: '6px', marginBottom: '22px' }}>
                  {['1000','5000','10000','50000'].map(v => (
                    <button key={v} onClick={() => setDepositAmount(v)} style={{ flex: 1, background: depositAmount===v ? scColor+'14' : 'rgba(255,255,255,0.02)', border: `1px solid ${depositAmount===v ? scColor+'35' : 'var(--q-border-subtle)'}`, color: depositAmount===v ? scColor : 'var(--q-text-3)', borderRadius: '9px', padding: '8px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', ...mono }}>
                      ${parseInt(v).toLocaleString()}
                    </button>
                  ))}
                </div>
                {addError && <p style={{ color: 'var(--q-red)', fontSize: '11px', ...mono, marginBottom: '12px' }}>{addError}</p>}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={resetModal} style={{ background: 'transparent', border: '1px solid var(--q-border)', color: 'var(--q-text-3)', borderRadius: '12px', padding: '14px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>Cancel</button>
                  <button onClick={handleDeposit} disabled={addLoading || !depositAmount || parseFloat(depositAmount) < 10} style={{ flex: 1, background: depositAmount && parseFloat(depositAmount)>=10 && !addLoading ? `linear-gradient(135deg, ${scColor}, ${scColor}cc)` : 'rgba(255,255,255,0.04)', color: depositAmount && parseFloat(depositAmount)>=10 && !addLoading ? '#000' : 'var(--q-text-3)', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', fontFamily: 'var(--font-syne)' }}>
                    {addLoading ? 'Processing…' : 'Continue →'}
                  </button>
                </div>
              </>
            )}

            {addStep === 'quantum' && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>{Icons.quantum(44, scColor)}</div>
                  <h2 style={{ fontFamily: 'var(--font-syne)', color: 'var(--q-text)', fontSize: '22px', fontWeight: '800', margin: '0 0 6px', letterSpacing: '-0.03em' }}>Quantum Authorization</h2>
                  <p style={{ color: 'var(--q-text-3)', fontSize: '11px', ...mono, margin: 0 }}>Authorize minting of {parseFloat(depositAmount).toLocaleString()} {scUToken}</p>
                </div>
                <div style={{ background: inst?'#f8fafc':'rgba(0,5,20,0.7)', border: inst?'1px solid #e2e8f0':`1px solid ${scColor}18`, borderRadius: '18px', padding: '28px', marginBottom: '14px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--q-text-3)', fontSize: '9px', ...mono, textTransform: 'uppercase', letterSpacing: '0.25em', margin: '0 0 16px' }}>One-Time Code</p>
                  <p className="number" style={{ color: 'var(--q-text)', fontSize: '48px', fontWeight: '700', letterSpacing: '0.5em', margin: '0 0 10px', lineHeight: '1', textShadow: `0 0 40px ${scColor}40` }}>{otpCode}</p>
                  <p style={{ color: 'var(--q-text-3)', fontSize: '10px', ...mono }}>Expires {otpExpires ? new Date(otpExpires).toLocaleTimeString() : ''}</p>
                </div>
                <label style={{ display: 'block', color: 'var(--q-text-3)', fontSize: '9px', ...mono, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '8px' }}>Enter OTP Code</label>
                <input value={otpInput} onChange={e => setOtpInput(e.target.value)} placeholder="123456" style={{ ...fieldStyle, marginBottom: '12px' }} />
                <label style={{ display: 'block', color: 'var(--q-text-3)', fontSize: '9px', ...mono, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '8px' }}>Protocol Authorization Key</label>
                <input value={secondKey} onChange={e => setSecondKey(e.target.value)} placeholder="Your protocol second key" type="password" style={{ ...fieldStyle, marginBottom: '20px' }} />
                {addError && <p style={{ color: 'var(--q-red)', fontSize: '11px', ...mono, marginBottom: '12px' }}>{addError}</p>}
                <button onClick={handleQuantumMint} disabled={!otpInput || !secondKey || addLoading} style={{ width: '100%', background: otpInput && secondKey && !addLoading ? `linear-gradient(135deg, ${scColor}, ${scColor}cc)` : 'rgba(255,255,255,0.04)', color: otpInput && secondKey && !addLoading ? '#000' : 'var(--q-text-3)', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: 'var(--font-syne)' }}>
                  {addLoading ? 'Minting…' : `Authorize & Mint ${scUToken}`}
                </button>
              </>
            )}

            {addStep === 'done' && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>{Icons.key(52, scColor)}</div>
                  <h2 style={{ fontFamily: 'var(--font-syne)', color: 'var(--q-text)', fontSize: '22px', fontWeight: '800', margin: '0 0 6px', letterSpacing: '-0.03em' }}>Save Your Signing Key</h2>
                  <p style={{ color: scColor, fontSize: '12px', ...mono, margin: 0 }}>{parseFloat(depositAmount).toLocaleString()} {scUToken} minted</p>
                </div>
                <div style={{ background: inst?'#fff7f7':'rgba(0,5,20,0.7)', border: '1px solid rgba(255,56,96,0.35)', borderRadius: '18px', padding: '22px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {Icons.key(14, 'var(--q-red)')}
                      <div>
                        <p style={{ color: 'var(--q-red)', fontWeight: '700', fontSize: '12px', margin: '0 0 1px' }}>Quantum Signing Key (QSK)</p>
                        <p style={{ color: 'var(--q-text-3)', fontSize: '10px', ...mono, margin: 0 }}>Shown once only — save now</p>
                      </div>
                    </div>
                    <CopyBtn text={qSigningKey} id="qsk" />
                  </div>
                  <div style={{ background: inst ? '#fff5f5' : 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,56,96,0.2)', borderRadius: '12px', padding: '18px', textAlign: 'center' }}>
                    <p className="number" style={{ color: 'var(--q-red)', fontSize: '18px', fontWeight: '700', letterSpacing: '0.06em', margin: 0, lineHeight: '1.6', wordBreak: 'break-all' }}>{qSigningKey}</p>
                  </div>
                </div>
                <div onClick={() => setKeySaved(!keySaved)} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: keySaved ? 'rgba(0,255,157,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${keySaved ? 'rgba(0,255,157,0.25)' : 'var(--q-border)'}`, borderRadius: '12px', padding: '14px', marginBottom: '20px', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${keySaved ? 'var(--q-green)' : 'var(--q-border)'}`, background: keySaved ? 'var(--q-green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                    {keySaved && Icons.check(12, '#000')}
                  </div>
                  <p style={{ color: 'var(--q-text-3)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.7' }}>I have saved my QSK. I understand it cannot be recovered.</p>
                </div>
                <button onClick={() => { if (keySaved) { resetModal(); setCurrencyTab(scUToken==='UUSDT' ? 'uusdt' : 'uusdc') } }} disabled={!keySaved} style={{ width: '100%', background: keySaved ? 'linear-gradient(135deg, var(--q-electric), #0099cc)' : 'rgba(255,255,255,0.04)', color: keySaved ? '#000' : 'var(--q-text-3)', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '14px', fontWeight: '800', cursor: keySaved ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-syne)', boxShadow: keySaved ? '0 0 24px rgba(0,212,255,0.3)' : 'none' }}>
                  View {scUToken} Account →
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          background: inst ? '#f5f7fa' : 'linear-gradient(180deg, rgba(0,5,20,0.95) 0%, rgba(0,8,30,0.7) 60%, transparent 100%)',
          padding: isMobile ? '24px 20px 40px' : '32px 40px 52px',
          borderBottom: inst ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.04)',
        }}>

          {/* Top nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
            <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--q-text-3)', textDecoration: 'none', fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--q-electric)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--q-text-3)')}
            >
              {Icons.back(12, 'currentColor')} Accounts
            </a>

            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', background: inst?'#fff':'rgba(255,255,255,0.04)', border: inst?'1px solid #e2e8f0':'1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '7px 14px' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: meta.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{meta.icon}</div>
              <span style={{ color: 'var(--q-text-2)', fontSize: '12px', fontWeight: '600' }}>{meta.title}</span>
            </div>

            <button onClick={loadAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--q-text-3)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', ...mono, letterSpacing: '0.1em', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--q-electric)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--q-text-3)')}
            >
              {Icons.refresh(13, 'currentColor')}
            </button>
          </div>

          {/* Balance */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <p style={{ color: inst ? '#64748b' : 'var(--q-text-3)', fontSize: '9px', fontWeight: '600', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.22em', ...mono }}>
              {isActive ? 'UBTC Balance' : 'Bitcoin Backing'}
            </p>
            <p className="number" style={{
              color: inst ? '#0f172a' : 'var(--q-text)',
              fontSize: isMobile ? '52px' : '72px',
              fontWeight: '700', margin: '0 0 12px', lineHeight: '1',
              letterSpacing: '-0.04em',
              textShadow: inst ? 'none' : '0 0 80px rgba(0,212,255,0.12)',
            }}>
              ${isActive
                ? ubtcBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : btcValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {isActive && (
                <span style={{ color: inst ? '#64748b' : 'var(--q-text-3)', fontSize: '12px', ...mono }}>
                  {btcLocked.toFixed(6)} BTC backing
                </span>
              )}
              <span style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: isActive ? 'rgba(0,255,157,0.08)' : 'rgba(255,184,0,0.08)',
                border: `1px solid ${isActive ? 'rgba(0,255,157,0.2)' : 'rgba(255,184,0,0.2)'}`,
                borderRadius: '999px', padding: '4px 12px',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive ? 'var(--q-green)' : 'var(--q-btc)', display: 'inline-block', animation: 'breathe 2s ease-in-out infinite', boxShadow: `0 0 8px ${isActive ? 'var(--q-green)' : 'var(--q-btc)'}` }} />
                <span style={{ color: isActive ? 'var(--q-green)' : 'var(--q-btc)', fontSize: '10px', fontWeight: '700', ...mono, letterSpacing: '0.08em' }}>
                  {isActive ? 'Active' : 'Pending deposit'}
                </span>
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <style>{`
            .acc-action { transition: transform .15s ease, box-shadow .15s ease; transform-style: preserve-3d; cursor: pointer; }
            .acc-action:hover { transform: translateY(-4px) scale(1.04) !important; }
            .inst-btn:hover { transform: translateY(-2px) scale(1.02) !important; }
            .inst-btn:active { transform: scale(0.96) !important; box-shadow: 0 2px 6px rgba(0,0,0,0.2) !important; transition: transform 0.08s ease !important; }
          `}</style>
          {isActive ? (
            <div style={{ display: 'grid', gridTemplateColumns: hasMinted ? 'repeat(3,1fr)' : 'repeat(2,1fr)', gap: '10px', maxWidth: '480px', margin: '0 auto' }}>

              {/* CREATE UBTC */}
              <a href={`/mint?vault=${vaultId}&currency=ubtc`} className={inst ? 'acc-action inst-btn' : 'acc-action'} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                background: inst ? '#1d4ed8' : 'linear-gradient(145deg,#001a2e,#002844)',
                border: 'none',
                borderRadius: 20, padding: '20px 10px',
                textDecoration: 'none',
                boxShadow: inst ? '0 4px 14px rgba(29,78,216,0.35)' : '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(0,212,255,0.2)',
              }}>
                <div style={{ width: 48, height: 48, borderRadius: 15, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={inst?'#fff':'#00D4FF'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center', color: inst?'#fff':'#e0eeff' }}>Create UBTC</span>
              </a>

              {/* MOVE TO WALLET */}
              {hasMinted && (
                <button onClick={() => { setShowMoveModal(true); setMoveAmount(''); setMoveError(''); setMoveDone(false) }} className={inst ? 'acc-action inst-btn' : 'acc-action'} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  background: inst ? '#d97706' : 'linear-gradient(145deg,#1a1000,#2a1a00)',
                  border: 'none',
                  borderRadius: 20, padding: '20px 10px',
                  boxShadow: inst ? '0 4px 14px rgba(217,119,6,0.35)' : '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,184,0,0.2)',
                }}>
                  <div style={{ width: 48, height: 48, borderRadius: 15, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {Icons.wallet(22, inst?'#fff':'#FFB800')}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center', color: inst?'#fff':'#e0eeff' }}>Move to Wallet</span>
                </button>
              )}

              {/* MY WALLET */}
              <a href={vault.linked_wallet ? `/wallet?address=${vault.linked_wallet}` : '/wallet'} className={inst ? 'acc-action inst-btn' : 'acc-action'} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                background: inst ? '#7c3aed' : 'linear-gradient(145deg,#0e0028,#160040)',
                border: 'none',
                borderRadius: 20, padding: '20px 10px',
                textDecoration: 'none',
                boxShadow: inst ? '0 4px 14px rgba(124,58,237,0.35)' : '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(167,139,250,0.15)',
              }}>
                <div style={{ width: 48, height: 48, borderRadius: 15, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {Icons.send(22, inst?'#fff':'#A78BFA')}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center', color: inst?'#fff':'#e0eeff' }}>My Wallet</span>
              </a>
            </div>
          ) : (
            <div style={{ maxWidth: '420px', margin: '0 auto' }}>
              <a href={`/deposit?vault=${vaultId}&currency=ubtc`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
                background: 'linear-gradient(135deg, var(--q-electric), #0099cc)',
                borderRadius: '18px', padding: '18px', textDecoration: 'none',
                color: '#000', fontSize: '14px', fontWeight: '800',
                fontFamily: 'var(--font-syne)',
                boxShadow: '0 0 30px rgba(0,212,255,0.3)',
              }}>
                {Icons.deposit(18, '#000')} Add Bitcoin to Activate
              </a>
            </div>
          )}
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ padding: isMobile ? '20px 16px' : '28px 32px', maxWidth: '700px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

          {/* ── PENDING: deposit address ── */}
          {!isActive && (
            <div style={{ ...glass(), border: '1px solid rgba(255,184,0,0.22)', padding: '24px', marginBottom: '20px' }}>
              <p style={{ color: 'var(--q-btc)', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.22em', margin: '0 0 8px', ...mono }}>Step 1 — Add Bitcoin</p>
              <p style={{ fontFamily: 'var(--font-syne)', color: 'var(--q-text)', fontSize: '18px', fontWeight: '700', margin: '0 0 8px', letterSpacing: '-0.02em' }}>Send Bitcoin to activate</p>
              <p style={{ color: 'var(--q-text-3)', fontSize: '12px', margin: '0 0 20px', lineHeight: '1.8', fontWeight: '300' }}>Your Bitcoin is locked as collateral. Once confirmed on-chain, you can create UBTC against it.</p>
              <div style={{ background: 'var(--q-surface-2)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', border: '1px solid var(--q-border-subtle)' }}>
                <p style={{ color: 'var(--q-electric)', fontSize: '11px', ...mono, margin: 0, flex: 1, wordBreak: 'break-all', lineHeight: '1.7' }}>{depositAddr}</p>
                <CopyBtn text={depositAddr} id="dep-addr" />
              </div>
              <button onClick={async () => {
                const res = await fetch(`${API_URL}/deposit/scan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vault_id: vaultId }) })
                const data = await res.json()
                if (data.found) await loadAll()
                else await loadAll()
              }} style={{ width: '100%', background: 'var(--q-electric)', color: '#000', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: 'var(--font-syne)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', letterSpacing: '0.04em' }}>
                {Icons.refresh(16, 'currentColor')} Check for Payment
              </button>
            </div>
          )}

          {/* ── SAFETY LEVEL ── */}
          {isActive && (
            <div style={{ ...glass(), border: `1px solid ${ratioColor}22`, padding: '22px 24px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div>
                  <p style={{ color: 'var(--q-text-3)', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.22em', margin: '0 0 6px', ...mono }}>Safety Level</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <p className="number" style={{ color: ratioColor, fontSize: '36px', fontWeight: '700', margin: 0, lineHeight: 1, textShadow: `0 0 30px ${ratioColor}50` }}>
                      {ratio > 0 ? ratio.toFixed(0) + '%' : '—'}
                    </p>
                    <span style={{ color: 'var(--q-text-3)', fontSize: '12px', fontWeight: '500' }}>{safetyLabel}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: 'var(--q-text-3)', fontSize: '9px', ...mono, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>BTC price</p>
                  <p className="number" style={{ color: 'var(--q-text-2)', fontSize: '15px', fontWeight: '600', margin: 0 }}>${btcPrice.toLocaleString()}</p>
                </div>
              </div>

              {/* Bar */}
              <div style={{ height: '4px', background: inst ? '#e2e8f0' : 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ height: '100%', width: Math.min(100, ratio / 3) + '%', background: `linear-gradient(90deg, ${ratioColor}99, ${ratioColor})`, borderRadius: '2px', transition: 'width 0.8s ease', boxShadow: `0 0 12px ${ratioColor}60` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px' }}>
                <span style={{ color: 'var(--q-text-3)', fontSize: '9px', ...mono }}>0%</span>
                <span style={{ color: 'rgba(255,56,96,0.6)', fontSize: '9px', ...mono }}>150% min</span>
                <span style={{ color: 'rgba(0,255,157,0.6)', fontSize: '9px', ...mono }}>200% healthy</span>
                <span style={{ color: 'var(--q-text-3)', fontSize: '9px', ...mono }}>300%</span>
              </div>

              {/* Two stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { label: 'BTC locked', val: btcLocked.toFixed(6), sub: '$' + btcValue.toLocaleString(undefined,{maximumFractionDigits:0}) + ' USD', color: 'var(--q-btc)' },
                  { label: 'UBTC created', val: '$' + ubtcBalance.toLocaleString(undefined,{maximumFractionDigits:2}), sub: remainingMintable > 0 ? '$' + remainingMintable.toLocaleString(undefined,{maximumFractionDigits:0}) + ' more available' : 'Fully minted', color: 'var(--q-electric)' },
                ].map(s => (
                  <div key={s.label} style={{ background: inst ? '#f8fafc' : 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '14px 16px', border: inst ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.04)' }}>
                    <p style={{ color: 'var(--q-text-3)', fontSize: '9px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>{s.label}</p>
                    <p className="number" style={{ color: s.color, fontSize: '17px', fontWeight: '700', margin: '0 0 2px', textShadow: `0 0 20px ${s.color}40` }}>{s.val}</p>
                    <p style={{ color: 'var(--q-text-3)', fontSize: '10px', ...mono, margin: 0 }}>{s.sub}</p>
                  </div>
                ))}
              </div>

              {ratio > 0 && ratio < 150 && (
                <div style={{ marginTop: '16px', background: 'rgba(255,56,96,0.07)', border: '1px solid rgba(255,56,96,0.25)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {Icons.warning(14, 'var(--q-red)')}
                  <p style={{ color: 'var(--q-red)', fontSize: '11px', ...mono, margin: 0 }}>Safety level is low — add more BTC to avoid liquidation</p>
                </div>
              )}
            </div>
          )}

          {/* ── CREATE UBTC ── */}
          {isActive && (
            <div style={{ ...glass(), padding: '24px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
                <div>
                  <p style={{ color: 'var(--q-electric)', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0 0 6px', ...mono }}>Create UBTC</p>
                  <p style={{ fontFamily: 'var(--font-syne)', color: 'var(--q-text)', fontSize: '18px', fontWeight: '700', margin: 0, letterSpacing: '-0.02em' }}>
                    {!hasMinted ? 'Lock your BTC, get UBTC' : 'Create more UBTC'}
                  </p>
                </div>
                {remainingMintable > 0 && (
                  <div style={{ flexShrink: 0, background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: '12px', padding: '10px 16px', textAlign: 'right' }}>
                    <p style={{ color: 'var(--q-text-3)', fontSize: '8px', ...mono, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 3px' }}>Available</p>
                    <p className="number" style={{ color: 'var(--q-electric)', fontSize: '18px', fontWeight: '800', margin: 0, textShadow: '0 0 20px rgba(0,212,255,0.4)' }}>${remainingMintable.toLocaleString(undefined,{maximumFractionDigits:0})}</p>
                  </div>
                )}
              </div>
              <p style={{ color: 'var(--q-text-3)', fontSize: '13px', margin: '0 0 20px', lineHeight: '1.8', fontWeight: '300' }}>
                {!hasMinted
                  ? 'UBTC is a dollar-pegged token backed 1.5× by your Bitcoin. Send it to anyone, use it as cash — while your BTC stays locked and appreciating.'
                  : 'Your BTC backing supports more UBTC. Keep your safety level above 200% for a healthy buffer.'}
              </p>
              <a href={`/mint?vault=${vaultId}&currency=ubtc`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                background: 'linear-gradient(135deg, var(--q-electric), #0099cc)',
                borderRadius: '14px', padding: '16px', textDecoration: 'none',
                color: '#000', fontSize: '14px', fontWeight: '800',
                fontFamily: 'var(--font-syne)',
                boxShadow: '0 0 30px rgba(0,212,255,0.25), 0 4px 14px rgba(0,0,0,0.4)',
                transition: 'box-shadow 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 50px rgba(0,212,255,0.4), 0 4px 20px rgba(0,0,0,0.5)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 30px rgba(0,212,255,0.25), 0 4px 14px rgba(0,0,0,0.4)')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                {!hasMinted ? 'Create UBTC Now →' : 'Create More UBTC →'}
              </a>
            </div>
          )}

          {/* ── MOVE TO WALLET ── */}
          {isActive && hasMinted && (
            <div style={{ ...glass(), border: availableToMove > 0 ? '1px solid rgba(255,184,0,0.28)' : '1px solid rgba(0,212,255,0.08)', padding: '22px 24px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                {Icons.wallet(18, availableToMove > 0 ? 'var(--q-btc)' : 'var(--q-text-3)')}
                <div style={{ flex: 1 }}>
                  <p style={{ color: availableToMove > 0 ? 'var(--q-btc)' : 'var(--q-text-3)', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.18em', margin: '0 0 3px', ...mono }}>Your Wallet</p>
                  <p style={{ fontFamily: 'var(--font-syne)', color: 'var(--q-text)', fontSize: '15px', fontWeight: '700', margin: 0 }}>
                    {availableToMove > 0 ? `${availableToMove.toFixed(2)} UBTC ready to move` : 'All UBTC moved to wallet'}
                  </p>
                </div>
                {vault.linked_wallet && walletBalance > 0 && (
                  <p className="number" style={{ color: 'var(--q-btc)', fontSize: '18px', fontWeight: '800', margin: 0, textShadow: '0 0 20px rgba(255,184,0,0.3)' }}>{walletBalance.toFixed(2)} UBTC</p>
                )}
              </div>
              <p style={{ color: 'var(--q-text-3)', fontSize: '12px', margin: '0 0 18px', lineHeight: '1.8', fontWeight: '300' }}>
                UBTC in this account needs to be in your wallet to spend. This account is the vault — your wallet is your spending account.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                {availableToMove > 0 && (
                  <button onClick={() => { setShowMoveModal(true); setMoveAmount(''); setMoveError(''); setMoveDone(false) }} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: 'var(--q-btc)', border: 'none', borderRadius: '12px',
                    padding: '14px', color: '#000', fontSize: '13px', fontWeight: '800',
                    cursor: 'pointer', fontFamily: 'var(--font-syne)',
                    boxShadow: '0 0 24px rgba(255,184,0,0.25)',
                    transition: 'box-shadow 0.2s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 40px rgba(255,184,0,0.4)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 24px rgba(255,184,0,0.25)')}
                  >
                    {Icons.wallet(15, '#000')} Move to Wallet →
                  </button>
                )}
                <a href={vault.linked_wallet ? `/wallet?address=${vault.linked_wallet}` : '/wallet'} style={{
                  flex: availableToMove > 0 ? '0 0 auto' : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  background: inst ? '#f8fafc' : 'rgba(255,255,255,0.04)', border: inst ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px', padding: '14px 22px',
                  textDecoration: 'none', color: 'var(--q-text-3)', fontSize: '13px', fontWeight: '600',
                  transition: 'background 0.2s',
                }}>
                  Open Wallet
                </a>
              </div>
            </div>
          )}

          {/* ── ACTIVITY ── */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <p style={{ fontFamily: 'var(--font-syne)', color: 'var(--q-text)', fontSize: '15px', fontWeight: '700', margin: 0, letterSpacing: '-0.02em' }}>Activity</p>
              <button onClick={async () => {
                const res = await fetch(`${API_URL}/deposit/scan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vault_id: vaultId }) })
                const data = await res.json()
                if (data.found) await loadAll()
                else await loadAll()
              }} style={{ background: 'var(--q-surface-2)', border: '1px solid var(--q-border)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--q-text-2)', fontSize: '12px', fontWeight: '600', ...mono, padding: '7px 14px', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--q-electric)'; e.currentTarget.style.color = 'var(--q-electric)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--q-border)'; e.currentTarget.style.color = 'var(--q-text-2)' }}
              >
                {Icons.refresh(13, 'currentColor')} Refresh
              </button>
            </div>

            {transactions.length === 0 && walletTxs.length === 0 ? (
              <div style={{ ...glass(), padding: '44px 24px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px', opacity: 0.15 }}>{Icons.chart(40, 'var(--q-electric)')}</div>
                <p style={{ fontFamily: 'var(--font-syne)', color: 'var(--q-text-3)', fontSize: '15px', fontWeight: '700', margin: '0 0 6px' }}>No activity yet</p>
                <p style={{ color: 'var(--q-text-3)', fontSize: '11px', ...mono, margin: 0 }}>
                  {!isActive ? 'Send Bitcoin to get started' : !hasMinted ? 'Create UBTC to see activity here' : 'Transactions appear here'}
                </p>
              </div>
            ) : (
              <div style={{ ...glass(), overflow: 'hidden' }}>
                {[...transactions, ...walletTxs]
                  .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((tx: any, i: number, arr: any[]) => (
                    <TxRow key={tx.id} tx={tx} i={i} total={arr.length} />
                  ))}
              </div>
            )}
          </div>

          {/* ── REDEMPTION (collapsed) ── */}
          {isActive && hasMinted && (
            <details style={{ ...glass(), padding: '18px 20px', marginBottom: '16px' }}>
              <summary style={{ color: 'var(--q-text-3)', fontSize: '11px', fontWeight: '600', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...mono, letterSpacing: '0.08em' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  {Icons.redeem(12, 'var(--q-text-3)')} Cash Out (Redeem UBTC for BTC)
                </span>
                <span style={{ color: 'var(--q-text-3)', fontSize: '10px' }}>▸</span>
              </summary>
              <div style={{ marginTop: '16px' }}>
                <p style={{ color: 'var(--q-text-3)', fontSize: '12px', lineHeight: '1.8', margin: '0 0 14px', fontWeight: '300' }}>
                  When you redeem UBTC, the tokens are burned and the equivalent amount of Bitcoin unlocks from your vault at the current BTC price.
                </p>
                <p style={{ color: 'var(--q-text-3)', fontSize: '11px', ...mono, lineHeight: '1.8', margin: '0 0 16px', background: inst ? '#f8fafc' : 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '12px 14px', border: inst ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.04)' }}>
                  Example: 100 UBTC created at BTC = $50,000. Redeem at $60,000 → ~0.00167 BTC unlocked ($100 worth). Remaining BTC stays as collateral.
                </p>
                <a href={`/redeem?vault=${vaultId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--q-text-3)', fontSize: '11px', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 16px', ...mono, letterSpacing: '0.06em', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--q-electric)'; e.currentTarget.style.borderColor = 'rgba(0,212,255,0.25)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--q-text-3)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                >
                  {Icons.redeem(11, 'currentColor')} Go to Redemption
                </a>
              </div>
            </details>
          )}

          {/* ── ACCOUNT DETAILS ── */}
          <details style={{ ...glass(), padding: '16px 20px' }}>
            <summary style={{ color: 'var(--q-text-3)', fontSize: '10px', fontWeight: '600', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '7px', ...mono, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {Icons.shield(11, 'var(--q-text-3)')} Account Details
            </summary>
            <div style={{ marginTop: '16px' }}>
              {isActive && depositAddr && (
                <div style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: inst ? '1px solid #f1f5f9' : '1px solid rgba(255,255,255,0.04)' }}>
                  <p style={{ color: 'var(--q-text-3)', fontSize: '8px', ...mono, textTransform: 'uppercase', letterSpacing: '0.16em', margin: '0 0 7px' }}>Bitcoin Deposit Address</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <p style={{ color: 'var(--q-electric)', fontSize: '10px', ...mono, margin: 0, flex: 1, wordBreak: 'break-all', lineHeight: '1.7' }}>{depositAddr}</p>
                    <CopyBtn text={depositAddr} id="dep-addr-active" />
                  </div>
                </div>
              )}
              {[
                { label: 'Account ID', value: vaultId },
                { label: 'Type', value: meta.title },
                { label: 'Status', value: vault.status === 'active' ? 'Active' : 'Pending deposit' },
                { label: 'Network', value: vault.network === 'testnet4' ? 'Bitcoin Testnet4' : vault.network === 'mainnet' ? 'Bitcoin Mainnet' : vault.network || 'Bitcoin Testnet4' },
                ...(vault.mast_address ? [{ label: 'MAST Vault (P2TR)', value: vault.mast_address }] : []),
              ].map(item => (
                <div key={item.label} style={{ padding: '8px 0', borderBottom: inst ? '1px solid #f1f5f9' : '1px solid rgba(255,255,255,0.03)' }}>
                  <p style={{ color: 'var(--q-text-3)', fontSize: '8px', ...mono, textTransform: 'uppercase', letterSpacing: '0.14em', margin: '0 0 4px' }}>{item.label}</p>
                  <p style={{ color: 'rgba(150,190,255,0.6)', fontSize: '10px', ...mono, margin: 0, wordBreak: 'break-all' }}>{item.value}</p>
                </div>
              ))}
            </div>
          </details>

        </div>
      </div>
    </div>
  )
}

export default function AccountPage() {
  return (
    <Suspense fallback={<QuantumLoader />}>
      <AccountContent />
    </Suspense>
  )
}

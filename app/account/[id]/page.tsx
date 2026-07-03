'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { API_URL, supabase } from '../../lib/supabase'
import { Icons } from '../../components/Icons'
import { PasswordModal } from '../../components/PasswordModal'
import { signedSpendWithPassword } from '../../lib/wallet/challenge'
import { useIsMobile } from '../../lib/useIsMobile'

function AccountContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const vaultId = params.id as string
  const initialCurrency = (searchParams.get('currency') || 'ubtc').toLowerCase()

  const [vault, setVault] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
 const [walletTxs, setWalletTxs] = useState<any[]>([])
  const [walletBalance, setWalletBalance] = useState(0)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [moveAmount, setMoveAmount] = useState('')
 const [moveLoading, setMoveLoading] = useState(false)
  const [moveError, setMoveError] = useState('')
  const [moveDone, setMoveDone] = useState(false)
  const [movePsk, setMovePsk] = useState('')
 const movePskInputRef = useRef<HTMLInputElement>(null)
  const moveInProgress = useRef(false)
  const [movePasswordOpen, setMovePasswordOpen] = useState(false)
  const [stablecoins, setStablecoins] = useState<any[]>([])
  const [scTransactions, setScTransactions] = useState<any[]>([])
  const [btcPrice, setBtcPrice] = useState(0)
  const [loading, setLoading] = useState(true)
  const [currencyTab, setCurrencyTab] = useState<'ubtc' | 'uusdt' | 'uusdc'>(initialCurrency as any)
  const [showAddModal, setShowAddModal] = useState<'UUSDT' | 'UUSDC' | null>(null)
  const [addStep, setAddStep] = useState<'deposit' | 'quantum' | 'done'>('deposit')
  const [depositAmount, setDepositAmount] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [otpId, setOtpId] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpExpires, setOtpExpires] = useState('')
  const [qPubKey, setQPubKey] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [secondKey, setSecondKey] = useState('')
  const [qSigningKey, setQSigningKey] = useState('')
  const [keySaved, setKeySaved] = useState(false)
  const [copied, setCopied] = useState('')
 const [notifications, setNotifications] = useState<any[]>([])
  const [ubtcCirculation, setUbtcCirculation] = useState(0)
 const [totalEverMinted, setTotalEverMinted] = useState(0)
  const [redemptionHistory, setRedemptionHistory] = useState<any[]>([])
const mono: any = { fontFamily: 'var(--font-mono)' }
  const isMobile = useIsMobile()

  const accountMeta: Record<string, { icon: any; title: string; color: string; tag: string; custody: string }> = {
    current: { icon: Icons.currentAccount(22, 'var(--t-accent)'), title: 'Current Account', color: 'var(--t-accent)', tag: 'Self-Custody', custody: 'Taproot Self-Custody' },
    savings: { icon: Icons.savings(22, 'var(--t-orange)'), title: 'Savings Account', color: 'var(--t-orange)', tag: 'Self-Custody', custody: 'Taproot Self-Custody' },
    yield: { icon: Icons.yield(22, 'var(--t-green)'), title: 'Yield Account', color: 'var(--t-green)', tag: 'Babylon 3-5%', custody: 'Taproot + Babylon' },
    custody_yield: { icon: Icons.chart(22, 'var(--t-accent)'), title: 'Custody Yield', color: 'var(--t-accent)', tag: 'Managed 4-6%', custody: 'BitGo / Komainu' },
    prime: { icon: Icons.vault(22, 'var(--t-purple)'), title: 'Prime Account', color: 'var(--t-purple)', tag: 'Managed 5-8%', custody: 'BitGo / Komainu' },
    managed_yield: { icon: Icons.yield(22, 'var(--t-green)'), title: 'Managed Yield', color: 'var(--t-green)', tag: 'Managed 6-10%', custody: 'BitGo / Komainu' },
  }

 useEffect(() => {
    loadAll()

    // Realtime subscriptions
    const vaultSub = supabase
      .channel('vault-changes')
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
      const txData = await txRes.json()
      const priceData = await priceRes.json()
      const scData = await scRes.json()
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
 // Fetch redemption history
    try {
      const redRes = await fetch(`${API_URL}/vaults/${vaultId}/redemptions`)
      const redData = await redRes.json()
      setRedemptionHistory(redData.redemptions || [])
    } catch (e) { console.error(e) }
    // Fetch total ever minted
    try {
      const mintRes = await fetch(`${API_URL}/vaults/${vaultId}/transactions`)
      const mintData = await mintRes.json()
      const total = (mintData.transactions || []).filter((t: any) => t.kind === 'mint').reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0)
      setTotalEverMinted(total)
    } catch (e) { console.error(e) }
    // Fetch circulation
    try {
      const circRes = await fetch(`${API_URL}/vaults/${vaultId}/circulation`)
      const circData = await circRes.json()
      setUbtcCirculation(parseFloat(circData.total_in_circulation || '0'))
    } catch (e) { console.error(e) }
    // Fetch notifications
    try {
      const notifRes = await fetch(`${API_URL}/vaults/${vaultId}/notifications`)
      const notifData = await notifRes.json()
      setNotifications(notifData.notifications || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(''), 2000)
  }

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button onClick={() => copy(text, id)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: copied === id ? 'var(--t-green-bg)' : 'var(--t-surface2)', border: `1px solid ${copied === id ? 'hsl(142 76% 36% / 0.4)' : 'var(--t-border)'}`, color: copied === id ? 'var(--t-green)' : 'var(--t-muted)', borderRadius: '7px', padding: '6px 12px', fontSize: '11px', cursor: 'pointer', ...mono, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
      {copied === id ? Icons.check(13, 'var(--t-green)') : Icons.copy(13, 'var(--t-muted)')}
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
      setOtpId(otpData.otp_id); setOtpCode(otpData.otp_code); setOtpExpires(otpData.expires_at); setQPubKey(otpData.pq_public_key)
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
    setMoveError('')
    setMovePasswordOpen(true)
  }

  const submitMoveToWallet = async (password: string) => {
   if (moveInProgress.current) return
    moveInProgress.current = true
    setMovePasswordOpen(false)
    setMoveLoading(true); setMoveError('')
    try {
      const walletAddress = localStorage.getItem('ubtc_wallet_address') || ''
      const { challenge_id, signature, sphincs_signature } = await signedSpendWithPassword(
        walletAddress,
        'vault_to_wallet',
        `${vaultId}|${vault.linked_wallet}|${moveAmount}`,
        password
      )
      const res = await fetch(`${API_URL}/vaults/${vaultId}/send-to-wallet`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vault_id: vaultId,
          wallet_address: vault.linked_wallet,
          ubtc_amount: moveAmount,
          second_key: String(movePsk).trim(),
          challenge_id, signature, sphincs_signature
        })
      })
      const text = await res.text()
      let data: any = {}
      try { data = JSON.parse(text) } catch { throw new Error(text || 'Transfer failed') }
      if (!res.ok) throw new Error(data.error || 'Transfer failed')
      setMoveDone(true)
      await loadAll()
    } catch (e: any) { setMoveError(e.message) }
  setMoveLoading(false)
    moveInProgress.current = false
  }

  const dismissNotification = async (notifId: string) => {
    await fetch(`${API_URL}/vaults/${vaultId}/notifications/${notifId}/dismiss`, { method: 'POST' })
    setNotifications(prev => prev.filter(n => n.id !== notifId))
  }

  const resetModal = () => {
    setShowAddModal(null); setAddStep('deposit'); setDepositAmount(''); setAddError('')
    setOtpId(''); setOtpCode(''); setOtpExpires(''); setQPubKey(''); setOtpInput(''); setSecondKey(''); setQSigningKey(''); setKeySaved(false)
  }

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--t-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--t-faint)', fontSize: '14px', ...mono }}>Loading...</p></div>
  if (!vault) return <div style={{ minHeight: '100vh', background: 'var(--t-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--t-red)', fontSize: '14px', ...mono }}>Account not found</p></div>

  const meta = accountMeta[vault.account_type] || { icon: Icons.currentAccount(22, 'var(--t-accent)'), title: vault.account_type, color: 'var(--t-accent)', tag: '', custody: '' }
  const btcLocked = vault.btc_amount_sats / 100_000_000
  const btcValue = btcLocked * btcPrice
  const ubtcBalance = parseFloat(vault.ubtc_minted || '0')
  const maxMintable = btcValue / 1.5
  const remainingMintable = maxMintable - ubtcBalance
  const ratio = ubtcBalance > 0 ? (btcValue / ubtcBalance * 100) : 0
  const ratioColor = ratio >= 200 ? 'var(--t-green)' : ratio >= 150 ? 'var(--t-orange)' : ratio > 0 ? 'var(--t-red)' : 'var(--t-muted)'
  const uusdtSc = stablecoins.filter(s => s.currency === 'UUSDT')
  const uusdcSc = stablecoins.filter(s => s.currency === 'UUSDC')
  const uusdtBal = uusdtSc.reduce((s, x) => s + parseFloat(x.balance || '0'), 0)
  const uusdtDep = uusdtSc.reduce((s, x) => s + parseFloat(x.deposited_amount || '0'), 0)
  const uusdcBal = uusdcSc.reduce((s, x) => s + parseFloat(x.balance || '0'), 0)
  const uusdcDep = uusdcSc.reduce((s, x) => s + parseFloat(x.deposited_amount || '0'), 0)
  const totalBalance = ubtcBalance + uusdtBal + uusdcBal
  const uusdtTxs = scTransactions.filter(tx => tx.currency === 'UUSDT')
  const uusdcTxs = scTransactions.filter(tx => tx.currency === 'UUSDC')

  const txIcon = (kind: string) => {
    const map: Record<string, any> = { mint: Icons.mint, deposit: Icons.deposit, redeem: Icons.redeem, burn: Icons.redeem, transfer: Icons.transfer, to_wallet: Icons.send, external_send: Icons.send, wallet_redeem: Icons.redeem, withdraw: Icons.send }
    return (map[kind] || Icons.chart)(16, kindColor(kind))
  }
  const kindColor = (kind: string) => {
    const map: Record<string, string> = { mint: 'var(--t-accent)', deposit: 'var(--t-orange)', redeem: 'var(--t-green)', burn: 'var(--t-red)', transfer: 'var(--t-purple)', to_wallet: 'var(--t-green)', external_send: 'var(--t-red)', wallet_redeem: 'var(--t-red)', withdraw: 'var(--t-red)' }
    return map[kind] || 'var(--t-muted)'
  }

  const TxRow = ({ tx, i, total }: { tx: any; i: number; total: number }) => {
    const isCredit = ['deposit', 'mint'].includes(tx.kind)
    const color = kindColor(tx.kind)
    return (
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < total - 1 ? '1px solid var(--t-border-subtle)' : 'none', gap: '14px' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: color + '14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{txIcon(tx.kind)}</div>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'var(--t-text)', fontWeight: '600', fontSize: '13px', margin: '0 0 2px' }}>{tx.description}</p>
          <p style={{ color: 'var(--t-faint)', fontSize: '11px', ...mono, margin: 0 }}>{new Date(tx.created_at).toLocaleString()}</p>
        </div>
        <p style={{ color, fontWeight: '700', fontSize: '14px', ...mono, margin: 0 }}>{isCredit ? '+' : '-'}{tx.amount} {tx.currency}</p>
      </div>
    )
  }

  const ActionButtons = ({ currency }: { currency: 'ubtc' | 'uusdt' | 'uusdc' }) => {
    const color = currency === 'ubtc' ? 'var(--t-accent)' : currency === 'uusdt' ? 'var(--t-green)' : 'var(--t-accent)'
    const depColor = currency === 'ubtc' ? 'var(--t-orange)' : color
    const mintBg = currency === 'ubtc' ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : currency === 'uusdt' ? 'linear-gradient(135deg, hsl(142,76%,36%), hsl(142,76%,28%))' : 'linear-gradient(135deg, hsl(220,85%,60%), hsl(220,85%,45%))'
    const btns = [
     { label: 'Deposit', icon: Icons.deposit(22, 'white'), href: `/deposit?vault=${vaultId}&currency=${currency}`, style: { background: 'var(--t-orange)', border: '1px solid transparent', color: 'white' } },
      { label: 'Mint', icon: Icons.mint(22, 'white'), href: `/mint?vault=${vaultId}&currency=${currency}`, style: { background: mintBg, border: '1px solid transparent', color: 'white', boxShadow: `0 0 20px ${color}30` } },
{ label: 'Move UBTC To Wallet', icon: Icons.send(22, 'white'), href: '#', onClick: (e: any) => { e.preventDefault(); setShowMoveModal(true); setMoveAmount(''); setMoveError(''); setMoveDone(false) }, style: { background: 'var(--t-green)', border: '1px solid transparent', color: 'white' } },
   
    ]
    return (
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
      {btns.map(btn => (
          <a key={btn.label} href={btn.href} onClick={(btn as any).onClick} style={{ ...btn.style, borderRadius: '14px', padding: '18px 8px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '10px', textDecoration: 'none', cursor: 'pointer' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{btn.icon}</span>
            <span style={{ fontSize: '12px', fontWeight: '700', fontFamily: 'var(--font-mono)', textAlign: 'center' as const }}>{btn.label}</span>
          </a>
        ))}
      </div>
    )
  }

  const scColor = showAddModal === 'UUSDT' ? 'var(--t-green)' : 'var(--t-accent)'
  const scToken = showAddModal === 'UUSDT' ? 'USDT' : 'USDC'
  const scUToken = showAddModal || 'UUSDT'
  const scAddr = '0x' + vaultId.replace('vault_', '').padEnd(40, 'a1b2c3d4e5f67890abcdef12')
  const fieldStyle: any = { display: 'block', width: '100%', padding: '13px 16px', background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: '12px', color: 'var(--t-text)', fontSize: '14px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const }

  const isActive = vault.status === 'active'
  const hasMinted = ubtcBalance > 0
  const availableToMove = Math.max(0, ubtcBalance - ubtcCirculation)
  const depositAddr = vault.mast_address || vault.deposit_address
  const safetyLabel = ratio >= 200 ? 'Healthy' : ratio >= 150 ? 'Adequate' : ratio > 0 ? 'Low — add more BTC' : '—'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--t-bg)', fontFamily: 'var(--font-display)' }}>

  {/* ── NOTIFICATIONS ── */}
    {notifications.map(notif => (
      <div key={notif.id} style={{ position: 'fixed', top: '80px', right: '24px', zIndex: 200, background: 'hsl(38 92% 50% / 0.95)', borderRadius: '16px', padding: '16px 20px', maxWidth: '380px', boxShadow: '0 8px 32px hsl(0 0% 0% / 0.4)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '20px', flexShrink: 0 }}>⚠️</span>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#000', fontSize: '13px', fontWeight: '700', margin: '0 0 4px', fontFamily: 'var(--font-display)' }}>Collateral Update</p>
          <p style={{ color: 'hsl(0 0% 10%)', fontSize: '12px', fontFamily: 'var(--font-mono)', margin: '0 0 10px', lineHeight: '1.5' }}>{notif.message}</p>
          <button onClick={() => dismissNotification(notif.id)} style={{ background: '#000', color: 'var(--t-orange)', border: 'none', borderRadius: '8px', padding: '6px 16px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>OK</button>
        </div>
      </div>
    ))}

    {/* ── MOVE TO WALLET MODAL ── */}
      {showMoveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--t-bg)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'var(--t-surface)', border: '1px solid hsl(38 92% 50% / 0.3)', borderRadius: '24px', padding: '36px', maxWidth: '440px', width: '100%' }}>
            {!moveDone ? (
              <>
                <div style={{ textAlign: 'center' as const, marginBottom: '24px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'hsl(38 92% 50% / 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>{Icons.wallet(26, 'var(--t-orange)')}</div>
                  <h2 style={{ color: 'var(--t-text)', fontSize: '20px', fontWeight: '700', margin: '0 0 6px' }}>Move UBTC to Wallet</h2>
                 <p style={{ color: 'var(--t-faint)', fontSize: '12px', ...mono, margin: 0 }}>Moves to your linked wallet only · Available: {Math.max(0, ubtcBalance - ubtcCirculation).toFixed(2)} UBTC</p>
                </div>

                {/* Quick amounts */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
                 {(() => { const avail = Math.max(0, ubtcBalance - ubtcCirculation); return [
                    Math.floor(avail * 0.25),
                    Math.floor(avail * 0.5),
                    Math.floor(avail * 0.75),
                    Math.floor(avail),
                  ]})().map((v, i) => ['25%', '50%', '75%', 'Max'].map((label, j) => i === j ? (
                    <button key={label} onClick={() => setMoveAmount(String(v))} style={{ background: moveAmount === String(v) ? 'hsl(38 92% 50% / 0.18)' : 'var(--t-surface)', border: `1px solid ${moveAmount === String(v) ? 'hsl(38 92% 50% / 0.5)' : 'var(--t-border)'}`, color: moveAmount === String(v) ? 'var(--t-orange)' : 'var(--t-faint)', borderRadius: '8px', padding: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', ...mono }}>{label}</button>
                  ) : null))}
                </div>

                <label style={{ display: 'block', color: 'var(--t-faint)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Amount (UBTC)</label>
                <input
                  value={moveAmount}
                  onChange={e => setMoveAmount(e.target.value)}
                  placeholder="0.00"
                  type="number"
                  max={ubtcBalance}
                  style={{ display: 'block', width: '100%', padding: '13px 16px', background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: '12px', color: 'var(--t-text)', fontSize: '18px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '8px' }}
                  autoFocus
                />
                <div style={{ background: 'var(--t-surface)', borderRadius: '8px', padding: '10px 14px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--t-faint)', fontSize: '11px', ...mono }}>Destination</span>
                  <span style={{ color: 'var(--t-orange)', fontSize: '11px', ...mono }}>{vault.linked_wallet?.slice(0, 18)}...</span>
                </div>

              <label style={{ display: 'block', color: 'var(--t-faint)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Protocol Second Key</label>

                {/* Key file upload */}
                <div
                  onClick={() => movePskInputRef.current?.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, background: movePsk ? 'var(--t-green-bg)' : 'var(--t-surface)', border: `1px solid ${movePsk ? 'hsl(142 76% 36% / 0.4)' : 'var(--t-border)'}`, borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', marginBottom: '10px' }}
                >
                  <input
                    ref={movePskInputRef}
                    type="file"
                    accept=".json,.txt,.key"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = ev => {
                        try {
                          const content = ev.target?.result as string
                          let key = ''
                          try {
                            const json = JSON.parse(content)
                            const raw = json?.protocol_second_key || json?.second_key || json?.psk
                            key = raw?.key || raw || ''
                          } catch {
                            const match = content.match(/[a-f0-9]{64,}/)
                            key = match ? match[0] : ''
                          }
                          if (key && typeof key === 'string') { setMovePsk(key); setMoveError('') }
                          else setMoveError('Key not found in file')
                        } catch { setMoveError('Invalid key file') }
						}
                      reader.readAsText(file)
                    }}
                  />
                  <span style={{ fontSize: 20 }}>{movePsk ? '✅' : '🔑'}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: movePsk ? 'var(--t-green)' : 'var(--t-muted)' }}>
                      {movePsk ? 'Key file loaded' : 'Upload key file'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t-faint)', ...mono }}>
                      {movePsk ? 'Protocol second key extracted' : 'Auto-extracts your protocol second key'}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'center' as const, fontSize: 10, color: 'var(--t-faint)', marginBottom: '8px', ...mono }}>— or paste manually —</div>

                <input
                  value={movePsk}
                  onChange={e => setMovePsk(e.target.value)}
                  placeholder="Your protocol second key"
                  type="password"
                  style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: '12px', color: 'var(--t-text)', fontSize: '14px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '18px' }}
                />

                {moveError && <p style={{ color: 'var(--t-red)', fontSize: '12px', ...mono, marginBottom: '12px' }}>{moveError}</p>}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => { setShowMoveModal(false); setMovePsk('') }} style={{ background: 'none', border: '1px solid var(--t-border)', color: 'var(--t-muted)', borderRadius: '12px', padding: '14px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>Cancel</button>
                  <button
                  onClick={() => { if (!moveInProgress.current) handleMoveToWallet() }}
                   disabled={moveLoading || !moveAmount || parseFloat(moveAmount) <= 0 || parseFloat(moveAmount) > ubtcBalance || !movePsk}
                    style={{ flex: 1, background: moveAmount && parseFloat(moveAmount) > 0 && parseFloat(moveAmount) <= ubtcBalance && movePsk && !moveLoading ? 'var(--t-orange)' : 'var(--t-border)', color: moveAmount && parseFloat(moveAmount) > 0 && parseFloat(moveAmount) <= ubtcBalance && movePsk && !moveLoading ? '#000' : 'var(--t-faint)', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-display)' }}
                  >
                    {moveLoading ? 'Moving...' : `Move ${moveAmount || '0'} UBTC to Wallet`}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center' as const, padding: '20px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                <h2 style={{ color: 'var(--t-green)', fontSize: '20px', fontWeight: '700', margin: '0 0 8px' }}>Done!</h2>
                <p style={{ color: 'hsl(0 0% 42%)', fontSize: '13px', ...mono, margin: '0 0 24px' }}>{moveAmount} UBTC moved to your wallet</p>
             <button onClick={() => { setShowMoveModal(false); setMovePsk(''); window.location.href = '/wallet?address=' + (vault.linked_wallet || '') }} style={{ background: 'var(--t-orange)', color: '#000', border: 'none', borderRadius: '12px', padding: '13px 32px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>Open Wallet →</button>
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

      {/* ── MODAL ── */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--t-bg)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' as const }}>
          <div style={{ background: 'var(--t-surface)', border: `1px solid ${scColor}30`, borderRadius: '24px', padding: '36px', maxWidth: '520px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '28px' }}>
              {['deposit', 'quantum', 'done'].map((s, i) => { const idx = { deposit: 0, quantum: 1, done: 2 }[addStep] as number; return <div key={s} style={{ width: s === addStep ? '24px' : '8px', height: '8px', borderRadius: '4px', background: i <= idx ? scColor : 'var(--t-border)', transition: 'all 0.3s' }} /> })}
            </div>
            {addStep === 'deposit' && (
              <>
                <div style={{ textAlign: 'center' as const, marginBottom: '24px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: scColor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>{Icons.deposit(28, scColor)}</div>
                  <h2 style={{ color: 'var(--t-text)', fontSize: '22px', fontWeight: '700', margin: '0 0 6px' }}>Deposit {scToken}</h2>
                  <p style={{ color: 'var(--t-faint)', fontSize: '13px', ...mono, margin: 0 }}>Lock {scToken} in quantum vault · Mint {scUToken} 1:1</p>
                </div>
                <div style={{ background: 'var(--t-surface)', border: `1px solid ${scColor}20`, borderRadius: '14px', padding: '16px', marginBottom: '14px' }}>
                  <p style={{ color: 'var(--t-faint)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>{scToken} Deposit Address (ERC-20)</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><p style={{ color: scColor, fontSize: '11px', ...mono, margin: 0, flex: 1, wordBreak: 'break-all' as const }}>{scAddr}</p><CopyBtn text={scAddr} id="sc-addr" /></div>
                </div>
                <label style={{ display: 'block', color: 'var(--t-faint)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Amount of {scToken} (min 10)</label>
                <input value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="10000" type="number" autoFocus style={{ ...fieldStyle, marginBottom: '10px' }} />
                <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
                  {['1000', '5000', '10000', '50000'].map(v => (<button key={v} onClick={() => setDepositAmount(v)} style={{ flex: 1, background: depositAmount === v ? scColor + '18' : 'var(--t-surface)', border: `1px solid ${depositAmount === v ? scColor + '40' : 'var(--t-border)'}`, color: depositAmount === v ? scColor : 'var(--t-faint)', borderRadius: '8px', padding: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', ...mono }}>${parseInt(v).toLocaleString()}</button>))}
                </div>
                {addError && <p style={{ color: 'var(--t-red)', fontSize: '12px', ...mono, marginBottom: '12px' }}>{addError}</p>}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={resetModal} style={{ background: 'none', border: '1px solid var(--t-border)', color: 'var(--t-muted)', borderRadius: '12px', padding: '14px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>Cancel</button>
                  <button onClick={handleDeposit} disabled={addLoading || !depositAmount || parseFloat(depositAmount) < 10} style={{ flex: 1, background: depositAmount && parseFloat(depositAmount) >= 10 && !addLoading ? `linear-gradient(135deg, ${scColor}, ${scColor}bb)` : 'var(--t-border)', color: depositAmount && parseFloat(depositAmount) >= 10 && !addLoading ? 'white' : 'var(--t-faint)', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: depositAmount && parseFloat(depositAmount) >= 10 && !addLoading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)' }}>{addLoading ? 'Processing...' : 'Continue →'}</button>
                </div>
              </>
            )}
            {addStep === 'quantum' && (
              <>
                <div style={{ textAlign: 'center' as const, marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>{Icons.quantum(44, scColor)}</div>
                  <h2 style={{ color: 'var(--t-text)', fontSize: '22px', fontWeight: '700', margin: '0 0 6px' }}>Quantum Authorization</h2>
                  <p style={{ color: 'var(--t-faint)', fontSize: '13px', ...mono, margin: 0 }}>Authorize minting of {parseFloat(depositAmount).toLocaleString()} {scUToken}</p>
                </div>
                <div style={{ background: 'var(--t-surface)', border: `1px solid ${scColor}20`, borderRadius: '18px', padding: '24px', marginBottom: '14px', textAlign: 'center' as const }}>
                  <p style={{ color: 'var(--t-faint)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0 0 12px' }}>One-Time Code</p>
                  <p style={{ color: 'var(--t-text)', fontSize: '46px', fontWeight: '700', ...mono, letterSpacing: '0.5em', margin: '0 0 8px', lineHeight: '1' }}>{otpCode}</p>
                  <p style={{ color: 'var(--t-faint)', fontSize: '11px', ...mono, margin: 0 }}>Expires {otpExpires ? new Date(otpExpires).toLocaleTimeString() : ''}</p>
                </div>
                <label style={{ display: 'block', color: 'var(--t-faint)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Enter OTP Code</label>
                <input value={otpInput} onChange={e => setOtpInput(e.target.value)} placeholder="123456" style={{ ...fieldStyle, marginBottom: '12px' }} />
                <label style={{ display: 'block', color: 'var(--t-faint)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Protocol Authorization Key</label>
                <input value={secondKey} onChange={e => setSecondKey(e.target.value)} placeholder="Your protocol second key" type="password" style={{ ...fieldStyle, marginBottom: '18px' }} />
                {addError && <p style={{ color: 'var(--t-red)', fontSize: '12px', ...mono, marginBottom: '12px' }}>{addError}</p>}
                <button onClick={handleQuantumMint} disabled={!otpInput || !secondKey || addLoading} style={{ width: '100%', background: otpInput && secondKey && !addLoading ? `linear-gradient(135deg, ${scColor}, ${scColor}bb)` : 'var(--t-border)', color: otpInput && secondKey && !addLoading ? 'white' : 'var(--t-faint)', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: '700', cursor: otpInput && secondKey && !addLoading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)' }}>{addLoading ? 'Minting...' : `Authorize & Mint ${scUToken}`}</button>
              </>
            )}
            {addStep === 'done' && (
              <>
                <div style={{ textAlign: 'center' as const, marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>{Icons.key(52, scColor)}</div>
                  <h2 style={{ color: 'var(--t-text)', fontSize: '22px', fontWeight: '700', margin: '0 0 6px' }}>Save Your Signing Key</h2>
                  <p style={{ color: scColor, fontSize: '13px', ...mono, margin: 0 }}>{parseFloat(depositAmount).toLocaleString()} {scUToken} minted</p>
                </div>
                <div style={{ background: 'var(--t-surface)', border: '2px solid hsl(0 84% 60% / 0.45)', borderRadius: '18px', padding: '22px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{Icons.key(16, 'var(--t-red)')}<div><p style={{ color: 'var(--t-red)', fontWeight: '700', fontSize: '13px', margin: '0 0 2px' }}>Quantum Signing Key (QSK)</p><p style={{ color: 'var(--t-faint)', fontSize: '11px', ...mono, margin: 0 }}>Shown once only</p></div></div>
                    <CopyBtn text={qSigningKey} id="qsk" />
                  </div>
                  <div style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)', borderRadius: '12px', padding: '18px', textAlign: 'center' as const }}><p style={{ color: 'var(--t-red)', fontSize: '20px', fontWeight: '700', ...mono, letterSpacing: '0.05em', margin: 0, lineHeight: '1.6' }}>{qSigningKey}</p></div>
                </div>
                <div onClick={() => setKeySaved(!keySaved)} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'var(--t-surface)', border: `1px solid ${keySaved ? 'hsl(142 76% 36% / 0.4)' : 'var(--t-border)'}`, borderRadius: '12px', padding: '14px', marginBottom: '18px', cursor: 'pointer' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${keySaved ? 'var(--t-green)' : 'var(--t-border)'}`, background: keySaved ? 'var(--t-green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{keySaved && Icons.check(13, 'white')}</div>
                  <p style={{ color: 'hsl(0 0% 48%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.6' }}>I have saved my QSK. I understand it cannot be recovered.</p>
                </div>
                <button onClick={() => { if (keySaved) { resetModal(); setCurrencyTab(scUToken === 'UUSDT' ? 'uusdt' : 'uusdc') } }} disabled={!keySaved} style={{ width: '100%', background: keySaved ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : 'var(--t-border)', color: keySaved ? 'white' : 'var(--t-faint)', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: '700', cursor: keySaved ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)' }}>View {scUToken} Account →</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <div style={{ background: 'linear-gradient(180deg, hsl(220 25% 7%) 0%, hsl(220 20% 10%) 60%, var(--t-bg) 100%)', padding: isMobile ? '20px 20px 36px' : '28px 32px 44px' }}>

        {/* Top nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '36px' }}>
          <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'hsl(0 0% 55%)', textDecoration: 'none', fontSize: '13px', fontWeight: '500' }}>
            {Icons.back(14, 'hsl(0 0% 55%)')} Accounts
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: meta.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{meta.icon}</div>
            <span style={{ color: 'hsl(0 0% 70%)', fontSize: '13px', fontWeight: '600' }}>{meta.title}</span>
          </div>
          <button onClick={loadAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(0 0% 40%)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {Icons.refresh(13, 'hsl(0 0% 40%)')}
          </button>
        </div>

        {/* Balance */}
        <div style={{ textAlign: 'center' as const, marginBottom: '36px' }}>
          <p style={{ color: 'hsl(0 0% 40%)', fontSize: '12px', fontWeight: '500', margin: '0 0 8px', textTransform: 'uppercase' as const, letterSpacing: '0.12em' }}>
            {isActive ? 'UBTC Balance' : 'Bitcoin Backing'}
          </p>
          <p style={{ color: 'white', fontSize: isMobile ? '52px' : '64px', fontWeight: '800', margin: '0 0 8px', lineHeight: '1', letterSpacing: '-2px', ...mono }}>
            ${isActive ? ubtcBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : btcValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' as const }}>
            {isActive && (
              <span style={{ color: 'hsl(0 0% 45%)', fontSize: '13px', ...mono }}>
                {btcLocked.toFixed(6)} BTC backing
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', background: isActive ? 'hsl(142 76% 36% / 0.15)' : 'hsl(38 92% 50% / 0.15)', borderRadius: '20px', padding: '3px 10px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive ? 'var(--t-green)' : 'var(--t-orange)', display: 'inline-block' }} />
              <span style={{ color: isActive ? 'var(--t-green)' : 'var(--t-orange)', fontSize: '11px', fontWeight: '600' }}>{isActive ? 'Active' : 'Pending deposit'}</span>
            </span>
          </div>
        </div>

        {/* Action buttons — context aware */}
        {isActive ? (
          <div style={{ display: 'grid', gridTemplateColumns: hasMinted ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: '10px', maxWidth: '480px', margin: '0 auto' }}>
            <a href={`/mint?vault=${vaultId}&currency=ubtc`} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))', borderRadius: '16px', padding: '16px 10px', textDecoration: 'none', color: 'white' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              <span style={{ fontSize: '12px', fontWeight: '700' }}>Create UBTC</span>
            </a>
            {hasMinted && (
              <button onClick={() => { setShowMoveModal(true); setMoveAmount(''); setMoveError(''); setMoveDone(false) }} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '8px', background: 'hsl(38 92% 50% / 0.18)', border: '1px solid hsl(38 92% 50% / 0.35)', borderRadius: '16px', padding: '16px 10px', cursor: 'pointer', color: 'var(--t-orange)' }}>
                {Icons.wallet(20, 'var(--t-orange)')}
                <span style={{ fontSize: '12px', fontWeight: '700' }}>Move to Wallet</span>
              </button>
            )}
            <a href={vault.linked_wallet ? `/wallet?address=${vault.linked_wallet}` : '/wallet'} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '8px', background: 'hsl(0 0% 100% / 0.06)', border: '1px solid hsl(0 0% 100% / 0.1)', borderRadius: '16px', padding: '16px 10px', textDecoration: 'none', color: 'hsl(0 0% 65%)' }}>
              {Icons.send(20, 'hsl(0 0% 65%)')}
              <span style={{ fontSize: '12px', fontWeight: '700' }}>My Wallet</span>
            </a>
          </div>
        ) : (
          <div style={{ maxWidth: '420px', margin: '0 auto' }}>
            <a href={`/deposit?vault=${vaultId}&currency=ubtc`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))', borderRadius: '16px', padding: '18px', textDecoration: 'none', color: 'white', fontSize: '15px', fontWeight: '700' }}>
              {Icons.deposit(18, 'white')} Add Bitcoin to Activate
            </a>
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ padding: isMobile ? '20px 16px' : '28px 32px', maxWidth: '680px', margin: '0 auto' }}>

        {/* ── PENDING: deposit address ── */}
        {!isActive && (
          <div style={{ background: 'hsl(38 92% 50% / 0.08)', border: '1px solid hsl(38 92% 50% / 0.25)', borderRadius: '20px', padding: '24px', marginBottom: '20px' }}>
            <p style={{ color: 'var(--t-orange)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '0.12em', margin: '0 0 6px' }}>Step 1 — Add Bitcoin</p>
            <p style={{ color: 'var(--t-text)', fontSize: '17px', fontWeight: '700', margin: '0 0 6px' }}>Send Bitcoin to activate your account</p>
            <p style={{ color: 'hsl(0 0% 48%)', fontSize: '13px', margin: '0 0 18px', lineHeight: '1.7' }}>Your Bitcoin is locked as collateral. Once confirmed, you can create UBTC against it.</p>
            <div style={{ background: 'hsl(0 0% 0% / 0.3)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <p style={{ color: 'hsl(205,85%,65%)', fontSize: '12px', ...mono, margin: 0, flex: 1, wordBreak: 'break-all' as const, lineHeight: '1.6' }}>{depositAddr}</p>
              <CopyBtn text={depositAddr} id="dep-addr" />
            </div>
            <p style={{ color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, margin: 0, textAlign: 'center' as const }}>Waiting for confirmation — updates automatically</p>
          </div>
        )}

        {/* ── RISK INDICATOR (always visible when active) ── */}
        {isActive && (
          <div style={{ background: 'var(--t-surface)', border: `1px solid ${ratioColor}30`, borderRadius: '20px', padding: '20px 22px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <p style={{ color: 'hsl(0 0% 40%)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '0.12em', margin: '0 0 3px' }}>Safety Level</p>
                <p style={{ color: ratioColor, fontSize: '26px', fontWeight: '800', ...mono, margin: 0, lineHeight: 1 }}>
                  {ratio > 0 ? ratio.toFixed(0) + '%' : '—'}
                  <span style={{ color: 'hsl(0 0% 40%)', fontSize: '13px', fontWeight: '500', marginLeft: '8px' }}>{safetyLabel}</span>
                </p>
              </div>
              <div style={{ textAlign: 'right' as const }}>
                <p style={{ color: 'hsl(0 0% 38%)', fontSize: '10px', ...mono, margin: '0 0 3px', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>BTC price</p>
                <p style={{ color: 'hsl(0 0% 60%)', fontSize: '14px', fontWeight: '600', ...mono, margin: 0 }}>${btcPrice.toLocaleString()}</p>
              </div>
            </div>

            {/* Ratio bar */}
            <div style={{ height: '6px', background: 'hsl(0 0% 15%)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{ height: '100%', width: Math.min(100, ratio / 3) + '%', background: `linear-gradient(90deg, ${ratioColor}, ${ratioColor}bb)`, borderRadius: '3px', transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ color: 'hsl(0 0% 30%)', fontSize: '10px', ...mono }}>0%</span>
              <span style={{ color: 'hsl(0 84% 60% / 0.7)', fontSize: '10px', ...mono }}>150% min</span>
              <span style={{ color: 'hsl(142 76% 36% / 0.7)', fontSize: '10px', ...mono }}>200% healthy</span>
              <span style={{ color: 'hsl(0 0% 30%)', fontSize: '10px', ...mono }}>300%</span>
            </div>

            {/* Two key numbers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'hsl(0 0% 0% / 0.25)', borderRadius: '12px', padding: '12px 14px' }}>
                <p style={{ color: 'hsl(0 0% 38%)', fontSize: '10px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 4px' }}>BTC locked</p>
                <p style={{ color: 'var(--t-orange)', fontSize: '16px', fontWeight: '700', ...mono, margin: '0 0 1px' }}>{btcLocked.toFixed(6)}</p>
                <p style={{ color: 'hsl(0 0% 35%)', fontSize: '10px', ...mono, margin: 0 }}>${btcValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD</p>
              </div>
              <div style={{ background: 'hsl(0 0% 0% / 0.25)', borderRadius: '12px', padding: '12px 14px' }}>
                <p style={{ color: 'hsl(0 0% 38%)', fontSize: '10px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 4px' }}>UBTC created</p>
                <p style={{ color: 'hsl(205,85%,65%)', fontSize: '16px', fontWeight: '700', ...mono, margin: '0 0 1px' }}>${ubtcBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                <p style={{ color: 'hsl(0 0% 35%)', fontSize: '10px', ...mono, margin: 0 }}>{remainingMintable > 0 ? '$' + remainingMintable.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' more available' : 'fully minted'}</p>
              </div>
            </div>

            {ratio > 0 && ratio < 150 && (
              <div style={{ marginTop: '14px', background: 'hsl(0 84% 60% / 0.1)', border: '1px solid hsl(0 84% 60% / 0.3)', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {Icons.warning(14, 'var(--t-red)')}
                <p style={{ color: 'var(--t-red)', fontSize: '12px', ...mono, margin: 0 }}>Safety level is low — consider adding more BTC to avoid liquidation</p>
              </div>
            )}
          </div>
        )}

        {/* ── CREATE UBTC (primary CTA) ── */}
        {isActive && (
          <div style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border-subtle)', borderRadius: '20px', padding: '22px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
              <div>
                <p style={{ color: 'hsl(205,85%,65%)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '0.12em', margin: '0 0 4px' }}>Create UBTC</p>
                <p style={{ color: 'var(--t-text)', fontSize: '16px', fontWeight: '700', margin: 0 }}>
                  {!hasMinted ? 'Lock your BTC, get UBTC' : 'Create more UBTC'}
                </p>
              </div>
              {remainingMintable > 0 && (
                <div style={{ flexShrink: 0, background: 'hsl(205 85% 55% / 0.12)', borderRadius: '10px', padding: '8px 14px', textAlign: 'right' as const }}>
                  <p style={{ color: 'hsl(0 0% 38%)', fontSize: '9px', ...mono, textTransform: 'uppercase' as const, margin: '0 0 2px' }}>Available</p>
                  <p style={{ color: 'hsl(205,85%,65%)', fontSize: '16px', fontWeight: '800', ...mono, margin: 0 }}>${remainingMintable.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
              )}
            </div>
            <p style={{ color: 'hsl(0 0% 45%)', fontSize: '13px', margin: '0 0 18px', lineHeight: '1.7' }}>
              {!hasMinted
                ? 'UBTC is a dollar-pegged token backed 1.5× by your Bitcoin. You can send it to anyone, use it as cash, or swap it — while your BTC stays locked and appreciating.'
                : 'Your BTC backing supports more UBTC. Keep your safety level above 200% for a healthy buffer.'}
            </p>
            <a href={`/mint?vault=${vaultId}&currency=ubtc`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))', borderRadius: '14px', padding: '16px', textDecoration: 'none', color: 'white', fontSize: '15px', fontWeight: '700', fontFamily: 'var(--font-display)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              {!hasMinted ? 'Create UBTC Now →' : `Create More UBTC →`}
            </a>
          </div>
        )}

        {/* ── MOVE TO WALLET (step 2 after minting) ── */}
        {isActive && hasMinted && (
          <div style={{ background: 'var(--t-surface)', border: availableToMove > 0 ? '1px solid hsl(38 92% 50% / 0.4)' : '1px solid var(--t-border-subtle)', borderRadius: '20px', padding: '22px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              {Icons.wallet(18, availableToMove > 0 ? 'var(--t-orange)' : 'hsl(0 0% 35%)')}
              <div>
                <p style={{ color: availableToMove > 0 ? 'var(--t-orange)' : 'hsl(0 0% 35%)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '0.12em', margin: '0 0 2px' }}>Your Wallet</p>
                <p style={{ color: 'var(--t-text)', fontSize: '15px', fontWeight: '700', margin: 0 }}>
                  {availableToMove > 0 ? `${availableToMove.toFixed(2)} UBTC ready to move` : 'All UBTC moved to wallet'}
                </p>
              </div>
              {vault.linked_wallet && walletBalance > 0 && (
                <p style={{ color: 'var(--t-orange)', fontSize: '16px', fontWeight: '800', ...mono, margin: '0 0 0 auto' }}>{walletBalance.toFixed(2)} UBTC</p>
              )}
            </div>
            <p style={{ color: 'hsl(0 0% 42%)', fontSize: '13px', margin: '0 0 16px', lineHeight: '1.7' }}>
              UBTC in this account can't be sent yet — it needs to be in your wallet first. Think of this account as the vault, and your wallet as your spending account.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              {availableToMove > 0 && (
                <button onClick={() => { setShowMoveModal(true); setMoveAmount(''); setMoveError(''); setMoveDone(false) }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--t-orange)', border: 'none', borderRadius: '12px', padding: '14px', color: '#000', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
                  {Icons.wallet(16, '#000')} Move to Wallet →
                </button>
              )}
              <a href={vault.linked_wallet ? `/wallet?address=${vault.linked_wallet}` : '/wallet'} style={{ flex: availableToMove > 0 ? '0 0 auto' : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'hsl(0 0% 100% / 0.06)', border: '1px solid hsl(0 0% 100% / 0.1)', borderRadius: '12px', padding: '14px 20px', textDecoration: 'none', color: 'hsl(0 0% 60%)', fontSize: '14px', fontWeight: '600' }}>
                Open Wallet
              </a>
            </div>
          </div>
        )}

        {/* ── ACTIVITY ── */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ color: 'var(--t-text)', fontSize: '15px', fontWeight: '700', margin: 0 }}>Activity</h3>
            <button onClick={async () => { const res = await fetch(`${API_URL}/deposit/scan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vault_id: vaultId }) }); const data = await res.json(); if (data.found) await loadAll() }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'hsl(0 0% 40%)', fontSize: '11px' }}>
              {Icons.refresh(12, 'hsl(0 0% 40%)')} Refresh
            </button>
          </div>
          {transactions.length === 0 && walletTxs.length === 0 ? (
            <div style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border-subtle)', borderRadius: '16px', padding: '40px 24px', textAlign: 'center' as const }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', opacity: 0.25 }}>{Icons.chart(40, 'var(--t-muted)')}</div>
              <p style={{ color: 'hsl(0 0% 38%)', fontSize: '14px', fontWeight: '600', margin: '0 0 4px' }}>No activity yet</p>
              <p style={{ color: 'hsl(0 0% 28%)', fontSize: '12px', ...mono, margin: 0 }}>
                {!isActive ? 'Send Bitcoin to get started' : !hasMinted ? 'Create UBTC to see activity here' : 'Your transactions will appear here'}
              </p>
            </div>
          ) : (
            <div style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border-subtle)', borderRadius: '16px', overflow: 'hidden' }}>
              {[...transactions, ...walletTxs].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((tx: any, i: number, arr: any[]) => (
                <TxRow key={tx.id} tx={tx} i={i} total={arr.length} />
              ))}
            </div>
          )}
        </div>

        {/* ── REDEMPTION INFO (secondary — informational) ── */}
        {isActive && hasMinted && (
          <details style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border-subtle)', borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
            <summary style={{ color: 'hsl(0 0% 40%)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{Icons.redeem(13, 'hsl(0 0% 35%)')} Cash Out (Redeem UBTC for BTC)</span>
              <span style={{ color: 'hsl(0 0% 30%)', fontSize: '11px' }}>▸</span>
            </summary>
            <div style={{ marginTop: '14px' }}>
              <p style={{ color: 'hsl(0 0% 45%)', fontSize: '13px', lineHeight: '1.75', margin: '0 0 14px' }}>
                When you redeem UBTC, you burn the tokens and unlock the equivalent amount of Bitcoin from your vault. The amount of BTC you receive is calculated at the current BTC price at the moment of redemption.
              </p>
              <p style={{ color: 'hsl(0 0% 35%)', fontSize: '12px', ...mono, lineHeight: '1.7', margin: '0 0 16px', background: 'hsl(0 0% 0% / 0.25)', borderRadius: '10px', padding: '12px 14px' }}>
                Example: you created 100 UBTC when BTC = $50,000. If you redeem when BTC = $60,000, your 100 UBTC unlocks only ~0.00167 BTC ($100 worth) — your remaining BTC stays locked as collateral.
              </p>
              <a href={`/redeem?vault=${vaultId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'hsl(0 0% 40%)', fontSize: '12px', textDecoration: 'none', border: '1px solid hsl(0 0% 25%)', borderRadius: '8px', padding: '8px 16px' }}>
                {Icons.redeem(13, 'hsl(0 0% 40%)')} Go to Redemption
              </a>
            </div>
          </details>
        )}

        {/* ── DEPOSIT ADDRESS + ACCOUNT DETAILS ── */}
        <details style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border-subtle)', borderRadius: '16px', padding: '16px' }}>
          <summary style={{ color: 'hsl(0 0% 40%)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {Icons.shield(12, 'hsl(0 0% 40%)')} Account Details
          </summary>
          <div style={{ marginTop: '14px' }}>
            {isActive && depositAddr && (
              <div style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid var(--t-border-subtle)' }}>
                <p style={{ color: 'hsl(0 0% 35%)', fontSize: '9px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 6px' }}>Bitcoin Deposit Address</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <p style={{ color: 'hsl(205,85%,65%)', fontSize: '11px', ...mono, margin: 0, flex: 1, wordBreak: 'break-all' as const, lineHeight: '1.6' }}>{depositAddr}</p>
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
              <div key={item.label} style={{ padding: '7px 0', borderBottom: '1px solid var(--t-border-subtle)' }}>
                <p style={{ color: 'hsl(0 0% 35%)', fontSize: '9px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 3px' }}>{item.label}</p>
                <p style={{ color: 'hsl(0 0% 55%)', fontSize: '11px', ...mono, margin: 0, wordBreak: 'break-all' as const }}>{item.value}</p>
              </div>
            ))}
          </div>
        </details>

      </div>
    </div>
  )
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--t-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t-faint)', fontFamily: 'var(--font-mono)' }}>Loading...</div>}>
      <AccountContent />
    </Suspense>
  )
}
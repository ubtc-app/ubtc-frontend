'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { API_URL, supabase } from '../../lib/supabase'
import { Icons } from '../../components/Icons'

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

  const accountMeta: Record<string, { icon: any; title: string; color: string; tag: string; custody: string }> = {
    current: { icon: Icons.currentAccount(22, 'hsl(205 85% 55%)'), title: 'Current Account', color: 'hsl(205 85% 55%)', tag: 'Self-Custody', custody: 'Taproot Self-Custody' },
    savings: { icon: Icons.savings(22, 'hsl(38 92% 50%)'), title: 'Savings Account', color: 'hsl(38 92% 50%)', tag: 'Self-Custody', custody: 'Taproot Self-Custody' },
    yield: { icon: Icons.yield(22, 'hsl(142 76% 36%)'), title: 'Yield Account', color: 'hsl(142 76% 36%)', tag: 'Babylon 3-5%', custody: 'Taproot + Babylon' },
    custody_yield: { icon: Icons.chart(22, 'hsl(205 85% 55%)'), title: 'Custody Yield', color: 'hsl(205 85% 55%)', tag: 'Managed 4-6%', custody: 'BitGo / Komainu' },
    prime: { icon: Icons.vault(22, 'hsl(270 85% 65%)'), title: 'Prime Account', color: 'hsl(270 85% 65%)', tag: 'Managed 5-8%', custody: 'BitGo / Komainu' },
    managed_yield: { icon: Icons.yield(22, 'hsl(142 76% 36%)'), title: 'Managed Yield', color: 'hsl(142 76% 36%)', tag: 'Managed 6-10%', custody: 'BitGo / Komainu' },
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
    <button onClick={() => copy(text, id)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: copied === id ? 'hsl(142 76% 36% / 0.15)' : 'hsl(220 12% 12%)', border: `1px solid ${copied === id ? 'hsl(142 76% 36% / 0.4)' : 'hsl(220 10% 20%)'}`, color: copied === id ? 'hsl(142 76% 36%)' : 'hsl(0 0% 50%)', borderRadius: '7px', padding: '6px 12px', fontSize: '11px', cursor: 'pointer', ...mono, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
      {copied === id ? Icons.check(13, 'hsl(142 76% 36%)') : Icons.copy(13, 'hsl(0 0% 50%)')}
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

 const handleMoveToWallet = async () => {
    if (!moveAmount || !vault.linked_wallet) return
    if (moveInProgress.current) return
    moveInProgress.current = true
    setMoveLoading(true); setMoveError('')
    try {
   const res = await fetch(`${API_URL}/vaults/${vaultId}/send-to-wallet`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vault_id: vaultId, wallet_address: vault.linked_wallet, ubtc_amount: moveAmount, second_key: String(movePsk).trim() })
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

  if (loading) return <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'hsl(0 0% 30%)', fontSize: '14px', ...mono }}>Loading...</p></div>
  if (!vault) return <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'hsl(0 84% 60%)', fontSize: '14px', ...mono }}>Account not found</p></div>

  const meta = accountMeta[vault.account_type] || { icon: Icons.currentAccount(22, 'hsl(205 85% 55%)'), title: vault.account_type, color: 'hsl(205 85% 55%)', tag: '', custody: '' }
  const btcLocked = vault.btc_amount_sats / 100_000_000
  const btcValue = btcLocked * btcPrice
  const ubtcBalance = parseFloat(vault.ubtc_minted || '0')
  const maxMintable = btcValue / 1.5
  const remainingMintable = maxMintable - ubtcBalance
  const ratio = ubtcBalance > 0 ? (btcValue / ubtcBalance * 100) : 0
  const ratioColor = ratio >= 200 ? 'hsl(142 76% 36%)' : ratio >= 150 ? 'hsl(38 92% 50%)' : ratio > 0 ? 'hsl(0 84% 60%)' : 'hsl(0 0% 45%)'
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
    const map: Record<string, string> = { mint: 'hsl(205 85% 55%)', deposit: 'hsl(38 92% 50%)', redeem: 'hsl(142 76% 36%)', burn: 'hsl(0 84% 60%)', transfer: 'hsl(270 85% 65%)', to_wallet: 'hsl(142 76% 36%)', external_send: 'hsl(0 84% 60%)', wallet_redeem: 'hsl(0 84% 60%)', withdraw: 'hsl(0 84% 60%)' }
    return map[kind] || 'hsl(0 0% 55%)'
  }

  const TxRow = ({ tx, i, total }: { tx: any; i: number; total: number }) => {
    const isCredit = ['deposit', 'mint'].includes(tx.kind)
    const color = kindColor(tx.kind)
    return (
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < total - 1 ? '1px solid hsl(220 10% 10%)' : 'none', gap: '14px' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: color + '14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{txIcon(tx.kind)}</div>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'hsl(0 0% 88%)', fontWeight: '600', fontSize: '13px', margin: '0 0 2px' }}>{tx.description}</p>
          <p style={{ color: 'hsl(0 0% 32%)', fontSize: '11px', ...mono, margin: 0 }}>{new Date(tx.created_at).toLocaleString()}</p>
        </div>
        <p style={{ color, fontWeight: '700', fontSize: '14px', ...mono, margin: 0 }}>{isCredit ? '+' : '-'}{tx.amount} {tx.currency}</p>
      </div>
    )
  }

  const ActionButtons = ({ currency }: { currency: 'ubtc' | 'uusdt' | 'uusdc' }) => {
    const color = currency === 'ubtc' ? 'hsl(205 85% 55%)' : currency === 'uusdt' ? 'hsl(142 76% 36%)' : 'hsl(220 85% 60%)'
    const depColor = currency === 'ubtc' ? 'hsl(38 92% 50%)' : color
    const mintBg = currency === 'ubtc' ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : currency === 'uusdt' ? 'linear-gradient(135deg, hsl(142,76%,36%), hsl(142,76%,28%))' : 'linear-gradient(135deg, hsl(220,85%,60%), hsl(220,85%,45%))'
    const btns = [
      { label: 'Deposit', icon: Icons.deposit(22, depColor), href: `/deposit?vault=${vaultId}&currency=${currency}`, style: { background: depColor + '10', border: `1px solid ${depColor}30`, color: depColor } },
      { label: 'Mint', icon: Icons.mint(22, 'white'), href: `/mint?vault=${vaultId}&currency=${currency}`, style: { background: mintBg, border: '1px solid transparent', color: 'white', boxShadow: `0 0 20px ${color}30` } },
{ label: 'To Wallet', icon: Icons.wallet(22, color), href: '#', onClick: (e: any) => { e.preventDefault(); setShowMoveModal(true); setMoveAmount(''); setMoveError(''); setMoveDone(false) }, style: { background: color + '10', border: `1px solid ${color}30`, color } },
      { label: 'Redeem', icon: Icons.redeem(22, 'hsl(0 0% 55%)'), href: `/redeem?vault=${vaultId}&currency=${currency}`, style: { background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 10% 17%)', color: 'hsl(0 0% 55%)' } },
    ]
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
      {btns.map(btn => (
          <a key={btn.label} href={btn.href} onClick={(btn as any).onClick} style={{ ...btn.style, borderRadius: '14px', padding: '18px 8px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '10px', textDecoration: 'none', cursor: 'pointer' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{btn.icon}</span>
            <span style={{ fontSize: '12px', fontWeight: '700', fontFamily: 'var(--font-mono)', textAlign: 'center' as const }}>{btn.label}</span>
          </a>
        ))}
      </div>
    )
  }

  const scColor = showAddModal === 'UUSDT' ? 'hsl(142 76% 36%)' : 'hsl(220 85% 60%)'
  const scToken = showAddModal === 'UUSDT' ? 'USDT' : 'USDC'
  const scUToken = showAddModal || 'UUSDT'
  const scAddr = '0x' + vaultId.replace('vault_', '').padEnd(40, 'a1b2c3d4e5f67890abcdef12')
  const fieldStyle: any = { display: 'block', width: '100%', padding: '13px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '12px', color: 'hsl(0 0% 92%)', fontSize: '14px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', fontFamily: 'var(--font-display)' }}>

  {/* ── NOTIFICATIONS ── */}
    {notifications.map(notif => (
      <div key={notif.id} style={{ position: 'fixed', top: '80px', right: '24px', zIndex: 200, background: 'hsl(38 92% 50% / 0.95)', borderRadius: '16px', padding: '16px 20px', maxWidth: '380px', boxShadow: '0 8px 32px hsl(0 0% 0% / 0.4)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '20px', flexShrink: 0 }}>⚠️</span>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#000', fontSize: '13px', fontWeight: '700', margin: '0 0 4px', fontFamily: 'var(--font-display)' }}>Collateral Update</p>
          <p style={{ color: 'hsl(0 0% 10%)', fontSize: '12px', fontFamily: 'var(--font-mono)', margin: '0 0 10px', lineHeight: '1.5' }}>{notif.message}</p>
          <button onClick={() => dismissNotification(notif.id)} style={{ background: '#000', color: 'hsl(38 92% 50%)', border: 'none', borderRadius: '8px', padding: '6px 16px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>OK</button>
        </div>
      </div>
    ))}

    {/* ── MOVE TO WALLET MODAL ── */}
      {showMoveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'hsl(220 15% 2% / 0.97)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(38 92% 50% / 0.3)', borderRadius: '24px', padding: '36px', maxWidth: '440px', width: '100%' }}>
            {!moveDone ? (
              <>
                <div style={{ textAlign: 'center' as const, marginBottom: '24px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'hsl(38 92% 50% / 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>{Icons.wallet(26, 'hsl(38 92% 50%)')}</div>
                  <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: '0 0 6px' }}>Move UBTC to Wallet</h2>
                 <p style={{ color: 'hsl(0 0% 38%)', fontSize: '12px', ...mono, margin: 0 }}>Moves to your linked wallet only · Available: {Math.max(0, ubtcBalance - ubtcCirculation).toFixed(2)} UBTC</p>
                </div>

                {/* Quick amounts */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
                 {(() => { const avail = Math.max(0, ubtcBalance - ubtcCirculation); return [
                    Math.floor(avail * 0.25),
                    Math.floor(avail * 0.5),
                    Math.floor(avail * 0.75),
                    Math.floor(avail),
                  ]})().map((v, i) => ['25%', '50%', '75%', 'Max'].map((label, j) => i === j ? (
                    <button key={label} onClick={() => setMoveAmount(String(v))} style={{ background: moveAmount === String(v) ? 'hsl(38 92% 50% / 0.18)' : 'hsl(220 15% 5%)', border: `1px solid ${moveAmount === String(v) ? 'hsl(38 92% 50% / 0.5)' : 'hsl(220 10% 14%)'}`, color: moveAmount === String(v) ? 'hsl(38 92% 50%)' : 'hsl(0 0% 35%)', borderRadius: '8px', padding: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', ...mono }}>{label}</button>
                  ) : null))}
                </div>

                <label style={{ display: 'block', color: 'hsl(0 0% 38%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Amount (UBTC)</label>
                <input
                  value={moveAmount}
                  onChange={e => setMoveAmount(e.target.value)}
                  placeholder="0.00"
                  type="number"
                  max={ubtcBalance}
                  style={{ display: 'block', width: '100%', padding: '13px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '12px', color: 'hsl(0 0% 92%)', fontSize: '18px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '8px' }}
                  autoFocus
                />
                <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '8px', padding: '10px 14px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'hsl(0 0% 30%)', fontSize: '11px', ...mono }}>Destination</span>
                  <span style={{ color: 'hsl(38 92% 50%)', fontSize: '11px', ...mono }}>{vault.linked_wallet?.slice(0, 18)}...</span>
                </div>

              <label style={{ display: 'block', color: 'hsl(0 0% 38%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Protocol Second Key</label>

                {/* Key file upload */}
                <div
                  onClick={() => movePskInputRef.current?.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, background: movePsk ? 'hsl(142 76% 36% / 0.08)' : 'hsl(220 15% 5%)', border: `1px solid ${movePsk ? 'hsl(142 76% 36% / 0.4)' : 'hsl(220 10% 14%)'}`, borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', marginBottom: '10px' }}
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
                    <div style={{ fontSize: 12, fontWeight: 700, color: movePsk ? 'hsl(142 76% 36%)' : 'hsl(0 0% 55%)' }}>
                      {movePsk ? 'Key file loaded' : 'Upload key file'}
                    </div>
                    <div style={{ fontSize: 11, color: 'hsl(0 0% 30%)', ...mono }}>
                      {movePsk ? 'Protocol second key extracted' : 'Auto-extracts your protocol second key'}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'center' as const, fontSize: 10, color: 'hsl(0 0% 25%)', marginBottom: '8px', ...mono }}>— or paste manually —</div>

                <input
                  value={movePsk}
                  onChange={e => setMovePsk(e.target.value)}
                  placeholder="Your protocol second key"
                  type="password"
                  style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '12px', color: 'hsl(0 0% 92%)', fontSize: '14px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '18px' }}
                />

                {moveError && <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, marginBottom: '12px' }}>{moveError}</p>}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => { setShowMoveModal(false); setMovePsk('') }} style={{ background: 'none', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 40%)', borderRadius: '12px', padding: '14px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>Cancel</button>
                  <button
                  onClick={() => { if (!moveInProgress.current) handleMoveToWallet() }}
                   disabled={moveLoading || !moveAmount || parseFloat(moveAmount) <= 0 || parseFloat(moveAmount) > ubtcBalance || !movePsk}
                    style={{ flex: 1, background: moveAmount && parseFloat(moveAmount) > 0 && parseFloat(moveAmount) <= ubtcBalance && movePsk && !moveLoading ? 'hsl(38 92% 50%)' : 'hsl(220 10% 14%)', color: moveAmount && parseFloat(moveAmount) > 0 && parseFloat(moveAmount) <= ubtcBalance && movePsk && !moveLoading ? '#000' : 'hsl(0 0% 28%)', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-display)' }}
                  >
                    {moveLoading ? 'Moving...' : `Move ${moveAmount || '0'} UBTC to Wallet`}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center' as const, padding: '20px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                <h2 style={{ color: 'hsl(142 76% 36%)', fontSize: '20px', fontWeight: '700', margin: '0 0 8px' }}>Done!</h2>
                <p style={{ color: 'hsl(0 0% 42%)', fontSize: '13px', ...mono, margin: '0 0 24px' }}>{moveAmount} UBTC moved to your wallet</p>
             <button onClick={() => { setShowMoveModal(false); setMovePsk(''); window.location.href = '/wallet?address=' + (vault.linked_wallet || '') }} style={{ background: 'hsl(38 92% 50%)', color: '#000', border: 'none', borderRadius: '12px', padding: '13px 32px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>Open Wallet →</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL ── */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'hsl(220 15% 2% / 0.97)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' as const }}>
          <div style={{ background: 'hsl(220 12% 8%)', border: `1px solid ${scColor}30`, borderRadius: '24px', padding: '36px', maxWidth: '520px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '28px' }}>
              {['deposit', 'quantum', 'done'].map((s, i) => { const idx = { deposit: 0, quantum: 1, done: 2 }[addStep] as number; return <div key={s} style={{ width: s === addStep ? '24px' : '8px', height: '8px', borderRadius: '4px', background: i <= idx ? scColor : 'hsl(220 10% 18%)', transition: 'all 0.3s' }} /> })}
            </div>
            {addStep === 'deposit' && (
              <>
                <div style={{ textAlign: 'center' as const, marginBottom: '24px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: scColor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>{Icons.deposit(28, scColor)}</div>
                  <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '22px', fontWeight: '700', margin: '0 0 6px' }}>Deposit {scToken}</h2>
                  <p style={{ color: 'hsl(0 0% 38%)', fontSize: '13px', ...mono, margin: 0 }}>Lock {scToken} in quantum vault · Mint {scUToken} 1:1</p>
                </div>
                <div style={{ background: 'hsl(220 15% 5%)', border: `1px solid ${scColor}20`, borderRadius: '14px', padding: '16px', marginBottom: '14px' }}>
                  <p style={{ color: 'hsl(0 0% 30%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>{scToken} Deposit Address (ERC-20)</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><p style={{ color: scColor, fontSize: '11px', ...mono, margin: 0, flex: 1, wordBreak: 'break-all' as const }}>{scAddr}</p><CopyBtn text={scAddr} id="sc-addr" /></div>
                </div>
                <label style={{ display: 'block', color: 'hsl(0 0% 38%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Amount of {scToken} (min 10)</label>
                <input value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="10000" type="number" autoFocus style={{ ...fieldStyle, marginBottom: '10px' }} />
                <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
                  {['1000', '5000', '10000', '50000'].map(v => (<button key={v} onClick={() => setDepositAmount(v)} style={{ flex: 1, background: depositAmount === v ? scColor + '18' : 'hsl(220 15% 5%)', border: `1px solid ${depositAmount === v ? scColor + '40' : 'hsl(220 10% 14%)'}`, color: depositAmount === v ? scColor : 'hsl(0 0% 35%)', borderRadius: '8px', padding: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', ...mono }}>${parseInt(v).toLocaleString()}</button>))}
                </div>
                {addError && <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, marginBottom: '12px' }}>{addError}</p>}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={resetModal} style={{ background: 'none', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 40%)', borderRadius: '12px', padding: '14px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>Cancel</button>
                  <button onClick={handleDeposit} disabled={addLoading || !depositAmount || parseFloat(depositAmount) < 10} style={{ flex: 1, background: depositAmount && parseFloat(depositAmount) >= 10 && !addLoading ? `linear-gradient(135deg, ${scColor}, ${scColor}bb)` : 'hsl(220 10% 14%)', color: depositAmount && parseFloat(depositAmount) >= 10 && !addLoading ? 'white' : 'hsl(0 0% 28%)', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: depositAmount && parseFloat(depositAmount) >= 10 && !addLoading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)' }}>{addLoading ? 'Processing...' : 'Continue →'}</button>
                </div>
              </>
            )}
            {addStep === 'quantum' && (
              <>
                <div style={{ textAlign: 'center' as const, marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>{Icons.quantum(44, scColor)}</div>
                  <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '22px', fontWeight: '700', margin: '0 0 6px' }}>Quantum Authorization</h2>
                  <p style={{ color: 'hsl(0 0% 38%)', fontSize: '13px', ...mono, margin: 0 }}>Authorize minting of {parseFloat(depositAmount).toLocaleString()} {scUToken}</p>
                </div>
                <div style={{ background: 'hsl(220 15% 5%)', border: `1px solid ${scColor}20`, borderRadius: '18px', padding: '24px', marginBottom: '14px', textAlign: 'center' as const }}>
                  <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0 0 12px' }}>One-Time Code</p>
                  <p style={{ color: 'hsl(0 0% 92%)', fontSize: '46px', fontWeight: '700', ...mono, letterSpacing: '0.5em', margin: '0 0 8px', lineHeight: '1' }}>{otpCode}</p>
                  <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, margin: 0 }}>Expires {otpExpires ? new Date(otpExpires).toLocaleTimeString() : ''}</p>
                </div>
                <label style={{ display: 'block', color: 'hsl(0 0% 38%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Enter OTP Code</label>
                <input value={otpInput} onChange={e => setOtpInput(e.target.value)} placeholder="123456" style={{ ...fieldStyle, marginBottom: '12px' }} />
                <label style={{ display: 'block', color: 'hsl(0 0% 38%)', fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Protocol Authorization Key</label>
                <input value={secondKey} onChange={e => setSecondKey(e.target.value)} placeholder="Your protocol second key" type="password" style={{ ...fieldStyle, marginBottom: '18px' }} />
                {addError && <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, marginBottom: '12px' }}>{addError}</p>}
                <button onClick={handleQuantumMint} disabled={!otpInput || !secondKey || addLoading} style={{ width: '100%', background: otpInput && secondKey && !addLoading ? `linear-gradient(135deg, ${scColor}, ${scColor}bb)` : 'hsl(220 10% 14%)', color: otpInput && secondKey && !addLoading ? 'white' : 'hsl(0 0% 28%)', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: '700', cursor: otpInput && secondKey && !addLoading ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)' }}>{addLoading ? 'Minting...' : `Authorize & Mint ${scUToken}`}</button>
              </>
            )}
            {addStep === 'done' && (
              <>
                <div style={{ textAlign: 'center' as const, marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>{Icons.key(52, scColor)}</div>
                  <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '22px', fontWeight: '700', margin: '0 0 6px' }}>Save Your Signing Key</h2>
                  <p style={{ color: scColor, fontSize: '13px', ...mono, margin: 0 }}>{parseFloat(depositAmount).toLocaleString()} {scUToken} minted</p>
                </div>
                <div style={{ background: 'hsl(220 12% 8%)', border: '2px solid hsl(0 84% 60% / 0.45)', borderRadius: '18px', padding: '22px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{Icons.key(16, 'hsl(0 84% 60%)')}<div><p style={{ color: 'hsl(0 84% 60%)', fontWeight: '700', fontSize: '13px', margin: '0 0 2px' }}>Quantum Signing Key (QSK)</p><p style={{ color: 'hsl(0 0% 30%)', fontSize: '11px', ...mono, margin: 0 }}>Shown once only</p></div></div>
                    <CopyBtn text={qSigningKey} id="qsk" />
                  </div>
                  <div style={{ background: 'hsl(220 15% 4%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '12px', padding: '18px', textAlign: 'center' as const }}><p style={{ color: 'hsl(0 84% 60%)', fontSize: '20px', fontWeight: '700', ...mono, letterSpacing: '0.05em', margin: 0, lineHeight: '1.6' }}>{qSigningKey}</p></div>
                </div>
                <div onClick={() => setKeySaved(!keySaved)} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'hsl(220 12% 8%)', border: `1px solid ${keySaved ? 'hsl(142 76% 36% / 0.4)' : 'hsl(220 10% 14%)'}`, borderRadius: '12px', padding: '14px', marginBottom: '18px', cursor: 'pointer' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${keySaved ? 'hsl(142 76% 36%)' : 'hsl(220 10% 28%)'}`, background: keySaved ? 'hsl(142 76% 36%)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{keySaved && Icons.check(13, 'white')}</div>
                  <p style={{ color: 'hsl(0 0% 48%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.6' }}>I have saved my QSK. I understand it cannot be recovered.</p>
                </div>
                <button onClick={() => { if (keySaved) { resetModal(); setCurrencyTab(scUToken === 'UUSDT' ? 'uusdt' : 'uusdc') } }} disabled={!keySaved} style={{ width: '100%', background: keySaved ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : 'hsl(220 10% 14%)', color: keySaved ? 'white' : 'hsl(0 0% 28%)', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: '700', cursor: keySaved ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)' }}>View {scUToken} Account →</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{ background: 'hsl(220 15% 5%)', borderBottom: '1px solid hsl(220 10% 12%)', padding: '18px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'hsl(0 0% 38%)', textDecoration: 'none', fontSize: '13px', ...mono, background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 10% 16%)', borderRadius: '8px', padding: '8px 14px' }}>{Icons.back(14, 'hsl(0 0% 38%)')} Accounts</a>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: meta.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{meta.icon}</div>
              <div>
                <h1 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>{meta.title}</h1>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', ...mono, color: meta.color, border: `1px solid ${meta.color}35`, borderRadius: '20px', padding: '2px 10px', textTransform: 'uppercase' }}>{meta.tag}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{Icons.shield(12, 'hsl(0 0% 28%)')}<span style={{ fontSize: '10px', ...mono, color: 'hsl(0 0% 28%)' }}>{meta.custody}</span></div>
                  <button onClick={loadAll} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {Icons.refresh(13, 'hsl(0 0% 55%)') }
                        <span style={{ fontSize: '10px', color: 'hsl(0 0% 55%)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Scan for recent deposits</span>
                      </span>
                    </button>
                </div>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' as const }}>
            <p style={{ color: 'hsl(0 0% 30%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Collateral Balance · BTC locked in USD</p>
            <p style={{ color: 'hsl(0 0% 92%)', fontSize: '32px', fontWeight: '700', ...mono, margin: '0 0 2px', lineHeight: '1' }}>${btcValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p style={{ color: 'hsl(142 76% 36%)', fontSize: '12px', fontWeight: '600', ...mono, margin: '0 0 2px' }}>${remainingMintable > 0 ? remainingMintable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} available to mint</p>
            <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, margin: 0 }}>{btcLocked.toFixed(6)} BTC locked · updates with live BTC price</p>
          </div>
        </div>

        {vault.status === 'active' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
            {[
             { icon: Icons.bitcoin(14, 'hsl(205 85% 55%)'), label: 'UBTC Debt', value: '$' + ubtcBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), sub: ubtcBalance + ' UBTC minted against BTC', color: 'hsl(205 85% 55%)' },
              { icon: Icons.lock(14, 'hsl(38 92% 50%)'), label: 'BTC Locked', value: btcLocked.toFixed(4), sub: '$' + btcValue.toLocaleString(undefined, { maximumFractionDigits: 0 }), color: 'hsl(38 92% 50%)' },
              { icon: Icons.shield(14, ratioColor), label: 'Collateral', value: ratio > 0 ? ratio.toFixed(0) + '%' : '—', sub: ratio >= 200 ? 'Healthy' : ratio >= 150 ? 'Adequate' : ratio > 0 ? 'Low' : 'No UBTC', color: ratioColor },
              { icon: Icons.lock(14, 'hsl(142 76% 36%)'), label: 'USDT Locked', value: uusdtDep > 0 ? '$' + uusdtDep.toLocaleString() : '—', sub: uusdtBal > 0 ? uusdtBal.toLocaleString() + ' UUSDT' : 'Not added', color: 'hsl(142 76% 36%)' },
              { icon: Icons.lock(14, 'hsl(220 85% 60%)'), label: 'USDC Locked', value: uusdcDep > 0 ? '$' + uusdcDep.toLocaleString() : '—', sub: uusdcBal > 0 ? uusdcBal.toLocaleString() + ' UUSDC' : 'Not added', color: 'hsl(220 85% 60%)' },
              { icon: Icons.chart(14, 'hsl(0 0% 45%)'), label: 'BTC Price', value: '$' + btcPrice.toLocaleString(), sub: 'Live', color: 'hsl(0 0% 45%)' },
            ].map(item => (
              <div key={item.label} style={{ background: 'hsl(220 12% 8%)', borderRadius: '10px', padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>{item.icon}<p style={{ color: 'hsl(0 0% 28%)', fontSize: '9px', ...mono, textTransform: 'uppercase', margin: 0 }}>{item.label}</p></div>
                <p style={{ color: item.color, fontWeight: '700', fontSize: '14px', ...mono, margin: '0 0 2px' }}>{item.value}</p>
                <p style={{ color: 'hsl(0 0% 25%)', fontSize: '9px', ...mono, margin: 0 }}>{item.sub}</p>
              </div>
            ))}
          </div>
        )}
        {vault.status !== 'active' && (
          <div style={{ background: 'hsl(38 92% 50% / 0.06)', border: '1px solid hsl(38 92% 50% / 0.25)', borderRadius: '12px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{Icons.warning(16, 'hsl(38 92% 50%)')}<p style={{ color: 'hsl(38 92% 50%)', fontSize: '13px', ...mono, margin: 0 }}>Account pending — deposit Bitcoin to activate</p></div>
            <a href={`/deposit?vault=${vaultId}&currency=ubtc`} style={{ background: 'hsl(205 85% 55%)', color: 'white', textDecoration: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '6px' }}>{Icons.deposit(14, 'white')} Fund Account</a>
          </div>
        )}
      </div>

      <div style={{ padding: '24px 28px', maxWidth: '1060px', margin: '0 auto' }}>

        {/* Currency tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '22px', background: 'hsl(220 12% 8%)', borderRadius: '14px', padding: '4px', width: 'fit-content' }}>
          {[
            { key: 'ubtc', icon: Icons.bitcoin(16, currencyTab === 'ubtc' ? 'hsl(38 92% 50%)' : 'hsl(0 0% 30%)'), label: 'UBTC', balance: '$' + ubtcBalance.toLocaleString(undefined, { maximumFractionDigits: 0 }), color: 'hsl(38 92% 50%)', hasBalance: true },
            { key: 'uusdt', icon: Icons.lock(16, currencyTab === 'uusdt' ? 'hsl(142 76% 36%)' : 'hsl(0 0% 30%)'), label: 'UUSDT', balance: uusdtBal > 0 ? '$' + uusdtBal.toLocaleString(undefined, { maximumFractionDigits: 0 }) : 'Add', color: 'hsl(142 76% 36%)', hasBalance: uusdtBal > 0 },
            { key: 'uusdc', icon: Icons.lock(16, currencyTab === 'uusdc' ? 'hsl(220 85% 60%)' : 'hsl(0 0% 30%)'), label: 'UUSDC', balance: uusdcBal > 0 ? '$' + uusdcBal.toLocaleString(undefined, { maximumFractionDigits: 0 }) : 'Add', color: 'hsl(220 85% 60%)', hasBalance: uusdcBal > 0 },
          ].map(t => (
            <button key={t.key} onClick={() => setCurrencyTab(t.key as any)} style={{ background: currencyTab === t.key ? 'hsl(220 15% 14%)' : 'transparent', border: currencyTab === t.key ? '1px solid hsl(220 10% 20%)' : '1px solid transparent', color: currencyTab === t.key ? 'hsl(0 0% 92%)' : 'hsl(0 0% 40%)', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s' }}>
              {t.icon}<span>{t.label}</span><span style={{ fontSize: '11px', ...mono, color: t.hasBalance ? t.color : 'hsl(0 0% 28%)' }}>{t.balance}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' }}>
          <div>

            {/* ── UBTC TAB ── */}
            {currencyTab === 'ubtc' && (
              <>
                {vault.status === 'active' ? (
                  <>
                    <ActionButtons currency="ubtc" />

                    {/* 3 Key Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
                      {[
                     { label: 'UBTC Debt (Minted)', value: '$' + ubtcBalance.toLocaleString(undefined, { maximumFractionDigits: 2 }), sub: totalEverMinted > ubtcBalance ? totalEverMinted.toFixed(2) + ' UBTC total issued · ' + ubtcBalance.toFixed(2) + ' outstanding' : ubtcBalance.toFixed(2) + ' UBTC outstanding', color: 'hsl(205 85% 55%)', bg: 'hsl(205 85% 55% / 0.08)', border: 'hsl(205 85% 55% / 0.2)' },
                        { label: 'Available to Move to Wallet', value: Math.max(0, ubtcBalance - ubtcCirculation).toFixed(2) + ' UBTC', sub: ubtcCirculation > 0 ? ubtcCirculation.toFixed(2) + ' UBTC already in circulation' : 'None moved yet', color: 'hsl(38 92% 50%)', bg: 'hsl(38 92% 50% / 0.08)', border: 'hsl(38 92% 50% / 0.2)' },
                       
                        { label: 'Available to Mint', value: remainingMintable > 0 ? '$' + remainingMintable.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '$0', sub: remainingMintable > 0 ? 'of $' + maxMintable.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' max' : 'Fully minted', color: 'hsl(38 92% 50%)', bg: 'hsl(38 92% 50% / 0.08)', border: 'hsl(38 92% 50% / 0.2)' },
                        { label: 'Redeemable', value: '$' + ubtcBalance.toLocaleString(undefined, { maximumFractionDigits: 2 }), sub: ubtcBalance > 0 ? (ubtcBalance / btcPrice * 100_000_000).toFixed(0) + ' sats' : 'No UBTC minted', color: 'hsl(142 76% 36%)', bg: 'hsl(142 76% 36% / 0.08)', border: 'hsl(142 76% 36% / 0.2)' },
                      ].map(item => (
                        <div key={item.label} style={{ background: item.bg, border: `1px solid ${item.border}`, borderRadius: '12px', padding: '14px 16px' }}>
                          <p style={{ color: 'hsl(0 0% 35%)', fontSize: '9px', ...mono, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 6px' }}>{item.label}</p>
                          <p style={{ color: item.color, fontSize: '18px', fontWeight: '700', ...mono, margin: '0 0 4px', lineHeight: 1 }}>{item.value}</p>
                          <p style={{ color: 'hsl(0 0% 30%)', fontSize: '10px', ...mono, margin: 0 }}>{item.sub}</p>
                        </div>
                      ))}
                    </div>

                    {/* Smart banner */}
                 {ubtcBalance > 0 && walletBalance > 0 && walletBalance === ubtcBalance && (
                      <div style={{ background: 'hsl(38 92% 50% / 0.07)', border: '1px solid hsl(38 92% 50% / 0.25)', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {Icons.wallet(18, 'hsl(38 92% 50%)')}
                          <div>
                            <p style={{ color: 'hsl(38 92% 50%)', fontWeight: 700, fontSize: 13, margin: '0 0 2px', ...mono }}>{ubtcBalance} UBTC is sitting in this account</p>
                            <p style={{ color: 'hsl(0 0% 38%)', fontSize: 11, margin: 0, ...mono }}>Use <strong>To Wallet</strong> above to move it to your wallet — then you can send it to others</p>
                          </div>
                        </div>
                      <button onClick={() => setShowMoveModal(true)} style={{ flexShrink: 0, background: 'hsl(38 92% 50%)', color: '#000', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', whiteSpace: 'nowrap' as const, cursor: 'pointer' }}>Move to Wallet →</button>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '14px', padding: '24px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ color: 'hsl(0 0% 42%)', fontSize: '14px', ...mono, margin: 0 }}>Deposit Bitcoin to activate account</p>
                    <a href={`/deposit?vault=${vaultId}&currency=ubtc`} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))', color: 'white', textDecoration: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-display)' }}>{Icons.deposit(14, 'white')} Fund Account</a>
                  </div>
                )}

                {/* Account Activity */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {Icons.deposit(16, 'hsl(0 0% 45%)')}
                    <h3 style={{ color: 'hsl(0 0% 88%)', fontSize: '14px', fontWeight: '600', margin: 0 }}>Account Activity</h3>
                    <button
                      onClick={async () => {
                        const res = await fetch(`${API_URL}/deposit/scan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vault_id: vaultId }) })
                        const data = await res.json()
                        if (data.found) await loadAll()
                      }}
                      title="Scan for new deposits"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px 6px', gap: '5px' }}
                    >
                      {Icons.refresh(13, 'hsl(0 0% 55%)')}
                    </button>
                  </div>
                  <span style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono }}>{transactions.length} records · Mints &amp; Redeems</span>
                </div>
                {transactions.length === 0 ? (
                  <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 12%)', borderRadius: '14px', padding: '32px', textAlign: 'center' as const, marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', opacity: 0.3 }}>{Icons.chart(36, 'hsl(0 0% 50%)')}</div>
                    <p style={{ color: 'hsl(0 0% 28%)', fontSize: '13px', ...mono, margin: 0 }}>No activity yet</p>
                  </div>
                ) : (
                  <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 12%)', borderRadius: '14px', overflow: 'hidden', marginBottom: '24px' }}>
                    {transactions.map((tx, i) => <TxRow key={tx.id} tx={tx} i={i} total={transactions.length} />)}
                  </div>
                )}

            {/* Redemption History */}
                {redemptionHistory.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {Icons.redeem(16, 'hsl(142 76% 36%)')}
                        <h3 style={{ color: 'hsl(0 0% 88%)', fontSize: '14px', fontWeight: '600', margin: 0 }}>Redemption History</h3>
                      </div>
                      <span style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono }}>{redemptionHistory.length} redemptions against your BTC</span>
                    </div>
                    <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 12%)', borderRadius: '14px', overflow: 'hidden' }}>
                      {redemptionHistory.map((r: any, i: number) => (
                        <div key={r.proof_id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < redemptionHistory.length - 1 ? '1px solid hsl(220 10% 10%)' : 'none', gap: '14px' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'hsl(142 76% 36% / 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {Icons.redeem(16, 'hsl(142 76% 36%)')}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ color: 'hsl(0 0% 88%)', fontWeight: '600', fontSize: '13px', margin: '0 0 2px' }}>{r.ubtc_amount} UBTC Redeemed</p>
                            <p style={{ color: 'hsl(0 0% 32%)', fontSize: '11px', ...mono, margin: 0 }}>
                              {new Date(r.redeemed_at).toLocaleString()} · BTC @ ${r.btc_price ? parseFloat(r.btc_price).toLocaleString(undefined, {maximumFractionDigits: 0}) : '—'}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' as const }}>
                            <p style={{ color: 'hsl(142 76% 36%)', fontWeight: '700', fontSize: '14px', ...mono, margin: '0 0 2px' }}>-{r.sats_released ? parseInt(r.sats_released).toLocaleString() : '—'} sats</p>
                            <p style={{ color: 'hsl(0 0% 30%)', fontSize: '10px', ...mono, margin: 0 }}>${r.ubtc_amount} released</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* UBTC Transaction History */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{Icons.transfer(16, 'hsl(38 92% 50%)')}<h3 style={{ color: 'hsl(0 0% 88%)', fontSize: '14px', fontWeight: '600', margin: 0 }}>UBTC Transaction History</h3></div>
                  <span style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono }}>{walletTxs.length} records · Sends &amp; Receives</span>
                </div>
                {walletTxs.length === 0 ? (
                  <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 12%)', borderRadius: '14px', padding: '32px', textAlign: 'center' as const }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', opacity: 0.3 }}>{Icons.transfer(36, 'hsl(0 0% 50%)')}</div>
                    <p style={{ color: 'hsl(0 0% 28%)', fontSize: '13px', ...mono, margin: '0 0 6px' }}>No UBTC transfers yet</p>
                    <p style={{ color: 'hsl(0 0% 22%)', fontSize: '11px', ...mono, margin: 0 }}>Move UBTC to your wallet first, then send from there</p>
                  </div>
                ) : (
                  <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 12%)', borderRadius: '14px', overflow: 'hidden' }}>
                    {walletTxs.map((tx: any, i: number) => (
                      <div key={tx.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < walletTxs.length - 1 ? '1px solid hsl(220 10% 10%)' : 'none', gap: '14px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: tx.is_incoming ? 'hsl(142 76% 36% / 0.12)' : 'hsl(0 84% 60% / 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {tx.is_incoming ? Icons.deposit(16, 'hsl(142 76% 36%)') : Icons.send(16, 'hsl(0 84% 60%)')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ color: 'hsl(0 0% 88%)', fontWeight: '600', fontSize: '13px', margin: '0 0 2px' }}>{tx.description || (tx.is_incoming ? 'UBTC Received' : 'UBTC Sent')}</p>
                          <p style={{ color: 'hsl(0 0% 32%)', fontSize: '11px', ...mono, margin: 0 }}>{new Date(tx.created_at).toLocaleString()}</p>
                        </div>
                        <p style={{ color: tx.is_incoming ? 'hsl(142 76% 36%)' : 'hsl(0 84% 60%)', fontWeight: '700', fontSize: '14px', ...mono, margin: 0 }}>
                          {tx.is_incoming ? '+' : '-'}{tx.amount} UBTC
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── UUSDT TAB ── */}
            {currencyTab === 'uusdt' && (
              <>
                {uusdtBal > 0 ? (
                  <>
                    <ActionButtons currency="uusdt" />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{Icons.chart(16, 'hsl(0 0% 45%)')}<h3 style={{ color: 'hsl(0 0% 88%)', fontSize: '14px', fontWeight: '600', margin: 0 }}>UUSDT Transactions</h3></div>
                      <span style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono }}>{uusdtTxs.length} records</span>
                    </div>
                    <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 12%)', borderRadius: '14px', overflow: 'hidden' }}>
                      {uusdtTxs.map((tx, i) => <TxRow key={tx.id} tx={tx} i={i} total={uusdtTxs.length} />)}
                    </div>
                  </>
                ) : (
                  <div style={{ background: 'hsl(220 12% 8%)', border: '1px dashed hsl(142 76% 36% / 0.3)', borderRadius: '18px', padding: '52px 40px', textAlign: 'center' as const }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px', opacity: 0.6 }}>{Icons.lock(52, 'hsl(142 76% 36%)')}</div>
                    <h3 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: '0 0 10px' }}>Add UUSDT to this Account</h3>
                    <p style={{ color: 'hsl(0 0% 42%)', fontSize: '13px', ...mono, margin: '0 0 28px', lineHeight: '1.8' }}>Deposit USDT and mint UUSDT 1:1. Your USDT is locked in a quantum vault.</p>
                    <button onClick={() => setShowAddModal('UUSDT')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))', color: 'white', border: 'none', borderRadius: '12px', padding: '14px 32px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>{Icons.deposit(16, 'white')} Deposit USDT & Mint UUSDT</button>
                  </div>
                )}
              </>
            )}

            {/* ── UUSDC TAB ── */}
            {currencyTab === 'uusdc' && (
              <>
                {uusdcBal > 0 ? (
                  <>
                    <ActionButtons currency="uusdc" />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{Icons.chart(16, 'hsl(0 0% 45%)')}<h3 style={{ color: 'hsl(0 0% 88%)', fontSize: '14px', fontWeight: '600', margin: 0 }}>UUSDC Transactions</h3></div>
                      <span style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono }}>{uusdcTxs.length} records</span>
                    </div>
                    <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 12%)', borderRadius: '14px', overflow: 'hidden' }}>
                      {uusdcTxs.map((tx, i) => <TxRow key={tx.id} tx={tx} i={i} total={uusdcTxs.length} />)}
                    </div>
                  </>
                ) : (
                  <div style={{ background: 'hsl(220 12% 8%)', border: '1px dashed hsl(220 85% 60% / 0.3)', borderRadius: '18px', padding: '52px 40px', textAlign: 'center' as const }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px', opacity: 0.6 }}>{Icons.lock(52, 'hsl(220 85% 60%)')}</div>
                    <h3 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: '0 0 10px' }}>Add UUSDC to this Account</h3>
                    <p style={{ color: 'hsl(0 0% 42%)', fontSize: '13px', ...mono, margin: '0 0 28px', lineHeight: '1.8' }}>Deposit USDC and mint UUSDC 1:1. Your USDC is locked in a quantum vault.</p>
                    <button onClick={() => setShowAddModal('UUSDC')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))', color: 'white', border: 'none', borderRadius: '12px', padding: '14px 32px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>{Icons.deposit(16, 'white')} Deposit USDC & Mint UUSDC</button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── SIDEBAR ── */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>

            {/* MY WALLET */}
            <div style={{ background: 'hsl(220 12% 8%)', border: '2px solid hsl(38 92% 50% / 0.5)', borderRadius: '16px', padding: '18px', boxShadow: '0 0 28px hsl(38 92% 50% / 0.12)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                {Icons.wallet(15, 'hsl(38 92% 50%)')}
                <p style={{ color: 'hsl(38 92% 50%)', fontSize: '10px', fontWeight: '700', ...mono, margin: 0, textTransform: 'uppercase' as const, letterSpacing: '0.12em' }}>Your UBTC Wallet</p>
              </div>
              <p style={{ color: 'hsl(0 0% 38%)', fontSize: '11px', ...mono, margin: '0 0 14px', lineHeight: '1.7' }}>
                This <strong style={{ color: 'hsl(205 85% 55%)' }}>Account</strong> locks BTC and mints UBTC. Your <strong style={{ color: 'hsl(38 92% 50%)' }}>Wallet </strong> is your address to send &amp; receive UBTC with others.
              </p>
              <a href={vault.linked_wallet ? `/wallet?address=${vault.linked_wallet}` : `/wallet`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'hsl(38 92% 50%)', color: '#000', textDecoration: 'none', borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: '700', fontFamily: 'var(--font-display)', boxShadow: '0 0 24px hsl(38 92% 50% / 0.5)', marginBottom: '10px' }}>
                {Icons.wallet(17, '#000')} Open My Wallet
              </a>
              {vault.linked_wallet && (
                <div style={{ background: 'hsl(220 15% 5%)', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div>
                    <p style={{ color: 'hsl(0 0% 28%)', fontSize: '9px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 2px' }}>Wallet Balance</p>
                    <p style={{ color: 'hsl(38 92% 50%)', fontSize: '16px', fontWeight: 700, ...mono, margin: 0 }}>{walletBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} UBTC</p>
                  </div>
                  <div style={{ textAlign: 'right' as const }}>
                    <p style={{ color: 'hsl(0 0% 28%)', fontSize: '9px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 2px' }}>≈ USD</p>
                    <p style={{ color: 'hsl(0 0% 55%)', fontSize: '13px', fontWeight: 600, ...mono, margin: 0 }}>${walletBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              )}
              {vault.linked_wallet && <p style={{ color: 'hsl(0 0% 20%)', fontSize: '9px', ...mono, margin: 0, textAlign: 'center' as const, wordBreak: 'break-all' as const }}>{vault.linked_wallet}</p>}
            </div>

            {/* ACCOUNT DETAILS */}
            <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(220 10% 12%)', borderRadius: '14px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
                {Icons.shield(13, 'hsl(0 0% 35%)')}
                <h3 style={{ color: 'hsl(0 0% 55%)', fontSize: '11px', fontWeight: '600', margin: 0, textTransform: 'uppercase' as const, letterSpacing: '0.1em', ...mono }}>Account Details</h3>
              </div>
              {[
                { label: 'Account ID', value: vaultId },
                { label: 'Type', value: meta.title },
                { label: 'Custody', value: meta.custody },
                { label: 'Status', value: vault.status === 'active' ? 'Active' : 'Pending' },
                { label: 'Network', value: vault.network === 'testnet4' ? 'Bitcoin Testnet4' : vault.network === 'mainnet' ? 'Bitcoin Mainnet' : vault.network || 'Bitcoin Testnet4' },
                { label: 'BTC Address', value: vault.deposit_address },
                ...(vault.mast_address ? [{ label: 'MAST Vault Address (P2TR)', value: vault.mast_address }] : []),
              ].map(item => (
                <div key={item.label} style={{ padding: '7px 0', borderBottom: '1px solid hsl(220 10% 10%)' }}>
                  <p style={{ color: 'hsl(0 0% 28%)', fontSize: '9px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 2px' }}>{item.label}</p>
                  <p style={{ color: 'hsl(0 0% 65%)', fontSize: '11px', ...mono, margin: 0, wordBreak: 'break-all' as const }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(0 0% 28%)', fontFamily: 'var(--font-mono)' }}>Loading...</div>}>
      <AccountContent />
    </Suspense>
  )
}
'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { API_URL } from '../lib/supabase'
import { Icons } from '../components/Icons'

function TransferContent() {
  const searchParams = useSearchParams()
  const vaultId = searchParams.get('vault') || ''
  const currencyParam = (searchParams.get('currency') || 'ubtc').toLowerCase()

  // Wallet-mode params
  const fromWallet = searchParams.get('from_wallet') || ''
  const walletUbtc = parseFloat(searchParams.get('ubtc') || '0')
  const walletUusdt = parseFloat(searchParams.get('uusdt') || '0')
  const walletUusdc = parseFloat(searchParams.get('uusdc') || '0')
  const isWalletSend = !!fromWallet

  const [vaults, setVaults] = useState<any[]>([])
  const [wallets, setWallets] = useState<any[]>([])
  const [stablecoins, setStablecoins] = useState<any[]>([])
  const [activeCurrency, setActiveCurrency] = useState(currencyParam)
  const [activeVaultId, setActiveVaultId] = useState(vaultId)
  const [amount, setAmount] = useState('')
  const [selectedWallet, setSelectedWallet] = useState<any>(null)
  const [externalAddr, setExternalAddr] = useState('')
  const [sendMode, setSendMode] = useState<'wallet' | 'address'>('wallet')
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  // Own wallet flow states
  const [showOwnWalletQuestion, setShowOwnWalletQuestion] = useState(false)
  const [isOwnWallet, setIsOwnWallet] = useState<boolean | null>(null)
  const [showWarning, setShowWarning] = useState(false)
const [collateralAcknowledged, setCollateralAcknowledged] = useState(false)
  const [qsk, setQsk] = useState('')
  const [qskError, setQskError] = useState('')

  const mono: any = { fontFamily: 'var(--font-mono)' }

  const isUusdt = activeCurrency === 'uusdt'
  const isUusdc = activeCurrency === 'uusdc'
  const isStable = isUusdt || isUusdc
  const utokenName = isUusdt ? 'UUSDT' : isUusdc ? 'UUSDC' : 'UBTC'
  const tokenName = isUusdt ? 'USDT' : isUusdc ? 'USDC' : 'BTC'
  const tokenColor = isUusdt ? 'hsl(142 76% 36%)' : isUusdc ? 'hsl(220 85% 60%)' : 'hsl(205 85% 55%)'
  const tokenIcon = isUusdt ? Icons.lock : isUusdc ? Icons.lock : Icons.bitcoin

  const accountMeta: Record<string, { title: string }> = {
    current: { title: 'Current' }, savings: { title: 'Savings' }, yield: { title: 'Yield' },
    custody_yield: { title: 'Custody Yield' }, prime: { title: 'Prime' }, managed_yield: { title: 'Managed Yield' },
  }

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setDataLoading(true)
    try {
      const [dashRes, scRes, priceRes, walletsRes] = await Promise.all([
        fetch(`${API_URL}/dashboard`), fetch(`${API_URL}/stablecoins`),
        fetch(`${API_URL}/price`), fetch(`${API_URL}/wallets/all`),
      ])
      const dash = await dashRes.json()
      const sc = await scRes.json()
      const walletsData = await walletsRes.json()
      setVaults(dash.vaults || [])
      setStablecoins(sc.stablecoins || [])
      setWallets(walletsData.wallets || [])
    } catch (e) { console.error(e) }
    setDataLoading(false)
  }

  const scForVault = (acType: string) => stablecoins.filter(s => s.account_type === acType)

  const getVaultBalance = (vid: string): number => {
    const v = vaults.find(x => x.vault_id === vid)
    if (!v) return 0
    if (activeCurrency === 'ubtc') return parseFloat(v.ubtc_minted || '0')
    const sc = scForVault(v.account_type)
    const cur = isUusdt ? 'UUSDT' : 'UUSDC'
    return sc.filter(s => s.currency === cur).reduce((s, x) => s + parseFloat(x.balance || '0'), 0)
  }

  // Active balance — wallet or vault depending on mode
  const walletBalance = activeCurrency === 'ubtc' ? walletUbtc : activeCurrency === 'uusdt' ? walletUusdt : walletUusdc
  const activeBalance = isWalletSend ? walletBalance : getVaultBalance(activeVaultId || vaultId)

  const activeVault = vaults.find(v => v.vault_id === (activeVaultId || vaultId))
  const btcLocked = (activeVault?.btc_amount_sats || 0) / 100_000_000
  const ubtcTotal = parseFloat(activeVault?.ubtc_minted || '0')

  // Vault from-options (only used in vault mode)
  const fromOptions: any[] = []
  if (!isWalletSend) {
    vaults.forEach(v => {
      const meta = accountMeta[v.account_type] || { title: v.account_type }
      const sc = scForVault(v.account_type)
      const btcL = (v.btc_amount_sats || 0) / 100_000_000
      const scDep = (cur: string) => sc.filter(s => s.currency === cur).reduce((s, x) => s + parseFloat(x.deposited_amount || '0'), 0)
      if (activeCurrency === 'ubtc') {
        const bal = parseFloat(v.ubtc_minted || '0')
        if (bal > 0) fromOptions.push({ vaultId: v.vault_id, balance: bal, meta, note: `${btcL.toFixed(4)} BTC locked` })
      } else if (activeCurrency === 'uusdt') {
        const bal = sc.filter(s => s.currency === 'UUSDT').reduce((s, x) => s + parseFloat(x.balance || '0'), 0)
        if (bal > 0) fromOptions.push({ vaultId: v.vault_id, balance: bal, meta, note: `$${scDep('UUSDT').toLocaleString()} USDT locked` })
      } else if (activeCurrency === 'uusdc') {
        const bal = sc.filter(s => s.currency === 'UUSDC').reduce((s, x) => s + parseFloat(x.balance || '0'), 0)
        if (bal > 0) fromOptions.push({ vaultId: v.vault_id, balance: bal, meta, note: `$${scDep('UUSDC').toLocaleString()} USDC locked` })
      }
    })
  }

  const getScVaultForActive = () => {
    const v = vaults.find(x => x.vault_id === (activeVaultId || vaultId))
    if (!v) return null
    const cur = isUusdt ? 'UUSDT' : 'UUSDC'
    return scForVault(v.account_type).filter(s => s.currency === cur && s.status !== 'archived').sort((a: any, b: any) => parseFloat(b.balance) - parseFloat(a.balance))[0] || null
  }

  const doSend = async () => {
    const to = sendMode === 'wallet' ? selectedWallet?.wallet_address : externalAddr
    if (!amount || !to) return
   setLoading(true); setError(''); setQskError('')
    try {
      // For UBTC vault transfers, sign the payload with QSK first
      let pqSignature = ''
      if (!isWalletSend && !isStable) {
        const to = sendMode === 'wallet' ? selectedWallet?.wallet_address : externalAddr
        const payload = `${activeVaultId || vaultId}:${to}:${amount}`
        if (!qsk) { setQskError('Your Quantum Signing Key is required to send UBTC'); setLoading(false); return }
        const signRes = await fetch(`${API_URL}/wallet/sign-payload`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ private_key: qsk, payload })
        })
        const signData = await signRes.json()
        if (!signRes.ok) { setQskError('Invalid Quantum Signing Key — check your key and try again'); setLoading(false); return }
        pqSignature = signData.signature
        setQsk('')
      }
      if (isWalletSend) {
        // Send from UBTC wallet using send_from_wallet endpoint
        const res = await fetch(`${API_URL}/wallet/${fromWallet}/send`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from_address: fromWallet,
            to_username_or_address: to,
            amount,
            send_type: sendMode === 'wallet' ? 'internal' : 'external'
          })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setResult({ transfer_id: data.transaction_id, to, amount, currency: utokenName })
      } else if (isStable) {
        const scVault = getScVaultForActive()
        if (!scVault) throw new Error(`No ${utokenName} found. Deposit ${tokenName} and mint ${utokenName} first.`)
        const res = await fetch(`${API_URL}/stablecoin/transfer`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from_vault_id: scVault.vault_id, to_address: to, amount })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setResult({ transfer_id: data.transfer_id, to, amount, currency: utokenName })
      } else {
       const res = await fetch(`${API_URL}/transfer`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from_vault_id: activeVaultId || vaultId, to_address: to, ubtc_amount: amount, pq_signature: pqSignature })
        })
        
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setResult({ transfer_id: data.transfer_id, to, amount, currency: 'UBTC' })
      }
    } catch (e: any) { setError(e.message) }
    setLoading(false)
    setShowWarning(false)
    setShowOwnWalletQuestion(false)
  }

  const handleSendClick = () => {
    if (!canSend) return
    if (sendMode === 'wallet') {
      doSend()
    } else {
      setIsOwnWallet(null)
      setCollateralAcknowledged(false)
      setShowOwnWalletQuestion(true)
    }
  }

  const handleOwnWalletAnswer = (answer: boolean) => {
    setIsOwnWallet(answer)
    setCollateralAcknowledged(false)
    setShowOwnWalletQuestion(false)
    setShowWarning(true)
  }

  const recipient = sendMode === 'wallet' ? selectedWallet?.wallet_address : externalAddr
  const canSend = !!amount && parseFloat(amount) > 0 && parseFloat(amount) <= activeBalance && !!recipient && !loading
  const btcRelease = activeCurrency === 'ubtc'
    ? ((parseFloat(amount || '0') / (ubtcTotal || 1)) * btcLocked).toFixed(6)
    : parseFloat(amount || '0').toLocaleString()

  const fieldStyle: any = { width: '100%', padding: '14px 16px', background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 14%)', borderRadius: '12px', color: 'hsl(0 0% 88%)', fontSize: '14px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const }

  const backHref = isWalletSend ? '/wallet' : `/account/${vaultId}?currency=${activeCurrency}`

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', fontFamily: 'var(--font-display)' }}>

      {/* Is this your own wallet? */}
      {showOwnWalletQuestion && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'hsl(220 12% 9%)', border: '1px solid hsl(220 10% 18%)', borderRadius: '24px', padding: '36px', maxWidth: '400px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'hsl(205 85% 55% / 0.1)', border: '2px solid hsl(205 85% 55% / 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {Icons.wallet(28, 'hsl(205 85% 55%)')}
              </div>
            </div>
            <h3 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: '0 0 10px', textAlign: 'center' as const }}>Is this your own wallet?</h3>
            <p style={{ color: 'hsl(0 0% 42%)', fontSize: '13px', ...mono, textAlign: 'center' as const, margin: '0 0 10px', lineHeight: '1.7' }}>
              You are sending <strong style={{ color: tokenColor }}>{parseFloat(amount).toLocaleString()} {utokenName}</strong> to an external address.
            </p>
            <p style={{ color: 'hsl(0 0% 30%)', fontSize: '12px', ...mono, textAlign: 'center' as const, margin: '0 0 28px', lineHeight: '1.6' }}>
              {externalAddr.slice(0, 18)}...
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handleOwnWalletAnswer(true)} style={{ flex: 1, background: 'hsl(205 85% 55% / 0.1)', border: '2px solid hsl(205 85% 55% / 0.4)', color: 'hsl(205 85% 65%)', borderRadius: '14px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
                Yes, it is
              </button>
              <button onClick={() => handleOwnWalletAnswer(false)} style={{ flex: 1, background: 'hsl(0 84% 60% / 0.1)', border: '2px solid hsl(0 84% 60% / 0.4)', color: 'hsl(0 84% 65%)', borderRadius: '14px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
                No it is not
              </button>
            </div>
            <button onClick={() => setShowOwnWalletQuestion(false)} style={{ width: '100%', background: 'none', border: 'none', color: 'hsl(0 0% 28%)', fontSize: '13px', ...mono, cursor: 'pointer', marginTop: '16px', padding: '8px' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Warning modal */}
      {showWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'hsl(220 12% 9%)', border: `1px solid ${isOwnWallet ? 'hsl(205 85% 55% / 0.3)' : 'hsl(0 84% 60% / 0.4)'}`, borderRadius: '24px', padding: '32px', maxWidth: '420px', width: '100%', maxHeight: '90vh', overflowY: 'auto' as const }}>
            {isOwnWallet ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'hsl(205 85% 55% / 0.1)', border: '2px solid hsl(205 85% 55% / 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {Icons.shield(28, 'hsl(205 85% 55%)')}
                  </div>
                </div>
                <h3 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: '0 0 12px', textAlign: 'center' as const }}>Your Collateral Stays With You</h3>
                <p style={{ color: 'hsl(0 0% 55%)', fontSize: '13px', ...mono, margin: '0 0 18px', lineHeight: '1.8', textAlign: 'center' as const }}>
                  Since this is your own wallet, the {utokenName} you hold represents your right to claim the BTC locked in the vault. Your collateral is safe.
                </p>
                <div style={{ background: 'hsl(205 85% 55% / 0.06)', border: '1px solid hsl(205 85% 55% / 0.2)', borderRadius: '14px', padding: '16px', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                    {Icons.check(14, 'hsl(142 76% 36%)')}
                    <p style={{ color: 'hsl(0 0% 65%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.6' }}>Your BTC collateral remains locked in the vault — only the {utokenName} token moves.</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                    {Icons.check(14, 'hsl(142 76% 36%)')}
                    <p style={{ color: 'hsl(0 0% 65%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.6' }}>As long as you hold the {utokenName}, you can redeem it for BTC at any time.</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    {Icons.warning(14, 'hsl(38 92% 50%)')}
                    <p style={{ color: 'hsl(38 92% 60%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.6' }}>
                      <strong>Important:</strong> If you later send this {utokenName} to someone else, the right to claim the collateral goes with it.
                    </p>
                  </div>
                </div>
                <div onClick={() => setCollateralAcknowledged(!collateralAcknowledged)} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer', padding: '12px', background: collateralAcknowledged ? 'hsl(142 76% 36% / 0.08)' : 'hsl(220 15% 5%)', border: collateralAcknowledged ? '1px solid hsl(142 76% 36% / 0.4)' : '1px solid hsl(220 10% 16%)', borderRadius: '10px', marginBottom: '18px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '5px', border: collateralAcknowledged ? '2px solid hsl(142 76% 36%)' : '2px solid hsl(220 10% 30%)', background: collateralAcknowledged ? 'hsl(142 76% 36%)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {collateralAcknowledged && Icons.check(12, 'white')}
                  </div>
                  <p style={{ color: 'hsl(0 0% 55%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>I understand that if I send this {utokenName} on to another person, they gain the right to claim the BTC collateral.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowWarning(false)} style={{ flex: 1, background: 'none', border: '1px solid hsl(220 10% 18%)', color: 'hsl(0 0% 50%)', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>Cancel</button>
                  <button onClick={doSend} disabled={!collateralAcknowledged || loading} style={{ flex: 2, background: collateralAcknowledged ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : 'hsl(220 10% 14%)', color: collateralAcknowledged ? 'white' : 'hsl(0 0% 30%)', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: collateralAcknowledged ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {Icons.send(16, collateralAcknowledged ? 'white' : 'hsl(0 0% 30%)')} {loading ? 'Sending...' : 'Confirm Send'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'hsl(0 84% 60% / 0.1)', border: '2px solid hsl(0 84% 60% / 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {Icons.warning(28, 'hsl(0 84% 60%)')}
                  </div>
                </div>
                <h3 style={{ color: 'hsl(0 84% 65%)', fontSize: '20px', fontWeight: '700', margin: '0 0 12px', textAlign: 'center' as const }}>Collateral Rights Transfer Warning</h3>
                <p style={{ color: 'hsl(0 0% 55%)', fontSize: '13px', ...mono, margin: '0 0 18px', lineHeight: '1.8', textAlign: 'center' as const }}>
                  You are sending <strong style={{ color: tokenColor }}>{parseFloat(amount).toLocaleString()} {utokenName}</strong> to an address that is not yours.
                </p>
                <div style={{ background: 'hsl(0 84% 60% / 0.06)', border: '1px solid hsl(0 84% 60% / 0.25)', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                    {Icons.warning(14, 'hsl(0 84% 60%)')}
                    <p style={{ color: 'hsl(0 0% 65%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.6' }}>
                      <strong style={{ color: 'hsl(0 0% 85%)' }}>{utokenName} is a claim on real collateral.</strong> Whoever holds this token can redeem the BTC locked in the vault.
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                    {Icons.warning(14, 'hsl(0 84% 60%)')}
                    <p style={{ color: 'hsl(0 0% 65%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.6' }}>
                      <strong style={{ color: 'hsl(0 84% 70%)' }}>The recipient will be able to redeem your BTC.</strong> You cannot reverse this.
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    {Icons.warning(14, 'hsl(0 84% 60%)')}
                    <p style={{ color: 'hsl(0 0% 65%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.6' }}>
                      <strong style={{ color: 'hsl(0 84% 70%)' }}>This is irreversible.</strong> Only proceed if you intend to permanently transfer ownership.
                    </p>
                  </div>
                </div>
                <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '12px', padding: '14px', marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ textAlign: 'center' as const }}>
                    <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', margin: '0 0 5px' }}>Sending</p>
                    <p style={{ color: tokenColor, fontWeight: '700', fontSize: '15px', ...mono, margin: 0 }}>{parseFloat(amount).toLocaleString()} {utokenName}</p>
                  </div>
                  <div style={{ textAlign: 'center' as const }}>
                    <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', margin: '0 0 5px' }}>Collateral at Risk</p>
                    <p style={{ color: 'hsl(0 84% 60%)', fontWeight: '700', fontSize: '15px', ...mono, margin: 0 }}>
                      {activeCurrency === 'ubtc' ? btcRelease + ' BTC' : '$' + parseFloat(amount).toLocaleString() + ' ' + tokenName}
                    </p>
                  </div>
                </div>
                <div onClick={() => setCollateralAcknowledged(!collateralAcknowledged)} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer', padding: '12px', background: collateralAcknowledged ? 'hsl(0 84% 60% / 0.08)' : 'hsl(220 15% 5%)', border: collateralAcknowledged ? '1px solid hsl(0 84% 60% / 0.4)' : '1px solid hsl(220 10% 16%)', borderRadius: '10px', marginBottom: '18px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '5px', border: collateralAcknowledged ? '2px solid hsl(0 84% 60%)' : '2px solid hsl(220 10% 30%)', background: collateralAcknowledged ? 'hsl(0 84% 60%)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {collateralAcknowledged && Icons.check(12, 'white')}
                  </div>
                  <p style={{ color: 'hsl(0 0% 55%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>I understand the recipient gains the right to redeem the BTC backing this {utokenName}. This is irreversible.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowWarning(false)} style={{ flex: 1, background: 'none', border: '1px solid hsl(220 10% 18%)', color: 'hsl(0 0% 50%)', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>Cancel</button>
                  <button onClick={doSend} disabled={!collateralAcknowledged || loading} style={{ flex: 2, background: collateralAcknowledged ? 'hsl(0 84% 55%)' : 'hsl(220 10% 14%)', color: collateralAcknowledged ? 'white' : 'hsl(0 0% 30%)', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: collateralAcknowledged ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {Icons.warning(16, collateralAcknowledged ? 'white' : 'hsl(0 0% 30%)')} {loading ? 'Sending...' : 'I Accept — Send Anyway'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: 'hsl(220 15% 5%)', borderBottom: '1px solid hsl(220 10% 10%)', height: '60px', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '16px' }}>
        <a href={backHref} style={{ color: 'hsl(0 0% 40%)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          {Icons.back(20, 'hsl(0 0% 40%)')}
        </a>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: tokenColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {activeCurrency === 'ubtc' ? <img src="/ubtc-icon.png" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /> : tokenIcon(16, tokenColor)}
          </div>
          <span style={{ color: 'hsl(0 0% 80%)', fontWeight: '700', fontSize: '17px' }}>
            {isWalletSend ? 'Send from Wallet' : `Transfer ${utokenName}`}
          </span>
        </div>
        <button onClick={loadAll} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'hsl(0 0% 30%)' }}>
          {Icons.refresh(18, 'hsl(0 0% 30%)')}
        </button>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '28px 16px' }}>

        {result ? (
          <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '24px' }}>
            <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: 'hsl(142 76% 36% / 0.1)', border: '2px solid hsl(142 76% 36% / 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {Icons.check(40, 'hsl(142 76% 36%)')}
            </div>
            <div style={{ textAlign: 'center' as const }}>
              <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '28px', fontWeight: '700', margin: '0 0 6px' }}>Sent</h2>
              <p style={{ color: 'hsl(0 0% 38%)', fontSize: '15px', ...mono, margin: 0 }}>{parseFloat(result.amount).toLocaleString()} {result.currency} transferred</p>
            </div>
            <div style={{ width: '100%', background: 'hsl(220 12% 8%)', borderRadius: '20px', padding: '22px' }}>
              {[
                { label: 'Amount', value: parseFloat(result.amount).toLocaleString() + ' ' + result.currency },
                { label: 'To', value: result.to },
                { label: 'Transfer ID', value: result.transfer_id },
                { label: 'Status', value: 'Complete' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid hsl(220 10% 11%)', gap: '12px', alignItems: 'center' }}>
                  <p style={{ color: 'hsl(0 0% 32%)', fontSize: '12px', ...mono, margin: 0, flexShrink: 0 }}>{item.label}</p>
                  <p style={{ color: 'hsl(0 0% 80%)', fontSize: '12px', fontWeight: '600', ...mono, margin: 0, textAlign: 'right' as const, wordBreak: 'break-all' as const }}>{item.value}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button onClick={() => { setResult(null); setAmount(''); setSelectedWallet(null); setExternalAddr('') }} style={{ flex: 1, background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 55%)', borderRadius: '14px', padding: '16px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
                Send More
              </button>
              <a href={backHref} style={{ flex: 1, background: 'linear-gradient(135deg, hsl(205,85%,55%),hsl(190,80%,50%))', color: 'white', textDecoration: 'none', borderRadius: '14px', padding: '16px', fontSize: '15px', fontWeight: '600', fontFamily: 'var(--font-display)', textAlign: 'center' as const, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                Done {Icons.chevronRight(16, 'white')}
              </a>
            </div>
          </div>
        ) : dataLoading ? (
          <div style={{ textAlign: 'center' as const, padding: '80px' }}>
            <p style={{ color: 'hsl(0 0% 28%)', fontSize: '14px', ...mono }}>Loading...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>

            {/* WALLET MODE: Token selector + balance */}
            {isWalletSend ? (
              <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '20px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px 10px' }}>
                  <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0 0 12px' }}>From Wallet — Select Token</p>
                </div>
                <div style={{ padding: '4px 10px 10px' }}>
                  {[
                    { cur: 'ubtc', icon: Icons.bitcoin, color: 'hsl(205 85% 55%)', name: 'UBTC', bal: walletUbtc },
                    { cur: 'uusdt', icon: Icons.lock, color: 'hsl(142 76% 36%)', name: 'UUSDT', bal: walletUusdt },
                    { cur: 'uusdc', icon: Icons.lock, color: 'hsl(220 85% 60%)', name: 'UUSDC', bal: walletUusdc },
                  ].filter(t => t.bal > 0).map(t => {
                    const isSel = activeCurrency === t.cur
                    return (
                      <div key={t.cur} onClick={() => { setActiveCurrency(t.cur); setAmount('') }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: isSel ? t.color + '0e' : 'transparent', border: `1px solid ${isSel ? t.color + '40' : 'transparent'}`, borderRadius: '14px', cursor: 'pointer', marginBottom: '4px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: t.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {t.icon(18, t.color)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ color: 'hsl(0 0% 88%)', fontWeight: '600', fontSize: '14px', margin: '0 0 2px' }}>{t.name}</p>
                          <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, margin: 0 }}>Wallet balance</p>
                        </div>
                        <div style={{ textAlign: 'right' as const }}>
                          <p style={{ color: t.color, fontWeight: '700', fontSize: '15px', ...mono, margin: '0 0 1px' }}>${t.bal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                          <p style={{ color: 'hsl(0 0% 25%)', fontSize: '10px', ...mono, margin: 0 }}>available</p>
                        </div>
                        {isSel && <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{Icons.check(10, 'white')}</div>}
                      </div>
                    )
                  })}
                  {walletUbtc === 0 && walletUusdt === 0 && walletUusdc === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center' as const }}>
                      <p style={{ color: 'hsl(0 0% 32%)', fontSize: '14px', ...mono, margin: 0 }}>No tokens in wallet</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* VAULT MODE: From vault selector */
              fromOptions.length > 0 ? (
                <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '20px', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px 10px' }}>
                    <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>From</p>
                  </div>
                  <div style={{ padding: '4px 10px 10px' }}>
                    {fromOptions.map((opt, i) => {
                      const isSelected = opt.vaultId === (activeVaultId || vaultId)
                      return (
                        <div key={i} onClick={() => setActiveVaultId(opt.vaultId)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: isSelected ? tokenColor + '0e' : 'transparent', border: `1px solid ${isSelected ? tokenColor + '40' : 'transparent'}`, borderRadius: '14px', cursor: 'pointer', marginBottom: '4px' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: tokenColor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {tokenIcon(18, tokenColor)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ color: 'hsl(0 0% 88%)', fontWeight: '600', fontSize: '14px', margin: '0 0 2px' }}>{utokenName}</p>
                            <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, margin: 0 }}>{opt.meta.title} · {opt.note}</p>
                          </div>
                          <div style={{ textAlign: 'right' as const }}>
                            <p style={{ color: tokenColor, fontWeight: '700', fontSize: '15px', ...mono, margin: '0 0 1px' }}>${opt.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            <p style={{ color: 'hsl(0 0% 25%)', fontSize: '10px', ...mono, margin: 0 }}>available</p>
                          </div>
                          {isSelected && <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: tokenColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{Icons.check(10, 'white')}</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '20px', padding: '28px', textAlign: 'center' as const }}>
                 <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', opacity: 0.5 }}>
                      {activeCurrency === 'ubtc' ? <img src="/ubtc-icon.png" style={{ width: '36px', height: '36px', objectFit: 'contain' }} /> : tokenIcon(36, tokenColor)}
                </div>
                  <p style={{ color: 'hsl(0 0% 32%)', fontSize: '14px', ...mono, margin: '0 0 12px' }}>No {utokenName} balance to send</p>
                  <a href={`/deposit?vault=${vaultId}&currency=${activeCurrency}`} style={{ color: tokenColor, fontSize: '13px', ...mono }}>Deposit {tokenName} first</a>
                </div>
              )
            )}

            {/* AMOUNT */}
            <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '20px', padding: '22px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>Amount</p>
                <button onClick={() => setAmount(activeBalance.toFixed(2))} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: tokenColor + '12', border: `1px solid ${tokenColor}28`, color: tokenColor, borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', ...mono }}>
                  {Icons.plus(12, tokenColor)} Max ${activeBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
                <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" type="number" autoFocus style={{ flex: 1, background: 'transparent', border: 'none', color: tokenColor, fontSize: '48px', fontWeight: '700', fontFamily: 'var(--font-mono)', outline: 'none', padding: '0', width: '100%' }} />
                <span style={{ color: tokenColor, fontSize: '18px', fontWeight: '700', ...mono, flexShrink: 0 }}>{utokenName}</span>
              </div>
              <div style={{ height: '1px', background: 'hsl(220 10% 12%)', marginBottom: '14px' }} />
              <div style={{ display: 'flex', gap: '6px' }}>
                {[25, 50, 75, 100].map(pct => (
                  <button key={pct} onClick={() => setAmount((activeBalance * pct / 100).toFixed(2))} style={{ flex: 1, background: 'hsl(220 15% 5%)', border: '1px solid hsl(220 10% 12%)', color: 'hsl(0 0% 38%)', borderRadius: '9px', padding: '9px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', ...mono }}>{pct}%</button>
                ))}
              </div>
              {amount && parseFloat(amount) > activeBalance && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
                  {Icons.warning(13, 'hsl(0 84% 60%)')}
                  <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, margin: 0 }}>Exceeds balance of ${activeBalance.toLocaleString()}</p>
                </div>
              )}
            </div>

            {/* TO */}
            <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '20px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px 0' }}>
                <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0 0 14px' }}>To</p>
                <div style={{ display: 'flex', background: 'hsl(220 15% 5%)', borderRadius: '12px', padding: '3px', gap: '3px', marginBottom: '16px' }}>
                  {[
                    { key: 'wallet', label: 'UBTC Wallet', sub: 'Instant · Collateral stays locked' },
                    { key: 'address', label: 'External Address', sub: 'On-chain · Collateral claim transfers' },
                  ].map(opt => (
                    <button key={opt.key} onClick={() => { setSendMode(opt.key as any); setSelectedWallet(null); setExternalAddr('') }} style={{ flex: 1, background: sendMode === opt.key ? 'hsl(220 15% 13%)' : 'transparent', border: sendMode === opt.key ? '1px solid hsl(220 10% 19%)' : '1px solid transparent', borderRadius: '10px', padding: '10px 8px', cursor: 'pointer', fontFamily: 'var(--font-display)', textAlign: 'left' as const }}>
                      <p style={{ color: sendMode === opt.key ? 'hsl(0 0% 85%)' : 'hsl(0 0% 35%)', fontWeight: '600', fontSize: '12px', margin: '0 0 1px' }}>{opt.label}</p>
                      <p style={{ color: 'hsl(0 0% 25%)', fontSize: '10px', ...mono, margin: 0 }}>{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {sendMode === 'wallet' && (
                <div style={{ padding: '0 10px 12px' }}>
                  {wallets.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center' as const }}>
                      <p style={{ color: 'hsl(0 0% 28%)', fontSize: '13px', ...mono, margin: '0 0 10px' }}>No wallets found</p>
                      <a href="/wallet" style={{ color: 'hsl(205 85% 55%)', fontSize: '13px', ...mono }}>Create a wallet</a>
                    </div>
                  ) : wallets.map((w: any, i: number) => {
                    const isSel = selectedWallet?.wallet_id === w.wallet_id
                    return (
                      <div key={i} onClick={() => setSelectedWallet(isSel ? null : w)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 14px', background: isSel ? 'hsl(205 85% 55% / 0.07)' : 'hsl(220 15% 5%)', border: `1px solid ${isSel ? 'hsl(205 85% 55% / 0.35)' : 'hsl(220 10% 11%)'}`, borderRadius: '14px', cursor: 'pointer', marginBottom: '6px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'hsl(205 85% 55% / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {Icons.wallet(20, 'hsl(205 85% 55%)')}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: 'hsl(0 0% 88%)', fontWeight: '600', fontSize: '14px', margin: '0 0 2px' }}>{w.wallet_name || 'My Wallet'}</p>
                          <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, margin: 0 }}>@{w.username} · {w.wallet_address?.slice(0, 20)}...</p>
                        </div>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${isSel ? 'hsl(205 85% 55%)' : 'hsl(220 10% 20%)'}`, background: isSel ? 'hsl(205 85% 55%)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isSel && Icons.check(10, 'white')}
                        </div>
                      </div>
                    )
                  })}
                  {selectedWallet && (
                    <div style={{ margin: '4px 4px 0', background: tokenColor + '07', border: `1px solid ${tokenColor}1e`, borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {Icons.shield(13, tokenColor)}
                      <p style={{ color: tokenColor, fontSize: '12px', ...mono, margin: 0, lineHeight: '1.5' }}>
                        Instant · Collateral stays locked · No fees
                      </p>
                    </div>
                  )}
                </div>
              )}

              {sendMode === 'address' && (
                <div style={{ padding: '0 16px 16px' }}>
                  <input value={externalAddr} onChange={e => setExternalAddr(e.target.value)} placeholder={isStable ? '0x... Ethereum ERC-20 address' : 'bc1q... Bitcoin address'} style={fieldStyle} />
                  {externalAddr && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'hsl(38 92% 50% / 0.06)', border: '1px solid hsl(38 92% 50% / 0.2)', borderRadius: '10px', padding: '10px 14px', marginTop: '10px' }}>
                      {Icons.warning(13, 'hsl(38 92% 50%)')}
                      <p style={{ color: 'hsl(38 92% 55%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>
                        You will be asked whether this is your own wallet before sending.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

           {/* QSK input — only for UBTC vault sends */}
            {!isWalletSend && !isStable && (
              <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(205 85% 55% / 0.2)', borderRadius: '20px', padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  {Icons.quantum(14, 'hsl(205 85% 55%)')}
                  <p style={{ color: 'hsl(205 85% 55%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>Quantum Signing Key Required</p>
                </div>
                <p style={{ color: 'hsl(0 0% 35%)', fontSize: '12px', ...mono, margin: '0 0 12px', lineHeight: '1.6' }}>
                  Paste your QSK to sign this transfer. Your key is used locally and never stored.
                </p>
                <textarea
                  value={qsk}
                  onChange={e => { setQsk(e.target.value); setQskError('') }}
                  placeholder="Paste your Quantum Signing Key here..."
                  rows={3}
                  style={{ width: '100%', padding: '12px 14px', background: 'hsl(220 15% 5%)', border: `1px solid ${qskError ? 'hsl(0 84% 60% / 0.5)' : 'hsl(220 10% 14%)'}`, borderRadius: '10px', color: 'hsl(0 0% 75%)', fontSize: '11px', fontFamily: 'var(--font-mono)', outline: 'none', resize: 'none' as const, boxSizing: 'border-box' as const }}
                />
                {qskError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                    {Icons.warning(13, 'hsl(0 84% 60%)')}
                    <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, margin: 0 }}>{qskError}</p>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
                  {Icons.shield(12, 'hsl(0 0% 22%)')}
                  <p style={{ color: 'hsl(0 0% 22%)', fontSize: '11px', ...mono, margin: 0 }}>Key is cleared immediately after signing. Never transmitted to any server.</p>
                </div>
              </div>
            )}

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.25)', borderRadius: '14px', padding: '14px 16px' }}>
                {Icons.warning(14, 'hsl(0 84% 60%)')}
                <p style={{ color: 'hsl(0 84% 60%)', fontSize: '13px', ...mono, margin: 0 }}>{error}</p>
              </div>
            )}

            <button
              onClick={handleSendClick}
              disabled={!canSend}
              style={{ width: '100%', background: canSend ? `linear-gradient(135deg, ${tokenColor}, ${tokenColor}bb)` : 'hsl(220 10% 11%)', color: canSend ? 'white' : 'hsl(0 0% 25%)', border: 'none', borderRadius: '16px', padding: '18px', fontSize: '17px', fontWeight: '700', cursor: canSend ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', boxShadow: canSend ? `0 0 40px ${tokenColor}35` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            >
              {Icons.send(20, canSend ? 'white' : 'hsl(0 0% 25%)')}
              {canSend ? `Send ${parseFloat(amount).toLocaleString()} ${utokenName}` : 'Select amount and recipient'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {Icons.shield(13, 'hsl(0 0% 20%)')}
              <p style={{ color: 'hsl(0 0% 20%)', fontSize: '11px', ...mono, margin: 0 }}>
                {sendMode === 'wallet' ? 'Instant · No fees · Bitcoin-native' : 'External · Collateral claim transfers with token'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TransferPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(0 0% 28%)', fontFamily: 'var(--font-mono)' }}>Loading...</div>}>
      <TransferContent />
    </Suspense>
  )
}
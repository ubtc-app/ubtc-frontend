'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { API_URL } from '../lib/supabase'
import { Icons } from '../components/Icons'

const toHex = (bytes: Uint8Array) => Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
const fromHex = (hex: string) => new Uint8Array(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)))

function generateTaprootKeypair() {
  const privKey = crypto.getRandomValues(new Uint8Array(32))
  return { privateKeyHex: toHex(privKey), publicKeyHex: toHex(privKey) }
}

function kyberXorEncrypt(privateKeyHex: string, kyberKeyHex: string): string {
  const privBytes = fromHex(privateKeyHex)
  const kyberBytes = fromHex(kyberKeyHex.slice(0, 64).padEnd(64, '0'))
  const encrypted = privBytes.map((b, i) => b ^ kyberBytes[i % kyberBytes.length])
  return toHex(new Uint8Array(encrypted))
}

function TransferContent() {
  const searchParams = useSearchParams()
  const vaultId = searchParams.get('vault') || ''
  const currencyParam = (searchParams.get('currency') || 'ubtc').toLowerCase()
  const fromWallet = searchParams.get('from_wallet') || ''
  const walletUbtc = parseFloat(searchParams.get('ubtc') || '0')
  const walletUusdt = parseFloat(searchParams.get('uusdt') || '0')
  const walletUusdc = parseFloat(searchParams.get('uusdc') || '0')
 const isWalletSend = !!fromWallet
  const [walletPassword, setWalletPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const [vaults, setVaults] = useState<any[]>([])
  const [wallets, setWallets] = useState<any[]>([])
  const [stablecoins, setStablecoins] = useState<any[]>([])
  const [activeCurrency, setActiveCurrency] = useState(currencyParam)
  const [activeVaultId, setActiveVaultId] = useState(vaultId)
  const [amount, setAmount] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchError, setSearchError] = useState('')
  const [selectedWallet, setSelectedWallet] = useState<any>(null)
  const [recipientWallet, setRecipientWallet] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [result, setResult] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [showOwnWalletQuestion, setShowOwnWalletQuestion] = useState(false)
  const [isOwnWallet, setIsOwnWallet] = useState<boolean | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [collateralAcknowledged, setCollateralAcknowledged] = useState(false)
  const [qsk, setQsk] = useState(() => sessionStorage.getItem('ubtc_qsk') || '')
  const [qskError, setQskError] = useState('')

  const mono: any = { fontFamily: 'var(--font-mono)' }
  const isUusdt = activeCurrency === 'uusdt'
  const isUusdc = activeCurrency === 'uusdc'
  const isStable = isUusdt || isUusdc
  const utokenName = isUusdt ? 'UUSDT' : isUusdc ? 'UUSDC' : 'UBTC'
  const tokenName = isUusdt ? 'USDT' : isUusdc ? 'USDC' : 'BTC'
  const tokenColor = isUusdt ? 'hsl(142 76% 36%)' : isUusdc ? 'hsl(220 85% 60%)' : 'hsl(205 85% 55%)'
  const tokenIcon = isUusdt ? Icons.lock : isUusdc ? Icons.lock : Icons.bitcoin
  const backHref = isWalletSend ? '/wallet' : `/account/${vaultId}?currency=${activeCurrency}`

  const accountMeta: Record<string, { title: string }> = {
    current: { title: 'Current' }, savings: { title: 'Savings' }, yield: { title: 'Yield' },
    custody_yield: { title: 'Custody Yield' }, prime: { title: 'Prime' }, managed_yield: { title: 'Managed Yield' },
  }

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setDataLoading(true)
    try {
      const [dashRes, scRes, walletsRes] = await Promise.all([
        fetch(`${API_URL}/dashboard`),
        fetch(`${API_URL}/stablecoins`),
        fetch(`${API_URL}/wallets/all`),
      ])
      const dash = await dashRes.json()
      const sc = await scRes.json()
      const wd = await walletsRes.json()
      setVaults(dash.vaults || [])
      setStablecoins(sc.stablecoins || [])
      setWallets(wd.wallets || [])
    } catch (e) { console.error(e) }
    setDataLoading(false)
  }

  const scForVault = (acType: string) => stablecoins.filter(s => s.account_type === acType)

  const fetchRecipientWallet = async (address: string) => {
    if (!address || !address.startsWith('ubtc')) return
    try {
      const res = await fetch(`${API_URL}/wallet/${address}`)
      if (res.ok) setRecipientWallet(await res.json())
    } catch {}
  }

  const getVaultBalance = (vid: string): number => {
    const v = vaults.find(x => x.vault_id === vid)
    if (!v) return 0
    if (activeCurrency === 'ubtc') return parseFloat(v.ubtc_minted || '0')
    const sc = scForVault(v.account_type)
    const cur = isUusdt ? 'UUSDT' : 'UUSDC'
    return sc.filter(s => s.currency === cur).reduce((s, x) => s + parseFloat(x.balance || '0'), 0)
  }

  const walletBalance = activeCurrency === 'ubtc' ? walletUbtc : activeCurrency === 'uusdt' ? walletUusdt : walletUusdc
  const activeBalance = isWalletSend ? walletBalance : getVaultBalance(activeVaultId || vaultId)
  const activeVault = vaults.find(v => v.vault_id === (activeVaultId || vaultId))
  const btcLocked = (activeVault?.btc_amount_sats || 0) / 100_000_000
  const ubtcTotal = parseFloat(activeVault?.ubtc_minted || '0')

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
    return scForVault(v.account_type)
      .filter(s => s.currency === cur && s.status !== 'archived')
      .sort((a: any, b: any) => parseFloat(b.balance) - parseFloat(a.balance))[0] || null
  }

  const loadKeyFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (data.key1_dilithium3_qsk?.key) { setQsk(data.key1_dilithium3_qsk.key); setQskError('') }
        else setQskError('Invalid key file')
      } catch { setQskError('Could not read file') }
    }
    reader.readAsText(file)
  }

  const handleSearch = (val: string) => {
    setSearchQuery(val)
    setSelectedWallet(null)
    setSearchError('')
    if (!val) return
    // Block non-ubtc addresses (looks like a bitcoin/eth address but wrong prefix)
    if (val.length > 20 && !val.startsWith('ubtc') && !val.startsWith('@')) {
      setSearchError('Can only send UBTC to another UBTC Wallet — address must start with ubtc')
    }
  }

  const searchResults = searchQuery.length > 1 && !searchError
    ? wallets.filter((w: any) =>
        (w.username?.toLowerCase().includes(searchQuery.replace('@', '').toLowerCase()) ||
        w.wallet_address?.toLowerCase().includes(searchQuery.toLowerCase())) &&
        w.wallet_address !== fromWallet
      ).slice(0, 5)
    : []

  const isManualUbtcAddress = searchQuery.startsWith('ubtc') && searchQuery.length > 20 && !searchError
  const recipient = selectedWallet?.wallet_address || (isManualUbtcAddress ? searchQuery : '')
  const recipientValid = recipient.startsWith('ubtc') && recipient.length > 10
  const canSend = !!amount && parseFloat(amount) > 0 && parseFloat(amount) <= activeBalance && recipientValid && !loading
  const btcRelease = activeCurrency === 'ubtc'
    ? ((parseFloat(amount || '0') / (ubtcTotal || 1)) * btcLocked).toFixed(6)
    : parseFloat(amount || '0').toLocaleString()

  const handleSendClick = () => {
    if (!canSend) return
    setIsOwnWallet(null)
    setCollateralAcknowledged(false)
    setShowOwnWalletQuestion(true)
  }

  const handleOwnWalletAnswer = (answer: boolean) => {
    setIsOwnWallet(answer)
    setCollateralAcknowledged(false)
    setShowOwnWalletQuestion(false)
    setShowWarning(true)
  }

  const doSend = async () => {
    const to = recipient
    if (!amount || !to) return
    setLoading(true); setError(''); setQskError('')
    try {
      let pqSignature = ''
      if (!isWalletSend && !isStable) {
        const payload = `${activeVaultId || vaultId}:${to}:${amount}`
        if (!qsk) { setQskError('Your Quantum Signing Key is required'); setLoading(false); return }
        const signRes = await fetch(`${API_URL}/wallet/sign-payload`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ private_key: qsk, payload })
        })
        const signData = await signRes.json()
        if (!signRes.ok) { setQskError('Invalid Quantum Signing Key'); setLoading(false); return }
        pqSignature = signData.signature
        setQsk('')
      }

     if (isWalletSend) {
       // Verify Protocol Second Key before sending
        if (!walletPassword) { setPasswordError('Upload your Protocol Second Key to authorise this transfer'); setLoading(false); return }
        setPasswordError('')

        const res = await fetch(`${API_URL}/wallet/${fromWallet}/send`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ from_address: fromWallet, to_username_or_address: to, amount, send_type: 'internal', second_key: walletPassword })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
      console.log('Transfer response:', JSON.stringify(data))
        setResult({ transfer_id: data.transaction_id, to, amount, currency: utokenName, bitcoin_txid: data.bitcoin_txid })
      } else if (isStable) {
        const scVault = getScVaultForActive()
        if (!scVault) throw new Error(`No ${utokenName} found.`)
        const res = await fetch(`${API_URL}/stablecoin/transfer`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from_vault_id: scVault.vault_id, to_address: to, amount })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setResult({ transfer_id: data.transfer_id, to, amount, currency: utokenName })
      } else {
        const taprootKeypair = generateTaprootKeypair()
        const recipientKyberKey = recipientWallet?.kyber_pk || recipientWallet?.public_key || ''
        const encryptedTaprootKey = recipientKyberKey
          ? kyberXorEncrypt(taprootKeypair.privateKeyHex, recipientKyberKey)
          : taprootKeypair.privateKeyHex
        const res = await fetch(`${API_URL}/transfer`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from_vault_id: activeVaultId || vaultId,
            to_address: to, ubtc_amount: amount,
            pq_signature: pqSignature,
            client_taproot_pubkey: taprootKeypair.publicKeyHex,
            client_taproot_key_encrypted: encryptedTaprootKey,
          })
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

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 15% 3%)', fontFamily: 'var(--font-display)' }}>

      {/* Own wallet modal */}
      {showOwnWalletQuestion && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'hsl(220 12% 9%)', border: '1px solid hsl(220 10% 18%)', borderRadius: '24px', padding: '36px', maxWidth: '400px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'hsl(205 85% 55% / 0.1)', border: '2px solid hsl(205 85% 55% / 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {Icons.wallet(28, 'hsl(205 85% 55%)')}
              </div>
            </div>
            <h3 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: '0 0 10px', textAlign: 'center' as const }}>Is this your own wallet?</h3>
            <p style={{ color: 'hsl(0 0% 42%)', fontSize: '13px', ...mono, textAlign: 'center' as const, margin: '0 0 28px', lineHeight: '1.7' }}>
              Sending <strong style={{ color: tokenColor }}>{parseFloat(amount || '0').toLocaleString()} {utokenName}</strong> to{' '}
              <strong style={{ color: 'hsl(0 0% 70%)' }}>{selectedWallet ? `@${selectedWallet.username}` : recipient.slice(0, 16) + '...'}</strong>
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handleOwnWalletAnswer(true)} style={{ flex: 1, background: 'hsl(205 85% 55% / 0.1)', border: '2px solid hsl(205 85% 55% / 0.4)', color: 'hsl(205 85% 65%)', borderRadius: '14px', padding: '16px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
                Yes, mine
              </button>
              <button onClick={() => handleOwnWalletAnswer(false)} style={{ flex: 1, background: 'hsl(0 84% 60% / 0.1)', border: '2px solid hsl(0 84% 60% / 0.4)', color: 'hsl(0 84% 65%)', borderRadius: '14px', padding: '16px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
                Someone else
              </button>
            </div>
            <button onClick={() => setShowOwnWalletQuestion(false)} style={{ width: '100%', background: 'none', border: 'none', color: 'hsl(0 0% 28%)', fontSize: '13px', ...mono, cursor: 'pointer', marginTop: '14px', padding: '8px' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Collateral warning modal */}
      {showWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'hsl(220 12% 9%)', border: `2px solid ${isOwnWallet ? 'hsl(205 85% 55% / 0.3)' : 'hsl(0 84% 60% / 0.4)'}`, borderRadius: '24px', padding: '32px', maxWidth: '420px', width: '100%', maxHeight: '90vh', overflowY: 'auto' as const }}>
            {isOwnWallet ? (
              <div>
                <div style={{ textAlign: 'center' as const, marginBottom: '20px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'hsl(205 85% 55% / 0.1)', border: '2px solid hsl(205 85% 55% / 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    {Icons.shield(28, 'hsl(205 85% 55%)')}
                  </div>
                  <h3 style={{ color: 'hsl(0 0% 92%)', fontSize: '20px', fontWeight: '700', margin: '0 0 8px' }}>Your Collateral Stays With You</h3>
                  <p style={{ color: 'hsl(0 0% 45%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.7' }}>
                    Your BTC stays locked in the vault — only the {utokenName} token moves.
                  </p>
                </div>
                <div style={{ background: 'hsl(38 92% 50% / 0.06)', border: '1px solid hsl(38 92% 50% / 0.2)', borderRadius: '12px', padding: '14px', marginBottom: '18px', display: 'flex', gap: '10px' }}>
                  {Icons.warning(14, 'hsl(38 92% 50%)')}
                  <p style={{ color: 'hsl(38 92% 60%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>
                    If you later send this {utokenName} to someone else, the right to claim the BTC collateral goes with it.
                  </p>
                </div>
                <div onClick={() => setCollateralAcknowledged(!collateralAcknowledged)} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer', padding: '12px', background: collateralAcknowledged ? 'hsl(142 76% 36% / 0.08)' : 'hsl(220 15% 5%)', border: `1px solid ${collateralAcknowledged ? 'hsl(142 76% 36% / 0.4)' : 'hsl(220 10% 16%)'}`, borderRadius: '10px', marginBottom: '18px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '5px', border: `2px solid ${collateralAcknowledged ? 'hsl(142 76% 36%)' : 'hsl(220 10% 30%)'}`, background: collateralAcknowledged ? 'hsl(142 76% 36%)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {collateralAcknowledged && Icons.check(12, 'white')}
                  </div>
                  <p style={{ color: 'hsl(0 0% 55%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>I understand that if I send this {utokenName} to another person, they gain the right to the BTC collateral.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowWarning(false)} style={{ flex: 1, background: 'none', border: '1px solid hsl(220 10% 18%)', color: 'hsl(0 0% 50%)', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>Cancel</button>
                  <button onClick={doSend} disabled={!collateralAcknowledged || loading} style={{ flex: 2, background: collateralAcknowledged ? 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))' : 'hsl(220 10% 14%)', color: collateralAcknowledged ? 'white' : 'hsl(0 0% 30%)', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: collateralAcknowledged ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)' }}>
                    {loading ? 'Sending...' : 'Confirm Send'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ textAlign: 'center' as const, marginBottom: '20px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'hsl(0 84% 60% / 0.1)', border: '2px solid hsl(0 84% 60% / 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    {Icons.warning(28, 'hsl(0 84% 60%)')}
                  </div>
                  <h3 style={{ color: 'hsl(0 84% 65%)', fontSize: '20px', fontWeight: '700', margin: '0 0 8px' }}>Collateral Rights Transfer</h3>
                  <p style={{ color: 'hsl(0 0% 45%)', fontSize: '13px', ...mono, margin: 0, lineHeight: '1.7' }}>
                    You are permanently transferring <strong style={{ color: tokenColor }}>{parseFloat(amount || '0').toLocaleString()} {utokenName}</strong> to another person.
                  </p>
                </div>
                <div style={{ background: 'hsl(0 84% 60% / 0.06)', border: '1px solid hsl(0 84% 60% / 0.25)', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    {Icons.warning(14, 'hsl(0 84% 60%)')}
                    <p style={{ color: 'hsl(0 0% 65%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>{utokenName} is a claim on real Bitcoin. The recipient can redeem the BTC backing this token.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {Icons.warning(14, 'hsl(0 84% 60%)')}
                    <p style={{ color: 'hsl(0 0% 65%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>You cannot reverse this transaction once sent.</p>
                  </div>
                </div>
                <div style={{ background: 'hsl(220 15% 5%)', borderRadius: '12px', padding: '14px', marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ textAlign: 'center' as const }}>
                    <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', margin: '0 0 5px' }}>Sending</p>
                    <p style={{ color: tokenColor, fontWeight: '700', fontSize: '15px', ...mono, margin: 0 }}>{parseFloat(amount || '0').toLocaleString()} {utokenName}</p>
                  </div>
                  <div style={{ textAlign: 'center' as const }}>
                    <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', margin: '0 0 5px' }}>Collateral at Risk</p>
                    <p style={{ color: 'hsl(0 84% 60%)', fontWeight: '700', fontSize: '15px', ...mono, margin: 0 }}>
                      {activeCurrency === 'ubtc' ? btcRelease + ' BTC' : '$' + parseFloat(amount || '0').toLocaleString() + ' ' + tokenName}
                    </p>
                  </div>
                </div>
                <div onClick={() => setCollateralAcknowledged(!collateralAcknowledged)} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer', padding: '12px', background: collateralAcknowledged ? 'hsl(0 84% 60% / 0.08)' : 'hsl(220 15% 5%)', border: `1px solid ${collateralAcknowledged ? 'hsl(0 84% 60% / 0.4)' : 'hsl(220 10% 16%)'}`, borderRadius: '10px', marginBottom: '18px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '5px', border: `2px solid ${collateralAcknowledged ? 'hsl(0 84% 60%)' : 'hsl(220 10% 30%)'}`, background: collateralAcknowledged ? 'hsl(0 84% 60%)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {collateralAcknowledged && Icons.check(12, 'white')}
                  </div>
                  <p style={{ color: 'hsl(0 0% 55%)', fontSize: '12px', ...mono, margin: 0, lineHeight: '1.6' }}>I understand the recipient gains the right to redeem the BTC. This is irreversible.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowWarning(false)} style={{ flex: 1, background: 'none', border: '1px solid hsl(220 10% 18%)', color: 'hsl(0 0% 50%)', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>Cancel</button>
                  <button onClick={doSend} disabled={!collateralAcknowledged || loading} style={{ flex: 2, background: collateralAcknowledged ? 'hsl(0 84% 55%)' : 'hsl(220 10% 14%)', color: collateralAcknowledged ? 'white' : 'hsl(0 0% 30%)', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: collateralAcknowledged ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)' }}>
                    {loading ? 'Sending...' : 'I Accept — Send'}
                  </button>
                </div>
              </div>
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
        <button onClick={loadAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(0 0% 30%)' }}>
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
              <h2 style={{ color: 'hsl(0 0% 92%)', fontSize: '28px', fontWeight: '700', margin: '0 0 6px' }}>Sent!</h2>
              <p style={{ color: 'hsl(0 0% 38%)', fontSize: '15px', ...mono, margin: 0 }}>{parseFloat(result.amount).toLocaleString()} {result.currency} transferred</p>
            </div>
            <div style={{ width: '100%', background: 'hsl(220 12% 8%)', borderRadius: '20px', padding: '22px' }}>
              {[
                { label: 'Amount', value: `${parseFloat(result.amount).toLocaleString()} ${result.currency}` },
                { label: 'To', value: result.to },
                { label: 'Transfer ID', value: result.transfer_id },
                { label: 'Status', value: 'Complete · Proof generated' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid hsl(220 10% 11%)', gap: '12px', alignItems: 'center' }}>
                  <p style={{ color: 'hsl(0 0% 32%)', fontSize: '12px', ...mono, margin: 0, flexShrink: 0 }}>{item.label}</p>
                  <p style={{ color: 'hsl(0 0% 80%)', fontSize: '12px', fontWeight: '600', ...mono, margin: 0, textAlign: 'right' as const, wordBreak: 'break-all' as const }}>{item.value}</p>
                </div>
              ))}
            </div>
          {result.bitcoin_txid && (
              <div style={{ background: 'hsl(220 15% 5%)', border: '1px solid hsl(205 85% 55% / 0.2)', borderRadius: '12px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div>
                  <p style={{ color: 'hsl(0 0% 35%)', fontSize: '10px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 4px' }}>QUANTUM:TRANSFER on Bitcoin</p>
                  <p style={{ color: 'hsl(205 85% 55%)', fontSize: '11px', ...mono, margin: 0, wordBreak: 'break-all' as const }}>{result.bitcoin_txid}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button onClick={() => {
                    const url = `https://mempool.space/testnet4/tx/${result.bitcoin_txid}`
                   console.log('Copying:', url)
                    setCopied(true); setTimeout(() => setCopied(false), 2000)
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(url).catch(() => {
                        const el = document.createElement('textarea')
                        el.value = url; document.body.appendChild(el); el.select()
                        document.execCommand('copy'); document.body.removeChild(el)
                      })
                    } else {
                      const el = document.createElement('textarea')
                      el.value = url; document.body.appendChild(el); el.select()
                      document.execCommand('copy'); document.body.removeChild(el)
                    }
                  }} style={{ background: 'hsl(220 12% 12%)', color: 'hsl(0 0% 55%)', border: '1px solid hsl(220 10% 18%)', borderRadius: '8px', padding: '8px 12px', fontSize: '11px', ...mono, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                   {copied ? '✅ Copied!' : 'Copy URL'}
                  </button>
                  <a href={`https://mempool.space/testnet4/tx/${result.bitcoin_txid}`} target="_blank" rel="noopener noreferrer" style={{ background: 'hsl(205 85% 55%)', color: '#000', borderRadius: '8px', padding: '8px 12px', fontSize: '11px', ...mono, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' as const }}>
                    View →
                  </a>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button onClick={() => { setResult(null); setAmount(''); setSelectedWallet(null); setSearchQuery('') }} style={{ flex: 1, background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 10% 16%)', color: 'hsl(0 0% 55%)', borderRadius: '14px', padding: '16px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
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

            {/* FROM */}
            {isWalletSend ? (
              <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '20px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px 10px' }}>
                  <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0 0 12px' }}>From Wallet</p>
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
                          <p style={{ color: 'hsl(0 0% 28%)', fontSize: '11px', ...mono, margin: 0 }}>Available balance</p>
                        </div>
                        <p style={{ color: t.color, fontWeight: '700', fontSize: '15px', ...mono, margin: 0 }}>${t.bal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                        {isSel && <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{Icons.check(10, 'white')}</div>}
                      </div>
                    )
                  })}
                  {walletUbtc === 0 && walletUusdt === 0 && walletUusdc === 0 && (
                    <p style={{ color: 'hsl(0 0% 32%)', fontSize: '14px', ...mono, margin: '10px', textAlign: 'center' as const }}>No tokens in wallet</p>
                  )}
                </div>
              </div>
            ) : fromOptions.length > 0 ? (
              <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '20px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px 10px' }}>
                  <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>From Account</p>
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
                        <p style={{ color: tokenColor, fontWeight: '700', fontSize: '15px', ...mono, margin: 0 }}>${opt.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        {isSelected && <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: tokenColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{Icons.check(10, 'white')}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '20px', padding: '28px', textAlign: 'center' as const }}>
                <p style={{ color: 'hsl(0 0% 32%)', fontSize: '14px', ...mono, margin: '0 0 12px' }}>No {utokenName} balance to send</p>
                <a href={`/deposit?vault=${vaultId}&currency=${activeCurrency}`} style={{ color: tokenColor, fontSize: '13px', ...mono }}>Deposit {tokenName} first</a>
              </div>
            )}

            {/* AMOUNT */}
            <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '20px', padding: '22px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>Amount</p>
                <button onClick={() => setAmount(activeBalance.toFixed(2))} style={{ background: tokenColor + '12', border: `1px solid ${tokenColor}28`, color: tokenColor, borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', ...mono }}>
                  Max ${activeBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
                <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, margin: '10px 0 0' }}>Exceeds balance</p>
              )}
            </div>

            {/* TO — search only, UBTC wallets only */}
            <div style={{ background: 'hsl(220 12% 8%)', borderRadius: '20px', padding: '20px' }}>
              <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0 0 6px' }}>To</p>
              <p style={{ color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, margin: '0 0 12px' }}>
                Search by <strong style={{ color: 'hsl(0 0% 55%)' }}>@username</strong> or paste a <strong style={{ color: 'hsl(205 85% 55%)' }}>ubtc...</strong> address
              </p>
              <input
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="@username or ubtc1..."
                style={{ width: '100%', padding: '13px 14px', background: 'hsl(220 15% 5%)', border: `1px solid ${searchError ? 'hsl(0 84% 60% / 0.6)' : (selectedWallet || isManualUbtcAddress) ? 'hsl(142 76% 36% / 0.5)' : 'hsl(220 10% 16%)'}`, borderRadius: '12px', color: 'hsl(0 0% 88%)', fontSize: '13px', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' as const }}
              />

              {searchError && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.3)', borderRadius: '10px', padding: '10px 12px', marginTop: '8px' }}>
                  {Icons.warning(13, 'hsl(0 84% 60%)')}
                  <p style={{ color: 'hsl(0 84% 60%)', fontSize: '11px', ...mono, margin: 0, lineHeight: '1.5' }}>{searchError}</p>
                </div>
              )}

              {searchResults.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  {searchResults.map((w: any, i: number) => {
                    const isSel = selectedWallet?.wallet_id === w.wallet_id
                    return (
                      <div key={i} onClick={() => { setSelectedWallet(isSel ? null : w); if (!isSel) { setSearchQuery(w.wallet_address); fetchRecipientWallet(w.wallet_address) } }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: isSel ? 'hsl(205 85% 55% / 0.07)' : 'hsl(220 15% 5%)', border: `1px solid ${isSel ? 'hsl(205 85% 55% / 0.35)' : 'hsl(220 10% 11%)'}`, borderRadius: '12px', cursor: 'pointer', marginTop: '6px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'hsl(205 85% 55% / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {Icons.wallet(18, 'hsl(205 85% 55%)')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ color: 'hsl(0 0% 88%)', fontWeight: '600', fontSize: '13px', margin: '0 0 2px' }}>@{w.username}</p>
                          <p style={{ color: 'hsl(0 0% 28%)', fontSize: '10px', ...mono, margin: 0 }}>{w.wallet_address?.slice(0, 28)}...</p>
                        </div>
                        {isSel && (
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'hsl(205 85% 55%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {Icons.check(9, 'white')}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {isManualUbtcAddress && !selectedWallet && (
                <div style={{ marginTop: '8px', background: 'hsl(142 76% 36% / 0.06)', border: '1px solid hsl(142 76% 36% / 0.3)', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {Icons.check(13, 'hsl(142 76% 36%)')}
                  <p style={{ color: 'hsl(142 76% 36%)', fontSize: '11px', ...mono, margin: 0 }}>Valid UBTC address</p>
                </div>
              )}

              {(selectedWallet || isManualUbtcAddress) && (
                <div style={{ marginTop: '8px', background: tokenColor + '07', border: `1px solid ${tokenColor}20`, borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {Icons.shield(13, tokenColor)}
                  <p style={{ color: tokenColor, fontSize: '11px', ...mono, margin: 0 }}>
                    {selectedWallet ? `Sending to @${selectedWallet.username}` : 'Sending to UBTC address'} · Proof file generated for recipient
                  </p>
                </div>
              )}
            </div>

            {/* QSK — vault sends only */}
            {!isWalletSend && !isStable && (
              <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(205 85% 55% / 0.2)', borderRadius: '20px', padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  {Icons.quantum(14, 'hsl(205 85% 55%)')}
                  <p style={{ color: 'hsl(205 85% 55%)', fontSize: '10px', ...mono, textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>Quantum Signing Key Required</p>
                </div>
                <label style={{ display: 'block', width: '100%', background: 'hsl(205 85% 55%)', color: '#000', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center' as const, marginBottom: '10px', boxSizing: 'border-box' as const }}>
                  📁 Load Key File
                  <input type="file" accept=".json" style={{ display: 'none' }} onChange={loadKeyFile} />
                </label>
                <textarea value={qsk} onChange={e => { setQsk(e.target.value); setQskError('') }} placeholder="Or paste your Quantum Signing Key..." rows={3} style={{ width: '100%', padding: '12px 14px', background: 'hsl(220 15% 5%)', border: `1px solid ${qskError ? 'hsl(0 84% 60% / 0.5)' : 'hsl(220 10% 14%)'}`, borderRadius: '10px', color: 'hsl(0 0% 75%)', fontSize: '11px', fontFamily: 'var(--font-mono)', outline: 'none', resize: 'none' as const, boxSizing: 'border-box' as const }} />
                {qskError && <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, margin: '8px 0 0' }}>{qskError}</p>}
              </div>
            )}

           {/* Protocol Second Key for wallet sends */}
            {isWalletSend && (
              <div style={{ background: 'hsl(220 12% 8%)', border: '1px solid hsl(205 85% 55% / 0.2)', borderRadius: '16px', padding: '18px 20px' }}>
                <p style={{ color: 'hsl(205 85% 55%)', fontSize: '10px', ...mono, textTransform: 'uppercase' as const, letterSpacing: '0.2em', margin: '0 0 4px' }}>🔒 Authorise Transfer</p>
                <p style={{ color: 'hsl(0 0% 35%)', fontSize: '11px', ...mono, margin: '0 0 12px', lineHeight: '1.6' }}>Upload your Protocol Second Key to authorise this transfer. This proves you are the vault owner.</p>
                <label style={{ display: 'block', width: '100%', background: walletPassword ? 'hsl(142 76% 36% / 0.1)' : 'hsl(205 85% 55%)', color: walletPassword ? 'hsl(142 76% 36%)' : '#000', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, padding: '12px 14px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center' as const, boxSizing: 'border-box' as const, border: `1px solid ${walletPassword ? 'hsl(142 76% 36% / 0.3)' : 'transparent'}` }}>
                  {walletPassword ? '✅ Protocol Key Loaded' : '🔑 Upload Protocol Second Key'}
                 <input type="file" accept=".txt,.json,.key" style={{ display: 'none' }} onChange={async e => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    const text = await f.text()
                    const match = text.match(/[a-f0-9]{64,}/)
                    if (!match) { setPasswordError('Protocol Second Key not found in file'); return }
                    const key = match[0]
                    // Verify key against backend immediately
                    setPasswordError('Verifying key...')
                    try {
                      const res = await fetch(`${API_URL}/wallet/verify-psk`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ wallet_address: fromWallet, second_key: key })
                      })
                      const data = await res.json()
                      if (!res.ok || data.error) { setPasswordError('❌ Wrong Protocol Second Key — check your file'); setWalletPassword('') }
                      else { setWalletPassword(key); setPasswordError('') }
                    } catch { setWalletPassword(key); setPasswordError('') }
                  }} />
                </label>
                {passwordError && <p style={{ color: 'hsl(0 84% 60%)', fontSize: '12px', ...mono, margin: '8px 0 0' }}>{passwordError}</p>}
              </div>
            )}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.25)', borderRadius: '14px', padding: '14px 16px' }}>
                {Icons.warning(14, 'hsl(0 84% 60%)')}
                <p style={{ color: 'hsl(0 84% 60%)', fontSize: '13px', ...mono, margin: 0 }}>{error}</p>
              </div>
            )}

            <button onClick={handleSendClick} disabled={!canSend} style={{ width: '100%', background: canSend ? `linear-gradient(135deg, ${tokenColor}, ${tokenColor}bb)` : 'hsl(220 10% 11%)', color: canSend ? 'white' : 'hsl(0 0% 25%)', border: 'none', borderRadius: '16px', padding: '18px', fontSize: '17px', fontWeight: '700', cursor: canSend ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', boxShadow: canSend ? `0 0 40px ${tokenColor}35` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              {Icons.send(20, canSend ? 'white' : 'hsl(0 0% 25%)')}
              {canSend ? `Send ${parseFloat(amount).toLocaleString()} ${utokenName}` : 'Enter amount and recipient'}
            </button>

            <p style={{ color: 'hsl(0 0% 20%)', fontSize: '11px', ...mono, textAlign: 'center' as const, margin: 0 }}>
              Instant · Bitcoin-native · Proof file generated for recipient
            </p>

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
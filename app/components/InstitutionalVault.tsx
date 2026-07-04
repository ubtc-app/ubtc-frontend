'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { API_URL } from '../lib/supabase'

// ── Style tokens ─────────────────────────────────────────────────────────────
const FONT = "'Inter',-apple-system,system-ui,sans-serif"
const MONO = "'JetBrains Mono',monospace"

const card  = { background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }
const badge = (color:string, bg:string, border:string) => ({
  display:'inline-flex' as const, alignItems:'center' as const, gap:5,
  padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:600 as const,
  letterSpacing:'0.06em', textTransform:'uppercase' as const,
  color, background:bg, border:`1px solid ${border}`,
})
const btnPrimary = (enabled=true) => ({
  display:'flex' as const, alignItems:'center' as const, justifyContent:'center' as const, gap:8,
  background: enabled ? '#0f172a' : '#e2e8f0',
  color: enabled ? '#fff' : '#94a3b8',
  border:'none', borderRadius:8, padding:'12px 24px',
  fontSize:14, fontWeight:600 as const, cursor: enabled ? 'pointer' as const : 'not-allowed' as const,
  fontFamily:FONT, transition:'background 0.15s',
})
const btnSecondary = {
  background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8,
  padding:'12px 20px', fontSize:14, fontWeight:500 as const,
  color:'#64748b', cursor:'pointer' as const, fontFamily:FONT, transition:'all 0.15s',
}
const inputStyle = {
  display:'block' as const, width:'100%', padding:'11px 14px',
  background:'#fff', border:'1px solid #e2e8f0', borderRadius:8,
  color:'#0f172a', fontSize:14, fontFamily:MONO,
  outline:'none', boxSizing:'border-box' as const, transition:'border-color 0.15s',
}
const labelStyle = { display:'block' as const, color:'#64748b', fontSize:11, fontWeight:600 as const, letterSpacing:'0.06em', textTransform:'uppercase' as const, marginBottom:6 }

type AccountType = 'current'|'savings'|'yield'|'custody_yield'|'prime'|'managed_yield'
type Step = 'account'|'custody'|'confirm'|'done'

const ACCOUNT_TYPES = [
  { type:'current'      as AccountType, icon:'💳', title:'Current Account',     color:'#1e40af', tag:'Self-Custody', desc:'Day-to-day Bitcoin banking with Taproot self-custody.',  comingSoon:false },
  { type:'savings'      as AccountType, icon:'🔐', title:'Savings Account',      color:'#d97706', tag:'Self-Custody', desc:'Hold Bitcoin long-term with post-quantum signing controls.', comingSoon:false },
  { type:'yield'        as AccountType, icon:'₿',  title:'Yield Account',        color:'#16a34a', tag:'Self-Custody', desc:'Earn 3–5% APY via Babylon staking — self-custodied.',   comingSoon:false },
  { type:'custody_yield'as AccountType, icon:'📊', title:'Custody Yield',        color:'#7c3aed', tag:'Institutional', desc:'BitGo / Komainu custody with 4–6% institutional yield.', comingSoon:true  },
  { type:'prime'        as AccountType, icon:'💎', title:'Prime Account',         color:'#0891b2', tag:'Institutional', desc:'Premium institutional custody with 5–8% yield.',       comingSoon:true  },
  { type:'managed_yield'as AccountType, icon:'🏦', title:'Managed Yield',         color:'#16a34a', tag:'Institutional', desc:'Dynamically managed yield 6–10% — institutional only.', comingSoon:true  },
]

const CUSTODY_OPTS = [
  { type:'ubtc'   as const, label:'QuFi Self-Custody',    icon:'⚛️', desc:'Taproot + ML-DSA-65 · Full self-custody' },
  { type:'bitgo'  as const, label:'BitGo',                 icon:'🏦', desc:'Institutional-grade regulated custodian' },
  { type:'komainu'as const, label:'Komainu',               icon:'🏛️', desc:'Institutional digital asset custody' },
]

// ── Stepper ──────────────────────────────────────────────────────────────────
function Stepper({ current, steps }: { current:number; steps:string[] }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:0,marginBottom:40}}>
      {steps.map((s,i)=>(
        <div key={s} style={{display:'flex',alignItems:'center',flex:i<steps.length-1?1:undefined}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{
              width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:12, fontWeight:700,
              background: i<current?'#16a34a':i===current?'#0f172a':'#f1f5f9',
              color: i<=current?'#fff':'#94a3b8',
              border: i===current?'none':'1px solid #e2e8f0',
              flexShrink:0,
            }}>
              {i<current ? '✓' : i+1}
            </div>
            <span style={{fontSize:12,fontWeight:i===current?600:400,color:i===current?'#0f172a':i<current?'#16a34a':'#94a3b8',whiteSpace:'nowrap' as const}}>{s}</span>
          </div>
          {i<steps.length-1 && <div style={{flex:1,height:1,background:'#e2e8f0',margin:'0 12px'}}/>}
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
function InstitutionalVaultInner() {
  const searchParams = useSearchParams()
  const tgId     = searchParams.get('tg_id')
  const tgHandle = searchParams.get('tg_handle') || ''

  const [step,              setStep]              = useState<Step>('account')
  const [accountType,       setAccountType]       = useState<AccountType|null>(null)
  const [custodyPref,       setCustodyPref]       = useState<'ubtc'|'bitgo'|'komainu'>('ubtc')
  const [existingTypes,     setExistingTypes]     = useState<string[]>([])
  const [hasExisting,       setHasExisting]       = useState(false)
  const [existingMnemonic,  setExistingMnemonic]  = useState('')
  const [useRecovery,       setUseRecovery]       = useState(false)
  const [recoveryPhrase,    setRecoveryPhrase]    = useState('')
  const [username,          setUsername]          = useState('')
  const [email,             setEmail]             = useState('')
  const [loading,           setLoading]           = useState(false)
  const [error,             setError]             = useState('')
  const [result,            setResult]            = useState<any>(null)
  const [newWalletMnemonic, setNewWalletMnemonic] = useState<string|null>(null)
  const [name,              setName]              = useState('')

  // Post-creation steps
  const [onboardStep,           setOnboardStep]           = useState(1)
  const [walletPassword,        setWalletPassword]        = useState('')
  const [walletPasswordConfirm, setWalletPasswordConfirm] = useState('')
  const [passwordSet,           setPasswordSet]           = useState(false)
  const [pskDownloaded,         setPskDownloaded]         = useState(false)
  const [pskVerified,           setPskVerified]           = useState(false)
  const [pskVerifyError,        setPskVerifyError]        = useState('')
  const [pskPasteInput,         setPskPasteInput]         = useState('')
  const [quantumUsername,       setQuantumUsername]       = useState('')
  const [quantumUsernameAvail,  setQuantumUsernameAvail]  = useState<boolean|null>(null)
  const [checkingUsername,      setCheckingUsername]      = useState(false)
  const [quantumUsernameSet,    setQuantumUsernameSet]    = useState(false)
  const usernameCheckRef = useRef<any>(null)
  const mnemonicConfirmed = onboardStep > 2

  useEffect(() => {
    setName(localStorage.getItem('qufi_name') || '')
    import('../lib/wallet/storage').then(({loadActiveWallet}) => loadActiveWallet()).then(wallet => {
      if (!wallet) return
      setHasExisting(true)
      const pubkey = wallet.publicKeys?.dilithium
      if (!pubkey) return
      fetch(`${API_URL}/dashboard?user_pubkey=${encodeURIComponent(pubkey)}`).then(r=>r.json()).then(d=>setExistingTypes((d.vaults||[]).map((v:any)=>v.account_type))).catch(()=>{})
    })
  }, [])

  const selfCustodyTypes: AccountType[] = ['current','savings','yield']
  const isSelfCustody = accountType ? selfCustodyTypes.includes(accountType) : true
  const canProceed = username.length >= 3 && email.includes('@')

  const createAccount = async () => {
    setLoading(true); setError('')
    try {
      const { createWallet: generateWallet, createWalletFromMnemonic, persistWallet, deriveVaultTaproot } = await import('../lib/wallet/wallet')
      const { listWallets, loadActiveWallet, setActiveWallet } = await import('../lib/wallet/storage')
      const { wrapTaprootSk } = await import('../lib/wallet/vault-wrap')
      const { fromHex } = await import('../lib/wallet/encryption')
      const existingWallets = await listWallets()
      const activeWallet    = await loadActiveWallet()
      let wallet: any; let mnemonic: string|null = null; let vaultMnemonic: string
      if (existingWallets.length === 0 || !activeWallet) {
        wallet = await generateWallet(0); mnemonic = wallet.mnemonic; vaultMnemonic = mnemonic!
      } else {
        if (!existingMnemonic && !useRecovery) { setError('Enter your wallet password to add a new account.'); setLoading(false); return }
        const { loadMnemonicVault } = await import('../lib/wallet/storage')
        const { unsealWithPassword } = await import('../lib/wallet/password')
        const { validateMnemonic } = await import('@scure/bip39')
        const { wordlist } = await import('@scure/bip39/wordlists/english.js')
        const mnemonicVault = await loadMnemonicVault()
        if (!mnemonicVault || useRecovery) {
          if (!recoveryPhrase.trim()) { setUseRecovery(true); setError('Enter your 24-word recovery phrase.'); setLoading(false); return }
          if (!validateMnemonic(recoveryPhrase.trim(), wordlist)) { setError('Invalid recovery phrase.'); setLoading(false); return }
          vaultMnemonic = recoveryPhrase.trim()
        } else {
          let bytes: Uint8Array
          try { bytes = await unsealWithPassword(mnemonicVault, existingMnemonic) }
          catch { setError('Incorrect password. Use your recovery phrase if needed.'); setUseRecovery(true); setLoading(false); return }
          vaultMnemonic = new TextDecoder().decode(bytes); bytes.fill(0)
        }
        const nextIndex = Math.max(...existingWallets.map(w=>w.accountIndex??0)) + 1
        wallet = await createWalletFromMnemonic(vaultMnemonic, nextIndex)
      }
      const { taprootSk, taprootPubKey } = await deriveVaultTaproot(vaultMnemonic, wallet.accountIndex ?? 0)
      const kyberPubKeyBytes = fromHex(wallet.publicKeys.kyber)
      const taprootSkKyberWrapped = await wrapTaprootSk(taprootSk, kyberPubKeyBytes)
      taprootSk.fill(0)
      const res = await fetch(`${API_URL}/vaults`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          dilithium_pk: wallet.publicKeys.dilithium, sphincs_pk: wallet.publicKeys.sphincs,
          kyber_pk: wallet.publicKeys.kyber,
          taproot_pubkey: Array.from(taprootPubKey).map(b=>b.toString(16).padStart(2,'0')).join(''),
          taproot_sk_kyber_wrapped: taprootSkKyberWrapped,
          network:'testnet4', recovery_blocks:6, account_type:accountType,
          username: username || tgHandle || `user_${Math.random().toString(36).slice(2,8)}`,
          email: email || undefined,
          telegram_id: tgId ? Number(tgId) : undefined, telegram_handle: tgHandle || undefined,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await persistWallet(wallet); await setActiveWallet(wallet.address)
      localStorage.setItem('ubtc_wallet_address', wallet.address)
      window.dispatchEvent(new CustomEvent('wallets-updated'))
      if (mnemonic) setNewWalletMnemonic(mnemonic)
      setResult({ ...data, wallet_address: wallet.address })
      if (data.vault_id) localStorage.setItem('ubtc_active_vault_id', data.vault_id)
      setStep('done')
    } catch (e:any) { setError(e.message) }
    setLoading(false)
  }

  const checkUsername = async (name: string) => {
    if (name.length < 3) { setQuantumUsernameAvail(null); return }
    setCheckingUsername(true)
    try {
      const res = await fetch(`${API_URL}/wallets/all`)
      const data = await res.json()
      setQuantumUsernameAvail(!(data.wallets||[]).some((w:any)=>w.username?.toLowerCase()===name.toLowerCase()))
    } catch { setQuantumUsernameAvail(true) }
    setCheckingUsername(false)
  }

  const saveQuantumUsername = async () => {
    if (!quantumUsernameAvail || quantumUsername.length < 3) return
    try {
      await fetch(`${API_URL}/wallet/username`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({wallet_address:result.wallet_address,vault_id:result.vault_id,quantum_username:quantumUsername})})
      if (result?.wallet_address) localStorage.setItem(`ubtc_username_${result.wallet_address}`,quantumUsername)
    } catch {}
    setQuantumUsernameSet(true)
  }

  const verifyProtocolKeyText = (text: string) => {
    setPskVerifyError('')
    const t = text.trim()
    if (!t) { setPskVerifyError('Paste your Protocol Second Key to verify'); return }
    if (!t.includes(result.protocol_second_key) && t !== result.protocol_second_key) { setPskVerifyError('Incorrect key. Check your password manager.'); return }
    setPskVerified(true)
  }

  const downloadKey = () => {
    const blob = new Blob([JSON.stringify({
      type:'UBTC_PROTOCOL_SECOND_KEY',
      protocol_second_key:result.protocol_second_key,
      wallet_address:result.wallet_address,
      vault_id:result.vault_id,
      created_at:new Date().toISOString(),
      warning:'Store this key securely. Anyone with this key can authorise transfers.',
    },null,2)],{type:'application/json'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`ubtc-protocol-key-${result.vault_id}.json`; a.click()
    URL.revokeObjectURL(url); setPskDownloaded(true)
  }

  const setWalletPw = async () => {
    if (walletPassword !== walletPasswordConfirm || walletPassword.length < 8) return
    try {
      const { sealWithPassword } = await import('../lib/wallet/password')
      const { saveMnemonicVault } = await import('../lib/wallet/storage')
      if (newWalletMnemonic) {
        const enc = await sealWithPassword(new TextEncoder().encode(newWalletMnemonic), walletPassword)
        await saveMnemonicVault(enc)
      }
    } catch {}
    setPasswordSet(true); setOnboardStep(2)
  }

  // Advance onboard steps automatically when intermediate states complete
  useEffect(() => { if (passwordSet && onboardStep === 2) setOnboardStep(3) }, [passwordSet, onboardStep])
  useEffect(() => { if (pskVerified && onboardStep === 4) setOnboardStep(5) }, [pskVerified, onboardStep])

  // ── STEP: done — post-creation wizard ────────────────────────────────────
  if (step === 'done' && result) {
    const pw_ready = walletPassword.length >= 8 && walletPassword === walletPasswordConfirm
    return (
      <div style={{minHeight:'100vh',background:'#f5f6f8',fontFamily:FONT,padding:'64px 24px'}}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{maxWidth:540,margin:'0 auto'}}>
          {/* Progress */}
          <div style={{display:'flex',gap:8,marginBottom:32}}>
            {[1,2,3,4,5].map(n=>(
              <div key={n} style={{flex:1,height:4,borderRadius:2,background:n<onboardStep?'#16a34a':n===onboardStep?'#0f172a':'#e2e8f0'}}/>
            ))}
          </div>

          {/* Step 1: Show mnemonic */}
          {onboardStep===1 && newWalletMnemonic && (
            <div>
              <h2 style={{color:'#0f172a',fontSize:22,fontWeight:700,margin:'0 0 8px'}}>Save your recovery phrase</h2>
              <p style={{color:'#64748b',fontSize:14,margin:'0 0 24px',lineHeight:1.6}}>Write down these 24 words in order. This is the only way to recover your wallet.</p>
              <div style={{...card,padding:24,marginBottom:20}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                  {newWalletMnemonic.split(' ').map((w,i)=>(
                    <div key={i} style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:6,padding:'7px 10px',display:'flex',gap:6,alignItems:'center'}}>
                      <span style={{color:'#94a3b8',fontSize:10,fontWeight:600,width:16,flexShrink:0}}>{i+1}</span>
                      <span style={{color:'#0f172a',fontSize:13,fontFamily:MONO}}>{w}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{background:'#fef3c7',border:'1px solid #fde68a',borderRadius:8,padding:'12px 16px',marginBottom:24}}>
                <p style={{color:'#92400e',fontSize:13,margin:0}}>⚠ Never share this phrase. Anyone with it can access your funds.</p>
              </div>
              <button onClick={()=>setOnboardStep(2)} style={{...btnPrimary(),width:'100%'}}>
                I've saved it — Continue →
              </button>
            </div>
          )}

          {/* Step 2: Set password */}
          {onboardStep===2 && !passwordSet && (
            <div>
              <h2 style={{color:'#0f172a',fontSize:22,fontWeight:700,margin:'0 0 8px'}}>Set a wallet password</h2>
              <p style={{color:'#64748b',fontSize:14,margin:'0 0 24px',lineHeight:1.6}}>This encrypts your recovery phrase locally. You'll need it to add new accounts.</p>
              <div style={{...card,padding:24,marginBottom:20}}>
                <div style={{marginBottom:16}}>
                  <label style={labelStyle}>Password</label>
                  <input type="password" value={walletPassword} onChange={e=>setWalletPassword(e.target.value)} placeholder="At least 8 characters" style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Confirm password</label>
                  <input type="password" value={walletPasswordConfirm} onChange={e=>setWalletPasswordConfirm(e.target.value)} placeholder="Repeat password" style={inputStyle}/>
                  {walletPassword && walletPasswordConfirm && walletPassword!==walletPasswordConfirm && (
                    <p style={{color:'#dc2626',fontSize:12,marginTop:6}}>Passwords do not match</p>
                  )}
                </div>
              </div>
              <button onClick={setWalletPw} disabled={!pw_ready} style={{...btnPrimary(pw_ready),width:'100%'}}>
                Set Password →
              </button>
            </div>
          )}

          {/* Step 3: Download PSK */}
          {onboardStep===3 && !pskDownloaded && (
            <div>
              <h2 style={{color:'#0f172a',fontSize:22,fontWeight:700,margin:'0 0 8px'}}>Download Protocol Second Key</h2>
              <p style={{color:'#64748b',fontSize:14,margin:'0 0 24px',lineHeight:1.6}}>This key is required to authorise transfers. Store it in your password manager or a secure vault.</p>
              <div style={{...card,padding:24,marginBottom:20}}>
                <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16}}>
                  <div style={{width:44,height:44,borderRadius:10,background:'#f0fdf4',border:'1px solid #bbf7d0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>🔐</div>
                  <div>
                    <p style={{color:'#0f172a',fontWeight:600,fontSize:14,margin:'0 0 2px'}}>Protocol Second Key</p>
                    <p style={{color:'#94a3b8',fontSize:12,margin:0,fontFamily:MONO}}>ubtc-protocol-key-{result.vault_id?.slice(0,12)}…</p>
                  </div>
                </div>
                <button onClick={downloadKey} style={{...btnPrimary(),width:'100%'}}>
                  ↓ Download Key File
                </button>
              </div>
              {pskDownloaded && <button onClick={()=>setOnboardStep(4)} style={{...btnPrimary(),width:'100%'}}>Continue →</button>}
            </div>
          )}

          {/* Step 4: Verify PSK */}
          {onboardStep===4 && !pskVerified && (
            <div>
              <h2 style={{color:'#0f172a',fontSize:22,fontWeight:700,margin:'0 0 8px'}}>Verify Protocol Second Key</h2>
              <p style={{color:'#64748b',fontSize:14,margin:'0 0 24px',lineHeight:1.6}}>Paste your downloaded key below to confirm you've saved it correctly.</p>
              <div style={{...card,padding:24,marginBottom:20}}>
                <label style={labelStyle}>Paste Protocol Second Key</label>
                <textarea value={pskPasteInput} onChange={e=>setPskPasteInput(e.target.value)} placeholder="Paste your key here…" rows={4} style={{...inputStyle,resize:'none',height:100}}/>
                {pskVerifyError && <p style={{color:'#dc2626',fontSize:12,margin:'8px 0 0'}}>{pskVerifyError}</p>}
              </div>
              <button onClick={()=>verifyProtocolKeyText(pskPasteInput)} disabled={!pskPasteInput} style={{...btnPrimary(!!pskPasteInput),width:'100%'}}>
                Verify Key →
              </button>
            </div>
          )}

          {/* Step 5: Set QuFi username */}
          {onboardStep===5 && (
            <div>
              {!quantumUsernameSet ? (
                <>
                  <h2 style={{color:'#0f172a',fontSize:22,fontWeight:700,margin:'0 0 8px'}}>Set your QuFi username</h2>
                  <p style={{color:'#64748b',fontSize:14,margin:'0 0 24px',lineHeight:1.6}}>Others can send you funds using this name.</p>
                  <div style={{...card,padding:24,marginBottom:20}}>
                    <label style={labelStyle}>Username</label>
                    <div style={{position:'relative'}}>
                      <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'#94a3b8',fontSize:14,fontFamily:MONO}}>@</span>
                      <input value={quantumUsername} onChange={e=>{const v=e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'');setQuantumUsername(v);clearTimeout(usernameCheckRef.current);usernameCheckRef.current=setTimeout(()=>checkUsername(v),400)}} placeholder="satoshi" maxLength={20} style={{...inputStyle,paddingLeft:32,borderColor:quantumUsernameAvail===true?'#16a34a':quantumUsernameAvail===false?'#dc2626':'#e2e8f0'}}/>
                    </div>
                    <p style={{fontSize:11,margin:'6px 0 0',color:checkingUsername?'#94a3b8':quantumUsernameAvail===true?'#16a34a':quantumUsernameAvail===false?'#dc2626':'#94a3b8'}}>
                      {checkingUsername?'Checking…':quantumUsernameAvail===true?'✓ Available':quantumUsernameAvail===false?'✗ Already taken':'3–20 characters, lowercase'}
                    </p>
                  </div>
                  <div style={{display:'flex',gap:10}}>
                    <button onClick={()=>setQuantumUsernameSet(true)} style={{...btnSecondary}}>Skip for now</button>
                    <button onClick={saveQuantumUsername} disabled={!quantumUsernameAvail||quantumUsername.length<3} style={{...btnPrimary(!!quantumUsernameAvail&&quantumUsername.length>=3),flex:1}}>
                      Confirm Username →
                    </button>
                  </div>
                </>
              ) : (
                /* ── All done ── */
                <div style={{textAlign:'center'}}>
                  <div style={{width:64,height:64,borderRadius:'50%',background:'#f0fdf4',border:'2px solid #bbf7d0',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:28}}>✅</div>
                  <h2 style={{color:'#0f172a',fontSize:24,fontWeight:700,margin:'0 0 8px'}}>Account ready</h2>
                  <p style={{color:'#64748b',fontSize:14,margin:'0 0 8px',lineHeight:1.6}}>Your Bitcoin custody account is set up and secured.</p>
                  <p style={{color:'#94a3b8',fontSize:12,fontFamily:MONO,margin:'0 0 32px',wordBreak:'break-all'}}>
                    {result.vault_id}
                  </p>
                  <div style={{display:'flex',gap:10}}>
                    <a href="/home" style={{...btnPrimary(),flex:1,textDecoration:'none',justifyContent:'center'}}>
                      Go to Dashboard
                    </a>
                    <a href={`/deposit?vault=${result.vault_id}`} style={{...btnSecondary,textDecoration:'none'}}>
                      Deposit BTC
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── STEP: account — choose account type ──────────────────────────────────
  const STEPS = ['account'===step?0:'custody'===step?1:'confirm'===step?2:3]
  const stepIdx = step==='account'?0:step==='custody'?1:step==='confirm'?2:3

  return (
    <div style={{minHeight:'100vh',background:'#f5f6f8',fontFamily:FONT}}>
      <style>{`
        @keyframes fade-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* Sub-nav */}
      <div style={{background:'#fff',borderBottom:'1px solid #e2e8f0',padding:'0 48px',display:'flex',alignItems:'center',height:56,position:'sticky',top:64,zIndex:10}}>
        <nav style={{display:'flex',gap:0}}>
          {[{l:'Overview',h:'/home'},{l:'Accounts',h:'/dashboard'},{l:'Custody Vault',h:'/vault',a:true},{l:'Transfers',h:'/transfer'},{l:'Audit Trail',h:'/proofs/transfer'}].map(item=>(
            <a key={item.l} href={item.h} style={{padding:'0 18px',height:56,display:'flex',alignItems:'center',color:(item as any).a?'#0f172a':'#64748b',fontSize:13,fontWeight:(item as any).a?600:400,textDecoration:'none',borderBottom:(item as any).a?'2px solid #0f172a':'2px solid transparent'}}>{item.l}</a>
          ))}
        </nav>
      </div>

      <div style={{maxWidth:760,margin:'0 auto',padding:'48px 48px 80px'}}>

        {/* Header */}
        <div style={{marginBottom:40}}>
          <p style={{color:'#94a3b8',fontSize:11,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',margin:'0 0 8px'}}>Custody Account Setup</p>
          <h1 style={{color:'#0f172a',fontSize:28,fontWeight:700,margin:'0 0 6px',letterSpacing:'-0.03em'}}>Open a new account</h1>
          <p style={{color:'#64748b',fontSize:14,margin:0}}>Post-quantum secured · FIPS 204 ML-DSA-65 · Taproot Bitcoin</p>
        </div>

        <Stepper current={stepIdx} steps={['Account Type','Details','Review']} />

        {error && (
          <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'12px 16px',marginBottom:20,display:'flex',gap:8,alignItems:'flex-start'}}>
            <span style={{color:'#dc2626',fontSize:14,flexShrink:0}}>⚠</span>
            <p style={{color:'#dc2626',fontSize:13,margin:0}}>{error}</p>
          </div>
        )}

        {/* ── ACCOUNT TYPE ── */}
        {step==='account' && (
          <div style={{animation:'fade-up 0.35s ease both'}}>
            <p style={{color:'#64748b',fontSize:14,margin:'0 0 20px'}}>Choose the type of custody account you'd like to open.</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12,marginBottom:32}}>
              {ACCOUNT_TYPES.map(acc=>{
                const selected = accountType===acc.type
                const disabled = existingTypes.includes(acc.type)
                return (
                  <div key={acc.type} onClick={()=>!disabled&&!acc.comingSoon&&setAccountType(acc.type)} style={{
                    ...card, padding:20, cursor:disabled||acc.comingSoon?'not-allowed':'pointer',
                    opacity:disabled||acc.comingSoon?0.5:1,
                    border:`2px solid ${selected?acc.color:'#e2e8f0'}`,
                    background:selected?`${acc.color}06`:'#fff',
                    transition:'all 0.15s', position:'relative',
                  }}
                    onMouseEnter={e=>{if(!disabled&&!acc.comingSoon){(e.currentTarget as HTMLElement).style.borderColor=selected?acc.color:'#cbd5e1';(e.currentTarget as HTMLElement).style.transform='translateY(-2px)'}}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=selected?acc.color:'#e2e8f0';(e.currentTarget as HTMLElement).style.transform='none'}}>
                    {acc.comingSoon && (
                      <span style={{position:'absolute',top:10,right:10,...badge('#64748b','#f8fafc','#e2e8f0'),fontSize:9}}>Soon</span>
                    )}
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                      <span style={{fontSize:22}}>{acc.icon}</span>
                      <span style={{...badge(acc.color,`${acc.color}12`,`${acc.color}30`)}}>{acc.tag}</span>
                    </div>
                    <p style={{color:'#0f172a',fontWeight:600,fontSize:14,margin:'0 0 6px'}}>{acc.title}</p>
                    <p style={{color:'#64748b',fontSize:12,margin:0,lineHeight:1.5}}>{acc.desc}</p>
                    {disabled && <p style={{color:'#94a3b8',fontSize:10,margin:'8px 0 0',fontFamily:MONO}}>Already open</p>}
                    {selected && (
                      <div style={{position:'absolute',top:10,right:acc.comingSoon?60:10,width:20,height:20,borderRadius:'50%',background:acc.color,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <span style={{color:'#fff',fontSize:11,fontWeight:700}}>✓</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Existing wallet: need password for additional account */}
            {hasExisting && accountType && (
              <div style={{...card,padding:20,marginBottom:20}}>
                <p style={{color:'#0f172a',fontWeight:600,fontSize:14,margin:'0 0 4px'}}>Existing wallet detected</p>
                <p style={{color:'#64748b',fontSize:13,margin:'0 0 16px'}}>Enter your wallet password to derive a new account from the same recovery phrase.</p>
                {!useRecovery ? (
                  <>
                    <input type="password" value={existingMnemonic} onChange={e=>setExistingMnemonic(e.target.value)} placeholder="Wallet password" style={inputStyle}/>
                    <button onClick={()=>setUseRecovery(true)} style={{background:'none',border:'none',color:'#94a3b8',fontSize:12,cursor:'pointer',marginTop:8,padding:0,fontFamily:'inherit'}}>
                      Use 24-word recovery phrase instead
                    </button>
                  </>
                ) : (
                  <>
                    <textarea value={recoveryPhrase} onChange={e=>setRecoveryPhrase(e.target.value)} placeholder="Enter your 24 words separated by spaces…" rows={3} style={{...inputStyle,resize:'none'}}/>
                    <button onClick={()=>setUseRecovery(false)} style={{background:'none',border:'none',color:'#94a3b8',fontSize:12,cursor:'pointer',marginTop:8,padding:0,fontFamily:'inherit'}}>
                      Use wallet password instead
                    </button>
                  </>
                )}
              </div>
            )}

            <div style={{display:'flex',justifyContent:'flex-end'}}>
              <button onClick={()=>{if(!accountType)return;if(!isSelfCustody)setStep('custody');else setStep('confirm')}} disabled={!accountType} style={{...btnPrimary(!!accountType),minWidth:160}}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── CUSTODY PREFERENCE ── */}
        {step==='custody' && (
          <div style={{animation:'fade-up 0.35s ease both'}}>
            <p style={{color:'#64748b',fontSize:14,margin:'0 0 20px'}}>Select your custody provider for institutional-grade digital asset management.</p>
            <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:32}}>
              {CUSTODY_OPTS.map(opt=>{
                const sel = custodyPref===opt.type
                return (
                  <div key={opt.type} onClick={()=>setCustodyPref(opt.type)} style={{...card,padding:'16px 20px',cursor:'pointer',border:`2px solid ${sel?'#0f172a':'#e2e8f0'}`,display:'flex',alignItems:'center',gap:14,transition:'all 0.15s'}}>
                    <span style={{fontSize:24,flexShrink:0}}>{opt.icon}</span>
                    <div style={{flex:1}}>
                      <p style={{color:'#0f172a',fontWeight:600,fontSize:14,margin:'0 0 4px'}}>{opt.label}</p>
                      <p style={{color:'#64748b',fontSize:13,margin:0}}>{opt.desc}</p>
                    </div>
                    <div style={{width:20,height:20,borderRadius:'50%',border:`2px solid ${sel?'#0f172a':'#e2e8f0'}`,background:sel?'#0f172a':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      {sel && <span style={{color:'#fff',fontSize:11,fontWeight:700}}>✓</span>}
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{display:'flex',gap:12,justifyContent:'space-between'}}>
              <button onClick={()=>setStep('account')} style={btnSecondary}>← Back</button>
              <button onClick={()=>setStep('confirm')} style={{...btnPrimary(),minWidth:160}}>Continue →</button>
            </div>
          </div>
        )}

        {/* ── CONFIRM / IDENTITY ── */}
        {step==='confirm' && (
          <div style={{animation:'fade-up 0.35s ease both'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24}}>
              {/* Account summary */}
              <div style={{...card,padding:20}}>
                <p style={{color:'#94a3b8',fontSize:11,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',margin:'0 0 16px'}}>Account Summary</p>
                {[
                  {l:'Account Type', v:ACCOUNT_TYPES.find(a=>a.type===accountType)?.title??'—'},
                  {l:'Custody',      v:isSelfCustody?'QuFi Self-Custody':CUSTODY_OPTS.find(c=>c.type===custodyPref)?.label??'—'},
                  {l:'Signing',      v:'ML-DSA-65 (FIPS 204)'},
                  {l:'Bitcoin',      v:'Taproot P2TR'},
                  {l:'Network',      v:'Testnet 4'},
                ].map(row=>(
                  <div key={row.l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid #f1f5f9'}}>
                    <p style={{color:'#64748b',fontSize:12,margin:0}}>{row.l}</p>
                    <p style={{color:'#0f172a',fontSize:12,fontWeight:600,margin:0,fontFamily:MONO}}>{row.v}</p>
                  </div>
                ))}
              </div>

              {/* Identity */}
              <div style={{...card,padding:20}}>
                <p style={{color:'#94a3b8',fontSize:11,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',margin:'0 0 16px'}}>Your Identity</p>
                <div style={{marginBottom:14}}>
                  <label style={labelStyle}>Username <span style={{color:'#dc2626'}}>*</span></label>
                  <div style={{position:'relative'}}>
                    <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'#94a3b8',fontSize:14,fontFamily:MONO}}>@</span>
                    <input value={username} onChange={e=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))} placeholder="satoshi" maxLength={20}
                      style={{...inputStyle,paddingLeft:32,borderColor:username.length>=3?'#16a34a':'#e2e8f0'}}/>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Email <span style={{color:'#dc2626'}}>*</span></label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@firm.com"
                    style={{...inputStyle,borderColor:email.includes('@')?'#16a34a':'#e2e8f0'}}/>
                </div>
              </div>
            </div>

            <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:8,padding:'12px 16px',marginBottom:24}}>
              <p style={{color:'#1e40af',fontSize:13,margin:0,lineHeight:1.6}}>
                A post-quantum wallet will be generated in your browser. No private keys are sent to our servers.
              </p>
            </div>

            <div style={{display:'flex',gap:12,justifyContent:'space-between'}}>
              <button onClick={()=>isSelfCustody?setStep('account'):setStep('custody')} style={btnSecondary}>← Back</button>
              <button onClick={createAccount} disabled={loading||!canProceed} style={{...btnPrimary(!loading&&canProceed),minWidth:180}}>
                {loading ? (
                  <span style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{width:16,height:16,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin 0.8s linear infinite',display:'inline-block'}}/>
                    Generating wallet…
                  </span>
                ) : 'Create Account →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function InstitutionalVault() {
  return (
    <Suspense fallback={
      <div style={{minHeight:'100vh',background:'#f5f6f8',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Inter',-apple-system,sans-serif"}}>
        <div style={{textAlign:'center'}}>
          <div style={{position:'relative',width:40,height:40,margin:'0 auto 12px'}}>
            <div style={{position:'absolute',inset:0,borderRadius:'50%',border:'2px solid #e2e8f0',borderTopColor:'#0f172a',animation:'spin 0.9s linear infinite'}}/>
          </div>
          <p style={{color:'#94a3b8',fontSize:12}}>Loading…</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    }>
      <InstitutionalVaultInner />
    </Suspense>
  )
}

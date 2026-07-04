'use client'
import { useState, useEffect, useRef } from 'react'
import { API_URL } from '../lib/supabase'
import { Icons } from './Icons'
import { loadWallet, hasStoredWallet } from '../lib/wallet/storage'
import { useRouter } from 'next/navigation'

// ── Shared style tokens ──────────────────────────────────────────────────────
const S = {
  page:    { minHeight: '100vh', background: '#f5f6f8', fontFamily: "'Inter',-apple-system,system-ui,sans-serif" },
  card:    { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  label:   { color: '#94a3b8', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const },
  h2:      { color: '#0f172a', fontSize: 15, fontWeight: 600, margin: '0 0 4px', letterSpacing: '-0.01em' },
  muted:   { color: '#64748b', fontSize: 13 },
  mono:    { fontFamily: "'JetBrains Mono',monospace" },
  badge: (color: string, bg: string, border: string) => ({
    display: 'inline-flex' as const, alignItems: 'center' as const, gap: 5,
    padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600,
    letterSpacing: '0.06em', textTransform: 'uppercase' as const,
    color, background: bg, border: `1px solid ${border}`,
  }),
}

function hov(el: HTMLElement, enter: boolean) {
  el.style.borderColor     = enter ? '#cbd5e1' : '#e2e8f0'
  el.style.boxShadow       = enter ? '0 4px 16px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.05)'
  el.style.transform       = enter ? 'translateY(-2px)' : 'none'
}

export function InstitutionalDashboard() {
  const router = useRouter()
  const [vaults,      setVaults]      = useState<any[]>([])
  const [stablecoins, setStablecoins] = useState<any[]>([])
  const [btcPrice,    setBtcPrice]    = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [scanning,    setScanning]    = useState<string | null>(null)
  const [scanResult,  setScanResult]  = useState<Record<string,string>>({})
  const [hasWallet,   setHasWallet]   = useState(false)
  const [name,        setName]        = useState('')
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    hasStoredWallet().then(setHasWallet)
    setName(localStorage.getItem('qufi_name') || '')
  }, [])

  useEffect(() => {
    loadAll()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (vaults.some(v => v.status === 'pending_deposit')) {
      pollRef.current = setInterval(async () => {
        for (const v of vaults.filter(v => v.status === 'pending_deposit')) {
          await scanVault(v.vault_id, true)
        }
      }, 30_000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [vaults])

  const loadAll = async () => {
    setLoading(true)
    try {
      const wallet = await loadWallet()
      const pubkey = wallet?.publicKeys?.dilithium || ''
      const dashUrl = pubkey ? `${API_URL}/dashboard?user_pubkey=${encodeURIComponent(pubkey)}` : `${API_URL}/dashboard`
      const [dashRes, scRes, priceRes] = await Promise.all([
        fetch(dashUrl), fetch(`${API_URL}/stablecoins`), fetch(`${API_URL}/price`),
      ])
      setVaults((await dashRes.json()).vaults || [])
      setStablecoins((await scRes.json()).stablecoins || [])
      setBtcPrice(parseFloat((await priceRes.json()).btc_usd) || 0)
    } catch {}
    setLoading(false)
  }

  const scanVault = async (vaultId: string, silent = false) => {
    if (!silent) setScanning(vaultId)
    try {
      const res  = await fetch(`${API_URL}/deposit/scan`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({vault_id:vaultId}) })
      const data = await res.json()
      if (data.found) { setScanResult(p => ({...p,[vaultId]:`${data.amount_btc} BTC confirmed`})); await loadAll() }
      else if (!silent) setScanResult(p => ({...p,[vaultId]:'No deposit found yet.'}))
    } catch { if (!silent) setScanResult(p => ({...p,[vaultId]:'Scan failed'})) }
    if (!silent) setScanning(null)
  }

  const getScBal = (t:string,c:string) => stablecoins.filter(s=>s.account_type===t&&s.currency===c).reduce((a,x)=>a+parseFloat(x.balance||'0'),0)
  const getScDep = (t:string,c:string) => stablecoins.filter(s=>s.account_type===t&&s.currency===c).reduce((a,x)=>a+parseFloat(x.deposited_amount||'0'),0)

  const totalBtc   = vaults.reduce((s,v)=>s+(v.btc_amount_sats||0)/1e8,0)
  const totalUbtc  = vaults.reduce((s,v)=>s+parseFloat(v.ubtc_minted||'0'),0)
  const totalUusdt = vaults.reduce((s,v)=>s+getScBal(v.account_type,'UUSDT'),0)
  const totalUusdc = vaults.reduce((s,v)=>s+getScBal(v.account_type,'UUSDC'),0)
  const totalUsd   = totalBtc * btcPrice
  const mintable   = Math.max(0, (totalUsd/1.5)-totalUbtc)

  const fmt    = (n:number,d=2) => n.toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d})
  const fmtInt = (n:number)    => n.toLocaleString(undefined,{maximumFractionDigits:0})
  const now = new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})

  const typeLabel: Record<string,string> = {
    current:'Current', savings:'Savings', yield:'Yield',
    custody_yield:'Custody Yield', prime:'Prime', managed_yield:'Managed Yield',
  }

  if (loading) return (
    <div style={{...S.page, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{position:'relative',width:48,height:48,margin:'0 auto 16px'}}>
          <div style={{position:'absolute',inset:0,borderRadius:'50%',border:'2px solid #e2e8f0',borderTopColor:'#0f172a',animation:'spin 0.9s linear infinite'}}/>
        </div>
        <p style={{color:'#94a3b8',fontSize:12}}>Loading portfolio…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fade-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .inst-card{transition:border-color 0.15s,box-shadow 0.15s,transform 0.15s;}
      `}</style>

      {/* ── Sticky sub-nav ── */}
      <div style={{background:'#fff',borderBottom:'1px solid #e2e8f0',padding:'0 48px',display:'flex',alignItems:'center',justifyContent:'space-between',height:56,position:'sticky',top:64,zIndex:10}}>
        <nav style={{display:'flex',gap:0}}>
          {[{l:'Overview',h:'/home',a:false},{l:'Accounts',h:'/dashboard',a:true},{l:'Custody Vault',h:'/vault',a:false},{l:'Transfers',h:'/transfer',a:false},{l:'Audit Trail',h:'/proofs/transfer',a:false}].map(item=>(
            <a key={item.l} href={item.h} style={{padding:'0 18px',height:56,display:'flex',alignItems:'center',color:item.a?'#0f172a':'#64748b',fontSize:13,fontWeight:item.a?600:400,textDecoration:'none',borderBottom:item.a?'2px solid #0f172a':'2px solid transparent',transition:'color 0.15s'}}>{item.l}</a>
          ))}
        </nav>
        <button onClick={loadAll} style={{background:'none',border:'1px solid #e2e8f0',borderRadius:6,padding:'6px 14px',color:'#64748b',fontSize:12,cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s'}}>
          Refresh
        </button>
      </div>

      <div style={{maxWidth:1080,margin:'0 auto',padding:'48px 48px 80px'}}>

        {/* Header */}
        <div style={{marginBottom:40}}>
          <p style={{...S.label,margin:'0 0 8px'}}>{now}</p>
          <h1 style={{color:'#0f172a',fontSize:32,fontWeight:700,margin:'0 0 8px',letterSpacing:'-0.03em'}}>
            {name ? `Good morning, ${name}.` : 'Portfolio Overview'}
          </h1>
          <p style={{...S.muted,margin:0}}>
            {vaults.length > 0 ? 'Your digital asset portfolio is secured and operational.' : 'Open your first account to get started.'}
          </p>
        </div>

        {/* Summary stats */}
        {vaults.length > 0 && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16,marginBottom:36}}>
            {[
              {label:'Total Value',value:'$'+fmt(totalUsd),sub:'USD equivalent'},
              {label:'BTC Locked',value:totalBtc.toFixed(6),sub:'Bitcoin collateral'},
              {label:'UBTC Minted',value:'$'+fmtInt(totalUbtc),sub:'Stablecoin balance'},
              {label:'UUSDT',value:'$'+fmtInt(totalUusdt),sub:'Tether'},
              {label:'UUSDC',value:'$'+fmtInt(totalUusdc),sub:'USD Coin'},
            ].map(s=>(
              <div key={s.label} style={{...S.card,padding:'20px 22px',animation:'fade-up 0.4s ease both'}}>
                <p style={{...S.label,margin:'0 0 8px'}}>{s.label}</p>
                <p style={{color:'#0f172a',fontSize:22,fontWeight:700,margin:'0 0 4px',letterSpacing:'-0.02em',fontFamily:"'JetBrains Mono',monospace"}}>{s.value}</p>
                <p style={{color:'#94a3b8',fontSize:11,margin:0}}>{s.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {vaults.length === 0 && (
          <div style={{...S.card,padding:'48px',textAlign:'center',animation:'fade-up 0.4s ease both'}}>
            <div style={{width:56,height:56,borderRadius:16,background:'#f1f5f9',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
            </div>
            <h2 style={{...S.h2,fontSize:18,marginBottom:8}}>
              {hasWallet ? 'Wallet ready — open your first account' : 'Get started in 3 steps'}
            </h2>
            <p style={{...S.muted,maxWidth:400,margin:'0 auto 28px',lineHeight:1.6}}>
              {hasWallet
                ? 'Your keys are secured. Open a custody account to deposit Bitcoin and issue stablecoins.'
                : 'Create a wallet, open an account, and deposit Bitcoin. Takes under 2 minutes.'}
            </p>
            <a href="/vault" style={{display:'inline-flex',alignItems:'center',gap:8,background:'#0f172a',color:'#fff',textDecoration:'none',borderRadius:8,padding:'12px 24px',fontSize:14,fontWeight:600,fontFamily:'inherit',transition:'background 0.15s'}}
              onMouseEnter={e=>(e.currentTarget.style.background='#1e293b')}
              onMouseLeave={e=>(e.currentTarget.style.background='#0f172a')}>
              Open Custody Account →
            </a>
          </div>
        )}

        {/* Vault cards */}
        {vaults.length > 0 && (
          <>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <h2 style={{...S.h2,fontSize:15}}>Custody Accounts</h2>
              <a href="/vault" style={{display:'inline-flex',alignItems:'center',gap:6,background:'none',border:'1px solid #e2e8f0',borderRadius:6,padding:'6px 14px',color:'#64748b',fontSize:12,textDecoration:'none',fontFamily:'inherit',transition:'all 0.15s'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='#cbd5e1';e.currentTarget.style.color='#0f172a'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.color='#64748b'}}>
                + New Account
              </a>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(460px,1fr))',gap:16}}>
              {vaults.map(vault => {
                const btcLocked = vault.btc_amount_sats/1e8
                const btcValue  = btcLocked*btcPrice
                const ubtcBal   = parseFloat(vault.ubtc_minted||'0')
                const uusdtBal  = getScBal(vault.account_type,'UUSDT')
                const uusdcBal  = getScBal(vault.account_type,'UUSDC')
                const uusdtDep  = getScDep(vault.account_type,'UUSDT')
                const uusdcDep  = getScDep(vault.account_type,'UUSDC')
                const mnt       = Math.max(0,(btcValue/1.5)-ubtcBal)
                const ratio     = ubtcBal>0 ? btcValue/ubtcBal*100 : 0
                const isPending = vault.status==='pending_deposit'
                const isScanning= scanning===vault.vault_id
                const thisScan  = scanResult[vault.vault_id]

                return (
                  <div key={vault.vault_id} className="inst-card" style={{...S.card,overflow:'hidden'}}
                    onMouseEnter={e=>hov(e.currentTarget as HTMLElement,true)}
                    onMouseLeave={e=>hov(e.currentTarget as HTMLElement,false)}>

                    {/* Pending deposit banner */}
                    {isPending && (
                      <div style={{background:'#fffbeb',borderBottom:'1px solid #fde68a',padding:'14px 20px'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <div style={{width:6,height:6,borderRadius:'50%',background:'#d97706',animation:'pulse-dot 2s ease infinite',flexShrink:0}}/>
                            <p style={{color:'#92400e',fontSize:11,margin:0,fontWeight:500}}>Awaiting Bitcoin deposit · checking every 30s</p>
                          </div>
                          <button onClick={()=>scanVault(vault.vault_id)} disabled={isScanning} style={{display:'flex',alignItems:'center',gap:5,background:'#d97706',color:'#fff',border:'none',borderRadius:6,padding:'6px 12px',fontSize:10,fontWeight:600,cursor:isScanning?'not-allowed':'pointer',opacity:isScanning?0.6:1,fontFamily:'inherit',letterSpacing:'0.04em'}}>
                            {isScanning ? 'Scanning…' : 'Scan Now'}
                          </button>
                        </div>
                        {thisScan && <p style={{fontSize:11,margin:'8px 0 0',color:thisScan.includes('BTC')?'#16a34a':'#64748b'}}>{thisScan}</p>}
                        <div style={{marginTop:12,background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,padding:'10px 14px'}}>
                          <p style={{...S.label,margin:'0 0 4px'}}>Send BTC to</p>
                          <p style={{color:'#0f172a',fontSize:10,margin:0,fontFamily:"'JetBrains Mono',monospace",wordBreak:'break-all',lineHeight:1.7}}>{vault.mast_address||vault.deposit_address}</p>
                        </div>
                      </div>
                    )}

                    {/* Card header */}
                    <div style={{padding:'22px 24px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div style={{display:'flex',alignItems:'center',gap:14}}>
                        <div style={{width:44,height:44,borderRadius:10,background:'#f8fafc',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          {Icons.currentAccount(22,'#1e40af')}
                        </div>
                        <div>
                          <p style={{color:'#0f172a',fontWeight:600,fontSize:15,margin:'0 0 6px'}}>{typeLabel[vault.account_type]??'Current'} Account</p>
                          <div style={{display:'flex',gap:6}}>
                            <span style={S.badge('#1e40af','#eff6ff','#bfdbfe')}>Self-Custody</span>
                            <span style={S.badge(isPending?'#92400e':'#166534',isPending?'#fffbeb':'#f0fdf4',isPending?'#fde68a':'#bbf7d0')}>
                              {isPending ? 'Pending' : 'Active'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <p style={{color:'#0f172a',fontWeight:700,fontSize:24,margin:'0 0 2px',letterSpacing:'-0.02em',fontFamily:"'JetBrains Mono',monospace"}}>${fmt(btcValue)}</p>
                        <p style={{color:'#94a3b8',fontSize:11,margin:0}}>{btcLocked.toFixed(6)} BTC locked</p>
                        {ratio>0 && <p style={{color:ratio>=200?'#16a34a':ratio>=150?'#d97706':'#dc2626',fontSize:11,margin:'2px 0 0'}}>{ratio.toFixed(0)}% collateral ratio</p>}
                        {mnt>0 && <p style={{color:'#d97706',fontSize:11,margin:'2px 0 0'}}>${fmt(mnt)} mintable</p>}
                      </div>
                    </div>

                    {/* Asset rows */}
                    <div style={{padding:'12px 16px'}}>
                      {[
                        {name:'UBTC',sub:`${btcLocked.toFixed(4)} BTC · ${ratio>0?ratio.toFixed(0)+'%':'—'}`,val:`$${fmtInt(ubtcBal)}`,color:'#d97706',href:null},
                        {name:'UUSDT',sub:uusdtDep>0?`$${fmt(uusdtDep)} locked`:'Not added',val:uusdtBal>0?`$${fmtInt(uusdtBal)}`:null,color:'#16a34a',href:`/deposit?vault=${vault.vault_id}&currency=uusdt`},
                        {name:'UUSDC',sub:uusdcDep>0?`$${fmt(uusdcDep)} locked`:'Not added',val:uusdcBal>0?`$${fmtInt(uusdcBal)}`:null,color:'#0891b2',href:`/deposit?vault=${vault.vault_id}&currency=uusdc`},
                      ].map(row=>(
                        <div key={row.name} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 12px',borderRadius:8,marginBottom:4,background:'#f8fafc',border:'1px solid #f1f5f9'}}>
                          <div style={{width:34,height:34,borderRadius:8,background:`${row.color}12`,border:`1px solid ${row.color}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            <span style={{color:row.color,fontSize:12,fontWeight:700}}>{row.name[1]}</span>
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <p style={{color:'#0f172a',fontWeight:600,fontSize:13,margin:'0 0 2px'}}>{row.name}</p>
                            <p style={{color:'#94a3b8',fontSize:10,margin:0,fontFamily:"'JetBrains Mono',monospace"}}>{row.sub}</p>
                          </div>
                          {row.val
                            ? <p style={{color:row.color,fontWeight:700,fontSize:14,margin:0,fontFamily:"'JetBrains Mono',monospace"}}>{row.val}</p>
                            : row.href && <a href={row.href} style={{color:row.color,fontSize:10,fontWeight:600,textDecoration:'none',border:`1px solid ${row.color}33`,borderRadius:6,padding:'4px 10px',fontFamily:'inherit',background:`${row.color}08`}}>+ Add</a>
                          }
                        </div>
                      ))}

                      <a href={`/account/${vault.vault_id}`} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:7,marginTop:10,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'11px',fontSize:12,fontWeight:600,color:'#475569',textDecoration:'none',transition:'all 0.15s',fontFamily:'inherit'}}
                        onMouseEnter={e=>{e.currentTarget.style.background='#f1f5f9';e.currentTarget.style.borderColor='#cbd5e1';e.currentTarget.style.color='#0f172a'}}
                        onMouseLeave={e=>{e.currentTarget.style.background='#f8fafc';e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.color='#475569'}}>
                        Manage Account
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Disclosure */}
        {vaults.length > 0 && (
          <div style={{marginTop:48,paddingTop:24,borderTop:'1px solid #e2e8f0'}}>
            <p style={{color:'#94a3b8',fontSize:11,lineHeight:1.7,margin:0,maxWidth:700}}>
              <strong style={{color:'#64748b'}}>Important notice:</strong> Bitcoin consensus currently uses secp256k1 cryptography. QuFi adds post-quantum owner authorisation at the application layer. It does not modify Bitcoin consensus or claim quantum resistance on-chain.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

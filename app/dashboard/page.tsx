'use client'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { API_URL } from '../lib/supabase'
import { QuantumLoader } from '../components/QuantumLoader'
import { Icons } from '../components/Icons'
import { useIsMobile } from '../lib/useIsMobile'
import { loadWallet, hasStoredWallet } from '../lib/wallet/storage'

const stagger = { animate: { transition: { staggerChildren: 0.07 } } }
const cardVariant = { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0, transition: { duration: 0.45 } } }

function StatPill({ label, value, color, glow }: { label: string; value: string; color: string; glow: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '5px',
      padding: '14px 20px',
      background: `linear-gradient(135deg,${color}0d,${color}04)`,
      border: `1px solid ${color}22`,
      borderRadius: '16px',
      minWidth: '116px',
      boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 ${color}12`,
      transition: 'transform 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.2s',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 40px rgba(0,0,0,0.5), 0 0 24px ${glow}22, inset 0 1px 0 ${color}18` }}
    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 ${color}12` }}
    >
      <p style={{ color: 'rgba(120,160,220,0.5)', display: 'block', margin: 0, fontSize: '10px', fontWeight: '500', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{label}</p>
      <p style={{ color, fontSize: '16px', fontWeight: '700', margin: 0, fontFamily: 'var(--font-syne)', letterSpacing: '-0.02em', textShadow: `0 0 20px ${glow}` }}>{value}</p>
    </div>
  )
}

function AssetRow({ icon, name, subtitle, value, color, addHref }: {
  icon: React.ReactNode; name: string; subtitle: string; value: string | null; color: string; addHref?: string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '13px 16px',
      background: 'linear-gradient(135deg,#050f20,#020810)',
      borderRadius: '14px', marginBottom: '6px',
      border: '1px solid rgba(0,212,255,0.08)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
      transition: 'background 0.2s',
    }}>
      <div style={{
        width: '38px', height: '38px', borderRadius: '11px',
        background: color + '14', border: `1px solid ${color}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: 'var(--q-text)', fontWeight: '600', fontSize: '13px', margin: '0 0 2px' }}>{name}</p>
        <p className="number" style={{ color: 'var(--q-text-3)', fontSize: '10px', margin: 0, letterSpacing: '0.03em' }}>{subtitle}</p>
      </div>
      {value !== null
        ? <p className="number" style={{ color, fontWeight: '700', fontSize: '15px', margin: 0, flexShrink: 0 }}>{value}</p>
        : addHref
          ? <a href={addHref} style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: color + '12', border: `1px solid ${color}28`,
              color, textDecoration: 'none', borderRadius: '8px',
              padding: '5px 12px', fontSize: '10px', fontWeight: '700',
              fontFamily: 'var(--font-mono)', flexShrink: 0, letterSpacing: '0.05em',
            }}>
              {Icons.plus(10, color)} Add
            </a>
          : null
      }
    </div>
  )
}

function DashboardConsumer() {
  const [vaults, setVaults]           = useState<any[]>([])
  const [stablecoins, setStablecoins] = useState<any[]>([])
  const [btcPrice, setBtcPrice]       = useState(0)
  const [loading, setLoading]         = useState(true)
  const [scanning, setScanning]       = useState<string | null>(null)
  const [scanResult, setScanResult]   = useState<Record<string, string>>({})
  const [hasWallet, setHasWallet]     = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const isMobile = useIsMobile()

  useEffect(() => { hasStoredWallet().then(setHasWallet) }, [])
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
      const dash  = await dashRes.json()
      const sc    = await scRes.json()
      const price = await priceRes.json()
      setVaults(dash.vaults || [])
      setStablecoins(sc.stablecoins || [])
      setBtcPrice(parseFloat(price.btc_usd) || 0)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const scanVault = async (vaultId: string, silent = false) => {
    if (!silent) setScanning(vaultId)
    try {
      const res  = await fetch(`${API_URL}/deposit/scan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vault_id: vaultId }) })
      const data = await res.json()
      if (data.found) {
        setScanResult(prev => ({ ...prev, [vaultId]: `${data.amount_btc} BTC confirmed` }))
        await loadAll()
      } else if (!silent) {
        setScanResult(prev => ({ ...prev, [vaultId]: 'No deposit found yet.' }))
      }
    } catch {
      if (!silent) setScanResult(prev => ({ ...prev, [vaultId]: 'Scan failed' }))
    }
    if (!silent) setScanning(null)
  }

  const getScBal = (type: string, cur: string) =>
    stablecoins.filter(s => s.account_type === type && s.currency === cur).reduce((s, x) => s + parseFloat(x.balance || '0'), 0)
  const getScDep = (type: string, cur: string) =>
    stablecoins.filter(s => s.account_type === type && s.currency === cur).reduce((s, x) => s + parseFloat(x.deposited_amount || '0'), 0)

  const totalBtcLocked  = vaults.reduce((s, v) => s + (v.btc_amount_sats || 0) / 1e8, 0)
  const totalUbtc       = vaults.reduce((s, v) => s + parseFloat(v.ubtc_minted || '0'), 0)
  const totalUusdt      = vaults.reduce((s, v) => s + getScBal(v.account_type, 'UUSDT'), 0)
  const totalUusdc      = vaults.reduce((s, v) => s + getScBal(v.account_type, 'UUSDC'), 0)
  const totalUsd        = totalBtcLocked * btcPrice
  const availableToMint = Math.max(0, (totalUsd / 1.5) - totalUbtc)

  const fmt    = (n: number, d = 2) => n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })
  const fmtInt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 })

  if (loading) return <QuantumLoader text="Loading portfolio" />

  const accountTypeLabel: Record<string, string> = {
    current: 'Current', savings: 'Savings', yield: 'Yield',
    custody_yield: 'Custody Yield', prime: 'Prime', managed_yield: 'Managed Yield',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--q-bg)', fontFamily: 'var(--font-display)', position: 'relative', overflow: 'hidden' }}>

      {/* Quantum vortex background */}
      <div className="q-vortex-scene">
        <div className="q-glow-node" style={{ top: '-10%', left: '25%', width: 900, height: 900, background: 'rgba(0,212,255,0.04)' }} />
        <div className="q-glow-node" style={{ bottom: '-5%', right: '10%', width: 700, height: 700, background: 'rgba(124,58,255,0.05)' }} />
        <div className="q-circuit-grid" style={{ position: 'absolute', inset: 0, opacity: 0.5 }} />
        <div className="q-ring-1" style={{ opacity: 0.4, width: 1200, height: 1200, margin: '-600px 0 0 -600px' }} />
        <div className="q-ring-2" style={{ opacity: 0.5 }} />
        <div className="q-vortex-core" style={{ opacity: 0.4 }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%' }}>
          <div className="q-energy-ring" style={{ animationDuration: '9s' }} />
          <div className="q-energy-ring" style={{ animationDuration: '9s', animationDelay: '3s' }} />
        </div>
      </div>

      {/* ── Hero ── */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            padding: isMobile ? '28px 20px 32px' : '40px 48px 36px',
            borderBottom: '1px solid rgba(0,212,255,0.08)',
            background: 'transparent',
          }}
        >
          <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
            <p className="label" style={{ display: 'block', marginBottom: '10px', letterSpacing: '0.22em' }}>
              Portfolio · Live BTC Price
            </p>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <p style={{
                fontSize: isMobile ? '44px' : '68px',
                fontWeight: '700', color: 'var(--q-text)',
                lineHeight: '1', letterSpacing: '-0.03em',
                fontFamily: 'var(--font-syne)',
                textShadow: '0 0 80px rgba(0,212,255,0.12)',
                margin: 0,
              }}>
                ${fmt(totalUsd)}
              </p>
              {availableToMint > 0 && (
                <p className="number" style={{
                  color: 'var(--q-green)', fontSize: '14px', fontWeight: '600',
                  marginBottom: '8px',
                  textShadow: '0 0 20px rgba(0,255,157,0.3)',
                }}>
                  +${fmt(availableToMint)} mintable
                </p>
              )}
            </div>

            {/* Stat pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '20px' }}>
              <StatPill label="BTC locked"  value={totalBtcLocked.toFixed(6)} color="var(--q-btc)"     glow="rgba(255,184,0,0.4)" />
              <StatPill label="UBTC"        value={'$' + fmtInt(totalUbtc)}   color="var(--q-electric)" glow="rgba(0,212,255,0.4)" />
              <StatPill label="UUSDT"       value={'$' + fmtInt(totalUusdt)}  color="var(--q-green)"    glow="rgba(0,255,157,0.4)" />
              <StatPill label="UUSDC"       value={'$' + fmtInt(totalUusdc)}  color="var(--q-cyan)"     glow="rgba(0,255,224,0.4)" />
              <StatPill label="BTC price"   value={'$' + fmtInt(btcPrice)}    color="var(--q-text-3)"   glow="rgba(100,140,200,0.3)" />
            </div>
          </div>
        </motion.div>

        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: isMobile ? '20px 16px 48px' : '28px 48px 60px', position: 'relative', zIndex: 1 }}>

          {/* ── Empty state ── */}
          {vaults.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              {hasWallet ? (
                <div style={{
                  background: 'rgba(255,184,0,0.05)',
                  border: '1px solid rgba(255,184,0,0.22)',
                  borderRadius: '22px', padding: isMobile ? '32px 24px' : '48px 40px',
                  textAlign: 'center',
                  backdropFilter: 'blur(30px)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '16px',
                    background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px', fontSize: '26px',
                  }}>⚠</div>
                  <p style={{ fontFamily: 'var(--font-syne)', color: 'var(--q-btc)', fontSize: '18px', fontWeight: '700', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                    Wallet ready — no account yet
                  </p>
                  <p style={{ color: 'var(--q-text-3)', fontSize: '12px', fontFamily: 'var(--font-mono)', margin: '0 0 28px', lineHeight: '1.8' }}>
                    Your keys are safe. Open an account to continue.
                  </p>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a href="/vault" style={{
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      background: 'var(--q-btc)', color: '#000',
                      textDecoration: 'none', borderRadius: '14px',
                      padding: '14px 28px', fontSize: '14px', fontWeight: '800',
                      fontFamily: 'var(--font-syne)',
                      boxShadow: '0 0 30px rgba(255,184,0,0.3)',
                    }}>
                      Open Account →
                    </a>
                    <button onClick={loadAll} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      background: 'transparent', border: '1px solid var(--q-border)',
                      color: 'var(--q-text-3)', borderRadius: '14px',
                      padding: '14px 22px', fontSize: '13px', fontWeight: '600',
                      cursor: 'pointer', fontFamily: 'var(--font-display)',
                    }}>
                      {Icons.refresh(14, 'var(--q-text-3)')} Refresh
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(5,15,40,0.6)',
                  border: '1px dashed rgba(0,212,255,0.15)',
                  borderRadius: '22px', padding: isMobile ? '36px 24px' : '56px 44px',
                  textAlign: 'center', backdropFilter: 'blur(30px)',
                }}>
                  <p style={{ fontFamily: 'var(--font-syne)', color: 'var(--q-text)', fontSize: '18px', fontWeight: '700', margin: '0 0 10px' }}>
                    Get started in 3 steps
                  </p>
                  <p className="number" style={{ color: 'var(--q-text-3)', fontSize: '12px', margin: '0 0 36px', letterSpacing: '0.04em' }}>
                    First account takes about 2 minutes
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '540px', margin: '0 auto 36px' }}>
                    {[
                      { n: '01', label: 'Open an account', desc: '30 seconds', color: 'var(--q-violet)' },
                      { n: '02', label: 'Deposit BTC',     desc: 'Send to your vault address', color: 'var(--q-green)' },
                      { n: '03', label: 'Create UBTC',     desc: 'Mint stablecoins from collateral', color: 'var(--q-electric)' },
                    ].map(s => (
                      <div key={s.n} style={{
                        flex: '1 1 140px',
                        background: s.color + '08',
                        border: `1px solid ${s.color}18`,
                        borderRadius: '16px', padding: '22px 16px',
                        backdropFilter: 'blur(20px)',
                      }}>
                        <p className="number" style={{ color: s.color, fontWeight: '700', fontSize: '20px', margin: '0 0 10px', letterSpacing: '-0.02em', textShadow: `0 0 20px ${s.color}60` }}>{s.n}</p>
                        <p style={{ color: 'var(--q-text)', fontWeight: '600', fontSize: '13px', margin: '0 0 4px' }}>{s.label}</p>
                        <p className="number" style={{ color: 'var(--q-text-3)', fontSize: '10px', margin: 0 }}>{s.desc}</p>
                      </div>
                    ))}
                  </div>
                  <a href="/vault" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: 'var(--q-electric-dim)',
                    border: '1px solid rgba(0,212,255,0.3)',
                    color: 'var(--q-electric)', textDecoration: 'none',
                    borderRadius: '14px', padding: '14px 32px',
                    fontSize: '14px', fontWeight: '700',
                    fontFamily: 'var(--font-syne)',
                    boxShadow: '0 0 24px rgba(0,212,255,0.12)',
                  }}>
                    Open Your First Account →
                  </a>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Vault cards ── */}
          {vaults.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <p className="label" style={{ display: 'block', letterSpacing: '0.2em' }}>Your Vaults</p>
                <a href="/vault" style={{
                  color: 'var(--q-electric)', fontSize: '10px',
                  fontFamily: 'var(--font-mono)', letterSpacing: '0.12em',
                  textTransform: 'uppercase', opacity: 0.7,
                }}>+ New</a>
              </div>

              <motion.div
                variants={stagger} initial="initial" animate="animate"
                style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(460px, 1fr))', gap: '14px' }}
              >
                {vaults.map(vault => {
                  const btcLocked  = vault.btc_amount_sats / 1e8
                  const btcValue   = btcLocked * btcPrice
                  const ubtcBal    = parseFloat(vault.ubtc_minted || '0')
                  const uusdtBal   = getScBal(vault.account_type, 'UUSDT')
                  const uusdcBal   = getScBal(vault.account_type, 'UUSDC')
                  const uusdtDep   = getScDep(vault.account_type, 'UUSDT')
                  const uusdcDep   = getScDep(vault.account_type, 'UUSDC')
                  const mintable   = Math.max(0, (btcValue / 1.5) - ubtcBal)
                  const ratio      = ubtcBal > 0 ? (btcValue / ubtcBal * 100) : 0
                  const ratioColor = ratio >= 200 ? 'var(--q-green)' : ratio >= 150 ? 'var(--q-btc)' : ratio > 0 ? 'var(--q-red)' : 'var(--q-text-3)'
                  const isPending  = vault.status === 'pending_deposit'
                  const isScanning = scanning === vault.vault_id
                  const thisScan   = scanResult[vault.vault_id]

                  return (
                    <motion.div key={vault.vault_id} variants={cardVariant} style={{
                      background: isPending
                        ? 'linear-gradient(160deg,rgba(26,16,0,0.9),rgba(13,8,0,0.95))'
                        : 'linear-gradient(160deg,rgba(5,14,32,0.92),rgba(2,8,18,0.96))',
                      border: `1px solid ${isPending ? 'rgba(255,184,0,0.2)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: '24px',
                      boxShadow: isPending
                        ? `0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,184,0,0.08), inset 0 1px 0 rgba(255,184,0,0.07)`
                        : `0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,212,255,0.04), inset 0 1px 0 rgba(255,255,255,0.04)`,
                      overflow: 'hidden',
                      backdropFilter: 'blur(20px)',
                      transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLDivElement
                      el.style.transform = 'translateY(-3px)'
                      el.style.boxShadow = isPending
                        ? `0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,184,0,0.12), inset 0 1px 0 rgba(255,184,0,0.1)`
                        : `0 24px 64px rgba(0,0,0,0.7), 0 0 40px rgba(0,212,255,0.06), inset 0 1px 0 rgba(255,255,255,0.06)`
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLDivElement
                      el.style.transform = 'none'
                      el.style.boxShadow = isPending
                        ? `0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,184,0,0.08), inset 0 1px 0 rgba(255,184,0,0.07)`
                        : `0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,212,255,0.04), inset 0 1px 0 rgba(255,255,255,0.04)`
                    }}
                    >

                      {/* Pending banner */}
                      {isPending && (
                        <div style={{ background: 'rgba(255,184,0,0.06)', borderBottom: '1px solid rgba(255,184,0,0.18)', padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--q-btc)', animation: 'pulse-dot 2s ease infinite', flexShrink: 0 }} />
                              <p className="number" style={{ color: 'var(--q-btc)', fontSize: '11px', margin: 0, letterSpacing: '0.05em' }}>
                                Awaiting Bitcoin deposit · auto-checking every 30s
                              </p>
                            </div>
                            <button
                              onClick={() => scanVault(vault.vault_id)}
                              disabled={isScanning}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                background: 'var(--q-btc)', color: '#000', border: 'none',
                                borderRadius: '9px', padding: '7px 14px', fontSize: '10px', fontWeight: '800',
                                cursor: isScanning ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-mono)',
                                flexShrink: 0, opacity: isScanning ? 0.6 : 1,
                                letterSpacing: '0.08em', textTransform: 'uppercase',
                              }}
                            >
                              {Icons.refresh(11, '#000')} {isScanning ? 'Scanning…' : 'Scan Now'}
                            </button>
                          </div>
                          {thisScan && (
                            <p className="number" style={{ color: thisScan.includes('BTC') ? 'var(--q-green)' : 'var(--q-text-3)', fontSize: '11px', margin: '8px 0 0' }}>{thisScan}</p>
                          )}
                          <div style={{ marginTop: '12px', background: 'rgba(0,5,20,0.5)', borderRadius: '10px', padding: '12px 14px', border: '1px solid var(--q-border-subtle)' }}>
                            <p className="label" style={{ display: 'block', marginBottom: '5px' }}>Send BTC here</p>
                            <p className="number" style={{ color: 'var(--q-electric)', fontSize: '10px', margin: 0, wordBreak: 'break-all', lineHeight: '1.7' }}>
                              {vault.mast_address || vault.deposit_address}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Card header */}
                      <div style={{
                        padding: isMobile ? '20px 18px' : '22px 24px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: isMobile ? 'flex-start' : 'center',
                        flexDirection: isMobile ? 'column' : 'row', gap: '14px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{
                            width: '46px', height: '46px', borderRadius: '14px',
                            background: 'rgba(0,212,255,0.08)',
                            border: '1px solid rgba(0,212,255,0.18)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            {Icons.currentAccount(22, 'var(--q-electric)')}
                          </div>
                          <div>
                            <p style={{ fontFamily: 'var(--font-syne)', color: 'var(--q-text)', fontWeight: '600', fontSize: '15px', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
                              {accountTypeLabel[vault.account_type] ?? 'Current'} Account
                            </p>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span className="pill" style={{ color: 'var(--q-electric)', borderColor: 'rgba(0,212,255,0.2)', background: 'rgba(0,212,255,0.06)' }}>Self-Custody</span>
                              <span className="pill" style={{
                                color: isPending ? 'var(--q-btc)' : 'var(--q-green)',
                                borderColor: isPending ? 'rgba(255,184,0,0.25)' : 'rgba(0,255,157,0.25)',
                                background: isPending ? 'rgba(255,184,0,0.06)' : 'rgba(0,255,157,0.06)',
                              }}>
                                {isPending ? '○ Pending' : '● Active'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                          <p style={{ color: 'var(--q-text)', fontWeight: '700', fontSize: '26px', margin: '0 0 4px', lineHeight: '1', fontFamily: 'var(--font-syne)', letterSpacing: '-0.02em', textShadow: '0 0 30px rgba(0,212,255,0.1)' }}>
                            ${fmt(btcValue)}
                          </p>
                          <p className="number" style={{ color: 'var(--q-text-3)', fontSize: '10px', margin: '0 0 2px' }}>{btcLocked.toFixed(6)} BTC locked</p>
                          {ratio > 0 && <p className="number" style={{ color: ratioColor, fontSize: '10px', margin: '0 0 2px' }}>{ratio.toFixed(0)}% collateral</p>}
                          {mintable > 0 && <p className="number" style={{ color: 'var(--q-btc)', fontSize: '10px', margin: 0 }}>${fmt(mintable)} mintable</p>}
                        </div>
                      </div>

                      {/* Asset rows */}
                      <div style={{ padding: '14px 16px' }}>
                        <AssetRow icon={Icons.bitcoin(18, 'var(--q-btc)')} name="UBTC" subtitle={`${btcLocked.toFixed(4)} BTC collateral${ratio > 0 ? ` · ${ratio.toFixed(0)}%` : ''}`} value={`$${fmtInt(ubtcBal)}`} color="var(--q-btc)" />
                        <AssetRow icon={Icons.lock(18, 'var(--q-green)')} name="UUSDT" subtitle={uusdtDep > 0 ? `$${fmt(uusdtDep)} locked` : 'Not added yet'} value={uusdtBal > 0 ? `$${fmtInt(uusdtBal)}` : null} color="var(--q-green)" addHref={`/deposit?vault=${vault.vault_id}&currency=uusdt`} />
                        <AssetRow icon={Icons.lock(18, 'var(--q-cyan)')} name="UUSDC" subtitle={uusdcDep > 0 ? `$${fmt(uusdcDep)} locked` : 'Not added yet'} value={uusdcBal > 0 ? `$${fmtInt(uusdcBal)}` : null} color="var(--q-cyan)" addHref={`/deposit?vault=${vault.vault_id}&currency=uusdc`} />

                        <a href={`/account/${vault.vault_id}`} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                          marginTop: '10px',
                          background: 'rgba(0,212,255,0.06)',
                          border: '1px solid rgba(0,212,255,0.14)',
                          color: 'rgba(0,212,255,0.8)',
                          textDecoration: 'none', borderRadius: '14px',
                          padding: '12px', fontSize: '12px', fontWeight: '600',
                          fontFamily: 'var(--font-display)', letterSpacing: '0.01em',
                          transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                        }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(0,212,255,0.1)'
                            e.currentTarget.style.borderColor = 'rgba(0,212,255,0.25)'
                            e.currentTarget.style.color = 'var(--q-electric)'
                            e.currentTarget.style.transform = 'translateY(-1px)'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(0,212,255,0.06)'
                            e.currentTarget.style.borderColor = 'rgba(0,212,255,0.14)'
                            e.currentTarget.style.color = 'rgba(0,212,255,0.8)'
                            e.currentTarget.style.transform = 'none'
                          }}
                        >
                          Manage Account
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </a>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  return <DashboardConsumer />
}

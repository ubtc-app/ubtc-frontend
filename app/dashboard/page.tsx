'use client'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { API_URL } from '../lib/supabase'
import { Icons } from '../components/Icons'
import { useIsMobile } from '../lib/useIsMobile'
import { loadWallet, hasStoredWallet } from '../lib/wallet/storage'

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } }
const fadeIn = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4 } }
const stagger = { animate: { transition: { staggerChildren: 0.08 } } }
const cardVariant = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

/* ─── Compact stat pill ───────────────────────────────────────────────────── */
function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '2px',
      padding: '12px 18px',
      background: 'var(--t-surface2)',
      border: '1px solid var(--t-border-subtle)',
      borderRadius: '14px',
      minWidth: '100px',
    }}>
      <p className="label" style={{ display: 'block' }}>{label}</p>
      <p className="number" style={{ color, fontSize: '14px', fontWeight: '700', margin: 0 }}>{value}</p>
    </div>
  )
}

/* ─── Asset row inside a vault card ──────────────────────────────────────── */
function AssetRow({ icon, name, subtitle, value, color, addHref }: {
  icon: React.ReactNode; name: string; subtitle: string; value: string | null; color: string; addHref?: string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 14px',
      background: 'var(--t-surface2)',
      borderRadius: '14px', marginBottom: '6px',
    }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: color + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: 'var(--t-text)', fontWeight: '600', fontSize: '13px', margin: '0 0 2px' }}>{name}</p>
        <p className="number" style={{ color: 'var(--t-faint)', fontSize: '11px', margin: 0 }}>{subtitle}</p>
      </div>
      {value !== null
        ? <p className="number" style={{ color, fontWeight: '700', fontSize: '15px', margin: 0, flexShrink: 0 }}>{value}</p>
        : addHref
          ? <a href={addHref} style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: color + '15', border: `1px solid ${color}35`,
              color, textDecoration: 'none', borderRadius: '8px',
              padding: '5px 11px', fontSize: '11px', fontWeight: '600',
              fontFamily: 'var(--font-mono)', flexShrink: 0,
            }}>
              {Icons.plus(11, color)} Add
            </a>
          : null
      }
    </div>
  )
}

/* ─── Main dashboard ──────────────────────────────────────────────────────── */
export default function Dashboard() {
  const [vaults, setVaults]         = useState<any[]>([])
  const [stablecoins, setStablecoins] = useState<any[]>([])
  const [btcPrice, setBtcPrice]     = useState(0)
  const [loading, setLoading]       = useState(true)
  const [scanning, setScanning]     = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<Record<string, string>>({})
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const isMobile = useIsMobile()
  const [hasWallet, setHasWallet]   = useState(false)

  useEffect(() => {
    hasStoredWallet().then(setHasWallet)
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
        setScanResult(prev => ({ ...prev, [vaultId]: `${data.amount_btc} BTC confirmed — vault active` }))
        await loadAll()
      } else if (!silent) {
        setScanResult(prev => ({ ...prev, [vaultId]: 'No deposit found yet. Try again in a few minutes.' }))
      }
    } catch {
      if (!silent) setScanResult(prev => ({ ...prev, [vaultId]: 'Scan failed — check your connection' }))
    }
    if (!silent) setScanning(null)
  }

  const getScBal = (type: string, cur: string) =>
    stablecoins.filter(s => s.account_type === type && s.currency === cur).reduce((s, x) => s + parseFloat(x.balance || '0'), 0)
  const getScDep = (type: string, cur: string) =>
    stablecoins.filter(s => s.account_type === type && s.currency === cur).reduce((s, x) => s + parseFloat(x.deposited_amount || '0'), 0)

  const totalBtcLocked = vaults.reduce((s, v) => s + (v.btc_amount_sats || 0) / 1e8, 0)
  const totalUbtc      = vaults.reduce((s, v) => s + parseFloat(v.ubtc_minted || '0'), 0)
  const totalUusdt     = vaults.reduce((s, v) => s + getScBal(v.account_type, 'UUSDT'), 0)
  const totalUusdc     = vaults.reduce((s, v) => s + getScBal(v.account_type, 'UUSDC'), 0)
  const totalUsd       = totalBtcLocked * btcPrice
  const availableToMint = Math.max(0, (totalUsd / 1.5) - totalUbtc)
  const hasPending     = vaults.some(v => v.status === 'pending_deposit')

  const fmt    = (n: number, d = 2) => n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })
  const fmtInt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 })

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--t-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '36px', height: '36px', border: '2.5px solid var(--t-border)', borderTopColor: 'var(--t-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p className="number" style={{ color: 'var(--t-faint)', fontSize: '12px' }}>Loading portfolio…</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--t-bg)', fontFamily: 'var(--font-display)' }}>

      {/* ── Hero: portfolio value ── */}
      <motion.div {...fadeIn} style={{
        background: 'var(--t-surface)',
        borderBottom: '1px solid var(--t-border-subtle)',
        padding: isMobile ? '28px 20px 24px' : '36px 44px 28px',
      }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <motion.p {...fadeUp} className="label" style={{ display: 'block', marginBottom: '8px' }}>Total Portfolio · BTC at live price</motion.p>
          <motion.p initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }} className="number" style={{
            fontSize: isMobile ? '40px' : '58px', fontWeight: '700',
            color: 'var(--t-text)', lineHeight: '1', margin: '0 0 6px',
            letterSpacing: '-0.03em',
          }}>
            ${fmt(totalUsd)}
          </motion.p>
          {availableToMint > 0 && (
            <p className="number" style={{ color: 'var(--t-green)', fontSize: '13px', fontWeight: '600', margin: '0 0 20px' }}>
              ${fmt(availableToMint)} available to mint
            </p>
          )}

          {/* Stat pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
            <StatPill label="BTC locked"  value={totalBtcLocked.toFixed(6)}       color="var(--t-orange)" />
            <StatPill label="UBTC minted" value={'$' + fmtInt(totalUbtc)}         color="var(--t-orange)" />
            <StatPill label="UUSDT"       value={'$' + fmtInt(totalUusdt)}        color="var(--t-green)"  />
            <StatPill label="UUSDC"       value={'$' + fmtInt(totalUusdc)}        color="var(--t-accent)" />
            <StatPill label="BTC price"   value={'$' + fmtInt(btcPrice)}          color="var(--t-muted)"  />
          </div>
        </div>
      </motion.div>

      {/* ── Empty state ── */}
      {vaults.length === 0 && (
        <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }} style={{ maxWidth: '1080px', margin: '0 auto', padding: isMobile ? '20px 20px 0' : '24px 44px 0' }}>
          {hasWallet ? (
            /* Wallet exists but no vaults — setup was interrupted */
            <div style={{ background: 'hsl(38 92% 50% / 0.07)', border: '1px solid hsl(38 92% 50% / 0.25)', borderRadius: '20px', padding: isMobile ? '28px 20px' : '40px 36px', textAlign: 'center' as const }}>
              <div style={{ fontSize: '36px', marginBottom: '14px' }}>⚠️</div>
              <p style={{ color: 'var(--t-orange)', fontSize: '16px', fontWeight: '700', margin: '0 0 8px' }}>Your wallet is set up — just missing an account</p>
              <p style={{ color: 'hsl(0 0% 45%)', fontSize: '13px', fontFamily: 'var(--font-mono)', margin: '0 0 24px', lineHeight: '1.7' }}>
                It looks like account setup didn't complete. Your keys are safe — just open an account to continue.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' as const }}>
                <a href="/vault" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'var(--t-orange)', color: '#000', textDecoration: 'none', borderRadius: '12px', padding: '14px 28px', fontSize: '14px', fontWeight: '700', fontFamily: 'var(--font-display)' }}>
                  Open Account →
                </a>
                <button onClick={loadAll} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid var(--t-border)', color: 'var(--t-muted)', borderRadius: '12px', padding: '14px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
                  {Icons.refresh(14, 'var(--t-muted)')} Refresh
                </button>
              </div>
            </div>
          ) : (
            /* No wallet at all — fresh user */
            <div style={{ background: 'var(--t-surface)', border: '1px dashed var(--t-border)', borderRadius: '20px', padding: isMobile ? '32px 24px' : '48px 40px', textAlign: 'center' as const }}>
              <p style={{ color: 'var(--t-muted)', fontSize: '15px', fontWeight: '600', margin: '0 0 8px' }}>Get started in 3 steps</p>
              <p className="number" style={{ color: 'var(--t-faint)', fontSize: '13px', margin: '0 0 28px' }}>Your first account takes about 2 minutes to set up</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' as const, maxWidth: '560px', margin: '0 auto 28px' }}>
                {[
                  { n: '1', label: 'Open an account', desc: 'Takes about 30 seconds', color: 'var(--t-purple)' },
                  { n: '2', label: 'Deposit BTC', desc: 'Send Bitcoin to your vault address', color: 'var(--t-green)' },
                  { n: '3', label: 'Create UBTC', desc: 'Mint stablecoins from your collateral', color: 'var(--t-orange)' },
                ].map(s => (
                  <div key={s.n} style={{ flex: '1 1 140px', background: 'var(--t-surface2)', borderRadius: '14px', padding: '18px 14px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: s.color + '20', color: s.color, fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontFamily: 'var(--font-mono)' }}>{s.n}</div>
                    <p style={{ color: 'var(--t-text)', fontWeight: '600', fontSize: '13px', margin: '0 0 4px' }}>{s.label}</p>
                    <p className="number" style={{ color: 'var(--t-faint)', fontSize: '11px', margin: 0 }}>{s.desc}</p>
                  </div>
                ))}
              </div>
              <a href="/vault" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'var(--t-accent-bg)', border: '1.5px solid var(--t-accent-border)', color: 'var(--t-accent)', textDecoration: 'none', borderRadius: '12px', padding: '13px 28px', fontSize: '14px', fontWeight: '700', fontFamily: 'var(--font-display)' }}>
                Open Your First Account →
              </a>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Vault cards ── */}
      {vaults.length > 0 && (
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: isMobile ? '20px 20px 40px' : '24px 44px 48px' }}>
          <p className="label" style={{ display: 'block', marginBottom: '14px' }}>Your Vaults</p>

          <motion.div variants={stagger} initial="initial" animate="animate" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(480px, 1fr))', gap: '14px' }}>
            {vaults.map(vault => {
              const btcLocked    = vault.btc_amount_sats / 1e8
              const btcValue     = btcLocked * btcPrice
              const ubtcBal      = parseFloat(vault.ubtc_minted || '0')
              const uusdtBal     = getScBal(vault.account_type, 'UUSDT')
              const uusdcBal     = getScBal(vault.account_type, 'UUSDC')
              const uusdtDep     = getScDep(vault.account_type, 'UUSDT')
              const uusdcDep     = getScDep(vault.account_type, 'UUSDC')
              const mintable     = Math.max(0, (btcValue / 1.5) - ubtcBal)
              const ratio        = ubtcBal > 0 ? (btcValue / ubtcBal * 100) : 0
              const ratioColor   = ratio >= 200 ? 'var(--t-green)' : ratio >= 150 ? 'var(--t-orange)' : ratio > 0 ? 'var(--t-red)' : 'var(--t-faint)'
              const isPending    = vault.status === 'pending_deposit'
              const isScanning   = scanning === vault.vault_id
              const thisScan     = scanResult[vault.vault_id]

              return (
                <motion.div key={vault.vault_id} variants={cardVariant} className="card" style={{ borderRadius: '22px', overflow: 'hidden', borderColor: isPending ? 'rgba(255,159,10,0.3)' : 'var(--t-border)' }}>

                  {/* Pending deposit banner */}
                  {isPending && (
                    <div style={{ background: 'var(--t-orange-bg)', borderBottom: '1px solid rgba(255,159,10,0.2)', padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--t-orange)', animation: 'pulse-dot 2s ease infinite', flexShrink: 0 }} />
                          <p className="number" style={{ color: 'var(--t-orange)', fontSize: '12px', margin: 0 }}>
                            Awaiting Bitcoin deposit · auto-checking every 30s
                          </p>
                        </div>
                        <button
                          onClick={() => scanVault(vault.vault_id)}
                          disabled={isScanning}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            background: 'var(--t-orange)', color: '#000', border: 'none',
                            borderRadius: '8px', padding: '7px 13px', fontSize: '11px', fontWeight: '700',
                            cursor: isScanning ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-mono)',
                            flexShrink: 0, opacity: isScanning ? 0.65 : 1,
                            width: isMobile ? '100%' : 'auto', justifyContent: 'center',
                          }}
                        >
                          {Icons.refresh(12, '#000')} {isScanning ? 'Scanning…' : 'Scan Now'}
                        </button>
                      </div>
                      {thisScan && (
                        <p className="number" style={{ color: thisScan.includes('BTC') ? 'var(--t-green)' : 'var(--t-faint)', fontSize: '11px', margin: '8px 0 0' }}>
                          {thisScan}
                        </p>
                      )}
                      {/* Deposit address */}
                      <div style={{ marginTop: '12px', background: 'var(--t-surface)', borderRadius: '10px', padding: '12px 14px', border: '1px solid var(--t-border)' }}>
                        <p className="label" style={{ display: 'block', marginBottom: '5px' }}>Send BTC here</p>
                        <p className="number" style={{ color: 'var(--t-accent)', fontSize: '11px', margin: 0, wordBreak: 'break-all' }}>
                          {vault.mast_address || vault.deposit_address}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Card header */}
                  <div style={{
                    padding: isMobile ? '18px 18px' : '20px 22px',
                    borderBottom: '1px solid var(--t-border-subtle)',
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    flexDirection: isMobile ? 'column' : 'row', gap: '12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: 'var(--t-accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {Icons.currentAccount(22, 'var(--t-accent)')}
                      </div>
                      <div>
                        <p style={{ color: 'var(--t-text)', fontWeight: '700', fontSize: '15px', margin: '0 0 4px' }}>{{ current: 'Current Account', savings: 'Savings Account', yield: 'Yield Account', custody_yield: 'Custody Yield', prime: 'Prime Account', managed_yield: 'Managed Yield' }[vault.account_type as string] ?? 'Current Account'}</p>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span className="pill" style={{ color: 'var(--t-accent)', borderColor: 'var(--t-accent-border)', background: 'var(--t-accent-bg)' }}>Self-Custody</span>
                          <span className="pill" style={{
                            color: isPending ? 'var(--t-orange)' : 'var(--t-green)',
                            borderColor: isPending ? 'rgba(255,159,10,0.3)' : 'rgba(48,209,88,0.3)',
                            background: isPending ? 'var(--t-orange-bg)' : 'var(--t-green-bg)',
                          }}>
                            {isPending ? '○ Awaiting Deposit' : '● Active'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                      <p className="number" style={{ color: 'var(--t-text)', fontWeight: '700', fontSize: '22px', margin: '0 0 3px', lineHeight: '1' }}>
                        ${fmt(btcValue)}
                      </p>
                      <p className="number" style={{ color: 'var(--t-faint)', fontSize: '11px', margin: '0 0 2px' }}>{btcLocked.toFixed(6)} BTC locked</p>
                      {ratio > 0 && <p className="number" style={{ color: ratioColor, fontSize: '11px', margin: '0 0 2px' }}>{ratio.toFixed(0)}% collateral ratio</p>}
                      {mintable > 0 && <p className="number" style={{ color: 'var(--t-orange)', fontSize: '11px', margin: 0 }}>${fmt(mintable)} mintable</p>}
                    </div>
                  </div>

                  {/* Asset rows */}
                  <div style={{ padding: '12px 14px' }}>
                    <AssetRow
                      icon={Icons.bitcoin(18, 'var(--t-orange)')}
                      name="UBTC"
                      subtitle={`${btcLocked.toFixed(4)} BTC collateral${ratio > 0 ? ` · ${ratio.toFixed(0)}% ratio` : ''}`}
                      value={`$${fmtInt(ubtcBal)}`}
                      color="var(--t-orange)"
                    />
                    <AssetRow
                      icon={Icons.lock(18, 'var(--t-green)')}
                      name="UUSDT"
                      subtitle={uusdtDep > 0 ? `$${fmt(uusdtDep)} USDT locked` : 'Not added yet'}
                      value={uusdtBal > 0 ? `$${fmtInt(uusdtBal)}` : null}
                      color="var(--t-green)"
                      addHref={`/deposit?vault=${vault.vault_id}&currency=uusdt`}
                    />
                    <AssetRow
                      icon={Icons.lock(18, 'var(--t-accent)')}
                      name="UUSDC"
                      subtitle={uusdcDep > 0 ? `$${fmt(uusdcDep)} USDC locked` : 'Not added yet'}
                      value={uusdcBal > 0 ? `$${fmtInt(uusdcBal)}` : null}
                      color="var(--t-accent)"
                      addHref={`/deposit?vault=${vault.vault_id}&currency=uusdc`}
                    />

                    {/* Open account button */}
                    <div style={{ marginTop: '4px' }}>
                      <a href={`/account/${vault.vault_id}`} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        background: 'linear-gradient(135deg, hsl(205,85%,55%), hsl(190,80%,50%))',
                        color: 'white', textDecoration: 'none',
                        borderRadius: '12px', padding: '13px', fontSize: '13px', fontWeight: '700',
                        fontFamily: 'var(--font-display)',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                        Open Account
                      </a>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      )}
    </div>
  )
}

/**
 * DriverWallet.jsx  —  src/pages/Driver/DriverWallet.jsx
 *
 * Shows the driver's current balance + pending escrow, and lets them
 * withdraw their available balance to their bank account.
 *
 * Dependent files (all already exist):
 *   src/service/driverApi.js
 *   src/components/ui/card.jsx
 *   src/components/ui/button.jsx
 *   @/lib/utils  (cn helper)
 *   lucide-react
 *
 * NOTE: `GET /driver_wallet` is called to fetch balance + pending escrow.
 * If your backend exposes a different endpoint name, change the import below.
 * We define a small inline helper so driverApi.js stays minimal.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Wallet, ArrowDownToLine, RefreshCw, CheckCircle2,
  AlertCircle, Loader2, TrendingUp, Clock, IndianRupee,
  BadgeCheck, Banknote, ShieldCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import driverApi, { withdrawFiat } from '../../service/driverApi'

// ─── Inline wallet fetch (avoids coupling driverApi.js to one route name) ─────
async function getDriverWallet() {
  const response = await driverApi.get('/driver_wallet')
  return response.data
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  return Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function WalletSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Balance card skeleton */}
      <div className="rounded-2xl h-44 bg-slate-900/60 border border-white/5" />
      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 rounded-xl bg-slate-900/40 border border-white/5" />
        <div className="h-24 rounded-xl bg-slate-900/40 border border-white/5" />
      </div>
      {/* Withdraw card skeleton */}
      <div className="h-48 rounded-2xl bg-slate-900/40 border border-white/5" />
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div className={cn(
      'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
      'flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl',
      'text-sm font-medium backdrop-blur-md',
      type === 'success'
        ? 'bg-green-950/90 border-green-500/30 text-green-300'
        : 'bg-rose-950/90  border-rose-500/30  text-rose-300'
    )}>
      {type === 'success'
        ? <BadgeCheck    className="w-4 h-4 text-green-400 shrink-0" />
        : <AlertCircle   className="w-4 h-4 text-rose-400  shrink-0" />
      }
      {message}
    </div>
  )
}

// ─── Withdraw Panel ───────────────────────────────────────────────────────────

function WithdrawPanel({ available, onSuccess, onError }) {
  const [withdrawing,   setWithdrawing]   = useState(false)
  const [customAmount,  setCustomAmount]  = useState('')
  const [useCustom,     setUseCustom]     = useState(false)
  const [successAmount, setSuccessAmount] = useState(null)  // shows success state inline

  const parsed  = parseFloat(customAmount)
  const amount  = useCustom ? (isNaN(parsed) ? 0 : parsed) : available
  const isValid = amount > 0 && amount <= available

  async function handleWithdraw() {
    if (!isValid) return
    setWithdrawing(true)
    setSuccessAmount(null)
    try {
      const data = await withdrawFiat(useCustom ? amount : undefined)
      setSuccessAmount(data.amount_credited ?? amount)
      onSuccess(`₹${fmt(data.amount_credited ?? amount)} credited to your bank account!`)
      setCustomAmount('')
      setUseCustom(false)
    } catch (err) {
      onError(err?.response?.data?.detail || 'Withdrawal failed. Please retry.')
    } finally {
      setWithdrawing(false)
    }
  }

  return (
    <Card className="border-white/[0.07] bg-slate-900/60 backdrop-blur-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-slate-300 font-semibold flex items-center gap-2">
          <Banknote className="w-4 h-4 text-cyan-400" />
          Withdraw to Bank
        </CardTitle>
        <p className="text-[10px] text-slate-600 tracking-wide mt-0.5">
          Funds are transferred to your registered UPI / bank account
        </p>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Full amount vs custom */}
        <div className="flex gap-2">
          <button
            onClick={() => setUseCustom(false)}
            className={cn(
              'flex-1 py-2 rounded-lg text-xs font-bold border transition-all',
              !useCustom
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                : 'bg-transparent border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'
            )}
          >
            Full Amount
          </button>
          <button
            onClick={() => setUseCustom(true)}
            className={cn(
              'flex-1 py-2 rounded-lg text-xs font-bold border transition-all',
              useCustom
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                : 'bg-transparent border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'
            )}
          >
            Custom Amount
          </button>
        </div>

        {/* Custom input */}
        {useCustom && (
          <div
            className="flex items-center gap-2 rounded-xl border px-4 py-3 transition-colors"
            style={{
              background: 'rgba(30,41,59,0.7)',
              borderColor: customAmount ? '#0EA5E9' : 'rgba(255,255,255,0.08)',
            }}
          >
            <span className="text-cyan-400 font-bold text-lg">₹</span>
            <input
              autoFocus
              type="number"
              min="1"
              max={available}
              placeholder={`Max ₹${fmt(available)}`}
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              className="flex-1 bg-transparent text-white text-lg font-bold outline-none placeholder:text-slate-700
                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        )}

        {/* Amount preview */}
        {isValid && (
          <div
            className="flex justify-between items-center rounded-xl px-4 py-3 border border-cyan-500/20"
            style={{ background: 'rgba(14,165,233,0.05)' }}
          >
            <span className="text-xs text-slate-500">Withdrawing</span>
            <span className="text-base font-bold text-cyan-400">₹{fmt(amount)}</span>
          </div>
        )}

        {/* Success inline */}
        {successAmount != null && (
          <div className="flex items-center gap-2 rounded-xl px-4 py-3 border border-green-500/25 bg-green-500/8 text-green-400 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            ₹{fmt(successAmount)} credited to bank!
          </div>
        )}

        {/* Insufficient */}
        {useCustom && !isNaN(parsed) && parsed > 0 && parsed > available && (
          <p className="text-xs text-rose-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Amount exceeds available balance of ₹{fmt(available)}
          </p>
        )}

        <Button
          onClick={handleWithdraw}
          disabled={withdrawing || !isValid}
          className={cn(
            'w-full h-12 font-bold text-sm rounded-xl transition-all gap-2',
            withdrawing || !isValid
              ? 'bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed'
              : 'bg-cyan-500 hover:bg-cyan-400 text-white'
          )}
          style={isValid && !withdrawing ? { boxShadow: '0 0 24px rgba(14,165,233,0.3)' } : {}}
        >
          {withdrawing
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
            : <><ArrowDownToLine className="w-4 h-4" /> Withdraw {isValid ? `₹${fmt(amount)}` : ''}</>
          }
        </Button>

        {/* Trust badge */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-700 tracking-wide">
          <ShieldCheck className="w-3 h-3" />
          Secured via TransitOS settlement contract
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DriverWallet() {
  const [wallet,     setWallet]     = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error,      setError]      = useState('')
  const [toast,      setToast]      = useState(null)

  const showToast = (message, type = 'success') => setToast({ message, type })

  const fetchWallet = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const data = await getDriverWallet()
      setWallet(data)
    } catch (err) {
      setError('Could not load wallet. Is the backend running?')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchWallet() }, [fetchWallet])

  // After a successful withdrawal, refresh wallet data
  function handleWithdrawSuccess(msg) {
    showToast(msg, 'success')
    setTimeout(() => fetchWallet(true), 1200)
  }

  const available = wallet?.balance ?? 0
  const pending   = wallet?.pending_escrow ?? 0
  const lifetime  = wallet?.lifetime_earnings ?? null

  return (
    <div
      className="min-h-screen p-6 pb-20"
      style={{ background: '#0b1220' }}
    >
      <div className="max-w-xl mx-auto">

        {/* ── Page header ── */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-5 h-5 text-cyan-400" />
              <h1 className="text-2xl font-bold text-white tracking-tight">Driver Wallet</h1>
            </div>
            <p className="text-slate-500 text-sm">Your earnings and withdrawal history</p>
          </div>
          <button
            onClick={() => fetchWallet(true)}
            disabled={refreshing}
            className="text-slate-600 hover:text-slate-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </button>
        </div>

        {/* ── Skeleton ── */}
        {loading && <WalletSkeleton />}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-4 flex items-start gap-3 mb-4">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-rose-400 text-sm font-medium">{error}</p>
              <button
                onClick={() => fetchWallet(true)}
                className="text-rose-400/70 text-xs mt-1 hover:text-rose-300 underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* ── Wallet content ── */}
        {!loading && !error && (
          <div className="space-y-4">

            {/* ── Balance card ── */}
            <div
              className="rounded-2xl p-6 relative overflow-hidden border border-cyan-500/15"
              style={{
                background: 'linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(7,14,26,0.95) 100%)',
                boxShadow: '0 0 40px rgba(34,211,238,0.06)',
              }}
            >
              {/* Decorative circles */}
              <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-cyan-500/5" />
              <div className="absolute -bottom-10 -right-2 w-28 h-28 rounded-full bg-cyan-500/5" />

              <p className="text-[10px] tracking-widest uppercase text-slate-500 mb-1 relative z-10">
                Available Balance
              </p>
              <div className="flex items-end gap-2 relative z-10 mb-4">
                <span className="text-4xl font-bold text-white tracking-tight">
                  ₹{fmt(available)}
                </span>
                {available > 0 && (
                  <span className="text-xs text-cyan-400 mb-1 font-semibold">Ready to withdraw</span>
                )}
              </div>

              {/* Mini stats row */}
              <div className="flex gap-4 relative z-10">
                <div>
                  <p className="text-[9px] text-slate-600 tracking-widest uppercase mb-0.5">
                    <Clock className="w-2.5 h-2.5 inline mr-0.5" />Pending Escrow
                  </p>
                  <p className="text-sm font-bold text-amber-400">₹{fmt(pending)}</p>
                </div>
                {lifetime != null && (
                  <div>
                    <p className="text-[9px] text-slate-600 tracking-widest uppercase mb-0.5">
                      <TrendingUp className="w-2.5 h-2.5 inline mr-0.5" />Lifetime
                    </p>
                    <p className="text-sm font-bold text-slate-300">₹{fmt(lifetime)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Stat tiles ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-[9px] text-slate-600 tracking-widest uppercase mb-1">
                  <Clock className="w-3 h-3 inline mr-0.5" />Pending Escrow
                </p>
                <p className="text-xl font-bold text-amber-400">₹{fmt(pending)}</p>
                <p className="text-[9px] text-slate-700 mt-1">Released after trip completion</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-[9px] text-slate-600 tracking-widests uppercase mb-1">
                  <IndianRupee className="w-3 h-3 inline mr-0.5" />Available Now
                </p>
                <p className="text-xl font-bold text-cyan-400">₹{fmt(available)}</p>
                <p className="text-[9px] text-slate-700 mt-1">Withdrawable balance</p>
              </div>
            </div>

            {/* ── Withdraw panel ── */}
            <WithdrawPanel
              available={available}
              onSuccess={handleWithdrawSuccess}
              onError={(msg) => showToast(msg, 'error')}
            />

          </div>
        )}
      </div>

      {/* ── Toast ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}
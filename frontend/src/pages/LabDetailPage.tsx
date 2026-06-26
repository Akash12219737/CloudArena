import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Terminal as TerminalIcon,
  RefreshCw,
  Trash2,
  ArrowLeft,
  Clock,
  Server,
  Cpu,
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Maximize2,
  Minimize2,
  X,
  Wifi,
  WifiOff,
  FlaskConical,
} from 'lucide-react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import 'xterm/css/xterm.css'
import { useLabStore } from '../store/labStore'
import { useAuthStore } from '../store/authStore'
import type { Lab, PodStatus } from '../types'

const WS_BASE = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
const POLL_INTERVAL_MS = 2500

const LAB_META: Record<string, { icon: string; color: string; label: string }> = {
  linux:  { icon: '??', color: 'orange', label: 'Linux Lab' },
  git:    { icon: '??', color: 'blue',   label: 'Git Lab' },
  docker: { icon: '??', color: 'cyan',   label: 'Docker Lab' },
}

const COLOR_MAP: Record<string, { text: string; border: string; bg: string }> = {
  orange: { text: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/10' },
  blue:   { text: 'text-blue-400',   border: 'border-blue-500/30',   bg: 'bg-blue-500/10'   },
  cyan:   { text: 'text-cyan-400',   border: 'border-cyan-500/30',   bg: 'bg-cyan-500/10'   },
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function useCountdown(expiresAt: string | undefined) {
  const [remaining, setRemaining] = useState('')
  useEffect(() => {
    if (!expiresAt) return
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) { setRemaining('Expired'); return }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setRemaining(`${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  return remaining
}

function LabStatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    running: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    error:   'bg-red-500/15    text-red-400    border-red-500/20',
    deleted: 'bg-slate-500/15  text-slate-400  border-slate-500/20',
    expired: 'bg-slate-500/15  text-slate-400  border-slate-500/20',
  }
  const dot: Record<string, string> = {
    running: 'bg-emerald-400 animate-pulse',
    pending: 'bg-yellow-400 animate-pulse',
    error:   'bg-red-400',
    deleted: 'bg-slate-400',
    expired: 'bg-slate-400',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cls[status] ?? cls.pending}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status] ?? dot.pending}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function InfoRow({ icon, label, value, mono = false }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; mono?: boolean
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
      <span className="text-slate-500 mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
        <p className={`text-sm text-slate-200 truncate ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</p>
      </div>
    </div>
  )
}

function PodReadiness({ podStatus }: { podStatus: PodStatus | null }) {
  if (!podStatus) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Querying pod…
      </div>
    )
  }
  const phase = podStatus.phase
  if (podStatus.ready) {
    return (
      <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
        <CheckCircle2 className="w-4 h-4" /> Pod Ready
        {podStatus.mock && <span className="text-[10px] text-slate-500 ml-1">(mock)</span>}
      </div>
    )
  }
  if (phase === 'Failed' || phase === 'CrashLoopBackOff') {
    return (
      <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
        <AlertCircle className="w-4 h-4" /> Pod {phase}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium">
      <Loader2 className="w-4 h-4 animate-spin" /> {phase || 'Preparing Lab…'}
    </div>
  )
}

const LabDetailPage: React.FC = () => {
  const { labId } = useParams<{ labId: string }>()
  const navigate = useNavigate()
  const { accessToken } = useAuthStore()
  const { getLab, getPodStatus, deleteLab } = useLabStore()

  const id = Number(labId)

  const [lab, setLab] = useState<Lab | null>(null)
  const [labErr, setLabErr] = useState('')
  const [podStatus, setPodStatus] = useState<PodStatus | null>(null)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [terminalFullscreen, setTerminalFullscreen] = useState(false)
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [terminating, setTerminating] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const termRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const countdown = useCountdown(lab?.expires_at)
  const meta = LAB_META[lab?.lab_type ?? ''] ?? { icon: '??', color: 'blue', label: 'Lab' }
  const colors = COLOR_MAP[meta.color]

  useEffect(() => {
    if (!id) return
    getLab(id)
      .then(setLab)
      .catch((e: any) => setLabErr(e?.response?.data?.detail ?? 'Failed to load lab'))
  }, [id])

  const pollPodStatus = useCallback(async () => {
    if (!id) return
    try {
      const s = await getPodStatus(id)
      setPodStatus(s)
      if (s.ready && pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    } catch { /* silent */ }
  }, [id])

  useEffect(() => {
    pollPodStatus()
    pollRef.current = setInterval(pollPodStatus, POLL_INTERVAL_MS)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [pollPodStatus])

  const sendResize = useCallback(() => {
    const term = xtermRef.current
    const ws = wsRef.current
    const fit = fitAddonRef.current
    if (!term || !ws || !fit || ws.readyState !== WebSocket.OPEN) return
    fit.fit()
    const resize = JSON.stringify({ cols: term.cols, rows: term.rows })
    const buf = new Uint8Array(1 + resize.length)
    buf[0] = 0x31
    for (let i = 0; i < resize.length; i++) buf[i + 1] = resize.charCodeAt(i)
    ws.send(buf)
  }, [])

  const connectWs = useCallback(() => {
    if (!accessToken) return
    setWsStatus('connecting')
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close() }
    const ws = new WebSocket(`${WS_BASE}/api/v1/labs/${id}/terminal?token=${accessToken}`)
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws
    ws.onopen = () => { setWsStatus('connected'); setTimeout(sendResize, 100) }
    ws.onmessage = (event) => {
      const term = xtermRef.current
      if (!term) return
      if (event.data instanceof ArrayBuffer) term.write(new Uint8Array(event.data))
      else term.write(event.data)
    }
    ws.onclose = () => setWsStatus('disconnected')
    ws.onerror = () => setWsStatus('disconnected')
  }, [id, accessToken, sendResize])

  useEffect(() => {
    if (!terminalOpen) return
    const initTimer = setTimeout(() => {
      if (!termRef.current) return
      if (xtermRef.current) { xtermRef.current.dispose(); xtermRef.current = null }
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
        theme: {
          background: '#0d1117', foreground: '#e6edf3', cursor: '#58a6ff',
          selectionBackground: '#264f78', black: '#484f58', red: '#ff7b72',
          green: '#3fb950', yellow: '#d29922', blue: '#58a6ff', magenta: '#bc8cff',
          cyan: '#39c5cf', white: '#b1bac4', brightBlack: '#6e7681',
          brightRed: '#ffa198', brightGreen: '#56d364', brightYellow: '#e3b341',
          brightBlue: '#79c0ff', brightMagenta: '#d2a8ff', brightCyan: '#56d4dd',
          brightWhite: '#f0f6fc',
        },
        allowTransparency: false,
        scrollback: 5000,
      })
      const fitAddon = new FitAddon()
      const webLinksAddon = new WebLinksAddon()
      term.loadAddon(fitAddon)
      term.loadAddon(webLinksAddon)
      term.open(termRef.current)
      fitAddonRef.current = fitAddon
      xtermRef.current = term
      setTimeout(() => fitAddon.fit(), 50)
      term.onData((data) => {
        const ws = wsRef.current
        if (!ws || ws.readyState !== WebSocket.OPEN) return
        const encoded = new TextEncoder().encode(data)
        const buf = new Uint8Array(1 + encoded.length)
        buf[0] = 0x30
        buf.set(encoded, 1)
        ws.send(buf)
      })
      setTimeout(connectWs, 150)
    }, 80)
    return () => clearTimeout(initTimer)
  }, [terminalOpen])

  const handleReconnect = useCallback(() => connectWs(), [connectWs])

  useEffect(() => {
    const handler = () => sendResize()
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [sendResize])

  useEffect(() => { setTimeout(sendResize, 150) }, [terminalFullscreen, sendResize])

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close()
      if (xtermRef.current) xtermRef.current.dispose()
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const handleTerminate = async () => {
    setShowConfirm(false)
    setTerminating(true)
    try {
      if (wsRef.current) wsRef.current.close()
      await deleteLab(id)
      navigate('/dashboard')
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? 'Failed to terminate lab')
      setTerminating(false)
    }
  }

  if (labErr) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-entrance">
        <AlertCircle className="w-16 h-16 text-red-400" />
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Lab Not Found</h2>
          <p className="text-slate-400">{labErr}</p>
        </div>
        <button onClick={() => navigate('/labs')} className="btn-primary">
          <ArrowLeft className="w-4 h-4" /> Back to Labs
        </button>
      </div>
    )
  }

  if (!lab) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    )
  }

  const podCrashed = podStatus?.phase === 'Failed' || podStatus?.phase === 'CrashLoopBackOff'
  const podReady = podStatus?.ready === true

  return (
    <div className="animate-entrance space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/labs')}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Back to Labs"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{meta.icon}</span>
            <div>
              <h1 className="text-xl font-bold text-white">{meta.label}</h1>
              <p className="text-xs text-slate-500 font-mono">Lab #{lab.id}</p>
            </div>
          </div>
          <LabStatusBadge status={lab.status} />
        </div>
        <button
          id="terminate-lab-btn"
          onClick={() => setShowConfirm(true)}
          disabled={terminating || lab.status === 'deleted'}
          className="btn-danger"
        >
          {terminating
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Terminating…</>
            : <><Trash2 className="w-4 h-4" /> Terminate Lab</>}
        </button>
      </div>

      {/* Main layout */}
      <div className="grid gap-5 grid-cols-1 lg:grid-cols-[360px_1fr]">

        {/* Left panel */}
        <div className="flex flex-col gap-5">

          {/* Pod status card */}
          <div className={`glass-card p-5 border ${colors.border}`}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">Pod Status</h2>
            <div className="mb-4"><PodReadiness podStatus={podStatus} /></div>
            <InfoRow icon={<Server className="w-3.5 h-3.5" />} label="Namespace" value={lab.namespace_name} mono />
            <InfoRow icon={<Cpu className="w-3.5 h-3.5" />} label="Pod Name" value={podStatus?.pod_name ?? (podReady ? '—' : 'Waiting…')} mono />
            <InfoRow icon={<Globe className="w-3.5 h-3.5" />} label="Pod IP" value={podStatus?.pod_ip ?? (podReady ? '—' : 'Waiting…')} mono />
            <InfoRow icon={<FlaskConical className="w-3.5 h-3.5" />} label="Deployment" value={lab.deployment_name} mono />
          </div>

          {/* Timing card */}
          <div className="glass-card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Timing</h2>
            <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Created" value={formatDateTime(lab.created_at)} />
            <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Expires" value={formatDateTime(lab.expires_at)} />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-500 uppercase tracking-widest">Time Remaining</span>
              <span className={`text-sm font-mono font-bold ${countdown === 'Expired' ? 'text-red-400' : 'text-emerald-400'}`}>
                {countdown || '…'}
              </span>
            </div>
          </div>

          {/* Actions */}
          {!terminalOpen ? (
            <div className="flex flex-col gap-3">
              {podCrashed ? (
                <div className="glass-card p-5 border border-red-500/20">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-300">Pod Crashed</p>
                      <p className="text-xs text-slate-400 mt-1">
                        The pod entered a <strong>{podStatus?.phase}</strong> state. Terminate this lab and launch a new one to continue.
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setShowConfirm(true)} className="btn-danger w-full justify-center">
                    <Trash2 className="w-4 h-4" /> Terminate & Recreate
                  </button>
                </div>
              ) : (
                <button
                  id="open-terminal-btn"
                  onClick={() => setTerminalOpen(true)}
                  disabled={!podReady}
                  className="btn-primary w-full justify-center py-4 text-base"
                >
                  {!podReady
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Preparing Lab…</>
                    : <><TerminalIcon className="w-5 h-5" /> Open Terminal</>}
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {wsStatus === 'disconnected' && (
                <button id="reconnect-terminal-btn" onClick={handleReconnect} className="btn-secondary w-full justify-center">
                  <RefreshCw className="w-4 h-4" /> Reconnect Terminal
                </button>
              )}
              <button onClick={() => { if (wsRef.current) wsRef.current.close(); setTerminalOpen(false) }} className="btn-secondary w-full justify-center text-slate-400">
                <X className="w-4 h-4" /> Close Terminal
              </button>
            </div>
          )}
        </div>

        {/* Right panel: terminal or placeholder */}
        {terminalOpen ? (
          <div className={`flex flex-col rounded-2xl overflow-hidden border border-white/10 bg-[#0d1117] ${
            terminalFullscreen ? 'fixed inset-0 z-50 rounded-none border-0' : 'min-h-[500px]'
          }`}>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {meta.icon} {lab.namespace_name} — bash
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {wsStatus === 'connected'
                    ? <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    : wsStatus === 'connecting'
                    ? <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
                    : <WifiOff className="w-3.5 h-3.5 text-red-400" />}
                  <span className={`text-[10px] font-mono ${
                    wsStatus === 'connected' ? 'text-emerald-400' :
                    wsStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {wsStatus === 'connected' ? 'Connected' : wsStatus === 'connecting' ? 'Connecting…' : 'Disconnected'}
                  </span>
                </div>
                {wsStatus === 'disconnected' && (
                  <button
                    onClick={handleReconnect}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-md bg-brand-600/20 hover:bg-brand-600/40 text-brand-400 border border-brand-500/30 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Reconnect
                  </button>
                )}
                <button
                  onClick={() => setTerminalFullscreen(f => !f)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title={terminalFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  {terminalFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            {/* xterm mount */}
            <div className="flex-1 overflow-hidden p-1.5">
              <div ref={termRef} className="h-full w-full" />
            </div>
            {/* Status bar */}
            <div className="flex items-center justify-between px-4 py-1 bg-[#161b22] border-t border-white/5 shrink-0 text-[10px] text-slate-500 font-mono">
              <span>xterm-256color · UTF-8</span>
              <span>Lab #{lab.id} · CloudArena</span>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex items-center justify-center rounded-2xl border border-dashed border-white/10 min-h-[500px] bg-surface-900/30">
            <div className="text-center space-y-3">
              <TerminalIcon className="w-12 h-12 text-slate-700 mx-auto" />
              <p className="text-slate-600 text-sm">
                {podReady ? 'Click "Open Terminal" to start' : 'Waiting for pod to be ready…'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Terminate confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-8 max-w-sm w-full mx-4 border border-red-500/20 space-y-5 animate-entrance">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Terminate Lab?</h3>
                <p className="text-slate-400 text-sm mt-1">
                  This will delete the Kubernetes namespace, deployment, and service for{' '}
                  <strong className="text-white">Lab #{lab.id}</strong>. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button id="confirm-terminate-btn" onClick={handleTerminate} className="btn-danger flex-1 justify-center">
                <Trash2 className="w-4 h-4" /> Yes, Terminate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LabDetailPage

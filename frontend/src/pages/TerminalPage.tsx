import React, { useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Terminal as TerminalIcon, X, Maximize2, RefreshCw, ArrowLeft } from 'lucide-react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import 'xterm/css/xterm.css'
import { useAuthStore } from '../store/authStore'

const WS_BASE = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`

const TerminalPage: React.FC = () => {
  const { labId } = useParams<{ labId: string }>()
  const navigate = useNavigate()
  const { accessToken } = useAuthStore()

  const termRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [status, setStatus] = React.useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  const connect = useCallback(() => {
    if (!labId || !accessToken) return

    setStatus('connecting')

    // Clean up old WS
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
    }

    const ws = new WebSocket(`${WS_BASE}/api/v1/labs/${labId}/terminal?token=${accessToken}`)
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('connected')
      // Send initial size
      sendResize()
    }

    ws.onmessage = (event) => {
      const term = xtermRef.current
      if (!term) return
      if (event.data instanceof ArrayBuffer) {
        term.write(new Uint8Array(event.data))
      } else {
        term.write(event.data)
      }
    }

    ws.onclose = () => setStatus('disconnected')
    ws.onerror = () => setStatus('disconnected')
  }, [labId, accessToken])

  const sendResize = useCallback(() => {
    const term = xtermRef.current
    const ws = wsRef.current
    const fit = fitAddonRef.current
    if (!term || !ws || !fit || ws.readyState !== WebSocket.OPEN) return
    fit.fit()
    const resize = JSON.stringify({ cols: term.cols, rows: term.rows })
    const buf = new Uint8Array(1 + resize.length)
    buf[0] = 0x31 // '1' = resize
    for (let i = 0; i < resize.length; i++) buf[i + 1] = resize.charCodeAt(i)
    ws.send(buf)
  }, [])

  // Init xterm
  useEffect(() => {
    if (!termRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      theme: {
        background: '#0d1117',
        foreground: '#e6edf3',
        cursor: '#58a6ff',
        selectionBackground: '#264f78',
        black: '#484f58',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#b1bac4',
        brightBlack: '#6e7681',
        brightRed: '#ffa198',
        brightGreen: '#56d364',
        brightYellow: '#e3b341',
        brightBlue: '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd',
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

    // After small delay to let DOM settle
    setTimeout(() => fitAddon.fit(), 50)

    // Send keystrokes to backend
    term.onData((data) => {
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) return
      const encoded = new TextEncoder().encode(data)
      const buf = new Uint8Array(1 + encoded.length)
      buf[0] = 0x30 // '0' = stdin
      buf.set(encoded, 1)
      ws.send(buf)
    })

    return () => {
      term.dispose()
      xtermRef.current = null
    }
  }, [])

  // Connect WebSocket after terminal is ready
  useEffect(() => {
    const id = setTimeout(connect, 100)
    return () => clearTimeout(id)
  }, [connect])

  // Handle resize
  useEffect(() => {
    const handler = () => sendResize()
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [sendResize])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
    setTimeout(sendResize, 100)
  }

  const statusDot = {
    connecting: 'bg-yellow-400 animate-pulse',
    connected: 'bg-green-400',
    disconnected: 'bg-red-400',
  }[status]

  const statusText = {
    connecting: 'Connecting…',
    connected: 'Connected',
    disconnected: 'Disconnected',
  }[status]

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/labs/${labId}`)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Back to Lab Details"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-green-400" />
            <span className="text-sm font-mono text-slate-200">
              Lab #{labId} Terminal
            </span>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <div className={`w-2 h-2 rounded-full ${statusDot}`} />
            <span className="text-xs text-slate-400">{statusText}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === 'disconnected' && (
            <button
              onClick={connect}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand-600/20 hover:bg-brand-600/40 text-brand-400 rounded-lg border border-brand-500/30 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Reconnect
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Toggle fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/labs/${labId}`)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Close terminal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Traffic light dots (macOS style) */}
      <div className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0d1117] border-b border-white/5 shrink-0">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-3 text-xs text-slate-600 font-mono">
          cloudarena — lab-{labId} — bash
        </span>
      </div>

      {/* Terminal container */}
      <div className="flex-1 overflow-hidden p-2">
        <div ref={termRef} className="h-full w-full" />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-[#161b22] border-t border-white/5 shrink-0 text-xs text-slate-500 font-mono">
        <span>xterm-256color · UTF-8</span>
        <span>Lab #{labId} · CloudArena</span>
      </div>
    </div>
  )
}

export default TerminalPage

import React, { useEffect } from 'react'
import { useLabStore } from '../store/labStore'
import { formatDistanceToNow, format } from 'date-fns'
import { Terminal, GitBranch, Container, Clock } from 'lucide-react'
import type { Lab, LabType } from '../types'
import clsx from 'clsx'

const icons: Record<LabType, React.ReactNode> = {
  linux: <Terminal className="w-4 h-4" />,
  git: <GitBranch className="w-4 h-4" />,
  docker: <Container className="w-4 h-4" />,
}

const statusClass: Record<string, string> = {
  running: 'status-running',
  pending: 'status-pending',
  expired: 'status-expired',
  deleted: 'status-deleted',
  error: 'status-error',
}

const HistoryPage: React.FC = () => {
  const { labs, loading, fetchLabs } = useLabStore()

  useEffect(() => { fetchLabs() }, [])

  const sorted = [...labs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div className="animate-entrance space-y-6">
      <div>
        <h1 className="section-title text-3xl">Lab History</h1>
        <p className="text-slate-400 mt-1">All your lab sessions across all environments</p>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400">Loading history…</div>
        ) : sorted.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            No lab history yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-slate-500 text-xs uppercase tracking-wide">
                  <th className="px-5 py-4">ID</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Namespace</th>
                  <th className="px-5 py-4">Created</th>
                  <th className="px-5 py-4">Expires</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((lab, idx) => (
                  <tr
                    key={lab.id}
                    className={clsx(
                      'border-b border-white/5 transition-colors',
                      idx % 2 === 0 ? 'bg-surface-900/20' : '',
                      'hover:bg-white/3'
                    )}
                  >
                    <td className="px-5 py-4 font-mono text-slate-400">#{lab.id}</td>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-2 font-medium text-white">
                        {icons[lab.lab_type]}
                        {lab.lab_type.charAt(0).toUpperCase() + lab.lab_type.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={statusClass[lab.status] ?? 'status-badge'}>
                        {lab.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-400 text-xs truncate max-w-[180px]">
                      {lab.namespace_name}
                    </td>
                    <td className="px-5 py-4 text-slate-400">
                      {format(new Date(lab.created_at), 'MMM d, HH:mm')}
                    </td>
                    <td className="px-5 py-4 text-slate-400">
                      {formatDistanceToNow(new Date(lab.expires_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default HistoryPage

import React, { useEffect } from 'react'
import { Terminal, GitBranch, Container, Activity, Clock, Trash2, Plus, Zap } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useLabStore } from '../store/labStore'
import type { Lab, LabType } from '../types'
import { formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'

const LAB_META: Record<LabType, { icon: React.ReactNode; color: string; name: string; description: string }> = {
  linux: {
    icon: <Terminal className="w-5 h-5" />,
    color: 'text-orange-400',
    name: 'Linux Lab',
    description: 'Ubuntu 22.04 • Practice shell commands',
  },
  git: {
    icon: <GitBranch className="w-5 h-5" />,
    color: 'text-blue-400',
    name: 'Git Lab',
    description: 'Alpine + Git • Practice version control',
  },
  docker: {
    icon: <Container className="w-5 h-5" />,
    color: 'text-cyan-400',
    name: 'Docker Lab',
    description: 'Docker-in-Docker • Practice containers',
  },
}

const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode; color: string }> = ({
  label, value, icon, color,
}) => (
  <div className="glass-card p-5 flex items-center gap-4">
    <div className={`p-3 rounded-xl bg-surface-800 ${color}`}>{icon}</div>
    <div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  </div>
)

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore()
  const { labs, loading, fetchLabs, deleteLab } = useLabStore()

  useEffect(() => { fetchLabs() }, [])

  const active = labs.filter((l) => l.status === 'running')
  const expired = labs.filter((l) => l.status === 'expired' || l.status === 'deleted')
  const pending = labs.filter((l) => l.status === 'pending')

  const handleDelete = async (id: number) => {
    if (confirm('Delete this lab and tear down all Kubernetes resources?')) {
      await deleteLab(id)
    }
  }

  return (
    <div className="space-y-8 animate-entrance">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, <span className="text-gradient-brand">{user?.username}</span> 👋
          </h1>
          <p className="text-slate-400 mt-1">Your DevOps practice environment hub</p>
        </div>
        <Link to="/labs" id="create-lab-btn" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Lab
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Active Labs" value={active.length} icon={<Activity className="w-5 h-5" />} color="text-cyber-400" />
        <StatCard label="Pending" value={pending.length} icon={<Clock className="w-5 h-5" />} color="text-yellow-400" />
        <StatCard label="Total Labs" value={labs.length} icon={<Zap className="w-5 h-5" />} color="text-brand-400" />
      </div>

      {/* Active Labs */}
      <div>
        <h2 className="section-title mb-4">Active Labs</h2>
        {loading ? (
          <div className="text-slate-400 py-8 text-center">Loading…</div>
        ) : active.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <Terminal className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No active labs. <Link to="/labs" className="text-brand-400 hover:underline">Create one now →</Link></p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {active.map((lab) => (
              <LabCard key={lab.id} lab={lab} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const LabCard: React.FC<{ lab: Lab; onDelete: (id: number) => void }> = ({ lab, onDelete }) => {
  const meta = LAB_META[lab.lab_type]
  const expiresIn = formatDistanceToNow(new Date(lab.expires_at), { addSuffix: true })

  return (
    <div className="glass-card-hover p-5 group">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl bg-surface-800 ${meta.color}`}>{meta.icon}</div>
        <span className="status-running">● Running</span>
      </div>
      <h3 className="font-semibold text-white text-lg mb-0.5">{meta.name}</h3>
      <p className="text-slate-400 text-sm mb-3">{meta.description}</p>

      <div className="space-y-1.5 text-xs text-slate-500 font-mono mb-4">
        <div className="flex justify-between">
          <span>Namespace</span>
          <span className="text-slate-300 truncate ml-2 max-w-[140px]">{lab.namespace_name}</span>
        </div>
        <div className="flex justify-between">
          <span>Expires</span>
          <span className="text-yellow-400">{expiresIn}</span>
        </div>
        <div className="flex justify-between">
          <span>Lab ID</span>
          <span className="text-slate-300">#{lab.id}</span>
        </div>
      </div>

      <button
        id={`delete-lab-${lab.id}`}
        onClick={() => onDelete(lab.id)}
        className="btn-danger w-full justify-center"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Terminate Lab
      </button>
    </div>
  )
}

export default DashboardPage

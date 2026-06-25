import React, { useEffect, useState } from 'react'
import { Shield, Users, Activity, Trash2, RefreshCw, Loader2 } from 'lucide-react'
import { adminApi } from '../services/api'
import type { User, Lab } from '../types'
import { format } from 'date-fns'

const AdminPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [activeLabs, setActiveLabs] = useState<Lab[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'users' | 'labs'>('users')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [u, l] = await Promise.all([adminApi.listUsers(), adminApi.listActiveLabs()])
      setUsers(u.data)
      setActiveLabs(l.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const forceDelete = async (id: number) => {
    if (!confirm(`Force delete lab #${id}?`)) return
    await adminApi.forceDeleteLab(id)
    setActiveLabs((prev) => prev.filter((l) => l.id !== id))
  }

  return (
    <div className="animate-entrance space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/30">
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-slate-400 text-sm">Platform management console</p>
          </div>
        </div>
        <button id="admin-refresh-btn" onClick={fetchData} className="btn-secondary">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <Users className="w-5 h-5 text-brand-400" />
          <div>
            <p className="text-xl font-bold text-white">{users.length}</p>
            <p className="text-xs text-slate-400">Total Users</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <Activity className="w-5 h-5 text-cyber-400" />
          <div>
            <p className="text-xl font-bold text-white">{activeLabs.length}</p>
            <p className="text-xs text-slate-400">Active Labs</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-0">
        {(['users', 'labs'] as const).map((t) => (
          <button
            key={t}
            id={`admin-tab-${t}`}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t
                ? 'text-brand-300 border-b-2 border-brand-500 bg-brand-500/5'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t === 'users' ? `Users (${users.length})` : `Active Labs (${activeLabs.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />Loading…
        </div>
      ) : tab === 'users' ? (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-slate-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Username</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-5 py-4 font-mono text-slate-400">#{u.id}</td>
                  <td className="px-5 py-4 font-medium text-white">{u.username}</td>
                  <td className="px-5 py-4 text-slate-400">{u.email}</td>
                  <td className="px-5 py-4">
                    <span className={`status-badge ${u.role === 'admin' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'bg-brand-500/15 text-brand-400 border border-brand-500/20'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-400">{format(new Date(u.created_at), 'MMM d, yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-slate-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-4">Lab ID</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">User ID</th>
                <th className="px-5 py-4">Namespace</th>
                <th className="px-5 py-4">Expires</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {activeLabs.map((lab) => (
                <tr key={lab.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-5 py-4 font-mono text-slate-400">#{lab.id}</td>
                  <td className="px-5 py-4 font-medium text-white capitalize">{lab.lab_type}</td>
                  <td className="px-5 py-4 text-slate-400">#{lab.user_id}</td>
                  <td className="px-5 py-4 font-mono text-slate-400 text-xs">{lab.namespace_name}</td>
                  <td className="px-5 py-4 text-slate-400">{format(new Date(lab.expires_at), 'MMM d, HH:mm')}</td>
                  <td className="px-5 py-4">
                    <button
                      id={`admin-delete-lab-${lab.id}`}
                      onClick={() => forceDelete(lab.id)}
                      className="btn-danger py-1.5 px-3 text-xs"
                    >
                      <Trash2 className="w-3 h-3" />
                      Force Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminPage

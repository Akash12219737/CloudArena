import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Terminal, LayoutDashboard, FlaskConical, History, Shield, LogOut, ChevronLeft, ChevronRight, Cpu
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import clsx from 'clsx'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
  { to: '/labs', icon: <FlaskConical className="w-5 h-5" />, label: 'Labs' },
  { to: '/history', icon: <History className="w-5 h-5" />, label: 'History' },
  { to: '/admin', icon: <Shield className="w-5 h-5" />, label: 'Admin', adminOnly: true },
]

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuthStore()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const filteredNav = NAV_ITEMS.filter((n) => !n.adminOnly || user?.role === 'admin')

  return (
    <div className="flex h-screen overflow-hidden bg-surface-950">
      {/* Sidebar */}
      <aside
        className={clsx(
          'flex flex-col bg-surface-900/70 backdrop-blur border-r border-white/5 transition-all duration-300',
          collapsed ? 'w-[68px]' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className={clsx('flex items-center gap-3 p-4 border-b border-white/5', collapsed && 'justify-center')}>
          <div className="flex-shrink-0 p-2 rounded-xl bg-brand-600/20 border border-brand-500/30 animate-glow">
            <Terminal className="w-5 h-5 text-brand-400" />
          </div>
          {!collapsed && (
            <div>
              <span className="font-bold text-white text-sm">CloudArena</span>
              <p className="text-xs text-slate-500 leading-none">DevOps Labs</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNav.map(({ to, icon, label }) => {
            const active = pathname === to || pathname.startsWith(to + '/')
            return (
              <Link
                key={to}
                to={to}
                id={`nav-${label.toLowerCase()}`}
                className={clsx(
                  active ? 'nav-link-active' : 'nav-link',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? label : undefined}
              >
                {icon}
                {!collapsed && <span>{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User + logout */}
        <div className="p-3 border-t border-white/5 space-y-2">
          {!collapsed && user && (
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-cyber-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.username}</p>
                <p className="text-xs text-slate-500 truncate">{user.role}</p>
              </div>
            </div>
          )}
          <button
            id="logout-btn"
            onClick={handleLogout}
            className={clsx('nav-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/5', collapsed && 'justify-center px-2')}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && 'Logout'}
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="nav-link w-full text-slate-500"
            id="sidebar-toggle"
          >
            {collapsed ? <ChevronRight className="w-4 h-4 mx-auto" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 bg-surface-950/80 backdrop-blur border-b border-white/5">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Cpu className="w-4 h-4 text-cyber-400" />
            <span className="text-slate-500">Kubernetes</span>
            <span className="text-slate-600">/</span>
            <span className="text-white font-medium">
              {NAV_ITEMS.find((n) => n.to === pathname)?.label ?? 'CloudArena'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyber-400 animate-pulse-slow" />
            <span className="text-xs text-slate-500">Cluster Connected</span>
          </div>
        </header>

        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}

export default Layout

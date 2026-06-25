import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, Terminal, Eye, EyeOff, Loader2, Zap } from 'lucide-react'
import { authApi } from '../services/api'
import { userApi } from '../services/api'
import { useAuthStore } from '../store/authStore'

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { setTokens, setUser } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await authApi.login({ email, password })
      setTokens(data.access_token, data.refresh_token)
      const { data: user } = await userApi.me()
      setUser(user)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-brand-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-entrance">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/30 mb-4 animate-glow">
            <Terminal className="w-8 h-8 text-brand-400" />
          </div>
          <h1 className="text-3xl font-bold text-gradient-brand">CloudArena</h1>
          <p className="text-slate-400 text-sm mt-1">DevOps Interview Lab Platform</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8 border border-white/8">
          <h2 className="text-xl font-bold text-white mb-6">Welcome back</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                id="email"
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  className="input-field pr-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="login-btn"
              type="submit"
              className="btn-primary w-full justify-center py-3 text-base"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Create account
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          <Shield className="w-3 h-3 inline mr-1" />
          Secured with JWT · bcrypt · RBAC
        </p>
      </div>
    </div>
  )
}

export default LoginPage

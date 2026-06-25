import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Terminal, Loader2, UserPlus, Shield } from 'lucide-react'
import { authApi, userApi } from '../services/api'
import { useAuthStore } from '../store/authStore'

const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const { setTokens, setUser } = useAuthStore()
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data } = await authApi.register({
        username: form.username,
        email: form.email,
        password: form.password,
      })
      setTokens(data.access_token, data.refresh_token)
      const { data: user } = await userApi.me()
      setUser(user)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-cyber-500/8 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-entrance">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyber-500/20 border border-cyber-500/30 mb-4">
            <Terminal className="w-8 h-8 text-cyber-400" />
          </div>
          <h1 className="text-3xl font-bold text-gradient-brand">CloudArena</h1>
          <p className="text-slate-400 text-sm mt-1">Create your account</p>
        </div>

        <div className="glass-card p-8 border border-white/8">
          <h2 className="text-xl font-bold text-white mb-6">Get started free</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { id: 'username', label: 'Username', type: 'text', placeholder: 'devops_hero', key: 'username' as const },
              { id: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', key: 'email' as const },
              { id: 'password', label: 'Password', type: 'password', placeholder: '••••••••', key: 'password' as const },
              { id: 'confirm', label: 'Confirm Password', type: 'password', placeholder: '••••••••', key: 'confirm' as const },
            ].map(({ id, label, type, placeholder, key }) => (
              <div key={id}>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
                <input
                  id={id}
                  type={type}
                  className="input-field"
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={set(key)}
                  required
                />
              </div>
            ))}

            <button
              id="register-btn"
              type="submit"
              className="btn-primary w-full justify-center py-3 text-base"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          <Shield className="w-3 h-3 inline mr-1" />
          Your data is encrypted and never shared
        </p>
      </div>
    </div>
  )
}

export default RegisterPage

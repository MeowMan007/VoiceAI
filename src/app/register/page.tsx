'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { demoAuth } from '@/lib/demo-auth'
import toast from 'react-hot-toast'
import { Mic, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = demoAuth.register(email, password)
    if (error) {
      toast.error(error)
      setLoading(false)
    } else {
      toast.success('Account created! Welcome to VoiceAI 🎉')
      router.push('/')
    }
  }

  return (
    <div className="gradient-bg min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 animate-pulse-glow"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}>
            <Mic className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold font-display gradient-text">VoiceAI</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Set up your AI assistant in minutes
          </p>
        </div>

        <div className="glass-card p-8">
          <h2 className="text-xl font-semibold mb-2">Create your account</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Start automating your missed calls today
          </p>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Email Address
              </label>
              <input
                id="register-email"
                type="email"
                className="input-field"
                placeholder="you@business.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPass ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              id="register-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2"
            >
              {loading && <Loader2 className="animate-spin" size={16} />}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
              Already have an account?{' '}
              <Link href="/login" className="font-medium" style={{ color: 'var(--accent-purple)' }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          {['🎂 Cake Shop', '🏥 Clinic', '🏠 Real Estate'].map(label => (
            <div key={label} className="glass-card p-2">{label}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

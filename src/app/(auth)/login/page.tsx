'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Eye, EyeOff, Lock, Mail, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

const ROLE_DASHBOARDS: Record<string, string> = {
  admin: '/admin',
  gudang: '/gudang',
  penjahit: '/penjahit',
  finance: '/finance',
  installer: '/installer',
  surveyor: '/surveyor',
  owner: '/owner'
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const { toast } = useToast()

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()

    if (isLocked) {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000)
      setError(`Terlalu banyak percobaan. Coba lagi dalam ${remaining} detik.`)
      toast('error', `Terlalu banyak percobaan. Coba lagi dalam ${remaining} detik.`)
      return
    }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        if (newAttempts >= 5) {
          const lockout = Date.now() + 5 * 60 * 1000 // 5 minutes
          setLockedUntil(lockout)
          setError('Terlalu banyak percobaan login. Kunci selama 5 menit.')
          toast('error', 'Terlalu banyak percobaan login. Kunci selama 5 menit.')
          setAttempts(0)
        } else {
          setError(`Email atau password salah. Sisa percobaan: ${5 - newAttempts}`)
          toast('error', `Email atau password salah. Sisa percobaan: ${5 - newAttempts}`)
        }
        return
      }

      if (data.user) {
        setAttempts(0)
        setLockedUntil(null)
        const { data: staffData } = await supabase.from('users').select('role').eq('id', data.user.id).single()

        const role = staffData?.role ?? 'admin'
        router.push(ROLE_DASHBOARDS[role] ?? '/admin')
        router.refresh()
      }
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.')
      toast('error', 'Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-up">
        {/* Logo */}
        <div className="auth-logo">KJ Homedecor</div>
        <p className="auth-tagline">Staff Portal — Masuk ke akun Anda</p>

        {/* Error */}
        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              borderRadius: '0.5rem',
              padding: '0.75rem 1rem',
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--neutral-700)',
                marginBottom: '0.375rem'
              }}
            >
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--neutral-400)'
                }}
              />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="staff@kjhomedecor.com"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  border: '1px solid var(--input-border)',
                  borderRadius: '0.5rem',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.15s'
                }}
                onFocus={(e) => (e.target.style.borderColor = '#cc7030')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--input-border)')}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--neutral-700)',
                marginBottom: '0.375rem'
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--neutral-400)'
                }}
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '0.75rem 2.5rem 0.75rem 2.5rem',
                  border: '1px solid var(--input-border)',
                  borderRadius: '0.5rem',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.15s'
                }}
                onFocus={(e) => (e.target.style.borderColor = '#cc7030')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--input-border)')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--neutral-400)',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || isLocked}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: loading ? 'var(--neutral-300)' : isLocked ? 'var(--neutral-300)' : '#cc7030',
              color: loading ? 'var(--neutral-400)' : isLocked ? 'var(--neutral-400)' : '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.95rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : isLocked ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s',
              marginTop: '0.5rem'
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Masuk...
              </>
            ) : (
              'Masuk'
            )}
          </button>
        </form>

        {/* Footer note */}
        <p
          style={{
            textAlign: 'center',
            fontSize: '0.78rem',
            color: 'var(--neutral-400)',
            marginTop: '1.5rem'
          }}
        >
          Akun dibuat oleh Admin. Hubungi admin jika belum punya akses.
        </p>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  )
}

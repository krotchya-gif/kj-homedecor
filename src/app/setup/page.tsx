'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ROLES = {
  owner: { label: 'Owner', desc: 'Akses penuh ke semua data & laporan', color: '#7c3aed' },
  admin: { label: 'Admin', desc: 'Kelola pesanan, katalog, pelanggan', color: '#cc7030' },
}

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<'check' | 'create'>('check')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<{ admin?: any; owner?: any; error?: string } | null>(null)
  const [form, setForm] = useState({
    owner_email: 'owner@kj.com',
    owner_password: 'kjowner123',
    owner_name: 'Owner KJ',
    admin_email: 'admin@kj.com',
    admin_password: 'kjadmin123',
    admin_name: 'Admin KJ',
  })

  useEffect(() => {
    fetch('/api/setup-accounts')
      .then(r => r.json())
      .then(data => {
        setLoading(false)
        if (data.canCreateAdmin && data.canCreateOwner) {
          setStep('create')
        } else if (data.existingAccounts?.admin && data.existingAccounts?.owner) {
          setResult({ error: 'Akun admin & owner sudah ada. Silakan login di /login' })
        } else if (data.existingAccounts?.admin) {
          setResult({ error: 'Akun admin sudah ada. Buat owner dulu.', admin: true })
          setStep('create')
        } else if (data.existingAccounts?.owner) {
          setResult({ error: 'Akun owner sudah ada. Buat admin dulu.', owner: true })
          setStep('create')
        }
      })
      .catch(() => {
        // API error - maybe migrations not run yet, let user try creating
        setLoading(false)
        setStep('create')
      })
  }, [])

  async function createAccounts() {
    setCreating(true)
    setResult(null)

    const accounts = []

    // Create owner
    if (form.owner_email && form.owner_password && form.owner_name) {
      try {
        const r = await fetch('/api/setup-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.owner_email,
            password: form.owner_password,
            name: form.owner_name,
            role: 'owner'
          })
        })
        const d = await r.json()
        if (d.success) accounts.push({ role: 'Owner', email: form.owner_email, password: form.owner_password })
        else if (d.error !== 'owner account already exists') setResult(prev => ({ ...prev, ownerError: d.error }))
      } catch (e) {}
    }

    // Create admin
    if (form.admin_email && form.admin_password && form.admin_name) {
      try {
        const r = await fetch('/api/setup-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.admin_email,
            password: form.admin_password,
            name: form.admin_name,
            role: 'admin'
          })
        })
        const d = await r.json()
        if (d.success) accounts.push({ role: 'Admin', email: form.admin_email, password: form.admin_password })
        else if (d.error !== 'admin account already exists') setResult(prev => ({ ...prev, adminError: d.error }))
      } catch (e) {}
    }

    setCreating(false)
    if (accounts.length > 0) {
      setResult({ admin: accounts.find(a => a.role === 'Admin'), owner: accounts.find(a => a.role === 'Owner') })
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#cc7030', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Memeriksa kondisi sistem...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a0a00, #3d1a08)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: 520, boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 56, height: 56, background: '#cc7030', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.5rem' }}>🏠</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1a0a00', fontFamily: 'Playfair Display, serif', margin: '0 0 0.25rem' }}>KJ Homedecor</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>Setup Akun Initial</p>
        </div>

        {result?.error ? (
          <div>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.75rem', padding: '1rem', color: '#991b1b', fontSize: '0.875rem', marginBottom: '1rem' }}>
              {result.error}
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', textAlign: 'center' }}>
              Pastikan migration sudah dijalankan di Supabase SQL Editor.<br/>
              Lalu buka <strong>/login</strong> untuk masuk.
            </p>
          </div>
        ) : result?.admin || result?.owner ? (
          <div>
            <div style={{ background: '#d1fae5', border: '1px solid #bbf7d0', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: '700', color: '#065f46', marginBottom: '0.75rem', fontSize: '0.95rem' }}>✅ Akun Berhasil Dibuat!</div>
              {result.admin && (
                <div style={{ marginBottom: '0.5rem', padding: '0.625rem', background: '#fff', borderRadius: '0.5rem' }}>
                  <div style={{ fontWeight: '600', fontSize: '0.82rem', color: '#374151' }}>🔐 Admin</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.2rem' }}>Email: <strong>{result.admin.email}</strong></div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>Password: <strong>{result.admin.password}</strong></div>
                </div>
              )}
              {result.owner && (
                <div style={{ marginBottom: '0.5rem', padding: '0.625rem', background: '#fff', borderRadius: '0.5rem' }}>
                  <div style={{ fontWeight: '600', fontSize: '0.82rem', color: '#374151' }}>👑 Owner</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.2rem' }}>Email: <strong>{result.owner.email}</strong></div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>Password: <strong>{result.owner.password}</strong></div>
                </div>
              )}
            </div>
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '0.5rem', padding: '0.875rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#92400e' }}>
              ⚠️ <strong>Ganti password ini setelah login!</strong><br/>
              Ini hanya untuk setup awal saja.
            </div>
            <button onClick={() => router.push('/login')} style={{ width: '100%', padding: '0.875rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}>
              Login Sekarang →
            </button>
          </div>
        ) : (
          <div>
            <div style={{ background: '#f9fafb', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '0.82rem', color: '#6b7280', lineHeight: 1.6 }}>
                <strong>Petunjuk:</strong><br/>
                1. Pastikan <strong>migration SQL</strong> sudah dijalankan di Supabase<br/>
                2. Klik <strong>Buat Akun</strong> untuk generate admin & owner<br/>
                3. Login menggunakan kredensial yang muncul<br/>
                4. <strong>Ganti password</strong> setelah login pertama
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { key: 'owner', label: '👑 Owner', color: '#7c3aed' },
                { key: 'admin', label: '🔐 Admin', color: '#cc7030' },
              ].map(r => (
                <div key={r.key} style={{ border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1rem', background: '#fafafa' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: r.color, marginBottom: '0.75rem' }}>{r.label}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input type='email' placeholder="Email" value={form[`${r.key}_email` as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [`${r.key}_email`]: e.target.value }))}
                      style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.82rem', outline: 'none' }} />
                    <input type='password' placeholder="Password" value={form[`${r.key}_password` as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [`${r.key}_password`]: e.target.value }))}
                      style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.82rem', outline: 'none' }} />
                    <input type='text' placeholder="Nama Lengkap" value={form[`${r.key}_name` as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [`${r.key}_name`]: e.target.value }))}
                      style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.82rem', outline: 'none' }} />
                  </div>
                </div>
              ))}
            </div>

            <button onClick={createAccounts} disabled={creating} style={{ width: '100%', padding: '0.875rem', background: '#cc7030', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '700', fontSize: '1rem', cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1 }}>
              {creating ? 'Membuat akun...' : '🏗️ Buat Akun Admin & Owner'}
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
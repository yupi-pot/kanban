import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { api } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { useLangStore, useT } from '../../store/langStore'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setUser = useAuthStore((s) => s.setUser)
  const { lang, toggle } = useLangStore()
  const t = useT()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post(`/auth/${mode}`, { name, email, password })
      setUser(data.user)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F0F13] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo + lang toggle */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#7C5CFC] rounded-[8px] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="9" rx="1.5" fill="white" fillOpacity="0.9"/>
                <rect x="9" y="1" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.9"/>
                <rect x="9" y="9" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.4"/>
              </svg>
            </div>
            <span className="text-[18px] font-semibold text-[#E8E8F0]">Kanban</span>
          </div>
          <button
            onClick={toggle}
            className="text-[12px] text-[#6B6B80] hover:text-[#E8E8F0] border border-[#2A2A38] hover:border-[#3A3A50] px-2.5 py-1 rounded-[6px] transition-all cursor-pointer"
          >
            {lang === 'ru' ? 'EN' : 'RU'}
          </button>
        </div>

        <motion.div layout className="bg-[#1A1A24] border border-[#2A2A38] rounded-[12px] p-6 shadow-[0_24px_48px_rgba(0,0,0,0.4)]">
          {/* OAuth */}
          <div className="flex flex-col gap-2 mb-5">
            <a
              href={`${SERVER_URL}/api/auth/google`}
              className="flex items-center justify-center gap-3 bg-[#0F0F13] hover:bg-[#2A2A38] border border-[#2A2A38] hover:border-[#3A3A50] text-[#E8E8F0] text-[13px] font-medium py-2.5 rounded-[8px] transition-all duration-150 cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t.continueGoogle}
            </a>
            <a
              href={`${SERVER_URL}/api/auth/github`}
              className="flex items-center justify-center gap-3 bg-[#0F0F13] hover:bg-[#2A2A38] border border-[#2A2A38] hover:border-[#3A3A50] text-[#E8E8F0] text-[13px] font-medium py-2.5 rounded-[8px] transition-all duration-150 cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#E8E8F0">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              {t.continueGithub}
            </a>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-[#2A2A38]" />
            <span className="text-[12px] text-[#6B6B80]">{t.or}</span>
            <div className="flex-1 h-px bg-[#2A2A38]" />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-5 bg-[#0F0F13] rounded-[8px] p-1">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-1.5 text-[13px] font-medium rounded-[6px] transition-all duration-150 cursor-pointer ${mode === m ? 'bg-[#2A2A38] text-[#E8E8F0]' : 'text-[#6B6B80] hover:text-[#E8E8F0]'}`}
              >
                {m === 'login' ? t.signIn : t.signUp}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <AnimatePresence>
              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <Input label={t.name} placeholder={t.yourName} value={name} onChange={(e) => setName(e.target.value)} required />
                </motion.div>
              )}
            </AnimatePresence>
            <Input label={t.email} type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label={t.password} type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} error={error || undefined} required />
            <Button type="submit" disabled={loading} className="w-full justify-center mt-1">
              {loading ? t.loading : mode === 'login' ? t.signIn : t.createAccount}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

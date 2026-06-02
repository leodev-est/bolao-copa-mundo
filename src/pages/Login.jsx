import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Trophy, Mail, Lock, User, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()
  const [mode, setMode]       = useState('login')    // 'login' | 'register'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError]     = useState('')
  const [busy, setBusy]       = useState(false)

  if (!loading && user) return <Navigate to="/jogos" replace />

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await signInWithEmail(email, password)
        if (error) throw error
      } else {
        const { error } = await signUpWithEmail(email, password, username)
        if (error) throw error
      }
    } catch (err) {
      setError(translateError(err.message))
    } finally {
      setBusy(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    setBusy(true)
    try {
      const { error } = await signInWithGoogle()
      if (error) throw error
    } catch (err) {
      setError(translateError(err.message))
      setBusy(false)
    }
  }

  function translateError(msg) {
    if (msg.includes('Invalid login credentials')) return 'Email ou senha incorretos.'
    if (msg.includes('Email not confirmed'))       return 'Confirme seu email antes de entrar.'
    if (msg.includes('User already registered'))   return 'Este email já está cadastrado. Tente entrar.'
    if (msg.includes('Password should be'))        return 'A senha deve ter pelo menos 6 caracteres.'
    if (msg.includes('only request this after'))   return 'Aguarde alguns segundos e tente novamente.'
    if (msg.includes('Too Many Requests'))         return 'Muitas tentativas. Aguarde 1 minuto.'
    if (msg.includes('rate limit'))                return 'Muitas tentativas. Aguarde 1 minuto.'
    return msg
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl mb-4 shadow-lg shadow-emerald-900/50">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Bolão da Gangue</h1>
          <p className="text-emerald-400 font-semibold text-base sm:text-lg">Copa do Mundo 2026 🤙</p>
          <p className="text-gray-500 text-sm mt-2">Faça seus palpites e dispute com os amigos</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1 mb-6">
            {[['login', 'Entrar'], ['register', 'Cadastrar']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => { setMode(val); setError('') }}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                  mode === val
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors disabled:opacity-60 mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar com Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-xs text-gray-600">ou</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* Formulário email */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            {mode === 'register' && (
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Seu apelido"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
              <input
                type="email"
                placeholder="Seu email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors disabled:opacity-60 text-sm"
            >
              {busy ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          {mode === 'register' && (
            <p className="text-center text-xs text-gray-600 mt-4">
              Ao cadastrar, você confirma ter lido as regras do bolão.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

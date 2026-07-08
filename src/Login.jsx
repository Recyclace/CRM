import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)
    if (error) {
      setError("Email ou mot de passe incorrect, ou compte non autorisé.")
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <img src="/logo-recyclace.png" alt="Recycl'ace" className="login-logo" />
        <p className="sub">Suivi commercial B2B / B2B2C</p>
        <form onSubmit={handleSubmit}>
          <label>Adresse email
            <input
              type="email"
              required
              placeholder="toi@recyclace.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>Mot de passe
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <p className="hint centered">
          Pas encore de compte ? Demande à un administrateur de t'en créer un.
        </p>
      </div>
    </div>
  )
}

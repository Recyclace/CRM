import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setLoading(false)
    if (error) {
      setError("Cet email n'est pas autorisé, ou une erreur est survenue.")
    } else {
      setSent(true)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>CRM Recycl'ace</h1>
        <p className="sub">Suivi commercial B2B / B2B2C</p>
        {sent ? (
          <p className="sent-msg">
            Un lien de connexion a été envoyé à <b>{email}</b>. Ouvre-le depuis ta boîte mail pour accéder à l'outil.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>Adresse email</label>
            <input
              type="email"
              required
              placeholder="toi@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={loading}>
              {loading ? 'Envoi...' : 'Recevoir le lien de connexion'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

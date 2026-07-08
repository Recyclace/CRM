import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Settings({ userEmail, onClose }) {
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    setMsg('')
    if (pw1.length < 8) {
      setErr('Le mot de passe doit faire au moins 8 caractères.')
      return
    }
    if (pw1 !== pw2) {
      setErr('Les deux mots de passe ne correspondent pas.')
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pw1 })
    setSaving(false)
    if (error) {
      setErr("Erreur : " + error.message)
    } else {
      setMsg('Mot de passe mis à jour.')
      setPw1('')
      setPw2('')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Paramètres</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <p className="hint">Connecté en tant que {userEmail}</p>
        <form onSubmit={handleSubmit}>
          <label>Nouveau mot de passe
            <input type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} placeholder="8 caractères minimum" />
          </label>
          <label>Confirmer le mot de passe
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </label>
          {err && <p className="error">{err}</p>}
          {msg && <p className="success-msg">{msg}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Fermer</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Changer le mot de passe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

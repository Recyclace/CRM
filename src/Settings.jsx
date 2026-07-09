import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function Settings({ userEmail, onClose }) {
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const [recipients, setRecipients] = useState([])
  const [newRecipient, setNewRecipient] = useState('')
  const [recErr, setRecErr] = useState('')

  useEffect(() => { loadRecipients() }, [])

  async function loadRecipients() {
    const { data, error } = await supabase.from('report_recipients').select('*').order('added_at', { ascending: true })
    if (!error) setRecipients(data || [])
  }

  async function addRecipient(e) {
    e.preventDefault()
    setRecErr('')
    const email = newRecipient.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      setRecErr('Adresse email invalide.')
      return
    }
    const { error } = await supabase.from('report_recipients').insert({ email })
    if (error) {
      setRecErr(error.code === '23505' ? 'Cette adresse est déjà destinataire.' : "Erreur : " + error.message)
      return
    }
    setNewRecipient('')
    loadRecipients()
  }

  async function removeRecipient(email) {
    await supabase.from('report_recipients').delete().eq('email', email)
    loadRecipients()
  }

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

        <hr className="settings-sep" />
        <h3 className="settings-subtitle">Destinataires de la synthèse hebdomadaire</h3>
        <p className="hint">recyclace@gmail.com reçoit toujours la synthèse. Ajoute ici d'autres adresses si besoin.</p>
        <ul className="recipients-list">
          {recipients.map((r) => (
            <li key={r.email}>
              <span>{r.email}</span>
              <button className="link-btn" onClick={() => removeRecipient(r.email)}>Retirer</button>
            </li>
          ))}
          {recipients.length === 0 && <li className="empty">Aucun destinataire additionnel pour l'instant.</li>}
        </ul>
        <form onSubmit={addRecipient} className="add-recipient-form">
          <input type="email" placeholder="nouvelle-adresse@exemple.com" value={newRecipient} onChange={(e) => setNewRecipient(e.target.value)} />
          <button type="submit" className="btn-secondary">Ajouter</button>
        </form>
        {recErr && <p className="error">{recErr}</p>}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { supabase } from './supabaseClient'
import { STATUSES } from './constants'

export default function EditModal({ prospect, onClose, onSaved }) {
  const [form, setForm] = useState({ ...prospect })
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setErr('')
    let action_commentaire = form.action_commentaire || ''
    if (newNote.trim()) {
      const today = new Date().toLocaleDateString('fr-FR')
      const stamped = `${today} : ${newNote.trim()}`
      action_commentaire = action_commentaire ? `${stamped}\n${action_commentaire}` : stamped
    }
    const payload = {
      nom: form.nom,
      contact: form.contact,
      email: form.email,
      telephone: form.telephone,
      ville: form.ville,
      region: form.region,
      departement: form.departement,
      site_web: form.site_web,
      groupe: form.groupe,
      statut: form.statut,
      action_commentaire,
      derniere_maj: new Date().toISOString().slice(0, 10),
    }
    const { data, error } = await supabase
      .from('prospects')
      .update(payload)
      .eq('id', prospect.id)
      .select()
      .single()
    setSaving(false)
    if (error) {
      setErr("Erreur lors de l'enregistrement : " + error.message)
      return
    }
    onSaved(data)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{form.nom}</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-tags">
          <span className="tag">{form.segment}</span>
          <span className="tag">{form.type}</span>
          {form.doublon_potentiel && <span className="tag warn">{form.doublon_potentiel}</span>}
          {form.a_verifier && <span className="tag warn">Statut à vérifier</span>}
        </div>

        <div className="modal-grid">
          <label>Nom
            <input value={form.nom || ''} onChange={(e) => set('nom', e.target.value)} />
          </label>
          <label>Statut
            <select value={form.statut || ''} onChange={(e) => set('statut', e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>Contact
            <input value={form.contact || ''} onChange={(e) => set('contact', e.target.value)} />
          </label>
          <label>Email
            <input value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
          </label>
          <label>Téléphone
            <input value={form.telephone || ''} onChange={(e) => set('telephone', e.target.value)} />
          </label>
          <label>Ville
            <input value={form.ville || ''} onChange={(e) => set('ville', e.target.value)} />
          </label>
          <label>Région
            <input value={form.region || ''} onChange={(e) => set('region', e.target.value)} />
          </label>
          <label>Département
            <input value={form.departement || ''} onChange={(e) => set('departement', e.target.value)} />
          </label>
          <label>Site web
            <input value={form.site_web || ''} onChange={(e) => set('site_web', e.target.value)} />
          </label>
          <label>Groupe / enseigne
            <input value={form.groupe || ''} onChange={(e) => set('groupe', e.target.value)} />
          </label>
        </div>

        <label className="block">Ajouter une note (datée automatiquement)
          <textarea rows={2} placeholder="Ex : relance envoyée, en attente de retour..." value={newNote} onChange={(e) => setNewNote(e.target.value)} />
        </label>

        <label className="block">Historique action / commentaire
          <textarea rows={6} value={form.action_commentaire || ''} onChange={(e) => set('action_commentaire', e.target.value)} />
        </label>

        {form.ancien_statut && <p className="hint">Statut d'origine (avant migration) : {form.ancien_statut}</p>}
        {err && <p className="error">{err}</p>}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { supabase } from './supabaseClient'
import { STATUSES, ASSIGNEES, PROCHAINES_ACTIONS, TYPES_B2B, TYPES_B2B2C } from './constants'

export default function EditModal({ prospect, onClose, onSaved }) {
  const [form, setForm] = useState({ ...prospect })
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const isNew = !!prospect._isNew
  const typeOptions = form.segment === 'B2B2C' ? TYPES_B2B2C : TYPES_B2B

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.nom || !form.nom.trim()) { setErr('Le nom est obligatoire.'); return }
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
      fft_engage: form.fft_engage,
      statut: form.statut,
      prochaine_action: form.prochaine_action || null,
      lead_chaud: form.lead_chaud,
      stand_by: form.stand_by,
      important: form.important,
      a_suivre: form.a_suivre,
      assigned_to: form.assigned_to || null,
      action_commentaire,
      // La date ne change que si une nouvelle note (commentaire) est ajoutée
      derniere_maj: newNote.trim() ? new Date().toISOString().slice(0, 10) : (form.derniere_maj || null),
    }
    let data, error
    if (isNew) {
      ({ data, error } = await supabase
        .from('prospects')
        .insert({ ...payload, segment: form.segment, type: form.type || null })
        .select()
        .single())
    } else {
      ({ data, error } = await supabase
        .from('prospects')
        .update(payload)
        .eq('id', prospect.id)
        .select()
        .single())
    }
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
          <h2>{isNew ? 'Nouvelle fiche client' : form.nom}</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-tags">
          <span className="tag">{form.segment}</span>
          {isNew ? (
            <select className="tag-select" value={form.type || ''} onChange={(e) => set('type', e.target.value)}>
              <option value="">Type…</option>
              {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          ) : (
            <span className="tag">{form.type}</span>
          )}
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
          <label>Contact (nom de la personne)
            <input value={form.contact || ''} onChange={(e) => set('contact', e.target.value)} />
          </label>
          <label>Assigné à
            <select value={form.assigned_to || ''} onChange={(e) => set('assigned_to', e.target.value)}>
              <option value="">—</option>
              {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label>Action
            <select value={form.prochaine_action || ''} onChange={(e) => set('prochaine_action', e.target.value)}>
              <option value="">—</option>
              {PROCHAINES_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
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
          <label>FFT Engagé
            <select value={form.fft_engage || ''} onChange={(e) => set('fft_engage', e.target.value)}>
              <option value="">—</option>
              <option value="Oui">Oui</option>
              <option value="Non">Non</option>
            </select>
          </label>
          <label>Site web
            <input value={form.site_web || ''} onChange={(e) => set('site_web', e.target.value)} />
          </label>
          <label>Groupe / enseigne
            <input value={form.groupe || ''} onChange={(e) => set('groupe', e.target.value)} />
          </label>
        </div>

        <div className="modal-checkboxes">
          <label className="checkbox-inline">
            <input type="checkbox" checked={!!form.lead_chaud} onChange={(e) => set('lead_chaud', e.target.checked)} /> Lead chaud
          </label>
          <label className="checkbox-inline">
            <input type="checkbox" checked={!!form.important} onChange={(e) => set('important', e.target.checked)} /> Important
          </label>
          <label className="checkbox-inline">
            <input type="checkbox" checked={!!form.a_suivre} onChange={(e) => set('a_suivre', e.target.checked)} /> À suivre
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

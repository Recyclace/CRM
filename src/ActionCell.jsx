import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function ActionCell({ prospect, onUpdated }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function publish() {
    if (!note.trim()) return
    setSaving(true)
    const today = new Date().toLocaleDateString('fr-FR')
    const stamped = `${today} : ${note.trim()}`
    const existing = prospect.action_commentaire || ''
    const merged = existing ? `${stamped}\n${existing}` : stamped
    const { data, error } = await supabase
      .from('prospects')
      .update({ action_commentaire: merged, derniere_maj: new Date().toISOString().slice(0, 10) })
      .eq('id', prospect.id)
      .select()
      .single()
    setSaving(false)
    if (!error && data) {
      onUpdated(data)
      setNote('')
    }
  }

  const preview = prospect.action_commentaire || ''
  const firstLine = preview.split('\n')[0]

  return (
    <div className="action-cell">
      {preview && (
        <div className="action-history" onClick={() => setExpanded((e) => !e)}>
          {expanded ? preview : firstLine}
          {preview.includes('\n') && (
            <span className="expand-hint">{expanded ? ' (réduire)' : ' (voir tout)'}</span>
          )}
        </div>
      )}
      <div className="action-input-row">
        <input
          type="text"
          placeholder="Ajouter un commentaire..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') publish() }}
        />
        <button onClick={publish} disabled={saving || !note.trim()}>Publier</button>
      </div>
    </div>
  )
}

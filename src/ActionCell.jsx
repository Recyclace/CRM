import { useState } from 'react'
import { supabase } from './supabaseClient'
import { mergeComment } from './constants'

export default function ActionCell({ prospect, onUpdated, onOpen }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function publish() {
    if (!note.trim()) return
    setSaving(true)
    const merged = mergeComment(prospect.action_commentaire, note)
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
  const lines = preview.split('\n').filter(Boolean)
  const lastTwo = lines.slice(0, 2).join('\n')
  const hasMore = lines.length > 2

  return (
    <div className="action-cell">
      {preview && (
        <div
          className={`action-history${onOpen ? ' clickable-open' : ''}`}
          title={onOpen ? 'Cliquer pour ouvrir la fiche' : undefined}
          onClick={() => (onOpen ? onOpen() : setExpanded((e) => !e))}
        >
          {expanded ? preview : lastTwo}
          {hasMore && (
            <span
              className="expand-hint"
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
            >
              {expanded ? ' (réduire)' : " (voir tout l'historique)"}
            </span>
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

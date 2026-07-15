import { useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import { STATUSES, STATUS_COLORS, ASSIGNEES, PROCHAINES_ACTIONS, nameSort, sortByDate, formatMulti } from './constants'
import ActionCell from './ActionCell'
import ExportButton from './ExportButton'
import CopyEmailsButton from './CopyEmailsButton'
import MultiSelectDropdown from './MultiSelectDropdown'

const PAGE_SIZE = 100
const DEFAULT_FILTERS = { search: '', type: [], region: [], departement: [], statut: [], action: [], assignedTo: [], leadChaud: false, fftEngage: false, important: false, aSuivre: false, sortBy: 'nom' }

export default function ProspectsTable({ prospects, types, segmentLabel, onOpen, onLocalUpdate, filters = DEFAULT_FILTERS, setFilters }) {
  const [page, setPage] = useState(0)
  const [flashId, setFlashId] = useState(null)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [undoStack, setUndoStack] = useState([])
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)
  const isB2B = segmentLabel === 'B2B'
  const leadLabel = isB2B ? 'Lead chaud' : 'Lead intéressé'
  const colCount = isB2B ? 12 : 14

  function set(field, value) {
    setFilters((f) => {
      const next = { ...f, [field]: value }
      if (field === 'region') next.departement = []
      return next
    })
    setPage(0)
  }

  const activeFilterCount =
    (filters.search.trim() ? 1 : 0) +
    filters.type.length + filters.region.length + filters.departement.length +
    filters.statut.length + (filters.action?.length || 0) + filters.assignedTo.length +
    (filters.leadChaud ? 1 : 0) + (filters.aSuivre ? 1 : 0) +
    (filters.fftEngage ? 1 : 0) + (filters.important ? 1 : 0)

  function clearFilters() {
    setFilters((f) => ({ ...DEFAULT_FILTERS, sortBy: f.sortBy || 'nom' }))
    setPage(0)
  }

  const regions = useMemo(() => {
    const set = new Set()
    prospects.forEach((p) => { if (p.region) set.add(p.region) })
    return Array.from(set).sort()
  }, [prospects])

  const departements = useMemo(() => {
    const set = new Set()
    prospects.forEach((p) => {
      if (!p.departement) return
      if (filters.region.length && !filters.region.includes(p.region)) return
      set.add(p.departement)
    })
    return Array.from(set).sort()
  }, [prospects, filters.region])

  const filtered = useMemo(() => {
    const s = filters.search.trim().toLowerCase()
    const sortBy = filters.sortBy || 'nom'
    const flagsChecked = filters.leadChaud || filters.fftEngage || filters.important || filters.aSuivre
    return prospects
      .filter((p) => {
        if (filters.type.length && !filters.type.includes(p.type)) return false
        if (filters.region.length && !filters.region.includes(p.region)) return false
        if (filters.departement.length && !filters.departement.includes(p.departement)) return false
        if (filters.statut.length && !filters.statut.includes(p.statut)) return false
        if (filters.action?.length && !filters.action.includes(p.prochaine_action)) return false
        if (filters.assignedTo.length && !filters.assignedTo.includes(p.assigned_to)) return false
        if (flagsChecked) {
          const matches = (filters.leadChaud && p.lead_chaud) || (filters.fftEngage && p.fft_engage === 'Oui') || (filters.important && p.important) || (filters.aSuivre && p.a_suivre)
          if (!matches) return false
        }
        if (s) {
          const hay = [p.nom, p.contact, p.email, p.ville, p.region].filter(Boolean).join(' ').toLowerCase()
          if (!hay.includes(s)) return false
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'date_recent') return sortByDate(a, b, 'desc')
        if (sortBy === 'date_ancien') return sortByDate(a, b, 'asc')
        return nameSort(a, b)
      })
  }, [prospects, filters])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const rows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  function pushUndo(items) {
    setUndoStack((s) => [...s.slice(-19), items])
  }

  // La colonne "Dernière MAJ" ne change QUE lors d'un ajout de commentaire.
  // Modifier un statut, une case ou une attribution ne met PAS à jour la date.
  async function updateField(prospect, patch) {
    pushUndo([{ id: prospect.id, prev: { ...prospect } }])
    onLocalUpdate({ ...prospect, ...patch })
    setFlashId(prospect.id)
    setTimeout(() => setFlashId((id) => (id === prospect.id ? null : id)), 850)
    const { data, error } = await supabase
      .from('prospects')
      .update(patch)
      .eq('id', prospect.id)
      .select()
      .single()
    if (!error && data) onLocalUpdate(data)
  }

  const UNDO_FIELDS = ['statut', 'prochaine_action', 'lead_chaud', 'stand_by', 'important', 'fft_engage', 'assigned_to', 'action_commentaire', 'derniere_maj']
  async function undoLast() {
    if (undoStack.length === 0) return
    const items = undoStack[undoStack.length - 1]
    setUndoStack((s) => s.slice(0, -1))
    for (const it of items) {
      onLocalUpdate(it.prev)
      const restore = {}
      UNDO_FIELDS.forEach((f) => { restore[f] = it.prev[f] ?? null })
      await supabase.from('prospects').update(restore).eq('id', it.id)
    }
  }

  function toggleRow(id) {
    setSelectedIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAllOnPage() {
    setSelectedIds((s) => {
      const n = new Set(s)
      const allSel = rows.length > 0 && rows.every((p) => n.has(p.id))
      if (allSel) rows.forEach((p) => n.delete(p.id))
      else rows.forEach((p) => n.add(p.id))
      return n
    })
  }

  async function applyBulkComment() {
    const text = bulkText.trim()
    if (!text) return
    setBulkSaving(true)
    const today = new Date().toLocaleDateString('fr-FR')
    const stamped = `${today} : ${text}`
    const maj = new Date().toISOString().slice(0, 10)
    const undoItems = []
    for (const id of selectedIds) {
      const p = prospects.find((x) => x.id === id)
      if (!p) continue
      undoItems.push({ id, prev: { ...p } })
      const merged = p.action_commentaire ? `${stamped}\n${p.action_commentaire}` : stamped
      const patch = { action_commentaire: merged, derniere_maj: maj }
      onLocalUpdate({ ...p, ...patch })
      await supabase.from('prospects').update(patch).eq('id', id)
    }
    if (undoItems.length) pushUndo(undoItems)
    setBulkSaving(false)
    setBulkOpen(false)
    setBulkText('')
    // On garde la sélection active après l'ajout du commentaire
  }

  // Applique une même valeur (statut ou action) à toutes les lignes sélectionnées.
  // Ne change PAS la date (seuls les commentaires la modifient).
  async function applyBulkField(field, value) {
    const ids = [...selectedIds]
    const undoItems = []
    for (const id of ids) {
      const p = prospects.find((x) => x.id === id)
      if (!p) continue
      undoItems.push({ id, prev: { ...p } })
      onLocalUpdate({ ...p, [field]: value })
      await supabase.from('prospects').update({ [field]: value }).eq('id', id)
    }
    if (undoItems.length) pushUndo(undoItems)
    // sélection conservée
  }

  function rowClass(p) {
    const classes = []
    if (p.doublon_potentiel) classes.push('flagged')
    if (p.statut === 'Stand by') classes.push('row-standby')
    if (p.statut === 'Sans retour') classes.push('row-sansretour')
    if (p.id === flashId) classes.push('row-flash')
    return classes.join(' ')
  }

  return (
    <div className="prospects-table-wrap">
      <div className="filters-bar">
        <div className="filters-row">
          <input className="search search-compact" type="text" placeholder="Rechercher..."
            value={filters.search} onChange={(e) => set('search', e.target.value)} />
          <MultiSelectDropdown label="Type" options={types} selected={filters.type} onChange={(v) => set('type', v)} />
          <MultiSelectDropdown label="Région" options={regions} selected={filters.region} onChange={(v) => set('region', v)} />
          <MultiSelectDropdown label="Département" options={departements} selected={filters.departement} onChange={(v) => set('departement', v)} />
          <MultiSelectDropdown label="Statut" options={STATUSES} selected={filters.statut} onChange={(v) => set('statut', v)} />
          <MultiSelectDropdown label="Action" options={PROCHAINES_ACTIONS} selected={filters.action || []} onChange={(v) => set('action', v)} />
          <MultiSelectDropdown label="Assigné à" options={ASSIGNEES} selected={filters.assignedTo} onChange={(v) => set('assignedTo', v)} />
          <select value={filters.sortBy || 'nom'} onChange={(e) => set('sortBy', e.target.value)}>
            <option value="nom">Trier : Nom (A-Z)</option>
            <option value="date_recent">Trier : Date (plus récente)</option>
            <option value="date_ancien">Trier : Date (plus ancienne)</option>
          </select>
        </div>
        <div className="filters-row">
          <label className="checkbox-inline">
            <input type="checkbox" checked={filters.leadChaud} onChange={(e) => set('leadChaud', e.target.checked)} />
            {leadLabel}
          </label>
          {isB2B && (
            <label className="checkbox-inline">
              <input type="checkbox" checked={filters.fftEngage} onChange={(e) => set('fftEngage', e.target.checked)} />
              FFT engagé
            </label>
          )}
          <label className="checkbox-inline">
            <input type="checkbox" checked={filters.important} onChange={(e) => set('important', e.target.checked)} />
            Important
          </label>
          <label className="checkbox-inline">
            <input type="checkbox" checked={filters.aSuivre} onChange={(e) => set('aSuivre', e.target.checked)} />
            À suivre
          </label>
        </div>
        <div className="filters-row-2">
          <div className="count-info">
            <strong>{filtered.length}</strong> / {prospects.length} {segmentLabel}
            {activeFilterCount > 0 && (
              <button className="clear-filters-btn" onClick={clearFilters} title="Réinitialiser tous les filtres">
                ✕ Effacer les filtres ({activeFilterCount})
              </button>
            )}
          </div>
          <div className="filters-row-2-actions">
            <button className="btn-primary new-fiche-btn" onClick={() => onOpen({ _isNew: true, segment: segmentLabel, type: '', statut: 'À contacter', lead_chaud: false, stand_by: false, important: false, a_suivre: false, fft_engage: 'Non', action_commentaire: '', prochaine_action: null, assigned_to: null })} title="Créer une nouvelle fiche client">＋ Nouvelle fiche</button>
            <button className="undo-btn" onClick={undoLast} disabled={undoStack.length === 0} title="Annuler la dernière action (comme Ctrl+Z)">↶ Annuler</button>
            {selectedIds.size > 0 && (
              <>
                <select className="bulk-select" value="" onChange={(e) => { if (e.target.value) applyBulkField('statut', e.target.value) }} title="Attribuer ce statut aux lignes sélectionnées">
                  <option value="">Statut ▾ ({selectedIds.size})</option>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="bulk-select" value="" onChange={(e) => { if (e.target.value) applyBulkField('prochaine_action', e.target.value) }} title="Attribuer cette action aux lignes sélectionnées">
                  <option value="">Action ▾ ({selectedIds.size})</option>
                  {PROCHAINES_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <button className="btn-secondary bulk-comment-btn" onClick={() => setBulkOpen(true)}>💬 Commentaire ({selectedIds.size})</button>
              </>
            )}
            <CopyEmailsButton rows={selectedIds.size > 0 ? filtered.filter((p) => selectedIds.has(p.id)) : filtered} count={selectedIds.size} />
            <ExportButton rows={filtered} filename={`${segmentLabel}-export.xlsx`} />
          </div>
        </div>
      </div>

      <div className="list-view">
        <table className="fixed-table prospects-cols">
          <colgroup>
            {(isB2B
              ? ['3%', '12%', '8%', '8%', '5%', '8%', '9%', '6%', '7%', '16%', '10%', '8%']
              : ['3%', '11%', '7%', '7%', '6%', '5%', '7%', '8%', '5%', '6%', '14%', '8%', '5%', '8%']
            ).map((w, i) => <col key={i} style={{ width: w }} />)}
          </colgroup>
          <thead>
            <tr>
              <th className="cell-check"><input type="checkbox" aria-label="Tout sélectionner" checked={rows.length > 0 && rows.every((p) => selectedIds.has(p.id))} onChange={toggleAllOnPage} /></th>
              <th>Nom</th>
              {!isB2B && <th>Ville</th>}
              <th>Statut</th>
              <th>Action</th>
              <th>MAJ</th>
              <th>Téléphone</th>
              <th>Mail</th>
              <th>Département</th>
              <th>Région</th>
              <th>Action / Commentaire</th>
              <th className="th-flags" title={`${leadLabel} · Important · À suivre${isB2B ? ' · FFT engagé' : ''}`}>Critère</th>
              {!isB2B && <th>Site</th>}
              <th>Assigné à</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className={rowClass(p)}>
                <td className="cell-check"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleRow(p.id)} /></td>
                <td className="cell-nom" onClick={() => onOpen(p)} title={`${p.nom} — cliquer pour ouvrir la fiche`}>
                  <span className="clamp-2">{p.nom}</span>
                  {!isB2B && p.groupe && <span className="cell-sub">{p.groupe}</span>}
                </td>
                {!isB2B && <td className="cell-wrap" title={p.ville || ''}>{p.ville || '—'}</td>}
                <td>
                  <select
                    className="status-select"
                    value={p.statut}
                    style={{ background: STATUS_COLORS[p.statut], color: '#fff' }}
                    onChange={(e) => updateField(p, { statut: e.target.value })}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td>
                  <select value={p.prochaine_action || ''} onChange={(e) => updateField(p, { prochaine_action: e.target.value || null })}>
                    <option value="">—</option>
                    {PROCHAINES_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </td>
                <td>{p.derniere_maj || '—'}</td>
                <td className="cell-wrap" title={formatMulti(p.telephone)}>{formatMulti(p.telephone)}</td>
                <td className="cell-wrap" title={formatMulti(p.email)}>{formatMulti(p.email)}</td>
                <td>{p.departement || '—'}</td>
                <td>{p.region || '—'}</td>
                <td className="cell-action"><ActionCell prospect={p} onUpdated={onLocalUpdate} onOpen={() => onOpen(p)} /></td>
                <td className="cell-flags">
                  <div className="flag-toggles">
                    <button type="button" className={`flag-toggle${p.lead_chaud ? ' on' : ''}`}
                      title={leadLabel} aria-label={leadLabel} aria-pressed={!!p.lead_chaud}
                      onClick={() => updateField(p, { lead_chaud: !p.lead_chaud })}>🔥</button>
                    <button type="button" className={`flag-toggle${p.important ? ' on' : ''}`}
                      title="Important" aria-label="Important" aria-pressed={!!p.important}
                      onClick={() => updateField(p, { important: !p.important })}>⭐</button>
                    <button type="button" className={`flag-toggle${p.a_suivre ? ' on' : ''}`}
                      title="À suivre" aria-label="À suivre" aria-pressed={!!p.a_suivre}
                      onClick={() => updateField(p, { a_suivre: !p.a_suivre })}>❗</button>
                    {isB2B && (
                      <button type="button" className={`flag-toggle${p.fft_engage === 'Oui' ? ' on' : ''}`}
                        title="FFT engagé" aria-label="FFT engagé" aria-pressed={p.fft_engage === 'Oui'}
                        onClick={() => updateField(p, { fft_engage: p.fft_engage === 'Oui' ? 'Non' : 'Oui' })}>🎾</button>
                    )}
                  </div>
                </td>
                {!isB2B && (
                  <td className="cell-link">
                    {p.site_web
                      ? <a href={p.site_web.startsWith('http') ? p.site_web : `https://${p.site_web}`} target="_blank" rel="noreferrer" className="site-link">Lien ↗</a>
                      : '—'}
                  </td>
                )}
                <td>
                  <select value={p.assigned_to || ''} onChange={(e) => updateField(p, { assigned_to: e.target.value || null })}>
                    <option value="">—</option>
                    {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={colCount} className="empty-row">
                  {activeFilterCount > 0
                    ? <>Aucun {segmentLabel} ne correspond aux filtres. <button className="link-btn" onClick={clearFilters}>Effacer les filtres</button></>
                    : <>Aucun {segmentLabel} pour l'instant.</>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 0 && (
        <div className="pagination">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Précédent</button>
          <span className="pagination-info">
            {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + rows.length} sur {filtered.length}
            <span className="pagination-page">Page {page + 1} / {pageCount}</span>
          </span>
          <button disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>Suivant →</button>
        </div>
      )}

      {bulkOpen && (
        <div className="modal-overlay" onClick={() => !bulkSaving && setBulkOpen(false)}>
          <div className="modal bulk-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Commentaire global</h2>
              <button className="icon-btn" onClick={() => setBulkOpen(false)}>✕</button>
            </div>
            <p className="hint">Ce commentaire (daté du jour) sera ajouté à <strong>{selectedIds.size}</strong> ligne(s) sélectionnée(s), avec mise à jour de la date.</p>
            <label className="block">Commentaire
              <textarea rows={3} value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="Ex : relance groupée effectuée..." autoFocus />
            </label>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setBulkOpen(false)} disabled={bulkSaving}>Annuler</button>
              <button className="btn-primary" onClick={applyBulkComment} disabled={bulkSaving || !bulkText.trim()}>{bulkSaving ? 'Ajout...' : 'Terminé'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

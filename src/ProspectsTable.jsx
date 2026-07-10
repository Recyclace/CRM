import { useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import { STATUSES, STATUS_COLORS, ASSIGNEES, PROCHAINES_ACTIONS, nameSort, sortByDate, formatMulti } from './constants'
import ActionCell from './ActionCell'
import ExportButton from './ExportButton'
import CopyEmailsButton from './CopyEmailsButton'
import MultiSelectDropdown from './MultiSelectDropdown'

const PAGE_SIZE = 100
const DEFAULT_FILTERS = { search: '', type: [], region: [], departement: [], statut: [], assignedTo: [], leadChaud: false, standBy: false, fftEngage: false, important: false, sortBy: 'nom' }

export default function ProspectsTable({ prospects, types, segmentLabel, onOpen, onLocalUpdate, filters = DEFAULT_FILTERS, setFilters }) {
  const [page, setPage] = useState(0)
  const [flashId, setFlashId] = useState(null)
  const isB2B = segmentLabel === 'B2B'
  const leadLabel = isB2B ? 'Lead chaud' : 'Lead intéressé'
  const colCount = isB2B ? 12 : 13

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
    filters.statut.length + filters.assignedTo.length +
    (filters.leadChaud ? 1 : 0) + (filters.standBy ? 1 : 0) +
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
    const flagsChecked = filters.leadChaud || filters.standBy || filters.fftEngage || filters.important
    return prospects
      .filter((p) => {
        if (filters.type.length && !filters.type.includes(p.type)) return false
        if (filters.region.length && !filters.region.includes(p.region)) return false
        if (filters.departement.length && !filters.departement.includes(p.departement)) return false
        if (filters.statut.length && !filters.statut.includes(p.statut)) return false
        if (filters.assignedTo.length && !filters.assignedTo.includes(p.assigned_to)) return false
        if (flagsChecked) {
          const matches = (filters.leadChaud && p.lead_chaud) || (filters.standBy && p.stand_by) || (filters.fftEngage && p.fft_engage === 'Oui') || (filters.important && p.important)
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

  async function updateField(prospect, patch) {
    onLocalUpdate({ ...prospect, ...patch })
    setFlashId(prospect.id)
    setTimeout(() => setFlashId((id) => (id === prospect.id ? null : id)), 850)
    const { data, error } = await supabase
      .from('prospects')
      .update({ ...patch, derniere_maj: new Date().toISOString().slice(0, 10) })
      .eq('id', prospect.id)
      .select()
      .single()
    if (!error && data) onLocalUpdate(data)
  }

  function rowClass(p) {
    const classes = []
    if (p.doublon_potentiel) classes.push('flagged')
    if (p.stand_by) classes.push('row-standby')
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
          <label className="checkbox-inline">
            <input type="checkbox" checked={filters.standBy} onChange={(e) => set('standBy', e.target.checked)} />
            Stand by
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
          <ExportButton rows={filtered} filename={`${segmentLabel}-export.xlsx`} />
        </div>
      </div>

      <div className="list-view">
        <table className="fixed-table prospects-cols">
          <colgroup>
            {(isB2B
              ? ['13%', '8%', '8%', '7%', '5%', '9%', '13%', '6%', '6%', '12%', '8%', '5%']
              : ['12%', '8%', '7%', '6%', '5%', '8%', '12%', '5%', '6%', '12%', '6%', '5%', '8%']
            ).map((w, i) => <col key={i} style={{ width: w }} />)}
          </colgroup>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Ville</th>
              <th>Statut</th>
              <th>Action</th>
              <th>MAJ</th>
              <th>Téléphone</th>
              <th>Mail <CopyEmailsButton rows={filtered} /></th>
              <th>Département</th>
              <th>Région</th>
              <th>Action / Commentaire</th>
              <th className="th-flags" title={`${leadLabel} · Stand by · Important${isB2B ? ' · FFT engagé' : ''}`}>Statuts</th>
              {!isB2B && <th>Site</th>}
              <th>Assigné à</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className={rowClass(p)}>
                <td className="cell-nom" onClick={() => onOpen(p)} title={`${p.nom} — cliquer pour ouvrir la fiche`}>
                  <span className="clamp-2">{p.nom}</span>
                  {!isB2B && p.groupe && <span className="cell-sub">{p.groupe}</span>}
                </td>
                <td className="cell-wrap" title={p.ville || ''}>{p.ville || '—'}</td>
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
                    <button type="button" className={`flag-toggle${p.stand_by ? ' on' : ''}`}
                      title="Stand by" aria-label="Stand by" aria-pressed={!!p.stand_by}
                      onClick={() => updateField(p, { stand_by: !p.stand_by })}>⏸️</button>
                    <button type="button" className={`flag-toggle${p.important ? ' on' : ''}`}
                      title="Important" aria-label="Important" aria-pressed={!!p.important}
                      onClick={() => updateField(p, { important: !p.important })}>⭐</button>
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
    </div>
  )
}

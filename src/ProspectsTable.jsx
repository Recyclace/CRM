import { useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import { STATUSES, STATUS_COLORS, ASSIGNEES, nameSort, sortByDate, formatMulti } from './constants'
import ActionCell from './ActionCell'
import ExportButton from './ExportButton'
import CopyEmailsButton from './CopyEmailsButton'
import MultiSelectDropdown from './MultiSelectDropdown'

const PAGE_SIZE = 100

export default function ProspectsTable({ prospects, types, segmentLabel, onOpen, onLocalUpdate, filters, setFilters }) {
  const [page, setPage] = useState(0)
  const isB2B = segmentLabel === 'B2B'
  const leadLabel = isB2B ? 'Lead chaud' : 'Lead intéressé'

  function set(field, value) {
    setFilters((f) => {
      const next = { ...f, [field]: value }
      if (field === 'region') next.departement = []
      return next
    })
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
    return prospects
      .filter((p) => {
        if (filters.type.length && !filters.type.includes(p.type)) return false
        if (filters.region.length && !filters.region.includes(p.region)) return false
        if (filters.departement.length && !filters.departement.includes(p.departement)) return false
        if (filters.statut.length && !filters.statut.includes(p.statut)) return false
        if (filters.assignedTo.length && !filters.assignedTo.includes(p.assigned_to)) return false
        if (filters.onlyFlagged && !p.lead_chaud && !p.stand_by && !p.doublon_potentiel) return false
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
    return classes.join(' ')
  }

  return (
    <div className="prospects-table-wrap">
      <div className="filters-bar">
        <div className="filters-row">
          <input className="search" type="text" placeholder="Rechercher (nom, contact, email, ville...)"
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
          <label className="checkbox-inline">
            <input type="checkbox" checked={filters.onlyFlagged} onChange={(e) => set('onlyFlagged', e.target.checked)} />
            {leadLabel} / Stand by
          </label>
        </div>
        <div className="filters-row-2">
          <div className="count-info">{filtered.length} / {prospects.length} {segmentLabel}</div>
          <ExportButton rows={filtered} filename={`${segmentLabel}-export.xlsx`} />
        </div>
      </div>

      <div className="list-view">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Statut</th>
              <th>Dernière MAJ</th>
              <th>Téléphone</th>
              <th>Mail <CopyEmailsButton rows={filtered} /></th>
              <th>Département</th>
              <th>Région</th>
              <th>Action / Commentaire</th>
              <th>{leadLabel}</th>
              <th>Stand by</th>
              {isB2B ? <th>FFT Engagé</th> : <th>Site web</th>}
              <th>Assigné à</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className={rowClass(p)}>
                <td className="cell-nom" onClick={() => onOpen(p)}>{p.nom}</td>
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
                <td>{p.derniere_maj || '—'}</td>
                <td>{formatMulti(p.telephone)}</td>
                <td>{formatMulti(p.email)}</td>
                <td>{p.departement || '—'}</td>
                <td>{p.region || '—'}</td>
                <td className="cell-action"><ActionCell prospect={p} onUpdated={onLocalUpdate} /></td>
                <td className="cell-check">
                  <input type="checkbox" checked={!!p.lead_chaud} onChange={(e) => updateField(p, { lead_chaud: e.target.checked })} />
                </td>
                <td className="cell-check">
                  <input type="checkbox" checked={!!p.stand_by} onChange={(e) => updateField(p, { stand_by: e.target.checked })} />
                </td>
                {isB2B ? (
                  <td className="cell-check">
                    <input type="checkbox" checked={p.fft_engage === 'Oui'} onChange={(e) => updateField(p, { fft_engage: e.target.checked ? 'Oui' : 'Non' })} />
                  </td>
                ) : (
                  <td>
                    {p.site_web
                      ? <a href={p.site_web.startsWith('http') ? p.site_web : `https://${p.site_web}`} target="_blank" rel="noreferrer">{p.site_web}</a>
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
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Précédent</button>
        <span>Page {page + 1} / {pageCount}</span>
        <button disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>Suivant →</button>
      </div>
    </div>
  )
}

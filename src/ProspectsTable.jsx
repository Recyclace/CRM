import { useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import { STATUSES, STATUS_COLORS, ASSIGNEES, nameSort } from './constants'
import ActionCell from './ActionCell'
import ExportButton from './ExportButton'

const PAGE_SIZE = 100

export default function ProspectsTable({ prospects, types, segmentLabel, onOpen, onLocalUpdate }) {
  const [filters, setFilters] = useState({ search: '', type: '', region: '', departement: '', statut: '', assignedTo: '', onlyFlagged: false })
  const [page, setPage] = useState(0)

  function set(field, value) {
    setFilters((f) => {
      const next = { ...f, [field]: value }
      if (field === 'region') next.departement = ''
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
      if (filters.region && p.region !== filters.region) return
      set.add(p.departement)
    })
    return Array.from(set).sort()
  }, [prospects, filters.region])

  const filtered = useMemo(() => {
    const s = filters.search.trim().toLowerCase()
    return prospects
      .filter((p) => {
        if (filters.type && p.type !== filters.type) return false
        if (filters.region && p.region !== filters.region) return false
        if (filters.departement && p.departement !== filters.departement) return false
        if (filters.statut && p.statut !== filters.statut) return false
        if (filters.assignedTo && p.assigned_to !== filters.assignedTo) return false
        if (filters.onlyFlagged && !p.lead_chaud && !p.stand_by && !p.doublon_potentiel && !p.a_verifier) return false
        if (s) {
          const hay = [p.nom, p.contact, p.email, p.ville, p.region].filter(Boolean).join(' ').toLowerCase()
          if (!hay.includes(s)) return false
        }
        return true
      })
      .sort(nameSort)
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

  return (
    <div className="prospects-table-wrap">
      <div className="filters-bar">
        <div className="filters-row">
          <input className="search" type="text" placeholder="Rechercher (nom, contact, email, ville...)"
            value={filters.search} onChange={(e) => set('search', e.target.value)} />
          <select value={filters.type} onChange={(e) => set('type', e.target.value)}>
            <option value="">Tous types</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filters.region} onChange={(e) => set('region', e.target.value)}>
            <option value="">Toutes régions</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filters.departement} onChange={(e) => set('departement', e.target.value)}>
            <option value="">Tous départements</option>
            {departements.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filters.statut} onChange={(e) => set('statut', e.target.value)}>
            <option value="">Tous statuts</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.assignedTo} onChange={(e) => set('assignedTo', e.target.value)}>
            <option value="">Tous responsables</option>
            {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <label className="checkbox-inline">
            <input type="checkbox" checked={filters.onlyFlagged} onChange={(e) => set('onlyFlagged', e.target.checked)} />
            Lead chaud / Stand by / à vérifier
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
              <th>Assigné à</th>
              <th>Dernière MAJ</th>
              <th>Téléphone</th>
              <th>Mail</th>
              <th>Département</th>
              <th>Région</th>
              <th>Action / Commentaire</th>
              <th>Lead chaud</th>
              <th>Stand by</th>
              <th>FFT Engagé</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className={p.doublon_potentiel || p.a_verifier ? 'flagged' : ''}>
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
                <td>
                  <select value={p.assigned_to || ''} onChange={(e) => updateField(p, { assigned_to: e.target.value || null })}>
                    <option value="">—</option>
                    {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </td>
                <td>{p.derniere_maj || '—'}</td>
                <td>{p.telephone || '—'}</td>
                <td>{p.email || '—'}</td>
                <td>{p.departement || '—'}</td>
                <td>{p.region || '—'}</td>
                <td className="cell-action"><ActionCell prospect={p} onUpdated={onLocalUpdate} /></td>
                <td className="cell-check">
                  <input type="checkbox" checked={!!p.lead_chaud} onChange={(e) => updateField(p, { lead_chaud: e.target.checked })} />
                </td>
                <td className="cell-check">
                  <input type="checkbox" checked={!!p.stand_by} onChange={(e) => updateField(p, { stand_by: e.target.checked })} />
                </td>
                <td>{p.fft_engage || '—'}</td>
                <td><button className="link-btn" onClick={() => onOpen(p)}>Fiche</button></td>
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

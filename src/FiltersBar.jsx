import { SEGMENTS, TYPES } from './constants'

export default function FiltersBar({ filters, setFilters, regions, view, setView, total, filteredCount, userEmail, onLogout, onSettings }) {
  function set(field, value) {
    setFilters((f) => ({ ...f, [field]: value }))
  }
  return (
    <div className="filters-bar">
      <div className="filters-row">
        <input
          className="search"
          type="text"
          placeholder="Rechercher (nom, contact, email, ville...)"
          value={filters.search}
          onChange={(e) => set('search', e.target.value)}
        />
        <select value={filters.segment} onChange={(e) => set('segment', e.target.value)}>
          <option value="">Tous segments</option>
          {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.type} onChange={(e) => set('type', e.target.value)}>
          <option value="">Tous types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filters.region} onChange={(e) => set('region', e.target.value)}>
          <option value="">Toutes régions</option>
          {regions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <label className="checkbox-inline">
          <input type="checkbox" checked={filters.onlyFlagged} onChange={(e) => set('onlyFlagged', e.target.checked)} />
          À vérifier / doublons
        </label>
      </div>
      <div className="filters-row-2">
        <div className="view-toggle">
          <button className={view === 'kanban' ? 'active' : ''} onClick={() => setView('kanban')}>Kanban</button>
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>Liste</button>
        </div>
        <div className="count-info">{filteredCount} / {total} prospects</div>
        <div className="user-info">
          {userEmail} · <button className="link-btn" onClick={onSettings}>Paramètres</button> · <button className="link-btn" onClick={onLogout}>Se déconnecter</button>
        </div>
      </div>
    </div>
  )
}

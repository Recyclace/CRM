import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { isPropaleEffective, daysAgo } from './constants'
import MultiSelectDropdown from './MultiSelectDropdown'

function computeKpis(prospects) {
  const total = prospects.length
  const b2b = prospects.filter((p) => p.segment === 'B2B').length
  const b2b2c = prospects.filter((p) => p.segment === 'B2B2C').length
  const signes = prospects.filter((p) => p.statut === 'Devis signé').length
  const leadsChauds = prospects.filter((p) => p.lead_chaud).length
  const standBy = prospects.filter((p) => p.stand_by).length
  const relances = prospects.filter((p) => p.statut === 'Propale envoyée' && daysAgo(p.derniere_maj) > 14).length
  const propalesEffectives = prospects.filter(isPropaleEffective).length
  const devisEnvoyes = prospects.filter((p) => p.statut === 'Devis envoyé').length
  const tauxConversion = propalesEffectives ? ((signes / propalesEffectives) * 100).toFixed(1) : '0.0'
  return { total, b2b, b2b2c, signes, leadsChauds, standBy, relances, propalesEffectives, devisEnvoyes, tauxConversion }
}

export default function Dashboard({ prospects, onOpen, filters, setFilters }) {
  const [history, setHistory] = useState([])

  useEffect(() => {
    let all = []
    let from = 0
    const PAGE = 1000
    async function load() {
      while (true) {
        const { data, error } = await supabase
          .from('status_history')
          .select('statut, changed_at, prospect_id')
          .range(from, from + PAGE - 1)
        if (error || !data || data.length === 0) break
        all = all.concat(data)
        from += data.length
        if (data.length < PAGE) break
      }
      setHistory(all)
    }
    load()
  }, [])

  function set(field, value) {
    setFilters((f) => ({ ...f, [field]: value }))
  }

  const regions = useMemo(() => {
    const set = new Set()
    prospects.forEach((p) => { if (p.region) set.add(p.region) })
    return Array.from(set).sort()
  }, [prospects])

  const filteredProspects = useMemo(() => {
    return prospects.filter((p) => {
      if (filters.region.length && !filters.region.includes(p.region)) return false
      if (filters.segment.length && !filters.segment.includes(p.segment)) return false
      return true
    })
  }, [prospects, filters])

  const filteredIds = useMemo(() => new Set(filteredProspects.map((p) => p.id)), [filteredProspects])

  const kpis = useMemo(() => computeKpis(filteredProspects), [filteredProspects])

  const monthlyData = useMemo(() => {
    const buckets = {}
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      buckets[key] = { month: key, 'Mails envoyés': 0, 'Propales envoyées': 0, 'Devis envoyés': 0 }
    }
    const hasFilter = filters.region.length > 0 || filters.segment.length > 0
    history.forEach((h) => {
      if (!h.changed_at) return
      if (hasFilter && !filteredIds.has(h.prospect_id)) return
      const d = new Date(h.changed_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!buckets[key]) return
      if (h.statut === 'Mail envoyé') buckets[key]['Mails envoyés']++
      else if (h.statut === 'Propale envoyée') buckets[key]['Propales envoyées']++
      else if (h.statut === 'Devis envoyé') buckets[key]['Devis envoyés']++
    })
    return Object.values(buckets)
  }, [history, filteredIds, filters])

  return (
    <div className="dashboard">
      <div className="filters-bar dashboard-filters">
        <div className="filters-row">
          <MultiSelectDropdown label="Région" options={regions} selected={filters.region} onChange={(v) => set('region', v)} />
          <MultiSelectDropdown label="Segment" options={['B2B', 'B2B2C']} selected={filters.segment} onChange={(v) => set('segment', v)} />
          <div className="count-info">{filteredProspects.length} / {prospects.length} prospects sélectionnés</div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-value">{kpis.total}</div><div className="kpi-label">Total prospects</div></div>
        <div className="kpi-card"><div className="kpi-value">{kpis.b2b}</div><div className="kpi-label">B2B</div></div>
        <div className="kpi-card"><div className="kpi-value">{kpis.b2b2c}</div><div className="kpi-label">B2B2C</div></div>
        <div className="kpi-card"><div className="kpi-value">{kpis.propalesEffectives}</div><div className="kpi-label">Propales envoyées</div></div>
        <div className="kpi-card"><div className="kpi-value">{kpis.devisEnvoyes}</div><div className="kpi-label">Devis envoyés</div></div>
        <div className="kpi-card"><div className="kpi-value">{kpis.signes}</div><div className="kpi-label">Devis signés</div></div>
        <div className="kpi-card"><div className="kpi-value">{kpis.tauxConversion}%</div><div className="kpi-label">Taux de conversion (signés / propales)</div></div>
        <div className="kpi-card warn"><div className="kpi-value">{kpis.leadsChauds}</div><div className="kpi-label">Leads chauds</div></div>
        <div className="kpi-card"><div className="kpi-value">{kpis.standBy}</div><div className="kpi-label">Stand by</div></div>
        <div className="kpi-card danger"><div className="kpi-value">{kpis.relances}</div><div className="kpi-label">Propositions en retard (+14j)</div></div>
      </div>

      <div className="chart-card">
        <h3>Activité mensuelle (12 derniers mois){(filters.region.length || filters.segment.length) ? ' — filtrée' : ''}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis fontSize={12} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Mails envoyés" stroke="#A8D05D" strokeWidth={2} />
            <Line type="monotone" dataKey="Propales envoyées" stroke="#0D1B3D" strokeWidth={2} />
            <Line type="monotone" dataKey="Devis envoyés" stroke="#B5603A" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
        <p className="hint">Basé sur l'historique des changements de statut. Pour les prospects déjà présents avant la mise en place de l'outil, seul le statut le plus récent est connu.</p>
      </div>
      <p className="hint">Retrouve les pipes (leads chauds, devis envoyés, stand by) dans l'onglet Kanban, cliquables vers la fiche client.</p>
    </div>
  )
}

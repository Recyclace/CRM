import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function daysAgo(dateStr) {
  if (!dateStr) return Infinity
  const d = new Date(dateStr)
  return (Date.now() - d.getTime()) / (1000 * 3600 * 24)
}

export default function Dashboard({ prospects }) {
  const [history, setHistory] = useState([])

  useEffect(() => {
    let all = []
    let from = 0
    const PAGE = 1000
    async function load() {
      while (true) {
        const { data, error } = await supabase
          .from('status_history')
          .select('statut, changed_at')
          .range(from, from + PAGE - 1)
        if (error || !data) break
        all = all.concat(data)
        if (data.length < PAGE) break
        from += PAGE
      }
      setHistory(all)
    }
    load()
  }, [])

  const kpis = useMemo(() => {
    const total = prospects.length
    const b2b = prospects.filter((p) => p.segment === 'B2B').length
    const b2b2c = prospects.filter((p) => p.segment === 'B2B2C').length
    const signes = prospects.filter((p) => p.statut === 'Devis signé' || p.statut === 'Facturé').length
    const leadsChauds = prospects.filter((p) => p.lead_chaud).length
    const standBy = prospects.filter((p) => p.stand_by).length
    const devisEnvoyes = prospects.filter((p) => p.statut === 'Devis envoyé').length
    const propalesEnvoyees = prospects.filter((p) => p.statut === 'Propale envoyée').length
    const relances = prospects.filter((p) => p.statut === 'Mail envoyé' && daysAgo(p.derniere_maj) > 14).length
    const tauxConversion = total ? ((signes / total) * 100).toFixed(1) : '0.0'
    return { total, b2b, b2b2c, signes, leadsChauds, standBy, devisEnvoyes, propalesEnvoyees, relances, tauxConversion }
  }, [prospects])

  const monthlyData = useMemo(() => {
    const buckets = {}
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      buckets[key] = { month: key, 'Mails envoyés': 0, 'Propales envoyées': 0, 'Devis envoyés': 0 }
    }
    history.forEach((h) => {
      if (!h.changed_at) return
      const d = new Date(h.changed_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!buckets[key]) return
      if (h.statut === 'Mail envoyé') buckets[key]['Mails envoyés']++
      else if (h.statut === 'Propale envoyée') buckets[key]['Propales envoyées']++
      else if (h.statut === 'Devis envoyé') buckets[key]['Devis envoyés']++
    })
    return Object.values(buckets)
  }, [history])

  const leadsChaudsList = prospects.filter((p) => p.lead_chaud)
  const standByList = prospects.filter((p) => p.stand_by)
  const devisEnvoyesList = prospects.filter((p) => p.statut === 'Devis envoyé')

  return (
    <div className="dashboard">
      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-value">{kpis.total}</div><div className="kpi-label">Total prospects</div></div>
        <div className="kpi-card"><div className="kpi-value">{kpis.b2b}</div><div className="kpi-label">B2B</div></div>
        <div className="kpi-card"><div className="kpi-value">{kpis.b2b2c}</div><div className="kpi-label">B2B2C</div></div>
        <div className="kpi-card"><div className="kpi-value">{kpis.signes}</div><div className="kpi-label">Signés / Facturés</div></div>
        <div className="kpi-card"><div className="kpi-value">{kpis.tauxConversion}%</div><div className="kpi-label">Taux de conversion</div></div>
        <div className="kpi-card warn"><div className="kpi-value">{kpis.leadsChauds}</div><div className="kpi-label">Leads chauds</div></div>
        <div className="kpi-card"><div className="kpi-value">{kpis.standBy}</div><div className="kpi-label">Stand by</div></div>
        <div className="kpi-card danger"><div className="kpi-value">{kpis.relances}</div><div className="kpi-label">Relances en retard (+14j)</div></div>
      </div>

      <div className="chart-card">
        <h3>Activité mensuelle (12 derniers mois)</h3>
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
        <p className="hint">Basé sur l'historique des changements de statut. Pour les prospects déjà présents avant la mise en place de l'outil, seul le statut le plus récent est connu (une seule entrée d'historique).</p>
      </div>

      <div className="pipe-grid">
        <div className="pipe-card">
          <h3>Pipe des leads chauds ({leadsChaudsList.length})</h3>
          <ul>
            {leadsChaudsList.slice(0, 30).map((p) => (
              <li key={p.id}><strong>{p.nom}</strong><span>{(p.action_commentaire || '').split('\n')[0] || 'Aucune action notée'}</span></li>
            ))}
            {leadsChaudsList.length === 0 && <li className="empty">Aucun lead chaud pour l'instant.</li>}
          </ul>
        </div>
        <div className="pipe-card">
          <h3>Pipe des devis envoyés ({devisEnvoyesList.length})</h3>
          <ul>
            {devisEnvoyesList.slice(0, 30).map((p) => (
              <li key={p.id}><strong>{p.nom}</strong><span>MAJ : {p.derniere_maj || '—'}</span></li>
            ))}
            {devisEnvoyesList.length === 0 && <li className="empty">Aucun devis envoyé en cours.</li>}
          </ul>
        </div>
        <div className="pipe-card">
          <h3>Stand by ({standByList.length})</h3>
          <ul>
            {standByList.slice(0, 30).map((p) => (
              <li key={p.id}><strong>{p.nom}</strong><span>{(p.action_commentaire || '').split('\n')[0] || 'Aucune action notée'}</span></li>
            ))}
            {standByList.length === 0 && <li className="empty">Aucun prospect en stand by.</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}

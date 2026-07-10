import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from './supabaseClient'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// Métriques suivies, dérivées de l'historique des changements de statut.
// "actions" = nombre total de changements de statut sur la semaine (activité commerciale).
const METRICS = [
  { key: 'mails', label: 'Mails envoyés', statut: 'Mail envoyé', goal: 'goal_mails', color: '#7CA92B' },
  { key: 'propales', label: 'Propales envoyées', statut: 'Propale envoyée', goal: 'goal_propales', color: '#0D1B3D' },
  { key: 'devis', label: 'Devis envoyés', statut: 'Devis envoyé', goal: 'goal_devis', color: '#B5603A' },
  { key: 'signes', label: 'Devis signés', statut: 'Devis signé', goal: 'goal_signes', color: '#1F4A38' },
  { key: 'actions', label: 'Actions commerciales', statut: null, goal: 'goal_actions', color: '#7a7267' },
]

function mondayOf(dateLike) {
  const d = new Date(dateLike)
  d.setHours(0, 0, 0, 0)
  const day = (d.getDay() + 6) % 7 // lundi = 0
  d.setDate(d.getDate() - day)
  return d
}
function ymd(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function fmtShort(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}
function emptyWeek() {
  return { mails: 0, propales: 0, devis: 0, signes: 0, actions: 0 }
}

export default function WeeklyReport() {
  const [history, setHistory] = useState([])
  const [goals, setGoals] = useState(null)
  const [goalDraft, setGoalDraft] = useState(null)
  const [recipients, setRecipients] = useState([])
  const [loading, setLoading] = useState(true)
  const [sent, setSent] = useState(false)
  const [sendingReal, setSendingReal] = useState(false)
  const [realMsg, setRealMsg] = useState('')
  const [savingGoals, setSavingGoals] = useState(false)
  const [goalMsg, setGoalMsg] = useState('')
  const defaultStart = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7 * 12)
    return ymd(mondayOf(d))
  }, [])
  const [extractStart, setExtractStart] = useState(defaultStart)

  useEffect(() => {
    async function load() {
      setLoading(true)
      // Historique des statuts, paginé pour tout récupérer
      let all = []
      let from = 0
      const PAGE = 1000
      while (true) {
        const { data, error } = await supabase
          .from('status_history')
          .select('statut, changed_at')
          .range(from, from + PAGE - 1)
        if (error || !data || data.length === 0) break
        all = all.concat(data)
        from += data.length
        if (data.length < PAGE) break
      }
      const { data: g } = await supabase.from('report_settings').select('*').eq('id', 1).single()
      const { data: recips } = await supabase.from('report_recipients').select('email')
      setHistory(all)
      setGoals(g)
      setGoalDraft(g)
      setRecipients(recips || [])
      setLoading(false)
    }
    load()
  }, [])

  // Agrégation par semaine (clé = lundi de la semaine)
  const byWeek = useMemo(() => {
    const map = {}
    history.forEach((h) => {
      if (!h.changed_at) return
      const k = ymd(mondayOf(h.changed_at))
      if (!map[k]) map[k] = emptyWeek()
      map[k].actions++
      const m = METRICS.find((x) => x.statut === h.statut)
      if (m) map[k][m.key]++
    })
    return map
  }, [history])

  function weekData(mondayDate) {
    return byWeek[ymd(mondayDate)] || emptyWeek()
  }

  const currentMonday = useMemo(() => mondayOf(new Date()), [])
  const prevWeeks = useMemo(() => {
    return [1, 2, 3].map((i) => {
      const d = new Date(currentMonday)
      d.setDate(d.getDate() - 7 * i)
      return d
    })
  }, [currentMonday])

  const current = weekData(currentMonday)
  const lastWeek = weekData(prevWeeks[0])

  // Données du graphique : 12 dernières semaines (ancien -> récent)
  const chartData = useMemo(() => {
    const arr = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentMonday)
      d.setDate(d.getDate() - 7 * i)
      const w = weekData(d)
      arr.push({ semaine: fmtShort(d), ...w })
    }
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byWeek, currentMonday])

  // Extract : toutes les semaines depuis la date choisie
  const extractRows = useMemo(() => {
    const start = mondayOf(extractStart)
    const rows = []
    const d = new Date(start)
    while (d <= currentMonday) {
      const end = new Date(d)
      end.setDate(end.getDate() + 6)
      const w = weekData(d)
      rows.push({ debut: ymd(d), fin: ymd(end), ...w })
      d.setDate(d.getDate() + 7)
    }
    return rows.reverse() // plus récent en haut
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extractStart, byWeek, currentMonday])

  function evo(cur, prev) {
    if (prev === 0) return cur === 0 ? '—' : '+100%'
    const pct = Math.round(((cur - prev) / prev) * 100)
    return (pct >= 0 ? '+' : '') + pct + '%'
  }

  function exportExcel() {
    const data = extractRows.map((r) => ({
      'Semaine du': r.debut,
      'au': r.fin,
      'Mails envoyés': r.mails,
      'Propales envoyées': r.propales,
      'Devis envoyés': r.devis,
      'Devis signés': r.signes,
      'Actions commerciales': r.actions,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Synthèses')
    XLSX.writeFile(wb, `Syntheses-hebdo-depuis-${extractStart}.xlsx`)
  }

  async function saveGoals() {
    setSavingGoals(true)
    setGoalMsg('')
    const payload = {
      goal_mails: Number(goalDraft.goal_mails) || 0,
      goal_propales: Number(goalDraft.goal_propales) || 0,
      goal_devis: Number(goalDraft.goal_devis) || 0,
      goal_signes: Number(goalDraft.goal_signes) || 0,
      goal_actions: Number(goalDraft.goal_actions) || 0,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('report_settings').update(payload).eq('id', 1).select().single()
    setSavingGoals(false)
    if (!error && data) {
      setGoals(data)
      setGoalDraft(data)
      setGoalMsg('Objectifs enregistrés.')
      setTimeout(() => setGoalMsg(''), 2500)
    } else if (error) {
      setGoalMsg('Erreur : ' + error.message)
    }
  }

  function buildEmailBody() {
    const end = new Date(currentMonday)
    end.setDate(end.getDate() + 6)
    const lines = []
    lines.push(`Synthèse Recycl'ace — semaine du ${fmtShort(currentMonday)} au ${fmtShort(end)}`)
    lines.push('')
    METRICS.forEach((m) => {
      const g = goals ? goals[m.goal] : 0
      lines.push(`${m.label} : ${current[m.key]} (obj. ${g}, évol. vs S-1 : ${evo(current[m.key], lastWeek[m.key])})`)
    })
    return lines.join('\n')
  }

  // Envoi réel via la fonction Supabase (même chemin que l'envoi automatique du vendredi)
  async function forceSend() {
    setSendingReal(true)
    setRealMsg('')
    const { data, error } = await supabase.functions.invoke('weekly-report', { body: {} })
    setSendingReal(false)
    if (error) { setRealMsg("Échec de l'envoi : " + error.message); return }
    if (data && data.error) { setRealMsg('Échec : ' + data.error); return }
    setRealMsg('Synthèse envoyée par email ✔')
    setTimeout(() => setRealMsg(''), 4000)
  }

  async function sendEmail() {
    const to = ['recyclace@gmail.com', ...recipients.map((r) => r.email)]
    const subject = encodeURIComponent(`Synthèse Recycl'ace — semaine du ${fmtShort(currentMonday)}`)
    const body = encodeURIComponent(buildEmailBody())
    window.location.href = `mailto:${to.join(',')}?subject=${subject}&body=${body}`
    setSent(true)
    await supabase.from('weekly_summaries').insert({
      week_start: ymd(currentMonday),
      propales: current.propales,
      mails: current.mails,
      devis: current.devis,
      signes: current.signes,
      actions: current.actions,
      propales_prev: lastWeek.propales,
      mails_prev: lastWeek.mails,
      devis_prev: lastWeek.devis,
      actions_prev: lastWeek.actions,
      sent_to: to.join(', '),
    })
  }

  if (loading) return <div className="report-wrap"><p className="hint">Chargement de la synthèse...</p></div>

  const curEnd = new Date(currentMonday); curEnd.setDate(curEnd.getDate() + 6)

  return (
    <div className="report-wrap">
      <div className="report-head">
        <h2>Synthèse hebdomadaire</h2>
        <span className="report-period">Semaine en cours : {fmtShort(currentMonday)} → {fmtShort(curEnd)}</span>
      </div>

      {/* Grand encadré : semaine en cours */}
      <div className="report-current">
        {METRICS.map((m) => {
          const val = current[m.key]
          const g = goals ? goals[m.goal] : 0
          const pct = g ? Math.min(100, Math.round((val / g) * 100)) : 0
          return (
            <div className="report-stat" key={m.key}>
              <div className="report-stat-val" style={{ color: m.color }}>{val}</div>
              <div className="report-stat-label">{m.label}</div>
              <div className="report-goal-bar"><div className="report-goal-fill" style={{ width: `${pct}%`, background: m.color }} /></div>
              <div className="report-stat-sub">obj. {g} · {evo(val, lastWeek[m.key])} vs S-1</div>
            </div>
          )
        })}
      </div>

      {/* 3 semaines précédentes */}
      <h3 className="report-subtitle">3 semaines précédentes</h3>
      <div className="report-prev-grid">
        {prevWeeks.map((mon, idx) => {
          const w = weekData(mon)
          const end = new Date(mon); end.setDate(end.getDate() + 6)
          return (
            <div className="report-prev-card" key={idx}>
              <div className="report-prev-title">{fmtShort(mon)} → {fmtShort(end)}</div>
              {METRICS.map((m) => (
                <div className="report-prev-row" key={m.key}>
                  <span>{m.label}</span><strong>{w[m.key]}</strong>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Graphique d'évolution */}
      <div className="chart-card">
        <h3>Évolution (12 dernières semaines)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="semaine" fontSize={11} />
            <YAxis fontSize={11} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="mails" name="Mails" stroke="#7CA92B" strokeWidth={2} />
            <Line type="monotone" dataKey="propales" name="Propales" stroke="#0D1B3D" strokeWidth={2} />
            <Line type="monotone" dataKey="devis" name="Devis envoyés" stroke="#B5603A" strokeWidth={2} />
            <Line type="monotone" dataKey="signes" name="Devis signés" stroke="#1F4A38" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Objectifs paramétrables */}
      <div className="report-panel">
        <h3>Objectifs hebdomadaires</h3>
        <div className="report-goals-grid">
          {METRICS.map((m) => (
            <label key={m.key} className="report-goal-field">
              {m.label}
              <input
                type="number" min="0"
                value={goalDraft ? goalDraft[m.goal] : 0}
                onChange={(e) => setGoalDraft((d) => ({ ...d, [m.goal]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <div className="report-panel-actions">
          <button className="btn-primary" onClick={saveGoals} disabled={savingGoals}>{savingGoals ? 'Enregistrement...' : 'Enregistrer les objectifs'}</button>
          {goalMsg && <span className="success-msg">{goalMsg}</span>}
        </div>
      </div>

      {/* Historique + extract Excel */}
      <div className="report-panel">
        <h3>Historique & extraction Excel</h3>
        <div className="report-extract-controls">
          <label className="report-inline-field">À partir du
            <input type="date" value={extractStart} onChange={(e) => setExtractStart(e.target.value)} />
          </label>
          <button className="btn-secondary" onClick={exportExcel}>Exporter en Excel ({extractRows.length} semaines)</button>
        </div>
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr><th>Semaine</th><th>Mails</th><th>Propales</th><th>Devis env.</th><th>Devis signés</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {extractRows.map((r) => (
                <tr key={r.debut}>
                  <td>{fmtShort(r.debut)} → {fmtShort(r.fin)}</td>
                  <td>{r.mails}</td><td>{r.propales}</td><td>{r.devis}</td><td>{r.signes}</td><td>{r.actions}</td>
                </tr>
              ))}
              {extractRows.length === 0 && <tr><td colSpan={6} className="empty-row">Aucune donnée sur la période.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Envoi par mail */}
      <div className="report-panel">
        <h3>Envoi de la synthèse</h3>
        <p className="hint">Destinataires : recyclace@gmail.com{recipients.length ? ', ' + recipients.map((r) => r.email).join(', ') : ''} (gérés dans Paramètres). Envoi automatique chaque vendredi à 17h ; tu peux aussi forcer l'envoi à tout moment ci-dessous.</p>
        <div className="report-panel-actions">
          <button className="btn-primary" onClick={forceSend} disabled={sendingReal}>{sendingReal ? 'Envoi en cours...' : 'Forcer l\'envoi maintenant'}</button>
          <button className="btn-secondary" onClick={sendEmail}>Ouvrir dans mon client mail</button>
          {realMsg && <span className="success-msg">{realMsg}</span>}
          {sent && <span className="success-msg">Client mail ouvert avec la synthèse.</span>}
        </div>
      </div>
    </div>
  )
}

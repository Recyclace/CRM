import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

const WEEKLY_GOAL = 25 // 5 propales/jour x 5 jours ouvrés, objectif global équipe

function startOfWeek(date) {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7 // lundi = 0
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - day)
  return d
}

function fmt(d) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export default function WeeklySummary({ onClose }) {
  const [rows, setRows] = useState(null)
  const [recipients, setRecipients] = useState([])
  const [loading, setLoading] = useState(true)
  const [sent, setSent] = useState(false)

  const thisWeekStart = useMemo(() => startOfWeek(new Date()), [])
  const lastWeekStart = useMemo(() => {
    const d = new Date(thisWeekStart)
    d.setDate(d.getDate() - 7)
    return d
  }, [thisWeekStart])
  const twoWeeksAgoStart = useMemo(() => {
    const d = new Date(thisWeekStart)
    d.setDate(d.getDate() - 14)
    return d
  }, [thisWeekStart])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: hist } = await supabase
        .from('status_history')
        .select('statut, changed_at')
        .gte('changed_at', twoWeeksAgoStart.toISOString())
      const { data: recips } = await supabase.from('report_recipients').select('email')
      setRecipients(recips || [])
      setRows(hist || [])
      setLoading(false)
    }
    load()
  }, [twoWeeksAgoStart])

  const totals = useMemo(() => {
    const t = { propales: 0, mails: 0, devis: 0, actions: 0, propalesPrev: 0, mailsPrev: 0, devisPrev: 0, actionsPrev: 0 }
    if (!rows) return t
    rows.forEach((h) => {
      const changed = new Date(h.changed_at)
      const inThisWeek = changed >= thisWeekStart
      const inLastWeek = changed >= lastWeekStart && changed < thisWeekStart
      if (!inThisWeek && !inLastWeek) return
      const suffix = inThisWeek ? '' : 'Prev'
      t['actions' + suffix]++
      if (h.statut === 'Propale envoyée') t['propales' + suffix]++
      else if (h.statut === 'Mail envoyé') t['mails' + suffix]++
      else if (h.statut === 'Devis envoyé') t['devis' + suffix]++
    })
    return t
  }, [rows, thisWeekStart, lastWeekStart])

  function evo(current, prev) {
    if (prev === 0) return current === 0 ? '—' : '+100%'
    const pct = Math.round(((current - prev) / prev) * 100)
    return (pct >= 0 ? '+' : '') + pct + '%'
  }

  function buildEmailBody() {
    const lines = []
    lines.push(`Synthèse hebdomadaire Recycl'ace — semaine du ${fmt(thisWeekStart)}`)
    lines.push('')
    lines.push(`Propales envoyées : ${totals.propales} (évolution vs semaine dernière : ${evo(totals.propales, totals.propalesPrev)})`)
    lines.push(`Mails envoyés : ${totals.mails} (${evo(totals.mails, totals.mailsPrev)})`)
    lines.push(`Devis envoyés : ${totals.devis} (${evo(totals.devis, totals.devisPrev)})`)
    lines.push(`Actions commerciales totales : ${totals.actions} (${evo(totals.actions, totals.actionsPrev)})`)
    lines.push('')
    lines.push(`Objectif : ${WEEKLY_GOAL} propales/semaine (5/jour) — atteint à ${Math.round((totals.propales / WEEKLY_GOAL) * 100)}%`)
    return lines.join('\n')
  }

  function handleSend() {
    const to = ['recyclace@gmail.com', ...recipients.map((r) => r.email)].join(',')
    const subject = encodeURIComponent(`Synthèse hebdomadaire Recycl'ace — semaine du ${fmt(thisWeekStart)}`)
    const body = encodeURIComponent(buildEmailBody())
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`
    setSent(true)
  }

  const goalPct = Math.min(100, Math.round((totals.propales / WEEKLY_GOAL) * 100))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal weekly-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Synthèse hebdomadaire</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <p className="hint">Semaine du {fmt(thisWeekStart)} — comparée à la semaine du {fmt(lastWeekStart)}. Objectif équipe : 5 propales/jour (soit {WEEKLY_GOAL}/semaine).</p>

        {loading && <p>Chargement...</p>}

        {!loading && (
          <>
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className="kpi-card"><div className="kpi-value">{totals.propales}</div><div className="kpi-label">Propales envoyées ({evo(totals.propales, totals.propalesPrev)})</div></div>
              <div className="kpi-card"><div className="kpi-value">{totals.mails}</div><div className="kpi-label">Mails envoyés ({evo(totals.mails, totals.mailsPrev)})</div></div>
              <div className="kpi-card"><div className="kpi-value">{totals.devis}</div><div className="kpi-label">Devis envoyés ({evo(totals.devis, totals.devisPrev)})</div></div>
              <div className="kpi-card"><div className="kpi-value">{totals.actions}</div><div className="kpi-label">Actions commerciales ({evo(totals.actions, totals.actionsPrev)})</div></div>
            </div>

            <div className="weekly-goal-cell" style={{ marginTop: 16 }}>
              <div className="weekly-goal-bar" style={{ width: 200 }}>
                <div className="weekly-goal-fill" style={{ width: `${goalPct}%` }}></div>
              </div>
              <span>{totals.propales}/{WEEKLY_GOAL} propales ({goalPct}% de l'objectif hebdo)</span>
            </div>

            <p className="hint" style={{ marginTop: 16 }}>Basé sur tous les changements de statut enregistrés sur les 14 derniers jours (mail envoyé, propale envoyée, devis envoyé), tous utilisateurs confondus.</p>
          </>
        )}

        {sent && <p className="success-msg">Ton client mail par défaut s'est ouvert avec la synthèse prête à envoyer.</p>}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Fermer</button>
          <button className="btn-primary" onClick={handleSend} disabled={loading}>Envoyer par mail</button>
        </div>
      </div>
    </div>
  )
}

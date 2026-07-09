import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

const WEEKLY_GOAL = 25 // 5 propales/jour x 5 jours ouvrés, objectif global équipe

function fmt(d) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export default function WeeklySummary({ onClose }) {
  const [rows, setRows] = useState(null)
  const [recipients, setRecipients] = useState([])
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sent, setSent] = useState(false)

  // Fenêtre glissante de 7 jours (et non semaine calendaire) pour coller à l'envoi
  // automatique du vendredi 16h basé sur "les 7 derniers jours".
  const periodEnd = useMemo(() => new Date(), [])
  const periodStart = useMemo(() => {
    const d = new Date(periodEnd)
    d.setDate(d.getDate() - 7)
    return d
  }, [periodEnd])
  const prevPeriodStart = useMemo(() => {
    const d = new Date(periodEnd)
    d.setDate(d.getDate() - 14)
    return d
  }, [periodEnd])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: hist } = await supabase
        .from('status_history')
        .select('statut, changed_at')
        .gte('changed_at', prevPeriodStart.toISOString())
      const { data: recips } = await supabase.from('report_recipients').select('email')
      const { data: pastSummaries } = await supabase
        .from('weekly_summaries')
        .select('*')
        .order('week_start', { ascending: false })
        .limit(12)
      setRecipients(recips || [])
      setRows(hist || [])
      setHistory(pastSummaries || [])
      setLoading(false)
    }
    load()
  }, [prevPeriodStart])

  const totals = useMemo(() => {
    const t = { propales: 0, mails: 0, devis: 0, actions: 0, propalesPrev: 0, mailsPrev: 0, devisPrev: 0, actionsPrev: 0 }
    if (!rows) return t
    rows.forEach((h) => {
      const changed = new Date(h.changed_at)
      const inCurrent = changed >= periodStart && changed <= periodEnd
      const inPrev = changed >= prevPeriodStart && changed < periodStart
      if (!inCurrent && !inPrev) return
      const suffix = inCurrent ? '' : 'Prev'
      t['actions' + suffix]++
      if (h.statut === 'Propale envoyée') t['propales' + suffix]++
      else if (h.statut === 'Mail envoyé') t['mails' + suffix]++
      else if (h.statut === 'Devis envoyé') t['devis' + suffix]++
    })
    return t
  }, [rows, periodStart, periodEnd, prevPeriodStart])

  function evo(current, prev) {
    if (prev === 0) return current === 0 ? '—' : '+100%'
    const pct = Math.round(((current - prev) / prev) * 100)
    return (pct >= 0 ? '+' : '') + pct + '%'
  }

  function buildEmailBody() {
    const lines = []
    lines.push(`Synthèse Recycl'ace — ${fmt(periodStart)} au ${fmt(periodEnd)}`)
    lines.push('')
    lines.push(`Propales envoyées : ${totals.propales} (évolution vs 7 jours précédents : ${evo(totals.propales, totals.propalesPrev)})`)
    lines.push(`Mails envoyés : ${totals.mails} (${evo(totals.mails, totals.mailsPrev)})`)
    lines.push(`Devis envoyés : ${totals.devis} (${evo(totals.devis, totals.devisPrev)})`)
    lines.push(`Actions commerciales totales : ${totals.actions} (${evo(totals.actions, totals.actionsPrev)})`)
    lines.push('')
    lines.push(`Objectif : ${WEEKLY_GOAL} propales/semaine (5/jour) — atteint à ${Math.round((totals.propales / WEEKLY_GOAL) * 100)}%`)
    return lines.join('\n')
  }

  async function handleSend() {
    const recipientEmails = ['recyclace@gmail.com', ...recipients.map((r) => r.email)]
    const to = recipientEmails.join(',')
    const subject = encodeURIComponent(`Synthèse Recycl'ace — ${fmt(periodStart)} au ${fmt(periodEnd)}`)
    const body = encodeURIComponent(buildEmailBody())
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`
    setSent(true)
    await supabase.from('weekly_summaries').insert({
      week_start: periodStart.toISOString().slice(0, 10),
      propales: totals.propales,
      mails: totals.mails,
      devis: totals.devis,
      actions: totals.actions,
      propales_prev: totals.propalesPrev,
      mails_prev: totals.mailsPrev,
      devis_prev: totals.devisPrev,
      actions_prev: totals.actionsPrev,
      sent_to: recipientEmails.join(', '),
    })
  }

  const goalPct = Math.min(100, Math.round((totals.propales / WEEKLY_GOAL) * 100))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal weekly-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Synthèse hebdomadaire</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <p className="hint">Du {fmt(periodStart)} au {fmt(periodEnd)} (7 derniers jours) — comparée aux 7 jours précédents. Objectif équipe : 5 propales/jour (soit {WEEKLY_GOAL}/semaine). Envoi automatique chaque vendredi à 16h.</p>

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

            <p className="hint" style={{ marginTop: 16 }}>Basé sur tous les changements de statut enregistrés (mail envoyé, propale envoyée, devis envoyé), tous utilisateurs confondus.</p>

            <button className="weekly-history-toggle" onClick={() => setShowHistory((s) => !s)}>
              {showHistory ? 'Masquer' : 'Voir'} l'historique des synthèses ({history.length})
            </button>
            {showHistory && (
              <ul className="weekly-history-list">
                {history.map((h) => (
                  <li key={h.id}>
                    Semaine du {new Date(h.week_start).toLocaleDateString('fr-FR')} — {h.propales} propale(s), {h.mails} mail(s), {h.devis} devis, {h.actions} action(s) au total
                    {h.sent_to ? ` · envoyée à ${h.sent_to}` : ''}
                  </li>
                ))}
                {history.length === 0 && <li>Aucune synthèse enregistrée pour l'instant.</li>}
              </ul>
            )}
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

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import ProspectsTable from './ProspectsTable'
import Dashboard from './Dashboard'
import SimpleKanban from './SimpleKanban'
import StaleFollowups from './StaleFollowups'
import EditModal from './EditModal'
import ImportBanner from './ImportBanner'
import Settings from './Settings'
import WeeklySummary from './WeeklySummary'
import { TYPES_B2B, TYPES_B2B2C } from './constants'
import './App.css'

const EMPTY_LIST_FILTERS = { search: '', type: '', region: '', departement: '', statut: '', assignedTo: '', onlyFlagged: false, sortBy: 'nom' }
const EMPTY_RELANCE_FILTERS = { search: '', segment: '', region: '', departement: '' }

export default function App() {
  const [session, setSession] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [prospects, setProspects] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchWarning, setFetchWarning] = useState('')
  const [tab, setTab] = useState('dashboard')
  const [selected, setSelected] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showWeekly, setShowWeekly] = useState(false)
  const channelRef = useRef(null)

  // Filtres persistants par onglet : conservés en mémoire tant que la session dure,
  // indépendants entre B2B, B2B2C et Relances.
  const [b2bFilters, setB2bFilters] = useState({ ...EMPTY_LIST_FILTERS })
  const [b2b2cFilters, setB2b2cFilters] = useState({ ...EMPTY_LIST_FILTERS })
  const [relancesFilters, setRelancesFilters] = useState({ ...EMPTY_RELANCE_FILTERS })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCheckingSession(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Fetch robuste : avance du nombre de lignes réellement reçu (pas d'une taille de page
  // supposée), et vérifie le total contre count('exact') pour ne rien perdre en route.
  const fetchAll = useCallback(async () => {
    setLoading(true)
    setFetchWarning('')
    const { count } = await supabase.from('prospects').select('id', { count: 'exact', head: true })
    let all = []
    let from = 0
    let guard = 0
    while (true) {
      guard += 1
      if (guard > 200) break
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .order('id', { ascending: true })
        .range(from, from + 999)
      if (error) { console.error(error); setFetchWarning('Erreur de chargement : ' + error.message); break }
      if (!data || data.length === 0) break
      all = all.concat(data)
      from += data.length
      if (typeof count === 'number' && all.length >= count) break
      if (data.length < 1) break
    }
    if (typeof count === 'number' && all.length !== count) {
      setFetchWarning(`Attention : ${all.length} lignes chargées sur ${count} au total. Recharge la page.`)
    }
    setProspects(all)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (session) fetchAll()
  }, [session, fetchAll])

  // Réalimentation en direct : toute modification faite par un autre compte est reflétée instantanément
  useEffect(() => {
    if (!session) return
    const channel = supabase
      .channel('prospects-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prospects' }, (payload) => {
        setProspects((prev) => {
          if (payload.eventType === 'DELETE') {
            return prev.filter((p) => p.id !== payload.old.id)
          }
          const exists = prev.some((p) => p.id === payload.new.id)
          if (exists) return prev.map((p) => (p.id === payload.new.id ? payload.new : p))
          return [...prev, payload.new]
        })
      })
      .subscribe()
    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [session])

  function handleLocalUpdate(updated) {
    setProspects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  function handleSaved(updated) {
    handleLocalUpdate(updated)
    setSelected(null)
  }

  const b2bProspects = useMemo(() => prospects.filter((p) => p.segment === 'B2B'), [prospects])
  const b2b2cProspects = useMemo(() => prospects.filter((p) => p.segment === 'B2B2C'), [prospects])

  if (checkingSession) return <div className="loading-screen">Chargement...</div>
  if (!session) return <Login />

  let mainContent
  if (!loading && prospects.length === 0) {
    mainContent = <ImportBanner onDone={fetchAll} />
  } else if (tab === 'dashboard') {
    mainContent = <Dashboard prospects={prospects} onOpen={setSelected} />
  } else if (tab === 'kanban') {
    mainContent = <SimpleKanban prospects={prospects} onOpen={setSelected} />
  } else if (tab === 'b2b') {
    mainContent = <ProspectsTable prospects={b2bProspects} types={TYPES_B2B} segmentLabel="B2B" onOpen={setSelected} onLocalUpdate={handleLocalUpdate} filters={b2bFilters} setFilters={setB2bFilters} />
  } else if (tab === 'b2b2c') {
    mainContent = <ProspectsTable prospects={b2b2cProspects} types={TYPES_B2B2C} segmentLabel="B2B2C" onOpen={setSelected} onLocalUpdate={handleLocalUpdate} filters={b2b2cFilters} setFilters={setB2b2cFilters} />
  } else if (tab === 'relances') {
    mainContent = <StaleFollowups prospects={prospects} onOpen={setSelected} onLocalUpdate={handleLocalUpdate} filters={relancesFilters} setFilters={setRelancesFilters} />
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <img src="/logo-recyclace-blanc.png" alt="Recycl'ace" className="header-logo" />
        <h1>CRM</h1>
        <nav className="tab-nav">
          <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>Dashboard</button>
          <button className={tab === 'kanban' ? 'active' : ''} onClick={() => setTab('kanban')}>Kanban</button>
          <button className={tab === 'b2b' ? 'active' : ''} onClick={() => setTab('b2b')}>B2B</button>
          <button className={tab === 'b2b2c' ? 'active' : ''} onClick={() => setTab('b2b2c')}>B2B2C</button>
          <button className={tab === 'relances' ? 'active tab-ocre' : 'tab-ocre'} onClick={() => setTab('relances')}>Relances en retard</button>
        </nav>
        {loading && <span className="loading-pill">Chargement...</span>}
        {fetchWarning && <span className="loading-pill warn-pill">{fetchWarning}</span>}
        <button className="weekly-btn" onClick={() => setShowWeekly(true)}>📊 Synthèse hebdomadaire</button>
        <div className="user-info header-user">
          {session.user.email} · <button className="link-btn" onClick={() => setShowSettings(true)}>Paramètres</button> · <button className="link-btn" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
        </div>
      </header>
      <main className="app-main">
        {mainContent}
      </main>
      {selected && (
        <EditModal prospect={selected} onClose={() => setSelected(null)} onSaved={handleSaved} />
      )}
      {showSettings && (
        <Settings userEmail={session.user.email} onClose={() => setShowSettings(false)} />
      )}
      {showWeekly && (
        <WeeklySummary onClose={() => setShowWeekly(false)} />
      )}
    </div>
  )
}

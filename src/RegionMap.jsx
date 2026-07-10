import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import { ASSIGNEES } from './constants'

const CATEGORIES = ['Tennis', 'Padel', 'Magasins']

const CHEF_COLORS = { Pierre: '#1F4A38', Iouri: '#B5603A', 'Aurélie': '#8E6FB0' }
const UNASSIGNED = '#E7E0D4'

// Régions métropolitaines positionnées ~géographiquement sur une grille 5x5.
// L'Île-de-France est gérée par département dans l'encart de droite.
// Grille 4 colonnes, tuiles uniformes, disposition ~géographique et alignée
const REGIONS = [
  { name: 'Bretagne', c: 1, r: 1 },
  { name: 'Normandie', c: 2, r: 1 },
  { name: 'Hauts-de-France', c: 3, r: 1 },
  { name: 'Grand Est', c: 4, r: 1 },
  { name: 'Pays de la Loire', c: 1, r: 2 },
  { name: 'Île-de-France', c: 2, r: 2, idf: true },
  { name: 'Centre-Val de Loire', c: 3, r: 2 },
  { name: 'Bourgogne-Franche-Comté', c: 4, r: 2 },
  { name: 'Nouvelle-Aquitaine', c: 1, r: 3 },
  { name: 'Occitanie', c: 2, r: 3 },
  { name: 'Auvergne-Rhône-Alpes', c: 3, r: 3 },
  { name: "Provence-Alpes-Côte d'Azur", c: 4, r: 3 },
  { name: 'Corse', c: 4, r: 4 },
]

// Départements d'Île-de-France, grille 3x3 (~géographique)
const IDF = [
  { name: "Val-d'Oise (95)", c: 2, r: 1 },
  { name: 'Seine-Saint-Denis (93)', c: 3, r: 1 },
  { name: 'Yvelines (78)', c: 1, r: 2 },
  { name: 'Paris (75)', c: 2, r: 2 },
  { name: 'Seine-et-Marne (77)', c: 3, r: 2 },
  { name: 'Hauts-de-Seine (92)', c: 1, r: 3 },
  { name: 'Val-de-Marne (94)', c: 2, r: 3 },
  { name: 'Essonne (91)', c: 3, r: 3 },
]

export default function RegionMap() {
  const [category, setCategory] = useState('Tennis')
  const [activeChef, setActiveChef] = useState('Pierre')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('region_managers').select('*')
      setRows(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const assignMap = useMemo(() => {
    const m = {}
    rows.forEach((r) => { m[`${r.categorie}|${r.zone}`] = r.chef })
    return m
  }, [rows])

  function chefOf(zone) { return assignMap[`${category}|${zone}`] || null }
  function colorOf(zone) {
    const chef = chefOf(zone)
    return chef ? (CHEF_COLORS[chef] || '#888') : UNASSIGNED
  }

  async function assign(zone) {
    const chef = activeChef // peut être null (gomme)
    // maj optimiste
    setRows((prev) => {
      const others = prev.filter((r) => !(r.categorie === category && r.zone === zone))
      return [...others, { categorie: category, zone, chef }]
    })
    await supabase.from('region_managers').upsert(
      { zone, categorie: category, chef, updated_at: new Date().toISOString() },
      { onConflict: 'zone,categorie' }
    )
  }

  function Tile({ z }) {
    if (z.idf) {
      return (
        <div className="rm-tile rm-tile-idf" style={gridStyle(z)} title="Gérée par département — voir l'encart Île-de-France">
          <span>Île-de-France</span>
          <span className="rm-idf-hint">détail par département →</span>
        </div>
      )
    }
    const chef = chefOf(z.name)
    const bg = colorOf(z.name)
    return (
      <button
        type="button"
        className={`rm-tile${chef ? ' assigned' : ''}`}
        style={{ ...gridStyle(z), background: bg }}
        onClick={() => assign(z.name)}
        title={`${z.name}${chef ? ' — ' + chef : ' — non attribué'} (clic pour attribuer à ${activeChef || 'personne'})`}
      >
        <span className="rm-tile-name">{z.name}</span>
        {chef && <span className="rm-tile-chef">{chef}</span>}
      </button>
    )
  }

  function gridStyle(z) {
    return {
      gridColumn: `${z.c} / span ${z.cspan || 1}`,
      gridRow: `${z.r} / span ${z.rspan || 1}`,
    }
  }

  if (loading) return <div className="rm-wrap"><p className="hint">Chargement de la répartition...</p></div>

  return (
    <div className="rm-wrap">
      <div className="rm-head">
        <h2>Répartition des chefs par zone</h2>
        <p className="hint">Répartition globale indicative — n'affecte pas les lignes B2B / B2B2C. Choisis une catégorie et un chef, puis clique une zone pour l'attribuer.</p>
      </div>

      <div className="rm-controls">
        <div className="rm-cat-group">
          {CATEGORIES.map((c) => (
            <button key={c} className={`rm-cat${category === c ? ' active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
        <div className="rm-chef-group">
          <span className="rm-chef-label">Attribuer à :</span>
          {ASSIGNEES.map((chef) => (
            <button
              key={chef}
              className={`rm-chef${activeChef === chef ? ' active' : ''}`}
              style={{ '--chef-color': CHEF_COLORS[chef] || '#888' }}
              onClick={() => setActiveChef(chef)}
            >
              <span className="rm-chef-dot" style={{ background: CHEF_COLORS[chef] || '#888' }} />{chef}
            </button>
          ))}
          <button className={`rm-chef rm-chef-erase${activeChef === null ? ' active' : ''}`} onClick={() => setActiveChef(null)}>
            <span className="rm-chef-dot" style={{ background: UNASSIGNED }} />Effacer
          </button>
        </div>
      </div>

      <div className="rm-maps">
        <div className="rm-map">
          <div className="rm-map-title">France — {category}</div>
          <div className="rm-grid rm-grid-france">
            {REGIONS.map((z) => <Tile key={z.name} z={z} />)}
          </div>
        </div>

        <div className="rm-map rm-map-idf">
          <div className="rm-map-title">Île-de-France — {category}</div>
          <div className="rm-grid rm-grid-idf">
            {IDF.map((z) => <Tile key={z.name} z={z} />)}
          </div>
        </div>
      </div>

      <div className="rm-legend">
        {ASSIGNEES.map((chef) => (
          <span key={chef} className="rm-legend-item"><span className="rm-chef-dot" style={{ background: CHEF_COLORS[chef] || '#888' }} />{chef}</span>
        ))}
        <span className="rm-legend-item"><span className="rm-chef-dot" style={{ background: UNASSIGNED }} />Non attribué</span>
      </div>
    </div>
  )
}

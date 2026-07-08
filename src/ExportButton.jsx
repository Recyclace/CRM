import * as XLSX from 'xlsx'

export default function ExportButton({ rows, filename }) {
  function handleExport() {
    const data = rows.map((p) => ({
      Nom: p.nom,
      Type: p.type,
      Statut: p.statut,
      'Lead chaud': p.lead_chaud ? 'Oui' : 'Non',
      'Stand by': p.stand_by ? 'Oui' : 'Non',
      'Dernière MAJ': p.derniere_maj || '',
      Téléphone: p.telephone || '',
      Email: p.email || '',
      'FFT Engagé': p.fft_engage || '',
      Département: p.departement || '',
      Région: p.region || '',
      Ville: p.ville || '',
      Contact: p.contact || '',
      'Site web': p.site_web || '',
      Groupe: p.groupe || '',
      Action: p.action_commentaire || '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Export')
    XLSX.writeFile(wb, filename)
  }

  return (
    <button className="btn-secondary export-btn" onClick={handleExport}>
      Exporter en Excel ({rows.length})
    </button>
  )
}

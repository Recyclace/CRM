import { useState } from 'react'

export default function CopyEmailsButton({ rows }) {
  const [copied, setCopied] = useState(false)

  // Copie robuste : tente l'API Clipboard, sinon repli sur un textarea + execCommand
  // (nécessaire dans certains contextes/navigateurs où navigator.clipboard échoue).
  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        return true
      }
    } catch {
      /* on tente le repli ci-dessous */
    }
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.top = '-9999px'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }

  async function handleCopy() {
    const emails = rows
      .flatMap((p) => (p.email || '').split(/[\n;,]+/))
      .map((e) => e.trim())
      .filter((e) => e.includes('@'))
    const unique = Array.from(new Set(emails))
    // Séparateur point-virgule : format attendu par les champs "À" des messageries
    // (Gmail, Outlook, Apple Mail) pour coller plusieurs destinataires d'un coup.
    const ok = await copyToClipboard(unique.join('; '))
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button className="copy-emails-btn" onClick={handleCopy} title="Copier tous les emails de la sélection filtrée (séparés par des points-virgules, prêts à coller dans un mail)">
      {copied ? 'Copié !' : 'Copier les mails'}
    </button>
  )
}

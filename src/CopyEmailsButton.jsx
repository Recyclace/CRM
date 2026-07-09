import { useState } from 'react'

export default function CopyEmailsButton({ rows }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const emails = rows
      .flatMap((p) => (p.email || '').split('\n'))
      .map((e) => e.trim())
      .filter(Boolean)
    const unique = Array.from(new Set(emails))
    navigator.clipboard.writeText(unique.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button className="copy-emails-btn" onClick={handleCopy} title="Copier tous les emails de la sélection filtrée">
      {copied ? 'Copié !' : 'Copier les mails'}
    </button>
  )
}

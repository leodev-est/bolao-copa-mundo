import { useState } from 'react'
import { Share2, Check, Copy } from 'lucide-react'

export default function ShareButton({ title, text, url, className = '' }) {
  const [done, setDone] = useState(false)

  async function handleShare() {
    const shareUrl = url ?? window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: shareUrl })
      } else {
        await navigator.clipboard.writeText(`${text}\n${shareUrl}`)
        setDone(true)
        setTimeout(() => setDone(false), 2500)
      }
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`flex items-center gap-1.5 text-sm transition-colors ${className}`}
    >
      {done
        ? <Check className="w-4 h-4 text-emerald-400 shrink-0" />
        : <Share2 className="w-4 h-4 shrink-0" />}
      <span>{done ? 'Copiado!' : 'Compartilhar'}</span>
    </button>
  )
}

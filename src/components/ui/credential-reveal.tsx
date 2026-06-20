'use client'

import { useState } from 'react'
import { Eye, EyeOff, Copy, Check } from 'lucide-react'

export function CredentialReveal({ value }: { value: string }) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <span className="flex items-center gap-1.5">
      <span className="font-mono text-xs">
        {visible ? value : '••••••••'}
      </span>
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        title={visible ? 'Masquer' : 'Révéler'}
      >
        {visible ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
      <button
        type="button"
        onClick={copy}
        className="text-muted-foreground hover:text-foreground transition-colors"
        title="Copier"
      >
        {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
      </button>
    </span>
  )
}

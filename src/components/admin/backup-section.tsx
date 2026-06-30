'use client'

import { useRef, useState } from 'react'
import { Download, Upload, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function BackupSection() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [restoring, setRestoring] = useState(false)
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null)
  const [confirm, setConfirm] = useState(false)

  async function handleRestore() {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setRestoring(true)
    setResult(null)

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch('/api/restore', { method: 'POST', body: form })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ error: 'Erreur réseau' })
    } finally {
      setRestoring(false)
      setConfirm(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Backup */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Sauvegarde</h3>
        <p className="text-xs text-muted-foreground">
          Télécharge un dump complet de la base de données (.sql.gz).
        </p>
        <a href="/api/backup" download>
          <Button variant="outline" size="sm" className="gap-2">
            <Download size={14} />
            Télécharger le backup
          </Button>
        </a>
      </div>

      {/* Restore */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Restauration</h3>
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 flex gap-2 text-xs text-destructive">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            La restauration <strong>écrase les données existantes</strong>. Cette action est irréversible.
          </span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".sql,.sql.gz,.gz"
          className="hidden"
          onChange={() => setConfirm(false)}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={14} />
            {fileRef.current?.files?.[0]?.name ?? 'Choisir un fichier'}
          </Button>
          {fileRef.current?.files?.[0] && !confirm && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirm(true)}
            >
              Restaurer
            </Button>
          )}
          {confirm && (
            <Button
              variant="destructive"
              size="sm"
              disabled={restoring}
              onClick={handleRestore}
            >
              {restoring ? 'Restauration…' : 'Confirmer la restauration'}
            </Button>
          )}
        </div>

        {result?.ok && (
          <p className="text-xs text-green-600">Restauration effectuée avec succès.</p>
        )}
        {result?.error && (
          <p className="text-xs text-destructive">Erreur : {result.error}</p>
        )}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  Folder, File, FileText, Trash2, Plus, Upload,
  ChevronRight, Home, Loader2, Image as ImageIcon, FileArchive,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  listClientFiles, createClientFolder, uploadClientFiles, deleteClientItem,
  type FileItem,
} from '@/actions/client-files'

function FileIcon({ name, type }: { name: string; type: 'file' | 'dir' }) {
  if (type === 'dir') return <Folder size={18} className="text-amber-400 shrink-0" />
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return <FileText size={18} className="text-red-400 shrink-0" />
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext))
    return <ImageIcon size={18} className="text-blue-400 shrink-0" />
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext))
    return <FileArchive size={18} className="text-purple-400 shrink-0" />
  return <File size={18} className="text-muted-foreground shrink-0" />
}

export function ClientFilesTab({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const [path, setPath] = useState<string[]>([])
  const [items, setItems] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [newFolderMode, setNewFolderMode] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sub = path.join('/')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listClientFiles(clientId, sub).then(result => {
      if (!cancelled) { setItems(result); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [clientId, sub, refreshKey])

  function refresh() { setRefreshKey(k => k + 1) }

  function handleCreateFolder() {
    const name = newFolderName.trim()
    if (!name) return
    startTransition(async () => {
      await createClientFolder(clientId, sub, name)
      setNewFolderName('')
      setNewFolderMode(false)
      refresh()
    })
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    const fd = new FormData()
    for (const f of Array.from(files)) fd.append('files', f)
    startTransition(async () => {
      await uploadClientFiles(clientId, sub, fd)
      if (fileInputRef.current) fileInputRef.current.value = ''
      refresh()
    })
  }

  function handleDelete(item: FileItem) {
    if (!window.confirm(`Supprimer "${item.name}" ?`)) return
    const itemPath = sub ? `${sub}/${item.name}` : item.name
    startTransition(async () => {
      await deleteClientItem(clientId, itemPath)
      refresh()
    })
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-sm flex-1 min-w-0 overflow-hidden">
          <button
            onClick={() => setPath([])}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <Home size={13} />
            <span>Fichiers</span>
          </button>
          {path.map((segment, i) => (
            <span key={i} className="flex items-center gap-1 min-w-0">
              <ChevronRight size={12} className="text-muted-foreground shrink-0" />
              <button
                onClick={() => setPath(p => p.slice(0, i + 1))}
                className={`truncate max-w-[140px] ${i === path.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground transition-colors'}`}
              >
                {segment}
              </button>
            </span>
          ))}
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            {isPending && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
            <Button size="sm" variant="outline" onClick={() => { setNewFolderMode(true); setNewFolderName('') }} disabled={isPending}>
              <Plus size={13} className="mr-1" />Dossier
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isPending}>
              <Upload size={13} className="mr-1" />Fichiers
            </Button>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />
          </div>
        )}
      </div>

      {/* New folder inline form */}
      {newFolderMode && (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            type="text"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreateFolder()
              if (e.key === 'Escape') { setNewFolderMode(false); setNewFolderName('') }
            }}
            placeholder="Nom du dossier"
            className="text-sm rounded-md border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim() || isPending}>
            Créer
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setNewFolderMode(false); setNewFolderName('') }}>
            Annuler
          </Button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Folder size={36} className="mb-2 opacity-25" />
          <p className="text-sm">Dossier vide</p>
          {canEdit && <p className="text-xs mt-1 opacity-70">Créez un sous-dossier ou ajoutez des fichiers</p>}
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {items.map(item => (
            <div
              key={item.name}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors group"
            >
              <FileIcon name={item.name} type={item.type} />
              <div className="flex-1 min-w-0">
                {item.type === 'dir' ? (
                  <button
                    onClick={() => setPath(p => [...p, item.name])}
                    className="text-sm font-medium hover:text-primary transition-colors text-left truncate w-full"
                  >
                    {item.name}
                  </button>
                ) : (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:text-primary transition-colors truncate block"
                  >
                    {item.name}
                  </a>
                )}
              </div>
              {canEdit && (
                <button
                  onClick={() => handleDelete(item)}
                  disabled={isPending}
                  className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                  title={`Supprimer ${item.name}`}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

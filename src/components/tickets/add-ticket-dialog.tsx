'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { createTicket } from '@/actions/tickets'
import { X, Plus, Loader2 } from 'lucide-react'

export function AddTicketDialog() {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await createTicket(formData)
      setDone(true)
      setTimeout(() => { setOpen(false); setDone(false) }, 1500)
    })
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} className="mr-1.5" />
        Ajouter un ticket
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold">Nouveau ticket</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            {done ? (
              <div className="px-6 py-10 text-center text-emerald-600 font-medium">Ticket créé ✓</div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Sujet <span className="text-destructive">*</span></label>
                  <input name="subject" required className="w-full rounded border border-input bg-background px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description <span className="text-destructive">*</span></label>
                  <textarea name="description" required rows={4} className="w-full rounded border border-input bg-background px-3 py-2 text-sm resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select name="type" className="w-full rounded border border-input bg-background px-3 py-2 text-sm">
                      <option value="Demande">Demande</option>
                      <option value="Incident">Incident</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Priorité</label>
                    <select name="priority" className="w-full rounded border border-input bg-background px-3 py-2 text-sm">
                      <option value="low">Faible</option>
                      <option value="medium">Moyen</option>
                      <option value="high">Élevé</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email contact</label>
                  <input name="contactEmail" type="email" placeholder="Laissez vide pour utiliser votre email" className="w-full rounded border border-input bg-background px-3 py-2 text-sm" />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button type="submit" size="sm" disabled={isPending}>
                    {isPending ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Plus size={14} className="mr-1.5" />}
                    {isPending ? 'Création…' : 'Créer'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}

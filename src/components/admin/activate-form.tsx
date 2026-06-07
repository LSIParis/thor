'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  action: (formData: FormData) => Promise<void>
  submitLabel?: string
}

export function ActivateForm({ action, submitLabel = 'Activer mon compte' }: Props) {
  const [error, setError] = useState('')

  return (
    <form
      action={action}
      onSubmit={(e) => {
        const fd = new FormData(e.currentTarget)
        const pw = fd.get('password') as string
        const confirm = fd.get('confirm') as string
        if (pw.length < 8) {
          e.preventDefault()
          setError('Le mot de passe doit contenir au moins 8 caractères.')
          return
        }
        if (pw !== confirm) {
          e.preventDefault()
          setError('Les mots de passe ne correspondent pas.')
          return
        }
        setError('')
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label>Mot de passe</Label>
        <Input name="password" type="password" required minLength={8} autoFocus
          onChange={() => setError('')} />
      </div>
      <div className="space-y-1">
        <Label>Confirmer le mot de passe</Label>
        <Input name="confirm" type="password" required minLength={8}
          onChange={() => setError('')} />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" className="w-full">{submitLabel}</Button>
    </form>
  )
}

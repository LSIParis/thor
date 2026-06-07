'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  action: (formData: FormData) => Promise<void>
}

export function PasswordChangeForm({ action }: Props) {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  return (
    <div className="rounded-lg border border-border p-5 space-y-4">
      <h2 className="font-medium">Changer le mot de passe</h2>
      <form
        action={action}
        onSubmit={(e) => {
          const fd = new FormData(e.currentTarget)
          const pw = fd.get('password') as string
          const confirm = fd.get('confirm') as string
          if (pw.length < 8) {
            e.preventDefault()
            setError('Le mot de passe doit contenir au moins 8 caractères')
            return
          }
          if (pw !== confirm) {
            e.preventDefault()
            setError('Les mots de passe ne correspondent pas')
            return
          }
          setError('')
          setSuccess(true)
        }}
        className="space-y-3"
      >
        <div className="space-y-1">
          <Label className="text-xs">Nouveau mot de passe</Label>
          <Input name="password" type="password" required className="h-8 text-sm"
            onChange={() => { setError(''); setSuccess(false) }} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Confirmer</Label>
          <Input name="confirm" type="password" required className="h-8 text-sm"
            onChange={() => { setError(''); setSuccess(false) }} />
        </div>
        {error && <p className="text-destructive text-xs">{error}</p>}
        {success && <p className="text-emerald-600 text-xs">Mot de passe mis à jour</p>}
        <Button type="submit" size="sm" variant="outline">Changer le mot de passe</Button>
      </form>
    </div>
  )
}

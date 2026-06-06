'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateUserProfile, updateClientProfile } from '@/actions/profile'
import type { User, Client } from '@prisma/client'

interface Props {
  user: User
  linkedClient: Client | null
}

export function ProfilForm({ user, linkedClient }: Props) {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(linkedClient?.logoPath ?? null)
  const [logoPath, setLogoPath] = useState<string>(linkedClient?.logoPath ?? '')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload/logo', { method: 'POST', body: fd })
    if (res.ok) {
      const { path } = await res.json()
      setLogoPreview(path)
      setLogoPath(path)
    }
  }

  async function handleSubmit(fd: FormData) {
    setSaving(true)
    setMessage(null)
    try {
      await updateUserProfile(fd)
      if (linkedClient) {
        const clientFd = new FormData()
        clientFd.set('clientEmail', fd.get('clientEmail') as string ?? '')
        if (logoPath) clientFd.set('logoPath', logoPath)
        await updateClientProfile(clientFd)
      }
      setMessage({ text: 'Profil mis à jour.', ok: true })
    } catch (err: any) {
      setMessage({ text: err?.message ?? 'Erreur', ok: false })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">

      {/* Logo société (CLIENT seulement) */}
      {linkedClient && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Logo société</h2>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <Image
                src={logoPreview}
                alt="Logo"
                width={80}
                height={80}
                className="rounded border border-border object-contain bg-muted"
              />
            ) : (
              <div className="w-20 h-20 rounded border border-dashed border-border bg-muted flex items-center justify-center text-muted-foreground text-xs">
                Logo
              </div>
            )}
            <div>
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                {logoPreview ? 'Changer le logo' : 'Choisir un logo'}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG, WebP</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              <input type="hidden" name="logoPath" value={logoPath} />
            </div>
          </div>
        </section>
      )}

      {/* Informations société (CLIENT seulement) */}
      {linkedClient && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informations société</h2>
          <div className="space-y-1">
            <Label htmlFor="clientEmail">Email de contact *</Label>
            <Input
              id="clientEmail"
              name="clientEmail"
              type="email"
              required
              defaultValue={linkedClient.email ?? ''}
              placeholder="contact@masociete.fr"
            />
          </div>
        </section>
      )}

      {/* Informations personnelles */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informations personnelles</h2>
        <div className="space-y-1">
          <Label htmlFor="name">Prénom / Nom affiché *</Label>
          <Input id="name" name="name" required defaultValue={user.name} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email de connexion</Label>
          <Input id="email" name="email" type="email" defaultValue={user.email} />
        </div>
      </section>

      {/* Changement de mot de passe */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Mot de passe</h2>
        <p className="text-xs text-muted-foreground">Laisser vide pour conserver l'actuel.</p>
        <div className="space-y-1">
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" />
        </div>
      </section>

      {message && (
        <p className={`text-sm ${message.ok ? 'text-primary' : 'text-destructive'}`}>{message.text}</p>
      )}

      <Button type="submit" disabled={saving}>
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </form>
  )
}

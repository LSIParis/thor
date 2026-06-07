'use client'

import { useState, useMemo, Fragment, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createMovement, transmitMovement, updateMovement, sendMovementRequest, cancelMovementRequest, deleteMovement } from '@/actions/movements'
import { LogIn, LogOut, Plus, X } from 'lucide-react'
import { Tip } from '@/components/ui/tip'
import { PhoneInput } from '@/components/ui/phone-input'
import type { PersonnelMovement } from '@prisma/client'

interface Client {
  id: string
  name: string
}

interface Movement extends PersonnelMovement {
  client: { id: string; name: string }
}

interface Props {
  movements: Movement[]
  clients: Client[]
  canEdit: boolean
  isClient?: boolean
}

const STATUS_LABEL: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  DEMANDE_EFFECTUEE: 'Demande effectuée',
  ATTENTE_SIGNATURE: 'Attente de signature',
  ACTIF: 'Actif',
  TERMINE: 'Terminé',
}

const STATUS_CLASS: Record<string, string> = {
  EN_ATTENTE: 'bg-amber-500/20 text-amber-600',
  DEMANDE_EFFECTUEE: 'bg-blue-500/20 text-blue-600',
  ATTENTE_SIGNATURE: 'bg-purple-500/20 text-purple-600',
  ACTIF: 'bg-emerald-500/20 text-emerald-600',
  TERMINE: 'bg-muted text-muted-foreground',
}

function MovementForm({
  clientId,
  onClose,
  isClient,
}: {
  clientId: string
  onClose: () => void
  isClient?: boolean
}) {
  const [movType, setMovType] = useState('ENTREE')
  const [entryType, setEntryType] = useState('EMPLOI')
  const [isPending, startTransition] = useTransition()
  const createWithClientId = createMovement.bind(null, clientId)
  const transmitWithClientId = transmitMovement.bind(null, clientId)

  return (
    <form
      action={(fd) => {
        startTransition(async () => {
          await createWithClientId(fd)
          onClose()
        })
      }}
      className="p-4 rounded-lg border border-border bg-card space-y-3 max-w-2xl mb-4"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">Nouveau mouvement</span>
        <button type="button" onClick={onClose}>
          <X size={14} className="text-muted-foreground hover:text-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">Mouvement *</Label>
          <select
            name="type"
            value={movType}
            onChange={(e) => setMovType(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="ENTREE">Entrée</option>
            <option value="SORTIE">Sortie</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Type d'entrée</Label>
          <select
            name="entryType"
            value={entryType}
            onChange={(e) => setEntryType(e.target.value)}
            disabled={movType !== 'ENTREE'}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-40"
          >
            <option value="EMPLOI">Emploi</option>
            <option value="STAGE">Stage</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Durée prévue (mois)</Label>
          <Input
            name="internshipMonths"
            type="number"
            min={1}
            max={24}
            placeholder="ex: 6"
            disabled={movType !== 'ENTREE' || entryType !== 'STAGE'}
            className="h-8 text-sm disabled:opacity-40"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Date *</Label>
          <Input
            name="date"
            type="date"
            required
            defaultValue={new Date().toISOString().split('T')[0]}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Prénom *</Label>
          <Input name="firstName" required className="h-8 text-sm" />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Nom *</Label>
          <Input name="lastName" required className="h-8 text-sm" />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Poste / Fonction</Label>
          <Input name="role" className="h-8 text-sm" />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">N° de mobile</Label>
          <PhoneInput name="mobile" />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Email souhaité</Label>
          <Input name="email" type="email" className="h-8 text-sm" />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Accès VPN</Label>
          <select
            name="accessVPN"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="false">Non</option>
            <option value="true">Oui</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Accès serveur</Label>
          <select
            name="accessServer"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="false">Non</option>
            <option value="true">Oui</option>
          </select>
        </div>

        {!isClient && (
          <div className="space-y-1">
            <Label className="text-xs">État</Label>
            <select
              name="status"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="EN_ATTENTE">En attente</option>
              <option value="DEMANDE_EFFECTUEE">Demande effectuée</option>
              <option value="ATTENTE_SIGNATURE">Attente de signature</option>
              <option value="ACTIF">Actif</option>
              <option value="TERMINE">Terminé</option>
            </select>
          </div>
        )}

        <div className="col-span-2 space-y-1 sm:col-span-3">
          <Label className="text-xs">Notes</Label>
          <Input name="notes" className="h-8 text-sm" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" size="sm" variant="outline">Enregistrer</Button>
        <Button type="submit" formAction={transmitWithClientId} size="sm">
          Transmettre la demande à LSI
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
      </div>
    </form>
  )
}

function EditRow({
  m,
  colSpan,
  onClose,
  isClient,
}: {
  m: Movement
  colSpan: number
  onClose: () => void
  isClient?: boolean
}) {
  const [movType, setMovType] = useState(m.type)
  const [entryType, setEntryType] = useState(m.entryType ?? 'EMPLOI')
  const [isPending, startTransition] = useTransition()
  const updateWithIds = updateMovement.bind(null, m.id, m.clientId)

  return (
    <tr className="bg-muted/20">
      <td colSpan={colSpan} className="px-3 py-3">
        <form
          action={(fd) => { startTransition(async () => { await updateWithIds(fd); onClose() }) }}
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          <div className="space-y-1">
            <Label className="text-xs">Mouvement</Label>
            <select name="type" value={movType} onChange={(e) => setMovType(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm">
              <option value="ENTREE">Entrée</option>
              <option value="SORTIE">Sortie</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type d'entrée</Label>
            <select name="entryType" value={entryType} onChange={(e) => setEntryType(e.target.value)}
              disabled={movType !== 'ENTREE'}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm disabled:opacity-40">
              <option value="EMPLOI">Emploi</option>
              <option value="STAGE">Stage</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Durée (mois)</Label>
            <Input name="internshipMonths" type="number" min={1} max={24}
              defaultValue={m.internshipMonths ?? ''}
              disabled={movType !== 'ENTREE' || entryType !== 'STAGE'}
              className="h-8 text-sm disabled:opacity-40" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date</Label>
            <Input name="date" type="date" required
              defaultValue={new Date(m.date).toISOString().split('T')[0]}
              className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Prénom</Label>
            <Input name="firstName" required defaultValue={m.firstName} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nom</Label>
            <Input name="lastName" required defaultValue={m.lastName} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Poste</Label>
            <Input name="role" defaultValue={m.role ?? ''} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Mobile</Label>
            <PhoneInput name="mobile" defaultValue={m.mobile ?? ''} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email souhaité</Label>
            <Input name="email" type="email" defaultValue={m.email ?? ''} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Accès VPN</Label>
            <select name="accessVPN" defaultValue={m.accessVPN ? 'true' : 'false'}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm">
              <option value="false">Non</option>
              <option value="true">Oui</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Accès serveur</Label>
            <select name="accessServer" defaultValue={m.accessServer ? 'true' : 'false'}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm">
              <option value="false">Non</option>
              <option value="true">Oui</option>
            </select>
          </div>
          {!isClient && (
            <div className="space-y-1">
              <Label className="text-xs">État</Label>
              <select name="status" defaultValue={m.status}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                <option value="EN_ATTENTE">En attente</option>
                <option value="DEMANDE_EFFECTUEE">Demande effectuée</option>
                <option value="ATTENTE_SIGNATURE">Attente de signature</option>
                <option value="ACTIF">Actif</option>
                <option value="TERMINE">Terminé</option>
              </select>
            </div>
          )}
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Notes</Label>
            <Input name="notes" defaultValue={m.notes ?? ''} className="h-8 text-sm" />
          </div>
          <div className="col-span-2 sm:col-span-4 flex gap-2 pt-1">
            <Button type="submit" size="sm">Sauvegarder</Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
          </div>
        </form>
      </td>
    </tr>
  )
}

export function MovementsTableView({ movements, clients, canEdit, isClient }: Props) {
  const [selectedClientId, setSelectedClientId] = useState<string>(
    isClient || clients.length === 1 ? (clients[0]?.id ?? 'all') : 'all'
  )
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const base = selectedClientId === 'all'
      ? movements
      : movements.filter((m) => m.clientId === selectedClientId)
    return [...base].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [movements, selectedClientId])

  const formClientId = selectedClientId !== 'all' ? selectedClientId : clients[0]?.id

  const showClientCol = !isClient && clients.length > 1

  return (
    <div className="space-y-4">
      {/* Barre de filtres */}
      <div className="flex flex-wrap items-center gap-3">
        {!isClient && clients.length > 1 && (
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Client :</Label>
            <select
              value={selectedClientId}
              onChange={(e) => { setSelectedClientId(e.target.value); setShowForm(false) }}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm min-w-[200px]"
            >
              <option value="all">Tous les clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {(canEdit || isClient) && !showForm && formClientId && (selectedClientId !== 'all' || isClient) && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={14} className="mr-1.5" />
            Nouveau mouvement
          </Button>
        )}

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} mouvement{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Formulaire de saisie */}
      {showForm && formClientId && (
        <MovementForm
          clientId={formClientId}
          onClose={() => setShowForm(false)}
          isClient={isClient}
        />
      )}

      {/* Tableau */}
      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">Aucun mouvement enregistré.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
                {showClientCol && <th className="px-3 py-2 text-left font-medium">Client</th>}
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">Prénom</th>
                <th className="px-3 py-2 text-left font-medium">Nom</th>
                <th className="px-3 py-2 text-left font-medium">Poste</th>
                <th className="px-3 py-2 text-left font-medium">Mobile</th>
                <th className="px-3 py-2 text-left font-medium">Email</th>
                <th className="px-3 py-2 text-left font-medium">VPN</th>
                <th className="px-3 py-2 text-left font-medium">Serveur</th>
                <th className="px-3 py-2 text-left font-medium">État</th>
                <th className="px-3 py-2 text-left font-medium">Notes</th>
                {canEdit && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((m) => {
                const isEntree = m.type === 'ENTREE'
                const colSpan = (showClientCol ? 1 : 0) + 10 + (canEdit ? 1 : 0) + 1
                const isEditing = editingId === m.id
                const run = (fn: () => Promise<unknown>) => startTransition(async () => { await fn() })
                return (
                  <Fragment key={m.id}>
                    <tr className={`hover:bg-muted/30 transition-colors ${isEditing ? 'bg-muted/20' : ''}`}>
                      {showClientCol && (
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground text-xs font-medium">
                          {m.client.name}
                        </td>
                      )}
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {new Date(m.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${isEntree ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-600'}`}>
                          {isEntree ? <LogIn size={10} /> : <LogOut size={10} />}
                          {isEntree
                            ? (m.entryType === 'STAGE' ? `Stage${m.internshipMonths ? ` ${m.internshipMonths}m` : ''}` : 'Emploi')
                            : 'Sortie'}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium">{m.firstName}</td>
                      <td className="px-3 py-2 font-medium">{m.lastName}</td>
                      <td className="px-3 py-2 text-muted-foreground">{m.role ?? '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{m.mobile ?? '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{m.email ?? '—'}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs font-medium ${m.accessVPN ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {m.accessVPN ? 'Oui' : 'Non'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs font-medium ${m.accessServer ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {m.accessServer ? 'Oui' : 'Non'}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${STATUS_CLASS[m.status] ?? STATUS_CLASS.EN_ATTENTE}`}>
                          {STATUS_LABEL[m.status] ?? m.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground italic max-w-[180px] truncate">{m.notes ?? ''}</td>
                      {canEdit && (
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            {m.status === 'EN_ATTENTE' && (
                              <>
                                <Tip label={isEditing ? 'Fermer le formulaire d\'édition' : 'Modifier les informations de ce mouvement'}>
                                  <Button variant="ghost" size="sm" type="button"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => setEditingId(isEditing ? null : m.id)}>
                                    {isEditing ? 'Fermer' : 'Éditer'}
                                  </Button>
                                </Tip>
                                <Tip label="Transmettre la demande à LSI et passer en statut « Demande effectuée »">
                                  <Button variant="ghost" size="sm" type="button"
                                    className="text-blue-600 h-6 px-2 text-xs"
                                    onClick={() => run(() => sendMovementRequest(m.id, m.clientId))}>
                                    Envoyer
                                  </Button>
                                </Tip>
                                <Tip label="Supprimer définitivement ce mouvement">
                                  <Button variant="ghost" size="sm" type="button"
                                    className="text-destructive h-6 px-2 text-xs"
                                    onClick={() => run(() => deleteMovement(m.id, m.clientId))}>
                                    Suppr.
                                  </Button>
                                </Tip>
                              </>
                            )}
                            {m.status === 'DEMANDE_EFFECTUEE' && (
                              <Tip label="Annuler la demande et repasser en statut « En attente »">
                                <Button variant="ghost" size="sm" type="button"
                                  className="text-amber-600 h-6 px-2 text-xs"
                                  onClick={() => run(() => cancelMovementRequest(m.id, m.clientId))}>
                                  Annuler la demande
                                </Button>
                              </Tip>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                    {isEditing && (
                      <EditRow
                        m={m}
                        colSpan={colSpan}
                        onClose={() => setEditingId(null)}
                        isClient={isClient}
                      />
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

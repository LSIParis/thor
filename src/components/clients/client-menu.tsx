'use client'

import Link from 'next/link'
import { MoreHorizontal, Pencil, Settings, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { deleteClient } from '@/actions/clients'

interface ClientMenuProps {
  clientId: string
  clientName: string
}

export function ClientMenu({ clientId, clientName }: ClientMenuProps) {
  const deleteWithId = deleteClient.bind(null, clientId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Actions pour ${clientName}`}>
          <MoreHorizontal size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/clients/${clientId}/edit`} className="flex items-center gap-2">
            <Pencil size={14} /> Modifier
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/clients/${clientId}/parametres`} className="flex items-center gap-2">
            <Settings size={14} /> Paramètres
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action={deleteWithId} className="w-full">
            <button
              type="submit"
              className="flex w-full items-center gap-2 text-destructive"
            >
              <Trash2 size={14} /> Supprimer
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

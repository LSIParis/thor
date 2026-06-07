'use server'

import { requireAuth } from '@/lib/access'
import { createDesk365Ticket } from '@/lib/desk365'

export async function createTicket(formData: FormData) {
  const session = await requireAuth()

  await createDesk365Ticket({
    subject: formData.get('subject') as string,
    description: formData.get('description') as string,
    contactEmail: (formData.get('contactEmail') as string) || session.user.email,
    priority: (formData.get('priority') as 'low' | 'medium' | 'high' | 'urgent') ?? 'medium',
    type: (formData.get('type') as string) || undefined,
  })
}

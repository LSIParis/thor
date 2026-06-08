import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendMail, LSI_EMAIL } from '@/lib/mailer'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.appSetting.upsert({
    where: { key: 'last_cron_run' },
    update: { value: new Date().toISOString() },
    create: { key: 'last_cron_run', value: new Date().toISOString() },
  })

  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

  const stale = await prisma.personnelMovement.findMany({
    where: {
      date: { lt: twoDaysAgo },
      status: { notIn: ['ACTIF', 'TERMINE'] },
    },
    include: { client: { select: { id: true, name: true } } },
    orderBy: [{ client: { name: 'asc' } }, { date: 'asc' }],
  })

  if (stale.length === 0) {
    console.log('[cron/check-movements] Aucun mouvement en retard.')
    return NextResponse.json({ checked: true, stale: 0 })
  }

  const STATUS_LABEL: Record<string, string> = {
    EN_ATTENTE: 'En attente',
    DEMANDE_EFFECTUEE: 'Demande effectuée',
    ATTENTE_SIGNATURE: 'Attente de signature',
  }

  // Group by client
  const byClient = new Map<string, { name: string; rows: typeof stale }>()
  for (const m of stale) {
    const entry = byClient.get(m.clientId) ?? { name: m.client.name, rows: [] }
    entry.rows.push(m)
    byClient.set(m.clientId, entry)
  }

  const rows = [...byClient.values()]
    .map(({ name, rows: ms }) => {
      const trs = ms.map((m) => {
        const daysLate = Math.floor((Date.now() - new Date(m.date).getTime()) / 86_400_000)
        return `
          <tr>
            <td style="padding:5px 10px;border:1px solid #ddd">${name}</td>
            <td style="padding:5px 10px;border:1px solid #ddd">${new Date(m.date).toLocaleDateString('fr-FR')}</td>
            <td style="padding:5px 10px;border:1px solid #ddd">${m.firstName} ${m.lastName}</td>
            <td style="padding:5px 10px;border:1px solid #ddd">${m.role ?? '—'}</td>
            <td style="padding:5px 10px;border:1px solid #ddd">${STATUS_LABEL[m.status] ?? m.status}</td>
            <td style="padding:5px 10px;border:1px solid #ddd;color:#c00"><strong>${daysLate}j de retard</strong></td>
          </tr>`
      })
      return trs.join('')
    })
    .join('')

  const html = `
    <h2 style="color:#c00">⚠️ Mouvements de personnel en retard</h2>
    <p>Les mouvements suivants ont une date de début dépassée de plus de 2 jours et ne sont pas encore <strong>Actif</strong> ou <strong>Terminé</strong>.</p>
    <table style="border-collapse:collapse;width:100%;font-size:13px">
      <thead>
        <tr style="background:#f5f5f5">
          <th style="padding:6px 10px;border:1px solid #ddd;text-align:left">Client</th>
          <th style="padding:6px 10px;border:1px solid #ddd;text-align:left">Date</th>
          <th style="padding:6px 10px;border:1px solid #ddd;text-align:left">Personne</th>
          <th style="padding:6px 10px;border:1px solid #ddd;text-align:left">Poste</th>
          <th style="padding:6px 10px;border:1px solid #ddd;text-align:left">État actuel</th>
          <th style="padding:6px 10px;border:1px solid #ddd;text-align:left">Retard</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:16px;font-size:12px;color:#666">Envoyé automatiquement par Thor · ${new Date().toLocaleString('fr-FR')}</p>
  `

  await sendMail({
    to: LSI_EMAIL,
    subject: `[Thor] ${stale.length} mouvement${stale.length > 1 ? 's' : ''} en retard de mise à jour`,
    html,
  })

  console.log(`[cron/check-movements] ${stale.length} mouvements en retard — email envoyé à ${LSI_EMAIL}`)
  return NextResponse.json({ checked: true, stale: stale.length })
}

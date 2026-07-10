import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireAuth, canAccessClient } from '@/lib/access'
import { prisma } from '@/lib/db'
import { DocusealSignForm } from '@/components/movements/docuseal-sign-form'

export default async function SignerMouvementPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  const { id } = await params
  const { id: userId, role } = session.user

  const movement = await prisma.personnelMovement.findUnique({
    where: { id },
    include: { client: { select: { id: true, name: true } } },
  })
  if (!movement) notFound()
  if (!(await canAccessClient(userId, role, movement.clientId))) redirect('/mouvements')

  const src = movement.docusealSlug ? `https://docuseal.eu/s/${movement.docusealSlug}` : null
  const signerEmail = movement.type === 'SORTIE' ? movement.requestedByEmail : movement.email

  return (
    <>
      <div className="mb-6">
        <Link href="/mouvements" className="text-sm text-muted-foreground hover:underline">
          ← Mouvements
        </Link>
        <h1 className="text-2xl font-semibold mt-2">
          Signature — {movement.firstName} {movement.lastName}
        </h1>
        <p className="text-sm text-muted-foreground">{movement.client.name}</p>
      </div>

      {movement.docusealSignedAt ? (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-700">
          Ce bon a déjà été signé le {new Date(movement.docusealSignedAt).toLocaleDateString('fr-FR')}.
        </div>
      ) : !src ? (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700">
          Aucune demande de signature DocuSeal n&apos;est associée à ce mouvement.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-y-auto max-h-[75vh]">
          <DocusealSignForm src={src} email={signerEmail} />
        </div>
      )}
    </>
  )
}

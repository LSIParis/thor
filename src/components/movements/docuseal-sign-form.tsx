'use client'

import dynamic from 'next/dynamic'

// Le composant injecte le web component DocuSeal (form.js) : chargement client uniquement.
const DocusealForm = dynamic(() => import('@docuseal/react').then((m) => m.DocusealForm), {
  ssr: false,
  loading: () => <p className="text-sm text-muted-foreground p-4">Chargement du formulaire de signature…</p>,
})

export function DocusealSignForm({
  src,
  email,
  onComplete,
}: {
  /** URL individuelle du signataire (`https://docuseal.eu/s/{slug}`), renvoyée par l'API. */
  src: string
  email?: string | null
  onComplete?: () => void
}) {
  return (
    <DocusealForm
      // EU Cloud : le host CDN est obligatoire pour que le formulaire cible le bon backend.
      host="cdn.docuseal.eu"
      src={src}
      email={email ?? undefined}
      language="fr"
      withTitle={false}
      onComplete={() => onComplete?.()}
    />
  )
}

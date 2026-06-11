'use client'

import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ExportPdfButton({ clientId }: { clientId?: string }) {
  function handleClick() {
    const url = '/api/m365/export-pdf' + (clientId ? `?client=${encodeURIComponent(clientId)}` : '')
    window.open(url, '_blank', 'noopener')
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      <FileDown size={14} className="mr-1.5" />
      Exporter en PDF
    </Button>
  )
}

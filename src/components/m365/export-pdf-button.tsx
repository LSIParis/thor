'use client'

import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ExportPdfButton({ clientId, tenantId }: { clientId?: string; tenantId?: string }) {
  function handleClick() {
    const params = new URLSearchParams()
    if (tenantId) params.set('tenant', tenantId)
    else if (clientId) params.set('client', clientId)
    const qs = params.toString()
    window.open('/api/m365/export-pdf' + (qs ? `?${qs}` : ''), '_blank', 'noopener')
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      <FileDown size={14} className="mr-1.5" />
      PDF
    </Button>
  )
}

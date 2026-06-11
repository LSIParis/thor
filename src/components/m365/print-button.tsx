'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PrintButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print">
      <Printer size={14} className="mr-1.5" />
      Exporter en PDF
    </Button>
  )
}

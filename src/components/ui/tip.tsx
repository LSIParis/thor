'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'
import type { ReactNode } from 'react'

export function Tip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[220px] text-center">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

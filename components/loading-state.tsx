import type * as React from 'react'

import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

function LoadingState({
  label = 'Loading',
  className,
  ...props
}: React.ComponentProps<'div'> & {
  label?: string
}) {
  return (
    <div
      className={cn('flex min-h-24 items-center justify-center py-8 text-primary', className)}
      {...props}
    >
      <Spinner className="size-7" />
      <span className="sr-only">{label}</span>
    </div>
  )
}

export { LoadingState }

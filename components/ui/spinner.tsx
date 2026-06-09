import * as React from 'react'

import { cn } from '@/lib/utils'

function Spinner({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'relative inline-flex size-4 animate-spin rounded-full border-2 border-current/20 border-t-current',
        className,
      )}
      {...props}
    >
      <span className="absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
    </span>
  )
}

export { Spinner }

import Image from 'next/image';

import { cn } from '@/lib/utils';

type BrandMarkProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export function BrandMark({ className, imageClassName, priority = false }: BrandMarkProps) {
  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/90 shadow-lg',
        className
      )}
    >
      <Image
        src="/icon.png"
        alt="Health One"
        width={213}
        height={199}
        priority={priority}
        className={cn('h-full w-full object-contain p-1.5', imageClassName)}
      />
    </div>
  );
}

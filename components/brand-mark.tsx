import Image from 'next/image';
import type { CSSProperties } from 'react';

import { cn } from '@/lib/utils';

type BrandMarkProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  src?: string;
  alt?: string;
  style?: CSSProperties;
};

export function BrandMark({
  className,
  imageClassName,
  priority = false,
  src = '/icon.png',
  alt = 'Health One',
  style,
}: BrandMarkProps) {
  const isExternalImage = /^https?:\/\//.test(src) || src.startsWith('data:');

  return (
    <div
      style={style}
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/90 shadow-lg',
        className
      )}
    >
      {isExternalImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={cn('h-full w-full object-contain p-1.5', imageClassName)}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          width={213}
          height={199}
          priority={priority}
          className={cn('h-full w-full object-contain p-1.5', imageClassName)}
        />
      )}
    </div>
  );
}

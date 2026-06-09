'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { LoadingState } from '@/components/loading-state';
import { getCurrentUser } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getCurrentUser() ? '/dashboard' : '/login');
  }, [router]);

  return (
    <main className="section-grid flex min-h-screen items-center justify-center p-4">
      <LoadingState label="Opening Health One" className="glass-panel rounded-[2rem] p-8" />
    </main>
  );
}

'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

export default function Root() {
  const router = useRouter();
  const token = useAuthStore(s => s.token);

  useEffect(() => {
    if (token) {
      router.replace('/map');
    } else {
      router.replace('/login');
    }
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-turf-bg">
      <div className="w-8 h-8 border-2 border-turf-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

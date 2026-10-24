'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { getPublicApiBaseUrl } from '@/lib/public-api';

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const logout = () => {
    startTransition(async () => {
      setError(null);
      try {
        const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/auth/logout`, {
          method: 'POST',
          credentials: 'include',
        });
        if (response.ok || response.status === 204) {
          router.push('/login');
          router.refresh();
          return;
        }
        setError('No se pudo cerrar la sesión.');
      } catch {
        setError('No se pudo cerrar la sesión.');
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={logout}
        disabled={isPending}
        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Cerrando sesión...' : 'Cerrar sesión'}
      </button>
      {error ? <p className="text-xs text-amber-300">{error}</p> : null}
    </div>
  );
}

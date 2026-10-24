import Link from 'next/link';

import { LogoutButton } from '@/components/logout-button';
import type { MeResponse } from '@chivo/contracts';

interface DashboardHeaderProps {
  user: MeResponse['user'];
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">
          Chivo · Trading autogestionado
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Panel de control
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          {user.displayName} · {user.email}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          M1 · Mercado en tiempo real
        </span>
        <Link
          href="/security"
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
        >
          Seguridad
        </Link>
        <LogoutButton />
      </div>
    </header>
  );
}

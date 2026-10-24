import Link from 'next/link';
import { redirect } from 'next/navigation';

import { DashboardHeader } from '@/components/dashboard-header';
import { SecurityPanel } from '@/components/security-panel';
import { fetchMe } from '@/lib/server-api';
import { getApiBaseUrl } from '@/lib/runtime';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Seguridad · Chivo',
  description: 'Configuración de autenticación y 2FA del administrador.',
};

export default async function SecurityPage() {
  const me = await fetchMe();

  if (!me) {
    redirect('/login');
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:px-8 lg:py-12">
      <DashboardHeader user={me.user} />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href="/" className="text-slate-300 hover:text-white">
          Panel
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-white">Seguridad</span>
      </div>
      <SecurityPanel user={me.user} twoFactorAvailable={me.twoFactorAvailable} />
      <footer className="mt-auto flex flex-col gap-2 border-t border-slate-800 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>Chivo · Configuración de seguridad</p>
        <a
          className="text-emerald-300 underline-offset-4 hover:underline"
          href={`${getApiBaseUrl()}/docs`}
          rel="noreferrer"
          target="_blank"
        >
          Documentación de la API
        </a>
      </footer>
    </main>
  );
}

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { DashboardHeader } from '@/components/dashboard-header';
import { MarketChart } from '@/components/market-chart';
import { fetchCandles, fetchMarkets, fetchMe } from '@/lib/server-api';
import { apiStatusLabel, executionModeLabel, fetchSystemInfo, getApiBaseUrl } from '@/lib/runtime';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const [me, systemInfo, markets] = await Promise.all([
    fetchMe(),
    fetchSystemInfo(),
    fetchMarkets(),
  ]);

  if (!me) {
    redirect('/login');
  }

  const mode = systemInfo?.executionMode ?? 'PAPER';
  const instruments = markets?.instruments ?? [];
  const initialInstrumentId = instruments[0]?.instrumentId;
  const initialCandles = initialInstrumentId
    ? await fetchCandles(initialInstrumentId, '15m', 300)
    : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:py-12">
      <DashboardHeader user={me.user} />

      <section
        aria-labelledby="mode-heading"
        className="rounded-2xl border border-emerald-400/30 bg-emerald-950/40 p-6 shadow-2xl shadow-emerald-950/20"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Modo de ejecución
            </p>
            <h2 id="mode-heading" className="mt-1 text-2xl font-semibold text-white">
              {executionModeLabel(mode)}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-100/80">
              PAPER y LIVE son modos separados. Este panel solo opera en PAPER. La API rechaza el
              arranque con LIVE habilitado y no realiza cambios silenciosos de modo.
            </p>
          </div>
          <span className="w-fit rounded-lg border border-emerald-400/40 bg-emerald-400/15 px-4 py-2 text-sm font-bold tracking-wide text-emerald-100">
            PAPER
          </span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">API</p>
          <p
            className={
              systemInfo === null
                ? 'mt-3 text-xl font-semibold text-amber-300'
                : 'mt-3 text-xl font-semibold text-emerald-300'
            }
            role="status"
          >
            {apiStatusLabel(systemInfo)}
          </p>
          <p className="mt-2 break-all text-xs leading-5 text-slate-500">{getApiBaseUrl()}</p>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {systemInfo === null
              ? 'La API no responde en este momento.'
              : `Versión ${systemInfo.version}. LIVE: ${systemInfo.liveTradingEnabled ? 'sí' : 'no'}.`}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Instrumentos configurados
          </p>
          <p className="mt-3 text-xl font-semibold text-white">{instruments.length}</p>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Fuentes: {markets?.source === 'CACHE' ? 'Caché local' : 'Binance'} ·{' '}
            {markets?.fetchedAt ? new Date(markets.fetchedAt).toLocaleString('es-ES') : 'Sin fecha'}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Seguridad</p>
          <p className="mt-3 text-xl font-semibold text-white">
            2FA {me.user.totpEnabled ? 'habilitado' : 'deshabilitado'}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-400">Admin único: {me.user.email}</p>
          <Link
            href="/security"
            className="mt-3 inline-block text-sm text-emerald-300 hover:underline"
          >
            Configurar seguridad →
          </Link>
        </article>
      </section>

      {initialInstrumentId && initialCandles ? (
        <MarketChart
          instruments={instruments}
          initialInstrumentId={initialInstrumentId}
          initialTimeframe="15m"
          initialCandles={initialCandles.candles}
          source={initialCandles.source}
          fetchedAt={initialCandles.fetchedAt}
        />
      ) : (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <p className="text-sm text-slate-300">
            No hay instrumentos disponibles. Inicia la API y sincroniza datos públicos de Binance
            USD-M.
          </p>
        </section>
      )}

      <footer className="mt-auto flex flex-col gap-2 border-t border-slate-800 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>Chivo · Plataforma modular PAPER-first · M1</p>
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

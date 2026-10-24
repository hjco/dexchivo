import Link from 'next/link';

import { LoginForm } from '@/components/login-form';

export const metadata = {
  title: 'Iniciar sesión · Chivo',
  description: 'Acceso al panel de administración de Chivo.',
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">
          Chivo · Trading autogestionado
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Iniciar sesión</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Acceso exclusivo al administrador. El panel solo opera en modo PAPER.
        </p>
      </header>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <LoginForm />
      </section>
      <p className="text-center text-xs text-slate-500">
        <Link href="/" className="text-emerald-300 hover:underline">
          Volver al panel
        </Link>
      </p>
    </main>
  );
}

'use client';

import { useState } from 'react';

import { getPublicApiBaseUrl } from '@/lib/public-api';
import { loginErrorMessage } from '@/lib/auth-messages';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          ...(totpCode.trim() ? { totpCode: totpCode.trim() } : {}),
        }),
      });

      if (response.ok) {
        window.location.assign('/');
        return;
      }

      const payload = await response.json().catch(() => null);
      setError(loginErrorMessage(payload?.error?.code));
      setLoading(false);
    } catch {
      setError('No se pudo conectar con la API.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Correo electrónico
        </label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Contraseña
        </label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Código TOTP (opcional)
        </label>
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Si la cuenta tiene 2FA activado"
          value={totpCode}
          onChange={(event) => setTotpCode(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
        />
      </div>
      {error ? <p className="text-sm text-amber-300">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-400/90 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </button>
    </form>
  );
}

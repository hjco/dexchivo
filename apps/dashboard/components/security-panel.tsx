'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { getPublicApiBaseUrl } from '@/lib/public-api';
import { twoFactorErrorMessage } from '@/lib/auth-messages';

interface SecurityPanelProps {
  user: {
    id: string;
    email: string;
    displayName: string;
    totpEnabled: boolean;
    createdAt: string;
  };
  twoFactorAvailable: boolean;
}

export function SecurityPanel({ user, twoFactorAvailable }: SecurityPanelProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'setup' | 'enable' | 'disable'>('idle');
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const setup = async () => {
    resetMessages();
    setLoading(true);
    try {
      const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/auth/2fa/setup`, {
        method: 'POST',
        credentials: 'include',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(twoFactorErrorMessage(payload?.error?.code));
        setLoading(false);
        return;
      }
      setSecret(payload.secret);
      setOtpauthUrl(payload.otpauthUrl);
      setMode('enable');
      setLoading(false);
    } catch {
      setError('No se pudo generar el secreto 2FA.');
      setLoading(false);
    }
  };

  const enable = async (event: React.FormEvent) => {
    event.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/auth/2fa/enable`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(twoFactorErrorMessage(payload?.error?.code));
        setLoading(false);
        return;
      }
      setSuccess('Autenticación de dos factores habilitada.');
      setMode('idle');
      setSecret(null);
      setOtpauthUrl(null);
      setCode('');
      setLoading(false);
      router.refresh();
    } catch {
      setError('No se pudo habilitar 2FA.');
      setLoading(false);
    }
  };

  const disable = async (event: React.FormEvent) => {
    event.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/auth/2fa/disable`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(twoFactorErrorMessage(payload?.error?.code));
        setLoading(false);
        return;
      }
      setSuccess('Autenticación de dos factores deshabilitada.');
      setMode('idle');
      setCode('');
      setLoading(false);
      router.refresh();
    } catch {
      setError('No se pudo deshabilitar 2FA.');
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Seguridad de la cuenta
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">Administrador</h2>
          <p className="mt-1 text-sm text-slate-300">
            {user.displayName} · {user.email}
          </p>
        </div>
        <span
          className={
            user.totpEnabled
              ? 'rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200'
              : 'rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300'
          }
        >
          2FA: {user.totpEnabled ? 'Habilitado' : 'Deshabilitado'}
        </span>
      </header>

      {!twoFactorAvailable ? (
        <div className="mt-4 rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">
          La autenticación de dos factores no está disponible porque la API no tiene{' '}
          <code>AUTH_ENCRYPTION_KEY</code> configurado.
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {!user.totpEnabled && mode === 'idle' ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-300">
              Protege la cuenta con una aplicación autenticadora (TOTP). Tras habilitarlo, el inicio
              de sesión requerirá un código válido.
            </p>
            <button
              type="button"
              disabled={!twoFactorAvailable || loading}
              onClick={() => void setup()}
              className="rounded-lg bg-emerald-400/90 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Configurar 2FA
            </button>
          </div>
        ) : null}

        {mode === 'enable' && secret ? (
          <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            <div>
              <p className="text-sm font-semibold text-white">Paso 1: Añadir cuenta</p>
              <p className="mt-1 text-sm text-slate-300">
                Añade el secreto a tu aplicación autenticadora. También puedes usar la URL otpauth
                si tu app lo permite.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Secreto
              </p>
              <code className="mt-1 block break-all rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-emerald-200">
                {secret}
              </code>
            </div>
            {otpauthUrl ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  otpauth URL
                </p>
                <code className="mt-1 block break-all rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300">
                  {otpauthUrl}
                </code>
              </div>
            ) : null}
            <form onSubmit={enable} className="space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Paso 2: Verificar código
                </label>
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={loading || code.length === 0}
                  className="rounded-lg bg-emerald-400/90 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Habilitar 2FA
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('idle');
                    setSecret(null);
                    setOtpauthUrl(null);
                    setCode('');
                    resetMessages();
                  }}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {user.totpEnabled && mode === 'idle' ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-300">
              La cuenta requiere un código TOTP al iniciar sesión. Puedes deshabilitarlo verificando
              un código actual.
            </p>
            <button
              type="button"
              disabled={!twoFactorAvailable || loading}
              onClick={() => setMode('disable')}
              className="rounded-lg border border-amber-400/40 px-3 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-400/10"
            >
              Deshabilitar 2FA
            </button>
          </div>
        ) : null}

        {mode === 'disable' ? (
          <form
            onSubmit={disable}
            className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4"
          >
            <p className="text-sm font-semibold text-white">Verificar para deshabilitar</p>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={loading || code.length === 0}
                className="rounded-lg border border-amber-400/40 px-3 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-400/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Deshabilitar
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('idle');
                  setCode('');
                  resetMessages();
                }}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : null}

        {error ? <p className="text-sm text-amber-300">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-300">{success}</p> : null}
      </div>
    </section>
  );
}

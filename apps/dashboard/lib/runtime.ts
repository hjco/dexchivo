import path from 'node:path';

import { systemInfoSchema, type ExecutionMode, type SystemInfo } from '@chivo/contracts';

const DEFAULT_API_BASE_URL = 'http://localhost:4000';
let rootEnvLoaded = false;

function loadRootEnvFile(): void {
  if (rootEnvLoaded) {
    return;
  }
  rootEnvLoaded = true;

  // Local development convenience: read the repository-root .env when the
  // dashboard runs from its app directory (the default pnpm script) or from
  // the repository root. Next only loads .env files from the app root.
  const candidates = [
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(process.cwd(), '.env'),
  ];

  for (const candidate of candidates) {
    try {
      process.loadEnvFile(candidate);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') {
        throw error;
      }
    }
  }
}

export function getApiBaseUrl(): string {
  loadRootEnvFile();
  const configured = process.env.API_BASE_URL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_API_BASE_URL;
}

export function executionModeLabel(mode: ExecutionMode): string {
  return mode === 'PAPER' ? 'PAPER · Simulación' : 'LIVE · Dinero real';
}

export function apiStatusLabel(info: SystemInfo | null): string {
  return info === null ? 'API no disponible' : 'API conectada';
}

export async function fetchSystemInfo(fetcher: typeof fetch = fetch): Promise<SystemInfo | null> {
  const endpoint = new URL('/api/v1/system/info', getApiBaseUrl());

  try {
    const response = await fetcher(endpoint, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(2_000),
    });

    if (!response.ok) {
      return null;
    }

    const payload: unknown = await response.json();
    const parsed = systemInfoSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

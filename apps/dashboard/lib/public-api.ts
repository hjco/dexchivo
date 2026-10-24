const DEFAULT_PUBLIC_API_BASE_URL = 'http://localhost:4000';

/**
 * Browser-visible API URL. It is intentionally separate from the server-only
 * API_BASE_URL so the session cookie is never exposed to client components.
 */
export function getPublicApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_PUBLIC_API_BASE_URL;
}

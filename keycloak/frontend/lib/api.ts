import { auth } from '@/auth';

/**
 * Server-side only (Server Component / Route Handler / Server Action).
 * BFF pattern: the access token is never exposed to the client.
 */
export async function callBackend(path: string, init?: RequestInit) {
  const session = await auth();
  const res = await fetch(`${process.env.BACKEND_API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${(session as any)?.accessToken}`,
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Backend ${res.status}`);
  return res.json();
}

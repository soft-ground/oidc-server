import { auth } from '@/auth';
import { callBackend } from '@/lib/api';
import AuthButtons from './components/AuthButtons';

export default async function Home() {
  const session = await auth();

  let apiResult: unknown = null;
  let apiError: string | null = null;
  if (session) {
    try {
      apiResult = await callBackend('/posts');
    } catch (e) {
      apiError = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <main>
      <h1>Keycloak OIDC Demo</h1>
      <AuthButtons />

      {session && (
        <section style={{ marginTop: 24 }}>
          <h2>Backend GET /posts</h2>
          {apiError ? (
            <pre style={{ color: 'crimson' }}>{apiError}</pre>
          ) : (
            <pre
              style={{
                background: '#f5f5f5',
                padding: 12,
                borderRadius: 8,
                overflowX: 'auto',
              }}
            >
              {JSON.stringify(apiResult, null, 2)}
            </pre>
          )}
        </section>
      )}
    </main>
  );
}

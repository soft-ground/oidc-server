import { redirect } from 'next/navigation';
import { signIn, signOut, auth } from '@/auth';

// Federated logout: clear the local NextAuth session AND end the Keycloak SSO
// session, so the next login prompts for credentials again.
async function federatedLogout() {
  'use server';
  const session = await auth();
  const idToken = (session as any)?.idToken as string | undefined;

  await signOut({ redirect: false });

  const endSession = new URL(
    `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/logout`,
  );
  endSession.searchParams.set(
    'post_logout_redirect_uri',
    process.env.NEXTAUTH_URL ?? 'http://localhost:24030',
  );
  // A post_logout_redirect_uri requires either id_token_hint or client_id.
  if (idToken) endSession.searchParams.set('id_token_hint', idToken);
  else endSession.searchParams.set('client_id', process.env.KEYCLOAK_CLIENT_ID!);
  redirect(endSession.toString());
}

export default async function AuthButtons() {
  const session = await auth();

  if (session) {
    return (
      <form action={federatedLogout} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span>{session.user?.email}</span>
        <button type="submit">Logout</button>
      </form>
    );
  }

  return (
    <form
      action={async () => {
        'use server';
        await signIn('keycloak');
      }}
    >
      <button type="submit">Login with Keycloak</button>
    </form>
  );
}

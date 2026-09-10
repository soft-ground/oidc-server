import { redirect } from 'next/navigation';
import { signIn, signOut, auth } from '@/auth';

// Federated logout: clear the local NextAuth session AND end the Hydra session
// via RP-initiated logout, so the next login prompts for credentials again.
async function federatedLogout() {
  'use server';
  const session = await auth();
  const idToken = (session as any)?.idToken as string | undefined;

  await signOut({ redirect: false });

  const endSession = new URL(
    `${process.env.HYDRA_ISSUER}/oauth2/sessions/logout`,
  );
  if (idToken) endSession.searchParams.set('id_token_hint', idToken);
  endSession.searchParams.set(
    'post_logout_redirect_uri',
    process.env.NEXTAUTH_URL ?? 'http://localhost:24031',
  );
  redirect(endSession.toString());
}

export default async function AuthButtons() {
  const session = await auth();

  if (session) {
    return (
      <form action={federatedLogout} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span>{session.user?.email ?? session.user?.name}</span>
        <button type="submit">Logout</button>
      </form>
    );
  }

  return (
    <form
      action={async () => {
        'use server';
        await signIn('hydra');
      }}
    >
      <button type="submit">Login with Hydra</button>
    </form>
  );
}

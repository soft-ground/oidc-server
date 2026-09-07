import { signIn, signOut, auth } from '@/auth';

export default async function AuthButtons() {
  const session = await auth();

  if (session) {
    return (
      <form
        action={async () => {
          'use server';
          await signOut();
        }}
      >
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

import NextAuth from 'next-auth';

// Generic OIDC provider pointed at Ory Hydra (discovery via the issuer's
// /.well-known/openid-configuration). Contrast with the Keycloak stack, which
// uses the dedicated next-auth Keycloak provider.
export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    {
      id: 'hydra',
      name: 'Ory Hydra',
      type: 'oidc',
      issuer: process.env.HYDRA_ISSUER!,
      clientId: process.env.HYDRA_CLIENT_ID!,
      clientSecret: process.env.HYDRA_CLIENT_SECRET ?? '',
      client: { token_endpoint_auth_method: 'none' }, // public client + PKCE
      authorization: {
        params: { scope: 'openid offline_access profile email' },
      },
      checks: ['pkce', 'state'],
    },
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.idToken = account.id_token; // needed for Hydra end-session
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).idToken = token.idToken;
      return session;
    },
  },
});

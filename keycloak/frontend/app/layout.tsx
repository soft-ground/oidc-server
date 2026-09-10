import type { ReactNode } from 'react';

export const metadata = {
  title: 'Keycloak OIDC Demo',
  description: 'Keycloak SSO demo with NestJS backend',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          maxWidth: 720,
          margin: '40px auto',
          padding: '0 16px',
          lineHeight: 1.5,
        }}
      >
        {children}
      </body>
    </html>
  );
}

import express from 'express';
import { users, verify, findBySub } from './users.js';

const PORT = Number(process.env.PORT ?? 24071);
// Hydra ADMIN API (privileged). In docker it is http://hydra:4445.
const HYDRA_ADMIN_URL = process.env.HYDRA_ADMIN_URL ?? 'http://localhost:4445';
// OAuth2 client that this deployment auto-provisions on boot.
const CLIENT_ID = process.env.OAUTH2_CLIENT_ID ?? 'hydra-web';
const CLIENT_REDIRECT_URI =
  process.env.OAUTH2_REDIRECT_URI ??
  'http://localhost:24031/api/auth/callback/hydra';
const CLIENT_POST_LOGOUT_URI =
  process.env.OAUTH2_POST_LOGOUT_URI ?? 'http://localhost:24031';

const app = express();
app.use(express.urlencoded({ extended: true }));

// --- Hydra admin helpers -----------------------------------------------------
async function admin(path, init) {
  const res = await fetch(`${HYDRA_ADMIN_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`Hydra admin ${path} -> ${res.status}: ${text}`);
  }
  return body;
}

const getLogin = (c) =>
  admin(`/admin/oauth2/auth/requests/login?login_challenge=${c}`);
const acceptLogin = (c, body) =>
  admin(`/admin/oauth2/auth/requests/login/accept?login_challenge=${c}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
const getConsent = (c) =>
  admin(`/admin/oauth2/auth/requests/consent?consent_challenge=${c}`);
const acceptConsent = (c, body) =>
  admin(`/admin/oauth2/auth/requests/consent/accept?consent_challenge=${c}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
const getLogout = (c) =>
  admin(`/admin/oauth2/auth/requests/logout?logout_challenge=${c}`);
const acceptLogout = (c) =>
  admin(`/admin/oauth2/auth/requests/logout/accept?logout_challenge=${c}`, {
    method: 'PUT',
  });

// --- Auto-provision the OAuth2 client (idempotent) ---------------------------
async function ensureClient() {
  try {
    await admin(`/admin/clients/${CLIENT_ID}`);
    console.log(`OAuth2 client "${CLIENT_ID}" already exists.`);
    return;
  } catch {
    /* not found -> create */
  }
  await admin('/admin/clients', {
    method: 'POST',
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_name: 'Hydra Web (NextAuth)',
      token_endpoint_auth_method: 'none', // public client + PKCE
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope: 'openid offline_access profile email',
      redirect_uris: [CLIENT_REDIRECT_URI],
      post_logout_redirect_uris: [CLIENT_POST_LOGOUT_URI],
      skip_consent: false,
    }),
  });
  console.log(`OAuth2 client "${CLIENT_ID}" created.`);
}

// --- Login -------------------------------------------------------------------
app.get('/login', async (req, res) => {
  const challenge = req.query.login_challenge;
  if (!challenge) return res.status(400).send('Missing login_challenge');
  const loginReq = await getLogin(challenge);

  // If Hydra already knows the user (SSO session), accept immediately.
  if (loginReq.skip) {
    const { redirect_to } = await acceptLogin(challenge, {
      subject: loginReq.subject,
    });
    return res.redirect(redirect_to);
  }

  res.send(loginForm(challenge, ''));
});

app.post('/login', async (req, res) => {
  const { challenge, username, password } = req.body;
  const user = await verify(username, password);
  if (!user) return res.status(401).send(loginForm(challenge, 'Invalid credentials'));

  const { redirect_to } = await acceptLogin(challenge, {
    subject: user.sub,
    remember: true,
    remember_for: 3600,
  });
  res.redirect(redirect_to);
});

// --- Consent -----------------------------------------------------------------
app.get('/consent', async (req, res) => {
  const challenge = req.query.consent_challenge;
  if (!challenge) return res.status(400).send('Missing consent_challenge');
  const consentReq = await getConsent(challenge);
  const user = findBySub(consentReq.subject);

  // First-party app: auto-grant. This is where custom claims are injected into
  // the token — the Hydra equivalent of a Keycloak protocol mapper.
  const { redirect_to } = await acceptConsent(challenge, {
    grant_scope: consentReq.requested_scope,
    grant_access_token_audience: consentReq.requested_access_token_audience,
    remember: true,
    remember_for: 3600,
    session: {
      access_token: {
        preferred_username: user?.sub,
        email: user?.email,
        roles: user?.roles ?? [],
        permissions: user?.permissions ?? [],
      },
      id_token: {
        email: user?.email,
        preferred_username: user?.sub,
        name: user?.name,
        roles: user?.roles ?? [],
      },
    },
  });
  res.redirect(redirect_to);
});

// --- Logout ------------------------------------------------------------------
app.get('/logout', async (req, res) => {
  const challenge = req.query.logout_challenge;
  if (!challenge) return res.status(400).send('Missing logout_challenge');
  const { redirect_to } = await acceptLogout(challenge);
  res.redirect(redirect_to);
});

app.get('/health', (_req, res) => res.json({ ok: true }));

// --- HTML --------------------------------------------------------------------
function loginForm(challenge, error) {
  return `<!doctype html><html><head><meta charset="utf-8">
<title>Sign in — Hydra</title>
<style>body{font-family:system-ui,sans-serif;max-width:360px;margin:80px auto}
input{display:block;width:100%;padding:8px;margin:6px 0;box-sizing:border-box}
button{padding:8px 16px}.err{color:crimson}</style></head><body>
<h2>Sign in (Ory Hydra)</h2>
${error ? `<p class="err">${error}</p>` : ''}
<form method="post" action="/login">
  <input type="hidden" name="challenge" value="${challenge}">
  <input name="username" placeholder="Username (alice / bob)" autofocus>
  <input name="password" type="password" placeholder="Password (password)">
  <button type="submit">Sign In</button>
</form></body></html>`;
}

async function start() {
  // Wait for Hydra admin, then provision the client.
  for (let i = 0; i < 30; i++) {
    try {
      await ensureClient();
      break;
    } catch (e) {
      if (i === 29) throw e;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  app.listen(PORT, () => {
    console.log(`login-consent app on http://localhost:${PORT}`);
    console.log(`  users: ${Object.keys(users).join(', ')} (password: "password")`);
  });
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});

# Turning on the CAPTCHA and "Continue with Google"

The code for both is already in the site. They stay off until you finish the steps below, and nothing breaks in the
meantime. Do the **CAPTCHA first** (A), then **Google** (B). You'll need to sign in to Cloudflare, Google Cloud,
Supabase and Vercel yourself; none of these steps need any password or secret to go into the code.

Two values are called **keys** below:

- the Turnstile **site key** is public and goes in Vercel as an environment variable;
- the Turnstile **secret key** and the Google **client secret** are private and go **only into the Supabase dashboard**.

Never paste a secret into the code, a chat, or a `NEXT_PUBLIC_` variable.

---

## A. CAPTCHA (Cloudflare Turnstile, free)

1. Go to <https://dash.cloudflare.com/> → **Turnstile** → **Add widget** (a free Cloudflare account is enough).
2. Name it `Root League Orlando`. Under **Hostnames** add your real domain (for example `rootleague.example`) and
   `localhost` if you want it to work while developing. Widget mode: **Managed**. Create it.
3. Copy the **Site Key** and the **Secret Key**.
4. In **Supabase → Authentication → Attack Protection** (called *Bot and Abuse Protection* in some versions):
   turn on **Enable Captcha protection**, choose **Cloudflare Turnstile**, paste the **Secret Key**, and save.
5. In **Vercel → your project → Settings → Environment Variables** add
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = the **Site Key**, for Production (and Preview if you use it).
   For local work, put the same line in `.env.local`.
6. Redeploy. The sign-in and sign-up pages now show the check, and Supabase refuses any request without a valid one.

Check it: open `/signup` in a private window; you should see the Cloudflare box before the button. Turn the Supabase
setting off again only if you need to.

> Order matters a little: if you turn on the Supabase setting (step 4) **before** the site has the site key (step 5),
> sign-in will fail for everyone until you finish step 5. Do 5 first or do both back to back.

Cloudflare publishes always-pass test keys for development (site key `1x00000000000000000000AA`); they only work if
Supabase is also set to a matching test secret, so for a quick local look just leave the key empty.

---

## B. Sign in with Google

### 1. Google Cloud: create the sign-in credentials

1. Go to <https://console.cloud.google.com/> and create (or pick) a project.
2. **APIs & Services → OAuth consent screen**: choose **External**, fill in the app name (`Root League Orlando`),
   a support email and a developer contact email. The default scopes (`email`, `profile`, `openid`) are all that's
   needed. Publish the app (move it from *Testing* to *In production*) so everyone can sign in, not just test users.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins**: your site, e.g. `https://rootleague.example` (and `http://localhost:3000` for development)
   - **Authorized redirect URIs**: the callback shown in Supabase (next step), which looks like
     `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client secret**.

### 2. Supabase: add Google as a provider

1. **Supabase → Authentication → Providers → Google**: switch it on, paste the **Client ID** and **Client secret**,
   and save. The callback URL to give Google is shown on that same panel (use it in step 1.3 above).
2. **Supabase → Authentication → URL Configuration**:
   - **Site URL**: your real address, e.g. `https://rootleague.example`
   - **Redirect URLs**: add `https://rootleague.example/auth/callback` (and `http://localhost:3000/auth/callback` for
     development). Keep this list short; Supabase only sends people back to addresses on it.

### 3. Vercel: show the button

Add these environment variables (Production, plus Preview if you use it) and redeploy:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_GOOGLE_SIGNIN` | `true` |
| `NEXT_PUBLIC_SITE_URL` | `https://rootleague.example` (optional, but recommended: the exact public address) |

The **Continue with Google** button then appears under the sign-in and sign-up forms. Someone who signs in with Google
for the first time lands on *My account*, where they make their profile or claim their name like anyone else.

### 4. One more setting worth turning on

**Supabase → Authentication → Providers → Email → Confirm email**. When someone uses Google with an address that
already has a password account, Supabase links the two. If email confirmation is off, nobody has proved they own the
address on the password side, so turn it on (and set up a custom SMTP sender, since Supabase's built-in one is heavily
rate limited). See `SECURITY.md`.

---

## If something doesn't work

- **"The check didn't go through"**: the Turnstile hostname list doesn't include the site's domain, or the secret key in
  Supabase doesn't belong to the same widget as the site key.
- **The box never appears**: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` isn't set for that deployment (it is read at build time, so
  redeploy after adding it), or an ad blocker is hiding Cloudflare's frame.
- **"Google sign-in didn't work"**: the redirect URL isn't on Supabase's list, the client ID/secret are mistyped, or the
  Google app is still in *Testing* and the person isn't a listed test user.
- **Google shows `redirect_uri_mismatch`**: the redirect URI in Google Cloud must match the one Supabase shows exactly.

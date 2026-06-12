# Project Memory

## Lovable Secrets

Lovable currently uses these CallRecover-specific Supabase secret names:

- `CALLRECOVER_URL`
- `CALLRECOVER_PUBLISHABLE_KEY`
- `CALLRECOVER_SERVICE_ROLE_KEY`

The code also supports the newer fallback names below, but do not assume they exist in Lovable:

- `CALLRECOVER_SUPABASE_URL`
- `CALLRECOVER_SUPABASE_PUBLISHABLE_KEY`
- `CALLRECOVER_SUPABASE_SERVICE_ROLE_KEY`

Important: `CALLRECOVER_SERVICE_ROLE_KEY` must be the Supabase **service_role** key for the CallRecover Production project `czvsgemkmvkyfypearuj`. It is not the anon key, publishable key, JWT secret, or a key from another project.

## Email Reset Debugging

Resend direct sending has been verified from production with `RESEND_API_KEY` and `noreply@callrecover.net`.

If password reset falls back to Supabase or does not show in Resend, check:

- `CALLRECOVER_SERVICE_ROLE_KEY` is present and valid.
- `CALLRECOVER_URL` points to `https://czvsgemkmvkyfypearuj.supabase.co`.
- The protected `/api/public/email-diagnostics` endpoint can send through Resend.
- The protected `/api/public/password-reset` debug response should show `channel: "resend"` when custom reset email is working.

Do not commit secret values to the repo.

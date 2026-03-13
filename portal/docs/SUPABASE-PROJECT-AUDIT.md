# Supabase project consistency audit – portal vs Edge Function

## A. Exact portal Supabase URL

**Portal authenticated client** (from `portal/core/supabase-client.js`):

- **URL:** `https://xgioojjmrjcurajgirpa.supabase.co`
- **Project ref:** `xgioojjmrjcurajgirpa`

The client is created with `window.supabase.createClient(supabaseUrl, supabaseKey)` and used for auth and data (including `session.access_token`).

---

## B. Exact Edge Function URL for `promote-external-submission`

**Function URL** (built in `portal/features/external-submissions/external-submission-api.js`):

- **Base:** `window.IESupabaseClient.getSupabaseUrl().replace(/\/?$/, "") + "/functions/v1"`
- **Full URL:** `https://xgioojjmrjcurajgirpa.supabase.co/functions/v1/promote-external-submission`

So the function is called on the **same** Supabase URL as the portal.

---

## C. Do the project refs match?

**Yes.** Both use the same project ref:

- Portal: `https://xgioojjmrjcurajgirpa.supabase.co`
- Function: `https://xgioojjmrjcurajgirpa.supabase.co/functions/v1/promote-external-submission`

So the mismatch is **not** the URL; it is the **key** used by the portal.

---

## D. Likely root cause of `Invalid JWT`

The `Invalid JWT` response is returned by the **Supabase Edge Functions gateway** (before your handler runs). Your function only returns "Missing bearer token" or "Unauthorized"; it does not return "Invalid JWT".

The gateway validates the `Authorization: Bearer <token>` JWT. It accepts only JWTs signed by **the same Supabase project** that hosts the function (same project ref and signing secret).

- **Portal client key** in `portal/core/supabase-client.js`:  
  `sb_publishable_36r1oFbqjUoktzPTCvxDWg_sSwhxhzM`
- This is **not** a Supabase anon key. Supabase anon keys are JWTs (e.g. starting with `eyJ...`) and include a `ref` claim for the project.
- So either:
  1. This key belongs to a **different Supabase project**. Sign-in then produces a session JWT for that other project. Sending that JWT to `xgioojjmrjcurajgirpa`’s function gateway causes the gateway to reject it → **Invalid JWT**.
  2. Or it is a custom/legacy key that does not match the project that hosts the function.

So the **likely root cause** is: the portal uses an anon (or publishable) key that is **not** the anon key of project `xgioojjmrjcurajgirpa`, so the session JWT is for another project and is invalid at this project’s function gateway.

---

## E. Minimal fix required

Use the **anon key of project `xgioojjmrjcurajgirpa`** in the portal client.

That key is already present in `assets/js/config.js` (used by the main site). Use the same value in `portal/core/supabase-client.js` so that:

1. Portal auth and session JWTs are issued by `xgioojjmrjcurajgirpa`.
2. The same JWT is valid when sent to `https://xgioojjmrjcurajgirpa.supabase.co/functions/v1/...`.

**Concrete change:** In `portal/core/supabase-client.js`, set `supabaseKey` to the anon key from `assets/js/config.js` (the JWT that has `"ref": "xgioojjmrjcurajgirpa"`), and remove or replace the current `sb_publishable_...` value.

Optional longer-term improvement: have both the main site and the portal read URL and anon key from a single config (e.g. `IEConfig` or a shared env) so they cannot drift.

# Database Reference

Source of truth: [`../supabase/schema.sql`](../supabase/schema.sql). Run it in the Supabase SQL editor to provision everything below. This document describes the tables, the Row Level Security (RLS) model, indexes, and triggers.

The security model has two layers:

1. **RLS** — the database authorization boundary. Authenticated users can only touch rows for businesses they own (`businesses.owner_id = auth.uid()`), enforced by policy. This holds even if an API route forgets to check.
2. **Application ownership checks** — API routes additionally call `assertOwnsBusiness()` before acting, so a forbidden request fails fast with `403` rather than silently returning empty rows.

Server code that legitimately needs to bypass RLS (e.g. storing refreshed calendar tokens) uses the **service-role key**, which is granted a `FOR ALL TO service_role` policy on every table.

---

## Tables

### `businesses`

One row per business, owned by a Supabase Auth user.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `uuid_generate_v4()` |
| `owner_id` | uuid | FK → `auth.users(id)` `ON DELETE CASCADE`, `NOT NULL` |
| `name` | text | `NOT NULL` |
| `type` | text | CHECK in `('cake_shop','clinic','real_estate','delivery','repair','other')` |
| `phone` | text | |
| `description` | text | |
| `language` | text | default `'en'`, CHECK in `('en','hi')` |
| `logo_url` | text | |
| `created_at` / `updated_at` | timestamptz | default `now()`; `updated_at` auto-maintained by trigger |

### `workflows`

The output of the 6-step builder. One business can have many workflows.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `business_id` | uuid | FK → `businesses(id)` `ON DELETE CASCADE`, `NOT NULL` |
| `name` | text | `NOT NULL` |
| `trigger` | text | default `'missed_call'` |
| `greeting` | text | `NOT NULL`; supports `[Business Name]` substitution |
| `closing_message` | text | `NOT NULL` |
| `language` | text | default `'en'` |
| `fields` | jsonb | default `'[]'`; array of `{ id, label, key, type, required, options?, order }` |
| `conditions` | jsonb | default `'[]'`; array of `{ id, field, operator, value, action, action_label }` |
| `post_action` | text | default `'create_record'` |
| `calendar_enabled` | boolean | default `false`; gates the calendar tools |
| `is_active` | boolean | default `true` |
| `created_at` / `updated_at` | timestamptz | trigger-maintained |

`fields[].type` ∈ `text | number | date | time | select | boolean`.
`conditions[].operator` ∈ `equals | not_equals | contains | greater_than | less_than` (see [`../src/server/ai/conditions.ts`](../src/server/ai/conditions.ts)).

### `calls`

A captured (simulated) call and everything extracted from it.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `business_id` | uuid | FK → `businesses(id)` `ON DELETE SET NULL` |
| `workflow_id` | uuid | FK → `workflows(id)` `ON DELETE SET NULL` |
| `caller_name` | text | |
| `caller_phone` | text | |
| `status` | text | default `'new'`, CHECK in `('new','in_progress','completed','contacted','closed')` |
| `intent` | text | derived from collected data |
| `summary` | text | LLM-generated (or scripted fallback) |
| `urgency` | text | default `'normal'`, CHECK in `('normal','urgent','low')`; computed from workflow conditions |
| `follow_up_status` | text | default `'pending'`, CHECK in `('pending','contacted','resolved','closed')` |
| `transcript` | jsonb | default `'[]'`; array of `{ role, content, timestamp? }` |
| `collected_data` | jsonb | default `'{}'`; structured key/value captured via `save_customer_data` |
| `language_used` | text | default `'en'` |
| `duration_seconds` | integer | |
| `calendar_event_id` | text | set when a calendar event was created |
| `calendar_event_url` | text | `htmlLink` of the created event, if any |
| `created_at` / `updated_at` | timestamptz | trigger-maintained |

### `integrations`

Per-business third-party credentials. Currently only `google_calendar`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `business_id` | uuid | FK → `businesses(id)` `ON DELETE CASCADE`, `NOT NULL` |
| `provider` | text | CHECK in `('google_calendar')` |
| `access_token_encrypted` | text | `NOT NULL`. AES-256-GCM, format `iv:tag:ciphertext` (all hex) |
| `refresh_token_encrypted` | text | nullable; same format |
| `token_expires_at` | timestamptz | |
| `scope` | text | granted OAuth scopes |
| `created_at` / `updated_at` | timestamptz | trigger-maintained |
| — | | `UNIQUE (business_id, provider)` — one row per provider per business (upsert target) |

Encryption/decryption lives in [`../src/server/integrations/encryption.ts`](../src/server/integrations/encryption.ts) and requires `INTEGRATION_CREDENTIALS_ENCRYPTION_KEY` (64 hex chars). Tokens are only ever written encrypted and are never placed in a redirect URL.

---

## Row Level Security

RLS is enabled on all four tables:

```sql
alter table businesses   enable row level security;
alter table workflows    enable row level security;
alter table calls        enable row level security;
alter table integrations enable row level security;
```

Policy shape per table:

| Table | Authenticated (owner) access | Service-role escape hatch |
|---|---|---|
| `businesses` | separate `select` / `insert` / `update` / `delete` policies, each `auth.uid() = owner_id` | `service_role_full_access_businesses` `FOR ALL` |
| `workflows` | `select` / `insert` / `update` / `delete`, each gated by an `EXISTS` on the owning business | `service_role_full_access_workflows` `FOR ALL` |
| `calls` | `select` / `insert` / `update`, each gated by an `EXISTS` on the owning business | `service_role_full_access_calls` `FOR ALL` |
| `integrations` | `owners_manage_own_integrations` `FOR ALL`, gated by an `EXISTS` on the owning business (both `USING` and `WITH CHECK`) | `service_role_full_access_integrations` `FOR ALL` |

**Why `calls` writes go through the service role:** the app inserts call records server-side after a simulated call. The `FOR ALL TO service_role` policy is the sanctioned way to do that; the owner-scoped `authenticated` policies still restrict what a signed-in user can read/write directly.

### Lint

`npm run check-rls` parses `schema.sql` and asserts:
- every table has RLS enabled and at least one policy;
- no policy uses an unrestricted `USING (true)` / `WITH CHECK (true)` predicate **unless** it is a `FOR ALL TO service_role` admin policy;
- `calls` has a `FOR ALL TO service_role` policy;
- it warns on any policy that defaults to `PUBLIC`/`anon`.

---

## Indexes

```
idx_businesses_owner_id      businesses(owner_id)
idx_workflows_business_id    workflows(business_id)
idx_calls_business_id        calls(business_id)
idx_calls_created_at         calls(created_at desc)
idx_calls_status             calls(status)
idx_calls_urgency            calls(urgency)
idx_integrations_business_id integrations(business_id)
```

These back the ownership `EXISTS` sub-selects and the dashboard's list/filter/sort queries.

---

## Triggers

`update_updated_at_column()` sets `updated_at = now()` on every `UPDATE`, wired to all four tables via `before update ... for each row` triggers.

---

## Seeding

`npm run seed` ([`../scripts/seed-dev.mjs`](../scripts/seed-dev.mjs)) inserts two demo businesses (a cake shop and a clinic) plus workflows — including the cake-shop `required_date < 24h → mark_urgent` condition — for the user in `SEED_USER_ID`. It connects with the service-role key, so it bypasses RLS to write on behalf of that owner.

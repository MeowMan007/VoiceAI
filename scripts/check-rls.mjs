// RLS lint: parse supabase/schema.sql and assert every table is protected by Row Level Security
// with role-scoped policies. A broad USING (true) / WITH CHECK (true) policy is only permitted as a
// FOR ALL TO service_role admin escape hatch — anything else (public/anon/authenticated + TRUE) fails.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const schemaPath = resolve(dirname(fileURLToPath(import.meta.url)), '../supabase/schema.sql')
const sql = readFileSync(schemaPath, 'utf8').toLowerCase()

const tables = [...sql.matchAll(/create table if not exists\s+(\w+)/g)].map(m => m[1])

// CREATE POLICY statements are semicolon-terminated and contain no internal semicolons.
const policyBlocks = [...sql.matchAll(/create policy[\s\S]*?;/g)].map(m => m[0])

const policyTable = block => (block.match(/\bon\s+(\w+)\b/) || [])[1] || null
const policyRole = block => (block.match(/\bto\s+(service_role|authenticated|anon|public)\b/) || [])[1] || null // null => PUBLIC
const isForAll = block => /\bfor\s+all\b/.test(block)
const isUnrestricted = block => /using\s*\(\s*true\s*\)/.test(block) || /with\s+check\s*\(\s*true\s*\)/.test(block)

const errors = []
const warnings = []

for (const table of tables) {
  if (!sql.includes(`alter table ${table} enable row level security`)) {
    errors.push(`${table}: missing ENABLE ROW LEVEL SECURITY`)
  }

  const tablePolicies = policyBlocks.filter(b => policyTable(b) === table)
  if (tablePolicies.length === 0) {
    errors.push(`${table}: no CREATE POLICY found`)
    continue
  }

  for (const block of tablePolicies) {
    const role = policyRole(block)

    // TRUE predicates are only safe on a service_role FOR ALL policy.
    if (isUnrestricted(block) && !(isForAll(block) && role === 'service_role')) {
      errors.push(
        `${table}: unrestricted policy (USING/WITH CHECK TRUE) scoped to "${role || 'public'}" — only FOR ALL TO service_role may use TRUE`
      )
    }

    // No TO clause => PUBLIC (includes anon). Flag it so it can't slip in unnoticed.
    if (role === null) warnings.push(`${table}: a policy has no TO clause (defaults to PUBLIC/anon)`)
    else if (role === 'anon') warnings.push(`${table}: a policy is granted to anon`)
  }
}

// Phase 6 contract: server-side writes to `calls` go through the service role, so calls must expose
// a FOR ALL TO service_role admin policy (in addition to owner-scoped authenticated policies).
const callsPolicies = policyBlocks.filter(b => policyTable(b) === 'calls')
if (callsPolicies.length && !callsPolicies.some(b => isForAll(b) && policyRole(b) === 'service_role')) {
  errors.push('calls: missing "FOR ALL TO service_role" admin policy')
}

if (warnings.length) {
  console.warn('RLS lint warnings:\n' + warnings.map(w => ` - ${w}`).join('\n') + '\n')
}

if (errors.length) {
  console.error('RLS lint FAILED:\n' + errors.map(e => ` - ${e}`).join('\n'))
  process.exit(1)
}

console.log(`RLS lint passed (${tables.length} tables, ${policyBlocks.length} policies).`)

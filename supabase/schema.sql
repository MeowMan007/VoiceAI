-- Voice AI Personal Assistant - Database Schema
-- Run this in the Supabase SQL editor

create extension if not exists "uuid-ossp";

create table if not exists businesses (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('cake_shop', 'clinic', 'real_estate', 'delivery', 'repair', 'other')),
  phone text,
  description text,
  language text default 'en' check (language in ('en', 'hi')),
  logo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists workflows (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  name text not null,
  trigger text default 'missed_call',
  greeting text not null,
  closing_message text not null,
  language text default 'en',
  fields jsonb default '[]',
  conditions jsonb default '[]',
  post_action text default 'create_record',
  calendar_enabled boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists calls (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete set null,
  workflow_id uuid references workflows(id) on delete set null,
  caller_name text,
  caller_phone text,
  status text default 'new' check (status in ('new', 'in_progress', 'completed', 'contacted', 'closed')),
  intent text,
  summary text,
  urgency text default 'normal' check (urgency in ('normal', 'urgent', 'low')),
  follow_up_status text default 'pending' check (follow_up_status in ('pending', 'contacted', 'resolved', 'closed')),
  transcript jsonb default '[]',
  collected_data jsonb default '{}',
  language_used text default 'en',
  duration_seconds integer,
  calendar_event_id text,
  calendar_event_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists integrations (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  provider text not null check (provider in ('google_calendar')),
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scope text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (business_id, provider)
);

alter table businesses enable row level security;
alter table workflows enable row level security;
alter table calls enable row level security;
alter table integrations enable row level security;

drop policy if exists "Users can view their own businesses" on businesses;
drop policy if exists "Users can create their own businesses" on businesses;
drop policy if exists "Users can update their own businesses" on businesses;
drop policy if exists "Users can delete their own businesses" on businesses;

create policy "Users can view their own businesses"
  on businesses for select to authenticated
  using (auth.uid() = owner_id);

create policy "Users can create their own businesses"
  on businesses for insert to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update their own businesses"
  on businesses for update to authenticated
  using (auth.uid() = owner_id);

create policy "Users can delete their own businesses"
  on businesses for delete to authenticated
  using (auth.uid() = owner_id);

create policy "service_role_full_access_businesses"
  on businesses for all to service_role
  using (true) with check (true);

drop policy if exists "Users can view workflows of their businesses" on workflows;
drop policy if exists "Users can create workflows for their businesses" on workflows;
drop policy if exists "Users can update workflows of their businesses" on workflows;
drop policy if exists "Users can delete workflows of their businesses" on workflows;

create policy "Users can view workflows of their businesses"
  on workflows for select to authenticated
  using (
    exists (
      select 1 from businesses
      where businesses.id = workflows.business_id
      and businesses.owner_id = auth.uid()
    )
  );

create policy "Users can create workflows for their businesses"
  on workflows for insert to authenticated
  with check (
    exists (
      select 1 from businesses
      where businesses.id = workflows.business_id
      and businesses.owner_id = auth.uid()
    )
  );

create policy "Users can update workflows of their businesses"
  on workflows for update to authenticated
  using (
    exists (
      select 1 from businesses
      where businesses.id = workflows.business_id
      and businesses.owner_id = auth.uid()
    )
  );

create policy "Users can delete workflows of their businesses"
  on workflows for delete to authenticated
  using (
    exists (
      select 1 from businesses
      where businesses.id = workflows.business_id
      and businesses.owner_id = auth.uid()
    )
  );

create policy "service_role_full_access_workflows"
  on workflows for all to service_role
  using (true) with check (true);

drop policy if exists "Users can view calls of their businesses" on calls;
drop policy if exists "Users can insert calls for their businesses" on calls;
drop policy if exists "Users can update calls of their businesses" on calls;
drop policy if exists "Service role can do anything on calls" on calls;

create policy "Users can view calls of their businesses"
  on calls for select to authenticated
  using (
    exists (
      select 1 from businesses
      where businesses.id = calls.business_id
      and businesses.owner_id = auth.uid()
    )
  );

create policy "Users can insert calls for their businesses"
  on calls for insert to authenticated
  with check (
    exists (
      select 1 from businesses
      where businesses.id = calls.business_id
      and businesses.owner_id = auth.uid()
    )
  );

create policy "Users can update calls of their businesses"
  on calls for update to authenticated
  using (
    exists (
      select 1 from businesses
      where businesses.id = calls.business_id
      and businesses.owner_id = auth.uid()
    )
  );

create policy "service_role_full_access_calls"
  on calls for all to service_role
  using (true) with check (true);

drop policy if exists "owners_manage_own_integrations" on integrations;
drop policy if exists "service_role_full_access_integrations" on integrations;

create policy "owners_manage_own_integrations"
  on integrations for all to authenticated
  using (
    exists (select 1 from businesses where businesses.id = integrations.business_id and businesses.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from businesses where businesses.id = integrations.business_id and businesses.owner_id = auth.uid())
  );

create policy "service_role_full_access_integrations"
  on integrations for all to service_role
  using (true) with check (true);

create index if not exists idx_businesses_owner_id on businesses(owner_id);
create index if not exists idx_workflows_business_id on workflows(business_id);
create index if not exists idx_calls_business_id on calls(business_id);
create index if not exists idx_calls_created_at on calls(created_at desc);
create index if not exists idx_calls_status on calls(status);
create index if not exists idx_calls_urgency on calls(urgency);
create index if not exists idx_integrations_business_id on integrations(business_id);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_businesses_updated_at on businesses;
create trigger update_businesses_updated_at
  before update on businesses
  for each row execute function update_updated_at_column();

drop trigger if exists update_workflows_updated_at on workflows;
create trigger update_workflows_updated_at
  before update on workflows
  for each row execute function update_updated_at_column();

drop trigger if exists update_calls_updated_at on calls;
create trigger update_calls_updated_at
  before update on calls
  for each row execute function update_updated_at_column();

drop trigger if exists update_integrations_updated_at on integrations;
create trigger update_integrations_updated_at
  before update on integrations
  for each row execute function update_updated_at_column();

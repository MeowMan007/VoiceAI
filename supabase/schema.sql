-- Voice AI Personal Assistant - Database Schema
-- Run this in the Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Businesses table
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

-- Workflows table
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

-- Calls table (customer interactions)
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

-- Row Level Security
alter table businesses enable row level security;
alter table workflows enable row level security;
alter table calls enable row level security;

-- RLS Policies for businesses
create policy "Users can view their own businesses"
  on businesses for select
  using (auth.uid() = owner_id);

create policy "Users can create their own businesses"
  on businesses for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own businesses"
  on businesses for update
  using (auth.uid() = owner_id);

create policy "Users can delete their own businesses"
  on businesses for delete
  using (auth.uid() = owner_id);

-- RLS Policies for workflows (through business ownership)
create policy "Users can view workflows of their businesses"
  on workflows for select
  using (
    exists (
      select 1 from businesses 
      where businesses.id = workflows.business_id 
      and businesses.owner_id = auth.uid()
    )
  );

create policy "Users can create workflows for their businesses"
  on workflows for insert
  with check (
    exists (
      select 1 from businesses 
      where businesses.id = workflows.business_id 
      and businesses.owner_id = auth.uid()
    )
  );

create policy "Users can update workflows of their businesses"
  on workflows for update
  using (
    exists (
      select 1 from businesses 
      where businesses.id = workflows.business_id 
      and businesses.owner_id = auth.uid()
    )
  );

create policy "Users can delete workflows of their businesses"
  on workflows for delete
  using (
    exists (
      select 1 from businesses 
      where businesses.id = workflows.business_id 
      and businesses.owner_id = auth.uid()
    )
  );

-- RLS Policies for calls
create policy "Users can view calls of their businesses"
  on calls for select
  using (
    exists (
      select 1 from businesses 
      where businesses.id = calls.business_id 
      and businesses.owner_id = auth.uid()
    )
  );

create policy "Users can insert calls for their businesses"
  on calls for insert
  with check (
    exists (
      select 1 from businesses 
      where businesses.id = calls.business_id 
      and businesses.owner_id = auth.uid()
    )
  );

create policy "Users can update calls of their businesses"
  on calls for update
  using (
    exists (
      select 1 from businesses 
      where businesses.id = calls.business_id 
      and businesses.owner_id = auth.uid()
    )
  );

-- Service role can bypass RLS for webhook insertions
-- (used by Vapi webhooks)
create policy "Service role can do anything on calls"
  on calls for all
  using (true)
  with check (true);

-- Indexes for performance
create index if not exists idx_businesses_owner_id on businesses(owner_id);
create index if not exists idx_workflows_business_id on workflows(business_id);
create index if not exists idx_calls_business_id on calls(business_id);
create index if not exists idx_calls_created_at on calls(created_at desc);
create index if not exists idx_calls_status on calls(status);
create index if not exists idx_calls_urgency on calls(urgency);

-- Updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_businesses_updated_at
  before update on businesses
  for each row execute function update_updated_at_column();

create trigger update_workflows_updated_at
  before update on workflows
  for each row execute function update_updated_at_column();

create trigger update_calls_updated_at
  before update on calls
  for each row execute function update_updated_at_column();

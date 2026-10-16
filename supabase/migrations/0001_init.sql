-- Expense tracker schema. Every table is per-user with RLS; rows carry
-- client-generated UUIDs and updated_at/deleted_at for local-first sync.

create extension if not exists "pgcrypto";

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  -- Clients set updated_at themselves; only fill it in when missing.
  if new.updated_at is null then new.updated_at = now(); end if;
  return new;
end $$;

create table if not exists public.accounts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('cash','upi','bank','card','wallet')),
  opening_balance numeric(14,2) not null default 0,
  archived smallint not null default 0,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.categories (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default 'circle',
  color text not null default '#737373',
  parent_id uuid,
  kind text not null check (kind in ('expense','income')),
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.transactions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('debit','credit','transfer')),
  amount numeric(14,2) not null,
  account_id uuid,
  to_account_id uuid,
  category_id uuid,
  note text not null default '',
  tags text[] not null default '{}',
  occurred_at timestamptz not null,
  source text not null default 'manual',
  raw_input text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists transactions_user_occurred on public.transactions (user_id, occurred_at desc);
create index if not exists transactions_user_updated on public.transactions (user_id, updated_at);

create table if not exists public.budgets (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid,
  period text not null default 'month',
  amount numeric(14,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.debts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  person text not null,
  direction text not null check (direction in ('lent','borrowed')),
  amount numeric(14,2) not null,
  note text not null default '',
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.aliases (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  phrase text not null,
  category_id uuid,
  account_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.recurring_rules (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  template jsonb not null,
  rrule text not null,
  next_run timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

do $$
declare t text;
begin
  foreach t in array array['accounts','categories','transactions','budgets','debts','aliases','recurring_rules'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('drop trigger if exists touch_updated_at on public.%I', t);
    execute format('create trigger touch_updated_at before insert or update on public.%I for each row execute function public.touch_updated_at()', t);
    execute format('create index if not exists %I on public.%I (user_id, updated_at)', t || '_user_updated_idx', t);
  end loop;
end $$;

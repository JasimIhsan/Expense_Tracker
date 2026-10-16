-- AI provider keys, per user. Stored in the user's own project behind RLS so
-- one setup follows them to every device. Rotation state syncs too.

create table if not exists public.api_keys (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'groq',
  label text not null default '',
  key text not null,
  cooldown_until bigint not null default 0,
  invalid smallint not null default 0,
  last_used bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.api_keys enable row level security;
drop policy if exists "own rows" on public.api_keys;
create policy "own rows" on public.api_keys for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop trigger if exists touch_updated_at on public.api_keys;
create trigger touch_updated_at before insert or update on public.api_keys for each row execute function public.touch_updated_at();
create index if not exists api_keys_user_updated_idx on public.api_keys (user_id, updated_at);

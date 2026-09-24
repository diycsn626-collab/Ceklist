-- BKSI Audit App - Supabase schema
create table if not exists public.audits (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.audit_evidence (
  id text primary key,
  audit_id text not null references public.audits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  criterion_id text not null,
  file_name text not null,
  file_type text,
  file_size bigint default 0,
  storage_path text not null,
  created_at timestamptz not null default now()
);
alter table public.audits enable row level security;
alter table public.audit_evidence enable row level security;
grant select, insert, update, delete on public.audits to authenticated;
grant select, insert, update, delete on public.audit_evidence to authenticated;
create policy "users read own audits" on public.audits for select using (auth.uid() = user_id);
create policy "users insert own audits" on public.audits for insert with check (auth.uid() = user_id);
create policy "users update own audits" on public.audits for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own audits" on public.audits for delete using (auth.uid() = user_id);
create policy "users read own evidence metadata" on public.audit_evidence for select using (auth.uid() = user_id);
create policy "users insert own evidence metadata" on public.audit_evidence for insert with check (auth.uid() = user_id);
create policy "users update own evidence metadata" on public.audit_evidence for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own evidence metadata" on public.audit_evidence for delete using (auth.uid() = user_id);
insert into storage.buckets (id, name, public) values ('audit-evidence', 'audit-evidence', false) on conflict (id) do nothing;
create policy "users read own evidence files" on storage.objects for select using (bucket_id = 'audit-evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users upload own evidence files" on storage.objects for insert with check (bucket_id = 'audit-evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users update own evidence files" on storage.objects for update using (bucket_id = 'audit-evidence' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'audit-evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete own evidence files" on storage.objects for delete using (bucket_id = 'audit-evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create index if not exists idx_audits_user_updated on public.audits(user_id, updated_at desc);
create index if not exists idx_evidence_audit on public.audit_evidence(audit_id);

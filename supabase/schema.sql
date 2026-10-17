-- Run in Supabase SQL Editor. No service_role key is needed by the app.
create table if not exists public.atlas_documents (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  constraint atlas_data_object check (jsonb_typeof(data) = 'object')
);
alter table public.atlas_documents enable row level security;
alter table public.atlas_documents force row level security;
revoke all on public.atlas_documents from anon;
grant select, insert, update, delete on public.atlas_documents to authenticated;
drop policy if exists "Own atlas only" on public.atlas_documents;
create policy "Own atlas only" on public.atlas_documents
for all to authenticated using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

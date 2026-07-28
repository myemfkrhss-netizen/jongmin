create table if not exists public.setuk_records (
  id uuid primary key default gen_random_uuid(),
  student_identifier text not null,
  grade text not null,
  subject text not null,
  input_keywords text,
  agent_results jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.setuk_records enable row level security;
-- MVP policies: replace with auth.uid()-scoped policies before handling real student records.
create policy "demo can read setuk records" on public.setuk_records for select to anon using (true);
create policy "demo can insert setuk records" on public.setuk_records for insert to anon with check (true);

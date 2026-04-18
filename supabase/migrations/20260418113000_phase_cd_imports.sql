create table if not exists public.finance_import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('csv', 'forwarded_email')),
  status text not null default 'pending_review' check (status in ('pending_review', 'processed', 'failed')),
  file_name text,
  source_ref text,
  imported_count integer not null default 0,
  duplicate_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_draft_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_job_id uuid references public.finance_import_jobs(id) on delete set null,
  source text not null check (source in ('csv', 'forwarded_email')),
  transaction_date date not null,
  merchant text not null default '',
  category text not null default 'Other',
  amount numeric not null default 0,
  currency text not null default 'USD',
  description text not null default '',
  dedupe_key text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique(user_id, dedupe_key)
);

create index if not exists idx_finance_import_jobs_user_id_created_at
  on public.finance_import_jobs(user_id, created_at desc);
create index if not exists idx_finance_draft_transactions_user_id_status_created_at
  on public.finance_draft_transactions(user_id, status, created_at desc);
create index if not exists idx_finance_draft_transactions_import_job_id
  on public.finance_draft_transactions(import_job_id);

alter table public.finance_import_jobs enable row level security;
alter table public.finance_draft_transactions enable row level security;

drop policy if exists "Users can read own finance import jobs" on public.finance_import_jobs;
create policy "Users can read own finance import jobs"
  on public.finance_import_jobs
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can write own finance import jobs" on public.finance_import_jobs;
create policy "Users can write own finance import jobs"
  on public.finance_import_jobs
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own finance draft transactions" on public.finance_draft_transactions;
create policy "Users can read own finance draft transactions"
  on public.finance_draft_transactions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can write own finance draft transactions" on public.finance_draft_transactions;
create policy "Users can write own finance draft transactions"
  on public.finance_draft_transactions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists set_finance_import_jobs_updated_at on public.finance_import_jobs;
create trigger set_finance_import_jobs_updated_at
before update on public.finance_import_jobs
for each row execute function public.set_finance_updated_at();

drop trigger if exists set_finance_draft_transactions_updated_at on public.finance_draft_transactions;
create trigger set_finance_draft_transactions_updated_at
before update on public.finance_draft_transactions
for each row execute function public.set_finance_updated_at();

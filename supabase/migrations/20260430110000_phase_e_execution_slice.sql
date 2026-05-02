alter table public.finance_sensitive_action_verifications
  drop constraint if exists finance_sensitive_action_verifications_action_type_check;

alter table public.finance_sensitive_action_verifications
  add constraint finance_sensitive_action_verifications_action_type_check
  check (
    action_type in (
      'generate_statement',
      'review_draft_transaction',
      'receipt_forwarding',
      'security_settings',
      'approve_request'
    )
  );

alter table public.finance_profiles
  add column if not exists agent_mode text not null default 'manual',
  add column if not exists autopilot_high_risk_enabled boolean not null default false;

alter table public.finance_profiles
  drop constraint if exists finance_profiles_agent_mode_check;

alter table public.finance_profiles
  add constraint finance_profiles_agent_mode_check
  check (agent_mode in ('manual', 'assisted', 'autopilot'));

create table if not exists public.finance_execution_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  action_type text not null,
  status text not null default 'approved_pending' check (
    status in ('approved_pending', 'completed', 'failed', 'cancelled')
  ),
  title text not null,
  description text not null default '',
  provider text not null default 'manual_external_account',
  dispatch_status text not null default 'not_dispatched' check (
    dispatch_status in ('not_dispatched', 'dispatch_pending', 'dispatched', 'dispatch_failed')
  ),
  receipt_payload jsonb not null default '{}'::jsonb,
  reconciliation_payload jsonb not null default '{}'::jsonb,
  executed_at timestamptz not null default now(),
  dispatched_at timestamptz,
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.finance_execution_receipts
  add column if not exists dispatch_status text not null default 'not_dispatched',
  add column if not exists dispatched_at timestamptz;

alter table public.finance_execution_receipts
  drop constraint if exists finance_execution_receipts_dispatch_status_check;

alter table public.finance_execution_receipts
  add constraint finance_execution_receipts_dispatch_status_check
  check (dispatch_status in ('not_dispatched', 'dispatch_pending', 'dispatched', 'dispatch_failed'));

alter table public.finance_execution_receipts
  drop constraint if exists finance_execution_receipts_provider_check;

alter table public.finance_execution_receipts
  add constraint finance_execution_receipts_provider_check
  check (provider in ('manual_external_account', 'utg'));

create index if not exists idx_finance_execution_receipts_user_executed_at
  on public.finance_execution_receipts(user_id, executed_at desc);

create index if not exists idx_finance_execution_receipts_approval_request_id
  on public.finance_execution_receipts(approval_request_id);

alter table public.finance_execution_receipts enable row level security;

drop policy if exists "Users can read own finance execution receipts" on public.finance_execution_receipts;
create policy "Users can read own finance execution receipts"
  on public.finance_execution_receipts
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can write own finance execution receipts" on public.finance_execution_receipts;
create policy "Users can write own finance execution receipts"
  on public.finance_execution_receipts
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists set_finance_execution_receipts_updated_at on public.finance_execution_receipts;
create trigger set_finance_execution_receipts_updated_at
before update on public.finance_execution_receipts
for each row execute function public.set_finance_updated_at();

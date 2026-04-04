create table if not exists public.public_user_profiles (
  public_user_id uuid primary key,
  first_name text not null default '',
  last_name text not null default '',
  country text not null default '',
  user_type text not null default 'personal',
  updates_opt_in boolean not null default false,
  cash_balance numeric not null default 0,
  monthly_income numeric not null default 0,
  monthly_fixed_expenses numeric not null default 0,
  budgeting_focus text not null default '',
  intent_focus text not null default '',
  biggest_problem text not null default '',
  money_style text not null default '',
  guidance_style text not null default '',
  goal_focus text not null default '',
  subscription_awareness text not null default '',
  target_monthly_savings numeric not null default 0,
  onboarding_completed boolean not null default false,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.public_user_goals (
  id uuid primary key default gen_random_uuid(),
  public_user_id uuid not null references public.public_user_profiles(public_user_id) on delete cascade,
  name text not null,
  target_amount numeric not null default 0,
  current_amount numeric not null default 0,
  deadline date not null,
  icon text not null default '🎯',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.public_user_budget_limits (
  id uuid primary key default gen_random_uuid(),
  public_user_id uuid not null references public.public_user_profiles(public_user_id) on delete cascade,
  category text not null,
  monthly_limit numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(public_user_id, category)
);

create table if not exists public.public_user_spending_logs (
  id uuid primary key default gen_random_uuid(),
  public_user_id uuid not null references public.public_user_profiles(public_user_id) on delete cascade,
  date date not null default current_date,
  items jsonb not null default '[]'::jsonb,
  raw_input text not null default '',
  total numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.public_user_financial_entries (
  id uuid primary key default gen_random_uuid(),
  public_user_id uuid not null references public.public_user_profiles(public_user_id) on delete cascade,
  name text not null,
  type text not null default 'other',
  entry_type text not null check (entry_type in ('asset', 'liability')),
  value numeric not null default 0,
  cashflow numeric not null default 0,
  balance numeric not null default 0,
  payment numeric not null default 0,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.public_user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  public_user_id uuid not null references public.public_user_profiles(public_user_id) on delete cascade,
  name text not null,
  price numeric not null default 0,
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  category text not null default 'Other',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.public_user_profiles enable row level security;
alter table public.public_user_goals enable row level security;
alter table public.public_user_budget_limits enable row level security;
alter table public.public_user_spending_logs enable row level security;
alter table public.public_user_financial_entries enable row level security;
alter table public.public_user_subscriptions enable row level security;

create or replace function public.set_updated_at_public_user_profiles()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_public_user_profiles_updated_at on public.public_user_profiles;
create trigger set_public_user_profiles_updated_at
before update on public.public_user_profiles
for each row execute function public.set_updated_at_public_user_profiles();

create or replace function public.set_updated_at_public_user_goals()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_public_user_goals_updated_at on public.public_user_goals;
create trigger set_public_user_goals_updated_at
before update on public.public_user_goals
for each row execute function public.set_updated_at_public_user_goals();

create or replace function public.set_updated_at_public_user_budget_limits()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_public_user_budget_limits_updated_at on public.public_user_budget_limits;
create trigger set_public_user_budget_limits_updated_at
before update on public.public_user_budget_limits
for each row execute function public.set_updated_at_public_user_budget_limits();

create or replace function public.set_updated_at_public_user_financial_entries()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_public_user_financial_entries_updated_at on public.public_user_financial_entries;
create trigger set_public_user_financial_entries_updated_at
before update on public.public_user_financial_entries
for each row execute function public.set_updated_at_public_user_financial_entries();

create or replace function public.set_updated_at_public_user_subscriptions()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_public_user_subscriptions_updated_at on public.public_user_subscriptions;
create trigger set_public_user_subscriptions_updated_at
before update on public.public_user_subscriptions
for each row execute function public.set_updated_at_public_user_subscriptions();

create index if not exists idx_public_user_goals_public_user_id on public.public_user_goals(public_user_id);
create index if not exists idx_public_user_budget_limits_public_user_id on public.public_user_budget_limits(public_user_id);
create index if not exists idx_public_user_spending_logs_public_user_id_date on public.public_user_spending_logs(public_user_id, date desc);
create index if not exists idx_public_user_financial_entries_public_user_id on public.public_user_financial_entries(public_user_id);
create index if not exists idx_public_user_subscriptions_public_user_id on public.public_user_subscriptions(public_user_id);

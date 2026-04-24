alter table public.finance_profiles
  add column if not exists model_training_opt_in boolean not null default false;

alter table public.finance_import_jobs
  drop constraint if exists finance_import_jobs_source_check;

alter table public.finance_import_jobs
  add constraint finance_import_jobs_source_check
  check (source in ('csv', 'forwarded_email', 'receipt_image'));

alter table public.finance_draft_transactions
  drop constraint if exists finance_draft_transactions_source_check;

alter table public.finance_draft_transactions
  add constraint finance_draft_transactions_source_check
  check (source in ('csv', 'forwarded_email', 'receipt_image'));

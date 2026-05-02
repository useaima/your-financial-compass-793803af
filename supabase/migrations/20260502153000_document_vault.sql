-- Create vault_documents table for AI-driven document management
create table if not exists public.vault_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  file_path text not null,
  file_type text,
  file_size integer,
  category text default 'other', -- e.g. 'receipt', 'statement', 'contract', 'tax'
  metadata jsonb default '{}'::jsonb,
  is_verified boolean default false,
  extracted_data jsonb default '{}'::jsonb, -- AI extracted data (e.g. total, date, merchant)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.vault_documents enable row level security;

-- Policies
create policy "Users can view their own documents"
  on public.vault_documents for select
  using (auth.uid() = user_id);

create policy "Users can insert their own documents"
  on public.vault_documents for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own documents"
  on public.vault_documents for update
  using (auth.uid() = user_id);

create policy "Users can delete their own documents"
  on public.vault_documents for delete
  using (auth.uid() = user_id);

-- Storage Bucket for Vault
-- Note: This requires the storage extension and may need to be run in the SQL editor
-- if the service role doesn't have permissions here, but typically handled via dashboard.
-- insert into storage.buckets (id, name, public) values ('vault', 'vault', false) on conflict (id) do nothing;

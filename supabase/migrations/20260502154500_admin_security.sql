-- Phase 4: CRM/CMS & Admin Security
alter table public.public_user_profiles
  add column if not exists is_admin boolean not null default false;

-- Policies for Admin access to CRM/CMS tables
-- Announcements
create policy "Admins can manage announcements"
  on public.app_announcements
  for all
  to authenticated
  using (
    exists (
      select 1 from public.public_user_profiles
      where public_user_id = auth.uid() and is_admin = true
    )
  );

-- Help Links
create policy "Admins can manage help links"
  on public.app_help_links
  for all
  to authenticated
  using (
    exists (
      select 1 from public.public_user_profiles
      where public_user_id = auth.uid() and is_admin = true
    )
  );

-- Config Flags
create policy "Admins can manage config flags"
  on public.app_config_flags
  for all
  to authenticated
  using (
    exists (
      select 1 from public.public_user_profiles
      where public_user_id = auth.uid() and is_admin = true
    )
  );

-- CRM Records
create policy "Admins can view all crm records"
  on public.contact_crm_records
  for select
  to authenticated
  using (
    exists (
      select 1 from public.public_user_profiles
      where public_user_id = auth.uid() and is_admin = true
    )
  );

create policy "Admins can update crm records"
  on public.contact_crm_records
  for update
  to authenticated
  using (
    exists (
      select 1 from public.public_user_profiles
      where public_user_id = auth.uid() and is_admin = true
    )
  );

-- CRM Events
create policy "Admins can view all crm events"
  on public.contact_crm_events
  for select
  to authenticated
  using (
    exists (
      select 1 from public.public_user_profiles
      where public_user_id = auth.uid() and is_admin = true
    )
  );

-- Campaign Logs
create policy "Admins can manage campaign logs"
  on public.outbound_campaign_logs
  for all
  to authenticated
  using (
    exists (
      select 1 from public.public_user_profiles
      where public_user_id = auth.uid() and is_admin = true
    )
  );

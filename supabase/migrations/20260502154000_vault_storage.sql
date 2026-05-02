-- Create vault bucket for secure document storage
insert into storage.buckets (id, name, public)
values ('vault', 'vault', false)
on conflict (id) do nothing;

-- Allow users to view their own files in the vault bucket
create policy "Users can view their own vault files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'vault' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to upload files to their own folder in the vault bucket
create policy "Users can upload their own vault files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'vault' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files in the vault bucket
create policy "Users can delete their own vault files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'vault' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

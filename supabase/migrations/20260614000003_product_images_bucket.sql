-- 0003 — Bucket ảnh sản phẩm (ADR 0007: Supabase Storage)
-- Path: {org_id}/{uuid}-{filename}; read public, write theo thành viên org.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product_images_read" on storage.objects
  for select to public
  using (bucket_id = 'product-images');

create policy "product_images_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy "product_images_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy "product_images_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

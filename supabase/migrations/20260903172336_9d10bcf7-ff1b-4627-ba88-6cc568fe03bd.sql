create policy "funnel_assets_public_read"
on storage.objects for select to anon, authenticated
using (bucket_id = 'funnel-assets');

create policy "funnel_assets_admin_insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'funnel-assets' and public.has_role(auth.uid(), 'admin'));

create policy "funnel_assets_admin_update"
on storage.objects for update to authenticated
using (bucket_id = 'funnel-assets' and public.has_role(auth.uid(), 'admin'));

create policy "funnel_assets_admin_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'funnel-assets' and public.has_role(auth.uid(), 'admin'));
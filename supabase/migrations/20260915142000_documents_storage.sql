insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents','documents',false,20971520,array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public=false,file_size_limit=20971520,allowed_mime_types=excluded.allowed_mime_types;

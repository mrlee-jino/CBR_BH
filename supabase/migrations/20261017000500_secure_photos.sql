begin;
alter table public.property_photos
  add column upload_state text not null default 'reserved' check (upload_state in ('reserved','ready','removed')),
  add column reserved_version integer,
  add column width integer,
  add column height integer,
  add column byte_size integer,
  add column review_note text check (length(review_note)<=500),
  add constraint photo_processed_dimensions check (upload_state<>'ready' or
    (width is not null and height is not null and byte_size is not null and width between 1 and 1600 and height between 1 and 1600 and byte_size between 1 and 3145728));
create index photo_upload_quota on public.audit_events(actor_id,occurred_at) where action='photo.reserved';
create index photos_cleanup on public.property_photos(upload_state,created_at);
update storage.buckets set allowed_mime_types=array['image/webp'],file_size_limit=3145728 where id='property-photos';
do $$ begin
  if not exists(select 1 from storage.buckets where id='property-photos' and not public) then
    raise exception 'PROPERTY_PHOTO_BUCKET_MUST_BE_PRIVATE';
  end if;
end $$;

create function public.reserve_property_photo(p_property_id uuid,p_alt_text text)
returns table(id uuid,storage_path text) language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_account(); p public.properties; photo_id uuid:=gen_random_uuid(); path text;
begin
  -- Serialize hourly quotas across an owner's properties, then lock the property.
  perform 1 from public.profiles where profiles.id=actor for update;
  select * into p from public.properties where properties.id=p_property_id for update;
  if p.id is null or not private.owns_property(p.id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p.status not in ('draft','paused','rejected','published') then raise exception 'INVALID_STATE'; end if;
  if p_alt_text is null or length(trim(p_alt_text)) not between 1 and 250 then raise exception 'INVALID_PHOTO'; end if;
  if (select count(*) from public.audit_events where actor_id=actor and action='photo.reserved' and occurred_at>now()-interval '1 hour')>=20 then raise exception 'PHOTO_RATE_LIMIT'; end if;
  if (select count(*) from public.property_photos where property_id=p.id and (upload_state='ready' or (upload_state='reserved' and created_at>now()-interval '1 hour')))>=12 then raise exception 'PHOTO_LIMIT'; end if;
  path:=p.id::text||'/'||photo_id::text||'.webp';
  insert into public.property_photos(id,property_id,storage_path,alt_text,reserved_version)
    values(photo_id,p.id,path,trim(p_alt_text),p.version);
  perform private.audit('photo.reserved','property',p.id);
  return query select photo_id,path;
end;
$$;

-- Only the server's validated image pipeline may mark an upload ready.
create function public.complete_property_photo(p_photo_id uuid,p_actor_id uuid,p_width integer,p_height integer,p_byte_size integer)
returns void language plpgsql security definer set search_path='' as $$
declare photo public.property_photos; p public.properties;
begin
  select properties.* into p from public.properties join public.property_photos x on x.property_id=properties.id where x.id=p_photo_id for update of properties;
  select * into photo from public.property_photos where id=p_photo_id for update;
  if p.id is null or p.owner_id is distinct from p_actor_id
    or not exists(select 1 from public.profiles where id=p_actor_id and account_status='active')
    or not exists(select 1 from public.account_roles where user_id=p_actor_id and role='owner')
    or not exists(select 1 from auth.users where id=p_actor_id and email_confirmed_at is not null)
  then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if photo.upload_state<>'reserved' or photo.reserved_version is distinct from p.version
    or p.status not in ('draft','paused','rejected','published') then raise exception 'INVALID_STATE'; end if;
  if p_width is null or p_height is null or p_byte_size is null
    or p_width not between 1 and 1600 or p_height not between 1 and 1600 or p_byte_size not between 1 and 3145728
    or not exists(select 1 from storage.objects where bucket_id='property-photos' and name=photo.storage_path)
  then raise exception 'INVALID_PHOTO'; end if;
  update public.property_photos set upload_state='ready',width=p_width,height=p_height,byte_size=p_byte_size where id=photo.id;
  update public.properties set status=case when status='published' then 'paused' else status end,
    verified_by=null,verified_at=null,version=version+1,updated_at=now() where id=p.id;
  insert into public.audit_events(actor_id,action,entity_type,entity_id) values(p_actor_id,'photo.uploaded','property',p.id);
end;
$$;

create function public.edit_property_photo(p_photo_id uuid,p_action text)
returns text language plpgsql security definer set search_path='' as $$
declare photo public.property_photos; p public.properties;
begin
  perform private.require_account();
  select properties.* into p from public.properties join public.property_photos x on x.property_id=properties.id where x.id=p_photo_id for update of properties;
  select * into photo from public.property_photos where id=p_photo_id for update;
  if p.id is null or not private.owns_property(p.id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p.status not in ('draft','paused','rejected','published') then raise exception 'INVALID_STATE'; end if;
  if p_action='remove' then
    if photo.upload_state='removed' then return photo.storage_path; end if;
    update public.property_photos set upload_state='removed',is_cover=false where id=photo.id;
  elsif p_action='cover' and photo.upload_state='ready' and photo.status<>'rejected' then
    update public.property_photos set is_cover=false where property_id=p.id and is_cover;
    update public.property_photos set is_cover=true where id=photo.id;
  else raise exception 'INVALID_STATE'; end if;
  if photo.upload_state='ready' then
    update public.properties set status=case when status='published' then 'paused' else status end,
      verified_by=null,verified_at=null,version=version+1,updated_at=now() where id=p.id;
  end if;
  perform private.audit('photo.'||p_action,'property',p.id);
  return photo.storage_path;
end;
$$;

create function public.review_property_photo(p_photo_id uuid,p_decision text,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare photo public.property_photos; property_id uuid;
begin
  perform private.require_account();
  if not private.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select p.id into property_id from public.properties p join public.property_photos x on x.property_id=p.id
    where x.id=p_photo_id and p.status='pending_review' for update of p;
  select * into photo from public.property_photos where id=p_photo_id for update;
  if property_id is null or photo.upload_state<>'ready' then raise exception 'INVALID_STATE'; end if;
  if p_decision is null or p_decision not in ('approved','rejected') or p_note is null or length(trim(p_note)) not between 3 and 500 then raise exception 'INVALID_REVIEW'; end if;
  update public.property_photos set status=p_decision,review_note=trim(p_note),
    is_cover=case when p_decision='rejected' then false else is_cover end where id=photo.id;
  update public.properties set version=version+1,updated_at=now() where id=property_id;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'photo.reviewed','property',property_id,jsonb_build_object('photo_id',photo.id,'decision',p_decision));
end;
$$;

create function public.get_property_photos(p_property_id uuid)
returns table(id uuid,alt_text text,width integer,height integer,is_cover boolean)
language sql stable security definer set search_path='' as $$
  select x.id,x.alt_text,x.width,x.height,x.is_cover from public.property_photos x
  where x.property_id=p_property_id and x.upload_state='ready' and x.status='approved' and private.is_published(x.property_id)
  order by x.is_cover desc,x.sort_order,x.created_at,x.id limit 12;
$$;

create function public.get_listing_covers(p_property_ids uuid[])
returns table(property_id uuid,id uuid,alt_text text,width integer,height integer,is_cover boolean)
language sql stable security definer set search_path='' as $$
  select distinct on (x.property_id) x.property_id,x.id,x.alt_text,x.width,x.height,x.is_cover
  from public.property_photos x where x.property_id=any(p_property_ids[1:25])
    and x.upload_state='ready' and x.status='approved' and private.is_published(x.property_id)
  order by x.property_id,x.is_cover desc,x.sort_order,x.created_at,x.id;
$$;
revoke execute on function public.get_listing_covers(uuid[]) from public,anon,authenticated;
grant execute on function public.get_listing_covers(uuid[]) to anon,authenticated;

create function public.get_photo_access(p_photo_id uuid) returns text
language sql stable security definer set search_path='' as $$
  select x.storage_path from public.property_photos x where x.id=p_photo_id and x.upload_state='ready' and (
    (x.status='approved' and private.is_published(x.property_id))
    or (private.owns_property(x.property_id) and exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null))
    or private.is_admin()
  );
$$;

create function public.get_photo_cleanup_batch()
returns table(id uuid,storage_path text) language plpgsql security definer set search_path='' as $$
begin
  perform private.require_account();
  if not private.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  update public.property_photos set upload_state='removed',is_cover=false where upload_state='reserved' and created_at<now()-interval '1 hour';
  return query select x.id,x.storage_path from public.property_photos x where x.upload_state='removed' order by x.created_at,x.id limit 25;
end;
$$;

revoke execute on function public.reserve_property_photo(uuid,text),public.complete_property_photo(uuid,uuid,integer,integer,integer),public.edit_property_photo(uuid,text),public.review_property_photo(uuid,text,text),public.get_property_photos(uuid),public.get_photo_access(uuid),public.get_photo_cleanup_batch() from public,anon,authenticated;
grant execute on function public.reserve_property_photo(uuid,text),public.edit_property_photo(uuid,text),public.review_property_photo(uuid,text,text),public.get_photo_cleanup_batch() to authenticated;
grant execute on function public.get_property_photos(uuid),public.get_photo_access(uuid) to anon,authenticated;
grant execute on function public.complete_property_photo(uuid,uuid,integer,integer,integer) to service_role;

create or replace function public.moderate_property(p_property_id uuid,p_decision text,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare current_status text;
begin
  perform private.require_account();
  if not private.is_admin() or length(trim(p_reason)) not between 3 and 1000 then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select status into current_status from public.properties where id=p_property_id for update;
  if not found then raise exception 'INVALID_STATE'; end if;
  if p_decision in ('published','rejected') and current_status<>'pending_review' then raise exception 'INVALID_STATE'; end if;
  if p_decision not in ('published','rejected','suspended') then raise exception 'INVALID_STATE'; end if;
  if p_decision='published' and not exists(select 1 from public.properties p join public.profiles o on o.id=p.owner_id where p.id=p_property_id and o.account_status='active') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_decision='published' and exists(select 1 from public.property_photos where property_id=p_property_id and upload_state='ready' and status='pending') then raise exception 'PHOTOS_NEED_REVIEW'; end if;
  update public.properties set status=p_decision,
    verified_at=case when p_decision='published' then now() else null end,
    verified_by=case when p_decision='published' then auth.uid() else null end,updated_at=now() where id=p_property_id;
  perform private.audit('property.'||p_decision,'property',p_property_id);
end; $$;
commit;

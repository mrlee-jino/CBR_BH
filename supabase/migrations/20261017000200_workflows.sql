begin;
create function public.save_property_draft(
  p_property_id uuid,p_title text,p_slug text,p_property_type text,p_barangay text,
  p_description text,p_street_address text,p_contact_name text,p_contact_phone text,
  p_public_latitude numeric default null,p_public_longitude numeric default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_account(); result uuid; current_status text;
begin
  if not exists(select 1 from public.account_roles where user_id=actor and role='owner') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_property_id is null then
    insert into public.properties(owner_id,title,slug,property_type,barangay,description,public_latitude,public_longitude)
    values(actor,trim(p_title),p_slug,p_property_type,trim(p_barangay),p_description,round(p_public_latitude,3),round(p_public_longitude,3)) returning id into result;
  else
    select status into current_status from public.properties where id=p_property_id and owner_id=actor and private.owns_property(id) for update;
    if not found then raise exception 'FORBIDDEN' using errcode='42501'; end if;
    if current_status not in ('draft','paused','rejected','published') then raise exception 'INVALID_STATE'; end if;
    result:=p_property_id;
    update public.properties set title=trim(p_title),slug=p_slug,property_type=p_property_type,barangay=trim(p_barangay),
      description=p_description,public_latitude=round(p_public_latitude,3),public_longitude=round(p_public_longitude,3),
      status=case when current_status='published' then 'paused' else current_status end,
      verified_at=null,verified_by=null,version=version+1,updated_at=now() where id=result;
  end if;
  insert into public.property_private_details(property_id,street_address,contact_name,contact_phone)
    values(result,trim(p_street_address),trim(p_contact_name),trim(p_contact_phone))
    on conflict(property_id) do update set street_address=excluded.street_address,contact_name=excluded.contact_name,contact_phone=excluded.contact_phone;
  perform private.audit('property.saved','property',result);
  return result;
end; $$;

create function public.save_unit(p_property_id uuid,p_unit_id uuid,p_label text,p_unit_type text,p_monthly_rent numeric,p_deposit_amount numeric,p_terms text,p_active boolean default true)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; current_status text;
begin
  perform private.require_account();
  select status into current_status from public.properties where id=p_property_id and owner_id=auth.uid() and private.owns_property(id) for update;
  if not found then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if current_status not in ('draft','paused','rejected','published') then raise exception 'INVALID_STATE'; end if;
  if p_unit_id is null then
    insert into public.units(property_id,label,unit_type,monthly_rent,deposit_amount,terms,active)
      values(p_property_id,trim(p_label),p_unit_type,p_monthly_rent,p_deposit_amount,p_terms,p_active) returning id into result;
  else
    update public.units set label=trim(p_label),unit_type=p_unit_type,monthly_rent=p_monthly_rent,
      deposit_amount=p_deposit_amount,terms=p_terms,active=p_active,offer_version=offer_version+1,updated_at=now()
      where id=p_unit_id and property_id=p_property_id returning id into result;
    if result is null then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  end if;
  update public.properties set status=case when status='published' then 'paused' else status end,
    verified_at=null,verified_by=null,version=version+1,updated_at=now() where id=p_property_id;
  perform private.audit('unit.saved','unit',result);
  return result;
end; $$;

create function public.submit_property(p_property_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare current_status text;
begin
  perform private.require_account();
  select status into current_status from public.properties where id=p_property_id and owner_id=auth.uid() and private.owns_property(id) for update;
  if not found then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if current_status not in ('draft','paused','rejected') then raise exception 'INVALID_STATE'; end if;
  if not exists(select 1 from public.units where property_id=p_property_id and active)
    or not exists(select 1 from public.property_private_details where property_id=p_property_id)
  then raise exception 'INCOMPLETE_PROPERTY'; end if;
  update public.properties set status='pending_review',updated_at=now() where id=p_property_id;
  perform private.audit('property.submitted','property',p_property_id);
end; $$;

create function public.moderate_property(p_property_id uuid,p_decision text,p_reason text) returns void
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
  update public.properties set status=p_decision,
    verified_at=case when p_decision='published' then now() else null end,
    verified_by=case when p_decision='published' then auth.uid() else null end,updated_at=now() where id=p_property_id;
  perform private.audit('property.'||p_decision,'property',p_property_id);
end; $$;

-- A public projection intentionally excludes owner identifiers and all private fields.
create function public.browse_properties(p_limit integer default 24,p_offset integer default 0)
returns table(id uuid,slug text,title text,description text,property_type text,barangay text,city text,public_latitude numeric,public_longitude numeric,monthly_rent numeric)
language sql stable security definer set search_path='' as $$
  select p.id,p.slug,p.title,p.description,p.property_type,p.barangay,p.city,p.public_latitude,p.public_longitude,min(u.monthly_rent)
  from public.properties p join public.profiles o on o.id=p.owner_id join public.units u on u.property_id=p.id and u.active
  where p.status='published' and o.account_status='active'
  group by p.id order by p.created_at desc,p.id limit greatest(1,least(coalesce(p_limit,24),100)) offset greatest(0,least(coalesce(p_offset,0),10000));
$$;

create function public.submit_booking(p_unit_id uuid,p_start_date date,p_end_date date,p_offer_version integer,p_message text,p_consent boolean,p_idempotency_key uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_account(); u public.units; p public.properties; result uuid;
begin
  if p_consent is distinct from true then raise exception 'CONSENT_REQUIRED'; end if;
  if p_start_date is null or p_start_date < (now() at time zone 'Asia/Manila')::date or (p_end_date is not null and p_end_date<=p_start_date) then raise exception 'INVALID_DATES'; end if;
  select id into result from public.booking_requests where renter_id=actor and idempotency_key=p_idempotency_key;
  if found then return result; end if;
  select properties.* into p from public.properties join public.units on units.property_id=properties.id where units.id=p_unit_id for update of properties;
  select * into u from public.units where id=p_unit_id for update;
  if u.id is null or p.owner_id=actor or p.status<>'published' or not u.active or not exists(select 1 from public.profiles where id=p.owner_id and account_status='active') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  -- Recheck after waiting for the property/unit locks: concurrent retries are idempotent.
  select id into result from public.booking_requests where renter_id=actor and idempotency_key=p_idempotency_key;
  if found then return result; end if;
  if u.offer_version<>p_offer_version then raise exception 'OFFER_CHANGED'; end if;
  update public.booking_requests set status='rejected',decided_at=now(),decision_reason='Request expired'
    where renter_id=actor and unit_id=p_unit_id and status='pending'
      and (expires_at<=now() or start_date<(now() at time zone 'Asia/Manila')::date);
  if exists(select 1 from public.unit_allocations where unit_id=p_unit_id and released_at is null and period && daterange(p_start_date,p_end_date,'[)')) then raise exception 'UNIT_UNAVAILABLE'; end if;
  insert into public.booking_requests(renter_id,unit_id,start_date,end_date,message,contact_consent_at,offered_monthly_rent,offered_deposit_amount,offered_terms,offer_version,expires_at,idempotency_key)
    values(actor,p_unit_id,p_start_date,p_end_date,coalesce(p_message,''),now(),u.monthly_rent,u.deposit_amount,u.terms,u.offer_version,now()+interval '7 days',p_idempotency_key) returning id into result;
  perform private.audit('booking.submitted','booking',result);
  return result;
end; $$;

-- Shared lock order: property, unit, request. Publication takes the property lock too.
create function public.approve_booking(p_request_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_account(); r public.booking_requests; u public.units; p public.properties; result uuid; property_id uuid; unit_id uuid;
begin
  select units.property_id,units.id into property_id,unit_id from public.units join public.booking_requests b on b.unit_id=units.id where b.id=p_request_id;
  select * into p from public.properties where id=property_id for update;
  if p.id is null or p.owner_id<>actor or not private.owns_property(p.id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into u from public.units where id=unit_id for update;
  select * into r from public.booking_requests where id=p_request_id for update;
  if r.status='approved' then select id into result from public.unit_allocations where booking_request_id=r.id; return result; end if;
  if r.status<>'pending' then raise exception 'INVALID_STATE'; end if;
  if r.expires_at<=now() or r.start_date<(now() at time zone 'Asia/Manila')::date then raise exception 'REQUEST_EXPIRED'; end if;
  if p.status<>'published' or not u.active or r.renter_id=actor or not exists(select 1 from public.profiles where id=r.renter_id and account_status='active') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if r.offer_version<>u.offer_version then raise exception 'OFFER_CHANGED'; end if;
  begin
    insert into public.unit_allocations(unit_id,booking_request_id,kind,start_date,end_date,created_by)
      values(u.id,r.id,'booking',r.start_date,r.end_date,actor) returning id into result;
  exception when exclusion_violation then raise exception 'UNIT_UNAVAILABLE' using errcode='23P01'; end;
  update public.booking_requests set status='approved',decided_by=actor,decided_at=now() where id=r.id;
  perform private.audit('booking.approved','booking',r.id);
  return result;
end; $$;

create function public.decide_booking(p_request_id uuid,p_decision text,p_reason text default '') returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_account(); r public.booking_requests; owner_id uuid; property_id uuid; unit_id uuid;
begin
  select u.property_id,u.id into property_id,unit_id from public.units u join public.booking_requests b on b.unit_id=u.id where b.id=p_request_id;
  select p.owner_id into owner_id from public.properties p where p.id=property_id for update;
  perform 1 from public.units where id=unit_id for update;
  select * into r from public.booking_requests where id=p_request_id for update;
  if r.id is null or (actor<>r.renter_id and actor<>owner_id) or (actor=owner_id and not private.owns_property(property_id)) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_decision='withdrawn' and actor=r.renter_id and r.status='pending' then null;
  elsif p_decision='rejected' and actor=owner_id and r.status='pending' then null;
  elsif p_decision='cancelled' and r.status='approved' and r.start_date>(now() at time zone 'Asia/Manila')::date and length(trim(p_reason))>=3 then
    update public.unit_allocations set released_at=now() where booking_request_id=r.id;
  else raise exception 'INVALID_STATE'; end if;
  update public.booking_requests set status=p_decision,decided_by=actor,decided_at=now(),decision_reason=p_reason where id=r.id;
  perform private.audit('booking.'||p_decision,'booking',r.id);
end; $$;

create function public.create_manual_allocation(p_unit_id uuid,p_start_date date,p_end_date date,p_kind text,p_note text default '') returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_account(); result uuid; property_id uuid;
begin
  select units.property_id into property_id from public.units where id=p_unit_id;
  perform 1 from public.properties where id=property_id and owner_id=actor and private.owns_property(id) for update;
  if not found then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  perform 1 from public.units where id=p_unit_id for update;
  if p_kind not in ('manual_occupancy','blocked') or p_start_date is null or p_start_date<(now() at time zone 'Asia/Manila')::date then raise exception 'INVALID_DATES'; end if;
  insert into public.unit_allocations(unit_id,kind,start_date,end_date,created_by,note)
    values(p_unit_id,p_kind,p_start_date,p_end_date,actor,coalesce(p_note,'')) returning id into result;
  perform private.audit('allocation.created','allocation',result);
  return result;
end; $$;

create function public.end_allocation(p_allocation_id uuid,p_end_date date) returns void
language plpgsql security definer set search_path='' as $$
declare a public.unit_allocations; property_id uuid; unit_id uuid;
begin
  perform private.require_account();
  select u.property_id,u.id into property_id,unit_id from public.units u join public.unit_allocations x on x.unit_id=u.id where x.id=p_allocation_id;
  perform 1 from public.properties where id=property_id and owner_id=auth.uid() and private.owns_property(id) for update;
  if not found then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  perform 1 from public.units where id=unit_id for update;
  select * into a from public.unit_allocations where id=p_allocation_id for update;
  if a.released_at is not null or p_end_date is null or p_end_date<=a.start_date or p_end_date<(now() at time zone 'Asia/Manila')::date then raise exception 'INVALID_DATES'; end if;
  update public.unit_allocations set end_date=p_end_date where id=a.id;
  if a.booking_request_id is not null then update public.booking_requests set end_date=p_end_date where id=a.booking_request_id; end if;
  perform private.audit('allocation.ended','allocation',a.id);
end; $$;

create function private.check_booking_allocation() returns trigger
language plpgsql security definer set search_path='' as $$
declare booking_id uuid; b public.booking_requests;
begin
  if tg_table_name='booking_requests' then booking_id:=new.id; else booking_id:=new.booking_request_id; end if;
  if booking_id is null then return null; end if;
  select * into b from public.booking_requests where id=booking_id;
  if b.status='approved' then
    if not exists(select 1 from public.unit_allocations a where a.booking_request_id=b.id and a.unit_id=b.unit_id and a.released_at is null and a.start_date=b.start_date and a.end_date is not distinct from b.end_date) then raise exception 'INVALID_BOOKING_ALLOCATION' using errcode='23514'; end if;
  elsif exists(select 1 from public.unit_allocations a where a.booking_request_id=b.id and a.released_at is null) then
    raise exception 'INVALID_BOOKING_ALLOCATION' using errcode='23514';
  end if;
  return null;
end; $$;
create constraint trigger booking_allocation_consistency after insert or update on public.booking_requests deferrable initially deferred for each row execute function private.check_booking_allocation();
create constraint trigger allocation_booking_consistency after insert or update on public.unit_allocations deferrable initially deferred for each row execute function private.check_booking_allocation();

create function public.submit_viewing(p_property_id uuid,p_requested_at timestamptz,p_message text,p_consent boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_account(); result uuid;
begin
  if p_consent is distinct from true or p_requested_at is null or p_requested_at<=now() then raise exception 'INVALID_REQUEST'; end if;
  if not private.is_published(p_property_id) or exists(select 1 from public.properties where id=p_property_id and owner_id=actor) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  insert into public.viewing_requests(renter_id,property_id,requested_at,message,contact_consent_at,expires_at)
    values(actor,p_property_id,p_requested_at,coalesce(p_message,''),now(),least(p_requested_at,now()+interval '7 days')) returning id into result;
  perform private.audit('viewing.submitted','viewing',result); return result;
end; $$;
create function public.decide_viewing(p_request_id uuid,p_decision text,p_reason text default '') returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_account(); r public.viewing_requests; owner_id uuid;
begin
  select p.owner_id into owner_id from public.properties p join public.viewing_requests v on v.property_id=p.id where v.id=p_request_id for update of p;
  select * into r from public.viewing_requests where id=p_request_id for update;
  if r.id is null or (actor<>owner_id and actor<>r.renter_id) or (actor=owner_id and not private.owns_property(r.property_id)) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_decision in ('accepted','declined') and actor=owner_id and r.status='pending' and r.expires_at>now() and private.is_published(r.property_id) then null;
  elsif p_decision='withdrawn' and actor=r.renter_id and r.status='pending' then null;
  elsif p_decision='cancelled' and r.status='accepted' and r.requested_at>now() then null;
  elsif p_decision='completed' and actor=owner_id and r.status='accepted' and r.requested_at<=now() then null;
  else raise exception 'INVALID_STATE'; end if;
  update public.viewing_requests set status=p_decision,decided_by=actor,decided_at=now(),decision_reason=p_reason where id=r.id;
  perform private.audit('viewing.'||p_decision,'viewing',r.id);
end; $$;

create function public.get_property_contact(p_property_id uuid)
returns table(street_address text,contact_name text,contact_phone text,access_instructions text)
language plpgsql stable security definer set search_path='' as $$
begin
  perform private.require_account();
  if not private.owns_property(p_property_id) and not private.is_admin() and not (
    exists(select 1 from public.booking_requests b join public.units u on u.id=b.unit_id where u.property_id=p_property_id and b.renter_id=auth.uid() and b.status='approved' and (b.end_date is null or b.end_date>=(now() at time zone 'Asia/Manila')::date))
    or exists(select 1 from public.viewing_requests v where v.property_id=p_property_id and v.renter_id=auth.uid() and v.status='accepted' and v.requested_at>=now()-interval '1 day')
  ) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return query select d.street_address,d.contact_name,d.contact_phone,d.access_instructions from public.property_private_details d where d.property_id=p_property_id;
end; $$;
create function public.get_requester_contact(p_request_id uuid,p_kind text)
returns table(display_name text,phone text)
language plpgsql stable security definer set search_path='' as $$
declare requester uuid;
begin
  perform private.require_account();
  if p_kind='booking' then
    select b.renter_id into requester from public.booking_requests b where b.id=p_request_id
      and ((b.status='pending' and b.expires_at>now()) or (b.status='approved' and (b.end_date is null or b.end_date>=(now() at time zone 'Asia/Manila')::date)))
      and (private.owns_unit(b.unit_id) or private.is_admin());
  elsif p_kind='viewing' then
    select v.renter_id into requester from public.viewing_requests v where v.id=p_request_id
      and ((v.status='pending' and v.expires_at>now()) or (v.status='accepted' and v.requested_at>=now()-interval '1 day'))
      and (private.owns_property(v.property_id) or private.is_admin());
  end if;
  if requester is null then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return query select p.display_name,c.phone from public.profiles p join public.profile_contacts c on c.user_id=p.id where p.id=requester;
end; $$;
create function public.submit_report(p_property_id uuid,p_reason text,p_detail text default '') returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_account(); result uuid; begin
  if not private.is_published(p_property_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  insert into public.reports(reporter_id,property_id,reason,detail) values(actor,p_property_id,p_reason,p_detail) returning id into result;
  perform private.audit('report.submitted','report',result); return result;
end; $$;

-- Keep photo uploads closed until image decoding/EXIF stripping and review are implemented.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('property-photos','property-photos',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy puyohub_photos_closed on storage.objects as restrictive for all to anon,authenticated using (bucket_id <> 'property-photos') with check (bucket_id <> 'property-photos');

revoke execute on function private.check_booking_allocation() from public,anon,authenticated;
do $$ declare f regprocedure; begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=any(array['save_property_draft','save_unit','submit_property','moderate_property','browse_properties','submit_booking','approve_booking','decide_booking','create_manual_allocation','end_allocation','submit_viewing','decide_viewing','get_property_contact','get_requester_contact','submit_report']) loop
    execute format('revoke execute on function %s from public,anon,authenticated',f);
    execute format('grant execute on function %s to authenticated',f);
  end loop;
end $$;
grant execute on function public.browse_properties(integer,integer) to anon;
commit;

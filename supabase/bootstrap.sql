-- Fresh-project bootstrap only. Run once with the Supabase SQL Editor operator role.
begin;
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations(version text primary key,statements text[],name text);
revoke all on supabase_migrations.schema_migrations from public,anon,authenticated;
-- Source: 20261017000100_core.sql
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create extension if not exists btree_gist with schema extensions;
set local search_path = public, extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null check (length(display_name) between 1 and 80),
  account_status text not null default 'active' check (account_status in ('active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.profile_contacts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  phone text check (phone is null or length(phone) between 7 and 30)
);
create table public.account_roles (
  user_id uuid not null references public.profiles(id) on delete restrict,
  role text not null check (role in ('renter','owner','admin')),
  primary key (user_id, role)
);
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 100),
  title text not null check (length(title) between 3 and 120),
  description text not null default '' check (length(description) <= 5000),
  property_type text not null check (property_type in ('boarding_house','apartment_building','house')),
  barangay text not null check (length(barangay) between 1 and 80),
  city text not null default 'Cabadbaran' check (city = 'Cabadbaran'),
  province text not null default 'Agusan del Norte' check (province = 'Agusan del Norte'),
  public_latitude numeric(8,5) check (public_latitude between -90 and 90),
  public_longitude numeric(8,5) check (public_longitude between -180 and 180),
  status text not null default 'draft' check (status in ('draft','pending_review','published','paused','rejected','suspended','archived')),
  verified_at timestamptz,
  verified_by uuid references public.profiles(id),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or (verified_at is not null and verified_by is not null)),
  check ((public_latitude is null) = (public_longitude is null))
);
create table public.property_private_details (
  property_id uuid primary key references public.properties(id),
  street_address text not null check (length(street_address) between 3 and 500),
  precise_latitude numeric(10,7) check (precise_latitude between -90 and 90),
  precise_longitude numeric(10,7) check (precise_longitude between -180 and 180),
  contact_name text not null check (length(contact_name) between 1 and 80),
  contact_phone text not null check (length(contact_phone) between 7 and 30),
  access_instructions text not null default '' check (length(access_instructions) <= 1000),
  check ((precise_latitude is null) = (precise_longitude is null))
);
create table public.amenities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null
);
create table public.property_amenities (
  property_id uuid not null references public.properties(id),
  amenity_id uuid not null references public.amenities(id),
  primary key (property_id, amenity_id)
);
create table public.units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id),
  label text not null check (length(label) between 1 and 80),
  room_label text check (length(room_label) <= 80),
  unit_type text not null check (unit_type in ('bedspace','private_room','entire_apartment')),
  monthly_rent numeric(12,2) not null check (monthly_rent > 0),
  deposit_amount numeric(12,2) not null default 0 check (deposit_amount >= 0),
  terms text not null default '' check (length(terms) <= 3000),
  offer_version integer not null default 1 check (offer_version > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, label),
  unique (id, property_id)
);
create table public.property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id),
  unit_id uuid,
  storage_path text not null unique,
  alt_text text not null check (length(alt_text) between 1 and 250),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_cover boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  foreign key (unit_id, property_id) references public.units(id, property_id)
);
create unique index property_one_cover on public.property_photos(property_id) where is_cover;
create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id),
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);
create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  renter_id uuid not null references public.profiles(id),
  unit_id uuid not null references public.units(id),
  start_date date not null,
  end_date date,
  status text not null default 'pending' check (status in ('pending','approved','rejected','withdrawn','cancelled')),
  message text not null default '' check (length(message) <= 2000),
  contact_consent_at timestamptz not null,
  offered_monthly_rent numeric(12,2) not null check (offered_monthly_rent > 0),
  offered_deposit_amount numeric(12,2) not null check (offered_deposit_amount >= 0),
  offered_terms text not null,
  offer_version integer not null,
  expires_at timestamptz not null,
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  decision_reason text check (length(decision_reason) <= 1000),
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  unique (renter_id, idempotency_key),
  unique (id, unit_id),
  check (end_date is null or end_date > start_date)
);
create unique index one_pending_unit_request on public.booking_requests(renter_id,unit_id) where status = 'pending';
create table public.unit_allocations (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id),
  booking_request_id uuid unique,
  kind text not null check (kind in ('booking','manual_occupancy','blocked')),
  start_date date not null,
  end_date date,
  period daterange generated always as (daterange(start_date,end_date,'[)')) stored,
  released_at timestamptz,
  created_by uuid not null references public.profiles(id),
  note text not null default '' check (length(note) <= 1000),
  created_at timestamptz not null default now(),
  foreign key (booking_request_id, unit_id) references public.booking_requests(id,unit_id),
  check ((kind = 'booking') = (booking_request_id is not null)),
  check (end_date is null or end_date > start_date),
  constraint unit_allocations_no_overlap exclude using gist (unit_id with =,period with &&) where (released_at is null)
);
create table public.viewing_requests (
  id uuid primary key default gen_random_uuid(),
  renter_id uuid not null references public.profiles(id),
  property_id uuid not null references public.properties(id),
  requested_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined','withdrawn','cancelled','completed')),
  message text not null default '' check (length(message) <= 2000),
  contact_consent_at timestamptz not null,
  expires_at timestamptz not null,
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  decision_reason text check (length(decision_reason) <= 1000),
  created_at timestamptz not null default now()
);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  property_id uuid not null references public.properties(id),
  reason text not null check (length(reason) between 3 and 100),
  detail text not null default '' check (length(detail) <= 2000),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index properties_owner on public.properties(owner_id,id);
create index properties_search on public.properties(status,city,barangay,id);
create index units_property on public.units(property_id,active,monthly_rent,id);
create index photos_property on public.property_photos(property_id,sort_order,id);
create index bookings_renter on public.booking_requests(renter_id,created_at desc,id);
create index bookings_unit on public.booking_requests(unit_id,status,created_at desc,id);
create index viewings_property on public.viewing_requests(property_id,status,requested_at);
create index viewings_renter on public.viewing_requests(renter_id,created_at desc,id);
create index favorites_property on public.favorites(property_id);
create index reports_reporter on public.reports(reporter_id);
create index reports_property on public.reports(property_id);

create function private.is_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and account_status = 'active');
$$;
create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_active() and coalesce(auth.jwt()->>'aal','') = 'aal2'
    and exists(select 1 from public.account_roles where user_id = auth.uid() and role = 'admin');
$$;
create function private.owns_property(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_active() and exists(select 1 from public.account_roles where user_id=auth.uid() and role='owner')
    and exists(select 1 from public.properties where id=p_id and owner_id=auth.uid());
$$;
create function private.owns_unit(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.units u where u.id=p_id and private.owns_property(u.property_id));
$$;
create function private.require_account() returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.is_active() or not exists (
    select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null
  ) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return auth.uid();
end;
$$;
create function private.audit(p_action text,p_type text,p_id uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_events(actor_id,action,entity_type,entity_id) values(auth.uid(),p_action,p_type,p_id);
$$;
create function private.on_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,display_name) values(new.id,
    coalesce(nullif(left(trim(new.raw_user_meta_data->>'display_name'),80),''),'PuyoHub member'));
  insert into public.account_roles(user_id,role) values(new.id,'renter');
  insert into public.profile_contacts(user_id) values(new.id);
  return new;
end;
$$;
create trigger puyohub_signup after insert on auth.users for each row execute function private.on_signup();
-- Support accounts registered before this migration, without trusting role metadata.
insert into public.profiles(id,display_name) select id,coalesce(nullif(left(trim(raw_user_meta_data->>'display_name'),80),''),'PuyoHub member') from auth.users on conflict do nothing;
insert into public.account_roles(user_id,role) select id,'renter' from public.profiles on conflict do nothing;
insert into public.profile_contacts(user_id) select id from public.profiles on conflict do nothing;

do $$ declare t text; begin
  foreach t in array array['profiles','profile_contacts','account_roles','properties','property_private_details','amenities','property_amenities','units','property_photos','favorites','booking_requests','unit_allocations','viewing_requests','reports','audit_events'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
  end loop;
end $$;

grant select on public.profiles,public.profile_contacts,public.account_roles,public.properties,public.property_private_details,public.units,public.property_amenities,public.property_photos,public.favorites,public.booking_requests,public.unit_allocations,public.viewing_requests,public.reports,public.audit_events to authenticated;
grant select on public.amenities to anon,authenticated;
grant insert,delete on public.favorites to authenticated;

create policy profiles_read on public.profiles for select to authenticated using (id=auth.uid() or private.is_admin());
create policy contacts_read on public.profile_contacts for select to authenticated using (user_id=auth.uid() or private.is_admin());
create policy roles_read on public.account_roles for select to authenticated using (user_id=auth.uid() or private.is_admin());
create policy properties_read on public.properties for select to authenticated using (private.owns_property(id) or private.is_admin());
create policy private_details_read on public.property_private_details for select to authenticated using (private.owns_property(property_id) or private.is_admin());
create policy units_read on public.units for select to authenticated using (private.owns_property(property_id) or private.is_admin());
create policy amenities_public on public.amenities for select to anon,authenticated using (true);
create policy property_amenities_read on public.property_amenities for select to authenticated using (private.owns_property(property_id) or private.is_admin());
create policy photos_read on public.property_photos for select to authenticated using (private.owns_property(property_id) or private.is_admin());
create policy favorites_read on public.favorites for select to authenticated using (user_id=auth.uid());
-- A definer helper is needed because public base rows are intentionally private.
create function private.is_published(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.properties p join public.profiles o on o.id=p.owner_id where p.id=p_id and p.status='published' and o.account_status='active');
$$;
create policy favorites_add on public.favorites for insert to authenticated with check (user_id=auth.uid() and private.is_active() and private.is_published(property_id));
create policy favorites_remove on public.favorites for delete to authenticated using (user_id=auth.uid() and private.is_active());
create policy bookings_read on public.booking_requests for select to authenticated using (renter_id=auth.uid() or private.owns_unit(unit_id) or private.is_admin());
create policy allocations_read on public.unit_allocations for select to authenticated using (private.owns_unit(unit_id) or private.is_admin());
create policy viewings_read on public.viewing_requests for select to authenticated using (renter_id=auth.uid() or private.owns_property(property_id) or private.is_admin());
create policy reports_read on public.reports for select to authenticated using (reporter_id=auth.uid() or private.is_admin());
create policy audit_read on public.audit_events for select to authenticated using (private.is_admin());

-- Account writes never expose account_status or admin assignment to callers.
create function public.update_my_profile(p_display_name text,p_phone text default null) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_account(); begin
  update public.profiles set display_name=trim(p_display_name),updated_at=now() where id=actor;
  update public.profile_contacts set phone=nullif(trim(p_phone),'') where user_id=actor;
end; $$;
create function public.activate_owner() returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_account(); begin
  insert into public.account_roles(user_id,role) values(actor,'owner') on conflict do nothing;
  perform private.audit('owner.activated','profile',actor);
end; $$;
create function public.suspend_account(p_user_id uuid,p_suspended boolean,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform private.require_account();
  if not private.is_admin() or p_user_id=auth.uid() or length(trim(p_reason)) not between 3 and 1000 then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  update public.profiles set account_status=case when p_suspended then 'suspended' else 'active' end,updated_at=now() where id=p_user_id;
  perform private.audit(case when p_suspended then 'account.suspended' else 'account.restored' end,'profile',p_user_id);
end; $$;

-- Privilege defaults must not accidentally expose future functions.
revoke execute on all functions in schema private from public,anon,authenticated;
grant execute on function private.is_active(),private.is_admin(),private.owns_property(uuid),private.owns_unit(uuid),private.is_published(uuid) to authenticated;
revoke execute on function public.update_my_profile(text,text),public.activate_owner(),public.suspend_account(uuid,boolean,text) from public,anon;
grant execute on function public.update_my_profile(text,text),public.activate_owner(),public.suspend_account(uuid,boolean,text) to authenticated;
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema private revoke execute on functions from public;
insert into supabase_migrations.schema_migrations(version,name) values('20261017000100','core');

-- Source: 20261017000200_workflows.sql
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
insert into supabase_migrations.schema_migrations(version,name) values('20261017000200','workflows');

-- Source: 20261017000300_public_reads.sql
create function public.get_public_units(p_slug text)
returns table(id uuid,label text,unit_type text,monthly_rent numeric,deposit_amount numeric,terms text,offer_version integer)
language sql stable security definer set search_path='' as $$
  select u.id,u.label,u.unit_type,u.monthly_rent,u.deposit_amount,u.terms,u.offer_version
  from public.units u join public.properties p on p.id=u.property_id join public.profiles o on o.id=p.owner_id
  where p.slug=p_slug and p.status='published' and o.account_status='active' and u.active order by u.label,u.id limit 100;
$$;
create function public.unit_is_available(p_unit_id uuid,p_start_date date,p_end_date date default null) returns boolean
language sql stable security definer set search_path='' as $$
  select coalesce(p_start_date is not null and p_start_date>=(now() at time zone 'Asia/Manila')::date
    and (p_end_date is null or p_end_date>p_start_date)
    and exists(select 1 from public.units u where u.id=p_unit_id and u.active and private.is_published(u.property_id))
    and not exists(select 1 from public.unit_allocations a where a.unit_id=p_unit_id and a.released_at is null
      and a.period && daterange(p_start_date,case when p_end_date>p_start_date then p_end_date else null end,'[)')),false);
$$;
create function public.release_future_block(p_allocation_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare property_id uuid; unit_id uuid; a public.unit_allocations;
begin
  perform private.require_account();
  select u.property_id,u.id into property_id,unit_id from public.units u join public.unit_allocations x on x.unit_id=u.id where x.id=p_allocation_id;
  perform 1 from public.properties where id=property_id and owner_id=auth.uid() and private.owns_property(id) for update;
  if not found then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  perform 1 from public.units where id=unit_id for update;
  select * into a from public.unit_allocations where id=p_allocation_id for update;
  if a.kind<>'blocked' or a.start_date<=(now() at time zone 'Asia/Manila')::date or a.released_at is not null then raise exception 'INVALID_STATE'; end if;
  update public.unit_allocations set released_at=now() where id=a.id;
  perform private.audit('allocation.released','allocation',a.id);
end; $$;
create function public.resolve_report(p_report_id uuid,p_status text) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform private.require_account();
  if not private.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_status not in ('resolved','dismissed') then raise exception 'INVALID_STATE'; end if;
  update public.reports set status=p_status,resolved_by=auth.uid(),resolved_at=now() where id=p_report_id and status='open';
  if not found then raise exception 'INVALID_STATE'; end if;
  perform private.audit('report.'||p_status,'report',p_report_id);
end; $$;
revoke execute on function public.get_public_units(text),public.unit_is_available(uuid,date,date),public.release_future_block(uuid),public.resolve_report(uuid,text) from public,anon,authenticated;
grant execute on function public.get_public_units(text),public.unit_is_available(uuid,date,date) to anon,authenticated;
grant execute on function public.release_future_block(uuid),public.resolve_report(uuid,text) to authenticated;
do $$ begin
  if exists(select 1 from storage.buckets b where b.id='property-photos' and b.public) then
    raise exception 'PROPERTY_PHOTO_BUCKET_MUST_BE_PRIVATE';
  end if;
end $$;
insert into supabase_migrations.schema_migrations(version,name) values('20261017000300','public_reads');

-- Source: 20261017000400_listing_workspaces.sql
-- Public discovery filters eligible units before calculating the advertised price.
create function public.search_listings(
  p_query text default '', p_barangay text default '', p_unit_type text default '',
  p_min numeric default null, p_max numeric default null, p_sort text default 'featured',
  p_offset integer default 0, p_limit integer default 24
) returns table(id uuid,slug text,title text,description text,property_type text,barangay text,city text,monthly_rent numeric)
language sql stable security definer set search_path='' as $$
  select p.id,p.slug,p.title,p.description,p.property_type,p.barangay,p.city,offer.price
  from public.properties p
  join public.profiles o on o.id=p.owner_id and o.account_status='active'
  join lateral (
    select min(u.monthly_rent) as price from public.units u
    where u.property_id=p.id and u.active
      and (coalesce(p_unit_type,'')='' or u.unit_type=p_unit_type)
      and (p_min is null or u.monthly_rent>=p_min)
      and (p_max is null or u.monthly_rent<=p_max)
  ) offer on offer.price is not null
  where p.status='published'
    and (coalesce(p_barangay,'')='' or p.barangay=p_barangay)
    and (coalesce(trim(p_query),'')='' or position(lower(left(trim(p_query),100)) in lower(p.title||' '||p.description||' '||p.barangay))>0)
  order by
    case when p_sort='price-asc' then offer.price end asc,
    case when p_sort='price-desc' then offer.price end desc,
    case when p_sort='name' then p.title end asc,
    p.created_at desc,p.id
  limit greatest(1,least(coalesce(p_limit,24),25))
  offset greatest(0,least(coalesce(p_offset,0),10000));
$$;

create function public.get_public_listing(p_slug text)
returns table(id uuid,slug text,title text,description text,property_type text,barangay text,city text,monthly_rent numeric)
language sql stable security definer set search_path='' as $$
  select p.id,p.slug,p.title,p.description,p.property_type,p.barangay,p.city,min(u.monthly_rent)
  from public.properties p
  join public.profiles o on o.id=p.owner_id and o.account_status='active'
  join public.units u on u.property_id=p.id and u.active
  where p.slug=p_slug and p.status='published'
  group by p.id;
$$;

-- Lock and compare the reviewed version to reject stale browser tabs.
create function public.review_listing(p_property_id uuid,p_expected_version integer,p_decision text,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare current_version integer;
begin
  perform private.require_account();
  if not private.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_reason is null or length(trim(p_reason)) not between 3 and 1000
    or p_decision is null or p_decision not in ('published','rejected','suspended') then
    raise exception 'INVALID_REVIEW';
  end if;
  select version into current_version from public.properties where id=p_property_id for update;
  if not found or p_expected_version is distinct from current_version then raise exception 'STALE_REVIEW'; end if;
  perform public.moderate_property(p_property_id,p_decision,trim(p_reason));
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'property.reviewed','property',p_property_id,
      jsonb_build_object('decision',p_decision,'reason',trim(p_reason),'version',current_version));
end;
$$;
revoke execute on function public.search_listings(text,text,text,numeric,numeric,text,integer,integer), public.get_public_listing(text), public.review_listing(uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.search_listings(text,text,text,numeric,numeric,text,integer,integer), public.get_public_listing(text) to anon,authenticated;
grant execute on function public.review_listing(uuid,integer,text,text) to authenticated;
create function public.get_my_listing_reviews(p_property_id uuid)
returns table(decision text,reason text,occurred_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  perform private.require_account();
  if not private.owns_property(p_property_id) and not private.is_admin() then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  return query select a.metadata->>'decision',a.metadata->>'reason',a.occurred_at
    from public.audit_events a where a.entity_id=p_property_id and a.entity_type='property'
      and a.action='property.reviewed' order by a.occurred_at desc,a.id desc limit 10;
end;
$$;
revoke execute on function public.get_my_listing_reviews(uuid) from public,anon,authenticated;
grant execute on function public.get_my_listing_reviews(uuid) to authenticated;
insert into supabase_migrations.schema_migrations(version,name) values('20261017000400','listing_workspaces');

-- Source: 20261017000500_secure_photos.sql
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
insert into supabase_migrations.schema_migrations(version,name) values('20261017000500','secure_photos');
commit;

begin;
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
commit;

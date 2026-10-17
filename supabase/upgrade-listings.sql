-- Existing PuyoHub projects with migrations 001–003 already applied. Run once.
begin;
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
commit;

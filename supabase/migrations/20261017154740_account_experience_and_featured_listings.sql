begin;
create table public.listing_promotions (
  property_id uuid primary key references public.properties(id),
  priority integer not null check (priority between 1 and 100),
  expires_at timestamptz not null,
  updated_by uuid not null references public.profiles(id),
  reason text not null check (length(trim(reason)) between 3 and 500),
  updated_at timestamptz not null default now()
);
alter table public.listing_promotions enable row level security;
revoke all on public.listing_promotions from public,anon,authenticated;
grant select on public.listing_promotions to authenticated;
create policy promotion_admin_read on public.listing_promotions for select to authenticated using (private.is_admin());

-- Promotion administration is intentionally independent from owner-editable listing fields.
create function public.set_listing_promotion(p_property_id uuid,p_priority integer,p_expires_at timestamptz,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_account();
begin
  if not private.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_priority is null or p_priority not between 0 and 100 or p_reason is null or length(trim(p_reason)) not between 3 and 500 then raise exception 'INVALID_PROMOTION'; end if;
  perform 1 from public.properties where id=p_property_id for update;
  if not found then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_priority=0 then
    delete from public.listing_promotions where property_id=p_property_id;
    perform private.audit('promotion.removed','property',p_property_id);
    return;
  end if;
  if not private.is_published(p_property_id) or p_expires_at is null or p_expires_at<=now() or p_expires_at>now()+interval '366 days' then raise exception 'INVALID_PROMOTION'; end if;
  insert into public.listing_promotions(property_id,priority,expires_at,updated_by,reason)
  values(p_property_id,p_priority,p_expires_at,actor,trim(p_reason))
  on conflict(property_id) do update set priority=excluded.priority,expires_at=excluded.expires_at,updated_by=actor,reason=excluded.reason,updated_at=now();
  perform private.audit('promotion.updated','property',p_property_id);
end; $$;
revoke all on function public.set_listing_promotion(uuid,integer,timestamptz,text) from public,anon,authenticated;
grant execute on function public.set_listing_promotion(uuid,integer,timestamptz,text) to authenticated;

create function public.get_featured_listings(p_property_ids uuid[])
returns table(property_id uuid)
language sql stable security definer set search_path='' as $$
  select lp.property_id from public.listing_promotions lp
  where lp.property_id=any(p_property_ids[1:50]) and lp.expires_at>now()
    and private.is_published(lp.property_id)
    and exists(select 1 from public.units u where u.property_id=lp.property_id and u.active);
$$;
revoke all on function public.get_featured_listings(uuid[]) from public,anon,authenticated;
grant execute on function public.get_featured_listings(uuid[]) to anon,authenticated;

create or replace function public.search_listings(
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
  left join public.listing_promotions lp on lp.property_id=p.id and lp.expires_at>now()
  where p.status='published'
    and (coalesce(p_barangay,'')='' or p.barangay=p_barangay)
    and (coalesce(trim(p_query),'')='' or position(lower(left(trim(p_query),100)) in lower(p.title||' '||p.description||' '||p.barangay))>0)
  order by
    case when p_sort='featured' or coalesce(p_sort,'')='' then coalesce(lp.priority,0) end desc,
    case when p_sort='price-asc' then offer.price end asc,
    case when p_sort='price-desc' then offer.price end desc,
    case when p_sort='name' then p.title end asc,
    p.created_at desc,p.id
  limit greatest(1,least(coalesce(p_limit,24),25))
  offset greatest(0,least(coalesce(p_offset,0),10000));
$$;
revoke all on function public.search_listings(text,text,text,numeric,numeric,text,integer,integer) from public,anon,authenticated;
grant execute on function public.search_listings(text,text,text,numeric,numeric,text,integer,integer) to anon,authenticated;
commit;

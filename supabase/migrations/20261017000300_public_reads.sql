begin;
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
commit;

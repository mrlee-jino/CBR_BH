begin;
-- Base property/unit rows remain private. This projection discloses only listing
-- labels to request participants, including when a listing is no longer public.
-- SECURITY DEFINER is necessary to read those labels without broadening base RLS.
create function public.get_request_context(p_booking_ids uuid[], p_viewing_ids uuid[])
returns table(request_id uuid,kind text,property_id uuid,title text,slug text,unit_label text,owner_id uuid)
language sql stable security definer set search_path='' as $$
  select b.id,'booking'::text,p.id,p.title,p.slug,u.label,p.owner_id
  from public.booking_requests b join public.units u on u.id=b.unit_id join public.properties p on p.id=u.property_id
  where b.id=any(p_booking_ids[1:50]) and auth.uid() is not null
    and (b.renter_id=auth.uid() or private.owns_property(p.id))
  union all
  select v.id,'viewing'::text,p.id,p.title,p.slug,null::text,p.owner_id
  from public.viewing_requests v join public.properties p on p.id=v.property_id
  where v.id=any(p_viewing_ids[1:50]) and auth.uid() is not null
    and (v.renter_id=auth.uid() or private.owns_property(p.id));
$$;
revoke all on function public.get_request_context(uuid[],uuid[]) from public,anon,authenticated;
grant execute on function public.get_request_context(uuid[],uuid[]) to authenticated;
commit;

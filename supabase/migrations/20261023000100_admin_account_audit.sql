-- Index the default administrative list order and report queue.
create index admin_profiles_recent on public.profiles(created_at desc,id);
create index admin_reports_status_recent on public.reports(status,created_at desc,id);

-- Preserve the required reason when an administrator changes account access.
create or replace function public.suspend_account(p_user_id uuid,p_suspended boolean,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform private.require_account();
  if not private.is_admin() or p_user_id=auth.uid() or p_suspended is null
    or p_reason is null or length(trim(p_reason)) not between 3 and 1000
    then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  update public.profiles set account_status=case when p_suspended then 'suspended' else 'active' end,updated_at=now() where id=p_user_id
    and account_status <> case when p_suspended then 'suspended' else 'active' end;
  if not found then raise exception 'INVALID_STATE' using errcode='P0001'; end if;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),case when p_suspended then 'account.suspended' else 'account.restored' end,'profile',p_user_id,jsonb_build_object('reason',trim(p_reason)));
end;
$$;
revoke execute on function public.suspend_account(uuid,boolean,text) from public,anon;
grant execute on function public.suspend_account(uuid,boolean,text) to authenticated;

-- New UI uses this entry point so an older database cannot silently discard reasons.
create function public.admin_set_account_status(p_user_id uuid,p_suspended boolean,p_reason text) returns void
language plpgsql security invoker set search_path='' as $$
begin
  perform public.suspend_account(p_user_id,p_suspended,p_reason);
end;
$$;
revoke execute on function public.admin_set_account_status(uuid,boolean,text) from public,anon;
grant execute on function public.admin_set_account_status(uuid,boolean,text) to authenticated;

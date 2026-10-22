-- Existing Cabahay projects: run once to remove the admin authenticator requirement.
begin;
-- Source: 20261023000300_admin_password_access.sql
-- Administration requires an active account and a database-assigned role.
-- Authenticator assurance is no longer an additional administrator requirement.
create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path='' as $$
  select private.is_active()
    and exists(select 1 from public.account_roles where user_id=auth.uid() and role='admin');
$$;
revoke execute on function private.is_admin() from public,anon;
grant execute on function private.is_admin() to authenticated;

insert into supabase_migrations.schema_migrations(version,name) values('20261023000300','admin_password_access');
commit;

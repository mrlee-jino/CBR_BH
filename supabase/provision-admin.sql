-- Operator-only: replace the email below, then run in Supabase SQL Editor.
-- This does not create an Auth account or store a password. Register and verify first.
begin;
do $$
declare target uuid;
begin
  select id into target from auth.users
  where lower(email)=lower('REPLACE_WITH_YOUR_VERIFIED_EMAIL') and email_confirmed_at is not null;
  if target is null then raise exception 'No verified account matches this email. Register and confirm your email first.'; end if;
  insert into public.account_roles(user_id,role) values(target,'admin') on conflict do nothing;
end $$;
commit;

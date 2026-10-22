-- Google supplies full_name; email signup supplies display_name.
-- Profile text never grants capabilities. Every signup still starts as a renter.
create or replace function private.on_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,display_name) values(new.id,
    coalesce(
      nullif(left(trim(new.raw_user_meta_data->>'display_name'),80),''),
      nullif(left(trim(new.raw_user_meta_data->>'full_name'),80),''),
      'Cabahay member'
    ));
  insert into public.account_roles(user_id,role) values(new.id,'renter');
  insert into public.profile_contacts(user_id) values(new.id);
  return new;
end;
$$;

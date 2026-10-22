-- Existing Cabahay projects: run once before enabling renter reports.
begin;
-- Source: 20261023000200_listing_reports.sql
-- One open report per actor/listing for new submissions; retain existing report history.
create index reports_reporter_recent on public.reports(reporter_id,created_at desc);
create function public.submit_listing_report(p_property_id uuid,p_reason text,p_detail text default '') returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_account(); result uuid;
begin
  if not private.is_published(p_property_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_reason is null or length(trim(p_reason)) not between 3 and 100 or length(coalesce(p_detail,''))>2000
    then raise exception 'INVALID_REPORT' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('report:'||actor::text,0));
  if exists(select 1 from public.reports where reporter_id=actor and property_id=p_property_id and status='open')
    then raise exception 'REPORT_ALREADY_OPEN' using errcode='P0001'; end if;
  if (select count(*) from public.reports where reporter_id=actor and created_at>now()-interval '24 hours')>=5
    then raise exception 'REPORT_RATE_LIMIT' using errcode='P0001'; end if;
  insert into public.reports(reporter_id,property_id,reason,detail) values(actor,p_property_id,trim(p_reason),trim(coalesce(p_detail,''))) returning id into result;
  perform private.audit('report.submitted','report',result);
  return result;
end;
$$;
-- Keep the original API under the same protections.
create or replace function public.submit_report(p_property_id uuid,p_reason text,p_detail text default '') returns uuid
language sql security invoker set search_path='' as $$
  select public.submit_listing_report(p_property_id,p_reason,p_detail);
$$;
revoke execute on function public.submit_listing_report(uuid,text,text),public.submit_report(uuid,text,text) from public,anon;
grant execute on function public.submit_listing_report(uuid,text,text),public.submit_report(uuid,text,text) to authenticated;

insert into supabase_migrations.schema_migrations(version,name) values('20261023000200','listing_reports');
commit;

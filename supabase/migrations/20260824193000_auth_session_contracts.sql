-- Minimal Auth/session contract for browser clients and the platform-admin API.
-- The browser receives only caller-scoped metadata. Platform-superadmin state is
-- exposed as a boolean and never grants access to organization-owned rows.

create function private.current_session_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_is_platform_superadmin boolean;
  v_organization jsonb;
  v_membership jsonb;
begin
  if v_user_id is null then
    raise exception using
      errcode = '28000',
      message = 'an authenticated user is required';
  end if;

  v_is_platform_superadmin := (select private.is_platform_superadmin());

  select
    jsonb_build_object(
      'id', organization.id,
      'slug', organization.slug,
      'name', organization.name,
      'kind', organization.kind,
      'status', organization.status
    ),
    jsonb_build_object(
      'id', membership.id,
      'role', membership.role,
      'status', membership.status,
      'display_name', profile.display_name
    )
  into v_organization, v_membership
  from public.organization_memberships membership
  join public.organizations organization
    on organization.id = membership.organization_id
  join public.user_profiles profile
    on profile.organization_id = membership.organization_id
   and profile.user_id = membership.user_id
  where membership.user_id = v_user_id
    and membership.status = 'active'
    and organization.status = 'active'
  limit 1;

  return jsonb_build_object(
    'user_id', v_user_id,
    'is_platform_superadmin', v_is_platform_superadmin,
    'organization', v_organization,
    'membership', v_membership
  );
end;
$$;

create function public.current_session_context()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  return private.current_session_context();
end;
$$;

create function public.is_platform_superadmin()
returns boolean
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  return private.is_platform_superadmin();
end;
$$;

revoke all on function private.current_session_context()
  from public, anon, authenticated;
revoke all on function public.current_session_context()
  from public, anon, authenticated;
revoke all on function public.is_platform_superadmin()
  from public, anon, authenticated;

-- The public functions are thin caller-scoped wrappers. Their private
-- implementations remain outside the exposed Data API schemas.
grant execute on function private.current_session_context()
  to authenticated;
grant execute on function private.is_platform_superadmin()
  to authenticated;
grant execute on function public.current_session_context()
  to authenticated;
grant execute on function public.is_platform_superadmin()
  to authenticated;

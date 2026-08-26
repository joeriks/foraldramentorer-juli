-- Supabase installs this event-trigger function to enable RLS automatically on
-- newly created public tables. The event trigger itself does not require API
-- clients to hold EXECUTE on its SECURITY DEFINER function.

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

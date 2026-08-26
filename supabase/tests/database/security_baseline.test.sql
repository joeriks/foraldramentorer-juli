create extension if not exists pgtap with schema extensions;

begin;

select extensions.plan(2);

select extensions.ok(
  case
    when to_regprocedure('public.rls_auto_enable()') is null then true
    else not has_function_privilege('anon', to_regprocedure('public.rls_auto_enable()'), 'EXECUTE')
  end,
  'anonymous clients cannot execute the automatic RLS event-trigger function'
);

select extensions.ok(
  case
    when to_regprocedure('public.rls_auto_enable()') is null then true
    else not has_function_privilege('authenticated', to_regprocedure('public.rls_auto_enable()'), 'EXECUTE')
  end,
  'authenticated clients cannot execute the automatic RLS event-trigger function'
);

select * from extensions.finish();

rollback;

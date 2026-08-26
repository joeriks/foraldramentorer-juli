-- The deferred current-version constraint can run after the provisioning
-- security-definer function has returned. It must not inherit the caller's
-- tenant-scoped RLS visibility, because platform superadministrators
-- deliberately have no organization membership.

alter function private.ensure_current_activity_definition_version_is_published()
  security definer;

revoke all on function private.ensure_current_activity_definition_version_is_published()
  from public, anon, authenticated;

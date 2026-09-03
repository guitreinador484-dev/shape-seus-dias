GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_admin(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION app_private.is_admin(uuid) FROM anon;
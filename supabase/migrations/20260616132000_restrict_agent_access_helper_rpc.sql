-- Keep team access helper functions unavailable to anonymous RPC calls.

REVOKE ALL ON FUNCTION public.has_any_role(uuid, uuid, public.app_role[]) FROM anon;
REVOKE ALL ON FUNCTION public.is_business_operator(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_team_member_user(uuid, uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_call_assigned_to_user(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.can_access_call(uuid, uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.can_access_sms_thread(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.can_access_notification(uuid, uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.enforce_agent_call_update_scope() FROM anon;

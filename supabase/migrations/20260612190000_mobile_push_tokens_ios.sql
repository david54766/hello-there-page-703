-- Allow iOS devices to register for native mobile push notifications.

ALTER TABLE public.mobile_push_tokens
  DROP CONSTRAINT IF EXISTS mobile_push_tokens_platform_check;

ALTER TABLE public.mobile_push_tokens
  ADD CONSTRAINT mobile_push_tokens_platform_check
  CHECK (platform IN ('android', 'ios'));

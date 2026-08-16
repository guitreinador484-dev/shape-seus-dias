REVOKE ALL ON FUNCTION public.sync_access_from_purchases() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_student_plan_exercise_edits() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS order_bump_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS unlock_nutrition boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unlock_videos boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_nutrition_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_video_access boolean NOT NULL DEFAULT false;

UPDATE public.purchases
SET unlock_nutrition = true,
    unlock_videos = true
WHERE order_bump = true;

UPDATE public.profiles
SET has_nutrition_access = true,
    has_video_access = true
WHERE has_order_bump = true;

CREATE TABLE public.nutrition_pdfs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Guia de alimentação',
  file_path text NOT NULL,
  file_name text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_pdfs TO authenticated;
GRANT ALL ON public.nutrition_pdfs TO service_role;

ALTER TABLE public.nutrition_pdfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage nutrition PDFs"
ON public.nutrition_pdfs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Eligible students view active nutrition PDF"
ON public.nutrition_pdfs
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND p.has_class_access = true
      AND (p.access_expires_at IS NULL OR p.access_expires_at > now())
      AND (p.has_nutrition_access = true OR p.has_order_bump = true)
  )
);

CREATE TRIGGER trg_nutrition_pdfs_updated
BEFORE UPDATE ON public.nutrition_pdfs
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "Admins manage nutrition PDF files"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'nutrition-pdfs'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  bucket_id = 'nutrition-pdfs'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Eligible students view nutrition PDF files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'nutrition-pdfs'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND p.has_class_access = true
      AND (p.access_expires_at IS NULL OR p.access_expires_at > now())
      AND (p.has_nutrition_access = true OR p.has_order_bump = true)
  )
);
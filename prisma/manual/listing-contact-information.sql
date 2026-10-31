-- Additive correction only; do not replay the historical migration baseline.
BEGIN;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS contact_phone varchar(30);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS contact_email varchar(254);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS contact_line varchar(100);
COMMIT;

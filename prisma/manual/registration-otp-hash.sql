BEGIN;
ALTER TABLE public.otp_verifications ALTER COLUMN otp_code TYPE varchar(64);
COMMIT;

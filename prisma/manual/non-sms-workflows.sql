-- Additive workflow support. Does not replay historical migrations or remove rows.
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM user_roles GROUP BY user_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Resolve accounts with multiple roles before applying this script';
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_single_role ON user_roles(user_id);
ALTER TABLE listings DROP CONSTRAINT chk_listings_status;
ALTER TABLE listings ADD CONSTRAINT chk_listings_status CHECK (status IN ('DRAFT','PENDING','APPROVED','REJECTED','REVISION_REQUIRED','SOLD','CLOSED','HIDDEN'));
ALTER TABLE listing_status_history DROP CONSTRAINT IF EXISTS chk_listing_status_history_from;
ALTER TABLE listing_status_history ADD CONSTRAINT chk_listing_status_history_from CHECK (from_status IS NULL OR from_status IN ('DRAFT','PENDING','APPROVED','REJECTED','REVISION_REQUIRED','SOLD','CLOSED','HIDDEN'));
ALTER TABLE listing_status_history DROP CONSTRAINT chk_listing_status_history_to;
ALTER TABLE listing_status_history ADD CONSTRAINT chk_listing_status_history_to CHECK (to_status IN ('DRAFT','PENDING','APPROVED','REJECTED','REVISION_REQUIRED','SOLD','CLOSED','HIDDEN'));
ALTER TABLE notifications DROP CONSTRAINT chk_notifications_type;
ALTER TABLE notifications ADD CONSTRAINT chk_notifications_type CHECK (type IN ('listing_approved','listing_rejected','listing_revision_required','new_inquiry','inquiry_reply','account_verified','listing_hidden'));
COMMIT;

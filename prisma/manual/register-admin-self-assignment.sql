BEGIN;
CREATE OR REPLACE FUNCTION public.fn_check_assign_admin()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE
    v_current_user_id UUID;
    v_target_role_code VARCHAR(50);
    v_is_owner BOOLEAN;
BEGIN
    v_current_user_id := NULLIF(current_setting('app.user_id', TRUE), '')::UUID;
    SELECT code INTO v_target_role_code FROM roles WHERE id = NEW.role_id;
    IF v_target_role_code = 'admin' THEN
        -- Explicit operator policy: allow Admin signup through the normal OTP flow.
        IF v_current_user_id = NEW.user_id
           AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = NEW.user_id)
           AND EXISTS (SELECT 1 FROM users WHERE id = NEW.user_id
                       AND status = 'pending_verification' AND phone_verified_at IS NULL AND deleted_at IS NULL)
           AND EXISTS (SELECT 1 FROM otp_verifications WHERE user_id = NEW.user_id
                       AND purpose = 'register' AND is_used = FALSE AND expires_at > NOW()) THEN
            RETURN NEW;
        END IF;
        IF v_current_user_id IS NULL THEN
            RAISE EXCEPTION 'AUTH_REQUIRED'
                USING HINT = 'Must be logged in to assign role', ERRCODE = 'P0004';
        END IF;
        SELECT EXISTS (
            SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = v_current_user_id AND r.code = 'owner'
        ) INTO v_is_owner;
        IF NOT v_is_owner THEN
            RAISE EXCEPTION 'OWNER_ASSIGN_ONLY'
                USING HINT = 'Only Owner can assign admin role to an existing account', ERRCODE = 'P0005';
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;
COMMIT;

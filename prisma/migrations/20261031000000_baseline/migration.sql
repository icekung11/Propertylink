--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: fn_auto_contact_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_auto_contact_history() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO contact_history (user_id, listing_id, contact_type)
    VALUES (NEW.buyer_id, NEW.listing_id, 'inquiry_sent');
    RETURN NEW;
END;
$$;


--
-- Name: fn_check_admin_self_approve(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_check_admin_self_approve() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_current_user_id UUID;
BEGIN
    v_current_user_id := NULLIF(current_setting('app.user_id', TRUE), '')::UUID;
    IF NEW.status = 'APPROVED' AND OLD.status <> 'APPROVED' THEN
        IF v_current_user_id IS NOT NULL AND v_current_user_id = NEW.seller_id THEN
            RAISE EXCEPTION 'ADMIN_SELF_APPROVE_FORBIDDEN'
                USING HINT = 'Admin cannot approve their own listing',
                      ERRCODE = 'P0001';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: fn_check_assign_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_check_assign_admin() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: fn_check_listing_image_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_check_listing_image_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_count INT;
    v_listing_id UUID;
    v_listing_status VARCHAR(30);
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_listing_id := OLD.listing_id;
    ELSE
        v_listing_id := NEW.listing_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        SELECT COUNT(*) INTO v_count FROM listing_images WHERE listing_id = v_listing_id;
        SELECT status INTO v_listing_status FROM listings WHERE id = v_listing_id;
        IF v_listing_status = 'APPROVED' AND v_count < 3 THEN
            RAISE EXCEPTION 'IMAGE_COUNT_TOO_FEW'
                USING HINT = format('Approved listing must have at least 3 images (currently %s)', v_count),
                      ERRCODE = 'P0002';
        END IF;
        RETURN OLD;
    ELSE
        SELECT COUNT(*) INTO v_count FROM listing_images WHERE listing_id = v_listing_id;
        IF v_count > 15 THEN
            RAISE EXCEPTION 'IMAGE_COUNT_TOO_MANY'
                USING HINT = format('Listing can have at most 15 images (currently %s)', v_count),
                      ERRCODE = 'P0003';
        END IF;
        SELECT status INTO v_listing_status FROM listings WHERE id = v_listing_id;
        IF v_listing_status = 'APPROVED' AND v_count < 3 THEN
            RAISE EXCEPTION 'IMAGE_COUNT_TOO_FEW'
                USING HINT = format('Approved listing must have at least 3 images (currently %s)', v_count),
                      ERRCODE = 'P0002';
        END IF;
        RETURN NEW;
    END IF;
END;
$$;


--
-- Name: fn_check_listing_rate_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_check_listing_rate_limit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_count INT;
    v_daily_limit INT := 10;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM listings
    WHERE seller_id = NEW.seller_id
      AND created_at > NOW() - INTERVAL '1 day';

    IF v_count >= v_daily_limit THEN
        RAISE EXCEPTION 'LISTING_RATE_LIMIT_EXCEEDED'
            USING HINT = format('Daily limit is %s listings (already %s)', v_daily_limit, v_count),
                  ERRCODE = 'P0008';
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: fn_check_listing_submit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_check_listing_submit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_count INT;
BEGIN
    IF NEW.status = 'PENDING' AND (OLD.status = 'DRAFT' OR OLD.status IS NULL) THEN
        SELECT COUNT(*) INTO v_count FROM listing_images WHERE listing_id = NEW.id;
        IF v_count < 3 THEN
            RAISE EXCEPTION 'IMAGE_COUNT_TOO_FEW'
                USING HINT = format('At least 3 images required before submission (currently %s)', v_count),
                      ERRCODE = 'P0002';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: fn_check_seller_verified(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_check_seller_verified() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_verified_at TIMESTAMPTZ;
    v_status      VARCHAR(30);
BEGIN
    SELECT phone_verified_at, status
    INTO v_verified_at, v_status
    FROM users WHERE id = NEW.seller_id;

    IF v_verified_at IS NULL THEN
        RAISE EXCEPTION 'SELLER_NOT_VERIFIED'
            USING HINT = 'Seller must verify phone via OTP before creating a listing',
                  ERRCODE = 'P0006';
    END IF;

    IF v_status <> 'active' THEN
        RAISE EXCEPTION 'SELLER_NOT_ACTIVE'
            USING HINT = format('Account status is %s, must be active', v_status),
                  ERRCODE = 'P0007';
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: fn_log_listing_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_log_listing_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := NULLIF(current_setting('app.user_id', TRUE), '')::UUID;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO listing_status_history (listing_id, from_status, to_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, v_user_id);
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: fn_notify_seller_on_inquiry(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_notify_seller_on_inquiry() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO notifications (user_id, type, title, body, payload)
    VALUES (
        NEW.seller_id,
        'new_inquiry',
        'New inquiry received',
        LEFT(NEW.message, 200),
        jsonb_build_object('inquiry_id', NEW.id, 'listing_id', NEW.listing_id)
    );
    RETURN NEW;
END;
$$;


--
-- Name: fn_update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    actor_user_id uuid,
    actor_user_email character varying(254),
    action character varying(100) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id character varying(100),
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id bigint NOT NULL,
    parent_id bigint,
    code character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    slug character varying(200) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: contact_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    listing_id uuid NOT NULL,
    contact_type character varying(30) NOT NULL,
    contact_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_contact_history_type CHECK (((contact_type)::text = ANY ((ARRAY['phone_reveal'::character varying, 'inquiry_sent'::character varying, 'favorite_added'::character varying])::text[])))
);


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorites (
    user_id uuid NOT NULL,
    listing_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: inquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inquiries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    buyer_id uuid NOT NULL,
    seller_id uuid NOT NULL,
    subject character varying(255),
    message text NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    read_at timestamp with time zone,
    replied_at timestamp with time zone,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_inquiries_status CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'READ'::character varying, 'REPLIED'::character varying, 'CLOSED'::character varying, 'SPAM'::character varying])::text[])))
);


--
-- Name: inquiry_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inquiry_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inquiry_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: listing_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listing_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    storage_key character varying(500) NOT NULL,
    image_url character varying(500) NOT NULL,
    phash_code character varying(16),
    is_cover boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_listing_images_sort_order CHECK ((sort_order >= 0))
);


--
-- Name: listing_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listing_status_history (
    id bigint NOT NULL,
    listing_id uuid NOT NULL,
    from_status character varying(30),
    to_status character varying(30) NOT NULL,
    changed_by uuid,
    reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_listing_status_history_from CHECK (((from_status IS NULL) OR ((from_status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'REVISION_REQUIRED'::character varying, 'SOLD'::character varying, 'CLOSED'::character varying, 'HIDDEN'::character varying])::text[])))),
    CONSTRAINT chk_listing_status_history_to CHECK (((to_status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'REVISION_REQUIRED'::character varying, 'SOLD'::character varying, 'CLOSED'::character varying, 'HIDDEN'::character varying])::text[])))
);


--
-- Name: listing_status_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.listing_status_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: listing_status_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.listing_status_history_id_seq OWNED BY public.listing_status_history.id;


--
-- Name: listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_no character varying(50) NOT NULL,
    seller_id uuid NOT NULL,
    category_id bigint NOT NULL,
    location_id bigint NOT NULL,
    title character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    price numeric(15,2),
    land_area_sqwa numeric(10,2),
    usable_area_sqm numeric(10,2),
    bedrooms smallint,
    bathrooms smallint,
    status character varying(30) DEFAULT 'DRAFT'::character varying NOT NULL,
    rejection_reason text,
    submitted_at timestamp with time zone,
    approved_at timestamp with time zone,
    rejected_at timestamp with time zone,
    revision_at timestamp with time zone,
    published_at timestamp with time zone,
    sold_at timestamp with time zone,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    contact_phone character varying(30),
    contact_email character varying(254),
    contact_line character varying(100),
    CONSTRAINT chk_listings_approved CHECK ((((status)::text <> 'APPROVED'::text) OR (approved_at IS NOT NULL))),
    CONSTRAINT chk_listings_land CHECK (((land_area_sqwa IS NULL) OR (land_area_sqwa >= (0)::numeric))),
    CONSTRAINT chk_listings_price CHECK (((price IS NULL) OR (price >= (0)::numeric))),
    CONSTRAINT chk_listings_rejection CHECK ((((status)::text <> 'REJECTED'::text) OR (rejection_reason IS NOT NULL))),
    CONSTRAINT chk_listings_status CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'REVISION_REQUIRED'::character varying, 'SOLD'::character varying, 'CLOSED'::character varying, 'HIDDEN'::character varying])::text[]))),
    CONSTRAINT chk_listings_submit_complete CHECK ((((status)::text = 'DRAFT'::text) OR (((status)::text <> 'DRAFT'::text) AND (category_id IS NOT NULL) AND (location_id IS NOT NULL) AND (price IS NOT NULL) AND (title IS NOT NULL) AND (price >= (0)::numeric)))),
    CONSTRAINT chk_listings_usable CHECK (((usable_area_sqm IS NULL) OR (usable_area_sqm >= (0)::numeric)))
);


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id bigint NOT NULL,
    parent_id bigint,
    location_type character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    postal_code character varying(5),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_locations_type CHECK (((location_type)::text = ANY ((ARRAY['country'::character varying, 'province'::character varying, 'district'::character varying, 'subdistrict'::character varying])::text[])))
);


--
-- Name: locations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.locations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.locations_id_seq OWNED BY public.locations.id;


--
-- Name: moderation_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moderation_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    admin_id uuid,
    action character varying(50) NOT NULL,
    reason_code character varying(50),
    moderator_comment text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_moderation_actions_action CHECK (((action)::text = ANY ((ARRAY['APPROVE'::character varying, 'REJECT'::character varying, 'REQUEST_REVISION'::character varying, 'SUSPEND'::character varying, 'RESTORE'::character varying, 'MARK_SOLD'::character varying, 'CLOSE'::character varying])::text[])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    body text,
    payload jsonb,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_notifications_type CHECK (((type)::text = ANY ((ARRAY['listing_approved'::character varying, 'listing_rejected'::character varying, 'listing_revision_required'::character varying, 'new_inquiry'::character varying, 'inquiry_reply'::character varying, 'account_verified'::character varying, 'listing_hidden'::character varying])::text[])))
);


--
-- Name: otp_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otp_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    phone character varying(20) NOT NULL,
    otp_code character varying(64) NOT NULL,
    purpose character varying(30) NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    is_used boolean DEFAULT false NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    used_at timestamp with time zone,
    CONSTRAINT chk_otp_attempts CHECK (((attempts >= 0) AND (attempts <= 5))),
    CONSTRAINT chk_otp_purpose CHECK (((purpose)::text = ANY ((ARRAY['register'::character varying, 'login'::character varying, 'post_listing'::character varying, 'change_phone'::character varying])::text[])))
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    code character varying(100) NOT NULL,
    module character varying(50) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: phone_reveals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phone_reveals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    buyer_id uuid NOT NULL,
    listing_id uuid NOT NULL,
    revealed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    role_id integer NOT NULL,
    permission_id integer NOT NULL,
    granted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_roles_code CHECK (((code)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'seller'::character varying, 'buyer'::character varying])::text[])))
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: user_consents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_consents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    consent_type character varying(50) NOT NULL,
    version character varying(20) NOT NULL,
    is_accepted boolean NOT NULL,
    accepted_at timestamp with time zone,
    revoked_at timestamp with time zone,
    ip_address character varying(45),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_user_consents_type CHECK (((consent_type)::text = ANY ((ARRAY['pdpa'::character varying, 'marketing'::character varying, 'terms_of_service'::character varying])::text[])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    user_id uuid NOT NULL,
    role_id integer NOT NULL,
    assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    assigned_by uuid
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(254) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    phone character varying(20) NOT NULL,
    status character varying(30) DEFAULT 'pending_verification'::character varying NOT NULL,
    email_verified_at timestamp with time zone,
    phone_verified_at timestamp with time zone,
    kyc_status character varying(20) DEFAULT 'unverified'::character varying NOT NULL,
    last_login_at timestamp with time zone,
    token_version integer DEFAULT 1 NOT NULL,
    pdpa_accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT chk_users_kyc CHECK (((kyc_status)::text = ANY ((ARRAY['unverified'::character varying, 'pending'::character varying, 'verified'::character varying, 'rejected'::character varying])::text[]))),
    CONSTRAINT chk_users_pdpa CHECK ((((status)::text = 'pending_verification'::text) OR (((status)::text <> 'pending_verification'::text) AND (pdpa_accepted_at IS NOT NULL)))),
    CONSTRAINT chk_users_status CHECK (((status)::text = ANY ((ARRAY['pending_verification'::character varying, 'active'::character varying, 'inactive'::character varying, 'suspended'::character varying, 'banned'::character varying])::text[])))
);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: listing_status_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_status_history ALTER COLUMN id SET DEFAULT nextval('public.listing_status_history_id_seq'::regclass);


--
-- Name: locations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations ALTER COLUMN id SET DEFAULT nextval('public.locations_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: contact_history contact_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_history
    ADD CONSTRAINT contact_history_pkey PRIMARY KEY (id);


--
-- Name: inquiries inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_pkey PRIMARY KEY (id);


--
-- Name: inquiry_messages inquiry_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiry_messages
    ADD CONSTRAINT inquiry_messages_pkey PRIMARY KEY (id);


--
-- Name: listing_images listing_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_images
    ADD CONSTRAINT listing_images_pkey PRIMARY KEY (id);


--
-- Name: listing_status_history listing_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_status_history
    ADD CONSTRAINT listing_status_history_pkey PRIMARY KEY (id);


--
-- Name: listings listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: moderation_actions moderation_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_actions
    ADD CONSTRAINT moderation_actions_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: otp_verifications otp_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_verifications
    ADD CONSTRAINT otp_verifications_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: phone_reveals phone_reveals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phone_reveals
    ADD CONSTRAINT phone_reveals_pkey PRIMARY KEY (id);


--
-- Name: favorites pk_favorites; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT pk_favorites PRIMARY KEY (user_id, listing_id);


--
-- Name: role_permissions pk_role_permissions; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT pk_role_permissions PRIMARY KEY (role_id, permission_id);


--
-- Name: user_roles pk_user_roles; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT pk_user_roles PRIMARY KEY (user_id, role_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: categories uq_categories_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT uq_categories_code UNIQUE (code);


--
-- Name: categories uq_categories_slug; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT uq_categories_slug UNIQUE (slug);


--
-- Name: listings uq_listings_no; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT uq_listings_no UNIQUE (listing_no);


--
-- Name: listings uq_listings_slug; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT uq_listings_slug UNIQUE (slug);


--
-- Name: permissions uq_permissions_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT uq_permissions_code UNIQUE (code);


--
-- Name: roles uq_roles_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT uq_roles_code UNIQUE (code);


--
-- Name: users uq_users_email; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_users_email UNIQUE (email);


--
-- Name: users uq_users_phone; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_users_phone UNIQUE (phone);


--
-- Name: user_consents user_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_consents
    ADD CONSTRAINT user_consents_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_logs_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_actor ON public.audit_logs USING btree (actor_user_id);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_categories_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_parent ON public.categories USING btree (parent_id);


--
-- Name: idx_contact_history_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_history_user ON public.contact_history USING btree (user_id, contact_at DESC);


--
-- Name: idx_favorites_listing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorites_listing ON public.favorites USING btree (listing_id);


--
-- Name: idx_inquiries_buyer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inquiries_buyer ON public.inquiries USING btree (buyer_id);


--
-- Name: idx_inquiries_listing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inquiries_listing ON public.inquiries USING btree (listing_id);


--
-- Name: idx_inquiries_seller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inquiries_seller ON public.inquiries USING btree (seller_id);


--
-- Name: idx_inquiries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inquiries_status ON public.inquiries USING btree (status);


--
-- Name: idx_inquiry_messages_inquiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inquiry_messages_inquiry ON public.inquiry_messages USING btree (inquiry_id, created_at DESC);


--
-- Name: idx_listing_images_listing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listing_images_listing ON public.listing_images USING btree (listing_id);


--
-- Name: idx_listing_status_history_listing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listing_status_history_listing ON public.listing_status_history USING btree (listing_id, created_at DESC);


--
-- Name: idx_listing_status_history_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listing_status_history_user ON public.listing_status_history USING btree (changed_by);


--
-- Name: idx_listings_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_category ON public.listings USING btree (category_id);


--
-- Name: idx_listings_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_location ON public.listings USING btree (location_id);


--
-- Name: idx_listings_price; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_price ON public.listings USING btree (price);


--
-- Name: idx_listings_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_public ON public.listings USING btree (published_at DESC) WHERE ((status)::text = 'APPROVED'::text);


--
-- Name: idx_listings_seller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_seller ON public.listings USING btree (seller_id);


--
-- Name: idx_listings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_status ON public.listings USING btree (status);


--
-- Name: idx_locations_postal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_locations_postal ON public.locations USING btree (postal_code);


--
-- Name: idx_moderation_actions_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_actions_admin ON public.moderation_actions USING btree (admin_id);


--
-- Name: idx_moderation_actions_listing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moderation_actions_listing ON public.moderation_actions USING btree (listing_id);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id, is_read, created_at DESC);


--
-- Name: idx_otp_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otp_expires ON public.otp_verifications USING btree (expires_at);


--
-- Name: idx_phone_reveals_buyer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phone_reveals_buyer ON public.phone_reveals USING btree (buyer_id);


--
-- Name: idx_phone_reveals_listing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phone_reveals_listing ON public.phone_reveals USING btree (listing_id);


--
-- Name: idx_role_permissions_permission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_permission ON public.role_permissions USING btree (permission_id);


--
-- Name: idx_user_consents_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_consents_user ON public.user_consents USING btree (user_id);


--
-- Name: idx_user_roles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role_id);


--
-- Name: idx_users_kyc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_kyc ON public.users USING btree (kyc_status);


--
-- Name: uq_user_single_role; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_user_single_role ON public.user_roles USING btree (user_id);


--
-- Name: inquiries trg_inquiries_log_contact; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_inquiries_log_contact AFTER INSERT ON public.inquiries FOR EACH ROW EXECUTE FUNCTION public.fn_auto_contact_history();


--
-- Name: inquiries trg_inquiries_notify_seller; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_inquiries_notify_seller AFTER INSERT ON public.inquiries FOR EACH ROW EXECUTE FUNCTION public.fn_notify_seller_on_inquiry();


--
-- Name: listing_images trg_listing_images_count_check; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_listing_images_count_check AFTER INSERT OR DELETE OR UPDATE ON public.listing_images FOR EACH ROW EXECUTE FUNCTION public.fn_check_listing_image_count();


--
-- Name: listings trg_listings_check_seller_verified; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_listings_check_seller_verified BEFORE INSERT ON public.listings FOR EACH ROW EXECUTE FUNCTION public.fn_check_seller_verified();


--
-- Name: listings trg_listings_prevent_self_approve; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_listings_prevent_self_approve BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.fn_check_admin_self_approve();


--
-- Name: listings trg_listings_rate_limit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_listings_rate_limit BEFORE INSERT ON public.listings FOR EACH ROW EXECUTE FUNCTION public.fn_check_listing_rate_limit();


--
-- Name: listings trg_listings_status_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_listings_status_change AFTER UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.fn_log_listing_status();


--
-- Name: listings trg_listings_submit_check; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_listings_submit_check BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.fn_check_listing_submit();


--
-- Name: listings trg_listings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();


--
-- Name: user_roles trg_user_roles_assign_check; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_user_roles_assign_check BEFORE INSERT OR UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.fn_check_assign_admin();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();


--
-- Name: audit_logs fk_audit_logs_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_logs_user FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: contact_history fk_contact_history_listing; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_history
    ADD CONSTRAINT fk_contact_history_listing FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: contact_history fk_contact_history_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_history
    ADD CONSTRAINT fk_contact_history_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: favorites fk_favorites_listing; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT fk_favorites_listing FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: favorites fk_favorites_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: inquiries fk_inquiries_buyer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT fk_inquiries_buyer FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: inquiries fk_inquiries_listing; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT fk_inquiries_listing FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: inquiries fk_inquiries_seller; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT fk_inquiries_seller FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: inquiry_messages fk_inquiry_messages_inquiry; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiry_messages
    ADD CONSTRAINT fk_inquiry_messages_inquiry FOREIGN KEY (inquiry_id) REFERENCES public.inquiries(id) ON DELETE CASCADE;


--
-- Name: inquiry_messages fk_inquiry_messages_sender; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiry_messages
    ADD CONSTRAINT fk_inquiry_messages_sender FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: listing_images fk_listing_images_listing; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_images
    ADD CONSTRAINT fk_listing_images_listing FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: listing_status_history fk_listing_status_history_listing; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_status_history
    ADD CONSTRAINT fk_listing_status_history_listing FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: listing_status_history fk_listing_status_history_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_status_history
    ADD CONSTRAINT fk_listing_status_history_user FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: listings fk_listings_category; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT fk_listings_category FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- Name: listings fk_listings_location; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT fk_listings_location FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE RESTRICT;


--
-- Name: listings fk_listings_seller; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT fk_listings_seller FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: moderation_actions fk_moderation_actions_admin; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_actions
    ADD CONSTRAINT fk_moderation_actions_admin FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: moderation_actions fk_moderation_actions_listing; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_actions
    ADD CONSTRAINT fk_moderation_actions_listing FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: notifications fk_notifications_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: otp_verifications fk_otp_verifications_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_verifications
    ADD CONSTRAINT fk_otp_verifications_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: phone_reveals fk_phone_reveals_buyer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phone_reveals
    ADD CONSTRAINT fk_phone_reveals_buyer FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: phone_reveals fk_phone_reveals_listing; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phone_reveals
    ADD CONSTRAINT fk_phone_reveals_listing FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: role_permissions fk_role_permissions_permission; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions fk_role_permissions_role; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_consents fk_user_consents_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_consents
    ADD CONSTRAINT fk_user_consents_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_roles fk_user_roles_assigned_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT fk_user_roles_assigned_by FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_roles fk_user_roles_role; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE RESTRICT;


--
-- Name: user_roles fk_user_roles_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs audit_logs_owner_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_logs_owner_only ON public.audit_logs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.user_roles ur
     JOIN public.roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = (NULLIF(current_setting('app.user_id'::text, true), ''::text))::uuid) AND ((r.code)::text = 'owner'::text)))));


--
-- Name: inquiries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

--
-- Name: inquiries inquiries_access_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inquiries_access_policy ON public.inquiries USING (((seller_id = (NULLIF(current_setting('app.user_id'::text, true), ''::text))::uuid) OR (buyer_id = (NULLIF(current_setting('app.user_id'::text, true), ''::text))::uuid) OR (EXISTS ( SELECT 1
   FROM (public.user_roles ur
     JOIN public.roles r ON ((ur.role_id = r.id)))
  WHERE ((ur.user_id = (NULLIF(current_setting('app.user_id'::text, true), ''::text))::uuid) AND ((r.code)::text = ANY ((ARRAY['admin'::character varying, 'owner'::character varying])::text[])))))));


--
-- Name: user_consents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

--
-- Name: user_consents user_consents_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_consents_self ON public.user_consents USING ((user_id = (NULLIF(current_setting('app.user_id'::text, true), ''::text))::uuid));


--
-- PostgreSQL database dump complete
--



-- Restore session settings so the migration engine can update its registry.
SET search_path = public;
SET row_security = on;
SET check_function_bodies = on;

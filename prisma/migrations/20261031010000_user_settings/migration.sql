CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  language varchar(2) NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'th')),
  currency varchar(3) NOT NULL DEFAULT 'THB' CHECK (currency IN ('THB', 'USD')),
  show_unread_badge boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_settings_own ON public.user_settings
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid);

-- ============================================================
-- Migration: Seed 12 demo users + fix get_all_users_for_admin
-- Data: 2026-04-12
-- Password demo per tutti gli utenti: Demo2026!
-- ============================================================

-- 1. Fix get_all_users_for_admin: aggiunge campo email da auth.users
CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  avatar_url text,
  notification_enabled boolean,
  whatsapp_number text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  role app_role
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    u.email,
    p.avatar_url,
    p.notification_enabled,
    p.whatsapp_number,
    p.created_at,
    p.updated_at,
    COALESCE(ur.role, 'user'::app_role) AS role
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id;
END;
$$;

-- ============================================================
-- 2. Seed 12 utenti demo
-- ============================================================

DO $$
DECLARE
  u1  uuid := gen_random_uuid();
  u2  uuid := gen_random_uuid();
  u3  uuid := gen_random_uuid();
  u4  uuid := gen_random_uuid();
  u5  uuid := gen_random_uuid();
  u6  uuid := gen_random_uuid();
  u7  uuid := gen_random_uuid();
  u8  uuid := gen_random_uuid();
  u9  uuid := gen_random_uuid();
  u10 uuid := gen_random_uuid();
  u11 uuid := gen_random_uuid();
  u12 uuid := gen_random_uuid();
  pw  text;
BEGIN
  -- Hash password Demo2026!
  pw := extensions.crypt('Demo2026!', extensions.gen_salt('bf', 10));

  -- ── Inserimento in auth.users ───────────────────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES

  -- 1. Mario Rossi – Premium attivo da 6 mesi
  (u1,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'mario.rossi@demo.it',   pw,
   NOW() - INTERVAL '180 days',
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Mario Rossi"}',
   false, NOW() - INTERVAL '180 days', NOW(), '', '', '', ''),

  -- 2. Giulia Bianchi – Premium attiva da 5 mesi
  (u2,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'giulia.bianchi@demo.it', pw,
   NOW() - INTERVAL '150 days',
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Giulia Bianchi"}',
   false, NOW() - INTERVAL '150 days', NOW(), '', '', '', ''),

  -- 3. Luca Verdi – Free scaduto
  (u3,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'luca.verdi@demo.it',    pw,
   NOW() - INTERVAL '90 days',
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Luca Verdi"}',
   false, NOW() - INTERVAL '90 days', NOW(), '', '', '', ''),

  -- 4. Sara Neri – Free cancellato
  (u4,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'sara.neri@demo.it',     pw,
   NOW() - INTERVAL '60 days',
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Sara Neri"}',
   false, NOW() - INTERVAL '60 days', NOW(), '', '', '', ''),

  -- 5. Alessandro Ferrari – Premium Pro attivo
  (u5,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'alex.ferrari@demo.it',  pw,
   NOW() - INTERVAL '120 days',
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Alessandro Ferrari"}',
   false, NOW() - INTERVAL '120 days', NOW(), '', '', '', ''),

  -- 6. Chiara Romano – In trial
  (u6,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'chiara.romano@demo.it', pw,
   NOW() - INTERVAL '3 days',
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Chiara Romano"}',
   false, NOW() - INTERVAL '3 days', NOW(), '', '', '', ''),

  -- 7. Marco Esposito – Premium attivo da 4 mesi
  (u7,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'marco.esposito@demo.it', pw,
   NOW() - INTERVAL '130 days',
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Marco Esposito"}',
   false, NOW() - INTERVAL '130 days', NOW(), '', '', '', ''),

  -- 8. Laura Colombo – Free attivo
  (u8,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'laura.colombo@demo.it', pw,
   NOW() - INTERVAL '45 days',
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Laura Colombo"}',
   false, NOW() - INTERVAL '45 days', NOW(), '', '', '', ''),

  -- 9. Davide Ricci – Premium bloccato
  (u9,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'davide.ricci@demo.it',  pw,
   NOW() - INTERVAL '200 days',
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Davide Ricci"}',
   false, NOW() - INTERVAL '200 days', NOW(), '', '', '', ''),

  -- 10. Elena Marino – Premium attiva da 3 mesi
  (u10, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'elena.marino@demo.it',  pw,
   NOW() - INTERVAL '100 days',
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Elena Marino"}',
   false, NOW() - INTERVAL '100 days', NOW(), '', '', '', ''),

  -- 11. Francesco Conti – In trial
  (u11, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'franc.conti@demo.it',   pw,
   NOW() - INTERVAL '5 days',
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Francesco Conti"}',
   false, NOW() - INTERVAL '5 days', NOW(), '', '', '', ''),

  -- 12. Valentina Costa – Free appena iscritta
  (u12, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'valen.costa@demo.it',   pw,
   NOW() - INTERVAL '10 days',
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Valentina Costa"}',
   false, NOW() - INTERVAL '10 days', NOW(), '', '', '', '');

  -- Il trigger handle_new_user() crea automaticamente i profili di base.
  -- Ora aggiorniamo i profili con subscription e dati di contatto.

  -- 1. Mario Rossi – Premium attivo, whatsapp sì, notifiche sì
  UPDATE public.profiles SET
    subscription_plan    = 'premium',
    subscription_status  = 'active',
    whatsapp_number      = '+39 340 1112233',
    notification_enabled = true,
    trial_end_date       = NULL
  WHERE id = u1;

  -- 2. Giulia Bianchi – Premium attiva, notifiche sì
  UPDATE public.profiles SET
    subscription_plan    = 'premium',
    subscription_status  = 'active',
    whatsapp_number      = '+39 349 4445566',
    notification_enabled = true,
    trial_end_date       = NULL
  WHERE id = u2;

  -- 3. Luca Verdi – Free scaduto, no whatsapp
  UPDATE public.profiles SET
    subscription_plan    = 'free',
    subscription_status  = 'expired',
    notification_enabled = false,
    trial_end_date       = NOW() - INTERVAL '60 days'
  WHERE id = u3;

  -- 4. Sara Neri – Free cancellato, whatsapp sì
  UPDATE public.profiles SET
    subscription_plan    = 'free',
    subscription_status  = 'cancelled',
    whatsapp_number      = '+39 333 7778899',
    notification_enabled = true,
    trial_end_date       = NOW() - INTERVAL '45 days'
  WHERE id = u4;

  -- 5. Alessandro Ferrari – Pro attivo, notifiche sì
  UPDATE public.profiles SET
    subscription_plan    = 'pro',
    subscription_status  = 'active',
    whatsapp_number      = '+39 347 0001122',
    notification_enabled = true,
    trial_end_date       = NULL
  WHERE id = u5;

  -- 6. Chiara Romano – Free in trial, no whatsapp
  UPDATE public.profiles SET
    subscription_plan    = 'free',
    subscription_status  = 'trialing',
    notification_enabled = true,
    trial_end_date       = NOW() + INTERVAL '4 days'
  WHERE id = u6;

  -- 7. Marco Esposito – Premium attivo, whatsapp sì
  UPDATE public.profiles SET
    subscription_plan    = 'premium',
    subscription_status  = 'active',
    whatsapp_number      = '+39 335 3334455',
    notification_enabled = true,
    trial_end_date       = NULL
  WHERE id = u7;

  -- 8. Laura Colombo – Free attivo, no whatsapp
  UPDATE public.profiles SET
    subscription_plan    = 'free',
    subscription_status  = 'active',
    notification_enabled = false,
    trial_end_date       = NULL
  WHERE id = u8;

  -- 9. Davide Ricci – Premium bloccato
  UPDATE public.profiles SET
    subscription_plan    = 'premium',
    subscription_status  = 'blocked',
    whatsapp_number      = '+39 328 6667788',
    notification_enabled = false,
    trial_end_date       = NULL
  WHERE id = u9;

  -- 10. Elena Marino – Premium attiva, notifiche sì
  UPDATE public.profiles SET
    subscription_plan    = 'premium',
    subscription_status  = 'active',
    whatsapp_number      = '+39 340 9990011',
    notification_enabled = true,
    trial_end_date       = NULL
  WHERE id = u10;

  -- 11. Francesco Conti – Free in trial, whatsapp sì
  UPDATE public.profiles SET
    subscription_plan    = 'free',
    subscription_status  = 'trialing',
    whatsapp_number      = '+39 347 2223344',
    notification_enabled = true,
    trial_end_date       = NOW() + INTERVAL '2 days'
  WHERE id = u11;

  -- 12. Valentina Costa – Free appena iscritta
  UPDATE public.profiles SET
    subscription_plan    = 'free',
    subscription_status  = 'active',
    notification_enabled = false,
    trial_end_date       = NOW() + INTERVAL '7 days'
  WHERE id = u12;

END;
$$;

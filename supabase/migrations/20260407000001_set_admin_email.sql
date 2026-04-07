-- Migration: Set acdigital.app@gmail.com as permanent admin
-- Removes acaridi57@gmail.com admin role if present

-- 1. Update has_role to also check admin email as fallback
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Check user_roles table first
  IF EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  ) THEN
    RETURN TRUE;
  END IF;

  -- Fallback: admin email always has admin role
  IF _role = 'admin' THEN
    SELECT email INTO user_email FROM auth.users WHERE id = _user_id;
    RETURN user_email = 'acdigital.app@gmail.com';
  END IF;

  RETURN FALSE;
END;
$$;

-- 2. Trigger: auto-assign admin role when acdigital.app@gmail.com registers
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'acdigital.app@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Remove old admin email if it registers
  IF NEW.email = 'acaridi57@gmail.com' THEN
    DELETE FROM public.user_roles WHERE user_id = NEW.id AND role = 'admin';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;

-- Create trigger on new user registration
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_admin_role();

-- 3. If acdigital.app@gmail.com already exists, assign admin role
DO $$
DECLARE
  admin_uid UUID;
  old_admin_uid UUID;
BEGIN
  -- Grant admin to new email if user exists
  SELECT id INTO admin_uid FROM auth.users WHERE email = 'acdigital.app@gmail.com' LIMIT 1;
  IF admin_uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Remove admin from old email if exists
  SELECT id INTO old_admin_uid FROM auth.users WHERE email = 'acaridi57@gmail.com' LIMIT 1;
  IF old_admin_uid IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = old_admin_uid AND role = 'admin';
  END IF;
END;
$$;

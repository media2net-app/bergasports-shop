ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin';

ALTER TABLE public.admin_users
  DROP CONSTRAINT IF EXISTS admin_users_role_check;

ALTER TABLE public.admin_users
  ADD CONSTRAINT admin_users_role_check CHECK (role IN ('admin', 'super_admin'));

UPDATE public.admin_users
SET role = 'super_admin'
WHERE lower(email) = 'chiel@media2net.nl';

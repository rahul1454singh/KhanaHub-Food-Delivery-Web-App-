ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS phone_code TEXT,
ADD COLUMN IF NOT EXISTS contact_number TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, phone_code, contact_number)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', 'User'), 
    new.email, 
    'customer',
    new.raw_user_meta_data->>'phone_code',
    new.raw_user_meta_data->>'contact_number'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

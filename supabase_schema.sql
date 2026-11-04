-- ==============================================================================
-- KhanaHub - Master Supabase Database Schema
-- ==============================================================================
--
-- SUMMARY OF THIS SCHEMA:
-- This script sets up the complete PostgreSQL database for KhanaHub on Supabase.
-- Run this script directly in your Supabase Dashboard -> SQL Editor.
--
-- What this script creates:
--  1. ENUM Types: Custom types for user roles, order statuses, and payment statuses.
--  2. Users Table: Profiles linked to Supabase Auth (id, name, email, role, phone, address, coordinates).
--  3. Auth Trigger: Automatically creates or syncs user profiles upon signup (auto-assigns 'delivery' if email starts with 'db').
--  4. Menu Table: Food items catalog (Momo, Biryani, Burger, Pizza, Snacks, Drinks) with default seed data.
--  5. Orders Table: Customer food orders, delivery details, payment IDs, and live statuses.
--  6. Promo Codes & Store Settings: Discount codes management and global promo toggle.
--  7. Row Level Security (RLS): Strict access policies ensuring customers, delivery boys, and owners only access authorized data.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENUM TYPES
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'owner', 'delivery');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 2. USERS TABLE & PROFILE SYNC
-- ------------------------------------------------------------------------------
-- Extends Supabase auth.users with profile information, role-based access, and address coordinates.
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role DEFAULT 'customer'::user_role,
  phone_code TEXT,
  contact_number TEXT,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users 
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Owners can view all users" ON public.users;
CREATE POLICY "Owners can view all users" ON public.users 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users 
  FOR UPDATE USING (auth.uid() = id);

-- Trigger Function: Auto-create profile when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  assigned_role user_role;
BEGIN
  -- Automatically assign 'delivery' role if email starts with 'db' or contains '+db@'
  IF new.email ILIKE 'db%' OR new.email ILIKE '%+db@%' THEN
    assigned_role := 'delivery'::user_role;
  ELSE
    assigned_role := 'customer'::user_role;
  END IF;

  INSERT INTO public.users (id, name, email, role, phone_code, contact_number)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 
    new.email, 
    assigned_role,
    new.raw_user_meta_data->>'phone_code',
    new.raw_user_meta_data->>'contact_number'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone_code = COALESCE(EXCLUDED.phone_code, public.users.phone_code),
    contact_number = COALESCE(EXCLUDED.contact_number, public.users.contact_number);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 3. MENU TABLE & SEED DATA
-- ------------------------------------------------------------------------------
-- Stores restaurant food items, prices, categories, and stock availability.
CREATE TABLE IF NOT EXISTS public.menu (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  image TEXT NOT NULL,
  section TEXT NOT NULL,
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.menu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view menu" ON public.menu;
CREATE POLICY "Anyone can view menu" ON public.menu 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only owners can modify menu" ON public.menu;
CREATE POLICY "Only owners can modify menu" ON public.menu 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );

-- Seed initial menu items (if table is empty)
INSERT INTO public.menu (name, price, image, section, available)
SELECT * FROM (VALUES
  ('Chicken Momos', 140::numeric, '/menu/Chicken Momos.png', 'Momo', true),
  ('Chicken Fry Momos', 160::numeric, '/menu/Chicken fry Momos.jpf.jpg', 'Momo', true),
  ('Chicken Jhol Momos', 180::numeric, '/menu/chickern jhol momos.png', 'Momo', true),
  ('Veg Momos', 100::numeric, '/menu/Veg Momos.png', 'Momo', true),
  ('Veg Fry Momos', 130::numeric, '/menu/Veg fry Momos.png', 'Momo', true),
  ('Veg Jhol Momos', 140::numeric, '/menu/Veg jhol Momos.png', 'Momo', true),
  ('Chicken Biryani', 250::numeric, '/menu/Chicken Biryani.png', 'Biryani', true),
  ('Mutton Biryani', 300::numeric, '/menu/Mutton Biryani.png', 'Biryani', true),
  ('Egg Biryani', 200::numeric, '/menu/egg Biryani.png', 'Biryani', true),
  ('Veg Biryani', 200::numeric, '/menu/Veg Biryani.png', 'Biryani', true),
  ('Cheese Chicken Burger', 180::numeric, '/menu/Cheese chiken Burger.jpg', 'Burger', true),
  ('Chicken Burger', 150::numeric, '/menu/Chicken Burger.jpg', 'Burger', true),
  ('Chicken Grill Burger', 170::numeric, '/menu/chicken grill burger.jpg', 'Burger', true),
  ('Veg Burger', 120::numeric, '/menu/Veg Burger.jpg', 'Burger', true),
  ('Veg Grill Burger', 150::numeric, '/menu/veg grill burger.jpg', 'Burger', true),
  ('Margherita Pizza', 199::numeric, '/menu/Margherita Pizza.png', 'Pizza', true),
  ('Paneer Pizza', 250::numeric, '/menu/Paneer Pizza.png', 'Pizza', true),
  ('Veg Pizza', 220::numeric, '/menu/veg pizza.png', 'Pizza', true),
  ('Chicken Pizza', 350::numeric, '/menu/chickern Pizza.jpg', 'Pizza', true),
  ('Chicken Wings', 250::numeric, '/menu/Chicken Wings.png', 'Snacks', true),
  ('Chicken Spring Rolls', 150::numeric, '/menu/chicken Spring Rolls.png', 'Snacks', true),
  ('French Fries', 100::numeric, '/menu/French Fries.png', 'Snacks', true),
  ('Veg Spring Rolls', 120::numeric, '/menu/veg Spring Rolls.png', 'Snacks', true),
  ('Chicken Chowmein', 170::numeric, '/menu/Chicken Chowmein.png', 'Noodles', true),
  ('Mixed Chowmein', 190::numeric, '/menu/Mixed Chowmein.png', 'Noodles', true),
  ('Veg Chowmein', 140::numeric, '/menu/Veg Chowmein.png', 'Noodles', true),
  ('Coke', 50::numeric, '/menu/Coke.png', 'Drinks', true),
  ('Fanta', 50::numeric, '/menu/Fanta.png', 'Drinks', true),
  ('Milkshake', 120::numeric, '/menu/Milkshake.png', 'Drinks', true),
  ('Pepsi', 50::numeric, '/menu/Pepsi.png', 'Drinks', true),
  ('Sprite', 50::numeric, '/menu/Sprite.png', 'Drinks', true),
  ('Monster', 120::numeric, '/menu/monster.png', 'Drinks', true),
  ('Mountain Dew', 50::numeric, '/menu/mountain dew.png', 'Drinks', true),
  ('Red Bull', 120::numeric, '/menu/redbull.png', 'Drinks', true)
) AS v(name, price, image, section, available)
WHERE NOT EXISTS (SELECT 1 FROM public.menu LIMIT 1);

-- ------------------------------------------------------------------------------
-- 4. ORDERS TABLE
-- ------------------------------------------------------------------------------
-- Stores customer food orders, Razorpay transactions, delivery assignments, and order status.
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  delivery_boy_id UUID REFERENCES public.users(id),
  items JSONB NOT NULL,
  total_amount NUMERIC NOT NULL,
  delivery_charge NUMERIC NOT NULL DEFAULT 0,
  grand_total NUMERIC NOT NULL,
  delivery_details JSONB NOT NULL, -- stores fullName, contact, address, lat, lng
  order_status order_status DEFAULT 'pending'::order_status,
  payment_status payment_status DEFAULT 'pending'::payment_status,
  payment_method TEXT DEFAULT 'razorpay',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
CREATE POLICY "Users can create their own orders" ON public.orders 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can view all orders" ON public.orders;
CREATE POLICY "Owners can view all orders" ON public.orders 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );

DROP POLICY IF EXISTS "Owners can update orders" ON public.orders;
CREATE POLICY "Owners can update orders" ON public.orders 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );

DROP POLICY IF EXISTS "Delivery boys can view assigned orders" ON public.orders;
CREATE POLICY "Delivery boys can view assigned orders" ON public.orders 
  FOR SELECT USING (auth.uid() = delivery_boy_id);

DROP POLICY IF EXISTS "Delivery boys can update assigned orders" ON public.orders;
CREATE POLICY "Delivery boys can update assigned orders" ON public.orders 
  FOR UPDATE USING (auth.uid() = delivery_boy_id);

-- ------------------------------------------------------------------------------
-- 5. PROMO CODES & STORE SETTINGS
-- ------------------------------------------------------------------------------
-- Global store settings toggle for promotions
CREATE TABLE IF NOT EXISTS public.store_settings (
  id SERIAL PRIMARY KEY,
  is_promo_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view store settings" ON public.store_settings;
CREATE POLICY "Anyone can view store settings" ON public.store_settings 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only owners can modify store settings" ON public.store_settings;
CREATE POLICY "Only owners can modify store settings" ON public.store_settings 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );

-- Initialize default store setting (if empty)
INSERT INTO public.store_settings (id, is_promo_active)
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;

-- Promo codes table for discount coupons
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_percentage INTEGER NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active promo codes" ON public.promo_codes;
CREATE POLICY "Anyone can view active promo codes" ON public.promo_codes 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only owners can modify promo codes" ON public.promo_codes;
CREATE POLICY "Only owners can modify promo codes" ON public.promo_codes 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );

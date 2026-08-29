-- Run this script in your Supabase Dashboard -> SQL Editor

-- 1. Create custom ENUM types for statuses and roles
CREATE TYPE user_role AS ENUM ('customer', 'owner', 'delivery');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- 2. Create Users Table
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role DEFAULT 'customer'::user_role,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Owners can view all users" ON public.users FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Trigger to automatically create a user profile when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  assigned_role user_role;
BEGIN
  -- Auto-assign delivery role if email starts with 'db' or contains '+db@'
  IF new.email ILIKE 'db%' OR new.email ILIKE '%+db@%' THEN
    assigned_role := 'delivery'::user_role;
  ELSE
    assigned_role := 'customer'::user_role;
  END IF;

  INSERT INTO public.users (id, name, email, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 
    new.email, 
    assigned_role
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Create Menu Table
CREATE TABLE public.menu (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  image TEXT NOT NULL,
  section TEXT NOT NULL,
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.menu ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view menu" ON public.menu FOR SELECT USING (true);
CREATE POLICY "Only owners can modify menu" ON public.menu FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
);

-- Insert the hardcoded menu data as a starting point
INSERT INTO public.menu (name, price, image, section, available) VALUES
('Chicken Momos', 140, '/menu/Chicken Momos.png', 'Momo', true),
('Chicken Fry Momos', 160, '/menu/Chicken fry Momos.jpf.jpg', 'Momo', true),
('Chicken Jhol Momos', 180, '/menu/chickern jhol momos.png', 'Momo', true),
('Veg Momos', 100, '/menu/Veg Momos.png', 'Momo', true),
('Veg Fry Momos', 130, '/menu/Veg fry Momos.png', 'Momo', true),
('Veg Jhol Momos', 140, '/menu/Veg jhol Momos.png', 'Momo', true),
('Chicken Biryani', 250, '/menu/Chicken Biryani.png', 'Biryani', true),
('Mutton Biryani', 300, '/menu/Mutton Biryani.png', 'Biryani', true),
('Egg Biryani', 200, '/menu/egg Biryani.png', 'Biryani', true),
('Veg Biryani', 200, '/menu/Veg Biryani.png', 'Biryani', true),
('Cheese Chicken Burger', 180, '/menu/Cheese chiken Burger.jpg', 'Burger', true),
('Chicken Burger', 150, '/menu/Chicken Burger.jpg', 'Burger', true),
('Chicken Grill Burger', 170, '/menu/chicken grill burger.jpg', 'Burger', true),
('Veg Burger', 120, '/menu/Veg Burger.jpg', 'Burger', true),
('Veg Grill Burger', 150, '/menu/veg grill burger.jpg', 'Burger', true),
('Margherita Pizza', 199, '/menu/Margherita Pizza.png', 'Pizza', true),
('Paneer Pizza', 250, '/menu/Paneer Pizza.png', 'Pizza', true),
('Veg Pizza', 220, '/menu/veg pizza.png', 'Pizza', true),
('Chicken Pizza', 350, '/menu/chickern Pizza.jpg', 'Pizza', true),
('Chicken Wings', 250, '/menu/Chicken Wings.png', 'Snacks', true),
('Chicken Spring Rolls', 150, '/menu/chicken Spring Rolls.png', 'Snacks', true),
('French Fries', 100, '/menu/French Fries.png', 'Snacks', true),
('Veg Spring Rolls', 120, '/menu/veg Spring Rolls.png', 'Snacks', true),
('Chicken Chowmein', 170, '/menu/Chicken Chowmein.png', 'Noodles', true),
('Mixed Chowmein', 190, '/menu/Mixed Chowmein.png', 'Noodles', true),
('Veg Chowmein', 140, '/menu/Veg Chowmein.png', 'Noodles', true),
('Coke', 50, '/menu/Coke.png', 'Drinks', true),
('Fanta', 50, '/menu/Fanta.png', 'Drinks', true),
('Milkshake', 120, '/menu/Milkshake.png', 'Drinks', true),
('Pepsi', 50, '/menu/Pepsi.png', 'Drinks', true),
('Sprite', 50, '/menu/Sprite.png', 'Drinks', true),
('Monster', 120, '/menu/monster.png', 'Drinks', true),
('Mountain Dew', 50, '/menu/mountain dew.png', 'Drinks', true),
('Red Bull', 120, '/menu/redbull.png', 'Drinks', true);

-- 4. Create Orders Table
CREATE TABLE public.orders (
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
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owners can view all orders" ON public.orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Delivery boys can view assigned orders" ON public.orders FOR SELECT USING (auth.uid() = delivery_boy_id);
-- Insert/Update policies handled via Edge Functions securely

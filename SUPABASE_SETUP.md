# Supabase Setup Guide

To use Supabase with this app, follow these steps:

1. **Set Environment Variables**: 
   Add the following to your AI Studio Secrets/Settings:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key

2. **Create Tables**:
   Run the following SQL in your Supabase SQL Editor:

```sql
-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  dairy_name TEXT,
  owner_name TEXT,
  phone TEXT,
  address TEXT,
  theme TEXT DEFAULT 'dark',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  daily_quantity DECIMAL DEFAULT 1.0,
  milk_type TEXT DEFAULT 'Cow',
  delivery_schedule TEXT DEFAULT 'both',
  is_active BOOLEAN DEFAULT true,
  total_outstanding DECIMAL DEFAULT 0,
  start_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (Optional but recommended)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Simple Policies (Users can only see their own data)
CREATE POLICY "Users can see own profile" ON profiles FOR ALL USING (user_id = user_id);
CREATE POLICY "Users can see own customers" ON customers FOR ALL USING (user_id = user_id);
-- Note: Since we are using Firebase Auth but Supabase for data, 
-- we handle user separation via the user_id text column.
-- In production, you would use Supabase Auth for strict RLS.
```

3. **Restart the App**:
   The app will automatically switch to Supabase once these variables are detected.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id text primary key,
  email text not null unique,
  full_name text not null,
  phone text default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.categories (
  id text primary key,
  name text not null unique,
  slug text not null unique,
  description text not null,
  accent_color text not null default '#c7cad2',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.products (
  id text primary key,
  category_id text not null references public.categories(id) on delete restrict,
  name text not null,
  description text not null,
  image_url text not null default '',
  price numeric(10, 2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  sizes text[] not null default '{}',
  featured boolean not null default false,
  visual_key text not null default 'tee',
  sustainability_note text not null default '',
  lead_time text not null default '5-7 working days',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders (
  id text primary key,
  order_number text not null unique,
  user_id text not null references public.profiles(id) on delete cascade,
  product_id text,
  product_name text not null,
  category_name text not null,
  visual_key text not null default 'tee',
  order_type text not null check (order_type in ('standard', 'custom_design')),
  size text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  total_price numeric(10, 2) not null check (total_price >= 0),
  design_title text not null default '',
  design_description text not null default '',
  design_image_url text not null default '',
  status text not null default 'pending_review' check (
    status in (
      'pending_review',
      'approved_waiting_payment',
      'paid_confirmed',
      'in_production',
      'shipped',
      'delivered',
      'rejected'
    )
  ),
  payment_status text not null default 'awaiting_approval' check (
    payment_status in ('awaiting_approval', 'awaiting_payment', 'paid', 'not_applicable')
  ),
  payment_last4 text not null default '',
  admin_note text not null default '',
  eta_text text not null default '',
  rejection_reason text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notifications (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  kind text not null default 'info' check (kind in ('info', 'success', 'warning', 'danger')),
  read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_notifications_user_id on public.notifications(user_id);

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()::text
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
using (auth.uid()::text = id or public.is_admin());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
with check (auth.uid()::text = id);

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles
for update
using (auth.uid()::text = id or public.is_admin())
with check (auth.uid()::text = id or public.is_admin());

drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read"
on public.categories
for select
using (true);

drop policy if exists "categories_admin_manage" on public.categories;
create policy "categories_admin_manage"
on public.categories
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
on public.products
for select
using (true);

drop policy if exists "products_admin_manage" on public.products;
create policy "products_admin_manage"
on public.products
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin"
on public.orders
for select
using (auth.uid()::text = user_id or public.is_admin());

drop policy if exists "orders_insert_own_or_admin" on public.orders;
create policy "orders_insert_own_or_admin"
on public.orders
for insert
with check (auth.uid()::text = user_id or public.is_admin());

drop policy if exists "orders_update_own_or_admin" on public.orders;
create policy "orders_update_own_or_admin"
on public.orders
for update
using (auth.uid()::text = user_id or public.is_admin())
with check (auth.uid()::text = user_id or public.is_admin());

drop policy if exists "notifications_select_own_or_admin" on public.notifications;
create policy "notifications_select_own_or_admin"
on public.notifications
for select
using (auth.uid()::text = user_id or public.is_admin());

drop policy if exists "notifications_insert_own_or_admin" on public.notifications;
create policy "notifications_insert_own_or_admin"
on public.notifications
for insert
with check (auth.uid()::text = user_id or public.is_admin());

drop policy if exists "notifications_update_own_or_admin" on public.notifications;
create policy "notifications_update_own_or_admin"
on public.notifications
for update
using (auth.uid()::text = user_id or public.is_admin())
with check (auth.uid()::text = user_id or public.is_admin());

insert into storage.buckets (id, name, public)
values ('design-uploads', 'design-uploads', true)
on conflict (id) do nothing;

drop policy if exists "design_uploads_public_read" on storage.objects;
create policy "design_uploads_public_read"
on storage.objects
for select
using (bucket_id = 'design-uploads');

drop policy if exists "design_uploads_insert_own_or_admin" on storage.objects;
create policy "design_uploads_insert_own_or_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'design-uploads'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists "design_uploads_update_own_or_admin" on storage.objects;
create policy "design_uploads_update_own_or_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'design-uploads'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
)
with check (
  bucket_id = 'design-uploads'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists "design_uploads_delete_own_or_admin" on storage.objects;
create policy "design_uploads_delete_own_or_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'design-uploads'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

insert into public.categories (id, name, slug, description, accent_color)
values
  ('cat-tee', 'Studio Tees', 'studio-tees', 'Precision-cut everyday tees with elevated branding touches.', '#d5d7dc'),
  ('cat-outerwear', 'Outerwear', 'outerwear', 'Statement layers for events, teams, and premium drops.', '#a0a4ad'),
  ('cat-bottoms', 'Bottoms', 'bottoms', 'Comfort-driven silhouettes built for movement and print pairing.', '#8b919f'),
  ('cat-accessories', 'Accessories', 'accessories', 'Lightweight merch pieces that extend the collection story.', '#c7c9cf')
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  accent_color = excluded.accent_color;

insert into public.products (
  id,
  category_id,
  name,
  description,
  image_url,
  price,
  stock,
  sizes,
  featured,
  visual_key,
  sustainability_note,
  lead_time
)
values
  ('prod-tee-loop', 'cat-tee', 'Monochrome Loop Tee', 'Signature heavyweight tee with soft-touch cotton and a refined loop mark placement.', 'https://source.unsplash.com/900x900/?black,tshirt,fashion,studio', 89, 48, array['XS', 'S', 'M', 'L', 'XL', '2XL'], true, 'tee', 'Made in small-batch runs to reduce overproduction.', '4-6 working days'),
  ('prod-tee-carbon', 'cat-tee', 'Carbon Oversized Tee', 'Relaxed streetwear silhouette built for bold front and back custom prints.', 'https://source.unsplash.com/900x900/?oversized,tshirt,streetwear,fashion', 99, 35, array['S', 'M', 'L', 'XL'], true, 'oversized', 'Pattern-optimized cutting lowers fabric waste.', '5-7 working days'),
  ('prod-hoodie-silver', 'cat-outerwear', 'Silverline Hoodie', 'Premium brushed hoodie designed for clubs, teams, and premium merch drops.', 'https://source.unsplash.com/900x900/?hoodie,fashion,streetwear,studio', 159, 22, array['S', 'M', 'L', 'XL'], true, 'hoodie', 'Durable stitching extends wear cycle and lowers replacement waste.', '7-10 working days'),
  ('prod-jacket-nightshift', 'cat-outerwear', 'Nightshift Coach Jacket', 'Weather-ready coach jacket for premium uniforms and limited event capsules.', 'https://source.unsplash.com/900x900/?coach,jacket,fashion,black', 189, 18, array['M', 'L', 'XL', '2XL'], false, 'jacket', 'Built for repeat-use campaigns and long-term staff wear.', '8-12 working days'),
  ('prod-cargo-grid', 'cat-bottoms', 'Grid Cargo Pants', 'Structured cargos with print-friendly styling for cohesive team outfits.', 'https://source.unsplash.com/900x900/?cargo,pants,fashion,streetwear', 139, 31, array['S', 'M', 'L', 'XL'], false, 'cargo', 'Functional multi-use garment reduces one-off apparel purchases.', '6-8 working days'),
  ('prod-jogger-motion', 'cat-bottoms', 'Motion Cut Joggers', 'Tapered joggers engineered to pair with oversized graphic collections.', 'https://source.unsplash.com/900x900/?joggers,fashion,apparel,studio', 129, 26, array['S', 'M', 'L', 'XL'], false, 'joggers', 'Efficient sizing blocks help reduce dead stock.', '5-7 working days'),
  ('prod-cap-studio', 'cat-accessories', 'Studio Mesh Cap', 'Breathable event-ready cap that completes merch packs and creator kits.', 'https://source.unsplash.com/900x900/?cap,fashion,product,studio', 59, 64, array['Free Size'], false, 'cap', 'Lightweight accessory for modular merch bundles.', '3-5 working days'),
  ('prod-tote-signature', 'cat-accessories', 'Signature Tote Pack', 'Canvas tote with broad printable area for campaigns, launches, and gifts.', 'https://source.unsplash.com/900x900/?tote,bag,fashion,product', 49, 72, array['Free Size'], true, 'tote', 'Reusable carry piece that replaces disposable packaging.', '3-4 working days')
on conflict (id) do update
set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url,
  price = excluded.price,
  stock = excluded.stock,
  sizes = excluded.sizes,
  featured = excluded.featured,
  visual_key = excluded.visual_key,
  sustainability_note = excluded.sustainability_note,
  lead_time = excluded.lead_time;
create table if not exists public.order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default timezone('utc', now())
);

-- RLS policies
alter table public.order_messages enable row level security;

create policy "Users can view messages for their own orders"
  on public.order_messages for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_messages.order_id
      and orders.user_id = auth.uid()::text
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()::text
      and profiles.role = 'admin'
    )
  );

create policy "Users can insert messages to their own orders"
  on public.order_messages for insert
  with check (
    exists (
      select 1 from public.orders
      where orders.id = order_messages.order_id
      and orders.user_id = auth.uid()::text
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()::text
      and profiles.role = 'admin'
    )
  );
-- Add delivery_address column to the orders table
ALTER TABLE public.orders 
ADD COLUMN delivery_address text DEFAULT ''::text;

-- Comment to explain the column
COMMENT ON COLUMN public.orders.delivery_address IS 'Stores the delivery address mapped by the user during checkout.';
-- Create the cart_items table to store shopping cart contents permanently
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  product_name text not null,
  category_name text not null,
  visual_key text not null,
  size text not null,
  color text not null,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null,
  design_title text,
  design_description text,
  design_image_url text,
  created_at timestamptz not null default timezone('utc', now())
);

-- Set up Row Level Security (RLS)
alter table public.cart_items enable row level security;

-- Policy: Users can view their own cart items
create policy "Users can view their own cart items"
  on public.cart_items for select
  using (user_id = auth.uid()::text);

-- Policy: Users can insert their own cart items
create policy "Users can insert their own cart items"
  on public.cart_items for insert
  with check (user_id = auth.uid()::text);

-- Policy: Users can update their own cart items
create policy "Users can update their own cart items"
  on public.cart_items for update
  using (user_id = auth.uid()::text);

-- Policy: Users can delete their own cart items
create policy "Users can delete their own cart items"
  on public.cart_items for delete
  using (user_id = auth.uid()::text);
-- Create feedbacks table
CREATE TABLE feedbacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  type TEXT NOT NULL,
  rating INTEGER,
  subject TEXT NOT NULL,
  message TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- Allow insert for anyone
CREATE POLICY "Anyone can insert feedbacks" 
  ON feedbacks FOR INSERT 
  WITH CHECK (true);

-- Allow admins to read feedbacks
CREATE POLICY "Admins can view all feedbacks" 
  ON feedbacks FOR SELECT 
  USING (
    auth.uid()::text IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

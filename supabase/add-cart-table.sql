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

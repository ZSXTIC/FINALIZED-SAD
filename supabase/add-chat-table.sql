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

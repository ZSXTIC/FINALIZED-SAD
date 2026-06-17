-- Run this in Supabase SQL Editor to create demo users
do $$
declare
  admin_uid uuid;
  user_uid uuid;
begin
  -- ── Admin user (skip if email exists) ──
  if not exists (select 1 from auth.users where email = 'ryankanginnchin@gmail.com') then
    admin_uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_sent_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      admin_uid, 'authenticated', 'authenticated',
      'ryankanginnchin@gmail.com',
      crypt('88888888', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', array['email']),
      jsonb_build_object('full_name', 'Admin User'),
      now(), now(), now()
    );

    insert into public.profiles (id, email, full_name, phone, role)
    values (admin_uid::text, 'ryankanginnchin@gmail.com', 'Admin User', '+60189480830', 'admin');
  else
    raise notice 'Admin user already exists, skipping.';
  end if;

  -- ── Regular user (skip if email exists) ──
  if not exists (select 1 from auth.users where email = 'user@infinitee.studio') then
    user_uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_sent_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      user_uid, 'authenticated', 'authenticated',
      'user@infinitee.studio',
      crypt('User@123', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', array['email']),
      jsonb_build_object('full_name', 'Demo User'),
      now(), now(), now()
    );

    insert into public.profiles (id, email, full_name, phone, role)
    values (user_uid::text, 'user@infinitee.studio', 'Demo User', '+60123456789', 'user');
  else
    raise notice 'Regular user already exists, skipping.';
  end if;
end;
$$;

-- Migration: Add missing settings columns
-- Run this in Supabase SQL Editor if you already ran the initial setup

alter table public.settings
add column if not exists enable_service_charge boolean not null default false;

alter table public.settings
add column if not exists default_service_charge text not null default '';

alter table public.settings
add column if not exists enable_discount boolean not null default true;

alter table public.settings
add column if not exists default_discount text not null default '';

alter table public.settings
add column if not exists enable_ppn boolean not null default false;

alter table public.settings
add column if not exists default_ppn text not null default '';

-- Migration: Create categories table
-- Run this if categories table doesn't exist

create table if not exists public.categories (
  id text primary key,
  name text not null,
  created_at timestamp with time zone default now()
);

-- Insert default categories
insert into public.categories (id, name) values
  ('1', 'Pakan Ternak'),
  ('2', 'Vitamin'),
  ('3', 'Obat')
on conflict (id) do nothing;

-- Enable RLS
alter table public.categories enable row level security;

-- Create policies
create policy "Enable read access for all users" on public.categories for select using (true);
create policy "Enable insert access for all users" on public.categories for insert with check (true);
create policy "Enable update access for all users" on public.categories for update using (true);
create policy "Enable delete access for all users" on public.categories for delete using (true);

-- Migration: Update expenses table
-- Run this if expenses table already exists with UUID id

-- IMPORTANT: Drop and recreate expenses table to use TEXT id instead of UUID
-- WARNING: This will delete existing expense data!
drop table if exists public.expenses cascade;

create table public.expenses (
  id text primary key,
  description text not null,
  amount numeric not null,
  category text not null,
  date timestamp with time zone default now(),
  notes text,
  created_at timestamp with time zone default now()
);

-- Enable RLS for expenses
alter table public.expenses enable row level security;

create policy "Enable read access for all users" on public.expenses for select using (true);
create policy "Enable insert access for all users" on public.expenses for insert with check (true);
create policy "Enable update access for all users" on public.expenses for update using (true);
create policy "Enable delete access for all users" on public.expenses for delete using (true);

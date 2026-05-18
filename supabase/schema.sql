-- Run this in your Supabase SQL editor after creating the project

-- Profiles (extends auth.users, created via trigger on signup)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  trial_started_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text check (plan in ('basic', 'pro', 'platinum')),
  billing_period text check (billing_period in ('weekly', 'monthly', 'yearly')),
  status text check (status in ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Daily usage
create table if not exists public.usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  date date default current_date,
  analysis_count integer default 0,
  unique(user_id, date)
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, trial_started_at)
  values (new.id, new.email, now());
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Increment usage (upsert)
create or replace function public.increment_usage(p_user_id uuid, p_date date)
returns void language plpgsql security definer as $$
begin
  insert into public.usage (user_id, date, analysis_count)
  values (p_user_id, p_date, 1)
  on conflict (user_id, date)
  do update set analysis_count = usage.analysis_count + 1;
end;
$$;

-- RLS policies
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage enable row level security;

create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can read own subscription" on public.subscriptions for select using (auth.uid() = user_id);
create policy "Users can read own usage" on public.usage for select using (auth.uid() = user_id);
create policy "Service role can write subscriptions" on public.subscriptions for all using (true);
create policy "Service role can write usage" on public.usage for all using (true);

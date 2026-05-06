create extension if not exists pgcrypto;

create table if not exists public.profiles (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, display_name text, currency text not null default '₽', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id));
create table if not exists public.categories (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, type text not null check(type in ('expense','income')), name text not null, icon text not null default 'other', is_default boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.accounts (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null, icon text, opening_balance numeric not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.operations (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, type text not null check(type in ('expense','income')), amount numeric not null, category_id uuid references public.categories(id) on delete set null, category_name text not null, account_id uuid references public.accounts(id) on delete set null, account_name text not null, date date not null, comment text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);
create table if not exists public.goals (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null, target numeric not null, current numeric not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);

create index if not exists profiles_user_id_idx on public.profiles(user_id);
create index if not exists categories_user_type_idx on public.categories(user_id,type);
create unique index if not exists categories_user_type_name_idx on public.categories(user_id,type,lower(name));
create index if not exists accounts_user_id_idx on public.accounts(user_id);
create unique index if not exists accounts_user_name_idx on public.accounts(user_id,lower(name));
create index if not exists operations_user_date_idx on public.operations(user_id,date desc);
create index if not exists operations_user_type_date_idx on public.operations(user_id,type,date desc);
create index if not exists operations_user_account_idx on public.operations(user_id,account_id);
create index if not exists operations_user_category_idx on public.operations(user_id,category_id);
create index if not exists goals_user_created_idx on public.goals(user_id,created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists profiles_set_updated_at on public.profiles; create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists categories_set_updated_at on public.categories; create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();
drop trigger if exists accounts_set_updated_at on public.accounts; create trigger accounts_set_updated_at before update on public.accounts for each row execute function public.set_updated_at();
drop trigger if exists operations_set_updated_at on public.operations; create trigger operations_set_updated_at before update on public.operations for each row execute function public.set_updated_at();
drop trigger if exists goals_set_updated_at on public.goals; create trigger goals_set_updated_at before update on public.goals for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.accounts enable row level security;
alter table public.operations enable row level security;
alter table public.goals enable row level security;

drop policy if exists "profiles_select_own" on public.profiles; create policy "profiles_select_own" on public.profiles for select using(auth.uid()=user_id);
drop policy if exists "profiles_insert_own" on public.profiles; create policy "profiles_insert_own" on public.profiles for insert with check(auth.uid()=user_id);
drop policy if exists "profiles_update_own" on public.profiles; create policy "profiles_update_own" on public.profiles for update using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "profiles_delete_own" on public.profiles; create policy "profiles_delete_own" on public.profiles for delete using(auth.uid()=user_id);

drop policy if exists "categories_select_own" on public.categories; create policy "categories_select_own" on public.categories for select using(auth.uid()=user_id);
drop policy if exists "categories_insert_own" on public.categories; create policy "categories_insert_own" on public.categories for insert with check(auth.uid()=user_id);
drop policy if exists "categories_update_own" on public.categories; create policy "categories_update_own" on public.categories for update using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "categories_delete_own" on public.categories; create policy "categories_delete_own" on public.categories for delete using(auth.uid()=user_id);

drop policy if exists "accounts_select_own" on public.accounts; create policy "accounts_select_own" on public.accounts for select using(auth.uid()=user_id);
drop policy if exists "accounts_insert_own" on public.accounts; create policy "accounts_insert_own" on public.accounts for insert with check(auth.uid()=user_id);
drop policy if exists "accounts_update_own" on public.accounts; create policy "accounts_update_own" on public.accounts for update using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "accounts_delete_own" on public.accounts; create policy "accounts_delete_own" on public.accounts for delete using(auth.uid()=user_id);

drop policy if exists "operations_select_own" on public.operations; create policy "operations_select_own" on public.operations for select using(auth.uid()=user_id);
drop policy if exists "operations_insert_own" on public.operations; create policy "operations_insert_own" on public.operations for insert with check(auth.uid()=user_id);
drop policy if exists "operations_update_own" on public.operations; create policy "operations_update_own" on public.operations for update using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "operations_delete_own" on public.operations; create policy "operations_delete_own" on public.operations for delete using(auth.uid()=user_id);

drop policy if exists "goals_select_own" on public.goals; create policy "goals_select_own" on public.goals for select using(auth.uid()=user_id);
drop policy if exists "goals_insert_own" on public.goals; create policy "goals_insert_own" on public.goals for insert with check(auth.uid()=user_id);
drop policy if exists "goals_update_own" on public.goals; create policy "goals_update_own" on public.goals for update using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "goals_delete_own" on public.goals; create policy "goals_delete_own" on public.goals for delete using(auth.uid()=user_id);

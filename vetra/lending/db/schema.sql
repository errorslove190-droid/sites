-- ================================================================
-- Ветра — структура базы. Вставить целиком в Supabase → SQL Editor → Run.
-- Запускается один раз. Повторный запуск безопасен.
-- ================================================================

-- ---------- 1. Заявки ------------------------------------------
create table if not exists public.leads (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text,
  company    text,
  email      text,
  phone      text,
  plan       text,   -- тариф, если заявка со страницы оплаты
  pay        text,   -- картой или по счёту
  comment    text,
  source     text,   -- lending / checkout
  page       text,   -- с какой страницы пришла
  status     text not null default 'new'
);

alter table public.leads enable row level security;

-- Гость с сайта может только положить заявку. Читать, менять, удалять — нет.
drop policy if exists "leads_anon_insert" on public.leads;
create policy "leads_anon_insert" on public.leads
  for insert to anon, authenticated with check (true);

create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- ---------- 2. Профили пользователей ---------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  email      text,
  name       text,
  company    text
);

alter table public.profiles enable row level security;

-- Каждый видит и правит только свою строку.
drop policy if exists "profiles_own_select" on public.profiles;
create policy "profiles_own_select" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "profiles_own_update" on public.profiles;
create policy "profiles_own_update" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ---------- 3. Профиль заводится сам при регистрации ------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, company)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'name', ''),
    nullif(new.raw_user_meta_data ->> 'company', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

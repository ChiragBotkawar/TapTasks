-- ============================================================
-- TapTasks — database schema
-- Run this in the Supabase SQL editor.
-- Safe to re-run (drop-if-exists makes it idempotent).
-- ============================================================

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  phone text,
  name text,
  role text not null default 'reader' check (role in ('reader', 'admin')),
  created_at timestamptz not null default now(),
  last_login timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;

-- ---------- books ----------
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  description text,
  cover text,
  storage_path text not null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  amazon_link text,
  created_at timestamptz not null default now()
);

alter table public.books add column if not exists amazon_link text;

-- ---------- reading_progress ----------
create table if not exists public.reading_progress (
  user_id uuid references auth.users(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  current_page int not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

-- ---------- Helper: is_admin() ----------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- RLS: profiles ----------
alter table public.profiles enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles: admin read all" on public.profiles;
create policy "profiles: admin read all"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles: admin update all" on public.profiles;
create policy "profiles: admin update all"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- RLS: books ----------
alter table public.books enable row level security;

drop policy if exists "books: read active" on public.books;
create policy "books: read active"
  on public.books for select
  to authenticated
  using (status = 'active');

drop policy if exists "books: admin read all" on public.books;
create policy "books: admin read all"
  on public.books for select
  to authenticated
  using (public.is_admin());

drop policy if exists "books: admin insert" on public.books;
create policy "books: admin insert"
  on public.books for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "books: admin update" on public.books;
create policy "books: admin update"
  on public.books for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "books: admin delete" on public.books;
create policy "books: admin delete"
  on public.books for delete
  to authenticated
  using (public.is_admin());

-- ---------- RLS: reading_progress ----------
alter table public.reading_progress enable row level security;

drop policy if exists "progress: read own" on public.reading_progress;
create policy "progress: read own"
  on public.reading_progress for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "progress: insert own" on public.reading_progress;
create policy "progress: insert own"
  on public.reading_progress for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "progress: update own" on public.reading_progress;
create policy "progress: update own"
  on public.reading_progress for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------- Storage bucket (private) ----------
insert into storage.buckets (id, name, public)
values ('books', 'books', false)
on conflict (id) do nothing;

-- ---------- Storage policies ----------
drop policy if exists "storage: read book files" on storage.objects;
create policy "storage: read book files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'books');

drop policy if exists "storage: admin insert files" on storage.objects;
create policy "storage: admin insert files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'books' and public.is_admin());

drop policy if exists "storage: admin update files" on storage.objects;
create policy "storage: admin update files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'books' and public.is_admin());

drop policy if exists "storage: admin delete files" on storage.objects;
create policy "storage: admin delete files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'books' and public.is_admin());

-- ============================================================
-- Make yourself an admin (run after your first login):
--
--   update public.profiles
--   set role = 'admin'
--   where phone = 'your_phone_with_country_code';
-- ============================================================
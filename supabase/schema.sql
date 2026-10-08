-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Items table
create table public.items (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text check (type in ('lost', 'found')) not null,
  status text check (status in ('active', 'matched', 'returned', 'closed')) default 'active',
  title text not null,
  description text not null,
  category text not null,
  color text[],
  features text[],
  location text not null,
  approximate_time timestamp with time zone not null,
  image_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Matches table (AI generated)
create table public.matches (
  id uuid default uuid_generate_v4() primary key,
  lost_item_id uuid references public.items(id) on delete cascade not null,
  found_item_id uuid references public.items(id) on delete cascade not null,
  similarity_score float not null check (similarity_score >= 0 and similarity_score <= 100),
  explanation text not null,
  status text check (status in ('pending', 'verified', 'rejected')) default 'pending',
  created_at timestamp with time zone default now()
);

-- Claims table (for ownership verification)
create table public.claims (
  id uuid default uuid_generate_v4() primary key,
  match_id uuid references public.matches(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  proof_text text,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  created_at timestamp with time zone default now()
);

-- RLS Policies

alter table public.items enable row level security;
alter table public.matches enable row level security;
alter table public.claims enable row level security;

-- Items: Anyone can read active items (for matching context). Users can fully manage their own items.
create policy "Users can read all active items" on public.items for select using (status = 'active');
create policy "Users can read own items" on public.items for select using (auth.uid() = user_id);
create policy "Users can insert own items" on public.items for insert with check (auth.uid() = user_id);
create policy "Users can update own items" on public.items for update using (auth.uid() = user_id);
create policy "Users can delete own items" on public.items for delete using (auth.uid() = user_id);

-- Matches: Users can see matches for their items
create policy "Users see matches for their items" on public.matches for select using (
  exists (select 1 from public.items i where i.id = lost_item_id and i.user_id = auth.uid()) or
  exists (select 1 from public.items i where i.id = found_item_id and i.user_id = auth.uid())
);
-- Matches are inserted by the Backend Service Role only (bypasses RLS)

-- Claims: Users can read claims on their matches, and create claims for themselves
create policy "Users see claims on their items" on public.claims for select using (
  auth.uid() = user_id or
  exists (select 1 from public.matches m join public.items i on m.found_item_id = i.id where m.id = match_id and i.user_id = auth.uid())
);
create policy "Users can insert their own claims" on public.claims for insert with check (auth.uid() = user_id);

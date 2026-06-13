-- ═══════════════════════════════════════════════════════
--  NDUTA'S GARDEN — SUPABASE SCHEMA
--  Run this once in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════

-- Real-time presence (who is currently in the garden)
create table if not exists presence (
  user_id   text primary key,
  name      text not null,
  last_seen timestamptz default now()
);
alter table presence enable row level security;
create policy "anyone can read presence"  on presence for select using (true);
create policy "anyone can upsert presence" on presence for insert with check (true);
create policy "anyone can update presence" on presence for update using (true);

-- Garden memories (flowers planted by either person)
create table if not exists garden_items (
  id          uuid primary key default gen_random_uuid(),
  type        text not null default 'flower', -- 'flower' | 'seed'
  title       text not null,
  note        text,
  color       text default '#f9a8d4',
  x           float not null,  -- 0..1 relative position
  y           float not null,
  planted_by  text not null,
  planted_at  timestamptz default now(),
  unlocks_at  timestamptz,     -- null = already bloomed
  unlocked    boolean default true
);
alter table garden_items enable row level security;
create policy "anyone can read items"   on garden_items for select using (true);
create policy "anyone can insert items" on garden_items for insert with check (true);
create policy "anyone can update items" on garden_items for update using (true);
create policy "anyone can delete items" on garden_items for delete using (true);

-- Thinking-of-you pings
create table if not exists pings (
  id         bigint generated always as identity primary key,
  from_user  text not null,
  to_user    text not null,
  created_at timestamptz default now()
);
alter table pings enable row level security;
create policy "anyone can read pings"   on pings for select using (true);
create policy "anyone can insert pings" on pings for insert with check (true);

-- Enable real-time on all tables
alter publication supabase_realtime add table presence;
alter publication supabase_realtime add table garden_items;
alter publication supabase_realtime add table pings;

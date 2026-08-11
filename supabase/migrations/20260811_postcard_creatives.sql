-- Postcard creatives for Lob designed mail (metadata; files live in Storage bucket postcard-creatives)

create table if not exists public.postcard_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  description text,
  size text not null default '4x6' check (size in ('4x6', '6x9', '6x11')),
  front_url text,
  back_url text,
  front_html text,
  back_html text,
  is_active boolean not null default true
);

create index if not exists postcard_templates_created_at_idx
  on public.postcard_templates (created_at desc);

alter table public.postcard_templates enable row level security;

-- Service role / admin APIs use service key; no public policies by default.
-- Optional: allow authenticated admins to read via future policies.

-- Storage bucket (run in Supabase SQL or Dashboard → Storage)
-- insert into storage.buckets (id, name, public)
-- values ('postcard-creatives', 'postcard-creatives', true)
-- on conflict (id) do nothing;

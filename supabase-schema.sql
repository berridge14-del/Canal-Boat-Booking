create extension if not exists pgcrypto;

create table if not exists public.booking_enquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  arrival_date date,
  checkout_date date,
  nights integer,
  guest_count integer,
  estimated_total integer,
  season text,
  customer_name text,
  customer_email text,
  customer_phone text,
  message text,
  status text not null default 'new',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  paid_at timestamptz
);

create table if not exists public.concierge_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  enquiry_id uuid references public.booking_enquiries(id) on delete set null,
  customer_name text,
  customer_email text,
  customer_phone text,
  message text not null,
  source text not null default 'website',
  status text not null default 'new'
);

alter table public.booking_enquiries enable row level security;
alter table public.concierge_messages enable row level security;

drop policy if exists "Server can manage booking enquiries" on public.booking_enquiries;
create policy "Server can manage booking enquiries"
on public.booking_enquiries
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "Server can manage concierge messages" on public.concierge_messages;
create policy "Server can manage concierge messages"
on public.concierge_messages
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

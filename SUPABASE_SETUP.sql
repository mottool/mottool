-- ============================================================
-- mottool — Supabase Schema
-- ============================================================
-- 실행 순서:
--   1) Supabase 프로젝트 생성 (region: ap-northeast-2)
--   2) SQL Editor 에 이 파일 전체 붙여넣고 Run
--   3) Storage > New bucket: 'book-images' (public)
--   4) Authentication > Add user (관리자 이메일/비번)
--   5) .env 또는 config.js 에 URL/anon key 입력
-- ============================================================

-- ── 출판사 ──────────────────────────────────────────────
create table if not exists publishers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  note        text,
  created_at  timestamptz default now()
);

-- ── 저자 ────────────────────────────────────────────────
create table if not exists authors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  meta        text,
  bio         text,
  created_at  timestamptz default now()
);

-- ── 책 ──────────────────────────────────────────────────
create table if not exists books (
  id              text primary key,
  slug            text unique,
  title           text not null,
  author_name     text,
  author_meta     text,
  publisher_name  text,
  category        text,
  year            int,
  piece           int default 0,
  price           text default 'price soon',
  price_krw       int,
  sold            boolean default false,
  visible         boolean default true,
  featured        boolean default false,
  cover_type      text default 'color',
  cover_value     text,
  cover_src       text,
  cover_border    text,
  detail          jsonb default '{}'::jsonb,
  position        int default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists books_position_idx on books (position);
create index if not exists books_visible_idx  on books (visible);

-- ── 주문 (사업자 등록 후 활성화) ───────────────────────
create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  order_no        text unique not null,
  book_id         text references books(id) on delete set null,
  book_title      text,
  qty             int default 1,
  price_krw       int,
  customer_name   text,
  customer_phone  text,
  customer_email  text,
  shipping_addr   text,
  shipping_zip    text,
  shipping_memo   text,
  status          text default 'pending'
                  check (status in ('pending','paid','shipped','done','cancelled')),
  payment_method  text,
  paid_at         timestamptz,
  shipped_at      timestamptz,
  tracking_no     text,
  note            text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists orders_status_idx     on orders (status);
create index if not exists orders_created_at_idx on orders (created_at desc);

-- ── 문의 / Instagram DM 로그 ───────────────────────────
create table if not exists inquiries (
  id           uuid primary key default gen_random_uuid(),
  source       text default 'instagram',
  book_id      text references books(id) on delete set null,
  book_title   text,
  customer     text,
  contact      text,
  message      text,
  status       text default 'open'
               check (status in ('open','replied','reserved','done','cancelled')),
  note         text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists inquiries_status_idx on inquiries (status);

-- ── 대기/예약 리스트 ────────────────────────────────────
create table if not exists waitlist (
  id           uuid primary key default gen_random_uuid(),
  book_id      text references books(id) on delete cascade,
  customer     text,
  contact      text,
  note         text,
  notified     boolean default false,
  created_at   timestamptz default now()
);

-- ── 사이트 설정 (key/value) ────────────────────────────
create table if not exists site_config (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz default now()
);

-- 기본 설정값 시드
insert into site_config (key, value) values
  ('shop_open',      'false'::jsonb),
  ('instagram_url',  '"https://instagram.com/mottool.art"'::jsonb),
  ('contact_email',  '""'::jsonb),
  ('address',        '"대전 둔산동 2F"'::jsonb)
on conflict (key) do nothing;

-- ── updated_at 자동 갱신 트리거 ────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_books_updated      on books;
drop trigger if exists trg_orders_updated     on orders;
drop trigger if exists trg_inquiries_updated  on inquiries;

create trigger trg_books_updated     before update on books     for each row execute function set_updated_at();
create trigger trg_orders_updated    before update on orders    for each row execute function set_updated_at();
create trigger trg_inquiries_updated before update on inquiries for each row execute function set_updated_at();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
-- 정책:
--   books      : 누구나 SELECT (공개 사이트), 인증된 사용자만 변경
--   publishers : 누구나 SELECT, 인증된 사용자만 변경
--   authors    : 누구나 SELECT, 인증된 사용자만 변경
--   orders     : 인증된 사용자만 모든 권한 (관리자 전용)
--   inquiries  : 인증된 사용자만 모든 권한 (관리자 전용)
--   waitlist   : INSERT 는 누구나 가능 (대기 신청), SELECT/UPDATE 는 인증만
--   site_config: 누구나 SELECT, 인증된 사용자만 UPDATE
-- ============================================================

alter table books        enable row level security;
alter table publishers   enable row level security;
alter table authors      enable row level security;
alter table orders       enable row level security;
alter table inquiries    enable row level security;
alter table waitlist     enable row level security;
alter table site_config  enable row level security;

-- books
drop policy if exists "books_public_read" on books;
drop policy if exists "books_admin_all"   on books;
create policy "books_public_read" on books for select using (visible = true or auth.role() = 'authenticated');
create policy "books_admin_all"   on books for all    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- publishers
drop policy if exists "publishers_public_read" on publishers;
drop policy if exists "publishers_admin_all"   on publishers;
create policy "publishers_public_read" on publishers for select using (true);
create policy "publishers_admin_all"   on publishers for all    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- authors
drop policy if exists "authors_public_read" on authors;
drop policy if exists "authors_admin_all"   on authors;
create policy "authors_public_read" on authors for select using (true);
create policy "authors_admin_all"   on authors for all    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- orders (관리자 전용)
drop policy if exists "orders_admin_all" on orders;
create policy "orders_admin_all" on orders for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- inquiries (관리자 전용)
drop policy if exists "inquiries_admin_all" on inquiries;
create policy "inquiries_admin_all" on inquiries for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- waitlist
drop policy if exists "waitlist_public_insert" on waitlist;
drop policy if exists "waitlist_admin_all"     on waitlist;
create policy "waitlist_public_insert" on waitlist for insert with check (true);
create policy "waitlist_admin_all"     on waitlist for all    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- site_config
drop policy if exists "config_public_read" on site_config;
drop policy if exists "config_admin_write" on site_config;
create policy "config_public_read" on site_config for select using (true);
create policy "config_admin_write" on site_config for all    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- 끝. Storage 버킷 'book-images' (public) 생성 잊지 말 것.
-- ============================================================

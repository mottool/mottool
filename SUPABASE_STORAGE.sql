-- ============================================================
-- mottool — Storage 버킷 + 정책
-- ============================================================
-- SQL Editor 에 붙여넣고 Run.
-- book-images 버킷 생성 + RLS 정책 자동 설정.
-- ============================================================

-- 1) book-images 버킷 (public)
insert into storage.buckets (id, name, public)
values ('book-images', 'book-images', true)
on conflict (id) do update set public = true;

-- 2) 정책 (이미 있으면 덮어쓰기 위해 drop 후 재생성)
drop policy if exists "book-images public read"   on storage.objects;
drop policy if exists "book-images admin upload"  on storage.objects;
drop policy if exists "book-images admin update"  on storage.objects;
drop policy if exists "book-images admin delete"  on storage.objects;

-- 누구나 읽기 가능
create policy "book-images public read"
  on storage.objects for select
  using (bucket_id = 'book-images');

-- 인증된 사용자(관리자) 만 업로드 / 수정 / 삭제
create policy "book-images admin upload"
  on storage.objects for insert
  with check (bucket_id = 'book-images' and auth.role() = 'authenticated');

create policy "book-images admin update"
  on storage.objects for update
  using (bucket_id = 'book-images' and auth.role() = 'authenticated');

create policy "book-images admin delete"
  on storage.objects for delete
  using (bucket_id = 'book-images' and auth.role() = 'authenticated');

-- ============================================================
-- mottool — Web Push 알림 셋업
-- ============================================================
-- SQL Editor 에 붙여넣고 Run.
-- 이후 Supabase 대시보드에서 Edge Function 'send-push' 배포 + Database Webhook 설정 필요.
-- ============================================================

-- 1) 푸시 구독 저장 테이블
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  endpoint    text unique not null,
  p256dh      text not null,
  auth        text not null,
  user_email  text,
  device_info text,
  created_at  timestamptz default now()
);

create index if not exists push_subscriptions_email_idx on push_subscriptions (user_email);

alter table push_subscriptions enable row level security;

drop policy if exists "push_subs_admin_all"   on push_subscriptions;
drop policy if exists "push_subs_self_insert" on push_subscriptions;
drop policy if exists "push_subs_self_delete" on push_subscriptions;

-- 인증된 사용자는 자기 구독을 추가/삭제 가능
create policy "push_subs_admin_all"
  on push_subscriptions for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- 2) Realtime publication 에 추가 (이미 있으면 에러 무시)
do $$
begin
  begin alter publication supabase_realtime add table orders; exception when others then null; end;
  begin alter publication supabase_realtime add table waitlist; exception when others then null; end;
end $$;

-- ============================================================
-- 끝. 다음 단계는 Supabase 대시보드에서:
--   1. Project Settings → Edge Functions → Secrets 에 추가
--      - VAPID_PUBLIC_KEY
--      - VAPID_PRIVATE_KEY
--      - VAPID_CONTACT (mailto:mottool@mottool.art)
--   2. Edge Functions → New Function 'send-push'
--      → mottool 폴더의 send-push.ts 코드 붙여넣기 → Deploy
--   3. Database → Webhooks → Create Webhook
--      - Source: orders, waitlist 테이블 INSERT
--      - HTTP Request: POST https://<프로젝트>.supabase.co/functions/v1/send-push
--      - Headers: Authorization: Bearer <ANON_KEY>
-- ============================================================

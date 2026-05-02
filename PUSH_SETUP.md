# 백그라운드 푸시 알림 셋업

앱이 닫혀있어도 새 주문/대기 신청 시 알림이 오게 하는 설정.

## 1. SQL 실행

`SUPABASE_PUSH.sql` 내용을 Supabase SQL Editor 에 붙여넣고 Run.
→ `push_subscriptions` 테이블 생성, RLS, Realtime publication 추가.

## 2. Edge Function 배포

Supabase 대시보드 → **Edge Functions** → **Deploy a new function**

- **Name**: `send-push`
- 코드: `send-push.ts` 의 내용을 통째로 복사 → 붙여넣기 → **Deploy**

## 3. Edge Function 환경변수 (Secrets) 설정

Supabase 대시보드 → **Project Settings** → **Edge Functions** → **Secrets** → **Add new secret**

다음 3개 추가:

| Name | Value |
|---|---|
| `VAPID_PUBLIC_KEY`  | `BNQAoeoaNtQaD9X66FgTMZb-70k_ks7o9HT0di4ZmWUDabp07Ee6JnPjSuJSrYTuPrx7qpif_YwYJOHO2X1nMBE` |
| `VAPID_PRIVATE_KEY` | `9WH4Ksw6zKlE_LRU4ev7Y6Gii8XmLR-YLT1Jk0JlvDI` |
| `VAPID_CONTACT`     | `mailto:mottool@mottool.art` |

> ⚠️ **VAPID_PRIVATE_KEY 는 절대 공개 금지** — Supabase Secrets 에만 보관.
> `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` 는 Supabase 가 자동 주입.

## 4. Database Webhook 설정 — orders

Supabase 대시보드 → **Database** → **Webhooks** → **Create a new hook**

- **Name**: `push-on-new-order`
- **Table**: `orders`
- **Events**: ✅ Insert
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `https://jxtzdhfbuvvrfrxunsfg.supabase.co/functions/v1/send-push`
- **HTTP Headers**:
  - `Authorization`: `Bearer <ANON_KEY>` (또는 그대로 두면 service role 자동)
  - `Content-Type`: `application/json`
- **HTTP Params**: 비워둠
- **Save**

## 5. Database Webhook — waitlist (반복)

같은 방식으로 한 번 더:
- **Name**: `push-on-new-waitlist`
- **Table**: `waitlist`
- 나머지 동일

## 6. 클라이언트 권한 허용

1. 모바일에서 mottool.art/admin 접속 (가능하면 PWA 로 설치 후 실행)
2. `config` 탭 → `앱·알림` → **알림 켜기** 클릭 → 권한 허용
3. 자동으로 푸시 구독이 Supabase 에 저장됨
4. **테스트** 버튼으로 포그라운드 알림 확인
5. 앱 닫고, 누군가 주문 추가하면 백그라운드 푸시 들어옴

## 트러블슈팅

- **iOS Safari**: iOS 16.4+ 부터 PWA 로 설치된 경우에만 푸시 지원. Safari 단독 탭에선 X.
- **알림이 안 와요**: Edge Function 로그 확인 (Supabase 대시보드 → Edge Functions → send-push → Logs).
- **구독 만료**: 6개월 이상 미사용 또는 OS 권한 변경 시 자동 만료. 재구독 필요.
- **여러 기기**: 각 기기마다 별도 구독으로 저장됨 → 모든 기기에 동시 알림.

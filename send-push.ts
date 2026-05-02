// ============================================================
// Supabase Edge Function — send-push
// ============================================================
// 배포: Supabase 대시보드 → Edge Functions → New Function → 이름 'send-push'
//       → 이 파일 전체 붙여넣기 → Deploy
// ============================================================
// Database Webhook 으로 호출됨 (orders / waitlist INSERT)
// 또는 직접 호출도 가능 — body: { title, body, url, tag }
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7';

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_CONTACT = Deno.env.get('VAPID_CONTACT') || 'mailto:mottool@mottool.art';

webpush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC, VAPID_PRIVATE);

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() });

  let body: any = {};
  try { body = await req.json(); } catch { /* */ }

  // Database Webhook 페이로드 형식 감지
  const payload = buildPayload(body);

  // 모든 구독 가져오기
  const { data: subs, error } = await supabase.from('push_subscriptions').select('*');
  if (error) return json({ error: error.message }, 500);

  let sent = 0, removed = 0;
  for (const s of subs || []) {
    const sub = {
      endpoint: s.endpoint,
      keys: { p256dh: s.p256dh, auth: s.auth }
    };
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload));
      sent++;
    } catch (e: any) {
      // 410 Gone / 404 → 구독 만료. 삭제.
      if (e.statusCode === 410 || e.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', s.id);
        removed++;
      } else {
        console.error('push fail', e.statusCode, e.body);
      }
    }
  }
  return json({ sent, removed, total: subs?.length || 0 });
});

function buildPayload(body: any) {
  // Database Webhook: { type: 'INSERT', table: 'orders', record: {...} }
  if (body?.type === 'INSERT' && body?.record) {
    const rec = body.record;
    if (body.table === 'orders') {
      return {
        title: '🛒 새 주문',
        body: `${rec.book_title || '상품'} · ${rec.customer_name || '익명'}`,
        url: '/admin#orders',
        tag: 'order-' + rec.id
      };
    }
    if (body.table === 'waitlist') {
      return {
        title: '⏳ 대기 신청',
        body: `${rec.customer || '익명'} 님이 대기 신청했어요`,
        url: '/admin#waitlist',
        tag: 'wait-' + rec.id
      };
    }
    if (body.table === 'inquiries') {
      return {
        title: '💬 새 문의',
        body: `${rec.customer || '익명'}: ${(rec.message || '').slice(0, 60)}`,
        url: '/admin#inquiries',
        tag: 'inq-' + rec.id
      };
    }
  }
  // 직접 호출 형식
  return {
    title: body?.title || 'mottool',
    body:  body?.body  || '',
    url:   body?.url   || '/admin',
    tag:   body?.tag   || 'mottool-' + Date.now()
  };
}

function json(d: any, status = 200) {
  return new Response(JSON.stringify(d), {
    status, headers: { 'Content-Type': 'application/json', ...cors() }
  });
}
function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type'
  };
}

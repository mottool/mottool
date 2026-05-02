// ============================================================
// Supabase 설정 — 실제 키를 supabase-config.js 에 복사하여 사용
// ============================================================
// 사용법:
//   1) 이 파일을 supabase-config.js 로 복사
//   2) Supabase 대시보드 > Project Settings > API 에서
//      Project URL 과 anon public key 를 복사하여 아래에 붙여넣기
//   3) anon key 는 공개되어도 안전 (RLS 가 보호)
//   4) supabase-config.js 는 .gitignore 에 포함됨 → 직접 git push 한 뒤
//      Vercel 에 supabase-config.js 를 따로 업로드하거나, 그냥 commit
//      해도 무방 (anon key 라서)
// ============================================================

window.SUPABASE_CONFIG = {
  url:     'https://YOUR-PROJECT-REF.supabase.co',
  anonKey: 'YOUR-ANON-PUBLIC-KEY'
};
